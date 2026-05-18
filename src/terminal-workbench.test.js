// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const appSource = readFileSync(new URL("./AppInner.jsx", import.meta.url), "utf8")
const terminalSource = readFileSync(new URL("./TerminalView.jsx", import.meta.url), "utf8")
const sessionsSource = readFileSync(new URL("./SessionsView.jsx", import.meta.url), "utf8")
const memorySource = readFileSync(new URL("./MemoryView.jsx", import.meta.url), "utf8")
const commandsSource = readFileSync(new URL("./CommandsReference.jsx", import.meta.url), "utf8")

test("terminal workspace uses a dedicated workbench shell and shared support surfaces", () => {
  assert.ok(
    appSource.includes("data-terminal-focus-shell=\"true\"") &&
      appSource.includes("data-terminal-focus-terminal=\"true\"") &&
      !appSource.includes("data-terminal-focus-header=\"true\"") &&
      !appSource.includes("data-terminal-focus-chips=\"true\"") &&
      !appSource.includes("data-terminal-focus-meta=\"true\""),
    "terminal focus view should let the terminal start immediately instead of reserving a separate top meta band"
  )
  assert.ok(
    terminalSource.includes("data-terminal-surface=\"true\"") &&
      terminalSource.includes("data-terminal-statusbar=\"true\"") &&
      terminalSource.includes("data-terminal-workbench-toolbar=\"true\"") &&
      terminalSource.includes("app-terminal-surface rounded-[inherit] flex h-full min-h-0 flex-col overflow-hidden") &&
      !terminalSource.includes("flex shrink-0 items-center gap-1.5 px-1") &&
      !terminalSource.includes("app.hideTerminalDock") &&
      !terminalSource.includes("app.showTerminalDock"),
    "terminal component should keep a clean rounded status bar without extra chrome or dock toggles"
  )
})

test("primary workspace pages share the new empty-state surface language", () => {
  assert.ok(terminalSource.includes("app-empty-state"))
  assert.ok(sessionsSource.includes("app-empty-state"))
  assert.ok(memorySource.includes("app-empty-state"))
  assert.ok(commandsSource.includes("app-empty-state"))
})
