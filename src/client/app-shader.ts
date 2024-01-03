/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
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

    /*  video stream (with optional opacity, chroma-key, and rounded corners)  */
    static videoStream (name: string, scene: BABYLON.Scene) {
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
                uniform int       chromaEnable;
                uniform float     chromaThreshold;
                uniform float     chromaSmoothing;
                uniform vec3      chromaCol;

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
                    /*  determine current pixel color  */
                    vec4 sampleColVec4 = texture2D(textureSampler, vUV);
                    vec3 sampleCol     = sampleColVec4.rgb;

                    /*  determine optional chroma-key  */
                    float chromaBlend = 1.0;
                    if (chromaEnable != 0) {
                        vec2 sampleColVec  = colVec(rgb4ycc(sampleCol));
                        vec2 chromaColVec  = colVec(rgb4ycc(chromaCol));
                        chromaBlend = smoothstep(
                            chromaThreshold, chromaThreshold + chromaSmoothing,
                            distance(sampleColVec, chromaColVec)
                        );
                    }

                    /*  determine optional rounded corners  */
                    float cornerBlend = 1.0;
                    if (borderRadius > 0.0) {
                        ivec2 size = textureSize(textureSampler, 0);
                        vec2 pos = vec2(vUV.x * float(size.x), vUV.y * float(size.y));
                        float distance = max(max(max(
                            roundedCornerOutsideDistance(pos, vec2(-1.0,  1.0),
                                vec2(0.0 + borderRadius, float(size.y) - borderRadius), borderRadius),
                            roundedCornerOutsideDistance(pos, vec2( 1.0,  1.0),
                                vec2(float(size.x) - borderRadius, float(size.y) - borderRadius), borderRadius)),
                            roundedCornerOutsideDistance(pos, vec2( 1.0, -1.0),
                                vec2(float(size.x) - borderRadius, 0.0 + borderRadius), borderRadius)),
                            roundedCornerOutsideDistance(pos, vec2(-1.0, -1.0),
                                vec2(0.0 + borderRadius, 0.0 + borderRadius), borderRadius));
                        cornerBlend = cornerBlend - smoothstep(0.0f, borderRadiusSoftness, distance);
                    }

                    /*  calculate and apply final color value  */
                    float color = visibility * opacity * chromaBlend * cornerBlend;
                    gl_FragColor = vec4(sampleCol, color);
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
                "chromaEnable",
                "chromaThreshold",
                "chromaSmoothing",
                "chromaCol"
            ],
            samplers: [ "textureSampler" ]
        })
        material.setFloat("visibility", 1.0)
        material.setFloat("opacity", 1.0)
        material.setFloat("borderRadius", 40)
        material.setFloat("bordersRadiusSoftness", 1.0)
        material.setInt("chromaEnable", 0)
        material.setFloat("chromaThreshold", 0.4)
        material.setFloat("chromaSmoothing", 0.1)
        material.setVector3("chromaCol", new BABYLON.Vector3(0.0, 1.0, 0.0))
        return material
    }
}

