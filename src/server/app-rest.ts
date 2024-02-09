/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path           from "node:path"
import * as HAPI      from "@hapi/hapi"
import { Server }     from "@hapi/hapi"
import Inert          from "@hapi/inert"
import HAPIWebSocket  from "hapi-plugin-websocket"
import HAPIHeader     from "hapi-plugin-header"
import HAPITraffic    from "hapi-plugin-traffic"
import HAPIDucky      from "hapi-plugin-ducky"

import Pkg            from "./app-pkg"
import Argv           from "./app-argv"
import Log            from "./app-log"

export default class REST {
    public server: Server | null = null
    constructor (
        private pkg:  Pkg,
        private argv: Argv,
        private log:  Log
    ) {}
    async init () {
        /*  establish network service  */
        this.server = new Server({
            address: this.argv.httpAddr,
            port:    this.argv.httpPort
        })
        await this.server.register({ plugin: Inert })
        await this.server.register({
            plugin: HAPIHeader,
            options: {
                Server: `${this.pkg.name}/${this.pkg.version}`
            }
        })
        await this.server.register({ plugin: HAPITraffic })
        await this.server.register({ plugin: HAPIWebSocket })
        await this.server.register({ plugin: HAPIDucky })

        /*  hook into network service logging  */
        this.server.events.on("response", (request: HAPI.Request) => {
            const traffic = request.traffic()
            let protocol = `HTTP/${request.raw.req.httpVersion}`
            const ws = request.websocket()
            if (ws.mode === "websocket") {
                const wsVersion = (ws.ws as any).protocolVersion ??
                    request.headers["sec-websocket-version"] ?? "13?"
                protocol = `WebSocket/${wsVersion}+${protocol}`
            }
            const msg =
                "remote="   + request.info.remoteAddress + ", " +
                "method="   + request.method.toUpperCase() + ", " +
                "url="      + request.url.pathname + ", " +
                "protocol=" + protocol + ", " +
                "response=" + ("statusCode" in request.response ? request.response.statusCode : "<unknown>") + ", " +
                "recv="     + traffic.recvPayload + "/" + traffic.recvRaw + ", " +
                "sent="     + traffic.sentPayload + "/" + traffic.sentRaw + ", " +
                "duration=" + traffic.timeDuration
            this.log.log(2, `HAPI: request: ${msg}`)
        })
        this.server.events.on({ name: "request", channels: [ "error" ] }, (request: HAPI.Request, event: HAPI.RequestEvent, tags: { [key: string]: true }) => {
            if (event.error instanceof Error)
                this.log.log(0, `HAPI: request-error: ${event.error.message}`)
            else
                this.log.log(0, `HAPI: request-error: ${event.error}`)
        })
        this.server.events.on("log", (event: HAPI.LogEvent, tags: { [key: string]: true }) => {
            if (tags.error) {
                const err = event.error
                if (err instanceof Error)
                    this.log.log(2, `HAPI: log: ${err.message}`)
                else
                    this.log.log(2, `HAPI: log: ${err}`)
            }
        })

        /*  serve static client files  */
        this.server.route({
            method: "GET",
            path: "/{param*}",
            handler: {
                directory: {
                    path: path.join(__dirname, "../../dst/client"),
                    redirectToSlash: true,
                    index: true
                }
            }
        })

        /*  serve dedicated resource files  */
        this.server.route({
            method: "GET",
            path: "/res/{param*}",
            handler: {
                directory: {
                    path: path.join(__dirname, "../../res"),
                    redirectToSlash: true,
                    index: false
                }
            }
        })
    }
    async start () {
        /*  start service  */
        await this.server!.start()
        this.log.log(2, `started HTTP  network service: http://${this.argv.httpAddr}:${this.argv.httpPort}`)
    }
}
