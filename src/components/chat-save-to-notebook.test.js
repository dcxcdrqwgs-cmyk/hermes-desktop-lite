// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const chatMessageSource = readFileSync(new URL("./ChatMessage.jsx", import.meta.url), "utf8")
const messageListSource = readFileSync(new URL("./MessageList.jsx", import.meta.url), "utf8")
const appInnerSource = readFileSync(new URL("../AppInner.jsx", import.meta.url), "utf8")

test("ai messages expose a save-to-notebook action", () => {
  assert.match(chatMessageSource, /onSaveToNotebook/)
  assert.match(chatMessageSource, /BookPlusIcon/)
  assert.match(chatMessageSource, /存入笔记/)
})

test("message list forwards save-to-notebook from chat workspace to ai messages", () => {
  assert.match(messageListSource, /onSaveToNotebookMessage/)
  assert.match(messageListSource, /onSaveToNotebook=\{\(\) => onSaveToNotebookMessage\?/)
})

test("chat workspace wires a save-to-notebook dialog using notebook APIs", () => {
  assert.match(appInnerSource, /SaveMessageToNotebookDialog/)
  assert.match(appInnerSource, /createNotebookNote/)
  assert.match(appInnerSource, /updateNotebookNote/)
  assert.match(appInnerSource, /notebook\.treeMap\.foldersById/)
  assert.match(appInnerSource, /conversationTitle/)
})
