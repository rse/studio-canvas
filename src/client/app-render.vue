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
import moment                     from "moment"
import axios                      from "axios"
import CanvasRenderer             from "./app-render"
import { MixerState }             from "../common/app-mixer"
import { FreeDState }             from "../common/app-freed"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial
} from "../common/app-state"
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
    async mounted () {
        /*  establish renderer  */
        renderer = new CanvasRenderer()
        renderer.on("log", (level: string, msg: string) => {
            this.log(level, msg)
        })
        renderer.configure({
            camera:   this.cam,
            ptzFreeD: this.options.get("ptzFreeD"),
            ptzKeys:  this.options.get("ptzKeys")
        })
        const canvas = this.$refs.canvas as HTMLCanvasElement
        this.log("INFO", "establish Babylon game engine")
        await renderer.establish(canvas)
        await renderer.start()

        /*  connect to server for PTZ and state updates  */
        this.log("INFO", "establish WebSocket server connection")
        const ws = new RecWebSocket(this.wsUrl + "/render", [], {
            reconnectionDelayGrowFactor: 1.3,
            maxReconnectionDelay:        4000,
            minReconnectionDelay:        1000,
            connectionTimeout:           4000,
            minUptime:                   5000
        })
        let opened = 0
        ws.addEventListener("open", (ev) => {
            if (opened++ > 0)
                this.log("INFO", "re-established WebSocket server connection")
            ws.send(JSON.stringify({ cmd: "SUBSCRIBE", arg: this.cam }))
        })
        ws.addEventListener("error", (ev) => {
            this.log("WARNING", "WebSocket server connection error")
        })
        const queueSceneState = [] as Array<StateTypePartial>
        let queueSceneStateProcessed = false
        ws.addEventListener("message", (ev: MessageEvent) => {
            if (typeof ev.data !== "string") {
                this.log("WARNING", "invalid WebSocket server message received")
                return
            }
            const data: any = JSON.parse(ev.data)
            if (!(typeof data === "object" && typeof data.cmd === "string" && data.arg !== undefined)) {
                this.log("WARNING", "invalid WebSocket server message received")
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
                if (!Ducky.validate(state, StateSchemaPartial, errors)) {
                    this.log("WARNING", `invalid schema of loaded state: ${errors.join(", ")}`)
                    return
                }
                queueSceneState.push(state)
                if (!queueSceneStateProcessed) {
                    setTimeout(async () => {
                        queueSceneStateProcessed = true
                        while (queueSceneState.length > 0) {
                            const state = queueSceneState.shift()!
                            await renderer!.reflectSceneState(state)
                        }
                        queueSceneStateProcessed = false
                    }, 0)
                }
            }
            else if (data.cmd === "MIXER") {
                const mixer = data.arg.mixer as MixerState
                renderer!.reflectMixerState(mixer)
            }
            else if (data.cmd === "SYNC") {
                const timestamp = data.arg.timestamp as number
                renderer!.reflectSyncTime(timestamp)
            }
        })

        /*  load scene state once  */
        this.log("INFO", "initially configuring Studio Canvas scene")
        const state = await axios({
            method: "GET",
            url:    `${this.serviceUrl}state`
        }).then((response) => response.data).catch(() => null)
        if (state === null)
            throw new Error("failed to load state")
        const errors = [] as Array<string>
        if (!Ducky.validate(state, StateSchema, errors))
            throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
        await renderer.reflectSceneState(state as StateType)

        /*  give renderer time to initially render the scence at least once
            (before we potentially cause 0 FPS in the next step)  */
        this.log("INFO", "initially rendering Studio Canvas scene")
        await renderer.reflectMixerState({ program: this.cam, preview: "" } satisfies MixerState)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        /*  load mixer state once  */
        this.log("INFO", "initially loading Studio Canvas camera mixer state")
        const mixer = await axios({
            method: "GET",
            url:    `${this.serviceUrl}mixer/state`
        }).then((response) => response.data).catch(() => null)
        if (mixer === null)
            throw new Error("failed to load mixer state")
        await renderer.reflectMixerState(mixer as MixerState)
        this.log("INFO", "ready for operation")
    },
    methods: {
        log (level: string, msg: string) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            console.log(`${timestamp} [${level}]: ${msg}`)
        }
    }
})
</script>

