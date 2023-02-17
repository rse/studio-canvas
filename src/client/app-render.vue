<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-render">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<style lang="stylus">
.app-render
    canvas
        top: 0
        left: 0
        width: 100vw
        height: 100vh
        touch-action: none
        border: 0
        outline: none
</style>

<script setup lang="ts">
import { defineComponent }        from "vue"
import RecWebSocket               from "reconnecting-websocket"
import Ducky                      from "ducky"
import axios                      from "axios"
import CanvasRenderer             from "./app-render"
import { FreeDState }             from "../server/app-freed-state"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial
} from "../server/app-state"
</script>

<script lang="ts">
let renderer: CanvasRenderer | null = null
export default defineComponent({
    name: "app-render",
    components: {},
    props: {
        cam:        { type: String, default: "" },
        options:    { type: Object, default: new Map<string, string | boolean>() },
        serviceUrl: { type: String, default: "" },
        wsUrl:      { type: String, default: "" }
    },
    data: () => ({
    }),
    async mounted () {
        /*  establish renderer  */
        renderer = new CanvasRenderer()
        renderer.configure({
            camera:   this.cam,
            ptzFreeD: this.options.get("ptzFreeD"),
            ptzKeys:  this.options.get("ptzKeys")
        })
        const canvas = this.$refs.canvas as HTMLCanvasElement
        await renderer.establish(canvas)
        renderer.start()

        /*  connect to server for PTZ and state updates  */
        const ws = new RecWebSocket(this.wsUrl + "/render", [], {
            reconnectionDelayGrowFactor: 1.3,
            maxReconnectionDelay:        4000,
            minReconnectionDelay:        1000,
            connectionTimeout:           4000,
            minUptime:                   5000
        })
        ws.addEventListener("open", (ev) => {
            ws.send(JSON.stringify({ cmd: "SUBSCRIBE", arg: this.cam }))
        })
        ws.addEventListener("message", (ev: MessageEvent) => {
            if (typeof ev.data !== "string") {
                console.log("WARNING: invalid WebSocket message received")
                return
            }
            const data: any = JSON.parse(ev.data)
            if (!(typeof data === "object" && typeof data.cmd === "string" && data.arg !== undefined)) {
                console.log("WARNING: invalid WebSocket message received", data)
                return
            }
            if (data.cmd === "PTZ" && data.arg?.cam === this.cam) {
                const state = data.arg.state as FreeDState
                if (this.options.get("ptzFreeD"))
                    renderer!.reflectFreeDState(state)
            }
            else if (data.cmd === "STATE") {
                const state = data.arg.state as StateTypePartial
                const errors = [] as Array<string>
                if (!Ducky.validate(state, StateSchemaPartial, errors))
                    throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
                renderer!.reflectSceneState(state)
            }
        })

        /*  load scene state once  */
        const state = await axios({
            method: "GET",
            url:    `${this.serviceUrl}state`
        }).then((response) => response.data).catch(() => null)
        if (state === null)
            throw new Error("failed to load state")
        const errors = [] as Array<string>
        if (!Ducky.validate(state, StateSchema, errors))
            throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
        if (renderer !== null)
            await renderer.reflectSceneState(state as StateType)
    },
    methods: {
    }
})
</script>

