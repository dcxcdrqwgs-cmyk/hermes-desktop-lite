// Copyright (c) 2026 MeeJoy

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex as StdMutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use walkdir::WalkDir;

const APP_DB_FILENAME: &str = "hermes-slate-desk.db";
const LEGACY_APP_DB_FILENAME: &str = "hermes-desktop-lite.db";

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatToolEvent {
    pub request_id: Option<String>,
    pub phase: String,
    pub name: Option<String>,
    pub call_id: Option<String>,
    pub arguments: Option<String>,
    pub output: Option<String>,
    pub status: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOpenResult {
    pub session_id: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputEvent {
    pub session_id: String,
    pub data: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExitEvent {
    pub session_id: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GatewayInfo {
    pub target: String,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct HermesVersionInfo {
    pub installed_display: Option<String>,
    pub installed_version: Option<String>,
    pub latest_tag: Option<String>,
    pub latest_name: Option<String>,
    pub latest_display: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct HermesUpdateResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

static ACTIVE_CHAT_STREAM_ABORTS: Lazy<StdMutex<HashMap<String, tokio::sync::oneshot::Sender<()>>>> =
    Lazy::new(|| StdMutex::new(HashMap::new()));

fn parse_installed_hermes_version(output: &str) -> (Option<String>, Option<String>) {
    let first_line = output.lines().next().map(|line| line.trim().to_string());
    let installed_version = first_line.as_ref().and_then(|line| {
        let marker = "Hermes Agent ";
        line.strip_prefix(marker).map(|rest| {
            if let Some((version, _)) = rest.split_once(' ') {
                version.to_string()
            } else {
                rest.to_string()
            }
        })
    });

    (first_line, installed_version)
}

fn strip_hermes_prefix(value: &str) -> String {
    value
        .trim()
        .strip_prefix("Hermes Agent ")
        .unwrap_or(value.trim())
        .to_string()
}

fn resolve_unix_shell_with<F>(shell_env: Option<&str>, path_exists: F) -> String
where
    F: Fn(&Path) -> bool,
{
    let env_shell = shell_env
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from);

    if let Some(shell) = env_shell.as_ref() {
        if shell.is_absolute() && path_exists(shell.as_path()) {
            return shell.display().to_string();
        }
    }

    for candidate in [
        "/bin/bash",
        "/usr/bin/bash",
        "/bin/zsh",
        "/usr/bin/zsh",
        "/bin/sh",
        "/usr/bin/sh",
    ] {
        let path = Path::new(candidate);
        if path_exists(path) {
            return candidate.to_string();
        }
    }

    env_shell
        .map(|path| path.display().to_string())
        .unwrap_or_else(|| "/bin/sh".to_string())
}

fn resolve_unix_shell() -> String {
    let shell_env = std::env::var("SHELL").ok();
    resolve_unix_shell_with(shell_env.as_deref(), Path::exists)
}

fn run_login_shell_command(command: &str) -> Result<std::process::Output, String> {
    let shell = resolve_unix_shell();
    Command::new(&shell)
        .args(["-lc", command])
        .output()
        .map_err(|e| format!("Failed to run `{}` with {}: {}", command, shell, e))
}

fn extract_gateway_version(
    json: Option<&serde_json::Value>,
    headers: &reqwest::header::HeaderMap,
) -> Option<String> {
    let from_json = json.and_then(|value| {
        value
            .get("version")
            .or_else(|| value.get("agent_version"))
            .or_else(|| value.get("gateway_version"))
            .or_else(|| value.get("app").and_then(|app| app.get("version")))
            .or_else(|| {
                value
                    .get("data")
                    .and_then(|data| data.get(0))
                    .and_then(|item| item.get("version"))
            })
            .and_then(|v| v.as_str())
            .map(|v| v.to_string())
    });

    if from_json.is_some() {
        return from_json;
    }

    headers
        .get("x-hermes-version")
        .or_else(|| headers.get("x-agent-version"))
        .or_else(|| headers.get("x-gateway-version"))
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_string())
        .or_else(|| {
            headers
                .get("server")
                .and_then(|v| v.to_str().ok())
                .and_then(|server| {
                    let lower = server.to_lowercase();
                    if lower.contains("hermes") {
                        Some(server.to_string())
                    } else {
                        None
                    }
                })
        })
}

fn default_gateway_host() -> String {
    "127.0.0.1".to_string()
}

fn default_gateway_port() -> u16 {
    8642
}

fn gateway_chat_url(app: &AppHandle) -> String {
    let cfg = load_config_from_disk(app);
    format!(
        "http://{}:{}/v1/chat/completions",
        cfg.gateway_host.trim(),
        cfg.gateway_port
    )
}

fn gateway_responses_url(app: &AppHandle) -> String {
    let cfg = load_config_from_disk(app);
    format!(
        "http://{}:{}/v1/responses",
        cfg.gateway_host.trim(),
        cfg.gateway_port
    )
}

#[tauri::command]
pub fn test_gateway_connection(host: String, port: u16) -> Result<serde_json::Value, String> {
    let host = host.trim();
    if host.is_empty() {
        return Err("Host is empty".to_string());
    }

    let addrs = (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("Unable to resolve {}:{}: {}", host, port, e))?;

    let timeout = std::time::Duration::from_secs(2);
    for addr in addrs {
        if TcpStream::connect_timeout(&addr, timeout).is_ok() {
            return Ok(serde_json::json!({
                "ok": true,
                "target": format!("{}:{}", host, port)
            }));
        }
    }

    Err(format!("Unable to connect to {}:{}", host, port))
}

#[tauri::command]
pub async fn get_gateway_info(host: String, port: u16) -> Result<GatewayInfo, String> {
    let host = host.trim();
    if host.is_empty() {
        return Err("Host is empty".to_string());
    }

    let target = format!("{}:{}", host, port);
    let base_url = format!("http://{}", target);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?;

    let version_paths = ["/v1/models", "/version", "/health", "/status", "/"];
    let mut version = None;

    for path in version_paths {
        let url = format!("{}{}", base_url, path);
        if let Ok(response) = client.get(&url).send().await {
            let headers = response.headers().clone();
            let json = response.json::<serde_json::Value>().await.ok();
            version = extract_gateway_version(json.as_ref(), &headers);
            if version.is_some() {
                break;
            }
        }
    }

    Ok(GatewayInfo { target, version })
}

#[tauri::command]
pub async fn get_hermes_version_info() -> Result<HermesVersionInfo, String> {
    let installed_output = run_login_shell_command("hermes --version")
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).to_string());

    let (installed_display, installed_version) = installed_output
        .as_deref()
        .map(parse_installed_hermes_version)
        .unwrap_or((None, None));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .map_err(|e| e.to_string())?;

    let latest_release = client
        .get("https://api.github.com/repos/NousResearch/hermes-agent/releases/latest")
        .header("User-Agent", "hermes-slate-desk")
        .send()
        .await
        .ok();

    let latest_release_json = if let Some(response) = latest_release {
        response.json::<serde_json::Value>().await.ok()
    } else {
        None
    };

    let latest_tag = latest_release_json
        .as_ref()
        .and_then(|value| value.get("tag_name"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());

    let latest_name = latest_release_json
        .as_ref()
        .and_then(|value| value.get("name"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());
    let latest_display = latest_name
        .as_deref()
        .map(strip_hermes_prefix)
        .or_else(|| latest_tag.clone());

    Ok(HermesVersionInfo {
        installed_display,
        installed_version,
        latest_tag,
        latest_name,
        latest_display,
    })
}

#[tauri::command]
pub fn update_hermes_agent() -> Result<HermesUpdateResult, String> {
    let output = run_login_shell_command("hermes update")?;

    Ok(HermesUpdateResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
    })
}

// ========================
// 非流式对话（保留兼容）
// ========================
fn resolve_chat_request_model(model: Option<String>) -> String {
    model
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "hermes-agent".to_string())
}

#[tauri::command]
pub async fn chat(
    app: AppHandle,
    messages: Vec<ChatMessage>,
    model: Option<String>,
) -> Result<ChatResponse, String> {
    let client = reqwest::Client::new();
    let gateway_url = gateway_chat_url(&app);
    let request_model = resolve_chat_request_model(model);
    let body = serde_json::json!({
        "model": request_model,
        "messages": messages,
        "stream": false
    });
    let res = client
        .post(&gateway_url)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            let _ = app.emit(
                "chatterror",
                format!("连接失败: {}（目标 {}）", e, gateway_url),
            );
            e.to_string()
        })?;
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
pub async fn chat_stream(
    app: AppHandle,
    messages: Vec<ChatMessage>,
    previous_response_id: Option<String>,
    replay_history: bool,
    model: Option<String>,
    request_id: Option<String>,
) -> Result<Option<String>, String> {
    use reqwest::Client;
    use tokio::sync::oneshot;
    use tokio::time::Duration;

    let gateway_url = gateway_responses_url(&app);
    let client = Client::builder()
        .timeout(Duration::from_secs(60)) // 连接超时
        .build()
        .map_err(|e| e.to_string())?;
    let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
    let active_request_id = request_id
        .clone()
        .unwrap_or_else(|| {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis())
                .unwrap_or_default();
            format!("legacy-{}", now)
        });

    {
        let mut active_aborts = ACTIVE_CHAT_STREAM_ABORTS
            .lock()
            .map_err(|_| "无法锁定聊天取消状态".to_string())?;

        if let Some(previous_abort) = active_aborts.remove(&active_request_id) {
            let _ = previous_abort.send(());
        }

        active_aborts.insert(active_request_id.clone(), cancel_tx);
    }

    async fn execute_stream(
        app: &AppHandle,
        client: &Client,
        gateway_url: &str,
        messages: &[ChatMessage],
        previous_response_id: Option<String>,
        replay_history: bool,
        request_model: &str,
        request_id: Option<&str>,
        cancel_rx: &mut oneshot::Receiver<()>,
    ) -> Result<Option<String>, String> {
        use futures::StreamExt;

        let input = if replay_history {
            serde_json::to_value(messages).map_err(|e| e.to_string())?
        } else {
            serde_json::Value::String(
                messages
                    .last()
                    .map(|message| message.content.clone())
                    .unwrap_or_default(),
            )
        };

        let body = serde_json::json!({
            "model": request_model,
            "input": input,
            "previous_response_id": previous_response_id,
            "stream": true
        });

        let res = client
            .post(gateway_url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("连接失败: {}（目标 {}）", e, gateway_url))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Hermes Responses API 请求失败: HTTP {} {}", status, body));
        }

        let mut stream = res.bytes_stream();
        let mut buffer = String::new();
        let mut latest_response_id = None;

        loop {
            let next_chunk = tokio::select! {
                _ = &mut *cancel_rx => {
                    let _ = app.emit("chatdone", serde_json::json!({ "requestId": request_id }));
                    return Ok(latest_response_id);
                }
                chunk = stream.next() => chunk,
            };

            let Some(chunk_result) = next_chunk else {
                break;
            };

            match chunk_result {
                Ok(chunk) => {
                    buffer.push_str(&String::from_utf8_lossy(&chunk));
                    buffer = buffer.replace("\r\n", "\n");

                    while let Some(pos) = buffer.find("\n\n") {
                        let block = buffer[..pos].trim().to_string();
                        buffer.drain(..pos + 2);

                        if block.is_empty() {
                            continue;
                        }

                        let mut event_type = String::new();
                        let mut data_lines = Vec::new();

                        for raw_line in block.lines() {
                            let line = raw_line.trim_end();
                            if let Some(value) = line.strip_prefix("event: ") {
                                event_type = value.trim().to_string();
                            } else if let Some(value) = line.strip_prefix("data: ") {
                                data_lines.push(value.to_string());
                            }
                        }

                        if data_lines.is_empty() {
                            continue;
                        }

                        let data = data_lines.join("\n");

                        if data == "[DONE]" {
                            let _ = app.emit("chatdone", serde_json::json!({ "requestId": request_id }));
                            return Ok(latest_response_id);
                        }

                        if event_type.is_empty() {
                            continue;
                        }

                        let Ok(json) = serde_json::from_str::<serde_json::Value>(&data) else {
                            continue;
                        };

                        if let Some(response_id) = json["response"]["id"].as_str() {
                            latest_response_id = Some(response_id.to_string());
                        }

                        match event_type.as_str() {
                            "response.output_text.delta" => {
                                if let Some(content) = json["delta"].as_str() {
                                    let _ = app.emit(
                                        "chattoken",
                                        serde_json::json!({
                                            "requestId": request_id,
                                            "token": content
                                        }),
                                    );
                                }
                            }
                            "response.output_item.added" => {
                                let item = &json["item"];
                                let item_type = item["type"].as_str().unwrap_or_default();

                                if item_type == "function_call" {
                                    let tool_event = ChatToolEvent {
                                        request_id: request_id.map(|value| value.to_string()),
                                        phase: "started".to_string(),
                                        name: item["name"].as_str().map(|value| value.to_string()),
                                        call_id: item["call_id"].as_str().map(|value| value.to_string()),
                                        arguments: item["arguments"].as_str().map(|value| value.to_string()),
                                        output: None,
                                        status: item["status"].as_str().map(|value| value.to_string()),
                                    };
                                    let _ = app.emit("chattoolevent", tool_event);
                                } else if item_type == "function_call_output" {
                                    let output = item["output"]
                                        .as_array()
                                        .map(|parts| {
                                            parts
                                                .iter()
                                                .filter_map(|part| part["text"].as_str())
                                                .collect::<Vec<_>>()
                                                .join("\n")
                                        })
                                        .filter(|value| !value.trim().is_empty());

                                    let tool_event = ChatToolEvent {
                                        request_id: request_id.map(|value| value.to_string()),
                                        phase: "completed".to_string(),
                                        name: None,
                                        call_id: item["call_id"].as_str().map(|value| value.to_string()),
                                        arguments: None,
                                        output,
                                        status: item["status"].as_str().map(|value| value.to_string()),
                                    };
                                    let _ = app.emit("chattoolevent", tool_event);
                                }
                            }
                            "response.failed" => {
                                let message = json["response"]["error"]["message"]
                                    .as_str()
                                    .or_else(|| json["error"]["message"].as_str())
                                    .unwrap_or("Hermes Responses API failed")
                                    .to_string();
                                return Err(message);
                            }
                            "response.completed" => {
                                let _ = app.emit("chatdone", serde_json::json!({ "requestId": request_id }));
                                return Ok(latest_response_id);
                            }
                            _ => {}
                        }
                    }
                }
                Err(e) => {
                    return Err(format!("流式响应中断: {}", e));
                }
            }
        }

        let _ = app.emit("chatdone", serde_json::json!({ "requestId": request_id }));
        Ok(latest_response_id)
    }

    let request_model = resolve_chat_request_model(model.clone());

    let result = match execute_stream(
        &app,
        &client,
        &gateway_url,
        &messages,
        previous_response_id.clone(),
        replay_history,
        &request_model,
        request_id.as_deref(),
        &mut cancel_rx,
    )
    .await
    {
        Ok(response_id) => Ok(response_id),
        Err(error_message)
            if previous_response_id.is_some()
                && error_message.contains("Previous response not found") =>
        {
            execute_stream(
                &app,
                &client,
                &gateway_url,
                &messages,
                None,
                true,
                &request_model,
                request_id.as_deref(),
                &mut cancel_rx,
            )
            .await
        }
        Err(error_message) => {
            let _ = app.emit(
                "chatterror",
                serde_json::json!({
                    "requestId": request_id,
                    "message": error_message.clone()
                }),
            );
            Err(error_message)
        }
    };

    if let Ok(mut active_aborts) = ACTIVE_CHAT_STREAM_ABORTS.lock() {
        active_aborts.remove(&active_request_id);
    }

    result
}

#[tauri::command]
pub fn cancel_chat_stream(request_id: Option<String>) -> Result<(), String> {
    let mut active_aborts = ACTIVE_CHAT_STREAM_ABORTS
        .lock()
        .map_err(|_| "无法锁定聊天取消状态".to_string())?;

    if let Some(request_id) = request_id {
        if let Some(cancel_tx) = active_aborts.remove(&request_id) {
            let _ = cancel_tx.send(());
        }
        return Ok(());
    }

    for (_, cancel_tx) in active_aborts.drain() {
        let _ = cancel_tx.send(());
    }

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
    pub updated_at: String,
    pub importance: String, // "hot" | "warm" | "cold"
    pub access_count: u32,
    pub last_accessed_at: Option<String>,
    pub workspace_path: Option<String>,
}

// 记忆存储（兼容层：保留静态变量以支持数据迁移）
// 新应用无需使用，旧数据可通过 migrate_memories_to_db 迁移至数据库
static MEMORIES: std::sync::LazyLock<Mutex<Vec<MemoryEntry>>> = std::sync::LazyLock::new(|| {
    Mutex::new(vec![
        MemoryEntry {
            id: "mem_1".to_string(),
            summary: "用户角色".to_string(),
            content: "用户是全栈开发者，熟悉 React、Rust、Tauri、Python。偏好简洁直接的回复。".to_string(),
            source: "对话".to_string(),
            created_at: "2026-04-15".to_string(),
            updated_at: "2026-04-15".to_string(),
            importance: "hot".to_string(),
            access_count: 5,
            last_accessed_at: None,
            workspace_path: None,
        },
        MemoryEntry {
            id: "mem_2".to_string(),
            summary: "当前项目".to_string(),
            content: "Hermes Slate Desk — Tauri + React 桌面客户端，连接本地 Hermes agent HTTP API (localhost:8642)。".to_string(),
            source: "对话".to_string(),
            created_at: "2026-04-15".to_string(),
            updated_at: "2026-04-15".to_string(),
            importance: "warm".to_string(),
            access_count: 2,
            last_accessed_at: None,
            workspace_path: None,
        },
        MemoryEntry {
            id: "mem_3".to_string(),
            summary: "偏好设置".to_string(),
            content: "用户偏好深色主题，使用中文交流。".to_string(),
            source: "配置".to_string(),
            created_at: "2026-04-13".to_string(),
            updated_at: "2026-04-13".to_string(),
            importance: "cold".to_string(),
            access_count: 0,
            last_accessed_at: None,
            workspace_path: None,
        },
    ])
});

// ========================
// 任务定义与存储
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String, // "pending" | "in_progress" | "completed" | "expired"
    pub due_date: Option<String>,
    pub workspace_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

// 任务存储（兼容层：保留静态变量以支持数据迁移）
// 新应用无需使用，旧数据可通过 migrate_tasks_to_db 迁移至数据库
static TASKS: std::sync::LazyLock<Mutex<Vec<Task>>> = std::sync::LazyLock::new(|| {
    Mutex::new(vec![
        Task {
            id: "task_1".to_string(),
            title: "完成 Hermes Slate Desk SSE 流式响应".to_string(),
            description: "实现 chat_stream 命令，支持逐 token 流式输出到前端".to_string(),
            status: "in_progress".to_string(),
            due_date: Some("2026-04-15".to_string()),
            workspace_path: None,
            created_at: "2026-04-15T00:00:00Z".to_string(),
            updated_at: "2026-04-15T00:00:00Z".to_string(),
            completed_at: None,
        },
        Task {
            id: "task_2".to_string(),
            title: "集成 Skills Tab 详情弹窗".to_string(),
            description: "点击技能卡片弹出详情，支持启用/禁用".to_string(),
            status: "pending".to_string(),
            due_date: Some("2026-04-16".to_string()),
            workspace_path: None,
            created_at: "2026-04-15T00:00:00Z".to_string(),
            updated_at: "2026-04-15T00:00:00Z".to_string(),
            completed_at: None,
        },
        Task {
            id: "task_3".to_string(),
            title: "实现对话搜索功能".to_string(),
            description: "支持按关键词搜索历史对话".to_string(),
            status: "pending".to_string(),
            due_date: None,
            workspace_path: None,
            created_at: "2026-04-15T00:00:00Z".to_string(),
            updated_at: "2026-04-15T00:00:00Z".to_string(),
            completed_at: None,
        },
    ])
});


// ========================
// 配置相关命令（Phase 2-2 / 3-3）
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub theme: String,
    pub language: String,
    pub current_agent: String,
    #[serde(default = "default_gateway_host")]
    pub gateway_host: String,
    #[serde(default = "default_gateway_port")]
    pub gateway_port: u16,
    #[serde(default)]
    pub user_nickname: String,
    #[serde(default = "default_workspace_path")]
    pub workspace_path: String,
    #[serde(default = "default_workspaces")]
    pub workspaces: Vec<Workspace>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "zh".to_string(),
            current_agent: "hermes-agent".to_string(),
            gateway_host: default_gateway_host(),
            gateway_port: default_gateway_port(),
            user_nickname: String::new(),
            workspace_path: default_workspace_path(),
            workspaces: default_workspaces(),
        }
    }
}

fn default_workspace_path() -> String {
    normalize_workspace_path(Some("~/AI/hermes-workspace"))
        .unwrap_or_else(|| expand_home_path("~/AI/hermes-workspace").display().to_string())
}

fn default_workspaces() -> Vec<Workspace> {
    vec![Workspace {
        id: "default".to_string(),
        name: "默认工作区".to_string(),
        path: default_workspace_path(),
        icon: "📁".to_string(),
    }]
}

fn sanitize_workspace_entry(mut workspace: Workspace) -> Workspace {
    workspace.path = normalize_workspace_path(Some(&workspace.path)).unwrap_or(workspace.path);
    if workspace.icon.trim().is_empty() {
        workspace.icon = "📁".to_string();
    }
    if workspace.name.trim().is_empty() {
        workspace.name = Path::new(&workspace.path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("工作区")
            .to_string();
    }
    workspace
}

fn sanitize_app_config(mut cfg: AppConfig) -> AppConfig {
    cfg.user_nickname = cfg.user_nickname.trim().to_string();

    if cfg.workspaces.is_empty() {
        cfg.workspaces = default_workspaces();
    } else {
        cfg.workspaces = cfg
            .workspaces
            .into_iter()
            .map(sanitize_workspace_entry)
            .collect();
    }

    let normalized_workspace_path =
        normalize_workspace_path(Some(&cfg.workspace_path)).unwrap_or_else(default_workspace_path);

    if cfg
        .workspaces
        .iter()
        .any(|workspace| workspace.path == normalized_workspace_path)
    {
        cfg.workspace_path = normalized_workspace_path;
    } else {
        cfg.workspace_path = cfg
            .workspaces
            .first()
            .map(|workspace| workspace.path.clone())
            .unwrap_or_else(default_workspace_path);
    }

    cfg
}

fn get_config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app_data_dir: {:?}", e))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(dir.join("config.json"))
}

fn load_config_from_disk(app: &tauri::AppHandle) -> AppConfig {
    let path = match get_config_path(app) {
        Ok(p) => p,
        Err(_) => return AppConfig::default(),
    };
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(cfg) = serde_json::from_str::<AppConfig>(&content) {
                return sanitize_app_config(cfg);
            }
        }
    }
    AppConfig::default()
}

fn save_config_to_disk(app: &tauri::AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let path = get_config_path(app)?;
    let content = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to save config {}: {}", path.display(), e))
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
        "user_nickname" => cfg.user_nickname = value.trim().to_string(),
        "gateway_host" => cfg.gateway_host = value.trim().to_string(),
        "gateway_port" => {
            cfg.gateway_port = value
                .trim()
                .parse::<u16>()
                .map_err(|_| format!("Invalid gateway_port: {}", value))?
        }
        "workspace_path" => {
            cfg.workspace_path = normalize_workspace_path(Some(&value))
                .ok_or_else(|| format!("Invalid workspace_path: {}", value))?
        }
        _ => return Err(format!("Unknown config key: {}", key)),
    }
    let cfg = sanitize_app_config(cfg);
    save_config_to_disk(&app, &cfg)
}

// ========================
// 会话相关命令（Phase 2-1）
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub pinned: bool,
    pub updated_at: String,
    pub workspace_path: Option<String>,
    #[serde(default)]
    pub preview: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SavedAttachment {
    pub path: String,
}

struct TerminalSession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    child: Box<dyn portable_pty::Child + Send>,
}

static TERMINAL_SESSIONS: std::sync::LazyLock<Mutex<HashMap<String, TerminalSession>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

fn build_attachment_output_path(
    workspace_path: Option<&str>,
    file_name: &str,
    is_image: bool,
) -> Result<PathBuf, String> {
    let normalized_workspace = normalize_workspace_path(workspace_path)
        .ok_or_else(|| "Workspace path is required".to_string())?;
    let workspace_dir = PathBuf::from(normalized_workspace);
    let target_dir = if is_image {
        workspace_dir.join("img")
    } else {
        workspace_dir.join("files")
    };

    std::fs::create_dir_all(&target_dir).map_err(|e| {
        format!(
            "Failed to create attachment directory {}: {}",
            target_dir.display(),
            e
        )
    })?;

    let safe_name = sanitize_attachment_name(file_name);
    let timestamp = chrono::Local::now()
        .format("%Y%m%d-%H%M%S-%3f")
        .to_string();

    Ok(target_dir.join(format!("{}-{}", timestamp, safe_name)))
}

fn get_sessions_db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app_data_dir: {:?}", e))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(dir.join("sessions.db"))
}

fn ensure_sessions_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            agent_id TEXT,
            workspace_path TEXT,
            pinned INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            message_count INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_path);
        "#,
    )
    .map_err(|e| format!("Failed to initialize sessions db schema: {}", e))?;

    let _ = conn.execute("ALTER TABLE sessions ADD COLUMN last_response_id TEXT", []);
    let _ = conn.execute("ALTER TABLE sessions ADD COLUMN model TEXT", []);

    Ok(())
}

fn update_session_model_in_connection(
    conn: &Connection,
    session_id: &str,
    model: Option<String>,
    updated_at: &str,
) -> Result<(), String> {
    let next_model = model
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    conn.execute(
        "UPDATE sessions SET model = ?1, updated_at = ?2 WHERE id = ?3",
        params![next_model, updated_at, session_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

fn open_sessions_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = get_sessions_db_path(app)?;
    let conn = Connection::open(&path)
        .map_err(|e| format!("Failed to open sessions db {}: {}", path.display(), e))?;

    ensure_sessions_schema(&conn)
        .map_err(|e| format!("Failed to initialize sessions db {}: {}", path.display(), e))?;

    Ok(conn)
}

fn normalize_workspace_path(path: Option<&str>) -> Option<String> {
    let raw = path?.trim();

    if raw.is_empty() {
        return None;
    }

    if raw == "~" {
        return std::env::var("HOME").ok();
    }

    if let Some(rest) = raw.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return Some(format!("{}/{}", home.trim_end_matches('/'), rest));
        }
    }

    Some(raw.to_string())
}

fn resolve_terminal_cwd(
    app: &tauri::AppHandle,
    workspace_path: Option<String>,
) -> Result<PathBuf, String> {
    let requested = workspace_path.unwrap_or_else(|| load_config_from_disk(app).workspace_path);
    let normalized = normalize_workspace_path(Some(&requested))
        .ok_or_else(|| "Workspace path is required".to_string())?;
    let path = PathBuf::from(normalized);
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create terminal cwd {}: {}", path.display(), e))?;
    path.canonicalize()
        .map_err(|e| format!("Failed to resolve terminal cwd {}: {}", path.display(), e))
}

fn sanitize_attachment_name(name: &str) -> String {
    let trimmed = name.trim();
    let candidate = if trimmed.is_empty() {
        "attachment"
    } else {
        trimmed
    };

    candidate
        .chars()
        .map(|ch| match ch {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => ch,
        })
        .collect()
}

fn workspace_matches(session_path: Option<&str>, workspace_filter: Option<&str>) -> bool {
    if let Some(filter_path) = workspace_filter {
        return session_path
            .and_then(|path| normalize_workspace_path(Some(path)))
            .map(|path| path == filter_path)
            .unwrap_or(true);
    }

    true
}

fn now_unix_timestamp() -> Result<i64, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64)
}

fn now_rfc3339() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn parse_rfc3339_to_unix(value: &str) -> i64 {
    chrono::DateTime::parse_from_rfc3339(value)
        .map(|dt| dt.timestamp())
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_sessions(
    app: tauri::AppHandle,
    workspace_filter: Option<String>,
) -> Result<Vec<Session>, String> {
    let normalized_workspace = normalize_workspace_path(workspace_filter.as_deref());
    let conn = open_sessions_db(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                s.id,
                s.title,
                s.pinned,
                s.workspace_path,
                s.updated_at,
                s.model,
                (
                    SELECT m.content
                    FROM messages m
                    WHERE m.session_id = s.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS preview
            FROM sessions s
            ORDER BY s.updated_at DESC
            "#,
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let pinned: i64 = row.get(2)?;
            Ok(Session {
                id: row.get(0)?,
                title: row.get(1)?,
                pinned: pinned != 0,
                workspace_path: row.get(3)?,
                updated_at: row.get(4)?,
                model: row.get(5)?,
                preview: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut sessions = Vec::new();
    for row in rows {
        let session = row.map_err(|e| e.to_string())?;
        if workspace_matches(
            session.workspace_path.as_deref(),
            normalized_workspace.as_deref(),
        ) {
            sessions.push(session);
        }
    }

    sessions.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
    Ok(sessions)
}

#[tauri::command]
pub fn create_session(
    app: tauri::AppHandle,
    title: String,
    agent_id: String,
    workspace_path: Option<String>,
    model: Option<String>,
) -> Result<Session, String> {
    let conn = open_sessions_db(&app)?;
    let now = now_rfc3339();
    let normalized_workspace = normalize_workspace_path(workspace_path.as_deref());
    let normalized_model = model
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let session = Session {
        id: uuid::Uuid::new_v4().to_string(),
        title,
        pinned: false,
        updated_at: now.clone(),
        workspace_path: normalized_workspace.clone(),
        preview: None,
        model: normalized_model.clone(),
    };

    conn.execute(
        r#"
        INSERT INTO sessions (id, title, agent_id, workspace_path, pinned, created_at, updated_at, message_count, model)
        VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5, 0, ?6)
        "#,
        params![
            session.id,
            session.title,
            agent_id,
            normalized_workspace,
            now,
            normalized_model
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(session)
}

#[tauri::command]
pub fn delete_session(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_sessions_db(&app)?;
    conn.execute(
        "DELETE FROM messages WHERE session_id = ?1",
        params![id.clone()],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_pin_session(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_sessions_db(&app)?;
    conn.execute(
        "UPDATE sessions SET pinned = CASE WHEN pinned = 0 THEN 1 ELSE 0 END WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_session_title(
    app: tauri::AppHandle,
    id: String,
    title: String,
) -> Result<(), String> {
    let conn = open_sessions_db(&app)?;
    conn.execute(
        "UPDATE sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
        params![title, now_rfc3339(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_session_model(
    app: tauri::AppHandle,
    id: String,
    model: Option<String>,
) -> Result<(), String> {
    let conn = open_sessions_db(&app)?;
    update_session_model_in_connection(&conn, &id, model, &now_rfc3339())
}

#[tauri::command]
pub fn get_session_response_id(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<Option<String>, String> {
    let conn = open_sessions_db(&app)?;
    conn.query_row(
        "SELECT last_response_id FROM sessions WHERE id = ?1",
        params![session_id],
        |row| row.get::<_, Option<String>>(0),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_session_response_id(
    app: tauri::AppHandle,
    session_id: String,
    response_id: Option<String>,
) -> Result<(), String> {
    let conn = open_sessions_db(&app)?;
    conn.execute(
        "UPDATE sessions SET last_response_id = ?1 WHERE id = ?2",
        params![response_id, session_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ========================
// 记忆与任务数据库（Phase 1: SQLite 持久化）
// ========================

/// 获取应用主数据库路径（统一数据库，包含 memories, tasks）
fn get_app_db_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app_data_dir: {:?}", e))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    let db_path = dir.join(APP_DB_FILENAME);
    let legacy_db_path = dir.join(LEGACY_APP_DB_FILENAME);

    if !db_path.exists() && legacy_db_path.exists() {
        std::fs::copy(&legacy_db_path, &db_path)
            .map_err(|e| format!("Failed to migrate legacy app db: {}", e))?;
    }

    Ok(db_path)
}

/// 确保应用数据库 Schema 存在（包含 memories 和 tasks 表）
pub fn ensure_app_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        -- memories 表（记忆条目）
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            summary TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT '对话',
            workspace_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            importance TEXT NOT NULL DEFAULT 'warm',
            access_count INTEGER DEFAULT 0,
            last_accessed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_memories_workspace ON memories(workspace_path);
        CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
        CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_memories_access_count ON memories(access_count DESC);

        -- tasks 表（任务）
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            due_date TEXT,
            workspace_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_path);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
        "#,
    )
    .map_err(|e| format!("Failed to initialize app db schema: {}", e))?;

    // 迁移：为旧数据库添加新列（如果缺失）
    // 使用 PRAGMA table_info 检查列是否存在，避免重复添加
    let mut columns = Vec::new();
    let mut stmt = conn.prepare("PRAGMA table_info(memories)").map_err(|e| format!("Failed to prepare pragma: {}", e))?;
    let rows = stmt.query_map([], |row| {
        let name: String = row.get(1)?;
        Ok(name)
    }).map_err(|e| format!("Failed to query table info: {}", e))?;
    for row in rows {
        columns.push(row.map_err(|e| format!("Failed to read column: {}", e))?);
    }
    if !columns.contains(&"last_accessed_at".to_string()) {
        conn.execute("ALTER TABLE memories ADD COLUMN last_accessed_at TEXT", [])
            .map_err(|e| format!("Failed to add column last_accessed_at: {}", e))?;
    }

    // 检查 tasks 表的 completed_at 列
    let mut task_columns = Vec::new();
    let mut stmt = conn.prepare("PRAGMA table_info(tasks)").map_err(|e| format!("Failed to prepare pragma: {}", e))?;
    let rows = stmt.query_map([], |row| {
        let name: String = row.get(1)?;
        Ok(name)
    }).map_err(|e| format!("Failed to query table info: {}", e))?;
    for row in rows {
        task_columns.push(row.map_err(|e| format!("Failed to read column: {}", e))?);
    }
    if !task_columns.contains(&"completed_at".to_string()) {
        conn.execute("ALTER TABLE tasks ADD COLUMN completed_at TEXT", [])
            .map_err(|e| format!("Failed to add column completed_at: {}", e))?;
    }

    Ok(())
}

/// 打开应用数据库连接（自动初始化 schema）
pub fn open_app_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = get_app_db_path(app)?;
    let conn = Connection::open(&path)
        .map_err(|e| format!("Failed to open app db {}: {}", path.display(), e))?;

    ensure_app_schema(&conn)
        .map_err(|e| format!("Failed to initialize app db {}: {}", path.display(), e))?;

    Ok(conn)
}

// ========================
// 记忆相关命令（数据库版）
// ========================

#[tauri::command]
pub fn get_memories(app: tauri::AppHandle, workspace_filter: Option<String>) -> Result<Vec<MemoryEntry>, String> {
    let normalized_workspace = normalize_workspace_path(workspace_filter.as_deref());
    let conn = open_app_db(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, summary, content, source, created_at, updated_at,
                   importance, access_count, last_accessed_at, workspace_path
            FROM memories
            WHERE workspace_path IS NULL OR workspace_path = ?1
            ORDER BY
                CASE importance
                    WHEN 'hot' THEN 1
                    WHEN 'warm' THEN 2
                    WHEN 'cold' THEN 3
                    ELSE 4
                END,
                access_count DESC,
                created_at DESC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![normalized_workspace], |row| {
            Ok(MemoryEntry {
                id: row.get(0)?,
                summary: row.get(1)?,
                content: row.get(2)?,
                source: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                importance: row.get(6)?,
                access_count: row.get(7)?,
                last_accessed_at: row.get(8)?,
                workspace_path: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let memories: Vec<MemoryEntry> = rows.collect::<Result<_, _>>().map_err(|e| e.to_string())?;
    Ok(memories)
}

#[tauri::command]
pub fn add_memory(
    app: tauri::AppHandle,
    summary: String,
    content: String,
    source: String,
    workspace_path: Option<String>,
) -> Result<MemoryEntry, String> {
    let conn = open_app_db(&app)?;
    let now = now_rfc3339();
    let id = format!("mem_{}", uuid::Uuid::new_v4());
    let normalized_workspace = normalize_workspace_path(workspace_path.as_deref());

    conn.execute(
        r#"
        INSERT INTO memories
            (id, summary, content, source, workspace_path, created_at, updated_at, importance, access_count)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, 'warm', 0)
        "#,
        params![id, &summary, &content, &source, normalized_workspace, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(MemoryEntry {
        id,
        summary,
        content,
        source,
        created_at: now.clone(),
        updated_at: now,
        importance: "warm".to_string(),
        access_count: 0,
        last_accessed_at: None,
        workspace_path: normalized_workspace,
    })
}

#[tauri::command]
pub fn update_memory(
    app: tauri::AppHandle,
    id: String,
    summary: String,
    content: String,
) -> Result<(), String> {
    let conn = open_app_db(&app)?;
    let now = now_rfc3339();

    conn.execute(
        "UPDATE memories SET summary = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        params![summary, content, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_memory(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_app_db(&app)?;
    conn.execute("DELETE FROM memories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn increment_memory_access(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_app_db(&app)?;
    let now = now_rfc3339();

    conn.execute(
        r#"
        UPDATE memories
        SET access_count = access_count + 1,
            last_accessed_at = ?1,
            importance = CASE
                WHEN access_count + 1 >= 3 THEN 'hot'
                WHEN access_count + 1 >= 1 THEN 'warm'
                ELSE 'cold'
            END
        WHERE id = ?2
        "#,
        params![now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn compact_memories(app: tauri::AppHandle, workspace_filter: Option<String>) -> Result<String, String> {
    let conn = open_app_db(&app)?;
    let normalized_workspace = normalize_workspace_path(workspace_filter.as_deref());

    let rows_affected = conn.execute(
        r#"
        UPDATE memories
        SET importance = CASE
            WHEN access_count >= 3 THEN 'hot'
            WHEN access_count >= 1 THEN 'warm'
            ELSE 'cold'
        END
        WHERE workspace_path IS NULL OR workspace_path = ?1
        "#,
        params![normalized_workspace],
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("记忆整合完成，更新了 {} 条记录", rows_affected))
}

// ========================
// 任务相关命令（数据库版）
// ========================

#[tauri::command]
pub fn get_tasks(app: tauri::AppHandle, workspace_filter: Option<String>) -> Result<Vec<Task>, String> {
    let normalized_workspace = normalize_workspace_path(workspace_filter.as_deref());
    let conn = open_app_db(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, title, description, status, due_date, created_at, updated_at, completed_at, workspace_path
            FROM tasks
            WHERE workspace_path IS NULL OR workspace_path = ?1
            ORDER BY
                CASE status
                    WHEN 'in_progress' THEN 1
                    WHEN 'pending' THEN 2
                    WHEN 'completed' THEN 3
                    ELSE 4
                END,
                due_date ASC,
                created_at DESC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![normalized_workspace], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                due_date: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                completed_at: row.get(7)?,
                workspace_path: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let tasks: Vec<Task> = rows.collect::<Result<_, _>>().map_err(|e| e.to_string())?;
    Ok(tasks)
}

#[tauri::command]
pub fn create_task(
    app: tauri::AppHandle,
    title: String,
    description: String,
    due_date: Option<String>,
    workspace_path: Option<String>,
) -> Result<Task, String> {
    let conn = open_app_db(&app)?;
    let now = now_rfc3339();
    let id = format!("task_{}", uuid::Uuid::new_v4());
    let normalized_workspace = normalize_workspace_path(workspace_path.as_deref());

    conn.execute(
        r#"
        INSERT INTO tasks
            (id, title, description, status, due_date, workspace_path, created_at, updated_at)
        VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6, ?6)
        "#,
        params![id, &title, &description, due_date, normalized_workspace, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        title,
        description,
        status: "pending".to_string(),
        due_date,
        created_at: now.clone(),
        updated_at: now,
        completed_at: None,
        workspace_path: normalized_workspace,
    })
}

#[tauri::command]
pub fn update_task(
    app: tauri::AppHandle,
    id: String,
    status: String,
) -> Result<(), String> {
    let conn = open_app_db(&app)?;
    let now = now_rfc3339();
    let completed_at = if status == "completed" { Some(now.clone()) } else { None };

    conn.execute(
        "UPDATE tasks SET status = ?1, updated_at = ?2, completed_at = ?3 WHERE id = ?4",
        params![status, now, completed_at, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_task(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_app_db(&app)?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ========================
// 数据迁移命令（从内存 → 数据库）
// ========================

#[derive(Serialize, Deserialize)]
pub struct MigrationResult {
    pub migrated: i32,
    pub skipped: i32,
    pub message: String,
}

#[tauri::command]
pub fn migrate_memories_to_db(app: tauri::AppHandle) -> Result<MigrationResult, String> {
    use std::sync::MutexGuard;

    // 读取内存中的旧数据
    let memories_guard: MutexGuard<Vec<MemoryEntry>> = MEMORIES.lock().map_err(|e| e.to_string())?;
    let old_memories = memories_guard.clone();
    drop(memories_guard); // 提前释放锁

    let conn = open_app_db(&app)?;
    let mut migrated = 0;
    let mut skipped = 0;

    for memory in &old_memories {
        // 检查是否已存在（避免重复迁移）
        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM memories WHERE id = ?1",
                params![memory.id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !exists {
            // 转换 workspace_path：旧数据没有该字段，设为 None（全局）
            conn.execute(
                r#"
                INSERT INTO memories
                    (id, summary, content, source, workspace_path, created_at, updated_at, importance, access_count)
                VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?5, ?6, ?7)
                "#,
                params![
                    memory.id,
                    memory.summary,
                    memory.content,
                    memory.source,
                    memory.created_at,
                    memory.importance,
                    memory.access_count,
                ],
            )
            .map_err(|e| format!("Failed to migrate memory {}: {}", memory.id, e))?;
            migrated += 1;
        } else {
            skipped += 1;
        }
    }

    Ok(MigrationResult {
        migrated,
        skipped,
        message: format!("记忆数据迁移完成：新增 {} 条，跳过 {} 条", migrated, skipped),
    })
}

#[tauri::command]
pub fn migrate_tasks_to_db(app: tauri::AppHandle) -> Result<MigrationResult, String> {
    use std::sync::MutexGuard;

    // 读取内存中的旧数据
    let tasks_guard: MutexGuard<Vec<Task>> = TASKS.lock().map_err(|e| e.to_string())?;
    let old_tasks = tasks_guard.clone();
    drop(tasks_guard);

    let conn = open_app_db(&app)?;
    let mut migrated = 0;
    let mut skipped = 0;

    for task in &old_tasks {
        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM tasks WHERE id = ?1",
                params![task.id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !exists {
            // 旧任务数据没有 created_at/updated_at/completed_at，使用默认时间
            let now = now_rfc3339();
            conn.execute(
                r#"
                INSERT INTO tasks
                    (id, title, description, status, due_date, workspace_path, created_at, updated_at, completed_at)
                VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?6, NULL)
                "#,
                params![
                    task.id,
                    task.title,
                    task.description,
                    task.status,
                    task.due_date,
                    now,
                ],
            )
            .map_err(|e| format!("Failed to migrate task {}: {}", task.id, e))?;
            migrated += 1;
        } else {
            skipped += 1;
        }
    }

    Ok(MigrationResult {
        migrated,
        skipped,
        message: format!("任务数据迁移完成：新增 {} 条，跳过 {} 条", migrated, skipped),
    })
}

#[tauri::command]
pub fn needs_migration(app: tauri::AppHandle) -> Result<bool, String> {
    let conn = open_app_db(&app)?;

    // 检查 memories 表是否存在且有数据
    let memories_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM memories", [], |row| row.get(0))
        .unwrap_or(0);

    // 如果数据库中没有 memories 数据，但内存中有 → 需要迁移
    let mem = MEMORIES.lock().map_err(|e| e.to_string())?;
    let has_memories = !mem.is_empty();
    drop(mem);

    Ok(has_memories && memories_count == 0)
}

// ========================
// 消息相关命令（Phase 2-1）
// ========================

#[tauri::command]
pub fn get_messages(app: tauri::AppHandle, session_id: String) -> Result<Vec<Message>, String> {
    let conn = open_sessions_db(&app)?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT id, session_id, role, content, created_at
            FROM messages
            WHERE session_id = ?1
            ORDER BY created_at ASC
            "#,
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![session_id], |row| {
            let created_at: String = row.get(4)?;
            Ok(Message {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: parse_rfc3339_to_unix(&created_at),
                created_at,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut messages = Vec::new();
    for row in rows {
        messages.push(row.map_err(|e| e.to_string())?);
    }
    Ok(messages)
}

#[tauri::command]
pub fn add_message(
    app: tauri::AppHandle,
    session_id: String,
    role: String,
    content: String,
) -> Result<Message, String> {
    let timestamp = now_unix_timestamp()?;
    let created_at = now_rfc3339();
    let message_id = uuid::Uuid::new_v4().to_string();
    let mut conn = open_sessions_db(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let updated = tx
        .execute(
            "UPDATE sessions SET updated_at = ?1, message_count = COALESCE(message_count, 0) + 1 WHERE id = ?2",
            params![created_at.clone(), session_id.clone()],
        )
        .map_err(|e| e.to_string())?;

    if updated == 0 {
        return Err(format!("Session not found: {}", session_id));
    }

    tx.execute(
        "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            message_id.clone(),
            session_id.clone(),
            role.clone(),
            content.clone(),
            created_at.clone(),
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    let message = Message {
        id: message_id,
        session_id,
        role,
        content,
        timestamp,
        created_at,
    };

    Ok(message)
}

#[tauri::command]
pub fn save_pasted_attachment(
    workspace_path: Option<String>,
    file_name: String,
    data_base64: String,
    is_image: bool,
) -> Result<SavedAttachment, String> {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;

    let output_path = build_attachment_output_path(workspace_path.as_deref(), &file_name, is_image)?;
    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("Failed to decode pasted attachment: {}", e))?;

    std::fs::write(&output_path, bytes)
        .map_err(|e| format!("Failed to write pasted attachment {}: {}", output_path.display(), e))?;

    Ok(SavedAttachment {
        path: output_path.display().to_string(),
    })
}

#[tauri::command]
pub fn import_attachment_from_path(
    workspace_path: Option<String>,
    source_path: String,
) -> Result<SavedAttachment, String> {
    let source = PathBuf::from(source_path.trim());
    if !source.exists() {
        return Err(format!("Attachment source does not exist: {}", source.display()));
    }

    let file_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("attachment");
    let extension = source
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    let is_image = matches!(
        extension.as_str(),
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "tiff" | "svg" | "heic"
    );

    let output_path =
        build_attachment_output_path(workspace_path.as_deref(), file_name, is_image)?;
    std::fs::copy(&source, &output_path).map_err(|e| {
        format!(
            "Failed to copy attachment from {} to {}: {}",
            source.display(),
            output_path.display(),
            e
        )
    })?;

    Ok(SavedAttachment {
        path: output_path.display().to_string(),
    })
}

// ========================
// 工作区相关命令（Phase 3）
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WorkspaceSwitchResult {
    pub workspace: Workspace,
    pub gateway_restarted: bool,
}

fn apply_workspace_to_hermes(path: &str) -> Result<bool, String> {
    let set_result = run_hermes_owned_command(vec![
        "config".to_string(),
        "set".to_string(),
        "terminal.cwd".to_string(),
        path.to_string(),
    ])?;

    if !set_result.success {
        return Err(format!(
            "Failed to set Hermes terminal.cwd: {}",
            format_skill_command_output(&set_result).unwrap_or_else(|| "Unknown error".to_string())
        ));
    }

    let restart_result = run_hermes_owned_command(vec![
        "gateway".to_string(),
        "restart".to_string(),
    ])?;

    if !restart_result.success {
        return Err(format!(
            "Failed to restart Hermes gateway: {}",
            format_skill_command_output(&restart_result).unwrap_or_else(|| "Unknown error".to_string())
        ));
    }

    Ok(true)
}

#[tauri::command]
pub fn get_workspaces(app: tauri::AppHandle) -> Result<Vec<Workspace>, String> {
    Ok(load_config_from_disk(&app).workspaces)
}

#[tauri::command]
pub fn create_workspace(
    app: tauri::AppHandle,
    name: String,
    path: String,
    icon: Option<String>,
) -> Result<Workspace, String> {
    let mut cfg = load_config_from_disk(&app);
    let workspace = sanitize_workspace_entry(Workspace {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        path,
        icon: icon.unwrap_or_else(|| "📁".to_string()),
    });

    std::fs::create_dir_all(&workspace.path)
        .map_err(|e| format!("Failed to create workspace directory {}: {}", workspace.path, e))?;

    cfg.workspaces.push(workspace.clone());
    let cfg = sanitize_app_config(cfg);
    save_config_to_disk(&app, &cfg)?;
    Ok(workspace)
}

#[tauri::command]
pub fn update_workspace(
    app: tauri::AppHandle,
    workspace_id: String,
    name: String,
    path: String,
    icon: Option<String>,
) -> Result<Workspace, String> {
    let mut cfg = load_config_from_disk(&app);
    let current_workspace_path = cfg.workspace_path.clone();

    let index = cfg
        .workspaces
        .iter()
        .position(|workspace| workspace.id == workspace_id)
        .ok_or_else(|| "Workspace not found".to_string())?;

    let updated = sanitize_workspace_entry(Workspace {
        id: workspace_id,
        name,
        path,
        icon: icon.unwrap_or_else(|| "📁".to_string()),
    });

    std::fs::create_dir_all(&updated.path)
        .map_err(|e| format!("Failed to create workspace directory {}: {}", updated.path, e))?;

    let was_current = cfg.workspaces[index].path == current_workspace_path;
    cfg.workspaces[index] = updated.clone();
    if was_current {
        cfg.workspace_path = updated.path.clone();
    }
    let cfg = sanitize_app_config(cfg);
    save_config_to_disk(&app, &cfg)?;

    if was_current {
        let _ = apply_workspace_to_hermes(&updated.path);
    }

    Ok(updated)
}

#[tauri::command]
pub fn delete_workspace(app: tauri::AppHandle, workspace_id: String) -> Result<Vec<Workspace>, String> {
    let mut cfg = load_config_from_disk(&app);
    if cfg.workspaces.len() <= 1 {
        return Err("At least one workspace must remain".to_string());
    }

    let workspace = cfg
        .workspaces
        .iter()
        .find(|item| item.id == workspace_id)
        .cloned()
        .ok_or_else(|| "Workspace not found".to_string())?;
    let was_current = cfg.workspace_path == workspace.path;
    cfg.workspaces.retain(|item| item.id != workspace_id);

    if was_current {
        cfg.workspace_path = cfg
            .workspaces
            .first()
            .map(|item| item.path.clone())
            .unwrap_or_else(default_workspace_path);
        let _ = apply_workspace_to_hermes(&cfg.workspace_path);
    }

    let cfg = sanitize_app_config(cfg);
    let result = cfg.workspaces.clone();
    save_config_to_disk(&app, &cfg)?;
    Ok(result)
}

#[tauri::command]
pub fn set_workspace(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<WorkspaceSwitchResult, String> {
    let mut cfg = load_config_from_disk(&app);
    let workspace = cfg
        .workspaces
        .iter()
        .find(|item| item.id == workspace_id)
        .cloned()
        .ok_or_else(|| "Workspace not found".to_string())?;

    cfg.workspace_path = workspace.path.clone();
    let cfg = sanitize_app_config(cfg);
    save_config_to_disk(&app, &cfg)?;
    let gateway_restarted = apply_workspace_to_hermes(&workspace.path)?;

    Ok(WorkspaceSwitchResult {
        workspace,
        gateway_restarted,
    })
}

#[tauri::command]
pub fn get_current_workspace(app: tauri::AppHandle) -> Result<Workspace, String> {
    let cfg = load_config_from_disk(&app);
    let workspace = cfg
        .workspaces
        .iter()
        .find(|workspace| workspace.path == cfg.workspace_path)
        .cloned()
        .ok_or_else(|| "Workspace not found".to_string())?;
    Ok(workspace)
}

#[tauri::command]
pub fn create_terminal_session(
    app: tauri::AppHandle,
    workspace_path: Option<String>,
) -> Result<TerminalOpenResult, String> {
    use portable_pty::{native_pty_system, CommandBuilder, PtySize};
    use std::io::Read;

    let cwd = resolve_terminal_cwd(&app, workspace_path)?;
    let shell = resolve_unix_shell();
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to create PTY: {}", e))?;

    let mut command = CommandBuilder::new(shell);
    command.arg("-il");
    command.cwd(cwd.clone());
    command.env("TERM", "xterm-256color");

    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;
    drop(pair.slave);

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to create PTY writer: {}", e))?;
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to create PTY reader: {}", e))?;

    let session_id = uuid::Uuid::new_v4().to_string();
    let app_handle = app.clone();
    let output_session_id = session_id.clone();

    std::thread::spawn(move || {
        let mut buffer = [0_u8; 4096];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(size) => {
                    let payload = TerminalOutputEvent {
                        session_id: output_session_id.clone(),
                        data: String::from_utf8_lossy(&buffer[..size]).to_string(),
                    };
                    let _ = app_handle.emit("terminal-output", payload);
                }
                Err(_) => break,
            }
        }

        let _ = app_handle.emit(
            "terminal-exit",
            TerminalExitEvent {
                session_id: output_session_id,
            },
        );
    });

    TERMINAL_SESSIONS
        .lock()
        .map_err(|e| e.to_string())?
        .insert(
            session_id.clone(),
            TerminalSession {
                writer,
                master: pair.master,
                child,
            },
        );

    Ok(TerminalOpenResult { session_id })
}

#[tauri::command]
pub fn write_terminal_input(session_id: String, data: String) -> Result<(), String> {
    let mut sessions = TERMINAL_SESSIONS.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get_mut(&session_id)
        .ok_or_else(|| "Terminal session not found".to_string())?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write terminal input: {}", e))?;
    session
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush terminal input: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn resize_terminal_session(session_id: String, cols: u16, rows: u16) -> Result<(), String> {
    use portable_pty::PtySize;

    let mut sessions = TERMINAL_SESSIONS.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get_mut(&session_id)
        .ok_or_else(|| "Terminal session not found".to_string())?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize terminal session: {}", e))
}

#[tauri::command]
pub fn close_terminal_session(app: tauri::AppHandle, session_id: String) -> Result<(), String> {
    let mut sessions = TERMINAL_SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = sessions.remove(&session_id) {
        let _ = session.child.kill();
        let _ = session.child.wait();
        let _ = app.emit(
            "terminal-exit",
            TerminalExitEvent {
                session_id,
            },
        );
    }
    Ok(())
}

// ========================
// 智能体相关命令（Phase 2）
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: String,
}

static AGENTS: std::sync::LazyLock<Mutex<Vec<Agent>>> = std::sync::LazyLock::new(|| {
    Mutex::new(vec![Agent {
        id: "hermes-agent".to_string(),
        name: "Hermes Agent".to_string(),
        description: "默认助手".to_string(),
    }])
});

#[tauri::command]
pub fn get_agents() -> Result<Vec<Agent>, String> {
    let agents = AGENTS.lock().map_err(|e| e.to_string())?;
    Ok(agents.clone())
}

// ========================
// 技能相关命令（Phase 3）
// ========================

const HERMES_SKILLS_INDEX_URL: &str =
    "https://hermes-agent.nousresearch.com/docs/api/skills-index.json";
const HERMES_WEB_PANEL_BASE_URL: &str = "http://127.0.0.1:9119";

#[derive(Serialize, Deserialize, Clone)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
    pub category: Option<String>,
    pub enabled: bool,
    pub source: String,
    pub trust: String,
    pub identifier: Option<String>,
    pub version: Option<String>,
    pub tags: Vec<String>,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SkillDetail {
    pub skill: SkillInfo,
    pub content_preview: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ToolsetInfo {
    pub name: String,
    pub label: String,
    pub description: String,
    pub enabled: bool,
    pub configured: bool,
    pub tools: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MarketSkillInfo {
    pub name: String,
    pub description: String,
    pub source: String,
    pub identifier: String,
    pub trust_level: String,
    pub repo: String,
    pub path: String,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub installed: bool,
    pub installed_source: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SkillCommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CronScheduleInfo {
    pub kind: String,
    pub expr: String,
    pub display: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CronJob {
    pub id: String,
    pub name: Option<String>,
    pub prompt: String,
    pub schedule: CronScheduleInfo,
    pub schedule_display: String,
    pub enabled: bool,
    pub state: String,
    pub deliver: Option<String>,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub last_error: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCronJobInput {
    pub prompt: String,
    pub schedule: String,
    pub name: Option<String>,
    pub deliver: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct CronActionResult {
    pub ok: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DashboardLogsResponse {
    pub file: String,
    pub lines: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DashboardEnvVarInfo {
    pub is_set: bool,
    pub redacted_value: Option<String>,
    pub description: String,
    pub url: Option<String>,
    pub category: String,
    pub is_password: bool,
    pub tools: Vec<String>,
    pub advanced: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DashboardEnvRevealResponse {
    pub key: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPrimaryModelConfig {
    pub model: String,
    pub provider: String,
    pub base_url: String,
    pub api_key: String,
    pub context_length: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DashboardModelOption {
    pub id: String,
    pub label: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DashboardModelProvider {
    pub id: String,
    pub label: String,
    pub models: Vec<DashboardModelOption>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DashboardModelOptionsResponse {
    pub providers: Vec<DashboardModelProvider>,
    pub model: String,
    pub provider: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CronPythonDependencyStatus {
    pub package_name: String,
    pub installed: bool,
    pub python_command: Option<String>,
    pub install_command: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CronPythonDependencyInstallResult {
    pub package_name: String,
    pub success: bool,
    pub python_command: Option<String>,
    pub install_command: String,
    pub stdout: String,
    pub stderr: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct HermesDashboardRestartResult {
    pub success: bool,
    pub command: String,
    pub message: String,
}

const CRON_PYTHON_PACKAGE: &str = "croniter";
const PYTHON_COMMAND_CANDIDATES: [&str; 2] = ["python3", "python"];
const HERMES_DASHBOARD_PORT: u16 = 9119;
const HERMES_GATEWAY_PORT: u16 = 8642;

fn format_skill_command_output(result: &SkillCommandResult) -> Option<String> {
    let stdout = result.stdout.trim();
    if !stdout.is_empty() {
        return Some(stdout.to_string());
    }

    let stderr = result.stderr.trim();
    if !stderr.is_empty() {
        return Some(stderr.to_string());
    }

    None
}

fn extract_dashboard_error_detail(body: &str) -> Option<String> {
    serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|value| value.get("detail").and_then(|detail| detail.as_str()).map(str::to_string))
}

fn is_missing_croniter_error(message: &str) -> bool {
    let normalized = message.to_lowercase();
    normalized.contains("croniter") && normalized.contains("install")
}

fn build_python_install_command(python_command: &str) -> String {
    format!("{} -m pip install {}", python_command, CRON_PYTHON_PACKAGE)
}

fn build_shell_python_install_command(python_command: &str) -> String {
    format!(
        "{} -m pip install {}",
        shell_quote(python_command),
        shell_quote(CRON_PYTHON_PACKAGE),
    )
}

fn build_shell_python_import_check_command(python_command: &str) -> String {
    format!(
        "{} -c {}",
        shell_quote(python_command),
        shell_quote(&format!("import {}", CRON_PYTHON_PACKAGE)),
    )
}

fn resolve_hermes_binary_path() -> Option<String> {
    let output = run_login_shell_command("command -v hermes").ok()?;
    if !output.status.success() {
        return None;
    }

    let hermes_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if hermes_path.is_empty() {
        None
    } else {
        Some(hermes_path)
    }
}

fn extract_python_command_from_hermes_launcher(content: &str) -> Option<String> {
    let first_line = content.lines().next()?.trim();
    let interpreter = first_line.strip_prefix("#!")?.trim();

    if interpreter.to_lowercase().contains("python") {
        Some(interpreter.to_string())
    } else {
        None
    }
}

fn resolve_hermes_python_command() -> Option<String> {
    let hermes_path = resolve_hermes_binary_path()?;
    let launcher_content = std::fs::read_to_string(&hermes_path).ok()?;
    let interpreter = extract_python_command_from_hermes_launcher(&launcher_content)?;
    let path = Path::new(&interpreter);
    if path.is_absolute() && path.exists() {
        Some(interpreter)
    } else {
        None
    }
}

fn resolve_python_command() -> Option<String> {
    if let Some(interpreter) = resolve_hermes_python_command() {
        return Some(interpreter);
    }

    PYTHON_COMMAND_CANDIDATES
        .iter()
        .find_map(|candidate| {
            let command = format!("command -v {} >/dev/null 2>&1", shell_quote(candidate));
            run_login_shell_command(&command)
                .ok()
                .filter(|output| output.status.success())
                .map(|_| candidate.to_string())
        })
}

fn build_dashboard_launch_command(hermes_binary: &str) -> String {
    format!(
        "nohup {} dashboard --port {} --no-open >/tmp/hermes-dashboard.log 2>&1 &",
        shell_quote(hermes_binary),
        HERMES_DASHBOARD_PORT
    )
}

pub fn restart_gateway_process() -> Result<bool, String> {
    let restart_result = run_hermes_owned_command(vec![
        "gateway".to_string(),
        "restart".to_string(),
    ])?;

    if !restart_result.success {
        return Err(format!(
            "Failed to restart Hermes gateway: {}",
            format_skill_command_output(&restart_result).unwrap_or_else(|| "Unknown error".to_string())
        ));
    }

    Ok(true)
  }

  pub fn restart_dashboard_process_internal() -> HermesDashboardRestartResult {
    let Some(hermes_binary) = resolve_hermes_binary_path() else {
        eprintln!("[Hermes Dashboard] 无法找到 `hermes` 命令，请确保 Hermes Agent 已安装并在 PATH 中");
        eprintln!("[Hermes Dashboard] 提示: 运行 `which hermes` 检查，或添加 ~/.local/bin 到 PATH");
        return HermesDashboardRestartResult {
            success: false,
            command: String::new(),
            message: "Unable to find `hermes` in PATH. Ensure Hermes Agent is installed and in PATH.".to_string(),
        };
    };

    let launch_command = build_dashboard_launch_command(&hermes_binary);
    let command = format!(
        "pids=$(lsof -tiTCP:{} -sTCP:LISTEN 2>/dev/null); if [ -n \"$pids\" ]; then kill $pids; sleep 1; fi; {}",
        HERMES_DASHBOARD_PORT, launch_command
    );

    match run_login_shell_command(&command) {
        Ok(output) if output.status.success() => {
            eprintln!("[Hermes Dashboard] 启动命令已执行: {}", launch_command);
            eprintln!("[Hermes Dashboard] 等待服务就绪，端口: {}...", HERMES_DASHBOARD_PORT);

            let address = ("127.0.0.1", HERMES_DASHBOARD_PORT);
            let timeout = std::time::Duration::from_secs(2);
            let mut started = false;
            // 最多等待 15 秒（30 次 × 500ms）
            for _ in 0..30 {
                if let Ok(mut addrs) = address.to_socket_addrs() {
                    if addrs.any(|addr| TcpStream::connect_timeout(&addr, timeout).is_ok()) {
                        started = true;
                        break;
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(500));
            }

            if started {
                eprintln!("[Hermes Desktop] ✅ 服务已就绪，监听端口: {}", HERMES_DASHBOARD_PORT);
            } else {
                eprintln!("[Hermes Desktop] ❌ 服务未在 15 秒内就绪");
                eprintln!("[Hermes Desktop] 请检查:");
                eprintln!("  1. 端口是否被占用: lsof -iTCP:{} -sTCP:LISTEN", HERMES_DASHBOARD_PORT);
                eprintln!("  2. Python 依赖是否安装: pip install croniter");
                eprintln!("  3. 查看日志: cat /tmp/hermes-dashboard.log");
            }

            HermesDashboardRestartResult {
                success: started,
                command: launch_command,
                message: if started {
                    "Hermes Dashboard restarted successfully.".to_string()
                } else {
                    "Dashboard did not become reachable on port 9119 within 15 seconds. Check logs at /tmp/hermes-dashboard.log, ensure Python dependencies (croniter) are installed.".to_string()
                },
            }
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            eprintln!("[Hermes Dashboard] ❌ 启动命令执行失败");
            eprintln!("[Hermes Dashboard] stderr: {}", stderr);
            HermesDashboardRestartResult {
                success: false,
                command: launch_command,
                message: format!("Dashboard start command failed: {}", stderr),
            }
        }
        Err(e) => {
            eprintln!("[Hermes Desktop] ❌ 无法执行启动命令: {}", e);
            HermesDashboardRestartResult {
                success: false,
                command: launch_command,
                message: format!("Failed to execute start command: {}", e),
            }
        }
    }
  }

  fn check_gateway_running_internal() -> bool {
    let address = ("127.0.0.1", HERMES_GATEWAY_PORT);
    let timeout = std::time::Duration::from_secs(2);
    if let Ok(mut addrs) = address.to_socket_addrs() {
      return addrs.any(|addr| TcpStream::connect_timeout(&addr, timeout).is_ok());
    }
    false
  }

  fn check_dashboard_running_internal() -> bool {
    let addresses = [
      ("127.0.0.1", HERMES_DASHBOARD_PORT),
      ("localhost", HERMES_DASHBOARD_PORT),
    ];
    let timeout = std::time::Duration::from_secs(3);

    eprintln!("[check_dashboard_running] 开始检测 Dashboard 状态...");

    for addr in addresses.iter() {
      eprintln!("[check_dashboard_running] 尝试连接: {}:{}", addr.0, addr.1);
      if let Ok(mut addrs) = addr.to_socket_addrs() {
        for socket_addr in addrs.clone() {
          eprintln!("[check_dashboard_running] 解析到地址: {}", socket_addr);
        }
        if addrs.any(|socket_addr| {
          let result = TcpStream::connect_timeout(&socket_addr, timeout);
          eprintln!("[check_dashboard_running] 连接 {} 结果: {:?}", socket_addr, result.is_ok());
          result.is_ok()
        }) {
          eprintln!("[check_dashboard_running] ✅ 检测到 Dashboard 运行");
          return true;
        }
      } else {
        eprintln!("[check_dashboard_running] ❌ 地址解析失败: {}:{}", addr.0, addr.1);
      }
    }
    eprintln!("[check_dashboard_running] ❌ 所有地址均无法连接");
    false
  }

  fn stop_dashboard_process_internal() -> bool {
    let command = format!(
      "pids=$(lsof -tiTCP:{} -sTCP:LISTEN 2>/dev/null); if [ -n \"$pids\" ]; then kill $pids; echo \"Killed dashboard processes: $pids\"; else echo \"No dashboard process found on port {}\"; fi",
      HERMES_DASHBOARD_PORT, HERMES_DASHBOARD_PORT
    );
    match run_login_shell_command(&command) {
      Ok(output) => {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("[stop_dashboard] stdout: {}", stdout);
        if !output.status.success() {
          eprintln!("[stop_dashboard] stderr: {}", stderr);
        }
        output.status.success()
      }
      Err(e) => {
        eprintln!("[stop_dashboard] Error: {}", e);
        false
      }
    }
  }

  fn stop_gateway_process_internal() -> bool {
    let command = format!(
      "pids=$(lsof -tiTCP:{} -sTCP:LISTEN 2>/dev/null); if [ -n \"$pids\" ]; then kill $pids; echo \"Killed gateway processes: $pids\"; else echo \"No gateway process found on port {}\"; fi",
      HERMES_GATEWAY_PORT, HERMES_GATEWAY_PORT
    );
    match run_login_shell_command(&command) {
      Ok(output) => {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("[stop_gateway] stdout: {}", stdout);
        if !output.status.success() {
          eprintln!("[stop_gateway] stderr: {}", stderr);
        }
        output.status.success()
      }
      Err(e) => {
        eprintln!("[stop_gateway] Error: {}", e);
        false
      }
    }
  }

  fn check_cron_python_dependency_internal() -> CronPythonDependencyStatus {
    let python_command = resolve_python_command();
    let install_command = python_command
        .as_deref()
        .map(build_python_install_command)
        .unwrap_or_else(|| build_python_install_command("python3"));

    let Some(python_command) = python_command else {
        return CronPythonDependencyStatus {
            package_name: CRON_PYTHON_PACKAGE.to_string(),
            installed: false,
            python_command: None,
            install_command,
            message: "Unable to find python3 or python in PATH.".to_string(),
        };
    };

    match run_login_shell_command(&build_shell_python_import_check_command(&python_command)) {
        Ok(output) if output.status.success() => CronPythonDependencyStatus {
            package_name: CRON_PYTHON_PACKAGE.to_string(),
            installed: true,
            python_command: Some(python_command.clone()),
            install_command,
            message: format!("`{}` is available for {}.", CRON_PYTHON_PACKAGE, python_command),
        },
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let detail = if !stderr.is_empty() {
                stderr
            } else if !stdout.is_empty() {
                stdout
            } else {
                format!("`{}` is not currently available for {}.", CRON_PYTHON_PACKAGE, python_command)
            };

            CronPythonDependencyStatus {
                package_name: CRON_PYTHON_PACKAGE.to_string(),
                installed: false,
                python_command: Some(python_command),
                install_command,
                message: detail,
            }
        }
        Err(error) => CronPythonDependencyStatus {
            package_name: CRON_PYTHON_PACKAGE.to_string(),
            installed: false,
            python_command: Some(python_command),
            install_command,
            message: error,
        },
    }
}

fn install_cron_python_dependency_internal() -> CronPythonDependencyInstallResult {
    let python_command = resolve_python_command();
    let install_command = python_command
        .as_deref()
        .map(build_python_install_command)
        .unwrap_or_else(|| build_python_install_command("python3"));

    let Some(python_command) = python_command else {
        return CronPythonDependencyInstallResult {
            package_name: CRON_PYTHON_PACKAGE.to_string(),
            success: false,
            python_command: None,
            install_command,
            stdout: String::new(),
            stderr: String::new(),
            message: "Unable to find python3 or python in PATH.".to_string(),
        };
    };

    match run_login_shell_command(&build_shell_python_install_command(&python_command)) {
        Ok(output) => {
            let success = output.status.success();
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let message = if success {
                format!("Installed `{}` with {}.", CRON_PYTHON_PACKAGE, python_command)
            } else if !stderr.is_empty() {
                stderr.clone()
            } else if !stdout.is_empty() {
                stdout.clone()
            } else {
                format!("Failed to install `{}` with {}.", CRON_PYTHON_PACKAGE, python_command)
            };

            CronPythonDependencyInstallResult {
                package_name: CRON_PYTHON_PACKAGE.to_string(),
                success,
                python_command: Some(python_command),
                install_command,
                stdout,
                stderr,
                message,
            }
        }
        Err(error) => CronPythonDependencyInstallResult {
            package_name: CRON_PYTHON_PACKAGE.to_string(),
            success: false,
            python_command: Some(python_command),
            install_command,
            stdout: String::new(),
            stderr: String::new(),
            message: error,
        },
    }
}

fn extract_hermes_dashboard_token(html: &str) -> Option<String> {
    let marker = "window.__HERMES_SESSION_TOKEN__=\"";
    let start = html.find(marker)? + marker.len();
    let rest = &html[start..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

async fn hermes_dashboard_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| format!("Failed to create Hermes dashboard client: {}", e))
}

async fn hermes_dashboard_token(client: &reqwest::Client) -> Result<String, String> {
    let html = client
        .get(format!("{}/cron", HERMES_WEB_PANEL_BASE_URL))
        .send()
        .await
        .map_err(|e| format!("Failed to load Hermes dashboard page: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to read Hermes dashboard page: {}", e))?;

    extract_hermes_dashboard_token(&html)
        .ok_or_else(|| "Hermes dashboard session token not found in /cron page".to_string())
}

async fn hermes_dashboard_api_request(
    method: reqwest::Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<reqwest::Response, String> {
    let client = hermes_dashboard_client().await?;
    let token = hermes_dashboard_token(&client).await?;
    let url = format!("{}{}", HERMES_WEB_PANEL_BASE_URL, path);
    let mut request = client
        .request(method, &url)
        .header("Authorization", format!("Bearer {}", token));

    if let Some(payload) = body {
        request = request.json(&payload);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to call Hermes dashboard API {}: {}", path, e))?;

    if response.status().is_success() {
        return Ok(response);
    }

    let status = response.status();
    let body_text = response.text().await.unwrap_or_default();
    let detail = extract_dashboard_error_detail(&body_text).unwrap_or_else(|| body_text.clone());
    Err(format!(
        "Hermes dashboard API {} failed: HTTP {} {}",
        path, status, detail
    ))
}

async fn hermes_dashboard_public_api_request(
    method: reqwest::Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<reqwest::Response, String> {
    let client = hermes_dashboard_client().await?;
    let url = format!("{}{}", HERMES_WEB_PANEL_BASE_URL, path);
    let mut request = client.request(method, &url);

    if let Some(payload) = body {
        request = request.json(&payload);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to call Hermes dashboard API {}: {}", path, e))?;

    if response.status().is_success() {
        return Ok(response);
    }

    let status = response.status();
    let body_text = response.text().await.unwrap_or_default();
    let detail = extract_dashboard_error_detail(&body_text).unwrap_or_else(|| body_text.clone());
    Err(format!(
        "Hermes dashboard API {} failed: HTTP {} {}",
        path, status, detail
    ))
}

#[derive(Deserialize, Default)]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
    category: Option<String>,
    version: Option<String>,
    tags: Option<Vec<String>>,
    metadata: Option<SkillFrontmatterMetadata>,
}

#[derive(Deserialize, Default)]
struct SkillFrontmatterMetadata {
    hermes: Option<SkillFrontmatterHermesMetadata>,
}

#[derive(Deserialize, Default)]
struct SkillFrontmatterHermesMetadata {
    tags: Option<Vec<String>>,
}

#[derive(Deserialize, Default)]
struct HubLockFileData {
    #[serde(default)]
    installed: HashMap<String, HubInstalledSkill>,
}

#[derive(Deserialize, Clone, Default)]
struct HubInstalledSkill {
    #[serde(default)]
    identifier: String,
    #[serde(default, rename = "source")]
    _source: String,
    #[serde(default)]
    trust_level: String,
}

#[derive(Deserialize)]
struct SkillsIndexPayload {
    skills: Vec<SkillsIndexEntry>,
}

#[derive(Deserialize)]
struct SkillsIndexEntry {
    name: String,
    description: String,
    source: String,
    identifier: String,
    trust_level: String,
    #[serde(default)]
    repo: String,
    #[serde(default)]
    path: String,
    #[serde(default)]
    tags: Vec<String>,
}

fn expand_home_path(value: &str) -> PathBuf {
    if value == "~" {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from(value));
    }

    if let Some(stripped) = value.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(stripped);
        }
    }

    PathBuf::from(value)
}

fn get_hermes_home_dir() -> PathBuf {
    if let Ok(path) = std::env::var("HERMES_HOME") {
        return expand_home_path(&path);
    }

    if let Some(home) = dirs::home_dir() {
        return home.join(".hermes");
    }

    if let Ok(home) = std::env::var("HOME") {
        return expand_home_path(&home).join(".hermes");
    }

    PathBuf::from(".hermes")
}

fn get_hermes_skills_dir() -> PathBuf {
    get_hermes_home_dir().join("skills")
}

fn get_hermes_config_path() -> PathBuf {
    get_hermes_home_dir().join("config.yaml")
}

fn get_hermes_env_path() -> PathBuf {
    get_hermes_home_dir().join(".env")
}

fn collect_configured_model_candidates_from_env_content(content: &str) -> Vec<String> {
    let mut models = Vec::new();
    let mut seen = HashSet::new();

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((key, value)) = line.split_once('=') else {
            continue;
        };

        if !key.trim().ends_with("_DEFAULT_MODEL") {
            continue;
        }

        let normalized_value = value.trim().trim_matches('"').trim_matches('\'');
        if normalized_value.is_empty() {
            continue;
        }

        if seen.insert(normalized_value.to_string()) {
            models.push(normalized_value.to_string());
        }
    }

    models
}

fn collect_configured_model_candidates(
    config_yaml: &str,
    env_content: &str,
) -> Result<Vec<String>, String> {
    let mut models = Vec::new();
    let mut seen = HashSet::new();

    let config = if config_yaml.trim().is_empty() {
        serde_yaml::Value::Mapping(serde_yaml::Mapping::new())
    } else {
        serde_yaml::from_str::<serde_yaml::Value>(config_yaml)
            .map_err(|e| format!("Failed to parse Hermes config yaml: {}", e))?
    };

    let current_model = config
        .as_mapping()
        .and_then(|mapping| mapping.get(yaml_string_key("model")))
        .and_then(|value| value.as_mapping())
        .and_then(|mapping| mapping.get(yaml_string_key("default")))
        .map(yaml_string_value)
        .unwrap_or_default();

    if !current_model.is_empty() && seen.insert(current_model.clone()) {
        models.push(current_model);
    }

    for model in collect_configured_model_candidates_from_env_content(env_content) {
        if seen.insert(model.clone()) {
            models.push(model);
        }
    }

    Ok(models)
}

fn load_bundled_skill_names() -> HashSet<String> {
    let manifest_path = get_hermes_skills_dir().join(".bundled_manifest");
    std::fs::read_to_string(&manifest_path)
        .ok()
        .map(|content| {
            content
                .lines()
                .filter_map(|line| {
                    line.split_once(':')
                        .map(|(name, _)| name.trim().to_string())
                })
                .filter(|name| !name.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn load_hub_installed_skills() -> HashMap<String, HubInstalledSkill> {
    let lock_path = get_hermes_skills_dir().join(".hub").join("lock.json");

    std::fs::read_to_string(&lock_path)
        .ok()
        .and_then(|content| serde_json::from_str::<HubLockFileData>(&content).ok())
        .map(|data| data.installed)
        .unwrap_or_default()
}

fn load_hermes_config_yaml() -> Result<serde_yaml::Value, String> {
    let config_path = get_hermes_config_path();

    if !config_path.exists() {
        return Ok(serde_yaml::Value::Mapping(serde_yaml::Mapping::new()));
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read {}: {}", config_path.display(), e))?;
    serde_yaml::from_str::<serde_yaml::Value>(&content)
        .map_err(|e| format!("Failed to parse {}: {}", config_path.display(), e))
}

fn extract_disabled_skills(config: &serde_yaml::Value) -> HashSet<String> {
    config
        .get("skills")
        .and_then(|skills| skills.get("disabled"))
        .and_then(|disabled| disabled.as_sequence())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(|value| value.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn save_disabled_skills(disabled: &HashSet<String>) -> Result<(), String> {
    let config_path = get_hermes_config_path();
    let mut config = load_hermes_config_yaml()?;

    if !matches!(config, serde_yaml::Value::Mapping(_)) {
        config = serde_yaml::Value::Mapping(serde_yaml::Mapping::new());
    }

    let root = config
        .as_mapping_mut()
        .ok_or_else(|| "Invalid config root".to_string())?;

    let skills_key = serde_yaml::Value::String("skills".to_string());
    if !root.contains_key(&skills_key) {
        root.insert(
            skills_key.clone(),
            serde_yaml::Value::Mapping(serde_yaml::Mapping::new()),
        );
    }

    let skills_value = root
        .get_mut(&skills_key)
        .ok_or_else(|| "Failed to access skills config".to_string())?;

    if !matches!(skills_value, serde_yaml::Value::Mapping(_)) {
        *skills_value = serde_yaml::Value::Mapping(serde_yaml::Mapping::new());
    }

    let skills_mapping = skills_value
        .as_mapping_mut()
        .ok_or_else(|| "Invalid skills config".to_string())?;

    let mut disabled_list: Vec<String> = disabled.iter().cloned().collect();
    disabled_list.sort();

    skills_mapping.insert(
        serde_yaml::Value::String("disabled".to_string()),
        serde_yaml::Value::Sequence(
            disabled_list
                .into_iter()
                .map(serde_yaml::Value::String)
                .collect(),
        ),
    );

    let content = serde_yaml::to_string(&config)
        .map_err(|e| format!("Failed to serialize config.yaml: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write {}: {}", config_path.display(), e))
}

fn split_skill_frontmatter(content: &str) -> (Option<&str>, &str) {
    if !content.starts_with("---") {
        return (None, content);
    }

    let rest = &content[3..];
    if let Some(offset) = rest.find("\n---") {
        let frontmatter = rest[..offset].trim_matches('\n');
        let body = rest[offset + 4..].trim_start_matches('\n');
        return (Some(frontmatter), body);
    }

    (None, content)
}

fn parse_skill_frontmatter(content: &str) -> SkillFrontmatter {
    let (frontmatter, _) = split_skill_frontmatter(content);
    frontmatter
        .and_then(|value| serde_yaml::from_str::<SkillFrontmatter>(value).ok())
        .unwrap_or_default()
}

fn summarize_skill_body(content: &str) -> String {
    let (_, body) = split_skill_frontmatter(content);
    let normalized = body
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .take(16)
        .collect::<Vec<_>>()
        .join("\n");

    if normalized.len() <= 1500 {
        normalized
    } else {
        format!("{}...", normalized.chars().take(1500).collect::<String>())
    }
}

fn collect_skill_tags(frontmatter: &SkillFrontmatter) -> Vec<String> {
    let mut tags = frontmatter.tags.clone().unwrap_or_default();

    if let Some(metadata_tags) = frontmatter
        .metadata
        .as_ref()
        .and_then(|metadata| metadata.hermes.as_ref())
        .and_then(|hermes| hermes.tags.clone())
    {
        tags.extend(metadata_tags);
    }

    tags.sort();
    tags.dedup();
    tags
}

fn derive_skill_category(relative_dir: &Path, frontmatter: &SkillFrontmatter) -> Option<String> {
    if let Some(category) = frontmatter.category.clone() {
        let trimmed = category.trim().to_string();
        if !trimmed.is_empty() {
            return Some(trimmed);
        }
    }

    let components: Vec<String> = relative_dir
        .components()
        .filter_map(|component| {
            component
                .as_os_str()
                .to_str()
                .map(|value| value.to_string())
        })
        .collect();

    if components.len() > 1 {
        Some(components[..components.len() - 1].join("/"))
    } else {
        None
    }
}

fn build_skill_info(
    skill_file: &Path,
    disabled_skills: &HashSet<String>,
    bundled_skills: &HashSet<String>,
    hub_skills: &HashMap<String, HubInstalledSkill>,
) -> Result<SkillInfo, String> {
    let skills_dir = get_hermes_skills_dir();
    let relative_file = skill_file
        .strip_prefix(&skills_dir)
        .map_err(|e| format!("Failed to derive relative skill path: {}", e))?;
    let relative_dir = relative_file
        .parent()
        .ok_or_else(|| "Skill file has no parent directory".to_string())?;
    let content = std::fs::read_to_string(skill_file)
        .map_err(|e| format!("Failed to read {}: {}", skill_file.display(), e))?;
    let frontmatter = parse_skill_frontmatter(&content);
    let skill_name = frontmatter
        .name
        .clone()
        .or_else(|| {
            relative_dir
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.to_string())
        })
        .ok_or_else(|| "Unable to determine skill name".to_string())?;

    let hub_entry = hub_skills.get(&skill_name);
    let source = if hub_entry.is_some() {
        "hub".to_string()
    } else if bundled_skills.contains(&skill_name) {
        "builtin".to_string()
    } else {
        "local".to_string()
    };

    let trust = hub_entry
        .map(|entry| entry.trust_level.clone())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| source.clone());

    Ok(SkillInfo {
        name: skill_name.clone(),
        description: frontmatter
            .description
            .clone()
            .unwrap_or_else(|| "No description available.".to_string()),
        category: derive_skill_category(relative_dir, &frontmatter),
        enabled: !disabled_skills.contains(&skill_name),
        source,
        trust,
        identifier: hub_entry
            .map(|entry| entry.identifier.clone())
            .filter(|value| !value.trim().is_empty()),
        version: frontmatter.version.clone(),
        tags: collect_skill_tags(&frontmatter),
        path: skill_file.display().to_string(),
    })
}

fn collect_installed_skills() -> Result<Vec<SkillInfo>, String> {
    let skills_dir = get_hermes_skills_dir();
    if !skills_dir.exists() {
        return Ok(Vec::new());
    }

    let disabled_skills = extract_disabled_skills(&load_hermes_config_yaml()?);
    let bundled_skills = load_bundled_skill_names();
    let hub_skills = load_hub_installed_skills();
    let mut skill_map = HashMap::new();

    for entry in WalkDir::new(&skills_dir)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
    {
        if entry.file_name() != "SKILL.md" {
            continue;
        }

        let path = entry.path();
        if path
            .components()
            .any(|component| component.as_os_str().to_string_lossy().starts_with('.'))
        {
            continue;
        }

        let skill = build_skill_info(path, &disabled_skills, &bundled_skills, &hub_skills)?;
        skill_map.insert(skill.name.clone(), skill);
    }

    let mut skills: Vec<SkillInfo> = skill_map.into_values().collect();
    skills.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(skills)
}

fn load_installed_skill_detail(name: &str) -> Result<SkillDetail, String> {
    let skills = collect_installed_skills()?;
    let skill = skills
        .into_iter()
        .find(|skill| skill.name == name)
        .ok_or_else(|| format!("Skill not found: {}", name))?;
    let content = std::fs::read_to_string(&skill.path)
        .map_err(|e| format!("Failed to read {}: {}", skill.path, e))?;

    Ok(SkillDetail {
        skill,
        content_preview: summarize_skill_body(&content),
    })
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn run_hermes_owned_command(arguments: Vec<String>) -> Result<SkillCommandResult, String> {
    let command = std::iter::once("hermes".to_string())
        .chain(arguments.iter().map(|value| shell_quote(value)))
        .collect::<Vec<_>>()
        .join(" ");

    let output = run_login_shell_command(&command)?;

    Ok(SkillCommandResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
    })
}

fn run_hermes_command(arguments: &[&str]) -> Result<SkillCommandResult, String> {
    run_hermes_owned_command(arguments.iter().map(|value| value.to_string()).collect())
}

async fn run_hermes_owned_command_async(arguments: Vec<String>) -> Result<SkillCommandResult, String> {
    tokio::task::spawn_blocking(move || run_hermes_owned_command(arguments))
        .await
        .map_err(|e| format!("Hermes command task failed: {}", e))?
}

fn strip_toolset_prefix(value: &str) -> String {
    value
        .trim_start_matches(|character: char| !character.is_alphanumeric())
        .trim()
        .to_string()
}

fn strip_ansi_codes(value: &str) -> String {
    let mut result = String::new();
    let mut chars = value.chars().peekable();

    while let Some(character) = chars.next() {
        if character == '\u{1b}' {
            if matches!(chars.peek(), Some('[')) {
                chars.next();
                while let Some(next) = chars.next() {
                    if ('@'..='~').contains(&next) {
                        break;
                    }
                }
            }
            continue;
        }

        result.push(character);
    }

    result
}

fn parse_toolsets_list(output: &str) -> Vec<ToolsetInfo> {
    output
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.ends_with(':') {
                return None;
            }

            let parts = trimmed.split_whitespace().collect::<Vec<_>>();
            if parts.len() < 4 {
                return None;
            }

            let enabled = match parts.get(1).copied() {
                Some("enabled") => true,
                Some("disabled") => false,
                _ => return None,
            };

            let name = parts.get(2)?.to_string();
            let rest = parts[3..].join(" ");
            let description = strip_toolset_prefix(&rest);

            Some(ToolsetInfo {
                name,
                label: description.clone(),
                description,
                enabled,
                configured: enabled,
                tools: Vec::new(),
            })
        })
        .collect()
}

fn derive_market_category(entry: &SkillsIndexEntry) -> Option<String> {
    entry
        .path
        .split('/')
        .next()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[tauri::command]
pub fn get_skills() -> Result<Vec<SkillInfo>, String> {
    collect_installed_skills()
}

#[tauri::command]
pub fn get_skill_detail(name: String) -> Result<SkillDetail, String> {
    load_installed_skill_detail(&name)
}

#[tauri::command]
pub fn toggle_skill(name: String, enabled: bool) -> Result<SkillInfo, String> {
    let mut disabled_skills = extract_disabled_skills(&load_hermes_config_yaml()?);

    if enabled {
        disabled_skills.remove(&name);
    } else {
        disabled_skills.insert(name.clone());
    }

    save_disabled_skills(&disabled_skills)?;
    load_installed_skill_detail(&name).map(|detail| detail.skill)
}

#[tauri::command]
pub fn get_toolsets() -> Result<Vec<ToolsetInfo>, String> {
    let result = run_hermes_command(&["tools", "list"])?;
    if !result.success {
        return Err(if result.stderr.is_empty() {
            result.stdout
        } else {
            result.stderr
        });
    }

    Ok(parse_toolsets_list(&result.stdout))
}

#[tauri::command]
pub async fn get_market_skills() -> Result<Vec<MarketSkillInfo>, String> {
    let installed_skills = collect_installed_skills()?;
    let skills_dir = get_hermes_skills_dir();
    let installed_by_name = installed_skills
        .iter()
        .map(|skill| (skill.name.clone(), skill.source.clone()))
        .collect::<HashMap<_, _>>();
    let installed_by_identifier = installed_skills
        .iter()
        .filter_map(|skill| {
            skill.identifier
                .clone()
                .map(|identifier| (identifier, skill.source.clone()))
        })
        .collect::<HashMap<_, _>>();
    let installed_by_path = installed_skills
        .iter()
        .filter_map(|skill| {
            Path::new(&skill.path)
                .strip_prefix(&skills_dir)
                .ok()
                .and_then(|relative_file| relative_file.parent())
                .map(|relative_dir| {
                    (
                        relative_dir.to_string_lossy().replace('\\', "/"),
                        skill.source.clone(),
                    )
                })
        })
        .collect::<HashMap<_, _>>();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let payload = client
        .get(HERMES_SKILLS_INDEX_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch skills index: {}", e))?
        .json::<SkillsIndexPayload>()
        .await
        .map_err(|e| format!("Failed to parse skills index: {}", e))?;

    let mut skills = payload
        .skills
        .into_iter()
        .map(|entry| {
            let category = derive_market_category(&entry);
            let installed_source = installed_by_identifier
                .get(&entry.identifier)
                .cloned()
                .or_else(|| installed_by_name.get(&entry.name).cloned())
                .or_else(|| installed_by_path.get(&entry.path).cloned());

            MarketSkillInfo {
                name: entry.name,
                description: entry.description,
                source: entry.source,
                identifier: entry.identifier,
                trust_level: entry.trust_level,
                repo: entry.repo,
                path: entry.path,
                category,
                tags: entry.tags,
                installed: installed_source.is_some(),
                installed_source,
            }
        })
        .collect::<Vec<_>>();

    skills.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(skills)
}

#[tauri::command]
pub async fn install_skill(identifier: String) -> Result<SkillCommandResult, String> {
    run_hermes_owned_command_async(vec![
        "skills".to_string(),
        "install".to_string(),
        identifier,
        "--yes".to_string(),
    ])
    .await
}

#[tauri::command]
pub async fn uninstall_skill(name: String) -> Result<SkillCommandResult, String> {
    run_hermes_owned_command_async(vec![
        "skills".to_string(),
        "uninstall".to_string(),
        name,
    ])
    .await
}

#[tauri::command]
pub async fn check_skill_updates(name: Option<String>) -> Result<SkillCommandResult, String> {
    let mut args = vec!["skills".to_string(), "check".to_string()];
    if let Some(value) = name {
        args.push(value);
    }

    run_hermes_owned_command_async(args).await
}

#[tauri::command]
pub async fn update_skill(name: Option<String>) -> Result<SkillCommandResult, String> {
    let mut args = vec!["skills".to_string(), "update".to_string()];
    if let Some(value) = name {
        args.push(value);
    }

    run_hermes_owned_command_async(args).await
}

#[tauri::command]
pub async fn inspect_market_skill(identifier: String) -> Result<SkillCommandResult, String> {
    let result = run_hermes_owned_command_async(vec![
        "skills".to_string(),
        "inspect".to_string(),
        identifier,
    ])
    .await?;

    Ok(SkillCommandResult {
        success: result.success,
        stdout: strip_ansi_codes(&result.stdout),
        stderr: strip_ansi_codes(&result.stderr),
    })
}

#[tauri::command]
pub async fn get_cron_jobs() -> Result<Vec<CronJob>, String> {
    hermes_dashboard_api_request(reqwest::Method::GET, "/api/cron/jobs", None)
        .await?
        .json::<Vec<CronJob>>()
        .await
        .map_err(|e| format!("Failed to parse cron jobs: {}", e))
}

#[tauri::command]
pub async fn create_cron_job(input: CreateCronJobInput) -> Result<CronJob, String> {
    let response = hermes_dashboard_api_request(
        reqwest::Method::POST,
        "/api/cron/jobs",
        Some(serde_json::json!({
            "prompt": input.prompt,
            "schedule": input.schedule,
            "name": input.name,
            "deliver": input.deliver,
        })),
    )
    .await
    .map_err(|error| {
        if is_missing_croniter_error(&error) {
            let install_command = resolve_python_command()
                .as_deref()
                .map(build_python_install_command)
                .unwrap_or_else(|| build_python_install_command("python3"));
            format!(
                "Cron expressions require '{}' package. Install with: {}",
                CRON_PYTHON_PACKAGE,
                install_command
            )
        } else {
            error
        }
    })?;

    response
        .json::<CronJob>()
        .await
        .map_err(|e| format!("Failed to parse created cron job: {}", e))
}

#[tauri::command]
pub fn check_cron_python_dependency() -> Result<CronPythonDependencyStatus, String> {
    Ok(check_cron_python_dependency_internal())
}

#[tauri::command]
pub fn install_cron_python_dependency() -> Result<CronPythonDependencyInstallResult, String> {
    Ok(install_cron_python_dependency_internal())
}

#[tauri::command]
pub fn restart_hermes_dashboard() -> Result<HermesDashboardRestartResult, String> {
  Ok(restart_dashboard_process_internal())
}

#[tauri::command]
pub fn restart_hermes_gateway() -> Result<bool, String> {
  Ok(restart_gateway_process()?)
}

#[tauri::command]
pub fn check_gateway_running() -> Result<bool, String> {
  Ok(check_gateway_running_internal())
}

#[tauri::command]
pub fn check_dashboard_running() -> Result<bool, String> {
  Ok(check_dashboard_running_internal())
}

#[tauri::command]
pub fn stop_hermes_dashboard() -> Result<bool, String> {
  Ok(stop_dashboard_process_internal())
}

#[tauri::command]
pub fn stop_hermes_gateway() -> Result<bool, String> {
  Ok(stop_gateway_process_internal())
}

  #[tauri::command]
  pub async fn pause_cron_job(id: String) -> Result<CronActionResult, String> {
    hermes_dashboard_api_request(
        reqwest::Method::POST,
        &format!("/api/cron/jobs/{}/pause", id),
        None,
    )
    .await?
    .json::<CronActionResult>()
    .await
    .map_err(|e| format!("Failed to parse pause response: {}", e))
}

#[tauri::command]
pub async fn resume_cron_job(id: String) -> Result<CronActionResult, String> {
    hermes_dashboard_api_request(
        reqwest::Method::POST,
        &format!("/api/cron/jobs/{}/resume", id),
        None,
    )
    .await?
    .json::<CronActionResult>()
    .await
    .map_err(|e| format!("Failed to parse resume response: {}", e))
}

#[tauri::command]
pub async fn trigger_cron_job(id: String) -> Result<CronActionResult, String> {
    hermes_dashboard_api_request(
        reqwest::Method::POST,
        &format!("/api/cron/jobs/{}/trigger", id),
        None,
    )
    .await?
    .json::<CronActionResult>()
    .await
    .map_err(|e| format!("Failed to parse trigger response: {}", e))
}

#[tauri::command]
pub async fn delete_cron_job(id: String) -> Result<CronActionResult, String> {
    hermes_dashboard_api_request(
        reqwest::Method::DELETE,
        &format!("/api/cron/jobs/{}", id),
        None,
    )
    .await?
    .json::<CronActionResult>()
    .await
    .map_err(|e| format!("Failed to parse delete response: {}", e))
}

#[tauri::command]
pub async fn get_dashboard_logs(
    file: String,
    lines: u32,
    level: String,
    component: String,
) -> Result<DashboardLogsResponse, String> {
    let path = format!(
        "/api/logs?file={}&lines={}&level={}&component={}",
        file, lines, level, component
    );

    hermes_dashboard_api_request(reqwest::Method::GET, &path, None)
        .await?
        .json::<DashboardLogsResponse>()
        .await
        .map_err(|e| format!("Failed to parse logs response: {}", e))
}

#[derive(Serialize, Deserialize)]
struct DashboardConfigRawResponse {
    yaml: String,
}

fn yaml_string_key(key: &str) -> serde_yaml::Value {
    serde_yaml::Value::String(key.to_string())
}

fn yaml_string_value(value: &serde_yaml::Value) -> String {
    match value {
        serde_yaml::Value::String(inner) => inner.trim().to_string(),
        serde_yaml::Value::Null => String::new(),
        _ => value.as_str().unwrap_or_default().trim().to_string(),
    }
}

fn yaml_u64_value(value: &serde_yaml::Value) -> Option<u64> {
    if let Some(number) = value.as_u64() {
        return Some(number);
    }

    if let Some(number) = value.as_i64() {
        return (number >= 0).then_some(number as u64);
    }

    value
        .as_str()
        .and_then(|inner| inner.trim().parse::<u64>().ok())
}

fn ensure_yaml_mapping<'a>(
    mapping: &'a mut serde_yaml::Mapping,
    key: &str,
) -> Result<&'a mut serde_yaml::Mapping, String> {
    let yaml_key = yaml_string_key(key);

    if !mapping.contains_key(&yaml_key) {
        mapping.insert(
            yaml_key.clone(),
            serde_yaml::Value::Mapping(serde_yaml::Mapping::new()),
        );
    }

    let value = mapping
        .get_mut(&yaml_key)
        .ok_or_else(|| format!("Missing YAML mapping for `{}`", key))?;

    if !matches!(value, serde_yaml::Value::Mapping(_)) {
        *value = serde_yaml::Value::Mapping(serde_yaml::Mapping::new());
    }

    value
        .as_mapping_mut()
        .ok_or_else(|| format!("Invalid YAML mapping for `{}`", key))
}

fn set_yaml_string(mapping: &mut serde_yaml::Mapping, key: &str, value: &str) {
    let yaml_key = yaml_string_key(key);

    if value.trim().is_empty() {
        mapping.remove(&yaml_key);
        return;
    }

    mapping.insert(yaml_key, serde_yaml::Value::String(value.trim().to_string()));
}

fn set_yaml_u64(mapping: &mut serde_yaml::Mapping, key: &str, value: Option<u64>) {
    let yaml_key = yaml_string_key(key);

    if let Some(number) = value {
        mapping.insert(yaml_key, serde_yaml::Value::Number(number.into()));
    } else {
        mapping.remove(&yaml_key);
    }
}

fn extract_primary_model_config_from_yaml(
    yaml_text: &str,
) -> Result<DashboardPrimaryModelConfig, String> {
    let trimmed = yaml_text.trim();
    let mut root = if trimmed.is_empty() {
        serde_yaml::Value::Mapping(serde_yaml::Mapping::new())
    } else {
        serde_yaml::from_str::<serde_yaml::Value>(trimmed)
            .map_err(|e| format!("Failed to parse dashboard config yaml: {}", e))?
    };

    if !matches!(root, serde_yaml::Value::Mapping(_)) {
        root = serde_yaml::Value::Mapping(serde_yaml::Mapping::new());
    }

    let root_mapping = root
        .as_mapping()
        .ok_or_else(|| "Dashboard config root is not a YAML mapping".to_string())?;
    let model_mapping = root_mapping
        .get(&yaml_string_key("model"))
        .and_then(|value| value.as_mapping());

    Ok(DashboardPrimaryModelConfig {
        model: model_mapping
            .and_then(|mapping| mapping.get(&yaml_string_key("default")))
            .map(yaml_string_value)
            .unwrap_or_default(),
        provider: model_mapping
            .and_then(|mapping| mapping.get(&yaml_string_key("provider")))
            .map(yaml_string_value)
            .unwrap_or_default(),
        base_url: model_mapping
            .and_then(|mapping| mapping.get(&yaml_string_key("base_url")))
            .map(yaml_string_value)
            .unwrap_or_default(),
        api_key: model_mapping
            .and_then(|mapping| mapping.get(&yaml_string_key("api_key")))
            .map(yaml_string_value)
            .unwrap_or_default(),
        context_length: root_mapping
            .get(&yaml_string_key("model_context_length"))
            .and_then(yaml_u64_value)
            .or_else(|| {
                model_mapping
                    .and_then(|mapping| mapping.get(&yaml_string_key("context_length")))
                    .and_then(yaml_u64_value)
            }),
    })
}

fn apply_primary_model_config_to_yaml(
    yaml_text: &str,
    next_config: &DashboardPrimaryModelConfig,
) -> Result<String, String> {
    let trimmed = yaml_text.trim();
    let mut root = if trimmed.is_empty() {
        serde_yaml::Value::Mapping(serde_yaml::Mapping::new())
    } else {
        serde_yaml::from_str::<serde_yaml::Value>(trimmed)
            .map_err(|e| format!("Failed to parse dashboard config yaml: {}", e))?
    };

    if !matches!(root, serde_yaml::Value::Mapping(_)) {
        root = serde_yaml::Value::Mapping(serde_yaml::Mapping::new());
    }

    let root_mapping = root
        .as_mapping_mut()
        .ok_or_else(|| "Dashboard config root is not a YAML mapping".to_string())?;
    let model_mapping = ensure_yaml_mapping(root_mapping, "model")?;

    set_yaml_string(model_mapping, "default", &next_config.model);
    set_yaml_string(model_mapping, "provider", &next_config.provider);
    set_yaml_string(model_mapping, "base_url", &next_config.base_url);
    set_yaml_string(model_mapping, "api_key", &next_config.api_key);
    set_yaml_u64(root_mapping, "model_context_length", next_config.context_length);

    serde_yaml::to_string(&root).map_err(|e| format!("Failed to serialize dashboard config yaml: {}", e))
}

fn fallback_model_options_from_config() -> Result<DashboardModelOptionsResponse, String> {
    let yaml_text = std::fs::read_to_string(get_hermes_config_path()).unwrap_or_default();
    let primary = extract_primary_model_config_from_yaml(&yaml_text)?;
    let provider = primary.provider.trim().to_string();
    let model = primary.model.trim().to_string();
    let providers = if provider.is_empty() || model.is_empty() {
        Vec::new()
    } else {
        vec![DashboardModelProvider {
            id: provider.clone(),
            label: provider.clone(),
            models: vec![DashboardModelOption {
                id: model.clone(),
                label: model.clone(),
            }],
        }]
    };

    Ok(DashboardModelOptionsResponse {
        providers,
        model,
        provider,
    })
}

fn apply_default_model_to_yaml(
    yaml_text: &str,
    provider: &str,
    model: &str,
) -> Result<String, String> {
    let trimmed = yaml_text.trim();
    let mut root = if trimmed.is_empty() {
        serde_yaml::Value::Mapping(serde_yaml::Mapping::new())
    } else {
        serde_yaml::from_str::<serde_yaml::Value>(trimmed)
            .map_err(|e| format!("Failed to parse dashboard config yaml: {}", e))?
    };

    if !matches!(root, serde_yaml::Value::Mapping(_)) {
        root = serde_yaml::Value::Mapping(serde_yaml::Mapping::new());
    }

    let root_mapping = root
        .as_mapping_mut()
        .ok_or_else(|| "Dashboard config root is not a YAML mapping".to_string())?;
    root_mapping.remove(&yaml_string_key("model_context_length"));
    let model_mapping = ensure_yaml_mapping(root_mapping, "model")?;

    set_yaml_string(model_mapping, "provider", provider);
    set_yaml_string(model_mapping, "default", model);
    model_mapping.remove(&yaml_string_key("base_url"));
    model_mapping.remove(&yaml_string_key("context_length"));

    serde_yaml::to_string(&root).map_err(|e| format!("Failed to serialize dashboard config yaml: {}", e))
}

fn save_default_model_to_config(provider: &str, model: &str) -> Result<(), String> {
    let config_path = get_hermes_config_path();
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create {}: {}", parent.display(), e))?;
    }

    let yaml_text = std::fs::read_to_string(&config_path).unwrap_or_default();
    let next_yaml = apply_default_model_to_yaml(&yaml_text, provider, model)?;
    std::fs::write(&config_path, next_yaml)
        .map_err(|e| format!("Failed to write {}: {}", config_path.display(), e))
}

async fn get_dashboard_config_raw_yaml() -> Result<String, String> {
    hermes_dashboard_api_request(reqwest::Method::GET, "/api/config/raw", None)
        .await?
        .json::<DashboardConfigRawResponse>()
        .await
        .map(|response| response.yaml)
        .map_err(|e| format!("Failed to parse raw config response: {}", e))
}

async fn save_dashboard_config_raw_yaml(yaml_text: String) -> Result<CronActionResult, String> {
    hermes_dashboard_api_request(
        reqwest::Method::PUT,
        "/api/config/raw",
        Some(serde_json::json!({
            "yaml_text": yaml_text,
        })),
    )
    .await?
    .json::<CronActionResult>()
    .await
    .map_err(|e| format!("Failed to parse raw config save response: {}", e))
}

#[tauri::command]
pub async fn get_dashboard_primary_model_config() -> Result<DashboardPrimaryModelConfig, String> {
    let yaml_text = get_dashboard_config_raw_yaml().await?;
    extract_primary_model_config_from_yaml(&yaml_text)
}

#[tauri::command]
pub async fn save_dashboard_primary_model_config(
    config: DashboardPrimaryModelConfig,
) -> Result<CronActionResult, String> {
    let current_yaml = get_dashboard_config_raw_yaml().await?;
    let next_yaml = apply_primary_model_config_to_yaml(&current_yaml, &config)?;
    save_dashboard_config_raw_yaml(next_yaml).await
}

#[tauri::command]
pub async fn get_model_options() -> Result<DashboardModelOptionsResponse, String> {
    match hermes_dashboard_public_api_request(reqwest::Method::GET, "/api/model/options", None).await {
        Ok(response) => response
            .json::<DashboardModelOptionsResponse>()
            .await
            .map_err(|e| format!("Failed to parse model options response: {}", e)),
        Err(_) => fallback_model_options_from_config(),
    }
}

#[tauri::command]
pub async fn set_default_model(provider: String, model: String) -> Result<CronActionResult, String> {
    let provider = provider.trim().to_string();
    let model = model.trim().to_string();

    if provider.is_empty() || model.is_empty() {
        return Err("Provider and model are required".to_string());
    }

    let payload = serde_json::json!({
        "scope": "main",
        "provider": provider,
        "model": model,
        "task": "",
    });

    if hermes_dashboard_public_api_request(reqwest::Method::POST, "/api/model/set", Some(payload))
        .await
        .is_ok()
    {
        return Ok(CronActionResult { ok: true });
    }

    save_default_model_to_config(&provider, &model)?;
    Ok(CronActionResult { ok: true })
}

#[tauri::command]
pub fn get_configured_model_candidates() -> Result<Vec<String>, String> {
    let config_yaml = std::fs::read_to_string(get_hermes_config_path()).unwrap_or_default();
    let env_content = std::fs::read_to_string(get_hermes_env_path()).unwrap_or_default();
    collect_configured_model_candidates(&config_yaml, &env_content)
}

#[tauri::command]
pub async fn get_dashboard_env_vars() -> Result<HashMap<String, DashboardEnvVarInfo>, String> {
    hermes_dashboard_api_request(reqwest::Method::GET, "/api/env", None)
        .await?
        .json::<HashMap<String, DashboardEnvVarInfo>>()
        .await
        .map_err(|e| format!("Failed to parse env response: {}", e))
}

#[tauri::command]
pub async fn set_dashboard_env_var(
    key: String,
    value: String,
) -> Result<CronActionResult, String> {
    hermes_dashboard_api_request(
        reqwest::Method::PUT,
        "/api/env",
        Some(serde_json::json!({
            "key": key,
            "value": value,
        })),
    )
    .await?
    .json::<CronActionResult>()
    .await
    .map_err(|e| format!("Failed to parse env set response: {}", e))
}

#[tauri::command]
pub async fn delete_dashboard_env_var(key: String) -> Result<CronActionResult, String> {
    hermes_dashboard_api_request(
        reqwest::Method::DELETE,
        "/api/env",
        Some(serde_json::json!({
            "key": key,
        })),
    )
    .await?
    .json::<CronActionResult>()
    .await
    .map_err(|e| format!("Failed to parse env delete response: {}", e))
}

#[tauri::command]
pub async fn reveal_dashboard_env_var(key: String) -> Result<DashboardEnvRevealResponse, String> {
    hermes_dashboard_api_request(
        reqwest::Method::POST,
        "/api/env/reveal",
        Some(serde_json::json!({
            "key": key,
        })),
    )
    .await?
    .json::<DashboardEnvRevealResponse>()
    .await
        .map_err(|e| format!("Failed to parse env reveal response: {}", e))
}

#[cfg(test)]
mod dashboard_model_config_tests {
    use super::*;

    #[test]
    fn extract_primary_model_config_from_yaml_reads_nested_model_section() {
        let yaml = r#"
model:
  default: qwen2.5:14b
  provider: custom
  base_url: http://127.0.0.1:11434/v1
  api_key: ollama
model_context_length: 32768
display:
  personality: helpful
"#;

        let config = extract_primary_model_config_from_yaml(yaml).expect("expected model config");

        assert_eq!(config.model, "qwen2.5:14b");
        assert_eq!(config.provider, "custom");
        assert_eq!(config.base_url, "http://127.0.0.1:11434/v1");
        assert_eq!(config.api_key, "ollama");
        assert_eq!(config.context_length, Some(32768));
    }

    #[test]
    fn apply_primary_model_config_to_yaml_updates_target_fields_only() {
        let yaml = r#"
model:
  default: claude-3-7-sonnet
  provider: anthropic
  base_url: https://api.anthropic.com
  api_key: hidden-key
model_context_length: 200000
display:
  personality: helpful
"#;
        let next_config = DashboardPrimaryModelConfig {
            model: "qwen2.5:14b".to_string(),
            provider: "custom".to_string(),
            base_url: "http://127.0.0.1:11434/v1".to_string(),
            api_key: "ollama".to_string(),
            context_length: Some(32768),
        };

        let updated_yaml =
            apply_primary_model_config_to_yaml(yaml, &next_config).expect("expected updated yaml");
        let updated_config =
            extract_primary_model_config_from_yaml(&updated_yaml).expect("expected parsed config");

        assert_eq!(updated_config.model, "qwen2.5:14b");
        assert_eq!(updated_config.provider, "custom");
        assert_eq!(updated_config.base_url, "http://127.0.0.1:11434/v1");
        assert_eq!(updated_config.api_key, "ollama");
        assert_eq!(updated_config.context_length, Some(32768));
        assert!(updated_yaml.contains("display:"));
        assert!(updated_yaml.contains("personality: helpful"));
    }
}

// ========================
// 文件操作 API（Phase 3）
// ========================

#[derive(Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub r#type: String, // "file" | "directory"
    pub size: u64,
    pub modified: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    pub kind: String,
    pub name: String,
    pub path: String,
    pub mime: Option<String>,
    pub extension: Option<String>,
    pub size: u64,
    pub modified: String,
    pub content: Option<String>,
    pub data_url: Option<String>,
}

fn detect_text_mime(extension: &str) -> Option<&'static str> {
    match extension {
        "txt" | "log" | "md" | "markdown" | "json" | "jsonl" | "yaml" | "yml" | "toml" | "ini"
        | "conf" | "cfg" | "xml" | "html" | "htm" | "css" | "scss" | "less" | "js" | "jsx"
        | "ts" | "tsx" | "mjs" | "cjs" | "rs" | "py" | "java" | "kt" | "swift" | "go" | "rb"
        | "php" | "sh" | "zsh" | "bash" | "fish" | "sql" | "csv" | "tsv" => Some("text/plain"),
        _ => None,
    }
}

fn detect_image_mime(extension: &str) -> Option<&'static str> {
    match extension {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "webp" => Some("image/webp"),
        "gif" => Some("image/gif"),
        "bmp" => Some("image/bmp"),
        "svg" => Some("image/svg+xml"),
        _ => None,
    }
}

fn classify_file_preview_kind(name: &str, bytes: &[u8]) -> &'static str {
    let extension = Path::new(name)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();

    if detect_image_mime(&extension).is_some() {
        return "image";
    }

    if extension == "pdf" {
        return "pdf";
    }

    if matches!(
        extension.as_str(),
        "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "pages" | "numbers" | "key"
    ) {
        return "office";
    }

    if detect_text_mime(&extension).is_some() {
        return "text";
    }

    if !bytes.is_empty() && bytes.iter().all(|byte| *byte != 0) && std::str::from_utf8(bytes).is_ok() {
        return "text";
    }

    "binary"
}

fn build_file_preview(relative: &Path, target: &Path, metadata: &std::fs::Metadata) -> Result<FilePreview, String> {
    let name = target
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_string();
    let extension = Path::new(&name)
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_lowercase());
    let modified = metadata
        .modified()
        .ok()
        .map(|time| chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339())
        .unwrap_or_else(now_rfc3339);
    let bytes = std::fs::read(target)
        .map_err(|e| format!("Failed to read file {}: {}", target.display(), e))?;
    let kind = classify_file_preview_kind(&name, &bytes).to_string();
    let mime = extension
        .as_deref()
        .and_then(|ext| detect_image_mime(ext).or_else(|| detect_text_mime(ext)))
        .map(str::to_string)
        .or_else(|| {
            if kind == "pdf" {
                Some("application/pdf".to_string())
            } else if kind == "office" {
                Some("application/octet-stream".to_string())
            } else if kind == "binary" {
                Some("application/octet-stream".to_string())
            } else {
                None
            }
        });

    let (content, data_url) = match kind.as_str() {
        "text" => (
            Some(String::from_utf8_lossy(&bytes).to_string()),
            None,
        ),
        "image" => {
            let encoded = {
                use base64::Engine;
                base64::engine::general_purpose::STANDARD.encode(&bytes)
            };
            let mime_type = mime
                .clone()
                .unwrap_or_else(|| "application/octet-stream".to_string());
            (
                None,
                Some(format!("data:{};base64,{}", mime_type, encoded)),
            )
        }
        _ => (None, None),
    };

    Ok(FilePreview {
        kind,
        name,
        path: relative.to_string_lossy().replace('\\', "/"),
        mime,
        extension,
        size: metadata.len(),
        modified,
        content,
        data_url,
    })
}

fn resolve_workspace_root(workspace_path: Option<String>) -> Result<PathBuf, String> {
    let normalized = normalize_workspace_path(workspace_path.as_deref())
        .ok_or_else(|| "Workspace path is required".to_string())?;
    let root = PathBuf::from(normalized);
    std::fs::create_dir_all(&root)
        .map_err(|e| format!("Failed to create workspace root {}: {}", root.display(), e))?;
    root.canonicalize()
        .map_err(|e| format!("Failed to resolve workspace root {}: {}", root.display(), e))
}

fn resolve_workspace_relative_path(
    workspace_path: Option<String>,
    relative_path: &str,
    allow_missing: bool,
) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    use std::path::Component;

    let root = resolve_workspace_root(workspace_path)?;
    let trimmed = relative_path.trim();
    let relative = if trimmed.is_empty() {
        PathBuf::new()
    } else {
        let candidate = PathBuf::from(trimmed);
        if candidate.is_absolute() {
            candidate
                .strip_prefix(&root)
                .map_err(|_| "Path is outside the current workspace".to_string())?
                .to_path_buf()
        } else {
            candidate
        }
    };

    if relative.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    }) {
        return Err("Path is outside the current workspace".to_string());
    }

    let target = root.join(&relative);
    if !allow_missing && !target.exists() {
        return Err(format!("Path does not exist: {}", target.display()));
    }

    Ok((root, target, relative))
}

#[tauri::command]
pub fn list_directory(
    path: String,
    workspace_path: Option<String>,
) -> Result<Vec<FileEntry>, String> {
    let (_root, target, relative) = resolve_workspace_relative_path(workspace_path, &path, true)?;
    if !target.exists() {
        std::fs::create_dir_all(&target)
            .map_err(|e| format!("Failed to create directory {}: {}", target.display(), e))?;
    }
    if !target.is_dir() {
        return Err(format!("Not a directory: {}", target.display()));
    }

    let mut entries = std::fs::read_dir(&target)
        .map_err(|e| format!("Failed to read directory {}: {}", target.display(), e))?
        .filter_map(Result::ok)
        .map(|entry| {
            let metadata = entry.metadata().ok();
            let is_dir = metadata.as_ref().map(|item| item.is_dir()).unwrap_or(false);
            let entry_name = entry.file_name().to_string_lossy().to_string();
            let entry_relative = if relative.as_os_str().is_empty() {
                PathBuf::from(&entry_name)
            } else {
                relative.join(&entry_name)
            };
            let modified = metadata
                .as_ref()
                .and_then(|item| item.modified().ok())
                .map(|time| chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339())
                .unwrap_or_else(now_rfc3339);

            FileEntry {
                name: entry_name,
                path: entry_relative.to_string_lossy().replace('\\', "/"),
                is_dir,
                r#type: if is_dir { "directory" } else { "file" }.to_string(),
                size: metadata.as_ref().map(|item| item.len()).unwrap_or(0),
                modified,
            }
        })
        .collect::<Vec<_>>();

    entries.sort_by(|left, right| match (left.is_dir, right.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => left.name.to_lowercase().cmp(&right.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file(path: String, workspace_path: Option<String>) -> Result<String, String> {
    let (_root, target, _relative) = resolve_workspace_relative_path(workspace_path, &path, false)?;
    let bytes = std::fs::read(&target)
        .map_err(|e| format!("Failed to read file {}: {}", target.display(), e))?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

#[tauri::command]
pub fn get_file_preview(path: String, workspace_path: Option<String>) -> Result<FilePreview, String> {
    let (_root, target, relative) =
        resolve_workspace_relative_path(workspace_path, &path, false)?;

    if target.is_dir() {
        return Err(format!("Not a file: {}", target.display()));
    }

    let metadata = target
        .metadata()
        .map_err(|e| format!("Failed to read metadata {}: {}", target.display(), e))?;

    build_file_preview(&relative, &target, &metadata)
}

#[tauri::command]
pub fn open_file_external(path: String, workspace_path: Option<String>) -> Result<serde_json::Value, String> {
    let (_root, target, relative) =
        resolve_workspace_relative_path(workspace_path, &path, false)?;

    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(&target).status();

    #[cfg(target_os = "linux")]
    let result = Command::new("xdg-open").arg(&target).status();

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    let result: Result<std::process::ExitStatus, std::io::Error> =
        Err(std::io::Error::new(std::io::ErrorKind::Unsupported, "Unsupported platform"));

    let status = result
        .map_err(|e| format!("Failed to open {} externally: {}", target.display(), e))?;

    if !status.success() {
        return Err(format!("External open command failed for {}", target.display()));
    }

    Ok(serde_json::json!({
        "success": true,
        "path": relative.to_string_lossy().replace('\\', "/")
    }))
}

#[tauri::command]
pub fn write_file(
    path: String,
    content: String,
    workspace_path: Option<String>,
) -> Result<serde_json::Value, String> {
    let (_root, target, relative) = resolve_workspace_relative_path(workspace_path, &path, true)?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory {}: {}", parent.display(), e))?;
    }
    std::fs::write(&target, content)
        .map_err(|e| format!("Failed to write file {}: {}", target.display(), e))?;
    Ok(serde_json::json!({ "success": true, "path": relative.to_string_lossy().replace('\\', "/") }))
}

#[tauri::command]
pub fn delete_file(
    path: String,
    workspace_path: Option<String>,
) -> Result<serde_json::Value, String> {
    let (_root, target, relative) = resolve_workspace_relative_path(workspace_path, &path, false)?;
    if target.is_dir() {
        std::fs::remove_dir_all(&target)
            .map_err(|e| format!("Failed to delete directory {}: {}", target.display(), e))?;
    } else {
        std::fs::remove_file(&target)
            .map_err(|e| format!("Failed to delete file {}: {}", target.display(), e))?;
    }
    Ok(serde_json::json!({ "success": true, "path": relative.to_string_lossy().replace('\\', "/") }))
}

#[tauri::command]
pub fn create_directory(
    path: String,
    workspace_path: Option<String>,
) -> Result<serde_json::Value, String> {
    let (_root, target, relative) = resolve_workspace_relative_path(workspace_path, &path, true)?;
    std::fs::create_dir_all(&target)
        .map_err(|e| format!("Failed to create directory {}: {}", target.display(), e))?;
    Ok(serde_json::json!({ "success": true, "path": relative.to_string_lossy().replace('\\', "/") }))
}

#[cfg(test)]
mod tests {
    use super::{
        build_dashboard_launch_command, build_python_install_command, extract_dashboard_error_detail,
        classify_file_preview_kind, collect_configured_model_candidates,
        collect_configured_model_candidates_from_env_content, ensure_sessions_schema,
        extract_python_command_from_hermes_launcher, is_missing_croniter_error,
        resolve_chat_request_model, resolve_unix_shell_with, update_session_model_in_connection,
    };
    use rusqlite::{params, Connection};
    use std::path::Path;

    #[test]
    fn resolve_unix_shell_with_prefers_env_shell_when_available() {
        let shell = resolve_unix_shell_with(Some("/custom/bin/zsh"), |path| {
            path == Path::new("/custom/bin/zsh")
        });

        assert_eq!(shell, "/custom/bin/zsh");
    }

    #[test]
    fn resolve_unix_shell_with_falls_back_to_bash_then_sh() {
        let shell = resolve_unix_shell_with(None, |path| path == Path::new("/bin/bash"));
        assert_eq!(shell, "/bin/bash");

        let shell = resolve_unix_shell_with(Some(""), |path| path == Path::new("/bin/sh"));
        assert_eq!(shell, "/bin/sh");
    }

    #[test]
    fn extract_dashboard_error_detail_reads_detail_field_from_json() {
        let detail = extract_dashboard_error_detail(
            r#"{"detail":"Cron expressions require 'croniter' package. Install with: pip install croniter"}"#,
        );

        assert_eq!(
            detail.as_deref(),
            Some("Cron expressions require 'croniter' package. Install with: pip install croniter")
        );
    }

    #[test]
    fn is_missing_croniter_error_matches_known_dashboard_message() {
        assert!(is_missing_croniter_error(
            "Cron expressions require 'croniter' package. Install with: pip install croniter"
        ));
        assert!(!is_missing_croniter_error("Some unrelated dashboard error"));
    }

    #[test]
    fn build_python_install_command_uses_module_install() {
        assert_eq!(
            build_python_install_command("python3"),
            "python3 -m pip install croniter"
        );
    }

    #[test]
    fn extract_python_command_from_hermes_launcher_reads_python_shebang() {
        let python = extract_python_command_from_hermes_launcher(
            "#!/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13\nprint('hello')\n",
        );

        assert_eq!(
            python.as_deref(),
            Some("/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13")
        );
    }

    #[test]
    fn extract_python_command_from_hermes_launcher_ignores_non_python_shebang() {
        let python = extract_python_command_from_hermes_launcher("#!/bin/bash\necho hi\n");
        assert!(python.is_none());
    }

    #[test]
    fn build_dashboard_launch_command_uses_expected_flags() {
        let command = build_dashboard_launch_command("/usr/local/bin/hermes");

        assert!(command.contains("dashboard"));
        assert!(command.contains("--port 9119"));
        assert!(command.contains("--no-open"));
        assert!(command.contains("/usr/local/bin/hermes"));
    }

    #[test]
    fn classify_file_preview_kind_detects_image_office_pdf_and_text() {
        assert_eq!(classify_file_preview_kind("notes.md", b"# hi"), "text");
        assert_eq!(classify_file_preview_kind("photo.png", b"\x89PNG"), "image");
        assert_eq!(classify_file_preview_kind("report.pdf", b"%PDF-1.7"), "pdf");
        assert_eq!(classify_file_preview_kind("sheet.xlsx", b"PK\x03\x04"), "office");
    }

    #[test]
    fn classify_file_preview_kind_treats_unknown_binary_as_binary() {
        assert_eq!(classify_file_preview_kind("archive.bin", b"\x00\x01\x02"), "binary");
    }

    #[test]
    fn session_model_schema_migration_adds_model_column() {
        let conn = Connection::open_in_memory().expect("in-memory db");

        ensure_sessions_schema(&conn).expect("schema initialized");

        let mut stmt = conn
            .prepare("PRAGMA table_info(sessions)")
            .expect("pragma prepared");
        let columns = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .expect("pragma query")
            .collect::<Result<Vec<_>, _>>()
            .expect("column names");

        assert!(columns.iter().any(|column| column == "model"));
    }

    #[test]
    fn session_model_update_only_changes_target_row() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        ensure_sessions_schema(&conn).expect("schema initialized");

        conn.execute(
            "INSERT INTO sessions (id, title, agent_id, workspace_path, pinned, created_at, updated_at, message_count, model) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5, 0, ?6)",
            params!["session-a", "A", "hermes-agent", Option::<String>::None, "2026-04-23T00:00:00Z", Option::<String>::None],
        ).expect("insert session a");
        conn.execute(
            "INSERT INTO sessions (id, title, agent_id, workspace_path, pinned, created_at, updated_at, message_count, model) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5, 0, ?6)",
            params!["session-b", "B", "hermes-agent", Option::<String>::None, "2026-04-23T00:00:00Z", Some("gpt-4.1")],
        ).expect("insert session b");

        update_session_model_in_connection(
            &conn,
            "session-a",
            Some("qwen2.5:14b".to_string()),
            "2026-04-23T12:00:00Z",
        )
        .expect("update model");

        let session_a_model: Option<String> = conn
            .query_row(
                "SELECT model FROM sessions WHERE id = ?1",
                params!["session-a"],
                |row| row.get(0),
            )
            .expect("select model a");
        let session_b_model: Option<String> = conn
            .query_row(
                "SELECT model FROM sessions WHERE id = ?1",
                params!["session-b"],
                |row| row.get(0),
            )
            .expect("select model b");

        assert_eq!(session_a_model.as_deref(), Some("qwen2.5:14b"));
        assert_eq!(session_b_model.as_deref(), Some("gpt-4.1"));
    }

    #[test]
    fn response_request_model_prefers_explicit_model_and_falls_back_to_agent() {
        assert_eq!(
            resolve_chat_request_model(Some("MiniMax-M2.7".to_string())),
            "MiniMax-M2.7"
        );
        assert_eq!(resolve_chat_request_model(Some("   ".to_string())), "hermes-agent");
        assert_eq!(resolve_chat_request_model(None), "hermes-agent");
    }

    #[test]
    fn collect_configured_model_candidates_from_env_content_reads_default_model_keys() {
        let models = collect_configured_model_candidates_from_env_content(
            r#"
OPENAI_DEFAULT_MODEL=gpt-4.1
# ANTHROPIC_DEFAULT_MODEL=claude-3-5-sonnet
DEEPSEEK_DEFAULT_MODEL=deepseek-chat
OPENAI_DEFAULT_MODEL=gpt-4.1
"#,
        );

        assert_eq!(models, vec!["gpt-4.1".to_string(), "deepseek-chat".to_string()]);
    }

    #[test]
    fn collect_configured_model_candidates_merges_config_and_env_models_without_duplicates() {
        let models = collect_configured_model_candidates(
            r#"
model:
  default: Localkey
"#,
            r#"
OPENAI_DEFAULT_MODEL=gpt-4.1
DEEPSEEK_DEFAULT_MODEL=deepseek-chat
OPENAI_DEFAULT_MODEL=gpt-4.1
"#,
        )
        .expect("model candidates");

        assert_eq!(
            models,
            vec![
                "Localkey".to_string(),
                "gpt-4.1".to_string(),
                "deepseek-chat".to_string()
            ]
        );
    }
}

#[cfg(test)]
mod db_integration_tests {
    use super::*;
    use tauri::AppHandle;
    use tempfile::tempdir;

    // 创建一个模拟的 AppHandle（用于测试）
    fn mock_app_handle() -> AppHandle {
        // 注意：完整测试需要 Tauri app 实例，此处仅验证编译
        // 实际集成测试应在 `cargo tauri dev` 中手动验证
        unimplemented!("Integration tests require running Tauri app")
    }

    #[test]
    fn test_schema_initialization() {
        // 验证 schema SQL 能正确执行（编译时检查）
        let schema = include_str!("../../schema/app.sql");
        assert!(schema.contains("CREATE TABLE IF NOT EXISTS memories"));
        assert!(schema.contains("CREATE TABLE IF NOT EXISTS tasks"));
        assert!(schema.contains("CREATE INDEX"));
    }
}
