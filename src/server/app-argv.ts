/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path  from "node:path"
import yargs from "yargs"
import Pkg   from "./app-pkg"

export default class Argv {
    public help       = false
    public version    = false
    public logLevel   = 0
    public logFile    = ""
    public canvasDir  = ""
    public mediaDir   = ""
    public stateDir   = ""
    public httpAddr   = ""
    public httpPort   = 0
    public freedAddr  = ""
    public freedPort  = 0
    public freedCam   = [] as string[]
    constructor (
        private pkg: Pkg
    ) {}
    async init () {
        /*  command-line option parsing  */
        // @ts-ignore
        const args = yargs()
            /* eslint @stylistic/indent: off */
            .usage(
                "Usage: $0 [-h] [-V] " +
                "[-v <log-level>] [-l|--log-file <log-file>] " +
                "[-c <canvas-dir>] " +
                "[-m <media-dir>] " +
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
            .string("m").nargs("m", 1).alias("m", "media-dir").default("m", path.join(__dirname, "../../res/media"))
                .describe("m", "directory of media image/video files")
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

        /*  shuffle results  */
        this.help       = args.help
        this.version    = args.version
        this.logLevel   = args.logLevel
        this.logFile    = args.logFile
        this.canvasDir  = args.canvasDir
        this.mediaDir   = args.mediaDir
        this.stateDir   = args.stateDir
        this.httpAddr   = args.httpAddr
        this.httpPort   = args.httpPort
        this.freedAddr  = args.freedAddr
        this.freedPort  = args.freedPort
        this.freedCam   = args.freedCam

        /*  short-circuit processing of "-V" command-line option  */
        if (this.version) {
            process.stderr.write(`${this.pkg.name} ${this.pkg.version} <${this.pkg.homepage}>\n`)
            process.stderr.write(`${this.pkg.description}\n`)
            process.stderr.write(`Copyright (c) 2023-2024 ${this.pkg.authorName} <${this.pkg.authorUrl}>\n`)
            process.stderr.write(`Licensed under ${this.pkg.license} <http://spdx.org/licenses/${this.pkg.license}.html>\n`)
            process.exit(0)
        }
    }
}

