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

    private sensorSize   = 35     // mm
    private sensorWidth  = 6.28   // mm
    private focalLenMin  = 4.4    // mm
    private focalLenMax  = 88.4   // mm

    /*  convert zoom
        from PHYSICAL BirdDog zoom level    (0..20)
        to   VIRTUAL  Babylon field of view (radians of 70.2 to 4.1 degree)  */
    zoomP2V (zoom: number) {
        if (zoom < this.zoomMin) zoom = this.zoomMin
        if (zoom > this.zoomMax) zoom = this.zoomMax

        /*  linear mapping from BirdDog zoom level [0..20] to normalized zoom [0..1]
            (this formula is a standard rule of three)  */
        const x = (zoom - this.zoomMin) / (this.zoomMax - this.zoomMin)

        /*  polynomial mapping from normalized zoom [0..1] to normalized size [0..1]
            (this formula was determined by a polynomial fitting through measured points)  */
        const f = (x: number) => {
            let y =
                (+3.35504883) * Math.pow(x, 5) +
                (-6.17763477) * Math.pow(x, 4) +
                (+4.79587236) * Math.pow(x, 3) +
                (-1.36548877) * Math.pow(x, 2) +
                (+0.39140991) *          x     +
                (+0.00070000)
            y = Math.max(0.0, Math.min(1.0, y))
            return y
        }
        const y = f(x)

        /*  linear mapping of normalized zoom [0..1] to BirdDog focal length [4.4mm...88.4mm]
            (this formula is a standard rule of three)  */
        const focalLen = this.focalLenMin + (this.focalLenMax - this.focalLenMin) * y

        /*  trigonomial mapping of BirdDog focal length [4.4mm...88.4mm] to BirdDog field of view [rad(70.2)...rad(4.1)]
            (this formular is standard trigonometry from lens physics)  */
        const fov = 2 * Math.atan(this.sensorWidth / (2 * focalLen))

        return fov
    }

    /*  convert zoom
        from VIRTUAL  Babylon field of view (radians of 70.2 to 4.1 degree)
        to   PHYSICAL BirdDog zoom level    (0..20)  */
    zoomV2P (fov: number) {
        if (fov < this.fovMin) fov = this.fovMin
        if (fov > this.fovMax) fov = this.fovMax

        /*  trigonomial mapping of BirdDog field of view [rad(70.2)...rad(4.1)] to BirdDog focal length [4.4mm...88.4mm]
            (this formular is standard trigonometry from lens physics)  */
        const focalLen = this.sensorWidth / (2 * Math.tan(fov / 2))

        /*  linear mapping of  BirdDog focal length [4.4mm...88.4mm] to normalized zoom [0..1]
            (this formula is a standard rule of three)  */
        const y = (focalLen - this.focalLenMin) / (this.focalLenMax - this.focalLenMin)

        /*  polynomial mapping from normalized size [0..1] to normalized zoom [0..1]
            (this formula was determined by a polynomial fitting through measured points)  */
        const F = (y: number) => {
            let x =
                ( +4.75573252) * Math.pow(y, 5) +
                (-15.18016820) * Math.pow(y, 4) +
                (+19.01568950) * Math.pow(y, 3) +
                (-12.16289180) * Math.pow(y, 2) +
                ( +4.58138959) *          y     +
                ( -0.01000000)
            x = Math.max(0.0, Math.min(1.0, x))
            return x
        }
        const x = F(y)

        /*  linear mapping from normalized zoom [0..1] to BirdDog zoom level [0..20]
            (this formula is a standard rule of three)  */
        const zoom = this.zoomMin + (this.zoomMax - this.zoomMin) * x

        return zoom
    }
}

