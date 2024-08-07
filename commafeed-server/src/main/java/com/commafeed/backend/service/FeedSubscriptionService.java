package com.commafeed.backend.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;

import com.commafeed.CommaFeedConfiguration;
import com.commafeed.backend.cache.CacheService;
import com.commafeed.backend.dao.FeedDAO;
import com.commafeed.backend.dao.FeedEntryStatusDAO;
import com.commafeed.backend.dao.FeedSubscriptionDAO;
import com.commafeed.backend.feed.FeedRefreshEngine;
import com.commafeed.backend.feed.FeedUtils;
import com.commafeed.backend.model.Feed;
import com.commafeed.backend.model.FeedCategory;
import com.commafeed.backend.model.FeedSubscription;
import com.commafeed.backend.model.Models;
import com.commafeed.backend.model.User;
import com.commafeed.frontend.model.UnreadCount;

import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
public class FeedSubscriptionService {

	private final FeedDAO feedDAO;
	private final FeedEntryStatusDAO feedEntryStatusDAO;
	private final FeedSubscriptionDAO feedSubscriptionDAO;
	private final FeedService feedService;
	private final FeedRefreshEngine feedRefreshEngine;
	private final CacheService cache;
	private final CommaFeedConfiguration config;

	@Inject
	public FeedSubscriptionService(FeedDAO feedDAO, FeedEntryStatusDAO feedEntryStatusDAO, FeedSubscriptionDAO feedSubscriptionDAO,
			FeedService feedService, FeedRefreshEngine feedRefreshEngine, CacheService cache, CommaFeedConfiguration config) {
		this.feedDAO = feedDAO;
		this.feedEntryStatusDAO = feedEntryStatusDAO;
		this.feedSubscriptionDAO = feedSubscriptionDAO;
		this.feedService = feedService;
		this.feedRefreshEngine = feedRefreshEngine;
		this.cache = cache;
		this.config = config;

		// automatically refresh feeds after they are subscribed to
		// we need to use this hook because the feed needs to have been persisted because the queue processing is asynchronous
		feedSubscriptionDAO.onPostCommitInsert(sub -> feedRefreshEngine.refreshImmediately(sub.getFeed()));
	}

	public long subscribe(User user, String url, String title) {
		return subscribe(user, url, title, null, 0);
	}

	public long subscribe(User user, String url, String title, FeedCategory parent) {
		return subscribe(user, url, title, parent, 0);
	}

	public long subscribe(User user, String url, String title, FeedCategory category, int position) {

		final String pubUrl = config.getApplicationSettings().getPublicUrl();
		if (StringUtils.isBlank(pubUrl)) {
			throw new FeedSubscriptionException("Public URL of this CommaFeed instance is not set");
		}
		if (url.startsWith(pubUrl)) {
			throw new FeedSubscriptionException("Could not subscribe to a feed from this CommaFeed instance");
		}

		Integer maxFeedsPerUser = config.getApplicationSettings().getMaxFeedsPerUser();
		if (maxFeedsPerUser > 0 && feedSubscriptionDAO.count(user) >= maxFeedsPerUser) {
			String message = String.format("You cannot subscribe to more feeds on this CommaFeed instance (max %s feeds per user)",
					maxFeedsPerUser);
			throw new FeedSubscriptionException(message);
		}

		Feed feed = feedService.findOrCreate(url);

		// upgrade feed to https if it was using http
		if (FeedUtils.isHttp(feed.getUrl()) && FeedUtils.isHttps(url)) {
			feed.setUrl(url);
			feedDAO.saveOrUpdate(feed);
		}

		FeedSubscription sub = feedSubscriptionDAO.findByFeed(user, feed);
		if (sub == null) {
			sub = new FeedSubscription();
			sub.setFeed(feed);
			sub.setUser(user);
		}
		sub.setCategory(category);
		sub.setPosition(position);
		sub.setTitle(FeedUtils.truncate(title, 128));
		feedSubscriptionDAO.saveOrUpdate(sub);

		cache.invalidateUserRootCategory(user);
		return sub.getId();
	}

	public boolean unsubscribe(User user, Long subId) {
		FeedSubscription sub = feedSubscriptionDAO.findById(user, subId);
		if (sub != null) {
			feedSubscriptionDAO.delete(sub);
			cache.invalidateUserRootCategory(user);
			return true;
		} else {
			return false;
		}
	}

	public void refreshAll(User user) {
		List<FeedSubscription> subs = feedSubscriptionDAO.findAll(user);
		for (FeedSubscription sub : subs) {
			Feed feed = sub.getFeed();
			feedRefreshEngine.refreshImmediately(feed);
		}
	}

	public void refreshAllUpForRefresh(User user) {
		List<FeedSubscription> subs = feedSubscriptionDAO.findAll(user);
		for (FeedSubscription sub : subs) {
			Instant disabledUntil = sub.getFeed().getDisabledUntil();
			if (disabledUntil == null || disabledUntil.isBefore(Instant.now())) {
				Feed feed = sub.getFeed();
				feedRefreshEngine.refreshImmediately(feed);
			}
		}
	}

	public Map<Long, UnreadCount> getUnreadCount(User user) {
		return feedSubscriptionDAO.findAll(user).stream().collect(Collectors.toMap(FeedSubscription::getId, this::getUnreadCount));
	}

	private UnreadCount getUnreadCount(FeedSubscription sub) {
		UnreadCount count = cache.getUnreadCount(sub);
		if (count == null) {
			log.debug("unread count cache miss for {}", Models.getId(sub));
			count = feedEntryStatusDAO.getUnreadCount(sub);
			cache.setUnreadCount(sub, count);
		}
		return count;
	}

	@SuppressWarnings("serial")
	public static class FeedSubscriptionException extends RuntimeException {
		private FeedSubscriptionException(String msg) {
			super(msg);
		}
	}

}
