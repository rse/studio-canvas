/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"
import                             "@babylonjs/loaders/glTF"

/*  import internal dependencies (client-side)  */
import Config                 from "./app-render-config"
import State                  from "./app-render-state"

/*  import internal dependencies (shared)  */
import { MixerState }          from "../common/app-mixer"
import { StateTypePartial }   from "../common/app-state"

export default class AppRenderScene {
    private renderCount = 0

    constructor (
        private state:   State,
        private log:     (level: string, msg: string) => void,
        private fps:     (fps: number) => void
    ) {}

    /*  establish feature  */
    async establish (canvas: HTMLCanvasElement) {
        /*  establish rendering engine on canvas element  */
        this.state.engine = new BABYLON.Engine(canvas, true, {
            useExactSrgbConversions: true,
            doNotHandleContextLost:  true
        })
        if (this.state.engine === null)
            throw new Error("cannot establish Babylon engine")
        window.addEventListener("resize", () => {
            this.state.engine!.resize()
        })

        /*  load the Blender glTF scene export  */
        this.log("INFO", "loading Studio Canvas scene")
        BABYLON.SceneLoader.ShowLoadingScreen = false
        this.state.scene = await BABYLON.SceneLoader.LoadAsync("/res/", "canvas-scene.glb", this.state.engine)
        if (this.state.scene === null)
            throw new Error("failed to create scene")
        await new Promise((resolve, reject) => {
            this.state.scene!.executeWhenReady(() => {
                resolve(true)
            })
        })

        /*  create studio environment for correct texture image colors  */
        if (this.state.layer === "back") {
            this.log("INFO", "loading opaque environment")
            this.state.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                skyboxColor: new BABYLON.Color3(0.5, 0.5, 0.5)
            })
        }
        else if (this.state.layer === "front") {
            this.log("INFO", "creating transparent environment")
            this.state.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                createGround: false,
                createSkybox: false
            })
            this.state.scene.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 0)
        }

        /*  manually optimize engine  */
        this.state.engine.enableOfflineSupport = false

        /*  manually optimize scene  */
        this.state.scene.skipPointerMovePicking = true
        this.state.scene.autoClear = false
        this.state.scene.autoClearDepthAndStencil = false

        /*  automatically optimize scene  */
        const options = new BABYLON.SceneOptimizerOptions(this.state.fps, 2000)
        options.addOptimization(new BABYLON.HardwareScalingOptimization(0, 1))
        this.state.optimizer = new BABYLON.SceneOptimizer(this.state.scene, options)
    }

    async establishEnd () {
        /*  determine all layer-specific nodes which should be disabled  */
        for (const node of this.state.scene!.getNodes()) {
            if (Config.layerNodes[node.name] !== undefined) {
                if (  (this.state.layer === "back"  && !Config.layerNodes[node.name].back)
                   || (this.state.layer === "front" && !Config.layerNodes[node.name].front)) {
                    node.setEnabled(false)
                    node.dispose()
                }
            }
        }

        /*  manually optimize scene  */
        this.state.scene!.cleanCachedTextureBuffer()
    }

    /*  render the scene once  */
    private renderOnce = () => {
        if (this.state.fps === 0)
            return
        if ((this.renderCount++ % Config.fpsFactor[this.state.fps]) !== 0)
            return
        if (this.state.scene === null)
            return
        this.state.scene.render()
    }

    /*  start/stop renderer  */
    async start () {
        /*  start render loop and scene optimizer  */
        if (this.state.engine !== null)
            this.state.engine.runRenderLoop(this.renderOnce)
        if (this.state.optimizer !== null)
            this.state.optimizer.start()
    }
    async stop () {
        /*  stop scene optimizer and render loop  */
        if (this.state.optimizer !== null)
            this.state.optimizer.stop()
        if (this.state.engine !== null)
            this.state.engine.stopRenderLoop(this.renderOnce)

        /*  give still active render loop iteration time to complete  */
        await new Promise((resolve, reject) => {
            setTimeout(() => resolve(true), 2 * (1000 / (this.state.fps === 0 ? 1 : this.state.fps)))
        })
    }

    /*  (re-)configure FPS  */
    configureFPS (fps: number) {
        if (this.state.fps !== fps) {
            this.log("INFO", `switching from ${this.state.fps} to ${fps} frames-per-second (FPS)`)
            this.state.fps = fps
            if (this.state.optimizer !== null)
                this.state.optimizer.targetFrameRate = fps
            this.fps(fps)
        }
    }

    /*  react on a received mixer record by reflecting the camera mixer state  */
    reflectMixerState (mixer: MixerState) {
        let fps = this.state.fpsOther
        if (mixer.preview !== undefined) {
            this.state.mixerPreview = mixer.preview
            if (this.state.mixerPreview === this.state.cameraName)
                fps = this.state.fpsPreview
        }
        if (mixer.program !== undefined) {
            this.state.mixerProgram = mixer.program
            if (this.state.mixerProgram === this.state.cameraName)
                fps = this.state.fpsProgram
        }
        this.configureFPS(fps)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  control renderer  */
        if (state.renderer !== undefined) {
            let fps = this.state.fps
            if (state.renderer.other !== undefined) {
                this.state.fpsOther = state.renderer.other
                if (!(this.state.mixerPreview === this.state.cameraName || this.state.mixerProgram === this.state.cameraName))
                    fps = this.state.fpsOther
            }
            if (state.renderer.preview !== undefined) {
                this.state.fpsPreview = state.renderer.preview
                if (this.state.mixerPreview === this.state.cameraName)
                    fps = this.state.fpsPreview
            }
            if (state.renderer.program !== undefined) {
                this.state.fpsProgram = state.renderer.program
                if (this.state.mixerProgram === this.state.cameraName)
                    fps = this.state.fpsProgram
            }
            this.configureFPS(fps)
        }
    }
}

