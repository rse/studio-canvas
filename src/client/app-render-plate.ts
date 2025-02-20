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

/*  exported rendering feature  */
export default class Plate {
    /*  internal state  */
    private hull:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private display:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private fade       = 0
    private opacity    = 1.0
    private borderRad  = 40.0
    private borderCrop = 0.0
    private chromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private base       = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0, positionX:     0
    }

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to plate mesh nodes  */
        const scene  = this.api.scene.getScene()
        this.hull    = scene.getNodeByName("Plate")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.display = scene.getMeshByName("Plate-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.hull === null || this.display === null)
            throw new Error("cannot find plate mesh nodes")
        if (this.api.scene.renderingLayer("front"))
            this.display.setEnabled(false)

        /*  initialize plate base values  */
        this.base.scaleDisplayX = this.display.scaling.x
        this.base.scaleDisplayY = this.display.scaling.y
        this.base.scaleDisplayZ = this.display.scaling.z
        this.base.rotationZ     = this.hull.rotation.z
        this.base.positionZ     = this.hull.position.z
        this.base.positionX     = this.display.position.x
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.hull !== null
            && this.display !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("plate"))
            && this.display.isEnabled())
            await this.api.material.applyDisplayMaterial("plate", this.display,
                this.opacity, this.borderRad, this.borderCrop, this.chromaKey)

        /*  reflect scene changes  */
        if (state.plate !== undefined) {
            /*  update content  */
            if (state.plate.source !== undefined
                && (this.api.material.displaySource("plate") !== state.plate.source
                    || this.api.material.isMediaModified(state.plate.source))) {
                this.api.material.displaySource("plate", state.plate.source)
                if (this.display.isEnabled())
                    await this.api.material.applyDisplayMaterial("plate", this.display,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
            }

            /*  update scaling  */
            if (state.plate.scale !== undefined) {
                this.display.scaling.x = this.base.scaleDisplayX * state.plate.scale
                this.display.scaling.y = this.base.scaleDisplayY * state.plate.scale
                this.display.scaling.z = this.base.scaleDisplayZ * state.plate.scale
            }

            /*  update rotation  */
            if (state.plate.rotate !== undefined) {
                this.hull.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.hull.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.plate.rotate), BABYLON.Space.WORLD)
            }

            /*  update vertical position  */
            if (state.plate.lift !== undefined)
                this.hull.position.z = this.base.positionZ + state.plate.lift

            /*  update distance  */
            if (state.plate.distance !== undefined)
                this.display.position.x = this.base.positionX - state.plate.distance

            /*  update fading  */
            if (state.plate.fadeTime !== undefined && this.fade !== state.plate.fadeTime)
                this.fade = state.plate.fadeTime

            /*  update opacity  */
            if (state.plate.opacity !== undefined) {
                this.opacity = state.plate.opacity
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("opacity", this.opacity)
                }
            }

            /*  update border  */
            if (state.plate.borderRad !== undefined) {
                this.borderRad = state.plate.borderRad
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("borderRadius", this.borderRad)
                }
            }
            if (state.plate.borderCrop !== undefined) {
                this.borderCrop = state.plate.borderCrop
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("borderCrop", this.borderCrop)
                }
            }

            /*  update chroma-keying  */
            if (state.plate.chromaKey !== undefined) {
                if (state.plate.chromaKey.enable !== undefined
                    && this.chromaKey.enable !== state.plate.chromaKey.enable) {
                    this.chromaKey.enable = state.plate.chromaKey.enable
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setInt("chromaEnable", this.chromaKey.enable ? 1 : 0)
                    }
                }
                if (state.plate.chromaKey.threshold !== undefined
                    && this.chromaKey.threshold !== state.plate.chromaKey.threshold) {
                    this.chromaKey.threshold = state.plate.chromaKey.threshold
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaThreshold", this.chromaKey.threshold)
                    }
                }
                if (state.plate.chromaKey.smoothing !== undefined
                    && this.chromaKey.smoothing !== state.plate.chromaKey.smoothing) {
                    this.chromaKey.smoothing = state.plate.chromaKey.smoothing
                    if (this.chromaKey.enable && this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaSmoothing", this.chromaKey.smoothing)
                    }
                }
            }

            /*  update visibility  */
            if (state.plate.enable !== undefined
                && this.display.isEnabled() !== state.plate.enable) {
                if (state.plate.enable) {
                    /*  enable visibility  */
                    await this.api.material.applyDisplayMaterial("plate", this.display,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  enable visibility with fading  */
                        this.api.renderer.log("INFO", "enabling plate (fading: start)")
                        if (this.display.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display.material
                            material.setFloat("visibility", 0.0)
                            this.display.visibility = 1.0
                        }
                        else
                            this.display.visibility = 0.0
                        this.display.setEnabled(true)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        await Utils.manualAnimation(0, 1, this.fade, fps, (gradient) => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.display!.visibility = gradient
                        }).then(() => {
                            this.api.renderer.log("INFO", "enabling plate (fading: end)")
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", 1.0)
                                this.display!.visibility = 1.0
                            }
                            else
                                this.display!.visibility = 1.0
                        })
                    }
                    else {
                        /*  enable visibility without fading  */
                        this.api.renderer.log("INFO", "enabling plate")
                        if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display!.material
                            material.setFloat("visibility", 1.0)
                            this.display!.visibility = 1.0
                        }
                        else
                            this.display!.visibility = 1.0
                        this.display!.setEnabled(true)
                    }
                }
                else if (!state.plate.enable) {
                    /*  disable visibility  */
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  disable visibility with fading  */
                        this.api.renderer.log("INFO", "disabling plate (fading: start)")
                        if (this.display.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display.material
                            material.setFloat("visibility", 1.0)
                            this.display.visibility = 1.0
                        }
                        else
                            this.display.visibility = 1.0
                        this.display.setEnabled(true)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        await Utils.manualAnimation(1, 0, this.fade, fps, (gradient) => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.display!.visibility = gradient
                        }).then(async () => {
                            this.api.renderer.log("INFO", "disabling plate (fading: end)")
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", 0.0)
                                this.display!.visibility = 0.0
                            }
                            else
                                this.display!.visibility = 0.0
                            this.display!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("plate", this.display!)
                        })
                    }
                    else {
                        /*  disable visibility without fading  */
                        this.api.renderer.log("INFO", "disabling plate")
                        const setOnce = (value: number) => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", value)
                                this.display!.visibility = value
                            }
                            else
                                this.display!.visibility = value
                        }
                        setOnce(0.000000001)
                        this.api.scene.getScene().onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.display!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("plate", this.display!)
                        })
                    }
                }
            }
        }
    }
}

