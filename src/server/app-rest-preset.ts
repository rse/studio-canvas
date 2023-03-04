/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
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
import RESTWS              from "./app-rest-ws"
import { StateType, StateTypePartial, StateSchemaPartial, StateUtil } from "../common/app-state"

export default class RESTPreset {
    constructor (
        private argv:   Argv,
        private rest:   REST,
        private restWS: RESTWS,
        private db:     DB
    ) {}
    async init () {
        /*  provide state presets API  */
        const presetsFile = path.join(this.argv.stateDir, "canvas-preset-%s.yaml")
        type PresetType = { [ slot: string ]: StateTypePartial }
        this.rest.server!.route({
            method: "GET",
            path: "/state/preset",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.READ, 4000, async () => {
                    const presets = [] as number[]
                    for (let i = 1; i <= 9; i++) {
                        let n = 0
                        const state = {} as StateTypePartial
                        const filename = util.format(presetsFile, i.toString())
                        if (await (fs.promises.stat(filename).then(() => true).catch(() => false))) {
                            const txt = await fs.promises.readFile(filename, { encoding: "utf8" })
                            const obj = jsYAML.load(txt) as StateTypePartial
                            if (ducky.validate(obj, StateSchemaPartial))
                                StateUtil.copy(state, obj)
                        }
                        if (state.canvas     !== undefined) n++
                        if (state.monitor    !== undefined) n++
                        if (state.decal      !== undefined) n++
                        if (state.lights     !== undefined) n++
                        if (state.references !== undefined) n++
                        if (state.CAM1       !== undefined) n++
                        if (state.CAM2       !== undefined) n++
                        if (state.CAM3       !== undefined) n++
                        if (state.CAM4       !== undefined) n++
                        if (state.renderer   !== undefined) n++
                        presets.push(n)
                    }
                    return h.response(presets).code(200)
                })
            }
        })

        /*  bare selection of preset  */
        this.rest.server!.route({
            method: "GET",
            path: "/state/preset/{slot}/select",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.READ, 4000, async () => {
                    const slot = req.params.slot
                    const filename = util.format(presetsFile, slot)
                    const state = {}
                    if (await (fs.promises.stat(filename).then(() => true).catch(() => false))) {
                        const txt = await fs.promises.readFile(filename, { encoding: "utf8" })
                        const obj = jsYAML.load(txt) as StateType
                        if (ducky.validate(obj, StateSchemaPartial))
                            StateUtil.copy(state, obj)
                    }
                    this.restWS.notifySceneState(state)
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
                    const filename = util.format(presetsFile, slot)
                    const state = {}
                    if (await (fs.promises.stat(filename).then(() => true).catch(() => false))) {
                        const txt = await fs.promises.readFile(filename, { encoding: "utf8" })
                        const obj = jsYAML.load(txt) as StateType
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
                    const filename = util.format(presetsFile, slot)
                    const state = req.payload as StateTypePartial
                    const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                    await fs.promises.writeFile(filename, txt, { encoding: "utf8" })
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
                    const filename = util.format(presetsFile, slot)
                    if (await (fs.promises.stat(filename).then(() => true).catch(() => false)))
                        await fs.promises.unlink(filename)
                    return h.response().code(204)
                })
            }
        })
    }
}
