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

export default class Decal {
    private decal:            BABYLON.Nullable<BABYLON.Mesh> = null
    private decalRotate       = 0.0
    private decalLift         = 0.0
    private decalScale        = 1.0
    private decalFade         = 0
    private decalOpacity      = 1.0
    private decalBorderRad    = 40.0
    private decalBorderCrop   = 0.0
    private decalChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey

    constructor (
        private api:      API,
        private state:    State,
        private log:      (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        if (this.api.scene.renderingLayer("back"))
            await this.decalGenerate()
    }

    /*  (re-)generate the decal  */
    async decalGenerate () {
        /*  remember potentially old decal  */
        const oldDecal = this.decal

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
        rayEndLifted.position.z += this.decalLift
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
        rayDirection = rotateVector(rayDirection, 0, 0, Utils.deg2rad(this.decalRotate))
        const ray = new BABYLON.Ray(rayBeginPos, rayDirection, 10 /* meters, enough to be behind wall */)
        const wall = this.api.canvas.getWallMesh()!
        const decalBase = this.state.scene!.pickWithRay(ray, (mesh) => (mesh === wall))
        if (decalBase === null)
            throw new Error("cannot find decal base position on wall")

        /*  determine decal size (starting from a 16:9 aspect ratio)  */
        const size = (new BABYLON.Vector3(1.6, 0.9, 0.9)).scaleInPlace(this.decalScale)

        /*  invert the normal vector as it seems to be in the ray direction  */
        const normal = decalBase!.getNormal(true)!
        normal.multiplyInPlace(new BABYLON.Vector3(-1, -1, -1))

        /*  create new decal  */
        this.decal = BABYLON.MeshBuilder.CreateDecal("Decal", wall, {
            position:      decalBase!.pickedPoint!,
            normal,
            angle:         Utils.deg2rad(90),
            size,
            cullBackFaces: false,
            localMode:     false
        })

        /*  ugly workaround for BabylonJS rendering issue: move the decal 4cm to the
            front (z-axis) of the wall in order to avoid rendering artifacts  */
        this.decal.translate(new BABYLON.Vector3(0, 0, 1), 0.04, BABYLON.Space.LOCAL)

        /*  take over material or create a fresh one  */
        let material = oldDecal?.material ?? null
        if (material === null) {
            material = new BABYLON.PBRMaterial("Decal-Material", this.state.scene!)
            material.alpha   = 1.0
            material.zOffset = -200
        }
        this.decal.material = material
        if (oldDecal)
            this.decal.setEnabled(oldDecal.isEnabled())

        /*  dispose potential previous decal  */
        if (oldDecal !== null) {
            oldDecal.material = null
            oldDecal.dispose()
        }
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.decal !== null && this.api.scene.renderingLayer("back")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("decal"))
            && this.decal.isEnabled())
            await this.api.material.applyDisplayMaterial("decal", this.decal, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)

        /*  reflect state changes  */
        if (state.decal !== undefined) {
            if (state.decal.fadeTime !== undefined && this.decalFade !== state.decal.fadeTime)
                this.decalFade = state.decal.fadeTime
            if (state.decal.source !== undefined
                && (this.api.material.displaySource("decal") !== state.decal.source
                    || this.api.material.isMediaModified(state.decal.source))) {
                this.api.material.displaySource("decal", state.decal.source)
                if (this.decal.isEnabled())
                    await this.api.material.applyDisplayMaterial("decal", this.decal!, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
            }
            if (state.decal.opacity !== undefined) {
                this.decalOpacity = state.decal.opacity
                if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.decal.material
                    material.setFloat("opacity", this.decalOpacity)
                }
            }
            if (state.decal.borderRad !== undefined) {
                this.decalBorderRad = state.decal.borderRad
                if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.decal.material
                    material.setFloat("borderRadius", this.decalBorderRad)
                }
            }
            if (state.decal.borderCrop !== undefined) {
                this.decalBorderCrop = state.decal.borderCrop
                if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.decal.material
                    material.setFloat("borderCrop", this.decalBorderCrop)
                }
            }
            if (state.decal.chromaKey !== undefined) {
                if (state.decal.chromaKey.enable !== undefined && this.decalChromaKey.enable !== state.decal.chromaKey.enable) {
                    this.decalChromaKey.enable = state.decal.chromaKey.enable
                    if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.decal.material
                        material.setInt("chromaEnable", this.decalChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.decal.chromaKey.threshold !== undefined && this.decalChromaKey.threshold !== state.decal.chromaKey.threshold) {
                    this.decalChromaKey.threshold = state.decal.chromaKey.threshold
                    if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.decal.material
                        material.setFloat("chromaThreshold", this.decalChromaKey.threshold)
                    }
                }
                if (state.decal.chromaKey.smoothing !== undefined && this.decalChromaKey.smoothing !== state.decal.chromaKey.smoothing) {
                    this.decalChromaKey.smoothing = state.decal.chromaKey.smoothing
                    if (this.decalChromaKey.enable && this.decal.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.decal.material
                        material.setFloat("chromaSmoothing", this.decalChromaKey.smoothing)
                    }
                }
            }
            if (state.decal.rotate !== undefined || state.decal.lift !== undefined || state.decal.scale !== undefined) {
                let changed = false
                if (state.decal.rotate !== undefined && this.decalRotate !== state.decal.rotate) {
                    this.decalRotate = state.decal.rotate
                    changed = true
                }
                if (state.decal.lift !== undefined && this.decalLift !== state.decal.lift) {
                    this.decalLift = state.decal.lift
                    changed = true
                }
                if (state.decal.scale !== undefined && this.decalScale !== state.decal.scale) {
                    this.decalScale = state.decal.scale
                    changed = true
                }
                if (changed) {
                    await this.api.scene.stop()
                    await this.decalGenerate()
                    await this.api.material.applyDisplayMaterial("decal", this.decal!, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
                    await this.api.scene.start()
                }
            }
            if (state.decal.enable !== undefined && this.decal.isEnabled() !== state.decal.enable) {
                if (state.decal.enable) {
                    await this.api.material.applyDisplayMaterial("decal", this.decal!, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
                    if (this.decalFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "enabling decal (fading: start)")
                        if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.decal.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.decal.visibility = 1
                        this.decal.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.decalFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            this.log("INFO", "enabling decal (fading: end)")
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                    }
                    else {
                        this.log("INFO", "enabling decal")
                        this.decal.visibility = 1
                        this.decal.setEnabled(true)
                    }
                }
                else if (!state.decal.enable) {
                    if (this.decalFade > 0 && this.api.scene.currentFPS() > 0) {
                        this.log("INFO", "disabling decal (fading: start)")
                        if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.decal.material
                            material.setFloat("visibility", 1.0)
                        }
                        this.decal.visibility = 1
                        this.decal.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.decalFade, (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()), (gradient) => {
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(async () => {
                            this.log("INFO", "disabling decal (fading: end)")
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", 0.0)
                                this.decal!.visibility = 0
                            }
                            else
                                this.decal!.visibility = 0
                            this.decal!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("decal", this.decal!)
                        })
                    }
                    else {
                        this.log("INFO", "disabling decal")
                        this.decal.visibility = 0
                        this.decal.setEnabled(false)
                        await this.api.material.unapplyDisplayMaterial("decal", this.decal!)
                    }
                }
            }
        }
    }
}

