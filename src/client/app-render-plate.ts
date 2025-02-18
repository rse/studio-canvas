/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }              from "./app-render-api"
import State, { type ChromaKey } from "./app-render-state"
import Utils                     from "./app-render-utils"

/*  import internal dependencies (shared)  */
import { StateTypePartial }      from "../common/app-state"

export default class Plate {
    private plate:           BABYLON.Nullable<BABYLON.TransformNode>  = null
    private plateDisplay:    BABYLON.Nullable<BABYLON.Mesh>           = null
    private plateFade        = 0
    private plateOpacity     = 1.0
    private plateBorderRad   = 40.0
    private plateBorderCrop  = 0.0
    private plateChromaKey   = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private plateBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0, positionX:     0
    }

    constructor (
        private api:      API,
        private state:    State,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to plate mesh nodes  */
        this.plate        = this.state.scene!.getNodeByName("Plate")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.plateDisplay = this.state.scene!.getMeshByName("Plate-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.plate === null || this.plateDisplay === null)
            throw new Error("cannot find plate mesh nodes")
        if (this.api.scene.renderingLayer("front"))
            this.plateDisplay.setEnabled(false)

        /*  initialize plate base values  */
        this.plateBase.scaleDisplayX = this.plateDisplay!.scaling.x
        this.plateBase.scaleDisplayY = this.plateDisplay!.scaling.y
        this.plateBase.scaleDisplayZ = this.plateDisplay!.scaling.z
        this.plateBase.rotationZ     = this.plate!.rotation.z
        this.plateBase.positionZ     = this.plate!.position.z
        this.plateBase.positionX     = this.plateDisplay!.position.x
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.plate !== null
            && this.plateDisplay !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("plate"))
            && this.plateDisplay.isEnabled())
            await this.api.material.applyDisplayMaterial("plate", this.plateDisplay, this.plateOpacity, this.plateBorderRad, this.plateBorderCrop, this.plateChromaKey)

        /*  reflect scene changes  */
        if (state.plate !== undefined) {
            if (state.plate.source !== undefined
                && (this.api.material.displaySource("plate") !== state.plate.source
                    || this.api.material.isMediaModified(state.plate.source))) {
                this.api.material.displaySource("plate", state.plate.source)
                if (this.plateDisplay.isEnabled())
                    await this.api.material.applyDisplayMaterial("plate", this.plateDisplay, this.plateOpacity, this.plateBorderRad, this.plateBorderCrop, this.plateChromaKey)
            }
            if (state.plate.scale !== undefined) {
                this.plateDisplay.scaling.x = this.plateBase.scaleDisplayX * state.plate.scale
                this.plateDisplay.scaling.y = this.plateBase.scaleDisplayY * state.plate.scale
                this.plateDisplay.scaling.z = this.plateBase.scaleDisplayZ * state.plate.scale
            }
            if (state.plate.rotate !== undefined) {
                this.plate.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.plate.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.plate.rotate), BABYLON.Space.WORLD)
            }
            if (state.plate.lift !== undefined)
                this.plate.position.z = this.plateBase.positionZ + state.plate.lift
            if (state.plate.distance !== undefined)
                this.plateDisplay.position.x = this.plateBase.positionX - state.plate.distance
            if (state.plate.fadeTime !== undefined && this.plateFade !== state.plate.fadeTime)
                this.plateFade = state.plate.fadeTime
            if (state.plate.opacity !== undefined) {
                this.plateOpacity = state.plate.opacity
                if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.plateDisplay.material
                    material.setFloat("opacity", this.plateOpacity)
                }
            }
            if (state.plate.borderRad !== undefined) {
                this.plateBorderRad = state.plate.borderRad
                if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.plateDisplay.material
                    material.setFloat("borderRadius", this.plateBorderRad)
                }
            }
            if (state.plate.borderCrop !== undefined) {
                this.plateBorderCrop = state.plate.borderCrop
                if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.plateDisplay.material
                    material.setFloat("borderCrop", this.plateBorderCrop)
                }
            }
            if (state.plate.chromaKey !== undefined) {
                if (state.plate.chromaKey.enable !== undefined && this.plateChromaKey.enable !== state.plate.chromaKey.enable) {
                    this.plateChromaKey.enable = state.plate.chromaKey.enable
                    if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.plateDisplay.material
                        material.setInt("chromaEnable", this.plateChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.plate.chromaKey.threshold !== undefined && this.plateChromaKey.threshold !== state.plate.chromaKey.threshold) {
                    this.plateChromaKey.threshold = state.plate.chromaKey.threshold
                    if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.plateDisplay.material
                        material.setFloat("chromaThreshold", this.plateChromaKey.threshold)
                    }
                }
                if (state.plate.chromaKey.smoothing !== undefined && this.plateChromaKey.smoothing !== state.plate.chromaKey.smoothing) {
                    this.plateChromaKey.smoothing = state.plate.chromaKey.smoothing
                    if (this.plateChromaKey.enable && this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.plateDisplay.material
                        material.setFloat("chromaSmoothing", this.plateChromaKey.smoothing)
                    }
                }
            }
            if (state.plate.enable !== undefined && this.plateDisplay.isEnabled() !== state.plate.enable) {
                if (state.plate.enable) {
                    await this.api.material.applyDisplayMaterial("plate", this.plateDisplay, this.plateOpacity, this.plateBorderRad, this.plateBorderCrop, this.plateChromaKey)
                    if (this.plateFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "enabling plate (fading: start)")
                        if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.plateDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.plateDisplay.visibility = 1.0
                        }
                        else
                            this.plateDisplay.visibility = 0.0
                        this.plateDisplay.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.plateFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.plateDisplay!.visibility = gradient
                        }).then(() => {
                            this.log("INFO", "enabling plate (fading: end)")
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.plateDisplay!.visibility = 1.0
                            }
                            else
                                this.plateDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.log("INFO", "enabling plate")
                        if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.plateDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.plateDisplay!.visibility = 1.0
                        }
                        else
                            this.plateDisplay!.visibility = 1.0
                        this.plateDisplay!.setEnabled(true)
                    }
                }
                else if (!state.plate.enable) {
                    if (this.plateFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "disabling plate (fading: start)")
                        if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.plateDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.plateDisplay.visibility = 1.0
                        }
                        else
                            this.plateDisplay.visibility = 1.0
                        this.plateDisplay.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.plateFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.plateDisplay!.visibility = gradient
                        }).then(async () => {
                            this.log("INFO", "disabling plate (fading: end)")
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.plateDisplay!.visibility = 0.0
                            }
                            else
                                this.plateDisplay!.visibility = 0.0
                            this.plateDisplay!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("plate", this.plateDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling plate")
                        const setOnce = (value: number) => {
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", value)
                                this.plateDisplay!.visibility = value
                            }
                            else
                                this.plateDisplay!.visibility = value
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.plateDisplay!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("plate", this.plateDisplay!)
                        })
                    }
                }
            }
        }
    }
}

