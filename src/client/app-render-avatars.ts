/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON              from "@babylonjs/core"

/*  import internal dependencies (client-side)  */
import { type API }              from "./app-render-api"
import Utils                     from "./app-render-utils"

/*  import internal dependencies (shared)  */
import { type StateTypePartial } from "../common/app-state"

/*  exported rendering feature  */
export default class Avatars {
    /*  internal state  */
    private avatar1:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private avatar1Model: BABYLON.Nullable<BABYLON.Mesh>           = null
    private avatar1Scale                                           = { x: 0, y: 0, z: 0 }
    private avatar2:      BABYLON.Nullable<BABYLON.TransformNode>  = null
    private avatar2Model: BABYLON.Nullable<BABYLON.Mesh>           = null
    private avatar2Scale                                           = { x: 0, y: 0, z: 0 }

    /*  create feature  */
    constructor (private api: API) {}

    /*  establish feature  */
    async establish () {
        /*  sanity check situation  */
        if (!this.api.scene.renderingLayer("back"))
            return

        /*  gather references to avatar #1  */
        this.avatar1 = this.api.scene.getScene().getNodeByName("Avatar1") as
            BABYLON.Nullable<BABYLON.TransformNode>
        if (this.avatar1 === null)
            throw new Error("cannot find node 'Avatar1'")
        this.avatar1Model = this.api.scene.getScene().getNodeByName("Avatar1-Model") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (this.avatar1Model === null)
            throw new Error("cannot find node 'Avatar1-Model'")

        /*  disable avatar #1 by default  */
        this.avatar1.setEnabled(false)

        /*  remember base scaling of avatar #1  */
        this.avatar1Scale.x = this.avatar1Model.scaling.x
        this.avatar1Scale.y = this.avatar1Model.scaling.y
        this.avatar1Scale.z = this.avatar1Model.scaling.z

        /*  gather references to avatar #2  */
        this.avatar2 = this.api.scene.getScene().getNodeByName("Avatar2") as
            BABYLON.Nullable<BABYLON.TransformNode>
        if (this.avatar2 === null)
            throw new Error("cannot find node 'Avatar2'")
        this.avatar2Model = this.api.scene.getScene().getNodeByName("Avatar2-Model") as
            BABYLON.Nullable<BABYLON.Mesh>
        if (this.avatar2Model === null)
            throw new Error("cannot find node 'Avatar2-Model'")

        /*  disable avatar #2 by default  */
        this.avatar2.setEnabled(false)

        /*  remember base scaling of avatar #2  */
        this.avatar2Scale.x = this.avatar2Model.scaling.x
        this.avatar2Scale.y = this.avatar2Model.scaling.y
        this.avatar2Scale.z = this.avatar2Model.scaling.z
    }

    /*  reflect the current scene state  */
    async reflectSceneState (state: StateTypePartial["avatars"]) {
        /*  sanity check situation  */
        if (!(this.avatar1 !== null && this.avatar1Model !== null
            && this.avatar2 !== null && this.avatar2Model !== null
            && this.api.scene.renderingLayer("back")))
            return

        /*  reflect scene changes  */
        if (state !== undefined) {
            /*  adjust avatar #1  */
            if (state.enable1 !== undefined
                && this.avatar1.isEnabled() !== state.enable1)
                this.avatar1.setEnabled(state.enable1)
            if (state.size1 !== undefined) {
                const scale = state.size1 / 185 /* cm */
                this.avatar1Model.scaling.x = this.avatar1Scale.x * scale
                this.avatar1Model.scaling.y = this.avatar1Scale.y * scale
                this.avatar1Model.scaling.z = this.avatar1Scale.z * scale
            }
            if (state.rotate1 !== undefined) {
                this.avatar1.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.avatar1.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(-state.rotate1), BABYLON.Space.WORLD)
            }

            /*  adjust avatar #2  */
            if (state.enable2 !== undefined
                && this.avatar2.isEnabled() !== state.enable2)
                this.avatar2.setEnabled(state.enable2)
            if (state.size2 !== undefined) {
                const scale = state.size2 / 185 /* cm */
                this.avatar2Model.scaling.x = this.avatar2Scale.x * scale
                this.avatar2Model.scaling.y = this.avatar2Scale.y * scale
                this.avatar2Model.scaling.z = this.avatar2Scale.z * scale
            }
            if (state.rotate2 !== undefined) {
                this.avatar2.rotationQuaternion = BABYLON.Quaternion.Identity()
                this.avatar2.rotate(new BABYLON.Vector3(0, 0, 1),
                    Utils.deg2rad(-state.rotate2), BABYLON.Space.WORLD)
            }
        }
    }
}

