// Copyright (c) 2026 MeeJoy

import { invoke } from "@tauri-apps/api/core"
import { homeDir } from "@tauri-apps/api/path"
import { isTauri } from "./browser-utils.js"

const BROWSER_CHANNELS_KEY = "hermes.preview.channels"

function safeParseChannels(content) {
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

async function getChannelsConfigPath() {
  const home = await homeDir()
  return `${home}.hermes/channels.json`
}

export async function readChannelsConfig() {
  if (!isTauri) {
    return safeParseChannels(window.localStorage.getItem(BROWSER_CHANNELS_KEY) || "{}")
  }

  try {
    const path = await getChannelsConfigPath()
    const content = await invoke("read_file_content", { path })
    return safeParseChannels(content)
  } catch (error) {
    console.warn("Failed to read channels.json:", error)
    return {}
  }
}

export async function writeChannelsConfig(config) {
  const serialized = JSON.stringify(config || {}, null, 2)

  if (!isTauri) {
    window.localStorage.setItem(BROWSER_CHANNELS_KEY, serialized)
    return
  }

  const path = await getChannelsConfigPath()
  const dir = path.slice(0, path.lastIndexOf("/"))
  await invoke("create_directory_if_not_exists", { path: dir })
  await invoke("write_file_content", { path, content: serialized })
}

export async function getWeixinQrCode() {
  if (!isTauri) {
    throw new Error("此功能仅支持桌面版 Hermes")
  }
  return normalizeWeixinQrInfo(await invoke("get_weixin_qrcode"))
}

export function normalizeWeixinQrInfo(info) {
  if (!info || typeof info !== "object") {
    return {
      qrcode: "",
      qrcodeImgContent: "",
      qrcodeImageDataUrl: "",
    }
  }

  return {
    qrcode: String(info.qrcode || "").trim(),
    qrcodeImgContent: String(info.qrcodeImgContent || info.qrcode_img_content || "").trim(),
    qrcodeImageDataUrl: String(info.qrcodeImageDataUrl || info.qrcode_image_data_url || "").trim(),
  }
}

export function getWeixinQrImageSrc(info) {
  const qrInfo = normalizeWeixinQrInfo(info)
  return qrInfo.qrcodeImageDataUrl || qrInfo.qrcodeImgContent
}

export async function checkWeixinQrCodeStatus(qrcode) {
  if (!isTauri) {
    throw new Error("此功能仅支持桌面版 Hermes")
  }
  return await invoke("check_weixin_qrcode_status", { qrcode })
}

export async function getQqbotQrCode() {
  if (!isTauri) {
    throw new Error("此功能仅支持桌面版 Hermes")
  }
  return normalizeQqbotQrInfo(await invoke("get_qqbot_qrcode"))
}

export function normalizeQqbotQrInfo(info) {
  if (!info || typeof info !== "object") {
    return {
      taskId: "",
      connectUrl: "",
      qrcodeImageDataUrl: "",
      expiresInSeconds: 600,
      pollIntervalMs: 2000,
    }
  }

  return {
    taskId: String(info.taskId || info.task_id || "").trim(),
    connectUrl: String(info.connectUrl || info.connect_url || "").trim(),
    qrcodeImageDataUrl: String(info.qrcodeImageDataUrl || info.qrcode_image_data_url || "").trim(),
    expiresInSeconds: Number(info.expiresInSeconds || info.expires_in_seconds || 600),
    pollIntervalMs: Number(info.pollIntervalMs || info.poll_interval_ms || 2000),
  }
}

export function getQqbotQrImageSrc(info) {
  return normalizeQqbotQrInfo(info).qrcodeImageDataUrl
}

export async function checkQqbotQrCodeStatus(taskId) {
  if (!isTauri) {
    throw new Error("此功能仅支持桌面版 Hermes")
  }
  return await invoke("check_qqbot_qrcode_status", { taskId })
}

export async function getWhatsappQrCode() {
  if (!isTauri) {
    throw new Error("此功能仅支持桌面版 Hermes")
  }
  return await invoke("get_whatsapp_qrcode")
}
