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

export default class AppRenderAvatars {
    constructor (
        private state:   State,
        private log:     (level: string, msg: string) => void
    ) {}

    /*  establish feature  */
    async establish () {
        /*  gather reference to avatar 1  */
        this.state.avatar1 = this.state.scene!.getNodeByName("Avatar1") as
            BABYLON.Nullable<BABYLON.TransformNode>
        this.state.avatar1Model = this.state.scene!.getNodeByName("Avatar1-Model") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.avatar1 === null)
            throw new Error("cannot find node 'Avatar1'")
        if (this.state.avatar1Model === null)
            throw new Error("cannot find node 'Avatar1-Model'")
        this.state.avatar1.setEnabled(false)
        this.state.avatar1Scale.x = this.state.avatar1Model.scaling.x
        this.state.avatar1Scale.y = this.state.avatar1Model.scaling.y
        this.state.avatar1Scale.z = this.state.avatar1Model.scaling.z

        /*  gather reference to avatar 2  */
        this.state.avatar2 = this.state.scene!.getNodeByName("Avatar2") as
            BABYLON.Nullable<BABYLON.TransformNode>
        this.state.avatar2Model = this.state.scene!.getNodeByName("Avatar2-Model") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (this.state.avatar2 === null)
            throw new Error("cannot find node 'Avatar2'")
        if (this.state.avatar2Model === null)
            throw new Error("cannot find node 'Avatar2-Model'")
        this.state.avatar2.setEnabled(false)
        this.state.avatar2Scale.x = this.state.avatar2Model.scaling.x
        this.state.avatar2Scale.y = this.state.avatar2Model.scaling.y
        this.state.avatar2Scale.z = this.state.avatar2Model.scaling.z
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial) {
        /*  adjust avatars  */
        if (state.avatars !== undefined
            && this.state.avatar1 !== null
            && this.state.avatar2 !== null
            && this.state.layer === "back") {
            /*  adjust avatar 1  */
            if (state.avatars.enable1 !== undefined && this.state.avatar1.isEnabled() !== state.avatars.enable1)
                this.state.avatar1.setEnabled(state.avatars.enable1)
            if (state.avatars.size1 !== undefined) {
                const scale = state.avatars.size1 / 185
                this.state.avatar1Model!.scaling.x = this.state.avatar1Scale.x * scale
                this.state.avatar1Model!.scaling.y = this.state.avatar1Scale.y * scale
                this.state.avatar1Model!.scaling.z = this.state.avatar1Scale.z * scale
            }
            if (state.avatars.rotate1 !== undefined) {
                this.state.avatar1.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.avatar1.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(-state.avatars.rotate1), BABYLON.Space.WORLD)
            }

            /*  adjust avatar 2  */
            if (state.avatars.enable2 !== undefined && this.state.avatar2.isEnabled() !== state.avatars.enable2)
                this.state.avatar2.setEnabled(state.avatars.enable2)
            if (state.avatars.size2 !== undefined) {
                const scale = state.avatars.size2 / 185
                this.state.avatar2Model!.scaling.x = this.state.avatar2Scale.x * scale
                this.state.avatar2Model!.scaling.y = this.state.avatar2Scale.y * scale
                this.state.avatar2Model!.scaling.z = this.state.avatar2Scale.z * scale
            }
            if (state.avatars.rotate2 !== undefined) {
                this.state.avatar2.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.state.avatar2.rotate(new BABYLON.Vector3(0, 0, 1),
                    this.state.ptz!.deg2rad(-state.avatars.rotate2), BABYLON.Space.WORLD)
            }
        }
    }
}

