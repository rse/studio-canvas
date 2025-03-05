<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>{{ cam }}</b> is a digital twin of the corresponding physical
        camera. It has to be calibrated to match as close
        as possible to the physical viewpoint of the camera in order
        to allow precise pan/tilt/zoom (PTZ) of both the physical camera via NDI
        and PTZ of the virtual camera via the <i>FreeD</i> information emitted by
        the physical camera.
    </div>
    <div class="freed">
        <div class="freed-box">
            <div class="label">PAN</div>
            <div class="value">{{ (camState.get(cam)?.pan ?? 0).toFixed(2) }}</div>
        </div>
        <div class="freed-box">
            <div class="label">TILT</div>
            <div class="value">{{ (camState.get(cam)?.tilt ?? 0).toFixed(2) }}</div>
        </div>
        <div class="freed-box">
            <div class="label">ZOOM</div>
            <div class="value">{{ (camState.get(cam)?.zoom ?? 0).toFixed(2) }}</div>
        </div>
    </div>
    <div class="control">
        <div class="label1">hull X-pos</div>
        <div class="label2">(shift bwd/fwd)</div>
        <div class="label3">[cm]:</div>
        <div class="value">
            <input tabindex="1" v-bind:value="fieldExport((state as any)[cam].hullPosition.x)"
                v-on:change="(ev) => (state as any)[cam].hullPosition.x = fieldImport((ev.target! as HTMLInputElement).value, -50, +50)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].hullPosition.x = 0"
            v-bind:class="{ default: (state as any)[cam].hullPosition.x === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].hullPosition.x"
                v-bind:min="-50" v-bind:max="+50" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">hull Y-pos</div>
        <div class="label2">(shift left/right)</div>
        <div class="label3">[cm]:</div>
        <div class="value">
            <input tabindex="2" v-bind:value="fieldExport((state as any)[cam].hullPosition.y)"
                v-on:change="(ev) => (state as any)[cam].hullPosition.y = fieldImport((ev.target! as HTMLInputElement).value, -50, +50)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].hullPosition.y = 0"
            v-bind:class="{ default: (state as any)[cam].hullPosition.y === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].hullPosition.y"
                v-bind:min="-50" v-bind:max="+50" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">hull Z-pos</div>
        <div class="label2">(shift down/up)</div>
        <div class="label3">[cm]:</div>
        <div class="value">
            <input tabindex="3" v-bind:value="fieldExport((state as any)[cam].hullPosition.z)"
                v-on:change="(ev) => (state as any)[cam].hullPosition.z = fieldImport((ev.target! as HTMLInputElement).value, -50, +50)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].hullPosition.z = 0"
            v-bind:class="{ default: (state as any)[cam].hullPosition.z === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].hullPosition.z"
                v-bind:min="-50" v-bind:max="+50" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">case X-rot</div>
        <div class="label2">(tilt down/up)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="4" v-bind:value="fieldExport((state as any)[cam].caseRotation.x)"
                v-on:change="(ev) => (state as any)[cam].caseRotation.x = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].caseRotation.x = 0"
            v-bind:class="{ default: (state as any)[cam].caseRotation.x === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].caseRotation.x"
                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">case Y-rot</div>
        <div class="label2">(pan left/right)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="5" v-bind:value="fieldExport((state as any)[cam].caseRotation.y)"
                v-on:change="(ev) => (state as any)[cam].caseRotation.y = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].caseRotation.y = 0"
            v-bind:class="{ default: (state as any)[cam].caseRotation.y === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].caseRotation.y"
                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">case Y-rot</div>
        <div class="label2">(pan left/right)</div>
        <div class="label3">[mult]:</div>
        <div class="value">
            <input tabindex="7" v-bind:value="fieldExport((state as any)[cam].caseRotation.ym)"
                v-on:change="(ev) => (state as any)[cam].caseRotation.ym = fieldImport((ev.target! as HTMLInputElement).value, 0, +2)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].caseRotation.ym = 1"
            v-bind:class="{ default: (state as any)[cam].caseRotation.ym === 1 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].caseRotation.ym"
                v-bind:min="0" v-bind:max="+2" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">case Z-rot</div>
        <div class="label2">(rotate left/right)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="6" v-bind:value="fieldExport((state as any)[cam].caseRotation.z)"
                v-on:change="(ev) => (state as any)[cam].caseRotation.z = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].caseRotation.z = 0"
            v-bind:class="{ default: (state as any)[cam].caseRotation.z === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].caseRotation.z"
                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">lens X-rot</div>
        <div class="label2">(tilt down/up)</div>
        <div class="label3">[deg]:</div>
        <div class="value">
            <input tabindex="4" v-bind:value="fieldExport((state as any)[cam].lensRotation.x)"
                v-on:change="(ev) => (state as any)[cam].lensRotation.x = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].lensRotation.x = 0"
            v-bind:class="{ default: (state as any)[cam].lensRotation.x === 0 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].lensRotation.x"
                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <div class="label1">lens X-rot</div>
        <div class="label2">(tilt down/up)</div>
        <div class="label3">[mult]:</div>
        <div class="value">
            <input tabindex="7" v-bind:value="fieldExport((state as any)[cam].lensRotation.xm)"
                v-on:change="(ev) => (state as any)[cam].lensRotation.xm = fieldImport((ev.target! as HTMLInputElement).value, 0, +2)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].lensRotation.xm = 1"
            v-bind:class="{ default: (state as any)[cam].lensRotation.xm === 1 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].lensRotation.xm"
                v-bind:min="0" v-bind:max="+2" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>

        <!--
        FIXME: currently unused!
        <div class="label1">FOV</div>
        <div class="label2">(zoom)</div>
        <div class="label3">[mult]:</div>
        <div class="value">
            <input tabindex="7" v-bind:value="fieldExport((state as any)[cam].fov.m)"
                v-on:change="(ev) => (state as any)[cam].fov.m = fieldImport((ev.target! as HTMLInputElement).value, 0, +4)"/>
        </div>
        <div class="button reset"
            v-on:click="(state as any)[cam].fov.m = 1"
            v-bind:class="{ default: (state as any)[cam].fov.m === 1 }">
            RESET
        </div>
        <div class="slider">
            <slider class="slider" v-model="(state as any)[cam].fov.m"
                v-bind:min="0" v-bind:max="+4" v-bind:step="0.01"
                show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
            ></slider>
        </div>
        -->
    </div>
</template>

<style lang="stylus">
    .freed
        display: flex
        flex-direction: row
        align-items: center
        justify-content: center
        .freed-box
            width: 100px
            margin-right: 10px
            margin-bottom: 20px
            display: flex
            flex-direction: column
            align-items: center
            justify-content: center
            background-color: var(--color-std-bg-1)
            color: var(--color-std-fg-3)
            border-radius: 4px
            overflow: hidden
            .label
                width: 100%
                padding: 2px 0 2px 0
                font-weight: 200
                background-color: var(--color-std-bg-2)
                text-align: center
            .value
                padding: 4px 0 4px 0
                font-weight: bold
                font-size: 125%
                color: var(--color-std-fg-5)
</style>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import Slider                             from "@vueform/slider"
import { type StateType }                 from "../common/app-state"
import { type FreeDState }                from "../common/app-freed"
</script>

<script lang="ts">
type FieldImport       = (txt: string, min: number, max: number) => number
type FieldExport       = (n: number, digits?: number, nosign?: boolean ) => string
type FormatSliderValue = (v: number) => string
type CamState          = Map<string, FreeDState>

export default defineComponent({
    name: "app-control-camera",
    components: {
        "slider": Slider
    },
    props: {
        cam:               { type: String,                                  required: true },
        camState:          { type: Object   as PropType<CamState>,          required: true },
        state:             { type: Object   as PropType<StateType>,         required: true },
        fieldImport:       { type: Function as PropType<FieldImport>,       required: true },
        fieldExport:       { type: Function as PropType<FieldExport>,       required: true },
        formatSliderValue: { type: Function as PropType<FormatSliderValue>, required: true }
    }
})
</script>

