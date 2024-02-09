/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path                from "node:path"
import fs                  from "node:fs"
import jsYAML              from "js-yaml"
import ducky               from "ducky"
import * as HAPI           from "@hapi/hapi"

import Argv                from "./app-argv"
import DB, { Transaction } from "./app-db"
import REST                from "./app-rest"
import RESTWS              from "./app-rest-ws"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial,
    StateDefault,
    StateUtil
} from "../common/app-state"

export default class RESTState {
    public stateFile = ""
    constructor (
        private argv:   Argv,
        private db:     DB,
        private rest:   REST,
        private restWS: RESTWS
    ) {}
    async init () {
        /*  determine state file  */
        this.stateFile = path.join(this.argv.stateDir, "canvas-state.yaml")

        /*  load current state  */
        this.rest.server!.route({
            method: "GET",
            path: "/state",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.READ, 4000, async () => {
                    const state = StateDefault
                    if (await (fs.promises.stat(this.stateFile).then(() => true).catch(() => false))) {
                        const txt = await this.db.readFile(this.stateFile)
                        const obj = jsYAML.load(txt) as StateType
                        if (ducky.validate(obj, StateSchema))
                            StateUtil.copy(state, obj)
                    }
                    return h.response(state).code(200)
                })
            }
        })

        /*  save current state  */
        this.rest.server!.route({
            method: "POST",
            path: "/state",
            options: {
                payload: {
                    output: "data",
                    parse:  true,
                    allow:  "application/json"
                },
                plugins: {
                    ducky: StateSchema
                }
            },
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return this.db.transaction(Transaction.WRITE, 4000, async () => {
                    const state = req.payload as StateType
                    const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                    await this.db.writeFile(this.stateFile, txt)
                    this.restWS.notifySceneState(state)
                    return h.response().code(204)
                })
            }
        })

        /*  change current state  */
        this.rest.server!.route({
            method: "PATCH",
            path: "/state",
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
                    const state = StateDefault
                    if (await (fs.promises.stat(this.stateFile).then(() => true).catch(() => false))) {
                        const txt = await this.db.readFile(this.stateFile)
                        const obj = jsYAML.load(txt) as StateType
                        if (ducky.validate(obj, StateSchema))
                            StateUtil.copy(state, obj)
                    }
                    const statePatch = req.payload as StateTypePartial
                    StateUtil.copy(state, statePatch)
                    const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                    await this.db.writeFile(this.stateFile, txt)
                    this.restWS.notifySceneState(statePatch)
                    return h.response().code(204)
                })
            }
        })
    }
}
