/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }           from "./app-render-api"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

/*  exported rendering feature  */
export default class Mask {
    /*  internal state  */
    private mask:           BABYLON.Nullable<BABYLON.TransformNode>  = null
    private display:        BABYLON.Nullable<BABYLON.Mesh>           = null
    private background:     BABYLON.Nullable<BABYLON.Mesh>           = null
    private camera:         BABYLON.Nullable<BABYLON.FreeCamera>     = null
    private originalCamera: BABYLON.Nullable<BABYLON.Camera> = null
    private borderRad       = 0.0
    private base            = { scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0 }

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to mask mesh nodes  */
        const scene = this.api.scene.getScene()
        this.mask       = scene.getNodeByName("Mask")            as BABYLON.Nullable<BABYLON.TransformNode>
        this.display    = scene.getMeshByName("Mask-Display")    as BABYLON.Nullable<BABYLON.Mesh>
        this.background = scene.getMeshByName("Mask-Background") as BABYLON.Nullable<BABYLON.Mesh>
        this.camera     = scene.getNodeByName("Mask-Cam-Lens")   as BABYLON.Nullable<BABYLON.FreeCamera>
        if (this.mask === null || this.display === null || this.background === null || this.camera === null)
            throw new Error("cannot find mask mesh nodes")
        if (this.api.scene.renderingLayer("front")) {
            this.display.setEnabled(false)
            this.background.setEnabled(false)
        }

        /*  initialize mask base values  */
        this.base.scaleDisplayX = this.display.scaling.x
        this.base.scaleDisplayY = this.display.scaling.y
        this.base.scaleDisplayZ = this.display.scaling.z

        /*  force mask background to be entirely black  */
        const material = this.background.material as BABYLON.PBRMaterial
        material.albedoColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        material.albedoTexture?.dispose()
        material.albedoTexture = null
        material.unlit = true
        material.disableLighting = true
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.mask !== null
            && this.display !== null
            && this.background !== null
            && this.camera !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("mask"))
            && this.display.isEnabled())
            await this.api.material.applyDisplayMaterial("mask", this.display, 1.0,
                this.borderRad, 0, null)

        /*  reflect scene changes  */
        if (state.mask !== undefined) {
            /*  update display material  */
            if (state.mask.source !== undefined
                && (this.api.material.displaySource("mask") !== state.mask.source
                    || this.api.material.isMediaModified(state.mask.source))) {
                this.api.material.displaySource("mask", state.mask.source)
                if (this.display.isEnabled())
                    await this.api.material.applyDisplayMaterial("mask", this.display, 1.0,
                        this.borderRad, 0, null)
            }

            /*  update display scale  */
            if (state.mask.scale !== undefined) {
                this.display.scaling.x = this.base.scaleDisplayX * state.mask.scale
                this.display.scaling.y = this.base.scaleDisplayY * state.mask.scale
                this.display.scaling.z = this.base.scaleDisplayZ * state.mask.scale
            }

            /*  update display border  */
            if (state.mask.borderRad !== undefined) {
                this.borderRad = state.mask.borderRad
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("borderRadius", this.borderRad)
                }
            }

            /*  update display visibility  */
            if (state.mask.enable !== undefined
                && this.display.isEnabled() !== state.mask.enable) {
                const scene = this.api.scene.getScene()
                if (state.mask.enable) {
                    /*  enable visibility  */
                    this.originalCamera = scene.activeCamera
                    scene.activeCamera = this.camera
                    await this.api.material.applyDisplayMaterial("mask", this.display, 1.0,
                        this.borderRad, 0, null)
                    this.api.renderer.log("INFO", "enabling mask")
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("visibility", 1.0)
                        this.display.visibility = 1.0
                    }
                    else
                        this.display.visibility = 1.0
                    this.background.visibility = 1.0
                    this.display.setEnabled(true)
                    this.background.setEnabled(true)
                }
                else if (!state.mask.enable) {
                    /*  disable visibility
                        NOTICE: BabylonJS immediately stops rendering if it thinks there are no more
                        visible meshes, so we have to first render it nearly invisible and then
                        finally disable it  */
                    this.api.renderer.log("INFO", "disabling mask")
                    const setOnce = (value: number) => {
                        if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display!.material
                            material.setFloat("visibility", value)
                            this.display!.visibility = value
                        }
                        else
                            this.display!.visibility = value
                        this.background!.visibility = value
                    }
                    setOnce(0.000000001)
                    scene.onAfterRenderObservable.addOnce(async (ev, state) => {
                        setOnce(0)
                        this.display!.setEnabled(false)
                        this.background!.setEnabled(false)
                        if (this.originalCamera !== null)
                            scene.activeCamera = this.originalCamera
                        await this.api.material.unapplyDisplayMaterial("mask", this.display!)
                    })
                }
            }
        }
    }
}

