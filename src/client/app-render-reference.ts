/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON           from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }           from "./app-render-api"

/*  import internal dependencies (shared)  */
import { StateTypePartial }   from "../common/app-state"

export default class Reference {
    private references: BABYLON.Nullable<BABYLON.TransformNode>  = null

    constructor (
        private api:     API,
        private log:     (level: string, msg: string) => void
    ) {}

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
    async reflectSceneState (state: StateTypePartial) {
        if (state.references !== undefined
            && this.references !== null
            && this.api.scene.renderingLayer("back")) {
            if (state.references.enable !== undefined)
                this.references.setEnabled(state.references.enable)
        }
    }
}

