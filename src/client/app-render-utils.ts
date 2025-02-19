/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON from "@babylonjs/core"

/*  exported utility type  */
export type ChromaKey = {
    enable:    boolean
    threshold: number
    smoothing: number
}

/*  exported utility functions  */
export default class Utils {
    /*  convert from degree to radians  */
    static deg2rad (deg: number) {
        return (deg * (Math.PI / 180))
    }

    /*  convert from radians to degree  */
    static rad2deg (rad: number) {
        return (rad * (180 / Math.PI))
    }

    /*  perform a value animation manually  */
    static manualAnimation (from: number, to: number, duration: number, fps: number, callback: (grad: number) => void) {
        return new Promise((resolve) => {
            const ease = new BABYLON.SineEase()
            ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT)
            const frames = (60 / fps) * fps * duration
            let frame = 0
            const step = () => {
                callback(from + (to - from) * ease.ease(frame / frames))
                if (frame++ <= frames)
                    window.requestAnimationFrame(step)
                else
                    resolve(true)
            }
            window.requestAnimationFrame(step)
        })
    }
}
