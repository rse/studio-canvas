/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import State                  from "./app-render-state"
import AppRenderMaterial      from "./app-render-material"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class AppRenderPlate {
    private originalCamera: BABYLON.Nullable<BABYLON.Camera> = null

    constructor (
        private state:    State,
        private material: AppRenderMaterial,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to mask mesh nodes  */
        this.state.mask           = this.state.scene!.getNodeByName("Mask")            as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.maskDisplay    = this.state.scene!.getMeshByName("Mask-Display")    as BABYLON.Nullable<BABYLON.Mesh>
        this.state.maskBackground = this.state.scene!.getMeshByName("Mask-Background") as BABYLON.Nullable<BABYLON.Mesh>
        this.state.maskCamLens    = this.state.scene!.getNodeByName("Mask-Cam-Lens")   as BABYLON.Nullable<BABYLON.FreeCamera>
        if (this.state.mask === null || this.state.maskDisplay === null || this.state.maskBackground === null || this.state.maskCamLens === null)
            throw new Error("cannot find mask mesh nodes")
        if (this.state.layer === "front") {
            this.state.maskDisplay.setEnabled(false)
            this.state.maskBackground.setEnabled(false)
        }

        /*  initialize mask base values  */
        this.state.maskBase.scaleDisplayX = this.state.maskDisplay!.scaling.x
        this.state.maskBase.scaleDisplayY = this.state.maskDisplay!.scaling.y
        this.state.maskBase.scaleDisplayZ = this.state.maskDisplay!.scaling.z

        /*  force mask background to be entirely black  */
        const material = this.state.maskBackground.material as BABYLON.PBRMaterial
        material.albedoColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        material.albedoTexture?.dispose()
        material.albedoTexture = null
        material.unlit = true
        material.disableLighting = true
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.state.mask !== null
            && this.state.maskDisplay !== null
            && this.state.layer === "front"))
            return

        /*  update already active media receivers  */
        if (this.state.modifiedMedia[this.material.mapMediaId(this.state.displaySourceMap.mask)]
            && this.state.maskDisplay.isEnabled())
            await this.material.applyDisplayMaterial("mask", this.state.maskDisplay, 1.0, this.state.maskBorderRad, 0, null)

        /*  reflect scene changes  */
        if (state.mask !== undefined) {
            if (state.mask.source !== undefined
                && (this.state.displaySourceMap.mask !== state.mask.source
                    || this.state.modifiedMedia[this.material.mapMediaId(state.mask.source)])) {
                this.state.displaySourceMap.mask = state.mask.source
                if (this.state.maskDisplay.isEnabled())
                    await this.material.applyDisplayMaterial("mask", this.state.maskDisplay, 1.0, this.state.maskBorderRad, 0, null)
            }
            if (state.mask.scale !== undefined) {
                this.state.maskDisplay.scaling.x = this.state.maskBase.scaleDisplayX * state.mask.scale
                this.state.maskDisplay.scaling.y = this.state.maskBase.scaleDisplayY * state.mask.scale
                this.state.maskDisplay.scaling.z = this.state.maskBase.scaleDisplayZ * state.mask.scale
            }
            if (state.mask.borderRad !== undefined) {
                this.state.maskBorderRad = state.mask.borderRad
                if (this.state.maskDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.maskDisplay.material
                    material.setFloat("borderRadius", this.state.maskBorderRad)
                }
            }
            if (state.mask.enable !== undefined && this.state.maskDisplay.isEnabled() !== state.mask.enable) {
                if (state.mask.enable) {
                    this.originalCamera = this.state.scene!.activeCamera
                    this.state.scene!.activeCamera = this.state.maskCamLens
                    await this.material.applyDisplayMaterial("mask", this.state.maskDisplay, 1.0, this.state.maskBorderRad, 0, null)
                    this.log("INFO", "enabling mask")
                    if (this.state.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.maskDisplay!.material
                        material.setFloat("visibility", 1.0)
                        this.state.maskDisplay!.visibility = 1.0
                    }
                    else
                        this.state.maskDisplay!.visibility = 1.0
                    this.state.maskBackground!.visibility = 1.0
                    this.state.maskDisplay!.setEnabled(true)
                    this.state.maskBackground!.setEnabled(true)
                }
                else if (!state.mask.enable) {
                    /*  disable mask
                        NOTICE: BabylonJS immediately stops rendering if it thinks there are no more
                        visible meshes, so we have to first render it nearly invisible and then
                        finally disable it  */
                    this.log("INFO", "disabling mask")
                    const setOnce = (value: number) => {
                        if (this.state.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.maskDisplay!.material
                            material.setFloat("visibility", value)
                            this.state.maskDisplay!.visibility = value
                        }
                        else
                            this.state.maskDisplay!.visibility = value
                        this.state.maskBackground!.visibility = value
                    }
                    setOnce(0.000000001)
                    this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                        setOnce(0)
                        this.state.maskDisplay!.setEnabled(false)
                        this.state.maskBackground!.setEnabled(false)
                        if (this.originalCamera !== null)
                            this.state.scene!.activeCamera = this.originalCamera
                        await this.material.unapplyDisplayMaterial("mask", this.state.maskDisplay!)
                    })
                }
            }
        }
    }
}

