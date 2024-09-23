/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

export type MediaEntry = {
    id?:        string
    name:       string
    group:      string
    texture:    string
    type:       string
    loop:       boolean
}

export const MediaSchema = `{
    id?:        string,
    name:       string,
    group?:     string,
    texture:    string,
    type:       string,
    loop:       boolean
}`

