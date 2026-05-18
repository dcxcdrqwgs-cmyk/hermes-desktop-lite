// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const settingsSource = readFileSync(new URL("./SettingsModal.jsx", import.meta.url), "utf8")
const appSource = readFileSync(new URL("./AppInner.jsx", import.meta.url), "utf8")
const configApiSource = readFileSync(new URL("./api/config.js", import.meta.url), "utf8")
const zhSource = readFileSync(new URL("./locales/zh.json", import.meta.url), "utf8")
const enSource = readFileSync(new URL("./locales/en.json", import.meta.url), "utf8")
const zhTwSource = readFileSync(new URL("./locales/zh-tw.json", import.meta.url), "utf8")

test("settings exposes a user info section with nickname persistence", () => {
  for (const symbol of [
    'id: "userInfo"',
    "settings.userInfo",
    "settings.userInfoSummary",
    "settings.userNickname",
    "userNickname",
  ]) {
    assert.ok(settingsSource.includes(symbol), `settings modal should include ${symbol}`)
  }

  for (const symbol of [
    "currentUserNickname",
    "user_nickname",
    "handleApplySettings",
  ]) {
    assert.ok(appSource.includes(symbol), `app shell should include ${symbol}`)
  }

  assert.ok(configApiSource.includes("user_nickname"), "config api should persist user_nickname")
})

test("settings translations include user info labels in all locales", () => {
  for (const source of [zhSource, enSource, zhTwSource]) {
    assert.ok(source.includes('"userInfo"'), "settings translations should include userInfo")
    assert.ok(
      source.includes('"userNickname"'),
      "settings translations should include userNickname"
    )
    assert.ok(
      source.includes('"userInfoSummary"'),
      "settings translations should include userInfoSummary"
    )
  }
})
