<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-control">
        <!--  HEADER  -->
        <div class="head">
            <img class="logo" src="../../res/app-icon.svg?url" alt="" />
            <b>Studio Canvas</b> Control
            <div class="stats">
                <span class="icon"><i class="fa fa-video"></i></span>
                <span class="figure">{{ stats.peers.camera }}</span>
                <span class="icon"><i class="fa fa-image"></i></span>
                <span class="figure">{{ stats.peers.render }}</span>
                <span class="icon"><i class="fa fa-gear"></i></span>
                <span class="figure">{{ stats.peers.control }}</span>
            </div>
        </div>

        <!--  BODY  -->
        <div class="body">
            <tabs ref="tabs"
                class="tabs-level-1"
                v-bind:options="{ useUrlFragment: false }"
                v-bind:cache-lifetime="0"
                v-on:changed="tabChanged0">
                <tab id="control" name="Control">
                    <tabs ref="control"
                        class="tabs-level-2"
                        v-bind:options="{ useUrlFragment: false }"
                        v-bind:cache-lifetime="0"
                        v-on:changed="tabChanged1">
                        <!--  ==== PRESETS ====  -->
                        <tab id="presets" name="Presets">
                            <app-control-preset
                                ref="preset"
                                v-bind:service-url="serviceUrl"
                                v-bind:connection="connection"
                                v-bind:raise-status="raiseStatus"
                                v-bind:export-state="exportState"
                                v-bind:merge-state="mergeState"
                            />
                        </tab>

                        <!--  ==== Mixer ====  -->
                        <tab id="mixer" name="Mixer" class="mixer">
                            <app-control-mixer
                                ref="mixer"
                                v-bind:service-url="serviceUrl"
                                v-bind:connection="connection"
                                v-bind:state="state"
                            />
                        </tab>

                        <!--  ==== PREVIEW ====  -->
                        <tab id="preview" name="Preview" class="preview">
                            <app-control-preview
                                ref="preview"
                                v-bind:service-url="serviceUrl"
                            />
                        </tab>
                    </tabs>
                </tab>
                <tab id="scene" name="Scene">
                    <tabs ref="scene"
                        class="tabs-level-2"
                        v-bind:options="{ useUrlFragment: false }"
                        v-bind:cache-lifetime="0"
                        v-on:changed="tabChanged1">
                        <!--  ==== Renderer ====  -->
                        <tab id="renderer" name="Renderer">
                            <app-control-renderer
                                ref="renderer"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                            />
                        </tab>

                        <!--  ==== STREAMS ====  -->
                        <tab id="streams" name="Streams">
                            <app-control-streams
                                ref="streams"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== MEDIA ====  -->
                        <tab id="media" name="Media" class="media">
                            <app-control-media
                                ref="media"
                                v-bind:service-url="serviceUrl"
                                v-bind:connection="connection"
                                v-bind:state="state"
                                v-bind:patch-state="patchState"
                                v-bind:watch-state="watchState"
                            />
                        </tab>
                    </tabs>
                </tab>
                <tab id="displays" name="Displays">
                    <tabs ref="displays"
                        class="tabs-level-2"
                        v-bind:options="{ useUrlFragment: false }"
                        v-bind:cache-lifetime="0"
                        v-on:changed="tabChanged1">
                        <!--  ==== CANVAS ====  -->
                        <tab id="canvas" name="Canvas" class="canvas">
                            <app-control-canvas
                                ref="canvas"
                                v-bind:service-url="serviceUrl"
                                v-bind:connection="connection"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                                v-bind:patch-state="patchState"
                                v-bind:watch-state="watchState"
                            />
                        </tab>

                        <!--  ==== DECAL ====  -->
                        <tab id="decal" name="Decal">
                            <app-control-decal
                                ref="decal"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== MONITOR ====  -->
                        <tab id="monitor" name="Monitor">
                            <app-control-monitor
                                ref="monitor"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== PILLAR ====  -->
                        <tab id="pillar" name="Pillar">
                            <app-control-pillar
                                ref="pillar"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== PLATE ====  -->
                        <tab id="plate" name="Plate">
                            <app-control-plate
                                ref="plate"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== HOLOGRAM ====  -->
                        <tab id="hologram" name="Hologram">
                            <app-control-hologram
                                ref="hologram"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== PANE ====  -->
                        <tab id="pane" name="Pane">
                            <app-control-pane
                                ref="pane"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== MASK ====  -->
                        <tab id="mask" name="Mask">
                            <app-control-mask
                                ref="mask"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>
                    </tabs>
                </tab>
                <tab id="ambient" name="Ambient">
                    <tabs ref="ambient"
                        class="tabs-level-2"
                        v-bind:options="{ useUrlFragment: false }"
                        v-bind:cache-lifetime="0"
                        v-on:changed="tabChanged1">
                        <!--  ==== LIGHTS ====  -->
                        <tab id="lights" name="Lights">
                            <app-control-lights
                                ref="lights"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== AVATARS ====  -->
                        <tab name="Avatars">
                            <app-control-avatars
                                ref="avatars"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>

                        <!--  ==== REFERENCES ====  -->
                        <tab name="References">
                            <app-control-references
                                ref="references"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                            />
                        </tab>
                    </tabs>
                </tab>
                <tab id="cameras" name="Cameras">
                    <tabs ref="cameras"
                        class="tabs-level-2"
                        v-bind:options="{ useUrlFragment: false }"
                        v-bind:cache-lifetime="0"
                        v-on:changed="tabChanged1">
                        <!--  ==== CAM1/2/3/4 ====  -->
                        <tab v-for="cam in [ 'CAM1', 'CAM2', 'CAM3', 'CAM4' ]"
                            v-bind:key="cam"
                            v-bind:id="cam.toLowerCase()"
                            v-bind:name="cam">
                            <app-control-camera
                                v-bind:ref="`camera-${cam}`"
                                v-bind:cam="cam"
                                v-bind:cam-state="camState"
                                v-bind:state="state"
                                v-bind:field-import="fieldImport"
                                v-bind:field-export="fieldExport"
                                v-bind:format-slider-value="formatSliderValue"
                                v-bind:tab-changed1="tabChanged1"
                            />
                        </tab>
                    </tabs>
                </tab>
            </tabs>
        </div>

        <!--  FOOTER  -->
        <div class="foot" v-bind:class="{
            error:   status.kind === 'error',
            warning: status.kind === 'warning',
            info:    status.kind === 'info'
        }">
            <!--  Application Status Information  -->
            <div class="status">
                {{ status.kind === '' ? `${pkg.name} ${pkg.version} (${pkg["x-date"]})` : status.msg }}
            </div>

            <!--  Server Connection Information  -->
            <div class="connection">
                <!--  Online  -->
                <div class="online yes" v-show="connection.online">
                    <i class="fa-solid fa-plug-circle-check"></i>
                </div>
                <div class="online no" v-show="!connection.online">
                    <i class="fa-solid fa-plug-circle-xmark"></i>
                </div>

                <!--  Traffic Send  -->
                <div class="traffic send" v-bind:class="{ active: connection.send }">
                    <i class="fa-solid fa-circle"></i>
                </div>

                <!--  Traffic Recv  -->
                <div class="traffic recv" v-bind:class="{ active: connection.recv }">
                    <i class="fa-solid fa-circle"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
.app-control
    width:  100vw
    height: 100vh
    min-width: 900px
    min-height: 600px
    overflow: hidden
    margin: 0
    padding: 0
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    .head
        background-color: var(--color-std-bg-1)
        color: var(--color-std-fg-1)
        padding: 10px 40px
        width:  calc(100% - 2 * 40px)
        height: 20px
        font-weight: 200
        font-size: 20px
        line-height: 20px
        position: relative
        .logo
            position: relative
            top: 2px
            height: 20px
            margin-right: 10px
        .stats
            border: 1px solid var(--color-std-bg-3)
            background-color: var(--color-std-bg-2)
            position: absolute
            right: 40px
            top: 8px
            font-size: 12pt
            font-weight: normal
            border-radius: 4px
            padding: 2px 8px 2px 8px
            .icon
                color: var(--color-std-fg-1)
                margin-right: 8px
            .figure
                color: var(--color-std-fg-5)
                margin-right: 16px
    .body
        flex-grow: 1
        background-color: var(--color-std-bg-0)
        color: var(--color-std-fg-5)
        padding: 10px 10px
        width:  calc(100% - 2 * 10px)
        height: calc(100% - 2 * 10px)
        overflow: hidden
    .foot
        background-color: var(--color-std-bg-1)
        color: var(--color-std-fg-1)
        padding: 13px 40px
        width:  calc(100% - 2 * 40px)
        height: 14px
        font-weight: 200
        font-size: 14px
        line-height: 14px
        display: flex
        flex-direction: row
        justify-content: center
        align-items: center
        &.info
            font-weight: normal
            background-color: var(--color-std-bg-5)
            color: var(--color-std-fg-5)
        &.warning
            font-weight: bold
            background-color: var(--color-acc-bg-3)
            color: var(--color-acc-fg-5)
        &.error
            font-weight: bold
            background-color: var(--color-sig-bg-3)
            color: var(--color-sig-fg-5)
        .status
            flex-grow: 1
        .connection
            border: 1px solid var(--color-std-bg-3)
            background-color: var(--color-std-bg-2)
            border-radius: 4px
            padding: 4px 8px 4px 8px
            display: flex
            flex-direction: row
            justify-content: center
            align-items: center
            .online
                margin-right: 8px
                &.yes
                    color: var(--color-std-fg-1)
                &.no
                    color: var(--color-sig-fg-1)
            .traffic
                &.send
                    margin-right: 4px
                    color: var(--color-std-fg-1)
                    &.active
                        color: var(--color-sig-fg-1)
                &.recv
                    color: var(--color-std-fg-1)
                    &.active
                        color: var(--color-acc-fg-1)
    .tabs-component
        height: 100%
        display: flex
        flex-direction: column
        justify-content: flex-start
        align-items: flex-start
    .tabs-component-panels
        flex-grow: 1
        display: flex
        flex-direction: column
        justify-content: flex-start
        align-items: flex-start
    .tabs-component-panel
        flex-grow: 1
        display: flex
        flex-direction: column
        justify-content: flex-start
        align-items: flex-start
        width: 100%
    .tabs-component-tab-a
        padding: 2px 4px 2px 4px
        font-size: 11pt
    .desc
        width: 90%
        font-weight: 200
        color: var(--color-std-fg-3)
        margin-bottom: 20px
        b
            font-weight: normal
    .canvas,
    .media >
        .actions
            margin-top: 10px
            display: flex
            flex-direction: row
            > .button
                background-color: var(--color-std-bg-1)
                color: var(--color-std-fg-1)
                border-radius: 4px
                padding: 2px 8px 2px 8px
                text-align: center
                font-size: 12pt
                line-height: 24px
                width: 100px
                height: auto
                cursor: pointer
                margin-right: 4px
                &:hover
                    background-color: var(--color-sig-bg-5)
                    color: var(--color-sig-fg-5)
                &.unselectable:hover
                    background-color: var(--color-std-bg-1)
                    color: var(--color-std-fg-1)
                    cursor: default
    .control
        display: grid
        grid-template-columns: auto auto auto 7vw auto auto
        grid-template-rows: auto
        justify-content: start
        align-items: center
        gap: 10px 10px
        .label1,
        .label2,
        .label3
            white-space: nowrap
        .label1
            color: var(--color-acc-fg-5)
            width: 80px
        .label2
            width: 110px
        .label3
            font-weight: 200
            width: 80px
        .value
            justify-self: end
            input
                width: 60px
                font-size: 12pt
                font-weight: bold
                outline: none
                border-radius: 4px
                border: 0
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-4)
                padding: 4px 8px 4px 8px
                text-align: right
                &:focus
                    background-color: var(--color-acc-bg-4)
                    color: var(--color-acc-fg-5)
            .fixed
                width: 60px
                font-size: 12pt
                font-weight: normal
                outline: none
                border-radius: 4px
                border: 0
                background-color: var(--color-acc-bg-2)
                color: var(--color-acc-fg-1)
                padding: 2px 8px 2px 8px
                text-align: center
        .button
            background-color: var(--color-std-bg-2)
            color: var(--color-std-fg-5)
            border-radius: 4px
            padding: 2px 8px 2px 8px
            min-height: 20px
            text-align: center
            font-size: 10pt
            font-weight: 200
            cursor: pointer
            &.reset
                margin-left: 10px
                margin-right: 10px
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-5)
                &:hover
                    background-color: var(--color-sig-bg-4)
                    color: var(--color-sig-fg-5)
                &.default
                    background-color: var(--color-std-bg-3)
                    color: var(--color-std-fg-2)
                    &:hover
                        background-color: var(--color-std-bg-3)
                        color: var(--color-std-fg-2)
            &:hover
                background-color: var(--color-acc-bg-4)
                color: var(--color-acc-fg-5)
        input.text
            background-color: var(--color-acc-bg-3)
            color: var(--color-acc-fg-5)
            border: 0
            border-radius: 4px
            padding: 6px 12px 6px 12px
            outline: none
            font-weight: bold
            font-size: 12pt
            width: calc(400px - 2 * 12px)
            &:focus
                background-color: var(--color-acc-bg-4)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
    .radios
        display: flex
        flex-direction: row
        justify-content: flex-start
        align-items: center
        .button
            margin-right: 4px
            &.selected
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
</style>

<script setup lang="ts">
// @ts-ignore
import pkg                  from "../../package.json"
import { defineComponent }  from "vue"
import RecWebSocket         from "@opensumi/reconnecting-websocket"
import Ducky                from "ducky"
import axios                from "axios"
import moment               from "moment"
import AppControlPreset     from "./app-control-preset.vue"
import AppControlMixer      from "./app-control-mixer.vue"
import AppControlPreview    from "./app-control-preview.vue"
import AppControlRenderer   from "./app-control-renderer.vue"
import AppControlStreams    from "./app-control-streams.vue"
import AppControlMedia      from "./app-control-media.vue"
import AppControlCanvas     from "./app-control-canvas.vue"
import AppControlDecal      from "./app-control-decal.vue"
import AppControlMonitor    from "./app-control-monitor.vue"
import AppControlPillar     from "./app-control-pillar.vue"
import AppControlPlate      from "./app-control-plate.vue"
import AppControlHologram   from "./app-control-hologram.vue"
import AppControlPane       from "./app-control-pane.vue"
import AppControlMask       from "./app-control-mask.vue"
import AppControlLights     from "./app-control-lights.vue"
import AppControlAvatars    from "./app-control-avatars.vue"
import AppControlReferences from "./app-control-references.vue"
import AppControlCamera     from "./app-control-camera.vue"
import { Tabs, Tab }        from "vue3-tabs-component"
import { type FreeDState }  from "../common/app-freed"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial,
    StateDefault,
    StatePaths,
    StateUtil
} from "../common/app-state"
</script>

<script lang="ts">
let statusTimer: ReturnType<typeof setTimeout> | null = null
export default defineComponent({
    name: "app-control",
    components: {
        "app-control-preset":     AppControlPreset,
        "app-control-mixer":      AppControlMixer,
        "app-control-preview":    AppControlPreview,
        "app-control-renderer":   AppControlRenderer,
        "app-control-streams":    AppControlStreams,
        "app-control-media":      AppControlMedia,
        "app-control-canvas":     AppControlCanvas,
        "app-control-decal":      AppControlDecal,
        "app-control-monitor":    AppControlMonitor,
        "app-control-pillar":     AppControlPillar,
        "app-control-plate":      AppControlPlate,
        "app-control-hologram":   AppControlHologram,
        "app-control-pane":       AppControlPane,
        "app-control-mask":       AppControlMask,
        "app-control-lights":     AppControlLights,
        "app-control-avatars":    AppControlAvatars,
        "app-control-references": AppControlReferences,
        "app-control-camera":     AppControlCamera,
        "tabs":   Tabs,
        "tab":    Tab
    },
    props: {
        selectTab0: { type: String, default: "control" },
        selectTab1: { type: String, default: "presets" },
        serviceUrl: { type: String, default: "" },
        wsUrl:      { type: String, default: "" }
    },
    data: () => ({
        formatSliderValue: (v: number) => v.toFixed(2),
        tab0: "",
        tab1: "",
        state: StateDefault as StateType,
        watchState: { flag: true },
        camState: new Map<string, FreeDState>(),
        status: {
            kind: "",
            msg:  ""
        },
        connection: {
            online: false,
            send:   false,
            recv:   false
        },
        pkg,
        stats: {
            peers: {
                camera:  0,
                render:  0,
                control: 0
            }
        },
    }),
    async mounted () {
        /*  force particular tab to be selected  */
        (this.$refs.tabs as any).selectTab(`#${this.selectTab0}`)
        if (this.$refs[this.selectTab0] !== undefined)
            (this.$refs[this.selectTab0] as any).selectTab(`#${this.selectTab1}`)

        /*  establish server connection  */
        this.log("INFO", "establish WebSocket server connection")
        const ws = new RecWebSocket(this.wsUrl + "/control", [], {
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
            this.connection.online = true
            ws.send(JSON.stringify({ cmd: "SUBSCRIBE", arg: "CAM1" }))
            ws.send(JSON.stringify({ cmd: "SUBSCRIBE", arg: "CAM2" }))
            ws.send(JSON.stringify({ cmd: "SUBSCRIBE", arg: "CAM3" }))
            ws.send(JSON.stringify({ cmd: "SUBSCRIBE", arg: "CAM4" }))
        })
        ws.addEventListener("close", (ev) => {
            this.connection.online = false
            this.raiseStatus("error", "WebSocket connection failed/closed", 2000)
        })

        /*  receive server messages  */
        ws.addEventListener("message", (ev: MessageEvent) => {
            this.connection.recv = true
            setTimeout(() => {
                this.connection.recv = false
            }, 250)
            if (typeof ev.data !== "string") {
                this.raiseStatus("warning", "invalid WebSocket message received", 1000)
                return
            }
            const data: any = JSON.parse(ev.data)
            if (!(typeof data === "object" && typeof data.cmd === "string" && data.arg !== undefined)) {
                this.raiseStatus("warning", "invalid WebSocket message received", 1000)
                return
            }
            if (data.cmd === "PTZ") {
                const cam   = data.arg.cam   as string
                const state = data.arg.state as FreeDState
                this.camState.set(cam, state)
            }
            else if (data.cmd === "STATE") {
                const state = data.arg.state as StateTypePartial
                const errors = [] as Array<string>
                if (!Ducky.validate(state, StateSchemaPartial, errors))
                    throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
                this.importState(state)
            }
            else if (data.cmd === "STATS") {
                this.stats.peers.camera  = data.arg.stats?.peers?.camera  ?? 0
                this.stats.peers.render  = data.arg.stats?.peers?.render  ?? 0
                this.stats.peers.control = data.arg.stats?.peers?.control ?? 0
            }
            else if (data.cmd === "MIXER")
                (this.$refs.mixer as any).onMessageMixer(data.arg)
        })

        /*  initially load state and presets once  */
        await this.loadState()

        /*  react on all subsequent state changes  */
        let timer: ReturnType<typeof setTimeout> | null = null
        let queue = [] as string[]
        for (const path of StatePaths) {
            this.$watch(`state.${path}`, () => {
                if (!this.watchState.flag)
                    return
                queue.push(path)
                if (timer !== null)
                    return
                timer = setTimeout(async () => {
                    timer = null
                    const paths = queue
                    queue = []
                    await this.patchState(paths)
                }, 100)
            })
        }
    },
    methods: {
        log (level: string, msg: string) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            console.log(`${timestamp} [${level}]: ${msg}`)
        },

        /*  raise a temporarily visible status message in the footer  */
        raiseStatus (kind: string, msg: string, duration = 4000) {
            this.status.kind = kind
            this.status.msg  = msg
            if (statusTimer !== null)
                clearTimeout(statusTimer)
            statusTimer = setTimeout(() => {
                this.status.kind = ""
                this.status.msg  = ""
                statusTimer = null
            }, duration)
        },

        /*  update URL on tab changes  */
        tabChanged0 (tab: any) {
            this.tab0 = tab.tab.computedId
            if (this.$refs[this.tab0] !== undefined)
                this.tab1 = (this.$refs[this.tab0] as any).activeTabHash.replace(/^#/, "")
            window.location.hash = `#/control/${this.tab0}/${this.tab1}`
        },
        tabChanged1 (tab: any) {
            this.tab1 = tab.tab.computedId
            window.location.hash = `#/control/${this.tab0}/${this.tab1}`
        },

        /*  import a field  */
        fieldImport (txt: string, min: number, max: number) {
            txt = txt.replace(/^s+/, "").replace(/\s+$/, "")
            let n = parseFloat(txt)
            if (Number.isNaN(n))
                n = 0
            n = Math.max(Math.min(n, max), min)
            return n
        },

        /*  export a field  */
        fieldExport (n: number, digits = 2, nosign = false) {
            let txt = n.toFixed(digits)
            if (!txt.match(/^-/) && !nosign)
                txt = `+${txt}`
            return txt
        },

        /*  merge partial state into current state  */
        mergeState (state: Readonly<StateTypePartial>, paths?: Readonly<string[]>) {
            return StateUtil.copy(this.state, state, paths)
        },

        /*  import partial state into current state  */
        importState (state: Readonly<StateTypePartial>, paths?: Readonly<string[]>) {
            this.watchState.flag = false
            const changed = this.mergeState(state, paths)
            if (changed)
                setTimeout(() => { this.watchState.flag = true }, 50)
            else
                this.watchState.flag = true
        },

        /*  export partial state from current state  */
        exportState (paths?: Readonly<string[]>): StateTypePartial {
            const dst = {}
            StateUtil.copy(dst, this.state, paths)
            return dst
        },

        /*  load current state  */
        async loadState () {
            this.connection.recv = true
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            })
            if (state === null)
                throw new Error("failed to load state")
            const errors = [] as Array<string>
            if (!Ducky.validate(state, StateSchema, errors))
                throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
            this.mergeState(state as StateType)
        },

        /*  save current state  */
        async saveState () {
            this.connection.send = true
            await axios({
                method: "POST",
                url:    `${this.serviceUrl}state`,
                data:   this.state
            }).finally(() => {
                this.connection.send = false
            })
        },

        /*  patch current state  */
        async patchState (paths: Readonly<string[]>) {
            const state = {}
            StateUtil.copy(state, this.state, paths)
            this.connection.send = true
            await axios({
                method: "PATCH",
                url:    `${this.serviceUrl}state`,
                data:   state
            }).finally(() => {
                this.connection.send = false
            })
        }
    }
})
</script>

