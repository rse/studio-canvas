<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Renderer</b> allows you to configure the Frames per Second (FPS)
        of a scene renderer when it is in program, preview or neither of them (other).
        This in total allows you to reduce the overall load all renderers cause on the
        underlying hardware. Never use more FPS than absolutely necessary. For
        debugging purposes you can enable the overlay which tells you when
        a rendering engine is paused, in case it is not in preview or program.
    </div>
    <div class="control">
        <div class="label1">Program</div>
        <div class="label2">(performance)</div>
        <div class="label3">[fps]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.renderer.program)"
                v-on:change="(ev) => state.renderer.program = saneFPS(state.renderer.program, fieldImport((ev.target! as HTMLInputElement).value, 0, 60))"/>
        </div>
        <div class="button reset"
            v-bind:class="{ default: state.renderer.program === 30 }"
            v-on:click="state.renderer.program = 30">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-bind:value="state.renderer.program"
                v-on:change="(val: number) => state.renderer.program = saneFPS(state.renderer.program, val)"
                v-bind:min="0" v-bind:max="60" v-bind:step="1"
                show-tooltip="drag" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">Preview</div>
        <div class="label2">(performance)</div>
        <div class="label3">[fps]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.renderer.preview)"
                v-on:change="(ev) => state.renderer.preview = saneFPS(state.renderer.preview, fieldImport((ev.target! as HTMLInputElement).value, 0, 60))"/>
        </div>
        <div class="button reset"
            v-on:click="state.renderer.preview = 15"
            v-bind:class="{ default: state.renderer.preview === 15 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-bind:value="state.renderer.preview"
                v-on:change="(val: number) => state.renderer.preview = saneFPS(state.renderer.preview, val)"
                v-bind:min="0" v-bind:max="60" v-bind:step="1"
                show-tooltip="drag" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">Other</div>
        <div class="label2">(performance)</div>
        <div class="label3">[fps]:</div>
        <div class="value">
            <input tabindex="8" v-bind:value="fieldExport(state.renderer.other)"
                v-on:change="(ev) => state.renderer.other = saneFPS(state.renderer.other, fieldImport((ev.target! as HTMLInputElement).value, 0, 60))"/>
        </div>
        <div class="button reset"
            v-on:click="state.renderer.other = 0"
            v-bind:class="{ default: state.renderer.other === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-bind:value="state.renderer.other"
                v-on:change="(val: number) => state.renderer.other = saneFPS(state.renderer.other, val)"
                v-bind:min="0" v-bind:max="60" v-bind:step="1"
                show-tooltip="drag" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">Overlay</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.renderer.overlay ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.renderer.overlay = false"
            v-bind:class="{ default: state.renderer.overlay === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.renderer.overlay"></toggle>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import { type StateType }                 from "../common/app-state"
import { MixerFPS }                       from "../common/app-mixer"
import Slider                             from "@vueform/slider"
import Toggle                             from "@vueform/toggle"
</script>

<script lang="ts">
type FieldImport = (txt: string, min: number, max: number) => number
type FieldExport = (n: number, digits?: number, nosign?: boolean ) => string

export default defineComponent({
    name: "app-control-renderer",
    components: {
        "slider": Slider,
        "toggle": Toggle
    },
    props: {
        state:       { type: Object   as PropType<StateType>,   required: true },
        fieldImport: { type: Function as PropType<FieldImport>, required: true },
        fieldExport: { type: Function as PropType<FieldExport>, required: true }
    },
    methods: {
        /*  adjust to the nearest sane FPS value only  */
        saneFPS (valOld: number, valNew: number) {
            if (!MixerFPS.includes(valNew)) {
                if (valNew < valOld) {
                    const fps = MixerFPS.filter((v) => v <= valNew)
                    valNew = fps[fps.length - 1]
                }
                else {
                    const fps = MixerFPS.filter((v) => v >= valNew)
                    valNew = fps[0]
                }
            }
            return valNew
        }
    }
})
</script>

