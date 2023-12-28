import { type PayloadAction, createSlice } from "@reduxjs/toolkit"
import { client } from "app/client"
import { createAppAsyncThunk } from "app/store"
import { type ServerInfo } from "app/types"

interface ServerState {
    serverInfos?: ServerInfo
    webSocketConnected: boolean
}

const initialState: ServerState = {
    webSocketConnected: false,
}

export const reloadServerInfos = createAppAsyncThunk("server/infos", async () => await client.server.getServerInfos().then(r => r.data))
export const serverSlice = createSlice({
    name: "server",
    initialState,
    reducers: {
        setWebSocketConnected: (state, action: PayloadAction<boolean>) => {
            state.webSocketConnected = action.payload
        },
    },
    extraReducers: builder => {
        builder.addCase(reloadServerInfos.fulfilled, (state, action) => {
            state.serverInfos = action.payload
        })
    },
})

export const { setWebSocketConnected } = serverSlice.actions
export default serverSlice.reducer
