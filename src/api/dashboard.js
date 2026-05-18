// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri, loadBrowserEnvVars, saveBrowserEnvVars, loadBrowserPrimaryModelConfig, saveBrowserPrimaryModelConfig } from './browser-utils.js'
import { MOCK_LOG_LINES } from './mock-data.js'

// ========================
// Dashboard / Gateway Process APIs
// ========================

export async function checkDashboardRunning() {
  if (!isTauri) return false
  return await invoke('check_dashboard_running')
}

export async function checkGatewayRunning() {
  if (!isTauri) return false
  return await invoke('check_gateway_running')
}

export async function restartHermesGateway() {
  if (!isTauri) return false
  return await invoke('restart_hermes_gateway')
}

export async function stopHermesGateway() {
  if (!isTauri) return false
  return await invoke('stop_hermes_gateway')
}

export async function stopHermesDashboard() {
  if (!isTauri) return false
  return await invoke('stop_hermes_dashboard')
}

// ========================
// Dashboard Logs / Config APIs
// ========================
export async function getLogs({ file = 'agent', lines = 100, level = 'ALL', component = 'all' } = {}) {
  if (!isTauri) {
    const source = [...(MOCK_LOG_LINES[file] || MOCK_LOG_LINES.agent)]
    const filteredByLevel =
      level === 'ALL'
        ? source
        : source.filter((line) => line.toUpperCase().includes(level))
    const filteredByComponent =
      component === 'all'
        ? filteredByLevel
        : filteredByLevel.filter((line) => line.toLowerCase().includes(component.toLowerCase()))

    return {
      file,
      lines: filteredByComponent.slice(-Number(lines || 100)),
    }
  }
  return await invoke('get_dashboard_logs', {
    file,
    lines: Number(lines),
    level,
    component,
  })
}

export async function getEnvVars() {
  if (!isTauri) {
    return loadBrowserEnvVars()
  }
  return await invoke('get_dashboard_env_vars')
}

export async function getPrimaryModelConfig() {
  if (!isTauri) {
    return loadBrowserPrimaryModelConfig()
  }
  return await invoke('get_dashboard_primary_model_config')
}

export async function getConfiguredModelCandidates() {
  if (!isTauri) {
    return []
  }
  return await invoke('get_configured_model_candidates')
}

export async function getModelOptions() {
  if (!isTauri) {
    const current = loadBrowserPrimaryModelConfig() || {}
    const provider = String(current.provider || "").trim()
    const model = String(current.model || "").trim()
    const providers = provider && model
      ? [
          {
            id: provider,
            label: provider,
            models: [
              {
                id: model,
                label: model,
              },
            ],
          },
        ]
      : []

    return {
      providers,
      provider,
      model,
    }
  }

  return await invoke('get_model_options')
}

export async function setDefaultModel(provider, model) {
  const normalizedProvider = String(provider || "").trim()
  const normalizedModel = String(model || "").trim()

  if (!normalizedProvider || !normalizedModel) {
    throw new Error("Provider and model are required")
  }

  if (!isTauri) {
    const current = loadBrowserPrimaryModelConfig() || {}
    saveBrowserPrimaryModelConfig({
      ...current,
      provider: normalizedProvider,
      model: normalizedModel,
      baseUrl: "",
      contextLength: null,
    })
    return { ok: true }
  }

  return await invoke('set_default_model', {
    provider: normalizedProvider,
    model: normalizedModel,
  })
}

export async function savePrimaryModelConfig(config) {
  const payload = {
    model: String(config?.model || '').trim(),
    provider: String(config?.provider || '').trim(),
    baseUrl: String(config?.baseUrl || '').trim(),
    apiKey: String(config?.apiKey || '').trim(),
    contextLength: config?.contextLength ?? null,
  }

  if (!isTauri) {
    saveBrowserPrimaryModelConfig(payload)
    return { ok: true }
  }
  return await invoke('save_dashboard_primary_model_config', { config: payload })
}

export async function setEnvVar(key, value) {
  if (!isTauri) {
    const current = loadBrowserEnvVars()
    const next = {
      ...current,
      [key]: {
        ...(current[key] || {}),
        is_set: true,
        redacted_value: `${String(value).slice(0, 4)}...${String(value).slice(-4)}`,
      },
    }
    saveBrowserEnvVars(next)
    return { ok: true }
  }
  return await invoke('set_dashboard_env_var', { key, value })
}

export async function deleteEnvVar(key) {
  if (!isTauri) {
    const current = loadBrowserEnvVars()
    const next = {
      ...current,
      [key]: {
        ...(current[key] || {}),
        is_set: false,
        redacted_value: null,
      },
    }
    saveBrowserEnvVars(next)
    return { ok: true }
  }
  return await invoke('delete_dashboard_env_var', { key })
}

export async function revealEnvVar(key) {
  if (!isTauri) {
    return {
      key,
      value: `preview-${key.toLowerCase()}-value`,
    }
  }
  return await invoke('reveal_dashboard_env_var', { key })
}
