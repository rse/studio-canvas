/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import State                  from "./app-render-state"
import Utils                  from "./app-render-utils"
import AppRenderMaterial      from "./app-render-material"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class AppRenderPlate {
    constructor (
        private state:    State,
        private material: AppRenderMaterial,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to plate mesh nodes  */
        this.state.plate        = this.state.scene!.getNodeByName("Plate")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.plateDisplay = this.state.scene!.getMeshByName("Plate-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.plate === null || this.state.plateDisplay === null)
            throw new Error("cannot find plate mesh nodes")
        if (this.state.layer === "front")
            this.state.plateDisplay.setEnabled(false)

        /*  initialize plate base values  */
        this.state.plateBase.scaleDisplayX = this.state.plateDisplay!.scaling.x
        this.state.plateBase.scaleDisplayY = this.state.plateDisplay!.scaling.y
        this.state.plateBase.scaleDisplayZ = this.state.plateDisplay!.scaling.z
        this.state.plateBase.rotationZ     = this.state.plate!.rotation.z
        this.state.plateBase.positionZ     = this.state.plate!.position.z
        this.state.plateBase.positionX     = this.state.plateDisplay!.position.x
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.state.plate !== null
            && this.state.plateDisplay !== null
            && this.state.layer === "front"))
            return

        /*  update already active media receivers  */
        if (this.state.modifiedMedia[this.material.mapMediaId(this.state.displaySourceMap.plate)]
            && this.state.plateDisplay.isEnabled())
            await this.material.applyDisplayMaterial("plate", this.state.plateDisplay, this.state.plateOpacity, this.state.plateBorderRad, this.state.plateBorderCrop, this.state.plateChromaKey)

        /*  reflect scene changes  */
        if (state.plate !== undefined) {
            if (state.plate.source !== undefined
                && (this.state.displaySourceMap.plate !== state.plate.source
                    || this.state.modifiedMedia[this.material.mapMediaId(state.plate.source)])) {
                this.state.displaySourceMap.plate = state.plate.source
                if (this.state.plateDisplay.isEnabled())
                    await this.material.applyDisplayMaterial("plate", this.state.plateDisplay, this.state.plateOpacity, this.state.plateBorderRad, this.state.plateBorderCrop, this.state.plateChromaKey)
            }
            if (state.plate.scale !== undefined) {
                this.state.plateDisplay.scaling.x = this.state.plateBase.scaleDisplayX * state.plate.scale
                this.state.plateDisplay.scaling.y = this.state.plateBase.scaleDisplayY * state.plate.scale
                this.state.plateDisplay.scaling.z = this.state.plateBase.scaleDisplayZ * state.plate.scale
            }
            if (state.plate.rotate !== undefined) {
                this.state.plate.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.plate.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.plate.rotate), BABYLON.Space.WORLD)
            }
            if (state.plate.lift !== undefined)
                this.state.plate.position.z = this.state.plateBase.positionZ + state.plate.lift
            if (state.plate.distance !== undefined)
                this.state.plateDisplay.position.x = this.state.plateBase.positionX - state.plate.distance
            if (state.plate.fadeTime !== undefined && this.state.plateFade !== state.plate.fadeTime)
                this.state.plateFade = state.plate.fadeTime
            if (state.plate.opacity !== undefined) {
                this.state.plateOpacity = state.plate.opacity
                if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.plateDisplay.material
                    material.setFloat("opacity", this.state.plateOpacity)
                }
            }
            if (state.plate.borderRad !== undefined) {
                this.state.plateBorderRad = state.plate.borderRad
                if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.plateDisplay.material
                    material.setFloat("borderRadius", this.state.plateBorderRad)
                }
            }
            if (state.plate.borderCrop !== undefined) {
                this.state.plateBorderCrop = state.plate.borderCrop
                if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.plateDisplay.material
                    material.setFloat("borderCrop", this.state.plateBorderCrop)
                }
            }
            if (state.plate.chromaKey !== undefined) {
                if (state.plate.chromaKey.enable !== undefined && this.state.plateChromaKey.enable !== state.plate.chromaKey.enable) {
                    this.state.plateChromaKey.enable = state.plate.chromaKey.enable
                    if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.plateDisplay.material
                        material.setInt("chromaEnable", this.state.plateChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.plate.chromaKey.threshold !== undefined && this.state.plateChromaKey.threshold !== state.plate.chromaKey.threshold) {
                    this.state.plateChromaKey.threshold = state.plate.chromaKey.threshold
                    if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.plateDisplay.material
                        material.setFloat("chromaThreshold", this.state.plateChromaKey.threshold)
                    }
                }
                if (state.plate.chromaKey.smoothing !== undefined && this.state.plateChromaKey.smoothing !== state.plate.chromaKey.smoothing) {
                    this.state.plateChromaKey.smoothing = state.plate.chromaKey.smoothing
                    if (this.state.plateChromaKey.enable && this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.plateDisplay.material
                        material.setFloat("chromaSmoothing", this.state.plateChromaKey.smoothing)
                    }
                }
            }
            if (state.plate.enable !== undefined && this.state.plateDisplay.isEnabled() !== state.plate.enable) {
                if (state.plate.enable) {
                    await this.material.applyDisplayMaterial("plate", this.state.plateDisplay, this.state.plateOpacity, this.state.plateBorderRad, this.state.plateBorderCrop, this.state.plateChromaKey)
                    if (this.state.plateFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "enabling plate (fading: start)")
                        if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.plateDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.state.plateDisplay.visibility = 1.0
                        }
                        else
                            this.state.plateDisplay.visibility = 0.0
                        this.state.plateDisplay.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.state.plateFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.plateDisplay!.visibility = gradient
                        }).then(() => {
                            this.log("INFO", "enabling plate (fading: end)")
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.state.plateDisplay!.visibility = 1.0
                            }
                            else
                                this.state.plateDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.log("INFO", "enabling plate")
                        if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.plateDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.state.plateDisplay!.visibility = 1.0
                        }
                        else
                            this.state.plateDisplay!.visibility = 1.0
                        this.state.plateDisplay!.setEnabled(true)
                    }
                }
                else if (!state.plate.enable) {
                    if (this.state.plateFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "disabling plate (fading: start)")
                        if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.plateDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.state.plateDisplay.visibility = 1.0
                        }
                        else
                            this.state.plateDisplay.visibility = 1.0
                        this.state.plateDisplay.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.state.plateFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.plateDisplay!.visibility = gradient
                        }).then(async () => {
                            this.log("INFO", "disabling plate (fading: end)")
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.plateDisplay!.visibility = 0.0
                            }
                            else
                                this.state.plateDisplay!.visibility = 0.0
                            this.state.plateDisplay!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("plate", this.state.plateDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling plate")
                        const setOnce = (value: number) => {
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", value)
                                this.state.plateDisplay!.visibility = value
                            }
                            else
                                this.state.plateDisplay!.visibility = value
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.state.plateDisplay!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("plate", this.state.plateDisplay!)
                        })
                    }
                }
            }
        }
    }
}

