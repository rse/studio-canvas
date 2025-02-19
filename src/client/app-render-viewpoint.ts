/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON                from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import Config, { type CameraName } from "./app-render-config"
import { type API }                from "./app-render-api"
import Camera                      from "./app-render-camera"

/*  import internal dependencies (shared)  */
import { FreeDState }              from "../common/app-freed"
import { ViewpointState }          from "../common/app-viewpoint"
import { StateTypePartial }        from "../common/app-state"

/*  exported rendering feature  */
export default class Viewpoint {
    /*  internal state  */
    private cameras = new Map<CameraName, Camera>()
    private camera: CameraName
    private viewpoint: CameraName

    /*  create feature  */
    constructor (
        private api:        API,
        private cameraName: string,
        private ptzFreeD:   boolean,
        private ptzKeys:    boolean
    ) {
        /*  instantiate individual cameras  */
        this.cameras.set("CAM1", new Camera(api, "CAM1"))
        this.cameras.set("CAM2", new Camera(api, "CAM2"))
        this.cameras.set("CAM3", new Camera(api, "CAM3"))
        this.cameras.set("CAM4", new Camera(api, "CAM4"))

        /*  mapping of camera to type  */
        const camera = cameraName as CameraName
        const cameraType = Config.camNameToTypeMap.get(camera)
        if (!cameraType)
            throw new Error("invalid camera")
        this.camera    = camera
        this.viewpoint = camera
    }

    /*  establish feature  */
    async establish () {
        for (const cam of this.cameras.values())
            await cam.establish()

        /*  activate requested (default) camera  */
        this.activateCamera(this.camera)

        /*  allow keyboard to manually adjust camera  */
        if (this.ptzKeys) {
            this.api.scene.getScene().onKeyboardObservable.add((kbInfo) => {
                if (kbInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN)
                    return
                this.reactOnKeyEvent(kbInfo.event.key)
            })
        }
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        for (const cam of this.cameras.values())
            await cam.reflectSceneState(state)
    }

    /*  react on a received FreeD state record by reflecting its camera PTZ state  */
    reflectFreeDState (state: FreeDState) {
        if (!this.ptzFreeD)
            return
        this.cameras.get(this.camera)?.reflectFreeDState(state)
    }

    /*  react on a received Viewpoint state record  */
    reflectViewpointState (viewpoint: ViewpointState) {
        const changeCamera = (viewpoint: CameraName, cameraName: string) => {
            const camera = cameraName as CameraName
            const cameraType = Config.camNameToTypeMap.get(camera)
            if (!cameraType)
                throw new Error("invalid camera")
            if (this.viewpoint === viewpoint && this.camera !== camera)
                this.activateCamera(camera)
        }
        if (viewpoint.CAM1) changeCamera("CAM1", viewpoint.CAM1)
        if (viewpoint.CAM2) changeCamera("CAM2", viewpoint.CAM2)
        if (viewpoint.CAM3) changeCamera("CAM3", viewpoint.CAM3)
        if (viewpoint.CAM4) changeCamera("CAM4", viewpoint.CAM4)
    }

    /*  react on a key (down) event by manipulating the camera PTZ state  */
    async reactOnKeyEvent (key: string) {
        if (!this.ptzKeys)
            return
        if      (key === "1") this.activateCamera("CAM1")
        else if (key === "2") this.activateCamera("CAM2")
        else if (key === "3") this.activateCamera("CAM3")
        else if (key === "4") this.activateCamera("CAM4")
        return this.cameras.get(this.camera)?.reactOnKeyEvent(key)
    }

    /*  activate a camera  */
    activateCamera (cameraName: CameraName) {
        const scene  = this.api.scene.getScene()
        const camera = this.cameras.get(cameraName)?.getCamera() ?? null
        if (camera === null)
            throw new Error("no such camera device")
        const oldCamera = this.camera
        this.camera = cameraName
        scene.activeCamera = camera
        return oldCamera
    }

    /*  provide current camera  */
    currentCamera () {
        return this.camera
    }
}

