// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const appSource = readFileSync(new URL("../AppInner.jsx", import.meta.url), "utf8")
const dashboardApiSource = readFileSync(new URL("../api/dashboard.js", import.meta.url), "utf8")
const apiIndexSource = readFileSync(new URL("../api/index.js", import.meta.url), "utf8")
const legacyCommandsSource = readFileSync(new URL("../../src-tauri/src/commands/legacy.rs", import.meta.url), "utf8")
const tauriLibSource = readFileSync(new URL("../../src-tauri/src/lib.rs", import.meta.url), "utf8")

test("sidebar footer exposes a global model switcher above the Hermes version", () => {
  const switcherIndex = appSource.indexOf('data-sidebar-model-switcher="true"')
  const versionIndex = appSource.indexOf("{installedHermesLabel}")

  assert.ok(switcherIndex > -1, "sidebar footer should render a model switcher")
  assert.ok(versionIndex > -1, "sidebar footer should still show the Hermes version")
  assert.ok(
    switcherIndex < versionIndex,
    "model switcher should appear above the Hermes version line"
  )
  assert.ok(appSource.includes("handleSaveSidebarModel"), "save button should persist the selected model")
})

test("model switcher uses the official Hermes model options and set APIs", () => {
  assert.ok(
    dashboardApiSource.includes("export async function getModelOptions()"),
    "dashboard API should expose model options"
  )
  assert.ok(
    dashboardApiSource.includes("export async function setDefaultModel(provider, model)"),
    "dashboard API should expose default model switching"
  )
  assert.ok(
    apiIndexSource.includes("getModelOptions") && apiIndexSource.includes("setDefaultModel"),
    "top-level API index should re-export model switcher functions"
  )
  assert.ok(
    legacyCommandsSource.includes('"/api/model/options"') &&
      legacyCommandsSource.includes('"/api/model/set"'),
    "Tauri command layer should call the official Hermes model endpoints"
  )
  assert.ok(
    tauriLibSource.includes("commands::get_model_options") &&
      tauriLibSource.includes("commands::set_default_model"),
    "Tauri commands should be registered"
  )
})

test("chat sends with the current global sidebar model after switching", () => {
  assert.ok(
    appSource.includes("const activeGlobalModel = selectorPrimaryModelConfig.model || \"\""),
    "AppInner should derive an authoritative global model from the saved selector config"
  )
  assert.ok(
    appSource.includes("model: activeGlobalModel || null"),
    "sendChatStream should use the current global model instead of stale session model data"
  )
  assert.ok(
    !appSource.includes("model: sessionModel || null"),
    "sendChatStream should not keep using stale per-session model fallback"
  )
})
