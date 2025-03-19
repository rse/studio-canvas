/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import internal dependencies (client-side)  */
import type Texture     from "./app-render-texture"
import type Stream      from "./app-render-stream"
import type Display     from "./app-render-display"
import type Scene       from "./app-render-scene"
import type Viewpoint   from "./app-render-viewpoint"
import type Canvas      from "./app-render-canvas"
import type Decal       from "./app-render-decal"
import type Monitor     from "./app-render-monitor"
import type Pane        from "./app-render-pane"
import type Plate       from "./app-render-plate"
import type Pillar      from "./app-render-pillar"
import type Hologram    from "./app-render-hologram"
import type Mask        from "./app-render-mask"
import type Avatars     from "./app-render-avatars"
import type Reference   from "./app-render-reference"
import type Lights      from "./app-render-lights"

/*  special renderer API  */
type Renderer = {
    log: (level: string, msg: string) => void
    fps: (fps: number) => void
}

/*  export API type  */
export type API = {
    renderer:  Renderer
    texture:   Texture
    stream:    Stream
    display:   Display
    scene:     Scene
    viewpoint: Viewpoint
    canvas:    Canvas
    decal:     Decal
    monitor:   Monitor
    pane:      Pane
    plate:     Plate
    pillar:    Pillar
    hologram:  Hologram
    mask:      Mask
    avatars:   Avatars
    reference: Reference
    lights:    Lights
}
