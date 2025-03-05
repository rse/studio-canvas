<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Pillar</b> is the optional pillar with an embedded display,
        which can be projected into the room in the scene BACK layer.
        It can be scaled in size, and positioned in a radial way in front of the scene. It
        can be scaled in size, positioned in a radial way, the opacity of its display
        controlled, a border radius applied, a border cropping applied, and a chroma-key
        filter applied.
    </div>
    <div class="control">
        <div class="label1">enable</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.pillar.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.enable = false"
            v-bind:class="{ default: state.pillar.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.pillar.enable"></toggle>
        </div>

        <div class="label1">source</div>
        <div class="label2">(source)</div>
        <div class="label3">[id]:</div>
        <div class="value">
            <div class="fixed">{{ state.pillar.source }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.source = 'S2'"
            v-bind:class="{ default: state.pillar.source === 'S2' }">
            RESET
        </div>
        <div class="radios">
            <div class="button" v-bind:class="{ selected: state.pillar.source === 'S1' }" v-on:click="state.pillar.source = 'S1'">Stream 1</div>
            <div class="button" v-bind:class="{ selected: state.pillar.source === 'S2' }" v-on:click="state.pillar.source = 'S2'">Stream 2</div>
            <div class="button" v-bind:class="{ selected: state.pillar.source === 'M1' }" v-on:click="state.pillar.source = 'M1'">Media 1</div>
            <div class="button" v-bind:class="{ selected: state.pillar.source === 'M2' }" v-on:click="state.pillar.source = 'M2'">Media 2</div>
            <div class="button" v-bind:class="{ selected: state.pillar.source === 'M3' }" v-on:click="state.pillar.source = 'M3'">Media 3</div>
            <div class="button" v-bind:class="{ selected: state.pillar.source === 'M4' }" v-on:click="state.pillar.source = 'M4'">Media 4</div>
        </div>

        <div class="label1">fade</div>
        <div class="label2">(time)</div>
        <div class="label3">[sec]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.fadeTime)"
                v-on:change="(ev) => state.pillar.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 4.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.fadeTime = 2.0"
            v-bind:class="{ default: state.pillar.fadeTime === 2.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.fadeTime"
                v-bind:min="0.0" v-bind:max="4.0" v-bind:step="0.10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">scale</div>
        <div class="label2">(resize)</div>
        <div class="label3">[mult]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.scale)"
                v-on:change="(ev) => state.pillar.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 2.2)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.scale = 1.0"
            v-bind:class="{ default: state.pillar.scale === 1.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.scale"
                v-bind:min="0.1" v-bind:max="2.2" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">rotate</div>
        <div class="label3">(pan left/right)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.rotate)"
                v-on:change="(ev) => state.pillar.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.rotate = 0"
            v-bind:class="{ default: state.pillar.rotate === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.rotate"
                v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">lift</div>
        <div class="label2">(shift down/up)</div>
        <div class="label3">[cm]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.lift)"
                v-on:change="(ev) => state.pillar.lift = fieldImport((ev.target! as HTMLInputElement).value, -150, +70)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.lift = 0"
            v-bind:class="{ default: state.pillar.lift === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.lift"
                v-bind:min="-150" v-bind:max="+70" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">distance</div>
        <div class="label2">(shift bwd/fwd)</div>
        <div class="label3">[m]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.distance)"
                v-on:change="(ev) => state.pillar.distance = fieldImport((ev.target! as HTMLInputElement).value, -1.5, +0.4)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.distance = 0.0"
            v-bind:class="{ default: state.pillar.distance === 0.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.distance"
                v-bind:min="-1.5" v-bind:max="+0.4" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">opacity</div>
        <div class="label2">(less/more)</div>
        <div class="label3">[percent]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.opacity)"
                v-on:change="(ev) => state.pillar.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.opacity = 1.0"
            v-bind:class="{ default: state.pillar.opacity === 1.0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.opacity"
                v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">border</div>
        <div class="label2">(radius)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.borderRad)"
                v-on:change="(ev) => state.pillar.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.borderRad = 40"
            v-bind:class="{ default: state.pillar.borderRad === 40 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.borderRad"
                v-bind:min="0" v-bind:max="540" v-bind:step="10"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">border</div>
        <div class="label2">(cropping)</div>
        <div class="label3">[px]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.borderCrop)"
                v-on:change="(ev) => state.pillar.borderCrop = fieldImport((ev.target! as HTMLInputElement).value, 0, 50)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.borderCrop = 0"
            v-bind:class="{ default: state.pillar.borderCrop === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.borderCrop"
                v-bind:min="0" v-bind:max="50" v-bind:step="1"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(enable)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.pillar.chromaKey.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.chromaKey.enable = false"
            v-bind:class="{ default: state.pillar.chromaKey.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.pillar.chromaKey.enable"></toggle>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(threshold)</div>
        <div class="label3">[distance]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.chromaKey.threshold)"
                v-on:change="(ev) => state.pillar.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.chromaKey.threshold = 0.4"
            v-bind:class="{ default: state.pillar.chromaKey.threshold === 0.4 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.chromaKey.threshold"
                v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">chromaKey</div>
        <div class="label2">(smoothing)</div>
        <div class="label3">[distance]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.pillar.chromaKey.smoothing)"
                v-on:change="(ev) => state.pillar.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
        </div>
        <div class="button reset"
            v-on:click="state.pillar.chromaKey.smoothing = 0.1"
            v-bind:class="{ default: state.pillar.chromaKey.smoothing === 0.1 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="state.pillar.chromaKey.smoothing"
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
    name: "app-control-pillar",
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

