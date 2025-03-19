/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }              from "./app-render-api"

/*  import internal dependencies (shared)  */
import { type StateTypePartial } from "../common/app-state"

/*  exported rendering feature  */
export default class Stream {
    /*  internal state  */
    private videoTexture:     BABYLON.Nullable<BABYLON.Texture> = null
    private videoStream:      MediaStream | null = null
    private videoStreamDevice = ""
    private videoStreamWidth  = 0
    private videoStreamHeight = 0
    private videoStreamFPS    = 0

    /*  create feature  */
    constructor (private api: API) {}

    /*  load video stream  */
    async loadVideoStream () {
        /*  initialize  */
        this.videoStream  = null
        this.videoTexture = null

        /*  ensure video devices can be enumerated by requesting a
            dummy media stream so permissions are granted once  */
        this.api.renderer.log("INFO", "requesting video device access")
        const stream0 = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        }).catch(() => null)
        if (stream0 !== null)
            stream0.getTracks().forEach((track) => track.stop())

        /*  enumerate devices  */
        this.api.renderer.log("INFO", "enumerating video devices")
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])

        /*  determine particular device  */
        const label = this.videoStreamDevice
        if (label === "") {
            this.api.renderer.log("WARNING", "no video stream configured (using replacement content later)")
            return
        }
        const device = devices.find((device) =>
            device.kind === "videoinput"
            && device.label.substring(0, label.length) === label
        )
        if (device === undefined) {
            this.api.renderer.log("WARNING", `failed to determine video stream (device: "${label}"): no such device (using replacement content later)`)
            return
        }

        /*  load target composite media stream  */
        this.api.renderer.log("INFO", `loading video stream (device: "${label}")`)
        const width  = this.videoStreamWidth
        const height = this.videoStreamHeight
        const fps    = this.videoStreamFPS
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: device.deviceId,
                aspectRatio: 16 / 9,
                width:     { min: width,  ideal: width,  max: width  },
                height:    { min: height, ideal: height, max: height },
                frameRate: { min: fps,    ideal: fps,    max: fps    }
            }
        }).catch((error: Error) => {
            this.api.renderer.log("ERROR", `failed to load video (device: "${label}"): ${error})`)
            throw new Error(`failed to load video stream (device: "${label}"): ${error})`)
        })

        /*  create texture from media stream  */
        const texture = await BABYLON.VideoTexture.CreateFromStreamAsync(this.api.scene.getScene(), stream, {} as any, true)
        await new Promise((resolve) => {
            BABYLON.Texture.WhenAllReady([ texture ], () => { resolve(true) })
        })
        stream.getVideoTracks().forEach((t) => {
            const c = t.getCapabilities()
            this.api.renderer.log("INFO", `loaded video stream (track size: ${c.width?.max ?? 0}x${c.height?.max ?? 0})`)
            const device = devices.find((device) => device.deviceId === c.deviceId)
            if (device)
                this.api.renderer.log("INFO", `loaded video stream (device: "${device.label}")`)
        })
        const ts = texture.getSize()
        this.api.renderer.log("INFO", `loaded video stream (texture size: ${ts.width}x${ts.height})`)

        /*  provide results  */
        this.videoStream = stream
        this.videoTexture = texture
    }

    /*  unload video stream  */
    async unloadVideoStream () {
        this.api.renderer.log("INFO", "unloading video stream")
        if (this.videoTexture !== null) {
            this.videoTexture.dispose()
            this.videoTexture = null
        }
        if (this.videoStream !== null) {
            this.videoStream.getTracks().forEach((track) => track.stop())
            this.videoStream = null
        }
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial["streams"]) {
        if (state !== undefined) {
            let changed = false
            if (state.device !== undefined
                && this.videoStreamDevice !== state.device) {
                this.videoStreamDevice = state.device
                changed = true
            }
            if (state.width !== undefined
                && this.videoStreamWidth !== state.width) {
                this.videoStreamWidth = state.width
                changed = true
            }
            if (state.height !== undefined
                && this.videoStreamHeight !== state.height) {
                this.videoStreamHeight = state.height
                changed = true
            }
            if (state.fps !== undefined
                && this.videoStreamFPS !== state.fps) {
                this.videoStreamFPS = state.fps
                changed = true
            }
            if (changed) {
                await this.unloadVideoStream()
                await this.loadVideoStream()
            }
        }
    }

    /*  retrieve current video texture  */
    getVideoTexture () {
        return this.videoTexture
    }
}

