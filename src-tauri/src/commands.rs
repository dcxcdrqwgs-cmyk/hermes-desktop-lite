use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
}

// ========================
// 非流式对话（保留兼容）
// ========================
#[tauri::command]
pub async fn chat(messages: Vec<ChatMessage>) -> Result<ChatResponse, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": "hermes-agent",
        "messages": messages,
        "stream": false
    });
    let res = client
        .post("http://127.0.0.1:8642/v1/chat/completions")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();
    Ok(ChatResponse { content })
}

// ========================
// 流式对话（Phase 1 SSE）
// ========================

/// SSE 流式聊天命令
/// 每次收到一个 token 就通过 app.emit 发送到前端
#[tauri::command]
pub async fn chat_stream(app: AppHandle, messages: Vec<ChatMessage>) -> Result<(), String> {
    use reqwest::Client;
    use futures::StreamExt; // 用于 .next()
    use tokio::time::Duration;

    let client = Client::builder()
        .timeout(Duration::from_secs(60)) // 连接超时
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!( {
        "model": "hermes-agent",
        "messages": messages,
        "stream": true
    });

    let res = client
        .post("http://127.0.0.1:8642/v1/chat/completions")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            // 发送错误：gateway 可能未启动或重启中
            let _ = app.emit("chatterror", format!("连接失败: {}", e));
            e.to_string()
        })?;

    // 流式读取 SSE
    let mut stream = res.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(chunk) => {
                // 将字节块追加到缓冲区（chunk 是 reqwest::bytes::Bytes）
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                // 处理缓冲区中的完整行
                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer.drain(..=pos);

                    if line.starts_with("data: ") {
                        let data = &line[6..];
                        if data == "[DONE]" {
                            let _ = app.emit("chatdone", ());
                            return Ok(());
                        }
                        // 解析 SSE JSON
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                                let _ = app.emit("chattoken", content);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                // 流读取错误（gateway 重启导致连接断开）
                let _ = app.emit("chatterror", format!("流式响应中断: {}", e));
                return Err(e.to_string());
            }
        }
    }

    // 流正常结束（没收到 [DONE]）
    let _ = app.emit("chatdone", ());
    Ok(())
}

// ========================
// 记忆相关命令（Phase 1-2）
// ========================

use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone)]
pub struct MemoryEntry {
    pub id: String,
    pub summary: String,
    pub content: String,
    pub source: String,
    pub created_at: String,
    pub importance: String, // "hot" | "warm" | "cold"
    pub access_count: u32,
}

// 记忆存储（内存持久化，后续可换 SQLite）
static MEMORIES: std::sync::LazyLock<Mutex<Vec<MemoryEntry>>> =
    std::sync::LazyLock::new(|| Mutex::new(vec![
        MemoryEntry {
            id: "mem_1".to_string(),
            summary: "用户角色".to_string(),
            content: "用户是全栈开发者，熟悉 React、Rust、Tauri、Python。偏好简洁直接的回复。".to_string(),
            source: "对话".to_string(),
            created_at: "2026-04-15".to_string(),
            importance: "hot".to_string(),
            access_count: 5,
        },
        MemoryEntry {
            id: "mem_2".to_string(),
            summary: "当前项目".to_string(),
            content: "Hermes Desktop Lite — Tauri + React 桌面客户端，连接本地 Hermes agent HTTP API (localhost:8642)。".to_string(),
            source: "对话".to_string(),
            created_at: "2026-04-15".to_string(),
            importance: "warm".to_string(),
            access_count: 2,
        },
        MemoryEntry {
            id: "mem_3".to_string(),
            summary: "偏好设置".to_string(),
            content: "用户偏好深色主题，使用中文交流。".to_string(),
            source: "配置".to_string(),
            created_at: "2026-04-13".to_string(),
            importance: "cold".to_string(),
            access_count: 0,
        },
    ]));

#[tauri::command]
pub fn get_memories() -> Result<Vec<MemoryEntry>, String> {
    let mem = MEMORIES.lock().map_err(|e| e.to_string())?;
    Ok(mem.clone())
}

#[tauri::command]
pub fn add_memory(summary: String, content: String, source: String) -> Result<MemoryEntry, String> {
    let mut mem = MEMORIES.lock().map_err(|e| e.to_string())?;
    let entry = MemoryEntry {
        id: format!("mem_{}", uuid::Uuid::new_v4()),
        summary,
        content,
        source,
        created_at: chrono_now(),
        importance: "warm".to_string(),
        access_count: 0,
    };
    mem.push(entry.clone());
    Ok(entry)
}

#[tauri::command]
pub fn update_memory(id: String, summary: String, content: String) -> Result<(), String> {
    let mut mem = MEMORIES.lock().map_err(|e| e.to_string())?;
    if let Some(e) = mem.iter_mut().find(|e| e.id == id) {
        e.summary = summary;
        e.content = content;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_memory(id: String) -> Result<(), String> {
    let mut mem = MEMORIES.lock().map_err(|e| e.to_string())?;
    mem.retain(|e| e.id != id);
    Ok(())
}

#[tauri::command]
pub fn compact_memories() -> Result<String, String> {
    // 触发记忆整合：更新 hot/warm/cold 分层
    let mut mem = MEMORIES.lock().map_err(|e| e.to_string())?;
    for entry in mem.iter_mut() {
        if entry.access_count >= 3 {
            entry.importance = "hot".to_string();
        } else if entry.access_count >= 1 {
            entry.importance = "warm".to_string();
        } else {
            entry.importance = "cold".to_string();
        }
    }
    Ok("记忆整合完成".to_string())
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let dur = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    // 简化版：只返回天数
    let days = secs / 86400;
    format!("2026-01-01+{}d", days)
}

// ========================
// 任务相关命令（Phase 1-3）
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String, // "in_progress" | "completed" | "expired"
    pub due_date: Option<String>,
}

// 任务存储（内存持久化）
static TASKS: std::sync::LazyLock<Mutex<Vec<Task>>> =
    std::sync::LazyLock::new(|| Mutex::new(vec![
        Task {
            id: "task_1".to_string(),
            title: "完成 Hermes Desktop Lite SSE 流式响应".to_string(),
            description: "实现 chat_stream 命令，支持逐 token 流式输出到前端".to_string(),
            status: "in_progress".to_string(),
            due_date: Some("2026-04-15".to_string()),
        },
        Task {
            id: "task_2".to_string(),
            title: "集成 Skills Tab 详情弹窗".to_string(),
            description: "点击技能卡片弹出详情，支持启用/禁用".to_string(),
            status: "pending".to_string(),
            due_date: Some("2026-04-16".to_string()),
        },
        Task {
            id: "task_3".to_string(),
            title: "实现对话搜索功能".to_string(),
            description: "支持按关键词搜索历史对话".to_string(),
            status: "pending".to_string(),
            due_date: None,
        },
    ]));

#[tauri::command]
pub fn get_tasks() -> Result<Vec<Task>, String> {
    let tasks = TASKS.lock().map_err(|e| e.to_string())?;
    Ok(tasks.clone())
}

#[tauri::command]
pub fn create_task(title: String, description: String, due_date: Option<String>) -> Result<Task, String> {
    let mut tasks = TASKS.lock().map_err(|e| e.to_string())?;
    let task = Task {
        id: format!("task_{}", uuid::Uuid::new_v4()),
        title,
        description,
        status: "in_progress".to_string(),
        due_date,
    };
    tasks.push(task.clone());
    Ok(task)
}

#[tauri::command]
pub fn update_task(id: String, status: String) -> Result<(), String> {
    let mut tasks = TASKS.lock().map_err(|e| e.to_string())?;
    if let Some(t) = tasks.iter_mut().find(|t| t.id == id) {
        t.status = status;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_task(id: String) -> Result<(), String> {
    let mut tasks = TASKS.lock().map_err(|e| e.to_string())?;
    tasks.retain(|t| t.id != id);
    Ok(())
}

// ========================
// 配置相关命令（Phase 2-2 / 3-3）
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub theme: String,
    pub language: String,
    pub current_agent: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            language: "zh".to_string(),
            current_agent: "hermes-agent".to_string(),
        }
    }
}

fn get_config_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let dir = app.path().app_data_dir().expect("app_data_dir");
    std::fs::create_dir_all(&dir).ok();
    dir.join("config.json")
}

fn load_config_from_disk(app: &tauri::AppHandle) -> AppConfig {
    let path = get_config_path(app);
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(cfg) = serde_json::from_str::<AppConfig>(&content) {
                return cfg;
            }
        }
    }
    AppConfig::default()
}

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    Ok(load_config_from_disk(&app))
}

#[tauri::command]
pub fn set_config(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let mut cfg = load_config_from_disk(&app);
    match key.as_str() {
        "theme" => cfg.theme = value,
        "language" => cfg.language = value,
        "current_agent" | "agent" => cfg.current_agent = value,
        _ => return Err(format!("Unknown config key: {}", key)),
    }
    let path = get_config_path(&app);
    let content = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}
