
TODO
====

Bugfixes
--------

- BUGFIX: 
  Bei Fade=0 bleibt mindestens die Plate bein Ausschalten stehen. Schaltet man Hologram ein, dann verschwindet sie.
  Es sieht so aus, als ob wenn der letzte Disabled wurde, nichts mehr gerendert wird.
  Selbst der "Dummy" in der Scene (der immer da ist), hilft nichts.
  Workaround: Minimum FadeTime = 0.1 aktuell

Improvements
------------

- beim Umschalten von Source reapply Video stream

- IMPROVEMENT:
  add Pane and Pillar Control UI

- IMPROVEMENT:
  add Mask

- IMPROVEMENT:
  Studio-Canvas: Image, Image-Pair, Video-File, Video-Stream RGB und
  Video-Stream RGB+A unterstützen!

Cleanups
--------

- CLEANUP:
  Refactor code into smaller pieces

