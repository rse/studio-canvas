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

export default class Pane {
    public pane:            BABYLON.Nullable<BABYLON.TransformNode>  = null
    public paneCase:        BABYLON.Nullable<BABYLON.Mesh>           = null
    public paneDisplay:     BABYLON.Nullable<BABYLON.Mesh>           = null
    public paneFade         = 0
    public paneOpacity      = 1.0
    public paneChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public paneBase         = {
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
        /*  gather references to pane mesh nodes  */
        this.pane        = this.state.scene!.getNodeByName("Pane")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.paneCase    = this.state.scene!.getMeshByName("Pane-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.paneDisplay = this.state.scene!.getMeshByName("Pane-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.pane === null || this.paneCase === null || this.paneDisplay === null)
            throw new Error("cannot find pane mesh nodes")
        if (this.state.layer === "front")
            this.pane.setEnabled(false)

        /*  initialize pane base values  */
        this.paneBase.scaleCaseX          = this.paneCase.scaling.x
        this.paneBase.scaleCaseY          = this.paneCase.scaling.y
        this.paneBase.scaleCaseZ          = this.paneCase.scaling.z
        this.paneBase.scaleDisplayX       = this.paneDisplay.scaling.x
        this.paneBase.scaleDisplayY       = this.paneDisplay.scaling.y
        this.paneBase.scaleDisplayZ       = this.paneDisplay.scaling.z
        this.paneBase.rotationZ           = this.pane.rotation.z
        this.paneBase.positionZ           = this.pane.position.z
        this.paneBase.positionCaseX       = this.paneCase.position.x
        this.paneBase.positionDisplayX    = this.paneDisplay.position.x

        /*  apply glass material to pane case  */
        const glass2 = new BABYLON.PBRMaterial("glass2", this.state.scene!)
        glass2.indexOfRefraction    = 1.52
        glass2.alpha                = 0.20
        glass2.directIntensity      = 1.0
        glass2.environmentIntensity = 1.0
        glass2.microSurface         = 1
        glass2.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass2.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.paneCase.material = glass2

        /*  register pane for shadow casting  */
        this.state.shadowCastingMeshes.push(this.paneCase!)
        this.state.shadowCastingMeshes.push(this.paneDisplay!)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.pane !== null
            && this.paneCase !== null
            && this.paneDisplay !== null
            && this.state.layer === "front"))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.state.displaySourceMap.pane)
            && this.paneDisplay.isEnabled())
            await this.api.material.applyDisplayMaterial("pane", this.paneDisplay, this.paneOpacity, 0, 0, this.paneChromaKey)

        /*  reflect scene changes  */
        if (state.pane !== undefined) {
            if (state.pane.source !== undefined
                && (this.state.displaySourceMap.pane !== state.pane.source
                    || this.api.material.isMediaModified(state.pane.source))) {
                this.state.displaySourceMap.pane = state.pane.source
                if (this.paneDisplay.isEnabled())
                    await this.api.material.applyDisplayMaterial("pane", this.paneDisplay!, this.paneOpacity, 0, 0, this.paneChromaKey)
            }
            if (state.pane.opacity !== undefined) {
                this.paneOpacity = state.pane.opacity
                if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.paneDisplay.material
                    material.setFloat("opacity", this.paneOpacity)
                }
            }
            if (state.pane.scale !== undefined) {
                this.paneCase.scaling.x    = this.paneBase.scaleCaseX    * state.pane.scale
                this.paneCase.scaling.y    = this.paneBase.scaleCaseY    * state.pane.scale
                this.paneCase.scaling.z    = this.paneBase.scaleCaseZ    * state.pane.scale
                this.paneDisplay.scaling.x = this.paneBase.scaleDisplayX * state.pane.scale
                this.paneDisplay.scaling.y = this.paneBase.scaleDisplayY * state.pane.scale
                this.paneDisplay.scaling.z = this.paneBase.scaleDisplayZ * state.pane.scale
            }
            if (state.pane.rotate !== undefined) {
                this.pane.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.pane.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.pane.rotate), BABYLON.Space.WORLD)
            }
            if (state.pane.lift !== undefined)
                this.pane.position.z = this.paneBase.positionZ + (state.pane.lift / 100)
            if (state.pane.distance !== undefined) {
                this.paneCase.position.x    = this.paneBase.positionCaseX    - state.pane.distance
                this.paneDisplay.position.x = this.paneBase.positionDisplayX - state.pane.distance
            }
            if (state.pane.fadeTime !== undefined && this.paneFade !== state.pane.fadeTime)
                this.paneFade = state.pane.fadeTime
            if (state.pane.chromaKey !== undefined) {
                if (state.pane.chromaKey.enable !== undefined && this.paneChromaKey.enable !== state.pane.chromaKey.enable) {
                    this.paneChromaKey.enable = state.pane.chromaKey.enable
                    if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.paneDisplay.material
                        material.setInt("chromaEnable", this.paneChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.pane.chromaKey.threshold !== undefined && this.paneChromaKey.threshold !== state.pane.chromaKey.threshold) {
                    this.paneChromaKey.threshold = state.pane.chromaKey.threshold
                    if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.paneDisplay.material
                        material.setFloat("chromaThreshold", this.paneChromaKey.threshold)
                    }
                }
                if (state.pane.chromaKey.smoothing !== undefined && this.paneChromaKey.smoothing !== state.pane.chromaKey.smoothing) {
                    this.paneChromaKey.smoothing = state.pane.chromaKey.smoothing
                    if (this.paneChromaKey.enable && this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.paneDisplay.material
                        material.setFloat("chromaSmoothing", this.paneChromaKey.smoothing)
                    }
                }
            }
            if (state.pane.enable !== undefined && this.pane.isEnabled() !== state.pane.enable) {
                if (state.pane.enable) {
                    await this.api.material.applyDisplayMaterial("pane", this.paneDisplay!, this.paneOpacity, 0, 0, this.paneChromaKey)
                    if (this.paneFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "enabling pane (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.paneFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.paneCase,
                            "visibility", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.paneDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.pane.setEnabled(true)
                        this.paneCase.visibility = 1
                        this.paneCase.setEnabled(true)
                        this.paneDisplay.visibility = 1
                        this.paneDisplay.setEnabled(true)
                        const anim2 = Utils.manualAnimation(0, 1, this.paneFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.log("INFO", "enabling pane (fading: end)")
                        })
                    }
                    else {
                        this.log("INFO", "enabling pane")
                        this.paneCase.visibility    = 1
                        this.paneDisplay.visibility = 1
                        this.paneCase.setEnabled(true)
                        this.paneDisplay.setEnabled(true)
                        this.pane.setEnabled(true)
                    }
                }
                else if (!state.pane.enable) {
                    if (this.paneFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "disabling pane (fading: start)")
                        this.paneCase.visibility = 1
                        this.paneCase.setEnabled(true)
                        this.paneDisplay.visibility = 1
                        this.paneDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.paneFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.paneCase,
                            "visibility", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.paneDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = Utils.manualAnimation(1, 0, this.paneFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.log("INFO", "disabling pane (fading: end)")
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.paneDisplay!.visibility = 0.0
                                this.paneCase!.visibility = 0.0
                            }
                            else  {
                                this.paneDisplay!.visibility = 0.0
                                this.paneCase!.visibility = 0.0
                            }
                            this.paneCase!.setEnabled(false)
                            this.paneDisplay!.setEnabled(false)
                            this.pane!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("pane", this.paneDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling pane")
                        const setOnce = (value: number) => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", value)
                                this.paneDisplay!.visibility = value
                                this.paneCase!.visibility = value
                            }
                            else {
                                this.paneDisplay!.visibility = value
                                this.paneCase!.visibility = value
                            }
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.paneCase!.setEnabled(false)
                            this.paneDisplay!.setEnabled(false)
                            this.pane!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("pane", this.paneDisplay!)
                        })
                    }
                }
            }
        }
    }
}

