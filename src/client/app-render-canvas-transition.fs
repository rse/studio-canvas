/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

precision highp float;

/*  the UV-coordinates from the standard "procedural" vertex shader of BabylonJS  */
varying vec2 vUV;

/*  the parameters provides by us  */
uniform int       type;     /* the type of transition effect */
uniform sampler2D texture1; /* the texture #1 for the transition effect */
uniform sampler2D texture2; /* the texture #2 for the transition effect */
uniform float     slider;   /* the transition slider (0 = 100% texture #1, 1 = 100% texture #2) */
uniform int       reverse;  /* the indicator whether the sliders goes 1..0 instead of 0..1 */

/*  utility function: determine logical transition progress  */
float slider2progress (float s) {
    if (reverse == 0) return s;
    else              return 1.0 - s;
}

/*  utility function: determine old texture sample  */
vec4 textureSampleOld (vec2 uv) {
    if (reverse == 0) return texture2D(texture1, uv);
    else              return texture2D(texture2, uv);
}

/*  utility function: determine new texture sample  */
vec4 textureSampleNew (vec2 uv) {
    if (reverse == 0) return texture2D(texture2, uv);
    else              return texture2D(texture1, uv);
}

/*  transition effect: FADE (#1)  */
vec4 transition_FADE (float progress) {
    /*  sample textures  */
    vec4 texOld = textureSampleOld(vUV);
    vec4 texNew = textureSampleNew(vUV);

    /*  fade between textures  */
    vec3 t = mix(texOld.rgb, texNew.rgb, progress);
    return vec4(t, 1.0);
}

/*  transition effect: SLIDE-L (#2)  */
vec4 transition_SLIDE_L (float progress) {
    /*  place textures side-by-side and shift their content to the left  */
    vec2 uvOld = vUV + vec2(progress, 0.0);
    vec2 uvNew = vUV + vec2(-1.0 + progress, 0.0);

    /*  sample both textures with the adjusted coordinates  */
    vec4 texOld = textureSampleOld(uvOld);
    vec4 texNew = textureSampleNew(uvNew);

    /*  define a moving cutoff with a smooth blend margin  */
    float cutoff = 1.0 - progress;
    float margin = 0.00;
    float blend  = smoothstep(cutoff - margin, cutoff + margin, vUV.x);

    /*  provide blending  */
    return mix(texOld, texNew, blend);
}

/*  transition effect: SLIDE-R (#3)  */
vec4 transition_SLIDE_R (float progress) {
    /*  place textures side-by-side and shift their content to the right  */
    vec2 uvOld = vUV + vec2(-progress, 0.0);
    vec2 uvNew = vUV + vec2(1.0 - progress, 0.0);

    /*  sample both textures with the adjusted coordinates  */
    vec4 texOld = textureSampleOld(uvOld);
    vec4 texNew = textureSampleNew(uvNew);

    /*  define a moving cutoff with a smooth blend margin  */
    float cutoff = progress;
    float margin = 0.00;
    float blend  = smoothstep(cutoff - margin, cutoff + margin, vUV.x);

    /*  provide blending  */
    return mix(texNew, texOld, blend);
}

/*  fragment shader main function  */
void main (void) {
    /*  determine logical progress from slider  */
    float progress = slider2progress(slider);

    /*  dispatch according to transition type  */
    vec4 result;
    if      (type == 1) result = transition_FADE(progress);
    else if (type == 2) result = transition_SLIDE_L(progress);
    else if (type == 3) result = transition_SLIDE_R(progress);
    else                result = vec4(1.0, 0.0, 0.0, 1.0);

    /*  provide fragment shader result  */
    gl_FragColor = result;
}
