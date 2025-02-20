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

/*  exported renderer feature  */
export default class Decal {
    /*  internal state  */
    private mesh:      BABYLON.Nullable<BABYLON.Mesh> = null
    private rotate     = 0.0
    private lift       = 0.0
    private scale      = 1.0
    private fade       = 0
    private opacity    = 1.0
    private borderRad  = 40.0
    private borderCrop = 0.0
    private chromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        if (this.api.scene.renderingLayer("back"))
            await this.decalGenerate()
    }

    /*  (re-)generate the decal  */
    async decalGenerate () {
        /*  remember potentially old decal  */
        const oldDecal = this.mesh

        /*  determine scene  */
        const scene = this.api.scene.getScene()

        /*  determine position, normal vector and size  */
        const rayBegin = scene.getMeshByName("DecalRay-Begin") as
            BABYLON.Nullable<BABYLON.Mesh>
        const rayEnd = scene.getMeshByName("DecalRay-End") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (rayBegin === null || rayEnd === null)
            throw new Error("cannot find 'DecalRay-Begin' or 'DecalRay-End' nodes")
        rayBegin.setEnabled(false)
        rayEnd.setEnabled(false)
        rayBegin.computeWorldMatrix()
        rayEnd.computeWorldMatrix()

        /*  tilt end point to achieve lift effect  */
        const rayEndLifted = rayEnd!.clone()
        rayEndLifted.position.z += this.lift
        rayEndLifted.setEnabled(false)
        rayEndLifted.computeWorldMatrix()

        /*  helper function for rotating a Vector3 by Euler angles  */
        const rotateVector = (vec: BABYLON.Vector3, x: number, y: number, z: number) => {
            const quat = BABYLON.Quaternion.FromEulerAngles(x, y, z)
            const zero = BABYLON.Vector3.Zero()
            return vec.rotateByQuaternionToRef(quat, zero)
        }

        /*  determine decal base position on wall  */
        const rayEndPos   = BABYLON.Vector3.TransformCoordinates(
            rayEndLifted.position, rayEndLifted.getWorldMatrix())
        const rayBeginPos = BABYLON.Vector3.TransformCoordinates(
            rayBegin.position, rayBegin.getWorldMatrix())
        let rayDirection = rayEndPos.subtract(rayBeginPos).normalize()
        rayDirection = rotateVector(rayDirection, 0, 0, Utils.deg2rad(this.rotate))
        const ray = new BABYLON.Ray(rayBeginPos, rayDirection, 10 /* meters, enough to be behind wall */)
        const wall = this.api.canvas.getWallMesh()!
        const decalBase = scene.pickWithRay(ray, (mesh) => (mesh === wall))
        if (decalBase === null)
            throw new Error("cannot find decal base position on wall")

        /*  determine decal size (starting from a 16:9 aspect ratio)  */
        const size = (new BABYLON.Vector3(1.6, 0.9, 0.9)).scaleInPlace(this.scale)

        /*  invert the normal vector as it seems to be in the ray direction  */
        const normal = decalBase!.getNormal(true)!
        normal.multiplyInPlace(new BABYLON.Vector3(-1, -1, -1))

        /*  create new decal  */
        this.mesh = BABYLON.MeshBuilder.CreateDecal("Decal", wall, {
            position:      decalBase!.pickedPoint!,
            normal,
            angle:         Utils.deg2rad(90),
            size,
            cullBackFaces: false,
            localMode:     false
        })

        /*  ugly workaround for BabylonJS rendering issue: move the decal 4cm to the
            front (z-axis) of the wall in order to avoid rendering artifacts  */
        this.mesh.translate(new BABYLON.Vector3(0, 0, 1), 0.04, BABYLON.Space.LOCAL)

        /*  take over material or create a fresh one  */
        let material = oldDecal?.material ?? null
        if (material === null) {
            material = new BABYLON.PBRMaterial("Decal-Material", scene)
            material.alpha   = 1.0
            material.zOffset = -200
        }
        this.mesh.material = material
        if (oldDecal)
            this.mesh.setEnabled(oldDecal.isEnabled())

        /*  dispose potential previous decal  */
        if (oldDecal !== null) {
            oldDecal.material = null
            oldDecal.dispose()
        }
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  sanity check situation  */
        if (!(this.mesh !== null && this.api.scene.renderingLayer("back")))
            return

        /*  update already active media receivers  */
        if (this.api.material.isMediaModified(this.api.material.displaySource("decal"))
            && this.mesh.isEnabled())
            await this.api.material.applyDisplayMaterial("decal", this.mesh,
                this.opacity, this.borderRad, this.borderCrop, this.chromaKey)

        /*  reflect state changes  */
        if (state.decal !== undefined) {
            /*  update fading  */
            if (state.decal.fadeTime !== undefined && this.fade !== state.decal.fadeTime)
                this.fade = state.decal.fadeTime

            /*  update content  */
            if (state.decal.source !== undefined
                && (this.api.material.displaySource("decal") !== state.decal.source
                    || this.api.material.isMediaModified(state.decal.source))) {
                this.api.material.displaySource("decal", state.decal.source)
                if (this.mesh.isEnabled())
                    await this.api.material.applyDisplayMaterial("decal", this.mesh,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
            }

            /*  update opacity  */
            if (state.decal.opacity !== undefined) {
                this.opacity = state.decal.opacity
                if (this.mesh.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.mesh.material
                    material.setFloat("opacity", this.opacity)
                }
            }

            /*  update border  */
            if (state.decal.borderRad !== undefined) {
                this.borderRad = state.decal.borderRad
                if (this.mesh.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.mesh.material
                    material.setFloat("borderRadius", this.borderRad)
                }
            }
            if (state.decal.borderCrop !== undefined) {
                this.borderCrop = state.decal.borderCrop
                if (this.mesh.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.mesh.material
                    material.setFloat("borderCrop", this.borderCrop)
                }
            }

            /*  update chroma-keying  */
            if (state.decal.chromaKey !== undefined) {
                if (state.decal.chromaKey.enable !== undefined
                    && this.chromaKey.enable !== state.decal.chromaKey.enable) {
                    this.chromaKey.enable = state.decal.chromaKey.enable
                    if (this.mesh.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.mesh.material
                        material.setInt("chromaEnable", this.chromaKey.enable ? 1 : 0)
                    }
                }
                if (state.decal.chromaKey.threshold !== undefined
                    && this.chromaKey.threshold !== state.decal.chromaKey.threshold) {
                    this.chromaKey.threshold = state.decal.chromaKey.threshold
                    if (this.mesh.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.mesh.material
                        material.setFloat("chromaThreshold", this.chromaKey.threshold)
                    }
                }
                if (state.decal.chromaKey.smoothing !== undefined
                    && this.chromaKey.smoothing !== state.decal.chromaKey.smoothing) {
                    this.chromaKey.smoothing = state.decal.chromaKey.smoothing
                    if (this.chromaKey.enable && this.mesh.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.mesh.material
                        material.setFloat("chromaSmoothing", this.chromaKey.smoothing)
                    }
                }
            }

            /*  update position and size  */
            if (state.decal.rotate !== undefined
                || state.decal.lift !== undefined
                || state.decal.scale !== undefined) {
                let changed = false

                /*  update rotation  */
                if (state.decal.rotate !== undefined && this.rotate !== state.decal.rotate) {
                    this.rotate = state.decal.rotate
                    changed = true
                }

                /*  update vertical position  */
                if (state.decal.lift !== undefined && this.lift !== state.decal.lift) {
                    this.lift = state.decal.lift
                    changed = true
                }

                /*  update size  */
                if (state.decal.scale !== undefined && this.scale !== state.decal.scale) {
                    this.scale = state.decal.scale
                    changed = true
                }

                /*  apply changes  */
                if (changed) {
                    await this.api.scene.stop()
                    await this.decalGenerate()
                    await this.api.material.applyDisplayMaterial("decal", this.mesh,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
                    await this.api.scene.start()
                }
            }

            /*  update visibility  */
            if (state.decal.enable !== undefined
                && this.mesh.isEnabled() !== state.decal.enable) {
                if (state.decal.enable) {
                    /*  enable visibility  */
                    await this.api.material.applyDisplayMaterial("decal", this.mesh,
                        this.opacity, this.borderRad, this.borderCrop, this.chromaKey)
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  enable visibility with fading  */
                        this.api.renderer.log("INFO", "enabling decal (fading: start)")
                        if (this.mesh.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.mesh.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.mesh.visibility = 1
                        this.mesh.setEnabled(true)
                        await Utils.manualAnimation(0, 1, this.fade,
                            (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()),
                            (gradient) => {
                                if (this.mesh!.material instanceof BABYLON.ShaderMaterial) {
                                    const material = this.mesh!.material
                                    material.setFloat("visibility", gradient)
                                }
                            }
                        ).then(() => {
                            this.api.renderer.log("INFO", "enabling decal (fading: end)")
                            if (this.mesh!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.mesh!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                    }
                    else {
                        /*  enable visibility without fading  */
                        this.api.renderer.log("INFO", "enabling decal")
                        this.mesh.visibility = 1
                        this.mesh.setEnabled(true)
                    }
                }
                else if (!state.decal.enable) {
                    /*  disable visibility  */
                    if (this.fade > 0 && this.api.scene.currentFPS() > 0) {
                        /*  disable visibility with fading  */
                        this.api.renderer.log("INFO", "disabling decal (fading: start)")
                        if (this.mesh.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.mesh.material
                            material.setFloat("visibility", 1.0)
                        }
                        this.mesh.visibility = 1
                        this.mesh.setEnabled(true)
                        await Utils.manualAnimation(1, 0, this.fade,
                            (this.api.scene.currentFPS() === 0 ? 1 : this.api.scene.currentFPS()),
                            (gradient) => {
                                if (this.mesh!.material instanceof BABYLON.ShaderMaterial) {
                                    const material = this.mesh!.material
                                    material.setFloat("visibility", gradient)
                                }
                            }
                        ).then(async () => {
                            this.api.renderer.log("INFO", "disabling decal (fading: end)")
                            if (this.mesh!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.mesh!.material
                                material.setFloat("visibility", 0.0)
                                this.mesh!.visibility = 0
                            }
                            else
                                this.mesh!.visibility = 0
                            this.mesh!.setEnabled(false)
                            await this.api.material.unapplyDisplayMaterial("decal", this.mesh!)
                        })
                    }
                    else {
                        /*  disable visibility without fading  */
                        this.api.renderer.log("INFO", "disabling decal")
                        this.mesh.visibility = 0
                        this.mesh.setEnabled(false)
                        await this.api.material.unapplyDisplayMaterial("decal", this.mesh!)
                    }
                }
            }
        }
    }
}

