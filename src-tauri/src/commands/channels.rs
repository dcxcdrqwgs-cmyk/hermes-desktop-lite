// Copyright (c) 2026 MeeJoy

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use once_cell::sync::Lazy;
use qrcode::{render::svg, QrCode};
use serde::Serialize;
use serde_json::json;
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use uuid::Uuid;

const ILINK_BASE_URL: &str = "https://ap.weixin.qqtown.com";
const EP_GET_BOT_QR: &str = "ilink/bot/get_bot_qrcode";
const EP_GET_QR_STATUS: &str = "ilink/bot/get_qrcode_status";
const WEIXIN_BOT_TYPE: &str = "3";
const QQBOT_PORTAL_BASE_URL: &str = "https://q.qq.com";
const QQBOT_ONBOARD_CREATE_PATH: &str = "/lite/create_bind_task";
const QQBOT_ONBOARD_POLL_PATH: &str = "/lite/poll_bind_result";
const QQBOT_POLL_INTERVAL_MS: u64 = 2_000;

static QQBOT_BIND_KEYS: Lazy<Mutex<BTreeMap<String, String>>> =
    Lazy::new(|| Mutex::new(BTreeMap::new()));

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeixinQrCodeInfo {
    qrcode: String,
    qrcode_img_content: String,
    qrcode_image_data_url: String,
    expires_in_seconds: u64,
    poll_interval_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeixinCredentials {
    account_id: String,
    token: String,
    base_url: String,
    user_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeixinQrCodeStatus {
    status: String,
    message: String,
    credentials: Option<WeixinCredentials>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QqBotQrCodeInfo {
    task_id: String,
    connect_url: String,
    qrcode_image_data_url: String,
    expires_in_seconds: u64,
    poll_interval_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QqBotCredentials {
    app_id: String,
    client_secret: String,
    user_openid: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QqBotQrCodeStatus {
    status: String,
    message: String,
    credentials: Option<QqBotCredentials>,
}

#[tauri::command]
pub async fn get_weixin_qrcode() -> Result<WeixinQrCodeInfo, String> {
    let url = ilink_url(EP_GET_BOT_QR);
    let response = fetch_ilink_json(&url, &[("bot_type", WEIXIN_BOT_TYPE)]).await?;
    parse_weixin_qrcode_response(&response)
}

#[tauri::command]
pub async fn check_weixin_qrcode_status(qrcode: String) -> Result<WeixinQrCodeStatus, String> {
    let qrcode = qrcode.trim().to_string();
    if qrcode.is_empty() {
        return Err("二维码状态查询缺少 qrcode".to_string());
    }

    let url = ilink_url(EP_GET_QR_STATUS);
    let response = fetch_ilink_json(&url, &[("qrcode", qrcode.as_str())]).await?;
    let status = parse_weixin_qrcode_status_response(&response)?;

    if let Some(credentials) = &status.credentials {
        save_weixin_account(credentials)?;
    }

    Ok(status)
}

#[tauri::command]
pub fn get_whatsapp_qrcode() -> Result<String, String> {
    let output = Command::new("hermes")
        .args(["whatsapp", "--qr"])
        .output()
        .map_err(|error| format!("Failed to run hermes whatsapp --qr: {}", error))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn get_qqbot_qrcode() -> Result<QqBotQrCodeInfo, String> {
    let key = generate_qqbot_bind_key();
    let response = post_qqbot_json(
        QQBOT_ONBOARD_CREATE_PATH,
        json!({
            "key": key,
        }),
    )
    .await?;
    let task_id = parse_qqbot_bind_task_response(&response)?;
    let connect_url = build_qqbot_connect_url(&task_id);
    let qrcode_image_data_url = build_qrcode_svg_data_url(&connect_url)?;

    {
        let mut keys = QQBOT_BIND_KEYS
            .lock()
            .map_err(|_| "QQBot 配对状态不可用，请重新打开扫码配置".to_string())?;
        keys.insert(task_id.clone(), key);
    }

    Ok(QqBotQrCodeInfo {
        task_id,
        connect_url,
        qrcode_image_data_url,
        expires_in_seconds: 600,
        poll_interval_ms: QQBOT_POLL_INTERVAL_MS,
    })
}

#[tauri::command]
pub async fn check_qqbot_qrcode_status(task_id: String) -> Result<QqBotQrCodeStatus, String> {
    let task_id = task_id.trim().to_string();
    if task_id.is_empty() {
        return Err("QQBot 二维码状态查询缺少 task_id".to_string());
    }

    let response = post_qqbot_json(
        QQBOT_ONBOARD_POLL_PATH,
        json!({
            "task_id": task_id,
        }),
    )
    .await?;
    parse_qqbot_qrcode_status_response(&task_id, &response)
}

fn ilink_url(endpoint: &str) -> String {
    format!(
        "{}/cgi-bin/{}",
        ILINK_BASE_URL,
        endpoint.trim_start_matches('/')
    )
}

async fn fetch_ilink_json(url: &str, query: &[(&str, &str)]) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let request_url = url_with_query(url, query);
    let response = client
        .get(request_url)
        .timeout(Duration::from_secs(15))
        .send()
        .await
        .map_err(|error| format!("请求 iLink 失败: {}", error))?;

    let http_status = response.status();
    let value = response
        .json::<Value>()
        .await
        .map_err(|error| format!("解析 iLink 响应失败: {}", error))?;

    if !http_status.is_success() {
        return Err(format!(
            "iLink 返回 HTTP {}: {}",
            http_status,
            extract_message(&value).unwrap_or_else(|| value.to_string())
        ));
    }

    ensure_success_response(&value)?;
    Ok(value)
}

async fn post_qqbot_json(path: &str, body: Value) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let url = format!("{}{}", QQBOT_PORTAL_BASE_URL, path);
    let response = client
        .post(url)
        .timeout(Duration::from_secs(10))
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .header(
            "User-Agent",
            "QQBotAdapter/1.1.0 (Hermes Slate Desk; Tauri)",
        )
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("请求 QQBot 配对接口失败: {}", error))?;

    let http_status = response.status();
    let value = response
        .json::<Value>()
        .await
        .map_err(|error| format!("解析 QQBot 配对响应失败: {}", error))?;

    if !http_status.is_success() {
        return Err(format!(
            "QQBot 配对接口返回 HTTP {}: {}",
            http_status,
            extract_message(&value).unwrap_or_else(|| value.to_string())
        ));
    }

    ensure_qqbot_success_response(&value)?;
    Ok(value)
}

fn url_with_query(url: &str, query: &[(&str, &str)]) -> String {
    if query.is_empty() {
        return url.to_string();
    }

    let params = query
        .iter()
        .map(|(key, value)| {
            format!(
                "{}={}",
                encode_query_component(key),
                encode_query_component(value)
            )
        })
        .collect::<Vec<_>>()
        .join("&");
    let separator = if url.contains('?') { "&" } else { "?" };
    format!("{}{}{}", url, separator, params)
}

fn encode_query_component(value: &str) -> String {
    let mut encoded = String::new();

    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => encoded.push_str(&format!("%{:02X}", byte)),
        }
    }

    encoded
}

fn ensure_success_response(value: &Value) -> Result<(), String> {
    for key in ["errcode", "retcode", "ret"] {
        if let Some(code) = field_i64(value, key) {
            if code != 0 {
                let message = extract_message(value).unwrap_or_else(|| "未知错误".to_string());
                return Err(format!("iLink 返回错误 {}: {}", code, message));
            }
        }
    }

    Ok(())
}

fn ensure_qqbot_success_response(value: &Value) -> Result<(), String> {
    if let Some(code) = field_i64(value, "retcode") {
        if code != 0 {
            let message = extract_message(value).unwrap_or_else(|| "未知错误".to_string());
            return Err(format!("QQBot 配对接口返回错误 {}: {}", code, message));
        }
    }

    Ok(())
}

fn parse_weixin_qrcode_response(value: &Value) -> Result<WeixinQrCodeInfo, String> {
    let qrcode = field_string(value, &["qrcode"])
        .ok_or_else(|| format!("iLink 二维码响应缺少 qrcode: {}", value))?;
    let qrcode_img_content = field_string(
        value,
        &[
            "qrcode_img_content",
            "qrcodeImgContent",
            "qrcode_url",
            "qrcodeUrl",
        ],
    )
    .filter(|content| !content.trim().is_empty())
    .unwrap_or_else(|| qrcode.clone());
    let qrcode_image_data_url = build_qrcode_svg_data_url(&qrcode_img_content)?;

    Ok(WeixinQrCodeInfo {
        qrcode,
        qrcode_img_content,
        qrcode_image_data_url,
        expires_in_seconds: 480,
        poll_interval_ms: 1_500,
    })
}

fn parse_weixin_qrcode_status_response(value: &Value) -> Result<WeixinQrCodeStatus, String> {
    let status = normalize_weixin_status(
        field_string(value, &["status", "qrcode_status", "qrcodeStatus"])
            .unwrap_or_else(|| "wait".to_string())
            .as_str(),
    );

    if status == "confirmed" {
        let account_id = field_string(value, &["ilink_bot_id", "account_id", "accountId"])
            .ok_or_else(|| format!("iLink 确认响应缺少 ilink_bot_id: {}", value))?;
        let token = field_string(value, &["bot_token", "token"])
            .ok_or_else(|| format!("iLink 确认响应缺少 bot_token: {}", value))?;
        let base_url = field_string(value, &["baseurl", "base_url", "baseUrl"])
            .unwrap_or_else(|| ILINK_BASE_URL.to_string());
        let user_id = field_string(value, &["ilink_user_id", "user_id", "userId"]);

        return Ok(WeixinQrCodeStatus {
            status,
            message: "微信已确认登录，凭证已写入 ~/.hermes/.env".to_string(),
            credentials: Some(WeixinCredentials {
                account_id,
                token,
                base_url,
                user_id,
            }),
        });
    }

    let message = match status.as_str() {
        "scanned" => "已扫码，等待手机确认".to_string(),
        "expired" => "二维码已过期，请重新打开扫码配对".to_string(),
        "cancelled" => "用户已取消登录".to_string(),
        _ => "等待微信扫码确认".to_string(),
    };

    Ok(WeixinQrCodeStatus {
        status,
        message,
        credentials: None,
    })
}

fn parse_qqbot_bind_task_response(value: &Value) -> Result<String, String> {
    field_string(value, &["task_id", "taskId"])
        .ok_or_else(|| format!("QQBot 配对响应缺少 task_id: {}", value))
}

fn parse_qqbot_qrcode_status_response(
    task_id: &str,
    value: &Value,
) -> Result<QqBotQrCodeStatus, String> {
    let status_code = field_i64(value, "status").unwrap_or(0);

    match status_code {
        2 => {
            let app_id = field_string(value, &["bot_appid", "app_id", "appId"])
                .ok_or_else(|| format!("QQBot 确认响应缺少 bot_appid: {}", value))?;
            let encrypted_secret = field_string(
                value,
                &[
                    "bot_encrypt_secret",
                    "botEncryptSecret",
                    "client_secret",
                    "clientSecret",
                ],
            )
            .ok_or_else(|| format!("QQBot 确认响应缺少 bot_encrypt_secret: {}", value))?;
            let user_openid =
                field_string(value, &["user_openid", "userOpenid", "openid"]).unwrap_or_default();
            let key = take_qqbot_bind_key(task_id)?;
            let client_secret = decrypt_qqbot_secret(&encrypted_secret, &key)?;
            let credentials = QqBotCredentials {
                app_id,
                client_secret,
                user_openid,
            };

            save_qqbot_credentials(&credentials)?;

            Ok(QqBotQrCodeStatus {
                status: "confirmed".to_string(),
                message: "QQBot 已确认授权，凭证已写入 ~/.hermes/.env".to_string(),
                credentials: Some(credentials),
            })
        }
        3 => {
            remove_qqbot_bind_key(task_id);
            Ok(QqBotQrCodeStatus {
                status: "expired".to_string(),
                message: "QQBot 二维码已过期，请重新打开扫码配置".to_string(),
                credentials: None,
            })
        }
        1 => Ok(QqBotQrCodeStatus {
            status: "pending".to_string(),
            message: "等待 QQ 扫码授权".to_string(),
            credentials: None,
        }),
        _ => Ok(QqBotQrCodeStatus {
            status: "waiting".to_string(),
            message: "等待 QQ 扫码授权".to_string(),
            credentials: None,
        }),
    }
}

fn build_qqbot_connect_url(task_id: &str) -> String {
    format!(
        "https://q.qq.com/qqbot/openclaw/connect.html?task_id={}&_wv=2&source=hermes",
        encode_query_component(task_id)
    )
}

fn generate_qqbot_bind_key() -> String {
    let mut bytes = [0u8; 32];
    if getrandom::getrandom(&mut bytes).is_err() {
        bytes[..16].copy_from_slice(Uuid::new_v4().as_bytes());
        bytes[16..].copy_from_slice(Uuid::new_v4().as_bytes());
    }
    general_purpose::STANDARD.encode(bytes)
}

fn take_qqbot_bind_key(task_id: &str) -> Result<String, String> {
    QQBOT_BIND_KEYS
        .lock()
        .map_err(|_| "QQBot 配对状态不可用，请重新打开扫码配置".to_string())?
        .remove(task_id)
        .ok_or_else(|| "QQBot 配对密钥已失效，请重新打开扫码配置".to_string())
}

fn remove_qqbot_bind_key(task_id: &str) {
    if let Ok(mut keys) = QQBOT_BIND_KEYS.lock() {
        keys.remove(task_id);
    }
}

fn decrypt_qqbot_secret(encrypted_base64: &str, key_base64: &str) -> Result<String, String> {
    let key = general_purpose::STANDARD
        .decode(key_base64)
        .map_err(|error| format!("解析 QQBot 配对密钥失败: {}", error))?;
    let raw = general_purpose::STANDARD
        .decode(encrypted_base64)
        .map_err(|error| format!("解析 QQBot Secret 密文失败: {}", error))?;

    if key.len() != 32 {
        return Err("QQBot 配对密钥长度不正确".to_string());
    }
    if raw.len() <= 28 {
        return Err("QQBot Secret 密文长度不正确".to_string());
    }

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|error| format!("初始化 QQBot Secret 解密失败: {}", error))?;
    let nonce = Nonce::from_slice(&raw[..12]);
    let plaintext = cipher
        .decrypt(nonce, &raw[12..])
        .map_err(|error| format!("解密 QQBot Secret 失败: {}", error))?;

    String::from_utf8(plaintext).map_err(|error| format!("QQBot Secret 不是有效文本: {}", error))
}

fn build_qrcode_svg_data_url(content: &str) -> Result<String, String> {
    if content.trim_start().starts_with("data:image/") {
        return Ok(content.trim().to_string());
    }

    let code =
        QrCode::new(content.as_bytes()).map_err(|error| format!("生成二维码失败: {}", error))?;
    let svg = code
        .render::<svg::Color<'_>>()
        .min_dimensions(256, 256)
        .dark_color(svg::Color("#111827"))
        .light_color(svg::Color("#ffffff"))
        .build();
    let encoded = general_purpose::STANDARD.encode(svg.as_bytes());
    Ok(format!("data:image/svg+xml;base64,{}", encoded))
}

fn normalize_weixin_status(status: &str) -> String {
    match status.trim().to_ascii_lowercase().as_str() {
        "confirmed" | "confirm" | "success" | "ok" => "confirmed".to_string(),
        "scanned" | "scan" | "scanned_wait_confirm" => "scanned".to_string(),
        "expired" | "timeout" => "expired".to_string(),
        "cancel" | "cancelled" | "canceled" => "cancelled".to_string(),
        "" | "wait" | "waiting" | "pending" => "waiting".to_string(),
        other => other.to_string(),
    }
}

fn save_weixin_account(credentials: &WeixinCredentials) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "无法定位用户主目录".to_string())?;
    let hermes_home = home_dir.join(".hermes");
    std::fs::create_dir_all(&hermes_home)
        .map_err(|error| format!("创建 Hermes 配置目录失败: {}", error))?;

    let env_path = hermes_home.join(".env");
    let current = match std::fs::read_to_string(&env_path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(error) => {
            return Err(format!(
                "读取 Hermes 微信凭证文件失败 {}: {}",
                env_path.display(),
                error
            ));
        }
    };
    let merged = merge_weixin_env_content(&current, credentials);

    std::fs::write(&env_path, merged).map_err(|error| {
        format!(
            "写入 Hermes 微信凭证文件失败 {}: {}",
            env_path.display(),
            error
        )
    })
}

fn save_qqbot_credentials(credentials: &QqBotCredentials) -> Result<(), String> {
    let home_dir = dirs::home_dir().ok_or_else(|| "无法定位用户主目录".to_string())?;
    let hermes_home = home_dir.join(".hermes");
    std::fs::create_dir_all(&hermes_home)
        .map_err(|error| format!("创建 Hermes 配置目录失败: {}", error))?;

    let env_path = hermes_home.join(".env");
    let current = match std::fs::read_to_string(&env_path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(error) => {
            return Err(format!(
                "读取 Hermes QQBot 凭证文件失败 {}: {}",
                env_path.display(),
                error
            ));
        }
    };
    let merged = merge_qqbot_env_content(&current, credentials);

    std::fs::write(&env_path, merged).map_err(|error| {
        format!(
            "写入 Hermes QQBot 凭证文件失败 {}: {}",
            env_path.display(),
            error
        )
    })
}

fn merge_weixin_env_content(content: &str, credentials: &WeixinCredentials) -> String {
    let mut updates = BTreeMap::from([
        (
            "WEIXIN_ACCOUNT_ID",
            sanitize_env_value(&credentials.account_id),
        ),
        ("WEIXIN_TOKEN", sanitize_env_value(&credentials.token)),
        ("WEIXIN_BASE_URL", sanitize_env_value(&credentials.base_url)),
    ]);

    if let Some(user_id) = &credentials.user_id {
        updates.insert("WEIXIN_USER_ID", sanitize_env_value(user_id));
    }

    merge_env_content(content, &updates)
}

fn merge_qqbot_env_content(content: &str, credentials: &QqBotCredentials) -> String {
    let mut updates = BTreeMap::from([
        ("QQ_APP_ID", sanitize_env_value(&credentials.app_id)),
        (
            "QQ_CLIENT_SECRET",
            sanitize_env_value(&credentials.client_secret),
        ),
        (
            "QQBOT_HOME_CHANNEL",
            sanitize_env_value(&credentials.user_openid),
        ),
        (
            "QQ_ALLOWED_USERS",
            sanitize_env_value(&credentials.user_openid),
        ),
        ("QQ_ALLOW_ALL_USERS", "false".to_string()),
    ]);

    if credentials.user_openid.trim().is_empty() {
        updates.insert("QQBOT_HOME_CHANNEL", String::new());
        updates.insert("QQ_ALLOWED_USERS", String::new());
    }

    merge_env_content(content, &updates)
}

fn merge_env_content(content: &str, updates: &BTreeMap<&'static str, String>) -> String {
    let update_keys: HashSet<&str> = updates.keys().copied().collect();
    let mut seen = HashSet::new();
    let mut lines = Vec::new();

    for line in content.lines() {
        let maybe_key = line
            .split_once('=')
            .map(|(key, _value)| key.trim())
            .filter(|key| update_keys.contains(key));

        if let Some(key) = maybe_key {
            if let Some(value) = updates.get(key) {
                lines.push(format!("{}={}", key, value));
                seen.insert(key.to_string());
                continue;
            }
        }

        lines.push(line.to_string());
    }

    for (key, value) in updates {
        if !seen.contains(*key) {
            lines.push(format!("{}={}", key, value));
        }
    }

    let mut merged = lines.join("\n");
    if !merged.ends_with('\n') {
        merged.push('\n');
    }
    merged
}

fn sanitize_env_value(value: &str) -> String {
    value.trim().replace(['\r', '\n'], "")
}

fn field_string(value: &Value, keys: &[&str]) -> Option<String> {
    for candidate in response_candidates(value) {
        for key in keys {
            if let Some(raw) = candidate.get(*key) {
                if let Some(text) = raw.as_str() {
                    return Some(text.to_string());
                }
                if raw.is_number() || raw.is_boolean() {
                    return Some(raw.to_string());
                }
            }
        }
    }

    None
}

fn field_i64(value: &Value, key: &str) -> Option<i64> {
    for candidate in response_candidates(value) {
        if let Some(raw) = candidate.get(key) {
            if let Some(code) = raw.as_i64() {
                return Some(code);
            }
            if let Some(text) = raw.as_str() {
                if let Ok(code) = text.parse::<i64>() {
                    return Some(code);
                }
            }
        }
    }

    None
}

fn extract_message(value: &Value) -> Option<String> {
    field_string(value, &["message", "msg", "errmsg", "error"])
}

fn response_candidates(value: &Value) -> Vec<&Value> {
    let mut candidates = vec![value];
    for key in ["data", "result", "response"] {
        if let Some(candidate) = value.get(key).filter(|candidate| candidate.is_object()) {
            candidates.push(candidate);
        }
    }
    candidates
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_confirmed_weixin_status_from_nested_ilink_response() {
        let response = json!({
            "ret": 0,
            "data": {
                "status": "confirmed",
                "ilink_bot_id": "bot-123",
                "bot_token": "token-456",
                "baseurl": "https://ilink.example",
                "ilink_user_id": "user-789"
            }
        });

        let status = parse_weixin_qrcode_status_response(&response).expect("status response");

        assert_eq!(status.status, "confirmed");
        assert_eq!(
            status.credentials,
            Some(WeixinCredentials {
                account_id: "bot-123".to_string(),
                token: "token-456".to_string(),
                base_url: "https://ilink.example".to_string(),
                user_id: Some("user-789".to_string()),
            })
        );
    }

    #[test]
    fn merges_weixin_credentials_without_dropping_existing_env_values() {
        let credentials = WeixinCredentials {
            account_id: "new-bot".to_string(),
            token: "new-token".to_string(),
            base_url: "https://new.example".to_string(),
            user_id: Some("new-user".to_string()),
        };
        let env = "OPENAI_API_KEY=keep\nWEIXIN_TOKEN=old-token\n# local comment\n";

        let merged = merge_weixin_env_content(env, &credentials);

        assert!(merged.contains("OPENAI_API_KEY=keep\n"));
        assert!(merged.contains("# local comment\n"));
        assert!(merged.contains("WEIXIN_ACCOUNT_ID=new-bot\n"));
        assert!(merged.contains("WEIXIN_TOKEN=new-token\n"));
        assert!(merged.contains("WEIXIN_BASE_URL=https://new.example\n"));
        assert!(merged.contains("WEIXIN_USER_ID=new-user\n"));
        assert!(!merged.contains("WEIXIN_TOKEN=old-token"));
    }

    #[test]
    fn builds_weixin_qrcode_payload_with_svg_data_url() {
        let response = json!({
            "qrcode": "hex-value",
            "qrcode_img_content": "https://scan.example/confirm"
        });

        let info = parse_weixin_qrcode_response(&response).expect("qrcode response");

        assert_eq!(info.qrcode, "hex-value");
        assert_eq!(info.qrcode_img_content, "https://scan.example/confirm");
        assert!(info
            .qrcode_image_data_url
            .starts_with("data:image/svg+xml;base64,"));
    }
}
