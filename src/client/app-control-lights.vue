<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Lights</b> are the optional, additional point lights in the scene,
        which can further light up the scene and especially produce a shadow of
        the Monitor, Pane and Pillar on the background canvas.
    </div>
    <div class="control">
        <div class="label1">intensity1</div>
        <div class="label2">(less/more)</div>
        <div class="label3">[lum]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity1, 0)"
                v-on:change="(ev) => state.lights.intensity1 = fieldImport((ev.target! as HTMLInputElement).value, 0, 600)"/>
        </div>
        <div class="button reset"
            v-on:click="state.lights.intensity1 = 300"
            v-bind:class="{ default: state.lights.intensity1 === 300 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.lights.intensity1"
                v-bind:min="0" v-bind:max="600" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">intensity2</div>
        <div class="label2">(less/more)</div>
        <div class="label3">[lum]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity2, 0)"
                v-on:change="(ev) => state.lights.intensity2 = fieldImport((ev.target! as HTMLInputElement).value, 0, 600)"/>
        </div>
        <div class="button reset"
            v-on:click="state.lights.intensity2 = 300"
            v-bind:class="{ default: state.lights.intensity2 === 300 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.lights.intensity2"
                v-bind:min="0" v-bind:max="600" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">intensity3</div>
        <div class="label2">(less/more)</div>
        <div class="label3">[lum]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity3, 0)"
                v-on:change="(ev) => state.lights.intensity3 = fieldImport((ev.target! as HTMLInputElement).value, 0, 600)"/>
        </div>
        <div class="button reset"
            v-on:click="state.lights.intensity3 = 300"
            v-bind:class="{ default: state.lights.intensity3 === 300 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.lights.intensity3"
                v-bind:min="0" v-bind:max="600" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import Slider                             from "@vueform/slider"
import { type StateType }                 from "../common/app-state"
</script>

<script lang="ts">
type FieldImport       = (txt: string, min: number, max: number) => number
type FieldExport       = (n: number, digits?: number, nosign?: boolean ) => string
type FormatSliderValue = (v: number) => string

export default defineComponent({
    name: "app-control-lights",
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

