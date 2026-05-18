// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const indexCss = readFileSync(new URL("./index.css", import.meta.url), "utf8")
const buttonSource = readFileSync(new URL("./components/ui/button.jsx", import.meta.url), "utf8")
const inputSource = readFileSync(new URL("./components/ui/input.jsx", import.meta.url), "utf8")
const textareaSource = readFileSync(new URL("./components/ui/textarea.jsx", import.meta.url), "utf8")
const inputAreaSource = readFileSync(new URL("./components/InputArea.jsx", import.meta.url), "utf8")
const dropdownSource = readFileSync(new URL("./components/ui/dropdown-menu.jsx", import.meta.url), "utf8")
const tabsSource = readFileSync(new URL("./components/ui/tabs.jsx", import.meta.url), "utf8")
const cardSource = readFileSync(new URL("./components/ui/card.jsx", import.meta.url), "utf8")
const dialogSource = readFileSync(new URL("./components/ui/dialog.jsx", import.meta.url), "utf8")
const sheetSource = readFileSync(new URL("./components/ui/sheet.jsx", import.meta.url), "utf8")

test("global tokens match the quiet macOS native light palette", () => {
  assert.ok(indexCss.includes("--background: #F5F5F7;"), "app background should use macOS system gray")
  assert.ok(indexCss.includes("--card: #FFFFFF;"), "content surfaces should stay stable white")
  assert.ok(indexCss.includes("--foreground: #1D1D1F;"), "primary text should use Apple-style deep gray")
  assert.ok(indexCss.includes("--muted-foreground: #86868B;"), "secondary text should use Apple-style gray")
  assert.ok(indexCss.includes("--primary: #007AFF;"), "accent should be restrained system blue")
  assert.ok(indexCss.includes("--separator: rgba(0, 0, 0, 0.08);"), "separators should be hairline-light")
})

test("shared surfaces use light material and avoid heavy web-app chrome", () => {
  assert.ok(indexCss.includes("--surface-shadow: 0 1px 2px rgba(0, 0, 0, 0.035);"))
  assert.ok(indexCss.includes("--surface-shadow-strong: 0 6px 18px rgba(0, 0, 0, 0.06);"))
  assert.ok(indexCss.includes("backdrop-filter: blur(18px) saturate(135%);"))
  assert.ok(indexCss.includes(".app-info-card"))
  assert.ok(indexCss.includes(".app-empty-state"))
  assert.ok(indexCss.includes(".app-terminal-surface"))
  assert.ok(indexCss.includes(".app-terminal-sidebar"))
  assert.ok(indexCss.includes(".app-terminal-status"))
  assert.ok(!indexCss.includes("radial-gradient(circle at top left"), "background should not use decorative glow layers")
  assert.ok(!buttonSource.includes("shadow-[0_10px_24px"), "primary buttons should not cast heavy SaaS shadows")
  assert.ok(!cardSource.includes("shadow-sm"), "cards should not add default web-app shadows")
  assert.ok(!dialogSource.includes("shadow-lg"), "dialogs should use a restrained desktop shadow")
  assert.ok(dialogSource.includes("shadow-[0_18px_54px_rgba(0,0,0,0.12)]"))
  assert.ok(!sheetSource.includes("shadow-lg"), "sheets should use a restrained desktop shadow")
  assert.ok(sheetSource.includes("shadow-[0_18px_54px_rgba(0,0,0,0.12)]"))
})

test("global interactions feel softer without adding flashy motion", () => {
  assert.ok(
    indexCss.includes("--motion-ease-soft: cubic-bezier(0.22, 1, 0.36, 1);") &&
      indexCss.includes("--motion-duration-soft: 180ms;"),
    "global motion tokens should use a restrained native-feeling curve"
  )
  assert.ok(
    indexCss.includes("@media (prefers-reduced-motion: reduce)"),
    "soft motion should respect reduced-motion preferences"
  )
  assert.ok(
    buttonSource.includes("duration-[var(--motion-duration-soft)]") &&
      buttonSource.includes("ease-[var(--motion-ease-soft)]") &&
      buttonSource.includes("active:scale-[0.985]"),
    "buttons should use softer timing and a subtle press state"
  )
  assert.ok(
    inputSource.includes("focus-visible:ring-[2px]") &&
      inputSource.includes("focus-visible:ring-ring/18") &&
      textareaSource.includes("focus-visible:ring-[2px]") &&
      textareaSource.includes("focus-visible:ring-ring/18"),
    "form controls should use quieter focus rings"
  )
  assert.ok(
    dropdownSource.includes("duration-[var(--motion-duration-soft)]") &&
      dropdownSource.includes("active:scale-[0.99]"),
    "menu rows should transition gently and acknowledge press without jumping"
  )
  assert.ok(
    tabsSource.includes("transition-[background-color,color,box-shadow,transform]") &&
      tabsSource.includes("duration-[var(--motion-duration-soft)]"),
    "tabs should animate state changes with the shared soft timing"
  )
})

test("chat composer remains readable in dark mode", () => {
  assert.ok(
    !inputAreaSource.includes("bg-white"),
    "chat composer should not force a white input surface in dark mode"
  )
  assert.ok(
    inputAreaSource.includes("bg-card") &&
      inputAreaSource.includes("text-foreground") &&
      inputAreaSource.includes("dark:bg-secondary/44"),
    "chat composer should use theme-aware surfaces and foreground text"
  )
})
