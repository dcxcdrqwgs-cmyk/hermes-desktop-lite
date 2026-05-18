// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  getQqbotQrImageSrc,
  getWeixinQrImageSrc,
  normalizeQqbotQrInfo,
  normalizeWeixinQrInfo,
} from "./channels.js"

const tauriChannelsSource = readFileSync(
  new URL("../../src-tauri/src/commands/channels.rs", import.meta.url),
  "utf8"
)
const channelsApiSource = readFileSync(new URL("./channels.js", import.meta.url), "utf8")
const channelsPageSource = readFileSync(
  new URL("../components/hermes/ChannelsPage.jsx", import.meta.url),
  "utf8"
)

test("normalizes iLink QR payloads for the desktop pairing dialog", () => {
  const qrInfo = normalizeWeixinQrInfo({
    qrcode: "qr-hex",
    qrcodeImgContent: "https://scan.example/qr",
    qrcodeImageDataUrl: "data:image/svg+xml;base64,abc",
  })

  assert.deepEqual(qrInfo, {
    qrcode: "qr-hex",
    qrcodeImgContent: "https://scan.example/qr",
    qrcodeImageDataUrl: "data:image/svg+xml;base64,abc",
  })
  assert.equal(getWeixinQrImageSrc(qrInfo), "data:image/svg+xml;base64,abc")
})

test("weixin QR pairing uses iLink commands instead of the removed legacy CLI", () => {
  assert.ok(
    !tauriChannelsSource.includes('.args(["weixin", "--qr"])'),
    "weixin pairing should not shell out to `hermes weixin --qr`"
  )
  assert.ok(
    tauriChannelsSource.includes("ilink/bot/get_bot_qrcode"),
    "weixin pairing should request QR codes from the iLink endpoint"
  )
  assert.ok(
    tauriChannelsSource.includes("ilink/bot/get_qrcode_status"),
    "weixin pairing should poll iLink QR status"
  )
  assert.ok(
    tauriChannelsSource.includes("WEIXIN_TOKEN"),
    "confirmed pairing should save the returned Weixin token"
  )
  assert.ok(
    channelsApiSource.includes("checkWeixinQrCodeStatus") &&
      channelsApiSource.includes("check_weixin_qrcode_status"),
    "front-end API should expose QR status polling"
  )
})

test("normalizes QQBot QR payloads for desktop scan-to-configure", () => {
  const qrInfo = normalizeQqbotQrInfo({
    taskId: "task-123",
    connectUrl: "https://q.qq.com/qqbot/openclaw/connect.html?task_id=task-123",
    qrcodeImageDataUrl: "data:image/svg+xml;base64,qq",
    expiresInSeconds: 600,
    pollIntervalMs: 2000,
  })

  assert.deepEqual(qrInfo, {
    taskId: "task-123",
    connectUrl: "https://q.qq.com/qqbot/openclaw/connect.html?task_id=task-123",
    qrcodeImageDataUrl: "data:image/svg+xml;base64,qq",
    expiresInSeconds: 600,
    pollIntervalMs: 2000,
  })
  assert.equal(getQqbotQrImageSrc(qrInfo), "data:image/svg+xml;base64,qq")
})

test("QQBot QR pairing uses q.qq.com onboarding and writes Hermes env values", () => {
  assert.ok(
    tauriChannelsSource.includes("/lite/create_bind_task"),
    "QQBot pairing should create bind tasks through q.qq.com"
  )
  assert.ok(
    tauriChannelsSource.includes("/lite/poll_bind_result"),
    "QQBot pairing should poll bind results through q.qq.com"
  )

  for (const envKey of [
    "QQ_APP_ID",
    "QQ_CLIENT_SECRET",
    "QQBOT_HOME_CHANNEL",
    "QQ_ALLOWED_USERS",
    "QQ_ALLOW_ALL_USERS",
  ]) {
    assert.ok(
      tauriChannelsSource.includes(envKey),
      `confirmed QQBot pairing should save ${envKey} to ~/.hermes/.env`
    )
  }

  assert.ok(
    !tauriChannelsSource.includes("channel_directory.json"),
    "QQBot pairing should leave channel_directory.json to the gateway restart flow"
  )
  assert.ok(
    channelsApiSource.includes("getQqbotQrCode") &&
      channelsApiSource.includes("check_qqbot_qrcode_status"),
    "front-end API should expose QQBot QR creation and polling"
  )
})

test("QQBot appears directly below Weixin in channel settings", () => {
  const weixinIndex = channelsPageSource.indexOf('id: "weixin"')
  const qqbotIndex = channelsPageSource.indexOf('id: "qqbot"')
  const wecomIndex = channelsPageSource.indexOf('id: "wecom"')

  assert.ok(weixinIndex >= 0, "Weixin channel entry should exist")
  assert.ok(qqbotIndex > weixinIndex, "QQBot should appear after Weixin")
  assert.ok(wecomIndex > qqbotIndex, "QQBot should appear before WeCom")
})
