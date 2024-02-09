/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import fs     from "node:fs"
import chalk  from "chalk"
import moment from "moment"

import Pkg    from "./app-pkg"
import Argv   from "./app-argv"

const levels = [
    { name: "ERROR",   style: chalk.red.bold },
    { name: "WARNING", style: chalk.yellow.bold },
    { name: "INFO",    style: chalk.blue },
    { name: "DEBUG",   style: chalk.green }
]

export default class Log {
    private stream: fs.WriteStream | null = null
    constructor (
        private pkg:  Pkg,
        private argv: Argv
    ) {}
    async init () {
        /*  log messages  */
        if (this.argv.logLevel >= levels.length)
            throw new Error("invalid maximum verbose level")
        if (this.argv.logFile !== "-")
            this.stream = fs.createWriteStream(this.argv.logFile, { flags: "a", encoding: "utf8" })
        this.log(2, `starting ${this.pkg.name} ${this.pkg.version} (${this.pkg.date}) <${this.pkg.homepage}>`)
    }
    log (level: number, msg: string) {
        if (level <= this.argv.logLevel) {
            const timestamp = moment().format("YYYY-MM-DD hh:mm:ss.SSS")
            let line = `[${timestamp}]: `
            if (this.argv.logFile === "-" && process.stdout.isTTY)
                line += `${levels[level].style("[" + levels[level].name + "]")}`
            else
                line += `[${levels[level].name}]`
            line += `: ${msg}\n`
            if (this.argv.logFile === "-")
                process.stdout.write(line)
            else if (this.stream !== null)
                this.stream.write(line)
        }
    }
}

