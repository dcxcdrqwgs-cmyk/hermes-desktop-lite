// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const editorPageSource = readFileSync(new URL("./NotebookEditorPage.jsx", import.meta.url), "utf8")

test("notebook editor page preloads heavy notebook modules and delays loading fallback visibility", () => {
  assert.match(editorPageSource, /const loadNotebookMilkdownEditor = \(\) => import\("\.\/NotebookMilkdownEditor"\)/)
  assert.match(editorPageSource, /const loadNotebookPreview = \(\) => import\("\.\/NotebookPreview"\)/)
  assert.match(editorPageSource, /useEffect\(\(\) => \{\s*void loadNotebookMilkdownEditor\(\)\s*void loadNotebookPreview\(\)\s*\}, \[\]\)/s)
  assert.match(editorPageSource, /function DeferredFallback\(\{[\s\S]*delay = 120/)
  assert.match(editorPageSource, /setTimeout\(\(\) => setVisible\(true\), delay\)/)
})
