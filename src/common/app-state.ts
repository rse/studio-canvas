/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  external dependencies  */
import objectPath    from "object-path"
import { minimatch } from "minimatch"

/*  complete state type (all fields required)  */
export type StateType = {
    streams: {
        device:     string,
        width:      number,
        height:     number,
        fps:        number
    },
    media: {
        media1:     string,
        media2:     string,
        media3:     string,
        media4:     string
    },
    canvas: {
        id:         string
        texture1:   string,
        texture2?:  string,
        fadeTrans?: number,
        fadeWait?:  number,
        transType:  string,
        transTime:  number,
        rotationZ:  number
    },
    monitor: {
        enable:     boolean,
        source:     string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    decal: {
        enable:     boolean,
        source:     string,
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
        source:     string,
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
        source:     string,
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
    pane: {
        enable:     boolean,
        source:     string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    pillar: {
        enable:     boolean,
        source:     string,
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
    mask: {
        enable:     boolean,
        source:     string,
        scale:      number,
        borderRad:  number
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
type DeepPartial<T> =
    T extends object ? {
        [ P in keyof T ]?: DeepPartial<T[P]>
    } : T
export type StateTypePartial = DeepPartial<StateType>

/*  complete state schema (all fields required)  */
export const StateSchema = `{
    streams: {
        device:     string,
        width:      number,
        height:     number,
        fps:        number
    },
    media: {
        media1:     string,
        media2:     string,
        media3:     string,
        media4:     string
    },
    canvas: {
        id:         string,
        texture1:   string,
        texture2:   string,
        fadeTrans:  number,
        fadeWait:   number,
        transType:  string,
        transTime:  number,
        rotationZ:  number
    },
    monitor: {
        enable:     boolean,
        source:     string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    decal: {
        enable:     boolean,
        source:     string,
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
        source:     string,
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
        source:     string,
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
    pane: {
        enable:     boolean,
        source:     string,
        fadeTime:   number,
        scale:      number,
        rotate:     number,
        lift:       number,
        distance:   number,
        opacity:    number,
        chromaKey:  {
            enable:     boolean,
            threshold:  number,
            smoothing:  number
        }
    },
    pillar: {
        enable:     boolean,
        source:     string,
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
    mask: {
        enable:     boolean,
        source:     string,
        scale:      number,
        borderRad:  number
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
    streams: {
        device:     "",
        width:      1920,
        height:     1080,
        fps:        30
    },
    media: {
        media1:     "/media/STD/placeholder-1.webm",
        media2:     "/media/STD/placeholder-2.webm",
        media3:     "",
        media4:     ""
    },
    canvas: {
        id:         "hexagons",
        texture1:   "/canvas/STD/hexagons-1.jpg",
        texture2:   "/canvas/STD/hexagons-2.jpg",
        fadeTrans:  150,
        fadeWait:   10000,
        transType:  "fade",
        transTime:  2.0,
        rotationZ:  0
    },
    monitor: {
        enable:     false,
        source:     "S2",
        fadeTime:   2.0,
        scale:      1.0,
        rotate:     10,
        lift:       0,
        distance:   0,
        opacity:    1.0,
        chromaKey:  {
            enable:     false,
            threshold:  0.4,
            smoothing:  0.1
        }
    },
    decal: {
        enable:     false,
        source:     "S1",
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
        source:     "S1",
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
        source:     "S2",
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
    pane: {
        enable:     false,
        source:     "S2",
        fadeTime:   2.0,
        scale:      1.0,
        rotate:     10,
        lift:       0,
        distance:   0,
        opacity:    1.0,
        chromaKey:  {
            enable:     false,
            threshold:  0.4,
            smoothing:  0.1
        }
    },
    pillar: {
        enable:     false,
        source:     "S2",
        fadeTime:   2.0,
        scale:      1.0,
        rotate:     10,
        lift:       0,
        distance:   0,
        opacity:    1.0,
        borderRad:  40,
        borderCrop: 0,
        chromaKey:  {
            enable:     false,
            threshold:  0.4,
            smoothing:  0.1
        }
    },
    mask: {
        enable:     false,
        source:     "S2",
        scale:      1.0,
        borderRad:  0
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

