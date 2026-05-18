// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import test from "node:test"

const APP_NAME = "Hermes Slate Desk"
const PACKAGE_NAME = "hermes-slate-desk"

function readText(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

function readJson(path) {
  return JSON.parse(readText(path))
}

function readPngSize(path) {
  const bytes = readFileSync(new URL(path, import.meta.url))
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

test("application branding uses Hermes Slate Desk across app metadata", () => {
  const packageJson = readJson("../package.json")
  const packageLock = readJson("../package-lock.json")
  const tauriConfig = readJson("../src-tauri/tauri.conf.json")
  const indexHtml = readText("../index.html")
  const cargoToml = readText("../src-tauri/Cargo.toml")

  assert.equal(packageJson.name, PACKAGE_NAME)
  assert.equal(packageLock.name, PACKAGE_NAME)
  assert.equal(packageLock.packages[""].name, PACKAGE_NAME)
  assert.match(cargoToml, /name = "hermes-slate-desk"/)
  assert.match(cargoToml, /description = "Hermes Slate Desk"/)
  assert.equal(tauriConfig.productName, APP_NAME)
  assert.equal(tauriConfig.identifier, "com.hermes.slate.desk")
  assert.equal(tauriConfig.app.windows[0].title, APP_NAME)
  assert.match(indexHtml, /<title>Hermes Slate Desk<\/title>/)

  for (const localeFile of ["zh.json", "en.json", "zh-tw.json"]) {
    const locale = readJson(`./locales/${localeFile}`)
    assert.equal(locale.app.shellTitle, APP_NAME)
    assert.equal(locale.chat.emptyBadge, APP_NAME)
    assert.match(locale.skills.description, /Hermes Slate Desk/)
  }
})

test("renamed app database uses the new name while migrating legacy data", () => {
  const typesSource = readText("../src-tauri/src/commands/types.rs")
  const legacySource = readText("../src-tauri/src/commands/legacy.rs")

  for (const source of [typesSource, legacySource]) {
    assert.match(source, /APP_DB_FILENAME: &str = "hermes-slate-desk\.db"/)
    assert.match(source, /LEGACY_APP_DB_FILENAME: &str = "hermes-desktop-lite\.db"/)
    assert.match(source, /copy\(&legacy_db_path, &db_path\)/)
  }
})

test("tauri icons are regenerated from the 4096 square source icon", () => {
  assert.deepEqual(readPngSize("../src-tauri/icons/app-icon-source.png"), {
    width: 4096,
    height: 4096,
  })
  assert.deepEqual(readPngSize("../src-tauri/icons/icon.png"), { width: 512, height: 512 })
  assert.deepEqual(readPngSize("../src-tauri/icons/128x128@2x.png"), { width: 256, height: 256 })
  assert.deepEqual(readPngSize("../src-tauri/icons/32x32.png"), { width: 32, height: 32 })

  assert.ok(statSync(new URL("../src-tauri/icons/icon.icns", import.meta.url)).size > 100000)
  assert.ok(statSync(new URL("../src-tauri/icons/icon.ico", import.meta.url)).size > 10000)
})
