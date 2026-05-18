// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const exportSource = readFileSync(new URL("./notebook-docx-export.js", import.meta.url), "utf8")
const editorPageSource = readFileSync(new URL("./NotebookEditorPage.jsx", import.meta.url), "utf8")

test("notebook docx export uses a real docx document pipeline", () => {
  assert.match(exportSource, /new Document\(/)
  assert.match(exportSource, /new ImageRun\(/)
  assert.match(exportSource, /new Table\(/)
  assert.match(exportSource, /HeadingLevel\.TITLE/)
  assert.match(exportSource, /Packer\.toBlob/)
  assert.match(exportSource, /Packer\.toArrayBuffer/)
})

test("notebook editor page routes word export through the docx exporter", () => {
  assert.match(editorPageSource, /exportNotebookDocxArrayBuffer/)
  assert.match(editorPageSource, /exportNotebookDocxBlob/)
  assert.match(editorPageSource, /\.docx/)
  assert.doesNotMatch(editorPageSource, /<!doctype html>/)
})
