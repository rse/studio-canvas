<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>References</b> are the optional red balls in the scence
        which can help calibrating the virtual cameras against the physical
        camera viewpoint before an event. If calibrated correctly, the virtual balls
        in the scene should match as close as possible with the physical red markers
        on the stage.
    </div>
    <div class="control">
        <div class="label1">enable</div>
        <div class="label2">(visible)</div>
        <div class="label3">[flag]:</div>
        <div class="value">
            <div class="fixed">{{ state.references.enable ? "YES" : "NO" }}</div>
        </div>
        <div class="button reset"
            v-on:click="state.references.enable = false"
            v-bind:class="{ default: state.references.enable === false }">
            RESET
        </div>
        <div class="slider">
            <toggle class="toggle" v-model="state.references.enable"></toggle>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import Toggle                             from "@vueform/toggle"
import { type StateType }                 from "../common/app-state"
</script>

<script lang="ts">
type FieldImport       = (txt: string, min: number, max: number) => number
type FieldExport       = (n: number, digits?: number, nosign?: boolean ) => string
type FormatSliderValue = (v: number) => string

export default defineComponent({
    name: "app-control-references",
    components: {
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

