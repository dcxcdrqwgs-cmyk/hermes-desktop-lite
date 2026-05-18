// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const toolbarSource = readFileSync(new URL("./NotebookToolbar.jsx", import.meta.url), "utf8")

test("notebook toolbar uses grouped writing-tool surfaces instead of a loose button row", () => {
  assert.match(toolbarSource, /shortcutGroups/)
  assert.match(toolbarSource, /rounded-\[10px\]/)
  assert.match(toolbarSource, /border-l border-border\/5[05]/)
  assert.match(toolbarSource, /insertGroups/)
  assert.match(toolbarSource, /min-w-\[52px\]/)
})

test("notebook toolbar keeps AI and insert controls visually distinct from formatting groups", () => {
  assert.match(toolbarSource, /SparklesIcon/)
  assert.match(toolbarSource, /PlusCircleIcon/)
  assert.match(toolbarSource, /EllipsisVerticalIcon/)
  assert.match(toolbarSource, /onExportMarkdown/)
  assert.match(toolbarSource, /onExportWord/)
  assert.match(toolbarSource, /onCopyFullText/)
})
