/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import Config                 from "./app-render-config"
import State                  from "./app-render-state"
import AppRenderTexture       from "./app-render-texture"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class AppRenderCanvas {
    constructor (
        private state:   State,
        private texture: AppRenderTexture,
        private log:     (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather reference to wall  */
        this.state.wall = this.state.scene!.getMeshByName("Wall") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.wall === null)
            throw new Error("cannot find wall node")
        this.state.wallRotBase = this.state.wall.rotationQuaternion

        /*  on-the-fly load wall canvas  */
        if (this.state.layer === "back")
            await this.canvasLoad()
    }

    /*  load canvas/wall  */
    async canvasLoad () {
        /*  load externally defined node material  */
        const material = this.state.canvasMaterial =
            await BABYLON.NodeMaterial.ParseFromFileAsync("material",
                "/res/canvas-material.json", this.state.scene!)

        /*  initialize canvas mode  */
        this.state.canvasMode = 0

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
        this.state.canvasTexture = material.createProceduralTexture(
            { width: Config.wall.width, height: Config.wall.height }, this.state.scene!)
        const wall = this.state.scene!.getMaterialByName("Wall") as
            BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = this.state.canvasTexture

        /*  start optional texture fader  */
        await this.canvasFaderStart()
    }

    /*  unload canvas/wall  */
    async canvasUnload () {
        /*  stop optional texture fader  */
        await this.canvasFaderStop()

        /*  dispose wall texture  */
        const wall = this.state.scene!.getMaterialByName("Wall") as
            BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = null

        /*  unfreeze material  */
        this.state.canvasMaterial?.unfreeze()

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  dispose procedural texture  */
        this.state.canvasTexture?.dispose()
        this.state.canvasTexture = null

        /*  dispose material  */
        this.state.canvasMaterial?.dispose(true, true)
        this.state.canvasMaterial = null
    }

    /*  reconfigure canvas/wall texture(s)  */
    async canvasReconfigure () {
        /*  sanity check situation  */
        if (this.state.canvasConfig[this.state.canvasMode].texture1 === "")
            return
        this.log("INFO", "canvas reconfigure (begin)")

        /*  determine id of canvas mode  */
        const mode = this.state.canvasMode === 0 ? "A" : "B"

        /*  determine material  */
        const material = this.state.canvasMaterial!

        /*  reset textures  */
        await this.canvasDisposeTextures(this.state.canvasMode)

        /*  load new texture(s)  */
        this.log("INFO", "canvas reconfigure (load textures)")
        const canvas = document.createElement("canvas")
        this.state.canvasState[this.state.canvasMode].canvas1 = canvas
        this.state.canvasState[this.state.canvasMode].texture1 =
            await this.texture.createTexture(this.state.canvasConfig[this.state.canvasMode].texture1, canvas)
        if (this.state.canvasConfig[this.state.canvasMode].texture2 !== "") {
            const canvas = document.createElement("canvas")
            this.state.canvasState[this.state.canvasMode].canvas2 = canvas
            this.state.canvasState[this.state.canvasMode].texture2 =
                await this.texture.createTexture(this.state.canvasConfig[this.state.canvasMode].texture2, canvas)
        }
        else {
            this.state.canvasState[this.state.canvasMode].canvas2  = null
            this.state.canvasState[this.state.canvasMode].texture2 = null
        }

        /*  await texture(s) to be loaded  */
        const p = [] as BABYLON.Texture[]
        if (this.state.canvasState[this.state.canvasMode].texture1 !== null)
            p.push(this.state.canvasState[this.state.canvasMode].texture1!)
        if (this.state.canvasState[this.state.canvasMode].texture2 !== null)
            p.push(this.state.canvasState[this.state.canvasMode].texture2!)
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
        textureBlock1.texture = this.state.canvasState[this.state.canvasMode].texture1
        textureBlock2.texture = this.state.canvasState[this.state.canvasMode].texture2

        /*  apply texture fading duration  */
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = this.state.canvasConfig[this.state.canvasMode].fadeTrans

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
        this.log("INFO", "canvas reconfigure (end)")
    }

    /*  dispose canvas textures  */
    async canvasDisposeTextures (modeNum: number) {
        /*  determine material  */
        const material = this.state.canvasMaterial!

        /*  unfreeze material  */
        material.unfreeze()

        /*  determine mode  */
        const modeStr = modeNum === 0 ? "A" : "B"

        /*  dispose texture 1  */
        const textureBlock1 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture1`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock1!.texture = null
        this.state.canvasState[modeNum].texture1?.dispose()
        this.state.canvasState[modeNum].texture1 = null
        this.state.canvasState[modeNum].canvas1 = null

        /*  dispose texture 2  */
        const textureBlock2 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture2`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock2!.texture = null
        this.state.canvasState[modeNum].texture2?.dispose()
        this.state.canvasState[modeNum].texture2 = null
        this.state.canvasState[modeNum].canvas2 = null

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
    }

    /*  start canvas/wall fader  */
    async canvasFaderStart () {
        /*  activate optional cross-fading between textures  */
        const mode = this.state.canvasMode === 0 ? "A" : "B"
        const material = this.state.canvasMaterial!
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = 0.0

        /*  stop processing immediately if no fading is necessary  */
        if (this.state.canvasState[this.state.canvasMode].texture2 === null)
            return

        /*  enter processing loop  */
        let fade        = 0
        let fadeSign    = +1
        const fadeTrans = this.state.canvasConfig[this.state.canvasMode].fadeTrans
        const fadeWait  = this.state.canvasConfig[this.state.canvasMode].fadeWait
        const fader = () => {
            /*  reset timer (to not confuse stopping below)  */
            this.state.fadeTimer = null

            /*  apply next fading step  */
            const fadeInterval = 1000 / (this.state.fps === 0 ? 1 : this.state.fps)
            const fadeStep = 1.0 / (fadeTrans / fadeInterval)
            fade = fade + (fadeSign * fadeStep)
            let wait = fadeInterval
            if      (fade > 1.0) { fade = 1.0; fadeSign = -1; wait = fadeWait }
            else if (fade < 0.0) { fade = 0.0; fadeSign = +1; wait = fadeWait }
            texFade.value = fade

            /*  wait for next iteration  */
            this.state.fadeTimer = setTimeout(fader, wait)
        }
        if (this.state.fadeTimer !== null)
            clearTimeout(this.state.fadeTimer)
        this.state.fadeTimer = setTimeout(fader, 0)
    }

    /*  stop canvas/wall fader  */
    async canvasFaderStop () {
        if (this.state.fadeTimer !== null) {
            clearTimeout(this.state.fadeTimer)
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(true), 2 * (1000 / (this.state.fps === 0 ? 1 : this.state.fps)))
            })
            this.state.fadeTimer = null
        }
    }

    /*  fade mode of canvas  */
    async canvasModeFade () {
        const material = this.state.canvasMaterial!
        const modeTexFade = material.getBlockByName("ModeTextureFade") as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (modeTexFade === null)
            throw new Error("no such input block named 'ModeTextureFade' found")
        await new Promise((resolve, reject) => {
            let fade        = modeTexFade.value
            const fadeSign  = fade === 0.0 ? +1 : -1
            const fadeTrans = this.state.fadeSwitch * 1000
            const fader = () => {
                /*  reset timer (to not confuse stopping below)  */
                this.state.modeTimer = null

                /*  apply next fading step  */
                const fadeInterval = 1000 / (this.state.fps === 0 ? 1 : this.state.fps)
                const fadeStep = 1.0 / (fadeTrans / fadeInterval)
                fade = fade + (fadeSign * fadeStep)
                let wait = fadeInterval
                if (fade > 1.0 || fade < 0.0)
                    wait = 0
                modeTexFade.value = fade

                /*  wait for next iteration or stop processing  */
                if (wait > 0)
                    this.state.modeTimer = setTimeout(fader, wait)
                else
                    resolve(true)
            }
            if (this.state.modeTimer !== null)
                clearTimeout(this.state.modeTimer)
            this.state.modeTimer = setTimeout(fader, 0)
        })
    }

    /*  change mode of canvas  */
    async canvasModeChange () {
        this.log("INFO", "switching canvas (begin)")

        /*  stop the optional fader  */
        await this.canvasFaderStop()

        /*  switch to next mode  */
        this.state.canvasMode = (this.state.canvasMode + 1) % 2

        /*  reconfigure the new textures  */
        await this.canvasReconfigure().then(async () => {
            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            /*  fade to new mode  */
            await this.canvasModeFade()

            /*  dispose old textures  */
            await this.canvasDisposeTextures((this.state.canvasMode + 1) % 2)

            this.log("INFO", "switching canvas (end)")
        }).catch(async () => {
            /*  switch back to previous mode  */
            this.state.canvasMode = (this.state.canvasMode + 1) % 2

            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            this.log("INFO", "switching canvas (end, FAILED)")
        })
    }

    async reflectSceneState (state: StateTypePartial) {
        if (state.canvas !== undefined && this.state.layer === "back") {
            let changed = false
            if (   (state.canvas.texture1  !== undefined && this.state.canvasConfig[this.state.canvasMode].texture1  !== state.canvas.texture1)
                || (state.canvas.texture2  !== undefined && this.state.canvasConfig[this.state.canvasMode].texture2  !== state.canvas.texture2)
                || (state.canvas.fadeTrans !== undefined && this.state.canvasConfig[this.state.canvasMode].fadeTrans !== state.canvas.fadeTrans)
                || (state.canvas.fadeWait  !== undefined && this.state.canvasConfig[this.state.canvasMode].fadeWait  !== state.canvas.fadeWait)) {
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].texture1 =
                    state.canvas.texture1 !== undefined ?
                        state.canvas.texture1 :
                        this.state.canvasConfig[this.state.canvasMode].texture1
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].texture2 =
                    state.canvas.texture2 !== undefined ?
                        state.canvas.texture2 :
                        this.state.canvasConfig[this.state.canvasMode].texture2
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].fadeTrans =
                    state.canvas.fadeTrans !== undefined ?
                        state.canvas.fadeTrans :
                        this.state.canvasConfig[this.state.canvasMode].fadeTrans
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].fadeWait =
                    state.canvas.fadeWait !== undefined ?
                        state.canvas.fadeWait :
                        this.state.canvasConfig[this.state.canvasMode].fadeWait
                changed = true
            }
            if (state.canvas.rotationZ !== undefined) {
                this.state.wall!.rotationQuaternion = this.state.wallRotBase!.clone()
                this.state.wall!.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.canvas.rotationZ), BABYLON.Space.WORLD)
            }
            if (state.canvas.fadeSwitch !== undefined)
                this.state.fadeSwitch = state.canvas.fadeSwitch
            if (changed)
                await this.canvasModeChange()
        }
    }
}

