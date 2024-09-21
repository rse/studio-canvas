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
type VideoStackId = "monitor" | "decal" | "hologram" | "plate" | "pane" | "pillar" | "mask"

/*  the canvas rendering class  */
export default class CanvasRenderer extends EventEmitter {
    /*  (re-)configure camera (by name) and options (by URL)  */
    constructor (params: { layer: string, cameraName: string, ptzFreeD: boolean, ptzKeys: boolean }) {
        super()
        this.cameraName  = params.cameraName
        this.layer       = params.layer
        this.ptzFreeD    = params.ptzFreeD
        this.ptzKeys     = params.ptzKeys
        this.flippedCam  = this.flippedCams.includes(params.cameraName)

        /*  mapping of camera to type  */
        const camNameToTypeMap = {
            CAM1: "panasonic",
            CAM2: "panasonic",
            CAM3: "panasonic",
            CAM4: "panasonic"
        }
        const cameraType = camNameToTypeMap[this.cameraName as "CAM1" | "CAM2" | "CAM3" | "CAM4"] as "birddog" | "panasonic"

        /*  instantiate PTZ  */
        this.ptz     = new PTZ(cameraType)
        this.ptzHull = new PTZ(cameraType)
        this.ptzCase = new PTZ(cameraType)
        this.ptzLens = new PTZ(cameraType)
    }

    /*  internal parameter state  */
    private established       = false
    private ptzFreeD          = false
    private ptzKeys           = false
    private layer:            string
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
    private monitorOpacity    = 1.0
    private monitorChromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private paneFade          = 0
    private paneOpacity       = 1.0
    private paneChromaKey     = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private pillarFade        = 0
    private pillarOpacity     = 1.0
    private pillarBorderRad   = 40.0
    private pillarBorderCrop  = 0.0
    private pillarChromaKey   = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private maskBorderRad     = 0.0
    private videoStream:      MediaStream | null = null
    private videoTexture:     BABYLON.Nullable<BABYLON.Texture> = null
    private videoStacks       = 2
    private sourceMap         = { decal: "S1", monitor: "S2", plate: "S1", hologram: "S2", pane: "S2", pillar: "S2", mask: "S2" } as { [ id: string ]: string }
    private videoMeshMaterial = new Map<BABYLON.Mesh, BABYLON.Nullable<BABYLON.Material>>()
    private monitorBase       = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }
    private paneBase          = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }
    private pillarBase        = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }
    private avatar1Scale      = { x: 0, y: 0, z: 0 }
    private avatar2Scale      = { x: 0, y: 0, z: 0 }
    private flippedCams       = [ "" ]
    private flippedCam        = false
    private plateFade         = 0
    private plateOpacity      = 1.0
    private plateBorderRad    = 40.0
    private plateBorderCrop   = 0.0
    private plateChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private plateBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0, positionX:     0
    }
    private hologramRotate       = 0.0
    private hologramLift         = 0.0
    private hologramScale        = 1.0
    private hologramFade         = 0
    private hologramOpacity      = 1.0
    private hologramBorderRad    = 40.0
    private hologramBorderCrop   = 0.0
    private hologramChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    private hologramBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0, positionX:     0
    }
    private maskBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0
    }

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
    private videoStreamDevice = ""
    private videoStreamWidth  = 0
    private videoStreamHeight = 0
    private videoStreamFPS    = 0

    /*  rendering object references  */
    private engine:          BABYLON.Nullable<BABYLON.Engine>         = null
    private scene:           BABYLON.Nullable<BABYLON.Scene>          = null
    private optimizer:       BABYLON.Nullable<BABYLON.SceneOptimizer> = null
    private cameraHull:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraCase:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraLens:      BABYLON.Nullable<BABYLON.FreeCamera>     = null
    private monitor:         BABYLON.Nullable<BABYLON.TransformNode>  = null
    private monitorCase:     BABYLON.Nullable<BABYLON.Mesh>           = null
    private monitorDisplay:  BABYLON.Nullable<BABYLON.Mesh>           = null
    private pane:            BABYLON.Nullable<BABYLON.TransformNode>  = null
    private paneCase:        BABYLON.Nullable<BABYLON.Mesh>           = null
    private paneDisplay:     BABYLON.Nullable<BABYLON.Mesh>           = null
    private pillar:          BABYLON.Nullable<BABYLON.TransformNode>  = null
    private pillarCase:      BABYLON.Nullable<BABYLON.Mesh>           = null
    private pillarDisplay:   BABYLON.Nullable<BABYLON.Mesh>           = null
    private avatar1:         BABYLON.Nullable<BABYLON.TransformNode>  = null
    private avatar1Model:    BABYLON.Nullable<BABYLON.Mesh>           = null
    private avatar2:         BABYLON.Nullable<BABYLON.TransformNode>  = null
    private avatar2Model:    BABYLON.Nullable<BABYLON.Mesh>           = null
    private references:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private wall:            BABYLON.Nullable<BABYLON.Mesh>           = null
    private decal:           BABYLON.Nullable<BABYLON.Mesh>           = null
    private light1:          BABYLON.Nullable<BABYLON.PointLight>     = null
    private light2:          BABYLON.Nullable<BABYLON.PointLight>     = null
    private light3:          BABYLON.Nullable<BABYLON.PointLight>     = null
    private material:        BABYLON.Nullable<BABYLON.NodeMaterial>   = null
    private texture1:        BABYLON.Nullable<BABYLON.Texture>        = null
    private texture2:        BABYLON.Nullable<BABYLON.Texture>        = null
    private texture3:        BABYLON.Nullable<BABYLON.Texture>        = null
    private wallRotBase:     BABYLON.Nullable<BABYLON.Quaternion>     = null
    private plate:           BABYLON.Nullable<BABYLON.TransformNode>  = null
    private plateDisplay:    BABYLON.Nullable<BABYLON.Mesh>           = null
    private hologram:        BABYLON.Nullable<BABYLON.TransformNode>  = null
    private hologramDisplay: BABYLON.Nullable<BABYLON.Mesh>           = null
    private mask:            BABYLON.Nullable<BABYLON.TransformNode>  = null
    private maskDisplay:     BABYLON.Nullable<BABYLON.Mesh>           = null
    private maskBackground:  BABYLON.Nullable<BABYLON.Mesh>           = null
    private maskCamLens:     BABYLON.Nullable<BABYLON.FreeCamera>     = null

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

    /*  scene nodes relevant for layer-specific rendering  */
    private layerNodes = {
        "Floor":                        { back: true,  front: false },
        "Control-Room-Wall-East":       { back: true,  front: false },
        "Control-Room-Wall-North":      { back: true,  front: false },
        "Control-Room-Wall-South":      { back: true,  front: false },
        "Control-Room-Wall-West":       { back: true,  front: false },
        "Stage-Room-Pillar":            { back: true,  front: false },
        "Stage-Wall-East":              { back: true,  front: false },
        "Stage-Wall-North":             { back: true,  front: false },
        "Stage-Wall-South":             { back: true,  front: false },
        "Stage-Wall-West":              { back: true,  front: false },
        "Stage-Wall-West_primitive0":   { back: true,  front: false },
        "Stage-Wall-West_primitive1":   { back: true,  front: false },
        "Wall":                         { back: true,  front: false },
        "Avatar1":                      { back: true,  front: false },
        "Avatar2":                      { back: true,  front: false },
        "Reference":                    { back: true,  front: false },
        "DecalRay-Begin":               { back: true,  front: false },
        "DecalRay-End":                 { back: true,  front: false },
        "Monitor":                      { back: true,  front: false },
        "Monitor-Case":                 { back: true,  front: false },
        "Monitor-Screen":               { back: true,  front: false },
        "Plate":                        { back: false, front: true  },
        "Hologram":                     { back: false, front: true  },
        "Pane":                         { back: false, front: true  },
        "Pane-Case":                    { back: false, front: true  },
        "Pane-Screen":                  { back: false, front: true  },
        "Pillar":                       { back: false, front: true  },
        "Pillar-Case":                  { back: false, front: true  },
        "Pillar-Screen":                { back: false, front: true  },
        "Mask":                         { back: false, front: true  },
        "Mask-Background":              { back: false, front: true  },
        "Mask-Display":                 { back: false, front: true  },
        "Dummy":                        { back: true,  front: true  }
    } as { [ name: string ]: { back: boolean, front: boolean }}

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
        if (this.layer === "back") {
            this.emit("log", "INFO", "loading opaque environment")
            this.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                skyboxColor: new BABYLON.Color3(0.5, 0.5, 0.5)
            })
        }
        else if (this.layer === "front") {
            this.emit("log", "INFO", "creating transparent environment")
            this.scene.createDefaultEnvironment({
                environmentTexture: "/res/canvas-scene.env",
                createGround: false,
                createSkybox: false
            })
            this.scene.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 0)
        }

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

        /*  gather reference to wall  */
        this.wall = this.scene.getMeshByName("Wall") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.wall === null)
            throw new Error("cannot find wall node")
        this.wallRotBase = this.wall.rotationQuaternion

        /*  on-the-fly generate wall video decal  */
        if (this.layer === "back")
            this.decalGenerate()

        /*  gather references to monitor mesh nodes  */
        this.monitor        = this.scene.getNodeByName("Monitor")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.monitorCase    = this.scene.getMeshByName("Monitor-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.monitorDisplay = this.scene.getMeshByName("Monitor-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.monitor === null || this.monitorCase === null || this.monitorDisplay === null)
            throw new Error("cannot find monitor mesh nodes")
        if (this.layer === "back")
            this.monitor.setEnabled(false)

        /*  gather references to pane mesh nodes  */
        this.pane        = this.scene.getNodeByName("Pane")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.paneCase    = this.scene.getMeshByName("Pane-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.paneDisplay = this.scene.getMeshByName("Pane-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.pane === null || this.paneCase === null || this.paneDisplay === null)
            throw new Error("cannot find pane mesh nodes")
        if (this.layer === "front")
            this.pane.setEnabled(false)

        /*  gather references to pillar mesh nodes  */
        this.pillar        = this.scene.getNodeByName("Pillar")        as BABYLON.Nullable<BABYLON.TransformNode>
        this.pillarCase    = this.scene.getMeshByName("Pillar-Case")   as BABYLON.Nullable<BABYLON.Mesh>
        this.pillarDisplay = this.scene.getMeshByName("Pillar-Screen") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.pillar === null || this.pillarCase === null || this.pillarDisplay === null)
            throw new Error("cannot find pillar mesh nodes")
        if (this.layer === "front")
            this.pillar.setEnabled(false)

        /*  gather references to plate mesh nodes  */
        this.plate        = this.scene.getNodeByName("Plate")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.plateDisplay = this.scene.getMeshByName("Plate-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.plate === null || this.plateDisplay === null)
            throw new Error("cannot find plate mesh nodes")
        if (this.layer === "front")
            this.plateDisplay.setEnabled(false)

        /*  initialize plate base values  */
        this.plateBase.scaleDisplayX = this.plateDisplay!.scaling.x
        this.plateBase.scaleDisplayY = this.plateDisplay!.scaling.y
        this.plateBase.scaleDisplayZ = this.plateDisplay!.scaling.z
        this.plateBase.rotationZ     = this.plate!.rotation.z
        this.plateBase.positionZ     = this.plate!.position.z
        this.plateBase.positionX     = this.plateDisplay!.position.x

        /*  gather references to hologram mesh nodes  */
        this.hologram        = this.scene.getNodeByName("Hologram")         as BABYLON.Nullable<BABYLON.TransformNode>
        this.hologramDisplay = this.scene.getMeshByName("Hologram-Display") as BABYLON.Nullable<BABYLON.Mesh>
        if (this.hologram === null || this.hologramDisplay === null)
            throw new Error("cannot find hologram mesh nodes")
        if (this.layer === "front")
            this.hologramDisplay.setEnabled(false)

        /*  initialize plate base values  */
        this.hologramBase.scaleDisplayX = this.hologramDisplay!.scaling.x
        this.hologramBase.scaleDisplayY = this.hologramDisplay!.scaling.y
        this.hologramBase.scaleDisplayZ = this.hologramDisplay!.scaling.z
        this.hologramBase.rotationZ     = this.hologram!.rotation.z
        this.hologramBase.positionZ     = this.hologram!.position.z
        this.hologramBase.positionX     = this.hologramDisplay!.position.x

        /*  gather references to mask mesh nodes  */
        this.mask           = this.scene.getNodeByName("Mask")            as BABYLON.Nullable<BABYLON.TransformNode>
        this.maskDisplay    = this.scene.getMeshByName("Mask-Display")    as BABYLON.Nullable<BABYLON.Mesh>
        this.maskBackground = this.scene.getMeshByName("Mask-Background") as BABYLON.Nullable<BABYLON.Mesh>
        this.maskCamLens    = this.scene.getNodeByName("Mask-Cam-Lens")   as BABYLON.Nullable<BABYLON.FreeCamera>
        if (this.mask === null || this.maskDisplay === null || this.maskBackground === null || this.maskCamLens === null)
            throw new Error("cannot find mask mesh nodes")
        if (this.layer === "front") {
            this.maskDisplay.setEnabled(false)
            this.maskBackground.setEnabled(false)
        }

        /*  initialize mask base values  */
        this.maskBase.scaleDisplayX = this.maskDisplay!.scaling.x
        this.maskBase.scaleDisplayY = this.maskDisplay!.scaling.y
        this.maskBase.scaleDisplayZ = this.maskDisplay!.scaling.z

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
            sg.addShadowCaster(this.paneCase!)
            sg.addShadowCaster(this.paneDisplay!)
            sg.addShadowCaster(this.pillarCase!)
            sg.addShadowCaster(this.pillarDisplay!)
        }
        setupLight(this.light1)
        setupLight(this.light2)
        setupLight(this.light3)
        this.wall.receiveShadows = true

        /*  initialize monitor base values  */
        this.monitorBase.scaleCaseX       = this.monitorCase.scaling.x
        this.monitorBase.scaleCaseY       = this.monitorCase.scaling.y
        this.monitorBase.scaleCaseZ       = this.monitorCase.scaling.z
        this.monitorBase.scaleDisplayX    = this.monitorDisplay.scaling.x
        this.monitorBase.scaleDisplayY    = this.monitorDisplay.scaling.y
        this.monitorBase.scaleDisplayZ    = this.monitorDisplay.scaling.z
        this.monitorBase.rotationZ        = this.monitor.rotation.z
        this.monitorBase.positionZ        = this.monitor.position.z
        this.monitorBase.positionCaseX    = this.monitorCase.position.x
        this.monitorBase.positionDisplayX = this.monitorDisplay.position.x

        /*  initialize pane base values  */
        this.paneBase.scaleCaseX          = this.paneCase.scaling.x
        this.paneBase.scaleCaseY          = this.paneCase.scaling.y
        this.paneBase.scaleCaseZ          = this.paneCase.scaling.z
        this.paneBase.scaleDisplayX       = this.paneDisplay.scaling.x
        this.paneBase.scaleDisplayY       = this.paneDisplay.scaling.y
        this.paneBase.scaleDisplayZ       = this.paneDisplay.scaling.z
        this.paneBase.rotationZ           = this.pane.rotation.z
        this.paneBase.positionZ           = this.pane.position.z
        this.paneBase.positionCaseX       = this.paneCase.position.x
        this.paneBase.positionDisplayX    = this.paneDisplay.position.x

        /*  initialize pillar base values  */
        this.pillarBase.scaleCaseX        = this.pillarCase.scaling.x
        this.pillarBase.scaleCaseY        = this.pillarCase.scaling.y
        this.pillarBase.scaleCaseZ        = this.pillarCase.scaling.z
        this.pillarBase.scaleDisplayX     = this.pillarDisplay.scaling.x
        this.pillarBase.scaleDisplayY     = this.pillarDisplay.scaling.y
        this.pillarBase.scaleDisplayZ     = this.pillarDisplay.scaling.z
        this.pillarBase.rotationZ         = this.pillar.rotation.z
        this.pillarBase.positionZ         = this.pillar.position.z
        this.pillarBase.positionCaseX     = this.pillarCase.position.x
        this.pillarBase.positionDisplayX  = this.pillarDisplay.position.x

        /*  apply glass material to monitor case  */
        const glass1 = new BABYLON.PBRMaterial("glass1", this.scene)
        glass1.indexOfRefraction    = 1.52
        glass1.alpha                = 0.20
        glass1.directIntensity      = 1.0
        glass1.environmentIntensity = 1.0
        glass1.microSurface         = 1
        glass1.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass1.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.monitorCase.material   = glass1

        /*  apply glass material to pane case  */
        const glass2 = new BABYLON.PBRMaterial("glass2", this.scene)
        glass2.indexOfRefraction    = 1.52
        glass2.alpha                = 0.20
        glass2.directIntensity      = 1.0
        glass2.environmentIntensity = 1.0
        glass2.microSurface         = 1
        glass2.reflectivityColor    = new BABYLON.Color3(0.1, 0.1, 0.1)
        glass2.albedoColor          = new BABYLON.Color3(1.0, 1.0, 1.0)
        this.paneCase.material      = glass2

        /*  determine all layer-specific nodes which should be disabled  */
        for (const node of this.scene.getNodes()) {
            if (this.layerNodes[node.name] !== undefined) {
                if (  (this.layer === "back"  && !this.layerNodes[node.name].back)
                   || (this.layer === "front" && !this.layerNodes[node.name].front)) {
                    node.setEnabled(false)
                    node.dispose()
                }
            }
        }

        /*  manually optimize scene  */
        this.scene.cleanCachedTextureBuffer()

        /*  indicate established state  */
        this.established = true
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

    /*  load video stream  */
    async loadVideoStream () {
        /*  initialize  */
        this.videoStream  = null
        this.videoTexture = null

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
        const label = this.videoStreamDevice
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
                width:     { min: this.videoStreamWidth,  ideal: this.videoStreamWidth,  max: this.videoStreamWidth  },
                height:    { min: this.videoStreamHeight, ideal: this.videoStreamHeight, max: this.videoStreamHeight },
                frameRate: { min: this.videoStreamFPS,    ideal: this.videoStreamFPS,    max: this.videoStreamFPS }
            }
        }).catch((error: Error) => {
            this.emit("log", "ERROR", `failed to load video (device: "${label}"): ${error})`)
            throw new Error(`failed to load video stream (device: "${label}"): ${error})`)
        })

        /*  create texture from media stream  */
        const texture = await BABYLON.VideoTexture.CreateFromStreamAsync(this.scene!, stream, {} as any, true)
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
        this.videoStream  = stream
        this.videoTexture = texture
    }

    /*  unload video stream  */
    async unloadVideoStream () {
        this.emit("log", "INFO", "unloading video stream")
        if (this.videoTexture !== null) {
            this.videoTexture.dispose()
            this.videoTexture = null
        }
        if (this.videoStream !== null) {
            this.videoStream.getTracks().forEach((track) => track.stop())
            this.videoStream = null
        }
    }

    /*  apply video stream onto mesh  */
    async applyVideoMaterial (id: VideoStackId, mesh: BABYLON.Mesh, opacity: number, borderRad: number, borderCrop: number, chromaKey: ChromaKey | null) {
        /*  optionally unload previously loaded material  */
        if (mesh.material instanceof BABYLON.ShaderMaterial && this.videoMeshMaterial.has(mesh)) {
            mesh.material.dispose()
            mesh.material = this.videoMeshMaterial.get(mesh)!
            this.videoMeshMaterial.delete(mesh)
        }

        /*  short-circuit processing in case video texture is not available  */
        if (this.videoTexture === null) {
            const material = mesh.material as BABYLON.PBRMaterial
            material.albedoColor = new BABYLON.Color3(1.0, 0.0, 0.0)
            material.albedoTexture?.dispose()
            material.albedoTexture = null
            material.unlit = true
            return
        }

        /*  remember original material  */
        const materialOld = mesh.material as BABYLON.PBRMaterial
        materialOld.albedoTexture?.dispose()
        materialOld.albedoTexture = null
        this.videoMeshMaterial.set(mesh, materialOld)

        /*  create new shader material  */
        const material = ShaderMaterial.videoStream(`video-${id}`, this.scene!)
        material.setTexture("textureSampler", this.videoTexture)
        material.setFloat("opacity", opacity)
        material.setFloat("borderRadius", borderRad)
        material.setFloat("borderCrop", borderCrop)
        material.setInt("chromaEnable", chromaKey?.enable ? 1 : 0)
        material.setFloat("chromaThreshold", chromaKey?.threshold ?? 0.4)
        material.setFloat("chromaSmoothing", chromaKey?.smoothing ?? 0.1)
        let stack = 0
        if      (this.sourceMap[id] === "S1") stack = 0
        else if (this.sourceMap[id] === "S2") stack = 1
        material.setInt("stack", stack)
        material.setInt("stacks", this.videoStacks)
        material.zOffset = -200
        material.needAlphaBlending = () => true
        material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND

        /*  apply material to mesh  */
        mesh.material = material
    }

    /*  unapply video stream from mesh  */
    async unapplyVideoMaterial (mesh: BABYLON.Mesh) {
        if (mesh.material instanceof BABYLON.ShaderMaterial && this.videoMeshMaterial.has(mesh)) {
            mesh.material.dispose(true, false)
            mesh.material = this.videoMeshMaterial.get(mesh)!
            this.videoMeshMaterial.delete(mesh)
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

        /*  invert the normal vector as it seems to be in the ray direction  */
        const normal = decalBase!.getNormal(true)!
        normal.multiplyInPlace(new BABYLON.Vector3(-1, -1, -1))

        /*  create new decal  */
        this.decal = BABYLON.MeshBuilder.CreateDecal("Decal", this.wall!, {
            position:      decalBase!.pickedPoint!,
            normal,
            angle:         this.ptz.deg2rad(90),
            size,
            cullBackFaces: false,
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
        /*  ensure we update only if we are already established  */
        if (!this.established)
            return true

        /*  adjust streams  */
        if (state.streams !== undefined) {
            let changed = false
            if (state.streams.device !== undefined && this.videoStreamDevice !== state.streams.device) {
                this.videoStreamDevice = state.streams.device
                changed = true
            }
            if (state.streams.width !== undefined && this.videoStreamWidth !== state.streams.width) {
                this.videoStreamWidth = state.streams.width
                changed = true
            }
            if (state.streams.height !== undefined && this.videoStreamHeight !== state.streams.height) {
                this.videoStreamHeight = state.streams.height
                changed = true
            }
            if (state.streams.fps !== undefined && this.videoStreamFPS !== state.streams.fps) {
                this.videoStreamFPS = state.streams.fps
                changed = true
            }
            if (changed) {
                await this.unloadVideoStream()
                await this.loadVideoStream()
            }
        }

        /*  adjust canvas  */
        if (state.canvas !== undefined && this.layer === "back") {
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
        if (state.monitor !== undefined
            && this.monitor !== null && this.monitorCase !== null && this.monitorDisplay !== null
            && this.layer === "back") {
            if (state.monitor.source !== undefined && this.sourceMap.monitor !== state.monitor.source) {
                this.sourceMap.monitor = state.monitor.source
                await this.unapplyVideoMaterial(this.monitorDisplay!)
                await this.applyVideoMaterial("monitor", this.monitorDisplay!, this.monitorOpacity, 0, 0, this.monitorChromaKey)
            }
            if (state.monitor.opacity !== undefined) {
                this.monitorOpacity = state.monitor.opacity
                if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.monitorDisplay.material
                    material.setFloat("opacity", this.monitorOpacity)
                }
            }
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
            if (state.monitor.distance !== undefined) {
                this.monitorCase.position.x    = this.monitorBase.positionCaseX    - state.monitor.distance
                this.monitorDisplay.position.x = this.monitorBase.positionDisplayX - state.monitor.distance
            }
            if (state.monitor.fadeTime !== undefined && this.monitorFade !== state.monitor.fadeTime)
                this.monitorFade = state.monitor.fadeTime
            if (state.monitor.chromaKey !== undefined) {
                if (state.monitor.chromaKey.enable !== undefined && this.monitorChromaKey.enable !== state.monitor.chromaKey.enable) {
                    this.monitorChromaKey.enable = state.monitor.chromaKey.enable
                    if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.monitorDisplay.material
                        material.setInt("chromaEnable", this.monitorChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.monitor.chromaKey.threshold !== undefined && this.monitorChromaKey.threshold !== state.monitor.chromaKey.threshold) {
                    this.monitorChromaKey.threshold = state.monitor.chromaKey.threshold
                    if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.monitorDisplay.material
                        material.setFloat("chromaThreshold", this.monitorChromaKey.threshold)
                    }
                }
                if (state.monitor.chromaKey.smoothing !== undefined && this.monitorChromaKey.smoothing !== state.monitor.chromaKey.smoothing) {
                    this.monitorChromaKey.smoothing = state.monitor.chromaKey.smoothing
                    if (this.monitorChromaKey.enable && this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.monitorDisplay.material
                        material.setFloat("chromaSmoothing", this.monitorChromaKey.smoothing)
                    }
                }
            }
            if (state.monitor.enable !== undefined && this.monitor.isEnabled() !== state.monitor.enable) {
                if (state.monitor.enable) {
                    await this.unapplyVideoMaterial(this.monitorDisplay!)
                    await this.applyVideoMaterial("monitor", this.monitorDisplay!, this.monitorOpacity, 0, 0, this.monitorChromaKey)
                    if (this.monitorFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling monitor (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.fps === 0 ? 1 : this.fps)
                        const fpsTotal = (1000 / fps) * this.monitorFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.monitorCase,
                            "visibility", fps, fpsTotal, 0, 1, 0, ease)!
                        if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.monitor.setEnabled(true)
                        this.monitorCase.visibility = 1
                        this.monitorCase.setEnabled(true)
                        this.monitorDisplay.visibility = 1
                        this.monitorDisplay.setEnabled(true)
                        const anim2 = this.manualAnimation(0, 1, this.monitorFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.emit("log", "INFO", "enabling monitor (fading: end)")
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling monitor")
                        this.monitorCase.visibility    = 1
                        this.monitorDisplay.visibility = 1
                        this.monitorCase.setEnabled(true)
                        this.monitorDisplay.setEnabled(true)
                        this.monitor.setEnabled(true)
                    }
                }
                else if (!state.monitor.enable) {
                    if (this.monitorFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "disabling monitor (fading: start)")
                        this.monitorCase.visibility = 1
                        this.monitorCase.setEnabled(true)
                        this.monitorDisplay.visibility = 1
                        this.monitorDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.fps === 0 ? 1 : this.fps)
                        const fpsTotal = (1000 / fps) * this.monitorFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.monitorCase,
                            "visibility", fps, fpsTotal, 1, 0, 0, ease)!
                        if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.monitorDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = this.manualAnimation(1, 0, this.monitorFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.emit("log", "INFO", "disabling monitor (fading: end)")
                            if (this.monitorDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.monitorDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.monitorDisplay!.visibility = 0.0
                                this.monitorCase!.visibility = 0.0
                            }
                            else  {
                                this.monitorDisplay!.visibility = 0.0
                                this.monitorCase!.visibility = 0.0
                            }
                            this.monitorCase!.setEnabled(false)
                            this.monitorDisplay!.setEnabled(false)
                            this.monitor!.setEnabled(false)
                            await this.unapplyVideoMaterial(this.monitorDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling monitor")
                        if (this.monitorDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.monitorDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.monitorDisplay.visibility = 0.0
                            this.monitorCase.visibility = 0.0
                        }
                        else {
                            this.monitorDisplay.visibility = 0.0
                            this.monitorCase.visibility = 0.0
                        }
                        this.monitorCase.setEnabled(false)
                        this.monitorDisplay.setEnabled(false)
                        this.monitor.setEnabled(false)
                        await this.unapplyVideoMaterial(this.monitorDisplay!)
                    }
                }
            }
        }

        /*  adjust decal  */
        if (state.decal !== undefined && this.decal !== null && this.layer === "back") {
            if (state.decal.fadeTime !== undefined && this.decalFade !== state.decal.fadeTime)
                this.decalFade = state.decal.fadeTime
            if (state.decal.source !== undefined && this.sourceMap.decal !== state.decal.source) {
                this.sourceMap.decal = state.decal.source
                await this.unapplyVideoMaterial(this.decal!)
                await this.applyVideoMaterial("decal", this.decal!, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
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
                    await this.stop()
                    await this.decalGenerate()
                    await this.unapplyVideoMaterial(this.decal!)
                    await this.applyVideoMaterial("decal", this.decal!, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
                    await this.start()
                }
            }
            if (state.decal.enable !== undefined && this.decal.isEnabled() !== state.decal.enable) {
                if (state.decal.enable) {
                    await this.unapplyVideoMaterial(this.decal!)
                    await this.applyVideoMaterial("decal", this.decal!, this.decalOpacity, this.decalBorderRad, this.decalBorderCrop, this.decalChromaKey)
                    if (this.decalFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling decal (fading: start)")
                        if (this.decal.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.decal.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.decal.visibility = 1
                        this.decal.setEnabled(true)
                        await this.manualAnimation(0, 1, this.decalFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
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
                        await this.manualAnimation(1, 0, this.decalFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(async () => {
                            this.emit("log", "INFO", "disabling decal (fading: end)")
                            if (this.decal!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.decal!.material
                                material.setFloat("visibility", 0.0)
                                this.decal!.visibility = 0
                            }
                            else
                                this.decal!.visibility = 0
                            this.decal!.setEnabled(false)
                            await this.unapplyVideoMaterial(this.decal!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling decal")
                        this.decal.visibility = 0
                        this.decal.setEnabled(false)
                        await this.unapplyVideoMaterial(this.decal!)
                    }
                }
            }
        }

        /*  adjust plate  */
        if (state.plate !== undefined && this.plate !== null && this.plateDisplay !== null && this.layer === "front") {
            if (state.plate.source !== undefined && this.sourceMap.plate !== state.plate.source) {
                this.sourceMap.plate = state.plate.source
                await this.unapplyVideoMaterial(this.plateDisplay)
                await this.applyVideoMaterial("plate", this.plateDisplay, this.plateOpacity, this.plateBorderRad, this.plateBorderCrop, this.plateChromaKey)
            }
            if (state.plate.scale !== undefined) {
                this.plateDisplay.scaling.x = this.plateBase.scaleDisplayX * state.plate.scale
                this.plateDisplay.scaling.y = this.plateBase.scaleDisplayY * state.plate.scale
                this.plateDisplay.scaling.z = this.plateBase.scaleDisplayZ * state.plate.scale
            }
            if (state.plate.rotate !== undefined) {
                this.plate.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.plate.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(state.plate.rotate), BABYLON.Space.WORLD)
            }
            if (state.plate.lift !== undefined)
                this.plate.position.z = this.plateBase.positionZ + state.plate.lift
            if (state.plate.distance !== undefined)
                this.plateDisplay.position.x = this.plateBase.positionX - state.plate.distance
            if (state.plate.fadeTime !== undefined && this.plateFade !== state.plate.fadeTime)
                this.plateFade = state.plate.fadeTime
            if (state.plate.opacity !== undefined) {
                this.plateOpacity = state.plate.opacity
                if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.plateDisplay.material
                    material.setFloat("opacity", this.plateOpacity)
                }
            }
            if (state.plate.borderRad !== undefined) {
                this.plateBorderRad = state.plate.borderRad
                if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.plateDisplay.material
                    material.setFloat("borderRadius", this.plateBorderRad)
                }
            }
            if (state.plate.borderCrop !== undefined) {
                this.plateBorderCrop = state.plate.borderCrop
                if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.plateDisplay.material
                    material.setFloat("borderCrop", this.plateBorderCrop)
                }
            }
            if (state.plate.chromaKey !== undefined) {
                if (state.plate.chromaKey.enable !== undefined && this.plateChromaKey.enable !== state.plate.chromaKey.enable) {
                    this.plateChromaKey.enable = state.plate.chromaKey.enable
                    if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.plateDisplay.material
                        material.setInt("chromaEnable", this.plateChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.plate.chromaKey.threshold !== undefined && this.plateChromaKey.threshold !== state.plate.chromaKey.threshold) {
                    this.plateChromaKey.threshold = state.plate.chromaKey.threshold
                    if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.plateDisplay.material
                        material.setFloat("chromaThreshold", this.plateChromaKey.threshold)
                    }
                }
                if (state.plate.chromaKey.smoothing !== undefined && this.plateChromaKey.smoothing !== state.plate.chromaKey.smoothing) {
                    this.plateChromaKey.smoothing = state.plate.chromaKey.smoothing
                    if (this.plateChromaKey.enable && this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.plateDisplay.material
                        material.setFloat("chromaSmoothing", this.plateChromaKey.smoothing)
                    }
                }
            }
            if (state.plate.enable !== undefined && this.plateDisplay.isEnabled() !== state.plate.enable) {
                if (state.plate.enable) {
                    await this.unapplyVideoMaterial(this.plateDisplay)
                    await this.applyVideoMaterial("plate", this.plateDisplay, this.plateOpacity, this.plateBorderRad, this.plateBorderCrop, this.plateChromaKey)
                    if (this.plateFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling plate (fading: start)")
                        if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.plateDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.plateDisplay.visibility = 1.0
                        }
                        else
                            this.plateDisplay.visibility = 0.0
                        this.plateDisplay.setEnabled(true)
                        await this.manualAnimation(0, 1, this.plateFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.plateDisplay!.visibility = gradient
                        }).then(() => {
                            this.emit("log", "INFO", "enabling plate (fading: end)")
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.plateDisplay!.visibility = 1.0
                            }
                            else
                                this.plateDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling plate")
                        if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.plateDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.plateDisplay!.visibility = 1.0
                        }
                        else
                            this.plateDisplay!.visibility = 1.0
                        this.plateDisplay!.setEnabled(true)
                    }
                }
                else if (!state.plate.enable) {
                    if (this.plateFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "disabling plate (fading: start)")
                        if (this.plateDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.plateDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.plateDisplay.visibility = 1.0
                        }
                        else
                            this.plateDisplay.visibility = 1.0
                        this.plateDisplay.setEnabled(true)
                        await this.manualAnimation(1, 0, this.plateFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.plateDisplay!.visibility = gradient
                        }).then(async () => {
                            this.emit("log", "INFO", "disabling plate (fading: end)")
                            if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.plateDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.plateDisplay!.visibility = 0.0
                            }
                            else
                                this.plateDisplay!.visibility = 0.0
                            this.plateDisplay!.setEnabled(false)
                            await this.unapplyVideoMaterial(this.plateDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling plate:" + this.fps)
                        if (this.plateDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.plateDisplay!.material
                            material.setFloat("visibility", 0.0)
                            this.plateDisplay.visibility = 0.0
                        }
                        else
                            this.plateDisplay.visibility = 0.0
                        this.plateDisplay.setEnabled(false)
                        await this.unapplyVideoMaterial(this.plateDisplay!)
                    }
                }
            }
        }

        /*  adjust hologram  */
        if (state.hologram !== undefined && this.hologram !== null && this.hologramDisplay !== null && this.layer === "front") {
            if (state.hologram.source !== undefined && this.sourceMap.hologram !== state.hologram.source) {
                this.sourceMap.hologram = state.hologram.source
                await this.unapplyVideoMaterial(this.hologramDisplay)
                await this.applyVideoMaterial("hologram", this.hologramDisplay, this.hologramOpacity, this.hologramBorderRad, this.hologramBorderCrop, this.hologramChromaKey)
            }
            if (state.hologram.scale !== undefined) {
                this.hologramDisplay.scaling.x = this.hologramBase.scaleDisplayX * state.hologram.scale
                this.hologramDisplay.scaling.y = this.hologramBase.scaleDisplayY * state.hologram.scale
                this.hologramDisplay.scaling.z = this.hologramBase.scaleDisplayZ * state.hologram.scale
            }
            if (state.hologram.rotate !== undefined) {
                this.hologram.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.hologram.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(state.hologram.rotate), BABYLON.Space.WORLD)
            }
            if (state.hologram.lift !== undefined)
                this.hologram.position.z = this.hologramBase.positionZ + state.hologram.lift
            if (state.hologram.distance !== undefined)
                this.hologramDisplay.position.x = this.hologramBase.positionX - state.hologram.distance
            if (state.hologram.fadeTime !== undefined && this.hologramFade !== state.hologram.fadeTime)
                this.hologramFade = state.hologram.fadeTime
            if (state.hologram.opacity !== undefined) {
                this.hologramOpacity = state.hologram.opacity
                if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.hologramDisplay.material
                    material.setFloat("opacity", this.hologramOpacity)
                }
            }
            if (state.hologram.borderRad !== undefined) {
                this.hologramBorderRad = state.hologram.borderRad
                if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.hologramDisplay.material
                    material.setFloat("borderRadius", this.hologramBorderRad)
                }
            }
            if (state.hologram.borderCrop !== undefined) {
                this.hologramBorderCrop = state.hologram.borderCrop
                if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.hologramDisplay.material
                    material.setFloat("borderCrop", this.hologramBorderCrop)
                }
            }
            if (state.hologram.chromaKey !== undefined) {
                if (state.hologram.chromaKey.enable !== undefined && this.hologramChromaKey.enable !== state.hologram.chromaKey.enable) {
                    this.hologramChromaKey.enable = state.hologram.chromaKey.enable
                    if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.hologramDisplay.material
                        material.setInt("chromaEnable", this.hologramChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.hologram.chromaKey.threshold !== undefined && this.hologramChromaKey.threshold !== state.hologram.chromaKey.threshold) {
                    this.hologramChromaKey.threshold = state.hologram.chromaKey.threshold
                    if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.hologramDisplay.material
                        material.setFloat("chromaThreshold", this.hologramChromaKey.threshold)
                    }
                }
                if (state.hologram.chromaKey.smoothing !== undefined && this.hologramChromaKey.smoothing !== state.hologram.chromaKey.smoothing) {
                    this.hologramChromaKey.smoothing = state.hologram.chromaKey.smoothing
                    if (this.hologramChromaKey.enable && this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.hologramDisplay.material
                        material.setFloat("chromaSmoothing", this.hologramChromaKey.smoothing)
                    }
                }
            }
            if (state.hologram.enable !== undefined && this.hologramDisplay.isEnabled() !== state.hologram.enable) {
                if (state.hologram.enable) {
                    await this.unapplyVideoMaterial(this.hologramDisplay)
                    await this.applyVideoMaterial("hologram", this.hologramDisplay, this.hologramOpacity, this.hologramBorderRad, this.hologramBorderCrop, this.hologramChromaKey)
                    if (this.hologramFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling hologram (fading: start)")
                        if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.hologramDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.hologramDisplay.visibility = 0.0
                        this.hologramDisplay.setEnabled(true)
                        await this.manualAnimation(0, 1, this.hologramFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.hologramDisplay!.visibility = gradient
                        }).then(() => {
                            this.emit("log", "INFO", "enabling hologram (fading: end)")
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", 1.0)
                                this.hologramDisplay!.visibility = 1.0
                            }
                            else
                                this.hologramDisplay!.visibility = 1.0
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling hologram")
                        if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.hologramDisplay!.material
                            material.setFloat("visibility", 1.0)
                            this.hologramDisplay!.visibility = 1.0
                        }
                        else
                            this.hologramDisplay!.visibility = 1.0
                        this.hologramDisplay!.setEnabled(true)
                    }
                }
                else if (!state.hologram.enable) {
                    if (this.hologramFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "disabling hologram (fading: start)")
                        if (this.hologramDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.hologramDisplay.material
                            material.setFloat("visibility", 1.0)
                            this.hologramDisplay.visibility = 1.0
                        }
                        else
                            this.hologramDisplay.visibility = 1.0
                        this.hologramDisplay.setEnabled(true)
                        await this.manualAnimation(1, 0, this.hologramFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                            else
                                this.hologramDisplay!.visibility = gradient
                        }).then(async () => {
                            this.emit("log", "INFO", "disabling hologram (fading: end)")
                            if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.hologramDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.hologramDisplay!.visibility = 0.0
                            }
                            else
                                this.hologramDisplay!.visibility = 0.0
                            this.hologramDisplay!.setEnabled(false)
                            await this.unapplyVideoMaterial(this.hologramDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling hologram")
                        if (this.hologramDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.hologramDisplay!.material
                            material.setFloat("visibility", 0.0)
                            this.hologramDisplay!.visibility = 0.0
                        }
                        else
                            this.hologramDisplay.visibility = 0.0
                        this.hologramDisplay.setEnabled(false)
                        await this.unapplyVideoMaterial(this.hologramDisplay!)
                    }
                }
            }
        }

        /*  adjust pane  */
        if (state.pane !== undefined
            && this.pane !== null && this.paneCase !== null && this.paneDisplay !== null
            && this.layer === "front") {
            if (state.pane.source !== undefined && this.sourceMap.pane !== state.pane.source) {
                this.sourceMap.pane = state.pane.source
                await this.unapplyVideoMaterial(this.paneDisplay!)
                await this.applyVideoMaterial("pane", this.paneDisplay!, this.paneOpacity, 0, 0, this.paneChromaKey)
            }
            if (state.pane.opacity !== undefined) {
                this.paneOpacity = state.pane.opacity
                if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.paneDisplay.material
                    material.setFloat("opacity", this.paneOpacity)
                }
            }
            if (state.pane.scale !== undefined) {
                this.paneCase.scaling.x    = this.paneBase.scaleCaseX    * state.pane.scale
                this.paneCase.scaling.y    = this.paneBase.scaleCaseY    * state.pane.scale
                this.paneCase.scaling.z    = this.paneBase.scaleCaseZ    * state.pane.scale
                this.paneDisplay.scaling.x = this.paneBase.scaleDisplayX * state.pane.scale
                this.paneDisplay.scaling.y = this.paneBase.scaleDisplayY * state.pane.scale
                this.paneDisplay.scaling.z = this.paneBase.scaleDisplayZ * state.pane.scale
            }
            if (state.pane.rotate !== undefined) {
                this.pane.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.pane.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(state.pane.rotate), BABYLON.Space.WORLD)
            }
            if (state.pane.lift !== undefined)
                this.pane.position.z = this.paneBase.positionZ + (state.pane.lift / 100)
            if (state.pane.distance !== undefined) {
                this.paneCase.position.x    = this.paneBase.positionCaseX    - state.pane.distance
                this.paneDisplay.position.x = this.paneBase.positionDisplayX - state.pane.distance
            }
            if (state.pane.fadeTime !== undefined && this.paneFade !== state.pane.fadeTime)
                this.paneFade = state.pane.fadeTime
            if (state.pane.chromaKey !== undefined) {
                if (state.pane.chromaKey.enable !== undefined && this.paneChromaKey.enable !== state.pane.chromaKey.enable) {
                    this.paneChromaKey.enable = state.pane.chromaKey.enable
                    if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.paneDisplay.material
                        material.setInt("chromaEnable", this.paneChromaKey.enable ? 1 : 0)
                    }
                }
                if (state.pane.chromaKey.threshold !== undefined && this.paneChromaKey.threshold !== state.pane.chromaKey.threshold) {
                    this.paneChromaKey.threshold = state.pane.chromaKey.threshold
                    if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.paneDisplay.material
                        material.setFloat("chromaThreshold", this.paneChromaKey.threshold)
                    }
                }
                if (state.pane.chromaKey.smoothing !== undefined && this.paneChromaKey.smoothing !== state.pane.chromaKey.smoothing) {
                    this.paneChromaKey.smoothing = state.pane.chromaKey.smoothing
                    if (this.paneChromaKey.enable && this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.paneDisplay.material
                        material.setFloat("chromaSmoothing", this.paneChromaKey.smoothing)
                    }
                }
            }
            if (state.pane.enable !== undefined && this.pane.isEnabled() !== state.pane.enable) {
                if (state.pane.enable) {
                    await this.unapplyVideoMaterial(this.paneDisplay!)
                    await this.applyVideoMaterial("pane", this.paneDisplay!, this.paneOpacity, 0, 0, this.paneChromaKey)
                    if (this.paneFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling pane (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.fps === 0 ? 1 : this.fps)
                        const fpsTotal = (1000 / fps) * this.paneFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.paneCase,
                            "visibility", fps, fpsTotal, 0, 1, 0, ease)!
                        if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.paneDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.pane.setEnabled(true)
                        this.paneCase.visibility = 1
                        this.paneCase.setEnabled(true)
                        this.paneDisplay.visibility = 1
                        this.paneDisplay.setEnabled(true)
                        const anim2 = this.manualAnimation(0, 1, this.paneFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", 1.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(() => {
                            this.emit("log", "INFO", "enabling pane (fading: end)")
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling pane")
                        this.paneCase.visibility    = 1
                        this.paneDisplay.visibility = 1
                        this.paneCase.setEnabled(true)
                        this.paneDisplay.setEnabled(true)
                        this.pane.setEnabled(true)
                    }
                }
                else if (!state.pane.enable) {
                    if (this.paneFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "disabling pane (fading: start)")
                        this.paneCase.visibility = 1
                        this.paneCase.setEnabled(true)
                        this.paneDisplay.visibility = 1
                        this.paneDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.fps === 0 ? 1 : this.fps)
                        const fpsTotal = (1000 / fps) * this.paneFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.paneCase,
                            "visibility", fps, fpsTotal, 1, 0, 0, ease)!
                        if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.paneDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = this.manualAnimation(1, 0, this.paneFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", gradient)
                            }
                        }).then(() => {
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                            }
                        })
                        await Promise.all([ anim1.waitAsync(), anim2 ]).then(async () => {
                            this.emit("log", "INFO", "disabling pane (fading: end)")
                            if (this.paneDisplay!.material instanceof BABYLON.ShaderMaterial) {
                                const material = this.paneDisplay!.material
                                material.setFloat("visibility", 0.0)
                                this.paneDisplay!.visibility = 0.0
                                this.paneCase!.visibility = 0.0
                            }
                            else  {
                                this.paneDisplay!.visibility = 0.0
                                this.paneCase!.visibility = 0.0
                            }
                            this.paneCase!.setEnabled(false)
                            this.paneDisplay!.setEnabled(false)
                            this.pane!.setEnabled(false)
                            await this.unapplyVideoMaterial(this.paneDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling pane")
                        if (this.paneDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.paneDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.paneDisplay.visibility = 0.0
                            this.paneCase.visibility = 0.0
                        }
                        else {
                            this.paneDisplay.visibility = 0.0
                            this.paneCase.visibility = 0.0
                        }
                        this.paneCase.setEnabled(false)
                        this.paneDisplay.setEnabled(false)
                        this.pane.setEnabled(false)
                        await this.unapplyVideoMaterial(this.paneDisplay!)
                    }
                }
            }
        }

        /*  adjust pillar  */
        if (state.pillar !== undefined
            && this.pillar !== null && this.pillarCase !== null && this.pillarDisplay !== null
            && this.layer === "front") {
            if (state.pillar.source !== undefined && this.sourceMap.pillar !== state.pillar.source) {
                this.sourceMap.pillar = state.pillar.source
                await this.unapplyVideoMaterial(this.pillarDisplay!)
                await this.applyVideoMaterial("pillar", this.pillarDisplay!, this.pillarOpacity, 0, 0, this.pillarChromaKey)
            }
            if (state.pillar.opacity !== undefined) {
                this.pillarOpacity = state.pillar.opacity
                if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.pillarDisplay.material
                    material.setFloat("opacity", this.pillarOpacity)
                }
            }
            if (state.pillar.scale !== undefined) {
                this.pillarCase.scaling.x    = this.pillarBase.scaleCaseX    * state.pillar.scale
                this.pillarCase.scaling.y    = this.pillarBase.scaleCaseY    * state.pillar.scale
                this.pillarCase.scaling.z    = this.pillarBase.scaleCaseZ    * state.pillar.scale
                this.pillarDisplay.scaling.x = this.pillarBase.scaleDisplayX * state.pillar.scale
                this.pillarDisplay.scaling.y = this.pillarBase.scaleDisplayY * state.pillar.scale
                this.pillarDisplay.scaling.z = this.pillarBase.scaleDisplayZ * state.pillar.scale
            }
            if (state.pillar.rotate !== undefined) {
                this.pillar.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.pillar.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.ptz.deg2rad(state.pillar.rotate), BABYLON.Space.WORLD)
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
                    await this.unapplyVideoMaterial(this.pillarDisplay!)
                    await this.applyVideoMaterial("pillar", this.pillarDisplay!, this.pillarOpacity, 0, 0, this.pillarChromaKey)
                    if (this.pillarFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "enabling pillar (fading: start)")
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.fps === 0 ? 1 : this.fps)
                        const fpsTotal = (1000 / fps) * this.pillarFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("show", this.pillarCase,
                            "visibility", fps, fpsTotal, 0, 1, 0, ease)!
                        if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.pillarDisplay.material
                            material.setFloat("visibility", 0.0)
                        }
                        this.pillar.setEnabled(true)
                        this.pillarCase.visibility = 1
                        this.pillarCase.setEnabled(true)
                        this.pillarDisplay.visibility = 1
                        this.pillarDisplay.setEnabled(true)
                        const anim2 = this.manualAnimation(0, 1, this.pillarFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
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
                            this.emit("log", "INFO", "enabling pillar (fading: end)")
                        })
                    }
                    else {
                        this.emit("log", "INFO", "enabling pillar")
                        this.pillarCase.visibility    = 1
                        this.pillarDisplay.visibility = 1
                        this.pillarCase.setEnabled(true)
                        this.pillarDisplay.setEnabled(true)
                        this.pillar.setEnabled(true)
                    }
                }
                else if (!state.pillar.enable) {
                    if (this.pillarFade > 0 && this.fps > 0) {
                        this.emit("log", "INFO", "disabling pillar (fading: start)")
                        this.pillarCase.visibility = 1
                        this.pillarCase.setEnabled(true)
                        this.pillarDisplay.visibility = 1
                        this.pillarDisplay.setEnabled(true)
                        const ease = new BABYLON.SineEase()
                        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
                        const fps = (this.fps === 0 ? 1 : this.fps)
                        const fpsTotal = (1000 / fps) * this.pillarFade
                        const anim1 = BABYLON.Animation.CreateAndStartAnimation("hide", this.pillarCase,
                            "visibility", fps, fpsTotal, 1, 0, 0, ease)!
                        if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.pillarDisplay.material
                            material.setFloat("visibility", 1.0)
                        }
                        const anim2 = this.manualAnimation(1, 0, this.pillarFade, (this.fps === 0 ? 1 : this.fps), (gradient) => {
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
                            this.emit("log", "INFO", "disabling pillar (fading: end)")
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
                            await this.unapplyVideoMaterial(this.pillarDisplay!)
                        })
                    }
                    else {
                        this.emit("log", "INFO", "disabling pillar")
                        if (this.pillarDisplay.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.pillarDisplay.material
                            material.setFloat("visibility", 0.0)
                            this.pillarDisplay.visibility = 0.0
                            this.pillarCase.visibility = 0.0
                        }
                        else {
                            this.pillarDisplay.visibility = 0.0
                            this.pillarCase.visibility = 0.0
                        }
                        this.pillarCase.setEnabled(false)
                        this.pillarDisplay.setEnabled(false)
                        this.pillar.setEnabled(false)
                        await this.unapplyVideoMaterial(this.pillarDisplay!)
                    }
                }
            }
        }

        /*  adjust mask  */
        if (state.mask !== undefined && this.mask !== null && this.maskDisplay !== null && this.layer === "front") {
            if (state.mask.source !== undefined && this.sourceMap.mask !== state.mask.source) {
                this.sourceMap.mask = state.mask.source
                await this.unapplyVideoMaterial(this.maskDisplay)
                await this.applyVideoMaterial("mask", this.maskDisplay, 1.0, this.maskBorderRad, 0, null)
            }
            if (state.mask.scale !== undefined) {
                this.maskDisplay.scaling.x = this.maskBase.scaleDisplayX * state.mask.scale
                this.maskDisplay.scaling.y = this.maskBase.scaleDisplayY * state.mask.scale
                this.maskDisplay.scaling.z = this.maskBase.scaleDisplayZ * state.mask.scale
            }
            if (state.mask.borderRad !== undefined) {
                this.maskBorderRad = state.mask.borderRad
                if (this.maskDisplay.material instanceof BABYLON.ShaderMaterial) {
                    const material = this.maskDisplay.material
                    material.setFloat("borderRadius", this.maskBorderRad)
                }
            }
            if (state.mask.enable !== undefined && this.maskDisplay.isEnabled() !== state.mask.enable) {
                if (state.mask.enable) {
                    this.scene!.activeCamera = this.maskCamLens
                    await this.unapplyVideoMaterial(this.maskDisplay)
                    await this.applyVideoMaterial("mask", this.maskDisplay, 1.0, this.maskBorderRad, 0, null)
                    this.emit("log", "INFO", "enabling mask")
                    if (this.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                        const material = this.maskDisplay!.material
                        material.setFloat("visibility", 1.0)
                        this.maskDisplay!.visibility = 1.0
                    }
                    else
                        this.maskDisplay!.visibility = 1.0
                    this.maskBackground!.visibility = 1.0
                    this.maskDisplay!.setEnabled(true)
                    this.maskBackground!.setEnabled(true)
                }
                else if (!state.mask.enable) {
                    /*  disable mask
                        NOTICE: BabylonJS immediately stops rendering if it thinks there are no more
                        visible meshes, so we have to first render it nearly invisible and then
                        finally disable it  */
                    this.emit("log", "INFO", "disabling mask")
                    const setOnce = (value: number) => {
                        if (this.maskDisplay!.material instanceof BABYLON.ShaderMaterial) {
                            const material = this.maskDisplay!.material
                            material.setFloat("visibility", value)
                            this.maskDisplay!.visibility = value
                        }
                        else
                            this.maskDisplay!.visibility = value
                        this.maskBackground!.visibility = value
                    }
                    setOnce(0.000000001)
                    this.scene!.onAfterRenderObservable.addOnce(async (ev, state) => {
                        setOnce(0)
                        this.maskDisplay!.setEnabled(false)
                        this.maskBackground!.setEnabled(false)
                        this.scene!.activeCamera = this.cameraLens
                        await this.unapplyVideoMaterial(this.maskDisplay!)
                    })
                }
            }
        }

        /*  adjust lights  */
        if (state.lights !== undefined && this.light1 !== null && this.light2 !== null && this.light3 !== null) {
            if (state.lights.intensity1 !== undefined)
                this.light1.intensity = state.lights.intensity1
            if (state.lights.intensity2 !== undefined)
                this.light2.intensity = state.lights.intensity2
            if (state.lights.intensity3 !== undefined)
                this.light3.intensity = state.lights.intensity3
        }

        /*  adjust avatars  */
        if (state.avatars !== undefined && this.avatar1 !== null && this.avatar2 !== null && this.layer === "back") {
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
        if (state.references !== undefined && this.references !== null && this.layer === "back") {
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

        return true
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
        /*  ensure we update only if we are already established  */
        if (!this.established)
            return

        /*  remember state  */
        if (state === null)
            return
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

