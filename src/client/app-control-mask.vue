<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Mask</b> is the optional planar display which can be projected
        directly in front of the camera viewpoint in the scene FRONT layer. It is automatically
        positioned and scaled to fit into the viewpoint of the camera. It is
        intended to be used for short-term displaying fullscreen content.
    </div>
    <div class="control">
        <div class="label1">enable</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.mask.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.mask.enable = false"
            v-bind:class="{ default: state.mask.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.mask.enable"></toggle>
        </div>

        <div class="label1">source</div>
        <div class="label2">(source)</div>
        <div class="label3">[id]:</div>
        <div class="value">
            <div class="fixed">{{ state.mask.source }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.mask.source = 'S2'"
            v-bind:class="{ default: state.mask.source === 'S2' }">
            RESET
        </div>
        <div class="radios">
            <div class="button" v-bind:class="{ selected: state.mask.source === 'S1' }" v-on:click="state.mask.source = 'S1'">Stream 1</div>
            <div class="button" v-bind:class="{ selected: state.mask.source === 'S2' }" v-on:click="state.mask.source = 'S2'">Stream 2</div>
            <div class="button" v-bind:class="{ selected: state.mask.source === 'M1' }" v-on:click="state.mask.source = 'M1'">Media 1</div>
            <div class="button" v-bind:class="{ selected: state.mask.source === 'M2' }" v-on:click="state.mask.source = 'M2'">Media 2</div>
            <div class="button" v-bind:class="{ selected: state.mask.source === 'M3' }" v-on:click="state.mask.source = 'M3'">Media 3</div>
            <div class="button" v-bind:class="{ selected: state.mask.source === 'M4' }" v-on:click="state.mask.source = 'M4'">Media 4</div>
        </div>

        <div class="label1">scale</div>
        <div class="label2">(resize)</div>
        <div class="label3">[mult]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.mask.scale)"
                v-on:change="(ev) => state.mask.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.8, 1.2)"/>
        </div>
        <div class="button reset"
            v-on:click="state.mask.scale = 1.0"
            v-bind:class="{ default: state.mask.scale === 1.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.mask.scale"
                v-bind:min="0.8" v-bind:max="1.2" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">border</div>
        <div class="label2">(radius)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.mask.borderRad)"
                v-on:change="(ev) => state.mask.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
        </div>
        <div class="button reset"
            v-on:click="state.mask.borderRad = 40"
            v-bind:class="{ default: state.mask.borderRad === 40 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.mask.borderRad"
                v-bind:min="0" v-bind:max="540" v-bind:step="10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import Slider                             from "@vueform/slider"
import Toggle                             from "@vueform/toggle"
import { type StateType }                 from "../common/app-state"
</script>

<script lang="ts">
type FieldImport       = (txt: string, min: number, max: number) => number
type FieldExport       = (n: number, digits?: number, nosign?: boolean ) => string
type FormatSliderValue = (v: number) => string

export default defineComponent({
    name: "app-control-mask",
    components: {
        "slider": Slider,
        "toggle": Toggle
    },
    props: {
        state:             { type: Object   as PropType<StateType>,         required: true },
        fieldImport:       { type: Function as PropType<FieldImport>,       required: true },
        fieldExport:       { type: Function as PropType<FieldExport>,       required: true },
        formatSliderValue: { type: Function as PropType<FormatSliderValue>, required: true }
    }
})
</script>

