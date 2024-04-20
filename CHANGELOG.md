
ChangeLog
=========

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

