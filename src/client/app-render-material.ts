/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import State, { type ChromaKey } from "./app-render-state"
import ShaderMaterial            from "./app-render-shader"

/*  import internal dependencies (shared)  */
import { StateTypePartial }      from "../common/app-state"

type VideoStackId = "monitor" | "decal" | "hologram" | "plate" | "pane" | "pillar" | "mask"

export default class AppRenderMaterial {
    constructor (
        private state: State,
        private log:   (level: string, msg: string) => void
    ) {}

    /*  load media texture  */
    async loadMediaTexture (url: string): Promise<BABYLON.Nullable<BABYLON.Texture>> {
        let texture: BABYLON.Nullable<BABYLON.Texture> = null
        if (this.state.displayTextureByURL.has(url)) {
            /*  provide existing texture  */
            texture = this.state.displayTextureByURL.get(url)!
            const info = this.state.displayTextureInfo.get(texture)!
            info.refs++
        }
        else {
            /*  provide new texture  */
            if (url.match(/.+\.(?:png|jpg|gif)$/)) {
                /*  provide texture based on image media  */
                this.log("INFO", `loading image media "${url}"`)
                await new Promise((resolve, reject) => {
                    texture = new BABYLON.Texture(
                        url, this.state.scene, false, false,
                        BABYLON.VideoTexture.NEAREST_SAMPLINGMODE,
                        null,
                        (msg, ex) => {
                            this.log("ERROR", `failed to load image media "${url}": ${msg}`)
                            if (texture)
                                texture.dispose()
                            reject(ex)
                        }
                    )
                    BABYLON.Texture.WhenAllReady([ texture ], () => {
                        resolve(true)
                    })
                })
                this.state.displayTextureByURL.set(url, texture!)
                this.state.displayTextureInfo.set(texture!, { type: "image", url, refs: 1 })
            }
            else if (url.match(/.+\.(?:smp4|mp4|swebm|webm)$/)) {
                /*  provide texture based on video media  */
                this.log("INFO", `loading video media "${url}"`)
                const loop = (url.match(/.+-loop\.(?:smp4|mp4|swebm|webm)$/) !== null)
                await new Promise((resolve, reject) => {
                    texture = new BABYLON.VideoTexture(
                        url, url, this.state.scene, false, true,
                        BABYLON.VideoTexture.NEAREST_SAMPLINGMODE,
                        { autoPlay: true, muted: true, autoUpdateTexture: true, loop },
                        (msg, ex) => {
                            this.log("ERROR", `failed to load video media "${url}": ${msg}`)
                            if (texture) {
                                texture.dispose()
                                const video = (texture as BABYLON.VideoTexture).video
                                if (video) {
                                    while (video.firstChild)
                                        video.removeChild(video.lastChild!)
                                    video.src = ""
                                    video.removeAttribute("src")
                                    video.load()
                                    video.remove()
                                }
                            }
                            reject(ex)
                        }
                    )
                    BABYLON.Texture.WhenAllReady([ texture ], () => {
                        resolve(true)
                    })
                })
                this.state.displayTextureByURL.set(url, texture!)
                this.state.displayTextureInfo.set(texture!, { type: "video", url, refs: 1 })
            }
            else
                throw new Error("invalid media filename (neither PNG, JPG, GIF, MP4 or WebM)")
        }
        return texture
    }

    /*  unload media texture  */
    async unloadMediaTexture (texture: BABYLON.Texture) {
        /*  sanity check: ensure texture is known  */
        if (!this.state.displayTextureInfo.has(texture))
            throw new Error("invalid texture")

        /*  decrease reference count and in case texture is
            still used still do not unload anything  */
        const info = this.state.displayTextureInfo.get(texture)!
        if (info && info.refs > 1) {
            info.refs--
            return
        }

        /*  unload texture by disposing all resources  */
        this.log("INFO", `unloading ${info.type} media "${info.url}"`)
        this.state.displayTextureInfo.delete(texture)
        this.state.displayTextureByURL.delete(info.url)
        if (texture instanceof BABYLON.VideoTexture) {
            /*  dispose video texture  */
            const video = texture.video
            texture.dispose()
            if (video) {
                while (video.firstChild)
                    video.removeChild(video.lastChild!)
                video.src = ""
                video.removeAttribute("src")
                video.load()
                video.remove()
            }
        }
        else {
            /*  dispose image texture  */
            texture.dispose()
        }
    }


    /*  convert from "Mx" to "mediaX"  */
    mapMediaId (id: string) {
        if      (id === "M1") id = "media1"
        else if (id === "M2") id = "media2"
        else if (id === "M3") id = "media3"
        else if (id === "M4") id = "media4"
        return id
    }

    /*  apply video stream onto mesh  */
    async applyDisplayMaterial (id: VideoStackId, mesh: BABYLON.Mesh, opacity: number, borderRad: number, borderCrop: number, chromaKey: ChromaKey | null) {
        this.log("INFO", `apply texture material to display "${id}"`)

        /*  determine media id  */
        let mediaId = ""
        if (this.state.displaySourceMap[id].match(/^M/))
            mediaId = this.mapMediaId(this.state.displaySourceMap[id])

        /*  determine texture  */
        let texture: BABYLON.Nullable<BABYLON.Texture> = null
        if (this.state.displaySourceMap[id].match(/^S/) && this.state.videoTexture !== null)
            texture = this.state.videoTexture
        else if (this.state.displaySourceMap[id].match(/^M/) && this.state.displayMediaURL.has(mediaId))
            texture = await this.loadMediaTexture(this.state.displayMediaURL.get(mediaId)!).catch(() => null)

        /*  short-circuit processing in case texture is not available  */
        if (texture === null) {
            this.log("WARNING", `failed to gather texture for "${id}" -- setting replacement texture`)
            const material = mesh.material as BABYLON.PBRMaterial
            material.albedoColor = new BABYLON.Color3(1.0, 0.0, 0.0)
            material.albedoTexture?.dispose()
            material.albedoTexture = null
            material.unlit = true
            return
        }

        /*  create new shader material  */
        const material = ShaderMaterial.displayStream(`video-${id}`, this.state.scene!)
        if (this.state.displaySourceMap[id].match(/^M/))
            this.state.displayMaterial2Texture.set(material, texture)
        material.setTexture("textureSampler", texture)
        material.setFloat("opacity", opacity)
        material.setFloat("borderRadius", borderRad)
        material.setFloat("borderCrop", borderCrop)
        material.setInt("chromaEnable", chromaKey?.enable ? 1 : 0)
        material.setFloat("chromaThreshold", chromaKey?.threshold ?? 0.4)
        material.setFloat("chromaSmoothing", chromaKey?.smoothing ?? 0.1)
        if (this.state.displaySourceMap[id].match(/^S/)) {
            let stack = 0
            if      (this.state.displaySourceMap[id] === "S1") stack = 0
            else if (this.state.displaySourceMap[id] === "S2") stack = 1
            material.setInt("stack", stack)
            material.setInt("stacks", this.state.videoStacks)
            material.setInt("stackAlphaInvert", 0)
        }
        else if (this.state.displayMediaURL.get(mediaId)!.match(/\.(?:smp4|swebm)$/) && this.state.displaySourceMap[id].match(/^M/)) {
            material.setInt("stack", 0)
            material.setInt("stacks", 1)
            material.setInt("stackAlphaInvert", 0)
        }
        else if (this.state.displaySourceMap[id].match(/^M/))
            material.setInt("stacks", 0)
        material.zOffset = -200
        /* material.needAlphaBlending = () => true */
        /* material.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST */

        /*  remember old material  */
        const materialOld = mesh.material as BABYLON.PBRMaterial

        /*  store original material once  */
        const materialOriginal = !this.state.displayMeshMaterial.has(mesh)
        if (materialOriginal)
            this.state.displayMeshMaterial.set(mesh, materialOld)

        /*  apply new material  */
        mesh.material = material

        /*  optionally unload previously loaded material  */
        if (materialOld instanceof BABYLON.ShaderMaterial && !materialOriginal) {
            /*  dispose material texture  */
            const texture = this.state.displayMaterial2Texture.get(materialOld)
            if (texture !== undefined && texture !== null)
                await this.unloadMediaTexture(texture)
            this.state.displayMaterial2Texture.delete(materialOld)

            /*  dispose material  */
            materialOld.dispose(true, false)
        }
    }

    /*  unapply video stream from mesh  */
    async unapplyDisplayMaterial (id: VideoStackId, mesh: BABYLON.Mesh) {
        this.log("INFO", `unapply texture material from display "${id}"`)

        /*  dispose material texture  */
        if (mesh.material) {
            const texture = this.state.displayMaterial2Texture.get(mesh.material)
            if (texture !== undefined && texture !== null)
                await this.unloadMediaTexture(texture)
            this.state.displayMaterial2Texture.delete(mesh.material)
        }

        /*  dispose material (and restore orginal material)  */
        if (mesh.material instanceof BABYLON.ShaderMaterial && this.state.displayMeshMaterial.has(mesh)) {
            mesh.material.dispose(true, false)
            mesh.material = this.state.displayMeshMaterial.get(mesh)!
            this.state.displayMeshMaterial.delete(mesh)
        }
    }

    /*  reflect current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        this.state.modifiedMedia = {} as { [ id: string ]: boolean }
        if (state.media !== undefined) {
            /*  adjust medias  */
            if (this.state.displayMediaURL.get("media1") !== state.media!.media1) {
                this.state.displayMediaURL.set("media1", state.media.media1)
                this.state.modifiedMedia.media1 = true
            }
            if (this.state.displayMediaURL.get("media2") !== state.media.media2) {
                this.state.displayMediaURL.set("media2", state.media.media2)
                this.state.modifiedMedia.media2 = true
            }
            if (this.state.displayMediaURL.get("media3") !== state.media.media3) {
                this.state.displayMediaURL.set("media3", state.media.media3)
                this.state.modifiedMedia.media3 = true
            }
            if (this.state.displayMediaURL.get("media4") !== state.media.media4) {
                this.state.displayMediaURL.set("media4", state.media.media4)
                this.state.modifiedMedia.media4 = true
            }
        }
    }
}

