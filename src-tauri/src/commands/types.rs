// Copyright (c) 2026 MeeJoy

use serde::{Deserialize, Serialize};
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

const APP_DB_FILENAME: &str = "hermes-slate-desk.db";
const LEGACY_APP_DB_FILENAME: &str = "hermes-desktop-lite.db";

// === Helper Functions ===
pub fn now_rfc3339() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    format!("{}.000Z", ts)
}

pub fn open_app_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join(APP_DB_FILENAME);
    let legacy_db_path = app_dir.join(LEGACY_APP_DB_FILENAME);

    if !db_path.exists() && legacy_db_path.exists() {
        std::fs::copy(&legacy_db_path, &db_path).map_err(|e| e.to_string())?;
    }

    Connection::open(db_path).map_err(|e| e.to_string())
}

pub fn normalize_workspace_path(workspace_filter: Option<&str>) -> Option<String> {
    workspace_filter.map(|p| {
        let expanded = shellexpand::tilde(p);
        let cleaned = expanded.to_string().trim_end_matches('/').to_string();
        if cleaned.is_empty() { "/".to_string() } else { cleaned }
    })
}

// === Memory Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MemoryEntry {
    pub id: String,
    pub summary: String,
    pub content: String,
    pub source: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub importance: String,
    pub access_count: i64,
    pub last_accessed_at: Option<String>,
    pub workspace_path: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct MemoryCreate {
    pub summary: String,
    pub content: String,
    pub source: Option<String>,
    pub importance: Option<String>,
    pub workspace_path: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct MemoryUpdate {
    pub summary: Option<String>,
    pub content: Option<String>,
    pub source: Option<String>,
    pub importance: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct MigrationResult {
    pub migrated: i64,
    pub skipped: i64,
    pub errors: Vec<String>,
}

// === Task Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub tags: Option<String>,
    pub project: Option<String>,
    pub workspace_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TaskCreate {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub tags: Option<String>,
    pub project: Option<String>,
    pub workspace_path: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TaskUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub tags: Option<String>,
    pub project: Option<String>,
}

// === Session Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub model: Option<String>,
    pub pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct SessionCreate {
    pub title: Option<String>,
    pub model: Option<String>,
}

// === Message Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub created_at: String,
    pub attachments: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
pub struct MessageCreate {
    pub content: String,
    pub attachments: Option<serde_json::Value>,
}

// === Workspace Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct WorkspaceCreate {
    pub name: String,
    pub path: String,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct WorkspaceUpdate {
    pub name: Option<String>,
    pub path: Option<String>,
    pub icon: Option<String>,
}

// === Notebook Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NotebookFolder {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NotebookNote {
    pub id: String,
    pub folder_id: Option<String>,
    pub title: String,
    pub content: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NotebookTree {
    pub folders: Vec<NotebookFolder>,
    pub notes: Vec<NotebookNoteMeta>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NotebookNoteMeta {
    pub id: String,
    pub folder_id: Option<String>,
    pub title: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

// === Config Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub gateway_host: Option<String>,
    pub gateway_port: Option<i64>,
    pub hermes_agent_path: Option<String>,
    pub hermes_workspace: Option<String>,
    #[serde(default)]
    pub user_nickname: Option<String>,
}

// === Gateway Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GatewayInfo {
    pub target: String,
    pub installed_version: Option<String>,
    pub latest_version: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HermesVersionInfo {
    pub installed_display: Option<String>,
    pub installed_version: Option<String>,
    pub latest_tag: Option<String>,
    pub latest_name: Option<String>,
    pub latest_display: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HermesUpdateResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

// === Agent/Skill Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SkillInfo {
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolsetInfo {
    pub name: String,
    pub tools: Vec<serde_json::Value>,
}

// === Misc Types ===
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CronPythonDependencyStatus {
    pub installed: bool,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CronPythonDependencyInstallResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HermesDashboardRestartResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}
