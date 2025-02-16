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
        /*  gather references to hologram mesh nodes  */
        this.state.hologram        = this.state.scene!.getNodeByName("Hologram")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.hologramDisplay = this.state.scene!.getMeshByName("Hologram-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.hologram === null || this.state.hologramDisplay === null)
            throw new Error("cannot find hologram mesh nodes")
        if (this.state.layer === "front")
            this.state.hologramDisplay.setEnabled(false)

        /*  initialize hologram base values  */
        this.state.hologramBase.scaleDisplayX = this.state.hologramDisplay!.scaling.x
        this.state.hologramBase.scaleDisplayY = this.state.hologramDisplay!.scaling.y
        this.state.hologramBase.scaleDisplayZ = this.state.hologramDisplay!.scaling.z
        this.state.hologramBase.rotationZ     = this.state.hologram!.rotation.z
        this.state.hologramBase.positionZ     = this.state.hologram!.position.z
        this.state.hologramBase.positionX     = this.state.hologramDisplay!.position.x
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.state.hologram !== null
            && this.state.hologramDisplay !== null
            && this.state.layer === "front"))
            return

        /*  update already active media receivers  */
        if (this.state.modifiedMedia[this.material.mapMediaId(this.state.displaySourceMap.hologram)]
            && this.state.hologramDisplay.isEnabled())
            await this.material.applyDisplayMaterial("hologram", this.state.hologramDisplay, this.state.hologramOpacity, this.state.hologramBorderRad, this.state.hologramBorderCrop, this.state.hologramChromaKey)

        /*  reflect scene changes  */
        if (state.hologram !== undefined) {
            if (state.hologram.source !== undefined
                && (this.state.displaySourceMap.hologram !== state.hologram.source
                    || this.state.modifiedMedia[this.material.mapMediaId(state.hologram.source)])) {
                this.state.displaySourceMap.hologram = state.hologram.source
                if (this.state.hologramDisplay.isEnabled())
                    await this.material.applyDisplayMaterial("hologram", this.state.hologramDisplay, this.state.hologramOpacity, this.state.hologramBorderRad, this.state.hologramBorderCrop, this.state.hologramChromaKey)
            }
            if (state.hologram.scale !== undefined) {
                this.state.hologramDisplay.scaling.x = this.state.hologramBase.scaleDisplayX * state.hologram.scale
                this.state.hologramDisplay.scaling.y = this.state.hologramBase.scaleDisplayY * state.hologram.scale
                this.state.hologramDisplay.scaling.z = this.state.hologramBase.scaleDisplayZ * state.hologram.scale
            }
            if (state.hologram.rotate !== undefined) {
                this.state.hologram.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.hologram.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.hologram.rotate), BABYLON.Space.WORLD)
            }
            if (state.hologram.lift !== undefined)
                this.state.hologram.position.z = this.state.hologramBase.positionZ + state.hologram.lift
            if (state.hologram.distance !== undefined)
                this.state.hologramDisplay.position.x = this.state.hologramBase.positionX - state.hologram.distance
            if (state.hologram.fadeTime !== undefined && this.state.hologramFade !== state.hologram.fadeTime)
                this.state.hologramFade = state.hologram.fadeTime
            if (state.hologram.opacity !== undefined) {
                this.state.hologramOpacity = state.hologram.opacity
                if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.hologramDisplay.material
                    material.setFloat("opacity", this.state.hologramOpacity)
                }
            }
            if (state.hologram.borderRad !== undefined) {
                this.state.hologramBorderRad = state.hologram.borderRad
                if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.hologramDisplay.material
                    material.setFloat("borderRadius", this.state.hologramBorderRad)
                }
            }
            if (state.hologram.borderCrop !== undefined) {
                this.state.hologramBorderCrop = state.hologram.borderCrop
                if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.hologramDisplay.material
                    material.setFloat("borderCrop", this.state.hologramBorderCrop)
                }
            }
            if (state.hologram.chromaKey !== undefined) {
                if (state.hologram.chromaKey.enable !== undefined && this.state.hologramChromaKey.enable !== state.hologram.chromaKey.enable) {
                    this.state.hologramChromaKey.enable = state.hologram.chromaKey.enable
                    if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.hologramDisplay.material
                        material.setInt("chromaEnable", this.state.hologramChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.hologram.chromaKey.threshold !== undefined && this.state.hologramChromaKey.threshold !== state.hologram.chromaKey.threshold) {
                    this.state.hologramChromaKey.threshold = state.hologram.chromaKey.threshold
                    if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.hologramDisplay.material
                        material.setFloat("chromaThreshold", this.state.hologramChromaKey.threshold)
                    }
                }
                if (state.hologram.chromaKey.smoothing !== undefined && this.state.hologramChromaKey.smoothing !== state.hologram.chromaKey.smoothing) {
                    this.state.hologramChromaKey.smoothing = state.hologram.chromaKey.smoothing
                    if (this.state.hologramChromaKey.enable && this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.hologramDisplay.material
                        material.setFloat("chromaSmoothing", this.state.hologramChromaKey.smoothing)
                    }
                }
            }
            if (state.hologram.enable !== undefined && this.state.hologramDisplay.isEnabled() !== state.hologram.enable) {
                if (state.hologram.enable) {
                    await this.material.applyDisplayMaterial("hologram", this.state.hologramDisplay, this.state.hologramOpacity, this.state.hologramBorderRad, this.state.hologramBorderCrop, this.state.hologramChromaKey)
                    if (this.state.hologramFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "enabling hologram (fading: start)")
                        if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.hologramDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.state.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.state.hologramDisplay.visibility = 0.0
                        this.state.hologramDisplay.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.state.hologramFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.hologramDisplay!.visibility = gradient
                        }).then(() => {
                            this.log("INFO", "enabling hologram (fading: end)")
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.state.hologramDisplay!.visibility = 1.0
                            }
                            else
                                this.state.hologramDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.log("INFO", "enabling hologram")
                        if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.hologramDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.state.hologramDisplay!.visibility = 1.0
                        }
                        else
                            this.state.hologramDisplay!.visibility = 1.0
                        this.state.hologramDisplay!.setEnabled(true)
                    }
                }
                else if (!state.hologram.enable) {
                    if (this.state.hologramFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "disabling hologram (fading: start)")
                        if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.hologramDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.state.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.state.hologramDisplay.visibility = 1.0
                        this.state.hologramDisplay.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.state.hologramFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.hologramDisplay!.visibility = gradient
                        }).then(async () => {
                            this.log("INFO", "disabling hologram (fading: end)")
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.hologramDisplay!.visibility = 0.0
                            }
                            else
                                this.state.hologramDisplay!.visibility = 0.0
                            this.state.hologramDisplay!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("hologram", this.state.hologramDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling hologram")
                        const setOnce = (value: number) => {
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", value)
                                this.state.hologramDisplay!.visibility = value
                            }
                            else
                                this.state.hologramDisplay!.visibility = value
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.state.hologramDisplay!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("hologram", this.state.hologramDisplay!)
                        })
                    }
                }
            }
        }
    }
}

