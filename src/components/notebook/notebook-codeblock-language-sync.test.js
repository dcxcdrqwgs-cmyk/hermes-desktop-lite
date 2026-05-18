// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const editorSource = readFileSync(new URL("./NotebookMilkdownEditor.jsx", import.meta.url), "utf8")

test("notebook editor serializes updated documents so code block language changes reach preview state", () => {
  assert.match(editorSource, /serializerCtx/)
  assert.match(editorSource, /listener\.updated\(\(ctx,\s*doc\)\s*=>/)
  assert.match(editorSource, /const serializer = ctx\.get\(serializerCtx\)/)
  assert.match(editorSource, /const markdown = serializer\(doc\)/)
  assert.match(editorSource, /changeRef\.current\?\.\(markdown\)/)
})
