<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Preview</b> is a rendering preview of the rendered camera view
        within the <b>BabylonJS</b> game engine. It is exactly the same content intended
        to be loaded into the <b>vMix</b> Browser input or <b>OBS Studio</b> Browser source
        and allows you to preview the scene in the browser here, too.
        The camera view can be optionally controlled by reflecting the emitted
        <i>FreeD</i> information from the physical camera, or being interactively adjusted
        by cursor keys.
    </div>
    <div class="preview-url" v-on:click="previewCopy()">
        {{ preview.url }}
    </div>
    <div class="preview-control">
        <div class="layer">
            <div class="button" v-on:click="preview.opts.layer = 'back'"
                v-bind:class="{ selected: preview.opts.layer === 'back' }">
                Back
            </div>
            <div class="button" v-on:click="preview.opts.layer = 'front'"
                v-bind:class="{ selected: preview.opts.layer === 'front' }">
                Front
            </div>
        </div>
        <div class="cams">
            <div class="button" v-on:click="preview.opts.cam = 'CAM1'"
                v-bind:class="{ selected: preview.opts.cam === 'CAM1' }">
                CAM1
            </div>
            <div class="button" v-on:click="preview.opts.cam = 'CAM2'"
                v-bind:class="{ selected: preview.opts.cam === 'CAM2' }">
                CAM2
            </div>
            <div class="button" v-on:click="preview.opts.cam = 'CAM3'"
                v-bind:class="{ selected: preview.opts.cam === 'CAM3' }">
                CAM3
            </div>
            <div class="button" v-on:click="preview.opts.cam = 'CAM4'"
                v-bind:class="{ selected: preview.opts.cam === 'CAM4' }">
                CAM4
            </div>
        </div>
        <div class="flags">
            <div class="flag">
                <div class="fixed">Enable FreeD</div>
                <toggle class="toggle" v-model="preview.opts.freed"></toggle>
            </div>
            <div class="flag">
                <div class="fixed">Enable Keys</div>
                <toggle class="toggle" v-model="preview.opts.keys"></toggle>
            </div>
        </div>
        <div class="action">
            <div class="button" v-on:click="previewOpen()">OPEN</div>
            <div class="button" v-on:click="previewCopy()">COPY</div>
        </div>
    </div>
</template>

<style lang="stylus">
    .preview-control
        margin-top: 20px
        display: flex
        flex-direction: row
        justify-content: flex-start
        align-items: center
        .cams
            display: grid
            grid-template-columns: 80px 80px 80px 80px
            grid-template-rows: 110px
            justify-content: center
            align-items: center
            gap: 10px 10px
            margin-right: 20px
            cursor: pointer
            .button
                line-height: 110px !important
        .layer
            display: grid
            grid-template-columns: 80px
            grid-template-rows: 50px 50px
            justify-content: center
            align-items: center
            gap: 10px 10px
            margin-right: 20px
        .flags
            display: grid
            grid-template-columns: 210px
            grid-template-rows: 50px
            justify-content: start
            align-items: center
            gap: 10px 10px
            margin-right: 20px
            .flag
                background-color: var(--color-std-bg-3)
                color: var(--color-std-fg-1)
                display: grid
                grid-template-columns: 100px 80px
                grid-template-rows: 50px
                justify-content: start
                align-items: center
                gap: 10px 10px
                padding: 0 10px 0 10px
                border-radius: 4px
        .action
            display: grid
            grid-template-columns: 80px
            grid-template-rows: 50px 50px
            justify-content: center
            align-items: center
            gap: 10px 10px
        .button
            background-color: var(--color-std-bg-2)
            color: var(--color-std-fg-1)
            border-radius: 4px
            padding: 2px 8px 2px 8px
            text-align: center
            font-size: 12pt
            line-height: 50px
            width: calc(100% - 2 * 8px)
            height: calc(100% - 2 * 2px)
            cursor: pointer
            &.selected
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
    .preview-url
        background-color: var(--color-acc-bg-3)
        color: var(--color-acc-fg-5)
        border-radius: 4px
        padding: 8px 8px 8px 8px
        font-size: 12pt
        width: auto
        height: auto
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
import Toggle              from "@vueform/toggle"
</script>

<script lang="ts">
export default defineComponent({
    name: "app-control-preview",
    components: {
        "toggle": Toggle
    },
    props: {
        serviceUrl: { type: String, required: true }
    },
    data: () => ({
        preview: {
            opts: {
                layer: "back",
                cam:   "CAM2",
                home:  true,
                freed: false,
                keys:  true
            },
            url: ""
        }
    }),
    async mounted () {
        /*  handle mutual exclusive toggles  */
        this.$watch("preview.opts.freed", (val: boolean) => {
            if (val && this.preview.opts.keys)
                this.preview.opts.keys = false
        })
        this.$watch("preview.opts.keys", (val: boolean) => {
            if (val && this.preview.opts.freed)
                this.preview.opts.freed = false
        })

        /*  re-generate the preview URL  */
        this.$watch("preview.opts", () => {
            let url = `${this.serviceUrl}#/render/${this.preview.opts.layer}/${this.preview.opts.cam}`
            const opts = [] as string[]
            if (this.preview.opts.freed) opts.push("ptzFreeD=true")
            if (this.preview.opts.keys)  opts.push("ptzKeys=true")
            if (opts.length > 0)
                url += "?" + opts.join("&")
            this.preview.url = url
        }, { immediate: true, deep: true })
    },
    methods: {
        /*  open preview URL in own window  */
        previewOpen () {
            window.open(this.preview.url, "_blank")
        },

        /*  copy preview URL to clipboard  */
        previewCopy () {
            navigator.clipboard.writeText(this.preview.url)
        }
    }
})
</script>

