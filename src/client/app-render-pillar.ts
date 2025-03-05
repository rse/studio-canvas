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
import { StateTypePartial }      from "../common/app-state"

/*  exported rendering feature  */
export default class Pillar {
    /*  internal state  */
    private hull:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private case:      BABYLON.Nullable<BABYLON.Mesh>           = null
    private display:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private fade       = 0
    private opacity    = 1.0
    private borderRad  = 40.0
    private borderCrop = 0.0
    private chromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private base       = {
        scaleX:        0, scaleY:           0, scaleZ:        0,
        rotationZ:     0, positionZ:        0,
        positionCaseX: 0, positionDisplayX: 0
    }

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to pillar mesh nodes  */
        const scene  = this.api.scene.getScene()
        this.hull    = scene.getNodeByName("Pillar")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.case    = scene.getMeshByName("Pillar-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.display = scene.getMeshByName("Pillar-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.hull === null || this.case === null || this.display === null)
            throw new Error("cannot find pillar mesh nodes")
        if (this.api.scene.renderingLayer("back"))
            this.hull.setEnabled(false)

        /*  initialize pillar base values  */
        this.base.scaleX           = this.hull.scaling.x
        this.base.scaleY           = this.hull.scaling.y
        this.base.scaleZ           = this.hull.scaling.z
        this.base.rotationZ        = this.hull.rotation.z
        this.base.positionZ        = this.hull.position.z
        this.base.positionCaseX    = this.case.position.x
        this.base.positionDisplayX = this.display.position.x

        /*  register pillar for shadow casting  */
        this.api.lights.addShadowCastingMesh(this.case)
        this.api.lights.addShadowCastingMesh(this.display)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial["pillar"]) {
        /*  sanity check situation  */
        if (!(this.hull !== null
            && this.case !== null
            && this.display !== null
            && this.api.scene.renderingLayer("back")))
            return

        /*  update already active media receivers  */
        if (this.api.display.isMediaModified(this.api.display.displaySource("pillar"))
            && this.display.isEnabled())
            await this.api.display.applyDisplayMaterial("pillar", this.display,
                this.opacity, 0, 0, this.chromaKey)

        /*  reflect state changes  */
        if (state !== undefined) {
            /*  update content  */
            if (state.source !== undefined
                && (this.api.display.displaySource("pillar") !== state.source
                    || this.api.display.isMediaModified(state.source))) {
                this.api.display.displaySource("pillar", state.source)
                if (this.display.isEnabled())
                    await this.api.display.applyDisplayMaterial("pillar", this.display,
                        this.opacity, 0, 0, this.chromaKey)
            }

            /*  update opacity  */
            if (state.opacity !== undefined) {
                this.opacity = state.opacity
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("opacity", this.opacity)
                }
            }

            /*  update scaling  */
            if (state.scale !== undefined) {
                this.hull.scaling.x = this.base.scaleX * state.scale
                this.hull.scaling.y = this.base.scaleY * state.scale
                this.hull.scaling.z = this.base.scaleZ * state.scale
            }

            /*  update rotation  */
            if (state.rotate !== undefined) {
                this.hull.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.hull.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.rotate), BABYLON.Space.WORLD)
            }

            /*  update vertical position  */
            if (state.lift !== undefined)
                this.hull.position.z = this.base.positionZ + (state.lift / 100)

            /*  update distance  */
            if (state.distance !== undefined) {
                this.case.position.x    = this.base.positionCaseX    - state.distance
                this.display.position.x = this.base.positionDisplayX - state.distance
            }

            /*  update fading  */
            if (state.fadeTime !== undefined && this.fade !== state.fadeTime)
                this.fade = state.fadeTime

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
                    if (this.chromaKey.enable && this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaSmoothing", this.chromaKey.smoothing)
                    }
                }
            }

            /*  update visibility  */
            if (state.enable !== undefined
                && this.hull.isEnabled() !== state.enable) {
                if (state.enable) {
                    /*  enable visibility  */
                    await this.api.display.applyDisplayMaterial("pillar", this.display,
                        this.opacity, 0, 0, this.chromaKey)
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  enable visibility with fading  */
                        this.api.renderer.log("INFO", "enabling pillar (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.fade * fps
                        this.case.material!.alpha = 0
                        this.case.material!.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
                        this.case.material!.backFaceCulling = true
                        this.case.material!.forceDepthWrite = true
                        this.case.receiveShadows = true
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.case,
                            "material.alpha", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
                                this.case!.material!.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE
                            })!
                        if (this.display.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.hull.setEnabled(true)
                        this.case.visibility = 1
                        this.case.setEnabled(true)
                        this.display.visibility = 1
                        this.display.setEnabled(true)
                        const anim2 = Utils.manualAnimation(0, 1, this.fade, fps, (gradient) => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.api.renderer.log("INFO", "enabling pillar (fading: end)")
                        })
                    }
                    else {
                        /*  enable visibility without fading  */
                        this.api.renderer.log("INFO", "enabling pillar")
                        this.case.visibility    = 1
                        this.display.visibility = 1
                        this.case.setEnabled(true)
                        this.display.setEnabled(true)
                        this.hull.setEnabled(true)
                    }
                }
                else if (!state.enable) {
                    /*  disable visibility  */
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  disable visibility with fading  */
                        this.api.renderer.log("INFO", "disabling pillar (fading: start)")
                        this.case.material!.alpha = 1
                        this.case.material!.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
                        this.case.visibility = 1
                        this.case.setEnabled(true)
                        this.display.visibility = 1
                        this.display.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.fade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.case,
                            "material.alpha", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.display.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.display.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = Utils.manualAnimation(1, 0, this.fade, fps, (gradient) => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.api.renderer.log("INFO", "disabling pillar (fading: end)")
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", 0.0)
                                this.display!.visibility = 0.0
                                this.case!.visibility = 0.0
                            }
                            else  {
                                this.display!.visibility = 0.0
                                this.case!.visibility = 0.0
                            }
                            this.case!.setEnabled(false)
                            this.display!.setEnabled(false)
                            this.hull!.setEnabled(false)
                            await this.api.display.unapplyDisplayMaterial("pillar", this.display!)
                        })
                    }
                    else {
                        /*  disable visibility without fading  */
                        this.api.renderer.log("INFO", "disabling pillar")
                        const setOnce = (value: number) => {
                            if (this.display!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.display!.material
                                material.setFloat("visibility", value)
                                this.display!.visibility = value
                                this.case!.visibility = value
                            }
                            else {
                                this.display!.visibility = value
                                this.case!.visibility = value
                            }
                        }
                        setOnce(0.000000001)
                        this.api.scene.getScene().onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.case!.setEnabled(false)
                            this.display!.setEnabled(false)
                            this.hull!.setEnabled(false)
                            await this.api.display.unapplyDisplayMaterial("pillar", this.display!)
                        })
                    }
                }
            }
        }
    }
}

