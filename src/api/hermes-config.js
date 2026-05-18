// Copyright (c) 2026 MeeJoy

import { invoke } from "@tauri-apps/api/core"
import { homeDir } from "@tauri-apps/api/path"
import { isTauri } from "./browser-utils.js"

const BROWSER_USER_KEY = "hermes.preview.user"
const BROWSER_SOUL_KEY = "hermes.preview.soul"
const BROWSER_MEMORY_KEY = "hermes.preview.memory"

function readBrowserValue(key) {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(key) || ""
}

function writeBrowserValue(key, value) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, String(value || ""))
}

async function buildHermesPath(relativePath) {
  const home = await homeDir()
  return `${home}.hermes/${relativePath}`
}

export async function readHermesUserConfig() {
  if (!isTauri) return readBrowserValue(BROWSER_USER_KEY)

  try {
    const path = await buildHermesPath("memories/USER.md")
    return await invoke("read_file_content", { path })
  } catch (error) {
    console.warn("Failed to read USER.md:", error)
    return ""
  }
}

export async function writeHermesUserConfig(content) {
  if (!isTauri) {
    writeBrowserValue(BROWSER_USER_KEY, content)
    return
  }

  const dir = await buildHermesPath("memories")
  const path = `${dir}/USER.md`
  await invoke("create_directory_if_not_exists", { path: dir })
  await invoke("write_file_content", { path, content: String(content || "") })
}

export async function readHermesSoulConfig() {
  if (!isTauri) return readBrowserValue(BROWSER_SOUL_KEY)

  try {
    const path = await buildHermesPath("SOUL.md")
    return await invoke("read_file_content", { path })
  } catch (error) {
    console.warn("Failed to read SOUL.md:", error)
    return ""
  }
}

export async function writeHermesSoulConfig(content) {
  if (!isTauri) {
    writeBrowserValue(BROWSER_SOUL_KEY, content)
    return
  }

  const path = await buildHermesPath("SOUL.md")
  await invoke("write_file_content", { path, content: String(content || "") })
}

export async function readHermesMemoryConfig() {
  if (!isTauri) return readBrowserValue(BROWSER_MEMORY_KEY)

  try {
    const path = await buildHermesPath("memories/MEMORY.md")
    return await invoke("read_file_content", { path })
  } catch (error) {
    console.warn("Failed to read MEMORY.md:", error)
    return ""
  }
}
