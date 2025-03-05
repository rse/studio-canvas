/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import EventEmitter                from "eventemitter2"

/*  import internal dependencies (client-side)  */
import { type API }                from "./app-render-api"

/*  import internal dependencies (client-side)  */
import Texture                     from "./app-render-texture"
import Stream                      from "./app-render-stream"
import Display                     from "./app-render-display"
import Scene                       from "./app-render-scene"
import Viewpoint                   from "./app-render-viewpoint"
import Canvas                      from "./app-render-canvas"
import Decal                       from "./app-render-decal"
import Monitor                     from "./app-render-monitor"
import Pane                        from "./app-render-pane"
import Plate                       from "./app-render-plate"
import Pillar                      from "./app-render-pillar"
import Hologram                    from "./app-render-hologram"
import Mask                        from "./app-render-mask"
import Avatars                     from "./app-render-avatars"
import Reference                   from "./app-render-reference"
import Lights                      from "./app-render-lights"

/*  import internal dependencies (shared)  */
import { FreeDState }              from "../common/app-freed"
import { MixerState }              from "../common/app-mixer"
import { ViewpointState }          from "../common/app-viewpoint"
import { StateTypePartial }        from "../common/app-state"

/*  exported rendering class  */
export default class Renderer extends EventEmitter {
    /*  shared API  */
    private api: API

    /*  internal state  */
    private established = false

    /*  (re-)configure camera (by name) and options (by URL)  */
    constructor (params: { layer: string, cameraName: string, ptzFreeD: boolean, ptzKeys: boolean }) {
        /*  initialize EventEmitter  */
        super()

        /*  initialize shared API  */
        this.api = {} as API

        /*  provide utility functions for passing-through information  */
        this.api.renderer = {
            log: (level: string, msg: string) => { this.emit("log", level, msg) },
            fps: (fps: number) => { this.emit("fps", fps) }
        }

        /*  instantiate rendering scene  */
        this.api.scene     = new Scene(    this.api, params.layer)

        /*  instantiate rendering camera  */
        this.api.viewpoint = new Viewpoint(this.api, params.cameraName, params.ptzFreeD, params.ptzKeys)

        /*  instantiate rendering utilities  */
        this.api.texture   = new Texture(  this.api)
        this.api.stream    = new Stream(   this.api)
        this.api.display   = new Display(  this.api)

        /*  instantiate rendering features  */
        this.api.canvas    = new Canvas(   this.api)
        this.api.decal     = new Decal(    this.api)
        this.api.monitor   = new Monitor(  this.api)
        this.api.pane      = new Pane(     this.api)
        this.api.plate     = new Plate(    this.api)
        this.api.pillar    = new Pillar(   this.api)
        this.api.hologram  = new Hologram( this.api)
        this.api.mask      = new Mask(     this.api)
        this.api.avatars   = new Avatars(  this.api)
        this.api.reference = new Reference(this.api)
        this.api.lights    = new Lights(   this.api)
    }

    /*  initially establish rendering engine and scene  */
    async establish (canvas: HTMLCanvasElement) {
        /*  pass-through operation to rendering scene (begin)  */
        await this.api.scene.establish(canvas)

        /*  pass-through operation to rendering camera  */
        await this.api.viewpoint.establish()

        /*  pass-through operation to rendering features  */
        await this.api.canvas.establish()
        await this.api.decal.establish()
        await this.api.monitor.establish()
        await this.api.pane.establish()
        await this.api.plate.establish()
        await this.api.pillar.establish()
        await this.api.hologram.establish()
        await this.api.mask.establish()
        await this.api.avatars.establish()
        await this.api.reference.establish()
        await this.api.lights.establish()

        /*  pass-through operation to rendering scene (end)  */
        await this.api.scene.establishEnd()

        /*  indicate established state  */
        this.established = true
    }

    /*  start rendering  */
    async start () {
        /*  pass-through operation to rendering scene  */
        await this.api.scene.start()
    }

    /*  stop rendering  */
    async stop () {
        /*  pass-through operation to rendering scene  */
        await this.api.scene.stop()
    }

    /*  sync renderer  */
    async reflectSyncTime (timestamp: number) {
        /*  pass-through operation to rendering canvas  */
        await this.api.canvas.canvasFaderStop()
        await this.api.canvas.canvasFaderStart()
    }

    /*  control rendering scene  */
    async reflectSceneState (state: StateTypePartial) {
        /*  ensure we update only if we are already established  */
        if (!this.established)
            return

        /*  pass-through operation to rendering scene  */
        await this.api.scene.reflectSceneState(state.renderer)

        /*  pass-through operation to rendering viewpoint  */
        await this.api.viewpoint.reflectSceneState(state)

        /*  pass-through operation to rendering utilities  */
        await this.api.stream.reflectSceneState(state.streams)
        await this.api.display.reflectSceneState(state.media)

        /*  pass-through operation to rendering features  */
        await this.api.canvas.reflectSceneState(state.canvas)
        await this.api.decal.reflectSceneState(state.decal)
        await this.api.monitor.reflectSceneState(state.monitor)
        await this.api.pane.reflectSceneState(state.pane)
        await this.api.plate.reflectSceneState(state.plate)
        await this.api.pillar.reflectSceneState(state.pillar)
        await this.api.hologram.reflectSceneState(state.hologram)
        await this.api.mask.reflectSceneState(state.mask)
        await this.api.avatars.reflectSceneState(state.avatars)
        await this.api.reference.reflectSceneState(state.references)
        await this.api.lights.reflectSceneState(state.lights)
    }

    /*  react on a received mixer record by reflecting the camera mixer state  */
    reflectMixerState (mixer: MixerState) {
        /*  ensure we update only if we are already established  */
        if (!this.established)
            return

        /*  pass-through operation to rendering scene  */
        this.api.scene.reflectMixerState(mixer)
    }

    /*  react on a received Viewpoint record by reflecting the camera state  */
    reflectViewpointState (viewpoint: ViewpointState) {
        /*  ensure we update only if we are already established  */
        if (!this.established)
            return

        /*  pass-through operation to rendering scene  */
        this.api.viewpoint.reflectViewpointState(viewpoint)
    }

    /*  react on a received FreeD state  */
    reflectFreeDState (state: FreeDState) {
        /*  ensure we update only if we are already established  */
        if (!this.established)
            return

        /*  pass-through operation to rendering camera  */
        this.api.viewpoint.reflectFreeDState(state)
    }
}

