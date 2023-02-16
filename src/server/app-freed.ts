/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import { FreeDState } from "./app-freed-state"

const parseSignedInt = (ab: Uint8Array, offset: number) => {
    const val = (ab[offset] << 16) | (ab[offset + 1] << 8) | ab[offset + 2]
    const sign = (2 ** (24 - 1))
    const mask = sign - 1
    return (val & sign) === 0 ? val : -((~(val - 1) & mask) >>> 0)
}

export class FreeD {
    static parsePacket (packet: Buffer): FreeDState {
        const ab = Uint8Array.from(packet)
        if (ab.length !== 29)
            throw new Error("invalid packet length")
        if (ab[0] !== 0xD1)
            throw new Error("unknown packet type")

        /*  https://www.manualsdir.com/manuals/641433/vinten-radamec-free-d.html?download
            A.3.2 Type D1 - camera position/orientation data
            Appendix B, Camera positioning parameters  */

        const id = ab[1]

        /*  "A set of orthogonal right-handed axes (X, Y and Z) is used, fixed with respect
            to the reference frame of the studio. The X and Y axes lie in the horizontal
            plane, and the Z axis is vertical. The positive direction of the Z-axis is
            upwards."

            "The Camera Pan Angle is defined as the angle between the Y-axis and the
            projection of the optical axis of the camera onto the horizontal (XY) plane. A
            zero value corresponds to the camera looking in the positive Y direction and a
            positive value indicates a pan to the right (ie, the camera rotates clockwise
            when viewed from above)."

            "The Camera Tilt Angle is defined as the angle between the optical axis of the
            camera and the horizontal (XY) plane. A positive value indicates an upwards
            tilt. If the pan and tilt angles are both zero, the camera is looking in the
            direction of the positive Y axis."

            "The Camera Roll Angle is defined as the angle of rotation of the camera about
            its optical axis. A roll angle of zero corresponds to a ‘scan line’ of the camera
            sensor (ie, a horizontal in the image) being parallel to the horizontal (XY)
            plane. A positive value indicates a clockwise roll, when viewed from behind
            the camera."

            Pan/tilt/roll values are "expressed in degrees as a 24-bit twos-complement
            signed number, where the most-significant bit (bit 23) is the sign bit, the
            next 8 bits (bits 22 to 15) are the integer part and the remaining bits
            (bits 14 to 0) are the fractional part; alternatively, this may be thought
            of as a signed integer value in units of 1/32768 degree. The range of
            values is from -180.0 degrees (A60000 hex) to +180.0 degrees (5A0000 hex)."  */
        const pan  = parseSignedInt(ab, 2) / 32768
        const tilt = parseSignedInt(ab, 5) / 32768
        const roll = parseSignedInt(ab, 8) / 32768

        /*  "The Camera X-Position is defined as the horizontal displacement of the
            camera from its reference position in the direction of the X-axis.
            The Camera Y-Position is defined as the horizontal displacement of the
            camera from its reference position in the direction of the Y-axis.
            The Camera Height is defined as the vertical displacement of the camera from
            its reference position. A positive value indicates an upwards displacement."

            The values are "expressed in millimeters as a 24-bit twos-complement signed
            number, where the most-significant bit (bit 23) is the sign bit, the next 17 bits
            (bits 22 to 6) are the integer part and the remaining bits (bits 5 to 0) are the
            fractional part; alternatively, this may be thought of as a signed integer value in
            units of 1/64 mm. The range of values is from -131,072.0 mm (800000 hex) to
            nearly +131,072.0 mm (7FFFFF hex)."  */
        const x = parseSignedInt(ab, 11) / 64
        const y = parseSignedInt(ab, 14) / 64
        const z = parseSignedInt(ab, 17) / 64

        /*  "The Camera Zoom is defined as the vertical angle of view of the camera; ie,
            the vertical angle subtended at the camera lens by the top and bottom edges
            of the active picture. The value is expressed as a 24-bit positive unsigned
            number in arbitrary units related to the rotation of the ‘zoom ring’ on the
            camera lens. It will be necessary for the host system to convert this to a
            true zoom value based on the type and particular sample of lens and camera
            in use" Birddog P400 shows values from 0...16384 and has 20x zoom.  */
        const zoom = parseSignedInt(ab, 20) / (16384 / 20)

        /*  "The Camera Focus is defined as the distance between the camera lens and
            an object at which the object will be in sharp focus. The value is expressed as
            a 24-bit positive unsigned number in arbitrary units related to the rotation of
            the ‘focus ring’ on the camera lens. It will be necessary for the host system to
            convert this to a true focus value based on the type and particular sample of
            lens and camera in use."  */
        const focus = parseSignedInt(ab, 23)

        /*  spare bytes  */
        const spare1 = ab[26]
        const spare2 = ab[27]

        /*  checksum  */
        const checksum = ab[28]
        let cs = 40
        for (let i = 0; i < ab.length - 1; i++)
            cs = (cs - ab[i]) % 256
        // FIXME: compare checksum with cs

        return { id, pan, tilt, roll, x, y, z, zoom, focus, spare1, spare2, checksum } as FreeDState
    }
}

