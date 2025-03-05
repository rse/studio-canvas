<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Media</b> are static images (in PNG, JPEG, or GIF format)
        and looping videos (in MP4 or WebM format), each 1920x1080 pixels in size
        and for PNG, GIF and WebM/VP8 optionally with a transparent background.
        Each media can be assigned to the logical media slots 1-4 and then selected
        for displaying on Decal, Monitor, Pillar, Plate, Hologram, Pane and Mask
        as an alternative to the regular video streams 1-2. Looping videos have
        to use an underlying filename <code>*-loop.{mp4,webm}</code>.
    </div>
    <div class="list" ref="list">
        <div
            v-for="(group, i) in mediaList.map((e) => e.group).filter((v, i, a) => v !== '' && a.indexOf(v) === i)"
            class="list-group"
            v-bind:class="{ selected: mediaOpenGroup === group, alt: i % 2 == 1 }"
            v-bind:key="group"
        >
            <div class="name"
                v-on:click="mediaOpenGroup = mediaOpenGroup !== group ? group : ''">
                <span class="icon">
                    <span v-show="mediaOpenGroup !== group"><i class="fa fa-caret-right"></i></span>
                    <span v-show="mediaOpenGroup === group"><i class="fa fa-caret-down" ></i></span>
                </span>
                <span>{{ group }}</span>
            </div>
            <div
                v-show="mediaOpenGroup === group"
                v-for="(entry, j) in mediaList.filter((e) => e.group === group)"
                class="list-entry"
                v-bind:class="{ alt: j % 2 == 1 }"
                v-bind:key="entry.id!"
            >
                <div class="name">{{ entry.name }}</div>
                <div class="tags">
                    <div v-show="entry.loop"  class="tag tag-loop">LOOP</div>
                    <div v-show="entry.stack" class="tag tag-stack">STACK</div>
                    <div v-show="entry.type"  class="tag tag-type">{{ entry.type }}</div>
                </div>
                <div class="actions">
                    <div class="button" v-bind:class="{ selected: state.media.media1 === entry.texture }" v-on:click="selectMedia('media1', entry.texture)">Media 1</div>
                    <div class="button" v-bind:class="{ selected: state.media.media2 === entry.texture }" v-on:click="selectMedia('media2', entry.texture)">Media 2</div>
                    <div class="button" v-bind:class="{ selected: state.media.media3 === entry.texture }" v-on:click="selectMedia('media3', entry.texture)">Media 3</div>
                    <div class="button" v-bind:class="{ selected: state.media.media4 === entry.texture }" v-on:click="selectMedia('media4', entry.texture)">Media 4</div>
                </div>
            </div>
        </div>
        <div
            v-for="(entry, i) in mediaList.filter((e) => e.group === '')"
            class="list-entry"
            v-bind:class="{ alt: i % 2 == 1 }"
            v-bind:key="entry.id!"
        >
            <div class="name">{{ entry.name }}</div>
            <div class="tags">
                <div v-show="entry.loop"  class="tag tag-loop">LOOP</div>
                <div v-show="entry.stack" class="tag tag-stack">STACK</div>
                <div v-show="entry.type"  class="tag tag-type">{{ entry.type }}</div>
            </div>
            <div class="actions">
                <div class="button" v-bind:class="{ selected: state.media.media1 === entry.texture }" v-on:click="selectMedia('media1', entry.texture)">Media 1</div>
                <div class="button" v-bind:class="{ selected: state.media.media2 === entry.texture }" v-on:click="selectMedia('media2', entry.texture)">Media 2</div>
                <div class="button" v-bind:class="{ selected: state.media.media3 === entry.texture }" v-on:click="selectMedia('media3', entry.texture)">Media 3</div>
                <div class="button" v-bind:class="{ selected: state.media.media4 === entry.texture }" v-on:click="selectMedia('media4', entry.texture)">Media 4</div>
            </div>
        </div>
    </div>
    <div class="actions">
        <div class="button"
            v-on:click="mediaListFetch()">
            RELOAD
        </div>
    </div>
</template>

<style lang="stylus">
    .list
        flex-grow: 1
        width: calc(100% - 48px)
        overflow-y: scroll
        overflow-x: hidden
        position: relative
        margin-top: 10px
        padding: 4px 4px 4px 4px
        border-radius: 4px
        background-color: var(--color-std-bg-2)
        height: 320px
        min-height: 320px
        max-height: 320px
        .list-group
            cursor: pointer
            color: var(--color-std-fg-5)
            background-color: var(--color-std-bg-4)
            display: flex
            flex-direction: column
            &.alt
                background-color: var(--color-std-bg-5)
            &.selected
                color: var(--color-acc-fg-5)
            > .name
                padding: 1px 10px 1px 10px
                width: 100%
                font-weight: bold
                > .icon
                    display: inline-block
                    width: 20px
            .list-entry
                padding: 1px 10px 1px 30px
        .list-entry
            cursor: pointer
            color: var(--color-std-fg-5)
            background-color: var(--color-std-bg-3)
            padding: 1px 10px 1px 10px
            display: flex
            flex-direction: row
            &.alt
                background-color: var(--color-std-bg-4)
            &.selected
                color: var(--color-acc-fg-5)
                background-color: var(--color-acc-bg-3)
                border-radius: 4px
            &:hover
                background-color: var(--color-acc-bg-1)
            &.alt:hover
                background-color: var(--color-acc-bg-2)
            &.selected:hover
                background-color: var(--color-acc-bg-3)
            .name
                flex-grow: 1
            .tags
                display: flex
                flex-direction: row
                .tag
                    width: 40px
                    padding: 4px 4px 0 4px
                    text-align: center
                    border-radius: 4px
                    margin-right: 4px
                    font-size: 75%
                    &.tag-loop,
                    &.tag-stack
                        color: var(--color-std-fg-2)
                        border: 1px solid var(--color-std-bg-1)
                        width: 40px
                        min-width: 40px
                        margin-right: 8px
                    &.tag-type
                        color: var(--color-std-fg-2)
                        border: 1px solid var(--color-std-bg-1)
                        width: 80px
                        margin-right: 20px
                    &.tag-fade
                        background-color: var(--color-acc-bg-2)
                        color: var(--color-acc-fg-5)
                    &.tag-exclusive
                        background-color: var(--color-sig-bg-2)
                        color: var(--color-sig-fg-5)
            .actions
                display: flex
                flex-direction: row
                .button
                    background-color: var(--color-std-bg-1)
                    color: var(--color-std-fg-1)
                    border-radius: 4px
                    padding: 2px 8px 2px 8px
                    text-align: center
                    font-size: 12pt
                    line-height: 22px
                    width: 60px
                    height: auto
                    cursor: pointer
                    margin-left: 4px
                    &.selected
                        background-color: var(--color-acc-bg-3)
                        color: var(--color-acc-fg-5)
                    &:hover
                        background-color: var(--color-acc-bg-5)
                        color: var(--color-acc-fg-5)
    .media
        .list
            .list-entry
                &:hover
                    background-color: var(--color-std-bg-3)
                &.alt:hover
                    background-color: var(--color-std-bg-4)
</style>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import axios                              from "axios"
import PerfectScrollbar                   from "perfect-scrollbar"
import { type StateType }                 from "../common/app-state"
import { type MediaEntry }                from "../common/app-media"
</script>

<script lang="ts">
type Connection  = { online: boolean, recv: boolean, send: boolean }
type WatchState  = { flag: boolean }
type PatchState  = (paths: Readonly<string[]>) => Promise<void>

export default defineComponent({
    name: "app-control-media",
    props: {
        serviceUrl: { type: String,                           required: true },
        connection: { type: Object   as PropType<Connection>, required: true },
        state:      { type: Object   as PropType<StateType>,  required: true },
        watchState: { type: Object   as PropType<WatchState>, required: true },
        patchState: { type: Function as PropType<PatchState>, required: true }
    },
    data: () => ({
        mediaList: [] as MediaEntry[],
        mediaOpenGroup: "",
        ps: null as PerfectScrollbar | null
    }),
    async mounted () {
        await this.mediaListFetch()
        this.mediaOpenGroup = this.mediaList[0]?.group ?? ""

        this.ps = new PerfectScrollbar(this.$refs.list as HTMLElement, {
            suppressScrollX: true,
            scrollXMarginOffset: 100
        })
    },
    methods: {
        /*  fetch list of media files  */
        async mediaListFetch () {
            this.connection.recv = true
            const result = await (axios({
                method:       "GET",
                url:          `${this.serviceUrl}media`,
                responseType: "json"
            }).then((result: any) => {
                return result.data.media
            }).finally(() => {
                this.connection.recv = false
            }) as Promise<MediaEntry[]>)
            this.mediaList = result
        },

        /*  select media file  */
        async selectMedia (media: "media1" | "media2" | "media3" | "media4", texture: string) {
            this.watchState.flag = false
            if (this.state.media[media] !== texture)
                this.state.media[media] = texture
            else
                this.state.media[media] = ""
            await this.patchState([ "media.*" ])
            this.watchState.flag = true
        }
    }
})
</script>

