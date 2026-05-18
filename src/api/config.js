// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri, loadBrowserConfig, saveBrowserConfig, getBrowserUpgradePreviewMode, getBrowserPreviewInstalledVersion, extractBrowserGatewayVersion, BROWSER_UPGRADE_PREVIEW_STATE_KEY, BROWSER_PREVIEW_LATEST_VERSION } from './browser-utils.js'

// ========================
// 配置 API（Phase 2-2 / 3-3）
// ========================
export async function getConfig() {
  if (!isTauri) return loadBrowserConfig()
  return await invoke('get_config')
}

export async function setConfig(key, value) {
  if (!isTauri) {
    const current = loadBrowserConfig()
    const normalizedValue = key === "gateway_port"
      ? Number(value)
      : key === "user_nickname"
        ? String(value ?? "")
        : value
    const next = {
      ...current,
      [key]: normalizedValue,
    }
    saveBrowserConfig(next)
    return
  }
  return await invoke("set_config", { key, value })
}

async function browserReachabilityCheck(host, port) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2500)

  try {
    await fetch(`http://${host}:${port}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    })
    return { ok: true, target: `${host}:${port}` }
  } finally {
    clearTimeout(timeout)
  }
}

export async function testGatewayConnection(host, port) {
  if (!isTauri) {
    return await browserReachabilityCheck(host, port)
  }
  return await invoke('test_gateway_connection', { host, port: Number(port) })
}

export async function getGatewayInfo(host, port) {
  if (!isTauri) {
    const baseUrl = `http://${host}:${port}`
    const paths = ['/v1/models', '/version', '/health', '/status', '/']

    for (const path of paths) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: 'GET',
          cache: 'no-store',
        })
        const headers = response.headers
        const json = await response.json().catch(() => null)
        const version = extractBrowserGatewayVersion(json, headers)
        if (version) {
          return { target: `${host}:${port}`, version }
        }
      } catch {
        // ignore and try next path
      }
    }

    return { target: `${host}:${port}`, version: null }
  }
  return await invoke('get_gateway_info', { host, port: Number(port) })
}

export async function getHermesVersionInfo() {
  if (!isTauri) {
    if (getBrowserUpgradePreviewMode() === 'enabled') {
      const installedVersion = getBrowserPreviewInstalledVersion()

      return {
        installed_display: `Hermes Agent ${installedVersion}`,
        installed_version: installedVersion,
        latest_tag: `v${BROWSER_PREVIEW_LATEST_VERSION}`,
        latest_name: `Hermes Agent ${BROWSER_PREVIEW_LATEST_VERSION}`,
        latest_display: BROWSER_PREVIEW_LATEST_VERSION,
      }
    }

    return {
      installed_display: null,
      installed_version: null,
      latest_tag: null,
      latest_name: null,
      latest_display: null,
    }
  }
  return await invoke('get_hermes_version_info')
}

export async function updateHermesAgent() {
  if (!isTauri) {
    if (getBrowserUpgradePreviewMode() === 'enabled') {
      window.sessionStorage.setItem(
        BROWSER_UPGRADE_PREVIEW_STATE_KEY,
        BROWSER_PREVIEW_LATEST_VERSION
      )

      return {
        success: true,
        stdout: `Preview mode: upgraded to ${BROWSER_PREVIEW_LATEST_VERSION}`,
        stderr: '',
      }
    }

    throw new Error('Hermes update is only available in the desktop app')
  }
  return await invoke('update_hermes_agent')
}
