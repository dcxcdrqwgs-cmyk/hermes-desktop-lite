// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const previewSource = readFileSync(new URL("./NotebookPreview.jsx", import.meta.url), "utf8")
const overridesSource = readFileSync(new URL("./notebook-milkdown-overrides.css", import.meta.url), "utf8")

test("notebook preview enables syntax highlighting and keeps code tokens readable", () => {
  assert.match(previewSource, /rehypeHighlight/)
  assert.match(previewSource, /rehypePlugins=\{\[rehypeKatex,\s*rehypeHighlight\]\}/)
  assert.match(previewSource, /<code className=\{className\}>/)
  assert.match(previewSource, /baseText:\s*"#f8fafc"/)
  assert.match(previewSource, /baseText:\s*"#0f172a"/)
  assert.match(previewSource, /\.notebook-preview pre \.hljs-keyword/)
  assert.match(previewSource, /\.notebook-preview pre \.hljs-string/)
  assert.doesNotMatch(previewSource, /\.notebook-preview pre \.hljs \* \{\s*color: inherit !important;/)
  assert.match(previewSource, /\.notebook-preview pre code\s*\{\s*color:\s*\$\{codeTheme\.baseText\} !important;/)
})

test("notebook table block styles make editor table borders visible on light surfaces", () => {
  assert.match(overridesSource, /\.milkdown \.milkdown-table-block th,/)
  assert.match(overridesSource, /\.milkdown \.milkdown-table-block \{\s*[\s\S]*?border:\s*0;/)
  assert.match(overridesSource, /border:\s*1px solid rgba\(203, 213, 225, 0\.54\);/)
  assert.match(overridesSource, /border:\s*1px solid rgba\(71, 85, 105, 0\.42\);/)
})

test("notebook editor no longer wires notebook-specific column resizing behavior", () => {
  const editorSource = readFileSync(new URL("./NotebookMilkdownEditor.jsx", import.meta.url), "utf8")
  assert.doesNotMatch(editorSource, /function syncNotebookTableColgroups\(root\)/)
  assert.doesNotMatch(editorSource, /columnResizingPlugin/)
})

test("notebook editor uses a dark caret and clearer code-block text colors", () => {
  assert.match(overridesSource, /caret-color:\s*#111827;/)
  assert.match(overridesSource, /\.milkdown \.milkdown-code-block \.cm-content,/)
  assert.match(overridesSource, /color:\s*#0f172a;/)
})

test("notebook image blocks keep preview scale sync and use a more polished caption treatment", () => {
  assert.match(previewSource, /function isRenderableImageSource\(src\)/)
  assert.match(previewSource, /if \(!isRenderableImageSource\(src\)\) return null/)
  assert.match(previewSource, /function getImageScale\(alt\)/)
  assert.match(previewSource, /const maxWidth = `\$\{Math\.max\(28, Math\.min\(scale \* 100, 100\)\)\.toFixed\(0\)\}%`/)
  assert.match(previewSource, /className="mx-auto block max-h-\[24rem\] rounded-\[13px\] object-contain"/)
  assert.match(previewSource, /isRenderableImageSource/)
  assert.match(previewSource, /w-fit max-w-full/)
  assert.match(previewSource, /text-\[9\.5px\]/)
  assert.match(overridesSource, /\.milkdown \.milkdown-image-block > \.caption-input/)
  assert.match(overridesSource, /text-align:\s*center;/)
})

test("notebook preview code blocks expose a copy action in the header", () => {
  assert.match(previewSource, /navigator\.clipboard\.writeText/)
  assert.match(previewSource, /<CopyIcon className="size-3" \/>/)
  assert.match(previewSource, /<CheckIcon className="size-3" \/>/)
  assert.match(previewSource, /t\("notebook\.copyCode"\)/)
  assert.match(previewSource, /t\("notebook\.codeCopied"\)/)
})
