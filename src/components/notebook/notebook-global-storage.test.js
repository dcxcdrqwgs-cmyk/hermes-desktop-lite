// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const rustSource = readFileSync(new URL("../../../src-tauri/src/commands/notebook.rs", import.meta.url), "utf8")
const appDbSource = readFileSync(new URL("../../../src-tauri/src/commands/types.rs", import.meta.url), "utf8")

test("notebook data uses a global notebook database independent of workspace state", () => {
  assert.match(rustSource, /open_notebook_db/)
  assert.match(rustSource, /open_app_db/)
  assert.doesNotMatch(rustSource, /workspace_path/)
  assert.doesNotMatch(rustSource, /workspace_filter/)
})

test("notebook global database migrates existing app database notebook tables", () => {
  assert.match(appDbSource, /APP_DB_FILENAME: &str = "hermes-slate-desk\.db"/)
  assert.match(appDbSource, /LEGACY_APP_DB_FILENAME: &str = "hermes-desktop-lite\.db"/)
  assert.match(appDbSource, /copy\(&legacy_db_path, &db_path\)/)
})
