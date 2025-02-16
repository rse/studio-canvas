/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import State                  from "./app-render-state"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class AppRenderLights {
    constructor (
        private state:   State,
        private log:     (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        this.state.light1 = this.state.scene!.getLightByName("Light-1") as
            BABYLON.Nullable<BABYLON.PointLight>
        this.state.light2 = this.state.scene!.getLightByName("Light-2") as
            BABYLON.Nullable<BABYLON.PointLight>
        this.state.light3 = this.state.scene!.getLightByName("Light-3") as
            BABYLON.Nullable<BABYLON.PointLight>
        if (this.state.light1 === null || this.state.light2 === null || this.state.light3 === null)
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
        this.state.wall!.receiveShadows = true
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        if (state.lights !== undefined
            && this.state.light1 !== null
            && this.state.light2 !== null
            && this.state.light3 !== null) {
            if (state.lights.intensity1 !== undefined)
                this.state.light1.intensity = state.lights.intensity1
            if (state.lights.intensity2 !== undefined)
                this.state.light2.intensity = state.lights.intensity2
            if (state.lights.intensity3 !== undefined)
                this.state.light3.intensity = state.lights.intensity3
        }
    }
}

