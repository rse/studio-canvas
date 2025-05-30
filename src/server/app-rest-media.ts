/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import glob           from "glob-promise"
import * as HAPI      from "@hapi/hapi"

import Argv           from "./app-argv"
import Log            from "./app-log"
import REST           from "./app-rest"
import RESTWS         from "./app-rest-ws"
import { MediaEntry } from "../common/app-media"

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
                const files = await glob("**/*.{png,jpg,gif,smp4,swebm,mp4,webm}", { cwd: mediaDir })
                for (const file of files) {
                    if (media.includes(file))
                        continue
                    let m: ReturnType<typeof file.match>
                    if ((m = file.match(/^(.+)\.(png|jpg|gif|smp4|mp4|swebm|webm)$/)) !== null) {
                        let type = ""
                        if      (m[2] === "png")   type = "Image/PNG"
                        else if (m[2] === "jpg")   type = "Image/JPEG"
                        else if (m[2] === "gif")   type = "Image/GIF"
                        else if (m[2] === "mp4")   type = "Video/MP4"
                        else if (m[2] === "smp4")  type = "Video/sMP4"
                        else if (m[2] === "webm")  type = "Video/WebM"
                        else if (m[2] === "swebm") type = "Video/sWebM"
                        const loop  = (m[1].match(/-loop$/) !== null)
                        const stack = (m[2] === "smp4" || m[2] === "swebm")
                        result.media.push({
                            id:        m[1],
                            name:      id2name(m[1].replace(/^.+?\//, "")),
                            group:     m[1].replace(/^[^/]+$/, "").replace(/^(.+)\/.+$/, "$1"),
                            texture:   `${mediaURL}/${m[1]}.${m[2]}`,
                            type,
                            loop,
                            stack
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
