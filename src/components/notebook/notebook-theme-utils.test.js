// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import test from "node:test"

import { getNotebookAppearanceValues } from "./notebook-theme-utils.js"

test("getNotebookAppearanceValues falls back to dark-friendly text values in dark mode", () => {
  const values = getNotebookAppearanceValues({}, true)

  assert.equal(values.textColor, "#e5e7eb")
  assert.equal(values.placeholderColor, "#6b7280")
})

test("getNotebookAppearanceValues preserves explicit appearance values when provided", () => {
  const values = getNotebookAppearanceValues(
    { fontFamily: "Test Sans", fontSize: 18, textColor: "#123456" },
    false
  )

  assert.deepEqual(values, {
    fontFamily: "Test Sans",
    fontSize: 18,
    textColor: "#123456",
    placeholderColor: "#cbd5e1",
  })
})

test("getNotebookAppearanceValues treats empty text color as missing and still provides theme defaults", () => {
  const lightValues = getNotebookAppearanceValues({ textColor: "" }, false)
  const darkValues = getNotebookAppearanceValues({ textColor: "" }, true)

  assert.equal(lightValues.textColor, "#1f2937")
  assert.equal(darkValues.textColor, "#e5e7eb")
})
