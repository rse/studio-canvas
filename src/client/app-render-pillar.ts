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

export default class Pillar {
    public pillar:          BABYLON.Nullable<BABYLON.TransformNode>  = null
    public pillarCase:      BABYLON.Nullable<BABYLON.Mesh>           = null
    public pillarDisplay:   BABYLON.Nullable<BABYLON.Mesh>           = null
    public pillarFade       = 0
    public pillarOpacity    = 1.0
    public pillarBorderRad  = 40.0
    public pillarBorderCrop = 0.0
    public pillarChromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public pillarBase       = {
        scaleX:        0, scaleY:        0, scaleZ:        0,
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
        /*  gather references to pillar mesh nodes  */
        this.pillar        = this.state.scene!.getNodeByName("Pillar")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.pillarCase    = this.state.scene!.getMeshByName("Pillar-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.pillarDisplay = this.state.scene!.getMeshByName("Pillar-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.pillar === null || this.pillarCase === null || this.pillarDisplay === null)
            throw new Error("cannot find pillar mesh nodes")
        if (this.api.scene.renderingLayer("back"))
            this.pillar.setEnabled(false)

        /*  initialize pillar base values  */
        this.pillarBase.scaleX            = this.pillar.scaling.x
        this.pillarBase.scaleY            = this.pillar.scaling.y
        this.pillarBase.scaleZ            = this.pillar.scaling.z
        this.pillarBase.rotationZ         = this.pillar.rotation.z
        this.pillarBase.positionZ         = this.pillar.position.z
        this.pillarBase.positionCaseX     = this.pillarCase.position.x
        this.pillarBase.positionDisplayX  = this.pillarDisplay.position.x

        /*  register pillar for shadow casting  */
        this.state.shadowCastingMeshes.push(this.pillarCase!)
        this.state.shadowCastingMeshes.push(this.pillarDisplay!)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.pillar !== null
            && this.pillarCase !== null
            && this.pillarDisplay !== null
            && this.api.scene.renderingLayer("back")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.state.displaySourceMap.pillar)
            && this.pillarDisplay.isEnabled())
            await this.api.material.applyDisplayMaterial("pillar", this.pillarDisplay, this.pillarOpacity, 0, 0, this.pillarChromaKey)

        /*  reflect state changes  */
        if (state.pillar !== undefined) {
            if (state.pillar.source !== undefined
                && (this.state.displaySourceMap.pillar !== state.pillar.source
                    || this.api.material.isMediaModified(state.pillar.source))) {
                this.state.displaySourceMap.pillar = state.pillar.source
                if (this.pillarDisplay.isEnabled())
                    await this.api.material.applyDisplayMaterial("pillar", this.pillarDisplay!, this.pillarOpacity, 0, 0, this.pillarChromaKey)
            }
            if (state.pillar.opacity !== undefined) {
                this.pillarOpacity = state.pillar.opacity
                if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.pillarDisplay.material
                    material.setFloat("opacity", this.pillarOpacity)
                }
            }
            if (state.pillar.scale !== undefined) {
                this.pillar.scaling.x    = this.pillarBase.scaleX * state.pillar.scale
                this.pillar.scaling.y    = this.pillarBase.scaleY * state.pillar.scale
                this.pillar.scaling.z    = this.pillarBase.scaleZ * state.pillar.scale
            }
            if (state.pillar.rotate !== undefined) {
                this.pillar.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.pillar.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.pillar.rotate), BABYLON.Space.WORLD)
            }
            if (state.pillar.lift !== undefined)
                this.pillar.position.z = this.pillarBase.positionZ + (state.pillar.lift / 100)
            if (state.pillar.distance !== undefined) {
                this.pillarCase.position.x    = this.pillarBase.positionCaseX    - state.pillar.distance
                this.pillarDisplay.position.x = this.pillarBase.positionDisplayX - state.pillar.distance
            }
            if (state.pillar.fadeTime !== undefined && this.pillarFade !== state.pillar.fadeTime)
                this.pillarFade = state.pillar.fadeTime
            if (state.pillar.borderRad !== undefined) {
                this.pillarBorderRad = state.pillar.borderRad
                if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.pillarDisplay.material
                    material.setFloat("borderRadius", this.pillarBorderRad)
                }
            }
            if (state.pillar.borderCrop !== undefined) {
                this.pillarBorderCrop = state.pillar.borderCrop
                if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.pillarDisplay.material
                    material.setFloat("borderCrop", this.pillarBorderCrop)
                }
            }
            if (state.pillar.chromaKey !== undefined) {
                if (state.pillar.chromaKey.enable !== undefined && this.pillarChromaKey.enable !== state.pillar.chromaKey.enable) {
                    this.pillarChromaKey.enable = state.pillar.chromaKey.enable
                    if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.pillarDisplay.material
                        material.setInt("chromaEnable", this.pillarChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.pillar.chromaKey.threshold !== undefined && this.pillarChromaKey.threshold !== state.pillar.chromaKey.threshold) {
                    this.pillarChromaKey.threshold = state.pillar.chromaKey.threshold
                    if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.pillarDisplay.material
                        material.setFloat("chromaThreshold", this.pillarChromaKey.threshold)
                    }
                }
                if (state.pillar.chromaKey.smoothing !== undefined && this.pillarChromaKey.smoothing !== state.pillar.chromaKey.smoothing) {
                    this.pillarChromaKey.smoothing = state.pillar.chromaKey.smoothing
                    if (this.pillarChromaKey.enable && this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.pillarDisplay.material
                        material.setFloat("chromaSmoothing", this.pillarChromaKey.smoothing)
                    }
                }
            }
            if (state.pillar.enable !== undefined && this.pillar.isEnabled() !== state.pillar.enable) {
                if (state.pillar.enable) {
                    await this.api.material.applyDisplayMaterial("pillar", this.pillarDisplay!, this.pillarOpacity, 0, 0, this.pillarChromaKey)
                    if (this.pillarFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "enabling pillar (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.pillarFade * fps
                        this.pillarCase.material!.alpha = 0
                        this.pillarCase.material!.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
                        this.pillarCase.material!.backFaceCulling = true
                        this.pillarCase.material!.forceDepthWrite = true
                        this.pillarCase.receiveShadows = true
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.pillarCase,
                            "material.alpha", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
                                this.pillarCase!.material!.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE
                            })!
                        if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.pillarDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.pillar.setEnabled(true)
                        this.pillarCase.visibility = 1
                        this.pillarCase.setEnabled(true)
                        this.pillarDisplay.visibility = 1
                        this.pillarDisplay.setEnabled(true)
                        const anim2 = Utils.manualAnimation(0, 1, this.pillarFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.pillarDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.pillarDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.log("INFO", "enabling pillar (fading: end)")
                        })
                    }
                    else {
                        this.log("INFO", "enabling pillar")
                        this.pillarCase.visibility    = 1
                        this.pillarDisplay.visibility = 1
                        this.pillarCase.setEnabled(true)
                        this.pillarDisplay.setEnabled(true)
                        this.pillar.setEnabled(true)
                    }
                }
                else if (!state.pillar.enable) {
                    if (this.pillarFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "disabling pillar (fading: start)")
                        this.pillarCase.material!.alpha = 1
                        this.pillarCase.material!.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
                        this.pillarCase.visibility = 1
                        this.pillarCase.setEnabled(true)
                        this.pillarDisplay.visibility = 1
                        this.pillarDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS())
                        const framesTotal = this.pillarFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.pillarCase,
                            "material.alpha", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.pillarDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = Utils.manualAnimation(1, 0, this.pillarFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.pillarDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.pillarDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.log("INFO", "disabling pillar (fading: end)")
                            if (this.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.pillarDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.pillarDisplay!.visibility = 0.0
                                this.pillarCase!.visibility = 0.0
                            }
                            else  {
                                this.pillarDisplay!.visibility = 0.0
                                this.pillarCase!.visibility = 0.0
                            }
                            this.pillarCase!.setEnabled(false)
                            this.pillarDisplay!.setEnabled(false)
                            this.pillar!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("pillar", this.pillarDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling pillar")
                        const setOnce = (value: number) => {
                            if (this.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.pillarDisplay!.material
                                material.setFloat("visibility", value)
                                this.pillarDisplay!.visibility = value
                                this.pillarCase!.visibility = value
                            }
                            else {
                                this.pillarDisplay!.visibility = value
                                this.pillarCase!.visibility = value
                            }
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.pillarCase!.setEnabled(false)
                            this.pillarDisplay!.setEnabled(false)
                            this.pillar!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("pillar", this.pillarDisplay!)
                        })
                    }
                }
            }
        }
    }
}

