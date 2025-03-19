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
export default class Pane {
    /*  internal state  */
    private hull:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private case:      BABYLON.Nullable<BABYLON.Mesh>           = null
    private display:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private fade       = 0
    private opacity    = 1.0
    private chromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private base       = {
        scaleCaseX:    0, scaleCaseY:       0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY:    0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:        0,
        positionCaseX: 0, positionDisplayX: 0
    }

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to pane mesh nodes  */
        const scene  = this.api.scene.getScene()
        this.hull    = scene.getNodeByName("Pane")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.case    = scene.getMeshByName("Pane-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.display = scene.getMeshByName("Pane-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.hull === null || this.case === null || this.display === null)
            throw new Error("cannot find pane mesh nodes")
        if (this.api.scene.renderingLayer("front"))
            this.hull.setEnabled(false)

        /*  initialize pane base values  */
        this.base.scaleCaseX       = this.case.scaling.x
        this.base.scaleCaseY       = this.case.scaling.y
        this.base.scaleCaseZ       = this.case.scaling.z
        this.base.scaleDisplayX    = this.display.scaling.x
        this.base.scaleDisplayY    = this.display.scaling.y
        this.base.scaleDisplayZ    = this.display.scaling.z
        this.base.rotationZ        = this.hull.rotation.z
        this.base.positionZ        = this.hull.position.z
        this.base.positionCaseX    = this.case.position.x
        this.base.positionDisplayX = this.display.position.x

        /*  apply glass material to pane case  */
        const glass = new BABYLON.PBRMaterial("glass", scene)
        glass.indexOfRefraction    = 1.52
        glass.alpha                = 0.20
        glass.directIntensity      = 1.0
        glass.environmentIntensity = 1.0
        glass.microSurface         = 1
        glass.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.case.material = glass

        /*  register pane for shadow casting  */
        this.api.lights.addShadowCastingMesh(this.case)
        this.api.lights.addShadowCastingMesh(this.display)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial["pane"]) {
        /*  sanity check situation  */
        if (!(this.hull !== null
            && this.case !== null
            && this.display !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.display.isMediaModified(this.api.display.displaySource("pane"))
            && this.display.isEnabled())
            await this.api.display.applyDisplayMaterial("pane", this.display,
                this.opacity, 0, 0, this.chromaKey)

        /*  reflect scene changes  */
        if (state !== undefined) {
            /*  update content  */
            if (state.source !== undefined
                && (this.api.display.displaySource("pane") !== state.source
                    || this.api.display.isMediaModified(state.source))) {
                this.api.display.displaySource("pane", state.source)
                if (this.display.isEnabled())
                    await this.api.display.applyDisplayMaterial("pane", this.display,
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
                this.case.scaling.x    = this.base.scaleCaseX    * state.scale
                this.case.scaling.y    = this.base.scaleCaseY    * state.scale
                this.case.scaling.z    = this.base.scaleCaseZ    * state.scale
                this.display.scaling.x = this.base.scaleDisplayX * state.scale
                this.display.scaling.y = this.base.scaleDisplayY * state.scale
                this.display.scaling.z = this.base.scaleDisplayZ * state.scale
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
                    await this.api.display.applyDisplayMaterial("pane", this.display,
                        this.opacity, 0, 0, this.chromaKey)
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  enable visibility with fading  */
                        this.api.renderer.log("INFO", "enabling pane (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.fade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.case,
                            "visibility", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
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
                            this.api.renderer.log("INFO", "enabling pane (fading: end)")
                        })
                    }
                    else {
                        /*  enable visibility without fading  */
                        this.api.renderer.log("INFO", "enabling pane")
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
                        this.api.renderer.log("INFO", "disabling pane (fading: start)")
                        this.case.visibility = 1
                        this.case.setEnabled(true)
                        this.display.visibility = 1
                        this.display.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.fade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.case,
                            "visibility", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
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
                            this.api.renderer.log("INFO", "disabling pane (fading: end)")
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
                            await this.api.display.unapplyDisplayMaterial("pane", this.display!)
                        })
                    }
                    else {
                        /*  disable visibility without fading  */
                        this.api.renderer.log("INFO", "disabling pane")
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
                            await this.api.display.unapplyDisplayMaterial("pane", this.display!)
                        })
                    }
                }
            }
        }
    }
}

