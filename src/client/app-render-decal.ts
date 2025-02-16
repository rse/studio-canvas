/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
// import Config                 from "./app-render-config"
import State                  from "./app-render-state"
import Utils                  from "./app-render-utils"
import AppRenderScene         from "./app-render-scene"
import AppRenderMaterial      from "./app-render-material"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class AppRenderDecal {
    constructor (
        private state:    State,
        private scene:    AppRenderScene,
        private material: AppRenderMaterial,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        if (this.state.layer === "back")
            await this.decalGenerate()
    }

    /*  (re-)generate the decal  */
    async decalGenerate () {
        /*  remember potentially old decal  */
        const oldDecal = this.state.decal

        /*  determine position, normal vector and size  */
        const rayBegin = this.state.scene!.getMeshByName("DecalRay-Begin") as BABYLON.Nullable<BABYLON.Mesh>
        const rayEnd   = this.state.scene!.getMeshByName("DecalRay-End")   as BABYLON.Nullable<BABYLON.Mesh>
        if (rayBegin === null || rayEnd === null)
            throw new Error("cannot find 'DecalRay-Begin' or 'DecalRay-End' nodes")
        rayBegin.setEnabled(false)
        rayEnd.setEnabled(false)
        rayBegin.computeWorldMatrix()
        rayEnd.computeWorldMatrix()

        /*  tilt end point to achieve lift effect  */
        const rayEndLifted = rayEnd!.clone()
        rayEndLifted.position.z += this.state.decalLift
        rayEndLifted.setEnabled(false)
        rayEndLifted.computeWorldMatrix()

        /*  helper function for rotating a Vector3 by Euler angles  */
        const rotateVector = (vec: BABYLON.Vector3, x: number, y: number, z: number) => {
            const quat = BABYLON.Quaternion.FromEulerAngles(x, y, z)
            const zero = BABYLON.Vector3.Zero()
            return vec.rotateByQuaternionToRef(quat, zero)
        }

        /*  determine decal base position on wall  */
        const rayEndPos   = BABYLON.Vector3.TransformCoordinates(rayEndLifted.position, rayEndLifted.getWorldMatrix())
        const rayBeginPos = BABYLON.Vector3.TransformCoordinates(rayBegin.position, rayBegin.getWorldMatrix())
        let rayDirection = rayEndPos.subtract(rayBeginPos).normalize()
        rayDirection = rotateVector(rayDirection, 0, 0, this.state.ptz!.deg2rad(this.state.decalRotate))
        const ray = new BABYLON.Ray(rayBeginPos, rayDirection, 10 /* meters, enough to be behind wall */)
        const decalBase = this.state.scene!.pickWithRay(ray, (mesh) => (mesh === this.state.wall!))
        if (decalBase === null)
            throw new Error("cannot find decal base position on wall")

        /*  determine decal size (starting from a 16:9 aspect ratio)  */
        const size = (new BABYLON.Vector3(1.6, 0.9, 0.9)).scaleInPlace(this.state.decalScale)

        /*  invert the normal vector as it seems to be in the ray direction  */
        const normal = decalBase!.getNormal(true)!
        normal.multiplyInPlace(new BABYLON.Vector3(-1, -1, -1))

        /*  create new decal  */
        this.state.decal = BABYLON.MeshBuilder.CreateDecal("Decal", this.state.wall!, {
            position:      decalBase!.pickedPoint!,
            normal,
            angle:         this.state.ptz!.deg2rad(90),
            size,
            cullBackFaces: false,
            localMode:     false
        })

        /*  ugly workaround for BabylonJS rendering issue: move the decal 4cm to the
            front (z-axis) of the wall in order to avoid rendering artifacts  */
        this.state.decal.translate(new BABYLON.Vector3(0, 0, 1), 0.04, BABYLON.Space.LOCAL)

        /*  take over material or create a fresh one  */
        let material = oldDecal?.material ?? null
        if (material === null) {
            material = new BABYLON.PBRMaterial("Decal-Material", this.state.scene!)
            material.alpha   = 1.0
            material.zOffset = -200
        }
        this.state.decal.material = material
        if (oldDecal)
            this.state.decal.setEnabled(oldDecal.isEnabled())

        /*  dispose potential previous decal  */
        if (oldDecal !== null) {
            oldDecal.material = null
            oldDecal.dispose()
        }
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.state.decal !== null && this.state.layer === "back"))
            return

        /*  update already active media receivers  */
        if (this.state.modifiedMedia[this.material.mapMediaId(this.state.displaySourceMap.decal)]
            && this.state.decal.isEnabled())
            await this.material.applyDisplayMaterial("decal", this.state.decal, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)

        /*  reflect state changes  */
        if (state.decal !== undefined) {
            if (state.decal.fadeTime !== undefined && this.state.decalFade !== state.decal.fadeTime)
                this.state.decalFade = state.decal.fadeTime
            if (state.decal.source !== undefined
                && (this.state.displaySourceMap.decal !== state.decal.source
                    || this.state.modifiedMedia[this.material.mapMediaId(state.decal.source)])) {
                this.state.displaySourceMap.decal = state.decal.source
                if (this.state.decal.isEnabled())
                    await this.material.applyDisplayMaterial("decal", this.state.decal!, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)
            }
            if (state.decal.opacity !== undefined) {
                this.state.decalOpacity = state.decal.opacity
                if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.decal.material
                    material.setFloat("opacity", this.state.decalOpacity)
                }
            }
            if (state.decal.borderRad !== undefined) {
                this.state.decalBorderRad = state.decal.borderRad
                if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.decal.material
                    material.setFloat("borderRadius", this.state.decalBorderRad)
                }
            }
            if (state.decal.borderCrop !== undefined) {
                this.state.decalBorderCrop = state.decal.borderCrop
                if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.decal.material
                    material.setFloat("borderCrop", this.state.decalBorderCrop)
                }
            }
            if (state.decal.chromaKey !== undefined) {
                if (state.decal.chromaKey.enable !== undefined && this.state.decalChromaKey.enable !== state.decal.chromaKey.enable) {
                    this.state.decalChromaKey.enable = state.decal.chromaKey.enable
                    if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.decal.material
                        material.setInt("chromaEnable", this.state.decalChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.decal.chromaKey.threshold !== undefined && this.state.decalChromaKey.threshold !== state.decal.chromaKey.threshold) {
                    this.state.decalChromaKey.threshold = state.decal.chromaKey.threshold
                    if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.decal.material
                        material.setFloat("chromaThreshold", this.state.decalChromaKey.threshold)
                    }
                }
                if (state.decal.chromaKey.smoothing !== undefined && this.state.decalChromaKey.smoothing !== state.decal.chromaKey.smoothing) {
                    this.state.decalChromaKey.smoothing = state.decal.chromaKey.smoothing
                    if (this.state.decalChromaKey.enable && this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.decal.material
                        material.setFloat("chromaSmoothing", this.state.decalChromaKey.smoothing)
                    }
                }
            }
            if (state.decal.rotate !== undefined || state.decal.lift !== undefined || state.decal.scale !== undefined) {
                let changed = false
                if (state.decal.rotate !== undefined && this.state.decalRotate !== state.decal.rotate) {
                    this.state.decalRotate = state.decal.rotate
                    changed = true
                }
                if (state.decal.lift !== undefined && this.state.decalLift !== state.decal.lift) {
                    this.state.decalLift = state.decal.lift
                    changed = true
                }
                if (state.decal.scale !== undefined && this.state.decalScale !== state.decal.scale) {
                    this.state.decalScale = state.decal.scale
                    changed = true
                }
                if (changed) {
                    await this.scene.stop()
                    await this.decalGenerate()
                    await this.material.applyDisplayMaterial("decal", this.state.decal!, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)
                    await this.scene.start()
                }
            }
            if (state.decal.enable !== undefined && this.state.decal.isEnabled() !== state.decal.enable) {
                if (state.decal.enable) {
                    await this.material.applyDisplayMaterial("decal", this.state.decal!, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)
                    if (this.state.decalFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "enabling decal (fading: start)")
                        if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.decal.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.state.decal.visibility = 1
                        this.state.decal.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.state.decalFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            this.log("INFO", "enabling decal (fading: end)")
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                    }
                    else {
                        this.log("INFO", "enabling decal")
                        this.state.decal.visibility = 1
                        this.state.decal.setEnabled(true)
                    }
                }
                else if (!state.decal.enable) {
                    if (this.state.decalFade > 0 && this.state.fps > 0) {
                        this.log("INFO", "disabling decal (fading: start)")
                        if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.decal.material
                            material.setFloat("visibility", 1.0)
                        }
                        this.state.decal.visibility = 1
                        this.state.decal.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.state.decalFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(async () => {
                            this.log("INFO", "disabling decal (fading: end)")
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", 0.0)
                                this.state.decal!.visibility = 0
                            }
                            else
                                this.state.decal!.visibility = 0
                            this.state.decal!.setEnabled(false)
                            await this.material.unapplyDisplayMaterial("decal", this.state.decal!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling decal")
                        this.state.decal.visibility = 0
                        this.state.decal.setEnabled(false)
                        await this.material.unapplyDisplayMaterial("decal", this.state.decal!)
                    }
                }
            }
        }
    }
}

