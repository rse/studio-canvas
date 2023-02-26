<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-control">
        <div class="head">
            CANVAS SCENE CONTROL
            <div class="stats">
                <span class="icon"><i class="fa fa-video"></i></span>
                <span class="figure">{{ stats.peers.camera }}</span>
                <span class="icon"><i class="fa fa-image"></i></span>
                <span class="figure">{{ stats.peers.render }}</span>
                <span class="icon"><i class="fa fa-gear"></i></span>
                <span class="figure">{{ stats.peers.control }}</span>
            </div>
        </div>
        <div class="body">
            <tabs ref="tabs" v-bind:options="{ useUrlFragment: false, defaultTabHash: tab }" v-bind:cache-lifetime="0" class="tabs-level-1" v-on:changed="tabChanged">
                <tab id="presets" name="Presets">
                    <div class="desc">
                        The <b>Presets</b> can be used to load and save the entire &mdash; or just the partial &mdash;
                        current canvas scence control state from or to pre-defined and persisted slots.
                        When loading a partial state from a preset slot, the partial state is merged
                        into the current state.
                    </div>
                    <div class="presets">
                        <div class="slots">
                            <div class="button" v-bind:class="{ selected: preset.slot === 1 }"
                                v-on:click="preset.slot = 1">
                                1
                                <div class="badge" v-bind:class="presetStatus2Class(0)">{{ preset.status[0] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 2 }"
                                v-on:click="preset.slot = 2">
                                2
                                <div class="badge" v-bind:class="presetStatus2Class(1)">{{ preset.status[1] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 3 }"
                                v-on:click="preset.slot = 3">
                                3
                                <div class="badge" v-bind:class="presetStatus2Class(2)">{{ preset.status[2] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 4 }"
                                v-on:click="preset.slot = 4">
                                4
                                <div class="badge" v-bind:class="presetStatus2Class(3)">{{ preset.status[3] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 5 }"
                                v-on:click="preset.slot = 5">
                                5
                                <div class="badge" v-bind:class="presetStatus2Class(4)">{{ preset.status[4] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 6 }"
                                v-on:click="preset.slot = 6">
                                6
                                <div class="badge" v-bind:class="presetStatus2Class(5)">{{ preset.status[5] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 7 }"
                                v-on:click="preset.slot = 7">
                                7
                                <div class="badge" v-bind:class="presetStatus2Class(6)">{{ preset.status[6] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 8 }"
                                v-on:click="preset.slot = 8">
                                8
                                <div class="badge" v-bind:class="presetStatus2Class(7)">{{ preset.status[7] }}</div>
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.slot === 9 }"
                                v-on:click="preset.slot = 9">
                                9
                                <div class="badge" v-bind:class="presetStatus2Class(8)">{{ preset.status[8] }}</div>
                            </div>
                        </div>
                        <div class="actions1">
                            <div class="button destructive" v-on:click="presetLoad">LOAD</div>
                            <div class="button destructive" v-on:click="presetClear">CLEAR</div>
                        </div>
                        <div class="actions2">
                            <div class="button destructive" v-on:click="presetSave">SAVE</div>
                        </div>
                        <div class="filter">
                            <div class="button" v-bind:class="{ selected: preset.filters.canvas }"
                                v-on:click="preset.filters.canvas = !preset.filters.canvas">
                                Canvas
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.monitor }"
                                v-on:click="preset.filters.monitor = !preset.filters.monitor">
                                Monitor
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.decal }"
                                v-on:click="preset.filters.decal = !preset.filters.decal">
                                Decal
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.lights }"
                                v-on:click="preset.filters.lights = !preset.filters.lights">
                                Lights
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.references }"
                                v-on:click="preset.filters.references = !preset.filters.references">
                                References
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.CAM1 }"
                                v-on:click="preset.filters.CAM1 = !preset.filters.CAM1">
                                CAM1
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.CAM2 }"
                                v-on:click="preset.filters.CAM2 = !preset.filters.CAM2">
                                CAM2
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.CAM3 }"
                                v-on:click="preset.filters.CAM3 = !preset.filters.CAM3">
                                CAM3
                            </div>
                            <div class="button" v-bind:class="{ selected: preset.filters.CAM4 }"
                                v-on:click="preset.filters.CAM4 = !preset.filters.CAM4">
                                CAM4
                            </div>
                        </div>
                        <div class="actions3">
                            <div class="button destructive" v-on:click="presetFiltersSelect(false)">NONE</div>
                            <div class="button destructive" v-on:click="presetFiltersSelect(true)">ALL</div>
                        </div>
                    </div>
                </tab>
                <tab id="canvas" name="Canvas">
                    <div class="desc">
                        The <b>Canvas</b> is the background image projected onto the chroma-keyed
                         greenscreen of the scene.
                        It can be either based on a single image for rendering a static canvas,
                        or it can be two images providing a dynamic canvas through a cross-fade effect (indicated by the tag "FADE").
                        Some canvas are exclusively designed for particular events (indicated by the tag "EXCL")
                        and hence should be not used for arbitrary other types of events. The image
                        have to be 10542x3570 pixels in size to provide a decent rendering even
                        in 4K resolutions and with Full-HD crop-outs.
                    </div>
                    <div class="list" ref="list">
                        <div
                            v-for="(entry, i) in imageList"
                            class="list-entry"
                            v-bind:class="{ selected: entry.id === state.canvas.id, alt: i % 2 == 1 }"
                            v-bind:key="entry.id!"
                            v-on:click="selectImage(entry.id!)"
                        >
                            <div class="name">{{ entry.name }}</div>
                            <div class="tags">
                                <div v-show="entry.texture2" class="tag tag-fade">FADE</div>
                                <div v-show="entry.exclusive" class="tag tag-exclusive">EXCL</div>
                            </div>
                        </div>
                    </div>
                </tab>
                <tab id="monitor" name="Monitor">
                    <div class="desc">
                        The <b>Monitor</b> is the optional TV-style monitor which can be shown
                        in the scene. It can be given a particular input video source device,
                        scaled in size, and positioned on in a radial way in the scene.
                    </div>
                    <div class="control">
                        <div class="label1">enable</div>
                        <div class="label2">(visible)</div>
                        <div class="label3">[flag]:</div>
                        <div class="value">
                            <div class="fixed">{{ state.monitor.enable ? "YES" : "NO" }}</div>
                        </div>
                        <div class="button" v-on:click="state.monitor.enable = false">RESET</div>
                        <div class="slider">
                            <toggle class="toggle" v-model="state.monitor.enable"></toggle>
                        </div>

                        <div class="label1">video</div>
                        <div class="label2">(device)</div>
                        <div class="label3">[id]:</div>
                        <div class="value">
                            <div class="fixed">*</div>
                        </div>
                        <div class="button" v-on:click="state.monitor.device = ''">RESET</div>
                        <div class="slider">
                            <input class="text" v-model.lazy="state.monitor.device"/>
                        </div>

                        <div class="label1">scale</div>
                        <div class="label2">(resize)</div>
                        <div class="label3">[mult]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.monitor.scale)"
                                v-on:change="(ev) => state.monitor.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 2.2)"/>
                        </div>
                        <div class="button" v-on:click="state.monitor.scale = 1.0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.monitor.scale"
                                v-bind:min="0.1" v-bind:max="2.2" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">rotate</div>
                        <div class="label2">(pan left/right)</div>
                        <div class="label3">[deg]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.monitor.rotate)"
                                v-on:change="(ev) => state.monitor.rotate = fieldImport((ev.target! as HTMLInputElement).value, -45, +35)"/>
                        </div>
                        <div class="button" v-on:click="state.monitor.rotate = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.monitor.rotate"
                                v-bind:min="-45" v-bind:max="+35" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">lift</div>
                        <div class="label2">(shift down/up)</div>
                        <div class="label3">[cm]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.monitor.lift)"
                                v-on:change="(ev) => state.monitor.lift = fieldImport((ev.target! as HTMLInputElement).value, -150, +150)"/>
                        </div>
                        <div class="button" v-on:click="state.monitor.lift = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.monitor.lift"
                                v-bind:min="-150" v-bind:max="+150" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>
                    </div>
                </tab>
                <tab id="decal" name="Decal">
                    <div class="desc">
                        The <b>Decal</b> is the optional poster-style display which can be projected
                        onto the canvas. It can be given a particular input video source device,
                        scaled in size, positioned in a radial way on the canvas and opacity-controlled.
                    </div>
                    <div class="control">
                        <div class="label1">enable</div>
                        <div class="label2">(visible)</div>
                        <div class="label3">[flag]:</div>
                        <div class="value">
                            <div class="fixed">{{ state.decal.enable ? "YES" : "NO" }}</div>
                        </div>
                        <div class="button" v-on:click="state.decal.enable = false">RESET</div>
                        <div class="slider">
                            <toggle class="toggle" v-model="state.decal.enable"></toggle>
                        </div>

                        <div class="label1">video</div>
                        <div class="label2">(device)</div>
                        <div class="label3">[id]:</div>
                        <div class="value">
                            <div class="fixed">*</div>
                        </div>
                        <div class="button" v-on:click="state.decal.device = ''">RESET</div>
                        <div class="slider">
                            <input class="text" v-model.lazy="state.decal.device"/>
                        </div>

                        <div class="label1">scale</div>
                        <div class="label2">(resize)</div>
                        <div class="label3">[mult]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.decal.scale)"
                                v-on:change="(ev) => state.decal.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 3.0)"/>
                        </div>
                        <div class="button" v-on:click="state.decal.scale = 1.0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.decal.scale"
                                v-bind:min="0.1" v-bind:max="3.0" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">rotate</div>
                        <div class="label2">(pan left/right)</div>
                        <div class="label3">[deg]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.decal.rotate)"
                                v-on:change="(ev) => state.decal.rotate = fieldImport((ev.target! as HTMLInputElement).value, -45, +45)"/>
                        </div>
                        <div class="button" v-on:click="state.decal.rotate = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.decal.rotate"
                                v-bind:min="-45" v-bind:max="+45" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">lift</div>
                        <div class="label2">(tilt down/up)</div>
                        <div class="label3">[deg]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.decal.lift)"
                                v-on:change="(ev) => state.decal.lift = fieldImport((ev.target! as HTMLInputElement).value, -15, +10)"/>
                        </div>
                        <div class="button" v-on:click="state.decal.lift = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.decal.lift"
                                v-bind:min="-15" v-bind:max="+10" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">opacity</div>
                        <div class="label2">(less/more)</div>
                        <div class="label3">[percent]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.decal.opacity)"
                                v-on:change="(ev) => state.decal.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                        </div>
                        <div class="button" v-on:click="state.decal.opacity = 1.0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.decal.opacity"
                                v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>
                    </div>
                </tab>
                <tab id="lights" name="Lights">
                    <div class="desc">
                        The <b>Lights</b> are the three optional additional point lights in the scene,
                        which can further light up the scene and especially produce a shadow of
                        the monitor on the canvas.
                    </div>
                    <div class="control">
                        <div class="label1">intensity1</div>
                        <div class="label2">(less/more)</div>
                        <div class="label3">[lum]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity1, 0)"
                                v-on:change="(ev) => state.lights.intensity1 = fieldImport((ev.target! as HTMLInputElement).value, 0, 200)"/>
                        </div>
                        <div class="button" v-on:click="state.lights.intensity1 = 100">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.lights.intensity1"
                                v-bind:min="0" v-bind:max="200" v-bind:step="1"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(0)"
                            ></slider>
                        </div>

                        <div class="label1">intensity2</div>
                        <div class="label2">(less/more)</div>
                        <div class="label3">[lum]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity2, 0)"
                                v-on:change="(ev) => state.lights.intensity2 = fieldImport((ev.target! as HTMLInputElement).value, 0, 200)"/>
                        </div>
                        <div class="button" v-on:click="state.lights.intensity2 = 100">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.lights.intensity2"
                                v-bind:min="0" v-bind:max="200" v-bind:step="1"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(0)"
                            ></slider>
                        </div>

                        <div class="label1">intensity3</div>
                        <div class="label2">(less/more)</div>
                        <div class="label3">[lum]:</div>
                        <div class="value">
                            <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity3, 0)"
                                v-on:change="(ev) => state.lights.intensity3 = fieldImport((ev.target! as HTMLInputElement).value, 0, 200)"/>
                        </div>
                        <div class="button" v-on:click="state.lights.intensity3 = 100">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="state.lights.intensity3"
                                v-bind:min="0" v-bind:max="200" v-bind:step="1"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(0)"
                            ></slider>
                        </div>
                    </div>
                </tab>
                <tab name="References">
                    <div class="desc">
                        The <b>References</b> are the optional red balls in the scence
                        which can help calibrating the virtual cameras against the physical
                        camera viewpoint. If calibrated correctly, the virtual balls should
                        match as close as possible with the physical red markers in the scene.
                    </div>
                    <div class="control">
                        <div class="label1">enable</div>
                        <div class="label2">(visible)</div>
                        <div class="label3">[flag]:</div>
                        <div class="value">
                            <div class="fixed">{{  state.references.enable ? "YES" : "NO" }}</div>
                        </div>
                        <div class="button" v-on:click="state.references.enable = false">RESET</div>
                        <div class="slider">
                            <toggle class="toggle" v-model="state.references.enable"></toggle>
                        </div>
                    </div>
                </tab>
                <tab v-for="cam in [ 'CAM1', 'CAM2', 'CAM3', 'CAM4' ]" v-bind:key="cam" v-bind:id="cam.toLowerCase()" v-bind:name="cam">
                    <div class="desc">
                        The <b>{{ cam }}</b> is the digital twin of the physical
                        camera named "{{ cam }}". It has to be calibrated to match as close
                        as possible to the physical viewpoint of the camera in order
                        to allow precise pan/tilt/zoom (PTZ) of both the physical camera via NDI
                        and PTZ of the virtual camera via FreeD.
                    </div>
                    <div class="control">
                        <div class="label1">X-position</div>
                        <div class="label2">(shift left/right)</div>
                        <div class="label3">[cm]:</div>
                        <div class="value">
                            <input tabindex="1" v-bind:value="fieldExport((state as any)[cam].position.x)"
                                v-on:change="(ev) => (state as any)[cam].position.x = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                        </div>
                        <div class="button" v-on:click="(state as any)[cam].position.x = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="(state as any)[cam].position.x"
                                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">Y-position</div>
                        <div class="label2">(shift down/up)</div>
                        <div class="label3">[cm]:</div>
                        <div class="value">
                            <input tabindex="2" v-bind:value="fieldExport((state as any)[cam].position.y)"
                                v-on:change="(ev) => (state as any)[cam].position.y = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                        </div>
                        <div class="button" v-on:click="(state as any)[cam].position.y = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="(state as any)[cam].position.y"
                                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">Z-position</div>
                        <div class="label2">(shift fwd/bwd)</div>
                        <div class="label3">[cm]:</div>
                        <div class="value">
                            <input tabindex="3" v-bind:value="fieldExport((state as any)[cam].position.z)"
                                v-on:change="(ev) => (state as any)[cam].position.z = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                        </div>
                        <div class="button" v-on:click="(state as any)[cam].position.z = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="(state as any)[cam].position.z"
                                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">X-rotate</div>
                        <div class="label2">(tilt up/down)</div>
                        <div class="label3">[deg]:</div>
                        <div class="value">
                            <input tabindex="4" v-bind:value="fieldExport((state as any)[cam].rotation.x)"
                                v-on:change="(ev) => (state as any)[cam].rotation.x = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                        </div>
                        <div class="button" v-on:click="(state as any)[cam].rotation.x = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="(state as any)[cam].rotation.x"
                                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">Y-rotate</div>
                        <div class="label2">(pan right/left)</div>
                        <div class="label3">[deg]:</div>
                        <div class="value">
                            <input tabindex="5" v-bind:value="fieldExport((state as any)[cam].rotation.y)"
                                v-on:change="(ev) => (state as any)[cam].rotation.y = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                        </div>
                        <div class="button" v-on:click="(state as any)[cam].rotation.y = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="(state as any)[cam].rotation.y"
                                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">Z-rotate</div>
                        <div class="label2">(rotate left/right)</div>
                        <div class="label3">[deg]:</div>
                        <div class="value">
                            <input tabindex="6" v-bind:value="fieldExport((state as any)[cam].rotation.z)"
                                v-on:change="(ev) => (state as any)[cam].rotation.z = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                        </div>
                        <div class="button" v-on:click="(state as any)[cam].rotation.z = 0">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="(state as any)[cam].rotation.z"
                                v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>

                        <div class="label1">FOV</div>
                        <div class="label2">(zoom)</div>
                        <div class="label3">[mult]:</div>
                        <div class="value">
                            <input tabindex="7" v-bind:value="fieldExport((state as any)[cam].fov.m)"
                                v-on:change="(ev) => (state as any)[cam].fov.m = fieldImport((ev.target! as HTMLInputElement).value, 0, +4)"/>
                        </div>
                        <div class="button" v-on:click="(state as any)[cam].fov.m = 1">RESET</div>
                        <div class="slider">
                            <slider class="slider" v-model="(state as any)[cam].fov.m"
                                v-bind:min="0" v-bind:max="+4" v-bind:step="0.01"
                                show-tooltip="drag" v-bind:format="(v: number) => v.toFixed(2)"
                            ></slider>
                        </div>
                    </div>
                </tab>
                <tab id="preview" name="Preview" class="preview">
                    <div class="desc">
                        The <b>Preview</b> is a sneak preview of the rendered camera view
                        within the BabylonJS game engine. It is exactly the same content intended
                        to be loaded into the vMix Browser input and allows one to preview the scene
                        in the browser here, too. The camera view can be optionally controlled
                        by reflecting the FreeD information from the physical camera
                        or being interactively adjusted by cursor keys.
                    </div>
                    <div class="preview-url" v-on:click="previewCopy()">
                        {{ preview.url }}
                    </div>
                    <div class="preview-control">
                        <div class="cams">
                            <div class="button" v-on:click="preview.opts.cam = 'CAM1'"
                                v-bind:class="{ selected: preview.opts.cam === 'CAM1' }">
                                CAM1
                            </div>
                            <div class="button" v-on:click="preview.opts.cam = 'CAM2'"
                                v-bind:class="{ selected: preview.opts.cam === 'CAM2' }">
                                CAM2
                            </div>
                            <div class="button" v-on:click="preview.opts.cam = 'CAM3'"
                                v-bind:class="{ selected: preview.opts.cam === 'CAM3' }">
                                CAM3
                            </div>
                            <div class="button" v-on:click="preview.opts.cam = 'CAM4'"
                                v-bind:class="{ selected: preview.opts.cam === 'CAM4' }">
                                CAM4
                            </div>
                        </div>
                        <div class="flags">
                            <div class="flag">
                                <div class="fixed">Enable FreeD</div>
                                <toggle class="toggle" v-model="preview.opts.freed"></toggle>
                            </div>
                            <div class="flag">
                                <div class="fixed">Enable Keys</div>
                                <toggle class="toggle" v-model="preview.opts.keys"></toggle>
                            </div>
                        </div>
                        <div class="action">
                            <div class="button" v-on:click="previewOpen()">OPEN</div>
                            <div class="button" v-on:click="previewCopy()">COPY</div>
                        </div>
                    </div>
                </tab>
            </tabs>
        </div>
        <div class="foot" v-bind:class="{
            error:   status.kind === 'error',
            warning: status.kind === 'warning',
            info:    status.kind === 'info'
        }">
            {{ status.kind === '' ? `${pkg.name} ${pkg.version} (${pkg["x-date"]})` : status.msg }}
        </div>
    </div>
</template>

<style lang="stylus">
.app-control
    width:  100vw
    height: 100vh
    overflow: hidden
    margin: 0
    padding: 0
    display: flex
    flex-direction: column
    justify-items: center
    align-items: center
    .head
        background-color: var(--color-std-bg-3)
        color: var(--color-std-fg-1)
        padding: 10px 40px
        width:  calc(100% - 2 * 40px)
        height: 20px
        font-weight: 200
        font-size: 20px
        line-height: 20px
        position: relative
        .stats
            border: 1px solid var(--color-std-bg-2)
            position: absolute
            right: 40px
            top: 8px
            font-size: 12pt
            font-weight: normal
            border-radius: 4px
            padding: 2px 8px 2px 8px
            .icon
                color: var(--color-std-fg-1)
                margin-right: 8px;
            .figure
                color: var(--color-std-fg-5)
                margin-right: 16px;
    .body
        flex-grow: 1
        background-color: var(--color-std-bg-2)
        color: var(--color-std-fg-5)
        padding: 10px 10px
        width:  calc(100% - 2 * 10px)
        height: calc(100% - 2 * 10px)
        overflow: hidden
    .foot
        background-color: var(--color-std-bg-3)
        color: var(--color-std-fg-1)
        padding: 13px 40px
        width:  calc(100% - 2 * 40px)
        height: 14px
        font-weight: 200
        font-size: 14px
        line-height: 14px
        &.info
            font-weight: normal
            background-color: var(--color-std-bg-5)
            color: var(--color-std-fg-5)
        &.warning
            font-weight: bold
            background-color: var(--color-acc-bg-3)
            color: var(--color-acc-fg-5)
        &.error
            font-weight: bold
            background-color: var(--color-sig-bg-3)
            color: var(--color-sig-fg-5)
    .tabs-component
        height: 100%
        display: flex
        flex-direction: column
        justify-items: flex-start
        align-items: flex-start
    .tabs-component-panels
        flex-grow: 1
        display: flex
        flex-direction: column
        justify-items: flex-start
        align-items: flex-start
    .tabs-component-panel
        flex-grow: 1
        display: flex
        flex-direction: column
        justify-items: flex-start
        align-items: flex-start
    .desc
        font-weight: 200
        color: var(--color-std-fg-3)
        margin-bottom: 20px
    .presets
        display: flex
        flex-direction: row
        justify-items: flex-start
        align-items: center
        .slots
            margin-right: 20px
            display: grid
            grid-template-columns: 70px 70px 70px
            grid-template-rows: 50px 50px 50px
            justify-items: center
            align-items: center
            gap: 10px 10px
        .actions1,
        .actions3
            display: grid
            grid-template-columns: 100px
            grid-template-rows: 80px 80px
            justify-items: center
            align-items: center
            gap: 10px 10px
        .actions1
            margin-right: 10px
        .actions2
            margin-right: 20px
        .filter
            margin-right: 10px
            display: grid
            grid-template-columns: 100px 100px 100px
            grid-template-rows: 50px 50px 50px
            justify-items: center
            align-items: center
            gap: 10px 10px
        .actions2
            display: grid
            grid-template-columns: 100px
            grid-template-rows: 170px
            justify-items: center
            align-items: center
            gap: 10px 10px
        .button
            background-color: var(--color-std-bg-3)
            color: var(--color-std-fg-5)
            border-radius: 4px
            padding: 2px 8px 2px 8px
            text-align: center
            font-size: 12pt
            line-height: 50px
            width: calc(100% - 2 * 8px)
            height: calc(100% - 2 * 2px)
            position: relative
            &.selected
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
            &.destructive:hover
                background-color: var(--color-sig-bg-3)
                color: var(--color-sig-fg-5)
            .badge
                position: absolute
                right: -2px
                top: -2px
                line-height: 20px
                width: 20px
                height: 20px
                border-radius: 10px
                font-size: 14px
                font-weight: normal
                &.clear
                    display: none
                &.partial
                    background-color: var(--color-sig-bg-2)
                    color: var(--color-sig-fg-5)
                &.complete
                    background-color: var(--color-acc-bg-2)
                    color: var(--color-acc-fg-5)
        .filter .button
            font-weight: 200
        .slots .button
            font-size: 150%
            font-weight: bold
        .actions1 .button
            font-size: 120%
            font-weight: bold
            line-height: 80px
        .actions2 .button
            font-size: 120%
            font-weight: bold
            line-height: 170px
        .actions3 .button
            line-height: 80px
    .preview
        .preview-control
            margin-top: 20px
            display: flex
            flex-direction: row
            justify-items: flex-start
            align-items: center
            .cams
                display: grid
                grid-template-columns: 80px 80px
                grid-template-rows: 50px 50px
                justify-items: center
                align-items: center
                gap: 10px 10px
                margin-right: 20px
            .flags
                display: grid
                grid-template-columns: 210px
                grid-template-rows: 50px
                justify-items: start
                align-items: center
                gap: 10px 10px
                margin-right: 20px
                .flag
                    background-color: var(--color-std-bg-3)
                    color: var(--color-std-fg-2)
                    display: grid
                    grid-template-columns: 100px 80px
                    grid-template-rows: 50px
                    justify-items: start
                    align-items: center
                    gap: 10px 10px
                    padding: 0px 10px 0px 10px
                    border-radius: 4px
            .action
                display: grid
                grid-template-columns: 80px
                grid-template-rows: 50px 50px
                justify-items: center
                align-items: center
                gap: 10px 10px
            .button
                background-color: var(--color-std-bg-1)
                color: var(--color-std-fg-1)
                border-radius: 4px
                padding: 2px 8px 2px 8px
                text-align: center
                font-size: 12pt
                line-height: 50px
                width: calc(100% - 2 * 8px)
                height: calc(100% - 2 * 2px)
                &.selected
                    background-color: var(--color-acc-bg-3)
                    color: var(--color-acc-fg-5)
                &:hover
                    background-color: var(--color-acc-bg-5)
                    color: var(--color-acc-fg-5)
        .preview-url
            background-color: var(--color-acc-bg-3)
            color: var(--color-acc-fg-5)
            border-radius: 4px
            padding: 8px 8px 8px 8px
            font-size: 12pt
            width: auto
            height: auto
    .list
        flex-grow: 1
        grid-area: list
        width: 100%
        overflow-y: scroll
        overflow-x: hidden
        position: relative
        padding: 4px 4px 4px 4px
        border-radius: 4px
        background-color: var(--color-std-bg-3)
        .list-entry
            color: var(--color-std-fg-5)
            background-color: var(--color-std-bg-4)
            &.alt
                background-color: var(--color-std-bg-5)
            padding: 1px 10px 1px 10px
            display: flex
            flex-direction: row
            &.selected
                color: var(--color-acc-fg-5)
                background-color: var(--color-acc-bg-3)
                border-radius: 4px
            .name
                width: 100%
            .tags
                width: 120px
                display: flex
                flex-direction: row
                .tag
                    width: 40px
                    padding: 4px 4px 0px 4px
                    text-align: center
                    border-radius: 4px
                    margin-right: 4px
                    font-size: 75%
                    &.tag-fade
                        background-color: var(--color-acc-bg-1)
                        color: var(--color-acc-fg-5)
                    &.tag-exclusive
                        background-color: var(--color-sig-bg-1)
                        color: var(--color-sig-fg-5)
    .control
        display: grid
        grid-template-columns: auto auto auto 7vw auto auto
        grid-template-rows: auto
        justify-items: start
        align-items: center
        gap: 10px 10px
        .label1,
        .label2,
        .label3
            white-space: nowrap
        .label1
            color: var(--color-acc-fg-5)
            width: 80px
        .label2
            width: 110px
        .label3
            font-weight: 200
            width: 80px
        .value
            justify-self: end
            input
                width: 60px
                font-size: 12pt
                font-weight: bold
                outline: none
                border-radius: 4px
                border: 0
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-4)
                padding: 4px 8px 4px 8px
                text-align: right
                &:focus
                    background-color: var(--color-acc-bg-4)
                    color: var(--color-acc-fg-5)
            .fixed
                width: 60px
                font-size: 12pt
                font-weight: normal
                outline: none
                border-radius: 4px
                border: 0
                background-color: var(--color-acc-bg-1)
                color: var(--color-acc-fg-1)
                padding: 2px 8px 2px 8px
                text-align: center
        .button
            background-color: var(--color-std-bg-1)
            color: var(--color-std-fg-5)
            border-radius: 4px
            padding: 2px 8px 2px 8px
            min-height: 20px
            text-align: center
            font-size: 10pt
            font-weight: 200
            &:hover
                background-color: var(--color-std-fg-5)
                color: var(--color-std-bg-1)
        input.text
            background-color: var(--color-acc-bg-3)
            color: var(--color-acc-fg-5)
            border: 0
            border-radius: 4px
            padding: 6px 12px 6px 12px
            outline: none
            font-weight: bold
            font-size: 12pt
            width: calc(400px - 2 * 12px)
            &:focus
                background-color: var(--color-acc-bg-4)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
    .slider
        width: 400px
        --slider-bg: var(--color-std-bg-1)
        --slider-handle-bg: var(--color-std-fg-5)
        --slider-connect-bg: var(--color-acc-bg-5)
        --slider-height: 20px
        --slider-handle-width: 20px
        --slider-handle-height: 20px
        --slider-tooltip-bg: var(--color-std-fg-5)
        --slider-tooltip-color: var(--color-std-bg-1)
        --slider-tooltip-font-size: 10pt
        --slider-tooltip-line-height: 12pt
        --slider-tooltip-font-weight: normal
        --slider-tooltip-radius: 4px
        --slider-tooltip-arrow-size: 8px
        --slider-tooltip-min-width: 40px
    .toggle
        --toggle-width: 60px
        --toggle-height: 20px
        --toggle-border: 0
        --toggle-bg-on: var(--color-acc-bg-5)
        --toggle-bg-off: var(--color-std-bg-1)
        --toggle-ring-width: 0
        --toggle-handle-enabled: var(--color-std-fg-5)
</style>

<script setup lang="ts">
// @ts-ignore
import pkg                 from "../../package.json"
import { defineComponent } from "vue"
import RecWebSocket        from "reconnecting-websocket"
import Ducky               from "ducky"
import Slider              from "@vueform/slider"
import Toggle              from "@vueform/toggle"
import axios               from "axios"
import PerfectScrollbar    from "perfect-scrollbar"
import { Tabs, Tab }       from "vue3-tabs-component"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial,
    StateDefault,
    StatePaths,
    StateUtil
} from "../server/app-state"
import { options } from "joi"
import { WindowsMotionController } from "@babylonjs/core"
</script>

<script lang="ts">
type ImageEntry = {
    id?:        string
    name:       string
    texture1:   string
    texture2?:  string
    fadeTrans?: number
    fadeWait?:  number
    exclusive?: boolean
}
export const StateFilterKeys = [
    "canvas",
    "monitor",
    "decal",
    "references",
    "lights",
    "CAM1",
    "CAM2",
    "CAM3",
    "CAM4"
]
export type StateFilterType = {
    canvas:     boolean,
    monitor:    boolean,
    decal:      boolean,
    references: boolean,
    lights:     boolean,
    CAM1:       boolean,
    CAM2:       boolean,
    CAM3:       boolean,
    CAM4:       boolean
}
let statusTimer: ReturnType<typeof setTimeout> | null = null
export default defineComponent({
    name: "app-control",
    components: {
        "tabs":   Tabs,
        "tab":    Tab,
        "slider": Slider,
        "toggle": Toggle
    },
    props: {
        selectTab:  { type: String, default: "presets" },
        serviceUrl: { type: String, default: "" },
        wsUrl:      { type: String, default: "" }
    },
    data: () => ({
        imageList: [] as ImageEntry[],
        ps: null as PerfectScrollbar | null,
        tab: "",
        preset: {
            filters: {
                canvas:     true,
                monitor:    true,
                decal:      true,
                references: true,
                lights:     true,
                CAM1:       true,
                CAM2:       true,
                CAM3:       true,
                CAM4:       true
            } as StateFilterType,
            slot: 0,
            status: [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
        },
        state: StateDefault as StateType,
        watchState: true,
        preview: {
            opts: {
                cam:   "CAM2",
                home:  true,
                freed: false,
                keys:  true
            },
            url: ""
        },
        status: {
            kind: "",
            msg: ""
        },
        pkg,
        stats: {
            peers: {
                camera:  0,
                render:  0,
                control: 0
            }
        }
    }),
    async created () {
        this.tab = this.selectTab
    },
    async mounted () {
        const ws = new RecWebSocket(this.wsUrl + "/control", [], {
            reconnectionDelayGrowFactor: 1.3,
            maxReconnectionDelay:        4000,
            minReconnectionDelay:        1000,
            connectionTimeout:           4000,
            minUptime:                   5000
        })
        ws.addEventListener("open", (ev) => {
        })
        ws.addEventListener("message", (ev: MessageEvent) => {
            if (typeof ev.data !== "string") {
                this.raiseStatus("warning", "invalid WebSocket message received", 1000)
                return
            }
            const data: any = JSON.parse(ev.data)
            if (!(typeof data === "object" && typeof data.cmd === "string" && data.arg !== undefined)) {
                this.raiseStatus("warning", "invalid WebSocket message received", 1000)
                return
            }
            if (data.cmd === "STATE") {
                const state = data.arg.state as StateTypePartial
                const errors = [] as Array<string>
                if (!Ducky.validate(state, StateSchemaPartial, errors))
                    throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
                this.importState(state)
            }
            if (data.cmd === "STATS") {
                this.stats.peers.camera  = data.arg.stats?.peers?.camera  ?? 0
                this.stats.peers.render  = data.arg.stats?.peers?.render  ?? 0
                this.stats.peers.control = data.arg.stats?.peers?.control ?? 0
            }
        })

        this.imageList = await this.imageListFetch()
        this.state.canvas.id = this.imageList[0]?.id ?? ""
        this.ps = new PerfectScrollbar(this.$refs.list as HTMLElement)

        await this.loadState()
        await this.presetStatus()

        let timer: ReturnType<typeof setTimeout> | null = null
        let queue = [] as string[]
        for (const path of StatePaths) {
            this.$watch(`state.${path}`, () => {
                if (!this.watchState)
                    return
                queue.push(path)
                if (timer !== null)
                    return
                timer = setTimeout(async () => {
                    timer = null
                    const paths = queue
                    queue = []
                    await this.patchState(paths)
                }, 100)
            })
        }

        this.$watch("preview.opts.freed", (val: boolean) => {
            if (val && this.preview.opts.keys)
                this.preview.opts.keys = false
        })
        this.$watch("preview.opts.keys", (val: boolean) => {
            if (val && this.preview.opts.freed)
                this.preview.opts.freed = false
        })
        this.$watch("preview.opts", () => {
            let url = `${this.serviceUrl}#/render/${this.preview.opts.cam}`
            const opts = []
            if (this.preview.opts.freed) opts.push("ptzFreeD=true")
            if (this.preview.opts.keys)  opts.push("ptzKeys=true")
            if (opts.length > 0)
                url += "?" + opts.join("&")
            this.preview.url = url
        }, { immediate: true, deep: true })
    },
    methods: {
        raiseStatus (kind: string, msg: string, duration = 4000) {
            this.status.kind = kind
            this.status.msg  = msg
            if (statusTimer !== null)
                clearTimeout(statusTimer)
            statusTimer = setTimeout(() => {
                this.status.kind = ""
                this.status.msg  = ""
                statusTimer = null
            }, duration)
        },
        lit2map (obj: { [ key: string ]: string | boolean }) {
            const map = new Map<string, string | boolean>()
            for (const key of Object.keys(obj))
                map.set(key, obj[key])
            return map
        },
        async imageListFetch (): Promise<ImageEntry[]> {
            return axios({
                method:       "GET",
                url:          `${this.serviceUrl}canvas`,
                responseType: "json"
            }).then((result: any) => {
                return result.data.images
            }) as Promise<ImageEntry[]>
        },
        async selectImage (id: string) {
            const entry = this.imageList.find((entry) => entry.id === id)
            if (entry === undefined)
                return
            this.watchState = false
            this.state.canvas.id        = id
            this.state.canvas.texture1  = entry.texture1
            if (entry.texture2)
                this.state.canvas.texture2  = entry.texture2
            else
                this.state.canvas.texture2  = ""
            if (entry.fadeTrans)
                this.state.canvas.fadeTrans = entry.fadeTrans
            else
                this.state.canvas.fadeTrans = 0
            if (entry.fadeWait)
                this.state.canvas.fadeWait  = entry.fadeWait
            else
                this.state.canvas.fadeWait  = 0
            await this.patchState([ "canvas.*" ])
            this.watchState = true
        },
        previewOpen () {
            window.open(this.preview.url, "_blank")
        },
        previewCopy () {
            navigator.clipboard.writeText(this.preview.url)
        },
        tabChanged (tab: any) {
            this.tab = tab.tab.name
            window.location.hash = `#/control/${tab.tab.computedId}`
        },
        fieldImport (txt: string, min: number, max: number) {
            txt = txt.replace(/^s+/, "").replace(/\s+$/, "")
            let n = parseFloat(txt)
            if (Number.isNaN(n))
                n = 0
            n = Math.max(Math.min(n, max), min)
            return n
        },
        fieldExport (n: number, digits = 2) {
            let txt = n.toFixed(digits)
            if (!txt.match(/^-/))
                txt = `+${txt}`
            return txt
        },
        mergeState (state: Readonly<StateTypePartial>, paths?: Readonly<string[]>) {
            return StateUtil.copy(this.state, state, paths)
        },
        importState (state: Readonly<StateTypePartial>, paths?: Readonly<string[]>) {
            this.watchState = false
            const changed = this.mergeState(state, paths)
            if (changed)
                setTimeout(() => { this.watchState = true }, 50)
            else
                this.watchState = true
        },
        exportState (paths?: Readonly<string[]>): StateTypePartial {
            const dst = {}
            StateUtil.copy(dst, this.state, paths)
            return dst
        },
        async loadState () {
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state`
            }).then((response) => response.data).catch(() => null)
            if (state === null)
                throw new Error("failed to load state")
            const errors = [] as Array<string>
            if (!Ducky.validate(state, StateSchema, errors))
                throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
            this.mergeState(state as StateType)
        },
        async saveState () {
            await axios({
                method: "POST",
                url:    `${this.serviceUrl}state`,
                data:   this.state
            })
        },
        async patchState (paths: Readonly<string[]>) {
            const state = {}
            StateUtil.copy(state, this.state, paths)
            await axios({
                method: "PATCH",
                url:    `${this.serviceUrl}state`,
                data:   state
            })
        },
        async presetStatus () {
            const status = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset`
            }).then((response) => response.data).catch(() => null)
            if (status === null)
                throw new Error("failed to load preset status")
            this.preset.status = status
        },
        presetStatus2Class (slot: number) {
            const clazz = {} as any
            if (this.preset.status[slot] === 0)
                clazz.clear = true
            else if (this.preset.status[slot] > 0 && this.preset.status[slot] < 9)
                clazz.partial = true
            else if (this.preset.status[slot] === 9)
                clazz.complete = true
            return clazz
        },
        presetFiltersSelect (enable: boolean) {
            for (const key of Object.keys(this.preset.filters))
                (this.preset.filters as any)[key] = enable
        },
        async presetLoad () {
            this.raiseStatus("info", `Loading state from preset slot #${this.preset.slot}...`, 1000)
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot}`
            }).then((response) => response.data).catch(() => null)
            if (state === null) {
                this.raiseStatus("error", "failed to load preset")
                return
            }
            const errors = [] as Array<string>
            if (!Ducky.validate(state, StateSchemaPartial, errors)) {
                this.raiseStatus("error", `invalid schema of loaded preset state: ${errors.join(", ")}`)
                return
            }
            const filters = Object.keys(this.preset.filters)
                .filter((key) => (this.preset.filters as any)[key])
                .map((key) => `${key}.**`)
            this.mergeState(state as StateType, filters)
        },
        async presetSave () {
            this.raiseStatus("info", `Saving state to preset slot #${this.preset.slot}...`, 1000)
            const filters = Object.keys(this.preset.filters)
                .filter((key) => (this.preset.filters as any)[key])
                .map((key) => `${key}.**`)
            const state = this.exportState(filters)
            await axios({
                method: "POST",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot}`,
                data:   state
            })
            await this.presetStatus()
        },
        async presetClear () {
            this.raiseStatus("info", `Clearing preset slot #${this.preset.slot}...`, 1000)
            await axios({
                method: "DELETE",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot}`
            }).then((response) => response.data).catch(() => null)
            await this.presetStatus()
        }
    }
})
</script>

