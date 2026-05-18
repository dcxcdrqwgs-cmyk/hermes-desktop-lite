// Copyright (c) 2026 MeeJoy

import test from "node:test"
import assert from "node:assert/strict"

import { resolveShellLayout } from "./app-shell-utils.js"

test("resolveShellLayout shows chat chrome on desktop with compact terminal dock", () => {
  assert.deepEqual(
    resolveShellLayout({
      view: "chat",
      isMobile: false,
      terminalDockOpen: true,
    }),
    {
      contentMode: "chat",
      showDesktopRightDrawer: true,
      rightDrawerMode: "tool-activity",
      showTerminalDock: true,
      terminalDockExpanded: false,
      showTerminalFocusPanel: false,
    }
  )
})

test("resolveShellLayout promotes terminal view into dock-focused desktop mode", () => {
  assert.deepEqual(
    resolveShellLayout({
      view: "terminal",
      isMobile: false,
      terminalDockOpen: false,
    }),
    {
      contentMode: "terminal-focus",
      showDesktopRightDrawer: false,
      rightDrawerMode: null,
      showTerminalDock: true,
      terminalDockExpanded: true,
      showTerminalFocusPanel: true,
    }
  )
})

test("resolveShellLayout disables desktop-only chrome on mobile", () => {
  assert.deepEqual(
    resolveShellLayout({
      view: "sessions",
      isMobile: true,
      terminalDockOpen: true,
    }),
    {
      contentMode: "view",
      showDesktopRightDrawer: false,
      rightDrawerMode: null,
      showTerminalDock: false,
      terminalDockExpanded: false,
      showTerminalFocusPanel: false,
    }
  )
})
