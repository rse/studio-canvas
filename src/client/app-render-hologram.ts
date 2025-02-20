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
export default class Hologram {
    /*  internal state  */
    private hull:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private display:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private fade       = 0
    private opacity    = 1.0
    private borderRad  = 40.0
    private borderCrop = 0.0
    private chromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private base = {
        scaleX: 0, scaleY: 0, scaleZ: 0,
        rotationZ: 0, positionZ: 0, positionX: 0
    }

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to hologram mesh nodes  */
        const scene = this.api.scene.getScene()
        this.hull = scene.getNodeByName("Hologram") as
            BABYLON.Nullable<BABYLON.TransformNode>
        this.display = scene.getMeshByName("Hologram-Display") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (this.hull === null || this.display === null)
            throw new Error("cannot find hologram mesh nodes")
        if (this.api.scene.renderingLayer("front"))
            this.display.setEnabled(false)

        /*  initialize hologram base values  */
        this.base.scaleX    = this.display.scaling.x
        this.base.scaleY    = this.display.scaling.y
        this.base.scaleZ    = this.display.scaling.z
        this.base.rotationZ = this.hull.rotation.z
        this.base.positionZ = this.hull.position.z
        this.base.positionX = this.display.position.x
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.hull !== null
            && this.display !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("hologram"))
            && this.display.isEnabled())
            await this.api.material.applyDisplayMaterial("hologram", this.display,
                this.opacity, this.borderRad, this.borderCrop, this.chromaKey)

        /*  reflect scene changes  */
        if (state.hologram !== undefined) {
            /*  update content  */
            if (state.hologram.source !== undefined
                && (this.api.material.displaySource("hologram") !== state.hologram.source
                    || this.api.material.isMediaModified(state.hologram.source))) {
                this.api.material.displaySource("hologram", state.hologram.source)
                if (this.display.isEnabled())
                    await this.api.material.applyDisplayMaterial("hologram", this.display,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
            }

            /*  update size  */
            if (state.hologram.scale !== undefined) {
                this.display.scaling.x = this.base.scaleX * state.hologram.scale
                this.display.scaling.y = this.base.scaleY * state.hologram.scale
                this.display.scaling.z = this.base.scaleZ * state.hologram.scale
            }

            /*  update rotation  */
            if (state.hologram.rotate !== undefined) {
                this.hull.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.hull.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.hologram.rotate), BABYLON.Space.WORLD)
            }

            /*  update position  */
            if (state.hologram.lift !== undefined)
                this.hull.position.z = this.base.positionZ + state.hologram.lift
            if (state.hologram.distance !== undefined)
                this.display.position.x = this.base.positionX - state.hologram.distance

            /*  update fading  */
            if (state.hologram.fadeTime !== undefined && this.fade !== state.hologram.fadeTime)
                this.fade = state.hologram.fadeTime

            /*  update opacity  */
            if (state.hologram.opacity !== undefined) {
                this.opacity = state.hologram.opacity
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("opacity", this.opacity)
                }
            }

            /*  update border  */
            if (state.hologram.borderRad !== undefined) {
                this.borderRad = state.hologram.borderRad
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("borderRadius", this.borderRad)
                }
            }
            if (state.hologram.borderCrop !== undefined) {
                this.borderCrop = state.hologram.borderCrop
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("borderCrop", this.borderCrop)
                }
            }

            /*  update chroma-keying  */
            if (state.hologram.chromaKey !== undefined) {
                if (state.hologram.chromaKey.enable !== undefined
                    && this.chromaKey.enable !== state.hologram.chromaKey.enable) {
                    this.chromaKey.enable = state.hologram.chromaKey.enable
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setInt("chromaEnable", this.chromaKey.enable ? 1 : 0)
                    }
                }
                if (state.hologram.chromaKey.threshold !== undefined
                    && this.chromaKey.threshold !== state.hologram.chromaKey.threshold) {
                    this.chromaKey.threshold = state.hologram.chromaKey.threshold
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaThreshold", this.chromaKey.threshold)
                    }
                }
                if (state.hologram.chromaKey.smoothing !== undefined
                    && this.chromaKey.smoothing !== state.hologram.chromaKey.smoothing) {
                    this.chromaKey.smoothing = state.hologram.chromaKey.smoothing
                    if (this.chromaKey.enable
                        && this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaSmoothing", this.chromaKey.smoothing)
                    }
                }
            }

            /*  update visibility  */
            if (state.hologram.enable !== undefined
                && this.display.isEnabled() !== state.hologram.enable) {
                if (state.hologram.enable) {
                    /*  enable visibility  */
                    await this.api.material.applyDisplayMaterial("hologram", this.display,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  enable visibility with fading  */
                        this.api.renderer.log("INFO", "enabling hologram (fading: start)")
                        if (this.display.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display.material
                            material.setFloat("visibility", 0.0)
                            this.display.visibility = 1.0
                        }
                        else
                            this.display.visibility = 0.0
                        this.display.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.fade,
                            (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()),
                            (gradient) => {
                                if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                    const material = this.display!.material
                                    material.setFloat("visibility", gradient)
                                }
                                else
                                    this.display!.visibility = gradient
                            }
                        ).then(() => {
                            this.api.renderer.log("INFO", "enabling hologram (fading: end)")
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
                        this.api.renderer.log("INFO", "enabling hologram")
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
                else if (!state.hologram.enable) {
                    /*  disable visibility  */
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  disable visibility with fading  */
                        this.api.renderer.log("INFO", "disabling hologram (fading: start)")
                        if (this.display.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display.material
                            material.setFloat("visibility", 1.0)
                            this.display.visibility = 1.0
                        }
                        else
                            this.display.visibility = 1.0
                        this.display.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.fade,
                            (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()),
                            (gradient) => {
                                if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                    const material = this.display!.material
                                    material.setFloat("visibility", gradient)
                                }
                                else
                                    this.display!.visibility = gradient
                            }
                        ).then(async () => {
                            this.api.renderer.log("INFO", "disabling hologram (fading: end)")
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", 0.0)
                                this.display!.visibility = 0.0
                            }
                            else
                                this.display!.visibility = 0.0
                            this.display!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("hologram", this.display!)
                        })
                    }
                    else {
                        /*  disable visibility without fading  */
                        this.api.renderer.log("INFO", "disabling hologram")
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
                            await this.api.material.unapplyDisplayMaterial("hologram", this.display!)
                        })
                    }
                }
            }
        }
    }
}

