/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }              from "./app-render-api"

/*  import internal dependencies (shared)  */
import { type StateTypePartial } from "../common/app-state"

/*  exported rendering feature  */
export default class Lights {
    /*  internal state  */
    private light1: BABYLON.Nullable<BABYLON.PointLight> = null
    private light2: BABYLON.Nullable<BABYLON.PointLight> = null
    private light3: BABYLON.Nullable<BABYLON.PointLight> = null
    private meshes = [] as BABYLON.Mesh[]

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        const scene = this.api.scene.getScene()
        this.light1 = scene.getLightByName("Light-1") as BABYLON.Nullable<BABYLON.PointLight>
        this.light2 = scene.getLightByName("Light-2") as BABYLON.Nullable<BABYLON.PointLight>
        this.light3 = scene.getLightByName("Light-3") as BABYLON.Nullable<BABYLON.PointLight>
        if (this.light1 === null || this.light2 === null || this.light3 === null)
            throw new Error("cannot find lights nodes")

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
            for (const mesh of this.meshes)
                sg.addShadowCaster(mesh)
        }
        setupLight(this.light1)
        setupLight(this.light2)
        setupLight(this.light3)
    }

    /*  configure shadow-casting mesh  */
    addShadowCastingMesh (mesh: BABYLON.Mesh) {
        this.meshes.push(mesh)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial["lights"]) {
        if (state !== undefined
            && this.light1 !== null
            && this.light2 !== null
            && this.light3 !== null) {
            if (state.intensity1 !== undefined)
                this.light1.intensity = state.intensity1
            if (state.intensity2 !== undefined)
                this.light2.intensity = state.intensity2
            if (state.intensity3 !== undefined)
                this.light3.intensity = state.intensity3
        }
    }
}

