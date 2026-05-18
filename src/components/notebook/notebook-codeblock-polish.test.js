// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const previewSource = readFileSync(new URL("./NotebookPreview.jsx", import.meta.url), "utf8")
const overridesSource = readFileSync(new URL("./notebook-milkdown-overrides.css", import.meta.url), "utf8")

test("notebook preview gives code blocks a composed frame and readable token colors", () => {
  assert.match(previewSource, /frameBg:/)
  assert.match(previewSource, /frameBorder:/)
  assert.match(previewSource, /frameShadow:/)
  assert.match(previewSource, /tokenKeyword:/)
  assert.match(previewSource, /tokenString:/)
  assert.match(previewSource, /tokenComment:/)
})

test("notebook milkdown overrides style code-block tools and language picker as one system", () => {
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.tools/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.tools \.language-button/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.list-wrapper/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.language-list-item/)
})
