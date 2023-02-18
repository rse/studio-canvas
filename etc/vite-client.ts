/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as Vite  from "vite"
import VuePlugin  from "@vitejs/plugin-vue"
import YAMLPlugin from "@rollup/plugin-yaml"

export default Vite.defineConfig(({ command, mode, ssrBuild }) => ({
    base: "",
    root: "src/client",
    assetsInclude: [ "index.yaml" ],
    plugins: [
        VuePlugin(),
        YAMLPlugin()
    ],
    optimizeDeps: {
        include: [
        ]
    },
    css: {
        devSourcemap: mode === "development"
    },
    build: {
        outDir:                 "../../dst/client",
        assetsDir:              "",
        emptyOutDir:            true,
        chunkSizeWarningLimit:  6000,
        assetsInlineLimit:      0,
        sourcemap:              mode === "development",
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
            }
        }
    }
}))

