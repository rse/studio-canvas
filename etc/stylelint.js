/*
**  Studio-Canvas - Real-Time Virtual Studio Canvas Rendering
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  read original rules  */
const recommended = require("stylelint-stylus/recommended")
const standard    = require("stylelint-stylus/standard")

/*  mix standard over recommended manually  */
const mixed = {}
Object.assign(mixed, recommended)
Object.assign(mixed.rules, standard.rules)

/*  remove deprecated rules  */
const deprecated = [
    "at-rule-name-newline-after",
    "at-rule-name-space-after",
    "block-closing-brace-empty-line-before",
    "block-closing-brace-newline-after",
    "block-closing-brace-newline-before",
    "block-closing-brace-space-after",
    "block-closing-brace-space-before",
    "block-opening-brace-newline-after",
    "block-opening-brace-newline-before",
    "block-opening-brace-space-after",
    "block-opening-brace-space-before",
    "color-hex-case",
    "declaration-block-trailing-semicolon",
    "no-eol-whitespace",
    "number-leading-zero",
    "number-no-trailing-zeros",
    "selector-list-comma-newline-after",
    "selector-list-comma-newline-before",
    "selector-list-comma-space-after",
    "selector-list-comma-space-before",
    "selector-pseudo-class-case",
    "indentation"
]
for (const d of deprecated)
    delete mixed.rules[d]

/*  export as replacement configuration  */
module.exports = mixed

