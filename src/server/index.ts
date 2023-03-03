/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  load external requirements  */
import * as awilix    from "awilix"

/*  load internal requirements  */
import Pkg            from "./app-pkg"
import Argv           from "./app-argv"
import Log            from "./app-log"
import FreeD          from "./app-freed"
import REST           from "./app-rest"
import RESTCanvas     from "./app-rest-canvas"
import RESTState      from "./app-rest-state"
import RESTPreset     from "./app-rest-preset"
import RESTMixer      from "./app-rest-mixer"
import RESTWS         from "./app-rest-ws"
import DB             from "./app-db"

/*  establish environment  */
;(async () => {
    /*  create dependency injection (DI) container  */
    const container = awilix.createContainer({
        injectionMode: awilix.InjectionMode.CLASSIC
    })

    /*  register classes  */
    const ctx = {}
    container.register({
        ctx:        awilix.asValue(ctx),
        pkg:        awilix.asClass(Pkg        ).setLifetime(awilix.Lifetime.SINGLETON),
        argv:       awilix.asClass(Argv       ).setLifetime(awilix.Lifetime.SINGLETON),
        log:        awilix.asClass(Log        ).setLifetime(awilix.Lifetime.SINGLETON),
        db:         awilix.asClass(DB         ).setLifetime(awilix.Lifetime.SINGLETON),
        freed:      awilix.asClass(FreeD      ).setLifetime(awilix.Lifetime.SINGLETON),
        rest:       awilix.asClass(REST       ).setLifetime(awilix.Lifetime.SINGLETON),
        restCanvas: awilix.asClass(RESTCanvas ).setLifetime(awilix.Lifetime.SINGLETON),
        restState:  awilix.asClass(RESTState  ).setLifetime(awilix.Lifetime.SINGLETON),
        restPreset: awilix.asClass(RESTPreset ).setLifetime(awilix.Lifetime.SINGLETON),
        restMixer:  awilix.asClass(RESTMixer  ).setLifetime(awilix.Lifetime.SINGLETON),
        restWS:     awilix.asClass(RESTWS     ).setLifetime(awilix.Lifetime.SINGLETON)
    })

    /*  initialize classes  */
    await container.cradle.pkg.init()
    await container.cradle.argv.init()
    await container.cradle.log.init()
    await container.cradle.db.init()
    await container.cradle.freed.init()
    await container.cradle.rest.init()
    await container.cradle.restCanvas.init()
    await container.cradle.restState.init()
    await container.cradle.restPreset.init()
    await container.cradle.restMixer.init()
    await container.cradle.restWS.init()

    /*  start classes  */
    await container.cradle.rest.start()
})().catch((err) => {
    console.log(`app: ERROR: ${err}`, err.stack)
    process.exit(1)
})

