/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import Config                 from "./app-render-config"
import { type API }           from "./app-render-api"
import Utils                  from "./app-render-utils"
import ShaderImage            from "./app-render-canvas-image.fs?raw"
import ShaderTransition       from "./app-render-canvas-transition.fs?raw"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

/*  utility type for canvas configuration  */
type CanvasConfig = {
    texture1:  string,
    texture2:  string,
    fadeTrans: number,
    fadeWait:  number
}

/*  utility type for canvas state  */
type CanvasState = {
    canvas1:    HTMLCanvasElement | null
    canvas2:    HTMLCanvasElement | null
    texture1:   BABYLON.Nullable<BABYLON.Texture>
    texture2:   BABYLON.Nullable<BABYLON.Texture>
    texture:    BABYLON.Nullable<BABYLON.ProceduralTexture>
    fadeTimer:  ReturnType<typeof setTimeout> | null
}

/*  exported rendering feature  */
export default class Canvas {
    /*  internal state  */
    private canvasMode = 0
    private canvasConfig = [
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 },
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 }
    ] as CanvasConfig[]
    private canvasState = [
        { canvas1: null, canvas2: null, texture1: null, texture2: null, texture: null, fadeTimer: null },
        { canvas1: null, canvas2: null, texture1: null, texture2: null, texture: null, fadeTimer: null }
    ] as CanvasState[]
    private wall:        BABYLON.Nullable<BABYLON.Mesh>        = null
    private wallRotBase: BABYLON.Nullable<BABYLON.Quaternion>  = null
    private dummyTexture: BABYLON.Nullable<BABYLON.DynamicTexture> = null
    private transitionType = "fade"
    private transitionTypes = {
        "fade":    1,
        "slide-l": 2,
        "slide-r": 3
    } as { [ id: string ]: number }
    private transitionTexture: BABYLON.Nullable<BABYLON.ProceduralTexture> = null
    private transitionDuration = 2.0
    private transitionSlider = 0.0
    private transitionTimer: ReturnType<typeof setTimeout> | null = null

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  gather reference to wall  */
        this.wall = this.api.scene.getScene().getMeshByName("Wall") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (this.wall === null)
            throw new Error("cannot find wall node")

        /*  configure wall mesh  */
        this.wall.receiveShadows = true

        /*  remember wall mesh property  */
        this.wallRotBase = this.wall.rotationQuaternion

        /*  on-the-fly load wall canvas  */
        if (this.api.scene.renderingLayer("back"))
            await this.canvasLoad()
    }

    /*  make canvas dummy texture  */
    canvasTextureMakeDummy () {
        /*  determine size  */
        const width  = Config.wall.width
        const height = Config.wall.height

        /*  create canvas element  */
        const canvas = document.createElement("canvas")
        canvas.width  = width
        canvas.height = height

        /*  fill canvas with red color  */
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "red"
        ctx.fillRect(0, 0, width, height)

        /*  create texture from canvas content  */
        const texture = new BABYLON.DynamicTexture("canvas-dummy", canvas, {
            scene:        this.api.scene.getScene(),
            format:       BABYLON.Engine.TEXTUREFORMAT_RGBA,
            samplingMode: BABYLON.Texture.LINEAR_LINEAR,
            invertY:      false
        })
        texture.update(false, false, true)

        /*  reduce memory consumption of canvas again  */
        canvas.width  = 1
        canvas.height = 1
        ctx.clearRect(0, 0, 1, 1)

        return texture
    }

    /*  make image texture from shader  */
    canvasTextureMakeImage () {
        /*  create procedural texture from a fragment shader  */
        const width  = Config.wall.width
        const height = Config.wall.height
        const scene  = this.api.scene.getScene()
        const texture = new BABYLON.ProceduralTexture("image",
            { width, height }, { fragmentSource: ShaderImage },
            scene, null, false, false)

        /*  initialize uniforms (external variables)  */
        texture.setTexture("texture1", this.dummyTexture!)
        texture.setTexture("texture2", this.dummyTexture!)
        texture.setFloat("textureFade", 0.0)

        return texture
    }

    /*  make transition texture from fragment shader  */
    canvasTextureMakeTransition () {
        /*  create procedural texture from a fragment shader  */
        const width  = Config.wall.width
        const height = Config.wall.height
        const scene  = this.api.scene.getScene()
        const texture = new BABYLON.ProceduralTexture("transition",
            { width, height }, { fragmentSource: ShaderTransition },
            scene, null, false, false)

        /*  initialize uniforms (external variables)  */
        texture.setInt("type", 0)
        texture.setTexture("texture1", this.dummyTexture!)
        texture.setTexture("texture2", this.dummyTexture!)
        texture.setFloat("slider", 0.0)
        texture.setInt("reverse", 0)

        return texture
    }

    /*  load canvas/wall  */
    async canvasLoad () {
        /*  create replacement texture  */
        this.dummyTexture = this.canvasTextureMakeDummy()

        /*  create canvas textures  */
        this.canvasState[0].texture = this.canvasTextureMakeImage()
        this.canvasState[1].texture = this.canvasTextureMakeImage()

        /*  create transition textures  */
        this.transitionTexture = this.canvasTextureMakeTransition()

        /*  initialize canvas mode  */
        this.canvasMode = 0

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  configure the canvas switching transition  */
        this.transitionType = "fade"
        this.transitionSlider = 0.0
        this.transitionTexture!.setInt("type", this.transitionTypes[this.transitionType])
        this.transitionTexture!.setFloat("slider", this.transitionSlider)
        this.transitionTexture!.setTexture("texture1", this.canvasState[0].texture!)
        this.transitionTexture!.setTexture("texture2", this.canvasState[1].texture!)

        /*  apply transition texture onto wall  */
        const wall = this.api.scene.getScene().getMaterialByName("Wall") as
            BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = this.transitionTexture

        /*  start optional texture fader  */
        await this.canvasFaderStart()
    }

    /*  unload canvas/wall  */
    async canvasUnload () {
        /*  stop optional texture fader  */
        await this.canvasFaderStop()

        /*  dispose wall texture  */
        const wall = this.api.scene.getScene().getMaterialByName("Wall") as
            BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = null

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  dispose transition texture  */
        this.transitionTexture?.dispose()
        this.transitionTexture = null
    }

    /*  reconfigure canvas/wall texture(s)  */
    async canvasReconfigure () {
        /*  determine canvas config and state  */
        const canvasConfig = this.canvasConfig[this.canvasMode]
        const canvasState  = this.canvasState[this.canvasMode]

        /*  sanity check situation  */
        if (canvasConfig.texture1 === "")
            return
        this.api.renderer.log("INFO", "canvas reconfigure (begin)")

        /*  reset textures  */
        await this.canvasDisposeTextures(this.canvasMode)

        /*  load new texture(s)  */
        this.api.renderer.log("INFO", "canvas reconfigure (load textures)")
        const canvas = document.createElement("canvas")
        canvasState.canvas1 = canvas
        canvasState.texture1 =
            await this.api.texture.createTexture(canvasConfig.texture1, canvas)
        if (canvasConfig.texture2 !== "") {
            const canvas = document.createElement("canvas")
            canvasState.canvas2 = canvas
            canvasState.texture2 =
                await this.api.texture.createTexture(canvasConfig.texture2, canvas)
        }
        else {
            canvasState.canvas2  = null
            canvasState.texture2 = null
        }

        /*  await texture(s) to be loaded  */
        const p = [] as BABYLON.Texture[]
        if (canvasState.texture1 !== null)
            p.push(canvasState.texture1!)
        if (canvasState.texture2 !== null)
            p.push(canvasState.texture2!)
        await new Promise((resolve) => {
            BABYLON.Texture.WhenAllReady(p, () => { resolve(true) })
        })

        /*  apply new textures  */
        canvasState.texture!.setTexture("texture1",
            canvasState.texture1 !== null ? canvasState.texture1 : this.dummyTexture!)
        canvasState.texture!.setTexture("texture2",
            canvasState.texture2 !== null ? canvasState.texture2 : this.dummyTexture!)

        /*  apply texture fading duration  */
        canvasState.texture!.setFloat("fade", canvasConfig.fadeTrans)

        this.api.renderer.log("INFO", "canvas reconfigure (end)")
    }

    /*  dispose canvas textures  */
    async canvasDisposeTextures (modeNum: number) {
        /*  determine material and canvas state  */
        const canvasState = this.canvasState[modeNum]

        /*  dispose texture 1  */
        canvasState.texture!.setTexture("texture1", this.dummyTexture!)
        canvasState.texture1 = null
        canvasState.canvas1 = null

        /*  dispose texture 2  */
        canvasState.texture!.setTexture("texture2", this.dummyTexture!)
        canvasState.texture2 = null
        canvasState.canvas2 = null
    }

    /*  start canvas/wall fader  */
    async canvasFaderStart () {
        /*  determine canvas config and state  */
        const canvasConfig = this.canvasConfig[this.canvasMode]
        const canvasState  = this.canvasState[this.canvasMode]

        /*  activate optional cross-fading between textures  */
        canvasState.texture!.setFloat("fade", 0.0)

        /*  stop processing immediately if no fading is necessary  */
        if (canvasState.texture2 === null)
            return

        /*  enter processing loop  */
        let fade        = 0
        let fadeSign    = +1
        const fadeTrans = canvasConfig.fadeTrans
        const fadeWait  = canvasConfig.fadeWait
        const fader = () => {
            /*  reset timer (to not confuse stopping below)  */
            canvasState.fadeTimer = null

            /*  apply next fading step  */
            const fadeInterval = this.api.scene.currentMillisecondsPerFrame()
            const fadeStep = 1.0 / (fadeTrans / fadeInterval)
            fade = fade + (fadeSign * fadeStep)
            let wait = fadeInterval
            if      (fade > 1.0) { fade = 1.0; fadeSign = -1; wait = fadeWait }
            else if (fade < 0.0) { fade = 0.0; fadeSign = +1; wait = fadeWait }
            canvasState.texture!.setFloat("fade", fade)

            /*  wait for next iteration  */
            canvasState.fadeTimer = setTimeout(fader, wait)
        }
        if (canvasState.fadeTimer !== null)
            clearTimeout(canvasState.fadeTimer)
        canvasState.fadeTimer = setTimeout(fader, 0)
    }

    /*  stop canvas/wall fader  */
    async canvasFaderStop () {
        /*  determine canvas state  */
        const canvasState  = this.canvasState[this.canvasMode]

        /*  stop still pending timer  */
        if (canvasState.fadeTimer !== null) {
            clearTimeout(canvasState.fadeTimer)
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(true), 2 * (this.api.scene.currentMillisecondsPerFrame()))
            })
            canvasState.fadeTimer = null
        }
    }

    /*  transition canvas  */
    async canvasTransition () {
        await new Promise((resolve, reject) => {
            let slider = this.transitionSlider
            const sliderSign = slider === 0.0 ? +1 : -1
            if (sliderSign === +1)
                this.transitionTexture!.setInt("reverse", 0)
            else
                this.transitionTexture!.setInt("reverse", 1)
            const transitionDuration = this.transitionDuration * 1000
            const transitionInterval = this.api.scene.currentMillisecondsPerFrame()
            const transition = () => {
                /*  reset timer (to not confuse stopping below)  */
                this.transitionTimer = null

                /*  apply next fading step  */
                const sliderStep = 1.0 / (transitionDuration / transitionInterval)
                slider = slider + (sliderSign * sliderStep)
                let wait = transitionInterval
                if (slider > 1.0) {
                    slider = 1.0
                    wait = 0
                }
                if (slider < 0.0) {
                    slider = 0.0
                    wait = 0
                }
                this.transitionSlider = slider
                this.transitionTexture!.setFloat("slider", slider)

                /*  wait for next iteration or stop processing  */
                if (wait > 0)
                    this.transitionTimer = setTimeout(transition, wait)
                else
                    resolve(true)
            }
            if (this.transitionTimer !== null)
                clearTimeout(this.transitionTimer)
            this.transitionTimer = setTimeout(transition, 0)
        })
    }

    /*  switch canvas  */
    async canvasSwitch () {
        this.api.renderer.log("INFO", "switching canvas (begin)")

        /*  stop the optional fader  */
        await this.canvasFaderStop()

        /*  switch to next mode  */
        this.canvasMode = (this.canvasMode + 1) % 2

        /*  reconfigure the new textures  */
        await this.canvasReconfigure().then(async () => {
            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            /*  transition canvas  */
            await this.canvasTransition()

            /*  dispose old textures  */
            await this.canvasDisposeTextures((this.canvasMode + 1) % 2)

            this.api.renderer.log("INFO", "switching canvas (end)")
        }).catch(async () => {
            /*  switch back to previous mode  */
            this.canvasMode = (this.canvasMode + 1) % 2

            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            this.api.renderer.log("INFO", "switching canvas (end, FAILED)")
        })
    }

    /*  reflect scene state  */
    async reflectSceneState (state: StateTypePartial["canvas"]) {
        if (state !== undefined && this.api.scene.renderingLayer("back")) {
            let changed = false

            /*  determine current and next configuration  */
            const canvasConfig     = this.canvasConfig[this.canvasMode]
            const canvasConfigNext = this.canvasConfig[(this.canvasMode + 1) % 2]

            /*  update content  */
            if (   (state.texture1  !== undefined && canvasConfig.texture1  !== state.texture1)
                || (state.texture2  !== undefined && canvasConfig.texture2  !== state.texture2)
                || (state.fadeTrans !== undefined && canvasConfig.fadeTrans !== state.fadeTrans)
                || (state.fadeWait  !== undefined && canvasConfig.fadeWait  !== state.fadeWait)) {
                canvasConfigNext.texture1  = state.texture1  !== undefined ?
                    state.texture1  : canvasConfig.texture1
                canvasConfigNext.texture2  = state.texture2  !== undefined ?
                    state.texture2  : canvasConfig.texture2
                canvasConfigNext.fadeTrans = state.fadeTrans !== undefined ?
                    state.fadeTrans : canvasConfig.fadeTrans
                canvasConfigNext.fadeWait  = state.fadeWait  !== undefined ?
                    state.fadeWait  : canvasConfig.fadeWait
                changed = true
            }

            /*  update rotation  */
            if (state.rotationZ !== undefined) {
                this.wall!.rotationQuaternion = this.wallRotBase!.clone()
                this.wall!.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.rotationZ), BABYLON.Space.WORLD)
            }

            /*  update transition type  */
            if (state.transType !== undefined && this.transitionTypes[state.transType] !== undefined) {
                this.transitionType = state.transType
                this.transitionTexture!.setInt("type", this.transitionTypes[this.transitionType])
            }

            /*  update transition duration  */
            if (state.transTime !== undefined)
                this.transitionDuration = state.transTime

            /*  apply changes  */
            if (changed)
                await this.canvasSwitch()
        }
    }

    /*  provide reference to wall mesh  */
    getWallMesh () {
        return this.wall
    }
}

