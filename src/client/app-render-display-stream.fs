#version 300 es
/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

precision highp float;

in vec2 vUV;

uniform sampler2D textureSampler;
uniform float     visibility;
uniform float     opacity;
uniform float     borderRadius;
uniform float     borderRadiusSoftness;
uniform float     borderCrop;
uniform int       chromaEnable;
uniform float     chromaThreshold;
uniform float     chromaSmoothing;
uniform vec3      chromaCol;
uniform int       stack;
uniform int       stacks;
uniform int       stackAlphaInvert;

out vec4 FragColor;

vec3 rgb4ycc (vec3 col) {
    float Y  = 0.2989 * col.r + 0.5866 * col.g + 0.1145 * col.b;
    float Cr = 0.7132 * (col.r - Y);
    float Cb = 0.5647 * (col.b - Y);
    return vec3(Y, Cr, Cb);
}

vec2 colVec (vec3 col) {
    return vec2(col[1], col[2]);
}

float roundedCornerOutsideDistance (vec2 point, vec2 quadrant, vec2 center, float radius) {
    vec2 vec = point - center;
    if (!(sign(vec.x) == sign(quadrant.x) && sign(vec.y) == sign(quadrant.y)))
        return 0.0;
    else
        return max(length(vec) - radius, 0.0);
}

void main (void) {
    /*  determine current pixel coordinates  */
    vec2 coordRGB;
    vec2 coordA;
    if (stacks > 0) {
        coordRGB = vec2((float(stack) / float(stacks)) + (vUV.x / float(stacks)), vUV.y * 0.5);
        coordA   = vec2((float(stack) / float(stacks)) + (vUV.x / float(stacks)), 0.5 + vUV.y * 0.5);
    }
    else {
        coordRGB = vUV;
        coordA   = vUV;
    }

    /*  determine current pixel color  */
    vec4 sampleColVec4 = texture(textureSampler, coordRGB);
    vec3 sampleCol     = sampleColVec4.rgb;

    /*  determine current pixel alpha  */
    float sampleAlpha = sampleColVec4.a;
    if (stacks > 0) {
        vec4 sampleAlphaVec4 = texture(textureSampler, coordA);
        sampleAlpha = sampleAlphaVec4.r;
        if (stackAlphaInvert == 1)
            sampleAlpha = 1.0 - sampleAlpha;
    }

    /*  optionally apply chroma-key  */
    float chromaKey = 1.0;
    if (chromaEnable == 1) {
        vec2 sampleColVec  = colVec(rgb4ycc(sampleCol));
        vec2 chromaColVec  = colVec(rgb4ycc(chromaCol));
        chromaKey = smoothstep(
            chromaThreshold, chromaThreshold + chromaSmoothing,
            distance(sampleColVec, chromaColVec)
        );
        if (chromaKey < 0.95)
            sampleCol.g = 0.0;
    }

    /*  optional border cropping and rounded corners support  */
    float cropping    = 1.0;
    float cornerBlend = 1.0;
    if (borderCrop > 0.0 || borderRadius > 0.0) {
        /*  determine position in real texture coordinates  */
        ivec2 ts  = textureSize(textureSampler, 0);
        vec2 size = stacks > 0 ? vec2(float(ts.x) / float(stacks), float(ts.y) * 0.5) : vec2(float(ts.x), float(ts.y));
        vec2 pos  = vec2(vUV.x * size.x, vUV.y * size.y);

        /*  optionally apply border cropping  */
        cropping = (borderCrop > 0.0 && (
            pos.x < borderCrop || pos.x > (size.x - borderCrop) ||
            pos.y < borderCrop || pos.y > (size.y - borderCrop)   )) ? 0.0 : 1.0;

        /*  optionally apply rounded corners  */
        if (borderRadius > 0.0) {
            float distance = max(max(max(
                roundedCornerOutsideDistance(pos, vec2(-1.0,  1.0),
                    vec2(0.0    + borderRadius, size.y - borderRadius), borderRadius),
                roundedCornerOutsideDistance(pos, vec2( 1.0,  1.0),
                    vec2(size.x - borderRadius, size.y - borderRadius), borderRadius)),
                roundedCornerOutsideDistance(pos, vec2( 1.0, -1.0),
                    vec2(size.x - borderRadius, 0.0    + borderRadius), borderRadius)),
                roundedCornerOutsideDistance(pos, vec2(-1.0, -1.0),
                    vec2(0.0    + borderRadius, 0.0    + borderRadius), borderRadius));
            cornerBlend = cornerBlend - smoothstep(0.0f, borderRadiusSoftness, distance);
        }
    }

    /*  calculate and apply final color value  */
    sampleAlpha *= visibility * opacity * chromaKey * cropping * cornerBlend;
    FragColor = vec4(sampleCol, sampleAlpha);
}

