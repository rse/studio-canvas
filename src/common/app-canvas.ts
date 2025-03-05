/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

export type ImageEntry = {
    id?:        string
    name:       string
    group:      string
    texture1:   string
    texture2?:  string
    fadeTrans?: number
    fadeWait?:  number
    exclusive?: boolean
}

export const ImageSchema = `{
    id?:        string,
    name:       string,
    group?:     string,
    texture1:   string,
    texture2?:  string,
    fadeTrans?: number,
    fadeWait?:  number,
    exclusive?: boolean
}`

