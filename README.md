
Studio-Canvas
=============

**Real-Time Virtual Studio Canvas Rendering**

About
-----

**Studio-Canvas** is a client/server applications, written in
TypeScript, for dynamically rendering the virtual canvas of a filmstudio
through the help of a game engine.

The application consists of a central Node.js based server component
and a HTML5 Single-Page Application (SPA) as the client component. The
client component it turn can be run in to distinct modes: a control
mode for real-time adjusting the scene parameters and a rendering mode
for real-time rendering the scene with the help of the BabylonJS game
engine.

Usage (Production)
------------------

- Under Windows/macOS/Linux install [Node.js](https://nodejs.org)
  for the server run-time, [Google Chrome](https://www.google.com/chrome)
  for the client run-time (control mode and either [OBS Studio](https://obsproject.com)
  or [vMix](https://www.vmix.com) for the client run-time (renderer mode).

- Install all dependencies:<br/>
  `npm install --production`

- Run the bare server component:<br/>
  `npm start`

- Open the client component (control mode) in Google Chrome:<br/>
  https://127.0.0.1:12345/

- Use the client component (renderer mode) in OBS Studio or vMix browser sources:<br/>
  https://127.0.0.1:12345/#/render/CAM2?ptzFreeD=true

Usage (Development)
-------------------

- Under Windows/macOS/Linux install [Node.js](https://nodejs.org)
  for the server run-time and [Google Chrome](https://www.google.com/chrome)
  for the client run-time (both control mode and renderer mode),
  plus [Visual Studio Code](https://code.visualstudio.com/) with its
  TypeScript, ESLint and VueJS extensions.

- Install all dependencies:<br/>
  `npm install`

- Run the build-process server component:<br/>
  `npm rund dev`

- Open the client component (control mode) in Google Chrome:<br/>
  https://127.0.0.1:12345/

- Open the client component (renderer mode) in Google Chrome:<br/>
  https://127.0.0.1:12345/#/render/CAM2?ptzFreeD=true

Copyright & License
-------------------

Copyright &copy; 2023 [Dr. Ralf S. Engelschall](mailto:rse@engelschall.com)<br/>
Licensed under [GPL 3.0](https://spdx.org/licenses/GPL-3.0-only)

