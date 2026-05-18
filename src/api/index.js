// Copyright (c) 2026 MeeJoy

// API module exports - re-exports all functions from domain modules for backward compatibility

// Chat APIs
export { sendChat, sendChatStream, cancelChatStream, onChatToken, onChatDone, onChatError, onChatToolEvent } from './chat.js'

// Memory APIs
export { getMemories, addMemory, updateMemory, deleteMemory, compactMemories } from './memory.js'

// Task APIs
export { getTasks, createTask, updateTask, deleteTask } from './task.js'

// Config APIs
export { getConfig, setConfig, testGatewayConnection, getGatewayInfo, getHermesVersionInfo, updateHermesAgent } from './config.js'
export {
  readHermesUserConfig,
  writeHermesUserConfig,
  readHermesSoulConfig,
  writeHermesSoulConfig,
  readHermesMemoryConfig,
} from "./hermes-config.js"
export {
  readChannelsConfig,
  writeChannelsConfig,
  getQqbotQrCode,
  checkQqbotQrCodeStatus,
  getQqbotQrImageSrc,
  getWeixinQrCode,
  checkWeixinQrCodeStatus,
  getWeixinQrImageSrc,
  normalizeQqbotQrInfo,
  normalizeWeixinQrInfo,
  getWhatsappQrCode,
} from "./channels.js"

// Session APIs
export { getSessions, createSession, getSessionResponseId, setSessionResponseId, deleteSession, togglePinSession, updateSessionTitle, updateSessionModel, getMessages, addMessage, savePastedAttachment, importAttachmentFromPath } from './session.js'

// Workspace APIs
export { getWorkspaces, setWorkspace, getCurrentWorkspace, createTerminalSession, writeTerminalInput, resizeTerminalSession, closeTerminalSession, onTerminalOutput, onTerminalExit, createWorkspace, updateWorkspace, deleteWorkspace } from './workspace.js'

// Agent API
export { getAgents } from './agent.js'

// Cron APIs
export { getCronJobs, createCronJob, checkCronDependency, installCronDependency, restartHermesDashboard, pauseCronJob, resumeCronJob, triggerCronJob, deleteCronJob } from './cron.js'

// Dashboard APIs
export { getLogs, getEnvVars, getPrimaryModelConfig, getConfiguredModelCandidates, getModelOptions, savePrimaryModelConfig, setDefaultModel, setEnvVar, deleteEnvVar, revealEnvVar, checkDashboardRunning, checkGatewayRunning, restartHermesGateway, stopHermesGateway, stopHermesDashboard } from './dashboard.js'

// Skills APIs
export { getSkills, getSkillDetail, toggleSkill, getToolsets, getMarketSkills, installSkill, uninstallSkill, checkSkillUpdates, updateSkill, inspectMarketSkill } from './skills.js'

// File APIs
export { listDirectory, readFile, getFilePreview, openFileExternal, writeFile, deleteFile, createDirectory } from './file.js'

// Notebook APIs
export {
  listNotebookTree,
  createNotebookFolder,
  renameNotebookFolder,
  deleteNotebookFolder,
  createNotebookNote,
  renameNotebookNote,
  deleteNotebookNote,
  getNotebookNote,
  updateNotebookNote,
  searchNotebookNotes,
  moveNotebookFolder,
  moveNotebookNote,
} from './notebook.js'

// Browser utilities and constants
export {
  isTauri,
  getPlatform,
  isMac,
  isWindows,
  isLinux,
  BROWSER_CONFIG_KEY,
  BROWSER_UPGRADE_PREVIEW_STATE_KEY,
  BROWSER_DISABLED_SKILLS_KEY,
  BROWSER_INSTALLED_SKILLS_KEY,
  BROWSER_CRON_JOBS_KEY,
  BROWSER_ENV_VARS_KEY,
  BROWSER_PRIMARY_MODEL_CONFIG_KEY,
  BROWSER_PREVIEW_INSTALLED_VERSION,
  BROWSER_PREVIEW_LATEST_VERSION,
  HERMES_SKILLS_INDEX_URL,
} from './browser-utils.js'

// Mock data
export { MOCK_CONFIG, MOCK_SESSIONS, MOCK_SKILLS, MOCK_TOOLSETS, MOCK_CRON_JOBS, MOCK_ENV_VARS, MOCK_LOG_LINES } from './mock-data.js'
