<!--
**
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
**
-->

<template>
    <div class="app-control">
        <!--  HEADER  -->
        <div class="head">
            <img class="logo" src="../../res/app-icon.svg" alt="" />
            <b>Studio Canvas</b> Control
            <div class="stats">
                <span class="icon"><i class="fa fa-video"></i></span>
                <span class="figure">{{ stats.peers.camera }}</span>
                <span class="icon"><i class="fa fa-image"></i></span>
                <span class="figure">{{ stats.peers.render }}</span>
                <span class="icon"><i class="fa fa-gear"></i></span>
                <span class="figure">{{ stats.peers.control }}</span>
            </div>
        </div>

        <!--  BODY  -->
        <div class="body">
            <tabs ref="tabs" v-bind:options="{ useUrlFragment: false }" v-bind:cache-lifetime="0" class="tabs-level-1" v-on:changed="tabChanged0">
                <tab id="control" name="Control">
                    <tabs ref="control" v-bind:options="{ useUrlFragment: false }" v-bind:cache-lifetime="0" class="tabs-level-2" v-on:changed="tabChanged1">
                        <!--  ==== PRESETS ====  -->
                        <tab id="presets" name="Presets">
                            <div class="desc">
                                The <b>Presets</b> can be used to load and save the entire &mdash; or just the
                                partial &mdash; current scence control state from or to persistent preset slots.
                                When loading a partial state from a preset slot, the partial state is merged
                                onto the current state. First, select either "all" or "none" plus a particular state
                                group. Second, select the preset slot 1-12. Third, select the action "load", "clear"
                                or "save" to perform.
                            </div>
                            <div class="presets">
                                <div class="actions3">
                                    <div class="button destructive" v-on:click="presetFiltersSelect(false)">NONE</div>
                                    <div class="button destructive" v-on:click="presetFiltersSelect(true)">ALL</div>
                                </div>
                                <div class="filter">
                                    <div class="button" v-bind:class="{ selected: preset.filters.renderer }"
                                        v-on:click="preset.filters.renderer = !preset.filters.renderer">
                                        Renderer
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.streams }"
                                        v-on:click="preset.filters.streams = !preset.filters.streams">
                                        Streams
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.media }"
                                        v-on:click="preset.filters.media = !preset.filters.media">
                                        Media
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.canvas }"
                                        v-on:click="preset.filters.canvas = !preset.filters.canvas">
                                        Canvas
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.decal }"
                                        v-on:click="preset.filters.decal = !preset.filters.decal">
                                        Decal
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.monitor }"
                                        v-on:click="preset.filters.monitor = !preset.filters.monitor">
                                        Monitor
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.plate }"
                                        v-on:click="preset.filters.plate = !preset.filters.plate">
                                        Plate
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.hologram }"
                                        v-on:click="preset.filters.hologram = !preset.filters.hologram">
                                        Hologram
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.pane }"
                                        v-on:click="preset.filters.pane = !preset.filters.pane">
                                        Pane
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.pillar }"
                                        v-on:click="preset.filters.pillar = !preset.filters.pillar">
                                        Pillar
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.mask }"
                                        v-on:click="preset.filters.mask = !preset.filters.mask">
                                        Mask
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.lights }"
                                        v-on:click="preset.filters.lights = !preset.filters.lights">
                                        Lights
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.filters.avatars }"
                                        v-on:click="preset.filters.avatars = !preset.filters.avatars">
                                        Avatars
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
                                <div class="slots">
                                    <div class="button" v-bind:class="{ selected: preset.slot === 0 }"
                                        v-on:click="preset.slot = preset.slot !== 0 ? 0 : -1">
                                        1
                                        <div class="badge" v-bind:class="presetStatus2Class(0)">{{ preset.status[0] }}</div>
                                        <div class="lock" v-show="preset.locked[0]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 1 }"
                                        v-on:click="preset.slot = preset.slot !== 1 ? 1 : -1">
                                        2
                                        <div class="badge" v-bind:class="presetStatus2Class(1)">{{ preset.status[1] }}</div>
                                        <div class="lock" v-show="preset.locked[1]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 2 }"
                                        v-on:click="preset.slot = preset.slot !== 2 ? 2 : -1">
                                        3
                                        <div class="badge" v-bind:class="presetStatus2Class(2)">{{ preset.status[2] }}</div>
                                        <div class="lock" v-show="preset.locked[2]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 3 }"
                                        v-on:click="preset.slot = preset.slot !== 3 ? 3 : -1">
                                        4
                                        <div class="badge" v-bind:class="presetStatus2Class(3)">{{ preset.status[3] }}</div>
                                        <div class="lock" v-show="preset.locked[3]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 4 }"
                                        v-on:click="preset.slot = preset.slot !== 4 ? 4 : -1">
                                        5
                                        <div class="badge" v-bind:class="presetStatus2Class(4)">{{ preset.status[4] }}</div>
                                        <div class="lock" v-show="preset.locked[4]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 5 }"
                                        v-on:click="preset.slot = preset.slot !== 5 ? 5 : -1">
                                        6
                                        <div class="badge" v-bind:class="presetStatus2Class(5)">{{ preset.status[5] }}</div>
                                        <div class="lock" v-show="preset.locked[5]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 6 }"
                                        v-on:click="preset.slot = preset.slot !== 6 ? 6 : -1">
                                        7
                                        <div class="badge" v-bind:class="presetStatus2Class(6)">{{ preset.status[6] }}</div>
                                        <div class="lock" v-show="preset.locked[6]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 7 }"
                                        v-on:click="preset.slot = preset.slot !== 7 ? 7 : -1">
                                        8
                                        <div class="badge" v-bind:class="presetStatus2Class(7)">{{ preset.status[7] }}</div>
                                        <div class="lock" v-show="preset.locked[7]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 8 }"
                                        v-on:click="preset.slot = preset.slot !== 8 ? 8 : -1">
                                        9
                                        <div class="badge" v-bind:class="presetStatus2Class(8)">{{ preset.status[8] }}</div>
                                        <div class="lock" v-show="preset.locked[8]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 9 }"
                                        v-on:click="preset.slot = preset.slot !== 9 ? 9 : -1">
                                        10
                                        <div class="badge" v-bind:class="presetStatus2Class(9)">{{ preset.status[9] }}</div>
                                        <div class="lock" v-show="preset.locked[9]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 10 }"
                                        v-on:click="preset.slot = preset.slot !== 10 ? 10 : -1">
                                        11
                                        <div class="badge" v-bind:class="presetStatus2Class(10)">{{ preset.status[10] }}</div>
                                        <div class="lock" v-show="preset.locked[10]"><i class="fa fa-lock"></i></div>
                                    </div>
                                    <div class="button" v-bind:class="{ selected: preset.slot === 11 }"
                                        v-on:click="preset.slot = preset.slot !== 11 ? 11 : -1">
                                        12
                                        <div class="badge" v-bind:class="presetStatus2Class(11)">{{ preset.status[11] }}</div>
                                        <div class="lock" v-show="preset.locked[11]"><i class="fa fa-lock"></i></div>
                                    </div>
                                </div>
                                <div class="actions0">
                                    <div class="button destructive"
                                        v-bind:class="{ unselectable: preset.slot === -1 || preset.status[preset.slot] === 0 || preset.locked[preset.slot] }"
                                        v-on:click="presetLock">
                                        LOCK
                                    </div>
                                    <div class="button destructive"
                                        v-bind:class="{ unselectable: preset.slot === -1 || !preset.locked[preset.slot] }"
                                        v-on:click="presetUnlock">
                                        UNLOCK
                                    </div>
                                </div>
                                <div class="actions1">
                                    <div class="button destructive"
                                        v-bind:class="{ unselectable: preset.slot === -1 || preset.status[preset.slot] === 0 }"
                                        v-on:click="presetLoad">
                                        LOAD
                                    </div>
                                    <div class="button destructive"
                                        v-bind:class="{ unselectable: preset.slot === -1 || preset.status[preset.slot] === 0 || preset.locked[preset.slot] }"
                                        v-on:click="presetClear">
                                        CLEAR
                                    </div>
                                </div>
                                <div class="actions2">
                                    <div class="button destructive"
                                        v-bind:class="{ unselectable: preset.slot === -1 || preset.locked[preset.slot] }"
                                        v-on:click="presetSave">
                                        SAVE
                                    </div>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== Mixer ====  -->
                        <tab id="mixer" name="Mixer" class="mixer">
                            <div class="desc">
                                The <b>Mixer</b> allows you to select a camera to be logically
                                in preview and to logically cut this camera from preview into program.
                                This allows you to ad-hoc adjust the configured FPS (see <b>Scene &rarr; Renderer</b>)
                                onto all renderer instances during production in order to allow you to reduce the
                                overall load all renderers cause on the underlying hardware.
                            </div>
                            <div class="control">
                                <div class="cams">
                                    <div class="button cam" v-on:click="changePreview('CAM1')"
                                        v-bind:class="{
                                            unselectable: mixer.preview === 'CAM1' || mixer.program === 'CAM1',
                                            preview: mixer.program === 'CAM1',
                                            program: mixer.program === 'CAM1'
                                        }">
                                        CAM1
                                        <div class="badge" v-bind:class="mixerStatus2Class('CAM1')">
                                            {{ mixer.program === 'CAM1' ? state.renderer.program :
                                            (mixer.preview === 'CAM1' ? state.renderer.preview :
                                            state.renderer.other) }}
                                        </div>
                                    </div>
                                    <div class="button cam" v-on:click="changePreview('CAM2')"
                                        v-bind:class="{
                                            unselectable: mixer.preview === 'CAM2' || mixer.program === 'CAM2',
                                            preview: mixer.program === 'CAM2',
                                            program: mixer.program === 'CAM2'
                                        }">
                                        CAM2
                                        <div class="badge" v-bind:class="mixerStatus2Class('CAM2')">
                                            {{ mixer.program === 'CAM2' ? state.renderer.program :
                                            (mixer.preview === 'CAM2' ? state.renderer.preview :
                                            state.renderer.other) }}
                                        </div>
                                    </div>
                                    <div class="button cam" v-on:click="changePreview('CAM3')"
                                        v-bind:class="{
                                            unselectable: mixer.preview === 'CAM3' || mixer.program === 'CAM3',
                                            preview: mixer.program === 'CAM3',
                                            program: mixer.program === 'CAM3'
                                        }">
                                        CAM3
                                        <div class="badge" v-bind:class="mixerStatus2Class('CAM3')">
                                            {{ mixer.program === 'CAM3' ? state.renderer.program :
                                            (mixer.preview === 'CAM3' ? state.renderer.preview :
                                            state.renderer.other) }}
                                        </div>
                                    </div>
                                    <div class="button cam" v-on:click="changePreview('CAM4')"
                                        v-bind:class="{
                                            unselectable: mixer.preview === 'CAM4' || mixer.program === 'CAM4',
                                            preview: mixer.program === 'CAM4',
                                            program: mixer.program === 'CAM4'
                                        }">
                                        CAM4
                                        <div class="badge" v-bind:class="mixerStatus2Class('CAM4')">
                                            {{ mixer.program === 'CAM4' ? state.renderer.program :
                                            (mixer.preview === 'CAM4' ? state.renderer.preview :
                                            state.renderer.other) }}
                                        </div>
                                    </div>
                                    <div class="button cut" v-on:click="cutPreviewToProgram()">
                                        CUT
                                    </div>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== PREVIEW ====  -->
                        <tab id="preview" name="Preview" class="preview">
                            <div class="desc">
                                The <b>Preview</b> is a rendering preview of the rendered camera view
                                within the BabylonJS game engine. It is exactly the same content intended
                                to be loaded into the vMix Browser input or OBS Studio Browser source
                                and allows you to preview the scene in the browser here, too.
                                The camera view can be optionally controlled by reflecting the emitted
                                FreeD information from the physical camera, or being interactively adjusted
                                by cursor keys.
                            </div>
                            <div class="preview-url" v-on:click="previewCopy()">
                                {{ preview.url }}
                            </div>
                            <div class="preview-control">
                                <div class="layer">
                                    <div class="button" v-on:click="preview.opts.layer = 'back'"
                                        v-bind:class="{ selected: preview.opts.layer === 'back' }">
                                        Back
                                    </div>
                                    <div class="button" v-on:click="preview.opts.layer = 'front'"
                                        v-bind:class="{ selected: preview.opts.layer === 'front' }">
                                        Front
                                    </div>
                                </div>
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
                </tab>
                <tab id="scene" name="Scene">
                    <tabs ref="scene" v-bind:options="{ useUrlFragment: false }" v-bind:cache-lifetime="0" class="tabs-level-2" v-on:changed="tabChanged1">
                        <!--  ==== Renderer ====  -->
                        <tab id="renderer" name="Renderer">
                            <div class="desc">
                                The <b>Renderer</b> allows you to configure the Frames per Second (FPS)
                                of a scene renderer when it is in program, preview or neither of them (other).
                                This in total allows you to reduce the overall load all renderers cause on the
                                underlying hardware. Never use more FPS than absolutely necessary.
                            </div>
                            <div class="control">
                                <div class="label1">Program</div>
                                <div class="label2">(performance)</div>
                                <div class="label3">[fps]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.renderer.program)"
                                        v-on:change="(ev) => state.renderer.program = saneFPS(state.renderer.program, fieldImport((ev.target! as HTMLInputElement).value, 0, 60))"/>
                                </div>
                                <div class="button" v-on:click="state.renderer.program = 30">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-bind:value="state.renderer.program"
                                        v-on:change="(val: number) => state.renderer.program = saneFPS(state.renderer.program, val)"
                                        v-bind:min="0" v-bind:max="60" v-bind:step="1"
                                        show-tooltip="drag" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">Preview</div>
                                <div class="label2">(performance)</div>
                                <div class="label3">[fps]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.renderer.preview)"
                                        v-on:change="(ev) => state.renderer.preview = saneFPS(state.renderer.preview, fieldImport((ev.target! as HTMLInputElement).value, 0, 60))"/>
                                </div>
                                <div class="button" v-on:click="state.renderer.preview = 15">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-bind:value="state.renderer.preview"
                                        v-on:change="(val: number) => state.renderer.preview = saneFPS(state.renderer.preview, val)"
                                        v-bind:min="0" v-bind:max="60" v-bind:step="1"
                                        show-tooltip="drag" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">Other</div>
                                <div class="label2">(performance)</div>
                                <div class="label3">[fps]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.renderer.other)"
                                        v-on:change="(ev) => state.renderer.other = saneFPS(state.renderer.other, fieldImport((ev.target! as HTMLInputElement).value, 0, 60))"/>
                                </div>
                                <div class="button" v-on:click="state.renderer.other = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-bind:value="state.renderer.other"
                                        v-on:change="(val: number) => state.renderer.other = saneFPS(state.renderer.other, val)"
                                        v-bind:min="0" v-bind:max="60" v-bind:step="1"
                                        show-tooltip="drag" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <!--
                                FIXME: currently unused!
                                <div class="label1">Overlay</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.renderer.overlay ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.renderer.overlay = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.renderer.overlay"></toggle>
                                </div>
                                -->
                            </div>
                        </tab>

                        <!--  ==== STREAMS ====  -->
                        <tab id="streams" name="Streams">
                            <div class="desc">
                                The <b>Streams</b> are the video streams which can be shown on
                                the Decal, Monitor, Plate, Hologram, Pane and Pillar. The content is received
                                as a single virtual video device which had to carry 2 content stacks
                                (left and right) and each stack consists of the content RGB
                                on top of content alpha (black-to-white, 100-0% visibillity).
                            </div>
                            <div class="control">
                                <div class="label1">video</div>
                                <div class="label2">(device)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">*</div>
                                </div>
                                <div class="button" v-on:click="state.streams.device = ''">RESET</div>
                                <div class="slider">
                                    <input class="text" v-model.lazy="state.streams.device"/>
                                </div>

                                <div class="label1">size</div>
                                <div class="label2">(width)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.streams.width, 0, true)"
                                        v-on:change="(ev) => state.streams.width = fieldImport((ev.target! as HTMLInputElement).value, 0, 3840)"/>
                                </div>
                                <div class="button" v-on:click="state.streams.width = 1920">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.streams.width"
                                        v-bind:min="0.0" v-bind:max="3840" v-bind:step="40"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">size</div>
                                <div class="label2">(height)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.streams.height, 0, true)"
                                        v-on:change="(ev) => state.streams.height = fieldImport((ev.target! as HTMLInputElement).value, 0, 2160)"/>
                                </div>
                                <div class="button" v-on:click="state.streams.height = 1080">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.streams.height"
                                        v-bind:min="0.0" v-bind:max="2160" v-bind:step="40"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">fps</div>
                                <div class="label2">(fps)</div>
                                <div class="label3">[fps]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.streams.fps, 2, true)"
                                        v-on:change="(ev) => state.streams.fps = fieldImport((ev.target! as HTMLInputElement).value, 0, 60)"/>
                                </div>
                                <div class="button" v-on:click="state.streams.fps = 30.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.streams.fps"
                                        v-bind:min="0.0" v-bind:max="60.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== MEDIA ====  -->
                        <tab id="media" name="Media" class="media">
                            <div class="desc">
                                The <b>Media</b> are static images (in PNG, JPEG, or GIF format)
                                and looping videos (in MP4 or WebM format), each 1920x1080 pixels in size
                                and for PNG, GIF and WebM/VP8 optionally with a transparent background.
                                Each media can be assigned to the logical media slots 1-4 and then selected
                                for displaying on Decal, Monitor, Plate, Hologram, Pane, Pillar and Mask
                                as an alternative to the regular video streams 1-2.
                            </div>
                            <div class="list" ref="list">
                                <div
                                    v-for="(group, i) in mediaList.map((e) => e.group).filter((v, i, a) => v !== '' && a.indexOf(v) === i)"
                                    class="list-group"
                                    v-bind:class="{ selected: mediaOpenGroup === group, alt: i % 2 == 1 }"
                                    v-bind:key="group"
                                >
                                    <div class="name"
                                        v-on:click="mediaOpenGroup = mediaOpenGroup !== group ? group : ''">
                                        <span class="icon">
                                            <span v-show="mediaOpenGroup !== group"><i class="fa fa-caret-right"></i></span>
                                            <span v-show="mediaOpenGroup === group"><i class="fa fa-caret-down" ></i></span>
                                        </span>
                                        <span>{{ group }}</span>
                                    </div>
                                    <div
                                        v-show="mediaOpenGroup === group"
                                        v-for="(entry, j) in mediaList.filter((e) => e.group === group)"
                                        class="list-entry"
                                        v-bind:class="{ alt: j % 2 == 1 }"
                                        v-bind:key="entry.id!"
                                    >
                                        <div class="name">{{ entry.name }}</div>
                                        <div class="tags">
                                            <div v-show="entry.type" class="tag tag-type">{{ entry.type }}</div>
                                        </div>
                                        <div class="actions">
                                            <div class="button" v-bind:class="{ selected: state.media.media1 === entry.texture }" v-on:click="selectMedia('media1', entry.texture)">Media 1</div>
                                            <div class="button" v-bind:class="{ selected: state.media.media2 === entry.texture }" v-on:click="selectMedia('media2', entry.texture)">Media 2</div>
                                            <div class="button" v-bind:class="{ selected: state.media.media3 === entry.texture }" v-on:click="selectMedia('media3', entry.texture)">Media 3</div>
                                            <div class="button" v-bind:class="{ selected: state.media.media4 === entry.texture }" v-on:click="selectMedia('media4', entry.texture)">Media 4</div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    v-for="(entry, i) in mediaList.filter((e) => e.group === '')"
                                    class="list-entry"
                                    v-bind:class="{ alt: i % 2 == 1 }"
                                    v-bind:key="entry.id!"
                                >
                                    <div class="name">{{ entry.name }}</div>
                                    <div class="tags">
                                        <div v-show="entry.type" class="tag tag-type">{{ entry.type }}</div>
                                    </div>
                                    <div class="actions">
                                        <div class="button" v-bind:class="{ selected: state.media.media1 === entry.texture }" v-on:click="selectMedia('media1', entry.texture)">Media 1</div>
                                        <div class="button" v-bind:class="{ selected: state.media.media2 === entry.texture }" v-on:click="selectMedia('media2', entry.texture)">Media 2</div>
                                        <div class="button" v-bind:class="{ selected: state.media.media3 === entry.texture }" v-on:click="selectMedia('media3', entry.texture)">Media 3</div>
                                        <div class="button" v-bind:class="{ selected: state.media.media4 === entry.texture }" v-on:click="selectMedia('media4', entry.texture)">Media 4</div>
                                    </div>
                                </div>
                            </div>
                            <div class="actions">
                                <div class="button"
                                    v-on:click="mediaListFetch()">
                                    RELOAD
                                </div>
                            </div>
                        </tab>
                    </tabs>
                </tab>
                <tab id="displays" name="Displays">
                    <tabs ref="displays" v-bind:options="{ useUrlFragment: false }" v-bind:cache-lifetime="0" class="tabs-level-2" v-on:changed="tabChanged1">
                        <!--  ==== CANVAS ====  -->
                        <tab id="canvas" name="Canvas" class="canvas">
                            <div class="desc">
                                The <b>Canvas</b> is the background of the scene.
                                It can be either based on a single image for rendering a static canvas,
                                or it can be two images providing a dynamic canvas through a cross-fade effect (indicated
                                by the tag "FADE"). Some canvas are exclusively designed for particular events (indicated
                                by the tag "EXCL") and hence should be not reused for other events.
                                All canvas images have to be exactly 10540x2250 pixels in size.
                            </div>
                            <div class="control">
                                <div class="label1">Z-rotate</div>
                                <div class="label2">(rotate right/left)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="5" v-bind:value="fieldExport(state.canvas.rotationZ)"
                                        v-on:change="(ev) => state.canvas.rotationZ = fieldImport((ev.target! as HTMLInputElement).value, -10, +10)"/>
                                </div>
                                <div class="button" v-on:click="state.canvas.rotationZ = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.canvas.rotationZ"
                                        v-bind:min="-10" v-bind:max="+10" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                            <div class="list" ref="list">
                                <div
                                    v-for="(group, i) in imageList.map((e) => e.group).filter((v, i, a) => v !== '' && a.indexOf(v) === i)"
                                    class="list-group"
                                    v-bind:class="{ selected: openGroup === group, alt: i % 2 == 1 }"
                                    v-bind:key="group"
                                >
                                    <div class="name"
                                        v-on:click="openGroup = openGroup !== group ? group : ''">
                                        <span class="icon">
                                            <span v-show="openGroup !== group"><i class="fa fa-caret-right"></i></span>
                                            <span v-show="openGroup === group"><i class="fa fa-caret-down" ></i></span>
                                        </span>
                                        <span>{{ group }}</span>
                                    </div>
                                    <div
                                        v-show="openGroup === group"
                                        v-for="(entry, j) in imageList.filter((e) => e.group === group)"
                                        class="list-entry"
                                        v-bind:class="{ selected: entry.id === state.canvas.id, alt: j % 2 == 1 }"
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
                                <div
                                    v-for="(entry, i) in imageList.filter((e) => e.group === '')"
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
                            <div class="actions">
                                <div class="button"
                                    v-on:click="imageListFetch()">
                                    RELOAD
                                </div>
                                <div class="button"
                                    v-bind:class="{ unselectable: state.canvas.texture2 === '' }"
                                    v-on:click="syncCanvas()">
                                    SYNC
                                </div>
                            </div>
                        </tab>

                        <!--  ==== DECAL ====  -->
                        <tab id="decal" name="Decal">
                            <div class="desc">
                                The <b>Decal</b> is the optional poster-style display which can be projected
                                onto the background canvas. It is rendered in the BACK layer. It can scaled in size,
                                positioned in a radial way on the background canvas, its opacity controlled to mix with
                                the canvas, a border radius applied, a border cropping applied, and a chroma-key filter
                                applied.
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

                                <div class="label1">source</div>
                                <div class="label2">(source)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.decal.source }}</div>
                                </div>
                                <div class="button" v-on:click="state.decal.source = 'S1'">RESET</div>
                                <div class="radios">
                                    <div class="button" v-bind:class="{ selected: state.decal.source === 'S1' }" v-on:click="state.decal.source = 'S1'">Stream 1</div>
                                    <div class="button" v-bind:class="{ selected: state.decal.source === 'S2' }" v-on:click="state.decal.source = 'S2'">Stream 2</div>
                                    <div class="button" v-bind:class="{ selected: state.decal.source === 'M1' }" v-on:click="state.decal.source = 'M1'">Media 1</div>
                                    <div class="button" v-bind:class="{ selected: state.decal.source === 'M2' }" v-on:click="state.decal.source = 'M2'">Media 2</div>
                                    <div class="button" v-bind:class="{ selected: state.decal.source === 'M3' }" v-on:click="state.decal.source = 'M3'">Media 3</div>
                                    <div class="button" v-bind:class="{ selected: state.decal.source === 'M4' }" v-on:click="state.decal.source = 'M4'">Media 4</div>
                                </div>

                                <div class="label1">fade</div>
                                <div class="label2">(time)</div>
                                <div class="label3">[sec]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.fadeTime)"
                                        v-on:change="(ev) => state.decal.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.2, 4.0)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.fadeTime = 2.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.fadeTime"
                                        v-bind:min="0.2" v-bind:max="4.0" v-bind:step="0.10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">scale</div>
                                <div class="label2">(resize)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.scale)"
                                        v-on:change="(ev) => state.decal.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 5.0)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.scale = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.scale"
                                        v-bind:min="0.1" v-bind:max="5.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">rotate</div>
                                <div class="label2">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.rotate)"
                                        v-on:change="(ev) => state.decal.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.rotate = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.rotate"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lift</div>
                                <div class="label2">(tilt down/up)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.lift)"
                                        v-on:change="(ev) => state.decal.lift = fieldImport((ev.target! as HTMLInputElement).value, -15, +9)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.lift = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.lift"
                                        v-bind:min="-15" v-bind:max="+9" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
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
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(radius)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.borderRad)"
                                        v-on:change="(ev) => state.decal.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.borderRad = 40">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.borderRad"
                                        v-bind:min="0" v-bind:max="540" v-bind:step="10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(cropping)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.borderCrop)"
                                        v-on:change="(ev) => state.decal.borderCrop = fieldImport((ev.target! as HTMLInputElement).value, 0, 50)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.borderCrop = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.borderCrop"
                                        v-bind:min="0" v-bind:max="50" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(enable)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.decal.chromaKey.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.decal.chromaKey.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.decal.chromaKey.enable"></toggle>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(threshold)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.chromaKey.threshold)"
                                        v-on:change="(ev) => state.decal.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.chromaKey.threshold = 0.4">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.chromaKey.threshold"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(smoothing)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.decal.chromaKey.smoothing)"
                                        v-on:change="(ev) => state.decal.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
                                </div>
                                <div class="button" v-on:click="state.decal.chromaKey.smoothing = 0.1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.decal.chromaKey.smoothing"
                                        v-bind:min="0.0" v-bind:max="0.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== MONITOR ====  -->
                        <tab id="monitor" name="Monitor">
                            <div class="desc">
                                The <b>Monitor</b> is the optional TV-style monitor which can be shown
                                in front of the background canvas. It is rendered in the BACK layer.
                                It can be scaled in size, positioned in a radial way in front of the background
                                canvas, its opacity controlled to mix with the canvas, a border radius applied,
                                a border cropping applied, and a chroma-key filter applied.
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

                                <div class="label1">source</div>
                                <div class="label2">(source)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.monitor.source }}</div>
                                </div>
                                <div class="button" v-on:click="state.monitor.source = 'S2'">RESET</div>
                                <div class="radios">
                                    <div class="button" v-bind:class="{ selected: state.monitor.source === 'S1' }" v-on:click="state.monitor.source = 'S1'">Stream 1</div>
                                    <div class="button" v-bind:class="{ selected: state.monitor.source === 'S2' }" v-on:click="state.monitor.source = 'S2'">Stream 2</div>
                                    <div class="button" v-bind:class="{ selected: state.monitor.source === 'M1' }" v-on:click="state.monitor.source = 'M1'">Media 1</div>
                                    <div class="button" v-bind:class="{ selected: state.monitor.source === 'M2' }" v-on:click="state.monitor.source = 'M2'">Media 2</div>
                                    <div class="button" v-bind:class="{ selected: state.monitor.source === 'M3' }" v-on:click="state.monitor.source = 'M3'">Media 3</div>
                                    <div class="button" v-bind:class="{ selected: state.monitor.source === 'M4' }" v-on:click="state.monitor.source = 'M4'">Media 4</div>
                                </div>

                                <div class="label1">fade</div>
                                <div class="label2">(time)</div>
                                <div class="label3">[sec]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.monitor.fadeTime)"
                                        v-on:change="(ev) => state.monitor.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.2, 4.0)"/>
                                </div>
                                <div class="button" v-on:click="state.monitor.fadeTime = 2.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.monitor.fadeTime"
                                        v-bind:min="0.2" v-bind:max="4.0" v-bind:step="0.10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
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
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">rotate</div>
                                <div class="label3">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.monitor.rotate)"
                                        v-on:change="(ev) => state.monitor.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.monitor.rotate = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.monitor.rotate"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lift</div>
                                <div class="label2">(shift down/up)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.monitor.lift)"
                                        v-on:change="(ev) => state.monitor.lift = fieldImport((ev.target! as HTMLInputElement).value, -150, +70)"/>
                                </div>
                                <div class="button" v-on:click="state.monitor.lift = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.monitor.lift"
                                        v-bind:min="-150" v-bind:max="+70" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">distance</div>
                                <div class="label2">(shift bwd/fwd)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.monitor.distance)"
                                        v-on:change="(ev) => state.monitor.distance = fieldImport((ev.target! as HTMLInputElement).value, -1.5, +0.4)"/>
                                </div>
                                <div class="button" v-on:click="state.monitor.distance = 0.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.monitor.distance"
                                        v-bind:min="-1.5" v-bind:max="+0.4" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">opacity</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[percent]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.monitor.opacity)"
                                        v-on:change="(ev) => state.monitor.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.monitor.opacity = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.monitor.opacity"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(enable)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.monitor.chromaKey.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.monitor.chromaKey.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.monitor.chromaKey.enable"></toggle>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(threshold)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.monitor.chromaKey.threshold)"
                                        v-on:change="(ev) => state.monitor.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.monitor.chromaKey.threshold = 0.4">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.monitor.chromaKey.threshold"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(smoothing)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.monitor.chromaKey.smoothing)"
                                        v-on:change="(ev) => state.monitor.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
                                </div>
                                <div class="button" v-on:click="state.monitor.chromaKey.smoothing = 0.1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.monitor.chromaKey.smoothing"
                                        v-bind:min="0.0" v-bind:max="0.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== PLATE ====  -->
                        <tab id="plate" name="Plate">
                            <div class="desc">
                                The <b>Plate</b> is the optional planar display which can be projected
                                into the room in the FRONT layer, intended as the optical plate on the desk's front side.
                                It can be given scaled in size, positioned in a radial way on the background canvas,
                                its opacity controlled to mix with the canvas, a border radius applied, a border cropping applied,
                                and a chroma-key filter applied.
                            </div>
                            <div class="control">
                                <div class="label1">enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.plate.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.plate.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.plate.enable"></toggle>
                                </div>

                                <div class="label1">source</div>
                                <div class="label2">(source)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.plate.source }}</div>
                                </div>
                                <div class="button" v-on:click="state.plate.source = 'S1'">RESET</div>
                                <div class="radios">
                                    <div class="button" v-bind:class="{ selected: state.plate.source === 'S1' }" v-on:click="state.plate.source = 'S1'">Stream 1</div>
                                    <div class="button" v-bind:class="{ selected: state.plate.source === 'S2' }" v-on:click="state.plate.source = 'S2'">Stream 2</div>
                                    <div class="button" v-bind:class="{ selected: state.plate.source === 'M1' }" v-on:click="state.plate.source = 'M1'">Media 1</div>
                                    <div class="button" v-bind:class="{ selected: state.plate.source === 'M2' }" v-on:click="state.plate.source = 'M2'">Media 2</div>
                                    <div class="button" v-bind:class="{ selected: state.plate.source === 'M3' }" v-on:click="state.plate.source = 'M3'">Media 3</div>
                                    <div class="button" v-bind:class="{ selected: state.plate.source === 'M4' }" v-on:click="state.plate.source = 'M4'">Media 4</div>
                                </div>

                                <div class="label1">fade</div>
                                <div class="label2">(time)</div>
                                <div class="label3">[sec]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.fadeTime)"
                                        v-on:change="(ev) => state.plate.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 4.0)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.fadeTime = 2.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.fadeTime"
                                        v-bind:min="0.0" v-bind:max="4.0" v-bind:step="0.10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">scale</div>
                                <div class="label2">(resize)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.scale)"
                                        v-on:change="(ev) => state.plate.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 3.5)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.scale = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.scale"
                                        v-bind:min="0.1" v-bind:max="3.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">rotate</div>
                                <div class="label2">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.rotate)"
                                        v-on:change="(ev) => state.plate.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.rotate = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.rotate"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lift</div>
                                <div class="label2">(shift down/up)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.lift)"
                                        v-on:change="(ev) => state.plate.lift = fieldImport((ev.target! as HTMLInputElement).value, -2.0, +2.0)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.lift = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.lift"
                                        v-bind:min="-2.0" v-bind:max="+2.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">distance</div>
                                <div class="label2">(shift bwd/fwd)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.distance)"
                                        v-on:change="(ev) => state.plate.distance = fieldImport((ev.target! as HTMLInputElement).value, -2.0, +2.0)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.distance = 0.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.distance"
                                        v-bind:min="-2.0" v-bind:max="+2.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">opacity</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[percent]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.opacity)"
                                        v-on:change="(ev) => state.plate.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.opacity = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.opacity"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(radius)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.borderRad)"
                                        v-on:change="(ev) => state.plate.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.borderRad = 40">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.borderRad"
                                        v-bind:min="0" v-bind:max="540" v-bind:step="10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(cropping)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.borderCrop)"
                                        v-on:change="(ev) => state.plate.borderCrop = fieldImport((ev.target! as HTMLInputElement).value, 0, 50)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.borderCrop = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.borderCrop"
                                        v-bind:min="0" v-bind:max="50" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(enable)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.plate.chromaKey.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.plate.chromaKey.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.plate.chromaKey.enable"></toggle>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(threshold)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.chromaKey.threshold)"
                                        v-on:change="(ev) => state.plate.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.chromaKey.threshold = 0.4">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.chromaKey.threshold"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(smoothing)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.plate.chromaKey.smoothing)"
                                        v-on:change="(ev) => state.plate.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
                                </div>
                                <div class="button" v-on:click="state.plate.chromaKey.smoothing = 0.1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.plate.chromaKey.smoothing"
                                        v-bind:min="0.0" v-bind:max="0.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== HOLOGRAM ====  -->
                        <tab id="hologram" name="Hologram">
                            <div class="desc">
                                The <b>Hologram</b> is the optional planar display which can be projected
                                into the room in the FRONT layer. It can be scaled in size, positioned in a radial way on the background canvas,
                                its opacity controlled to mix with the canvas, a border radius applied, a border cropping applied,
                                and a chroma-key filter applied.
                            </div>
                            <div class="control">
                                <div class="label1">enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.hologram.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.hologram.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.hologram.enable"></toggle>
                                </div>

                                <div class="label1">source</div>
                                <div class="label2">(source)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.hologram.source }}</div>
                                </div>
                                <div class="button" v-on:click="state.hologram.source = 'S2'">RESET</div>
                                <div class="radios">
                                    <div class="button" v-bind:class="{ selected: state.hologram.source === 'S1' }" v-on:click="state.hologram.source = 'S1'">Stream 1</div>
                                    <div class="button" v-bind:class="{ selected: state.hologram.source === 'S2' }" v-on:click="state.hologram.source = 'S2'">Stream 2</div>
                                    <div class="button" v-bind:class="{ selected: state.hologram.source === 'M1' }" v-on:click="state.hologram.source = 'M1'">Media 1</div>
                                    <div class="button" v-bind:class="{ selected: state.hologram.source === 'M2' }" v-on:click="state.hologram.source = 'M2'">Media 2</div>
                                    <div class="button" v-bind:class="{ selected: state.hologram.source === 'M3' }" v-on:click="state.hologram.source = 'M3'">Media 3</div>
                                    <div class="button" v-bind:class="{ selected: state.hologram.source === 'M4' }" v-on:click="state.hologram.source = 'M4'">Media 4</div>
                                </div>

                                <div class="label1">fade</div>
                                <div class="label2">(time)</div>
                                <div class="label3">[sec]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.fadeTime)"
                                        v-on:change="(ev) => state.hologram.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 4.0)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.fadeTime = 2.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.fadeTime"
                                        v-bind:min="0.0" v-bind:max="4.0" v-bind:step="0.10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">scale</div>
                                <div class="label2">(resize)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.scale)"
                                        v-on:change="(ev) => state.hologram.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 3.5)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.scale = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.scale"
                                        v-bind:min="0.1" v-bind:max="3.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">rotate</div>
                                <div class="label2">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.rotate)"
                                    v-on:change="(ev) => state.hologram.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.rotate = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.rotate"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lift</div>
                                <div class="label2">(shift down/up)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.lift)"
                                        v-on:change="(ev) => state.hologram.lift = fieldImport((ev.target! as HTMLInputElement).value, -2.0, +2.0)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.lift = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.lift"
                                        v-bind:min="-2.0" v-bind:max="+2.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">distance</div>
                                <div class="label2">(shift bwd/fwd)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.distance)"
                                        v-on:change="(ev) => state.hologram.distance = fieldImport((ev.target! as HTMLInputElement).value, -2.0, +2.0)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.distance = 0.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.distance"
                                        v-bind:min="-2.0" v-bind:max="+2.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">opacity</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[percent]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.opacity)"
                                        v-on:change="(ev) => state.hologram.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.opacity = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.opacity"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(radius)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.borderRad)"
                                        v-on:change="(ev) => state.hologram.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.borderRad = 40">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.borderRad"
                                        v-bind:min="0" v-bind:max="540" v-bind:step="10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(cropping)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.borderCrop)"
                                        v-on:change="(ev) => state.hologram.borderCrop = fieldImport((ev.target! as HTMLInputElement).value, 0, 50)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.borderCrop = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.borderCrop"
                                        v-bind:min="0" v-bind:max="50" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(enable)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.hologram.chromaKey.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.hologram.chromaKey.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.hologram.chromaKey.enable"></toggle>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(threshold)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.chromaKey.threshold)"
                                        v-on:change="(ev) => state.hologram.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.chromaKey.threshold = 0.4">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.chromaKey.threshold"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(smoothing)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.hologram.chromaKey.smoothing)"
                                        v-on:change="(ev) => state.hologram.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
                                </div>
                                <div class="button" v-on:click="state.hologram.chromaKey.smoothing = 0.1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.hologram.chromaKey.smoothing"
                                        v-bind:min="0.0" v-bind:max="0.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== PANE ====  -->
                        <tab id="pane" name="Pane">
                            <div class="desc">
                                The <b>Pane</b> is the optional TV-style glass box which can be projected
                                into the room in the FRONT layer. It can be scaled in size, and positioned on in a
                                radial way in front of the scene. It is similar to <b>Monitor</b>
                                but shown on the front instead of the back of the scene.
                            </div>
                            <div class="control">
                                <div class="label1">enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.pane.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.pane.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.pane.enable"></toggle>
                                </div>

                                <div class="label1">source</div>
                                <div class="label2">(source)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.pane.source }}</div>
                                </div>
                                <div class="button" v-on:click="state.pane.source = 'S2'">RESET</div>
                                <div class="radios">
                                    <div class="button" v-bind:class="{ selected: state.pane.source === 'S1' }" v-on:click="state.pane.source = 'S1'">Stream 1</div>
                                    <div class="button" v-bind:class="{ selected: state.pane.source === 'S2' }" v-on:click="state.pane.source = 'S2'">Stream 2</div>
                                    <div class="button" v-bind:class="{ selected: state.pane.source === 'M1' }" v-on:click="state.pane.source = 'M1'">Media 1</div>
                                    <div class="button" v-bind:class="{ selected: state.pane.source === 'M2' }" v-on:click="state.pane.source = 'M2'">Media 2</div>
                                    <div class="button" v-bind:class="{ selected: state.pane.source === 'M3' }" v-on:click="state.pane.source = 'M3'">Media 3</div>
                                    <div class="button" v-bind:class="{ selected: state.pane.source === 'M4' }" v-on:click="state.pane.source = 'M4'">Media 4</div>
                                </div>

                                <div class="label1">fade</div>
                                <div class="label2">(time)</div>
                                <div class="label3">[sec]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.fadeTime)"
                                        v-on:change="(ev) => state.pane.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 4.0)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.fadeTime = 2.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.fadeTime"
                                        v-bind:min="0.0" v-bind:max="4.0" v-bind:step="0.10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">scale</div>
                                <div class="label2">(resize)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.scale)"
                                        v-on:change="(ev) => state.pane.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 2.2)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.scale = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.scale"
                                        v-bind:min="0.1" v-bind:max="2.2" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">rotate</div>
                                <div class="label3">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.rotate)"
                                        v-on:change="(ev) => state.pane.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.rotate = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.rotate"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lift</div>
                                <div class="label2">(shift down/up)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.lift)"
                                        v-on:change="(ev) => state.pane.lift = fieldImport((ev.target! as HTMLInputElement).value, -150, +70)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.lift = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.lift"
                                        v-bind:min="-150" v-bind:max="+70" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">distance</div>
                                <div class="label2">(shift bwd/fwd)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.distance)"
                                        v-on:change="(ev) => state.pane.distance = fieldImport((ev.target! as HTMLInputElement).value, -1.5, +0.4)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.distance = 0.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.distance"
                                        v-bind:min="-1.5" v-bind:max="+0.4" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">opacity</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[percent]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.opacity)"
                                        v-on:change="(ev) => state.pane.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.opacity = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.opacity"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(enable)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.pane.chromaKey.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.pane.chromaKey.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.pane.chromaKey.enable"></toggle>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(threshold)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.chromaKey.threshold)"
                                        v-on:change="(ev) => state.pane.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.chromaKey.threshold = 0.4">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.chromaKey.threshold"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(smoothing)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pane.chromaKey.smoothing)"
                                        v-on:change="(ev) => state.pane.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
                                </div>
                                <div class="button" v-on:click="state.pane.chromaKey.smoothing = 0.1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pane.chromaKey.smoothing"
                                        v-bind:min="0.0" v-bind:max="0.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== PILLAR ====  -->
                        <tab id="pillar" name="Pillar">
                            <div class="desc">
                                The <b>Pillar</b> is the optional pillar with an embedded display,
                                which can be projected into the room in the FRONT layer.
                                It can be scaled in size, and positioned on in a radial way in front of the scene. It
                                can be scaled in size, positioned in a radial way, the opacity of its display
                                controlled, a border radius applied, a border cropping applied, and a chroma-key
                                filter applied.
                            </div>
                            <div class="control">
                                <div class="label1">enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.pillar.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.pillar.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.pillar.enable"></toggle>
                                </div>

                                <div class="label1">source</div>
                                <div class="label2">(source)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.pillar.source }}</div>
                                </div>
                                <div class="button" v-on:click="state.pillar.source = 'S2'">RESET</div>
                                <div class="radios">
                                    <div class="button" v-bind:class="{ selected: state.pillar.source === 'S1' }" v-on:click="state.pillar.source = 'S1'">Stream 1</div>
                                    <div class="button" v-bind:class="{ selected: state.pillar.source === 'S2' }" v-on:click="state.pillar.source = 'S2'">Stream 2</div>
                                    <div class="button" v-bind:class="{ selected: state.pillar.source === 'M1' }" v-on:click="state.pillar.source = 'M1'">Media 1</div>
                                    <div class="button" v-bind:class="{ selected: state.pillar.source === 'M2' }" v-on:click="state.pillar.source = 'M2'">Media 2</div>
                                    <div class="button" v-bind:class="{ selected: state.pillar.source === 'M3' }" v-on:click="state.pillar.source = 'M3'">Media 3</div>
                                    <div class="button" v-bind:class="{ selected: state.pillar.source === 'M4' }" v-on:click="state.pillar.source = 'M4'">Media 4</div>
                                </div>

                                <div class="label1">fade</div>
                                <div class="label2">(time)</div>
                                <div class="label3">[sec]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.fadeTime)"
                                        v-on:change="(ev) => state.pillar.fadeTime = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 4.0)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.fadeTime = 2.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.fadeTime"
                                        v-bind:min="0.0" v-bind:max="4.0" v-bind:step="0.10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">scale</div>
                                <div class="label2">(resize)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.scale)"
                                        v-on:change="(ev) => state.pillar.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.1, 2.2)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.scale = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.scale"
                                        v-bind:min="0.1" v-bind:max="2.2" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">rotate</div>
                                <div class="label3">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.rotate)"
                                        v-on:change="(ev) => state.pillar.rotate = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.rotate = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.rotate"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lift</div>
                                <div class="label2">(shift down/up)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.lift)"
                                        v-on:change="(ev) => state.pillar.lift = fieldImport((ev.target! as HTMLInputElement).value, -150, +70)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.lift = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.lift"
                                        v-bind:min="-150" v-bind:max="+70" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">distance</div>
                                <div class="label2">(shift bwd/fwd)</div>
                                <div class="label3">[m]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.distance)"
                                        v-on:change="(ev) => state.pillar.distance = fieldImport((ev.target! as HTMLInputElement).value, -1.5, +0.4)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.distance = 0.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.distance"
                                        v-bind:min="-1.5" v-bind:max="+0.4" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">opacity</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[percent]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.opacity)"
                                        v-on:change="(ev) => state.pillar.opacity = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.opacity = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.opacity"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(radius)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.borderRad)"
                                        v-on:change="(ev) => state.pillar.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.borderRad = 40">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.borderRad"
                                        v-bind:min="0" v-bind:max="540" v-bind:step="10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(cropping)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.borderCrop)"
                                        v-on:change="(ev) => state.pillar.borderCrop = fieldImport((ev.target! as HTMLInputElement).value, 0, 50)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.borderCrop = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.borderCrop"
                                        v-bind:min="0" v-bind:max="50" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(enable)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.pillar.chromaKey.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.pillar.chromaKey.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.pillar.chromaKey.enable"></toggle>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(threshold)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.chromaKey.threshold)"
                                        v-on:change="(ev) => state.pillar.chromaKey.threshold = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 1.0)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.chromaKey.threshold = 0.4">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.chromaKey.threshold"
                                        v-bind:min="0.0" v-bind:max="1.0" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">chromaKey</div>
                                <div class="label2">(smoothing)</div>
                                <div class="label3">[distance]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.pillar.chromaKey.smoothing)"
                                        v-on:change="(ev) => state.pillar.chromaKey.smoothing = fieldImport((ev.target! as HTMLInputElement).value, 0.0, 0.5)"/>
                                </div>
                                <div class="button" v-on:click="state.pillar.chromaKey.smoothing = 0.1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.pillar.chromaKey.smoothing"
                                        v-bind:min="0.0" v-bind:max="0.5" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== MASK ====  -->
                        <tab id="mask" name="Mask">
                            <div class="desc">
                                The <b>Mask</b> is the optional planar display which can be projected
                                directly in front of the camera viewpoint in the FRONT layer. It is automatically
                                positioned and scaled to fit into the viewpoint of the camera. It is
                                intended to be used for short-term displaying fullscreen content.
                            </div>
                            <div class="control">
                                <div class="label1">enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.mask.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.mask.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.mask.enable"></toggle>
                                </div>

                                <div class="label1">source</div>
                                <div class="label2">(source)</div>
                                <div class="label3">[id]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.mask.source }}</div>
                                </div>
                                <div class="button" v-on:click="state.mask.source = 'S2'">RESET</div>
                                <div class="radios">
                                    <div class="button" v-bind:class="{ selected: state.mask.source === 'S1' }" v-on:click="state.mask.source = 'S1'">Stream 1</div>
                                    <div class="button" v-bind:class="{ selected: state.mask.source === 'S2' }" v-on:click="state.mask.source = 'S2'">Stream 2</div>
                                    <div class="button" v-bind:class="{ selected: state.mask.source === 'M1' }" v-on:click="state.mask.source = 'M1'">Media 1</div>
                                    <div class="button" v-bind:class="{ selected: state.mask.source === 'M2' }" v-on:click="state.mask.source = 'M2'">Media 2</div>
                                    <div class="button" v-bind:class="{ selected: state.mask.source === 'M3' }" v-on:click="state.mask.source = 'M3'">Media 3</div>
                                    <div class="button" v-bind:class="{ selected: state.mask.source === 'M4' }" v-on:click="state.mask.source = 'M4'">Media 4</div>
                                </div>

                                <div class="label1">scale</div>
                                <div class="label2">(resize)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.mask.scale)"
                                        v-on:change="(ev) => state.mask.scale = fieldImport((ev.target! as HTMLInputElement).value, 0.8, 1.2)"/>
                                </div>
                                <div class="button" v-on:click="state.mask.scale = 1.0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.mask.scale"
                                        v-bind:min="0.8" v-bind:max="1.2" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">border</div>
                                <div class="label2">(radius)</div>
                                <div class="label3">[px]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.mask.borderRad)"
                                        v-on:change="(ev) => state.mask.borderRad = fieldImport((ev.target! as HTMLInputElement).value, 0, 540)"/>
                                </div>
                                <div class="button" v-on:click="state.mask.borderRad = 40">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.mask.borderRad"
                                        v-bind:min="0" v-bind:max="540" v-bind:step="10"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>
                    </tabs>
                </tab>
                <tab id="ambient" name="Ambient">
                    <tabs ref="ambient" v-bind:options="{ useUrlFragment: false }" v-bind:cache-lifetime="0" class="tabs-level-2" v-on:changed="tabChanged1">
                        <!--  ==== LIGHTS ====  -->
                        <tab id="lights" name="Lights">
                            <div class="desc">
                                The <b>Lights</b> are three optional, additional point lights in the scene,
                                which can further light up the scene and especially produce a shadow of
                                the monitor on the background canvas.
                            </div>
                            <div class="control">
                                <div class="label1">intensity1</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[lum]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity1, 0)"
                                        v-on:change="(ev) => state.lights.intensity1 = fieldImport((ev.target! as HTMLInputElement).value, 0, 600)"/>
                                </div>
                                <div class="button" v-on:click="state.lights.intensity1 = 300">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.lights.intensity1"
                                        v-bind:min="0" v-bind:max="600" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">intensity2</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[lum]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity2, 0)"
                                        v-on:change="(ev) => state.lights.intensity2 = fieldImport((ev.target! as HTMLInputElement).value, 0, 600)"/>
                                </div>
                                <div class="button" v-on:click="state.lights.intensity2 = 300">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.lights.intensity2"
                                        v-bind:min="0" v-bind:max="600" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">intensity3</div>
                                <div class="label2">(less/more)</div>
                                <div class="label3">[lum]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.lights.intensity3, 0)"
                                        v-on:change="(ev) => state.lights.intensity3 = fieldImport((ev.target! as HTMLInputElement).value, 0, 600)"/>
                                </div>
                                <div class="button" v-on:click="state.lights.intensity3 = 300">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.lights.intensity3"
                                        v-bind:min="0" v-bind:max="600" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== AVATARS ====  -->
                        <tab name="Avatars">
                            <div class="desc">
                                The <b>Avatars</b> are the two optional 3D models of a latin woman (A1, <i>Sophia</i>) and a
                                european man (A2, <i>Dennis</i>) which can be temporarily placed into the scene
                                to help setting up the various virtual pan/tilt/zoom (PTZ) views of the scene.
                                Their body height can be adjusted and they can be rotated onto the usual 9
                                positions on the scene.
                            </div>
                            <div class="control">
                                <div class="label1">A1 enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.avatars.enable1 ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.avatars.enable1 = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.avatars.enable1"></toggle>
                                </div>

                                <div class="label1">A1 size</div>
                                <div class="label2">(height)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.avatars.size1)"
                                        v-on:change="(ev) => state.avatars.size1 = fieldImport((ev.target! as HTMLInputElement).value, 160, 210)"/>
                                </div>
                                <div class="button" v-on:click="state.avatars.size1 = 185">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.avatars.size1"
                                        v-bind:min="160" v-bind:max="210" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">A1 rotate</div>
                                <div class="label2">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.avatars.rotate1)"
                                        v-on:change="(ev) => state.avatars.rotate1 = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.avatars.rotate1 = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.avatars.rotate1"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="7"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">A2 enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.avatars.enable2 ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.avatars.enable2 = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.avatars.enable2"></toggle>
                                </div>

                                <div class="label1">A2 size</div>
                                <div class="label2">(height)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.avatars.size2)"
                                        v-on:change="(ev) => state.avatars.size2 = fieldImport((ev.target! as HTMLInputElement).value, 160, 210)"/>
                                </div>
                                <div class="button" v-on:click="state.avatars.size2 = 185">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.avatars.size2"
                                        v-bind:min="160" v-bind:max="210" v-bind:step="1"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">A2 rotate</div>
                                <div class="label2">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="8" v-bind:value="fieldExport(state.avatars.rotate2)"
                                        v-on:change="(ev) => state.avatars.rotate2 = fieldImport((ev.target! as HTMLInputElement).value, -90, +90)"/>
                                </div>
                                <div class="button" v-on:click="state.avatars.rotate2 = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="state.avatars.rotate2"
                                        v-bind:min="-90" v-bind:max="+90" v-bind:step="7"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                            </div>
                        </tab>

                        <!--  ==== REFERENCES ====  -->
                        <tab name="References">
                            <div class="desc">
                                The <b>References</b> are the optional red balls in the scence
                                which can help calibrating the virtual cameras against the physical
                                camera viewpoint before an event. If calibrated correctly, the virtual balls
                                in the scene should match as close as possible with the physical red markers
                                on the stage.
                            </div>
                            <div class="control">
                                <div class="label1">enable</div>
                                <div class="label2">(visible)</div>
                                <div class="label3">[flag]:</div>
                                <div class="value">
                                    <div class="fixed">{{ state.references.enable ? "YES" : "NO" }}</div>
                                </div>
                                <div class="button" v-on:click="state.references.enable = false">RESET</div>
                                <div class="slider">
                                    <toggle class="toggle" v-model="state.references.enable"></toggle>
                                </div>
                            </div>
                        </tab>
                    </tabs>
                </tab>
                <tab id="cameras" name="Cameras">
                    <tabs ref="cameras" v-bind:options="{ useUrlFragment: false }" v-bind:cache-lifetime="0" class="tabs-level-2" v-on:changed="tabChanged1">
                        <!--  ==== CAM1/2/3/4 ====  -->
                        <tab v-for="cam in [ 'CAM1', 'CAM2', 'CAM3', 'CAM4' ]" v-bind:key="cam" v-bind:id="cam.toLowerCase()" v-bind:name="cam">
                            <div class="desc">
                                The <b>{{ cam }}</b> is a digital twin of the corresponding physical
                                camera. It has to be calibrated to match as close
                                as possible to the physical viewpoint of the camera in order
                                to allow precise pan/tilt/zoom (PTZ) of both the physical camera via NDI
                                and PTZ of the virtual camera via the FreeD information emitted by the physical
                                camera.
                            </div>
                            <div class="control">
                                <div class="label1">hull X-pos</div>
                                <div class="label2">(shift bwd/fwd)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="1" v-bind:value="fieldExport((state as any)[cam].hullPosition.x)"
                                        v-on:change="(ev) => (state as any)[cam].hullPosition.x = fieldImport((ev.target! as HTMLInputElement).value, -50, +50)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].hullPosition.x = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].hullPosition.x"
                                        v-bind:min="-50" v-bind:max="+50" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">hull Y-pos</div>
                                <div class="label2">(shift left/right)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="2" v-bind:value="fieldExport((state as any)[cam].hullPosition.y)"
                                        v-on:change="(ev) => (state as any)[cam].hullPosition.y = fieldImport((ev.target! as HTMLInputElement).value, -50, +50)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].hullPosition.y = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].hullPosition.y"
                                        v-bind:min="-50" v-bind:max="+50" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">hull Z-pos</div>
                                <div class="label2">(shift down/up)</div>
                                <div class="label3">[cm]:</div>
                                <div class="value">
                                    <input tabindex="3" v-bind:value="fieldExport((state as any)[cam].hullPosition.z)"
                                        v-on:change="(ev) => (state as any)[cam].hullPosition.z = fieldImport((ev.target! as HTMLInputElement).value, -50, +50)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].hullPosition.z = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].hullPosition.z"
                                        v-bind:min="-50" v-bind:max="+50" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">case X-rot</div>
                                <div class="label2">(tilt down/up)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="4" v-bind:value="fieldExport((state as any)[cam].caseRotation.x)"
                                        v-on:change="(ev) => (state as any)[cam].caseRotation.x = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].caseRotation.x = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].caseRotation.x"
                                        v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">case Y-rot</div>
                                <div class="label2">(pan left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="5" v-bind:value="fieldExport((state as any)[cam].caseRotation.y)"
                                        v-on:change="(ev) => (state as any)[cam].caseRotation.y = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].caseRotation.y = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].caseRotation.y"
                                        v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">case Y-rot</div>
                                <div class="label2">(pan left/right)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="7" v-bind:value="fieldExport((state as any)[cam].caseRotation.ym)"
                                        v-on:change="(ev) => (state as any)[cam].caseRotation.ym = fieldImport((ev.target! as HTMLInputElement).value, 0, +2)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].caseRotation.ym = 1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].caseRotation.ym"
                                        v-bind:min="0" v-bind:max="+2" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">case Z-rot</div>
                                <div class="label2">(rotate left/right)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="6" v-bind:value="fieldExport((state as any)[cam].caseRotation.z)"
                                        v-on:change="(ev) => (state as any)[cam].caseRotation.z = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].caseRotation.z = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].caseRotation.z"
                                        v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lens X-rot</div>
                                <div class="label2">(tilt down/up)</div>
                                <div class="label3">[deg]:</div>
                                <div class="value">
                                    <input tabindex="4" v-bind:value="fieldExport((state as any)[cam].lensRotation.x)"
                                        v-on:change="(ev) => (state as any)[cam].lensRotation.x = fieldImport((ev.target! as HTMLInputElement).value, -20, +20)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].lensRotation.x = 0">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].lensRotation.x"
                                        v-bind:min="-20" v-bind:max="+20" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <div class="label1">lens X-rot</div>
                                <div class="label2">(tilt down/up)</div>
                                <div class="label3">[mult]:</div>
                                <div class="value">
                                    <input tabindex="7" v-bind:value="fieldExport((state as any)[cam].lensRotation.xm)"
                                        v-on:change="(ev) => (state as any)[cam].lensRotation.xm = fieldImport((ev.target! as HTMLInputElement).value, 0, +2)"/>
                                </div>
                                <div class="button" v-on:click="(state as any)[cam].lensRotation.xm = 1">RESET</div>
                                <div class="slider">
                                    <slider class="slider" v-model="(state as any)[cam].lensRotation.xm"
                                        v-bind:min="0" v-bind:max="+2" v-bind:step="0.01"
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>

                                <!--
                                FIXME: currently unused!
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
                                        show-tooltip="drag" v-bind:format="formatSliderValue" v-bind:lazy="false"
                                    ></slider>
                                </div>
                                -->
                            </div>
                        </tab>
                    </tabs>
                </tab>
            </tabs>
        </div>

        <!--  FOOTER  -->
        <div class="foot" v-bind:class="{
            error:   status.kind === 'error',
            warning: status.kind === 'warning',
            info:    status.kind === 'info'
        }">
            <!--  Application Status Information  -->
            <div class="status">
                {{ status.kind === '' ? `${pkg.name} ${pkg.version} (${pkg["x-date"]})` : status.msg }}
            </div>

            <!--  Server Connection Information  -->
            <div class="connection">
                <!--  Online  -->
                <div class="online yes" v-show="connection.online">
                    <i class="fa-solid fa-plug-circle-check"></i>
                </div>
                <div class="online no" v-show="!connection.online">
                    <i class="fa-solid fa-plug-circle-xmark"></i>
                </div>

                <!--  Traffic Send  -->
                <div class="traffic send" v-bind:class="{ active: connection.send }">
                    <i class="fa-solid fa-circle"></i>
                </div>

                <!--  Traffic Recv  -->
                <div class="traffic recv" v-bind:class="{ active: connection.recv }">
                    <i class="fa-solid fa-circle"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
.app-control
    width:  100vw
    height: 100vh
    min-width: 900px
    min-height: 600px
    overflow: hidden
    margin: 0
    padding: 0
    display: flex
    flex-direction: column
    justify-items: center
    align-items: center
    .head
        background-color: var(--color-std-bg-1)
        color: var(--color-std-fg-1)
        padding: 10px 40px
        width:  calc(100% - 2 * 40px)
        height: 20px
        font-weight: 200
        font-size: 20px
        line-height: 20px
        position: relative
        .logo
            position: relative
            top: 2px
            height: 20px
            margin-right: 10px
        .stats
            border: 1px solid var(--color-std-bg-3)
            background-color: var(--color-std-bg-2)
            position: absolute
            right: 40px
            top: 8px
            font-size: 12pt
            font-weight: normal
            border-radius: 4px
            padding: 2px 8px 2px 8px
            .icon
                color: var(--color-std-fg-1)
                margin-right: 8px
            .figure
                color: var(--color-std-fg-5)
                margin-right: 16px
    .body
        flex-grow: 1
        background-color: var(--color-std-bg-0)
        color: var(--color-std-fg-5)
        padding: 10px 10px
        width:  calc(100% - 2 * 10px)
        height: calc(100% - 2 * 10px)
        overflow: hidden
    .foot
        background-color: var(--color-std-bg-1)
        color: var(--color-std-fg-1)
        padding: 13px 40px
        width:  calc(100% - 2 * 40px)
        height: 14px
        font-weight: 200
        font-size: 14px
        line-height: 14px
        display: flex
        flex-direction: row
        justify-items: center
        align-items: center
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
        .status
            flex-grow: 1
        .connection
            border: 1px solid var(--color-std-bg-3)
            background-color: var(--color-std-bg-2)
            border-radius: 4px
            padding: 4px 8px 4px 8px
            display: flex
            flex-direction: row
            justify-items: center
            align-items: center
            .online
                margin-right: 8px
                &.yes
                    color: var(--color-std-fg-1)
                &.no
                    color: var(--color-sig-fg-1)
            .traffic
                &.send
                    margin-right: 4px
                    color: var(--color-std-fg-1)
                    &.active
                        color: var(--color-sig-fg-1)
                &.recv
                    color: var(--color-std-fg-1)
                    &.active
                        color: var(--color-acc-fg-1)
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
        width: 100%
    .tabs-component-tab-a
        padding: 2px 4px 2px 4px
        font-size: 11pt
    .desc
        font-weight: 200
        color: var(--color-std-fg-3)
        margin-bottom: 20px
        b
            font-weight: normal
    .presets
        display: flex
        flex-direction: row
        justify-items: flex-start
        align-items: center
        .slots
            margin-right: 20px
            display: grid
            grid-template-columns: 70px 70px 70px
            grid-template-rows: 65px 65px 65px 65px
            justify-items: center
            align-items: center
            gap: 10px 10px
        .actions0,
        .actions1,
        .actions3
            margin-right: 10px
            display: grid
            grid-template-columns: 100px
            grid-template-rows: 140px 140px
            justify-items: center
            align-items: center
            gap: 10px 10px
        .actions2
            display: grid
            grid-template-columns: 100px
            grid-template-rows: 290px
            justify-items: center
            align-items: center
            gap: 10px 10px
        .filter
            margin-right: 20px
            display: grid
            grid-template-columns: 100px 100px
            grid-template-rows: 27px 27px 27px 27px 27px 27px 27px 27px 27px
            justify-items: center
            align-items: center
            gap: 6px 6px
        .button
            background-color: var(--color-std-bg-2)
            color: var(--color-std-fg-5)
            border-radius: 4px
            padding: 2px 8px 2px 8px
            text-align: center
            font-size: 12pt
            line-height: 50px
            width: calc(100% - 2 * 8px)
            height: calc(100% - 2 * 2px)
            position: relative
            cursor: pointer
            &.selected
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
            &.destructive:hover
                background-color: var(--color-sig-bg-2)
                color: var(--color-sig-fg-5)
            .badge
                position: absolute
                right: -2px
                top: -2px
                line-height: 24px
                width: 24px
                height: 24px
                border-radius: 12px
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
            .lock
                position: absolute
                left: -2px
                top: -2px
                line-height: 24px
                width: 24px
                height: 24px
                border-radius: 12px
                font-size: 14px
                font-weight: normal
                background-color: var(--color-sig-bg-2)
                color: var(--color-sig-fg-5)
        .filter .button
            font-weight: 200
            line-height: 22px
        .slots .button
            font-size: 150%
            font-weight: bold
            line-height: 65px
        .actions0 .button
            font-size: 120%
            font-weight: bold
            line-height: 140px
            &.unselectable:hover
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-5)
                cursor: default
        .actions1 .button
            font-size: 120%
            font-weight: bold
            line-height: 140px
            &.unselectable:hover
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-5)
                cursor: default
        .actions2 .button
            font-size: 120%
            font-weight: bold
            line-height: 290px
            &.unselectable:hover
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-5)
                cursor: default
        .actions3 .button
            line-height: 140px
    .preview
        .preview-control
            margin-top: 20px
            display: flex
            flex-direction: row
            justify-items: flex-start
            align-items: center
            .cams
                display: grid
                grid-template-columns: 80px 80px 80px 80px
                grid-template-rows: 110px
                justify-items: center
                align-items: center
                gap: 10px 10px
                margin-right: 20px
                cursor: pointer
                .button
                    line-height: 110px !important
            .layer
                display: grid
                grid-template-columns: 80px
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
                    background-color: var(--color-std-bg-2)
                    color: var(--color-std-fg-2)
                    display: grid
                    grid-template-columns: 100px 80px
                    grid-template-rows: 50px
                    justify-items: start
                    align-items: center
                    gap: 10px 10px
                    padding: 0 10px 0 10px
                    border-radius: 4px
            .action
                display: grid
                grid-template-columns: 80px
                grid-template-rows: 50px 50px
                justify-items: center
                align-items: center
                gap: 10px 10px
            .button
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-1)
                border-radius: 4px
                padding: 2px 8px 2px 8px
                text-align: center
                font-size: 12pt
                line-height: 50px
                width: calc(100% - 2 * 8px)
                height: calc(100% - 2 * 2px)
                cursor: pointer
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
        width: calc(100% - 48px)
        overflow-y: scroll
        overflow-x: hidden
        position: relative
        margin-top: 10px
        padding: 4px 4px 4px 4px
        border-radius: 4px
        background-color: var(--color-std-bg-2)
        height: 320px
        min-height: 320px
        max-height: 320px
        .list-group
            cursor: pointer
            color: var(--color-std-fg-5)
            background-color: var(--color-std-bg-4)
            display: flex
            flex-direction: column
            &.alt
                background-color: var(--color-std-bg-5)
            &.selected
                color: var(--color-acc-fg-5)
            > .name
                padding: 1px 10px 1px 10px
                width: 100%
                font-weight: bold
                > .icon
                    display: inline-block
                    width: 20px
            .list-entry
                padding: 1px 10px 1px 30px
        .list-entry
            cursor: pointer
            color: var(--color-std-fg-5)
            background-color: var(--color-std-bg-3)
            padding: 1px 10px 1px 10px
            display: flex
            flex-direction: row
            &.alt
                background-color: var(--color-std-bg-4)
            &.selected
                color: var(--color-acc-fg-5)
                background-color: var(--color-acc-bg-3)
                border-radius: 4px
            &:hover
                background-color: var(--color-acc-bg-1)
            &.alt:hover
                background-color: var(--color-acc-bg-2)
            &.selected:hover
                background-color: var(--color-acc-bg-3)
            .name
                width: 100%
            .tags
                width: 120px
                display: flex
                flex-direction: row
                .tag
                    width: 40px
                    padding: 4px 4px 0 4px
                    text-align: center
                    border-radius: 4px
                    margin-right: 4px
                    font-size: 75%
                    &.tag-type
                        color: var(--color-std-fg-2)
                        border: 1px solid var(--color-std-bg-1)
                        width: 80px
                        margin-right: 20px
                    &.tag-fade
                        background-color: var(--color-acc-bg-2)
                        color: var(--color-acc-fg-5)
                    &.tag-exclusive
                        background-color: var(--color-sig-bg-2)
                        color: var(--color-sig-fg-5)
            .actions
                display: flex
                flex-direction: row
                .button
                    background-color: var(--color-std-bg-1)
                    color: var(--color-std-fg-1)
                    border-radius: 4px
                    padding: 2px 8px 2px 8px
                    text-align: center
                    font-size: 12pt
                    line-height: 22px
                    width: 60px
                    height: auto
                    cursor: pointer
                    margin-left: 4px
                    &.selected
                        background-color: var(--color-acc-bg-3)
                        color: var(--color-acc-fg-5)
                    &:hover
                        background-color: var(--color-acc-bg-5)
                        color: var(--color-acc-fg-5)
    .media
        .list
            .list-entry
                &:hover
                    background-color: var(--color-std-bg-3)
                &.alt:hover
                    background-color: var(--color-std-bg-4)
    .canvas,
    .media >
        .actions
            margin-top: 10px
            display: flex
            flex-direction: row
            > .button
                background-color: var(--color-std-bg-1)
                color: var(--color-std-fg-1)
                border-radius: 4px
                padding: 2px 8px 2px 8px
                text-align: center
                font-size: 12pt
                line-height: 24px
                width: 100px
                height: auto
                cursor: pointer
                margin-right: 4px
                &:hover
                    background-color: var(--color-sig-bg-5)
                    color: var(--color-sig-fg-5)
                &.unselectable:hover
                    background-color: var(--color-std-bg-1)
                    color: var(--color-std-fg-1)
                    cursor: default
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
            background-color: var(--color-std-bg-2)
            color: var(--color-std-fg-5)
            border-radius: 4px
            padding: 2px 8px 2px 8px
            min-height: 20px
            text-align: center
            font-size: 10pt
            font-weight: 200
            cursor: pointer
            &:hover
                background-color: var(--color-acc-bg-4)
                color: var(--color-acc-fg-5)
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
    .mixer
        .cams
            margin-right: 20px
            display: grid
            grid-template-columns: 100px 100px 100px 100px 100px 100px
            grid-template-rows: 90px
            justify-items: center
            align-items: center
            gap: 10px 10px
            .button
                background-color: var(--color-std-bg-2)
                color: var(--color-std-fg-5)
                border-radius: 4px
                padding: 2px 8px 2px 8px
                text-align: center
                font-size: 12pt
                font-weight: normal
                line-height: 50px
                width: calc(100% - 2 * 8px)
                height: calc(100% - 2 * 2px)
                position: relative
                cursor: pointer
                &.selected
                    background-color: var(--color-acc-bg-3)
                    color: var(--color-acc-fg-5)
                &:hover
                    background-color: var(--color-acc-bg-5)
                    color: var(--color-acc-fg-5)
                &.unselectable:hover
                    background-color: var(--color-std-bg-2)
                    color: var(--color-std-fg-5)
                    cursor: default
                &.cut
                    line-height: 90px
                    font-weight: bold
                &.cut:hover
                    background-color: var(--color-sig-bg-2)
                    color: var(--color-sig-fg-5)
                .badge
                    position: absolute
                    top: 40px
                    left: 35px
                    width: 30px
                    height: 30px
                    border-radius: 4px
                    font-size: 16px
                    font-weight: 200
                    line-height: 28px
                    &.other
                        background-color: var(--color-std-bg-4)
                        color: var(--color-std-fg-5)
                    &.preview
                        background-color: var(--color-acc-bg-2)
                        color: var(--color-acc-fg-5)
                    &.program
                        background-color: var(--color-sig-bg-2)
                        color: var(--color-sig-fg-5)
                &:hover .badge.other
                    background-color: var(--color-acc-bg-4)
                    color: var(--color-acc-fg-5)
    .slider
        width: 400px
        --slider-bg: var(--color-std-bg-2)
        --slider-handle-bg: var(--color-std-fg-5)
        --slider-connect-bg: var(--color-acc-bg-5)
        --slider-height: 20px
        --slider-handle-width: 20px
        --slider-handle-height: 20px
        --slider-tooltip-bg: var(--color-std-fg-5)
        --slider-tooltip-color: var(--color-std-bg-2)
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
        --toggle-bg-off: var(--color-std-bg-2)
        --toggle-ring-width: 0
        --toggle-handle-enabled: var(--color-std-fg-5)
    .radios
        display: flex
        flex-direction: row
        justify-items: center
        align-items: center
        .button
            margin-right: 4px
            &.selected
                background-color: var(--color-acc-bg-3)
                color: var(--color-acc-fg-5)
            &:hover
                background-color: var(--color-acc-bg-5)
                color: var(--color-acc-fg-5)
</style>

<script setup lang="ts">
// @ts-ignore
import pkg                 from "../../package.json"
import { defineComponent } from "vue"
import RecWebSocket        from "@opensumi/reconnecting-websocket"
import Ducky               from "ducky"
import Slider              from "@vueform/slider"
import Toggle              from "@vueform/toggle"
import axios               from "axios"
import PerfectScrollbar    from "perfect-scrollbar"
import { Tabs, Tab }       from "vue3-tabs-component"
import { ImageEntry }      from "../common/app-canvas"
import { MediaEntry }      from "../common/app-media"
import {
    StateType, StateTypePartial,
    StateSchema, StateSchemaPartial,
    StateDefault,
    StatePaths,
    StateUtil
} from "../common/app-state"
import { MixerState, MixerFPS } from "../common/app-mixer"
</script>

<script lang="ts">
export const StateFilterKeys = [
    "renderer",
    "streams",
    "media",
    "canvas",
    "monitor",
    "decal",
    "plate",
    "hologram",
    "pane",
    "pillar",
    "mask",
    "lights",
    "avatars",
    "references",
    "CAM1",
    "CAM2",
    "CAM3",
    "CAM4"
]
export type StateFilterType = {
    renderer:   boolean,
    streams:    boolean,
    media:      boolean,
    canvas:     boolean,
    monitor:    boolean,
    decal:      boolean,
    plate:      boolean,
    hologram:   boolean,
    pane:       boolean,
    pillar:     boolean,
    mask:       boolean,
    lights:     boolean,
    avatars:    boolean,
    references: boolean,
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
        selectTab0: { type: String, default: "control" },
        selectTab1: { type: String, default: "presets" },
        serviceUrl: { type: String, default: "" },
        wsUrl:      { type: String, default: "" }
    },
    data: () => ({
        formatSliderValue: (v: number) => v.toFixed(2),
        imageList: [] as ImageEntry[],
        openGroup: "",
        mediaList: [] as MediaEntry[],
        mediaOpenGroup: "",
        ps: null as PerfectScrollbar | null,
        tab0: "",
        tab1: "",
        preset: {
            filters: {
                renderer:   true,
                streams:    true,
                media:      true,
                canvas:     true,
                monitor:    true,
                decal:      true,
                plate:      true,
                hologram:   true,
                pane:       true,
                pillar:     true,
                mask:       true,
                lights:     true,
                avatars:    true,
                references: true,
                CAM1:       true,
                CAM2:       true,
                CAM3:       true,
                CAM4:       true
            } as StateFilterType,
            slot: -1,
            status: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
            locked: [ false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false ]
        },
        state: StateDefault as StateType,
        watchState: true,
        preview: {
            opts: {
                layer: "back",
                cam:   "CAM2",
                home:  true,
                freed: false,
                keys:  true
            },
            url: ""
        },
        status: {
            kind: "",
            msg:  ""
        },
        connection: {
            online: false,
            send:   false,
            recv:   false
        },
        pkg,
        stats: {
            peers: {
                camera:  0,
                render:  0,
                control: 0
            }
        },
        mixer: {
            preview: "",
            program: ""
        } as MixerState
    }),
    async mounted () {
        /*  force particular tab to be selected  */
        (this.$refs.tabs as any).selectTab(`#${this.selectTab0}`)
        if (this.$refs[this.selectTab0] !== undefined)
            (this.$refs[this.selectTab0] as any).selectTab(`#${this.selectTab1}`)

        /*  establish server connection  */
        const ws = new RecWebSocket(this.wsUrl + "/control", [], {
            reconnectionDelayGrowFactor: 1.3,
            maxReconnectionDelay:        4000,
            minReconnectionDelay:        1000,
            connectionTimeout:           4000,
            minUptime:                   5000
        })
        ws.addEventListener("open", (ev) => {
            this.connection.online = true
        })
        ws.addEventListener("close", (ev) => {
            this.connection.online = false
            this.raiseStatus("error", "WebSocket connection failed/closed", 2000)
        })

        /*  receive server messages  */
        ws.addEventListener("message", (ev: MessageEvent) => {
            this.connection.recv = true
            setTimeout(() => {
                this.connection.recv = false
            }, 250)
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
            else if (data.cmd === "STATS") {
                this.stats.peers.camera  = data.arg.stats?.peers?.camera  ?? 0
                this.stats.peers.render  = data.arg.stats?.peers?.render  ?? 0
                this.stats.peers.control = data.arg.stats?.peers?.control ?? 0
            }
            else if (data.cmd === "MIXER") {
                if (this.mixer.preview !== data.arg.mixer?.preview)
                    this.mixer.preview = data.arg.mixer?.preview
                if (this.mixer.program !== data.arg.mixer?.program)
                    this.mixer.program = data.arg.mixer?.program
            }
        })

        /*  initialize and enrich canvas list  */
        await this.imageListFetch()
        await this.mediaListFetch()
        this.state.canvas.id = this.imageList[0]?.id ?? ""
        this.openGroup = this.imageList.find((e) => e.id === this.state.canvas.id)?.group ?? ""
        this.mediaOpenGroup = this.mediaList[0]?.group ?? ""
        this.$watch("state.canvas.id", (id: string) => {
            this.openGroup = this.imageList.find((e) => e.id === id)?.group ?? ""
        })
        this.ps = new PerfectScrollbar(this.$refs.list as HTMLElement, {
            suppressScrollX: true,
            scrollXMarginOffset: 100
        })

        /*  initially load state and presets once  */
        await this.loadState()
        await this.presetStatus()
        await this.loadMixerState()

        /*  react on all subsequent state changes  */
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

        /*  handle mutual exclusive toggles  */
        this.$watch("preview.opts.freed", (val: boolean) => {
            if (val && this.preview.opts.keys)
                this.preview.opts.keys = false
        })
        this.$watch("preview.opts.keys", (val: boolean) => {
            if (val && this.preview.opts.freed)
                this.preview.opts.freed = false
        })

        /*  re-generate the preview URL  */
        this.$watch("preview.opts", () => {
            let url = `${this.serviceUrl}#/render/${this.preview.opts.layer}/${this.preview.opts.cam}`
            const opts = [] as string[]
            if (this.preview.opts.freed) opts.push("ptzFreeD=true")
            if (this.preview.opts.keys)  opts.push("ptzKeys=true")
            if (opts.length > 0)
                url += "?" + opts.join("&")
            this.preview.url = url
        }, { immediate: true, deep: true })
    },
    methods: {
        /*  raise a temporaily visible status message in the footer  */
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

        /*  fetch list of canvas images  */
        async imageListFetch () {
            this.connection.recv = true
            const result = await (axios({
                method:       "GET",
                url:          `${this.serviceUrl}canvas`,
                responseType: "json"
            }).then((result: any) => {
                return result.data.images
            }).finally(() => {
                this.connection.recv = false
            }) as Promise<ImageEntry[]>)
            this.imageList = result
        },

        /*  select canvas image  */
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

        /*  fetch list of media files  */
        async mediaListFetch () {
            this.connection.recv = true
            const result = await (axios({
                method:       "GET",
                url:          `${this.serviceUrl}media`,
                responseType: "json"
            }).then((result: any) => {
                return result.data.media
            }).finally(() => {
                this.connection.recv = false
            }) as Promise<MediaEntry[]>)
            this.mediaList = result
        },

        /*  select media file  */
        async selectMedia (media: "media1" | "media2" | "media3" | "media4", texture: string) {
            this.watchState = false
            this.state.media[media] = texture
            await this.patchState([ "media.*" ])
            this.watchState = true
        },

        /*  open preview URL in own window  */
        previewOpen () {
            window.open(this.preview.url, "_blank")
        },

        /*  copy preview URL to clipboard  */
        previewCopy () {
            navigator.clipboard.writeText(this.preview.url)
        },

        /*  update URL on tab changes  */
        tabChanged0 (tab: any) {
            this.tab0 = tab.tab.computedId
            if (this.$refs[this.tab0] !== undefined)
                this.tab1 = (this.$refs[this.tab0] as any).activeTabHash.replace(/^#/, "")
            window.location.hash = `#/control/${this.tab0}/${this.tab1}`
        },
        tabChanged1 (tab: any) {
            this.tab1 = tab.tab.computedId
            window.location.hash = `#/control/${this.tab0}/${this.tab1}`
        },

        /*  import a field  */
        fieldImport (txt: string, min: number, max: number) {
            txt = txt.replace(/^s+/, "").replace(/\s+$/, "")
            let n = parseFloat(txt)
            if (Number.isNaN(n))
                n = 0
            n = Math.max(Math.min(n, max), min)
            return n
        },

        /*  export a field  */
        fieldExport (n: number, digits = 2, nosign = false) {
            let txt = n.toFixed(digits)
            if (!txt.match(/^-/) && !nosign)
                txt = `+${txt}`
            return txt
        },

        /*  merge partial state into current state  */
        mergeState (state: Readonly<StateTypePartial>, paths?: Readonly<string[]>) {
            return StateUtil.copy(this.state, state, paths)
        },

        /*  import partial state into current state  */
        importState (state: Readonly<StateTypePartial>, paths?: Readonly<string[]>) {
            this.watchState = false
            const changed = this.mergeState(state, paths)
            if (changed)
                setTimeout(() => { this.watchState = true }, 50)
            else
                this.watchState = true
        },

        /*  export partial state from current state  */
        exportState (paths?: Readonly<string[]>): StateTypePartial {
            const dst = {}
            StateUtil.copy(dst, this.state, paths)
            return dst
        },

        /*  load current state  */
        async loadState () {
            this.connection.recv = true
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            })
            if (state === null)
                throw new Error("failed to load state")
            const errors = [] as Array<string>
            if (!Ducky.validate(state, StateSchema, errors))
                throw new Error(`invalid schema of loaded state: ${errors.join(", ")}`)
            this.mergeState(state as StateType)
        },

        /*  save current state  */
        async saveState () {
            this.connection.send = true
            await axios({
                method: "POST",
                url:    `${this.serviceUrl}state`,
                data:   this.state
            }).finally(() => {
                this.connection.send = false
            })
        },

        /*  patch current state  */
        async patchState (paths: Readonly<string[]>) {
            const state = {}
            StateUtil.copy(state, this.state, paths)
            this.connection.send = true
            await axios({
                method: "PATCH",
                url:    `${this.serviceUrl}state`,
                data:   state
            }).finally(() => {
                this.connection.send = false
            })
        },

        /*  load preset status  */
        async presetStatus () {
            this.connection.recv = true
            const result = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            })
            if (result === null)
                throw new Error("failed to load preset status")
            this.preset.status = result.status
            this.preset.locked = result.locked
        },

        /*  map preset status to CSS class name  */
        presetStatus2Class (slot: number) {
            const clazz = {} as any
            if (this.preset.status[slot] === 0)
                clazz.clear = true
            else if (this.preset.status[slot] > 0 && this.preset.status[slot] < 18)
                clazz.partial = true
            else if (this.preset.status[slot] === 18)
                clazz.complete = true
            return clazz
        },

        /*  enable/disable all preset filters  */
        presetFiltersSelect (enable: boolean) {
            for (const key of Object.keys(this.preset.filters))
                (this.preset.filters as any)[key] = enable
        },

        /*  load preset slot  */
        async presetLoad () {
            if (this.preset.slot === -1)
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Loading state from preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.recv = true
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            })
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
            this.preset.slot = -1
        },

        /*  save preset slot  */
        async presetSave () {
            if (this.preset.slot === -1)
                return
            if (this.preset.locked[this.preset.slot])
                return
            const filters = Object.keys(this.preset.filters)
                .filter((key) => (this.preset.filters as any)[key])
                .map((key) => `${key}.**`)
            if (filters.length === 0) {
                this.raiseStatus("error", "Empty preset filter", 1000)
                return
            }
            this.raiseStatus("info", `Saving state to preset slot #${this.preset.slot + 1}...`, 1000)
            const state = this.exportState(filters)
            this.connection.send = true
            await axios({
                method: "POST",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}`,
                data:   state
            }).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        },

        /*  clear preset slot  */
        async presetClear () {
            if (this.preset.slot === -1)
                return
            if (this.preset.locked[this.preset.slot])
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Clearing preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.send = true
            await axios({
                method: "DELETE",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        },

        /*  lock preset slot  */
        async presetLock () {
            if (this.preset.slot === -1)
                return
            if (this.preset.locked[this.preset.slot])
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Locking preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}/lock`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        },

        /*  unlock preset slot  */
        async presetUnlock () {
            if (this.preset.slot === -1)
                return
            if (!this.preset.locked[this.preset.slot])
                return
            if (this.preset.status[this.preset.slot] === 0)
                return
            this.raiseStatus("info", `Unlocking preset slot #${this.preset.slot + 1}...`, 1000)
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}state/preset/${this.preset.slot + 1}/unlock`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
            this.preset.slot = -1
            await this.presetStatus()
        },

        /*  map mixer status to CSS class name  */
        mixerStatus2Class (cam: string) {
            const clazz = {} as any
            if (this.mixer.program === cam)
                clazz.program = true
            else if (this.mixer.preview === cam)
                clazz.preview = true
            else
                clazz.other = true
            return clazz
        },

        /*  change preview  */
        async changePreview (cam: string) {
            /*  do not select unselectables  */
            if (this.mixer.preview === cam || this.mixer.program === cam)
                return

            /*  change preview state  */
            this.mixer.preview = cam

            /*  tell server about state change  */
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}mixer/preview/${this.mixer.preview}`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
        },

        /*  cut preview to program (aka exchange preview with program)  */
        async cutPreviewToProgram () {
            /*  ensure we have a preview  */
            if (this.mixer.preview === "")
                return

            /*  exchange preview with program state  */
            const program = this.mixer.program
            this.mixer.program = this.mixer.preview
            this.mixer.preview = program

            /*  tell server about state change  */
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}mixer/cut`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
        },

        /*  adjust to the nearest sane FPS value only  */
        saneFPS (valOld: number, valNew: number) {
            if (!MixerFPS.includes(valNew)) {
                if (valNew < valOld) {
                    const fps = MixerFPS.filter((v) => v <= valNew)
                    valNew = fps[fps.length - 1]
                }
                else {
                    const fps = MixerFPS.filter((v) => v >= valNew)
                    valNew = fps[0]
                }
            }
            return valNew
        },

        /*  load mixer state  */
        async loadMixerState () {
            this.connection.recv = true
            const state = await axios({
                method: "GET",
                url:    `${this.serviceUrl}mixer/state`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.recv = false
            }) as MixerState
            if (state === null)
                throw new Error("failed to load mixer state")
            this.mixer.program = state.program
            this.mixer.preview = state.preview
        },

        /*  synchronize renderer instances  */
        async syncCanvas () {
            if (this.state.canvas.texture2 === "")
                return

            /*  tell server about sync  */
            this.connection.send = true
            await axios({
                method: "GET",
                url:    `${this.serviceUrl}canvas/sync`
            }).then((response) => response.data).catch(() => null).finally(() => {
                this.connection.send = false
            })
        }
    }
})
</script>

