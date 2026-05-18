// Copyright (c) 2026 MeeJoy

export function extractHeadings(content) {
  return String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line, index) => {
      const level = line.match(/^#+/)[0].length
      const text = line.replace(/^#{1,3}\s+/, "")
      return {
        id: `heading-${index}`,
        level,
        text,
      }
    })
}
