/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
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
import RESTWS         from "./app-rest-ws"
import { MediaEntry, MediaSchema } from "../common/app-media"

export default class RESTMedia {
    constructor (
        private argv:   Argv,
        private log:    Log,
        private rest:   REST,
        private restWS: RESTWS
    ) {}
    async init () {
        const mediaDir = this.argv.mediaDir
        const mediaURL = "/media"

        /*  serve canvas index  */
        this.rest.server!.route({
            method: "GET",
            path: mediaURL,
            handler: async (req: HAPI.Request, h: HAPI.ResponseToolkit) => {
                /*  the result record  */
                const result = { media: [] as Array<MediaEntry> }

                /*  internal image path cache  */
                const media = [] as string[]

                /*  find all media files  */
                const id2name = (id: string) =>
                    id.replaceAll(/(^|-)(\S)/g, (_, prefix, char) =>
                        (prefix ? " " : "") + char.toUpperCase())
                const files = await glob("**/*.{png,jpg,gif,mp4,webm}", { cwd: mediaDir })
                for (const file of files) {
                    if (media.includes(file))
                        continue
                    let m: ReturnType<typeof file.match>
                    if ((m = file.match(/^(.+)\.(png|jpg|gif|mp4|webm)$/)) !== null) {
                        result.media.push({
                            id:        m[1],
                            name:      id2name(m[1].replace(/^.+?\//, "")),
                            group:     m[1].replace(/^[^/]+$/, "").replace(/^(.+)\/.+$/, "$1"),
                            texture:   `${mediaURL}/${m[1]}.${m[2]}`
                        })
                    }
                }

                /*  sort media files by name  */
                result.media = result.media.sort((a, b) => a.name.localeCompare(b.name))
                return result
            }
        })

        /*  serve dedicated media files  */
        this.rest.server!.route({
            method: "GET",
            path: `${mediaURL}/{param*}`,
            handler: {
                directory: {
                    path: mediaDir,
                    redirectToSlash: true,
                    index: true
                }
            }
        })
    }
}
