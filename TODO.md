
TODO
====

Bugfixes
--------

Improvements
------------

- Videos sollen loopen nur optional

- Videos wenn nicht looped auf black enden

- Disabled Buttons etwas "grauer" (text reicht)

- Bei Canvas-Wechsel eventuell ein Fading (Smoother)
  statt dem aktiellen Hard-Cut

- Wenn gar keine Medien überhaupt gemapped sind, hängt
  es mit 404 HTTP im Server!

- Bei Mask versuchen die Lichtreflektion abzuschalten

- Wenn kaputtes MP4, darf es ihn nicht raushauen

- Sobald Alpha in den MediaX drin ist (egal ob WebM oder MP4 oder VP8 oder VP9)
  geht der Load dramatisch höher.

- Optimierung: nur Texturen rendern/aktivieren, die auch irgendwoe in Displays
  angezeigt werden.

Cleanups
--------

- CLEANUP:
  Refactor code into smaller pieces

