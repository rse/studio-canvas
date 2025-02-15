<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="desc">
        The <b>Presets</b> can be used to load and save the entire &mdash; or just the
        partial &mdash; current scence control state from or to persistent preset slots 1-12.
        When loading a partial state from a preset slot, the partial state is merged
        onto the current state. First, select either "all" or "none" plus a particular state
        group, corresponding to the other tabs in this control UI. Second, select the preset slot 1-12.
        Third, select the action "load", "clear" or "save" to perform. Optionally,
        "lock" or "unlock" a preset to prevent accidental destruction of important state.
    </div>
    <div class="presets">
        <div class="actions3">
            <div class="button" v-bind:class="{ unselectable: presetFiltersSelectedNone() }" v-on:click="presetFiltersSelect(false)">NONE</div>
            <div class="button" v-bind:class="{ unselectable: presetFiltersSelectedAll()  }" v-on:click="presetFiltersSelect(true)">ALL</div>
        </div>
        <div class="filter">
            <div class="button" v-bind:class="{ selected: preset.filters.renderer }"
                v-on:click="preset.filters.renderer = !preset.filters.renderer">
                Renderer
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.streams }"
                v-on:click="preset.filters.streams = !preset.filters.streams">
                Streams
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.media }"
                v-on:click="preset.filters.media = !preset.filters.media">
                Media
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.canvas }"
                v-on:click="preset.filters.canvas = !preset.filters.canvas">
                Canvas
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.decal }"
                v-on:click="preset.filters.decal = !preset.filters.decal">
                Decal
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.monitor }"
                v-on:click="preset.filters.monitor = !preset.filters.monitor">
                Monitor
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.pillar }"
                v-on:click="preset.filters.pillar = !preset.filters.pillar">
                Pillar
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.plate }"
                v-on:click="preset.filters.plate = !preset.filters.plate">
                Plate
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.hologram }"
                v-on:click="preset.filters.hologram = !preset.filters.hologram">
                Hologram
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.pane }"
                v-on:click="preset.filters.pane = !preset.filters.pane">
                Pane
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.mask }"
                v-on:click="preset.filters.mask = !preset.filters.mask">
                Mask
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.lights }"
                v-on:click="preset.filters.lights = !preset.filters.lights">
                Lights
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.avatars }"
                v-on:click="preset.filters.avatars = !preset.filters.avatars">
                Avatars
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.references }"
                v-on:click="preset.filters.references = !preset.filters.references">
                References
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.CAM1 }"
                v-on:click="preset.filters.CAM1 = !preset.filters.CAM1">
                CAM1
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.CAM2 }"
                v-on:click="preset.filters.CAM2 = !preset.filters.CAM2">
                CAM2
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.CAM3 }"
                v-on:click="preset.filters.CAM3 = !preset.filters.CAM3">
                CAM3
            </div>
            <div class="button" v-bind:class="{ selected: preset.filters.CAM4 }"
                v-on:click="preset.filters.CAM4 = !preset.filters.CAM4">
                CAM4
            </div>
        </div>
        <div class="slots">
            <div class="button" v-bind:class="{ selected: preset.slot === 0 }"
                v-on:click="preset.slot = preset.slot !== 0 ? 0 : -1">
                1
                <div class="badge" v-bind:class="presetStatus2Class(0)">{{ preset.status[0] }}</div>
                <div class="lock" v-show="preset.locked[0]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 1 }"
                v-on:click="preset.slot = preset.slot !== 1 ? 1 : -1">
                2
                <div class="badge" v-bind:class="presetStatus2Class(1)">{{ preset.status[1] }}</div>
                <div class="lock" v-show="preset.locked[1]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 2 }"
                v-on:click="preset.slot = preset.slot !== 2 ? 2 : -1">
                3
                <div class="badge" v-bind:class="presetStatus2Class(2)">{{ preset.status[2] }}</div>
                <div class="lock" v-show="preset.locked[2]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 3 }"
                v-on:click="preset.slot = preset.slot !== 3 ? 3 : -1">
                4
                <div class="badge" v-bind:class="presetStatus2Class(3)">{{ preset.status[3] }}</div>
                <div class="lock" v-show="preset.locked[3]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 4 }"
                v-on:click="preset.slot = preset.slot !== 4 ? 4 : -1">
                5
                <div class="badge" v-bind:class="presetStatus2Class(4)">{{ preset.status[4] }}</div>
                <div class="lock" v-show="preset.locked[4]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 5 }"
                v-on:click="preset.slot = preset.slot !== 5 ? 5 : -1">
                6
                <div class="badge" v-bind:class="presetStatus2Class(5)">{{ preset.status[5] }}</div>
                <div class="lock" v-show="preset.locked[5]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 6 }"
                v-on:click="preset.slot = preset.slot !== 6 ? 6 : -1">
                7
                <div class="badge" v-bind:class="presetStatus2Class(6)">{{ preset.status[6] }}</div>
                <div class="lock" v-show="preset.locked[6]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 7 }"
                v-on:click="preset.slot = preset.slot !== 7 ? 7 : -1">
                8
                <div class="badge" v-bind:class="presetStatus2Class(7)">{{ preset.status[7] }}</div>
                <div class="lock" v-show="preset.locked[7]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 8 }"
                v-on:click="preset.slot = preset.slot !== 8 ? 8 : -1">
                9
                <div class="badge" v-bind:class="presetStatus2Class(8)">{{ preset.status[8] }}</div>
                <div class="lock" v-show="preset.locked[8]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 9 }"
                v-on:click="preset.slot = preset.slot !== 9 ? 9 : -1">
                10
                <div class="badge" v-bind:class="presetStatus2Class(9)">{{ preset.status[9] }}</div>
                <div class="lock" v-show="preset.locked[9]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 10 }"
                v-on:click="preset.slot = preset.slot !== 10 ? 10 : -1">
                11
                <div class="badge" v-bind:class="presetStatus2Class(10)">{{ preset.status[10] }}</div>
                <div class="lock" v-show="preset.locked[10]"><i class="fa fa-lock"></i></div>
            </div>
            <div class="button" v-bind:class="{ selected: preset.slot === 11 }"
                v-on:click="preset.slot = preset.slot !== 11 ? 11 : -1">
                12
                <div class="badge" v-bind:class="presetStatus2Class(11)">{{ preset.status[11] }}</div>
                <div class="lock" v-show="preset.locked[11]"><i class="fa fa-lock"></i></div>
            </div>
        </div>
        <div class="actions0">
            <div class="button destructive"
                v-bind:class="{ unselectable: preset.slot === -1 || preset.status[preset.slot] === 0 || preset.locked[preset.slot] }"
                v-on:click="presetLock">
                LOCK
            </div>
            <div class="button destructive"
                v-bind:class="{ unselectable: preset.slot === -1 || !preset.locked[preset.slot] }"
                v-on:click="presetUnlock">
                UNLOCK
            </div>
        </div>
        <div class="actions1">
            <div class="button destructive"
                v-bind:class="{ unselectable: preset.slot === -1 || preset.status[preset.slot] === 0 }"
                v-on:click="presetLoad">
                LOAD
            </div>
            <div class="button destructive"
                v-bind:class="{ unselectable: preset.slot === -1 || preset.status[preset.slot] === 0 || preset.locked[preset.slot] }"
                v-on:click="presetClear">
                CLEAR
            </div>
        </div>
        <div class="actions2">
            <div class="button destructive"
                v-bind:class="{ unselectable: preset.slot === -1 || preset.locked[preset.slot] }"
                v-on:click="presetSave">
                SAVE
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
    .presets
        display: flex
        flex-direction: row
        justify-content: flex-start
        align-items: center
        .slots
            margin-right: 20px
            display: grid
            grid-template-columns: 70px 70px 70px
            grid-template-rows: 65px 65px 65px 65px
            justify-content: center
            align-items: center
            gap: 10px 10px
        .actions0,
        .actions1,
        .actions3
            margin-right: 10px
            display: grid
            grid-template-columns: 100px
            grid-template-rows: 140px 140px
            justify-content: center
            align-items: center
            gap: 10px 10px
        .actions2
            display: grid
            grid-template-columns: 100px
            grid-template-rows: 290px
            justify-content: center
            align-items: center
            gap: 10px 10px
        .filter
            margin-right: 20px
            display: grid
            grid-template-columns: 100px 100px
            grid-template-rows: 27px 27px 27px 27px 27px 27px 27px 27px 27px
            justify-content: center
            align-items: center
            gap: 6px 6px
        .button
            background-color: var(--color-std-bg-2)
            color: var(--color-std-fg-5)
            border-radius: 4px
            padding: 2px 8px 2px 8px
            text-align: center
            font-size: 12pt
            line-height: 50px
            width: calc(100% - 2 * 8px)
            height: calc(100% - 2 * 2px)
            position: relative
            cursor: pointer
            &.selected
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
            &.destructive:hover
                background-color: var(--color-sig-bg-2)
                color: var(--color-sig-fg-5)
            .badge
                position: absolute
                right: -2px
                top: -2px
                line-height: 24px
                width: 24px
                height: 24px
                border-radius: 12px
                font-size: 14px
                font-weight: normal
                &.clear
                    display: none
                &.partial
                    background-color: var(--color-sig-bg-2)
                    color: var(--color-sig-fg-5)
                &.complete
                    background-color: var(--color-acc-bg-2)
                    color: var(--color-acc-fg-5)
            .lock
                position: absolute
                left: -2px
                top: -2px
                line-height: 24px
                width: 24px
                height: 24px
                border-radius: 12px
                font-size: 14px
                font-weight: normal
                background-color: var(--color-sig-bg-2)
                color: var(--color-sig-fg-5)
        .filter .button
            font-weight: 200
            line-height: 22px
        .slots .button
            font-size: 150%
            font-weight: bold
            line-height: 65px
        .actions0 .button
            font-size: 120%
            font-weight: bold
            line-height: 140px
            &.unselectable,
            &.unselectable:hover
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-1)
                cursor: default
        .actions1 .button
            font-size: 120%
            font-weight: bold
            line-height: 140px
            &.unselectable,
            &.unselectable:hover
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-1)
                cursor: default
        .actions2 .button
            font-size: 120%
            font-weight: bold
            line-height: 290px
            &.unselectable,
            &.unselectable:hover
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-1)
                cursor: default
        .actions3 .button
            line-height: 140px
            &.unselectable,
            &.unselectable:hover
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-1)
                cursor: default
</style>

<script setup lang="ts">
import { defineComponent, type PropType } from "vue"
import axios                  from "axios"
import Ducky                  from "ducky"
import { type StateType, type StateTypePartial, StateSchemaPartial } from "../common/app-state"
</script>

<script lang="ts">
export const StateFilterKeys = [
    "renderer",
    "streams",
    "media",
    "canvas",
    "monitor",
    "decal",
    "plate",
    "hologram",
    "pane",
    "pillar",
    "mask",
    "lights",
    "avatars",
    "references",
    "CAM1",
    "CAM2",
    "CAM3",
    "CAM4"
]
export type StateFilterType = {
    renderer:   boolean,
    streams:    boolean,
    media:      boolean,
    canvas:     boolean,
    monitor:    boolean,
    decal:      boolean,
    plate:      boolean,
    hologram:   boolean,
    pane:       boolean,
    pillar:     boolean,
    mask:       boolean,
    lights:     boolean,
    avatars:    boolean,
    references: boolean,
    CAM1:       boolean,
    CAM2:       boolean,
    CAM3:       boolean,
    CAM4:       boolean
}
type Connection  = { online: boolean, recv: boolean, send: boolean }
type RaiseStatus = (level: string, msg: string, duration?: number) => void
type ExportState = (paths?: Readonly<string[]>) => StateTypePartial
type MergeState  = (state: Readonly<StateTypePartial>, paths?: Readonly<string[]>) => boolean

export default defineComponent({
    name: "app-control-preset",
    props: {
        serviceUrl:  { type: String,                            required: true },
        connection:  { type: Object   as PropType<Connection>,  required: true },
        raiseStatus: { type: Function as PropType<RaiseStatus>, required: true },
        exportState: { type: Function as PropType<ExportState>, required: true },
        mergeState:  { type: Function as PropType<MergeState>,  required: true }
    },
    data: () => ({
        preset: {
            filters: {
                renderer:   true,
                streams:    true,
                media:      true,
                canvas:     true,
                monitor:    true,
                decal:      true,
                plate:      true,
                hologram:   true,
                pane:       true,
                pillar:     true,
                mask:       true,
                lights:     true,
                avatars:    true,
                references: true,
                CAM1:       true,
                CAM2:       true,
                CAM3:       true,
                CAM4:       true
            } as StateFilterType,
            slot: -1,
            status: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            locked: [
                false, false, false, false, false, false,
                false, false, false, false, false, false,
                false, false, false, false, false, false
            ]
        },
    }),
    async mounted () {
        await this.presetStatus()
    },
    methods: {
        /*  load preset status  */
        async presetStatus () {
            this.connection.recv = true
            const result = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            })
            if (result === null)
                throw new Error("failed to load preset status")
            this.preset.status = result.status
            this.preset.locked = result.locked
        },

        /*  map preset status to CSS class name  */
        presetStatus2Class (slot: number) {
            const clazz = {} as any
            if (this.preset.status[slot] === 0)
                clazz.clear = true
            else if (this.preset.status[slot] > 0 && this.preset.status[slot] < 18)
                clazz.partial = true
            else if (this.preset.status[slot] === 18)
                clazz.complete = true
            return clazz
        },

        /*  enable/disable all preset filters  */
        presetFiltersSelect (enable: boolean) {
            for (const key of Object.keys(this.preset.filters))
                (this.preset.filters as any)[key] = enable
        },

        /*  determine whether all preset filters are selected  */
        presetFiltersSelectedAll () {
            let selectedAll = true
            for (const key of Object.keys(this.preset.filters)) {
                if (!(this.preset.filters as any)[key]) {
                    selectedAll = false
                    break
                }
            }
            return selectedAll
        },

        /*  determine whether none preset filters are selected  */
        presetFiltersSelectedNone () {
            let selectedNone = true
            for (const key of Object.keys(this.preset.filters)) {
                if ((this.preset.filters as any)[key]) {
                    selectedNone = false
                    break
                }
            }
            return selectedNone
        },

        /*  load preset slot  */
        async presetLoad () {
            if (this.preset.slot === -1)
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Loading state from preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.recv = true
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            })
            if (state === null) {
                this.raiseStatus("error", "failed to load preset")
                return
            }
            const errors = [] as Array<string>
            if (!Ducky.validate(state, StateSchemaPartial, errors)) {
                this.raiseStatus("error", `invalid schema of loaded preset state: ${errors.join(", ")}`)
                return
            }
            const filters = Object.keys(this.preset.filters)
                .filter((key) => (this.preset.filters as any)[key])
                .map((key) => `${key}.**`)
            this.mergeState(state as StateType, filters)
            this.preset.slot = -1
        },

        /*  save preset slot  */
        async presetSave () {
            if (this.preset.slot === -1)
                return
            if (this.preset.locked[this.preset.slot])
                return
            const filters = Object.keys(this.preset.filters)
                .filter((key) => (this.preset.filters as any)[key])
                .map((key) => `${key}.**`)
            if (filters.length === 0) {
                this.raiseStatus("error", "Empty preset filter", 1000)
                return
            }
            this.raiseStatus("info", `Saving state to preset slot #${this.preset.slot + 1}...`, 1000)
            const state = this.exportState(filters)
            this.connection.send = true
            await axios({
                method: "POST",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}`,
                data:   state
            }).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        },

        /*  clear preset slot  */
        async presetClear () {
            if (this.preset.slot === -1)
                return
            if (this.preset.locked[this.preset.slot])
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Clearing preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.send = true
            await axios({
                method: "DELETE",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        },

        /*  lock preset slot  */
        async presetLock () {
            if (this.preset.slot === -1)
                return
            if (this.preset.locked[this.preset.slot])
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Locking preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}/lock`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        },

        /*  unlock preset slot  */
        async presetUnlock () {
            if (this.preset.slot === -1)
                return
            if (!this.preset.locked[this.preset.slot])
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Unlocking preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}/unlock`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        }
    }
})
</script>

