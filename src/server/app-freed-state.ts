/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

export type FreeDState = {
    id?:       number,
    pan:       number,
    tilt:      number,
    roll:      number,
    x:         number,
    y:         number,
    z:         number,
    zoom:      number,
    focus:     number,
    spare0?:   number,
    spare1?:   number,
    checksum?: number
}

