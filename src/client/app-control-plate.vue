<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Plate</b> is the optional planar display which can be projected
        into the room in the scene FRONT layer, intended as the optical plate on the desk's front side.
        It can be given scaled in size, positioned in a radial way on the background canvas,
        its opacity controlled to mix with the canvas, a border radius applied, a border cropping applied,
        and a chroma-key filter applied.
    </div>
    <div class="control">
        <div class="label1">enable</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.plate.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.plate.enable = false"
            v-bind:class="{ default: state.plate.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.plate.enable"></toggle>
        </div>

        <div class="label1">source</div>
        <div class="label2">(source)</div>
        <div class="label3">[id]:</div>
        <div class="value">
            <div class="fixed">{{ state.plate.source }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.plate.source = 'S1'"
            v-bind:class="{ default: state.plate.source === 'S1' }">
            RESET
        </div>
        <div class="radios">
            <div class="button" v-bind:class="{ selected: state.plate.source === 'S1' }" v-on:click="state.plate.source = 'S1'">Stream 1</div>
            <div class="button" v-bind:class="{ selected: state.plate.source === 'S2' }" v-on:click="state.plate.source = 'S2'">Stream 2</div>
            <div class="button" v-bind:class="{ selected: state.plate.source === 'M1' }" v-on:click="state.plate.source = 'M1'">Media 1</div>
            <div class="button" v-bind:class="{ selected: state.plate.source === 'M2' }" v-on:click="state.plate.source = 'M2'">Media 2</div>
            <div class="button" v-bind:class="{ selected: state.plate.source === 'M3' }" v-on:click="state.plate.source = 'M3'">Media 3</div>
            <div class="button" v-bind:class="{ selected: state.plate.source === 'M4' }" v-on:click="state.plate.source = 'M4'">Media 4</div>
        </div>

        <div class="label1">fade</div>
        <div class="label2">(time)</div>
        <div class="label3">[sec]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.fadeTime)"
                v-on:change="(ev) => state.plate.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 4.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.fadeTime = 2.0"
            v-bind:class="{ default: state.plate.fadeTime === 2.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.fadeTime"
                v-bind:min="0.0" v-bind:max="4.0" v-bind:step="0.10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">scale</div>
        <div class="label2">(resize)</div>
        <div class="label3">[mult]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.scale)"
                v-on:change="(ev) => state.plate.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 3.5)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.scale = 1.0"
            v-bind:class="{ default: state.plate.scale === 1.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.scale"
                v-bind:min="0.1" v-bind:max="3.5" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">rotate</div>
        <div class="label2">(pan left/right)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.rotate)"
                v-on:change="(ev) => state.plate.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.rotate = 0"
            v-bind:class="{ default: state.plate.rotate === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.rotate"
                v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">lift</div>
        <div class="label2">(shift down/up)</div>
        <div class="label3">[m]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.lift)"
                v-on:change="(ev) => state.plate.lift = fieldImport((ev.target! as HTMLInputElement).value, -2.0, +2.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.lift = 0"
            v-bind:class="{ default: state.plate.lift === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.lift"
                v-bind:min="-2.0" v-bind:max="+2.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">distance</div>
        <div class="label2">(shift bwd/fwd)</div>
        <div class="label3">[m]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.distance)"
                v-on:change="(ev) => state.plate.distance = fieldImport((ev.target! as HTMLInputElement).value, -2.0, +2.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.distance = 0.0"
            v-bind:class="{ default: state.plate.distance === 0.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.distance"
                v-bind:min="-2.0" v-bind:max="+2.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">opacity</div>
        <div class="label2">(less/more)</div>
        <div class="label3">[percent]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.opacity)"
                v-on:change="(ev) => state.plate.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.opacity = 1.0"
            v-bind:class="{ default: state.plate.opacity === 1.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.opacity"
                v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">border</div>
        <div class="label2">(radius)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.borderRad)"
                v-on:change="(ev) => state.plate.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.borderRad = 40"
            v-bind:class="{ default: state.plate.borderRad === 40 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.borderRad"
                v-bind:min="0" v-bind:max="540" v-bind:step="10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">border</div>
        <div class="label2">(cropping)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.borderCrop)"
                v-on:change="(ev) => state.plate.borderCrop = fieldImport((ev.target! as HTMLInputElement).value, 0, 50)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.borderCrop = 0"
            v-bind:class="{ default: state.plate.borderCrop === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.borderCrop"
                v-bind:min="0" v-bind:max="50" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(enable)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.plate.chromaKey.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.plate.chromaKey.enable = false"
            v-bind:class="{ default: state.plate.chromaKey.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.plate.chromaKey.enable"></toggle>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(threshold)</div>
        <div class="label3">[distance]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.chromaKey.threshold)"
                v-on:change="(ev) => state.plate.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.chromaKey.threshold = 0.4"
            v-bind:class="{ default: state.plate.chromaKey.threshold === 0.4 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.chromaKey.threshold"
                v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(smoothing)</div>
        <div class="label3">[distance]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.plate.chromaKey.smoothing)"
                v-on:change="(ev) => state.plate.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
        </div>
        <div class="button reset"
            v-on:click="state.plate.chromaKey.smoothing = 0.1"
            v-bind:class="{ default: state.plate.chromaKey.smoothing === 0.1 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.plate.chromaKey.smoothing"
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
    name: "app-control-plate",
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

