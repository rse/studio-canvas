/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as Vite         from "vite"
import VuePlugin         from "@vitejs/plugin-vue"
import YAMLPlugin        from "@rollup/plugin-yaml"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import SvgLoader         from "vite-svg-loader"
import GLSL              from "vite-plugin-glsl"

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    base: "",
    root: "src/client",
    assetsInclude: [ "index.yaml" ],
    plugins: [
        VuePlugin(),
        YAMLPlugin(),
        SvgLoader(),
        GLSL(),
        nodePolyfills({
            include: [ "events", "stream", "path", "fs" ],
            globals: { Buffer: true }
        })
    ],
    css: {
        devSourcemap: mode === "development"
    },
    build: {
        target:                 "es2022",
        outDir:                 "../../dst/client",
        assetsDir:              "",
        emptyOutDir:            (mode === "production"),
        chunkSizeWarningLimit:  8000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 (mode === "production"),
        reportCompressedSize:   (mode === "production"),
        rollupOptions: {
            input: "src/client/index.html",
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "[name]-[hash:8].js",
                assetFileNames: (assetInfo) => {
                    let spec = "[name]-[hash:8].[ext]"
                    if (assetInfo.name === "index.yaml")
                        spec = "index.yaml"
                    return spec
                }
            },
            onwarn: (entry, next) => {
                if (entry.message.match(/node_modules.+Use of eval in/))
                    return
                else
                    return next(entry)
            }
        }
    }
}))

