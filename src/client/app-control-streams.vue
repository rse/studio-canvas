<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Streams</b> are the video streams which can be displayed on
        the Decal, Monitor, Pillar, Plate, Hologram, Pane, and Mask. The content
        is received as a single virtual video device which had to carry 2 content stacks
        (left and right) and each stack consists of the content RGB
        on top of content alpha (black-to-white, 100-0% visibillity).
    </div>
    <div class="control">
        <div class="label1">video</div>
        <div class="label2">(device)</div>
        <div class="label3">[id]:</div>
        <div class="value">
            <div class="fixed">*</div>
        </div>
        <div class="button reset"
            v-on:click="state.streams.device = ''"
            v-bind:class="{ default: state.streams.device === '' }">
            RESET
        </div>
        <div class="slider">
            <input class="text" v-model.lazy="state.streams.device"/>
        </div>

        <div class="label1">size</div>
        <div class="label2">(width)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.streams.width, 0, true)"
                v-on:change="(ev) => state.streams.width = fieldImport((ev.target! as HTMLInputElement).value, 0, 3840)"/>
        </div>
        <div class="button reset"
            v-on:click="state.streams.width = 1920"
            v-bind:class="{ default: state.streams.width === 1920 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.streams.width"
                v-bind:min="0.0" v-bind:max="3840" v-bind:step="40"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">size</div>
        <div class="label2">(height)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.streams.height, 0, true)"
                v-on:change="(ev) => state.streams.height = fieldImport((ev.target! as HTMLInputElement).value, 0, 2160)"/>
        </div>
        <div class="button reset"
            v-on:click="state.streams.height = 1080"
            v-bind:class="{ default: state.streams.height === 1080 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.streams.height"
                v-bind:min="0.0" v-bind:max="2160" v-bind:step="40"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">fps</div>
        <div class="label2">(fps)</div>
        <div class="label3">[fps]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.streams.fps, 2, true)"
                v-on:change="(ev) => state.streams.fps = fieldImport((ev.target! as HTMLInputElement).value, 0, 60)"/>
        </div>
        <div class="button reset"
            v-on:click="state.streams.fps = 30.0"
            v-bind:class="{ default: state.streams.fps === 30.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.streams.fps"
                v-bind:min="0.0" v-bind:max="60.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import { type StateType }                 from "../common/app-state"
import Slider                             from "@vueform/slider"
</script>

<script lang="ts">
type FieldImport       = (txt: string, min: number, max: number) => number
type FieldExport       = (n: number, digits?: number, nosign?: boolean ) => string
type FormatSliderValue = (v: number) => string

export default defineComponent({
    name: "app-control-streams",
    components: {
        "slider": Slider
    },
    props: {
        state:             { type: Object   as PropType<StateType>,         required: true },
        fieldImport:       { type: Function as PropType<FieldImport>,       required: true },
        fieldExport:       { type: Function as PropType<FieldExport>,       required: true },
        formatSliderValue: { type: Function as PropType<FormatSliderValue>, required: true }
    }
})
</script>

