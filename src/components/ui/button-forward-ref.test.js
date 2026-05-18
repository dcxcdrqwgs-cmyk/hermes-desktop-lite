// Copyright (c) 2026 MeeJoy

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const buttonSource = readFileSync(new URL("./button.jsx", import.meta.url), "utf8")

test("button forwards refs so radix asChild triggers can anchor floating menus correctly", () => {
  assert.match(buttonSource, /React\.forwardRef/)
  assert.match(buttonSource, /ref={ref}/)
})
