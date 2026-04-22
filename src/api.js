import { invoke, isTauri as detectTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// 检测是否在 Tauri 环境中
const isTauri = detectTauri()
const BROWSER_CONFIG_KEY = 'hermes-desktop-browser-config'
const BROWSER_UPGRADE_PREVIEW_STATE_KEY = 'hermes-desktop-browser-upgrade-preview-state'
const BROWSER_DISABLED_SKILLS_KEY = 'hermes-desktop-browser-disabled-skills'
const BROWSER_INSTALLED_SKILLS_KEY = 'hermes-desktop-browser-installed-skills'
const BROWSER_CRON_JOBS_KEY = 'hermes-desktop-browser-cron-jobs'
const BROWSER_ENV_VARS_KEY = 'hermes-desktop-browser-env-vars'
const BROWSER_PRIMARY_MODEL_CONFIG_KEY = 'hermes-desktop-browser-primary-model-config'
const BROWSER_PREVIEW_INSTALLED_VERSION = '1.2.4'
const BROWSER_PREVIEW_LATEST_VERSION = '1.3.0'
const HERMES_SKILLS_INDEX_URL = 'https://hermes-agent.nousresearch.com/docs/api/skills-index.json'

// 模拟数据（用于浏览器开发）
const MOCK_CONFIG = {
  theme: 'system',
  language: 'zh',
  current_agent: 'hermes-agent',
  gateway_host: '127.0.0.1',
  gateway_port: 8642,
  workspace_path: '~/AI/hermes-workspace',
  workspaces: [
    { id: 'default', name: '默认工作区', path: '~/AI/hermes-workspace', icon: '📁' }
  ]
}

const MOCK_SESSIONS = [
  { id: '1', title: '欢迎使用 Hermes', pinned: false, updated_at: Date.now(), model: 'MiniMax-M2.7' }
]

const MOCK_SKILLS = [
  {
    name: 'plan',
    description: 'Plan mode for Hermes — inspect context and write a concrete plan without executing work.',
    category: 'software-development',
    enabled: true,
    source: 'builtin',
    trust: 'builtin',
    identifier: null,
    version: '1.0.0',
    tags: ['planning', 'workflow'],
    path: '~/.hermes/skills/software-development/plan/SKILL.md',
  },
  {
    name: 'github-pr-workflow',
    description: 'Guide the full GitHub pull request workflow with review and merge checkpoints.',
    category: 'github',
    enabled: true,
    source: 'builtin',
    trust: 'builtin',
    identifier: null,
    version: '1.0.0',
    tags: ['github', 'pull-request'],
    path: '~/.hermes/skills/github/github-pr-workflow/SKILL.md',
  },
  {
    name: 'codex-style-ui-redesign',
    description: 'Redesign a UI to match Codex/Claude Code style when reference images are unavailable.',
    category: 'design',
    enabled: true,
    source: 'local',
    trust: 'local',
    identifier: null,
    version: null,
    tags: ['ui-design', 'codex-style'],
    path: '~/.hermes/skills/codex-style-ui-redesign/SKILL.md',
  },
]

const MOCK_TOOLSETS = [
  {
    name: 'web',
    label: 'Web Search & Scraping',
    description: 'Web Search & Scraping',
    enabled: true,
    configured: true,
    tools: [],
  },
  {
    name: 'browser',
    label: 'Browser Automation',
    description: 'Browser Automation',
    enabled: true,
    configured: true,
    tools: [],
  },
  {
    name: 'skills',
    label: 'Skills',
    description: 'Skills',
    enabled: true,
    configured: true,
    tools: [],
  },
]

const MOCK_CRON_JOBS = [
  {
    id: 'cron-demo-1',
    name: '每日总结',
    prompt: '整理今天的重要进展，输出一份简明总结。',
    schedule: {
      kind: 'cron',
      expr: '0 18 * * *',
      display: '0 18 * * *',
    },
    schedule_display: '0 18 * * *',
    enabled: true,
    state: 'scheduled',
    deliver: 'local',
    last_run_at: null,
    next_run_at: null,
    last_error: null,
  },
]

const MOCK_ENV_VARS = {
  DEEPSEEK_API_KEY: {
    is_set: false,
    redacted_value: null,
    description: 'DeepSeek API key for direct DeepSeek access',
    url: 'https://platform.deepseek.com/api_keys',
    category: 'provider',
    is_password: true,
    tools: [],
    advanced: false,
  },
  DASHSCOPE_API_KEY: {
    is_set: false,
    redacted_value: null,
    description: 'Alibaba Cloud DashScope API key (Qwen + multi-provider models)',
    url: 'https://modelstudio.console.alibabacloud.com/',
    category: 'provider',
    is_password: true,
    tools: [],
    advanced: false,
  },
  GOOGLE_API_KEY: {
    is_set: false,
    redacted_value: null,
    description: 'Google AI Studio API key',
    url: 'https://aistudio.google.com/app/apikey',
    category: 'provider',
    is_password: true,
    tools: [],
    advanced: false,
  },
  OPENROUTER_API_KEY: {
    is_set: false,
    redacted_value: null,
    description: 'OpenRouter API key',
    url: 'https://openrouter.ai/keys',
    category: 'provider',
    is_password: true,
    tools: [],
    advanced: true,
  },
  OPENROUTER_BASE_URL: {
    is_set: false,
    redacted_value: null,
    description: 'OpenRouter base URL override',
    url: null,
    category: 'provider',
    is_password: false,
    tools: [],
    advanced: true,
  },
  EXA_API_KEY: {
    is_set: false,
    redacted_value: null,
    description: 'Exa API key for AI-native web search and contents',
    url: 'https://exa.ai/',
    category: 'tool',
    is_password: true,
    tools: ['web_search', 'web_extract'],
    advanced: false,
  },
}

const MOCK_PRIMARY_MODEL_CONFIG = {
  model: '',
  provider: '',
  baseUrl: '',
  apiKey: '',
  contextLength: null,
}

const MOCK_LOG_LINES = {
  agent: [
    '2026-04-21 03:02:44,399 INFO gateway.platforms.api_server: API server listening on http://127.0.0.1:8642',
    '2026-04-21 03:02:45,156 INFO gateway.run: Gateway running with 2 platform(s)',
    '2026-04-21 03:02:45,172 INFO gateway.run: Cron ticker started (interval=60s)',
    '2026-04-21 03:05:59,931 WARNING aiohttp.access: GET / returned 404 from localhost:5173',
    '2026-04-21 03:06:08,277 ERROR aiohttp.access: OPTIONS /v1/responses returned 403 from localhost:5173',
  ],
  errors: [
    '2026-04-21 03:06:08,277 ERROR aiohttp.access: OPTIONS /v1/responses returned 403',
    '2026-04-21 03:06:08,278 ERROR gateway.proxy: Browser preflight rejected because CORS is disabled',
  ],
  gateway: [
    '2026-04-21 03:02:44,400 INFO gateway.run: Connecting to qqbot...',
    '2026-04-21 03:02:45,147 INFO gateway.platforms.qqbot: Connected',
    '2026-04-21 03:02:45,171 INFO gateway.run: Channel directory built: 2 target(s)',
  ],
}

const browserTokenListeners = new Set()
const browserDoneListeners = new Set()
const browserErrorListeners = new Set()
const browserToolEventListeners = new Set()

function loadBrowserConfig() {
  if (typeof window === 'undefined') return MOCK_CONFIG
  try {
    const raw = window.localStorage.getItem(BROWSER_CONFIG_KEY)
    if (!raw) return MOCK_CONFIG
    return { ...MOCK_CONFIG, ...JSON.parse(raw) }
  } catch {
    return MOCK_CONFIG
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
  if (typeof window === 'undefined') return MOCK_ENV_VARS

  try {
    const raw = window.localStorage.getItem(BROWSER_ENV_VARS_KEY)
    if (!raw) return MOCK_ENV_VARS
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : MOCK_ENV_VARS
  } catch {
    return MOCK_ENV_VARS
  }
}

function saveBrowserEnvVars(vars) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BROWSER_ENV_VARS_KEY, JSON.stringify(vars))
}

function loadBrowserPrimaryModelConfig() {
  if (typeof window === 'undefined') return MOCK_PRIMARY_MODEL_CONFIG

  try {
    const raw = window.localStorage.getItem(BROWSER_PRIMARY_MODEL_CONFIG_KEY)
    if (!raw) return MOCK_PRIMARY_MODEL_CONFIG
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? { ...MOCK_PRIMARY_MODEL_CONFIG, ...parsed }
      : MOCK_PRIMARY_MODEL_CONFIG
  } catch {
    return MOCK_PRIMARY_MODEL_CONFIG
  }
}

function saveBrowserPrimaryModelConfig(config) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BROWSER_PRIMARY_MODEL_CONFIG_KEY, JSON.stringify(config))
}

function loadBrowserCronJobs() {
  if (typeof window === 'undefined') return MOCK_CRON_JOBS

  try {
    const raw = window.localStorage.getItem(BROWSER_CRON_JOBS_KEY)
    if (!raw) return MOCK_CRON_JOBS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : MOCK_CRON_JOBS
  } catch {
    return MOCK_CRON_JOBS
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

function emitBrowserToken(token) {
  browserTokenListeners.forEach((listener) => listener(token))
}

function emitBrowserDone() {
  browserDoneListeners.forEach((listener) => listener())
}

function emitBrowserError(message) {
  browserErrorListeners.forEach((listener) => listener(message))
}

function emitBrowserToolEvent(event) {
  browserToolEventListeners.forEach((listener) => listener(event))
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
// 非流式对话（保留兼容）
// ========================
export async function sendChat(messages, options = {}) {
  const { model = null } = options
  if (!isTauri) {
    const res = await fetch(`${getBrowserGatewayBaseUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'hermes-agent',
        messages,
        stream: false,
      }),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const json = await res.json()
    return { content: json?.choices?.[0]?.message?.content || '' }
  }
  const res = await invoke('chat', { messages, model })
  return res.content
}

// ========================
// 流式对话（Phase 1 SSE）
// ========================

export async function sendChatStream(messages, options = {}) {
  const { previousResponseId = null, replayHistory = true, model = null } = options
  if (!isTauri) {
    const target = `${getBrowserGatewayBaseUrl()}/v1/responses`
    const input = replayHistory
      ? messages
      : messages[messages.length - 1]?.content || ''
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'hermes-agent',
        input,
        previous_response_id: previousResponseId,
        stream: true,
      }),
    }).catch((error) => {
      const message = `连接失败: ${error.message}（目标 ${target}）`
      emitBrowserError(message)
      throw error
    })

    if (!response.ok || !response.body) {
      const message = `连接失败: HTTP ${response.status}（目标 ${target}）`
      emitBrowserError(message)
      throw new Error(message)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let streamCompleted = false
    let responseId = null

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      while (buffer.includes('\n\n')) {
        const index = buffer.indexOf('\n\n')
        const block = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 2)

        if (!block) continue

        let eventType = ''
        const dataLines = []

        for (const rawLine of block.split('\n')) {
          const line = rawLine.trimEnd()
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            dataLines.push(line.slice(6))
          }
        }

        if (dataLines.length === 0) continue

        const data = dataLines.join('\n')
        if (data === '[DONE]') {
          streamCompleted = true
          emitBrowserDone()
          return
        }

        let json
        try {
          json = JSON.parse(data)
        } catch {
          continue
        }

        if (json?.response?.id) {
          responseId = json.response.id
        }

        if (eventType === 'response.output_text.delta') {
          const token = json?.delta
          if (token) emitBrowserToken(token)
          continue
        }

        if (eventType === 'response.output_item.added') {
          const item = json?.item || {}
          if (item.type === 'function_call') {
            emitBrowserToolEvent({
              phase: 'started',
              name: item.name || null,
              callId: item.call_id || null,
              arguments: item.arguments || null,
              output: null,
              status: item.status || null,
            })
          } else if (item.type === 'function_call_output') {
            const output = Array.isArray(item.output)
              ? item.output.map((part) => part?.text).filter(Boolean).join('\n')
              : ''
            emitBrowserToolEvent({
              phase: 'completed',
              name: null,
              callId: item.call_id || null,
              arguments: null,
              output: output || null,
              status: item.status || null,
            })
          }
          continue
        }

        if (eventType === 'response.failed') {
          const message =
            json?.response?.error?.message ||
            json?.error?.message ||
            'Hermes Responses API failed'
          emitBrowserError(message)
          throw new Error(message)
        }

        if (eventType === 'response.completed') {
          streamCompleted = true
          emitBrowserDone()
          return responseId
        }
      }
    }

    if (!streamCompleted) {
      emitBrowserDone()
    }
    return responseId
  }
  return await invoke('chat_stream', {
    messages,
    previousResponseId,
    replayHistory,
    model,
  })
}

export async function onChatToken(callback) {
  if (!isTauri) {
    browserTokenListeners.add(callback)
    return () => browserTokenListeners.delete(callback)
  }
  const unlisten = await listen('chattoken', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function onChatDone(callback) {
  if (!isTauri) {
    browserDoneListeners.add(callback)
    return () => browserDoneListeners.delete(callback)
  }
  const unlisten = await listen('chatdone', () => {
    callback()
  })
  return unlisten
}

export async function onChatError(callback) {
  if (!isTauri) {
    browserErrorListeners.add(callback)
    return () => browserErrorListeners.delete(callback)
  }
  const unlisten = await listen('chatterror', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function onChatToolEvent(callback) {
  if (!isTauri) {
    browserToolEventListeners.add(callback)
    return () => browserToolEventListeners.delete(callback)
  }
  const unlisten = await listen('chattoolevent', (event) => {
    callback(event.payload)
  })
  return unlisten
}

// ========================
// 记忆 API（Phase 1-2）
// ========================

export async function getMemories() {
  if (!isTauri) return []
  return await invoke('get_memories')
}

export async function addMemory(summary, content, source = '手动') {
  if (!isTauri) return
  return await invoke('add_memory', { summary, content, source })
}

export async function updateMemory(id, summary, content) {
  if (!isTauri) return
  return await invoke('update_memory', { id, summary, content })
}

export async function deleteMemory(id) {
  if (!isTauri) return
  return await invoke('delete_memory', { id })
}

export async function compactMemories() {
  if (!isTauri) return
  return await invoke('compact_memories')
}

// ========================
// 任务 API（Phase 1-3）
// ========================
export async function getTasks() {
  if (!isTauri) return []
  return await invoke('get_tasks')
}

export async function createTask(title, description, dueDate = null) {
  if (!isTauri) return { id: Date.now().toString(), title, description, due_date: dueDate }
  return await invoke('create_task', { title, description, dueDate })
}

export async function updateTask(id, status) {
  if (!isTauri) return
  return await invoke('update_task', { id, status })
}

export async function deleteTask(id) {
  if (!isTauri) return
  return await invoke('delete_task', { id })
}

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
    const next = {
      ...current,
      [key]: key === 'gateway_port' ? Number(value) : value,
    }
    saveBrowserConfig(next)
    return
  }
  return await invoke('set_config', { key, value })
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

// ========================
// 会话 API（Phase 2-1）
// ========================
export async function getSessions(workspaceFilter = null) {
  if (!isTauri) return MOCK_SESSIONS
  return await invoke('get_sessions', { workspaceFilter })
}

export async function createSession(title, agentId, workspacePath = null, model = null) {
  if (!isTauri) {
    return {
      id: Date.now().toString(),
      title,
      agent_id: agentId,
      pinned: false,
      updated_at: new Date().toISOString(),
      workspace_path: workspacePath,
      preview: null,
      model,
    }
  }
  return await invoke('create_session', { title, agentId, workspacePath, model })
}

export async function getSessionResponseId(sessionId) {
  if (!isTauri) return null
  return await invoke('get_session_response_id', { sessionId })
}

export async function setSessionResponseId(sessionId, responseId = null) {
  if (!isTauri) return
  return await invoke('set_session_response_id', { sessionId, responseId })
}

export async function deleteSession(sessionId) {
  if (!isTauri) return
  return await invoke('delete_session', { id: sessionId })
}

export async function togglePinSession(sessionId) {
  if (!isTauri) return
  return await invoke('toggle_pin_session', { id: sessionId })
}

export async function updateSessionTitle(sessionId, title) {
  if (!isTauri) return
  return await invoke('update_session_title', { id: sessionId, title })
}

export async function updateSessionModel(sessionId, model = null) {
  if (!isTauri) {
    return { ok: true, sessionId, model: String(model || '').trim() || null }
  }
  return await invoke('update_session_model', { id: sessionId, model })
}

export async function getMessages(sessionId) {
  if (!isTauri) return [
    { role: 'user', content: '你好', created_at: Date.now() },
    { role: 'assistant', content: '你好！有什么可以帮助你的吗？', created_at: Date.now() }
  ]
  return await invoke('get_messages', { sessionId })
}

export async function addMessage(sessionId, role, content) {
  if (!isTauri) return
  return await invoke('add_message', { sessionId, role, content })
}

export async function savePastedAttachment(
  workspacePath,
  fileName,
  dataBase64,
  isImage = false
) {
  if (!isTauri) {
    return {
      path: `${workspacePath || '~/AI/hermes-workspace'}/${isImage ? 'img' : 'files'}/${fileName}`,
    }
  }
  return await invoke('save_pasted_attachment', {
    workspacePath,
    fileName,
    dataBase64,
    isImage,
  })
}

export async function importAttachmentFromPath(workspacePath, sourcePath) {
  if (!isTauri) {
    const normalized = String(sourcePath || '').replaceAll('\\', '/')
    const fileName = normalized.split('/').pop() || 'attachment'
    return {
      path: `${workspacePath || '~/AI/hermes-workspace'}/files/${fileName}`,
    }
  }
  return await invoke('import_attachment_from_path', {
    workspacePath,
    sourcePath,
  })
}

// ========================
// 工作区 API（Phase 3）
// ========================
export async function getWorkspaces() {
  if (!isTauri) return MOCK_CONFIG.workspaces
  return await invoke('get_workspaces')
}

export async function setWorkspace(workspaceId) {
  if (!isTauri) return
  return await invoke('set_workspace', { workspaceId })
}

export async function getCurrentWorkspace() {
  if (!isTauri) return MOCK_CONFIG.workspaces[0]
  return await invoke('get_current_workspace')
}

export async function createTerminalSession(workspacePath = null) {
  if (!isTauri) {
    return { sessionId: `browser-${Date.now()}` }
  }
  return await invoke('create_terminal_session', { workspacePath })
}

export async function writeTerminalInput(sessionId, data) {
  if (!isTauri) return
  return await invoke('write_terminal_input', { sessionId, data })
}

export async function resizeTerminalSession(sessionId, cols, rows) {
  if (!isTauri) return
  return await invoke('resize_terminal_session', { sessionId, cols, rows })
}

export async function closeTerminalSession(sessionId) {
  if (!isTauri) return
  return await invoke('close_terminal_session', { sessionId })
}

export async function onTerminalOutput(callback) {
  if (!isTauri) return () => {}
  const unlisten = await listen('terminal-output', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function onTerminalExit(callback) {
  if (!isTauri) return () => {}
  const unlisten = await listen('terminal-exit', (event) => {
    callback(event.payload)
  })
  return unlisten
}

export async function createWorkspace(name, path, icon = '📁') {
  if (!isTauri) {
    return {
      id: Date.now().toString(),
      name,
      path,
      icon,
    }
  }
  return await invoke('create_workspace', { name, path, icon })
}

export async function updateWorkspace(workspaceId, name, path, icon = '📁') {
  if (!isTauri) {
    return { id: workspaceId, name, path, icon }
  }
  return await invoke('update_workspace', { workspaceId, name, path, icon })
}

export async function deleteWorkspace(workspaceId) {
  if (!isTauri) return []
  return await invoke('delete_workspace', { workspaceId })
}

// ========================
// 智能体 API（Phase 2）
// ========================
export async function getAgents() {
  if (!isTauri) return [
    { id: 'hermes-agent', name: 'Hermes Agent', description: '默认通用智能体' }
  ]
  return await invoke('get_agents')
}

// ========================
// 定时任务 API
// ========================
export async function getCronJobs() {
  if (!isTauri) {
    return sortBrowserCronJobs(loadBrowserCronJobs())
  }
  return await invoke('get_cron_jobs')
}

export async function createCronJob({ prompt, schedule, name, deliver = 'local' }) {
  if (!isTauri) {
    const now = new Date().toISOString()
    const job = {
      id: `cron-${Date.now()}`,
      name: name?.trim() || null,
      prompt: String(prompt || '').trim(),
      schedule: {
        kind: 'cron',
        expr: String(schedule || '').trim(),
        display: makeBrowserCronScheduleDisplay(schedule),
      },
      schedule_display: makeBrowserCronScheduleDisplay(schedule),
      enabled: true,
      state: 'scheduled',
      deliver,
      last_run_at: null,
      next_run_at: now,
      last_error: null,
    }
    const nextJobs = sortBrowserCronJobs([...loadBrowserCronJobs(), job])
    saveBrowserCronJobs(nextJobs)
    return job
  }
  return await invoke('create_cron_job', {
    input: { prompt, schedule, name, deliver },
  })
}

export async function checkCronDependency() {
  if (!isTauri) {
    return {
      package_name: 'croniter',
      installed: true,
      python_command: 'python3',
      install_command: 'python3 -m pip install croniter',
      message: 'Browser preview mode does not require croniter.',
    }
  }
  return await invoke('check_cron_python_dependency')
}

export async function installCronDependency() {
  if (!isTauri) {
    return {
      package_name: 'croniter',
      success: true,
      python_command: 'python3',
      install_command: 'python3 -m pip install croniter',
      stdout: 'Browser preview mode: simulated installation.',
      stderr: '',
      message: 'Browser preview mode does not require croniter.',
    }
  }
  return await invoke('install_cron_python_dependency')
}

export async function restartHermesDashboard() {
  if (!isTauri) {
    return {
      success: true,
      command: 'hermes dashboard --port 9119 --no-open',
      message: 'Browser preview mode: simulated dashboard restart.',
    }
  }
  return await invoke('restart_hermes_dashboard')
}

export async function pauseCronJob(id) {
  if (!isTauri) {
    const nextJobs = loadBrowserCronJobs().map((job) =>
      job.id === id
        ? { ...job, enabled: false, state: 'paused' }
        : job
    )
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('pause_cron_job', { id })
}

export async function resumeCronJob(id) {
  if (!isTauri) {
    const nextJobs = loadBrowserCronJobs().map((job) =>
      job.id === id
        ? { ...job, enabled: true, state: 'scheduled' }
        : job
    )
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('resume_cron_job', { id })
}

export async function triggerCronJob(id) {
  if (!isTauri) {
    const now = new Date().toISOString()
    const nextJobs = loadBrowserCronJobs().map((job) =>
      job.id === id
        ? { ...job, last_run_at: now, state: job.state === 'paused' ? 'paused' : 'scheduled' }
        : job
    )
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('trigger_cron_job', { id })
}

export async function deleteCronJob(id) {
  if (!isTauri) {
    const nextJobs = loadBrowserCronJobs().filter((job) => job.id !== id)
    saveBrowserCronJobs(nextJobs)
    return { ok: true }
  }
  return await invoke('delete_cron_job', { id })
}

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

// ========================
// 技能 API（Phase 3）
// ========================
export async function getSkills() {
  if (!isTauri) {
    return getBrowserSkills()
  }
  return await invoke('get_skills')
}

export async function getSkillDetail(name) {
  if (!isTauri) {
    const skill = getBrowserSkills().find((item) => item.name === name)
    if (!skill) throw new Error(`Skill not found: ${name}`)

    return {
      skill,
      content_preview: skill.content_preview || skill.description,
    }
  }
  return await invoke('get_skill_detail', { name })
}

export async function toggleSkill(name, enabled) {
  if (!isTauri) {
    const disabledSkills = loadBrowserDisabledSkills()
    if (enabled) {
      disabledSkills.delete(name)
    } else {
      disabledSkills.add(name)
    }
    saveBrowserDisabledSkills(disabledSkills)
    return getBrowserSkills().find((skill) => skill.name === name)
  }
  return await invoke('toggle_skill', { name, enabled })
}

export async function getToolsets() {
  if (!isTauri) return MOCK_TOOLSETS
  return await invoke('get_toolsets')
}

export async function getMarketSkills() {
  if (!isTauri) {
    const installedNames = new Map(getBrowserSkills().map((skill) => [skill.name, skill.source]))
    const skills = await fetchMarketIndex()

    return skills.map((skill) => ({
      ...skill,
      category: skill?.path?.split('/')?.[0] || null,
      installed: installedNames.has(skill.name),
      installed_source: installedNames.get(skill.name) || null,
    }))
  }
  return await invoke('get_market_skills')
}

export async function installSkill(identifier) {
  if (!isTauri) {
    const skills = await fetchMarketIndex()
    const marketSkill = skills.find((skill) => skill.identifier === identifier)

    if (!marketSkill) {
      return {
        success: false,
        stdout: '',
        stderr: `Preview mode: skill not found for ${identifier}`,
      }
    }

    const installedSkill = toBrowserInstalledSkill(marketSkill)
    const nextSkills = loadBrowserInstalledSkills().filter((skill) => skill?.name !== installedSkill.name)
    nextSkills.push(installedSkill)
    nextSkills.sort((left, right) => String(left?.name || '').localeCompare(String(right?.name || '')))
    saveBrowserInstalledSkills(nextSkills)

    const disabledSkills = loadBrowserDisabledSkills()
    disabledSkills.delete(installedSkill.name)
    saveBrowserDisabledSkills(disabledSkills)

    return {
      success: true,
      stdout: `Preview mode: installed ${identifier}`,
      stderr: '',
    }
  }
  return await invoke('install_skill', { identifier })
}

export async function uninstallSkill(name) {
  if (!isTauri) {
    const nextSkills = loadBrowserInstalledSkills().filter((skill) => skill?.name !== name)
    saveBrowserInstalledSkills(nextSkills)

    const disabledSkills = loadBrowserDisabledSkills()
    disabledSkills.delete(name)
    saveBrowserDisabledSkills(disabledSkills)

    return {
      success: true,
      stdout: `Preview mode: uninstalled ${name}`,
      stderr: '',
    }
  }
  return await invoke('uninstall_skill', { name })
}

export async function checkSkillUpdates(name = null) {
  if (!isTauri) {
    return {
      success: true,
      stdout: 'Preview mode: no updates available',
      stderr: '',
    }
  }
  return await invoke('check_skill_updates', { name })
}

export async function updateSkill(name = null) {
  if (!isTauri) {
    return {
      success: true,
      stdout: `Preview mode: updated ${name || 'skills'}`,
      stderr: '',
    }
  }
  return await invoke('update_skill', { name })
}

export async function inspectMarketSkill(identifier) {
  if (!isTauri) {
    const skills = await fetchMarketIndex()
    const marketSkill = skills.find((skill) => skill.identifier === identifier)

    if (!marketSkill) {
      return {
        success: false,
        stdout: '',
        stderr: `Preview mode: skill not found for ${identifier}`,
      }
    }

    const lines = [
      `${marketSkill.name}`,
      '',
      marketSkill.description || '',
      '',
      `Identifier: ${marketSkill.identifier}`,
      `Source: ${marketSkill.source}`,
      marketSkill.path ? `Path: ${marketSkill.path}` : '',
      Array.isArray(marketSkill.tags) && marketSkill.tags.length > 0
        ? `Tags: ${marketSkill.tags.join(', ')}`
        : '',
    ].filter(Boolean)

    return {
      success: true,
      stdout: lines.join('\n'),
      stderr: '',
    }
  }
  return await invoke('inspect_market_skill', { identifier })
}

// ========================
// 文件操作 API（Phase 3）
// ========================
export async function listDirectory(path, workspacePath = null) {
  if (!isTauri) return []
  return await invoke('list_directory', { path, workspacePath })
}

export async function readFile(path, workspacePath = null) {
  if (!isTauri) return 'Browser mock file content'
  return await invoke('read_file', { path, workspacePath })
}

export async function getFilePreview(path, workspacePath = null) {
  if (!isTauri) {
    const extension = String(path || "").split(".").pop()?.toLowerCase()
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(extension)) {
      return {
        kind: "image",
        name: path.split("/").pop() || path,
        path,
        mime: `image/${extension === "svg" ? "svg+xml" : extension}`,
        extension,
        size: 0,
        modified: new Date().toISOString(),
        content: null,
        data_url: null,
      }
    }
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf"].includes(extension)) {
      return {
        kind: extension === "pdf" ? "pdf" : "office",
        name: path.split("/").pop() || path,
        path,
        mime: null,
        extension,
        size: 0,
        modified: new Date().toISOString(),
        content: null,
        data_url: null,
      }
    }
    return {
      kind: "text",
      name: path.split("/").pop() || path,
      path,
      mime: "text/plain",
      extension,
      size: 0,
      modified: new Date().toISOString(),
      content: "Browser mock file content",
      data_url: null,
    }
  }
  return await invoke('get_file_preview', { path, workspacePath })
}

export async function openFileExternal(path, workspacePath = null) {
  if (!isTauri) {
    return { success: true, path }
  }
  return await invoke('open_file_external', { path, workspacePath })
}

export async function writeFile(path, content, workspacePath = null) {
  if (!isTauri) return
  return await invoke('write_file', { path, content, workspacePath })
}

export async function deleteFile(path, workspacePath = null) {
  if (!isTauri) return
  return await invoke('delete_file', { path, workspacePath })
}

export async function createDirectory(path, workspacePath = null) {
  if (!isTauri) return
  return await invoke('create_directory', { path, workspacePath })
}
