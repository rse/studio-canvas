/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"
import                                "@babylonjs/loaders/glTF"

/*  import internal dependencies (client-side)  */
import Config                    from "./app-render-config"
import { type API }              from "./app-render-api"

/*  import internal dependencies (shared)  */
import { type MixerState }       from "../common/app-mixer"
import { type StateTypePartial } from "../common/app-state"

/*  exported rendering feature  */
export default class Scene {
    /*  internal state  */
    private engine:      BABYLON.Nullable<BABYLON.Engine>         = null
    private scene:       BABYLON.Nullable<BABYLON.Scene>          = null
    private optimizer:   BABYLON.Nullable<BABYLON.SceneOptimizer> = null
    private renderCount  = 0
    private fps          = 30
    private fpsProgram   = 30
    private fpsPreview   = 30
    private fpsOther     = 30
    private mixerProgram = ""
    private mixerPreview = ""

    /*  create feature  */
    constructor (private api: API, private layer: string) {}

    /*  establish feature  */
    async establish (canvas: HTMLCanvasElement) {
        /*  establish rendering engine on canvas element  */
        this.engine = new BABYLON.Engine(canvas, true, {
            useExactSrgbConversions: true,
            doNotHandleContextLost:  true
        })
        if (this.engine === null)
            throw new Error("cannot establish Babylon engine")
        window.addEventListener("resize", () => {
            this.engine!.resize()
        })

        /*  load the Blender glTF scene export  */
        this.api.renderer.log("INFO", "loading Studio Canvas scene")
        BABYLON.SceneLoader.ShowLoadingScreen = false
        this.scene = await BABYLON.SceneLoader.LoadAsync("/res/", "canvas-scene.glb", this.engine)
        if (this.scene === null)
            throw new Error("failed to create scene")
        await new Promise((resolve, reject) => {
            this.scene!.executeWhenReady(() => {
                resolve(true)
            })
        })

        /*  create studio environment for correct texture image colors  */
        if (this.layer === "back") {
            this.api.renderer.log("INFO", "loading opaque environment")
            this.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                skyboxColor: new BABYLON.Color3(0.5, 0.5, 0.5)
            })
        }
        else if (this.layer === "front") {
            this.api.renderer.log("INFO", "creating transparent environment")
            this.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                createGround: false,
                createSkybox: false
            })
            this.scene.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 0)
        }

        /*  manually optimize engine  */
        this.engine.enableOfflineSupport = false

        /*  manually optimize scene  */
        this.scene.skipPointerMovePicking = true
        this.scene.autoClear = false
        this.scene.autoClearDepthAndStencil = false

        /*  automatically optimize scene  */
        const options = new BABYLON.SceneOptimizerOptions(this.fps, 2000)
        options.addOptimization(new BABYLON.HardwareScalingOptimization(0, 1))
        this.optimizer = new BABYLON.SceneOptimizer(this.scene, options)
    }

    async establishEnd () {
        /*  determine all layer-specific nodes which should be disabled  */
        for (const node of this.scene!.getNodes()) {
            if (Config.layerNodes[node.name] !== undefined) {
                if (  (this.layer === "back"  && !Config.layerNodes[node.name].back)
                   || (this.layer === "front" && !Config.layerNodes[node.name].front)) {
                    node.setEnabled(false)
                    node.dispose()
                }
            }
        }

        /*  manually optimize scene  */
        this.scene!.cleanCachedTextureBuffer()
    }

    /*  render the scene once  */
    private renderOnce = () => {
        if (this.fps === 0)
            return
        if ((this.renderCount++ % Config.fpsFactor[this.fps]) !== 0)
            return
        if (this.scene === null)
            return
        this.scene.render()
    }

    /*  start/stop renderer  */
    async start () {
        /*  start render loop and scene optimizer  */
        if (this.engine !== null)
            this.engine.runRenderLoop(this.renderOnce)
        if (this.optimizer !== null)
            this.optimizer.start()
    }
    async stop () {
        /*  stop scene optimizer and render loop  */
        if (this.optimizer !== null)
            this.optimizer.stop()
        if (this.engine !== null)
            this.engine.stopRenderLoop(this.renderOnce)

        /*  give still active render loop iteration time to complete  */
        await new Promise((resolve, reject) => {
            setTimeout(() => resolve(true), 2 * (1000 / (this.fps === 0 ? 1 : this.fps)))
        })
    }

    /*  (re-)configure FPS  */
    configureFPS (fps: number) {
        if (this.fps !== fps) {
            this.api.renderer.log("INFO", `switching from ${this.fps} to ${fps} frames-per-second (FPS)`)
            this.fps = fps
            if (this.optimizer !== null)
                this.optimizer.targetFrameRate = fps
            this.api.renderer.fps(fps)
        }
    }

    /*  react on a received mixer record by reflecting the camera mixer state  */
    reflectMixerState (mixer: MixerState) {
        let fps = this.fpsOther
        if (mixer.preview !== undefined) {
            this.mixerPreview = mixer.preview
            if (this.mixerPreview === this.api.viewpoint.currentCamera())
                fps = this.fpsPreview
        }
        if (mixer.program !== undefined) {
            this.mixerProgram = mixer.program
            if (this.mixerProgram === this.api.viewpoint.currentCamera())
                fps = this.fpsProgram
        }
        this.configureFPS(fps)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial["renderer"]) {
        /*  control renderer  */
        if (state !== undefined) {
            let fps = this.fps
            if (state.other !== undefined) {
                this.fpsOther = state.other
                if (!(this.mixerPreview === this.api.viewpoint.currentCamera()
                    || this.mixerProgram === this.api.viewpoint.currentCamera()))
                    fps = this.fpsOther
            }
            if (state.preview !== undefined) {
                this.fpsPreview = state.preview
                if (this.mixerPreview === this.api.viewpoint.currentCamera())
                    fps = this.fpsPreview
            }
            if (state.program !== undefined) {
                this.fpsProgram = state.program
                if (this.mixerProgram === this.api.viewpoint.currentCamera())
                    fps = this.fpsProgram
            }
            this.configureFPS(fps)
        }
    }

    /*  retrieve current FPS  */
    currentFPS () {
        return this.fps
    }

    /*  calculate millisconds per frame  */
    currentMillisecondsPerFrame () {
        return 1000 / (this.fps === 0 ? 1 : this.fps)
    }

    /*  determine whether we are rendering a particular layer  */
    renderingLayer (layer: string) {
        return this.layer === layer
    }

    /*  provide reference to scene  */
    getScene () {
        if (this.scene === null)
            throw new Error("scene still not established")
        return this.scene
    }
}

