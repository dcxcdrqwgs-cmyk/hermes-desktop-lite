// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const skillsSource = readFileSync(new URL("./SkillsPage.jsx", import.meta.url), "utf8")

test("Hermes skills page uses a single-list workbench layout instead of cramped split columns", () => {
  assert.ok(
    skillsSource.includes("skills-workbench-grid"),
    "skills page should expose a named workbench grid"
  )
  assert.ok(
    skillsSource.includes("setViewMode") &&
      skillsSource.includes("statusFilter") &&
      skillsSource.includes("categoryFilter"),
    "skills page should offer view, status, and category filtering"
  )
  assert.ok(
    skillsSource.includes("getToolsets"),
    "skills page should use the Hermes toolsets API like the reference dashboard"
  )
  assert.ok(
    !skillsSource.includes("HermesMetricCard"),
    "skills page should not spend the first screen on metric cards"
  )
  assert.ok(
    !skillsSource.includes("xl:grid-cols-2"),
    "skills page should not split installed skills and marketplace into two cramped columns"
  )
  assert.ok(
    !skillsSource.includes("grid-cols-[220px_minmax(0,1fr)]"),
    "skills page should not reserve a desktop sidebar that shrinks the main skill list"
  )
  assert.ok(
    skillsSource.includes("skills-list-scroll") &&
      skillsSource.includes("overflow-y-scroll"),
    "main skill list should expose an obvious dedicated vertical scroll area"
  )
})

test("Hermes skills page moves view switching and search into the header area", () => {
  const headerControlsIndex = skillsSource.indexOf("skills-header-controls")
  const filterPanelIndex = skillsSource.indexOf("skills-filter-scroll")
  const listIndex = skillsSource.indexOf("skills-workbench-grid")

  assert.ok(
    !skillsSource.includes("按 Hermes Dashboard 的信息结构重做"),
    "skills page should remove the old dashboard-structure helper sentence"
  )
  assert.ok(headerControlsIndex >= 0, "skills page should expose header controls")
  assert.ok(filterPanelIndex >= 0, "skills page should still expose filters")
  assert.ok(listIndex >= 0, "skills page should still expose the main list workbench")
  assert.ok(
    headerControlsIndex < filterPanelIndex,
    "view switching and search should move into the title/header area"
  )
  assert.ok(
    filterPanelIndex < listIndex,
    "skill list should sit immediately below filters after the header controls move up"
  )
  assert.ok(
    skillsSource.includes("VIEW_OPTIONS.map") &&
      skillsSource.includes('placeholder={t("skills.searchInstalled")}'),
    "header controls should contain the Installed / Market / Toolsets switcher and installed search"
  )
})
