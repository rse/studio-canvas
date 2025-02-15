/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import State                  from "./app-render-state"
import Utils                  from "./app-render-utils"

/*  import internal dependencies (shared)  */
import { FreeDState }         from "../common/app-freed"
import { StateTypePartial }   from "../common/app-state"

/*  exported renderer feature  */
export default class Camera {
    /*  internal state  */
    private cameraHull:  BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraCase:  BABYLON.Nullable<BABYLON.TransformNode>  = null
    private cameraLens:  BABYLON.Nullable<BABYLON.FreeCamera>     = null
    private cameraState: FreeDState | null                        = null

    /*  object construction  */
    constructor (
        private state:   State,
        private log:     (level: string, msg: string) => void
    ) {}

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
        this.state.ptzHull!.posXOrigin   = this.cameraHull.position.x
        this.state.ptzHull!.posYOrigin   = this.cameraHull.position.y
        this.state.ptzHull!.posZOrigin   = this.cameraHull.position.z
        this.state.ptzCase!.tiltOrigin   = this.cameraCase.rotation.x
        this.state.ptzCase!.panOrigin    = this.cameraCase.rotation.y
        this.state.ptzCase!.rotateOrigin = this.cameraCase.rotation.z
        this.state.ptzLens!.tiltOrigin   = this.cameraLens.rotation.x

        /*  go to camera home position  */
        this.cameraHull!.position.x = this.state.ptzHull!.posXP2V(0)
        this.cameraHull!.position.y = this.state.ptzHull!.posYP2V(0)
        this.cameraHull!.position.z = this.state.ptzHull!.posZP2V(0)
        this.cameraCase!.rotation.x = this.state.ptzCase!.tiltP2V(0)
        this.cameraCase!.rotation.y = this.state.ptzCase!.panP2V(0)
        this.cameraCase!.rotation.z = this.state.ptzCase!.rotateP2V(0)
        this.cameraLens!.rotation.x = this.state.ptzLens!.tiltP2V(0)
        this.cameraLens!.fov        = this.state.ptzLens!.zoomP2V(0)

        /*  apply latest PTZ (if already available)  */
        if (this.cameraState !== null && this.state.ptzFreeD)
            this.reflectFreeDState(this.cameraState)

        /*  allow keyboard to manually adjust camera  */
        if (this.state.ptzKeys) {
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
                const x = this.state.ptzHull!.posXV2P(this.cameraHull.position.x)
                this.state.ptzHull!.posXDelta = -((state as any)[this.state.cameraName].hullPosition.x / 100)
                this.cameraHull.position.x = this.state.ptzHull!.posXP2V(x)
            }

            /*  adjust hull Y position  */
            if ((state as any)[this.state.cameraName].hullPosition?.y !== undefined) {
                const y = this.state.ptzHull!.posYV2P(this.cameraHull.position.y)
                this.state.ptzHull!.posYDelta = (state as any)[this.state.cameraName].hullPosition.y / 100
                this.cameraHull.position.y = this.state.ptzHull!.posYP2V(y)
            }

            /*  adjust hull Z position  */
            if ((state as any)[this.state.cameraName].hullPosition?.z !== undefined) {
                const z = this.state.ptzHull!.posZV2P(this.cameraHull.position.z)
                this.state.ptzHull!.posZDelta = (state as any)[this.state.cameraName].hullPosition.z / 100
                this.cameraHull.position.z = this.state.ptzHull!.posZP2V(z)
            }

            /*  adjust case tilt  */
            if ((state as any)[this.state.cameraName].caseRotation?.x !== undefined) {
                const tilt = this.state.ptzCase!.tiltV2P(this.cameraCase.rotation.x)
                this.state.ptzCase!.tiltDelta = Utils.deg2rad((state as any)[this.state.cameraName].caseRotation.x)
                this.cameraCase.rotation.x = this.state.ptzCase!.tiltP2V(tilt)
            }

            /*  adjust case pan  */
            if ((state as any)[this.state.cameraName].caseRotation?.y !== undefined) {
                const pan = this.state.ptzCase!.panV2P(this.cameraCase.rotation.y)
                this.state.ptzCase!.panDelta = -(Utils.deg2rad((state as any)[this.state.cameraName].caseRotation.y))
                this.cameraCase.rotation.y = this.state.ptzCase!.panP2V(pan)
            }
            if ((state as any)[this.state.cameraName].caseRotation?.ym !== undefined) {
                const pan = this.state.ptzCase!.panV2P(this.cameraCase.rotation.y)
                this.state.ptzCase!.panMult = (state as any)[this.state.cameraName].caseRotation.ym
                this.cameraCase.rotation.y = this.state.ptzCase!.panP2V(pan)
            }

            /*  adjust case rotation  */
            if ((state as any)[this.state.cameraName].caseRotation?.z !== undefined) {
                const rotate = this.state.ptzCase!.rotateV2P(this.cameraCase.rotation.z)
                this.state.ptzCase!.rotateDelta = -(Utils.deg2rad((state as any)[this.state.cameraName].caseRotation.z))
                this.cameraCase.rotation.z = this.state.ptzCase!.rotateP2V(rotate)
            }

            /*  adjust lens tilt  */
            if ((state as any)[this.state.cameraName].lensRotation?.x !== undefined) {
                const tilt = this.state.ptzLens!.tiltV2P(this.cameraLens.rotation.x)
                this.state.ptzLens!.tiltDelta = -(Utils.deg2rad((state as any)[this.state.cameraName].lensRotation.x))
                this.cameraLens.rotation.x = this.state.ptzLens!.tiltP2V(tilt)
            }
            if ((state as any)[this.state.cameraName].lensRotation?.xm !== undefined) {
                const tilt = this.state.ptzLens!.tiltV2P(this.cameraLens.rotation.x)
                this.state.ptzLens!.tiltMult = (state as any)[this.state.cameraName].lensRotation.xm
                this.cameraLens.rotation.x = this.state.ptzLens!.tiltP2V(tilt)
            }

            /*  adjust field-of-view  */
            if ((state as any)[this.state.cameraName].fov?.m !== undefined) {
                const zoom = this.state.ptzLens!.zoomV2P(this.cameraLens.fov)
                this.state.ptzLens!.fovMult = (state as any)[this.state.cameraName].fov.m
                this.cameraLens.fov = this.state.ptzLens!.zoomP2V(zoom)
            }
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
        this.cameraState = state

        /*  notice: FreeD can be faster than Babylon, so we have to be careful...  */
        if (this.state.ptzFreeD && this.cameraCase !== null && this.cameraLens !== null) {
            this.cameraCase.rotation.x = this.state.ptzCase!.tiltP2V(0)
            this.cameraCase.rotation.y = this.state.ptzCase!.panP2V((this.state.flippedCam ? -1 : 1) * state.pan)
            this.cameraCase.rotation.z = this.state.ptzCase!.rotateP2V(0)
            this.cameraLens.rotation.x = this.state.ptzLens!.tiltP2V((this.state.flippedCam ? -1 : 1) * state.tilt)
            this.cameraLens.fov        = this.state.ptzLens!.zoomP2V(state.zoom)
        }
    }

    /*  react on a key (down) event by manipulating the camera PTZ state  */
    async reactOnKeyEvent (key: string) {
        if (!this.state.ptzKeys)
            return

        /*  pan  */
        if (key === "ArrowLeft")
            this.cameraCase!.rotation.y =
                Math.min(this.cameraCase!.rotation.y + this.state.ptzCase!.panStep,
                    this.state.ptzCase!.panP2V(this.state.ptzCase!.panMinDeg))
        else if (key === "ArrowRight")
            this.cameraCase!.rotation.y =
                Math.max(this.cameraCase!.rotation.y - this.state.ptzCase!.panStep,
                    this.state.ptzCase!.panP2V(this.state.ptzCase!.panMaxDeg))

        /*  tilt  */
        else if (key === "ArrowDown")
            this.cameraLens!.rotation.x =
                Math.min(this.cameraLens!.rotation.x + this.state.ptzLens!.tiltStep,
                    this.state.ptzLens!.tiltP2V(this.state.ptzLens!.tiltMinDeg))
        else if (key === "ArrowUp")
            this.cameraLens!.rotation.x =
                Math.max(this.cameraLens!.rotation.x - this.state.ptzLens!.tiltStep,
                    this.state.ptzLens!.tiltP2V(this.state.ptzLens!.tiltMaxDeg))

        /*  rotate  */
        else if (key === "+")
            this.cameraCase!.rotation.z =
                Math.min(this.cameraCase!.rotation.z + this.state.ptzCase!.rotateStep,
                    this.state.ptzCase!.rotateP2V(this.state.ptzCase!.rotateMinDeg))
        else if (key === "-")
            this.cameraCase!.rotation.z =
                Math.max(this.cameraCase!.rotation.z - this.state.ptzCase!.rotateStep,
                    this.state.ptzCase!.rotateP2V(this.state.ptzCase!.rotateMaxDeg))

        /*  zoom  */
        else if (key === "PageUp")
            this.cameraLens!.fov =
                Math.max(this.cameraLens!.fov - this.state.ptzLens!.zoomStep,
                    this.state.ptzLens!.zoomP2V(this.state.ptzLens!.zoomMax))
        else if (key === "PageDown")
            this.cameraLens!.fov =
                Math.min(this.cameraLens!.fov + this.state.ptzLens!.zoomStep,
                    this.state.ptzLens!.zoomP2V(this.state.ptzLens!.zoomMin))

        /*  reset  */
        else if (key === "Home") {
            this.cameraHull!.position.x = this.state.ptzHull!.posXP2V(0)
            this.cameraHull!.position.y = this.state.ptzHull!.posYP2V(0)
            this.cameraHull!.position.z = this.state.ptzHull!.posZP2V(0)
            this.cameraCase!.rotation.x = this.state.ptzCase!.tiltP2V(0)
            this.cameraCase!.rotation.y = this.state.ptzCase!.panP2V(0)
            this.cameraCase!.rotation.z = this.state.ptzCase!.rotateP2V(0)
            this.cameraLens!.rotation.x = this.state.ptzLens!.tiltP2V(0)
            this.cameraLens!.fov        = this.state.ptzLens!.zoomP2V(0)
        }
    }
}

