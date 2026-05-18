// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const previewSource = readFileSync(new URL("./NotebookPreview.jsx", import.meta.url), "utf8")
const editorPageSource = readFileSync(new URL("./NotebookEditorPage.jsx", import.meta.url), "utf8")
const treePanelSource = readFileSync(new URL("./NotebookTreePanel.jsx", import.meta.url), "utf8")
const treeNodeSource = readFileSync(new URL("./NotebookTreeNode.jsx", import.meta.url), "utf8")
const headerSource = readFileSync(new URL("../layout/MainViewHeader.jsx", import.meta.url), "utf8")
const overridesSource = readFileSync(new URL("./notebook-milkdown-overrides.css", import.meta.url), "utf8")

test("notebook preview defines dark-mode aware code theme tokens", () => {
  assert.match(previewSource, /const isDark = document\.documentElement\.classList\.contains\("dark"\)/)
  assert.match(previewSource, /const codeTheme = isDark\s+/)
  assert.match(previewSource, /const codeTokens = isDark\s+/)
})

test("recent notebook shells avoid light-only surface classes", () => {
  assert.match(editorPageSource, /dark:bg-card/)
  assert.match(treePanelSource, /dark:bg-card/)
  assert.match(treeNodeSource, /dark:hover:bg-slate-800\/70/)
})

test("notebook mode switch in main header has dark theme adaptation", () => {
  assert.match(headerSource, /dark:bg-white\/10/)
  assert.match(headerSource, /dark:text-slate-200/)
})

test("milkdown editor overrides define dark-mode variables for editor surfaces", () => {
  assert.match(overridesSource, /\.dark \.milkdown \{/)
  assert.match(overridesSource, /--crepe-color-surface:/)
  assert.match(overridesSource, /\.dark \.milkdown \.milkdown-code-block \.cm-editor/)
})
