/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

import path               from "node:path"
import * as Vite          from "vite"
import YAMLPlugin         from "@rollup/plugin-yaml"
import { viteStaticCopy } from "vite-plugin-static-copy"
import { node }           from "@liuli-util/vite-plugin-node"

export default Vite.defineConfig(({ command, mode }) => ({
    logLevel: "info",
    appType: "custom",
    base: "",
    root: "",
    plugins: [
        node({
            entry:  "src/server/index.ts",
            outDir: "dst/server",
            shims:  true
        }),
        YAMLPlugin(),
        viteStaticCopy({
            structured: false,
            targets: [
                { src: "dst/server/index.js", dest: "", rename: (fn, ext, p) => "index.mjs" },
                ...(mode === "development" ? [
                    { src: "dst/server/index.js.map", dest: "", rename: (fn, ext, p) => "index.mjs.map" }
                ] : [])
            ]
        })
    ],
    build: {
        target:                 "node20",
        outDir:                 "dst/server",
        assetsDir:              "",
        emptyOutDir:            (mode === "production"),
        chunkSizeWarningLimit:  5000,
        assetsInlineLimit:      0,
        sourcemap:              (mode === "development"),
        minify:                 false,
        reportCompressedSize:   (mode === "production"),
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

