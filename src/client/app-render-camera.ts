/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON                from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import Config, { type CameraName } from "./app-render-config"
import State                       from "./app-render-state"
import Utils                       from "./app-render-utils"
import PTZ                         from "./app-render-ptz"

/*  import internal dependencies (shared)  */
import { FreeDState }              from "../common/app-freed"
import { StateTypePartial }        from "../common/app-state"

/*  exported renderer feature  */
export default class Camera {
    /*  internal state  */
    private cameraHull:  BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraCase:  BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraLens:  BABYLON.Nullable<BABYLON.FreeCamera>     = null
    private cameraState: FreeDState | null                        = null
    private ptzFreeD                                              = false
    private ptzKeys                                               = false
    private flippedCam                                            = false
    private ptzHull:     PTZ | null                               = null
    private ptzCase:     PTZ | null                               = null
    private ptzLens:     PTZ | null                               = null

    /*  object construction  */
    constructor (
        private state:   State,
        private log:     (level: string, msg: string) => void
    ) {}

    /*  object configuration  */
    configure (cameraName: string, ptzFreeD: boolean, ptzKeys: boolean) {
        this.ptzFreeD    = ptzFreeD
        this.ptzKeys     = ptzKeys
        this.flippedCam  = Config.flippedCams.includes(cameraName)

        /*  mapping of camera to type  */
        const cameraType = Config.camNameToTypeMap.get(cameraName as CameraName)
        if (!cameraType)
            throw new Error("invalid camera")

        /*  instantiate PTZ  */
        this.ptzHull = new PTZ(cameraType)
        this.ptzCase = new PTZ(cameraType)
        this.ptzLens = new PTZ(cameraType)
    }

    /*  establish feature  */
    async establish () {
        /*  use particular camera of scene  */
        this.cameraHull = this.state.scene!.getNodeByName(
            this.state.cameraName + "-Hull") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.cameraHull === null)
            throw new Error("cannot find camera hull")
        this.cameraCase = this.state.scene!.getNodeByName(
            this.state.cameraName + "-Case") as BABYLON.Nullable<BABYLON.TransformNode>
        if (this.cameraCase === null)
            throw new Error("cannot find camera case")
        this.cameraLens = this.state.scene!.getCameraByName(
            this.state.cameraName + "-Lens") as BABYLON.FreeCamera
        if (this.cameraLens === null)
            throw new Error("cannot find camera device")

        /*  initialize camera  */
        this.state.scene!.activeCamera = this.cameraLens
        this.cameraLens.fovMode = BABYLON.FreeCamera.FOVMODE_HORIZONTAL_FIXED
        this.cameraCase.rotationQuaternion = null

        /*  initialize camera pan/tilt center position  */
        this.ptzHull!.posXOrigin   = this.cameraHull.position.x
        this.ptzHull!.posYOrigin   = this.cameraHull.position.y
        this.ptzHull!.posZOrigin   = this.cameraHull.position.z
        this.ptzCase!.tiltOrigin   = this.cameraCase.rotation.x
        this.ptzCase!.panOrigin    = this.cameraCase.rotation.y
        this.ptzCase!.rotateOrigin = this.cameraCase.rotation.z
        this.ptzLens!.tiltOrigin   = this.cameraLens.rotation.x

        /*  go to camera home position  */
        this.cameraHull!.position.x = this.ptzHull!.posXP2V(0)
        this.cameraHull!.position.y = this.ptzHull!.posYP2V(0)
        this.cameraHull!.position.z = this.ptzHull!.posZP2V(0)
        this.cameraCase!.rotation.x = this.ptzCase!.tiltP2V(0)
        this.cameraCase!.rotation.y = this.ptzCase!.panP2V(0)
        this.cameraCase!.rotation.z = this.ptzCase!.rotateP2V(0)
        this.cameraLens!.rotation.x = this.ptzLens!.tiltP2V(0)
        this.cameraLens!.fov        = this.ptzLens!.zoomP2V(0)

        /*  apply latest PTZ (if already available)  */
        if (this.cameraState !== null && this.ptzFreeD)
            this.reflectFreeDState(this.cameraState)

        /*  allow keyboard to manually adjust camera  */
        if (this.ptzKeys) {
            this.state.scene!.onKeyboardObservable.add((kbInfo) => {
                if (kbInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN)
                    return
                this.reactOnKeyEvent(kbInfo.event.key)
            })
        }
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  adjust camera calibration  */
        if ((state as any)[this.state.cameraName] !== undefined
            && this.cameraHull !== null
            && this.cameraCase !== null
            && this.cameraLens !== null) {
            /*  adjust hull X position  */
            if ((state as any)[this.state.cameraName].hullPosition?.x !== undefined) {
                const x = this.ptzHull!.posXV2P(this.cameraHull.position.x)
                this.ptzHull!.posXDelta = -((state as any)[this.state.cameraName].hullPosition.x / 100)
                this.cameraHull.position.x = this.ptzHull!.posXP2V(x)
            }

            /*  adjust hull Y position  */
            if ((state as any)[this.state.cameraName].hullPosition?.y !== undefined) {
                const y = this.ptzHull!.posYV2P(this.cameraHull.position.y)
                this.ptzHull!.posYDelta = (state as any)[this.state.cameraName].hullPosition.y / 100
                this.cameraHull.position.y = this.ptzHull!.posYP2V(y)
            }

            /*  adjust hull Z position  */
            if ((state as any)[this.state.cameraName].hullPosition?.z !== undefined) {
                const z = this.ptzHull!.posZV2P(this.cameraHull.position.z)
                this.ptzHull!.posZDelta = (state as any)[this.state.cameraName].hullPosition.z / 100
                this.cameraHull.position.z = this.ptzHull!.posZP2V(z)
            }

            /*  adjust case tilt  */
            if ((state as any)[this.state.cameraName].caseRotation?.x !== undefined) {
                const tilt = this.ptzCase!.tiltV2P(this.cameraCase.rotation.x)
                this.ptzCase!.tiltDelta = Utils.deg2rad((state as any)[this.state.cameraName].caseRotation.x)
                this.cameraCase.rotation.x = this.ptzCase!.tiltP2V(tilt)
            }

            /*  adjust case pan  */
            if ((state as any)[this.state.cameraName].caseRotation?.y !== undefined) {
                const pan = this.ptzCase!.panV2P(this.cameraCase.rotation.y)
                this.ptzCase!.panDelta = -(Utils.deg2rad((state as any)[this.state.cameraName].caseRotation.y))
                this.cameraCase.rotation.y = this.ptzCase!.panP2V(pan)
            }
            if ((state as any)[this.state.cameraName].caseRotation?.ym !== undefined) {
                const pan = this.ptzCase!.panV2P(this.cameraCase.rotation.y)
                this.ptzCase!.panMult = (state as any)[this.state.cameraName].caseRotation.ym
                this.cameraCase.rotation.y = this.ptzCase!.panP2V(pan)
            }

            /*  adjust case rotation  */
            if ((state as any)[this.state.cameraName].caseRotation?.z !== undefined) {
                const rotate = this.ptzCase!.rotateV2P(this.cameraCase.rotation.z)
                this.ptzCase!.rotateDelta = -(Utils.deg2rad((state as any)[this.state.cameraName].caseRotation.z))
                this.cameraCase.rotation.z = this.ptzCase!.rotateP2V(rotate)
            }

            /*  adjust lens tilt  */
            if ((state as any)[this.state.cameraName].lensRotation?.x !== undefined) {
                const tilt = this.ptzLens!.tiltV2P(this.cameraLens.rotation.x)
                this.ptzLens!.tiltDelta = -(Utils.deg2rad((state as any)[this.state.cameraName].lensRotation.x))
                this.cameraLens.rotation.x = this.ptzLens!.tiltP2V(tilt)
            }
            if ((state as any)[this.state.cameraName].lensRotation?.xm !== undefined) {
                const tilt = this.ptzLens!.tiltV2P(this.cameraLens.rotation.x)
                this.ptzLens!.tiltMult = (state as any)[this.state.cameraName].lensRotation.xm
                this.cameraLens.rotation.x = this.ptzLens!.tiltP2V(tilt)
            }

            /*  adjust field-of-view  */
            if ((state as any)[this.state.cameraName].fov?.m !== undefined) {
                const zoom = this.ptzLens!.zoomV2P(this.cameraLens.fov)
                this.ptzLens!.fovMult = (state as any)[this.state.cameraName].fov.m
                this.cameraLens.fov = this.ptzLens!.zoomP2V(zoom)
            }
        }
    }

    /*  react on a received FreeD state record by reflecting its camera PTZ state  */
    reflectFreeDState (state: FreeDState) {
        /*  remember state  */
        if (state === null)
            return
        this.cameraState = state

        /*  notice: FreeD can be faster than Babylon, so we have to be careful...  */
        if (this.ptzFreeD && this.cameraCase !== null && this.cameraLens !== null) {
            this.cameraCase.rotation.x = this.ptzCase!.tiltP2V(0)
            this.cameraCase.rotation.y = this.ptzCase!.panP2V((this.flippedCam ? -1 : 1) * state.pan)
            this.cameraCase.rotation.z = this.ptzCase!.rotateP2V(0)
            this.cameraLens.rotation.x = this.ptzLens!.tiltP2V((this.flippedCam ? -1 : 1) * state.tilt)
            this.cameraLens.fov        = this.ptzLens!.zoomP2V(state.zoom)
        }
    }

    /*  react on a key (down) event by manipulating the camera PTZ state  */
    async reactOnKeyEvent (key: string) {
        if (!this.ptzKeys)
            return

        /*  pan  */
        if (key === "ArrowLeft")
            this.cameraCase!.rotation.y =
                Math.min(this.cameraCase!.rotation.y + this.ptzCase!.panStep,
                    this.ptzCase!.panP2V(this.ptzCase!.panMinDeg))
        else if (key === "ArrowRight")
            this.cameraCase!.rotation.y =
                Math.max(this.cameraCase!.rotation.y - this.ptzCase!.panStep,
                    this.ptzCase!.panP2V(this.ptzCase!.panMaxDeg))

        /*  tilt  */
        else if (key === "ArrowDown")
            this.cameraLens!.rotation.x =
                Math.min(this.cameraLens!.rotation.x + this.ptzLens!.tiltStep,
                    this.ptzLens!.tiltP2V(this.ptzLens!.tiltMinDeg))
        else if (key === "ArrowUp")
            this.cameraLens!.rotation.x =
                Math.max(this.cameraLens!.rotation.x - this.ptzLens!.tiltStep,
                    this.ptzLens!.tiltP2V(this.ptzLens!.tiltMaxDeg))

        /*  rotate  */
        else if (key === "+")
            this.cameraCase!.rotation.z =
                Math.min(this.cameraCase!.rotation.z + this.ptzCase!.rotateStep,
                    this.ptzCase!.rotateP2V(this.ptzCase!.rotateMinDeg))
        else if (key === "-")
            this.cameraCase!.rotation.z =
                Math.max(this.cameraCase!.rotation.z - this.ptzCase!.rotateStep,
                    this.ptzCase!.rotateP2V(this.ptzCase!.rotateMaxDeg))

        /*  zoom  */
        else if (key === "PageUp")
            this.cameraLens!.fov =
                Math.max(this.cameraLens!.fov - this.ptzLens!.zoomStep,
                    this.ptzLens!.zoomP2V(this.ptzLens!.zoomMax))
        else if (key === "PageDown")
            this.cameraLens!.fov =
                Math.min(this.cameraLens!.fov + this.ptzLens!.zoomStep,
                    this.ptzLens!.zoomP2V(this.ptzLens!.zoomMin))

        /*  reset  */
        else if (key === "Home") {
            this.cameraHull!.position.x = this.ptzHull!.posXP2V(0)
            this.cameraHull!.position.y = this.ptzHull!.posYP2V(0)
            this.cameraHull!.position.z = this.ptzHull!.posZP2V(0)
            this.cameraCase!.rotation.x = this.ptzCase!.tiltP2V(0)
            this.cameraCase!.rotation.y = this.ptzCase!.panP2V(0)
            this.cameraCase!.rotation.z = this.ptzCase!.rotateP2V(0)
            this.cameraLens!.rotation.x = this.ptzLens!.tiltP2V(0)
            this.cameraLens!.fov        = this.ptzLens!.zoomP2V(0)
        }
    }
}

