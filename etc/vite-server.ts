/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import * as Vite  from "vite"
import YAMLPlugin from "@rollup/plugin-yaml"

export default Vite.defineConfig(({ command, mode }) => ({
    appType: "custom",
    base: "",
    root: "src/server",
    plugins: [
        YAMLPlugin()
    ],
    resolve: {
        alias: {
          './runtimeConfig': './runtimeConfig.browser',
        },
    },
    build: {
        sourcemap:              (mode === "development"),
        outDir:                 "../../dst/server",
        emptyOutDir:            (mode === "production"),
        chunkSizeWarningLimit:  5000,
        assetsInlineLimit:      0,
        rollupOptions: {
            input: "src/server/index.ts",
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

