/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import type * as BABYLON         from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }              from "./app-render-api"

/*  import internal dependencies (shared)  */
import { type StateTypePartial } from "../common/app-state"

/*  exported rendering feature  */
export default class Reference {
    /*  internal state  */
    private references: BABYLON.Nullable<BABYLON.TransformNode>  = null

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  gather reference to reference points  */
        this.references = this.api.scene.getScene().getNodeByName("Reference") as
            BABYLON.Nullable<BABYLON.TransformNode>
        if (this.references === null)
            throw new Error("cannot find node 'References'")
        this.references.setEnabled(true)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial["references"]) {
        if (state !== undefined
            && this.references !== null
            && this.api.scene.renderingLayer("back")) {
            if (state.enable !== undefined)
                this.references.setEnabled(state.enable)
        }
    }
}

