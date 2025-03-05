/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/// <reference lib="webworker" />
/* eslint no-undef: off */
declare const self: DedicatedWorkerGlobalScope
export {}

/*  the dedicated image loading and decoding worker
    (allows to perform the CPU burst intensive image
    decoding operations in a dedicated worker thread)  */
self.addEventListener("message", async (ev) => {
    /*  fetch URL parameter  */
    const url = ev.data?.url
    try {
        /*  fetch image  */
        const response = await fetch(url)
        if (!response.ok)
            throw new Error(`failed to fetch "${url}": ${response.statusText}`)

        /*  decode image from PNG/JPEG to raw ImageBitmap format  */
        const blob   = await response.blob()
        const bitmap = await createImageBitmap(blob)

        /*  send ImageBitmap to main UI thread  */
        self.postMessage({ data: bitmap }, [ bitmap ])
    }
    catch (error) {
        /*  send error to main UI thread  */
        self.postMessage({
            error: error instanceof Error ?
                error.message :
                String(error)
        })
    }
})
