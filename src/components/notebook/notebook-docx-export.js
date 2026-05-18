// Copyright (c) 2026 MeeJoy

import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import { toString } from "mdast-util-to-string"
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx"

const WORD_PAGE_WIDTH = 9360
const WORD_CONTENT_WIDTH = 6240
const CODE_MONO_FONT = "Courier New"

function parseMarkdown(markdown) {
  return unified().use(remarkParse).use(remarkGfm).parse(String(markdown || ""))
}

function getHeadingLevel(depth) {
  switch (depth) {
    case 1:
      return HeadingLevel.HEADING_1
    case 2:
      return HeadingLevel.HEADING_2
    case 3:
      return HeadingLevel.HEADING_3
    case 4:
      return HeadingLevel.HEADING_4
    case 5:
      return HeadingLevel.HEADING_5
    default:
      return HeadingLevel.HEADING_6
  }
}

function getImageScale(alt) {
  const ratio = Number.parseFloat(String(alt || "").trim())
  if (Number.isNaN(ratio) || ratio <= 0) return 1
  return Math.max(0.28, Math.min(ratio, 1))
}

function getImageCaption(alt) {
  const value = String(alt || "").trim()
  if (!value) return ""
  return Number.isNaN(Number.parseFloat(value)) ? value : ""
}

function inferImageType(src) {
  const value = String(src || "").trim().toLowerCase()
  if (value.startsWith("data:image/jpeg") || value.startsWith("data:image/jpg") || value.endsWith(".jpg") || value.endsWith(".jpeg")) {
    return "jpg"
  }
  if (value.startsWith("data:image/gif") || value.endsWith(".gif")) {
    return "gif"
  }
  if (value.startsWith("data:image/bmp") || value.endsWith(".bmp")) {
    return "bmp"
  }
  return "png"
}

async function dataUrlToBytes(src) {
  const match = String(src || "").match(/^data:.*?;base64,(.+)$/)
  if (!match?.[1]) return null
  const binary = atob(match[1])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function fetchImageBytes(src) {
  if (!src) return null
  if (String(src).startsWith("data:")) return dataUrlToBytes(src)

  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

async function getImageDimensions(src) {
  return await new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
      })
    }
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = src
  })
}

async function createImageBlock(src, alt = "") {
  const bytes = await fetchImageBytes(src)
  if (!bytes) return []

  const scale = getImageScale(alt)
  const caption = getImageCaption(alt)
  const { width, height } = await getImageDimensions(src)
  const safeWidth = width > 0 ? width : 1200
  const safeHeight = height > 0 ? height : 720
  const targetWidth = Math.round(Math.min(WORD_CONTENT_WIDTH, safeWidth) * scale)
  const targetHeight = Math.max(1, Math.round((safeHeight / safeWidth) * targetWidth))

  const blocks = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 220, after: caption ? 80 : 180 },
      children: [
        new ImageRun({
          type: inferImageType(src),
          data: bytes,
          transformation: {
            width: targetWidth,
            height: targetHeight,
          },
        }),
      ],
    }),
  ]

  if (caption) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 220 },
        children: [
          new TextRun({
            text: caption,
            color: "64748B",
            italics: true,
            size: 18,
          }),
        ],
      })
    )
  }

  return blocks
}

function pushTextRuns(target, text, styles = {}) {
  const parts = String(text || "").split("\n")
  parts.forEach((part, index) => {
    target.push(
      new TextRun({
        text: part,
        break: index > 0 ? 1 : undefined,
        ...styles,
      })
    )
  })
}

function inlineNodesToRuns(nodes, inherited = {}) {
  const runs = []

  for (const node of nodes || []) {
    if (!node) continue

    switch (node.type) {
      case "text":
        pushTextRuns(runs, node.value, inherited)
        break
      case "strong":
        runs.push(...inlineNodesToRuns(node.children, { ...inherited, bold: true }))
        break
      case "emphasis":
        runs.push(...inlineNodesToRuns(node.children, { ...inherited, italics: true }))
        break
      case "inlineCode":
        runs.push(
          new TextRun({
            text: String(node.value || ""),
            font: CODE_MONO_FONT,
            size: 22,
            shading: {
              type: ShadingType.CLEAR,
              fill: "F1F5F9",
              color: "auto",
            },
            border: {
              style: BorderStyle.SINGLE,
              color: "CBD5E1",
              size: 1,
            },
            ...inherited,
          })
        )
        break
      case "link":
        runs.push(
          new ExternalHyperlink({
            link: node.url,
            children: inlineNodesToRuns(node.children, {
              ...inherited,
              color: "2563EB",
              underline: {},
            }),
          })
        )
        break
      case "break":
        runs.push(new TextRun({ text: "", break: 1, ...inherited }))
        break
      default:
        pushTextRuns(runs, toString(node), inherited)
        break
    }
  }

  return runs
}

function createParagraphFromInline(children, options = {}) {
  const runs = inlineNodesToRuns(children)
  return new Paragraph({
    spacing: { after: 180, line: 320 },
    children: runs.length > 0 ? runs : [new TextRun("")],
    ...options,
  })
}

function createCodeBlock(node) {
  const language = String(node.lang || "plain text")
  const lines = String(node.value || "").split("\n")

  return [
    new Paragraph({
      spacing: { before: 220, after: 40 },
      children: [
        new TextRun({
          text: language.toUpperCase(),
          size: 18,
          color: "64748B",
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 220 },
      shading: {
        type: ShadingType.CLEAR,
        fill: "F8FAFC",
        color: "auto",
      },
      border: {
        top: { style: BorderStyle.SINGLE, color: "E2E8F0", size: 1 },
        bottom: { style: BorderStyle.SINGLE, color: "E2E8F0", size: 1 },
        left: { style: BorderStyle.SINGLE, color: "E2E8F0", size: 1 },
        right: { style: BorderStyle.SINGLE, color: "E2E8F0", size: 1 },
      },
      children: lines.flatMap((line, index) => [
        new TextRun({
          text: line,
          break: index > 0 ? 1 : undefined,
          font: CODE_MONO_FONT,
          size: 22,
          color: "0F172A",
        }),
      ]),
    }),
  ]
}

function createTable(node) {
  const rows = (node.children || []).map((row, rowIndex) => {
    const cells = (row.children || []).map((cell) => {
      const children = cell.children?.length
        ? [createParagraphFromInline(cell.children, { spacing: { before: 40, after: 40, line: 280 } })]
        : [new Paragraph("")]

      return new TableCell({
        children,
        shading: rowIndex === 0
          ? { type: ShadingType.CLEAR, fill: "F8FAFC", color: "auto" }
          : undefined,
        margins: {
          top: 60,
          bottom: 60,
          left: 90,
          right: 90,
        },
      })
    })

    return new TableRow({
      children: cells,
      tableHeader: rowIndex === 0,
    })
  })

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    borders: {
      top: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 1 },
      bottom: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 1 },
      left: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 1 },
      right: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 1 },
    },
    margins: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
    },
  })
}

async function blockToDocx(node) {
  switch (node.type) {
    case "heading":
      return [
        createParagraphFromInline(node.children, {
          heading: getHeadingLevel(node.depth),
          spacing: {
            before: node.depth === 1 ? 220 : 180,
            after: node.depth === 1 ? 180 : 120,
          },
        }),
      ]
    case "paragraph":
      if (node.children?.length === 1 && node.children[0]?.type === "image") {
        return createImageBlock(node.children[0].url, node.children[0].alt)
      }
      return [createParagraphFromInline(node.children)]
    case "blockquote": {
      const blocks = []
      for (const child of node.children || []) {
        if (child.type === "paragraph") {
          blocks.push(
            createParagraphFromInline(child.children, {
              indent: { left: 320, right: 120 },
              border: {
                left: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 3 },
              },
              shading: {
                type: ShadingType.CLEAR,
                fill: "F8FAFC",
                color: "auto",
              },
            })
          )
        }
      }
      return blocks
    }
    case "list": {
      const items = []
      for (const [index, item] of (node.children || []).entries()) {
        const marker = node.ordered ? `${index + 1}. ` : "• "
        const firstParagraph = item.children?.find((child) => child.type === "paragraph")
        if (firstParagraph) {
          items.push(
            createParagraphFromInline(
              [{ type: "text", value: marker }, ...(firstParagraph.children || [])],
              {
                indent: { left: 280, hanging: 160 },
                spacing: { after: 90, line: 300 },
              }
            )
          )
        }
      }
      return items
    }
    case "code":
      return createCodeBlock(node)
    case "table":
      return [createTable(node)]
    case "thematicBreak":
      return [
        new Paragraph({
          spacing: { before: 180, after: 180 },
          border: {
            bottom: { style: BorderStyle.SINGLE, color: "E2E8F0", size: 1 },
          },
        }),
      ]
    default: {
      const text = toString(node)
      return text ? [new Paragraph({ children: [new TextRun(text)] })] : []
    }
  }
}

async function markdownToDocxChildren(markdown) {
  const tree = parseMarkdown(markdown)
  const children = []

  for (const node of tree.children || []) {
    children.push(...(await blockToDocx(node)))
  }

  return children
}

export async function buildNotebookDocx({ title, markdown }) {
  const bodyChildren = await markdownToDocxChildren(markdown)

  return new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: String(title || "").trim() || "Untitled note",
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
          }),
          ...bodyChildren,
        ],
      },
    ],
  })
}

export async function exportNotebookDocxBlob({ title, markdown }) {
  const doc = await buildNotebookDocx({ title, markdown })
  return Packer.toBlob(doc)
}

export async function exportNotebookDocxArrayBuffer({ title, markdown }) {
  const doc = await buildNotebookDocx({ title, markdown })
  return Packer.toArrayBuffer(doc)
}
