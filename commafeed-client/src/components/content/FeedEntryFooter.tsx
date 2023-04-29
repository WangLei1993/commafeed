import { t } from "@lingui/macro"
import { Group, Indicator, MultiSelect, Popover } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { Constants } from "app/constants"
import { markEntriesUpToEntry, markEntry, starEntry, tagEntry } from "app/slices/entries"
import { useAppDispatch, useAppSelector } from "app/store"
import { Entry } from "app/types"
import { ActionButton } from "components/ActionButtton"
import { ButtonToolbar } from "components/ButtonToolbar"
import { throttle } from "lodash"
import { useEffect, useState } from "react"
import { TbArrowBarToDown, TbExternalLink, TbEyeCheck, TbEyeOff, TbShare, TbStar, TbStarOff, TbTag } from "react-icons/tb"
import { ShareButtons } from "./ShareButtons"

interface FeedEntryFooterProps {
    entry: Entry
}

export function FeedEntryFooter(props: FeedEntryFooterProps) {
    const [scrollPosition, setScrollPosition] = useState(0)
    const sharingSettings = useAppSelector(state => state.user.settings?.sharingSettings)
    const tags = useAppSelector(state => state.user.tags)
    const mobile = !useMediaQuery(`(min-width: ${Constants.layout.mobileBreakpoint}px)`)
    const dispatch = useAppDispatch()

    const showSharingButtons = sharingSettings && Object.values(sharingSettings).some(v => v)

    const readStatusButtonClicked = () => dispatch(markEntry({ entry: props.entry, read: !props.entry.read }))
    const onTagsChange = (values: string[]) =>
        dispatch(
            tagEntry({
                entryId: +props.entry.id,
                tags: values,
            })
        )

    useEffect(() => {
        const scrollArea = document.getElementById(Constants.dom.mainScrollAreaId)

        const listener = () => setScrollPosition(scrollArea ? scrollArea.scrollTop : 0)
        const throttledListener = throttle(listener, 100)

        scrollArea?.addEventListener("scroll", throttledListener)
        return () => scrollArea?.removeEventListener("scroll", throttledListener)
    }, [])

    return (
        <Group position="apart">
            <ButtonToolbar>
                {props.entry.markable && (
                    <ActionButton
                        icon={props.entry.read ? <TbEyeOff size={18} /> : <TbEyeCheck size={18} />}
                        label={props.entry.read ? t`Keep unread` : t`Mark as read`}
                        onClick={readStatusButtonClicked}
                    />
                )}
                <ActionButton
                    icon={props.entry.starred ? <TbStarOff size={18} /> : <TbStar size={18} />}
                    label={props.entry.starred ? t`Unstar` : t`Star`}
                    onClick={() => dispatch(starEntry({ entry: props.entry, starred: !props.entry.starred }))}
                />

                {showSharingButtons && (
                    <Popover withArrow withinPortal shadow="md" positionDependencies={[scrollPosition]} closeOnClickOutside={!mobile}>
                        <Popover.Target>
                            <ActionButton icon={<TbShare size={18} />} label={t`Share`} />
                        </Popover.Target>
                        <Popover.Dropdown>
                            <ShareButtons url={props.entry.url} description={props.entry.title} />
                        </Popover.Dropdown>
                    </Popover>
                )}

                {tags && (
                    <Popover withArrow withinPortal shadow="md" positionDependencies={[scrollPosition]} closeOnClickOutside={!mobile}>
                        <Popover.Target>
                            <Indicator label={props.entry.tags.length} showZero={false} dot={false} inline size={16}>
                                <ActionButton icon={<TbTag size={18} />} label={t`Tags`} />
                            </Indicator>
                        </Popover.Target>
                        <Popover.Dropdown>
                            <MultiSelect
                                data={tags}
                                placeholder="Tags"
                                searchable
                                creatable
                                autoFocus
                                getCreateLabel={query => t`Create tag: ${query}`}
                                value={props.entry.tags}
                                onChange={onTagsChange}
                            />
                        </Popover.Dropdown>
                    </Popover>
                )}

                <a href={props.entry.url} target="_blank" rel="noreferrer">
                    <ActionButton icon={<TbExternalLink size={18} />} label={t`Open link`} />
                </a>
            </ButtonToolbar>

            <ActionButton
                icon={<TbArrowBarToDown size={18} />}
                label={t`Mark as read up to here`}
                onClick={() => dispatch(markEntriesUpToEntry(props.entry))}
            />
        </Group>
    )
}