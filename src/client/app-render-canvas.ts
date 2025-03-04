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
    canvas1:  HTMLCanvasElement | null
    canvas2:  HTMLCanvasElement | null
    texture1: BABYLON.Nullable<BABYLON.Texture>
    texture2: BABYLON.Nullable<BABYLON.Texture>
}

/*  exported rendering feature  */
export default class Canvas {
    /*  internal state  */
    private canvasMode = 0
    private canvasTexture: BABYLON.Nullable<BABYLON.ProceduralTexture> = null
    private dummyTexture:  BABYLON.Nullable<BABYLON.DynamicTexture> = null
    private canvasConfig = [
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 },
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 }
    ] as CanvasConfig[]
    private canvasState = [
        { texture1: null, texture2: null },
        { texture1: null, texture2: null }
    ] as CanvasState[]
    private fadeTimer: ReturnType<typeof setTimeout> | null = null
    private modeTimer: ReturnType<typeof setTimeout> | null = null
    private fadeSwitch = 2.0
    private wall:        BABYLON.Nullable<BABYLON.Mesh>        = null
    private wallRotBase: BABYLON.Nullable<BABYLON.Quaternion>  = null
    private modeTextureFade = 0.0

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
    canvasTextureMakeDummy (width: number, height: number, scene: BABYLON.Scene) {
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

    /*  make canvas texture from shader  */
    canvasTextureMakeShader (width: number, height: number, scene: BABYLON.Scene) {
        /*  create procedural texture from a fragment shader  */
        const texture = new BABYLON.ProceduralTexture("canvas", { width, height }, {
            fragmentSource: `
                precision highp float;

                varying vec2 vUV;

                uniform sampler2D ModeATexture1;
                uniform sampler2D ModeATexture2;
                uniform float     ModeATextureFade;

                uniform sampler2D ModeBTexture1;
                uniform sampler2D ModeBTexture2;
                uniform float     ModeBTextureFade;

                uniform float     ModeTextureFade;

                void main (void) {
                    vec4 mAT1 = texture2D(ModeATexture1, vUV);
                    vec4 mAT2 = texture2D(ModeATexture2, vUV);
                    vec3 mAT  = mix(mAT1.rgb, mAT2.rgb, ModeATextureFade);

                    vec4 mBT1 = texture2D(ModeBTexture1, vUV);
                    vec4 mBT2 = texture2D(ModeBTexture2, vUV);
                    vec3 mBT  = mix(mBT1.rgb, mBT2.rgb, ModeBTextureFade);

                    vec3 tex = mix(mAT, mBT, ModeTextureFade);

                    gl_FragColor = vec4(tex, 1.0);
                }
            `
        }, scene, null, false, false)

        /*  initialize uniforms (external variables)  */
        texture.setTexture("ModeATexture1", this.dummyTexture!)
        texture.setTexture("ModeATexture2", this.dummyTexture!)
        texture.setFloat("ModeATextureFade", 0.0)
        texture.setTexture("ModeBTexture1", this.dummyTexture!)
        texture.setTexture("ModeBTexture2", this.dummyTexture!)
        texture.setFloat("ModeBTextureFade", 0.0)
        texture.setFloat("ModeTextureFade",  0.0)

        return texture
    }

    /*  load canvas/wall  */
    async canvasLoad () {
        /*  create regular texture  */
        this.canvasTexture = this.canvasTextureMakeShader(
            Config.wall.width, Config.wall.height, this.api.scene.getScene())

        /*  create replacement texture  */
        this.dummyTexture = this.canvasTextureMakeDummy(
            Config.wall.width, Config.wall.height, this.api.scene.getScene())

        /*  initialize canvas mode  */
        this.canvasMode = 0

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  reset the mode switching fader  */
        this.modeTextureFade = 0.0
        this.canvasTexture.setFloat("ModeTextureFade", this.modeTextureFade)

        /*  apply texture onto wall  */
        const wall = this.api.scene.getScene().getMaterialByName("Wall") as
            BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = this.canvasTexture

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

        /*  dispose procedural texture  */
        this.canvasTexture?.dispose()
        this.canvasTexture = null
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

        /*  determine id of canvas mode  */
        const mode = this.canvasMode === 0 ? "A" : "B"

        /*  determine texture  */
        const texture = this.canvasTexture!

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
        texture.setTexture(`Mode${mode}Texture1`,
            canvasState.texture1 !== null ? canvasState.texture1 : this.dummyTexture!)
        texture.setTexture(`Mode${mode}Texture2`,
            canvasState.texture2 !== null ? canvasState.texture2 : this.dummyTexture!)

        /*  apply texture fading duration  */
        texture.setFloat(`Mode${mode}TextureFade`, canvasConfig.fadeTrans)

        /*  re-freeze material  */
        this.api.renderer.log("INFO", "canvas reconfigure (end)")
    }

    /*  dispose canvas textures  */
    async canvasDisposeTextures (modeNum: number) {
        /*  determine material and canvas state  */
        const canvasTexture = this.canvasTexture!
        const canvasState   = this.canvasState[modeNum]

        /*  determine mode  */
        const mode = modeNum === 0 ? "A" : "B"

        /*  dispose texture 1  */
        canvasTexture.setTexture(`Mode${mode}Texture1`, this.dummyTexture!)
        canvasState.texture1 = null
        canvasState.canvas1 = null

        /*  dispose texture 2  */
        canvasTexture.setTexture(`Mode${mode}Texture2`, this.dummyTexture!)
        canvasState.texture2 = null
        canvasState.canvas2 = null
    }

    /*  start canvas/wall fader  */
    async canvasFaderStart () {
        /*  determine canvas config and state  */
        const canvasConfig = this.canvasConfig[this.canvasMode]
        const canvasState  = this.canvasState[this.canvasMode]

        /*  activate optional cross-fading between textures  */
        const mode = this.canvasMode === 0 ? "A" : "B"
        const texture = this.canvasTexture!
        texture.setFloat(`Mode${mode}TextureFade`, 0.0)

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
            this.fadeTimer = null

            /*  apply next fading step  */
            const fadeInterval = this.api.scene.currentMillisecondsPerFrame()
            const fadeStep = 1.0 / (fadeTrans / fadeInterval)
            fade = fade + (fadeSign * fadeStep)
            let wait = fadeInterval
            if      (fade > 1.0) { fade = 1.0; fadeSign = -1; wait = fadeWait }
            else if (fade < 0.0) { fade = 0.0; fadeSign = +1; wait = fadeWait }
            texture.setFloat(`Mode${mode}TextureFade`, fade)

            /*  wait for next iteration  */
            this.fadeTimer = setTimeout(fader, wait)
        }
        if (this.fadeTimer !== null)
            clearTimeout(this.fadeTimer)
        this.fadeTimer = setTimeout(fader, 0)
    }

    /*  stop canvas/wall fader  */
    async canvasFaderStop () {
        if (this.fadeTimer !== null) {
            clearTimeout(this.fadeTimer)
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(true), 2 * (this.api.scene.currentMillisecondsPerFrame()))
            })
            this.fadeTimer = null
        }
    }

    /*  fade mode of canvas  */
    async canvasModeFade () {
        const texture = this.canvasTexture!
        await new Promise((resolve, reject) => {
            let fade = this.modeTextureFade
            const fadeSign  = fade === 0.0 ? +1 : -1
            const fadeTrans = this.fadeSwitch * 1000
            const fader = () => {
                /*  reset timer (to not confuse stopping below)  */
                this.modeTimer = null

                /*  apply next fading step  */
                const fadeInterval = this.api.scene.currentMillisecondsPerFrame()
                const fadeStep = 1.0 / (fadeTrans / fadeInterval)
                fade = fade + (fadeSign * fadeStep)
                let wait = fadeInterval
                if (fade > 1.0) {
                    fade = 1.0
                    wait = 0
                }
                if (fade < 0.0) {
                    fade = 0.0
                    wait = 0
                }
                this.modeTextureFade = fade
                texture.setFloat("ModeTextureFade", fade)

                /*  wait for next iteration or stop processing  */
                if (wait > 0)
                    this.modeTimer = setTimeout(fader, wait)
                else
                    resolve(true)
            }
            if (this.modeTimer !== null)
                clearTimeout(this.modeTimer)
            this.modeTimer = setTimeout(fader, 0)
        })
    }

    /*  change mode of canvas  */
    async canvasModeChange () {
        this.api.renderer.log("INFO", "switching canvas (begin)")

        /*  stop the optional fader  */
        await this.canvasFaderStop()

        /*  switch to next mode  */
        this.canvasMode = (this.canvasMode + 1) % 2

        /*  reconfigure the new textures  */
        await this.canvasReconfigure().then(async () => {
            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            /*  fade to new mode  */
            await this.canvasModeFade()

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

            /*  update fading  */
            if (state.fadeSwitch !== undefined)
                this.fadeSwitch = state.fadeSwitch

            /*  apply changes  */
            if (changed)
                await this.canvasModeChange()
        }
    }

    /*  provide reference to wall mesh  */
    getWallMesh () {
        return this.wall
    }
}

