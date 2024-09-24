
ChangeLog
=========

2.2.2 (2024-09-24)
------------------

- BUGFIX: really dispose video media file resources
- BUGFIX: make media loading more robust
- IMPROVEMENT: show unselectable button on preset tab in grey
- IMPROVEMENT: support non-looping videos
- IMPROVEMENT: optimize loading/unloading of media textures
- IMPROVEMENT: optimize shader processing
- CLEANUP: remove light effects on background of Mask
- UPDATE: update dependencies

2.2.1 (2024-09-23)
------------------

- CLEANUP: improve descriptions in control UI
- CLEANUP: improve control UI: NONE/ALL preset selection is non destructive
- CLEANUP: reenable optional rendering pause overlay
- UPDATE: update dependencies

2.2.0 (2024-09-23)
------------------

- IMPROVEMENT: use a nested tab experience for a more clean control UI
- IMPROVEMENT: store also Streams configuration in presets
- IMPROVEMENT: make stream source configurable for Decal, Monitor, Plate and Hologram
- IMPROVEMENT: make Monitor content opacity controlable via control UI
- IMPROVEMENT: make Monitor glass more visible by increasing alpha
- IMPROVEMENT: add Pane and Pillar to control UI and rendering
- IMPROVEMENT: add Mask as a new fullscreen element in the front layer
- IMPROVEMENT: add Media for loading image and video files into the Displays
- IMPROVEMENT: add support for preset locking/unlocking
- BUGFIX: fix preset filters by adding Plate and Hologram
- BUGFIX: fix rendering of decal
- UPDATE: update dependencies

2.1.2 (2024-09-16)
------------------

- UPDATE: update dependencies
- IMPROVEMENT: apply mesh smoothing to Wall in Blender for avoiding vertical bars
- IMPROVEMENT: add distance control also to Monitor
- BUGFIX: fix distance control for Plate and Hologram
- BUGFIX: fix description of canvas size in control UI

2.1.1 (2024-09-09)
------------------

- WORKAROUND: increase fade-time of Monitor/Decal/Hologram/Plate from 0.1 to 0.2 seconds to workaround problems on disabling
- IMPROVEMENT: allow larger Decal sizes
- CLEANUP: get rid of deprecation warnings in stylelint
- CLEANUP: document the creation of the canvas YAML files

2.1.0 (2024-09-08)
------------------

- REFACTORING: switch to new stacked single-4K-video ingest
- IMPROVEMENT: add debug logging for WebSocket messages in server
- IMPROVEMENT: improve debug mechanism in renderer
- IMPROVEMENT: improve front/back handling in state reflection handling
- IMPROVEMENT: log more error cases
- BUGFIX: ensure that asynchronous operations in state reflection handling are awaited
- BUGFIX: ensure that an exception in the state handling does not lead to a stop of the mechanism
- BUGFIX: use current FPS for animations instead of hard-coded 30 FPS
- BUGFIX: fix monitor chroma key threshold handling

2.0.2 (2024-09-05)
------------------

- UPDATE: update dependencies
- BUGFIX: switch to fixed version of reconnecting-websocket package

2.0.1 (2024-08-07)
------------------

- UPDATE: update dependencies
- FEATURE: adjust slider values already during dragging
- FEATURE: support distance control of hologram/plate
- BUGFIX: fix hologram/plate visibility handling

2.0.0 (2024-07-28)
------------------

- UPDATE: update dependencies
- FEATURE: remove CAM5 from the setup
- IMPROVEMENT: add back/front layers in renderer (front contains new plate and hologram)

1.8.10 (2024-07-17)
-------------------

- BUGFIX: workaround for "device in use" problem by (surprisingly) switching to video-only streams
- BUGFIX: fix variable reference and this fix error message
- IMPROVEMENT: use more specific error messages to have better change for debugging

1.8.9 (2024-07-06)
------------------

- UPDATE: align camera setup with current studio situation
- UPDATE: update dependencies

1.8.8 (2024-06-06)
------------------

- UPDATE: align camera setup with current studio situation
- UPDATE: update dependencies

1.8.7 (2024-05-18)
------------------

- UPDATE: update dependencies

1.8.6 (2024-05-05)
------------------

- CLEANUP: remove workaround for previously Node versions

1.8.5 (2024-05-05)
------------------

- UPDATE: update dependencies
- CLEANUP: remove workaround for previously broken Vite

1.8.4 (2024-05-02)
------------------

- FEATURE: support 180 degree flipped cameras (X/Y inverted)
- BUGFIX: workaround OBS Virtual Camera device compatibility (BabylonJS always received just 360p)
- BUGFIX: try to improve unloading of Decal shader and its video streams

1.8.3 (2024-04-20)
------------------

- UPDATE: update dependencies

1.8.2 (2024-04-20)
------------------

- FEATURE: extend number of presets from 9 to 12 to have more room available to store information
- FEATURE: apply some performance/memory optimizations in BabylonJS

1.8.1 (2024-04-14)
------------------

- UPDATE: finally upgraded to Vite 5.2.8 (through workaround)

1.8.0 (2024-04-11)
------------------

- FEATURE: refactoring to support different camera types
- UPDATE: update dependencies

1.7.2 (2024-03-14)
------------------

- BUGFIX: downgrade Vite to 5.0.12 (from 5.1.6) to fix build problems again

1.7.1 (2024-03-13)
------------------

- UPDATE: update dependencies

1.7.0 (2024-02-23)
------------------

- FEATURE: border cropping and full alpha channel support for Decal
- BUGFIX: downgrade Vite to 5.0.12 (from 5.1.3) to fix build problems
- CLEANUP: remove empty Vite config sections
- UPDATE: update dependencies

1.6.0 (2024-01-03)
------------------

- FEATURE: add support for chroma-key to decal
- FEATURE: add support for rounded corners to decal
- BUGFIX: apply workaround for decal rendering glitches
- BUGFIX: increase lightning scale to make canvas less dark
- UPDATE: update dependencies

1.5.2 (2023-12-23)
------------------

- UPDATE: update dependencies

1.5.1 (2023-12-02)
------------------

- UPRADE: align with new studio situation

1.5.0 (2023-xx-xx)
------------------

- UPRADE: align with new studio situation

1.4.5 (2023-08-11)
------------------

- UPDATE: update dependencies

1.4.4 (2023-08-11)
------------------

- UPDATE: update dependencies

1.4.3 (2023-08-05)
------------------

- UPDATE: update dependencies

1.4.2 (2023-07-16)
------------------

- UPDATE: update dependencies

1.4.1 (2023-07-12)
------------------

- UPDATE: update dependencies

1.4.0 (2023-06-26)
------------------

- FEATURE: add CAM5 support
- UPDATE: update dependencies

1.3.5 (2023-05-23)
------------------

- UPDATE: update dependencies

1.3.4 (2023-05-22)
------------------

- UPDATE: update dependencies

1.3.3 (2023-05-21)
------------------

- UPDATE: update dependencies

1.3.2 (2023-05-20)
------------------

- FEATURE:  use atomic write operations and automatic file rotation for presets/state files

1.3.1 (2023-05-20)
------------------

- BUGFIX:   fixed description of canvas image sizes

1.3.0 (2023-05-19)
------------------

- FEATURE:  provide optional overlay for 0-FPS situations
- FEATURE:  add support for 1-level sub-directories for canvas images
- FEATURE:  support optional fading of decal/monitor on enable/disable
- BUGFIX:   fix default tab selection

1.2.1 (2023-04-23)
------------------

- FEATURE:  add spinner to splash screen

1.2.0 (2023-04-23)
------------------

- FEATURE:  add splash screen during initialization

1.1.0 (2023-04-11)
------------------

- FEATURE:  add x/y rotation multiplication factors
- FEATURE:  reflect hull/case/lens terminology also in Blender model
- REFACTOR: major revamp of camera calibration: distinction between hull, case and lens
- REFACTOR: split each camera into a hull, a case and the inner device and export with same coord system as BabylonJS
- BUGFIX:   fix Blender model by giving Dennis avatar its texture back

1.0.0 (2023-03-11)
------------------

(first stable release)

