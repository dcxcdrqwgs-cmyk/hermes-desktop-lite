import test from "node:test"
import assert from "node:assert/strict"

import {
  buildVisibleEntries,
  getParentPath,
} from "./file-view-utils.js"

test("getParentPath returns empty string at root and trims one segment for nested paths", () => {
  assert.equal(getParentPath(""), "")
  assert.equal(getParentPath("notes"), "")
  assert.equal(getParentPath("notes/daily"), "notes")
})

test("buildVisibleEntries prepends a parent entry in nested directories", () => {
  const entries = buildVisibleEntries(
    [
      { name: "daily", path: "notes/daily", is_dir: true, size: 0, modified: "2026-04-22T10:00:00Z" },
      { name: "todo.md", path: "notes/todo.md", is_dir: false, size: 64, modified: "2026-04-22T11:00:00Z" },
    ],
    "notes",
    ""
  )

  assert.equal(entries[0].isParent, true)
  assert.equal(entries[0].path, "")
  assert.equal(entries[1].name, "daily")
})

test("buildVisibleEntries filters by file name but keeps the parent entry available", () => {
  const entries = buildVisibleEntries(
    [
      { name: "alpha.txt", path: "docs/alpha.txt", is_dir: false, size: 12, modified: "2026-04-22T10:00:00Z" },
      { name: "beta.txt", path: "docs/beta.txt", is_dir: false, size: 12, modified: "2026-04-22T10:00:00Z" },
    ],
    "docs",
    "beta"
  )

  assert.equal(entries.length, 2)
  assert.equal(entries[0].isParent, true)
  assert.equal(entries[1].name, "beta.txt")
})
