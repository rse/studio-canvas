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

export default class Monitor {
    private monitor:          BABYLON.Nullable<BABYLON.TransformNode>  = null
    private monitorCase:      BABYLON.Nullable<BABYLON.Mesh>           = null
    private monitorDisplay:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private monitorFade       = 0
    private monitorOpacity    = 1.0
    private monitorChromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private monitorBase       = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }

    constructor (
        private api:      API,
        private state:    State,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to monitor mesh nodes  */
        this.monitor        = this.state.scene!.getNodeByName("Monitor")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.monitorCase    = this.state.scene!.getMeshByName("Monitor-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.monitorDisplay = this.state.scene!.getMeshByName("Monitor-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.monitor === null || this.monitorCase === null || this.monitorDisplay === null)
            throw new Error("cannot find monitor mesh nodes")
        if (this.api.scene.renderingLayer("back"))
            this.monitor.setEnabled(false)

        /*  initialize monitor base values  */
        this.monitorBase.scaleCaseX       = this.monitorCase.scaling.x
        this.monitorBase.scaleCaseY       = this.monitorCase.scaling.y
        this.monitorBase.scaleCaseZ       = this.monitorCase.scaling.z
        this.monitorBase.scaleDisplayX    = this.monitorDisplay.scaling.x
        this.monitorBase.scaleDisplayY    = this.monitorDisplay.scaling.y
        this.monitorBase.scaleDisplayZ    = this.monitorDisplay.scaling.z
        this.monitorBase.rotationZ        = this.monitor.rotation.z
        this.monitorBase.positionZ        = this.monitor.position.z
        this.monitorBase.positionCaseX    = this.monitorCase.position.x
        this.monitorBase.positionDisplayX = this.monitorDisplay.position.x

        /*  apply glass material to monitor case  */
        const glass1 = new BABYLON.PBRMaterial("glass1", this.state.scene!)
        glass1.indexOfRefraction    = 1.52
        glass1.alpha                = 0.20
        glass1.directIntensity      = 1.0
        glass1.environmentIntensity = 1.0
        glass1.microSurface         = 1
        glass1.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass1.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.monitorCase.material = glass1

        /*  register monitor for shadow casting  */
        this.state.shadowCastingMeshes.push(this.monitorDisplay!)
        this.state.shadowCastingMeshes.push(this.monitorCase!)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.monitor !== null
            && this.monitorCase !== null
            && this.monitorDisplay !== null
            && this.api.scene.renderingLayer("back")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.state.displaySourceMap.monitor)
            && this.monitorDisplay.isEnabled())
            await this.api.material.applyDisplayMaterial("monitor", this.monitorDisplay, this.monitorOpacity, 0, 0, this.monitorChromaKey)

        /*  reflect state changes  */
        if (state.monitor !== undefined) {
            if (state.monitor.source !== undefined
                && (this.state.displaySourceMap.monitor !== state.monitor.source
                    || this.api.material.isMediaModified(state.monitor.source))) {
                this.state.displaySourceMap.monitor = state.monitor.source
                if (this.monitorDisplay.isEnabled())
                    await this.api.material.applyDisplayMaterial("monitor", this.monitorDisplay!, this.monitorOpacity, 0, 0, this.monitorChromaKey)
            }
            if (state.monitor.opacity !== undefined) {
                this.monitorOpacity = state.monitor.opacity
                if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.monitorDisplay.material
                    material.setFloat("opacity", this.monitorOpacity)
                }
            }
            if (state.monitor.scale !== undefined) {
                this.monitorCase.scaling.x    = this.monitorBase.scaleCaseX    * state.monitor.scale
                this.monitorCase.scaling.y    = this.monitorBase.scaleCaseY    * state.monitor.scale
                this.monitorCase.scaling.z    = this.monitorBase.scaleCaseZ    * state.monitor.scale
                this.monitorDisplay.scaling.x = this.monitorBase.scaleDisplayX * state.monitor.scale
                this.monitorDisplay.scaling.y = this.monitorBase.scaleDisplayY * state.monitor.scale
                this.monitorDisplay.scaling.z = this.monitorBase.scaleDisplayZ * state.monitor.scale
            }
            if (state.monitor.rotate !== undefined) {
                this.monitor.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.monitor.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.monitor.rotate), BABYLON.Space.WORLD)
            }
            if (state.monitor.lift !== undefined)
                this.monitor.position.z = this.monitorBase.positionZ + (state.monitor.lift / 100)
            if (state.monitor.distance !== undefined) {
                this.monitorCase.position.x    = this.monitorBase.positionCaseX    - state.monitor.distance
                this.monitorDisplay.position.x = this.monitorBase.positionDisplayX - state.monitor.distance
            }
            if (state.monitor.fadeTime !== undefined && this.monitorFade !== state.monitor.fadeTime)
                this.monitorFade = state.monitor.fadeTime
            if (state.monitor.chromaKey !== undefined) {
                if (state.monitor.chromaKey.enable !== undefined && this.monitorChromaKey.enable !== state.monitor.chromaKey.enable) {
                    this.monitorChromaKey.enable = state.monitor.chromaKey.enable
                    if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.monitorDisplay.material
                        material.setInt("chromaEnable", this.monitorChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.monitor.chromaKey.threshold !== undefined && this.monitorChromaKey.threshold !== state.monitor.chromaKey.threshold) {
                    this.monitorChromaKey.threshold = state.monitor.chromaKey.threshold
                    if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.monitorDisplay.material
                        material.setFloat("chromaThreshold", this.monitorChromaKey.threshold)
                    }
                }
                if (state.monitor.chromaKey.smoothing !== undefined && this.monitorChromaKey.smoothing !== state.monitor.chromaKey.smoothing) {
                    this.monitorChromaKey.smoothing = state.monitor.chromaKey.smoothing
                    if (this.monitorChromaKey.enable && this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.monitorDisplay.material
                        material.setFloat("chromaSmoothing", this.monitorChromaKey.smoothing)
                    }
                }
            }
            if (state.monitor.enable !== undefined && this.monitorDisplay.isEnabled() !== state.monitor.enable) {
                if (state.monitor.enable) {
                    await this.api.material.applyDisplayMaterial("monitor", this.monitorDisplay!, this.monitorOpacity, 0, 0, this.monitorChromaKey)
                    if (this.monitorFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "enabling monitor (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.monitorFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.monitorCase,
                            "visibility", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.monitor.setEnabled(true)
                        this.monitorCase.visibility = 1
                        this.monitorCase.setEnabled(true)
                        this.monitorDisplay.visibility = 1
                        this.monitorDisplay.setEnabled(true)
                        const anim2 = Utils.manualAnimation(0, 1, this.monitorFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.log("INFO", "enabling monitor (fading: end)")
                        })
                    }
                    else {
                        this.log("INFO", "enabling monitor")
                        this.monitorCase.visibility    = 1
                        this.monitorDisplay.visibility = 1
                        this.monitorCase.setEnabled(true)
                        this.monitorDisplay.setEnabled(true)
                        this.monitor.setEnabled(true)
                    }
                }
                else if (!state.monitor.enable) {
                    if (this.monitorFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "disabling monitor (fading: start)")
                        this.monitorCase.visibility = 1
                        this.monitorCase.setEnabled(true)
                        this.monitorDisplay.visibility = 1
                        this.monitorDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.monitorFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.monitorCase,
                            "visibility", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.monitorDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = Utils.manualAnimation(1, 0, this.monitorFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.log("INFO", "disabling monitor (fading: end)")
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.monitorDisplay!.visibility = 0.0
                                this.monitorCase!.visibility = 0.0
                            }
                            else  {
                                this.monitorDisplay!.visibility = 0.0
                                this.monitorCase!.visibility = 0.0
                            }
                            this.monitorCase!.setEnabled(false)
                            this.monitorDisplay!.setEnabled(false)
                            this.monitor!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("monitor", this.monitorDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling monitor")
                        if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.monitorDisplay.visibility = 0.0
                            this.monitorCase.visibility = 0.0
                        }
                        else {
                            this.monitorDisplay.visibility = 0.0
                            this.monitorCase.visibility = 0.0
                        }
                        this.monitorCase.setEnabled(false)
                        this.monitorDisplay.setEnabled(false)
                        this.monitor.setEnabled(false)
                        await this.api.material.unapplyDisplayMaterial("monitor", this.monitorDisplay!)
                    }
                }
            }
        }
    }
}

