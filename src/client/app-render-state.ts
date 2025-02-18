/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON from "@babylonjs/core"

/*  utility types  */
export type ChromaKey = { enable: boolean, threshold: number, smoothing: number }

/*  the canvas rendering state class  */
export default class State {
    public cameraName                             = ""
    public scene: BABYLON.Nullable<BABYLON.Scene> = null
    public wall:  BABYLON.Nullable<BABYLON.Mesh>  = null
}
