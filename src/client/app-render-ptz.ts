/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  the Babylon PTZ state class  */
export type PTZCamType = "birddog" | "panasonic" | "sony"
export default class PTZ {
    constructor (private camType: PTZCamType) {}

    /*  convert between degree and radians  */
    deg2rad (deg: number) { return (deg * (Math.PI / 180)) }
    rad2deg (rad: number) { return (rad * (180 / Math.PI)) }

    /*  ==== X/Y/Z Position ====  */

    private posConst = {
        "birddog": {
            posXOrigin:  0,
            posXDelta:   0,
            posYOrigin:  0,
            posYDelta:   0,
            posZOrigin:  0,
            posZDelta:   0
        },
        "panasonic": {
            posXOrigin:  0,
            posXDelta:   0,
            posYOrigin:  0,
            posYDelta:   0,
            posZOrigin:  0,
            posZDelta:   0
        },
        "sony": {
            posXOrigin:  0,
            posXDelta:   0,
            posYOrigin:  0,
            posYDelta:   0,
            posZOrigin:  0,
            posZDelta:   0
        }
    }

    get posXOrigin () { return this.posConst[this.camType].posXOrigin }
    get posXDelta  () { return this.posConst[this.camType].posXDelta  }
    get posYOrigin () { return this.posConst[this.camType].posYOrigin }
    get posYDelta  () { return this.posConst[this.camType].posYDelta  }
    get posZOrigin () { return this.posConst[this.camType].posZOrigin }
    get posZDelta  () { return this.posConst[this.camType].posZDelta  }

    set posXOrigin (v) { this.posConst[this.camType].posXOrigin = v }
    set posXDelta  (v) { this.posConst[this.camType].posXDelta  = v }
    set posYOrigin (v) { this.posConst[this.camType].posYOrigin = v }
    set posYDelta  (v) { this.posConst[this.camType].posYDelta  = v }
    set posZOrigin (v) { this.posConst[this.camType].posZOrigin = v }
    set posZDelta  (v) { this.posConst[this.camType].posZDelta  = v }

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

    private panConst = {
        "birddog": {
            panOrigin: 0,
            panDelta:  0,
            panMinDeg: -175,
            panMaxDeg: 175,
            panTotal:  this.deg2rad(360),
            panStep:   this.deg2rad(1),
            panMult:   1
        },
        "panasonic": {
            panOrigin: 0,
            panDelta:  0,
            panMinDeg: -175,
            panMaxDeg: 175,
            panTotal:  this.deg2rad(360),
            panStep:   this.deg2rad(1),
            panMult:   1
        },
        "sony": {
            panOrigin: 0,
            panDelta:  0,
            panMinDeg: -170,
            panMaxDeg: 170,
            panTotal:  this.deg2rad(360),
            panStep:   this.deg2rad(1),
            panMult:   1
        }
    }

    get panOrigin () { return this.panConst[this.camType].panOrigin }
    get panDelta  () { return this.panConst[this.camType].panDelta  }
    get panMinDeg () { return this.panConst[this.camType].panMinDeg }
    get panMaxDeg () { return this.panConst[this.camType].panMaxDeg }
    get panTotal  () { return this.panConst[this.camType].panTotal  }
    get panStep   () { return this.panConst[this.camType].panStep   }
    get panMult   () { return this.panConst[this.camType].panMult   }

    set panOrigin (v) { this.panConst[this.camType].panOrigin = v }
    set panDelta  (v) { this.panConst[this.camType].panDelta  = v }
    set panMinDeg (v) { this.panConst[this.camType].panMinDeg = v }
    set panMaxDeg (v) { this.panConst[this.camType].panMaxDeg = v }
    set panTotal  (v) { this.panConst[this.camType].panTotal  = v }
    set panStep   (v) { this.panConst[this.camType].panStep   = v }
    set panMult   (v) { this.panConst[this.camType].panMult   = v }

    /*  convert pan
        from PHYSICAL BirdDog pan        (-175/left...0/center...+175/right degree)
        to   VIRTUAL  Babylon y-rotation (offset from center in radians)  */
    panP2V (deg: number) {
        if (deg < this.panMinDeg) deg = this.panMinDeg
        if (deg > this.panMaxDeg) deg = this.panMaxDeg
        if (deg < 0)
            return (this.panOrigin + this.panDelta) + this.deg2rad(-deg * this.panMult)
        else
            return (this.panOrigin + this.panDelta) - this.deg2rad(deg * this.panMult)
    }

    /*  convert pan
        from  VIRTUAL  Babylon y-rotation (offset from center in radians)
        to    PHYSICAL BirdDog pan        (-180/left...0/center...+180/right degree)  */
    panV2P (rad: number) {
        let deg
        rad = (rad % this.panTotal)
        if (rad <= (this.panOrigin + this.panDelta))
            deg = +this.rad2deg(Math.abs((this.panOrigin + this.panDelta) - rad)) / this.panMult
        else
            deg = -this.rad2deg(Math.abs((this.panOrigin + this.panDelta) - rad)) / this.panMult
        return deg
    }

    /*  ==== TILT ====  */

    private tiltConst = {
        "birddog": {
            tiltOrigin: 0,
            tiltDelta:  0,
            tiltMinDeg: -30,
            tiltMaxDeg: 90,
            tiltTotal:  this.deg2rad(360),
            tiltStep:   this.deg2rad(1),
            tiltMult:   1
        },
        "panasonic": {
            tiltOrigin: 0,
            tiltDelta:  0,
            tiltMinDeg: -30,
            tiltMaxDeg: 210,
            tiltTotal:  this.deg2rad(360),
            tiltStep:   this.deg2rad(1),
            tiltMult:   1
        },
        "sony": {
            tiltOrigin: 0,
            tiltDelta:  0,
            tiltMinDeg: -30,
            tiltMaxDeg: 195,
            tiltTotal:  this.deg2rad(360),
            tiltStep:   this.deg2rad(1),
            tiltMult:   1
        }
    }

    get tiltOrigin () { return this.tiltConst[this.camType].tiltOrigin }
    get tiltDelta  () { return this.tiltConst[this.camType].tiltDelta  }
    get tiltMinDeg () { return this.tiltConst[this.camType].tiltMinDeg }
    get tiltMaxDeg () { return this.tiltConst[this.camType].tiltMaxDeg }
    get tiltTotal  () { return this.tiltConst[this.camType].tiltTotal  }
    get tiltStep   () { return this.tiltConst[this.camType].tiltStep   }
    get tiltMult   () { return this.tiltConst[this.camType].tiltMult   }

    set tiltOrigin (v) { this.tiltConst[this.camType].tiltOrigin = v }
    set tiltDelta  (v) { this.tiltConst[this.camType].tiltDelta  = v }
    set tiltMinDeg (v) { this.tiltConst[this.camType].tiltMinDeg = v }
    set tiltMaxDeg (v) { this.tiltConst[this.camType].tiltMaxDeg = v }
    set tiltTotal  (v) { this.tiltConst[this.camType].tiltTotal  = v }
    set tiltStep   (v) { this.tiltConst[this.camType].tiltStep   = v }
    set tiltMult   (v) { this.tiltConst[this.camType].tiltMult   = v }

    /*  convert tilt
        from  PHYSICAL BirdDog pan        (-30/down...0/center...+90/up degree)
        to    VIRTUAL  Babylon x-rotation (offset from center in radians)  */
    tiltP2V (deg: number) {
        if (deg < this.tiltMinDeg) deg = this.tiltMinDeg
        if (deg > this.tiltMaxDeg) deg = this.tiltMaxDeg
        if (deg < 0)
            return (this.tiltOrigin + this.tiltDelta) + this.deg2rad(-deg * this.tiltMult)
        else
            return (this.tiltOrigin + this.tiltDelta) - this.deg2rad(deg * this.tiltMult)
    }

    /*  convert tilt
        from  VIRTUAL  Babylon x-rotation (offset from center in radians)
        to    PHYSICAL BirdDog pan        (-30/down...0/center...+90/up degree)  */
    tiltV2P (rad: number) {
        let deg
        rad = (rad % this.tiltTotal)
        if (rad <= (this.tiltOrigin + this.tiltDelta))
            deg = +this.rad2deg(Math.abs((this.tiltOrigin + this.tiltDelta) - rad)) / this.tiltMult
        else
            deg = -this.rad2deg(Math.abs((this.tiltOrigin + this.tiltDelta) - rad)) / this.tiltMult
        return deg
    }

    /*  ==== ROTATE ====  */

    private rotateConst = {
        "birddog": {
            rotateOrigin:  0,
            rotateDelta:   0,
            rotateMinDeg:  -30,
            rotateMaxDeg:  30,
            rotateTotal:   this.deg2rad(360),
            rotateStep:    this.deg2rad(0.5)
        },
        "panasonic": {
            rotateOrigin:  0,
            rotateDelta:   0,
            rotateMinDeg:  -30,
            rotateMaxDeg:  30,
            rotateTotal:   this.deg2rad(360),
            rotateStep:    this.deg2rad(0.5)
        },
        "sony": {
            rotateOrigin:  0,
            rotateDelta:   0,
            rotateMinDeg:  -30,
            rotateMaxDeg:  30,
            rotateTotal:   this.deg2rad(360),
            rotateStep:    this.deg2rad(0.5)
        }
    }

    get rotateOrigin () { return this.rotateConst[this.camType].rotateOrigin }
    get rotateDelta  () { return this.rotateConst[this.camType].rotateDelta  }
    get rotateMinDeg () { return this.rotateConst[this.camType].rotateMinDeg }
    get rotateMaxDeg () { return this.rotateConst[this.camType].rotateMaxDeg }
    get rotateTotal  () { return this.rotateConst[this.camType].rotateTotal  }
    get rotateStep   () { return this.rotateConst[this.camType].rotateStep   }

    set rotateOrigin (v) { this.rotateConst[this.camType].rotateOrigin = v }
    set rotateDelta  (v) { this.rotateConst[this.camType].rotateDelta  = v }
    set rotateMinDeg (v) { this.rotateConst[this.camType].rotateMinDeg = v }
    set rotateMaxDeg (v) { this.rotateConst[this.camType].rotateMaxDeg = v }
    set rotateTotal  (v) { this.rotateConst[this.camType].rotateTotal  = v }
    set rotateStep   (v) { this.rotateConst[this.camType].rotateStep   = v }

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

    private zoomConst = {
        "birddog": {
            /*  Babylon Field Of View (FOV) is set in Radians (default is 0.8).
                Birddog P400 has a FOV of 70.2 - 4.1 degree and a 20x optical zoom
                and the BirdDog CamControl usually does 40 steps on zooming
                (compare https://birddog.tv/p400-overview/p400-techspecs/)  */
            fovMinDeg:      4.1,
            fovMaxDeg:      70.2,
            fovMin:         this.deg2rad(4.1),
            fovMax:         this.deg2rad(70.2),
            fovMult:        1, /* FIXME: unused until polynomial adjustment is implemented  */
            zoomMin:        0,
            zoomMax:        20,
            zoomLevels:     40,
            zoomStep:       (this.deg2rad(70.2) - this.deg2rad(4.1)) / 40,
            sensorSize:     35,
            sensorWidth:    6.28,
            focalLenMin:    4.4,
            focalLenMax:    88.4,
            zoomCurve:      {
                /*  Non-linear Zoom of BirdDog P400 (real).
                    NOTICE: These particular mapping functions were determined by a polynomial fitting through measured points,
                    because the P400 zoom lenses (like many zoom lenses) are actually complex zoom lense systems where some
                    lenses move in a parabolic arc and hence cause the zoom to act in a non-linear fashion.  */
                zoom2size (x: number) {
                    const y =
                        (+3.35504883) * Math.pow(x, 5) +
                        (-6.17763477) * Math.pow(x, 4) +
                        (+4.79587236) * Math.pow(x, 3) +
                        (-1.36548877) * Math.pow(x, 2) +
                        (+0.39140991) *          x     +
                        (+0.00070000)
                    return Math.max(0.0, Math.min(1.0, y))
                },
                size2zoom (y: number) {
                    const x =
                        ( +4.75573252) * Math.pow(y, 5) +
                        (-15.18016820) * Math.pow(y, 4) +
                        (+19.01568950) * Math.pow(y, 3) +
                        (-12.16289180) * Math.pow(y, 2) +
                        ( +4.58138959) *          y     +
                        ( -0.01000000)
                    return Math.max(0.0, Math.min(1.0, x))
                }
            }
        },
        "panasonic": {
            fovMinDeg:      3.3,
            fovMaxDeg:      74.1,
            fovMin:         this.deg2rad(3.3),
            fovMax:         this.deg2rad(74.1),
            fovMult:        1, /* FIXME: unused until polynomial adjustment is implemented  */
            zoomMin:        1.666259765625,
            zoomMax:        4.998779296875,
            zoomLevels:     24,
            zoomStep:       (this.deg2rad(74.1) - this.deg2rad(3.3)) / 24,
            sensorSize:     25,
            sensorWidth:    5.75,
            focalLenMin:    4.12,
            focalLenMax:    98.9,
            zoomCurve:      {
                /*  Non-linear Zoom of Panasonic AW-UE100 (real).
                    NOTICE: These particular mapping functions were determined by a polynomial fitting through measured points,
                    because the AW-UE100 zoom lenses (like many zoom lenses) are actually complex zoom lense systems where some
                    lenses move in a parabolic arc and hence cause the zoom to act in a non-linear fashion.  */
                zoom2size (x: number) {
                    const y =
                        (+3.1543) * Math.pow(x, 5) +
                        (-5.6345) * Math.pow(x, 4) +
                        (+4.2720) * Math.pow(x, 3) +
                        (-1.1903) * Math.pow(x, 2) +
                        (+0.3963) *          x     +
                        (+0.0004)
                    return Math.max(0.0, Math.min(1.0, y))
                },
                size2zoom (y: number) {
                    const x =
                        (+1.7939) * Math.pow(y, 5) +
                        (-7.0223) * Math.pow(y, 4) +
                        (+10.957) * Math.pow(y, 3) +
                        (-8.8107) * Math.pow(y, 2) +
                        (+4.0947) *          y     +
                        (-0.0131)
                    return Math.max(0.0, Math.min(1.0, x))
                }
            }
        },
        "sony": {
            fovMinDeg:      18,
            fovMaxDeg:      75,
            fovMin:         this.deg2rad(18),
            fovMax:         this.deg2rad(75),
            fovMult:        1, /* FIXME: unused until polynomial adjustment is implemented  */
            zoomMin:        35.06591796875,
            zoomMax:        149.263916015625,
            zoomLevels:     80, /* at least  */
            zoomStep:       (this.deg2rad(75) - this.deg2rad(18)) / 80,
            sensorSize:     35,
            sensorWidth:    35.6,
            focalLenMin:    28,
            focalLenMax:    135,
            zoomCurve:      {
                /*  Linear Zoom of Sony ILME FR-7 + Sony SELP28135G (real).
                    NOTICE: The SELP28135G is really a linear optical system. */
                zoom2size (x: number) {
                    return Math.max(0.0, Math.min(1.0, x))
                },
                size2zoom (y: number) {
                    return Math.max(0.0, Math.min(1.0, y))
                }
            }
        }
    }

    get fovMinDeg    () { return this.zoomConst[this.camType].fovMinDeg   }
    get fovMaxDeg    () { return this.zoomConst[this.camType].fovMaxDeg   }
    get fovMin       () { return this.zoomConst[this.camType].fovMin      }
    get fovMax       () { return this.zoomConst[this.camType].fovMax      }
    get fovMult      () { return this.zoomConst[this.camType].fovMult     }
    get zoomMin      () { return this.zoomConst[this.camType].zoomMin     }
    get zoomMax      () { return this.zoomConst[this.camType].zoomMax     }
    get zoomLevels   () { return this.zoomConst[this.camType].zoomLevels  }
    get zoomStep     () { return this.zoomConst[this.camType].zoomStep    }
    get sensorSize   () { return this.zoomConst[this.camType].sensorSize  }
    get sensorWidth  () { return this.zoomConst[this.camType].sensorWidth }
    get focalLenMin  () { return this.zoomConst[this.camType].focalLenMin }
    get focalLenMax  () { return this.zoomConst[this.camType].focalLenMax }
    get zoomCurve    () { return this.zoomConst[this.camType].zoomCurve   }

    set fovMinDeg    (v) { this.zoomConst[this.camType].fovMinDeg   = v }
    set fovMaxDeg    (v) { this.zoomConst[this.camType].fovMaxDeg   = v }
    set fovMin       (v) { this.zoomConst[this.camType].fovMin      = v }
    set fovMax       (v) { this.zoomConst[this.camType].fovMax      = v }
    set fovMult      (v) { this.zoomConst[this.camType].fovMult     = v }
    set zoomMin      (v) { this.zoomConst[this.camType].zoomMin     = v }
    set zoomMax      (v) { this.zoomConst[this.camType].zoomMax     = v }
    set zoomLevels   (v) { this.zoomConst[this.camType].zoomLevels  = v }
    set zoomStep     (v) { this.zoomConst[this.camType].zoomStep    = v }
    set sensorSize   (v) { this.zoomConst[this.camType].sensorSize  = v }
    set sensorWidth  (v) { this.zoomConst[this.camType].sensorWidth = v }
    set focalLenMin  (v) { this.zoomConst[this.camType].focalLenMin = v }
    set focalLenMax  (v) { this.zoomConst[this.camType].focalLenMax = v }
    set zoomCurve    (v) { this.zoomConst[this.camType].zoomCurve   = v }

    /*  convert zoom
        from PHYSICAL BirdDog zoom level    (0..20)
        to   VIRTUAL  Babylon field of view (radians of 70.2 to 4.1 degree)
        (Hint: fovMult is currently unused!)  */
    zoomP2V (zoom: number) {
        if (zoom < this.zoomMin) zoom = this.zoomMin
        if (zoom > this.zoomMax) zoom = this.zoomMax

        /*  linear mapping from BirdDog zoom level [0..20] to normalized zoom [0..1]
            (this formula is a standard rule of three)  */
        const x = (zoom - this.zoomMin) / (this.zoomMax - this.zoomMin)

        /*  polynomial mapping from normalized zoom [0..1] to normalized size [0..1]
            (the underlying formula usually has to be determined by a polynomial fitting through measured points)  */
        const y = this.zoomCurve.zoom2size(x)

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
            (the underlying formula usually has to be determined by a polynomial fitting through measured points)  */
        const x = this.zoomCurve.size2zoom(y)

        /*  linear mapping from normalized zoom [0..1] to BirdDog zoom level [0..20]
            (this formula is a standard rule of three)  */
        const zoom = this.zoomMin + (this.zoomMax - this.zoomMin) * x

        return zoom
    }
}

