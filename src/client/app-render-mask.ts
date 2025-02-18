/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }           from "./app-render-api"
import State                  from "./app-render-state"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class Mask {
    private originalCamera:  BABYLON.Nullable<BABYLON.Camera> = null
    private mask:            BABYLON.Nullable<BABYLON.TransformNode>  = null
    private maskDisplay:     BABYLON.Nullable<BABYLON.Mesh>           = null
    private maskBackground:  BABYLON.Nullable<BABYLON.Mesh>           = null
    private maskCamLens:     BABYLON.Nullable<BABYLON.FreeCamera>     = null
    private maskBorderRad    = 0.0
    private maskBase         = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0
    }

    constructor (
        private api:      API,
        private state:    State,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to mask mesh nodes  */
        this.mask           = this.state.scene!.getNodeByName("Mask")            as BABYLON.Nullable<BABYLON.TransformNode>
        this.maskDisplay    = this.state.scene!.getMeshByName("Mask-Display")    as BABYLON.Nullable<BABYLON.Mesh>
        this.maskBackground = this.state.scene!.getMeshByName("Mask-Background") as BABYLON.Nullable<BABYLON.Mesh>
        this.maskCamLens    = this.state.scene!.getNodeByName("Mask-Cam-Lens")   as BABYLON.Nullable<BABYLON.FreeCamera>
        if (this.mask === null || this.maskDisplay === null || this.maskBackground === null || this.maskCamLens === null)
            throw new Error("cannot find mask mesh nodes")
        if (this.api.scene.renderingLayer("front")) {
            this.maskDisplay.setEnabled(false)
            this.maskBackground.setEnabled(false)
        }

        /*  initialize mask base values  */
        this.maskBase.scaleDisplayX = this.maskDisplay!.scaling.x
        this.maskBase.scaleDisplayY = this.maskDisplay!.scaling.y
        this.maskBase.scaleDisplayZ = this.maskDisplay!.scaling.z

        /*  force mask background to be entirely black  */
        const material = this.maskBackground.material as BABYLON.PBRMaterial
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
            && this.maskDisplay !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.state.displaySourceMap.mask)
            && this.maskDisplay.isEnabled())
            await this.api.material.applyDisplayMaterial("mask", this.maskDisplay, 1.0, this.maskBorderRad, 0, null)

        /*  reflect scene changes  */
        if (state.mask !== undefined) {
            if (state.mask.source !== undefined
                && (this.state.displaySourceMap.mask !== state.mask.source
                    || this.api.material.isMediaModified(state.mask.source))) {
                this.state.displaySourceMap.mask = state.mask.source
                if (this.maskDisplay.isEnabled())
                    await this.api.material.applyDisplayMaterial("mask", this.maskDisplay, 1.0, this.maskBorderRad, 0, null)
            }
            if (state.mask.scale !== undefined) {
                this.maskDisplay.scaling.x = this.maskBase.scaleDisplayX * state.mask.scale
                this.maskDisplay.scaling.y = this.maskBase.scaleDisplayY * state.mask.scale
                this.maskDisplay.scaling.z = this.maskBase.scaleDisplayZ * state.mask.scale
            }
            if (state.mask.borderRad !== undefined) {
                this.maskBorderRad = state.mask.borderRad
                if (this.maskDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.maskDisplay.material
                    material.setFloat("borderRadius", this.maskBorderRad)
                }
            }
            if (state.mask.enable !== undefined && this.maskDisplay.isEnabled() !== state.mask.enable) {
                if (state.mask.enable) {
                    this.originalCamera = this.state.scene!.activeCamera
                    this.state.scene!.activeCamera = this.maskCamLens
                    await this.api.material.applyDisplayMaterial("mask", this.maskDisplay, 1.0, this.maskBorderRad, 0, null)
                    this.log("INFO", "enabling mask")
                    if (this.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.maskDisplay!.material
                        material.setFloat("visibility", 1.0)
                        this.maskDisplay!.visibility = 1.0
                    }
                    else
                        this.maskDisplay!.visibility = 1.0
                    this.maskBackground!.visibility = 1.0
                    this.maskDisplay!.setEnabled(true)
                    this.maskBackground!.setEnabled(true)
                }
                else if (!state.mask.enable) {
                    /*  disable mask
                        NOTICE: BabylonJS immediately stops rendering if it thinks there are no more
                        visible meshes, so we have to first render it nearly invisible and then
                        finally disable it  */
                    this.log("INFO", "disabling mask")
                    const setOnce = (value: number) => {
                        if (this.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.maskDisplay!.material
                            material.setFloat("visibility", value)
                            this.maskDisplay!.visibility = value
                        }
                        else
                            this.maskDisplay!.visibility = value
                        this.maskBackground!.visibility = value
                    }
                    setOnce(0.000000001)
                    this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                        setOnce(0)
                        this.maskDisplay!.setEnabled(false)
                        this.maskBackground!.setEnabled(false)
                        if (this.originalCamera !== null)
                            this.state.scene!.activeCamera = this.originalCamera
                        await this.api.material.unapplyDisplayMaterial("mask", this.maskDisplay!)
                    })
                }
            }
        }
    }
}

