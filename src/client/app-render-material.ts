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
import ShaderVertex              from "./app-render-material-stream.vs?raw"
import ShaderFragment            from "./app-render-material-stream.fs?raw"
import { type ChromaKey }        from "./app-render-utils"

/*  import internal dependencies (shared)  */
import { StateTypePartial }      from "../common/app-state"

/*  utility type of display video stacks  */
type VideoStackId = "monitor" | "decal" | "hologram" | "plate" | "pane" | "pillar" | "mask"

/*  exported rendering feature  */
export default class Material {
    /*  internal state  */
    private meshMaterial     = new Map<BABYLON.Mesh, BABYLON.Nullable<BABYLON.Material>>()
    private mediaURL         = new Map<string, string>()
    private material2Texture = new Map<BABYLON.Material, BABYLON.Texture>()
    private textureByURL     = new Map<string, BABYLON.Texture>()
    private textureInfo      = new Map<BABYLON.Texture, { type: string, url: string, refs: number }>()
    private sourceMap        = { decal: "S1", monitor: "S2", plate: "S1", hologram: "S2", pane: "S2", pillar: "S2", mask: "S2" } as { [ id: string ]: string }
    private modifiedMedia    = {} as { [ id: string ]: boolean }

    /*  create feature  */
    constructor (private api: API) {}

    /*  load media texture  */
    async loadMediaTexture (url: string): Promise<BABYLON.Nullable<BABYLON.Texture>> {
        let texture: BABYLON.Nullable<BABYLON.Texture> = null
        if (this.textureByURL.has(url)) {
            /*  provide existing texture  */
            texture = this.textureByURL.get(url)!
            const info = this.textureInfo.get(texture)!
            info.refs++
        }
        else {
            /*  provide new texture  */
            if (url.match(/.+\.(?:png|jpg|gif)$/)) {
                /*  provide texture based on image media  */
                this.api.renderer.log("INFO", `loading image media "${url}"`)
                await new Promise((resolve, reject) => {
                    texture = new BABYLON.Texture(
                        url, this.api.scene.getScene(), false, false,
                        BABYLON.VideoTexture.NEAREST_SAMPLINGMODE,
                        null,
                        (msg, ex) => {
                            this.api.renderer.log("ERROR", `failed to load image media "${url}": ${msg}`)
                            if (texture)
                                texture.dispose()
                            reject(ex)
                        }
                    )
                    BABYLON.Texture.WhenAllReady([ texture ], () => {
                        resolve(true)
                    })
                })
                this.textureByURL.set(url, texture!)
                this.textureInfo.set(texture!, { type: "image", url, refs: 1 })
            }
            else if (url.match(/.+\.(?:smp4|mp4|swebm|webm)$/)) {
                /*  provide texture based on video media  */
                this.api.renderer.log("INFO", `loading video media "${url}"`)
                const loop = (url.match(/.+-loop\.(?:smp4|mp4|swebm|webm)$/) !== null)
                await new Promise((resolve, reject) => {
                    texture = new BABYLON.VideoTexture(
                        url, url, this.api.scene.getScene(), false, true,
                        BABYLON.VideoTexture.NEAREST_SAMPLINGMODE,
                        { autoPlay: true, muted: true, autoUpdateTexture: true, loop },
                        (msg, ex) => {
                            this.api.renderer.log("ERROR", `failed to load video media "${url}": ${msg}`)
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
                this.textureByURL.set(url, texture!)
                this.textureInfo.set(texture!, { type: "video", url, refs: 1 })
            }
            else
                throw new Error("invalid media filename (neither PNG, JPG, GIF, MP4 or WebM)")
        }
        return texture
    }

    /*  unload media texture  */
    async unloadMediaTexture (texture: BABYLON.Texture) {
        /*  sanity check: ensure texture is known  */
        if (!this.textureInfo.has(texture))
            throw new Error("invalid texture")

        /*  decrease reference count and in case texture is
            still used still do not unload anything  */
        const info = this.textureInfo.get(texture)!
        if (info && info.refs > 1) {
            info.refs--
            return
        }

        /*  unload texture by disposing all resources  */
        this.api.renderer.log("INFO", `unloading ${info.type} media "${info.url}"`)
        this.textureInfo.delete(texture)
        this.textureByURL.delete(info.url)
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

    /*  create a shader material from vertex and fragment shaders  */
    async createStreamShaderMaterial (id: string) {
        /*  create shader material  */
        const scene = this.api.scene.getScene()
        const material = new BABYLON.ShaderMaterial(`stream-${id}`, scene, {
            vertexSource:   ShaderVertex,
            fragmentSource: ShaderFragment
        }, {
            needAlphaBlending: true,
            needAlphaTesting:  false,
            attributes: [ "position", "uv" ],
            uniforms: [
                /*  standard BabylonJS uniforms  */
                "worldViewProjection",

                /*  custom application uniforms  */
                "visibility",
                "textureSampler",
                "opacity",
                "borderRadius",
                "borderRadiusSoftness",
                "borderCrop",
                "chromaEnable",
                "chromaThreshold",
                "chromaSmoothing",
                "stack",
                "stacks",
                "stackAlphaInvert",

                /*  custom application uniforms (hard-coded)  */
                "chromaCol"
            ],
            samplers: [ "textureSampler" ]
        })

        /*  set default values for parameters  */
        material.setFloat("visibility", 1.0)
        material.setFloat("opacity", 1.0)
        material.setFloat("borderRadius", 40)
        material.setFloat("bordersRadiusSoftness", 1.0)
        material.setFloat("borderCrop", 0.0)
        material.setInt("chromaEnable", 0)
        material.setFloat("chromaThreshold", 0.4)
        material.setFloat("chromaSmoothing", 0.1)
        material.setVector3("chromaCol", new BABYLON.Vector3(0.0, 1.0, 0.0))
        material.setInt("stack", 0)
        material.setInt("stacks", 1)
        material.setInt("stackAlphaInvert", 1)

        /*  wait for shader compilation  */
        await new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                if (material.isReady()) {
                    clearInterval(interval)
                    resolve()
                }
            }, 10)
        })

        return material
    }

    /*  apply video stream onto mesh  */
    async applyDisplayMaterial (id: VideoStackId, mesh: BABYLON.Mesh, opacity: number, borderRad: number, borderCrop: number, chromaKey: ChromaKey | null) {
        this.api.renderer.log("INFO", `apply texture material to display "${id}"`)

        /*  determine media id  */
        let mediaId = ""
        if (this.sourceMap[id].match(/^M/))
            mediaId = this.mapMediaId(this.sourceMap[id])

        /*  determine texture  */
        let texture: BABYLON.Nullable<BABYLON.Texture> = null
        if (this.sourceMap[id].match(/^S/) && this.api.stream.getVideoTexture() !== null)
            texture = this.api.stream.getVideoTexture()
        else if (this.sourceMap[id].match(/^M/) && this.mediaURL.has(mediaId))
            texture = await this.loadMediaTexture(this.mediaURL.get(mediaId)!).catch(() => null)

        /*  short-circuit processing in case texture is not available  */
        if (texture === null) {
            this.api.renderer.log("WARNING", `failed to gather texture for "${id}" -- setting replacement texture`)
            const material = mesh.material as BABYLON.PBRMaterial
            material.albedoColor = new BABYLON.Color3(1.0, 0.0, 0.0)
            material.albedoTexture?.dispose()
            material.albedoTexture = null
            material.unlit = true
            return
        }

        /*  create new shader material  */
        const material = await this.createStreamShaderMaterial(id)
        if (this.sourceMap[id].match(/^M/))
            this.material2Texture.set(material, texture)
        material.setTexture("textureSampler", texture)
        material.setFloat("opacity", opacity)
        material.setFloat("borderRadius", borderRad)
        material.setFloat("borderCrop", borderCrop)
        material.setInt("chromaEnable", chromaKey?.enable ? 1 : 0)
        material.setFloat("chromaThreshold", chromaKey?.threshold ?? 0.4)
        material.setFloat("chromaSmoothing", chromaKey?.smoothing ?? 0.1)
        if (this.sourceMap[id].match(/^S/)) {
            let stack = 0
            if      (this.sourceMap[id] === "S1") stack = 0
            else if (this.sourceMap[id] === "S2") stack = 1
            material.setInt("stack", stack)
            material.setInt("stacks", Config.videoStacks)
            material.setInt("stackAlphaInvert", 0)
        }
        else if (this.mediaURL.get(mediaId)!.match(/\.(?:smp4|swebm)$/) && this.sourceMap[id].match(/^M/)) {
            material.setInt("stack", 0)
            material.setInt("stacks", 1)
            material.setInt("stackAlphaInvert", 0)
        }
        else if (this.sourceMap[id].match(/^M/))
            material.setInt("stacks", 0)
        material.zOffset = -200

        /*  remember old material  */
        const materialOld = mesh.material as BABYLON.PBRMaterial

        /*  store original material once  */
        const materialOriginal = !this.meshMaterial.has(mesh)
        if (materialOriginal)
            this.meshMaterial.set(mesh, materialOld)

        /*  apply new material  */
        mesh.material = material

        /*  optionally unload previously loaded material  */
        if (materialOld instanceof BABYLON.ShaderMaterial && !materialOriginal) {
            /*  dispose material texture  */
            const texture = this.material2Texture.get(materialOld)
            if (texture !== undefined && texture !== null)
                await this.unloadMediaTexture(texture)
            this.material2Texture.delete(materialOld)

            /*  dispose material  */
            materialOld.dispose(true, false)
        }
    }

    /*  unapply video stream from mesh  */
    async unapplyDisplayMaterial (id: VideoStackId, mesh: BABYLON.Mesh) {
        this.api.renderer.log("INFO", `unapply texture material from display "${id}"`)

        /*  dispose material texture  */
        if (mesh.material) {
            const texture = this.material2Texture.get(mesh.material)
            if (texture !== undefined && texture !== null)
                await this.unloadMediaTexture(texture)
            this.material2Texture.delete(mesh.material)
        }

        /*  dispose material (and restore orginal material)  */
        if (mesh.material instanceof BABYLON.ShaderMaterial && this.meshMaterial.has(mesh)) {
            mesh.material.dispose(true, false)
            mesh.material = this.meshMaterial.get(mesh)!
            this.meshMaterial.delete(mesh)
        }
    }

    /*  reflect current scene state  */
    async reflectSceneState (state: StateTypePartial["media"]) {
        this.modifiedMedia = {} as { [ id: string ]: boolean }
        if (state !== undefined) {
            /*  adjust medias  */
            if (state.media1 !== undefined && this.mediaURL.get("media1") !== state.media1) {
                this.mediaURL.set("media1", state.media1)
                this.modifiedMedia.media1 = true
            }
            if (state.media2 !== undefined && this.mediaURL.get("media2") !== state.media2) {
                this.mediaURL.set("media2", state.media2)
                this.modifiedMedia.media2 = true
            }
            if (state.media3 !== undefined && this.mediaURL.get("media3") !== state.media3) {
                this.mediaURL.set("media3", state.media3)
                this.modifiedMedia.media3 = true
            }
            if (state.media4 !== undefined && this.mediaURL.get("media4") !== state.media4) {
                this.mediaURL.set("media4", state.media4)
                this.modifiedMedia.media4 = true
            }
        }
    }

    /*  lookup/register source for display  */
    displaySource (display: string): string
    displaySource (display: string, source: string): void
    displaySource (display: string, source?: string): any {
        if (source !== undefined)
            this.sourceMap[display] = source
        else
            return this.sourceMap[display]
    }
}

