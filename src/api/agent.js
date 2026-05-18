// Copyright (c) 2026 MeeJoy

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './browser-utils.js'

// ========================
// 智能体 API（Phase 2）
// ========================
export async function getAgents() {
  if (!isTauri) return [
    { id: 'hermes-agent', name: 'Hermes Agent', description: '默认通用智能体' }
  ]
  return await invoke('get_agents')
}
