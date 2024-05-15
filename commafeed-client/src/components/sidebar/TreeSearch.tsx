import { t, Trans } from "@lingui/macro"
import { Box, Center, Kbd, TextInput } from "@mantine/core"
import { Spotlight, spotlight, type SpotlightActionData } from "@mantine/spotlight"
import { redirectToFeed } from "app/redirect/thunks"
import { useAppDispatch } from "app/store"
import { type Subscription } from "app/types"
import { FeedFavicon } from "components/content/FeedFavicon"
import { useMousetrap } from "hooks/useMousetrap"
import { TbSearch } from "react-icons/tb"

export interface TreeSearchProps {
    feeds: Subscription[]
}

function isMacOS() {
    return navigator.platform.toUpperCase().includes("MAC")
}

export function TreeSearch(props: TreeSearchProps) {
    const dispatch = useAppDispatch()

    const actions: SpotlightActionData[] = props.feeds
        .map(f => ({
            id: `${f.id}`,
            label: f.name,
            leftSection: <FeedFavicon url={f.iconUrl} />,
            onClick: async () => await dispatch(redirectToFeed(f.id)),
        }))
        .sort((f1, f2) => f1.label.localeCompare(f2.label))

    const searchIcon = <TbSearch size={18} />
    const rightSection = (
        <Center style={{ cursor: "pointer" }} onClick={() => spotlight.open()}>
            <Kbd>{isMacOS() ? "Cmd" : "Ctrl"}</Kbd>
            <Box mx={5}>+</Box>
            <Kbd>K</Kbd>
        </Center>
    )

    // additional keyboard shortcut used by commafeed v1
    useMousetrap("g u", () => spotlight.open())

    return (
        <>
            <TextInput
                placeholder={t`Search`}
                leftSection={searchIcon}
                rightSectionWidth={100}
                rightSection={rightSection}
                styles={{
                    input: {
                        cursor: "pointer",
                    },
                }}
                onClick={() => spotlight.open()}
                // prevent focus
                onFocus={e => e.target.blur()}
                readOnly
            />
            <Spotlight
                actions={actions}
                limit={10}
                shortcut="ctrl+k"
                searchProps={{
                    leftSection: searchIcon,
                    placeholder: t`Search`,
                }}
                nothingFound={<Trans>Nothing found</Trans>}
            ></Spotlight>
        </>
    )
}
