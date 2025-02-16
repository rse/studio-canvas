/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import EventEmitter                from "eventemitter2"

/*  import internal dependencies (client-side)  */
import State                       from "./app-render-state"
import Texture                     from "./app-render-texture"
import Stream                      from "./app-render-stream"
import Material                    from "./app-render-material"
import Scene                       from "./app-render-scene"
import Canvas                      from "./app-render-canvas"
import Decal                       from "./app-render-decal"
import Monitor                     from "./app-render-monitor"
import Pane                        from "./app-render-pane"
import Plate                       from "./app-render-plate"
import Pillar                      from "./app-render-pillar"
import Hologram                    from "./app-render-hologram"
import Mask                        from "./app-render-mask"
import Camera                      from "./app-render-camera"
import Avatars                     from "./app-render-avatars"
import Reference                   from "./app-render-reference"
import Lights                      from "./app-render-lights"

/*  import internal dependencies (shared)  */
import { FreeDState }              from "../common/app-freed"
import { MixerState }              from "../common/app-mixer"
import { StateTypePartial }        from "../common/app-state"

export default class CanvasRenderer extends EventEmitter {
    /*  shared state  */
    private state

    /*  internal state  */
    private texture:    Texture
    private stream:     Stream
    private material:   Material
    private scene:      Scene
    private canvas:     Canvas
    private decal:      Decal
    private monitor:    Monitor
    private pane:       Pane
    private plate:      Plate
    private pillar:     Pillar
    private hologram:   Hologram
    private mask:       Mask
    private camera:     Camera
    private avatars:    Avatars
    private reference:  Reference
    private lights:     Lights

    /*  (re-)configure camera (by name) and options (by URL)  */
    constructor (params: { layer: string, cameraName: string, ptzFreeD: boolean, ptzKeys: boolean }) {
        super()
        this.state = new State()

        /*  remember parameters  */
        this.state.cameraName  = params.cameraName
        this.state.layer       = params.layer

        /*  helper functions for passing-through information  */
        const passThroughLog = (level: string, msg: string) => { this.emit("log", level, msg) }
        const passThroughFPS = (fps: number) => { this.emit("fps", fps) }

        /*  instantiate rendering utilities  */
        this.texture   = new Texture(  this.state, passThroughLog)
        this.stream    = new Stream(   this.state, passThroughLog)
        this.material  = new Material( this.state, passThroughLog)

        /*  instantiate rendering scene  */
        this.scene     = new Scene(    this.state, passThroughLog, passThroughFPS)

        /*  instantiate rendering camera  */
        this.camera    = new Camera(   this.state,                            passThroughLog)
        this.camera.configure(params.cameraName, params.ptzFreeD, params.ptzKeys)

        /*  instantiate rendering features  */
        this.canvas    = new Canvas(   this.state, this.texture,              passThroughLog)
        this.decal     = new Decal(    this.state, this.scene, this.material, passThroughLog)
        this.monitor   = new Monitor(  this.state, this.material,             passThroughLog)
        this.pane      = new Pane(     this.state, this.material,             passThroughLog)
        this.plate     = new Plate(    this.state, this.material,             passThroughLog)
        this.pillar    = new Pillar(   this.state, this.material,             passThroughLog)
        this.hologram  = new Hologram( this.state, this.material,             passThroughLog)
        this.mask      = new Mask(     this.state, this.material,             passThroughLog)
        this.avatars   = new Avatars(  this.state,                            passThroughLog)
        this.reference = new Reference(this.state,                            passThroughLog)
        this.lights    = new Lights(   this.state,                            passThroughLog)
    }

    /*  initially establish rendering engine and scene  */
    async establish (canvas: HTMLCanvasElement) {
        /*  pass-through operation to rendering scene (begin)  */
        await this.scene.establish(canvas)

        /*  pass-through operation to rendering features  */
        await this.canvas.establish()
        await this.decal.establish()
        await this.monitor.establish()
        await this.pane.establish()
        await this.plate.establish()
        await this.pillar.establish()
        await this.hologram.establish()
        await this.mask.establish()
        await this.camera.establish()
        await this.avatars.establish()
        await this.reference.establish()
        await this.lights.establish()

        /*  pass-through operation to rendering scene (end)  */
        await this.scene.establishEnd()

        /*  indicate established state  */
        this.state.established = true
    }

    /*  start rendering  */
    async start () {
        await this.scene.start()
    }

    /*  stop rendering  */
    async stop () {
        await this.scene.stop()
    }

    /*  sync renderer  */
    async reflectSyncTime (timestamp: number) {
        this.state.syncTime = timestamp
        await this.canvas.canvasFaderStop()
        await this.canvas.canvasFaderStart()
    }

    /*  control rendering scene  */
    async reflectSceneState (state: StateTypePartial) {
        /*  ensure we update only if we are already established  */
        if (!this.state.established)
            return

        /*  pass-through operation to rendering scene  */
        await this.scene.reflectSceneState(state)

        /*  pass-through operation to rendering utilities  */
        await this.stream.reflectSceneState(state)
        await this.material.reflectSceneState(state)

        /*  pass-through operation to rendering features  */
        await this.canvas.reflectSceneState(state)
        await this.decal.reflectSceneState(state)
        await this.monitor.reflectSceneState(state)
        await this.pane.reflectSceneState(state)
        await this.plate.reflectSceneState(state)
        await this.pillar.reflectSceneState(state)
        await this.hologram.reflectSceneState(state)
        await this.mask.reflectSceneState(state)
        await this.lights.reflectSceneState(state)
        await this.avatars.reflectSceneState(state)
        await this.reference.reflectSceneState(state)
        await this.camera.reflectSceneState(state)
    }

    /*  react on a received mixer record by reflecting the camera mixer state  */
    reflectMixerState (mixer: MixerState) {
        /*  pass-through operation to rendering scene  */
        this.scene.reflectMixerState(mixer)
    }

    reflectFreeDState (state: FreeDState) {
        /*  pass-through operation to rendering camera  */
        this.camera.reflectFreeDState(state)
    }
}

