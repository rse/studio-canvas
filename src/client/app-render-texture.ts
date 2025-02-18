/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }           from "./app-render-api"
import State                  from "./app-render-state"

export default class Texture {
    private imageLoader: Worker

    constructor (
        private api:   API,
        private state: State,
        private log:   (level: string, msg: string) => void
    ) {
        /*  worker for off-loading image loading and decoding  */
        this.imageLoader = new Worker(new URL("./app-render-texture-worker.js", import.meta.url))
    }

    async createTexture (url: string, canvas: HTMLCanvasElement) {
        /*  fetch image from URL and decode PNG/JPEG format  */
        const imageBitmap = await (new Promise((resolve, reject) => {
            this.imageLoader.addEventListener("message",
                (event: MessageEvent<{ data: ImageBitmap } | { error: string }>) => {
                    const data = event.data
                    if ("error" in data)
                        reject(new Error(`Error from "ImageLoader" worker: ${data.error}`))
                    else
                        resolve(data.data)
                }, { once: true }
            )
            this.imageLoader.postMessage({ url })
        }) as Promise<ImageBitmap>)

        /*  give UI thread a chance to continue rendering  */
        await new Promise((resolve) => setTimeout(resolve, 10))

        /*  draw bitmap into canvas
            (NOTICE: this is a 40ms CPU burst)  */
        const ctx = canvas.getContext("2d")!
        canvas.width  = imageBitmap.width
        canvas.height = imageBitmap.height
        ctx.drawImage(imageBitmap, 0, 0)

        /*  give UI thread a chance to continue rendering  */
        await new Promise((resolve) => setTimeout(resolve, 10))

        /*  create dynamic texture from canvas
            (NOTICE: this is a 10ms CPU burst)  */
        const texture = new BABYLON.DynamicTexture("canvas", canvas, {
            scene:        this.state.scene,
            format:       BABYLON.Engine.TEXTUREFORMAT_RGBA,
            samplingMode: BABYLON.Texture.LINEAR_LINEAR,
            invertY:      false
        })
        texture.update(false, false, true)

        /*  give UI thread a chance to continue rendering  */
        await new Promise((resolve) => setTimeout(resolve, 10))

        /*  cleanup  */
        canvas.width  = 1
        canvas.height = 1
        ctx.clearRect(0, 0, 1, 1)
        return texture!
    }
}
