<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Mixer</b> allows you to select a camera to be logically
        in preview and to logically cut this camera from preview into program.
        This allows you to ad-hoc adjust the configured FPS (see <b>Scene &rarr; Renderer</b>)
        onto all renderer instances during production in order to allow you to reduce the
        overall load all renderers cause on the underlying hardware. This is
        usually <i>not</i> manually controlled, but automatically controlled through
        a CUT button in <b>Companion</b> which both cuts here and in <b>vMix</b>.
    </div>
    <div class="control">
        <div class="cams">
            <div class="button cam" v-on:click="changePreview('CAM1')"
                v-bind:class="{
                    unselectable: mixer.preview === 'CAM1' || mixer.program === 'CAM1',
                    preview: mixer.program === 'CAM1',
                    program: mixer.program === 'CAM1'
                }">
                CAM1
                <div class="badge" v-bind:class="mixerStatus2Class('CAM1')">
                    {{ mixer.program === 'CAM1' ? state.renderer.program :
                    (mixer.preview === 'CAM1' ? state.renderer.preview :
                    state.renderer.other) }}
                </div>
            </div>
            <div class="button cam" v-on:click="changePreview('CAM2')"
                v-bind:class="{
                    unselectable: mixer.preview === 'CAM2' || mixer.program === 'CAM2',
                    preview: mixer.program === 'CAM2',
                    program: mixer.program === 'CAM2'
                }">
                CAM2
                <div class="badge" v-bind:class="mixerStatus2Class('CAM2')">
                    {{ mixer.program === 'CAM2' ? state.renderer.program :
                    (mixer.preview === 'CAM2' ? state.renderer.preview :
                    state.renderer.other) }}
                </div>
            </div>
            <div class="button cam" v-on:click="changePreview('CAM3')"
                v-bind:class="{
                    unselectable: mixer.preview === 'CAM3' || mixer.program === 'CAM3',
                    preview: mixer.program === 'CAM3',
                    program: mixer.program === 'CAM3'
                }">
                CAM3
                <div class="badge" v-bind:class="mixerStatus2Class('CAM3')">
                    {{ mixer.program === 'CAM3' ? state.renderer.program :
                    (mixer.preview === 'CAM3' ? state.renderer.preview :
                    state.renderer.other) }}
                </div>
            </div>
            <div class="button cam" v-on:click="changePreview('CAM4')"
                v-bind:class="{
                    unselectable: mixer.preview === 'CAM4' || mixer.program === 'CAM4',
                    preview: mixer.program === 'CAM4',
                    program: mixer.program === 'CAM4'
                }">
                CAM4
                <div class="badge" v-bind:class="mixerStatus2Class('CAM4')">
                    {{ mixer.program === 'CAM4' ? state.renderer.program :
                    (mixer.preview === 'CAM4' ? state.renderer.preview :
                    state.renderer.other) }}
                </div>
            </div>
            <div class="button cut" v-on:click="cutPreviewToProgram()">
                CUT
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
    .control
        .cams
            margin-right: 20px
            display: grid
            grid-template-columns: 100px 100px 100px 100px 100px 100px
            grid-template-rows: 90px
            justify-content: center
            align-items: center
            gap: 10px 10px
            .button
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-5)
                border-radius: 4px
                padding: 2px 8px 2px 8px
                text-align: center
                font-size: 12pt
                font-weight: normal
                line-height: 50px
                width: calc(100% - 2 * 8px)
                height: calc(100% - 2 * 2px)
                position: relative
                cursor: pointer
                &.selected
                    background-color: var(--color-acc-bg-3)
                    color: var(--color-acc-fg-5)
                &:hover
                    background-color: var(--color-acc-bg-5)
                    color: var(--color-acc-fg-5)
                &.unselectable:hover
                    background-color: var(--color-std-bg-2)
                    color: var(--color-std-fg-5)
                    cursor: default
                &.cut
                    line-height: 90px
                    font-weight: bold
                &.cut:hover
                    background-color: var(--color-sig-bg-2)
                    color: var(--color-sig-fg-5)
                .badge
                    position: absolute
                    top: 40px
                    left: 35px
                    width: 30px
                    height: 30px
                    border-radius: 4px
                    font-size: 16px
                    font-weight: 200
                    line-height: 28px
                    &.other
                        background-color: var(--color-std-bg-4)
                        color: var(--color-std-fg-5)
                    &.preview
                        background-color: var(--color-acc-bg-2)
                        color: var(--color-acc-fg-5)
                    &.program
                        background-color: var(--color-sig-bg-2)
                        color: var(--color-sig-fg-5)
                &:hover .badge.other
                    background-color: var(--color-acc-bg-4)
                    color: var(--color-acc-fg-5)
</style>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import axios                              from "axios"
import { type MixerState }                from "../common/app-mixer"
import { type StateType }                 from "../common/app-state"
</script>

<script lang="ts">
type Connection = { online: boolean, recv: boolean, send: boolean }

export default defineComponent({
    name: "app-control-mixer",
    props: {
        serviceUrl:  { type: String,                         required: true },
        connection:  { type: Object as PropType<Connection>, required: true },
        state:       { type: Object as PropType<StateType>,  required: true }
    },
    data: () => ({
        mixer: {
            preview: "",
            program: ""
        } as MixerState
    }),
    async mounted () {
        await this.loadMixerState()
    },
    methods: {
        /*  receive a mixer state  */
        onMessageMixer (data: any) {
            if (this.mixer.preview !== data.mixer?.preview)
                this.mixer.preview = data.mixer?.preview
            if (this.mixer.program !== data.mixer?.program)
                this.mixer.program = data.mixer?.program
        },

        /*  map mixer status to CSS class name  */
        mixerStatus2Class (cam: string) {
            const clazz = {} as any
            if (this.mixer.program === cam)
                clazz.program = true
            else if (this.mixer.preview === cam)
                clazz.preview = true
            else
                clazz.other = true
            return clazz
        },

        /*  change preview  */
        async changePreview (cam: string) {
            /*  do not select unselectables  */
            if (this.mixer.preview === cam || this.mixer.program === cam)
                return

            /*  change preview state  */
            this.mixer.preview = cam

            /*  tell server about state change  */
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}mixer/preview/${this.mixer.preview}`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
        },

        /*  cut preview to program (aka exchange preview with program)  */
        async cutPreviewToProgram () {
            /*  ensure we have a preview  */
            if (this.mixer.preview === "")
                return

            /*  exchange preview with program state  */
            const program = this.mixer.program
            this.mixer.program = this.mixer.preview
            this.mixer.preview = program

            /*  tell server about state change  */
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}mixer/cut`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
        },

        /*  load mixer state  */
        async loadMixerState () {
            this.connection.recv = true
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}mixer/state`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            }) as MixerState
            if (state === null)
                throw new Error("failed to load mixer state")
            this.mixer.program = state.program
            this.mixer.preview = state.preview
        }
    }
})
</script>
