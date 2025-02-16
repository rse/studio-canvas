/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON         from "@babylonjs/core"

/*  utility types  */
export type ChromaKey = { enable: boolean, threshold: number, smoothing: number }

/*  the canvas rendering state class  */
export default class State {
    public established       = false
    public layer             = ""
    public cameraName        = ""
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
    public pillarBase        = {
        scaleX:        0, scaleY:        0, scaleZ:        0,
        rotationZ:     0, positionZ:     0,
        positionCaseX: 0, positionDisplayX: 0
    }
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
    public fps = 30

    /*  rendering object references  */
    public scene:           BABYLON.Nullable<BABYLON.Scene>          = null
    public pillar:          BABYLON.Nullable<BABYLON.TransformNode>  = null
    public pillarCase:      BABYLON.Nullable<BABYLON.Mesh>           = null
    public pillarDisplay:   BABYLON.Nullable<BABYLON.Mesh>           = null
    public references:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    public wall:            BABYLON.Nullable<BABYLON.Mesh>           = null
    public light1:          BABYLON.Nullable<BABYLON.PointLight>     = null
    public light2:          BABYLON.Nullable<BABYLON.PointLight>     = null
    public light3:          BABYLON.Nullable<BABYLON.PointLight>     = null
    public wallRotBase:     BABYLON.Nullable<BABYLON.Quaternion>     = null
    public plate:           BABYLON.Nullable<BABYLON.TransformNode>  = null
    public plateDisplay:    BABYLON.Nullable<BABYLON.Mesh>           = null
    public hologram:        BABYLON.Nullable<BABYLON.TransformNode>  = null
    public hologramDisplay: BABYLON.Nullable<BABYLON.Mesh>           = null
    public mask:            BABYLON.Nullable<BABYLON.TransformNode>  = null
    public maskDisplay:     BABYLON.Nullable<BABYLON.Mesh>           = null
    public maskBackground:  BABYLON.Nullable<BABYLON.Mesh>           = null
    public maskCamLens:     BABYLON.Nullable<BABYLON.FreeCamera>     = null

    public modifiedMedia = {} as { [ id: string ]: boolean }
    public shadowCastingMeshes = [] as BABYLON.Mesh[]
}
