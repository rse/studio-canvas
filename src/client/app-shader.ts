/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  import external dependencies  */
import * as BABYLON from "@babylonjs/core"

/*  the shader material class  */
export default class ShaderMaterial {
    /*  simple (useless) pass-through shader (just a code template, illustration purposes only)  */
    static passthrough (name: string, scene: BABYLON.Scene) {
        return new BABYLON.ShaderMaterial(name, scene, {
            vertexSource: `
                precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform mat4 worldViewProjection;
                varying vec2 vUV;
                void main (void) {
                    gl_Position = worldViewProjection * vec4(position, 1.0);
                    vUV = uv;
                }
            `,
            fragmentSource: `
                precision highp float;
                varying vec2 vUV;
                uniform sampler2D textureSampler;
                void main (void) {
                    gl_FragColor = texture2D(textureSampler, vUV);
                }
            `
        }, {
            needAlphaBlending: false,
            needAlphaTesting:  false,
            attributes:        [ "position", "uv" ],
            uniforms:          [ "worldViewProjection", "textureSampler" ],
            samplers:          [ "textureSamplers" ]
        })
    }

    /*  display stream (with optional opacity, chroma-key, border cropping, and border radius)  */
    static displayStream (name: string, scene: BABYLON.Scene) {
        const material = new BABYLON.ShaderMaterial(name, scene, {
            vertexSource: `
                precision highp float;

                attribute vec3 position;
                attribute vec2 uv;

                uniform mat4 worldViewProjection;

                varying vec2 vUV;

                void main (void) {
                    gl_Position = worldViewProjection * vec4(position, 1.0);
                    vUV = uv;
                }
            `,
            fragmentSource: `
                precision highp float;

                varying vec2 vUV;

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
                    vec4  sampleColVec4   = texture2D(textureSampler, coordRGB);
                    vec3  sampleCol       = sampleColVec4.rgb;

                    /*  determine current pixel alpha  */
                    float sampleAlpha     = sampleColVec4.a;
                    if (stacks > 0) {
                        vec4 sampleAlphaVec4 = texture2D(textureSampler, coordA);
                        sampleAlpha = 1.0 - sampleAlphaVec4.r
                    }

                    /*  determine position in real texture coordinates  */
                    ivec2 ts  = textureSize(textureSampler, 0);
                    vec2 size = stacks > 0 ? vec2(float(ts.x) / float(stacks), float(ts.y) * 0.5) : vec2(float(ts.x), float(ts.y));
                    vec2 pos  = vec2(vUV.x * size.x, vUV.y * size.y);

                    /*  optionally apply border cropping  */
                    float cropping = (borderCrop > 0.0 && (
                        pos.x < borderCrop || pos.x > (size.x - borderCrop) ||
                        pos.y < borderCrop || pos.y > (size.y - borderCrop)   )) ? 0.0 : 1.0;

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

                    /*  optionally apply rounded corners  */
                    float cornerBlend = 1.0;
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

                    /*  calculate and apply final color value  */
                    sampleAlpha *= visibility * opacity * cropping * chromaKey * cornerBlend;
                    gl_FragColor = vec4(sampleCol, sampleAlpha);
                }
            `
        }, {
            needAlphaBlending: true,
            needAlphaTesting:  false,
            attributes: [ "position", "uv" ],
            uniforms: [
                /*  standard BabylonJS uniforms  */
                "worldViewProjection",

                /*  custom application uniforms  */
                "visibility",
                "textureSampler",
                "opacity",
                "borderRadius",
                "borderRadiusSoftness",
                "borderCrop",
                "chromaEnable",
                "chromaThreshold",
                "chromaSmoothing",
                "stack",
                "stacks",

                /*  custom application uniforms (hard-coded)  */
                "chromaCol"
            ],
            samplers: [ "textureSampler" ]
        })
        material.setFloat("visibility", 1.0)
        material.setFloat("opacity", 1.0)
        material.setFloat("borderRadius", 40)
        material.setFloat("bordersRadiusSoftness", 1.0)
        material.setFloat("borderCrop", 0.0)
        material.setInt("chromaEnable", 0)
        material.setFloat("chromaThreshold", 0.4)
        material.setFloat("chromaSmoothing", 0.1)
        material.setVector3("chromaCol", new BABYLON.Vector3(0.0, 1.0, 0.0))
        material.setInt("stack", 0)
        material.setInt("stacks", 1)
        return material
    }
}

