<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-render">
        <canvas ref="canvas"></canvas>
        <div v-show="debug !== ''" class="debug">
            {{ debug }}
        </div>
        <div v-show="overlayShow" class="overlay">
            <div class="box">
                <img class="logo" src="../../res/app-icon.svg?url" alt=""/>
                <div class="name"><span class="name1">Studio</span> <span class="name2">Canvas</span></div>
                <div class="vers">{{ pkg.version }} ({{ pkg["x-date"] }})</div>
            </div>
            <div class="spin">
                <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
            <div class="text">{{ overlayText }}</div>
        </div>
        <div v-show="fpsOverlayEnable && fps === 0" class="mask">
            <div class="box">
                <div class="icon">
                    <i class="fas fa-circle-pause"></i>
                </div>
                <div class="text1">RENDERING PAUSED</div>
                <div class="text2">(not in preview or program)</div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
.app-render
    position: relative
    canvas
        top: 0
        left: 0
        width: 100vw
        height: 100vh
        touch-action: none
        border: 0
        outline: none
    .debug
        position: absolute
        top: 0
        left: 0
        width: 100%
        text-align: center
        background-color: #cc333380
        color: #fff
        font-size: 3vw
        word-wrap: break-word
    .overlay
        position: absolute
        top: 0
        left: 0
        width: 100%
        height: 100%
        background-color: var(--color-std-bg-1)
        color: var(--color-std-fg-3)
        display: flex
        flex-direction: column
        align-items: center
        justify-content: center
        .box
            display: flex
            flex-direction: column
            align-items: center
            justify-content: center
            border-radius: 2.5vw
            background-color: var(--color-std-bg-3)
            padding: 1.5vw
            margin-bottom: 2vw
            .logo
                width: 15vw
                margin-bottom: 1vw
            .name
                font-size: 2vw
                font-weight: bold
                .name1
                    color: var(--color-std-fg-3)
                .name2
                    color: var(--color-std-fg-5)
            .vers
                font-size: 1.5vw
                font-weight: 200
                color: var(--color-std-fg-1)
        .spin
            font-size: 5vw
            color: var(--color-acc-fg-3)
            margin-bottom: 1vw
        .text
            font-size: 2vw
            color: var(--color-acc-fg-3)
    .mask
        position: absolute
        top: 0
        left: 0
        width: 100%
        height: 100%
        background-color: var(--color-acc-bg-1)
        color: var(--color-acc-fg-3)
        display: flex
        flex-direction: column
        align-items: center
        justify-content: center
        opacity: 0.75
        .box
            display: flex
            flex-direction: column
            align-items: center
            justify-content: center
            border-radius: 1vw
            padding: 2vw
            color: var(--color-acc-fg-5)
            text-align: center
            .icon
                font-size: 16vw
            .text1
                font-size: 4vw
                font-weight: bold
            .text2
                font-size: 3vw
</style>

<script setup lang="ts">
// @ts-ignore
import pkg                        from "../../package.json"
import { defineComponent }        from "vue"
import RecWebSocket               from "@opensumi/reconnecting-websocket"
import Ducky                      from "ducky"
import moment                     from "moment"
import axios                      from "axios"
import Renderer                   from "./app-render"
import { MixerState }             from "../common/app-mixer"
import { ViewpointState }         from "../common/app-viewpoint"
import { FreeDState }             from "../common/app-freed"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial
} from "../common/app-state"
</script>

<script lang="ts">
let renderer: Renderer | null = null
let debugTimer: ReturnType<typeof setTimeout> | null = null
export default defineComponent({
    name: "app-render",
    components: {},
    props: {
        layer:      { type: String, default: "back" },
        cam:        { type: String, default: "" },
        options:    { type: Object, default: new Map<string, string | boolean>() },
        serviceUrl: { type: String, default: "" },
        wsUrl:      { type: String, default: "" }
    },
    data: () => ({
        debug: "",
        state: null,
        overlayShow: false,
        overlayText: "",
        fpsOverlayEnable: false,
        fps: 30
    }),
    created () {
        this.log("INFO", `starting ${pkg.name} ${pkg.version} (${pkg["x-date"]})`)
    },
    async mounted () {
        /*  establish renderer  */
        this.log("INFO", "establish Babylon game engine")
        this.overlay("establish Babylon game engine")
        this.overlayShow = true
        renderer = new Renderer({
            layer:       this.layer,
            cameraName:  this.cam,
            ptzFreeD:    this.options.get("ptzFreeD"),
            ptzKeys:     this.options.get("ptzKeys")
        })
        renderer.on("log", (level: string, msg: string) => {
            this.log(level, msg)
            this.overlay(msg)
        })
        renderer.on("DEBUG", (msg: string) => {
            this.setDebug(msg)
        })
        renderer.on("fps", (fps: number) => {
            this.fps = fps
        })
        const canvas = this.$refs.canvas as HTMLCanvasElement
        await renderer.establish(canvas)
        await renderer.start()

        /*  load scene state once  */
        this.log("INFO", "initially configuring Studio Canvas scene")
        this.overlay("initially configuring Studio Canvas scene")
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
        this.reflectSceneState(state as StateType)

        /*  connect to server for PTZ and state updates  */
        this.log("INFO", "establish WebSocket server connection")
        this.overlay("establish WebSocket server connection")
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
        let queueSceneState: Promise<void> = Promise.resolve()
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
                if (this.options.get("ptzFreeD") && state !== null)
                    renderer!.reflectFreeDState(state)
            }
            else if (data.cmd === "STATE") {
                const state = data.arg.state as StateTypePartial
                const errors = [] as Array<string>
                if (!Ducky.validate(state, StateSchemaPartial, errors)) {
                    this.log("WARNING", `invalid schema of loaded state: ${errors.join(", ")}`)
                    return
                }
                setTimeout(() => {
                    queueSceneState = queueSceneState.then(() => {
                        let promise: Promise<void>
                        try {
                            promise = renderer!.reflectSceneState(state).catch((err: Error) => {
                                this.log("ERROR", `reflecting scene state FAILED (1): ${err.toString()}`)
                            })
                            this.reflectSceneState(state as StateType)
                        }
                        catch (err: any) {
                            this.log("ERROR", `reflecting scene state FAILED (2): ${err.toString()}`)
                            promise = Promise.resolve()
                        }
                        return promise
                    }).catch((err: Error) => {
                        this.log("ERROR", `reflecting scene state FAILED (3): ${err.toString()}`)
                    })
                }, 0)
            }
            else if (data.cmd === "MIXER") {
                const mixer = data.arg.mixer as MixerState
                renderer!.reflectMixerState(mixer)
            }
            else if (data.cmd === "VIEWPOINT") {
                const viewpoint = data.arg.viewpoint as ViewpointState
                renderer!.reflectViewpointState(viewpoint)
            }
            else if (data.cmd === "SYNC") {
                const timestamp = data.arg.timestamp as number
                renderer!.reflectSyncTime(timestamp)
            }
            else if (data.cmd === "STATS") {
                /*  no-op in renderer  */
            }
            else
                this.log("WARNING", `unknown message received: cmd=${data.cmd} ${JSON.stringify(data)}`)
        })

        /*  give renderer time to initially render the scence at least once
            (before we potentially cause 0 FPS in the next step)  */
        this.log("INFO", "initially rendering Studio Canvas scene")
        this.overlay("initially rendering Studio Canvas scene")
        await renderer.reflectMixerState({ program: this.cam, preview: "" } satisfies MixerState)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        /*  load mixer state once  */
        this.log("INFO", "initially loading Studio Canvas camera mixer state")
        this.overlay("initially loading Studio Canvas camera mixer state")
        const mixer = await axios({
            method: "GET",
            url:    `${this.serviceUrl}mixer/state`
        }).then((response) => response.data).catch(() => null)
        if (mixer === null)
            throw new Error("failed to load mixer state")
        await renderer.reflectMixerState(mixer as MixerState)
        this.log("INFO", "ready for operation")
        this.overlay("ready for operation")
        setTimeout(() => {
            this.overlayShow = false
        }, 500)
    },
    methods: {
        log (level: string, msg: string) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            console.log(`${timestamp} [${level}]: ${msg}`)
        },
        overlay (msg: string) {
            this.overlayText = msg
        },
        reflectSceneState (state: StateTypePartial) {
            if (state.renderer?.overlay !== undefined)
                this.fpsOverlayEnable = state.renderer?.overlay
        },
        setDebug (msg: string) {
            this.debug = msg
            if (debugTimer !== null)
                clearTimeout(debugTimer)
            debugTimer = setTimeout(() => { this.debug = "" }, 4000)
        }
    }
})
</script>

