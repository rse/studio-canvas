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

export default class AppRenderPillar {
    constructor (
        private state:    State,
        private material: AppRenderMaterial,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather references to pillar mesh nodes  */
        this.state.pillar        = this.state.scene!.getNodeByName("Pillar")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.pillarCase    = this.state.scene!.getMeshByName("Pillar-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.state.pillarDisplay = this.state.scene!.getMeshByName("Pillar-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.pillar === null || this.state.pillarCase === null || this.state.pillarDisplay === null)
            throw new Error("cannot find pillar mesh nodes")
        if (this.state.layer === "back")
            this.state.pillar.setEnabled(false)

        /*  initialize pillar base values  */
        this.state.pillarBase.scaleX            = this.state.pillar.scaling.x
        this.state.pillarBase.scaleY            = this.state.pillar.scaling.y
        this.state.pillarBase.scaleZ            = this.state.pillar.scaling.z
        this.state.pillarBase.rotationZ         = this.state.pillar.rotation.z
        this.state.pillarBase.positionZ         = this.state.pillar.position.z
        this.state.pillarBase.positionCaseX     = this.state.pillarCase.position.x
        this.state.pillarBase.positionDisplayX  = this.state.pillarDisplay.position.x
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.state.pillar !== null
            && this.state.pillarCase !== null
            && this.state.pillarDisplay !== null
            && this.state.layer === "back"))
            return

        /*  update already active media receivers  */
        if (this.state.modifiedMedia[this.material.mapMediaId(this.state.displaySourceMap.pillar)]
            && this.state.pillarDisplay.isEnabled())
            await this.material.applyDisplayMaterial("pillar", this.state.pillarDisplay, this.state.pillarOpacity, 0, 0, this.state.pillarChromaKey)

        /*  reflect state changes  */
        if (state.pillar !== undefined) {
            if (state.pillar.source !== undefined
                && (this.state.displaySourceMap.pillar !== state.pillar.source
                    || this.state.modifiedMedia[this.material.mapMediaId(state.pillar.source)])) {
                this.state.displaySourceMap.pillar = state.pillar.source
                if (this.state.pillarDisplay.isEnabled())
                    await this.material.applyDisplayMaterial("pillar", this.state.pillarDisplay!, this.state.pillarOpacity, 0, 0, this.state.pillarChromaKey)
            }
            if (state.pillar.opacity !== undefined) {
                this.state.pillarOpacity = state.pillar.opacity
                if (this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.pillarDisplay.material
                    material.setFloat("opacity", this.state.pillarOpacity)
                }
            }
            if (state.pillar.scale !== undefined) {
                this.state.pillar.scaling.x    = this.state.pillarBase.scaleX * state.pillar.scale
                this.state.pillar.scaling.y    = this.state.pillarBase.scaleY * state.pillar.scale
                this.state.pillar.scaling.z    = this.state.pillarBase.scaleZ * state.pillar.scale
            }
            if (state.pillar.rotate !== undefined) {
                this.state.pillar.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.pillar.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(state.pillar.rotate), BABYLON.Space.WORLD)
            }
            if (state.pillar.lift !== undefined)
                this.state.pillar.position.z = this.state.pillarBase.positionZ + (state.pillar.lift / 100)
            if (state.pillar.distance !== undefined) {
                this.state.pillarCase.position.x    = this.state.pillarBase.positionCaseX    - state.pillar.distance
                this.state.pillarDisplay.position.x = this.state.pillarBase.positionDisplayX - state.pillar.distance
            }
            if (state.pillar.fadeTime !== undefined && this.state.pillarFade !== state.pillar.fadeTime)
                this.state.pillarFade = state.pillar.fadeTime
            if (state.pillar.borderRad !== undefined) {
                this.state.pillarBorderRad = state.pillar.borderRad
                if (this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.pillarDisplay.material
                    material.setFloat("borderRadius", this.state.pillarBorderRad)
                }
            }
            if (state.pillar.borderCrop !== undefined) {
                this.state.pillarBorderCrop = state.pillar.borderCrop
                if (this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.pillarDisplay.material
                    material.setFloat("borderCrop", this.state.pillarBorderCrop)
                }
            }
            if (state.pillar.chromaKey !== undefined) {
                if (state.pillar.chromaKey.enable !== undefined && this.state.pillarChromaKey.enable !== state.pillar.chromaKey.enable) {
                    this.state.pillarChromaKey.enable = state.pillar.chromaKey.enable
                    if (this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.pillarDisplay.material
                        material.setInt("chromaEnable", this.state.pillarChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.pillar.chromaKey.threshold !== undefined && this.state.pillarChromaKey.threshold !== state.pillar.chromaKey.threshold) {
                    this.state.pillarChromaKey.threshold = state.pillar.chromaKey.threshold
                    if (this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.pillarDisplay.material
                        material.setFloat("chromaThreshold", this.state.pillarChromaKey.threshold)
                    }
                }
                if (state.pillar.chromaKey.smoothing !== undefined && this.state.pillarChromaKey.smoothing !== state.pillar.chromaKey.smoothing) {
                    this.state.pillarChromaKey.smoothing = state.pillar.chromaKey.smoothing
                    if (this.state.pillarChromaKey.enable && this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.pillarDisplay.material
                        material.setFloat("chromaSmoothing", this.state.pillarChromaKey.smoothing)
                    }
                }
            }
            if (state.pillar.enable !== undefined && this.state.pillar.isEnabled() !== state.pillar.enable) {
                if (state.pillar.enable) {
                    await this.material.applyDisplayMaterial("pillar", this.state.pillarDisplay!, this.state.pillarOpacity, 0, 0, this.state.pillarChromaKey)
                    if (this.state.pillarFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "enabling pillar (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.pillarFade * fps
                        this.state.pillarCase.material!.alpha = 0
                        this.state.pillarCase.material!.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
                        this.state.pillarCase.material!.backFaceCulling = true
                        this.state.pillarCase.material!.forceDepthWrite = true
                        this.state.pillarCase.receiveShadows = true
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.state.pillarCase,
                            "material.alpha", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease, () => {
                                this.state.pillarCase!.material!.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE
                            })!
                        if (this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.pillarDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.state.pillar.setEnabled(true)
                        this.state.pillarCase.visibility = 1
                        this.state.pillarCase.setEnabled(true)
                        this.state.pillarDisplay.visibility = 1
                        this.state.pillarDisplay.setEnabled(true)
                        const anim2 = Utils.manualAnimation(0, 1, this.state.pillarFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.pillarDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.pillarDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.log("INFO", "enabling pillar (fading: end)")
                        })
                    }
                    else {
                        this.log("INFO", "enabling pillar")
                        this.state.pillarCase.visibility    = 1
                        this.state.pillarDisplay.visibility = 1
                        this.state.pillarCase.setEnabled(true)
                        this.state.pillarDisplay.setEnabled(true)
                        this.state.pillar.setEnabled(true)
                    }
                }
                else if (!state.pillar.enable) {
                    if (this.state.pillarFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "disabling pillar (fading: start)")
                        this.state.pillarCase.material!.alpha = 1
                        this.state.pillarCase.material!.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
                        this.state.pillarCase.visibility = 1
                        this.state.pillarCase.setEnabled(true)
                        this.state.pillarDisplay.visibility = 1
                        this.state.pillarDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.pillarFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.state.pillarCase,
                            "material.alpha", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.pillarDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = Utils.manualAnimation(1, 0, this.state.pillarFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.pillarDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.pillarDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.log("INFO", "disabling pillar (fading: end)")
                            if (this.state.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.pillarDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.pillarDisplay!.visibility = 0.0
                                this.state.pillarCase!.visibility = 0.0
                            }
                            else  {
                                this.state.pillarDisplay!.visibility = 0.0
                                this.state.pillarCase!.visibility = 0.0
                            }
                            this.state.pillarCase!.setEnabled(false)
                            this.state.pillarDisplay!.setEnabled(false)
                            this.state.pillar!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("pillar", this.state.pillarDisplay!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling pillar")
                        const setOnce = (value: number) => {
                            if (this.state.pillarDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.pillarDisplay!.material
                                material.setFloat("visibility", value)
                                this.state.pillarDisplay!.visibility = value
                                this.state.pillarCase!.visibility = value
                            }
                            else {
                                this.state.pillarDisplay!.visibility = value
                                this.state.pillarCase!.visibility = value
                            }
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.state.pillarCase!.setEnabled(false)
                            this.state.pillarDisplay!.setEnabled(false)
                            this.state.pillar!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("pillar", this.state.pillarDisplay!)
                        })
                    }
                }
            }
        }
    }
}

