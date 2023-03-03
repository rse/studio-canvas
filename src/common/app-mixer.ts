/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

export type MixerState = {
    preview?: string,
    program?: string
}

export const MixerFPS = [
    0, 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60
]
