// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const toolbarSource = readFileSync(new URL("./NotebookToolbar.jsx", import.meta.url), "utf8")
const editorPageSource = readFileSync(new URL("./NotebookEditorPage.jsx", import.meta.url), "utf8")
const milkdownEditorSource = readFileSync(new URL("./NotebookMilkdownEditor.jsx", import.meta.url), "utf8")
const stateSource = readFileSync(new URL("./notebook-state.js", import.meta.url), "utf8")

test("notebook no longer exposes font, size, or color formatting controls", () => {
  assert.doesNotMatch(toolbarSource, /文字颜色|字号|font-size|text-color/)
  assert.doesNotMatch(toolbarSource, /DropdownMenuRadioGroup/)
  assert.doesNotMatch(editorPageSource, /onAppearanceChange/)
  assert.doesNotMatch(stateSource, /setAppearance|appearance:/)
  assert.doesNotMatch(milkdownEditorSource, /ApplyNotebookInlineStyle|text-color|font-size/)
})
