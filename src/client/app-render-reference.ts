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

export default class AppRenderReference {
    constructor (
        private state:   State,
        private log:     (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather reference to reference points  */
        this.state.references = this.state.scene!.getNodeByName("Reference") as
            BABYLON.Nullable<BABYLON.TransformNode>
        if (this.state.references === null)
            throw new Error("cannot find node 'References'")
        this.state.references.setEnabled(true)
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        if (state.references !== undefined
            && this.state.references !== null
            && this.state.layer === "back") {
            if (state.references.enable !== undefined)
                this.state.references.setEnabled(state.references.enable)
        }
    }
}

