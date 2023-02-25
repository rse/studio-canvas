/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  load external requirements (built-in)  */
import path           from "node:path"
import tty            from "node:tty"
import fs             from "node:fs"
import dgram          from "node:dgram"
import http           from "node:http"
import util           from "node:util"

/*  load external requirements (foreign)  */
import glob           from "glob-promise"
import yargs          from "yargs"
import chalk          from "chalk"
import moment         from "moment"
import * as HAPI      from "@hapi/hapi"
import {
    Request,
    Server,
    ResponseToolkit
}                     from "@hapi/hapi"
import Boom           from "@hapi/boom"
import Inert          from "@hapi/inert"
import HAPIWebSocket  from "hapi-plugin-websocket"
import HAPIHeader     from "hapi-plugin-header"
import HAPITraffic    from "hapi-plugin-traffic"
import HAPIDucky      from "hapi-plugin-ducky"
import WebSocket      from "ws"
import ObjectHash     from "object-hash"
import ducky          from "ducky"
import jsYAML         from "js-yaml"
import locks          from "locks"

/*  load internal requirements  */
// @ts-ignore
import my             from "../../package.json"
import { FreeDState } from "./app-freed-state"
import * as FreeD     from "./app-freed"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial,
    StateDefault,
    StateUtil
}                     from "./app-state"

/*  establish environment  */
;(async () => {
    /*  command-line option parsing  */
    // @ts-ignore
    const argv = yargs
        /* eslint indent: off */
        .usage(
            "Usage: $0 [-h] [-V] " +
            "[-v <log-level>] [-l|--log-file <log-file>] " +
            "[-c <canvas-dir>] " +
            "[-s <state-dir>] " +
            "[-a <http-addr>] [-p <http-port>] " +
            "[-A <freed-addr>] [-P <freed-port>]" +
            "[-C <camera-addr>:<camera-name> [...]]"
        )
        .help("h").alias("h", "help").default("h", false)
            .describe("h", "show usage help")
        .boolean("V").alias("V", "version").default("V", false)
            .describe("V", "show program version information")
        .number("v").nargs("v", 1).alias("v", "log-level").default("v", 2)
            .describe("v", "level for verbose logging (0-3)")
        .string("l").nargs("l", 1).alias("l", "log-file").default("l", "-")
            .describe("l", "file for verbose logging")
        .string("c").nargs("c", 1).alias("c", "canvas-dir").default("c", path.join(__dirname, "../../res/canvas"))
            .describe("c", "directory of canvas image/config files")
        .string("s").nargs("s", 1).alias("s", "state-dir").default("s", path.join(__dirname, "../../var"))
            .describe("s", "directory of state files")
        .string("a").nargs("a", 1).alias("a", "http-addr").default("a", "0.0.0.0")
            .describe("a", "HTTP/Websocket listen IP address")
        .number("p").nargs("p", 1).alias("p", "http-port").default("p", 8080)
            .describe("p", "HTTP/Websocket listen TCP port")
        .string("A").nargs("A", 1).alias("A", "freed-addr").default("A", "0.0.0.0")
            .describe("A", "FreeD listen IP address")
        .number("P").nargs("P", 1).alias("P", "freed-port").default("P", 5555)
            .describe("P", "FreeD listen TCP port")
        .string("C").nargs("C", 1).alias("C", "freed-cam").default("C", [])
            .describe("C", "FreeD camera IP address and name mapping (colon-separated)")
        .version(false)
        .strict()
        .showHelpOnFail(true)
        .demand(0)
        .parse(process.argv.slice(2)) as any

    /*  short-circuit processing of "-V" command-line option  */
    if (argv.version) {
        process.stderr.write(`${my.name} ${my.version} <${my.homepage}>\n`)
        process.stderr.write(`${my.description}\n`)
        process.stderr.write(`Copyright (c) 2023 ${my.author.name} <${my.author.url}>\n`)
        process.stderr.write(`Licensed under ${my.license} <http://spdx.org/licenses/${my.license}.html>\n`)
        process.exit(0)
    }

    /*  log messages  */
    const levels = [
        { name: "ERROR",   style: chalk.red.bold },
        { name: "WARNING", style: chalk.yellow.bold },
        { name: "INFO",    style: chalk.blue },
        { name: "DEBUG",   style: chalk.green }
    ]
    if (argv.logLevel >= levels.length)
        throw new Error("invalid maximum verbose level")
    let stream: fs.WriteStream | null = null
    if (argv.logFile !== "-")
        stream = fs.createWriteStream(argv.logFile, { flags: "a", encoding: "utf8" })
    const log = (level: number, msg: string) => {
        if (level <= argv.logLevel) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            let line = `[${timestamp}]: `
            if (argv.logFile === "-" && process.stdout.isTTY)
                line += `${levels[level].style("[" + levels[level].name + "]")}`
            else
                line += `[${levels[level].name}]`
            line += `: ${msg}\n`
            if (argv.logFile === "-")
                process.stdout.write(line)
            else if (stream !== null)
                stream.write(line)
        }
    }
    log(2, `starting ${my.name} ${my.version} (${my["x-date"]}) <${my.homepage}>`)

    /*  determine IP to name mapping  */
    const freedCams = new Map<string, string>()
    if (!(typeof argv.freedCam === "object" && argv.freedCam instanceof Array))
        argv.freedCam = [ argv.freedCam ]
    for (const arg of argv.freedCam) {
        const m = arg.match(/^(.+?):(.+)$/)
        if (m === null)
            throw new Error("invalid FreeD camera mapping")
        freedCams.set(m[1], m[2])
    }

    /*  establish FreeD receiver  */
    const freedServer = dgram.createSocket("udp4")
    freedServer.bind(argv.freedPort, argv.freedAddr)
    await new Promise((resolve, reject) => {
        freedServer.on("listening", () => { resolve(true) })
    })
    log(2, `started FreeD network service: udp://${argv.freedAddr}:${argv.freedPort}`)

    /*  receive FreeD messages  */
    type FreeDEntry = {
        hash: string
        state: FreeDState | null
    }
    const freedState = new Map<string, FreeDEntry>()
    const freedPeers = new Map<string, number>()
    const objHash = (obj: object | null) => ObjectHash.sha1(obj)
    for (const cam of freedCams.values())
        freedState.set(cam, { hash: objHash(null), state: null })
    freedServer.on("message", (packet: Buffer, remote: dgram.RemoteInfo) => {
        const cam = freedCams.get(remote.address)
        if (cam !== undefined) {
            const { pan, tilt, roll, x, y, z, zoom, focus } = FreeD.FreeD.parsePacket(packet)
            const state = { pan, tilt, roll, x, y, z, zoom, focus } satisfies FreeDState
            const hash = objHash(state)
            if (freedState.get(cam)!.hash !== hash) {
                freedState.set(cam, { hash, state })
                notifyCamState(cam, state)
            }
            freedPeers.set(cam, Date.now())
        }
    })
    setInterval(() => {
        const now = Date.now()
        freedPeers.forEach((date: number, cam: string) => {
            if (now > date + 600)
                freedPeers.delete(cam)
        })
        const freedPeersN = freedPeers.size
        if (stats.peers.camera !== freedPeersN) {
            stats.peers.camera = freedPeersN
            notifyStats()
        }
    }, 600)

    /*  establish database read/write locked access  */
    const lock = locks.createReadWriteLock()
    enum Transaction { READ, WRITE }
    const transaction = (type = Transaction.READ, timeout = 4000, transaction: () => any) => {
        return new Promise((resolve, reject) => {
            const cb = async (error: Error) => {
                if (error)
                    reject(new Error(`transaction locking failed: ${error}`))
                else
                    try {
                        const result = await transaction()
                        lock.unlock()
                        resolve(result)
                    }
                    catch (err) {
                        reject(err)
                    }
            }
            if (type === Transaction.READ)
                lock.timedReadLock(timeout, cb)
            else if (type === Transaction.WRITE)
                lock.timedWriteLock(timeout, cb)
            else
                reject(new Error("transaction call failed: invalid transaction type"))
        })
    }

    /*  establish network service  */
    const server = new Server({
        address: argv.httpAddr,
        port:    argv.httpPort
    })
    await server.register({ plugin: Inert })
    await server.register({
        plugin: HAPIHeader, options: {
            Server: `${my.name}/${my.version}`
        }
    })
    await server.register({ plugin: HAPITraffic })
    await server.register({ plugin: HAPIWebSocket })
    await server.register({ plugin: HAPIDucky })

    /*  hook into network service logging  */
    server.events.on("response", (request: HAPI.Request) => {
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
        log(2, `HAPI: request: ${msg}`)
    })
    server.events.on({ name: "request", channels: [ "error" ] },
        (request: HAPI.Request, event: HAPI.RequestEvent, tags: { [key: string]: true }) => {
        if (event.error instanceof Error)
            log(0, `HAPI: request-error: ${event.error.message}`)
        else
            log(0, `HAPI: request-error: ${event.error}`)
    })
    server.events.on("log", (event: HAPI.LogEvent, tags: { [key: string]: true }) => {
        if (tags.error) {
            const err = event.error
            if (err instanceof Error)
                log(2, `HAPI: log: ${err.message}`)
            else
                log(2, `HAPI: log: ${err}`)
        }
    })

    /*  statistics gathering  */
    const stats = {
        peers: {
            camera:  0,
            render:  0,
            control: 0
        }
    }

    /*  serve static client files  */
    server.route({
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
    server.route({
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

    /*  serve dedicated canvas files  */
    const canvasDir = argv.canvasDir
    const canvasURL = "/canvas"
    type ImageEntry = {
        id?:        string
        name:       string
        texture1:   string
        texture2?:  string
        fadeTrans?: number
        fadeWait?:  number
        exclusive?: boolean
    }
    const ImageSchema = `{
        id?:        string,
        name:       string,
        texture1:   string,
        texture2?:  string,
        fadeTrans?: number,
        fadeWait?:  number,
        exclusive?: boolean
    }`
    server.route({
        method: "GET",
        path: canvasURL,
        handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
            const result = { images: [] as Array<ImageEntry> }
            const images = [] as string[]
            let files = await glob("*.yaml", { cwd: canvasDir })
            for (const file of files) {
                const m = file.match(/^(.+).yaml$/)
                const id = m![1]
                const txt: string = await fs.promises.readFile(
                    path.join(canvasDir, file), { encoding: "utf8" })
                const entry = jsYAML.load(txt) as ImageEntry
                const errors = [] as Array<string>
                if (!ducky.validate(entry, ImageSchema, errors)) {
                    log(1, `invalid schema in canvas image file "${file}": ${errors.join(", ")}`)
                    continue
                }
                if (!entry.id)
                    entry.id = id
                images.push(entry.texture1)
                entry.texture1 = `${canvasURL}/${entry.texture1}`
                if (entry.texture2) {
                    images.push(entry.texture2)
                    entry.texture2 = `${canvasURL}/${entry.texture2}`
                }
                result.images.push(entry)
            }
            const id2name = (id: string) =>
                id.replaceAll(/(^|-)(\S)/g, (_, prefix, char) =>
                    (prefix ? " " : "") + char.toUpperCase())
            files = await glob("*.{png,jpg}", { cwd: canvasDir })
            for (const file of files) {
                if (images.includes(file))
                    continue
                let m: ReturnType<typeof file.match>
                if ((m = file.match(/^(.+)-1\.(png|jpg)$/)) !== null
                    && (await (fs.promises.stat(`${canvasDir}/${m[1]}-2.${m[2]}`).then(() => true).catch(() => false)))) {
                    result.images.push({
                        id:        m[1],
                        name:      id2name(m[1]),
                        texture1:  `${canvasURL}/${m[1]}-1.${m[2]}`,
                        texture2:  `${canvasURL}/${m[1]}-2.${m[2]}`,
                        fadeTrans: 20  * 1000,
                        fadeWait:  120 * 1000
                    })
                }
                else if ((m = file.match(/^(.+).(png|jpg)$/)) !== null
                   && file.match(/^(.+)-[12]\.(png|jpg)$/) === null) {
                    result.images.push({
                        id:       m[1],
                        name:     id2name(m[1]),
                        texture1: `${canvasURL}/${file}`
                    })
                }
            }
            result.images = result.images.sort((a, b) => a.name.localeCompare(b.name))
            return result
        }
    })
    server.route({
        method: "GET",
        path: `${canvasURL}/{param*}`,
        handler: {
            directory: {
                path: canvasDir,
                redirectToSlash: true,
                index: true
            }
        }
    })

    /*  provide state API  */
    const stateFile = path.join(argv.stateDir, "canvas-state.yaml")
    server.route({
        method: "GET",
        path: "/state",
        handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
            return transaction(Transaction.READ, 4000, async () => {
                const state = StateDefault
                if (await (fs.promises.stat(stateFile).then(() => true).catch(() => false))) {
                    const txt = await fs.promises.readFile(stateFile, { encoding: "utf8" })
                    const obj = jsYAML.load(txt) as StateType
                    if (ducky.validate(obj, StateSchema))
                        StateUtil.copy(state, obj)
                }
                return h.response(state).code(200)
            })
        }
    })
    server.route({
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
            return transaction(Transaction.WRITE, 4000, async () => {
                const state = req.payload as StateType
                const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                await fs.promises.writeFile(stateFile, txt, { encoding: "utf8" })
                notifySceneState(state)
                return h.response().code(204)
            })
        }
    })
    server.route({
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
            return transaction(Transaction.WRITE, 4000, async () => {
                const state = StateDefault
                if (await (fs.promises.stat(stateFile).then(() => true).catch(() => false))) {
                    const txt = await fs.promises.readFile(stateFile, { encoding: "utf8" })
                    const obj = jsYAML.load(txt) as StateType
                    if (ducky.validate(obj, StateSchema))
                        StateUtil.copy(state, obj)
                }
                const statePatch = req.payload as StateTypePartial
                StateUtil.copy(state, statePatch)
                const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                await fs.promises.writeFile(stateFile, txt, { encoding: "utf8" })
                notifySceneState(statePatch)
                return h.response().code(204)
            })
        }
    })

    /*  provide state presets API  */
    const presetsFile = path.join(argv.stateDir, "canvas-preset-%s.yaml")
    type PresetType = { [ slot: string ]: StateTypePartial }
    server.route({
        method: "GET",
        path: "/state/preset",
        handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
            return transaction(Transaction.READ, 4000, async () => {
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
                    presets.push(n)
                }
                return h.response(presets).code(200)
            })
        }
    })
    server.route({
        method: "GET",
        path: "/state/preset/{slot}/select",
        handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
            return transaction(Transaction.READ, 4000, async () => {
                const slot = req.params.slot
                const filename = util.format(presetsFile, slot)
                const state = {}
                if (await (fs.promises.stat(filename).then(() => true).catch(() => false))) {
                    const txt = await fs.promises.readFile(filename, { encoding: "utf8" })
                    const obj = jsYAML.load(txt) as StateType
                    if (ducky.validate(obj, StateSchemaPartial))
                        StateUtil.copy(state, obj)
                }
                notifySceneState(state)
                return h.response(state).code(200)
            })
        }
    })
    server.route({
        method: "GET",
        path: "/state/preset/{slot}",
        handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
            return transaction(Transaction.READ, 4000, async () => {
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
    server.route({
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
            return transaction(Transaction.WRITE, 4000, async () => {
                const slot = req.params.slot
                const filename = util.format(presetsFile, slot)
                const state = req.payload as StateTypePartial
                const txt = jsYAML.dump(state, { indent: 4, quotingType: "\"" })
                await fs.promises.writeFile(filename, txt, { encoding: "utf8" })
                return h.response().code(204)
            })
        }
    })
    server.route({
        method: "DELETE",
        path: "/state/preset/{slot}",
        handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
            return transaction(Transaction.WRITE, 4000, async () => {
                const slot = req.params.slot
                const filename = util.format(presetsFile, slot)
                if (await (fs.promises.stat(filename).then(() => true).catch(() => false)))
                    await fs.promises.unlink(filename)
                return h.response().code(204)
            })
        }
    })

    /*  serve WebSocket connections  */
    type wsPeerCtx = { id: string }
    type wsPeerInfo = {
        ctx: wsPeerCtx
        ws:  WebSocket
        req: http.IncomingMessage
        subscribed: Map<string, boolean>,
        peer: string
    }
    const wsPeers = new Map<string, wsPeerInfo>()
    const notifyCamState = (cam: string, state: FreeDState | null) => {
        const msg = JSON.stringify({ cmd: "PTZ", arg: { cam, state } })
        for (const info of wsPeers.values())
            if (info.subscribed.get(cam))
                info.ws.send(msg)
    }
    const notifySceneState = (state: StateTypePartial) => {
        const msg = JSON.stringify({ cmd: "STATE", arg: { state } })
        for (const info of wsPeers.values())
            info.ws.send(msg)
    }
    const notifyStats = () => {
        const msg = JSON.stringify({ cmd: "STATS", arg: { stats } })
        for (const info of wsPeers.values())
            info.ws.send(msg)
    }
    server.route({
        method: "POST",
        path:   "/ws/{peer}",
        options: {
            plugins: {
                websocket: {
                    only: true,
                    autoping: 30 * 1000,
                    connect (args: any) {
                        const ctx: wsPeerCtx            = args.ctx
                        const ws:  WebSocket            = args.ws
                        const req: http.IncomingMessage = args.req
                        const m = req.url!.match(/^\/ws\/(control|render)$/)
                        const peer = m !== null ? m[1] : "unknown"
                        const id = `${req.socket.remoteAddress}:${req.socket.remotePort}`
                        ctx.id = id
                        wsPeers.set(id, { ctx, ws, req, subscribed: new Map<string, boolean>(), peer })
                        if (peer === "control")
                            stats.peers.control++
                        else if (peer === "render")
                            stats.peers.render++
                        notifyStats()
                    },
                    disconnect (args: any) {
                        const ctx: wsPeerCtx = args.ctx
                        const id = ctx.id
                        const peer = wsPeers.get(id)!.peer
                        if (peer === "control")
                            stats.peers.control--
                        else if (peer === "render")
                            stats.peers.render--
                        wsPeers.delete(id)
                        notifyStats()
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
                const state = freedState.get(arg)
                if (state === undefined)
                    return Boom.badRequest("unknown camera")
                if (cmd === "SUBSCRIBE") {
                    wsPeers.get(ctx.id)!.subscribed.set(arg, true)
                    notifyCamState(arg, state.state)
                }
                else
                    wsPeers.get(ctx.id)!.subscribed.delete(arg)
            }
            else
                return Boom.badRequest("unknown command")
            return h.response().code(204)
        }
    })

    /*  start service  */
    await server.start()
    log(2, `started HTTP  network service: http://${argv.httpAddr}:${argv.httpPort}`)
})().catch((err) => {
    console.log(`ERROR: ${err}`, err.stack)
    process.exit(1)
})

