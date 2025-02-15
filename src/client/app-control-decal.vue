<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Decal</b> is the optional poster-style display which can be projected
        onto the background canvas. It is rendered in the scene BACK layer. It can scaled in size,
        positioned in a radial way on the background canvas, its opacity controlled to mix with
        the canvas, a border radius applied, a border cropping applied, and a chroma-key filter
        applied.
    </div>
    <div class="control">
        <div class="label1">enable</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.decal.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.decal.enable = false"
            v-bind:class="{ default: state.decal.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.decal.enable"></toggle>
        </div>

        <div class="label1">source</div>
        <div class="label2">(source)</div>
        <div class="label3">[id]:</div>
        <div class="value">
            <div class="fixed">{{ state.decal.source }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.decal.source = 'S1'"
            v-bind:class="{ default: state.decal.source === 'S1' }">
            RESET
        </div>
        <div class="radios">
            <div class="button" v-bind:class="{ selected: state.decal.source === 'S1' }" v-on:click="state.decal.source = 'S1'">Stream 1</div>
            <div class="button" v-bind:class="{ selected: state.decal.source === 'S2' }" v-on:click="state.decal.source = 'S2'">Stream 2</div>
            <div class="button" v-bind:class="{ selected: state.decal.source === 'M1' }" v-on:click="state.decal.source = 'M1'">Media 1</div>
            <div class="button" v-bind:class="{ selected: state.decal.source === 'M2' }" v-on:click="state.decal.source = 'M2'">Media 2</div>
            <div class="button" v-bind:class="{ selected: state.decal.source === 'M3' }" v-on:click="state.decal.source = 'M3'">Media 3</div>
            <div class="button" v-bind:class="{ selected: state.decal.source === 'M4' }" v-on:click="state.decal.source = 'M4'">Media 4</div>
        </div>

        <div class="label1">fade</div>
        <div class="label2">(time)</div>
        <div class="label3">[sec]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.fadeTime)"
                v-on:change="(ev) => state.decal.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.2, 4.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.fadeTime = 2.0"
            v-bind:class="{ default: state.decal.fadeTime === 2.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.fadeTime"
                v-bind:min="0.2" v-bind:max="4.0" v-bind:step="0.10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">scale</div>
        <div class="label2">(resize)</div>
        <div class="label3">[mult]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.scale)"
                v-on:change="(ev) => state.decal.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 5.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.scale = 1.0"
            v-bind:class="{ default: state.decal.scale === 1.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.scale"
                v-bind:min="0.1" v-bind:max="5.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">rotate</div>
        <div class="label2">(pan left/right)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.rotate)"
                v-on:change="(ev) => state.decal.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.rotate = 0"
            v-bind:class="{ default: state.decal.rotate === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.rotate"
                v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">lift</div>
        <div class="label2">(tilt down/up)</div>
        <div class="label3">[m]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.lift)"
                v-on:change="(ev) => state.decal.lift = fieldImport((ev.target! as HTMLInputElement).value, -15, +9)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.lift = 0"
            v-bind:class="{ default: state.decal.lift === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.lift"
                v-bind:min="-15" v-bind:max="+9" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">opacity</div>
        <div class="label2">(less/more)</div>
        <div class="label3">[percent]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.opacity)"
                v-on:change="(ev) => state.decal.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.opacity = 1.0"
            v-bind:class="{ default: state.decal.opacity === 1.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.opacity"
                v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">border</div>
        <div class="label2">(radius)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.borderRad)"
                v-on:change="(ev) => state.decal.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.borderRad = 40"
            v-bind:class="{ default: state.decal.borderRad === 40 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.borderRad"
                v-bind:min="0" v-bind:max="540" v-bind:step="10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">border</div>
        <div class="label2">(cropping)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.borderCrop)"
                v-on:change="(ev) => state.decal.borderCrop = fieldImport((ev.target! as HTMLInputElement).value, 0, 50)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.borderCrop = 0"
            v-bind:class="{ default: state.decal.borderCrop === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.borderCrop"
                v-bind:min="0" v-bind:max="50" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(enable)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.decal.chromaKey.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.decal.chromaKey.enable = false"
            v-bind:class="{ default: state.decal.chromaKey.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.decal.chromaKey.enable"></toggle>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(threshold)</div>
        <div class="label3">[distance]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.chromaKey.threshold)"
                v-on:change="(ev) => state.decal.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.chromaKey.threshold = 0.4"
            v-bind:class="{ default: state.decal.chromaKey.threshold === 0.4 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.chromaKey.threshold"
                v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(smoothing)</div>
        <div class="label3">[distance]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.decal.chromaKey.smoothing)"
                v-on:change="(ev) => state.decal.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
        </div>
        <div class="button reset"
            v-on:click="state.decal.chromaKey.smoothing = 0.1"
            v-bind:class="{ default: state.decal.chromaKey.smoothing === 0.1 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.decal.chromaKey.smoothing"
                v-bind:min="0.0" v-bind:max="0.5" v-bind:step="0.01"
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
    name: "app-control-decal",
    components: {
        "slider": Slider,
        "toggle": Toggle
    },
    props: {
        state:             { type: Object as PropType<StateType>,           required: true },
        fieldImport:       { type: Function as PropType<FieldImport>,       required: true },
        fieldExport:       { type: Function as PropType<FieldExport>,       required: true },
        formatSliderValue: { type: Function as PropType<FormatSliderValue>, required: true }
    }
})
</script>

