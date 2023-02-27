/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path           from "node:path"
import fs             from "node:fs"
import glob           from "glob-promise"
import jsYAML         from "js-yaml"
import ducky          from "ducky"
import * as HAPI      from "@hapi/hapi"

import Argv           from "./app-argv"
import Log            from "./app-log"
import REST           from "./app-rest"

export default class RESTCanvas {
    constructor (
        private argv: Argv,
        private log:  Log,
        private rest: REST
    ) {}
    async init () {
        /*  serve dedicated canvas files  */
        const canvasDir = this.argv.canvasDir
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
        this.rest.server!.route({
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
                        this.log.log(1, `invalid schema in canvas image file "${file}": ${errors.join(", ")}`)
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
        this.rest.server!.route({
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
    }
}
