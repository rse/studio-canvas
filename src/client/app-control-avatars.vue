<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Avatars</b> are the two optional 3D models of a latin woman (A1, <i>Sophia</i>) and a
        european man (A2, <i>Dennis</i>) which can be temporarily placed into the scene
        to help setting up the various virtual pan/tilt/zoom (PTZ) views of the scene.
        Their body height can be adjusted and they can be rotated onto the usual 9
        positions on the scene.
    </div>
    <div class="control">
        <div class="label1">A1 enable</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.avatars.enable1 ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.avatars.enable1 = false"
            v-bind:class="{ default: state.avatars.enable1 === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.avatars.enable1"></toggle>
        </div>

        <div class="label1">A1 size</div>
        <div class="label2">(height)</div>
        <div class="label3">[cm]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.avatars.size1)"
                v-on:change="(ev) => state.avatars.size1 = fieldImport((ev.target! as HTMLInputElement).value, 160, 210)"/>
        </div>
        <div class="button reset"
            v-on:click="state.avatars.size1 = 185"
            v-bind:class="{ default: state.avatars.size1 === 185 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.avatars.size1"
                v-bind:min="160" v-bind:max="210" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">A1 rotate</div>
        <div class="label2">(pan left/right)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.avatars.rotate1)"
                v-on:change="(ev) => state.avatars.rotate1 = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
        </div>
        <div class="button reset"
            v-on:click="state.avatars.rotate1 = 0"
            v-bind:class="{ default: state.avatars.rotate1 === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.avatars.rotate1"
                v-bind:min="-90" v-bind:max="+90" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">A2 enable</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.avatars.enable2 ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.avatars.enable2 = false"
            v-bind:class="{ default: state.avatars.enable2 === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.avatars.enable2"></toggle>
        </div>

        <div class="label1">A2 size</div>
        <div class="label2">(height)</div>
        <div class="label3">[cm]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.avatars.size2)"
                v-on:change="(ev) => state.avatars.size2 = fieldImport((ev.target! as HTMLInputElement).value, 160, 210)"/>
        </div>
        <div class="button reset"
            v-on:click="state.avatars.size2 = 185"
            v-bind:class="{ default: state.avatars.size2 === 185 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.avatars.size2"
                v-bind:min="160" v-bind:max="210" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">A2 rotate</div>
        <div class="label2">(pan left/right)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.avatars.rotate2)"
                v-on:change="(ev) => state.avatars.rotate2 = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
        </div>
        <div class="button reset"
            v-on:click="state.avatars.rotate2 = 0"
            v-bind:class="{ default: state.avatars.rotate2 === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.avatars.rotate2"
                v-bind:min="-90" v-bind:max="+90" v-bind:step="1"
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
    name: "app-control-avatars",
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

