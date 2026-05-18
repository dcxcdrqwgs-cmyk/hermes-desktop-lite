// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const overridesSource = readFileSync(new URL("./notebook-milkdown-overrides.css", import.meta.url), "utf8")

test("code block editor does not clip the language picker or smart suggestion overlay", () => {
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.cm-editor \{/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.cm-editor \{[\s\S]*overflow:\s*visible;/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.language-picker \{/)
  assert.match(overridesSource, /z-index:\s*1200;/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.list-wrapper \{/)
  assert.match(overridesSource, /border-radius:\s*16px;/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.language-list-item:hover \{/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.language-list-item\[aria-selected="true"\] \{/)
  assert.match(overridesSource, /@keyframes notebook-codeblock-picker-enter/)
})
