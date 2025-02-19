/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }              from "./app-render-api"
import Utils, { type ChromaKey } from "./app-render-utils"

/*  import internal dependencies (shared)  */
import { StateTypePartial }      from "../common/app-state"

export default class Hologram {
    private hologram:        BABYLON.Nullable<BABYLON.TransformNode>  = null
    private hologramDisplay: BABYLON.Nullable<BABYLON.Mesh>           = null
    private hologramFade         = 0
    private hologramOpacity      = 1.0
    private hologramBorderRad    = 40.0
    private hologramBorderCrop   = 0.0
    private hologramChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private hologramBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0, positionX:     0
    }

    constructor (
        private api:      API,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to hologram mesh nodes  */
        this.hologram        = this.api.scene.getScene().getNodeByName("Hologram")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.hologramDisplay = this.api.scene.getScene().getMeshByName("Hologram-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.hologram === null || this.hologramDisplay === null)
            throw new Error("cannot find hologram mesh nodes")
        if (this.api.scene.renderingLayer("front"))
            this.hologramDisplay.setEnabled(false)

        /*  initialize hologram base values  */
        this.hologramBase.scaleDisplayX = this.hologramDisplay!.scaling.x
        this.hologramBase.scaleDisplayY = this.hologramDisplay!.scaling.y
        this.hologramBase.scaleDisplayZ = this.hologramDisplay!.scaling.z
        this.hologramBase.rotationZ     = this.hologram!.rotation.z
        this.hologramBase.positionZ     = this.hologram!.position.z
        this.hologramBase.positionX     = this.hologramDisplay!.position.x
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.hologram !== null
            && this.hologramDisplay !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("hologram"))
            && this.hologramDisplay.isEnabled())
            await this.api.material.applyDisplayMaterial("hologram", this.hologramDisplay, this.hologramOpacity, this.hologramBorderRad, this.hologramBorderCrop, this.hologramChromaKey)

        /*  reflect scene changes  */
        if (state.hologram !== undefined) {
            if (state.hologram.source !== undefined
                && (this.api.material.displaySource("hologram") !== state.hologram.source
                    || this.api.material.isMediaModified(state.hologram.source))) {
                this.api.material.displaySource("hologram", state.hologram.source)
                if (this.hologramDisplay.isEnabled())
                    await this.api.material.applyDisplayMaterial("hologram", this.hologramDisplay, this.hologramOpacity, this.hologramBorderRad, this.hologramBorderCrop, this.hologramChromaKey)
            }
            if (state.hologram.scale !== undefined) {
                this.hologramDisplay.scaling.x = this.hologramBase.scaleDisplayX * state.hologram.scale
                this.hologramDisplay.scaling.y = this.hologramBase.scaleDisplayY * state.hologram.scale
                this.hologramDisplay.scaling.z = this.hologramBase.scaleDisplayZ * state.hologram.scale
            }
            if (state.hologram.rotate !== undefined) {
                this.hologram.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.hologram.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.hologram.rotate), BABYLON.Space.WORLD)
            }
            if (state.hologram.lift !== undefined)
                this.hologram.position.z = this.hologramBase.positionZ + state.hologram.lift
            if (state.hologram.distance !== undefined)
                this.hologramDisplay.position.x = this.hologramBase.positionX - state.hologram.distance
            if (state.hologram.fadeTime !== undefined && this.hologramFade !== state.hologram.fadeTime)
                this.hologramFade = state.hologram.fadeTime
            if (state.hologram.opacity !== undefined) {
                this.hologramOpacity = state.hologram.opacity
                if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.hologramDisplay.material
                    material.setFloat("opacity", this.hologramOpacity)
                }
            }
            if (state.hologram.borderRad !== undefined) {
                this.hologramBorderRad = state.hologram.borderRad
                if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.hologramDisplay.material
                    material.setFloat("borderRadius", this.hologramBorderRad)
                }
            }
            if (state.hologram.borderCrop !== undefined) {
                this.hologramBorderCrop = state.hologram.borderCrop
                if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.hologramDisplay.material
                    material.setFloat("borderCrop", this.hologramBorderCrop)
                }
            }
            if (state.hologram.chromaKey !== undefined) {
                if (state.hologram.chromaKey.enable !== undefined && this.hologramChromaKey.enable !== state.hologram.chromaKey.enable) {
                    this.hologramChromaKey.enable = state.hologram.chromaKey.enable
                    if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.hologramDisplay.material
                        material.setInt("chromaEnable", this.hologramChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.hologram.chromaKey.threshold !== undefined && this.hologramChromaKey.threshold !== state.hologram.chromaKey.threshold) {
                    this.hologramChromaKey.threshold = state.hologram.chromaKey.threshold
                    if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.hologramDisplay.material
                        material.setFloat("chromaThreshold", this.hologramChromaKey.threshold)
                    }
                }
                if (state.hologram.chromaKey.smoothing !== undefined && this.hologramChromaKey.smoothing !== state.hologram.chromaKey.smoothing) {
                    this.hologramChromaKey.smoothing = state.hologram.chromaKey.smoothing
                    if (this.hologramChromaKey.enable && this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.hologramDisplay.material
                        material.setFloat("chromaSmoothing", this.hologramChromaKey.smoothing)
                    }
                }
            }
            if (state.hologram.enable !== undefined && this.hologramDisplay.isEnabled() !== state.hologram.enable) {
                if (state.hologram.enable) {
                    await this.api.material.applyDisplayMaterial("hologram", this.hologramDisplay, this.hologramOpacity, this.hologramBorderRad, this.hologramBorderCrop, this.hologramChromaKey)
                    if (this.hologramFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "enabling hologram (fading: start)")
                        if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.hologramDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.hologramDisplay.visibility = 0.0
                        this.hologramDisplay.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.hologramFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.hologramDisplay!.visibility = gradient
                        }).then(() => {
                            this.log("INFO", "enabling hologram (fading: end)")
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.hologramDisplay!.visibility = 1.0
                            }
                            else
                                this.hologramDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.log("INFO", "enabling hologram")
                        if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.hologramDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.hologramDisplay!.visibility = 1.0
                        }
                        else
                            this.hologramDisplay!.visibility = 1.0
                        this.hologramDisplay!.setEnabled(true)
                    }
                }
                else if (!state.hologram.enable) {
                    if (this.hologramFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "disabling hologram (fading: start)")
                        if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.hologramDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.hologramDisplay.visibility = 1.0
                        this.hologramDisplay.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.hologramFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.hologramDisplay!.visibility = gradient
                        }).then(async () => {
                            this.log("INFO", "disabling hologram (fading: end)")
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.hologramDisplay!.visibility = 0.0
                            }
                            else
                                this.hologramDisplay!.visibility = 0.0
                            this.hologramDisplay!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("hologram", this.hologramDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling hologram")
                        const setOnce = (value: number) => {
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", value)
                                this.hologramDisplay!.visibility = value
                            }
                            else
                                this.hologramDisplay!.visibility = value
                        }
                        setOnce(0.000000001)
                        this.api.scene.getScene().onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.hologramDisplay!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("hologram", this.hologramDisplay!)
                        })
                    }
                }
            }
        }
    }
}

