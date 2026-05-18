// Copyright (c) 2026 MeeJoy

import { isTauri as detectTauri } from '@tauri-apps/api/core'
import { MOCK_SKILLS } from './mock-data.js'

// 检测是否在 Tauri 环境中
export const isTauri = detectTauri()

// ========================
// Browser localStorage loaders
// ========================

function loadBrowserConfig() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(BROWSER_CONFIG_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveBrowserConfig(nextConfig) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BROWSER_CONFIG_KEY, JSON.stringify(nextConfig))
}

function loadBrowserDisabledSkills() {
  if (typeof window === 'undefined') return new Set()

  try {
    const raw = window.localStorage.getItem(BROWSER_DISABLED_SKILLS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveBrowserDisabledSkills(disabledSkills) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    BROWSER_DISABLED_SKILLS_KEY,
    JSON.stringify(Array.from(disabledSkills))
  )
}

function loadBrowserInstalledSkills() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(BROWSER_INSTALLED_SKILLS_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveBrowserInstalledSkills(skills) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BROWSER_INSTALLED_SKILLS_KEY, JSON.stringify(skills))
}

function loadBrowserEnvVars() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(BROWSER_ENV_VARS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function saveBrowserEnvVars(vars) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BROWSER_ENV_VARS_KEY, JSON.stringify(vars))
}

function loadBrowserPrimaryModelConfig() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(BROWSER_PRIMARY_MODEL_CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function saveBrowserPrimaryModelConfig(config) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BROWSER_PRIMARY_MODEL_CONFIG_KEY, JSON.stringify(config))
}

function loadBrowserCronJobs() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(BROWSER_CRON_JOBS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function saveBrowserCronJobs(jobs) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BROWSER_CRON_JOBS_KEY, JSON.stringify(jobs))
}

function makeBrowserCronScheduleDisplay(schedule) {
  return String(schedule || '').trim() || '* * * * *'
}

function sortBrowserCronJobs(jobs) {
  return [...jobs].sort((left, right) => {
    const leftTime = new Date(left?.next_run_at || 0).getTime()
    const rightTime = new Date(right?.next_run_at || 0).getTime()
    return rightTime - leftTime
  })
}

function deriveBrowserMarketCategory(skillPath) {
  const [category] = String(skillPath || '').split('/')
  return category?.trim() || null
}

function toBrowserInstalledSkill(skill) {
  const category = deriveBrowserMarketCategory(skill?.path)
  const name = String(skill?.name || '').trim()

  return {
    name,
    description: String(skill?.description || 'No description available.'),
    category,
    enabled: true,
    source: 'hub',
    trust: String(skill?.trust_level || skill?.source || 'hub'),
    identifier: skill?.identifier || null,
    version: skill?.version || null,
    tags: Array.isArray(skill?.tags) ? skill.tags : [],
    path: skill?.path
      ? `~/.hermes/skills/${skill.path.replace(/^\/+/, '')}`
      : `~/.hermes/skills/${name}/SKILL.md`,
    content_preview: skill?.content_preview || skill?.description || '',
  }
}

function getBrowserSkills() {
  const disabledSkills = loadBrowserDisabledSkills()
  const mergedSkills = new Map()

  for (const skill of MOCK_SKILLS) {
    mergedSkills.set(skill.name, { ...skill })
  }

  for (const skill of loadBrowserInstalledSkills()) {
    if (!skill?.name) continue
    mergedSkills.set(skill.name, { ...skill })
  }

  return Array.from(mergedSkills.values())
    .map((skill) => ({
      ...skill,
      enabled: !disabledSkills.has(skill.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

async function fetchMarketIndex() {
  const response = await fetch(HERMES_SKILLS_INDEX_URL, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch market index: HTTP ${response.status}`)
  }

  const payload = await response.json()
  return Array.isArray(payload?.skills) ? payload.skills : []
}

function getBrowserUpgradePreviewMode() {
  if (typeof window === 'undefined') return 'off'

  const params = new URLSearchParams(window.location.search)
  const value = params.get('previewUpgrade')

  if (value === 'reset') {
    window.sessionStorage.removeItem(BROWSER_UPGRADE_PREVIEW_STATE_KEY)
    return 'enabled'
  }

  return value === '1' ? 'enabled' : 'off'
}

function getBrowserPreviewInstalledVersion() {
  if (typeof window === 'undefined') return BROWSER_PREVIEW_INSTALLED_VERSION

  return (
    window.sessionStorage.getItem(BROWSER_UPGRADE_PREVIEW_STATE_KEY) ||
    BROWSER_PREVIEW_INSTALLED_VERSION
  )
}

function getBrowserGatewayBaseUrl() {
  const config = loadBrowserConfig()
  return `http://${config.gateway_host}:${config.gateway_port}`
}

function extractBrowserGatewayVersion(json, headers) {
  return (
    json?.version ||
    json?.agent_version ||
    json?.gateway_version ||
    json?.app?.version ||
    json?.data?.[0]?.version ||
    headers?.get?.('x-hermes-version') ||
    headers?.get?.('x-agent-version') ||
    headers?.get?.('x-gateway-version') ||
    null
  )
}

// ========================
// Platform detection
// ========================

export function getPlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Mac')) return 'darwin'
  if (ua.includes('Win')) return 'win32'
  if (ua.includes('Linux')) return 'linux'
  return 'unknown'
}

export function isMac() {
  return getPlatform() === 'darwin'
}

export function isWindows() {
  return getPlatform() === 'win32'
}

export function isLinux() {
  return getPlatform() === 'linux'
}

// Export browser utilities for use by other modules
export {
  loadBrowserConfig,
  saveBrowserConfig,
  loadBrowserDisabledSkills,
  saveBrowserDisabledSkills,
  loadBrowserInstalledSkills,
  saveBrowserInstalledSkills,
  loadBrowserEnvVars,
  saveBrowserEnvVars,
  loadBrowserPrimaryModelConfig,
  saveBrowserPrimaryModelConfig,
  loadBrowserCronJobs,
  saveBrowserCronJobs,
  makeBrowserCronScheduleDisplay,
  sortBrowserCronJobs,
  deriveBrowserMarketCategory,
  toBrowserInstalledSkill,
  getBrowserSkills,
  fetchMarketIndex,
  getBrowserUpgradePreviewMode,
  getBrowserPreviewInstalledVersion,
  getBrowserGatewayBaseUrl,
  extractBrowserGatewayVersion,
}

// Config keys for localStorage
export const BROWSER_CONFIG_KEY = 'hermes-desktop-browser-config'
export const BROWSER_UPGRADE_PREVIEW_STATE_KEY = 'hermes-desktop-browser-upgrade-preview-state'
export const BROWSER_DISABLED_SKILLS_KEY = 'hermes-desktop-browser-disabled-skills'
export const BROWSER_INSTALLED_SKILLS_KEY = 'hermes-desktop-browser-installed-skills'
export const BROWSER_CRON_JOBS_KEY = 'hermes-desktop-browser-cron-jobs'
export const BROWSER_ENV_VARS_KEY = 'hermes-desktop-browser-env-vars'
export const BROWSER_PRIMARY_MODEL_CONFIG_KEY = 'hermes-desktop-browser-primary-model-config'
export const BROWSER_PREVIEW_INSTALLED_VERSION = '1.2.4'
export const BROWSER_PREVIEW_LATEST_VERSION = '1.3.0'
export const HERMES_SKILLS_INDEX_URL = 'https://hermes-agent.nousresearch.com/docs/api/skills-index.json'
