// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const sessionsListSource = readFileSync(new URL("./SessionsList.jsx", import.meta.url), "utf8")
const zhSource = readFileSync(new URL("../../locales/zh.json", import.meta.url), "utf8")
const enSource = readFileSync(new URL("../../locales/en.json", import.meta.url), "utf8")
const zhtwSource = readFileSync(new URL("../../locales/zh-tw.json", import.meta.url), "utf8")

test("sessions middle column reserves a dedicated pinned section even when empty", () => {
  assert.ok(
    sessionsListSource.includes("sessionsPage.pinnedSectionTitle"),
    "sessions middle column should render a dedicated pinned section title"
  )
  assert.ok(
    sessionsListSource.includes("sessionsPage.pinnedEmpty"),
    "sessions middle column should show an empty placeholder for the pinned section"
  )
  assert.ok(
    sessionsListSource.includes("min-h-[76px]"),
    "pinned empty state should reserve a stable visual slot instead of collapsing into a thin row"
  )
  assert.ok(
    sessionsListSource.includes("size-6") &&
      sessionsListSource.includes("size-3") &&
      sessionsListSource.includes("py-1.5"),
    "session rows should use a tighter icon and padding system"
  )
})

test("sessions middle column separates pinned and history copy", () => {
  assert.ok(
    sessionsListSource.includes("sessionsPage.historySectionTitle"),
    "sessions middle column should expose a dedicated history section label"
  )

  for (const source of [zhSource, enSource, zhtwSource]) {
    assert.ok(source.includes("\"pinnedSectionTitle\""), "pinnedSectionTitle should exist in all locales")
    assert.ok(source.includes("\"pinnedEmpty\""), "pinnedEmpty should exist in all locales")
    assert.ok(source.includes("\"historySectionTitle\""), "historySectionTitle should exist in all locales")
  }
})

test("sessions middle column keeps the new conversation action in the panel header instead of duplicating it inside the list", () => {
  assert.ok(
    !sessionsListSource.includes("onNewConversation"),
    "sessions list should not render a second new conversation button inside the list body"
  )
  assert.ok(
    !sessionsListSource.includes("t(\"app.newConversation\")"),
    "sessions list body should not include duplicate new conversation copy"
  )
})

test("sessions middle column uses locale-aware relative time copy instead of hardcoded Chinese labels", () => {
  assert.ok(
    sessionsListSource.includes("Intl.RelativeTimeFormat"),
    "session timestamps should use locale-aware relative time formatting"
  )
  assert.ok(
    sessionsListSource.includes("chat.yesterday"),
    "session timestamps should reuse localized yesterday copy"
  )
  assert.ok(
    !sessionsListSource.includes("return \"昨天\""),
    "session timestamps should not hardcode Chinese labels inside the component"
  )
})

test("sessions middle column caps visible titles to eight characters", () => {
  assert.ok(
    sessionsListSource.includes("truncateSessionTitle"),
    "session rows should normalize long titles before rendering"
  )
  assert.ok(
    sessionsListSource.includes("truncateSessionTitle(title, 8)"),
    "visible session titles should cap at eight characters"
  )
  assert.ok(
    sessionsListSource.includes("title={title}"),
    "truncated visible titles should keep the full title available as hover text"
  )
})
