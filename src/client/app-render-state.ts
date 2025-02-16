/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON         from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import PTZ                  from "./app-render-ptz"

/*  import internal dependencies (shared)  */
import { FreeDState }       from "../common/app-freed"

/*  utility types  */
export type ChromaKey = { enable: boolean, threshold: number, smoothing: number }

type CanvasConfig = {
    texture1:  string,
    texture2:  string,
    fadeTrans: number,
    fadeWait:  number
}

type CanvasState = {
    canvas1:  HTMLCanvasElement | null
    canvas2:  HTMLCanvasElement | null
    texture1: BABYLON.Nullable<BABYLON.Texture>
    texture2: BABYLON.Nullable<BABYLON.Texture>
}

/*  the canvas rendering state class  */
export default class State {
    public established       = false
    public ptzFreeD          = false
    public ptzKeys           = false
    public layer             = ""
    public cameraName        = ""
    public canvasMode        = 0
    public canvasConfig      = [
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 },
        { texture1: "", texture2: "", fadeTrans: 2 * 1000, fadeWait: 10 * 1000 }
    ] as CanvasConfig[]
    public decalRotate       = 0.0
    public decalLift         = 0.0
    public decalScale        = 1.0
    public decalFade         = 0
    public decalOpacity      = 1.0
    public decalBorderRad    = 40.0
    public decalBorderCrop   = 0.0
    public decalChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public monitorFade       = 0
    public monitorOpacity    = 1.0
    public monitorChromaKey  = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public paneFade          = 0
    public paneOpacity       = 1.0
    public paneChromaKey     = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public pillarFade        = 0
    public pillarOpacity     = 1.0
    public pillarBorderRad   = 40.0
    public pillarBorderCrop  = 0.0
    public pillarChromaKey   = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public maskBorderRad     = 0.0
    public videoStream:      MediaStream | null = null
    public videoTexture:     BABYLON.Nullable<BABYLON.Texture> = null
    public videoStacks       = 2
    public displaySourceMap    = { decal: "S1", monitor: "S2", plate: "S1", hologram: "S2", pane: "S2", pillar: "S2", mask: "S2" } as { [ id: string ]: string }
    public displayMeshMaterial = new Map<BABYLON.Mesh, BABYLON.Nullable<BABYLON.Material>>()
    public displayMediaURL     = new Map<string, string>()
    public displayMaterial2Texture = new Map<BABYLON.Material, BABYLON.Texture>()
    public displayTextureByURL = new Map<string, BABYLON.Texture>()
    public displayTextureInfo  = new Map<BABYLON.Texture, { type: string, url: string, refs: number }>()
    public monitorBase       = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }
    public paneBase          = {
        scaleCaseX:    0, scaleCaseY:    0, scaleCaseZ:    0,
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }
    public pillarBase        = {
        scaleX:        0, scaleY:        0, scaleZ:        0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }
    public avatar1Scale      = { x: 0, y: 0, z: 0 }
    public avatar2Scale      = { x: 0, y: 0, z: 0 }
    public flippedCam        = false
    public plateFade         = 0
    public plateOpacity      = 1.0
    public plateBorderRad    = 40.0
    public plateBorderCrop   = 0.0
    public plateChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public plateBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0, positionX:     0
    }
    public hologramFade         = 0
    public hologramOpacity      = 1.0
    public hologramBorderRad    = 40.0
    public hologramBorderCrop   = 0.0
    public hologramChromaKey    = { enable: false, threshold: 0.4, smoothing: 0.1 } as ChromaKey
    public hologramBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0,
        rotationZ:     0, positionZ:     0, positionX:     0
    }
    public maskBase = {
        scaleDisplayX: 0, scaleDisplayY: 0, scaleDisplayZ: 0
    }

    /*  frames per second (FPS) control  */
    public fps        = 30
    public fpsProgram = 30
    public fpsPreview = 30
    public fpsOther   = 30

    /*  current camera mixer state  */
    public mixerProgram = ""
    public mixerPreview = ""

    /*  latest sync time  */
    public syncTime = 0

    /*  effectively constant values of video stream  */
    public videoStreamDevice = ""
    public videoStreamWidth  = 0
    public videoStreamHeight = 0
    public videoStreamFPS    = 0

    /*  rendering object references  */
    public engine:          BABYLON.Nullable<BABYLON.Engine>         = null
    public scene:           BABYLON.Nullable<BABYLON.Scene>          = null
    public optimizer:       BABYLON.Nullable<BABYLON.SceneOptimizer> = null
    public cameraHull:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    public cameraCase:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    public cameraLens:      BABYLON.Nullable<BABYLON.FreeCamera>     = null
    public monitor:         BABYLON.Nullable<BABYLON.TransformNode>  = null
    public monitorCase:     BABYLON.Nullable<BABYLON.Mesh>           = null
    public monitorDisplay:  BABYLON.Nullable<BABYLON.Mesh>           = null
    public pane:            BABYLON.Nullable<BABYLON.TransformNode>  = null
    public paneCase:        BABYLON.Nullable<BABYLON.Mesh>           = null
    public paneDisplay:     BABYLON.Nullable<BABYLON.Mesh>           = null
    public pillar:          BABYLON.Nullable<BABYLON.TransformNode>  = null
    public pillarCase:      BABYLON.Nullable<BABYLON.Mesh>           = null
    public pillarDisplay:   BABYLON.Nullable<BABYLON.Mesh>           = null
    public avatar1:         BABYLON.Nullable<BABYLON.TransformNode>  = null
    public avatar1Model:    BABYLON.Nullable<BABYLON.Mesh>           = null
    public avatar2:         BABYLON.Nullable<BABYLON.TransformNode>  = null
    public avatar2Model:    BABYLON.Nullable<BABYLON.Mesh>           = null
    public references:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    public wall:            BABYLON.Nullable<BABYLON.Mesh>           = null
    public decal:           BABYLON.Nullable<BABYLON.Mesh>           = null
    public light1:          BABYLON.Nullable<BABYLON.PointLight>     = null
    public light2:          BABYLON.Nullable<BABYLON.PointLight>     = null
    public light3:          BABYLON.Nullable<BABYLON.PointLight>     = null
    public canvasMaterial:  BABYLON.Nullable<BABYLON.NodeMaterial>   = null
    public canvasTexture:   BABYLON.Nullable<BABYLON.Texture>        = null
    public canvasState = [
        { texture1: null, texture2: null },
        { texture1: null, texture2: null }
    ] as CanvasState[]
    public wallRotBase:     BABYLON.Nullable<BABYLON.Quaternion>     = null
    public plate:           BABYLON.Nullable<BABYLON.TransformNode>  = null
    public plateDisplay:    BABYLON.Nullable<BABYLON.Mesh>           = null
    public hologram:        BABYLON.Nullable<BABYLON.TransformNode>  = null
    public hologramDisplay: BABYLON.Nullable<BABYLON.Mesh>           = null
    public mask:            BABYLON.Nullable<BABYLON.TransformNode>  = null
    public maskDisplay:     BABYLON.Nullable<BABYLON.Mesh>           = null
    public maskBackground:  BABYLON.Nullable<BABYLON.Mesh>           = null
    public maskCamLens:     BABYLON.Nullable<BABYLON.FreeCamera>     = null

    /*  PTZ sub-module  */
    public ptz:     PTZ | null = null
    public ptzHull: PTZ | null = null
    public ptzCase: PTZ | null = null
    public ptzLens: PTZ | null = null

    /*  FreeD state  */
    public state: FreeDState | null = null

    /*  cross-fade timer  */
    public fadeTimer: ReturnType<typeof setTimeout> | null = null
    public modeTimer: ReturnType<typeof setTimeout> | null = null
    public fadeSwitch = 2.0

    public renderCount = 0

    public modifiedMedia = {} as { [ id: string ]: boolean }
}
