/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }              from "./app-render-api"
import Utils, { type ChromaKey } from "./app-render-utils"

/*  import internal dependencies (shared)  */
import { type StateTypePartial } from "../common/app-state"

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
    async reflectSceneState (state: StateTypePartial["hologram"]) {
        /*  sanity check situation  */
        if (!(this.hull !== null
            && this.display !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.display.isMediaModified(this.api.display.displaySource("hologram"))
            && this.display.isEnabled())
            await this.api.display.applyDisplayMaterial("hologram", this.display,
                this.opacity, this.borderRad, this.borderCrop, this.chromaKey)

        /*  reflect scene changes  */
        if (state !== undefined) {
            /*  update content  */
            if (state.source !== undefined
                && (this.api.display.displaySource("hologram") !== state.source
                    || this.api.display.isMediaModified(state.source))) {
                this.api.display.displaySource("hologram", state.source)
                if (this.display.isEnabled())
                    await this.api.display.applyDisplayMaterial("hologram", this.display,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
            }

            /*  update size  */
            if (state.scale !== undefined) {
                this.display.scaling.x = this.base.scaleX * state.scale
                this.display.scaling.y = this.base.scaleY * state.scale
                this.display.scaling.z = this.base.scaleZ * state.scale
            }

            /*  update rotation  */
            if (state.rotate !== undefined) {
                this.hull.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.hull.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.rotate), BABYLON.Space.WORLD)
            }

            /*  update position  */
            if (state.lift !== undefined)
                this.hull.position.z = this.base.positionZ + state.lift
            if (state.distance !== undefined)
                this.display.position.x = this.base.positionX - state.distance

            /*  update fading  */
            if (state.fadeTime !== undefined && this.fade !== state.fadeTime)
                this.fade = state.fadeTime

            /*  update opacity  */
            if (state.opacity !== undefined) {
                this.opacity = state.opacity
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("opacity", this.opacity)
                }
            }

            /*  update border  */
            if (state.borderRad !== undefined) {
                this.borderRad = state.borderRad
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("borderRadius", this.borderRad)
                }
            }
            if (state.borderCrop !== undefined) {
                this.borderCrop = state.borderCrop
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("borderCrop", this.borderCrop)
                }
            }

            /*  update chroma-keying  */
            if (state.chromaKey !== undefined) {
                if (state.chromaKey.enable !== undefined
                    && this.chromaKey.enable !== state.chromaKey.enable) {
                    this.chromaKey.enable = state.chromaKey.enable
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setInt("chromaEnable", this.chromaKey.enable ? 1 : 0)
                    }
                }
                if (state.chromaKey.threshold !== undefined
                    && this.chromaKey.threshold !== state.chromaKey.threshold) {
                    this.chromaKey.threshold = state.chromaKey.threshold
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaThreshold", this.chromaKey.threshold)
                    }
                }
                if (state.chromaKey.smoothing !== undefined
                    && this.chromaKey.smoothing !== state.chromaKey.smoothing) {
                    this.chromaKey.smoothing = state.chromaKey.smoothing
                    if (this.chromaKey.enable
                        && this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaSmoothing", this.chromaKey.smoothing)
                    }
                }
            }

            /*  update visibility  */
            if (state.enable !== undefined
                && this.display.isEnabled() !== state.enable) {
                if (state.enable) {
                    /*  enable visibility  */
                    await this.api.display.applyDisplayMaterial("hologram", this.display,
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
                else if (!state.enable) {
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
                            await this.api.display.unapplyDisplayMaterial("hologram", this.display!)
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
                            await this.api.display.unapplyDisplayMaterial("hologram", this.display!)
                        })
                    }
                }
            }
        }
    }
}

