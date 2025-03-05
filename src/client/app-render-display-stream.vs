#version 300 es
/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

precision highp float;

in vec3 position;
in vec2 uv;

uniform mat4 worldViewProjection;

out vec2 vUV;

void main (void) {
    gl_Position = worldViewProjection * vec4(position, 1.0);
    vUV = uv;
}

