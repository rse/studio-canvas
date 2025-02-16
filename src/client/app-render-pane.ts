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

export default class AppRenderPane {
    constructor (
        private state:    State,
        private material: AppRenderMaterial,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to pane mesh nodes  */
        this.state.pane        = this.state.scene!.getNodeByName("Pane")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.paneCase    = this.state.scene!.getMeshByName("Pane-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.state.paneDisplay = this.state.scene!.getMeshByName("Pane-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.pane === null || this.state.paneCase === null || this.state.paneDisplay === null)
            throw new Error("cannot find pane mesh nodes")
        if (this.state.layer === "front")
            this.state.pane.setEnabled(false)

        /*  initialize pane base values  */
        this.state.paneBase.scaleCaseX          = this.state.paneCase.scaling.x
        this.state.paneBase.scaleCaseY          = this.state.paneCase.scaling.y
        this.state.paneBase.scaleCaseZ          = this.state.paneCase.scaling.z
        this.state.paneBase.scaleDisplayX       = this.state.paneDisplay.scaling.x
        this.state.paneBase.scaleDisplayY       = this.state.paneDisplay.scaling.y
        this.state.paneBase.scaleDisplayZ       = this.state.paneDisplay.scaling.z
        this.state.paneBase.rotationZ           = this.state.pane.rotation.z
        this.state.paneBase.positionZ           = this.state.pane.position.z
        this.state.paneBase.positionCaseX       = this.state.paneCase.position.x
        this.state.paneBase.positionDisplayX    = this.state.paneDisplay.position.x

        /*  apply glass material to pane case  */
        const glass2 = new BABYLON.PBRMaterial("glass2", this.state.scene!)
        glass2.indexOfRefraction    = 1.52
        glass2.alpha                = 0.20
        glass2.directIntensity      = 1.0
        glass2.environmentIntensity = 1.0
        glass2.microSurface         = 1
        glass2.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass2.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.state.paneCase.material = glass2
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.state.pane !== null
            && this.state.paneCase !== null
            && this.state.paneDisplay !== null
            && this.state.layer === "front"))
            return

        /*  update already active media receivers  */
        if (this.state.modifiedMedia[this.material.mapMediaId(this.state.displaySourceMap.pane)]
            && this.state.paneDisplay.isEnabled())
            await this.material.applyDisplayMaterial("pane", this.state.paneDisplay, this.state.paneOpacity, 0, 0, this.state.paneChromaKey)

        /*  reflect scene changes  */
        if (state.pane !== undefined) {
            if (state.pane.source !== undefined
                && (this.state.displaySourceMap.pane !== state.pane.source
                    || this.state.modifiedMedia[this.material.mapMediaId(state.pane.source)])) {
                this.state.displaySourceMap.pane = state.pane.source
                if (this.state.paneDisplay.isEnabled())
                    await this.material.applyDisplayMaterial("pane", this.state.paneDisplay!, this.state.paneOpacity, 0, 0, this.state.paneChromaKey)
            }
            if (state.pane.opacity !== undefined) {
                this.state.paneOpacity = state.pane.opacity
                if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.paneDisplay.material
                    material.setFloat("opacity", this.state.paneOpacity)
                }
            }
            if (state.pane.scale !== undefined) {
                this.state.paneCase.scaling.x    = this.state.paneBase.scaleCaseX    * state.pane.scale
                this.state.paneCase.scaling.y    = this.state.paneBase.scaleCaseY    * state.pane.scale
                this.state.paneCase.scaling.z    = this.state.paneBase.scaleCaseZ    * state.pane.scale
                this.state.paneDisplay.scaling.x = this.state.paneBase.scaleDisplayX * state.pane.scale
                this.state.paneDisplay.scaling.y = this.state.paneBase.scaleDisplayY * state.pane.scale
                this.state.paneDisplay.scaling.z = this.state.paneBase.scaleDisplayZ * state.pane.scale
            }
            if (state.pane.rotate !== undefined) {
                this.state.pane.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.pane.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.pane.rotate), BABYLON.Space.WORLD)
            }
            if (state.pane.lift !== undefined)
                this.state.pane.position.z = this.state.paneBase.positionZ + (state.pane.lift / 100)
            if (state.pane.distance !== undefined) {
                this.state.paneCase.position.x    = this.state.paneBase.positionCaseX    - state.pane.distance
                this.state.paneDisplay.position.x = this.state.paneBase.positionDisplayX - state.pane.distance
            }
            if (state.pane.fadeTime !== undefined && this.state.paneFade !== state.pane.fadeTime)
                this.state.paneFade = state.pane.fadeTime
            if (state.pane.chromaKey !== undefined) {
                if (state.pane.chromaKey.enable !== undefined && this.state.paneChromaKey.enable !== state.pane.chromaKey.enable) {
                    this.state.paneChromaKey.enable = state.pane.chromaKey.enable
                    if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.paneDisplay.material
                        material.setInt("chromaEnable", this.state.paneChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.pane.chromaKey.threshold !== undefined && this.state.paneChromaKey.threshold !== state.pane.chromaKey.threshold) {
                    this.state.paneChromaKey.threshold = state.pane.chromaKey.threshold
                    if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.paneDisplay.material
                        material.setFloat("chromaThreshold", this.state.paneChromaKey.threshold)
                    }
                }
                if (state.pane.chromaKey.smoothing !== undefined && this.state.paneChromaKey.smoothing !== state.pane.chromaKey.smoothing) {
                    this.state.paneChromaKey.smoothing = state.pane.chromaKey.smoothing
                    if (this.state.paneChromaKey.enable && this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.paneDisplay.material
                        material.setFloat("chromaSmoothing", this.state.paneChromaKey.smoothing)
                    }
                }
            }
            if (state.pane.enable !== undefined && this.state.pane.isEnabled() !== state.pane.enable) {
                if (state.pane.enable) {
                    await this.material.applyDisplayMaterial("pane", this.state.paneDisplay!, this.state.paneOpacity, 0, 0, this.state.paneChromaKey)
                    if (this.state.paneFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "enabling pane (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.paneFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.state.paneCase,
                            "visibility", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.paneDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.state.pane.setEnabled(true)
                        this.state.paneCase.visibility = 1
                        this.state.paneCase.setEnabled(true)
                        this.state.paneDisplay.visibility = 1
                        this.state.paneDisplay.setEnabled(true)
                        const anim2 = Utils.manualAnimation(0, 1, this.state.paneFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.log("INFO", "enabling pane (fading: end)")
                        })
                    }
                    else {
                        this.log("INFO", "enabling pane")
                        this.state.paneCase.visibility    = 1
                        this.state.paneDisplay.visibility = 1
                        this.state.paneCase.setEnabled(true)
                        this.state.paneDisplay.setEnabled(true)
                        this.state.pane.setEnabled(true)
                    }
                }
                else if (!state.pane.enable) {
                    if (this.state.paneFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "disabling pane (fading: start)")
                        this.state.paneCase.visibility = 1
                        this.state.paneCase.setEnabled(true)
                        this.state.paneDisplay.visibility = 1
                        this.state.paneDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.paneFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.state.paneCase,
                            "visibility", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.paneDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = Utils.manualAnimation(1, 0, this.state.paneFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.log("INFO", "disabling pane (fading: end)")
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.paneDisplay!.visibility = 0.0
                                this.state.paneCase!.visibility = 0.0
                            }
                            else  {
                                this.state.paneDisplay!.visibility = 0.0
                                this.state.paneCase!.visibility = 0.0
                            }
                            this.state.paneCase!.setEnabled(false)
                            this.state.paneDisplay!.setEnabled(false)
                            this.state.pane!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("pane", this.state.paneDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling pane")
                        const setOnce = (value: number) => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", value)
                                this.state.paneDisplay!.visibility = value
                                this.state.paneCase!.visibility = value
                            }
                            else {
                                this.state.paneDisplay!.visibility = value
                                this.state.paneCase!.visibility = value
                            }
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.state.paneCase!.setEnabled(false)
                            this.state.paneDisplay!.setEnabled(false)
                            this.state.pane!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("pane", this.state.paneDisplay!)
                        })
                    }
                }
            }
        }
    }
}

