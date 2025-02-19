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

type CanvasConfig = {
    texture1:  string,
    texture2:  string,
    fadeTrans: number,
    fadeWait:  number
}

type CanvasState = {
    canvas1:  HTMLCanvasElement | null
    canvas2:  HTMLCanvasElement | null
    texture1: BABYLON.Nullable<BABYLON.Texture>
    texture2: BABYLON.Nullable<BABYLON.Texture>
}

export default class Canvas {
    private fadeTimer: ReturnType<typeof setTimeout> | null = null
    private modeTimer: ReturnType<typeof setTimeout> | null = null
    private fadeSwitch = 2.0
    private canvasMode        = 0
    private canvasConfig      = [
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 },
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 }
    ] as CanvasConfig[]
    private canvasMaterial:  BABYLON.Nullable<BABYLON.NodeMaterial>   = null
    private canvasTexture:   BABYLON.Nullable<BABYLON.Texture>        = null
    private canvasState = [
        { texture1: null, texture2: null },
        { texture1: null, texture2: null }
    ] as CanvasState[]
    private wall:        BABYLON.Nullable<BABYLON.Mesh>        = null
    private wallRotBase: BABYLON.Nullable<BABYLON.Quaternion>  = null

    constructor (
        private api:     API,
        private log:     (level: string, msg: string) => void
    ) {}

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

    /*  load canvas/wall  */
    async canvasLoad () {
        /*  load externally defined node material  */
        const material = this.canvasMaterial =
            await BABYLON.NodeMaterial.ParseFromFileAsync("material",
                "/res/canvas-material.json", this.api.scene.getScene())

        /*  initialize canvas mode  */
        this.canvasMode = 0

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  reset the mode switching fader  */
        const modeTexFade = material.getBlockByName("ModeTextureFade") as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (modeTexFade === null)
            throw new Error("no such input block named 'ModeTextureFade' found")
        modeTexFade.value = 0.0

        /*  build and freeze material  */
        material.build(false)
        material.freeze()

        /*  create composed texture and apply onto wall  */
        this.canvasTexture = material.createProceduralTexture(
            { width: Config.wall.width, height: Config.wall.height }, this.api.scene.getScene())
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

        /*  unfreeze material  */
        this.canvasMaterial?.unfreeze()

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  dispose procedural texture  */
        this.canvasTexture?.dispose()
        this.canvasTexture = null

        /*  dispose material  */
        this.canvasMaterial?.dispose(true, true)
        this.canvasMaterial = null
    }

    /*  reconfigure canvas/wall texture(s)  */
    async canvasReconfigure () {
        /*  sanity check situation  */
        if (this.canvasConfig[this.canvasMode].texture1 === "")
            return
        this.log("INFO", "canvas reconfigure (begin)")

        /*  determine id of canvas mode  */
        const mode = this.canvasMode === 0 ? "A" : "B"

        /*  determine material  */
        const material = this.canvasMaterial!

        /*  reset textures  */
        await this.canvasDisposeTextures(this.canvasMode)

        /*  load new texture(s)  */
        this.log("INFO", "canvas reconfigure (load textures)")
        const canvas = document.createElement("canvas")
        this.canvasState[this.canvasMode].canvas1 = canvas
        this.canvasState[this.canvasMode].texture1 =
            await this.api.texture.createTexture(this.canvasConfig[this.canvasMode].texture1, canvas)
        if (this.canvasConfig[this.canvasMode].texture2 !== "") {
            const canvas = document.createElement("canvas")
            this.canvasState[this.canvasMode].canvas2 = canvas
            this.canvasState[this.canvasMode].texture2 =
                await this.api.texture.createTexture(this.canvasConfig[this.canvasMode].texture2, canvas)
        }
        else {
            this.canvasState[this.canvasMode].canvas2  = null
            this.canvasState[this.canvasMode].texture2 = null
        }

        /*  await texture(s) to be loaded  */
        const p = [] as BABYLON.Texture[]
        if (this.canvasState[this.canvasMode].texture1 !== null)
            p.push(this.canvasState[this.canvasMode].texture1!)
        if (this.canvasState[this.canvasMode].texture2 !== null)
            p.push(this.canvasState[this.canvasMode].texture2!)
        await new Promise((resolve) => {
            BABYLON.Texture.WhenAllReady(p, () => { resolve(true) })
        })

        /*  determine texture blocks in material  */
        const textureBlock1 = material.getBlockByPredicate((input) =>
            input.name === `Mode${mode}Texture1`) as BABYLON.Nullable<BABYLON.TextureBlock>
        const textureBlock2 = material.getBlockByPredicate((input) =>
            input.name === `Mode${mode}Texture2`) as BABYLON.Nullable<BABYLON.TextureBlock>
        if (textureBlock1 === null)
            throw new Error(`no such texture block named 'Mode${mode}Texture1' found`)
        if (textureBlock2 === null)
            throw new Error(`no such texture block named 'Mode${mode}Texture2' found`)

        /*  unfreeze material  */
        material.unfreeze()

        /*  apply new textures  */
        textureBlock1.texture = this.canvasState[this.canvasMode].texture1
        textureBlock2.texture = this.canvasState[this.canvasMode].texture2

        /*  apply texture fading duration  */
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = this.canvasConfig[this.canvasMode].fadeTrans

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
        this.log("INFO", "canvas reconfigure (end)")
    }

    /*  dispose canvas textures  */
    async canvasDisposeTextures (modeNum: number) {
        /*  determine material  */
        const material = this.canvasMaterial!

        /*  unfreeze material  */
        material.unfreeze()

        /*  determine mode  */
        const modeStr = modeNum === 0 ? "A" : "B"

        /*  dispose texture 1  */
        const textureBlock1 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture1`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock1!.texture = null
        this.canvasState[modeNum].texture1?.dispose()
        this.canvasState[modeNum].texture1 = null
        this.canvasState[modeNum].canvas1 = null

        /*  dispose texture 2  */
        const textureBlock2 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture2`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock2!.texture = null
        this.canvasState[modeNum].texture2?.dispose()
        this.canvasState[modeNum].texture2 = null
        this.canvasState[modeNum].canvas2 = null

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
    }

    /*  start canvas/wall fader  */
    async canvasFaderStart () {
        /*  activate optional cross-fading between textures  */
        const mode = this.canvasMode === 0 ? "A" : "B"
        const material = this.canvasMaterial!
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = 0.0

        /*  stop processing immediately if no fading is necessary  */
        if (this.canvasState[this.canvasMode].texture2 === null)
            return

        /*  enter processing loop  */
        let fade        = 0
        let fadeSign    = +1
        const fadeTrans = this.canvasConfig[this.canvasMode].fadeTrans
        const fadeWait  = this.canvasConfig[this.canvasMode].fadeWait
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
            texFade.value = fade

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
        const material = this.canvasMaterial!
        const modeTexFade = material.getBlockByName("ModeTextureFade") as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (modeTexFade === null)
            throw new Error("no such input block named 'ModeTextureFade' found")
        await new Promise((resolve, reject) => {
            let fade        = modeTexFade.value
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
                if (fade > 1.0 || fade < 0.0)
                    wait = 0
                modeTexFade.value = fade

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
        this.log("INFO", "switching canvas (begin)")

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

            this.log("INFO", "switching canvas (end)")
        }).catch(async () => {
            /*  switch back to previous mode  */
            this.canvasMode = (this.canvasMode + 1) % 2

            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            this.log("INFO", "switching canvas (end, FAILED)")
        })
    }

    async reflectSceneState (state: StateTypePartial) {
        if (state.canvas !== undefined && this.api.scene.renderingLayer("back")) {
            let changed = false
            if (   (state.canvas.texture1  !== undefined && this.canvasConfig[this.canvasMode].texture1  !== state.canvas.texture1)
                || (state.canvas.texture2  !== undefined && this.canvasConfig[this.canvasMode].texture2  !== state.canvas.texture2)
                || (state.canvas.fadeTrans !== undefined && this.canvasConfig[this.canvasMode].fadeTrans !== state.canvas.fadeTrans)
                || (state.canvas.fadeWait  !== undefined && this.canvasConfig[this.canvasMode].fadeWait  !== state.canvas.fadeWait)) {
                this.canvasConfig[(this.canvasMode + 1) % 2].texture1 =
                    state.canvas.texture1 !== undefined ?
                        state.canvas.texture1 :
                        this.canvasConfig[this.canvasMode].texture1
                this.canvasConfig[(this.canvasMode + 1) % 2].texture2 =
                    state.canvas.texture2 !== undefined ?
                        state.canvas.texture2 :
                        this.canvasConfig[this.canvasMode].texture2
                this.canvasConfig[(this.canvasMode + 1) % 2].fadeTrans =
                    state.canvas.fadeTrans !== undefined ?
                        state.canvas.fadeTrans :
                        this.canvasConfig[this.canvasMode].fadeTrans
                this.canvasConfig[(this.canvasMode + 1) % 2].fadeWait =
                    state.canvas.fadeWait !== undefined ?
                        state.canvas.fadeWait :
                        this.canvasConfig[this.canvasMode].fadeWait
                changed = true
            }
            if (state.canvas.rotationZ !== undefined) {
                this.wall!.rotationQuaternion = this.wallRotBase!.clone()
                this.wall!.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.canvas.rotationZ), BABYLON.Space.WORLD)
            }
            if (state.canvas.fadeSwitch !== undefined)
                this.fadeSwitch = state.canvas.fadeSwitch
            if (changed)
                await this.canvasModeChange()
        }
    }

    /*  provide reference to wall mesh  */
    getWallMesh () {
        return this.wall
    }
}

