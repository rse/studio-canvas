/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as HAPI       from "@hapi/hapi"

import REST            from "./app-rest"
import RESTWS          from "./app-rest-ws"
import { MixerState }  from "../common/app-mixer"

export default class RESTMixer {
    private mixer = {
        preview: "",
        program: ""
    } satisfies MixerState
    constructor (
        private rest:   REST,
        private restWS: RESTWS
    ) {}
    async init () {
        /*  load state  */
        this.rest.server!.route({
            method: "GET",
            path: "/mixer/state",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                return h.response(this.mixer).code(200)
            }
        })
        /*  select preview  */
        this.rest.server!.route({
            method: "GET",
            path: "/mixer/preview/{camera}",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                const camera = req.params.camera
                this.mixer.preview = camera
                this.restWS.notifyMixerState(this.mixer)
                return h.response().code(204)
            }
        })
        this.rest.server!.route({
            method: "GET",
            path: "/mixer/cut",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                const program = this.mixer.program
                this.mixer.program = this.mixer.preview
                this.mixer.preview = program
                this.restWS.notifyMixerState(this.mixer)
                return h.response().code(204)
            }
        })
    }
}
