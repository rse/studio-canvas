<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Canvas</b> is the background of the scene.
        It can be either based on a single image for rendering a static canvas,
        or it can be two images providing a dynamic canvas through a cross-fade effect (indicated
        by the tag "FADE"). Some canvas are exclusively designed for particular events (indicated
        by the tag "EXCL") and hence should be not reused for other events.
        All canvas images have to be exactly 10540x2250 pixels in size.
    </div>
    <div class="control">
        <div class="label1">transition</div>
        <div class="label2">(type)</div>
        <div class="label3">[id]:</div>
        <div class="value">
            <div class="fixed">{{ state.canvas.transType.toUpperCase() }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.canvas.transType = 'fade'"
            v-bind:class="{ default: state.canvas.transType === 'fade' }">
            RESET
        </div>
        <div class="radios">
            <div class="button" v-bind:class="{ selected: state.canvas.transType === 'fade' }" v-on:click="state.canvas.transType = 'fade'">FADE</div>
            <div class="button" v-bind:class="{ selected: state.canvas.transType === 'slide-l' }" v-on:click="state.canvas.transType = 'slide-l'">SLIDE-L</div>
            <div class="button" v-bind:class="{ selected: state.canvas.transType === 'slide-r' }" v-on:click="state.canvas.transType = 'slide-r'">SLIDE-R</div>
            <div class="button" v-bind:class="{ selected: state.canvas.transType === 'slice' }" v-on:click="state.canvas.transType = 'slice'">SLICE</div>
        </div>

        <div class="label1">transition</div>
        <div class="label2">(duration)</div>
        <div class="label3">[sec]:</div>
        <div class="value">
            <input tabindex="5" v-bind:value="fieldExport(state.canvas.transTime)"
                v-on:change="(ev) => state.canvas.transTime = fieldImport((ev.target! as HTMLInputElement).value, 0.2, 8.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.canvas.transTime = 2.0"
            v-bind:class="{ default: state.canvas.transTime === 2.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.canvas.transTime"
                v-bind:min="0.2" v-bind:max="8.0" v-bind:step="0.10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">Z-rotate</div>
        <div class="label2">(rotate right/left)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="5" v-bind:value="fieldExport(state.canvas.rotationZ)"
                v-on:change="(ev) => state.canvas.rotationZ = fieldImport((ev.target! as HTMLInputElement).value, -10, +10)"/>
        </div>
        <div class="button reset"
            v-on:click="state.canvas.rotationZ = 0"
            v-bind:class="{ default: state.canvas.rotationZ === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.canvas.rotationZ"
                v-bind:min="-10" v-bind:max="+10" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>
    </div>
    <div class="list" ref="list">
        <div
            v-for="(group, i) in imageList.map((e) => e.group).filter((v, i, a) => v !== '' && a.indexOf(v) === i)"
            class="list-group"
            v-bind:class="{ selected: openGroup === group, alt: i % 2 == 1 }"
            v-bind:key="group"
        >
            <div class="name"
                v-on:click="openGroup = openGroup !== group ? group : ''">
                <span class="icon">
                    <span v-show="openGroup !== group"><i class="fa fa-caret-right"></i></span>
                    <span v-show="openGroup === group"><i class="fa fa-caret-down" ></i></span>
                </span>
                <span>{{ group }}</span>
            </div>
            <div
                v-show="openGroup === group"
                v-for="(entry, j) in imageList.filter((e) => e.group === group)"
                class="list-entry"
                v-bind:class="{ selected: entry.id === state.canvas.id, alt: j % 2 == 1 }"
                v-bind:key="entry.id!"
                v-on:click="selectImage(entry.id!)"
            >
                <div class="name">{{ entry.name }}</div>
                <div class="tags">
                    <div v-show="entry.texture2" class="tag tag-fade">FADE</div>
                    <div v-show="entry.exclusive" class="tag tag-exclusive">EXCL</div>
                </div>
            </div>
        </div>
        <div
            v-for="(entry, i) in imageList.filter((e) => e.group === '')"
            class="list-entry"
            v-bind:class="{ selected: entry.id === state.canvas.id, alt: i % 2 == 1 }"
            v-bind:key="entry.id!"
            v-on:click="selectImage(entry.id!)"
        >
            <div class="name">{{ entry.name }}</div>
            <div class="tags">
                <div v-show="entry.texture2" class="tag tag-fade">FADE</div>
                <div v-show="entry.exclusive" class="tag tag-exclusive">EXCL</div>
            </div>
        </div>
    </div>
    <div class="actions">
        <div class="button"
            v-on:click="imageListFetch()">
            RELOAD
        </div>
        <div class="button"
            v-bind:class="{ unselectable: state.canvas.texture2 === '' }"
            v-on:click="syncCanvas()">
            SYNC
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import axios                              from "axios"
import Slider                             from "@vueform/slider"
import PerfectScrollbar                   from "perfect-scrollbar"
import { type StateType }                 from "../common/app-state"
import { type ImageEntry }                from "../common/app-canvas"
</script>

<script lang="ts">
type Connection        = { online: boolean, recv: boolean, send: boolean }
type FieldImport       = (txt: string, min: number, max: number) => number
type FieldExport       = (n: number, digits?: number, nosign?: boolean ) => string
type FormatSliderValue = (v: number) => string
type WatchState        = { flag: boolean }
type PatchState        = (paths: Readonly<string[]>) => Promise<void>

export default defineComponent({
    name: "app-control-streams",
    components: {
        "slider": Slider
    },
    props: {
        serviceUrl:        { type: String,                                  required: true },
        connection:        { type: Object   as PropType<Connection>,        required: true },
        state:             { type: Object   as PropType<StateType>,         required: true },
        fieldImport:       { type: Function as PropType<FieldImport>,       required: true },
        fieldExport:       { type: Function as PropType<FieldExport>,       required: true },
        formatSliderValue: { type: Function as PropType<FormatSliderValue>, required: true },
        watchState:        { type: Object   as PropType<WatchState>,        required: true },
        patchState:        { type: Function as PropType<PatchState>,        required: true }
    },
    data: () => ({
        imageList: [] as ImageEntry[],
        openGroup: "",
        ps: null as PerfectScrollbar | null,
    }),
    async mounted () {
        await this.imageListFetch()
        this.state.canvas.id = this.imageList[0]?.id ?? ""
        this.openGroup = this.imageList.find((e) => e.id === this.state.canvas.id)?.group ?? ""
        this.$watch("state.canvas.id", (id: string) => {
            this.openGroup = this.imageList.find((e) => e.id === id)?.group ?? ""
        })

        this.ps = new PerfectScrollbar(this.$refs.list as HTMLElement, {
            suppressScrollX: true,
            scrollXMarginOffset: 100
        })
    },
    methods: {
        /*  fetch list of canvas images  */
        async imageListFetch () {
            this.connection.recv = true
            const result = await (axios({
                method:       "GET",
                url:          `${this.serviceUrl}canvas`,
                responseType: "json"
            }).then((result: any) => {
                return result.data.images
            }).finally(() => {
                this.connection.recv = false
            }) as Promise<ImageEntry[]>)
            this.imageList = result
        },

        /*  select canvas image  */
        async selectImage (id: string) {
            const entry = this.imageList.find((entry) => entry.id === id)
            if (entry === undefined)
                return
            this.watchState.flag = false
            this.state.canvas.id        = id
            this.state.canvas.texture1  = entry.texture1
            if (entry.texture2)
                this.state.canvas.texture2  = entry.texture2
            else
                this.state.canvas.texture2  = ""
            if (entry.fadeTrans)
                this.state.canvas.fadeTrans = entry.fadeTrans
            else
                this.state.canvas.fadeTrans = 0
            if (entry.fadeWait)
                this.state.canvas.fadeWait  = entry.fadeWait
            else
                this.state.canvas.fadeWait  = 0
            await this.patchState([ "canvas.*" ])
            this.watchState.flag = true
        },

        /*  synchronize renderer instances  */
        async syncCanvas () {
            if (this.state.canvas.texture2 === "")
                return

            /*  tell server about sync  */
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}canvas/sync`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
        }
    }
})
</script>

