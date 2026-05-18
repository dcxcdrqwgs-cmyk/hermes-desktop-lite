// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const editorPageSource = readFileSync(new URL("./NotebookEditorPage.jsx", import.meta.url), "utf8")
const editorSource = readFileSync(new URL("./NotebookMilkdownEditor.jsx", import.meta.url), "utf8")

test("notebook title enter moves focus into the editor body", () => {
  assert.match(editorPageSource, /const handleTitleKeyDown = useCallback\(\(event\) => \{\s*if \(event\.key !== "Enter" \|\| event\.isComposing\) return\s*event\.preventDefault\(\)\s*editorRef\.current\?\.focusEditorAtStart\?\.\(\)\s*\}, \[\]\)/s)
  assert.match(editorPageSource, /onKeyDown=\{handleTitleKeyDown\}/)
  const focusMethodSource = editorSource.match(/focusEditorAtStart\(\) \{[\s\S]*?\n\s*},\n\s*getToolbarState\(\) \{/)
  assert.ok(focusMethodSource)
  assert.match(focusMethodSource[0], /paragraphSchema\.type\(ctx\)\.create\(\)/)
  assert.match(focusMethodSource[0], /tr\.insert\(0, paragraph\)/)
  assert.match(focusMethodSource[0], /TextSelection\.near\(tr\.doc\.resolve\(1\)\)/)
  assert.doesNotMatch(focusMethodSource[0], /selectTextNearPosCommand/)
})
