/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import State                  from "./app-render-state"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class AppRenderStream {
    private videoStream:      MediaStream | null = null
    private videoStreamDevice                    = ""
    private videoStreamWidth                     = 0
    private videoStreamHeight                    = 0
    private videoStreamFPS                       = 0

    constructor (
        private state: State,
        private log:   (level: string, msg: string) => void
    ) {}

    /*  load video stream  */
    async loadVideoStream () {
        /*  initialize  */
        this.videoStream  = null
        this.state.videoTexture = null

        /*  ensure video devices can be enumerated by requesting a
            dummy media stream so permissions are granted once  */
        this.log("INFO", "requesting video device access")
        const stream0 = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        }).catch(() => null)
        if (stream0 !== null)
            stream0.getTracks().forEach((track) => track.stop())

        /*  enumerate devices  */
        this.log("INFO", "enumerating video devices")
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])

        /*  determine particular device  */
        const label = this.videoStreamDevice
        if (label === "") {
            this.log("WARNING", "no video stream configured (using replacement content later)")
            return
        }
        const device = devices.find((device) =>
            device.kind === "videoinput"
            && device.label.substring(0, label.length) === label
        )
        if (device === undefined) {
            this.log("WARNING", `failed to determine video stream (device: "${label}"): no such device (using replacement content later)`)
            return
        }

        /*  load target composite media stream  */
        this.log("INFO", `loading video stream (device: "${label}")`)
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: device.deviceId,
                aspectRatio: 16 / 9,
                width:     { min: this.videoStreamWidth,  ideal: this.videoStreamWidth,  max: this.videoStreamWidth  },
                height:    { min: this.videoStreamHeight, ideal: this.videoStreamHeight, max: this.videoStreamHeight },
                frameRate: { min: this.videoStreamFPS,    ideal: this.videoStreamFPS,    max: this.videoStreamFPS }
            }
        }).catch((error: Error) => {
            this.log("ERROR", `failed to load video (device: "${label}"): ${error})`)
            throw new Error(`failed to load video stream (device: "${label}"): ${error})`)
        })

        /*  create texture from media stream  */
        const texture = await BABYLON.VideoTexture.CreateFromStreamAsync(this.state.scene!, stream, {} as any, true)
        await new Promise((resolve) => {
            BABYLON.Texture.WhenAllReady([ texture ], () => { resolve(true) })
        })
        stream.getVideoTracks().forEach((t) => {
            const c = t.getCapabilities()
            this.log("INFO", `loaded video stream (track size: ${c.width?.max ?? 0}x${c.height?.max ?? 0})`)
            const device = devices.find((device) => device.deviceId === c.deviceId)
            if (device)
                this.log("INFO", `loaded video stream (device: "${device.label}")`)
        })
        const ts = texture.getSize()
        this.log("INFO", `loaded video stream (texture size: ${ts.width}x${ts.height})`)

        /*  provide results  */
        this.videoStream = stream
        this.state.videoTexture = texture
    }

    /*  unload video stream  */
    async unloadVideoStream () {
        this.log("INFO", "unloading video stream")
        if (this.state.videoTexture !== null) {
            this.state.videoTexture.dispose()
            this.state.videoTexture = null
        }
        if (this.videoStream !== null) {
            this.videoStream.getTracks().forEach((track) => track.stop())
            this.videoStream = null
        }
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        if (state.streams !== undefined) {
            let changed = false
            if (state.streams.device !== undefined
                && this.videoStreamDevice !== state.streams.device) {
                this.videoStreamDevice = state.streams.device
                changed = true
            }
            if (state.streams.width !== undefined
                && this.videoStreamWidth !== state.streams.width) {
                this.videoStreamWidth = state.streams.width
                changed = true
            }
            if (state.streams.height !== undefined
                && this.videoStreamHeight !== state.streams.height) {
                this.videoStreamHeight = state.streams.height
                changed = true
            }
            if (state.streams.fps !== undefined
                && this.videoStreamFPS !== state.streams.fps) {
                this.videoStreamFPS = state.streams.fps
                changed = true
            }
            if (changed) {
                await this.unloadVideoStream()
                await this.loadVideoStream()
            }
        }
    }
}

