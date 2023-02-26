<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app">
        <!--  Control UI  -->
        <app-control
            ref="control"
            v-if="mode === 'control'"
            v-bind:select-tab="tab"
            v-bind:ws-url="wsURL"
            v-bind:service-url="serviceURL"
        ></app-control>

        <!--  Render UI  -->
        <app-render
            ref="render"
            v-if="mode === 'render'"
            v-bind:cam="cam"
            v-bind:options="options"
            v-bind:ws-url="wsURL"
            v-bind:service-url="serviceURL"
        ></app-render>
    </div>
</template>

<style lang="stylus">
</style>

<script setup lang="ts">
import { defineComponent } from "vue"
import URI                 from "urijs"
import AppControl          from "./app-control.vue"
import AppRender           from "./app-render.vue"
</script>

<script lang="ts">
export default defineComponent({
    name: "app",
    components: {
        "app-control": AppControl,
        "app-render":  AppRender
    },
    data: () => ({
        mode:       "control",
        tab:        "presets",
        cam:        "",
        options:    new Map<string, string | boolean>(),
        serviceURL: "",
        wsURL:      ""
    }),
    created () {
        /*  determine mode  */
        let url = new URI(window.location.href)
        const hash = url.hash()
        let m
        if ((m = hash.match(/^#\/render\/(.+?)(?:\?(.+))?$/)) !== null) {
            this.cam  = m[1]
            this.mode = "render"
            if (m[2]) {
                const opts = m[2].split("&")
                for (const opt of opts) {
                    let m2
                    if ((m2 = opt.match(/^(.+)=(.+)$/)) !== null)
                        this.options.set(m2[1], m2[2])
                    else
                        this.options.set(opt, true)
                }
            }
        }
        else if ((m = hash.match(/^#\/control(?:\/(.+))?$/)) !== null) {
            this.mode = "control"
            this.tab = m[1] ?? "presets"
        }
        else
            window.location.href = "#/control"

        /*  determine URL for WebSocket connections  */
        url = new URI(window.location.href)
        url.protocol(`ws${url.protocol() === "https" ? "s" : ""}`)
        url.pathname("/ws")
        url.search("")
        url.hash("")
        this.wsURL = url.toString()

        /*  determine URL for REST connections  */
        url = new URI(window.location.href)
        url.pathname("")
        url.search("")
        url.hash("")
        this.serviceURL = url.toString()
    }
})
</script>

