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
export default class Pane {
    /*  internal state  */
    private pane:      BABYLON.Nullable<BABYLON.TransformNode>  = null
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
        this.pane    = scene.getNodeByName("Pane")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.case    = scene.getMeshByName("Pane-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.display = scene.getMeshByName("Pane-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.pane === null || this.case === null || this.display === null)
            throw new Error("cannot find pane mesh nodes")
        if (this.api.scene.renderingLayer("front"))
            this.pane.setEnabled(false)

        /*  initialize pane base values  */
        this.base.scaleCaseX          = this.case.scaling.x
        this.base.scaleCaseY          = this.case.scaling.y
        this.base.scaleCaseZ          = this.case.scaling.z
        this.base.scaleDisplayX       = this.display.scaling.x
        this.base.scaleDisplayY       = this.display.scaling.y
        this.base.scaleDisplayZ       = this.display.scaling.z
        this.base.rotationZ           = this.pane.rotation.z
        this.base.positionZ           = this.pane.position.z
        this.base.positionCaseX       = this.case.position.x
        this.base.positionDisplayX    = this.display.position.x

        /*  apply glass material to pane case  */
        const glass2 = new BABYLON.PBRMaterial("glass2", scene)
        glass2.indexOfRefraction    = 1.52
        glass2.alpha                = 0.20
        glass2.directIntensity      = 1.0
        glass2.environmentIntensity = 1.0
        glass2.microSurface         = 1
        glass2.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass2.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.case.material = glass2

        /*  register pane for shadow casting  */
        this.api.lights.addShadowCastingMesh(this.case)
        this.api.lights.addShadowCastingMesh(this.display)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.pane !== null
            && this.case !== null
            && this.display !== null
            && this.api.scene.renderingLayer("front")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("pane"))
            && this.display.isEnabled())
            await this.api.material.applyDisplayMaterial("pane", this.display,
                this.opacity, 0, 0, this.chromaKey)

        /*  reflect scene changes  */
        if (state.pane !== undefined) {
            /*  update content  */
            if (state.pane.source !== undefined
                && (this.api.material.displaySource("pane") !== state.pane.source
                    || this.api.material.isMediaModified(state.pane.source))) {
                this.api.material.displaySource("pane", state.pane.source)
                if (this.display.isEnabled())
                    await this.api.material.applyDisplayMaterial("pane", this.display,
                        this.opacity, 0, 0, this.chromaKey)
            }

            /*  update opacity  */
            if (state.pane.opacity !== undefined) {
                this.opacity = state.pane.opacity
                if (this.display.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.display.material
                    material.setFloat("opacity", this.opacity)
                }
            }

            /*  update scaling  */
            if (state.pane.scale !== undefined) {
                this.case.scaling.x    = this.base.scaleCaseX    * state.pane.scale
                this.case.scaling.y    = this.base.scaleCaseY    * state.pane.scale
                this.case.scaling.z    = this.base.scaleCaseZ    * state.pane.scale
                this.display.scaling.x = this.base.scaleDisplayX * state.pane.scale
                this.display.scaling.y = this.base.scaleDisplayY * state.pane.scale
                this.display.scaling.z = this.base.scaleDisplayZ * state.pane.scale
            }

            /*  update rotation  */
            if (state.pane.rotate !== undefined) {
                this.pane.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.pane.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.pane.rotate), BABYLON.Space.WORLD)
            }

            /*  update vertical position  */
            if (state.pane.lift !== undefined)
                this.pane.position.z = this.base.positionZ + (state.pane.lift / 100)

            /*  update distance  */
            if (state.pane.lift !== undefined)
            if (state.pane.distance !== undefined) {
                this.case.position.x    = this.base.positionCaseX    - state.pane.distance
                this.display.position.x = this.base.positionDisplayX - state.pane.distance
            }

            /*  update fading  */
            if (state.pane.fadeTime !== undefined && this.fade !== state.pane.fadeTime)
                this.fade = state.pane.fadeTime

            /*  update chroma-keying  */
            if (state.pane.chromaKey !== undefined) {
                if (state.pane.chromaKey.enable !== undefined
                    && this.chromaKey.enable !== state.pane.chromaKey.enable) {
                    this.chromaKey.enable = state.pane.chromaKey.enable
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setInt("chromaEnable", this.chromaKey.enable ? 1 : 0)
                    }
                }
                if (state.pane.chromaKey.threshold !== undefined
                    && this.chromaKey.threshold !== state.pane.chromaKey.threshold) {
                    this.chromaKey.threshold = state.pane.chromaKey.threshold
                    if (this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaThreshold", this.chromaKey.threshold)
                    }
                }
                if (state.pane.chromaKey.smoothing !== undefined
                    && this.chromaKey.smoothing !== state.pane.chromaKey.smoothing) {
                    this.chromaKey.smoothing = state.pane.chromaKey.smoothing
                    if (this.chromaKey.enable && this.display.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.display.material
                        material.setFloat("chromaSmoothing", this.chromaKey.smoothing)
                    }
                }
            }

            /*  update visibility  */
            if (state.pane.enable !== undefined
                && this.pane.isEnabled() !== state.pane.enable) {
                if (state.pane.enable) {
                    /*  enable visibility  */
                    await this.api.material.applyDisplayMaterial("pane", this.display,
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
                        this.pane.setEnabled(true)
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
                        this.pane.setEnabled(true)
                    }
                }
                else if (!state.pane.enable) {
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
                            this.pane!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("pane", this.display!)
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
                            this.pane!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("pane", this.display!)
                        })
                    }
                }
            }
        }
    }
}

