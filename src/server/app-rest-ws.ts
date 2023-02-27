/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import http                 from "node:http"
import ducky                from "ducky"
import * as HAPI            from "@hapi/hapi"
import Boom                 from "@hapi/boom"
import WebSocket            from "ws"
import Latching             from "latching"

import { FreeDEntry }       from "./app-freed"
import REST                 from "./app-rest"
import { FreeDState }       from "../common/app-freed"
import { StateTypePartial } from "../common/app-state"

type wsPeerCtx = { id: string }

type wsPeerInfo = {
    ctx:        wsPeerCtx
    ws:         WebSocket
    req:        http.IncomingMessage
    subscribed: Map<string, boolean>,
    peer:       string
}

export default class RESTWS extends Latching {
    /*  statistics gathering  */
    private wsPeers = new Map<string, wsPeerInfo>()
    public stats = {
        peers: {
            camera:  0,
            render:  0,
            control: 0
        }
    }
    constructor (
        private rest: REST
    ) {
        super()
    }

    async init () {
        /*  serve WebSocket connections  */
        this.rest.server!.route({
            method: "POST",
            path:   "/ws/{peer}",
            options: {
                plugins: {
                    websocket: {
                        only: true,
                        autoping: 30 * 1000,
                        connect: (args: any) => {
                            const ctx: wsPeerCtx            = args.ctx
                            const ws:  WebSocket            = args.ws
                            const req: http.IncomingMessage = args.req
                            const m = req.url!.match(/^\/ws\/(control|render)$/)
                            const peer = m !== null ? m[1] : "unknown"
                            const id = `${req.socket.remoteAddress}:${req.socket.remotePort}`
                            ctx.id = id
                            this.wsPeers.set(id, { ctx, ws, req, subscribed: new Map<string, boolean>(), peer })
                            if (peer === "control")
                                this.stats.peers.control++
                            else if (peer === "render")
                                this.stats.peers.render++
                            this.notifyStats()
                        },
                        disconnect: (args: any) => {
                            const ctx: wsPeerCtx = args.ctx
                            const id = ctx.id
                            const peer = this.wsPeers.get(id)!.peer
                            if (peer === "control")
                                this.stats.peers.control--
                            else if (peer === "render")
                                this.stats.peers.render--
                            this.wsPeers.delete(id)
                            this.notifyStats()
                        }
                    }
                }
            },
            handler: (request: HAPI.Request, h: HAPI.ResponseToolkit) => {
                const { ctx, ws } = request.websocket()
                if (typeof request.payload !== "object" || request.payload === null)
                    return Boom.badRequest("invalid request")
                if (!ducky.validate(request.payload, "{ cmd: string, arg?: string }"))
                    return Boom.badRequest("invalid request")
                const { cmd, arg } = request.payload as any satisfies { cmd: string, arg: any }
                if ((cmd === "SUBSCRIBE" || cmd === "UNSUBSCRIBE") && typeof arg === "string") {
                    const state = this.hook("freed-state", "pass", arg) as FreeDEntry
                    if (state === undefined)
                        return Boom.badRequest("unknown camera")
                    if (cmd === "SUBSCRIBE") {
                        this.wsPeers.get(ctx.id)!.subscribed.set(arg, true)
                        this.notifyCamState(arg, state.state)
                    }
                    else
                        this.wsPeers.get(ctx.id)!.subscribed.delete(arg)
                }
                else
                    return Boom.badRequest("unknown command")
                return h.response().code(204)
            }
        })
    }

    notifyCamState (cam: string, state: FreeDState | null) {
        const msg = JSON.stringify({ cmd: "PTZ", arg: { cam, state } })
        for (const info of this.wsPeers.values())
            if (info.subscribed.get(cam))
                info.ws.send(msg)
    }
    notifySceneState (state: StateTypePartial) {
        const msg = JSON.stringify({ cmd: "STATE", arg: { state } })
        for (const info of this.wsPeers.values())
            info.ws.send(msg)
    }
    notifyStats () {
        const msg = JSON.stringify({ cmd: "STATS", arg: { stats: this.stats } })
        for (const info of this.wsPeers.values())
            info.ws.send(msg)
    }
}
