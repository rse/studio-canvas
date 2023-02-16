/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import objectPath from "object-path"
import minimatch  from "minimatch"

/*  complete state type (all fields required)  */
export type StateType = {
    canvas: {
        id:         string
        texture1:   string,
        texture2?:  string,
        fadeTrans?: number,
        fadeWait?:  number
    },
    monitor: {
        enable:     boolean,
        device:     string,
        scale:      number,
        rotate:     number,
        lift:       number
    },
    decal: {
        enable:     boolean,
        device:     string,
        scale:      number,
        rotate:     number,
        lift:       number,
        opacity:    number
    },
    lights: {
        intensity1: number,
        intensity2: number,
        intensity3: number
    },
    references: {
        enable:     boolean
    },
    CAM1: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    },
    CAM2: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    },
    CAM3: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    },
    CAM4: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    }
}

/*  partial state type (all fields optional)  */
export type StateTypePartial = Partial<StateType>

/*  complete state schema (all fields required)  */
export const StateSchema = `{
    canvas: {
        id:         string,
        texture1:   string,
        texture2:   string,
        fadeTrans:  number,
        fadeWait:   number
    },
    monitor: {
        enable:     boolean,
        device:     string,
        scale:      number,
        rotate:     number,
        lift:       number
    },
    decal: {
        enable:     boolean,
        device:     string,
        scale:      number,
        rotate:     number,
        lift:       number,
        opacity:    number
    },
    lights: {
        intensity1: number,
        intensity2: number,
        intensity3: number
    },
    references: {
        enable:     boolean
    },
    CAM1: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    },
    CAM2: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    },
    CAM3: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    },
    CAM4: {
        position: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        fov:      { m: number }
    }
}`

/*  partial state schema (all fields optional)  */
export const StateSchemaPartial = StateSchema.replace(/:/g, "?:")

/*  complete state default (all fields with default values)  */
export const StateDefault: StateType = {
    canvas: {
        id:         "",
        texture1:   "",
        texture2:   "",
        fadeTrans:  0,
        fadeWait:   0
    },
    monitor: {
        enable:    false,
        device:    "",
        scale:     1.0,
        rotate:    0,
        lift:      0
    },
    decal: {
        enable:    false,
        device:    "",
        scale:     1.0,
        rotate:    0,
        lift:      0,
        opacity:   1.0
    },
    lights: {
        intensity1: 0,
        intensity2: 0,
        intensity3: 0
    },
    references: {
        enable:   false
    },
    CAM1: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        fov:      { m: 1 }
    },
    CAM2: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        fov:      { m: 1 }
    },
    CAM3: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        fov:      { m: 1 }
    },
    CAM4: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        fov:      { m: 1 }
    }
} satisfies StateType

/*  complete paths of all state fields  */
export const StatePaths = [] as string[]
const _walk = (name: string, obj: any) => {
    if (typeof obj === "object")
        for (const key of Object.keys(obj))
            _walk(`${name !== "" ? name + "." : ""}${key}`, obj[key])
    else
        StatePaths.push(name)
}
_walk("", StateDefault)

/*  state manipulation utilities  */
export class StateUtil {
    static changed (stateOld: Readonly<StateType>, stateNew: Readonly<StateType>): string[] {
        const changed = [] as string[]
        for (const path of StatePaths) {
            const valOld = objectPath.get(stateOld, path)
            const valNew = objectPath.get(stateNew, path)
            if (valOld !== valNew)
                changed.push(path)
        }
        return changed
    }
    static diff (stateOld: Readonly<StateType>, stateNew: Readonly<StateType>): StateTypePartial {
        const stateDiff = {} as StateTypePartial
        for (const path of StatePaths) {
            const valOld = objectPath.get(stateOld, path)
            const valNew = objectPath.get(stateNew, path)
            if (valOld !== valNew)
                objectPath.set(stateDiff, path, valNew)
        }
        return stateDiff
    }
    static copy (dst: StateTypePartial, src: Readonly<StateTypePartial>, patterns: Readonly<string[]> = [ "**" ]): boolean {
        let changed = false
        for (const pattern of patterns) {
            const paths = minimatch.match(StatePaths, pattern)
            for (const path of paths) {
                if (objectPath.has(src, path)) {
                    const valDst = objectPath.get(dst, path)
                    const valSrc = objectPath.get(src, path)
                    if (valDst !== valSrc) {
                        objectPath.set(dst, path, valSrc)
                        changed = true
                    }
                }
            }
        }
        return changed
    }
}

