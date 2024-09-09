
TODO
====

Bugfixes
--------

- BUGFIX:
  SC: Plate/Hologram: Transparent (für VDON, nicht für MEDIA7 Fische)
  Workaround: VDON in Back senden

- BUGFIX:
  OBS > Ultimatte: SDI out-of-sync -> black border
  Workaround: Front nicht für schnelle Dinge verwenden
  See Also: https://forum.derivative.ca/t/alpha-matte-desync-on-video-device-out-top/437533/5
  OBS has a "Keyed" option in Decklink output!

- BUGFIX: 
  Bei Fade=0 bleibt mindestens die Plate bein Ausschalten stehen. Schaltet man Hologram ein, dann verschwindet sie.
  Es sieht so aus, als ob wenn der letzte Disabled wurde, nichts mehr gerendert wird.
  Selbst der "Dummy" in der Scene (der immer da ist), hilft nichts.
  Workaround: Minimum FadeTime = 0.1 aktuell

Improvements
------------

- IMPROVEMENT:
  mehr Regler Distanz, weiter nach unten schieben, etc.

- IMPROVEMENT:
  Streams Tab wird nicht gespeichert mit Presets
  Workaround: nicht wirklich notwendig, weil sehr statisch

- IMPROVEMENT:
  Zuordnung zu M/D/H/P dynamisch machen über Control UI
  Auch die 2 Stacks dynamisch machen
  Workaround: hard-coded in code

- IMPROVEMENT:
  Latencies:
  Latenz bei VDON: auf Stage ca. 3-4s, Audio-Latenz ca. 0,4 s
  Latenz beim Folien schalten

- IMPROVEMENT:
  Studio-Canvas: Image, Image-Pair, Video-File, Video-Stream RGB und
  Video-Stream RGB+A unterstützen!

Cleanups
--------

- CLEANUP:
  Refactor code into smaller pieces

