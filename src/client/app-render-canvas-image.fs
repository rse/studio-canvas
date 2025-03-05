#version 300 es
/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

precision highp float;

in vec2 vUV;

uniform sampler2D texture1;
uniform sampler2D texture2;
uniform float     fade;

out vec4 FragColor;

void main (void) {
    /*  sample textures  */
    vec4 t1 = texture(texture1, vUV);
    vec4 t2 = texture(texture2, vUV);

    /*  fade between textures  */
    vec3 t  = mix(t1.rgb, t2.rgb, fade);
    FragColor = vec4(t, 1.0);
}
