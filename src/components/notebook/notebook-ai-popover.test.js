// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const toolbarSource = readFileSync(new URL("./NotebookToolbar.jsx", import.meta.url), "utf8")
const editorPageSource = readFileSync(new URL("./NotebookEditorPage.jsx", import.meta.url), "utf8")
const editorSource = readFileSync(new URL("./NotebookMilkdownEditor.jsx", import.meta.url), "utf8")

test("notebook toolbar exposes an AI trigger callback for the leftmost AI entry", () => {
  assert.match(toolbarSource, /onAiTrigger/)
  assert.match(toolbarSource, /onClick=\{\(\) => onAiTrigger\?\.\(\)\}/)
})

test("notebook editor page wires an AI prompt surface and chat insertion flow", () => {
  assert.match(editorPageSource, /sendChat/)
  assert.match(editorPageSource, /NotebookAiPopover/)
  assert.match(editorPageSource, /handleAiSubmit/)
  assert.match(editorPageSource, /editorRef\.current\?\.getSelectionContext\?\./)
  assert.match(editorPageSource, /editorRef\.current\?\.insertMarkdownBelow\?\./)
  assert.match(editorPageSource, /aiGeneratedContent/)
  assert.match(editorPageSource, /aiApplyMode/)
  assert.match(editorPageSource, /handleAiApplyReplace/)
  assert.match(editorPageSource, /setAiPrompt\(selectedText \? t\("notebookAi\.polishPrompt"\) : ""\)/)
})

test("milkdown editor exposes an insertMarkdown imperative handle", () => {
  assert.match(editorSource, /insertMarkdown\(markdown\)/)
  assert.match(editorSource, /replaceSelectionWithMarkdown\(markdown\)/)
  assert.match(editorSource, /insertMarkdownBelow\(markdown\)/)
  assert.match(editorSource, /getSelectionContext\(\)/)
  assert.match(editorSource, /replaceRange\(/)
  assert.match(editorSource, /insertPos\(/)
})

test("ai popover supports keyboard submit and a polish shortcut affordance", () => {
  const popoverSource = readFileSync(new URL("./NotebookAiPopover.jsx", import.meta.url), "utf8")
  assert.match(popoverSource, /metaKey \|\| event\.ctrlKey/)
  assert.match(popoverSource, /event\.key === "Enter"/)
  assert.match(popoverSource, /onUseSelectionPrompt/)
  assert.match(popoverSource, /applyMode/)
  assert.match(popoverSource, /onApplyModeChange/)
  assert.match(popoverSource, /notebookAi\.requesting/)
  assert.match(popoverSource, /notebookAi\.insertBelowHint/)
  assert.match(popoverSource, /disabled=\{!selectedText\}/)
  assert.match(popoverSource, /notebookAi\.insert/)
  assert.match(popoverSource, /notebookAi\.replace/)
  assert.doesNotMatch(popoverSource, /onApplyInsert\?\.|PlusIcon|applyMode === "insert"/)
})
