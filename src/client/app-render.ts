/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import EventEmitter   from "eventemitter2"
import * as BABYLON   from "@babylonjs/core"
import                     "@babylonjs/loaders/glTF"

/*  import internal dependencies  */
import ShaderMaterial from "./app-shader"
import PTZ            from "./app-ptz"
import { MixerState } from "../common/app-mixer"
import { FreeDState } from "../common/app-freed"
import { StateType, StateTypePartial } from "../common/app-state"

/*  utility type  */
type ChromaKey = { enable: boolean, threshold: number, smoothing: number }

/*  the canvas rendering class  */
export default class CanvasRenderer extends EventEmitter {
    /*  (re-)configure camera (by name) and options (by URL)  */
    constructor (params: { cameraName: string, ptzFreeD: boolean, ptzKeys: boolean }) {
        super()
        this.cameraName  = params.cameraName
        this.ptzFreeD    = params.ptzFreeD
        this.ptzKeys     = params.ptzKeys
        this.flippedCam  = this.flippedCams.includes(params.cameraName)

        /*  mapping of camera to type  */
        const camNameToTypeMap = {
            CAM1: "birddog",
            CAM2: "birddog",
            CAM3: "panasonic",
            CAM4: "birddog",
            CAM5: "birddog"
        }
        const cameraType = camNameToTypeMap[this.cameraName as "CAM1" | "CAM2" | "CAM3" | "CAM4"| "CAM5"] as "birddog" | "panasonic"

        /*  instantiate PTZ  */
        this.ptz     = new PTZ(cameraType)
        this.ptzHull = new PTZ(cameraType)
        this.ptzCase = new PTZ(cameraType)
        this.ptzLens = new PTZ(cameraType)
    }

    /*  internal parameter state  */
    private ptzFreeD          = false
    private ptzKeys           = false
    private cameraName:       string
    private texture1URL       = ""
    private texture2URL       = ""
    private fadeTrans         = 2  * 1000
    private fadeWait          = 10 * 1000
    private decalRotate       = 0.0
    private decalLift         = 0.0
    private decalScale        = 1.0
    private decalFade         = 0
    private decalOpacity      = 1.0
    private decalBorderRad    = 40.0
    private decalBorderCrop   = 0.0
    private decalChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private monitorFade       = 0
    private videoMeshMaterial = {} as { [ name: string ]: BABYLON.Nullable<BABYLON.Material> }
    private monitorBase       = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0
    }
    private avatar1Scale      = { x: 0, y: 0, z: 0 }
    private avatar2Scale      = { x: 0, y: 0, z: 0 }
    private flippedCams       = [ "CAM3" ]
    private flippedCam        = false

    /*  frames per second (FPS) control  */
    private fps = 30
    private fpsFactor = {
        1: 60, 2: 30, 3: 20, 4: 15, 5: 12, 6: 10, 10: 6, 12: 5, 15: 4, 20: 3, 30: 2, 60: 1
    } as { [ fps: number ]: number }
    private fpsProgram = 30
    private fpsPreview = 30
    private fpsOther   = 30

    /*  current camera mixer state  */
    private mixerProgram = ""
    private mixerPreview = ""

    /*  latest sync time  */
    private syncTime = 0

    /*  effectively constant values of canvas/wall  */
    private wallWidth   = 10540
    private wallHeight  = 3570

    /*  effectively constant values of video stream  */
    private videoStreamWidth  = 1920
    private videoStreamHeight = 1080
    private videoStreamFPS    = 30

    /*  rendering object references  */
    private engine:         BABYLON.Nullable<BABYLON.Engine>         = null
    private scene:          BABYLON.Nullable<BABYLON.Scene>          = null
    private optimizer:      BABYLON.Nullable<BABYLON.SceneOptimizer> = null
    private cameraHull:     BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraCase:     BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraLens:     BABYLON.Nullable<BABYLON.FreeCamera>     = null
    private monitor:        BABYLON.Nullable<BABYLON.TransformNode>  = null
    private monitorCase:    BABYLON.Nullable<BABYLON.Mesh>           = null
    private monitorDisplay: BABYLON.Nullable<BABYLON.Mesh>           = null
    private avatar1:        BABYLON.Nullable<BABYLON.TransformNode>  = null
    private avatar1Model:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private avatar2:        BABYLON.Nullable<BABYLON.TransformNode>  = null
    private avatar2Model:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private references:     BABYLON.Nullable<BABYLON.TransformNode>  = null
    private wall:           BABYLON.Nullable<BABYLON.Mesh>           = null
    private decal:          BABYLON.Nullable<BABYLON.Mesh>           = null
    private light1:         BABYLON.Nullable<BABYLON.PointLight>     = null
    private light2:         BABYLON.Nullable<BABYLON.PointLight>     = null
    private light3:         BABYLON.Nullable<BABYLON.PointLight>     = null
    private material:       BABYLON.Nullable<BABYLON.NodeMaterial>   = null
    private texture1:       BABYLON.Nullable<BABYLON.Texture>        = null
    private texture2:       BABYLON.Nullable<BABYLON.Texture>        = null
    private texture3:       BABYLON.Nullable<BABYLON.Texture>        = null
    private wallRotBase:    BABYLON.Nullable<BABYLON.Quaternion>     = null

    /*  video stream device names  */
    private deviceMonitor = "dummy"
    private deviceDecal   = "dummy"
    private deviceDecal2  = "dummy"

    /*  PTZ sub-module  */
    private ptz:     PTZ
    private ptzHull: PTZ
    private ptzCase: PTZ
    private ptzLens: PTZ

    /*  FreeD state  */
    private state: FreeDState | null = null

    /*  cross-fade timer  */
    private fadeTimer: ReturnType<typeof setTimeout> | null = null
    private texFade: BABYLON.Nullable<BABYLON.InputBlock> | null = null

    /*  initially establish rendering engine and scene  */
    async establish (canvas: HTMLCanvasElement) {
        /*  establish rendering engine on canvas element  */
        this.engine = new BABYLON.Engine(canvas, true, {
            useExactSrgbConversions: true,
            doNotHandleContextLost:  true
        })
        if (this.engine === null)
            throw new Error("cannot establish Babylon engine")
        window.addEventListener("resize", () => {
            this.engine!.resize()
        })

        /*  load the Blender glTF scene export  */
        this.emit("log", "INFO", "loading Studio Canvas scene")
        BABYLON.SceneLoader.ShowLoadingScreen = false
        this.scene = await new Promise((resolve, reject) => {
            BABYLON.SceneLoader.Load("/res/", "canvas-scene.glb", this.engine, (scene) => {
                /*  wait for shaders and textures to be ready, too  */
                scene.executeWhenReady(() => {
                    resolve(scene)
                })
            })
        })
        if (this.scene === null)
            throw new Error("failed to create scene")

        /*  create studio environment for correct texture image colors  */
        this.emit("log", "INFO", "loading Studio Canvas environment")
        this.scene.createDefaultEnvironment({
            environmentTexture: "/res/canvas-scene.env",
            skyboxColor: new BABYLON.Color3(0.5, 0.5, 0.5)
        })

        /*  use particular camera of scene  */
        this.cameraHull = this.scene.getNodeByName(this.cameraName + "-Hull") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.cameraHull === null)
            throw new Error("cannot find camera hull")
        this.cameraCase = this.scene.getNodeByName(this.cameraName + "-Case") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.cameraCase === null)
            throw new Error("cannot find camera case")
        this.cameraLens = this.scene.getCameraByName(this.cameraName + "-Lens") as BABYLON.FreeCamera
        if (this.cameraLens === null)
            throw new Error("cannot find camera device")

        /*  initialize camera  */
        this.scene.activeCamera = this.cameraLens
        this.cameraLens.fovMode = BABYLON.FreeCamera.FOVMODE_HORIZONTAL_FIXED
        this.cameraCase.rotationQuaternion = null

        /*  initialize camera pan/tilt center position  */
        this.ptzHull.posXOrigin   = this.cameraHull.position.x
        this.ptzHull.posYOrigin   = this.cameraHull.position.y
        this.ptzHull.posZOrigin   = this.cameraHull.position.z
        this.ptzCase.tiltOrigin   = this.cameraCase.rotation.x
        this.ptzCase.panOrigin    = this.cameraCase.rotation.y
        this.ptzCase.rotateOrigin = this.cameraCase.rotation.z
        this.ptzLens.tiltOrigin   = this.cameraLens.rotation.x

        /*  go to camera home position  */
        this.cameraHull!.position.x = this.ptzHull.posXP2V(0)
        this.cameraHull!.position.y = this.ptzHull.posYP2V(0)
        this.cameraHull!.position.z = this.ptzHull.posZP2V(0)
        this.cameraCase!.rotation.x = this.ptzCase.tiltP2V(0)
        this.cameraCase!.rotation.y = this.ptzCase.panP2V(0)
        this.cameraCase!.rotation.z = this.ptzCase.rotateP2V(0)
        this.cameraLens!.rotation.x = this.ptzLens.tiltP2V(0)
        this.cameraLens!.fov        = this.ptzLens.zoomP2V(0)

        /*  apply latest PTZ (if already available)  */
        if (this.state !== null && this.ptzFreeD)
            this.reflectFreeDState(this.state)

        /*  allow keyboard to manually adjust camera  */
        if (this.ptzKeys) {
            this.scene.onKeyboardObservable.add((kbInfo) => {
                if (kbInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN)
                    return
                this.reactOnKeyEvent(kbInfo.event.key)
            })
        }

        /*  manually optimize engine  */
        this.engine.enableOfflineSupport = false

        /*  manually optimize scene  */
        this.scene.skipPointerMovePicking = true
        this.scene.autoClear = false
        this.scene.autoClearDepthAndStencil = false

        /*  automatically optimize scene  */
        const options = new BABYLON.SceneOptimizerOptions(this.fps, 2000)
        options.addOptimization(new BABYLON.HardwareScalingOptimization(0, 1))
        this.optimizer = new BABYLON.SceneOptimizer(this.scene, options)

        /*  gather reference to avatar 1  */
        this.avatar1 = this.scene.getNodeByName("Avatar1") as BABYLON.Nullable<BABYLON.TransformNode>
        this.avatar1Model = this.scene.getNodeByName("Avatar1-Model") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.avatar1 === null)
            throw new Error("cannot find node 'Avatar1'")
        if (this.avatar1Model === null)
            throw new Error("cannot find node 'Avatar1-Model'")
        this.avatar1.setEnabled(false)
        this.avatar1Scale.x = this.avatar1Model.scaling.x
        this.avatar1Scale.y = this.avatar1Model.scaling.y
        this.avatar1Scale.z = this.avatar1Model.scaling.z

        /*  gather reference to avatar 2  */
        this.avatar2 = this.scene.getNodeByName("Avatar2") as BABYLON.Nullable<BABYLON.TransformNode>
        this.avatar2Model = this.scene.getNodeByName("Avatar2-Model") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.avatar2 === null)
            throw new Error("cannot find node 'Avatar2'")
        if (this.avatar2Model === null)
            throw new Error("cannot find node 'Avatar2-Model'")
        this.avatar2.setEnabled(false)
        this.avatar2Scale.x = this.avatar2Model.scaling.x
        this.avatar2Scale.y = this.avatar2Model.scaling.y
        this.avatar2Scale.z = this.avatar2Model.scaling.z

        /*  gather reference to reference points  */
        this.references = this.scene.getNodeByName("Reference") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.references === null)
            throw new Error("cannot find node 'References'")
        this.references.setEnabled(true)

        /*  gather references to spotlight  */
        this.light1 = this.scene.getLightByName("Light-1") as BABYLON.Nullable<BABYLON.PointLight>
        this.light2 = this.scene.getLightByName("Light-2") as BABYLON.Nullable<BABYLON.PointLight>
        this.light3 = this.scene.getLightByName("Light-3") as BABYLON.Nullable<BABYLON.PointLight>
        if (this.light1 === null || this.light2 === null || this.light3 === null)
            throw new Error("cannot find lights nodes")
        this.wall = this.scene.getMeshByName("Wall") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.wall === null)
            throw new Error("cannot find wall node")
        this.wallRotBase = this.wall.rotationQuaternion

        /*  on-the-fly generate wall video decal  */
        this.decalGenerate()

        /*  gather references to monitor mesh nodes  */
        this.monitor        = this.scene.getNodeByName("Monitor")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.monitorCase    = this.scene.getMeshByName("Monitor-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.monitorDisplay = this.scene.getMeshByName("Monitor-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.monitor === null || this.monitorCase === null || this.monitorDisplay === null)
            throw new Error("cannot find monitor mesh nodes")

        /*  setup light shadow casting the display onto the wall  */
        const setupLight = (light: BABYLON.PointLight) => {
            light.intensityMode = BABYLON.PointLight.INTENSITYMODE_LUMINOUSPOWER
            light.intensity  = 0
            light.shadowMinZ = 1.0
            light.shadowMaxZ = 5.0
            light.radius     = 0.25
            const sg = new BABYLON.ShadowGenerator(512, light)
            sg.usePoissonSampling               = false
            sg.useExponentialShadowMap          = false
            sg.useBlurExponentialShadowMap      = false
            sg.useCloseExponentialShadowMap     = false
            sg.useBlurCloseExponentialShadowMap = false
            sg.usePercentageCloserFiltering     = true
            sg.addShadowCaster(this.monitorDisplay!)
            sg.addShadowCaster(this.monitorCase!)
        }
        setupLight(this.light1)
        setupLight(this.light2)
        setupLight(this.light3)
        this.wall.receiveShadows = true

        /*  initialize monitor base values  */
        this.monitorBase.scaleCaseX    = this.monitorCase.scaling.x
        this.monitorBase.scaleCaseY    = this.monitorCase.scaling.y
        this.monitorBase.scaleCaseZ    = this.monitorCase.scaling.z
        this.monitorBase.scaleDisplayX = this.monitorDisplay.scaling.x
        this.monitorBase.scaleDisplayY = this.monitorDisplay.scaling.y
        this.monitorBase.scaleDisplayZ = this.monitorDisplay.scaling.z
        this.monitorBase.rotationZ     = this.monitor.rotation.z
        this.monitorBase.positionZ     = this.monitor.position.z

        /*  apply glass material to monitor case  */
        const glass = new BABYLON.PBRMaterial("glass", this.scene)
        glass.indexOfRefraction    = 1.52
        glass.alpha                = 0.1
        glass.directIntensity      = 1.0
        glass.environmentIntensity = 1.0
        glass.microSurface         = 1
        glass.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.monitorCase.material = glass

        /*  ensure video devices can be enumerated later
            (we just ignore resulting stream for now)  */
        this.emit("log", "INFO", "requesting video device access")
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {})

        /*  manually optimize scene  */
        this.scene.cleanCachedTextureBuffer()
    }

    /*  render the scene once  */
    private renderCount = 0
    private renderOnce = () => {
        if (this.fps === 0)
            return
        if ((this.renderCount++ % this.fpsFactor[this.fps]) !== 0)
            return
        if (this.scene === null)
            return
        this.scene.render()
    }

    /*  start/stop renderer  */
    async start () {
        /*  start render loop and scene optimizer  */
        if (this.engine !== null)
            this.engine.runRenderLoop(this.renderOnce)
        if (this.optimizer !== null)
            this.optimizer.start()
    }
    async stop () {
        /*  stop scene optimizer and render loop  */
        if (this.optimizer !== null)
            this.optimizer.stop()
        if (this.engine !== null)
            this.engine.stopRenderLoop(this.renderOnce)

        /*  give still active render loop iteration time to complete  */
        await new Promise((resolve, reject) => {
            setTimeout(() => resolve(true), 2 * (1000 / (this.fps === 0 ? 1 : this.fps)))
        })
    }

    /*  load canvas/wall texture(s)  */
    async loadWall () {
        /*  sanity check situation  */
        if (this.texture1URL === "")
            return

        /*  apply static (one image) or dynamic (two images) texture to wall  */
        this.texture1 = new BABYLON.Texture(this.texture1URL, this.scene, false, false)
        this.texture2 = this.texture2URL !== "" ? new BABYLON.Texture(this.texture2URL, this.scene, false, false) : null
        const wall = this.scene!.getMaterialByName("Wall") as BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        if (this.texture2 === null) {
            /*  single image texture  */
            await new Promise((resolve) => {
                BABYLON.Texture.WhenAllReady([ this.texture1! ], () => { resolve(true) })
            })
            wall.albedoTexture = this.texture1
        }
        else {
            /*  ==== two image cross-fade texture ====  */

            /*  await textures  */
            await new Promise((resolve) => {
                BABYLON.Texture.WhenAllReady([ this.texture1!, this.texture2! ], () => { resolve(true) })
            })

            /*  load externally defined node material  */
            this.material = await BABYLON.NodeMaterial.ParseFromFileAsync("material",
                "/res/canvas-material.json", this.scene!)

            /*  apply texture #1  */
            const textureBlock1 = this.material.getBlockByPredicate((input) =>
                input.name === "Texture1") as BABYLON.Nullable<BABYLON.TextureBlock>
            if (textureBlock1 === null)
                throw new Error("no such texture block named 'Texture1' found")
            textureBlock1.texture = this.texture1

            /*  apply texture #2  */
            const textureBlock2 = this.material.getBlockByPredicate((input) =>
                input.name === "Texture2") as BABYLON.Nullable<BABYLON.TextureBlock>
            if (textureBlock2 === null)
                throw new Error("no such texture block named 'Texture2' found")
            textureBlock2.texture = this.texture2

            /*  build material from textures  */
            this.material.build(false)

            /*  freeze material to optimize internal shader overhead  */
            this.material.freeze()

            /*  create and apply composed texture  */
            this.texture3 = this.material.createProceduralTexture(
                { width: this.wallWidth, height: this.wallHeight }, this.scene!)
            wall.albedoTexture = this.texture3

            /*  perform cross-fadings between textures  */
            this.texFade = this.material.getBlockByName("TextureFade") as
                BABYLON.Nullable<BABYLON.InputBlock>
            if (this.texFade === null)
                throw new Error("no such input block named 'TextureFade' found")
            await this.startWallFader()
        }
    }

    /*  unload canvas/wall texture(s)  */
    async unloadWall () {
        const wall = this.scene!.getMaterialByName("Wall") as BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = null
        await this.stopWallFader()
        if (this.material !== null) {
            const textureBlock1 = this.material.getBlockByPredicate((input) =>
                input.name === "Texture1") as BABYLON.Nullable<BABYLON.TextureBlock>
            textureBlock1!.texture = null
            this.texture1?.dispose()
            this.texture1 = null
            const textureBlock2 = this.material.getBlockByPredicate((input) =>
                input.name === "Texture2") as BABYLON.Nullable<BABYLON.TextureBlock>
            textureBlock2!.texture = null
            this.texture2?.dispose()
            this.texture2 = null
            this.texture3?.dispose()
            this.texture3 = null
            this.material.dispose(true, true)
            this.material = null
        }
    }

    /*  start wall fader  */
    async startWallFader () {
        if (this.texFade === null)
            return
        let fade        = 0
        let fadeSign    = +1
        this.texFade.value = 1.0
        const fader = () => {
            this.fadeTimer = null
            const fadeInterval = 1000 / (this.fps === 0 ? 1 : this.fps)
            const fadeStep = 1.0 / (this.fadeTrans / fadeInterval)
            fade = fade + (fadeSign * fadeStep)
            let wait = fadeInterval
            if (fade > 1.0) {
                fade = 1.0
                fadeSign = -1
                wait = this.fadeWait
            }
            else if (fade < 0.0) {
                fade = 0.0
                fadeSign = +1
                wait = this.fadeWait
            }
            this.texFade!.value = fade
            if (this.texture2URL !== "")
                this.fadeTimer = setTimeout(fader, wait)
        }
        if (this.fadeTimer !== null)
            clearTimeout(this.fadeTimer)
        this.fadeTimer = setTimeout(fader, 0)
    }

    /*  stop wall fader  */
    async stopWallFader () {
        if (this.fadeTimer !== null) {
            clearTimeout(this.fadeTimer)
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(true), 2 * (1000 / (this.fps === 0 ? 1 : this.fps)))
            })
            this.fadeTimer = null
        }
    }

    /*  load video stream (and apply onto monitor/decal mesh)  */
    async loadVideoStream (name: string, mesh: BABYLON.Mesh, label: string, label2: string, opacity: number, borderRad: number, borderCrop: number, chromaKey: ChromaKey | null) {
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])

        /*  determine primary/content device  */
        const device = label !== "" ?
            devices.find((device) => device.kind === "videoinput" && device.label.substring(0, label.length) === label) :
            undefined
        if (device === undefined)
            this.emit("log", "INFO", `failed to load video stream "${label}" onto ${name}: no such device (using replacement content)`)
        else
            this.emit("log", "INFO", `loading video stream "${label}" onto ${name} (content channel)`)

        /*  determine secondary/alpha device  */
        const device2 = label2 !== "" ?
            devices.find((device) => device.kind === "videoinput" && device.label.substring(0, label2.length) === label2) :
            undefined
        if (label2 !== "") {
            if (device2 === undefined)
                this.emit("log", "INFO", `failed to load video stream "${label2}" onto ${name}: no such device (ignoring alpha channel)`)
            else
                this.emit("log", "INFO", `loading video stream "${label}" onto ${name} (alpha channel)`)
        }

        /*  optionally unload previously loaded material  */
        if (mesh.material instanceof BABYLON.ShaderMaterial && this.videoMeshMaterial[name]) {
            mesh.material.dispose()
            mesh.material = this.videoMeshMaterial[name]
            delete this.videoMeshMaterial[name]
        }

        /*  short-circuit processing in case a device was not found  */
        if (device === undefined || (label2 !== "" && device2 === undefined)) {
            const material = mesh.material as BABYLON.PBRMaterial
            material.albedoColor = new BABYLON.Color3(1.0, 0.0, 0.0)
            material.albedoTexture?.dispose()
            material.albedoTexture = null
            material.unlit = true
            return
        }

        /*  load mandatory primary/content device  */
        const vt1 = await BABYLON.VideoTexture.CreateFromWebCamAsync(this.scene!, {
            deviceId: device.deviceId,
            audio:    false,
            video:    {
                aspectRatio: 16 / 9,
                resizeMode:  "none",
                minWidth:    this.videoStreamWidth,
                width:       this.videoStreamWidth,
                maxWidth:    this.videoStreamWidth,
                minHeight:   this.videoStreamHeight,
                height:      this.videoStreamHeight,
                maxHeight:   this.videoStreamHeight,
                frameRate:   this.videoStreamFPS
            }
        } as any, false, false)

        /*  load optional secondary/alpha device  */
        let vt2: BABYLON.Nullable<BABYLON.Texture> = null
        if (device2 !== undefined) {
            vt2 = await BABYLON.VideoTexture.CreateFromWebCamAsync(this.scene!, {
                deviceId: device2.deviceId,
                audio:    false,
                video:    {
                    aspectRatio: 16 / 9,
                    resizeMode:  "none",
                    minWidth:    this.videoStreamWidth,
                    width:       this.videoStreamWidth,
                    maxWidth:    this.videoStreamWidth,
                    minHeight:   this.videoStreamHeight,
                    height:      this.videoStreamHeight,
                    maxHeight:   this.videoStreamHeight,
                    frameRate:   this.videoStreamFPS
                }
            } as any, false, false)
        }

        /*  await textures  */
        await new Promise((resolve) => {
            BABYLON.Texture.WhenAllReady(vt2 !== null ? [ vt1, vt2 ] : [ vt1 ], () => { resolve(true) })
        })

        /*  establish outer texture from device(s)  */
        let texture: BABYLON.Nullable<BABYLON.Texture>
        if (device2 === undefined)
            texture = vt1
        else {
            /*  load externally defined node material  */
            const material = await BABYLON.NodeMaterial.ParseFromFileAsync("material",
                "/res/device-material.json", this.scene!)

            /*  apply texture #1  */
            const textureBlock1 = material.getBlockByPredicate((input) =>
                input.name === "Texture1") as BABYLON.Nullable<BABYLON.TextureBlock>
            if (textureBlock1 === null)
                throw new Error("no such texture block named 'Texture1' found")
            textureBlock1.texture = vt1

            /*  apply texture #2  */
            const textureBlock2 = material.getBlockByPredicate((input) =>
                input.name === "Texture2") as BABYLON.Nullable<BABYLON.TextureBlock>
            if (textureBlock2 === null)
                throw new Error("no such texture block named 'Texture2' found")
            textureBlock2.texture = vt2

            /*  build and freeze material  */
            material.build(false)
            material.freeze()

            /*  create and apply composed RBA texture  */
            texture = material.createProceduralTexture({
                width: this.videoStreamWidth,
                height: this.videoStreamHeight
            }, this.scene!)
            if (texture === null)
                throw new Error("failed to create texture from video stream")
            texture.hasAlpha = true
        }

        /*  target mesh specific handling...  */
        if (name === "decal") {
            /*  special-effects video texture for Decal  */
            const materialOld = mesh.material as BABYLON.PBRMaterial
            materialOld.albedoTexture?.dispose()
            materialOld.albedoTexture = null
            this.videoMeshMaterial[name] = materialOld
            const material = mesh.material = ShaderMaterial.videoStream(name, this.scene!)
            material.setTexture("textureSampler", texture)
            material.setFloat("opacity", opacity)
            material.setFloat("borderRadius", borderRad)
            material.setFloat("borderCrop", borderCrop)
            material.setInt("chromaEnable", chromaKey?.enable ? 1 : 0)
            material.setFloat("chromaThreshold", chromaKey?.threshold ?? 0.4)
            material.setFloat("chromaSmoothing", chromaKey?.smoothing ?? 0.1)
            material.zOffset = -200
            material.needAlphaBlending = () => true
            material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
        }
        else if (name === "monitor") {
            /*  regular video texture for Monitor  */
            const material = mesh.material as BABYLON.PBRMaterial
            material.albedoColor = new BABYLON.Color3(1.0, 1.0, 1.0)
            material.albedoTexture?.dispose()
            material.albedoTexture = texture
            material.unlit = true
            material.useAlphaFromAlbedoTexture = true
            material.needAlphaBlending = () => true
            material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
        }
    }

    /*  unload video stream  */
    async unloadVideoStream (name: string, mesh: BABYLON.Mesh) {
        this.emit("log", "INFO", `unloading video stream from ${name}`)
        if (mesh.material instanceof BABYLON.ShaderMaterial && this.videoMeshMaterial[name]) {
            mesh.material.dispose()
            mesh.material = this.videoMeshMaterial[name]
            delete this.videoMeshMaterial[name]
        }
        const material = mesh.material as BABYLON.PBRMaterial
        material.albedoTexture?.dispose()
        material.albedoTexture = null
    }

    /*  (re-)generate the decal  */
    async decalGenerate () {
        /*  remember potentially old decal  */
        const oldDecal = this.decal

        /*  determine position, normal vector and size  */
        const rayBegin = this.scene!.getMeshByName("DecalRay-Begin") as BABYLON.Nullable<BABYLON.Mesh>
        const rayEnd   = this.scene!.getMeshByName("DecalRay-End")   as BABYLON.Nullable<BABYLON.Mesh>
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
        rayDirection = rotateVector(rayDirection, 0, 0, this.ptz.deg2rad(this.decalRotate))
        const ray = new BABYLON.Ray(rayBeginPos, rayDirection, 10 /* meters, enough to be behind wall */)
        const decalBase = this.scene!.pickWithRay(ray, (mesh) => (mesh === this.wall!))
        if (decalBase === null)
            throw new Error("cannot find decal base position on wall")

        /*  determine decal size (starting from a 16:9 aspect ratio)  */
        const size = (new BABYLON.Vector3(1.6, 0.9, 0.9)).scaleInPlace(this.decalScale)

        /*  create new decal  */
        this.decal = BABYLON.MeshBuilder.CreateDecal("Decal", this.wall!, {
            position:      decalBase!.pickedPoint!,
            normal:        decalBase!.getNormal(true)!,
            angle:         this.ptz.deg2rad(90),
            size,
            cullBackFaces: true,
            localMode:     false
        })

        /*  ugly workaround for BabylonJS rendering issue: move the decal 2cm to the
            front (z-axis) of the wall in order to avoid rendering artifacts  */
        this.decal.translate(new BABYLON.Vector3(0, 0, 1), -0.02, BABYLON.Space.LOCAL)

        /*  take over material or create a fresh one  */
        let material = oldDecal?.material ?? null
        if (material === null) {
            material = new BABYLON.PBRMaterial("Decal-Material", this.scene!)
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

    /*  sync renderer  */
    async reflectSyncTime (timestamp: number) {
        this.syncTime = timestamp
        await this.stopWallFader()
        await this.startWallFader()
    }

    /*  perform a value animation manually  */
    manualAnimation (from: number, to: number, duration: number, fps: number, callback: (grad: number) => void) {
        return new Promise((resolve) => {
            const ease = new BABYLON.SineEase()
            ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
            const frames = (1000 / fps) * duration
            let frame = 0
            const step = () => {
                callback(from + (to - from) * ease.ease(frame / frames))
                if (frame++ <= frames)
                    window.requestAnimationFrame(step)
                else
                    resolve(true)
            }
            window.requestAnimationFrame(step)
        })
    }

    /*  control scene  */
    async reflectSceneState (state: StateTypePartial) {
        if (this.monitor === null || this.monitorCase === null || this.monitorDisplay === null
            || this.decal === null || this.avatar1 === null || this.avatar2 === null || this.references === null
            || this.light1 === null || this.light2 === null || this.light3 === null)
            return

        /*  adjust canvas  */
        if (state.canvas !== undefined) {
            let changed = false
            if (state.canvas.texture1 !== undefined && this.texture1URL !== state.canvas.texture1) {
                this.texture1URL = state.canvas.texture1
                changed = true
            }
            if (state.canvas.texture2 !== undefined && this.texture2URL !== state.canvas.texture2) {
                this.texture2URL = state.canvas.texture2
                changed = true
            }
            if (state.canvas.fadeTrans !== undefined && this.fadeTrans !== state.canvas.fadeTrans) {
                this.fadeTrans = state.canvas.fadeTrans
                changed = true
            }
            if (state.canvas.fadeWait !== undefined && this.fadeWait !== state.canvas.fadeWait) {
                this.fadeWait = state.canvas.fadeWait
                changed = true
            }
            if (state.canvas.rotationZ !== undefined) {
                this.wall!.rotationQuaternion = this.wallRotBase!.clone()
                this.wall!.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(state.canvas.rotationZ), BABYLON.Space.WORLD)
            }
            if (changed) {
                await this.stop()
                await this.unloadWall()
                await this.loadWall()
                await this.start()
            }
        }

        /*  adjust monitor  */
        if (state.monitor !== undefined) {
            if (state.monitor.scale !== undefined) {
                this.monitorCase.scaling.x    = this.monitorBase.scaleCaseX    * state.monitor.scale
                this.monitorCase.scaling.y    = this.monitorBase.scaleCaseY    * state.monitor.scale
                this.monitorCase.scaling.z    = this.monitorBase.scaleCaseZ    * state.monitor.scale
                this.monitorDisplay.scaling.x = this.monitorBase.scaleDisplayX * state.monitor.scale
                this.monitorDisplay.scaling.y = this.monitorBase.scaleDisplayY * state.monitor.scale
                this.monitorDisplay.scaling.z = this.monitorBase.scaleDisplayZ * state.monitor.scale
            }
            if (state.monitor.rotate !== undefined) {
                this.monitor.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.monitor.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(state.monitor.rotate), BABYLON.Space.WORLD)
            }
            if (state.monitor.lift !== undefined)
                this.monitor.position.z = this.monitorBase.positionZ + (state.monitor.lift / 100)
            if (state.monitor.device !== undefined && this.deviceMonitor !== state.monitor.device) {
                this.deviceMonitor = state.monitor.device
                await this.stop()
                await this.unloadVideoStream("monitor", this.monitorDisplay!)
                await this.loadVideoStream("monitor", this.monitorDisplay!, this.deviceMonitor, "", 1.0, 0, 0, null)
                await this.start()
            }
            if (state.monitor.fadeTime !== undefined && this.monitorFade !== state.monitor.fadeTime)
                this.monitorFade = state.monitor.fadeTime
            if (state.monitor.enable !== undefined && this.monitor.isEnabled() !== state.monitor.enable) {
                if (state.monitor.enable) {
                    await this.stop()
                    await this.unloadVideoStream("monitor", this.monitorDisplay!)
                    await this.loadVideoStream("monitor", this.monitorDisplay!, this.deviceMonitor, "", 1.0, 0, 0, null)
                    await this.start()
                    if (this.monitorFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling monitor (fading: start)")
                        this.monitorCase.visibility    = 0
                        this.monitorDisplay.visibility = 0
                        this.monitor.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = 30
                        const fpsTotal = (1000 / fps) * this.monitorFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.monitorCase,
                            "visibility", fps, fpsTotal, 0, 1, 0, ease)!
                        const anim2 = BABYLON.Animation.CreateAndStartAnimation("show", this.monitorDisplay,
                            "visibility", fps, fpsTotal, 0, 1, 0, ease)!
                        Promise.all([ anim1.waitAsync(), anim2.waitAsync() ]).then(() => {
                            this.emit("log", "INFO", "enabling monitor (fading: end)")
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling monitor")
                        this.monitorCase.visibility    = 1
                        this.monitorDisplay.visibility = 1
                        this.monitor.setEnabled(true)
                    }
                }
                else if (!state.monitor.enable) {
                    if (this.monitorFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "disabling monitor (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = 30
                        const fpsTotal = (1000 / fps) * this.monitorFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.monitorCase,
                            "visibility", fps, fpsTotal, 1, 0, 0, ease)!
                        const anim2 = BABYLON.Animation.CreateAndStartAnimation("hide", this.monitorDisplay,
                            "visibility", fps, fpsTotal, 1, 0, 0, ease)!
                        Promise.all([ anim1.waitAsync(), anim2.waitAsync() ]).then(async () => {
                            this.emit("log", "INFO", "disabling monitor (fading: end)")
                            this.monitor!.setEnabled(false)
                            await this.stop()
                            await this.unloadVideoStream("monitor", this.monitorDisplay!)
                            await this.start()
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling monitor")
                        this.monitorCase.visibility    = 0
                        this.monitorDisplay.visibility = 0
                        this.monitor.setEnabled(false)
                        await this.stop()
                        await this.unloadVideoStream("monitor", this.monitorDisplay!)
                        await this.start()
                    }
                }
            }
        }

        /*  adjust decal  */
        if (state.decal !== undefined) {
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
                    await this.stop()
                    await this.decalGenerate()
                    await this.start()
                }
            }
            if (state.decal.fadeTime !== undefined && this.decalFade !== state.decal.fadeTime)
                this.decalFade = state.decal.fadeTime
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
            let deviceChanged = false
            if (state.decal.device !== undefined && this.deviceDecal !== state.decal.device) {
                this.deviceDecal = state.decal.device
                deviceChanged = true
            }
            if (state.decal.device2 !== undefined && this.deviceDecal2 !== state.decal.device2) {
                this.deviceDecal2 = state.decal.device2
                deviceChanged = true
            }
            if (deviceChanged) {
                await this.stop()
                await this.unloadVideoStream("decal", this.decal!)
                await this.loadVideoStream("decal", this.decal!, this.deviceDecal, this.deviceDecal2, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
                await this.start()
            }
            if (state.decal.enable !== undefined && this.decal.isEnabled() !== state.decal.enable) {
                if (state.decal.enable) {
                    await this.stop()
                    await this.unloadVideoStream("decal", this.decal!)
                    await this.loadVideoStream("decal", this.decal!, this.deviceDecal, this.deviceDecal2, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
                    await this.start()
                    if (this.decalFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling decal (fading: start)")
                        if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.decal.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.decal.visibility = 1
                        this.decal.setEnabled(true)
                        this.manualAnimation(0, 1, this.decalFade, 30, (gradient) => {
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            this.emit("log", "INFO", "enabling decal (fading: end)")
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling decal")
                        this.decal.visibility = 1
                        this.decal.setEnabled(true)
                    }
                }
                else if (!state.decal.enable) {
                    if (this.decalFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "disabling decal (fading: start)")
                        if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.decal.material
                            material.setFloat("visibility", 1.0)
                        }
                        this.decal.visibility = 1
                        this.decal.setEnabled(true)
                        this.manualAnimation(1, 0, this.decalFade, 30, (gradient) => {
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(async () => {
                            this.emit("log", "INFO", "disabling decal (fading: end)")
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", 0.0)
                            }
                            this.decal!.setEnabled(false)
                            await this.stop()
                            await this.unloadVideoStream("decal", this.decal!)
                            await this.start()
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling decal")
                        this.decal.visibility = 0
                        this.decal.setEnabled(false)
                        await this.stop()
                        await this.unloadVideoStream("decal", this.decal!)
                        await this.start()
                    }
                }
            }
        }

        /*  adjust lights  */
        if (state.lights !== undefined) {
            if (state.lights.intensity1 !== undefined)
                this.light1.intensity = state.lights.intensity1
            if (state.lights.intensity2 !== undefined)
                this.light2.intensity = state.lights.intensity2
            if (state.lights.intensity3 !== undefined)
                this.light3.intensity = state.lights.intensity3
        }

        /*  adjust avatars  */
        if (state.avatars !== undefined) {
            /*  adjust avatar 1  */
            if (state.avatars.enable1 !== undefined && this.avatar1.isEnabled() !== state.avatars.enable1)
                this.avatar1.setEnabled(state.avatars.enable1)
            if (state.avatars.size1 !== undefined) {
                const scale = state.avatars.size1 / 185
                this.avatar1Model!.scaling.x = this.avatar1Scale.x * scale
                this.avatar1Model!.scaling.y = this.avatar1Scale.y * scale
                this.avatar1Model!.scaling.z = this.avatar1Scale.z * scale
            }
            if (state.avatars.rotate1 !== undefined) {
                this.avatar1.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.avatar1.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(-state.avatars.rotate1), BABYLON.Space.WORLD)
            }

            /*  adjust avatar 2  */
            if (state.avatars.enable2 !== undefined && this.avatar2.isEnabled() !== state.avatars.enable2)
                this.avatar2.setEnabled(state.avatars.enable2)
            if (state.avatars.size2 !== undefined) {
                const scale = state.avatars.size2 / 185
                this.avatar2Model!.scaling.x = this.avatar2Scale.x * scale
                this.avatar2Model!.scaling.y = this.avatar2Scale.y * scale
                this.avatar2Model!.scaling.z = this.avatar2Scale.z * scale
            }
            if (state.avatars.rotate2 !== undefined) {
                this.avatar2.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.avatar2.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(-state.avatars.rotate2), BABYLON.Space.WORLD)
            }
        }

        /*  adjust reference points  */
        if (state.references !== undefined) {
            if (state.references.enable !== undefined)
                this.references.setEnabled(state.references.enable)
        }

        /*  adjust camera calibration  */
        if ((state as any)[this.cameraName] !== undefined && this.cameraHull !== null && this.cameraCase !== null && this.cameraLens !== null) {
            /*  adjust hull X position  */
            if ((state as any)[this.cameraName].hullPosition?.x !== undefined) {
                const x = this.ptzHull.posXV2P(this.cameraHull.position.x)
                this.ptzHull.posXDelta = -((state as any)[this.cameraName].hullPosition.x / 100)
                this.cameraHull.position.x = this.ptzHull.posXP2V(x)
            }

            /*  adjust hull Y position  */
            if ((state as any)[this.cameraName].hullPosition?.y !== undefined) {
                const y = this.ptzHull.posYV2P(this.cameraHull.position.y)
                this.ptzHull.posYDelta = (state as any)[this.cameraName].hullPosition.y / 100
                this.cameraHull.position.y = this.ptzHull.posYP2V(y)
            }

            /*  adjust hull Z position  */
            if ((state as any)[this.cameraName].hullPosition?.z !== undefined) {
                const z = this.ptzHull.posZV2P(this.cameraHull.position.z)
                this.ptzHull.posZDelta = (state as any)[this.cameraName].hullPosition.z / 100
                this.cameraHull.position.z = this.ptzHull.posZP2V(z)
            }

            /*  adjust case tilt  */
            if ((state as any)[this.cameraName].caseRotation?.x !== undefined) {
                const tilt = this.ptzCase.tiltV2P(this.cameraCase.rotation.x)
                this.ptzCase.tiltDelta = this.ptzCase.deg2rad((state as any)[this.cameraName].caseRotation.x)
                this.cameraCase.rotation.x = this.ptzCase.tiltP2V(tilt)
            }

            /*  adjust case pan  */
            if ((state as any)[this.cameraName].caseRotation?.y !== undefined) {
                const pan = this.ptzCase.panV2P(this.cameraCase.rotation.y)
                this.ptzCase.panDelta = -(this.ptzCase.deg2rad((state as any)[this.cameraName].caseRotation.y))
                this.cameraCase.rotation.y = this.ptzCase.panP2V(pan)
            }
            if ((state as any)[this.cameraName].caseRotation?.ym !== undefined) {
                const pan = this.ptzCase.panV2P(this.cameraCase.rotation.y)
                this.ptzCase.panMult = (state as any)[this.cameraName].caseRotation.ym
                this.cameraCase.rotation.y = this.ptzCase.panP2V(pan)
            }

            /*  adjust case rotation  */
            if ((state as any)[this.cameraName].caseRotation?.z !== undefined) {
                const rotate = this.ptzCase.rotateV2P(this.cameraCase.rotation.z)
                this.ptzCase.rotateDelta = -(this.ptzCase.deg2rad((state as any)[this.cameraName].caseRotation.z))
                this.cameraCase.rotation.z = this.ptzCase.rotateP2V(rotate)
            }

            /*  adjust lens tilt  */
            if ((state as any)[this.cameraName].lensRotation?.x !== undefined) {
                const tilt = this.ptzLens.tiltV2P(this.cameraLens.rotation.x)
                this.ptzLens.tiltDelta = -(this.ptzLens.deg2rad((state as any)[this.cameraName].lensRotation.x))
                this.cameraLens.rotation.x = this.ptzLens.tiltP2V(tilt)
            }
            if ((state as any)[this.cameraName].lensRotation?.xm !== undefined) {
                const tilt = this.ptzLens.tiltV2P(this.cameraLens.rotation.x)
                this.ptzLens.tiltMult = (state as any)[this.cameraName].lensRotation.xm
                this.cameraLens.rotation.x = this.ptzLens.tiltP2V(tilt)
            }

            /*  adjust field-of-view  */
            if ((state as any)[this.cameraName].fov?.m !== undefined) {
                const zoom = this.ptzLens.zoomV2P(this.cameraLens.fov)
                this.ptzLens.fovMult = (state as any)[this.cameraName].fov.m
                this.cameraLens.fov = this.ptzLens.zoomP2V(zoom)
            }
        }

        /*  control renderer  */
        if (state.renderer !== undefined) {
            let fps = this.fps
            if (state.renderer.other !== undefined) {
                this.fpsOther = state.renderer.other
                if (!(this.mixerPreview === this.cameraName || this.mixerProgram === this.cameraName))
                    fps = this.fpsOther
            }
            if (state.renderer.preview !== undefined) {
                this.fpsPreview = state.renderer.preview
                if (this.mixerPreview === this.cameraName)
                    fps = this.fpsPreview
            }
            if (state.renderer.program !== undefined) {
                this.fpsProgram = state.renderer.program
                if (this.mixerProgram === this.cameraName)
                    fps = this.fpsProgram
            }
            this.configureFPS(fps)
        }
    }

    /*  react on a received mixer record by reflecting the camera mixer state  */
    reflectMixerState (mixer: MixerState) {
        let fps = this.fpsOther
        if (mixer.preview !== undefined) {
            this.mixerPreview = mixer.preview
            if (this.mixerPreview === this.cameraName)
                fps = this.fpsPreview
        }
        if (mixer.program !== undefined) {
            this.mixerProgram = mixer.program
            if (this.mixerProgram === this.cameraName)
                fps = this.fpsProgram
        }
        this.configureFPS(fps)
    }

    /*  (re-)configure FPS  */
    configureFPS (fps: number) {
        if (this.fps !== fps) {
            this.emit("log", "INFO", `switching from ${this.fps} to ${fps} frames-per-second (FPS)`)
            this.fps = fps
            if (this.optimizer !== null)
                this.optimizer.targetFrameRate = fps
            this.emit("fps", fps)
        }
    }

    /*  react on a received FreeD state record by reflecting its camera PTZ state  */
    reflectFreeDState (state: FreeDState) {
        this.state = state
        /*  notice: FreeD can be faster than Babylon, so we have to be careful...  */
        if (this.ptzFreeD && this.cameraCase !== null && this.cameraLens !== null) {
            this.cameraCase.rotation.x = this.ptzCase.tiltP2V(0)
            this.cameraCase.rotation.y = this.ptzCase.panP2V((this.flippedCam ? -1 : 1) * state.pan)
            this.cameraCase.rotation.z = this.ptzCase.rotateP2V(0)
            this.cameraLens.rotation.x = this.ptzLens.tiltP2V((this.flippedCam ? -1 : 1) * state.tilt)
            this.cameraLens.fov        = this.ptzLens.zoomP2V(state.zoom)
        }
    }

    /*  react on a key (down) event by manipulating the camera PTZ state  */
    async reactOnKeyEvent (key: string) {
        if (!this.ptzKeys)
            return

        /*  pan  */
        if (key === "ArrowLeft")
            this.cameraCase!.rotation.y =
                Math.min(this.cameraCase!.rotation.y + this.ptzCase.panStep, this.ptzCase.panP2V(this.ptzCase.panMinDeg))
        else if (key === "ArrowRight")
            this.cameraCase!.rotation.y =
                Math.max(this.cameraCase!.rotation.y - this.ptzCase.panStep, this.ptzCase.panP2V(this.ptzCase.panMaxDeg))

        /*  tilt  */
        else if (key === "ArrowDown")
            this.cameraLens!.rotation.x =
                Math.min(this.cameraLens!.rotation.x + this.ptzLens.tiltStep, this.ptzLens.tiltP2V(this.ptzLens.tiltMinDeg))
        else if (key === "ArrowUp")
            this.cameraLens!.rotation.x =
                Math.max(this.cameraLens!.rotation.x - this.ptzLens.tiltStep, this.ptzLens.tiltP2V(this.ptzLens.tiltMaxDeg))

        /*  rotate  */
        else if (key === "+")
            this.cameraCase!.rotation.z =
                Math.min(this.cameraCase!.rotation.z + this.ptzCase.rotateStep, this.ptzCase.rotateP2V(this.ptzCase.rotateMinDeg))
        else if (key === "-")
            this.cameraCase!.rotation.z =
                Math.max(this.cameraCase!.rotation.z - this.ptzCase.rotateStep, this.ptzCase.rotateP2V(this.ptzCase.rotateMaxDeg))

        /*  zoom  */
        else if (key === "PageUp")
            this.cameraLens!.fov =
                Math.max(this.cameraLens!.fov - this.ptzLens.zoomStep, this.ptzLens.zoomP2V(this.ptzLens.zoomMax))
        else if (key === "PageDown")
            this.cameraLens!.fov =
                Math.min(this.cameraLens!.fov + this.ptzLens.zoomStep, this.ptzLens.zoomP2V(this.ptzLens.zoomMin))

        /*  reset  */
        else if (key === "Home") {
            this.cameraHull!.position.x = this.ptzHull.posXP2V(0)
            this.cameraHull!.position.y = this.ptzHull.posYP2V(0)
            this.cameraHull!.position.z = this.ptzHull.posZP2V(0)
            this.cameraCase!.rotation.x = this.ptzCase.tiltP2V(0)
            this.cameraCase!.rotation.y = this.ptzCase.panP2V(0)
            this.cameraCase!.rotation.z = this.ptzCase.rotateP2V(0)
            this.cameraLens!.rotation.x = this.ptzLens.tiltP2V(0)
            this.cameraLens!.fov        = this.ptzLens.zoomP2V(0)
        }
    }
}

