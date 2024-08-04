/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import objectPath    from "object-path"
import { minimatch } from "minimatch"

/*  complete state type (all fields required)  */
export type StateType = {
    canvas: {
        id:         string
        texture1:   string,
        texture2?:  string,
        fadeTrans?: number,
        fadeWait?:  number,
        rotationZ:  number
    },
    monitor: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    decal: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        opacity:    number,
        borderRad:  number,
        borderCrop: number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    plate: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        borderRad:  number,
        borderCrop: number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    hologram: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        borderRad:  number,
        borderCrop: number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    lights: {
        intensity1: number,
        intensity2: number,
        intensity3: number
    },
    avatars: {
        enable1:    boolean,
        size1:      number,
        rotate1:    number,
        enable2:    boolean,
        size2:      number,
        rotate2:    number
    },
    references: {
        enable:     boolean
    },
    CAM1: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    CAM2: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    CAM3: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    CAM4: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    renderer: {
        program: number,
        preview: number,
        other:   number,
        overlay: boolean
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
        fadeWait:   number,
        rotationZ:  number
    },
    monitor: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    decal: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        opacity:    number,
        borderRad:  number,
        borderCrop: number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    plate: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        borderRad:  number,
        borderCrop: number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    hologram: {
        enable:     boolean,
        device:     string,
        device2:    string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        borderRad:  number,
        borderCrop: number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    lights: {
        intensity1: number,
        intensity2: number,
        intensity3: number
    },
    avatars: {
        enable1:    boolean,
        size1:      number,
        rotate1:    number,
        enable2:    boolean,
        size2:      number,
        rotate2:    number
    },
    references: {
        enable:     boolean
    },
    CAM1: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    CAM2: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    CAM3: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    CAM4: {
        hullPosition: { x: number, y: number, z: number },
        caseRotation: { x: number, y: number, z: number, ym: number },
        lensRotation: { x: number, xm: number },
        fov:          { m: number }
    },
    renderer: {
        program: number,
        preview: number,
        other:   number,
        overlay: boolean
    }
}`

/*  partial state schema (all fields optional)  */
export const StateSchemaPartial = StateSchema.replace(/:/g, "?:")

/*  complete state default (all fields with default values)  */
export const StateDefault: StateType = {
    canvas: {
        id:         "hexagons",
        texture1:   "/canvas/hexagons-1.jpg",
        texture2:   "/canvas/hexagons-2.jpg",
        fadeTrans:  150,
        fadeWait:   10000,
        rotationZ:  0
    },
    monitor: {
        enable:     false,
        device:     "",
        device2:    "",
        fadeTime:   2.0,
        scale:      1.0,
        rotate:     10,
        lift:       0,
        chromaKey:  {
            enable:     false,
            threshold:  0.4,
            smoothing:  0.1
        }
    },
    decal: {
        enable:     false,
        device:     "",
        device2:    "",
        fadeTime:   2.0,
        scale:      1.0,
        rotate:     -25,
        lift:       -2.5,
        opacity:    1.0,
        borderRad:  40,
        borderCrop: 0,
        chromaKey:  {
            enable:     false,
            threshold:  0.4,
            smoothing:  0.1
        }
    },
    plate: {
        enable:     false,
        device:     "",
        device2:    "",
        fadeTime:   2.0,
        scale:      1.0,
        rotate:     -25,
        lift:       0,
        distance:   0.0,
        opacity:    1.0,
        borderRad:  40,
        borderCrop: 0,
        chromaKey:  {
            enable:     false,
            threshold:  0.4,
            smoothing:  0.1
        }
    },
    hologram: {
        enable:     false,
        device:     "",
        device2:    "",
        fadeTime:   2.0,
        scale:      1.0,
        rotate:     -25,
        lift:       0.0,
        distance:   0.0,
        opacity:    1.0,
        borderRad:  40,
        borderCrop: 0,
        chromaKey:  {
            enable:     false,
            threshold:  0.4,
            smoothing:  0.1
        }
    },
    lights: {
        intensity1: 300,
        intensity2: 300,
        intensity3: 300
    },
    avatars: {
        enable1:    true,
        size1:       185,
        rotate1:    -7,
        enable2:    true,
        size2:      185,
        rotate2:    7
    },
    references: {
        enable:     true
    },
    CAM1: {
        hullPosition: { x: 0, y: 0, z: 0 },
        caseRotation: { x: 0, y: 0, z: 0, ym: 1 },
        lensRotation: { x: 0, xm: 1 },
        fov:          { m: 1 }
    },
    CAM2: {
        hullPosition: { x: 0, y: 0, z: 0 },
        caseRotation: { x: 0, y: 0, z: 0, ym: 1 },
        lensRotation: { x: 0, xm: 1 },
        fov:          { m: 1 }
    },
    CAM3: {
        hullPosition: { x: 0, y: 0, z: 0 },
        caseRotation: { x: 0, y: 0, z: 0, ym: 1 },
        lensRotation: { x: 0, xm: 1 },
        fov:          { m: 1 }
    },
    CAM4: {
        hullPosition: { x: 0, y: 0, z: 0 },
        caseRotation: { x: 0, y: 0, z: 0, ym: 1 },
        lensRotation: { x: 0, xm: 1 },
        fov:          { m: 1 }
    },
    renderer: {
        program:    30,
        preview:    15,
        other:      0,
        overlay:    false
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
    static reduce (stateBase: Readonly<StateTypePartial>, stateDiff: Readonly<StateTypePartial>): StateTypePartial {
        const stateReduced = {} as StateTypePartial
        for (const path of StatePaths) {
            if (objectPath.has(stateDiff, path)) {
                const valBase = objectPath.get(stateBase, path)
                const valDiff = objectPath.get(stateDiff, path)
                if (valBase !== valDiff)
                    objectPath.set(stateReduced, path, valDiff)
            }
        }
        return stateReduced
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

