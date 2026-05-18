// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const appSource = readFileSync(new URL("../AppInner.jsx", import.meta.url), "utf8")

test("sidebar footer separator spans the full sidebar width", () => {
  assert.ok(
    appSource.includes('data-sidebar-footer-boundary="true"') &&
      appSource.includes("-ml-2 h-px w-[var(--sidebar-width)]"),
    "footer separator should use the live sidebar width instead of a percentage guess"
  )
})

test("sidebar footer separates model controls from Hermes version status", () => {
  assert.ok(
    appSource.includes('data-sidebar-footer-model-separator="true"') &&
      appSource.includes("-ml-5 h-px w-[var(--sidebar-width)] bg-sidebar-border/75"),
    "model controls and Hermes version status should have a full sidebar-width divider between them"
  )
})
