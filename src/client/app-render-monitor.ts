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

export default class AppRenderMonitor {
    constructor (
        private state:    State,
        private material: AppRenderMaterial,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to monitor mesh nodes  */
        this.state.monitor        = this.state.scene!.getNodeByName("Monitor")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.monitorCase    = this.state.scene!.getMeshByName("Monitor-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.state.monitorDisplay = this.state.scene!.getMeshByName("Monitor-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.monitor === null || this.state.monitorCase === null || this.state.monitorDisplay === null)
            throw new Error("cannot find monitor mesh nodes")
        if (this.state.layer === "back")
            this.state.monitor.setEnabled(false)

        /*  initialize monitor base values  */
        this.state.monitorBase.scaleCaseX       = this.state.monitorCase.scaling.x
        this.state.monitorBase.scaleCaseY       = this.state.monitorCase.scaling.y
        this.state.monitorBase.scaleCaseZ       = this.state.monitorCase.scaling.z
        this.state.monitorBase.scaleDisplayX    = this.state.monitorDisplay.scaling.x
        this.state.monitorBase.scaleDisplayY    = this.state.monitorDisplay.scaling.y
        this.state.monitorBase.scaleDisplayZ    = this.state.monitorDisplay.scaling.z
        this.state.monitorBase.rotationZ        = this.state.monitor.rotation.z
        this.state.monitorBase.positionZ        = this.state.monitor.position.z
        this.state.monitorBase.positionCaseX    = this.state.monitorCase.position.x
        this.state.monitorBase.positionDisplayX = this.state.monitorDisplay.position.x

        /*  apply glass material to monitor case  */
        const glass1 = new BABYLON.PBRMaterial("glass1", this.state.scene!)
        glass1.indexOfRefraction    = 1.52
        glass1.alpha                = 0.20
        glass1.directIntensity      = 1.0
        glass1.environmentIntensity = 1.0
        glass1.microSurface         = 1
        glass1.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass1.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.state.monitorCase.material = glass1
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.state.monitor !== null
            && this.state.monitorCase !== null
            && this.state.monitorDisplay !== null
            && this.state.layer === "back"))
            return

        /*  update already active media receivers  */
        if (this.state.modifiedMedia[this.material.mapMediaId(this.state.displaySourceMap.monitor)]
            && this.state.monitorDisplay.isEnabled())
            await this.material.applyDisplayMaterial("monitor", this.state.monitorDisplay, this.state.monitorOpacity, 0, 0, this.state.monitorChromaKey)

        /*  reflect state changes  */
        if (state.monitor !== undefined) {
            if (state.monitor.source !== undefined
                && (this.state.displaySourceMap.monitor !== state.monitor.source
                    || this.state.modifiedMedia[this.material.mapMediaId(state.monitor.source)])) {
                this.state.displaySourceMap.monitor = state.monitor.source
                if (this.state.monitorDisplay.isEnabled())
                    await this.material.applyDisplayMaterial("monitor", this.state.monitorDisplay!, this.state.monitorOpacity, 0, 0, this.state.monitorChromaKey)
            }
            if (state.monitor.opacity !== undefined) {
                this.state.monitorOpacity = state.monitor.opacity
                if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.monitorDisplay.material
                    material.setFloat("opacity", this.state.monitorOpacity)
                }
            }
            if (state.monitor.scale !== undefined) {
                this.state.monitorCase.scaling.x    = this.state.monitorBase.scaleCaseX    * state.monitor.scale
                this.state.monitorCase.scaling.y    = this.state.monitorBase.scaleCaseY    * state.monitor.scale
                this.state.monitorCase.scaling.z    = this.state.monitorBase.scaleCaseZ    * state.monitor.scale
                this.state.monitorDisplay.scaling.x = this.state.monitorBase.scaleDisplayX * state.monitor.scale
                this.state.monitorDisplay.scaling.y = this.state.monitorBase.scaleDisplayY * state.monitor.scale
                this.state.monitorDisplay.scaling.z = this.state.monitorBase.scaleDisplayZ * state.monitor.scale
            }
            if (state.monitor.rotate !== undefined) {
                this.state.monitor.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.monitor.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.monitor.rotate), BABYLON.Space.WORLD)
            }
            if (state.monitor.lift !== undefined)
                this.state.monitor.position.z = this.state.monitorBase.positionZ + (state.monitor.lift / 100)
            if (state.monitor.distance !== undefined) {
                this.state.monitorCase.position.x    = this.state.monitorBase.positionCaseX    - state.monitor.distance
                this.state.monitorDisplay.position.x = this.state.monitorBase.positionDisplayX - state.monitor.distance
            }
            if (state.monitor.fadeTime !== undefined && this.state.monitorFade !== state.monitor.fadeTime)
                this.state.monitorFade = state.monitor.fadeTime
            if (state.monitor.chromaKey !== undefined) {
                if (state.monitor.chromaKey.enable !== undefined && this.state.monitorChromaKey.enable !== state.monitor.chromaKey.enable) {
                    this.state.monitorChromaKey.enable = state.monitor.chromaKey.enable
                    if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.monitorDisplay.material
                        material.setInt("chromaEnable", this.state.monitorChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.monitor.chromaKey.threshold !== undefined && this.state.monitorChromaKey.threshold !== state.monitor.chromaKey.threshold) {
                    this.state.monitorChromaKey.threshold = state.monitor.chromaKey.threshold
                    if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.monitorDisplay.material
                        material.setFloat("chromaThreshold", this.state.monitorChromaKey.threshold)
                    }
                }
                if (state.monitor.chromaKey.smoothing !== undefined && this.state.monitorChromaKey.smoothing !== state.monitor.chromaKey.smoothing) {
                    this.state.monitorChromaKey.smoothing = state.monitor.chromaKey.smoothing
                    if (this.state.monitorChromaKey.enable && this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.monitorDisplay.material
                        material.setFloat("chromaSmoothing", this.state.monitorChromaKey.smoothing)
                    }
                }
            }
            if (state.monitor.enable !== undefined && this.state.monitorDisplay.isEnabled() !== state.monitor.enable) {
                if (state.monitor.enable) {
                    await this.material.applyDisplayMaterial("monitor", this.state.monitorDisplay!, this.state.monitorOpacity, 0, 0, this.state.monitorChromaKey)
                    if (this.state.monitorFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "enabling monitor (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.monitorFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.state.monitorCase,
                            "visibility", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.state.monitor.setEnabled(true)
                        this.state.monitorCase.visibility = 1
                        this.state.monitorCase.setEnabled(true)
                        this.state.monitorDisplay.visibility = 1
                        this.state.monitorDisplay.setEnabled(true)
                        const anim2 = Utils.manualAnimation(0, 1, this.state.monitorFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.log("INFO", "enabling monitor (fading: end)")
                        })
                    }
                    else {
                        this.log("INFO", "enabling monitor")
                        this.state.monitorCase.visibility    = 1
                        this.state.monitorDisplay.visibility = 1
                        this.state.monitorCase.setEnabled(true)
                        this.state.monitorDisplay.setEnabled(true)
                        this.state.monitor.setEnabled(true)
                    }
                }
                else if (!state.monitor.enable) {
                    if (this.state.monitorFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "disabling monitor (fading: start)")
                        this.state.monitorCase.visibility = 1
                        this.state.monitorCase.setEnabled(true)
                        this.state.monitorDisplay.visibility = 1
                        this.state.monitorDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.monitorFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.state.monitorCase,
                            "visibility", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.monitorDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = Utils.manualAnimation(1, 0, this.state.monitorFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.log("INFO", "disabling monitor (fading: end)")
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.monitorDisplay!.visibility = 0.0
                                this.state.monitorCase!.visibility = 0.0
                            }
                            else  {
                                this.state.monitorDisplay!.visibility = 0.0
                                this.state.monitorCase!.visibility = 0.0
                            }
                            this.state.monitorCase!.setEnabled(false)
                            this.state.monitorDisplay!.setEnabled(false)
                            this.state.monitor!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("monitor", this.state.monitorDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling monitor")
                        if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.state.monitorDisplay.visibility = 0.0
                            this.state.monitorCase.visibility = 0.0
                        }
                        else {
                            this.state.monitorDisplay.visibility = 0.0
                            this.state.monitorCase.visibility = 0.0
                        }
                        this.state.monitorCase.setEnabled(false)
                        this.state.monitorDisplay.setEnabled(false)
                        this.state.monitor.setEnabled(false)
                        await this.material.unapplyDisplayMaterial("monitor", this.state.monitorDisplay!)
                    }
                }
            }
        }
    }
}

