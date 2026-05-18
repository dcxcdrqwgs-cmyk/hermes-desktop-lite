// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const switcherSource = readFileSync(new URL("./WorkspaceSwitcher.jsx", import.meta.url), "utf8")

test("workspace switcher uses the sidebar material system for its trigger and menu", () => {
  assert.ok(
    switcherSource.includes('data-workspace-switcher="true"'),
    "workspace trigger should expose a stable marker for the polished sidebar treatment"
  )
  assert.ok(
    switcherSource.includes("overflow-hidden") &&
      switcherSource.includes("border-[#d3d6df]") &&
      switcherSource.includes("hover:border-[#c4c9d4]") &&
      !switcherSource.includes("border-white/66") &&
      switcherSource.includes("shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_1px_2px_rgba(15,23,42,0.045)]"),
    "workspace trigger should use a visible but still polished frosted sidebar border"
  )
  assert.ok(
    switcherSource.includes("bg-gradient-to-br from-white/72 to-sidebar-accent/82") &&
      switcherSource.includes("group-hover/workspace:scale-[1.025]") &&
      switcherSource.includes("group-data-[state=open]/workspace:bg-sidebar-accent/95"),
    "workspace trigger icon and chevron should have refined hover/open affordances"
  )
  assert.ok(
    switcherSource.includes('data-workspace-menu="true"') &&
      switcherSource.includes("w-[292px]") &&
      !switcherSource.includes("w-[330px]") &&
      switcherSource.includes("shadow-[0_18px_48px_rgba(15,23,42,0.14)]"),
    "workspace menu should feel like a compact sidebar popover, not a wide generic dropdown"
  )
})

test("workspace menu keeps the active workspace and actions easy to scan", () => {
  assert.ok(
    switcherSource.includes("border-primary/16 bg-primary/7") &&
      switcherSource.includes("text-primary"),
    "active workspace should use a restrained blue selected state"
  )
  assert.ok(
    switcherSource.includes("workspaceActionItemClass") &&
      switcherSource.includes("text-muted-foreground/65"),
    "workspace actions should share compact row styling and keep disabled copy visually quieter"
  )
})
