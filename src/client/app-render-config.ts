/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import internal dependencies (client-side)  */
import { type PTZCamType } from "./app-render-ptz"

/*  exported utility type of the camera names  */
export type CameraName = "CAM1" | "CAM2" | "CAM3" | "CAM4"

/*  exported global configuration  */
export default class Config {
    /*  FPS to factor conversion  */
    static fpsFactor = {
        1: 60,
        2: 30,
        3: 20,
        4: 15,
        5: 12,
        6: 10,
        10: 6,
        12: 5,
        15: 4,
        20: 3,
        30: 2,
        60: 1
    } as { [ fps: number ]: number }

    /*  scene nodes relevant for layer-specific rendering  */
    static layerNodes = {
        "Floor":                        { back: true,  front: false },
        "Control-Room-Wall-East":       { back: true,  front: false },
        "Control-Room-Wall-North":      { back: true,  front: false },
        "Control-Room-Wall-South":      { back: true,  front: false },
        "Control-Room-Wall-West":       { back: true,  front: false },
        "Stage-Room-Pillar":            { back: true,  front: false },
        "Stage-Wall-East":              { back: true,  front: false },
        "Stage-Wall-North":             { back: true,  front: false },
        "Stage-Wall-South":             { back: true,  front: false },
        "Stage-Wall-West":              { back: true,  front: false },
        "Stage-Wall-West_primitive0":   { back: true,  front: false },
        "Stage-Wall-West_primitive1":   { back: true,  front: false },
        "Wall":                         { back: true,  front: false },
        "Avatar1":                      { back: true,  front: false },
        "Avatar2":                      { back: true,  front: false },
        "Reference":                    { back: true,  front: false },
        "DecalRay-Begin":               { back: true,  front: false },
        "DecalRay-End":                 { back: true,  front: false },
        "Monitor":                      { back: true,  front: false },
        "Monitor-Case":                 { back: true,  front: false },
        "Monitor-Screen":               { back: true,  front: false },
        "Pillar":                       { back: true,  front: false },
        "Pillar-Case":                  { back: true,  front: false },
        "Pillar-Screen":                { back: true,  front: false },
        "Plate":                        { back: false, front: true  },
        "Hologram":                     { back: false, front: true  },
        "Pane":                         { back: false, front: true  },
        "Pane-Case":                    { back: false, front: true  },
        "Pane-Screen":                  { back: false, front: true  },
        "Mask":                         { back: false, front: true  },
        "Mask-Background":              { back: false, front: true  },
        "Mask-Display":                 { back: false, front: true  },
        "Dummy":                        { back: true,  front: true  }
    } as { [ name: string ]: { back: boolean, front: boolean } }

    /*  size of canvas/wall  */
    static wall = {
        width:  10540,
        height: 3570
    }

    /*  camera type (currently hard-coded)  */
    static camNameToTypeMap = new Map<CameraName, PTZCamType>([
        [ "CAM1", "sony"    ],
        [ "CAM2", "sony"    ],
        [ "CAM3", "sony"    ],
        [ "CAM4", "birddog" ]
    ])

    /*  cameras which have a flipped pan/tilt coordination system  */
    static flippedCams = [ "" ]

    /*  number of stacked videos in video stream  */
    static videoStacks = 2
}
