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

/*  utility function: random value generation  */
float random (vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy, vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

/*  utility function: noise (Morgan McGuire)  */
float noise (vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    /*  four corners in 2D of a tile  */
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    /*  smooth interpolation  */
    vec2 u = f * f * (3.0 - 2.0 * f);

    /*  mix 4 corners porcentages  */
    return mix(a, b, u.x) +
        (c - a) * u.y * (1.0 - u.x) +
        (d - b) * u.x * u.y;
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
    float blend  = step(cutoff, vUV.x);

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
    float blend  = step(cutoff, vUV.x);

    /*  provide blending  */
    return mix(texNew, texOld, blend);
}

/*  transition effect: SLICE (#4)  */
vec4 transition_SLICE (float progress) {
    /*  sample textures  */
    vec4 texOld = textureSampleOld(vUV);
    vec4 texNew = textureSampleNew(vUV);

    /*  calculate the slicing  */
    float chunks = 80.0;
    float smoothness = 0.5;
    float pr = smoothstep(-smoothness, 0.0, vUV.x - progress * (1.0 + smoothness));
    float blend = step(pr, fract(chunks * vUV.x));

    /*  provide blending  */
    return mix(texOld, texNew, blend);
}

/*  transition effect: PERLIN (#5)  */
vec4 transition_PERLIN (float progress) {
    /*  sample textures  */
    vec4 texOld = textureSampleOld(vUV);
    vec4 texNew = textureSampleNew(vUV);

    /*  calculate the perlin effect  */
    float scale = 10.0;
    float smoothness = 0.05;
    float n = noise(vUV * scale);
    float p = mix(-smoothness, 1.0 + smoothness, progress);
    float lower = p - smoothness;
    float higher = p + smoothness;
    float q = smoothstep(lower, higher, n);
    return mix(texOld, texNew, 1.0 - q);
}

/*  transition effect: MORPH (#6)  */
vec4 transition_MORPH (float progress) {
    /*  sample textures  */
    vec4 texOld = textureSampleOld(vUV);
    vec4 texNew = textureSampleNew(vUV);

    /*  calculate the morphing effect  */
    float strength = 0.1;
    vec2 oa = (((texOld.rg + texOld.b) * 0.5) * 2.0 - 1.0);
    vec2 ob = (((texNew.rg + texNew.b) * 0.5) * 2.0 - 1.0);
    vec2 oc = mix(oa, ob, 0.5) * strength;
    float w0 = progress;
    float w1 = 1.0 - w0;
    return mix(
        textureSampleOld(vUV + oc * w0),
        textureSampleNew(vUV - oc * w1),
        progress
    );
}

/*  transition effect: GRID (#7)  */
float gridGetDelta (vec2 p, ivec2 size) {
    vec2 rectanglePos  = floor(vec2(size) * p);
    vec2 rectangleSize = vec2(1.0 / vec2(size).x, 1.0 / vec2(size).y);

    float top    = rectangleSize.y * (rectanglePos.y + 1.0);
    float bottom = rectangleSize.y *  rectanglePos.y;
    float left   = rectangleSize.x *  rectanglePos.x;
    float right  = rectangleSize.x * (rectanglePos.x + 1.0);

    float minX   = min(abs(p.x - left), abs(p.x - right));
    float minY   = min(abs(p.y - top),  abs(p.y - bottom));
    return min(minX, minY);
}
float gridGetDividerSize (ivec2 size, float dividerWidth) {
    vec2 rectangleSize = vec2(1.0 / vec2(size).x, 1.0 / vec2(size).y);
    return min(rectangleSize.x, rectangleSize.y) * dividerWidth;
}
vec4 transition_GRID (float progress) {
    /*  transition effect configuration constants */
    ivec2 size         = ivec2(60, 6);
    float pause        = 0.1;
    float dividerWidth = 0.01;
    vec4  bgcolor      = vec4(0.0, 0.0, 0.0, 1.0);
    float randomness   = 0.1;

    bool inGrid = gridGetDelta(vUV, size) < gridGetDividerSize(size, dividerWidth);
    if (progress < pause) {
        /*  effect before pause  */
        float currentProg = progress / pause;
        float a = 1.0;
        if (inGrid)
            a = 1.0 - currentProg;
        return mix(bgcolor, textureSampleOld(vUV), a);
    }
    else if (progress < 1.0 - pause) {
        /*  main transition effect  */
        if (inGrid)
            return bgcolor;
        else {
            float currentProg = (progress - pause) / (1.0 - pause * 2.0);
            vec2 rectanglePos = floor(vec2(size) * vUV);
            float r = random(rectanglePos) - randomness;
            float cp = smoothstep(0.0, 1.0 - r, currentProg);
            float rectangleSize = 1.0 / vec2(size).x;
            float delta = rectanglePos.x * rectangleSize;
            float offset = rectangleSize / 2.0 + delta;

            vec2 uv = vUV;
            uv.x = (uv.x - offset) / abs(cp - 0.5) * 0.5 + offset;
            vec4 a = textureSampleOld(uv);
            vec4 b = textureSampleNew(uv);

            float s = step(abs(vec2(size).x * (vUV.x - delta) - 0.5), abs(cp - 0.5));
            return mix(bgcolor, mix(b, a, step(cp, 0.5)), s);
        }
    }
    else {
        /*  effect after pause  */
        float currentProg = (progress - 1.0 + pause) / pause;
        float a = 1.0;
        if (inGrid)
            a = currentProg;
        return mix(bgcolor, textureSampleNew(vUV), a);
    }
}

/*  transition effect: RIPPLE (#8)  */
vec4 transition_RIPPLE (float progress) {
    /*  calculate the ripple effect  */
    float amplitude = 100.0;
    float speed = 50.0;
    vec2 dir = vUV - vec2(0.5);
    float dist = length(dir);
    vec2 offset = dir * (sin(progress * dist * amplitude - progress * speed) + 0.5) / 30.0;
    return mix(
        textureSampleOld(vUV + offset),
        textureSampleNew(vUV),
        smoothstep(0.2, 1.0, progress)
    );
}

/*  transition effect: SQUARE (#9)  */
vec4 transition_SQUARE (float progress) {
    /*  sample textures  */
    vec4 texOld = textureSampleOld(vUV);
    vec4 texNew = textureSampleNew(vUV);

    /*  calculate the square effect  */
    ivec2 size = ivec2(60, 11);
    float smoothness = 0.5;
    float r = random(floor(vec2(size) * vUV));
    float m = smoothstep(0.0, -smoothness, r - (progress * (1.0 + smoothness)));
    return mix(texOld, texNew, m);
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
    else if (type == 4) result = transition_SLICE(progress);
    else if (type == 5) result = transition_PERLIN(progress);
    else if (type == 6) result = transition_MORPH(progress);
    else if (type == 7) result = transition_GRID(progress);
    else if (type == 8) result = transition_RIPPLE(progress);
    else if (type == 9) result = transition_SQUARE(progress);
    else                result = vec4(1.0, 0.0, 0.0, 1.0);

    /*  provide fragment shader result  */
    gl_FragColor = result;
}
