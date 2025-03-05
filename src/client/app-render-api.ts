/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import internal dependencies (client-side)  */
import Texture     from "./app-render-texture"
import Stream      from "./app-render-stream"
import Display     from "./app-render-display"
import Scene       from "./app-render-scene"
import Viewpoint   from "./app-render-viewpoint"
import Canvas      from "./app-render-canvas"
import Decal       from "./app-render-decal"
import Monitor     from "./app-render-monitor"
import Pane        from "./app-render-pane"
import Plate       from "./app-render-plate"
import Pillar      from "./app-render-pillar"
import Hologram    from "./app-render-hologram"
import Mask        from "./app-render-mask"
import Avatars     from "./app-render-avatars"
import Reference   from "./app-render-reference"
import Lights      from "./app-render-lights"

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
