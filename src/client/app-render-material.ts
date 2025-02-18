/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import Config                    from "./app-render-config"
import { type API }              from "./app-render-api"
import State, { type ChromaKey } from "./app-render-state"
import ShaderMaterial            from "./app-render-shader"

/*  import internal dependencies (shared)  */
import { StateTypePartial }      from "../common/app-state"

type VideoStackId = "monitor" | "decal" | "hologram" | "plate" | "pane" | "pillar" | "mask"

export default class Material {
    private displayMeshMaterial     = new Map<BABYLON.Mesh, BABYLON.Nullable<BABYLON.Material>>()
    private displayMediaURL         = new Map<string, string>()
    private displayMaterial2Texture = new Map<BABYLON.Material, BABYLON.Texture>()
    private displayTextureByURL     = new Map<string, BABYLON.Texture>()
    private displayTextureInfo      = new Map<BABYLON.Texture, { type: string, url: string, refs: number }>()
    private displaySourceMap        = { decal: "S1", monitor: "S2", plate: "S1", hologram: "S2", pane: "S2", pillar: "S2", mask: "S2" } as { [ id: string ]: string }
    private modifiedMedia           = {} as { [ id: string ]: boolean }

    constructor (
        private api:   API,
        private state: State,
        private log:   (level: string, msg: string) => void
    ) {}

    /*  load media texture  */
    async loadMediaTexture (url: string): Promise<BABYLON.Nullable<BABYLON.Texture>> {
        let texture: BABYLON.Nullable<BABYLON.Texture> = null
        if (this.displayTextureByURL.has(url)) {
            /*  provide existing texture  */
            texture = this.displayTextureByURL.get(url)!
            const info = this.displayTextureInfo.get(texture)!
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
                this.displayTextureByURL.set(url, texture!)
                this.displayTextureInfo.set(texture!, { type: "image", url, refs: 1 })
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
                this.displayTextureByURL.set(url, texture!)
                this.displayTextureInfo.set(texture!, { type: "video", url, refs: 1 })
            }
            else
                throw new Error("invalid media filename (neither PNG, JPG, GIF, MP4 or WebM)")
        }
        return texture
    }

    /*  unload media texture  */
    async unloadMediaTexture (texture: BABYLON.Texture) {
        /*  sanity check: ensure texture is known  */
        if (!this.displayTextureInfo.has(texture))
            throw new Error("invalid texture")

        /*  decrease reference count and in case texture is
            still used still do not unload anything  */
        const info = this.displayTextureInfo.get(texture)!
        if (info && info.refs > 1) {
            info.refs--
            return
        }

        /*  unload texture by disposing all resources  */
        this.log("INFO", `unloading ${info.type} media "${info.url}"`)
        this.displayTextureInfo.delete(texture)
        this.displayTextureByURL.delete(info.url)
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

    /*  check whether material was modified  */
    isMediaModified (id: string) {
        return this.modifiedMedia[this.api.material.mapMediaId(id)]
    }

    /*  apply video stream onto mesh  */
    async applyDisplayMaterial (id: VideoStackId, mesh: BABYLON.Mesh, opacity: number, borderRad: number, borderCrop: number, chromaKey: ChromaKey | null) {
        this.log("INFO", `apply texture material to display "${id}"`)

        /*  determine media id  */
        let mediaId = ""
        if (this.displaySourceMap[id].match(/^M/))
            mediaId = this.mapMediaId(this.displaySourceMap[id])

        /*  determine texture  */
        let texture: BABYLON.Nullable<BABYLON.Texture> = null
        if (this.displaySourceMap[id].match(/^S/) && this.api.stream.getVideoTexture() !== null)
            texture = this.api.stream.getVideoTexture()
        else if (this.displaySourceMap[id].match(/^M/) && this.displayMediaURL.has(mediaId))
            texture = await this.loadMediaTexture(this.displayMediaURL.get(mediaId)!).catch(() => null)

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
        if (this.displaySourceMap[id].match(/^M/))
            this.displayMaterial2Texture.set(material, texture)
        material.setTexture("textureSampler", texture)
        material.setFloat("opacity", opacity)
        material.setFloat("borderRadius", borderRad)
        material.setFloat("borderCrop", borderCrop)
        material.setInt("chromaEnable", chromaKey?.enable ? 1 : 0)
        material.setFloat("chromaThreshold", chromaKey?.threshold ?? 0.4)
        material.setFloat("chromaSmoothing", chromaKey?.smoothing ?? 0.1)
        if (this.displaySourceMap[id].match(/^S/)) {
            let stack = 0
            if      (this.displaySourceMap[id] === "S1") stack = 0
            else if (this.displaySourceMap[id] === "S2") stack = 1
            material.setInt("stack", stack)
            material.setInt("stacks", Config.videoStacks)
            material.setInt("stackAlphaInvert", 0)
        }
        else if (this.displayMediaURL.get(mediaId)!.match(/\.(?:smp4|swebm)$/) && this.displaySourceMap[id].match(/^M/)) {
            material.setInt("stack", 0)
            material.setInt("stacks", 1)
            material.setInt("stackAlphaInvert", 0)
        }
        else if (this.displaySourceMap[id].match(/^M/))
            material.setInt("stacks", 0)
        material.zOffset = -200
        /* material.needAlphaBlending = () => true */
        /* material.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST */

        /*  remember old material  */
        const materialOld = mesh.material as BABYLON.PBRMaterial

        /*  store original material once  */
        const materialOriginal = !this.displayMeshMaterial.has(mesh)
        if (materialOriginal)
            this.displayMeshMaterial.set(mesh, materialOld)

        /*  apply new material  */
        mesh.material = material

        /*  optionally unload previously loaded material  */
        if (materialOld instanceof BABYLON.ShaderMaterial && !materialOriginal) {
            /*  dispose material texture  */
            const texture = this.displayMaterial2Texture.get(materialOld)
            if (texture !== undefined && texture !== null)
                await this.unloadMediaTexture(texture)
            this.displayMaterial2Texture.delete(materialOld)

            /*  dispose material  */
            materialOld.dispose(true, false)
        }
    }

    /*  unapply video stream from mesh  */
    async unapplyDisplayMaterial (id: VideoStackId, mesh: BABYLON.Mesh) {
        this.log("INFO", `unapply texture material from display "${id}"`)

        /*  dispose material texture  */
        if (mesh.material) {
            const texture = this.displayMaterial2Texture.get(mesh.material)
            if (texture !== undefined && texture !== null)
                await this.unloadMediaTexture(texture)
            this.displayMaterial2Texture.delete(mesh.material)
        }

        /*  dispose material (and restore orginal material)  */
        if (mesh.material instanceof BABYLON.ShaderMaterial && this.displayMeshMaterial.has(mesh)) {
            mesh.material.dispose(true, false)
            mesh.material = this.displayMeshMaterial.get(mesh)!
            this.displayMeshMaterial.delete(mesh)
        }
    }

    /*  reflect current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        this.modifiedMedia = {} as { [ id: string ]: boolean }
        if (state.media !== undefined) {
            /*  adjust medias  */
            if (this.displayMediaURL.get("media1") !== state.media!.media1) {
                this.displayMediaURL.set("media1", state.media.media1)
                this.modifiedMedia.media1 = true
            }
            if (this.displayMediaURL.get("media2") !== state.media.media2) {
                this.displayMediaURL.set("media2", state.media.media2)
                this.modifiedMedia.media2 = true
            }
            if (this.displayMediaURL.get("media3") !== state.media.media3) {
                this.displayMediaURL.set("media3", state.media.media3)
                this.modifiedMedia.media3 = true
            }
            if (this.displayMediaURL.get("media4") !== state.media.media4) {
                this.displayMediaURL.set("media4", state.media.media4)
                this.modifiedMedia.media4 = true
            }
        }
    }

    /*  lookup/register source for display  */
    /* eslint no-dupe-class-members: off */
    displaySource (display: string): string
    displaySource (display: string, source: string): void
    displaySource (display: string, source?: string): any {
        if (source !== undefined)
            this.displaySourceMap[display] = source
        else
            return this.displaySourceMap[display]
    }
}

