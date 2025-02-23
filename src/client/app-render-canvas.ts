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
    private canvasMaterial: BABYLON.Nullable<BABYLON.NodeMaterial> = null
    private canvasTexture:  BABYLON.Nullable<BABYLON.Texture>      = null
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
        /*  determine canvas config and state  */
        const canvasConfig = this.canvasConfig[this.canvasMode]
        const canvasState  = this.canvasState[this.canvasMode]

        /*  sanity check situation  */
        if (canvasConfig.texture1 === "")
            return
        this.api.renderer.log("INFO", "canvas reconfigure (begin)")

        /*  determine id of canvas mode  */
        const mode = this.canvasMode === 0 ? "A" : "B"

        /*  determine material  */
        const material = this.canvasMaterial!

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
        textureBlock1.texture = canvasState.texture1
        textureBlock2.texture = canvasState.texture2

        /*  apply texture fading duration  */
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = canvasConfig.fadeTrans

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
        this.api.renderer.log("INFO", "canvas reconfigure (end)")
    }

    /*  dispose canvas textures  */
    async canvasDisposeTextures (modeNum: number) {
        /*  determine material and canvas state  */
        const material = this.canvasMaterial!
        const canvasState = this.canvasState[modeNum]

        /*  unfreeze material  */
        material.unfreeze()

        /*  determine mode  */
        const modeStr = modeNum === 0 ? "A" : "B"

        /*  dispose texture 1  */
        const textureBlock1 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture1`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock1!.texture = null
        canvasState.texture1?.dispose()
        canvasState.texture1 = null
        canvasState.canvas1 = null

        /*  dispose texture 2  */
        const textureBlock2 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture2`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock2!.texture = null
        canvasState.texture2?.dispose()
        canvasState.texture2 = null
        canvasState.canvas2 = null

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
    }

    /*  start canvas/wall fader  */
    async canvasFaderStart () {
        /*  determine canvas config and state  */
        const canvasConfig = this.canvasConfig[this.canvasMode]
        const canvasState  = this.canvasState[this.canvasMode]

        /*  activate optional cross-fading between textures  */
        const mode = this.canvasMode === 0 ? "A" : "B"
        const material = this.canvasMaterial!
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = 0.0

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

