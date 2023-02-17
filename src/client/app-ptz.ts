/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  the Babylon PTZ state class  */
export default class PTZ {
    /*  convert between degree and radians  */
    deg2rad (deg: number) { return (deg * (Math.PI / 180)) }
    rad2deg (rad: number) { return (rad * (180 / Math.PI)) }

    /*  ==== X/Y/Z Position ====  */

    public posXOrigin    = 0
    public posXDelta     = 0
    public posYOrigin    = 0
    public posYDelta     = 0
    public posZOrigin    = 0
    public posZDelta     = 0

    posXP2V (x: number) {
        return (this.posXOrigin + this.posXDelta) + x
    }
    posXV2P (x: number) {
        return x - (this.posXOrigin + this.posXDelta)
    }
    posYP2V (y: number) {
        return (this.posYOrigin + this.posYDelta) + y
    }
    posYV2P (y: number) {
        return y - (this.posYOrigin + this.posYDelta)
    }
    posZP2V (z: number) {
        return (this.posZOrigin + this.posZDelta) + z
    }
    posZV2P (z: number) {
        return z - (this.posZOrigin + this.posZDelta)
    }

    /*  ==== PAN ====  */

    public panOrigin     = 0
    public panDelta      = 0
    public panMinDeg     = -180
    public panMaxDeg     = 180
    public panTotal      = this.deg2rad(360)
    public panStep       = this.deg2rad(1)

    /*  convert pan
        from PHYSICAL BirdDog pan        (-180/left...0/center...+180/right degree)
        to   VIRTUAL  Babylon y-rotation (offset from center in radians)  */
    panP2V (deg: number) {
        if (deg < this.panMinDeg) deg = this.panMinDeg
        if (deg > this.panMaxDeg) deg = this.panMaxDeg
        if (deg < 0)
            return (this.panOrigin + this.panDelta) + this.deg2rad(-deg)
        else
            return (this.panOrigin + this.panDelta) - this.deg2rad(deg)
    }

    /*  convert pan
        from  VIRTUAL  Babylon y-rotation (offset from center in radians)
        to    PHYSICAL BirdDog pan        (-180/left...0/center...+180/right degree)  */
    panV2P (rad: number) {
        let deg
        rad = (rad % this.panTotal)
        if (rad <= (this.panOrigin + this.panDelta))
            deg = +this.rad2deg(Math.abs((this.panOrigin + this.panDelta) - rad))
        else
            deg = -this.rad2deg(Math.abs((this.panOrigin + this.panDelta) - rad))
        return deg
    }

    /*  ==== TILT ====  */

    public tiltOrigin    = 0
    public tiltDelta     = 0
    public tiltMinDeg    = -30
    public tiltMaxDeg    = 90
    public tiltTotal     = this.deg2rad(360)
    public tiltStep      = this.deg2rad(1)

    /*  convert tilt
        from  PHYSICAL BirdDog pan        (-30/down...0/center...+90/up degree)
        to    VIRTUAL  Babylon x-rotation (offset from center in radians)  */
    tiltP2V (deg: number) {
        if (deg < this.tiltMinDeg) deg = this.tiltMinDeg
        if (deg > this.tiltMaxDeg) deg = this.tiltMaxDeg
        if (deg < 0)
            return (this.tiltOrigin + this.tiltDelta) + this.deg2rad(-deg)
        else
            return (this.tiltOrigin + this.tiltDelta) - this.deg2rad(deg)
    }

    /*  convert tilt
        from  VIRTUAL  Babylon x-rotation (offset from center in radians)
        to    PHYSICAL BirdDog pan        (-30/down...0/center...+90/up degree)  */
    tiltV2P (rad: number) {
        let deg
        rad = (rad % this.tiltTotal)
        if (rad <= (this.tiltOrigin + this.tiltDelta))
            deg = +this.rad2deg(Math.abs((this.tiltOrigin + this.tiltDelta) - rad))
        else
            deg = -this.rad2deg(Math.abs((this.tiltOrigin + this.tiltDelta) - rad))
        return deg
    }

    /*  ==== ROTATE ====  */

    public rotateOrigin = 0
    public rotateDelta  = 0
    public rotateMinDeg = -30
    public rotateMaxDeg = 30
    public rotateTotal  = this.deg2rad(360)
    public rotateStep   = this.deg2rad(0.5)

    /*  convert rotation
        from  PHYSICAL BirdDog rotation   (FICTIVE -30/left...0/center...+30/right degree)
        to    VIRTUAL  Babylon z-rotation (offset from center in radians)  */
    rotateP2V (deg: number) {
        if (deg < this.rotateMinDeg) deg = this.rotateMinDeg
        if (deg > this.rotateMaxDeg) deg = this.rotateMaxDeg
        if (deg < 0)
            return (this.rotateOrigin + this.rotateDelta) + this.deg2rad(-deg)
        else
            return (this.rotateOrigin + this.rotateDelta) - this.deg2rad(deg)
    }

    /*  convert rotation
        from  VIRTUAL  Babylon z-rotation (offset from center in radians)
        to    PHYSICAL BirdDog rotation   (FICTIVE -30/left...0/center...+30/right degree)  */
    rotateV2P (rad: number) {
        let deg
        rad = (rad % this.rotateTotal)
        if (rad <= (this.rotateOrigin + this.rotateDelta))
            deg = +this.rad2deg(Math.abs((this.rotateOrigin + this.rotateDelta) - rad))
        else
            deg = -this.rad2deg(Math.abs((this.rotateOrigin + this.rotateDelta) - rad))
        return deg
    }

    /*  ==== ZOOM ====  */

    /*  Babylon Field Of View (FOV) is set in Radians (default is 0.8).
        Birddog P400 has a FOV of 70.2 - 4.1 degree and a 20x optical zoom
        and the BirdDog CamControl usually does 40 steps on zooming
        (compare https://birddog.tv/p400-overview/p400-techspecs/)  */
    public fovMinDeg     = 4.1
    public fovMaxDeg     = 70.2
    public fovMin        = this.deg2rad(this.fovMinDeg)
    public fovMax        = this.deg2rad(this.fovMaxDeg)
    public fovMult       = 1
    public zoomMin       = 0
    public zoomMax       = 20
    public zoomLevels    = 40
    public zoomStep      = (this.fovMax - this.fovMin) / this.zoomLevels

    /*  convert zoom
        from PHYSICAL BirdDog zoom level    (0..20)
        to   VIRTUAL  Babylon field of view (radians of 70.2 to 4.1 degree)  */
    zoomP2V (zoom: number) {
        if (zoom < this.zoomMin) zoom = this.zoomMin
        if (zoom > this.zoomMax) zoom = this.zoomMax
        return (this.fovMax * this.fovMult) - (
            (zoom - this.zoomMin) *
            (((this.fovMax * this.fovMult) - this.fovMin) / (this.zoomMax - this.zoomMin))
        )
    }

    /*  convert zoom
        from VIRTUAL  Babylon field of view (radians of 70.2 to 4.1 degree)
        to   PHYSICAL BirdDog zoom level    (0..20)  */
    zoomV2P (fov: number) {
        if (fov < this.fovMin) fov = this.fovMin
        if (fov > (this.fovMax * this.fovMult)) fov = (this.fovMax * this.fovMult)
        return this.zoomMax - (
            (fov - this.fovMin) *
            ((this.zoomMax - this.zoomMin) / ((this.fovMax * this.fovMult) - this.fovMin))
        )
    }
}
