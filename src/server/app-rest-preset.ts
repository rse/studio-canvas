/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path                from "node:path"
import fs                  from "node:fs"
import util                from "node:util"
import jsYAML              from "js-yaml"
import ducky               from "ducky"
import * as HAPI           from "@hapi/hapi"

import Argv                from "./app-argv"
import DB, { Transaction } from "./app-db"
import REST                from "./app-rest"
import RESTState           from "./app-rest-state"
import RESTWS              from "./app-rest-ws"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial,
    StateDefault, StateUtil
} from "../common/app-state"

export default class RESTPreset {
    public presetsFile = ""
    constructor (
        private argv:      Argv,
        private rest:      REST,
        private restState: RESTState,
        private restWS:    RESTWS,
        private db:        DB
    ) {}
    async init () {
        /*  determine presets file  */
        this.presetsFile = path.join(this.argv.stateDir, "canvas-preset-%s.yaml")

        /*  load presets overview information  */
        this.rest.server!.route({
            method: "GET",
            path: "/state/preset",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.READ, 4000, async () => {
                    /*  determine number of stored top-level entries  */
                    const presets = [] as number[]
                    for (let i = 1; i <= 12; i++) {
                        let n = 0
                        const state = {} as StateTypePartial
                        const filename = util.format(this.presetsFile, i.toString())
                        if (await (fs.promises.stat(filename).then(() => true).catch(() => false))) {
                            const txt = await this.db.readFile(filename)
                            const obj = jsYAML.load(txt) as StateTypePartial
                            if (ducky.validate(obj, StateSchemaPartial))
                                StateUtil.copy(state, obj)
                        }
                        if (state.renderer   !== undefined) n++
                        if (state.streams    !== undefined) n++
                        if (state.media      !== undefined) n++
                        if (state.canvas     !== undefined) n++
                        if (state.monitor    !== undefined) n++
                        if (state.decal      !== undefined) n++
                        if (state.plate      !== undefined) n++
                        if (state.hologram   !== undefined) n++
                        if (state.pane       !== undefined) n++
                        if (state.pillar     !== undefined) n++
                        if (state.mask       !== undefined) n++
                        if (state.lights     !== undefined) n++
                        if (state.avatars    !== undefined) n++
                        if (state.references !== undefined) n++
                        if (state.CAM1       !== undefined) n++
                        if (state.CAM2       !== undefined) n++
                        if (state.CAM3       !== undefined) n++
                        if (state.CAM4       !== undefined) n++
                        presets.push(n)
                    }
                    return h.response(presets).code(200)
                })
            }
        })

        /*  merge selected preset into current state  */
        this.rest.server!.route({
            method: "GET",
            path: "/state/preset/{slot}/select",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.WRITE, 4000, async () => {
                    const slot = req.params.slot

                    /*  load original state  */
                    const state = StateDefault
                    if (await (fs.promises.stat(this.restState.stateFile).then(() => true).catch(() => false))) {
                        const txt = await this.db.readFile(this.restState.stateFile)
                        const obj = jsYAML.load(txt) as StateType
                        if (ducky.validate(obj, StateSchema))
                            StateUtil.copy(state, obj)
                    }

                    /*  remember original state  */
                    const stateOrig = {}
                    StateUtil.copy(stateOrig, state)

                    /*  load preset  */
                    let preset = {}
                    const filename = util.format(this.presetsFile, slot)
                    if (await (fs.promises.stat(filename).then(() => true).catch(() => false))) {
                        const txt = await this.db.readFile(filename)
                        const obj = jsYAML.load(txt) as StateTypePartial
                        if (ducky.validate(obj, StateSchemaPartial))
                            StateUtil.copy(preset, obj)
                    }

                    /*  merge preset onto original state  */
                    StateUtil.copy(state, preset)

                    /*  save new state  */
                    const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                    await this.db.writeFile(this.restState.stateFile, txt)

                    /*  notify clients about reduced preset  */
                    preset = StateUtil.reduce(stateOrig, preset)
                    this.restWS.notifySceneState(preset)

                    return h.response().code(204)
                })
            }
        })

        /*  load preset  */
        this.rest.server!.route({
            method: "GET",
            path: "/state/preset/{slot}",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.READ, 4000, async () => {
                    const slot = req.params.slot
                    const filename = util.format(this.presetsFile, slot)
                    const state = {}
                    if (await (fs.promises.stat(filename).then(() => true).catch(() => false))) {
                        const txt = await this.db.readFile(filename)
                        const obj = jsYAML.load(txt) as StateTypePartial
                        if (ducky.validate(obj, StateSchemaPartial))
                            StateUtil.copy(state, obj)
                    }
                    return h.response(state).code(200)
                })
            }
        })

        /*  store preset  */
        this.rest.server!.route({
            method: "POST",
            path: "/state/preset/{slot}",
            options: {
                payload: {
                    output: "data",
                    parse:  true,
                    allow:  "application/json"
                },
                plugins: {
                    ducky: StateSchemaPartial
                }
            },
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.WRITE, 4000, async () => {
                    const slot = req.params.slot
                    const filename = util.format(this.presetsFile, slot)
                    const state = req.payload as StateTypePartial
                    const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                    await this.db.writeFile(filename, txt)
                    return h.response().code(204)
                })
            }
        })

        /*  clear preset  */
        this.rest.server!.route({
            method: "DELETE",
            path: "/state/preset/{slot}",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.WRITE, 4000, async () => {
                    const slot = req.params.slot
                    const filename = util.format(this.presetsFile, slot)
                    if (await (fs.promises.stat(filename).then(() => true).catch(() => false)))
                        await fs.promises.unlink(filename)
                    return h.response().code(204)
                })
            }
        })
    }
}
