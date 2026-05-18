// Copyright (c) 2026 MeeJoy

const TABLE_LAYOUTS_MARKER = "hermes-table-layouts:"

export function splitNotebookTableLayouts(content) {
  const source = String(content || "")
  const pattern = new RegExp(`\\n?<!--\\s*${TABLE_LAYOUTS_MARKER}([\\s\\S]*?)-->\\s*$`)
  const match = source.match(pattern)

  if (!match) {
    return {
      markdown: source,
      tableLayouts: [],
    }
  }

  let tableLayouts = []
  try {
    const parsed = JSON.parse(match[1])
    if (Array.isArray(parsed)) {
      tableLayouts = parsed
        .map((row) => Array.isArray(row) ? row.map((value) => Number.parseFloat(String(value))).filter((value) => Number.isFinite(value) && value > 0) : [])
    }
  } catch {
    tableLayouts = []
  }

  return {
    markdown: source.replace(pattern, ""),
    tableLayouts,
  }
}

export function mergeNotebookTableLayouts(markdown, tableLayouts) {
  const base = splitNotebookTableLayouts(markdown).markdown.trimEnd()
  const normalized = Array.isArray(tableLayouts)
    ? tableLayouts
        .map((row) => Array.isArray(row) ? row.map((value) => Number.parseFloat(String(value))).filter((value) => Number.isFinite(value) && value > 0) : [])
        .filter((row) => row.length > 0)
    : []

  if (normalized.length === 0) return base

  return `${base}\n\n<!-- ${TABLE_LAYOUTS_MARKER}${JSON.stringify(normalized)} -->`
}

export function readNotebookTableLayoutsFromDoc(doc) {
  if (!doc || typeof doc.descendants !== "function") return []

  const tableLayouts = []

  doc.descendants((node) => {
    if (node?.type?.name !== "table") return true

    const firstRow = node.firstChild
    if (!firstRow) {
      tableLayouts.push([])
      return false
    }

    const widths = []
    firstRow.forEach((cell) => {
      const colwidth = Array.isArray(cell?.attrs?.colwidth) ? cell.attrs.colwidth : []
      if (colwidth.length > 0) {
        colwidth.forEach((value) => {
          const width = Number.parseFloat(String(value))
          if (Number.isFinite(width) && width > 0) widths.push(width)
        })
      } else {
        widths.push(NaN)
      }
    })

    tableLayouts.push(widths.filter((value) => Number.isFinite(value) && value > 0))
    return false
  })

  return tableLayouts
}

export function readNotebookTableLayoutsFromRoot(root) {
  if (!root) return []

  return Array.from(root.querySelectorAll(".milkdown-table-block table.children")).map((table) => {
    const cols = Array.from(table.querySelectorAll(":scope > colgroup > col"))
    if (cols.length > 0) {
      return cols
        .map((col) => Number.parseFloat(String(col.style.width || "").replace("px", "")))
        .filter((value) => Number.isFinite(value) && value > 0)
    }

    const firstRow = table.querySelector("tbody tr")
    if (!firstRow) return []

    return Array.from(firstRow.children)
      .map((cell) => Number.parseFloat(String(cell.getAttribute("data-colwidth") || "").split(",")[0]))
      .filter((value) => Number.isFinite(value) && value > 0)
  })
}
