/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as HAPI          from "@hapi/hapi"

import REST               from "./app-rest"
import RESTWS             from "./app-rest-ws"
import { ViewpointState } from "../common/app-viewpoint"

export default class RESTMixer {
    private viewpoint = {
        CAM1: "CAM1",
        CAM2: "CAM2",
        CAM3: "CAM3",
        CAM4: "CAM4"
    } satisfies ViewpointState
    constructor (
        private rest:   REST,
        private restWS: RESTWS
    ) {}
    async init () {
        /*  select viewpoint  */
        this.rest.server!.route({
            method: "GET",
            path: "/viewpoint/{camera}/{viewpoint}",
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                const camera    = req.params.camera as keyof typeof this.viewpoint
                if (!camera.match(/^CAM[1-4]$/))
                    throw new Error("invalid camera name")
                const viewpoint = req.params.viewpoint
                if (!viewpoint.match(/^CAM[1-4]$/))
                    throw new Error("invalid viewpoint name")
                this.viewpoint[camera] = viewpoint
                this.restWS.notifyViewpointState(this.viewpoint)
                return h.response().code(204)
            }
        })
    }
}
