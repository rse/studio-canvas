/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import EventEmitter         from "eventemitter2"
import * as BABYLON         from "@babylonjs/core"
import                           "@babylonjs/loaders/glTF"

/*  import internal dependencies (client-side)  */
import State, { type ChromaKey } from "./app-render-state"
import Config, { type CameraName } from "./app-render-config"
import ShaderMaterial       from "./app-render-shader"
import PTZ                  from "./app-render-ptz"

/*  import internal dependencies (shared)  */
import { MixerState }       from "../common/app-mixer"
import { FreeDState }       from "../common/app-freed"
import { StateTypePartial } from "../common/app-state"

type VideoStackId = "monitor" | "decal" | "hologram" | "plate" | "pane" | "pillar" | "mask"

export default class CanvasRenderer extends EventEmitter {
    private state

    /*  (re-)configure camera (by name) and options (by URL)  */
    constructor (params: { layer: string, cameraName: string, ptzFreeD: boolean, ptzKeys: boolean }) {
        super()
        this.state = new State()

        this.state.cameraName  = params.cameraName
        this.state.layer       = params.layer
        this.state.ptzFreeD    = params.ptzFreeD
        this.state.ptzKeys     = params.ptzKeys
        this.state.flippedCam  = Config.flippedCams.includes(params.cameraName)

        /*  mapping of camera to type  */
        const cameraType = Config.camNameToTypeMap.get(
            this.state.cameraName as CameraName)
        if (!cameraType)
            throw new Error("invalid camera")

        /*  instantiate PTZ  */
        this.state.ptz     = new PTZ(cameraType)
        this.state.ptzHull = new PTZ(cameraType)
        this.state.ptzCase = new PTZ(cameraType)
        this.state.ptzLens = new PTZ(cameraType)

        /*  worker for off-loading image loading and decoding  */
        this.state.imageLoader = new Worker(new URL("./app-render-worker.js", import.meta.url))
    }

    /*  initially establish rendering engine and scene  */
    async establish (canvas: HTMLCanvasElement) {
        /*  establish rendering engine on canvas element  */
        this.state.engine = new BABYLON.Engine(canvas, true, {
            useExactSrgbConversions: true,
            doNotHandleContextLost:  true
        })
        if (this.state.engine === null)
            throw new Error("cannot establish Babylon engine")
        window.addEventListener("resize", () => {
            this.state.engine!.resize()
        })

        /*  load the Blender glTF scene export  */
        this.emit("log", "INFO", "loading Studio Canvas scene")
        BABYLON.SceneLoader.ShowLoadingScreen = false
        this.state.scene = await BABYLON.SceneLoader.LoadAsync("/res/", "canvas-scene.glb", this.state.engine)
        if (this.state.scene === null)
            throw new Error("failed to create scene")
        await new Promise((resolve, reject) => {
            this.state.scene!.executeWhenReady(() => {
                resolve(true)
            })
        })

        /*  create studio environment for correct texture image colors  */
        if (this.state.layer === "back") {
            this.emit("log", "INFO", "loading opaque environment")
            this.state.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                skyboxColor: new BABYLON.Color3(0.5, 0.5, 0.5)
            })
        }
        else if (this.state.layer === "front") {
            this.emit("log", "INFO", "creating transparent environment")
            this.state.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                createGround: false,
                createSkybox: false
            })
            this.state.scene.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 0)
        }

        /*  use particular camera of scene  */
        this.state.cameraHull = this.state.scene.getNodeByName(this.state.cameraName + "-Hull") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.state.cameraHull === null)
            throw new Error("cannot find camera hull")
        this.state.cameraCase = this.state.scene.getNodeByName(this.state.cameraName + "-Case") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.state.cameraCase === null)
            throw new Error("cannot find camera case")
        this.state.cameraLens = this.state.scene.getCameraByName(this.state.cameraName + "-Lens") as BABYLON.FreeCamera
        if (this.state.cameraLens === null)
            throw new Error("cannot find camera device")

        /*  initialize camera  */
        this.state.scene.activeCamera = this.state.cameraLens
        this.state.cameraLens.fovMode = BABYLON.FreeCamera.FOVMODE_HORIZONTAL_FIXED
        this.state.cameraCase.rotationQuaternion = null

        /*  initialize camera pan/tilt center position  */
        this.state.ptzHull!.posXOrigin   = this.state.cameraHull.position.x
        this.state.ptzHull!.posYOrigin   = this.state.cameraHull.position.y
        this.state.ptzHull!.posZOrigin   = this.state.cameraHull.position.z
        this.state.ptzCase!.tiltOrigin   = this.state.cameraCase.rotation.x
        this.state.ptzCase!.panOrigin    = this.state.cameraCase.rotation.y
        this.state.ptzCase!.rotateOrigin = this.state.cameraCase.rotation.z
        this.state.ptzLens!.tiltOrigin   = this.state.cameraLens.rotation.x

        /*  go to camera home position  */
        this.state.cameraHull!.position.x = this.state.ptzHull!.posXP2V(0)
        this.state.cameraHull!.position.y = this.state.ptzHull!.posYP2V(0)
        this.state.cameraHull!.position.z = this.state.ptzHull!.posZP2V(0)
        this.state.cameraCase!.rotation.x = this.state.ptzCase!.tiltP2V(0)
        this.state.cameraCase!.rotation.y = this.state.ptzCase!.panP2V(0)
        this.state.cameraCase!.rotation.z = this.state.ptzCase!.rotateP2V(0)
        this.state.cameraLens!.rotation.x = this.state.ptzLens!.tiltP2V(0)
        this.state.cameraLens!.fov        = this.state.ptzLens!.zoomP2V(0)

        /*  apply latest PTZ (if already available)  */
        if (this.state.state !== null && this.state.ptzFreeD)
            this.reflectFreeDState(this.state.state)

        /*  allow keyboard to manually adjust camera  */
        if (this.state.ptzKeys) {
            this.state.scene.onKeyboardObservable.add((kbInfo) => {
                if (kbInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN)
                    return
                this.reactOnKeyEvent(kbInfo.event.key)
            })
        }

        /*  manually optimize engine  */
        this.state.engine.enableOfflineSupport = false

        /*  manually optimize scene  */
        this.state.scene.skipPointerMovePicking = true
        this.state.scene.autoClear = false
        this.state.scene.autoClearDepthAndStencil = false

        /*  automatically optimize scene  */
        const options = new BABYLON.SceneOptimizerOptions(this.state.fps, 2000)
        options.addOptimization(new BABYLON.HardwareScalingOptimization(0, 1))
        this.state.optimizer = new BABYLON.SceneOptimizer(this.state.scene, options)

        /*  gather reference to avatar 1  */
        this.state.avatar1 = this.state.scene.getNodeByName("Avatar1") as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.avatar1Model = this.state.scene.getNodeByName("Avatar1-Model") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.avatar1 === null)
            throw new Error("cannot find node 'Avatar1'")
        if (this.state.avatar1Model === null)
            throw new Error("cannot find node 'Avatar1-Model'")
        this.state.avatar1.setEnabled(false)
        this.state.avatar1Scale.x = this.state.avatar1Model.scaling.x
        this.state.avatar1Scale.y = this.state.avatar1Model.scaling.y
        this.state.avatar1Scale.z = this.state.avatar1Model.scaling.z

        /*  gather reference to avatar 2  */
        this.state.avatar2 = this.state.scene.getNodeByName("Avatar2") as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.avatar2Model = this.state.scene.getNodeByName("Avatar2-Model") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.avatar2 === null)
            throw new Error("cannot find node 'Avatar2'")
        if (this.state.avatar2Model === null)
            throw new Error("cannot find node 'Avatar2-Model'")
        this.state.avatar2.setEnabled(false)
        this.state.avatar2Scale.x = this.state.avatar2Model.scaling.x
        this.state.avatar2Scale.y = this.state.avatar2Model.scaling.y
        this.state.avatar2Scale.z = this.state.avatar2Model.scaling.z

        /*  gather reference to reference points  */
        this.state.references = this.state.scene.getNodeByName("Reference") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.state.references === null)
            throw new Error("cannot find node 'References'")
        this.state.references.setEnabled(true)

        /*  gather references to spotlight  */
        this.state.light1 = this.state.scene.getLightByName("Light-1") as BABYLON.Nullable<BABYLON.PointLight>
        this.state.light2 = this.state.scene.getLightByName("Light-2") as BABYLON.Nullable<BABYLON.PointLight>
        this.state.light3 = this.state.scene.getLightByName("Light-3") as BABYLON.Nullable<BABYLON.PointLight>
        if (this.state.light1 === null || this.state.light2 === null || this.state.light3 === null)
            throw new Error("cannot find lights nodes")

        /*  gather reference to wall  */
        this.state.wall = this.state.scene.getMeshByName("Wall") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.wall === null)
            throw new Error("cannot find wall node")
        this.state.wallRotBase = this.state.wall.rotationQuaternion

        /*  on-the-fly load wall canvas  */
        if (this.state.layer === "back")
            await this.canvasLoad()

        /*  on-the-fly generate wall video decal  */
        if (this.state.layer === "back")
            await this.decalGenerate()

        /*  gather references to monitor mesh nodes  */
        this.state.monitor        = this.state.scene.getNodeByName("Monitor")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.monitorCase    = this.state.scene.getMeshByName("Monitor-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.state.monitorDisplay = this.state.scene.getMeshByName("Monitor-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.monitor === null || this.state.monitorCase === null || this.state.monitorDisplay === null)
            throw new Error("cannot find monitor mesh nodes")
        if (this.state.layer === "back")
            this.state.monitor.setEnabled(false)

        /*  gather references to pane mesh nodes  */
        this.state.pane        = this.state.scene.getNodeByName("Pane")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.paneCase    = this.state.scene.getMeshByName("Pane-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.state.paneDisplay = this.state.scene.getMeshByName("Pane-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.pane === null || this.state.paneCase === null || this.state.paneDisplay === null)
            throw new Error("cannot find pane mesh nodes")
        if (this.state.layer === "front")
            this.state.pane.setEnabled(false)

        /*  gather references to pillar mesh nodes  */
        this.state.pillar        = this.state.scene.getNodeByName("Pillar")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.pillarCase    = this.state.scene.getMeshByName("Pillar-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.state.pillarDisplay = this.state.scene.getMeshByName("Pillar-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.pillar === null || this.state.pillarCase === null || this.state.pillarDisplay === null)
            throw new Error("cannot find pillar mesh nodes")
        if (this.state.layer === "back")
            this.state.pillar.setEnabled(false)

        /*  gather references to plate mesh nodes  */
        this.state.plate        = this.state.scene.getNodeByName("Plate")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.plateDisplay = this.state.scene.getMeshByName("Plate-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.plate === null || this.state.plateDisplay === null)
            throw new Error("cannot find plate mesh nodes")
        if (this.state.layer === "front")
            this.state.plateDisplay.setEnabled(false)

        /*  initialize plate base values  */
        this.state.plateBase.scaleDisplayX = this.state.plateDisplay!.scaling.x
        this.state.plateBase.scaleDisplayY = this.state.plateDisplay!.scaling.y
        this.state.plateBase.scaleDisplayZ = this.state.plateDisplay!.scaling.z
        this.state.plateBase.rotationZ     = this.state.plate!.rotation.z
        this.state.plateBase.positionZ     = this.state.plate!.position.z
        this.state.plateBase.positionX     = this.state.plateDisplay!.position.x

        /*  gather references to hologram mesh nodes  */
        this.state.hologram        = this.state.scene.getNodeByName("Hologram")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.hologramDisplay = this.state.scene.getMeshByName("Hologram-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.hologram === null || this.state.hologramDisplay === null)
            throw new Error("cannot find hologram mesh nodes")
        if (this.state.layer === "front")
            this.state.hologramDisplay.setEnabled(false)

        /*  initialize plate base values  */
        this.state.hologramBase.scaleDisplayX = this.state.hologramDisplay!.scaling.x
        this.state.hologramBase.scaleDisplayY = this.state.hologramDisplay!.scaling.y
        this.state.hologramBase.scaleDisplayZ = this.state.hologramDisplay!.scaling.z
        this.state.hologramBase.rotationZ     = this.state.hologram!.rotation.z
        this.state.hologramBase.positionZ     = this.state.hologram!.position.z
        this.state.hologramBase.positionX     = this.state.hologramDisplay!.position.x

        /*  gather references to mask mesh nodes  */
        this.state.mask           = this.state.scene.getNodeByName("Mask")            as BABYLON.Nullable<BABYLON.TransformNode>
        this.state.maskDisplay    = this.state.scene.getMeshByName("Mask-Display")    as BABYLON.Nullable<BABYLON.Mesh>
        this.state.maskBackground = this.state.scene.getMeshByName("Mask-Background") as BABYLON.Nullable<BABYLON.Mesh>
        this.state.maskCamLens    = this.state.scene.getNodeByName("Mask-Cam-Lens")   as BABYLON.Nullable<BABYLON.FreeCamera>
        if (this.state.mask === null || this.state.maskDisplay === null || this.state.maskBackground === null || this.state.maskCamLens === null)
            throw new Error("cannot find mask mesh nodes")
        if (this.state.layer === "front") {
            this.state.maskDisplay.setEnabled(false)
            this.state.maskBackground.setEnabled(false)
        }

        /*  initialize mask base values  */
        this.state.maskBase.scaleDisplayX = this.state.maskDisplay!.scaling.x
        this.state.maskBase.scaleDisplayY = this.state.maskDisplay!.scaling.y
        this.state.maskBase.scaleDisplayZ = this.state.maskDisplay!.scaling.z

        /*  force mask background to be entirely black  */
        const material = this.state.maskBackground.material as BABYLON.PBRMaterial
        material.albedoColor = new BABYLON.Color3(0.0, 0.0, 0.0)
        material.albedoTexture?.dispose()
        material.albedoTexture = null
        material.unlit = true
        material.disableLighting = true

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
            sg.addShadowCaster(this.state.monitorDisplay!)
            sg.addShadowCaster(this.state.monitorCase!)
            sg.addShadowCaster(this.state.paneCase!)
            sg.addShadowCaster(this.state.paneDisplay!)
            sg.addShadowCaster(this.state.pillarCase!)
            sg.addShadowCaster(this.state.pillarDisplay!)
        }
        setupLight(this.state.light1)
        setupLight(this.state.light2)
        setupLight(this.state.light3)
        this.state.wall.receiveShadows = true

        /*  initialize monitor base values  */
        this.state.monitorBase.scaleCaseX       = this.state.monitorCase.scaling.x
        this.state.monitorBase.scaleCaseY       = this.state.monitorCase.scaling.y
        this.state.monitorBase.scaleCaseZ       = this.state.monitorCase.scaling.z
        this.state.monitorBase.scaleDisplayX    = this.state.monitorDisplay.scaling.x
        this.state.monitorBase.scaleDisplayY    = this.state.monitorDisplay.scaling.y
        this.state.monitorBase.scaleDisplayZ    = this.state.monitorDisplay.scaling.z
        this.state.monitorBase.rotationZ        = this.state.monitor.rotation.z
        this.state.monitorBase.positionZ        = this.state.monitor.position.z
        this.state.monitorBase.positionCaseX    = this.state.monitorCase.position.x
        this.state.monitorBase.positionDisplayX = this.state.monitorDisplay.position.x

        /*  initialize pane base values  */
        this.state.paneBase.scaleCaseX          = this.state.paneCase.scaling.x
        this.state.paneBase.scaleCaseY          = this.state.paneCase.scaling.y
        this.state.paneBase.scaleCaseZ          = this.state.paneCase.scaling.z
        this.state.paneBase.scaleDisplayX       = this.state.paneDisplay.scaling.x
        this.state.paneBase.scaleDisplayY       = this.state.paneDisplay.scaling.y
        this.state.paneBase.scaleDisplayZ       = this.state.paneDisplay.scaling.z
        this.state.paneBase.rotationZ           = this.state.pane.rotation.z
        this.state.paneBase.positionZ           = this.state.pane.position.z
        this.state.paneBase.positionCaseX       = this.state.paneCase.position.x
        this.state.paneBase.positionDisplayX    = this.state.paneDisplay.position.x

        /*  initialize pillar base values  */
        this.state.pillarBase.scaleX            = this.state.pillar.scaling.x
        this.state.pillarBase.scaleY            = this.state.pillar.scaling.y
        this.state.pillarBase.scaleZ            = this.state.pillar.scaling.z
        this.state.pillarBase.rotationZ         = this.state.pillar.rotation.z
        this.state.pillarBase.positionZ         = this.state.pillar.position.z
        this.state.pillarBase.positionCaseX     = this.state.pillarCase.position.x
        this.state.pillarBase.positionDisplayX  = this.state.pillarDisplay.position.x

        /*  apply glass material to monitor case  */
        const glass1 = new BABYLON.PBRMaterial("glass1", this.state.scene)
        glass1.indexOfRefraction    = 1.52
        glass1.alpha                = 0.20
        glass1.directIntensity      = 1.0
        glass1.environmentIntensity = 1.0
        glass1.microSurface         = 1
        glass1.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass1.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.state.monitorCase.material = glass1

        /*  apply glass material to pane case  */
        const glass2 = new BABYLON.PBRMaterial("glass2", this.state.scene)
        glass2.indexOfRefraction    = 1.52
        glass2.alpha                = 0.20
        glass2.directIntensity      = 1.0
        glass2.environmentIntensity = 1.0
        glass2.microSurface         = 1
        glass2.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass2.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.state.paneCase.material = glass2

        /*  determine all layer-specific nodes which should be disabled  */
        for (const node of this.state.scene.getNodes()) {
            if (Config.layerNodes[node.name] !== undefined) {
                if (  (this.state.layer === "back"  && !Config.layerNodes[node.name].back)
                   || (this.state.layer === "front" && !Config.layerNodes[node.name].front)) {
                    node.setEnabled(false)
                    node.dispose()
                }
            }
        }

        /*  manually optimize scene  */
        this.state.scene.cleanCachedTextureBuffer()

        /*  indicate established state  */
        this.state.established = true
    }

    /*  render the scene once  */
    private renderOnce = () => {
        if (this.state.fps === 0)
            return
        if ((this.state.renderCount++ % Config.fpsFactor[this.state.fps]) !== 0)
            return
        if (this.state.scene === null)
            return
        this.state.scene.render()
    }

    /*  start/stop renderer  */
    async start () {
        /*  start render loop and scene optimizer  */
        if (this.state.engine !== null)
            this.state.engine.runRenderLoop(this.renderOnce)
        if (this.state.optimizer !== null)
            this.state.optimizer.start()
    }
    async stop () {
        /*  stop scene optimizer and render loop  */
        if (this.state.optimizer !== null)
            this.state.optimizer.stop()
        if (this.state.engine !== null)
            this.state.engine.stopRenderLoop(this.renderOnce)

        /*  give still active render loop iteration time to complete  */
        await new Promise((resolve, reject) => {
            setTimeout(() => resolve(true), 2 * (1000 / (this.state.fps === 0 ? 1 : this.state.fps)))
        })
    }

    /*  load canvas/wall  */
    async canvasLoad () {
        /*  load externally defined node material  */
        const material = this.state.canvasMaterial =
            await BABYLON.NodeMaterial.ParseFromFileAsync("material",
                "/res/canvas-material.json", this.state.scene!)

        /*  initialize canvas mode  */
        this.state.canvasMode = 0

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  reset the mode switching fader  */
        const modeTexFade = material.getBlockByName("ModeTextureFade") as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (modeTexFade === null)
            throw new Error("no such input block named 'ModeTextureFade' found")
        modeTexFade.value = 0.0

        /*  build and freeze material  */
        material.build(false)
        material.freeze()

        /*  create composed texture and apply onto wall  */
        this.state.canvasTexture = material.createProceduralTexture(
            { width: Config.wall.width, height: Config.wall.height }, this.state.scene!)
        const wall = this.state.scene!.getMaterialByName("Wall") as
            BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = this.state.canvasTexture

        /*  start optional texture fader  */
        await this.canvasFaderStart()
    }

    /*  unload canvas/wall  */
    async canvasUnload () {
        /*  stop optional texture fader  */
        await this.canvasFaderStop()

        /*  dispose wall texture  */
        const wall = this.state.scene!.getMaterialByName("Wall") as
            BABYLON.Nullable<BABYLON.PBRMaterial>
        if (wall === null)
            throw new Error("cannot find Wall object")
        wall.albedoTexture = null

        /*  unfreeze material  */
        this.state.canvasMaterial?.unfreeze()

        /*  dispose all regular textures  */
        await this.canvasDisposeTextures(0)
        await this.canvasDisposeTextures(1)

        /*  dispose procedural texture  */
        this.state.canvasTexture?.dispose()
        this.state.canvasTexture = null

        /*  dispose material  */
        this.state.canvasMaterial?.dispose(true, true)
        this.state.canvasMaterial = null
    }

    async createTexture (url: string, canvas: HTMLCanvasElement) {
        /*  fetch image from URL and decode PNG/JPEG format  */
        const imageBitmap = await (new Promise((resolve, reject) => {
            this.state.imageLoader!.addEventListener("message",
                (event: MessageEvent<{ data: ImageBitmap } | { error: string }>) => {
                    const data = event.data
                    if ("error" in data)
                        reject(new Error(`Error from "ImageLoader" worker: ${data.error}`))
                    else
                        resolve(data.data)
                }, { once: true }
            )
            this.state.imageLoader!.postMessage({ url })
        }) as Promise<ImageBitmap>)

        /*  give UI thread a chance to continue rendering  */
        await new Promise((resolve) => setTimeout(resolve, 10))

        /*  draw bitmap into canvas
            (NOTICE: this is a 40ms CPU burst)  */
        const ctx = canvas.getContext("2d")!
        canvas.width  = imageBitmap.width
        canvas.height = imageBitmap.height
        ctx.drawImage(imageBitmap, 0, 0)

        /*  give UI thread a chance to continue rendering  */
        await new Promise((resolve) => setTimeout(resolve, 10))

        /*  create dynamic texture from canvas
            (NOTICE: this is a 10ms CPU burst)  */
        const texture = new BABYLON.DynamicTexture("canvas", canvas, {
            scene:        this.state.scene,
            format:       BABYLON.Engine.TEXTUREFORMAT_RGBA,
            samplingMode: BABYLON.Texture.LINEAR_LINEAR,
            invertY:      false
        })
        texture.update(false, false, true)

        /*  give UI thread a chance to continue rendering  */
        await new Promise((resolve) => setTimeout(resolve, 10))

        /*  cleanup  */
        canvas.width  = 1
        canvas.height = 1
        ctx.clearRect(0, 0, 1, 1)
        return texture!
    }

    /*  reconfigure canvas/wall texture(s)  */
    async canvasReconfigure () {
        /*  sanity check situation  */
        if (this.state.canvasConfig[this.state.canvasMode].texture1 === "")
            return
        this.emit("log", "INFO", "canvas reconfigure (begin)")

        /*  determine id of canvas mode  */
        const mode = this.state.canvasMode === 0 ? "A" : "B"

        /*  determine material  */
        const material = this.state.canvasMaterial!

        /*  reset textures  */
        await this.canvasDisposeTextures(this.state.canvasMode)

        /*  load new texture(s)  */
        this.emit("log", "INFO", "canvas reconfigure (load textures)")
        const canvas = document.createElement("canvas")
        this.state.canvasState[this.state.canvasMode].canvas1 = canvas
        this.state.canvasState[this.state.canvasMode].texture1 =
            await this.createTexture(this.state.canvasConfig[this.state.canvasMode].texture1, canvas)
        if (this.state.canvasConfig[this.state.canvasMode].texture2 !== "") {
            const canvas = document.createElement("canvas")
            this.state.canvasState[this.state.canvasMode].canvas2 = canvas
            this.state.canvasState[this.state.canvasMode].texture2 =
                await this.createTexture(this.state.canvasConfig[this.state.canvasMode].texture2, canvas)
        }
        else {
            this.state.canvasState[this.state.canvasMode].canvas2  = null
            this.state.canvasState[this.state.canvasMode].texture2 = null
        }

        /*  await texture(s) to be loaded  */
        const p = [] as BABYLON.Texture[]
        if (this.state.canvasState[this.state.canvasMode].texture1 !== null)
            p.push(this.state.canvasState[this.state.canvasMode].texture1!)
        if (this.state.canvasState[this.state.canvasMode].texture2 !== null)
            p.push(this.state.canvasState[this.state.canvasMode].texture2!)
        await new Promise((resolve) => {
            BABYLON.Texture.WhenAllReady(p, () => { resolve(true) })
        })

        /*  determine texture blocks in material  */
        const textureBlock1 = material.getBlockByPredicate((input) =>
            input.name === `Mode${mode}Texture1`) as BABYLON.Nullable<BABYLON.TextureBlock>
        const textureBlock2 = material.getBlockByPredicate((input) =>
            input.name === `Mode${mode}Texture2`) as BABYLON.Nullable<BABYLON.TextureBlock>
        if (textureBlock1 === null)
            throw new Error(`no such texture block named 'Mode${mode}Texture1' found`)
        if (textureBlock2 === null)
            throw new Error(`no such texture block named 'Mode${mode}Texture2' found`)

        /*  unfreeze material  */
        material.unfreeze()

        /*  apply new textures  */
        textureBlock1.texture = this.state.canvasState[this.state.canvasMode].texture1
        textureBlock2.texture = this.state.canvasState[this.state.canvasMode].texture2

        /*  apply texture fading duration  */
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = this.state.canvasConfig[this.state.canvasMode].fadeTrans

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
        this.emit("log", "INFO", "canvas reconfigure (end)")
    }

    /*  dispose canvas textures  */
    async canvasDisposeTextures (modeNum: number) {
        /*  determine material  */
        const material = this.state.canvasMaterial!

        /*  unfreeze material  */
        material.unfreeze()

        /*  determine mode  */
        const modeStr = modeNum === 0 ? "A" : "B"

        /*  dispose texture 1  */
        const textureBlock1 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture1`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock1!.texture = null
        this.state.canvasState[modeNum].texture1?.dispose()
        this.state.canvasState[modeNum].texture1 = null
        this.state.canvasState[modeNum].canvas1 = null

        /*  dispose texture 2  */
        const textureBlock2 = material.getBlockByPredicate((input) =>
            input.name === `Mode${modeStr}Texture2`) as BABYLON.Nullable<BABYLON.TextureBlock>
        textureBlock2!.texture = null
        this.state.canvasState[modeNum].texture2?.dispose()
        this.state.canvasState[modeNum].texture2 = null
        this.state.canvasState[modeNum].canvas2 = null

        /*  re-freeze material  */
        material.markDirty(true)
        material.freeze()
    }

    /*  start canvas/wall fader  */
    async canvasFaderStart () {
        /*  activate optional cross-fading between textures  */
        const mode = this.state.canvasMode === 0 ? "A" : "B"
        const material = this.state.canvasMaterial!
        const texFade = material.getBlockByName(`Mode${mode}TextureFade`) as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (texFade === null)
            throw new Error(`no such input block named 'Mode${mode}TextureFade' found`)
        texFade.value = 0.0

        /*  stop processing immediately if no fading is necessary  */
        if (this.state.canvasState[this.state.canvasMode].texture2 === null)
            return

        /*  enter processing loop  */
        let fade        = 0
        let fadeSign    = +1
        const fadeTrans = this.state.canvasConfig[this.state.canvasMode].fadeTrans
        const fadeWait  = this.state.canvasConfig[this.state.canvasMode].fadeWait
        const fader = () => {
            /*  reset timer (to not confuse stopping below)  */
            this.state.fadeTimer = null

            /*  apply next fading step  */
            const fadeInterval = 1000 / (this.state.fps === 0 ? 1 : this.state.fps)
            const fadeStep = 1.0 / (fadeTrans / fadeInterval)
            fade = fade + (fadeSign * fadeStep)
            let wait = fadeInterval
            if      (fade > 1.0) { fade = 1.0; fadeSign = -1; wait = fadeWait }
            else if (fade < 0.0) { fade = 0.0; fadeSign = +1; wait = fadeWait }
            texFade.value = fade

            /*  wait for next iteration  */
            this.state.fadeTimer = setTimeout(fader, wait)
        }
        if (this.state.fadeTimer !== null)
            clearTimeout(this.state.fadeTimer)
        this.state.fadeTimer = setTimeout(fader, 0)
    }

    /*  stop canvas/wall fader  */
    async canvasFaderStop () {
        if (this.state.fadeTimer !== null) {
            clearTimeout(this.state.fadeTimer)
            await new Promise((resolve, reject) => {
                setTimeout(() => resolve(true), 2 * (1000 / (this.state.fps === 0 ? 1 : this.state.fps)))
            })
            this.state.fadeTimer = null
        }
    }

    /*  fade mode of canvas  */
    async canvasModeFade () {
        const material = this.state.canvasMaterial!
        const modeTexFade = material.getBlockByName("ModeTextureFade") as
            BABYLON.Nullable<BABYLON.InputBlock>
        if (modeTexFade === null)
            throw new Error("no such input block named 'ModeTextureFade' found")
        await new Promise((resolve, reject) => {
            let fade        = modeTexFade.value
            const fadeSign  = fade === 0.0 ? +1 : -1
            const fadeTrans = this.state.fadeSwitch * 1000
            const fader = () => {
                /*  reset timer (to not confuse stopping below)  */
                this.state.modeTimer = null

                /*  apply next fading step  */
                const fadeInterval = 1000 / (this.state.fps === 0 ? 1 : this.state.fps)
                const fadeStep = 1.0 / (fadeTrans / fadeInterval)
                fade = fade + (fadeSign * fadeStep)
                let wait = fadeInterval
                if (fade > 1.0 || fade < 0.0)
                    wait = 0
                modeTexFade.value = fade

                /*  wait for next iteration or stop processing  */
                if (wait > 0)
                    this.state.modeTimer = setTimeout(fader, wait)
                else
                    resolve(true)
            }
            if (this.state.modeTimer !== null)
                clearTimeout(this.state.modeTimer)
            this.state.modeTimer = setTimeout(fader, 0)
        })
    }

    /*  change mode of canvas  */
    async canvasModeChange () {
        this.emit("log", "INFO", "switching canvas (begin)")

        /*  stop the optional fader  */
        await this.canvasFaderStop()

        /*  switch to next mode  */
        this.state.canvasMode = (this.state.canvasMode + 1) % 2

        /*  reconfigure the new textures  */
        await this.canvasReconfigure().then(async () => {
            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            /*  fade to new mode  */
            await this.canvasModeFade()

            /*  dispose old textures  */
            await this.canvasDisposeTextures((this.state.canvasMode + 1) % 2)

            this.emit("log", "INFO", "switching canvas (end)")
        }).catch(async () => {
            /*  switch back to previous mode  */
            this.state.canvasMode = (this.state.canvasMode + 1) % 2

            /*  (re-)start the optional fader  */
            await this.canvasFaderStart()

            this.emit("log", "INFO", "switching canvas (end, FAILED)")
        })
    }

    /*  load video stream  */
    async loadVideoStream () {
        /*  initialize  */
        this.state.videoStream  = null
        this.state.videoTexture = null

        /*  ensure video devices can be enumerated by requesting a
            dummy media stream so permissions are granted once  */
        this.emit("log", "INFO", "requesting video device access")
        const stream0 = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        }).catch(() => null)
        if (stream0 !== null)
            stream0.getTracks().forEach((track) => track.stop())

        /*  enumerate devices  */
        this.emit("log", "INFO", "enumerating video devices")
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])

        /*  determine particular device  */
        const label = this.state.videoStreamDevice
        if (label === "") {
            this.emit("log", "WARNING", "no video stream configured (using replacement content later)")
            return
        }
        const device = devices.find((device) =>
            device.kind === "videoinput"
            && device.label.substring(0, label.length) === label
        )
        if (device === undefined) {
            this.emit("log", "WARNING", `failed to determine video stream (device: "${label}"): no such device (using replacement content later)`)
            return
        }

        /*  load target composite media stream  */
        this.emit("log", "INFO", `loading video stream (device: "${label}")`)
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: device.deviceId,
                aspectRatio: 16 / 9,
                width:     { min: this.state.videoStreamWidth,  ideal: this.state.videoStreamWidth,  max: this.state.videoStreamWidth  },
                height:    { min: this.state.videoStreamHeight, ideal: this.state.videoStreamHeight, max: this.state.videoStreamHeight },
                frameRate: { min: this.state.videoStreamFPS,    ideal: this.state.videoStreamFPS,    max: this.state.videoStreamFPS }
            }
        }).catch((error: Error) => {
            this.emit("log", "ERROR", `failed to load video (device: "${label}"): ${error})`)
            throw new Error(`failed to load video stream (device: "${label}"): ${error})`)
        })

        /*  create texture from media stream  */
        const texture = await BABYLON.VideoTexture.CreateFromStreamAsync(this.state.scene!, stream, {} as any, true)
        await new Promise((resolve) => {
            BABYLON.Texture.WhenAllReady([ texture ], () => { resolve(true) })
        })
        stream.getVideoTracks().forEach((t) => {
            const c = t.getCapabilities()
            this.emit("log", "INFO", `loaded video stream (track size: ${c.width?.max ?? 0}x${c.height?.max ?? 0})`)
            const device = devices.find((device) => device.deviceId === c.deviceId)
            if (device)
                this.emit("log", "INFO", `loaded video stream (device: "${device.label}")`)
        })
        const ts = texture.getSize()
        this.emit("log", "INFO", `loaded video stream (texture size: ${ts.width}x${ts.height})`)

        /*  provide results  */
        this.state.videoStream  = stream
        this.state.videoTexture = texture
    }

    /*  unload video stream  */
    async unloadVideoStream () {
        this.emit("log", "INFO", "unloading video stream")
        if (this.state.videoTexture !== null) {
            this.state.videoTexture.dispose()
            this.state.videoTexture = null
        }
        if (this.state.videoStream !== null) {
            this.state.videoStream.getTracks().forEach((track) => track.stop())
            this.state.videoStream = null
        }
    }

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
                this.emit("log", "INFO", `loading image media "${url}"`)
                await new Promise((resolve, reject) => {
                    texture = new BABYLON.Texture(
                        url, this.state.scene, false, false,
                        BABYLON.VideoTexture.NEAREST_SAMPLINGMODE,
                        null,
                        (msg, ex) => {
                            this.emit("log", "ERROR", `failed to load image media "${url}": ${msg}`)
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
                this.emit("log", "INFO", `loading video media "${url}"`)
                const loop = (url.match(/.+-loop\.(?:smp4|mp4|swebm|webm)$/) !== null)
                await new Promise((resolve, reject) => {
                    texture = new BABYLON.VideoTexture(
                        url, url, this.state.scene, false, true,
                        BABYLON.VideoTexture.NEAREST_SAMPLINGMODE,
                        { autoPlay: true, muted: true, autoUpdateTexture: true, loop },
                        (msg, ex) => {
                            this.emit("log", "ERROR", `failed to load video media "${url}": ${msg}`)
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
        this.emit("log", "INFO", `unloading ${info.type} media "${info.url}"`)
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
        this.emit("log", "INFO", `apply texture material to display "${id}"`)

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
            this.emit("log", "WARNING", `failed to gather texture for "${id}" -- setting replacement texture`)
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
        this.emit("log", "INFO", `unapply texture material from display "${id}"`)

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

    /*  sync renderer  */
    async reflectSyncTime (timestamp: number) {
        this.state.syncTime = timestamp
        await this.canvasFaderStop()
        await this.canvasFaderStart()
    }

    /*  perform a value animation manually  */
    manualAnimation (from: number, to: number, duration: number, fps: number, callback: (grad: number) => void) {
        return new Promise((resolve) => {
            const ease = new BABYLON.SineEase()
            ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
            const frames = (60 / fps) * fps * duration
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
        /*  ensure we update only if we are already established  */
        if (!this.state.established)
            return true

        /*  adjust streams  */
        if (state.streams !== undefined) {
            let changed = false
            if (state.streams.device !== undefined && this.state.videoStreamDevice !== state.streams.device) {
                this.state.videoStreamDevice = state.streams.device
                changed = true
            }
            if (state.streams.width !== undefined && this.state.videoStreamWidth !== state.streams.width) {
                this.state.videoStreamWidth = state.streams.width
                changed = true
            }
            if (state.streams.height !== undefined && this.state.videoStreamHeight !== state.streams.height) {
                this.state.videoStreamHeight = state.streams.height
                changed = true
            }
            if (state.streams.fps !== undefined && this.state.videoStreamFPS !== state.streams.fps) {
                this.state.videoStreamFPS = state.streams.fps
                changed = true
            }
            if (changed) {
                await this.unloadVideoStream()
                await this.loadVideoStream()
            }
        }

        /*  adjust media  */
        const modifiedMedia  = {} as { [ id: string ]: boolean }
        if (state.media !== undefined) {
            /*  adjust medias  */
            if (this.state.displayMediaURL.get("media1") !== state.media!.media1) {
                this.state.displayMediaURL.set("media1", state.media.media1)
                modifiedMedia.media1 = true
            }
            if (this.state.displayMediaURL.get("media2") !== state.media.media2) {
                this.state.displayMediaURL.set("media2", state.media.media2)
                modifiedMedia.media2 = true
            }
            if (this.state.displayMediaURL.get("media3") !== state.media.media3) {
                this.state.displayMediaURL.set("media3", state.media.media3)
                modifiedMedia.media3 = true
            }
            if (this.state.displayMediaURL.get("media4") !== state.media.media4) {
                this.state.displayMediaURL.set("media4", state.media.media4)
                modifiedMedia.media4 = true
            }

            /*  update already active media receivers  */
            if (this.state.layer === "back"
                && this.state.decal !== null
                && modifiedMedia[this.mapMediaId(this.state.displaySourceMap.decal)]
                && this.state.decal.isEnabled())
                await this.applyDisplayMaterial("decal", this.state.decal, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)
            if (this.state.layer === "back"
                && this.state.monitorDisplay !== null
                && modifiedMedia[this.mapMediaId(this.state.displaySourceMap.monitor)]
                && this.state.monitorDisplay.isEnabled())
                await this.applyDisplayMaterial("monitor", this.state.monitorDisplay, this.state.monitorOpacity, 0, 0, this.state.monitorChromaKey)
            if (this.state.layer === "back"
                && this.state.pillarDisplay !== null
                && modifiedMedia[this.mapMediaId(this.state.displaySourceMap.pillar)]
                && this.state.pillarDisplay.isEnabled())
                await this.applyDisplayMaterial("pillar", this.state.pillarDisplay, this.state.pillarOpacity, 0, 0, this.state.pillarChromaKey)
            if (this.state.layer === "front"
                && this.state.plateDisplay !== null
                && modifiedMedia[this.mapMediaId(this.state.displaySourceMap.plate)]
                && this.state.plateDisplay.isEnabled())
                await this.applyDisplayMaterial("plate", this.state.plateDisplay, this.state.plateOpacity, this.state.plateBorderRad, this.state.plateBorderCrop, this.state.plateChromaKey)
            if (this.state.layer === "front"
                && this.state.hologramDisplay !== null
                && modifiedMedia[this.mapMediaId(this.state.displaySourceMap.hologram)]
                && this.state.hologramDisplay.isEnabled())
                await this.applyDisplayMaterial("hologram", this.state.hologramDisplay, this.state.hologramOpacity, this.state.hologramBorderRad, this.state.hologramBorderCrop, this.state.hologramChromaKey)
            if (this.state.layer === "front"
                && this.state.paneDisplay !== null
                && modifiedMedia[this.mapMediaId(this.state.displaySourceMap.pane)]
                && this.state.paneDisplay.isEnabled())
                await this.applyDisplayMaterial("pane", this.state.paneDisplay, this.state.paneOpacity, 0, 0, this.state.paneChromaKey)
            if (this.state.layer === "front"
                && this.state.maskDisplay !== null
                && modifiedMedia[this.mapMediaId(this.state.displaySourceMap.mask)]
                && this.state.maskDisplay.isEnabled())
                await this.applyDisplayMaterial("mask", this.state.maskDisplay, 1.0, this.state.maskBorderRad, 0, null)
        }

        /*  adjust canvas  */
        if (state.canvas !== undefined && this.state.layer === "back") {
            let changed = false
            if (   (state.canvas.texture1  !== undefined && this.state.canvasConfig[this.state.canvasMode].texture1  !== state.canvas.texture1)
                || (state.canvas.texture2  !== undefined && this.state.canvasConfig[this.state.canvasMode].texture2  !== state.canvas.texture2)
                || (state.canvas.fadeTrans !== undefined && this.state.canvasConfig[this.state.canvasMode].fadeTrans !== state.canvas.fadeTrans)
                || (state.canvas.fadeWait  !== undefined && this.state.canvasConfig[this.state.canvasMode].fadeWait  !== state.canvas.fadeWait)) {
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].texture1 =
                    state.canvas.texture1 !== undefined ?
                        state.canvas.texture1 :
                        this.state.canvasConfig[this.state.canvasMode].texture1
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].texture2 =
                    state.canvas.texture2 !== undefined ?
                        state.canvas.texture2 :
                        this.state.canvasConfig[this.state.canvasMode].texture2
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].fadeTrans =
                    state.canvas.fadeTrans !== undefined ?
                        state.canvas.fadeTrans :
                        this.state.canvasConfig[this.state.canvasMode].fadeTrans
                this.state.canvasConfig[(this.state.canvasMode + 1) % 2].fadeWait =
                    state.canvas.fadeWait !== undefined ?
                        state.canvas.fadeWait :
                        this.state.canvasConfig[this.state.canvasMode].fadeWait
                changed = true
            }
            if (state.canvas.rotationZ !== undefined) {
                this.state.wall!.rotationQuaternion = this.state.wallRotBase!.clone()
                this.state.wall!.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.canvas.rotationZ), BABYLON.Space.WORLD)
            }
            if (state.canvas.fadeSwitch !== undefined)
                this.state.fadeSwitch = state.canvas.fadeSwitch
            if (changed)
                await this.canvasModeChange()
        }

        /*  adjust monitor  */
        if (state.monitor !== undefined
            && this.state.monitor !== null && this.state.monitorCase !== null && this.state.monitorDisplay !== null
            && this.state.layer === "back") {
            if (state.monitor.source !== undefined && this.state.displaySourceMap.monitor !== state.monitor.source) {
                this.state.displaySourceMap.monitor = state.monitor.source
                if (this.state.monitorDisplay.isEnabled())
                    await this.applyDisplayMaterial("monitor", this.state.monitorDisplay!, this.state.monitorOpacity, 0, 0, this.state.monitorChromaKey)
            }
            if (state.monitor.opacity !== undefined) {
                this.state.monitorOpacity = state.monitor.opacity
                if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.monitorDisplay.material
                    material.setFloat("opacity", this.state.monitorOpacity)
                }
            }
            if (state.monitor.scale !== undefined) {
                this.state.monitorCase.scaling.x    = this.state.monitorBase.scaleCaseX    * state.monitor.scale
                this.state.monitorCase.scaling.y    = this.state.monitorBase.scaleCaseY    * state.monitor.scale
                this.state.monitorCase.scaling.z    = this.state.monitorBase.scaleCaseZ    * state.monitor.scale
                this.state.monitorDisplay.scaling.x = this.state.monitorBase.scaleDisplayX * state.monitor.scale
                this.state.monitorDisplay.scaling.y = this.state.monitorBase.scaleDisplayY * state.monitor.scale
                this.state.monitorDisplay.scaling.z = this.state.monitorBase.scaleDisplayZ * state.monitor.scale
            }
            if (state.monitor.rotate !== undefined) {
                this.state.monitor.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.monitor.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.monitor.rotate), BABYLON.Space.WORLD)
            }
            if (state.monitor.lift !== undefined)
                this.state.monitor.position.z = this.state.monitorBase.positionZ + (state.monitor.lift / 100)
            if (state.monitor.distance !== undefined) {
                this.state.monitorCase.position.x    = this.state.monitorBase.positionCaseX    - state.monitor.distance
                this.state.monitorDisplay.position.x = this.state.monitorBase.positionDisplayX - state.monitor.distance
            }
            if (state.monitor.fadeTime !== undefined && this.state.monitorFade !== state.monitor.fadeTime)
                this.state.monitorFade = state.monitor.fadeTime
            if (state.monitor.chromaKey !== undefined) {
                if (state.monitor.chromaKey.enable !== undefined && this.state.monitorChromaKey.enable !== state.monitor.chromaKey.enable) {
                    this.state.monitorChromaKey.enable = state.monitor.chromaKey.enable
                    if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.monitorDisplay.material
                        material.setInt("chromaEnable", this.state.monitorChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.monitor.chromaKey.threshold !== undefined && this.state.monitorChromaKey.threshold !== state.monitor.chromaKey.threshold) {
                    this.state.monitorChromaKey.threshold = state.monitor.chromaKey.threshold
                    if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.monitorDisplay.material
                        material.setFloat("chromaThreshold", this.state.monitorChromaKey.threshold)
                    }
                }
                if (state.monitor.chromaKey.smoothing !== undefined && this.state.monitorChromaKey.smoothing !== state.monitor.chromaKey.smoothing) {
                    this.state.monitorChromaKey.smoothing = state.monitor.chromaKey.smoothing
                    if (this.state.monitorChromaKey.enable && this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.monitorDisplay.material
                        material.setFloat("chromaSmoothing", this.state.monitorChromaKey.smoothing)
                    }
                }
            }
            if (state.monitor.enable !== undefined && this.state.monitorDisplay.isEnabled() !== state.monitor.enable) {
                if (state.monitor.enable) {
                    await this.applyDisplayMaterial("monitor", this.state.monitorDisplay!, this.state.monitorOpacity, 0, 0, this.state.monitorChromaKey)
                    if (this.state.monitorFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "enabling monitor (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.monitorFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.state.monitorCase,
                            "visibility", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.state.monitor.setEnabled(true)
                        this.state.monitorCase.visibility = 1
                        this.state.monitorCase.setEnabled(true)
                        this.state.monitorDisplay.visibility = 1
                        this.state.monitorDisplay.setEnabled(true)
                        const anim2 = this.manualAnimation(0, 1, this.state.monitorFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.emit("log", "INFO", "enabling monitor (fading: end)")
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling monitor")
                        this.state.monitorCase.visibility    = 1
                        this.state.monitorDisplay.visibility = 1
                        this.state.monitorCase.setEnabled(true)
                        this.state.monitorDisplay.setEnabled(true)
                        this.state.monitor.setEnabled(true)
                    }
                }
                else if (!state.monitor.enable) {
                    if (this.state.monitorFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "disabling monitor (fading: start)")
                        this.state.monitorCase.visibility = 1
                        this.state.monitorCase.setEnabled(true)
                        this.state.monitorDisplay.visibility = 1
                        this.state.monitorDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.monitorFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.state.monitorCase,
                            "visibility", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.monitorDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = this.manualAnimation(1, 0, this.state.monitorFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.emit("log", "INFO", "disabling monitor (fading: end)")
                            if (this.state.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.monitorDisplay!.visibility = 0.0
                                this.state.monitorCase!.visibility = 0.0
                            }
                            else  {
                                this.state.monitorDisplay!.visibility = 0.0
                                this.state.monitorCase!.visibility = 0.0
                            }
                            this.state.monitorCase!.setEnabled(false)
                            this.state.monitorDisplay!.setEnabled(false)
                            this.state.monitor!.setEnabled(false)
                            await this.unapplyDisplayMaterial("monitor", this.state.monitorDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling monitor")
                        if (this.state.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.state.monitorDisplay.visibility = 0.0
                            this.state.monitorCase.visibility = 0.0
                        }
                        else {
                            this.state.monitorDisplay.visibility = 0.0
                            this.state.monitorCase.visibility = 0.0
                        }
                        this.state.monitorCase.setEnabled(false)
                        this.state.monitorDisplay.setEnabled(false)
                        this.state.monitor.setEnabled(false)
                        await this.unapplyDisplayMaterial("monitor", this.state.monitorDisplay!)
                    }
                }
            }
        }

        /*  adjust decal  */
        if (state.decal !== undefined && this.state.decal !== null && this.state.layer === "back") {
            if (state.decal.fadeTime !== undefined && this.state.decalFade !== state.decal.fadeTime)
                this.state.decalFade = state.decal.fadeTime
            if (state.decal.source !== undefined && this.state.displaySourceMap.decal !== state.decal.source) {
                this.state.displaySourceMap.decal = state.decal.source
                if (this.state.decal.isEnabled())
                    await this.applyDisplayMaterial("decal", this.state.decal!, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)
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
                    await this.stop()
                    await this.decalGenerate()
                    await this.applyDisplayMaterial("decal", this.state.decal!, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)
                    await this.start()
                }
            }
            if (state.decal.enable !== undefined && this.state.decal.isEnabled() !== state.decal.enable) {
                if (state.decal.enable) {
                    await this.applyDisplayMaterial("decal", this.state.decal!, this.state.decalOpacity, this.state.decalBorderRad, this.state.decalBorderCrop, this.state.decalChromaKey)
                    if (this.state.decalFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "enabling decal (fading: start)")
                        if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.decal.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.state.decal.visibility = 1
                        this.state.decal.setEnabled(true)
                        await this.manualAnimation(0, 1, this.state.decalFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            this.emit("log", "INFO", "enabling decal (fading: end)")
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling decal")
                        this.state.decal.visibility = 1
                        this.state.decal.setEnabled(true)
                    }
                }
                else if (!state.decal.enable) {
                    if (this.state.decalFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "disabling decal (fading: start)")
                        if (this.state.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.decal.material
                            material.setFloat("visibility", 1.0)
                        }
                        this.state.decal.visibility = 1
                        this.state.decal.setEnabled(true)
                        await this.manualAnimation(1, 0, this.state.decalFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(async () => {
                            this.emit("log", "INFO", "disabling decal (fading: end)")
                            if (this.state.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.decal!.material
                                material.setFloat("visibility", 0.0)
                                this.state.decal!.visibility = 0
                            }
                            else
                                this.state.decal!.visibility = 0
                            this.state.decal!.setEnabled(false)
                            await this.unapplyDisplayMaterial("decal", this.state.decal!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling decal")
                        this.state.decal.visibility = 0
                        this.state.decal.setEnabled(false)
                        await this.unapplyDisplayMaterial("decal", this.state.decal!)
                    }
                }
            }
        }

        /*  adjust plate  */
        if (state.plate !== undefined && this.state.plate !== null && this.state.plateDisplay !== null && this.state.layer === "front") {
            if (state.plate.source !== undefined && this.state.displaySourceMap.plate !== state.plate.source) {
                this.state.displaySourceMap.plate = state.plate.source
                if (this.state.plateDisplay.isEnabled())
                    await this.applyDisplayMaterial("plate", this.state.plateDisplay, this.state.plateOpacity, this.state.plateBorderRad, this.state.plateBorderCrop, this.state.plateChromaKey)
            }
            if (state.plate.scale !== undefined) {
                this.state.plateDisplay.scaling.x = this.state.plateBase.scaleDisplayX * state.plate.scale
                this.state.plateDisplay.scaling.y = this.state.plateBase.scaleDisplayY * state.plate.scale
                this.state.plateDisplay.scaling.z = this.state.plateBase.scaleDisplayZ * state.plate.scale
            }
            if (state.plate.rotate !== undefined) {
                this.state.plate.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.plate.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.plate.rotate), BABYLON.Space.WORLD)
            }
            if (state.plate.lift !== undefined)
                this.state.plate.position.z = this.state.plateBase.positionZ + state.plate.lift
            if (state.plate.distance !== undefined)
                this.state.plateDisplay.position.x = this.state.plateBase.positionX - state.plate.distance
            if (state.plate.fadeTime !== undefined && this.state.plateFade !== state.plate.fadeTime)
                this.state.plateFade = state.plate.fadeTime
            if (state.plate.opacity !== undefined) {
                this.state.plateOpacity = state.plate.opacity
                if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.plateDisplay.material
                    material.setFloat("opacity", this.state.plateOpacity)
                }
            }
            if (state.plate.borderRad !== undefined) {
                this.state.plateBorderRad = state.plate.borderRad
                if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.plateDisplay.material
                    material.setFloat("borderRadius", this.state.plateBorderRad)
                }
            }
            if (state.plate.borderCrop !== undefined) {
                this.state.plateBorderCrop = state.plate.borderCrop
                if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.plateDisplay.material
                    material.setFloat("borderCrop", this.state.plateBorderCrop)
                }
            }
            if (state.plate.chromaKey !== undefined) {
                if (state.plate.chromaKey.enable !== undefined && this.state.plateChromaKey.enable !== state.plate.chromaKey.enable) {
                    this.state.plateChromaKey.enable = state.plate.chromaKey.enable
                    if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.plateDisplay.material
                        material.setInt("chromaEnable", this.state.plateChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.plate.chromaKey.threshold !== undefined && this.state.plateChromaKey.threshold !== state.plate.chromaKey.threshold) {
                    this.state.plateChromaKey.threshold = state.plate.chromaKey.threshold
                    if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.plateDisplay.material
                        material.setFloat("chromaThreshold", this.state.plateChromaKey.threshold)
                    }
                }
                if (state.plate.chromaKey.smoothing !== undefined && this.state.plateChromaKey.smoothing !== state.plate.chromaKey.smoothing) {
                    this.state.plateChromaKey.smoothing = state.plate.chromaKey.smoothing
                    if (this.state.plateChromaKey.enable && this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.plateDisplay.material
                        material.setFloat("chromaSmoothing", this.state.plateChromaKey.smoothing)
                    }
                }
            }
            if (state.plate.enable !== undefined && this.state.plateDisplay.isEnabled() !== state.plate.enable) {
                if (state.plate.enable) {
                    await this.applyDisplayMaterial("plate", this.state.plateDisplay, this.state.plateOpacity, this.state.plateBorderRad, this.state.plateBorderCrop, this.state.plateChromaKey)
                    if (this.state.plateFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "enabling plate (fading: start)")
                        if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.plateDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.state.plateDisplay.visibility = 1.0
                        }
                        else
                            this.state.plateDisplay.visibility = 0.0
                        this.state.plateDisplay.setEnabled(true)
                        await this.manualAnimation(0, 1, this.state.plateFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.plateDisplay!.visibility = gradient
                        }).then(() => {
                            this.emit("log", "INFO", "enabling plate (fading: end)")
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.state.plateDisplay!.visibility = 1.0
                            }
                            else
                                this.state.plateDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling plate")
                        if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.plateDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.state.plateDisplay!.visibility = 1.0
                        }
                        else
                            this.state.plateDisplay!.visibility = 1.0
                        this.state.plateDisplay!.setEnabled(true)
                    }
                }
                else if (!state.plate.enable) {
                    if (this.state.plateFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "disabling plate (fading: start)")
                        if (this.state.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.plateDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.state.plateDisplay.visibility = 1.0
                        }
                        else
                            this.state.plateDisplay.visibility = 1.0
                        this.state.plateDisplay.setEnabled(true)
                        await this.manualAnimation(1, 0, this.state.plateFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.plateDisplay!.visibility = gradient
                        }).then(async () => {
                            this.emit("log", "INFO", "disabling plate (fading: end)")
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.plateDisplay!.visibility = 0.0
                            }
                            else
                                this.state.plateDisplay!.visibility = 0.0
                            this.state.plateDisplay!.setEnabled(false)
                            await this.unapplyDisplayMaterial("plate", this.state.plateDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling plate")
                        const setOnce = (value: number) => {
                            if (this.state.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.plateDisplay!.material
                                material.setFloat("visibility", value)
                                this.state.plateDisplay!.visibility = value
                            }
                            else
                                this.state.plateDisplay!.visibility = value
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.state.plateDisplay!.setEnabled(false)
                            await this.unapplyDisplayMaterial("plate", this.state.plateDisplay!)
                        })
                    }
                }
            }
        }

        /*  adjust hologram  */
        if (state.hologram !== undefined && this.state.hologram !== null && this.state.hologramDisplay !== null && this.state.layer === "front") {
            if (state.hologram.source !== undefined && this.state.displaySourceMap.hologram !== state.hologram.source) {
                this.state.displaySourceMap.hologram = state.hologram.source
                if (this.state.hologramDisplay.isEnabled())
                    await this.applyDisplayMaterial("hologram", this.state.hologramDisplay, this.state.hologramOpacity, this.state.hologramBorderRad, this.state.hologramBorderCrop, this.state.hologramChromaKey)
            }
            if (state.hologram.scale !== undefined) {
                this.state.hologramDisplay.scaling.x = this.state.hologramBase.scaleDisplayX * state.hologram.scale
                this.state.hologramDisplay.scaling.y = this.state.hologramBase.scaleDisplayY * state.hologram.scale
                this.state.hologramDisplay.scaling.z = this.state.hologramBase.scaleDisplayZ * state.hologram.scale
            }
            if (state.hologram.rotate !== undefined) {
                this.state.hologram.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.hologram.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.hologram.rotate), BABYLON.Space.WORLD)
            }
            if (state.hologram.lift !== undefined)
                this.state.hologram.position.z = this.state.hologramBase.positionZ + state.hologram.lift
            if (state.hologram.distance !== undefined)
                this.state.hologramDisplay.position.x = this.state.hologramBase.positionX - state.hologram.distance
            if (state.hologram.fadeTime !== undefined && this.state.hologramFade !== state.hologram.fadeTime)
                this.state.hologramFade = state.hologram.fadeTime
            if (state.hologram.opacity !== undefined) {
                this.state.hologramOpacity = state.hologram.opacity
                if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.hologramDisplay.material
                    material.setFloat("opacity", this.state.hologramOpacity)
                }
            }
            if (state.hologram.borderRad !== undefined) {
                this.state.hologramBorderRad = state.hologram.borderRad
                if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.hologramDisplay.material
                    material.setFloat("borderRadius", this.state.hologramBorderRad)
                }
            }
            if (state.hologram.borderCrop !== undefined) {
                this.state.hologramBorderCrop = state.hologram.borderCrop
                if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.hologramDisplay.material
                    material.setFloat("borderCrop", this.state.hologramBorderCrop)
                }
            }
            if (state.hologram.chromaKey !== undefined) {
                if (state.hologram.chromaKey.enable !== undefined && this.state.hologramChromaKey.enable !== state.hologram.chromaKey.enable) {
                    this.state.hologramChromaKey.enable = state.hologram.chromaKey.enable
                    if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.hologramDisplay.material
                        material.setInt("chromaEnable", this.state.hologramChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.hologram.chromaKey.threshold !== undefined && this.state.hologramChromaKey.threshold !== state.hologram.chromaKey.threshold) {
                    this.state.hologramChromaKey.threshold = state.hologram.chromaKey.threshold
                    if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.hologramDisplay.material
                        material.setFloat("chromaThreshold", this.state.hologramChromaKey.threshold)
                    }
                }
                if (state.hologram.chromaKey.smoothing !== undefined && this.state.hologramChromaKey.smoothing !== state.hologram.chromaKey.smoothing) {
                    this.state.hologramChromaKey.smoothing = state.hologram.chromaKey.smoothing
                    if (this.state.hologramChromaKey.enable && this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.hologramDisplay.material
                        material.setFloat("chromaSmoothing", this.state.hologramChromaKey.smoothing)
                    }
                }
            }
            if (state.hologram.enable !== undefined && this.state.hologramDisplay.isEnabled() !== state.hologram.enable) {
                if (state.hologram.enable) {
                    await this.applyDisplayMaterial("hologram", this.state.hologramDisplay, this.state.hologramOpacity, this.state.hologramBorderRad, this.state.hologramBorderCrop, this.state.hologramChromaKey)
                    if (this.state.hologramFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "enabling hologram (fading: start)")
                        if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.hologramDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.state.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.state.hologramDisplay.visibility = 0.0
                        this.state.hologramDisplay.setEnabled(true)
                        await this.manualAnimation(0, 1, this.state.hologramFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.hologramDisplay!.visibility = gradient
                        }).then(() => {
                            this.emit("log", "INFO", "enabling hologram (fading: end)")
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.state.hologramDisplay!.visibility = 1.0
                            }
                            else
                                this.state.hologramDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling hologram")
                        if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.hologramDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.state.hologramDisplay!.visibility = 1.0
                        }
                        else
                            this.state.hologramDisplay!.visibility = 1.0
                        this.state.hologramDisplay!.setEnabled(true)
                    }
                }
                else if (!state.hologram.enable) {
                    if (this.state.hologramFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "disabling hologram (fading: start)")
                        if (this.state.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.hologramDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.state.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.state.hologramDisplay.visibility = 1.0
                        this.state.hologramDisplay.setEnabled(true)
                        await this.manualAnimation(1, 0, this.state.hologramFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.state.hologramDisplay!.visibility = gradient
                        }).then(async () => {
                            this.emit("log", "INFO", "disabling hologram (fading: end)")
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.hologramDisplay!.visibility = 0.0
                            }
                            else
                                this.state.hologramDisplay!.visibility = 0.0
                            this.state.hologramDisplay!.setEnabled(false)
                            await this.unapplyDisplayMaterial("hologram", this.state.hologramDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling hologram")
                        const setOnce = (value: number) => {
                            if (this.state.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.hologramDisplay!.material
                                material.setFloat("visibility", value)
                                this.state.hologramDisplay!.visibility = value
                            }
                            else
                                this.state.hologramDisplay!.visibility = value
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.state.hologramDisplay!.setEnabled(false)
                            await this.unapplyDisplayMaterial("hologram", this.state.hologramDisplay!)
                        })
                    }
                }
            }
        }

        /*  adjust pane  */
        if (state.pane !== undefined
            && this.state.pane !== null && this.state.paneCase !== null && this.state.paneDisplay !== null
            && this.state.layer === "front") {
            if (state.pane.source !== undefined && this.state.displaySourceMap.pane !== state.pane.source) {
                this.state.displaySourceMap.pane = state.pane.source
                if (this.state.paneDisplay.isEnabled())
                    await this.applyDisplayMaterial("pane", this.state.paneDisplay!, this.state.paneOpacity, 0, 0, this.state.paneChromaKey)
            }
            if (state.pane.opacity !== undefined) {
                this.state.paneOpacity = state.pane.opacity
                if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.paneDisplay.material
                    material.setFloat("opacity", this.state.paneOpacity)
                }
            }
            if (state.pane.scale !== undefined) {
                this.state.paneCase.scaling.x    = this.state.paneBase.scaleCaseX    * state.pane.scale
                this.state.paneCase.scaling.y    = this.state.paneBase.scaleCaseY    * state.pane.scale
                this.state.paneCase.scaling.z    = this.state.paneBase.scaleCaseZ    * state.pane.scale
                this.state.paneDisplay.scaling.x = this.state.paneBase.scaleDisplayX * state.pane.scale
                this.state.paneDisplay.scaling.y = this.state.paneBase.scaleDisplayY * state.pane.scale
                this.state.paneDisplay.scaling.z = this.state.paneBase.scaleDisplayZ * state.pane.scale
            }
            if (state.pane.rotate !== undefined) {
                this.state.pane.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.pane.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(state.pane.rotate), BABYLON.Space.WORLD)
            }
            if (state.pane.lift !== undefined)
                this.state.pane.position.z = this.state.paneBase.positionZ + (state.pane.lift / 100)
            if (state.pane.distance !== undefined) {
                this.state.paneCase.position.x    = this.state.paneBase.positionCaseX    - state.pane.distance
                this.state.paneDisplay.position.x = this.state.paneBase.positionDisplayX - state.pane.distance
            }
            if (state.pane.fadeTime !== undefined && this.state.paneFade !== state.pane.fadeTime)
                this.state.paneFade = state.pane.fadeTime
            if (state.pane.chromaKey !== undefined) {
                if (state.pane.chromaKey.enable !== undefined && this.state.paneChromaKey.enable !== state.pane.chromaKey.enable) {
                    this.state.paneChromaKey.enable = state.pane.chromaKey.enable
                    if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.paneDisplay.material
                        material.setInt("chromaEnable", this.state.paneChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.pane.chromaKey.threshold !== undefined && this.state.paneChromaKey.threshold !== state.pane.chromaKey.threshold) {
                    this.state.paneChromaKey.threshold = state.pane.chromaKey.threshold
                    if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.paneDisplay.material
                        material.setFloat("chromaThreshold", this.state.paneChromaKey.threshold)
                    }
                }
                if (state.pane.chromaKey.smoothing !== undefined && this.state.paneChromaKey.smoothing !== state.pane.chromaKey.smoothing) {
                    this.state.paneChromaKey.smoothing = state.pane.chromaKey.smoothing
                    if (this.state.paneChromaKey.enable && this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.paneDisplay.material
                        material.setFloat("chromaSmoothing", this.state.paneChromaKey.smoothing)
                    }
                }
            }
            if (state.pane.enable !== undefined && this.state.pane.isEnabled() !== state.pane.enable) {
                if (state.pane.enable) {
                    await this.applyDisplayMaterial("pane", this.state.paneDisplay!, this.state.paneOpacity, 0, 0, this.state.paneChromaKey)
                    if (this.state.paneFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "enabling pane (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.paneFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.state.paneCase,
                            "visibility", fps, framesTotal, 0, 1, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.paneDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.state.pane.setEnabled(true)
                        this.state.paneCase.visibility = 1
                        this.state.paneCase.setEnabled(true)
                        this.state.paneDisplay.visibility = 1
                        this.state.paneDisplay.setEnabled(true)
                        const anim2 = this.manualAnimation(0, 1, this.state.paneFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.emit("log", "INFO", "enabling pane (fading: end)")
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling pane")
                        this.state.paneCase.visibility    = 1
                        this.state.paneDisplay.visibility = 1
                        this.state.paneCase.setEnabled(true)
                        this.state.paneDisplay.setEnabled(true)
                        this.state.pane.setEnabled(true)
                    }
                }
                else if (!state.pane.enable) {
                    if (this.state.paneFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "disabling pane (fading: start)")
                        this.state.paneCase.visibility = 1
                        this.state.paneCase.setEnabled(true)
                        this.state.paneDisplay.visibility = 1
                        this.state.paneDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.state.fps === 0 ? 1 : this.state.fps)
                        const framesTotal = this.state.paneFade * fps
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.state.paneCase,
                            "visibility", fps, framesTotal, 1, 0, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT, ease)!
                        if (this.state.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.paneDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = this.manualAnimation(1, 0, this.state.paneFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.emit("log", "INFO", "disabling pane (fading: end)")
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.state.paneDisplay!.visibility = 0.0
                                this.state.paneCase!.visibility = 0.0
                            }
                            else  {
                                this.state.paneDisplay!.visibility = 0.0
                                this.state.paneCase!.visibility = 0.0
                            }
                            this.state.paneCase!.setEnabled(false)
                            this.state.paneDisplay!.setEnabled(false)
                            this.state.pane!.setEnabled(false)
                            await this.unapplyDisplayMaterial("pane", this.state.paneDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling pane")
                        const setOnce = (value: number) => {
                            if (this.state.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.state.paneDisplay!.material
                                material.setFloat("visibility", value)
                                this.state.paneDisplay!.visibility = value
                                this.state.paneCase!.visibility = value
                            }
                            else {
                                this.state.paneDisplay!.visibility = value
                                this.state.paneCase!.visibility = value
                            }
                        }
                        setOnce(0.000000001)
                        this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                            setOnce(0)
                            this.state.paneCase!.setEnabled(false)
                            this.state.paneDisplay!.setEnabled(false)
                            this.state.pane!.setEnabled(false)
                            await this.unapplyDisplayMaterial("pane", this.state.paneDisplay!)
                        })
                    }
                }
            }
        }

        /*  adjust pillar  */
        if (state.pillar !== undefined
            && this.state.pillar !== null && this.state.pillarCase !== null && this.state.pillarDisplay !== null
            && this.state.layer === "back") {
            if (state.pillar.source !== undefined && this.state.displaySourceMap.pillar !== state.pillar.source) {
                this.state.displaySourceMap.pillar = state.pillar.source
                if (this.state.pillarDisplay.isEnabled())
                    await this.applyDisplayMaterial("pillar", this.state.pillarDisplay!, this.state.pillarOpacity, 0, 0, this.state.pillarChromaKey)
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
                    this.state.ptz!.deg2rad(state.pillar.rotate), BABYLON.Space.WORLD)
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
                    await this.applyDisplayMaterial("pillar", this.state.pillarDisplay!, this.state.pillarOpacity, 0, 0, this.state.pillarChromaKey)
                    if (this.state.pillarFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "enabling pillar (fading: start)")
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
                        const anim2 = this.manualAnimation(0, 1, this.state.pillarFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
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
                            this.emit("log", "INFO", "enabling pillar (fading: end)")
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling pillar")
                        this.state.pillarCase.visibility    = 1
                        this.state.pillarDisplay.visibility = 1
                        this.state.pillarCase.setEnabled(true)
                        this.state.pillarDisplay.setEnabled(true)
                        this.state.pillar.setEnabled(true)
                    }
                }
                else if (!state.pillar.enable) {
                    if (this.state.pillarFade > 0 && this.state.fps > 0) {
                        this.emit("log", "INFO", "disabling pillar (fading: start)")
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
                        const anim2 = this.manualAnimation(1, 0, this.state.pillarFade, (this.state.fps === 0 ? 1 : this.state.fps), (gradient) => {
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
                            this.emit("log", "INFO", "disabling pillar (fading: end)")
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
                            await this.unapplyDisplayMaterial("pillar", this.state.pillarDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling pillar")
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
                            await this.unapplyDisplayMaterial("pillar", this.state.pillarDisplay!)
                        })
                    }
                }
            }
        }

        /*  adjust mask  */
        if (state.mask !== undefined && this.state.mask !== null && this.state.maskDisplay !== null && this.state.layer === "front") {
            if (state.mask.source !== undefined && (this.state.displaySourceMap.mask !== state.mask.source || modifiedMedia[this.mapMediaId(state.mask.source)] )) {
                this.state.displaySourceMap.mask = state.mask.source
                if (this.state.maskDisplay.isEnabled())
                    await this.applyDisplayMaterial("mask", this.state.maskDisplay, 1.0, this.state.maskBorderRad, 0, null)
            }
            if (state.mask.scale !== undefined) {
                this.state.maskDisplay.scaling.x = this.state.maskBase.scaleDisplayX * state.mask.scale
                this.state.maskDisplay.scaling.y = this.state.maskBase.scaleDisplayY * state.mask.scale
                this.state.maskDisplay.scaling.z = this.state.maskBase.scaleDisplayZ * state.mask.scale
            }
            if (state.mask.borderRad !== undefined) {
                this.state.maskBorderRad = state.mask.borderRad
                if (this.state.maskDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.state.maskDisplay.material
                    material.setFloat("borderRadius", this.state.maskBorderRad)
                }
            }
            if (state.mask.enable !== undefined && this.state.maskDisplay.isEnabled() !== state.mask.enable) {
                if (state.mask.enable) {
                    this.state.scene!.activeCamera = this.state.maskCamLens
                    await this.applyDisplayMaterial("mask", this.state.maskDisplay, 1.0, this.state.maskBorderRad, 0, null)
                    this.emit("log", "INFO", "enabling mask")
                    if (this.state.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.state.maskDisplay!.material
                        material.setFloat("visibility", 1.0)
                        this.state.maskDisplay!.visibility = 1.0
                    }
                    else
                        this.state.maskDisplay!.visibility = 1.0
                    this.state.maskBackground!.visibility = 1.0
                    this.state.maskDisplay!.setEnabled(true)
                    this.state.maskBackground!.setEnabled(true)
                }
                else if (!state.mask.enable) {
                    /*  disable mask
                        NOTICE: BabylonJS immediately stops rendering if it thinks there are no more
                        visible meshes, so we have to first render it nearly invisible and then
                        finally disable it  */
                    this.emit("log", "INFO", "disabling mask")
                    const setOnce = (value: number) => {
                        if (this.state.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.state.maskDisplay!.material
                            material.setFloat("visibility", value)
                            this.state.maskDisplay!.visibility = value
                        }
                        else
                            this.state.maskDisplay!.visibility = value
                        this.state.maskBackground!.visibility = value
                    }
                    setOnce(0.000000001)
                    this.state.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                        setOnce(0)
                        this.state.maskDisplay!.setEnabled(false)
                        this.state.maskBackground!.setEnabled(false)
                        this.state.scene!.activeCamera = this.state.cameraLens
                        await this.unapplyDisplayMaterial("mask", this.state.maskDisplay!)
                    })
                }
            }
        }

        /*  adjust lights  */
        if (state.lights !== undefined && this.state.light1 !== null && this.state.light2 !== null && this.state.light3 !== null) {
            if (state.lights.intensity1 !== undefined)
                this.state.light1.intensity = state.lights.intensity1
            if (state.lights.intensity2 !== undefined)
                this.state.light2.intensity = state.lights.intensity2
            if (state.lights.intensity3 !== undefined)
                this.state.light3.intensity = state.lights.intensity3
        }

        /*  adjust avatars  */
        if (state.avatars !== undefined && this.state.avatar1 !== null && this.state.avatar2 !== null && this.state.layer === "back") {
            /*  adjust avatar 1  */
            if (state.avatars.enable1 !== undefined && this.state.avatar1.isEnabled() !== state.avatars.enable1)
                this.state.avatar1.setEnabled(state.avatars.enable1)
            if (state.avatars.size1 !== undefined) {
                const scale = state.avatars.size1 / 185
                this.state.avatar1Model!.scaling.x = this.state.avatar1Scale.x * scale
                this.state.avatar1Model!.scaling.y = this.state.avatar1Scale.y * scale
                this.state.avatar1Model!.scaling.z = this.state.avatar1Scale.z * scale
            }
            if (state.avatars.rotate1 !== undefined) {
                this.state.avatar1.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.avatar1.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(-state.avatars.rotate1), BABYLON.Space.WORLD)
            }

            /*  adjust avatar 2  */
            if (state.avatars.enable2 !== undefined && this.state.avatar2.isEnabled() !== state.avatars.enable2)
                this.state.avatar2.setEnabled(state.avatars.enable2)
            if (state.avatars.size2 !== undefined) {
                const scale = state.avatars.size2 / 185
                this.state.avatar2Model!.scaling.x = this.state.avatar2Scale.x * scale
                this.state.avatar2Model!.scaling.y = this.state.avatar2Scale.y * scale
                this.state.avatar2Model!.scaling.z = this.state.avatar2Scale.z * scale
            }
            if (state.avatars.rotate2 !== undefined) {
                this.state.avatar2.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.avatar2.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(-state.avatars.rotate2), BABYLON.Space.WORLD)
            }
        }

        /*  adjust reference points  */
        if (state.references !== undefined && this.state.references !== null && this.state.layer === "back") {
            if (state.references.enable !== undefined)
                this.state.references.setEnabled(state.references.enable)
        }

        /*  adjust camera calibration  */
        if ((state as any)[this.state.cameraName] !== undefined && this.state.cameraHull !== null && this.state.cameraCase !== null && this.state.cameraLens !== null) {
            /*  adjust hull X position  */
            if ((state as any)[this.state.cameraName].hullPosition?.x !== undefined) {
                const x = this.state.ptzHull!.posXV2P(this.state.cameraHull.position.x)
                this.state.ptzHull!.posXDelta = -((state as any)[this.state.cameraName].hullPosition.x / 100)
                this.state.cameraHull.position.x = this.state.ptzHull!.posXP2V(x)
            }

            /*  adjust hull Y position  */
            if ((state as any)[this.state.cameraName].hullPosition?.y !== undefined) {
                const y = this.state.ptzHull!.posYV2P(this.state.cameraHull.position.y)
                this.state.ptzHull!.posYDelta = (state as any)[this.state.cameraName].hullPosition.y / 100
                this.state.cameraHull.position.y = this.state.ptzHull!.posYP2V(y)
            }

            /*  adjust hull Z position  */
            if ((state as any)[this.state.cameraName].hullPosition?.z !== undefined) {
                const z = this.state.ptzHull!.posZV2P(this.state.cameraHull.position.z)
                this.state.ptzHull!.posZDelta = (state as any)[this.state.cameraName].hullPosition.z / 100
                this.state.cameraHull.position.z = this.state.ptzHull!.posZP2V(z)
            }

            /*  adjust case tilt  */
            if ((state as any)[this.state.cameraName].caseRotation?.x !== undefined) {
                const tilt = this.state.ptzCase!.tiltV2P(this.state.cameraCase.rotation.x)
                this.state.ptzCase!.tiltDelta = this.state.ptzCase!.deg2rad((state as any)[this.state.cameraName].caseRotation.x)
                this.state.cameraCase.rotation.x = this.state.ptzCase!.tiltP2V(tilt)
            }

            /*  adjust case pan  */
            if ((state as any)[this.state.cameraName].caseRotation?.y !== undefined) {
                const pan = this.state.ptzCase!.panV2P(this.state.cameraCase.rotation.y)
                this.state.ptzCase!.panDelta = -(this.state.ptzCase!.deg2rad((state as any)[this.state.cameraName].caseRotation.y))
                this.state.cameraCase.rotation.y = this.state.ptzCase!.panP2V(pan)
            }
            if ((state as any)[this.state.cameraName].caseRotation?.ym !== undefined) {
                const pan = this.state.ptzCase!.panV2P(this.state.cameraCase.rotation.y)
                this.state.ptzCase!.panMult = (state as any)[this.state.cameraName].caseRotation.ym
                this.state.cameraCase.rotation.y = this.state.ptzCase!.panP2V(pan)
            }

            /*  adjust case rotation  */
            if ((state as any)[this.state.cameraName].caseRotation?.z !== undefined) {
                const rotate = this.state.ptzCase!.rotateV2P(this.state.cameraCase.rotation.z)
                this.state.ptzCase!.rotateDelta = -(this.state.ptzCase!.deg2rad((state as any)[this.state.cameraName].caseRotation.z))
                this.state.cameraCase.rotation.z = this.state.ptzCase!.rotateP2V(rotate)
            }

            /*  adjust lens tilt  */
            if ((state as any)[this.state.cameraName].lensRotation?.x !== undefined) {
                const tilt = this.state.ptzLens!.tiltV2P(this.state.cameraLens.rotation.x)
                this.state.ptzLens!.tiltDelta = -(this.state.ptzLens!.deg2rad((state as any)[this.state.cameraName].lensRotation.x))
                this.state.cameraLens.rotation.x = this.state.ptzLens!.tiltP2V(tilt)
            }
            if ((state as any)[this.state.cameraName].lensRotation?.xm !== undefined) {
                const tilt = this.state.ptzLens!.tiltV2P(this.state.cameraLens.rotation.x)
                this.state.ptzLens!.tiltMult = (state as any)[this.state.cameraName].lensRotation.xm
                this.state.cameraLens.rotation.x = this.state.ptzLens!.tiltP2V(tilt)
            }

            /*  adjust field-of-view  */
            if ((state as any)[this.state.cameraName].fov?.m !== undefined) {
                const zoom = this.state.ptzLens!.zoomV2P(this.state.cameraLens.fov)
                this.state.ptzLens!.fovMult = (state as any)[this.state.cameraName].fov.m
                this.state.cameraLens.fov = this.state.ptzLens!.zoomP2V(zoom)
            }
        }

        /*  control renderer  */
        if (state.renderer !== undefined) {
            let fps = this.state.fps
            if (state.renderer.other !== undefined) {
                this.state.fpsOther = state.renderer.other
                if (!(this.state.mixerPreview === this.state.cameraName || this.state.mixerProgram === this.state.cameraName))
                    fps = this.state.fpsOther
            }
            if (state.renderer.preview !== undefined) {
                this.state.fpsPreview = state.renderer.preview
                if (this.state.mixerPreview === this.state.cameraName)
                    fps = this.state.fpsPreview
            }
            if (state.renderer.program !== undefined) {
                this.state.fpsProgram = state.renderer.program
                if (this.state.mixerProgram === this.state.cameraName)
                    fps = this.state.fpsProgram
            }
            this.configureFPS(fps)
        }

        return true
    }

    /*  react on a received mixer record by reflecting the camera mixer state  */
    reflectMixerState (mixer: MixerState) {
        let fps = this.state.fpsOther
        if (mixer.preview !== undefined) {
            this.state.mixerPreview = mixer.preview
            if (this.state.mixerPreview === this.state.cameraName)
                fps = this.state.fpsPreview
        }
        if (mixer.program !== undefined) {
            this.state.mixerProgram = mixer.program
            if (this.state.mixerProgram === this.state.cameraName)
                fps = this.state.fpsProgram
        }
        this.configureFPS(fps)
    }

    /*  (re-)configure FPS  */
    configureFPS (fps: number) {
        if (this.state.fps !== fps) {
            this.emit("log", "INFO", `switching from ${this.state.fps} to ${fps} frames-per-second (FPS)`)
            this.state.fps = fps
            if (this.state.optimizer !== null)
                this.state.optimizer.targetFrameRate = fps
            this.emit("fps", fps)
        }
    }

    /*  react on a received FreeD state record by reflecting its camera PTZ state  */
    reflectFreeDState (state: FreeDState) {
        /*  ensure we update only if we are already established  */
        if (!this.state.established)
            return

        /*  remember state  */
        if (state === null)
            return
        this.state.state = state

        /*  notice: FreeD can be faster than Babylon, so we have to be careful...  */
        if (this.state.ptzFreeD && this.state.cameraCase !== null && this.state.cameraLens !== null) {
            this.state.cameraCase.rotation.x = this.state.ptzCase!.tiltP2V(0)
            this.state.cameraCase.rotation.y = this.state.ptzCase!.panP2V((this.state.flippedCam ? -1 : 1) * state.pan)
            this.state.cameraCase.rotation.z = this.state.ptzCase!.rotateP2V(0)
            this.state.cameraLens.rotation.x = this.state.ptzLens!.tiltP2V((this.state.flippedCam ? -1 : 1) * state.tilt)
            this.state.cameraLens.fov        = this.state.ptzLens!.zoomP2V(state.zoom)
        }
    }

    /*  react on a key (down) event by manipulating the camera PTZ state  */
    async reactOnKeyEvent (key: string) {
        if (!this.state.ptzKeys)
            return

        /*  pan  */
        if (key === "ArrowLeft")
            this.state.cameraCase!.rotation.y =
                Math.min(this.state.cameraCase!.rotation.y + this.state.ptzCase!.panStep, this.state.ptzCase!.panP2V(this.state.ptzCase!.panMinDeg))
        else if (key === "ArrowRight")
            this.state.cameraCase!.rotation.y =
                Math.max(this.state.cameraCase!.rotation.y - this.state.ptzCase!.panStep, this.state.ptzCase!.panP2V(this.state.ptzCase!.panMaxDeg))

        /*  tilt  */
        else if (key === "ArrowDown")
            this.state.cameraLens!.rotation.x =
                Math.min(this.state.cameraLens!.rotation.x + this.state.ptzLens!.tiltStep, this.state.ptzLens!.tiltP2V(this.state.ptzLens!.tiltMinDeg))
        else if (key === "ArrowUp")
            this.state.cameraLens!.rotation.x =
                Math.max(this.state.cameraLens!.rotation.x - this.state.ptzLens!.tiltStep, this.state.ptzLens!.tiltP2V(this.state.ptzLens!.tiltMaxDeg))

        /*  rotate  */
        else if (key === "+")
            this.state.cameraCase!.rotation.z =
                Math.min(this.state.cameraCase!.rotation.z + this.state.ptzCase!.rotateStep, this.state.ptzCase!.rotateP2V(this.state.ptzCase!.rotateMinDeg))
        else if (key === "-")
            this.state.cameraCase!.rotation.z =
                Math.max(this.state.cameraCase!.rotation.z - this.state.ptzCase!.rotateStep, this.state.ptzCase!.rotateP2V(this.state.ptzCase!.rotateMaxDeg))

        /*  zoom  */
        else if (key === "PageUp")
            this.state.cameraLens!.fov =
                Math.max(this.state.cameraLens!.fov - this.state.ptzLens!.zoomStep, this.state.ptzLens!.zoomP2V(this.state.ptzLens!.zoomMax))
        else if (key === "PageDown")
            this.state.cameraLens!.fov =
                Math.min(this.state.cameraLens!.fov + this.state.ptzLens!.zoomStep, this.state.ptzLens!.zoomP2V(this.state.ptzLens!.zoomMin))

        /*  reset  */
        else if (key === "Home") {
            this.state.cameraHull!.position.x = this.state.ptzHull!.posXP2V(0)
            this.state.cameraHull!.position.y = this.state.ptzHull!.posYP2V(0)
            this.state.cameraHull!.position.z = this.state.ptzHull!.posZP2V(0)
            this.state.cameraCase!.rotation.x = this.state.ptzCase!.tiltP2V(0)
            this.state.cameraCase!.rotation.y = this.state.ptzCase!.panP2V(0)
            this.state.cameraCase!.rotation.z = this.state.ptzCase!.rotateP2V(0)
            this.state.cameraLens!.rotation.x = this.state.ptzLens!.tiltP2V(0)
            this.state.cameraLens!.fov        = this.state.ptzLens!.zoomP2V(0)
        }
    }
}

