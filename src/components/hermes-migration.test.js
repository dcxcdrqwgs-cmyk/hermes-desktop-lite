// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const submenuSource = readFileSync(new URL("./layout/HermesSubmenu.jsx", import.meta.url), "utf8")
const appSource = readFileSync(new URL("../AppInner.jsx", import.meta.url), "utf8")
const cronSource = readFileSync(new URL("../CronView.jsx", import.meta.url), "utf8")
const cronListSource = readFileSync(new URL("./layout/CronList.jsx", import.meta.url), "utf8")

test("hermes submenu keeps config entries but no longer owns skills", () => {
  for (const id of [
    "model-config",
    "commands",
    "logs",
    "analytics",
    "channels",
    "memory",
    "agents",
  ]) {
    assert.ok(
      submenuSource.includes(`id: "${id}"`) || submenuSource.includes(`id: '${id}'`),
      `Hermes submenu should include ${id}`
    )
  }
  assert.ok(
    !submenuSource.includes('id: "skills"') && !submenuSource.includes("id: 'skills'"),
    "skills should move out of the Hermes submenu"
  )
})

test("skills is a primary sidebar item directly below AI notes", () => {
  const notebookIndex = appSource.indexOf('id: "notebook"')
  const skillsIndex = appSource.indexOf('id: "hermes-skills"')
  const filesIndex = appSource.indexOf('id: "files"')

  assert.ok(notebookIndex >= 0, "primary sidebar should include AI notes")
  assert.ok(skillsIndex >= 0, "primary sidebar should include skills")
  assert.ok(filesIndex >= 0, "primary sidebar should include files")
  assert.ok(notebookIndex < skillsIndex, "skills should be below AI notes")
  assert.ok(skillsIndex < filesIndex, "skills should sit before files")
  assert.ok(appSource.includes('labelKey: "nav.skills"'), "primary skills item should reuse skills label")
  assert.ok(appSource.includes('descriptionKey: "nav.skillsDescription"'), "primary skills item should reuse skills description")
  assert.ok(appSource.includes("icon: PackageIcon"), "primary skills item should use the skills package icon")
  assert.ok(appSource.includes('view === "hermes-skills" && <HermesSkillsPage />'), "skills should render the existing skills page")
})

test("app shell routes migrated hermes submenu items without changing the existing three behaviors", () => {
  assert.ok(
    appSource.includes('if (id === "model-config") setView("tasks")') &&
      appSource.includes('else if (id === "commands") setView("commands")') &&
      appSource.includes('else if (id === "logs") setView("memory")'),
    "existing Hermes submenu items should keep their current routes"
  )
  for (const viewId of ["analytics", "channels", "memory", "agents"]) {
    assert.ok(
      appSource.includes(`else if (id === "${viewId}")`) ||
        appSource.includes(`if (id === "${viewId}")`) ||
        appSource.includes(`view === "${viewId}"`),
      `app shell should route Hermes submenu item ${viewId}`
    )
  }
  assert.ok(
    !appSource.includes('else if (id === "skills") setView("hermes-skills")'),
    "skills should not be routed through the Hermes submenu anymore"
  )
})

test("cron page migration must preserve the current real cron actions", () => {
  assert.ok(
    appSource.includes('view === "cron" && <CronView />'),
    "app shell should render the cron main page when view is cron"
  )

  for (const symbol of [
    "getCronJobs",
    "createCronJob",
    "pauseCronJob",
    "resumeCronJob",
    "triggerCronJob",
    "deleteCronJob",
    "checkCronDependency",
    "installCronDependency",
  ]) {
    assert.ok(
      cronSource.includes(symbol),
      `cron page should keep using ${symbol}`
    )
  }
})

test("cron page should not keep a dedicated middle column after migration", () => {
  assert.ok(
    !appSource.includes('setActiveMiddleView("cron")'),
    "cron navigation should not open a dedicated middle column anymore"
  )
  assert.ok(
    !appSource.includes('activeMiddleView === "cron"'),
    "app shell should not render cron-specific middle column content"
  )
  assert.ok(
    !appSource.includes('"sessions", "cron", "hermes-submenu", "notebook", "files"'),
    "middle column content set should no longer treat cron as a middle-column view"
  )
})

test("cron middle list is also migrated while preserving the real cron actions", () => {
  for (const symbol of [
    "getCronJobs",
    "pauseCronJob",
    "resumeCronJob",
    "triggerCronJob",
    "deleteCronJob",
    "formatNextRun",
    "onCreate",
  ]) {
    assert.ok(
      cronListSource.includes(symbol),
      `cron middle list should include ${symbol}`
    )
  }
})

test("hermes config and channel APIs exist for real memory and channel migration", () => {
  const hermesConfigPath = new URL("../api/hermes-config.js", import.meta.url)
  const channelsApiPath = new URL("../api/channels.js", import.meta.url)

  assert.ok(existsSync(hermesConfigPath), "hermes config API file should exist")
  assert.ok(existsSync(channelsApiPath), "channels API file should exist")

  const hermesConfigSource = readFileSync(hermesConfigPath, "utf8")
  const channelsApiSource = readFileSync(channelsApiPath, "utf8")

  for (const symbol of [
    "readHermesUserConfig",
    "writeHermesUserConfig",
    "readHermesSoulConfig",
    "writeHermesSoulConfig",
    "readHermesMemoryConfig",
    "read_file_content",
    "write_file_content",
  ]) {
    assert.ok(
      hermesConfigSource.includes(symbol),
      `hermes config API should include ${symbol}`
    )
  }

  for (const symbol of [
    "readChannelsConfig",
    "writeChannelsConfig",
    "getWeixinQrCode",
    "getWhatsappQrCode",
    "get_weixin_qrcode",
    "get_whatsapp_qrcode",
  ]) {
    assert.ok(
      channelsApiSource.includes(symbol),
      `channels API should include ${symbol}`
    )
  }
})
