/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import EventEmitter   from "eventemitter2"
import * as BABYLON   from "@babylonjs/core"
import                     "@babylonjs/loaders/glTF"

/*  import internal dependencies  */
import PTZ            from "./app-ptz"
import { MixerState } from "../common/app-mixer"
import { FreeDState } from "../common/app-freed"
import { StateType, StateTypePartial } from "../common/app-state"

/*  the canvas rendering class  */
export default class CanvasRenderer extends EventEmitter {
    /*  internal parameter state  */
    private ptzFreeD    = false
    private ptzKeys     = false
    private cameraName  = ""
    private texture1URL = ""
    private texture2URL = ""
    private fadeTrans   = 2  * 1000
    private fadeWait    = 10 * 1000
    private decalRotate = 0.0
    private decalLift   = 0.0
    private decalScale  = 1.0
    private monitorBase = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationY:     0, positionY:     0
    }
    private avatar1Scale = { x: 0, y: 0, z: 0 }
    private avatar2Scale = { x: 0, y: 0, z: 0 }

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

    /*  effectively constant values  */
    private wallWidth   = 10540
    private wallHeight  = 3570

    /*  rendering object references  */
    private engine:         BABYLON.Nullable<BABYLON.Engine>         = null
    private scene:          BABYLON.Nullable<BABYLON.Scene>          = null
    private optimizer:      BABYLON.Nullable<BABYLON.SceneOptimizer> = null
    private camera:         BABYLON.Nullable<BABYLON.FreeCamera>     = null
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

    /*  video stream device names  */
    private deviceMonitor = ""
    private deviceDecal   = ""

    /*  PTZ sub-module  */
    private ptz = new PTZ()

    /*  FreeD state  */
    private state: FreeDState | null = null

    /*  cross-fade timer  */
    private fadeTimer: ReturnType<typeof setTimeout> | null = null
    private texFade: BABYLON.Nullable<BABYLON.InputBlock> | null = null

    /*  (re-)configure camera (by name) and options (by URL)  */
    configure (params: { camera?: string, ptzFreeD?: boolean, ptzKeys?: boolean } = {}) {
        this.cameraName = params.camera   ?? this.cameraName
        this.ptzFreeD   = params.ptzFreeD ?? this.ptzFreeD
        this.ptzKeys    = params.ptzKeys  ?? this.ptzKeys
    }

    /*  initially establish rendering engine and scene  */
    async establish (canvas: HTMLCanvasElement) {
        /*  establish rendering engine on canvas element  */
        this.engine = new BABYLON.Engine(canvas, true, {
            useExactSrgbConversions: true
        })
        if (this.engine === null)
            throw new Error("cannot establish Babylon engine")
        window.addEventListener("resize", () => {
            this.engine!.resize()
        })

        /*  load the Blender glTF scene export  */
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
        this.scene.createDefaultEnvironment({
            environmentTexture: "/res/canvas-scene.env",
            skyboxColor: new BABYLON.Color3(0.5, 0.5, 0.5)
        })

        /*  use particular camera of scene  */
        this.camera = this.scene.getCameraByName(this.cameraName) as BABYLON.FreeCamera
        if (this.camera === null)
            throw new Error("cannot find camera")
        this.camera.fovMode = BABYLON.FreeCamera.FOVMODE_HORIZONTAL_FIXED
        this.scene.activeCamera = this.camera

        /*  initialize camera pan/tilt center position  */
        this.ptz.posXOrigin   = this.camera.position.x
        this.ptz.posYOrigin   = this.camera.position.y
        this.ptz.posZOrigin   = this.camera.position.z
        this.ptz.tiltOrigin   = this.camera.rotation.x
        this.ptz.panOrigin    = this.camera.rotation.y
        this.ptz.rotateOrigin = this.camera.rotation.z

        /*  go to camera home position  */
        this.camera!.position.x = this.ptz.posXP2V(0)
        this.camera!.position.y = this.ptz.posYP2V(0)
        this.camera!.position.z = this.ptz.posZP2V(0)
        this.camera!.rotation.x = this.ptz.tiltP2V(0)
        this.camera!.rotation.y = this.ptz.panP2V(0)
        this.camera!.rotation.z = this.ptz.rotateP2V(0)
        this.camera!.fov        = this.ptz.zoomP2V(0)

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
        this.monitorBase.rotationY     = this.monitor.rotation.y
        this.monitorBase.positionY     = this.monitor.position.y

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
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {})
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
    async loadVideoStream (mesh: BABYLON.Mesh, label: string) {
        const material = mesh.material as BABYLON.PBRMaterial
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        const device = devices.find((device) =>
            device.kind === "videoinput" && device.label === label)
        if (device === undefined) {
            material.albedoColor = new BABYLON.Color3(1.00, 0.00, 0.00)
            material.albedoTexture = null
            material.unlit = true
        }
        else {
            await BABYLON.VideoTexture.CreateFromWebCamAsync(this.scene!,
                { deviceId: device.deviceId } as any, false, false).then((vt) => {
                material.albedoColor = new BABYLON.Color3(1.0, 1.0, 1.0)
                material.albedoTexture = vt
                material.unlit = true
            })
        }
    }

    /*  unload video stream  */
    async unloadVideoStream (mesh: BABYLON.Mesh) {
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

        /*  helper function for rotating a Vector3 by Euler angles  */
        const rotateVector = (vec: BABYLON.Vector3, x: number, y: number, z: number) => {
            const quat = BABYLON.Quaternion.FromEulerAngles(x, y, z)
            const zero = BABYLON.Vector3.Zero()
            return vec.rotateByQuaternionToRef(quat, zero)
        }

        /*  determine decal base position on wall  */
        const rayEndPos   = BABYLON.Vector3.TransformCoordinates(rayEnd.position,   rayEnd.getWorldMatrix())
        const rayBeginPos = BABYLON.Vector3.TransformCoordinates(rayBegin.position, rayBegin.getWorldMatrix())
        let rayDirection = rayEndPos.subtract(rayBeginPos).normalize()
        rayDirection = rotateVector(rayDirection, this.ptz.deg2rad(-this.decalLift),
            this.ptz.deg2rad(this.decalRotate), this.ptz.deg2rad(-this.decalLift))
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
            size,
            cullBackFaces: true,
            localMode:     true
        })

        /*  take over material or create a fresh one  */
        let material = oldDecal?.material ?? null
        if (material === null) {
            material = new BABYLON.PBRMaterial("Decal-Material", this.scene!)
            material.alpha   = 1.0
            material.zOffset = -2
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
            if (changed) {
                await this.stop()
                await this.unloadWall()
                await this.loadWall()
                await this.start()
            }
        }

        /*  adjust monitor  */
        if (state.monitor !== undefined) {
            if (state.monitor.enable !== undefined && this.monitor.isEnabled() !== state.monitor.enable) {
                this.monitor.setEnabled(state.monitor.enable)
                if (state.monitor.enable && this.deviceMonitor !== "") {
                    await this.stop()
                    await this.unloadVideoStream(this.monitorDisplay!)
                    await this.loadVideoStream(this.monitorDisplay!, this.deviceMonitor)
                    await this.start()
                }
                else if (!state.monitor.enable) {
                    await this.stop()
                    await this.unloadVideoStream(this.monitorDisplay!)
                    await this.start()
                }
            }
            if (state.monitor.device !== undefined && this.deviceMonitor !== state.monitor.device) {
                this.deviceMonitor = state.monitor.device
                await this.stop()
                await this.unloadVideoStream(this.monitorDisplay!)
                await this.loadVideoStream(this.monitorDisplay!, this.deviceMonitor)
                await this.start()
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
                this.monitor.rotate(new BABYLON.Vector3(0, 1, 0),
                    this.ptz.deg2rad(-state.monitor.rotate), BABYLON.Space.WORLD)
            }
            if (state.monitor.lift !== undefined)
                this.monitor.position.y = this.monitorBase.positionY + (state.monitor.lift / 100)
        }

        /*  adjust decal  */
        if (state.decal !== undefined) {
            if (state.decal.enable !== undefined && this.decal.isEnabled() !== state.decal.enable) {
                this.decal.setEnabled(state.decal.enable)
                if (state.decal.enable && this.deviceDecal !== "") {
                    await this.stop()
                    await this.unloadVideoStream(this.decal!)
                    await this.loadVideoStream(this.decal!, this.deviceDecal)
                    await this.start()
                }
                else if (!state.decal.enable) {
                    await this.stop()
                    await this.unloadVideoStream(this.decal!)
                    await this.start()
                }
            }
            if (state.decal.device !== undefined && this.deviceMonitor !== state.decal.device) {
                this.deviceDecal = state.decal.device
                await this.stop()
                await this.unloadVideoStream(this.decal!)
                await this.loadVideoStream(this.decal!, state.decal.device)
                await this.start()
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
                    await this.start()
                }
            }
            if (state.decal.opacity !== undefined) {
                const material = this.decal.material as BABYLON.PBRMaterial
                material.alpha = state.decal.opacity
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

        /*  adjust avatar 1  */
        if (state.avatar1 !== undefined) {
            if (state.avatar1.enable !== undefined && this.avatar1.isEnabled() !== state.avatar1.enable)
                this.avatar1.setEnabled(state.avatar1.enable)
            if (state.avatar1.size !== undefined) {
                const scale = state.avatar1.size / 185
                this.avatar1Model!.scaling.x = this.avatar1Scale.x * scale
                this.avatar1Model!.scaling.y = this.avatar1Scale.y * scale
                this.avatar1Model!.scaling.z = this.avatar1Scale.z * scale
            }
            if (state.avatar1.rotate !== undefined) {
                this.avatar1.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.avatar1.rotate(new BABYLON.Vector3(0, 1, 0),
                    this.ptz.deg2rad(-state.avatar1.rotate), BABYLON.Space.WORLD)
            }
        }

        /*  adjust avatar 2  */
        if (state.avatar2 !== undefined) {
            if (state.avatar2.enable !== undefined && this.avatar2.isEnabled() !== state.avatar2.enable)
                this.avatar2.setEnabled(state.avatar2.enable)
            if (state.avatar2.size !== undefined) {
                const scale = state.avatar2.size / 185
                this.avatar2Model!.scaling.x = this.avatar2Scale.x * scale
                this.avatar2Model!.scaling.y = this.avatar2Scale.y * scale
                this.avatar2Model!.scaling.z = this.avatar2Scale.z * scale
            }
            if (state.avatar2.rotate !== undefined) {
                this.avatar2.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.avatar2.rotate(new BABYLON.Vector3(0, 1, 0),
                    this.ptz.deg2rad(-state.avatar2.rotate), BABYLON.Space.WORLD)
            }
        }

        /*  adjust reference points  */
        if (state.references !== undefined) {
            if (state.references.enable !== undefined)
                this.references.setEnabled(state.references.enable)
        }

        /*  adjust camera calibration  */
        if ((state as any)[this.cameraName] !== undefined && this.camera !== null) {
            /*  adjust X position  */
            if ((state as any)[this.cameraName].position?.x !== undefined) {
                const x = this.ptz.posXV2P(this.camera.position.x)
                this.ptz.posXDelta = (state as any)[this.cameraName].position.x / 100
                this.camera.position.x = this.ptz.posXP2V(x)
            }

            /*  adjust Y position  */
            if ((state as any)[this.cameraName].position?.y !== undefined) {
                const y = this.ptz.posYV2P(this.camera.position.y)
                this.ptz.posYDelta = (state as any)[this.cameraName].position.y / 100
                this.camera.position.y = this.ptz.posYP2V(y)
            }

            /*  adjust Z position  */
            if ((state as any)[this.cameraName].position?.z !== undefined) {
                const z = this.ptz.posZV2P(this.camera.position.z)
                this.ptz.posZDelta = (state as any)[this.cameraName].position.z / 100
                this.camera.position.z = this.ptz.posZP2V(z)
            }

            /*  adjust pan  */
            if ((state as any)[this.cameraName].rotation?.y !== undefined) {
                const pan = this.ptz.panV2P(this.camera.rotation.y)
                this.ptz.panDelta = this.ptz.deg2rad((state as any)[this.cameraName].rotation.y)
                this.camera.rotation.y = this.ptz.panP2V(pan)
            }

            /*  adjust tilt  */
            if ((state as any)[this.cameraName].rotation?.x !== undefined) {
                const tilt = this.ptz.tiltV2P(this.camera.rotation.x)
                this.ptz.tiltDelta = this.ptz.deg2rad((state as any)[this.cameraName].rotation.x)
                this.camera.rotation.x = this.ptz.tiltP2V(tilt)
            }

            /*  adjust rotation  */
            if ((state as any)[this.cameraName].rotation?.z !== undefined) {
                const rotate = this.ptz.rotateV2P(this.camera.rotation.z)
                this.ptz.rotateDelta = this.ptz.deg2rad((state as any)[this.cameraName].rotation.z)
                this.camera.rotation.z = this.ptz.rotateP2V(rotate)
            }

            /*  adjust field-of-view  */
            if ((state as any)[this.cameraName].fov?.m !== undefined) {
                const zoom = this.ptz.zoomV2P(this.camera.fov)
                this.ptz.fovMult = (state as any)[this.cameraName].fov.m
                this.camera.fov = this.ptz.zoomP2V(zoom)
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
        }
    }

    /*  react on a received FreeD state record by reflecting its camera PTZ state  */
    reflectFreeDState (state: FreeDState) {
        this.state = state
        if (this.ptzFreeD && this.camera !== null /* notice: FreeD can be faster than Babylon */) {
            this.camera.rotation.x = this.ptz.tiltP2V(state.tilt)
            this.camera.rotation.y = this.ptz.panP2V(state.pan)
            this.camera.rotation.z = this.ptz.rotateP2V(0)
            this.camera.fov        = this.ptz.zoomP2V(state.zoom)
        }
    }

    /*  react on a key (down) event by manipulating the camera PTZ state  */
    async reactOnKeyEvent (key: string) {
        if (!this.ptzKeys)
            return

        /*  pan  */
        if (key === "ArrowLeft")
            this.camera!.rotation.y =
                Math.min(this.camera!.rotation.y + this.ptz.panStep, this.ptz.panP2V(this.ptz.panMinDeg))
        else if (key === "ArrowRight")
            this.camera!.rotation.y =
                Math.max(this.camera!.rotation.y - this.ptz.panStep, this.ptz.panP2V(this.ptz.panMaxDeg))

        /*  tilt  */
        else if (key === "ArrowDown")
            this.camera!.rotation.x =
                Math.min(this.camera!.rotation.x + this.ptz.tiltStep, this.ptz.tiltP2V(this.ptz.tiltMinDeg))
        else if (key === "ArrowUp")
            this.camera!.rotation.x =
                Math.max(this.camera!.rotation.x - this.ptz.tiltStep, this.ptz.tiltP2V(this.ptz.tiltMaxDeg))

        /*  rotate  */
        else if (key === "+")
            this.camera!.rotation.z =
                Math.min(this.camera!.rotation.z + this.ptz.rotateStep, this.ptz.rotateP2V(this.ptz.rotateMinDeg))
        else if (key === "-")
            this.camera!.rotation.z =
                Math.max(this.camera!.rotation.z - this.ptz.rotateStep, this.ptz.rotateP2V(this.ptz.rotateMaxDeg))

        /*  zoom  */
        else if (key === "PageUp")
            this.camera!.fov =
                Math.max(this.camera!.fov - this.ptz.zoomStep, this.ptz.zoomP2V(this.ptz.zoomMax))
        else if (key === "PageDown")
            this.camera!.fov =
                Math.min(this.camera!.fov + this.ptz.zoomStep, this.ptz.zoomP2V(this.ptz.zoomMin))

        /*  reset  */
        else if (key === "Home") {
            this.camera!.position.x = this.ptz.posXP2V(0)
            this.camera!.position.y = this.ptz.posYP2V(0)
            this.camera!.position.z = this.ptz.posZP2V(0)
            this.camera!.rotation.x = this.ptz.tiltP2V(0)
            this.camera!.rotation.y = this.ptz.panP2V(0)
            this.camera!.rotation.z = this.ptz.rotateP2V(0)
            this.camera!.fov        = this.ptz.zoomP2V(0)
        }
    }
}

