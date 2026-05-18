// Copyright (c) 2026 MeeJoy

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Crepe, CrepeFeature } from "@milkdown/crepe"
import { imageBlockSchema } from "@milkdown/kit/component/image-block"
import { toggleLinkCommand } from "@milkdown/kit/component/link-tooltip"
import { commandsCtx, editorViewCtx, serializerCtx } from "@milkdown/kit/core"
import { TextSelection } from "@milkdown/kit/prose/state"
import { insert, insertPos, replaceRange } from "@milkdown/kit/utils"
import {
  addBlockTypeCommand,
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  headingSchema,
  hrSchema,
  inlineCodeSchema,
  isMarkSelectedCommand,
  listItemSchema,
  orderedListSchema,
  paragraphSchema,
  selectTextNearPosCommand,
  setBlockTypeCommand,
  strongSchema,
  emphasisSchema,
  linkSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark"
import { createTable } from "@milkdown/kit/preset/gfm"
import "@milkdown/crepe/theme/common/style.css"
import "@milkdown/crepe/theme/frame.css"
import "./notebook-milkdown-overrides.css"
import { splitNotebookTableLayouts } from "./notebook-table-layout-utils"

async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(reader.error || new Error("图片读取失败"))
    reader.readAsDataURL(file)
  })
}

function ensureNotebookSlashOverrides(doc) {
  if (!doc?.head) return
  if (doc.getElementById("notebook-milkdown-runtime-overrides")) return

  const style = doc.createElement("style")
  style.id = "notebook-milkdown-runtime-overrides"
  style.textContent = `
    .milkdown .milkdown-slash-menu {
      min-width: 15rem !important;
      max-width: 15rem !important;
      overflow: hidden !important;
      border: 1px solid rgba(15, 23, 42, 0.075) !important;
      border-radius: 10px !important;
      background: rgba(247, 248, 250, 0.96) !important;
      box-shadow: 0 12px 34px rgba(15, 23, 42, 0.095), 0 1px 2px rgba(15, 23, 42, 0.06) !important;
      backdrop-filter: blur(18px) saturate(145%) !important;
      -webkit-backdrop-filter: blur(18px) saturate(145%) !important;
      color: #334155 !important;
      font-family: var(--font-sans) !important;
      z-index: 70 !important;
    }

    .milkdown .milkdown-slash-menu * {
      font-family: var(--font-sans) !important;
      letter-spacing: 0 !important;
    }

    .milkdown .milkdown-slash-menu .tab-group {
      display: block !important;
      padding: 6px 6px 2px !important;
    }

    .milkdown .milkdown-slash-menu .tab-group ul {
      display: flex !important;
      gap: 3px !important;
      padding: 2px !important;
      margin: 0 !important;
      list-style: none !important;
      border: 1px solid rgba(15, 23, 42, 0.08) !important;
      border-radius: 9px !important;
      background: rgba(15, 23, 42, 0.04) !important;
    }

    .milkdown .milkdown-slash-menu .tab-group ul li {
      min-width: 42px !important;
      min-height: 24px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      white-space: nowrap !important;
      flex: 1 1 0 !important;
      border-radius: 7px !important;
      padding: 2px 8px !important;
      color: #64748b !important;
      font-size: 10px !important;
      font-style: normal !important;
      font-weight: 600 !important;
      line-height: 12px !important;
      background: transparent !important;
    }

    .milkdown .milkdown-slash-menu .tab-group ul li.selected {
      background: rgba(255, 255, 255, 0.96) !important;
      color: #334155 !important;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08) !important;
    }

    .milkdown .milkdown-slash-menu .menu-groups {
      max-height: 288px !important;
      padding: 0 6px 6px !important;
    }

    .milkdown .milkdown-slash-menu .menu-group h6 {
      padding: 6px 8px 5px !important;
      color: #64748b !important;
      font-size: 9.5px !important;
      font-weight: 700 !important;
      line-height: 14px !important;
      letter-spacing: 0.04em !important;
      text-transform: uppercase !important;
    }

    .milkdown .milkdown-slash-menu .menu-group ul {
      list-style: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .milkdown .milkdown-slash-menu .menu-group + .menu-group {
      border-top: 1px solid rgba(15, 23, 42, 0.07) !important;
      margin-top: 6px !important;
      padding-top: 6px !important;
    }

    .milkdown .milkdown-slash-menu .menu-group li {
      min-width: 0 !important;
      min-height: 34px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      border-radius: 8px !important;
      padding: 7px 8px !important;
      color: #475569 !important;
      font-size: 11px !important;
      font-style: normal !important;
      font-weight: 500 !important;
      line-height: 15px !important;
      transition: background-color 160ms ease, color 160ms ease !important;
    }

    .milkdown .milkdown-slash-menu .menu-group li svg {
      width: 14px !important;
      height: 14px !important;
      color: #64748b !important;
      fill: currentColor !important;
      stroke-width: 1.8 !important;
      flex-shrink: 0 !important;
    }

    .milkdown .milkdown-slash-menu .menu-group li > span {
      font-size: 11px !important;
      font-style: normal !important;
      font-weight: 500 !important;
      line-height: 15px !important;
      color: #475569 !important;
    }

    .milkdown .milkdown-slash-menu .menu-group li.hover,
    .milkdown .milkdown-slash-menu .menu-group li:hover,
    .milkdown .milkdown-slash-menu .menu-group li.active {
      background: rgba(15, 23, 42, 0.055) !important;
    }
  `
  doc.head.appendChild(style)
}

function applyNotebookSlashStyles(doc) {
  if (!doc) return

  const menus = doc.querySelectorAll(".milkdown-slash-menu")
  menus.forEach((menu) => {
    menu.style.minWidth = "15rem"
    menu.style.maxWidth = "15rem"
    menu.style.overflow = "hidden"
    menu.style.border = "1px solid rgba(15, 23, 42, 0.075)"
    menu.style.borderRadius = "10px"
    menu.style.background = "rgba(247, 248, 250, 0.96)"
    menu.style.boxShadow = "0 12px 34px rgba(15, 23, 42, 0.095), 0 1px 2px rgba(15, 23, 42, 0.06)"
    menu.style.backdropFilter = "blur(18px) saturate(145%)"
    menu.style.webkitBackdropFilter = "blur(18px) saturate(145%)"
    menu.style.color = "#334155"
    menu.style.fontFamily = "var(--font-sans)"
    menu.style.zIndex = "70"

    const tabGroup = menu.querySelector(".tab-group")
    if (tabGroup) {
      tabGroup.style.display = "block"
      tabGroup.style.padding = "6px 6px 2px"
      const tabsList = tabGroup.querySelector("ul")
      if (tabsList) {
        tabsList.style.display = "flex"
        tabsList.style.gap = "3px"
        tabsList.style.padding = "2px"
        tabsList.style.margin = "0"
        tabsList.style.listStyle = "none"
        tabsList.style.border = "1px solid rgba(15, 23, 42, 0.08)"
        tabsList.style.borderRadius = "9px"
        tabsList.style.background = "rgba(15, 23, 42, 0.04)"
      }

      tabGroup.querySelectorAll("li").forEach((tab) => {
        tab.style.minWidth = "42px"
        tab.style.minHeight = "24px"
        tab.style.display = "inline-flex"
        tab.style.alignItems = "center"
        tab.style.justifyContent = "center"
        tab.style.whiteSpace = "nowrap"
        tab.style.flex = "1 1 0"
        tab.style.borderRadius = "7px"
        tab.style.padding = "2px 8px"
        tab.style.color = "#64748b"
        tab.style.fontSize = "10px"
        tab.style.fontStyle = "normal"
        tab.style.fontWeight = "600"
        tab.style.lineHeight = "12px"
        tab.style.background = tab.classList.contains("selected")
          ? "rgba(255, 255, 255, 0.96)"
          : "transparent"
        tab.style.boxShadow = tab.classList.contains("selected")
          ? "0 1px 2px rgba(15, 23, 42, 0.08)"
          : "none"
      })
    }

    const groups = menu.querySelector(".menu-groups")
    if (groups) {
      groups.style.maxHeight = "288px"
      groups.style.padding = "0 6px 6px"
    }

    menu.querySelectorAll(".menu-group").forEach((group, groupIndex) => {
      const heading = group.querySelector("h6")
      if (heading) {
        heading.style.padding = "6px 8px 5px"
        heading.style.color = "#64748b"
        heading.style.fontSize = "9.5px"
        heading.style.fontWeight = "700"
        heading.style.lineHeight = "14px"
        heading.style.letterSpacing = "0.04em"
        heading.style.textTransform = "uppercase"
      }

      if (groupIndex > 0) {
        group.style.borderTop = "1px solid rgba(15, 23, 42, 0.07)"
        group.style.marginTop = "6px"
        group.style.paddingTop = "6px"
      }

      group.querySelectorAll("ul").forEach((list) => {
        list.style.listStyle = "none"
        list.style.padding = "0"
        list.style.margin = "0"
      })

      group.querySelectorAll("li").forEach((item) => {
        item.style.minWidth = "0"
        item.style.minHeight = "34px"
        item.style.display = "flex"
        item.style.alignItems = "center"
        item.style.gap = "10px"
        item.style.borderRadius = "8px"
        item.style.padding = "7px 8px"
        item.style.color = "#475569"
        item.style.fontSize = "11px"
        item.style.fontStyle = "normal"
        item.style.fontWeight = "500"
        item.style.lineHeight = "15px"

        item.querySelectorAll("svg").forEach((icon) => {
          icon.style.width = "14px"
          icon.style.height = "14px"
          icon.style.color = "#64748b"
          icon.style.fill = "currentColor"
          icon.style.strokeWidth = "1.8"
          icon.style.flexShrink = "0"
        })

        item.querySelectorAll("span").forEach((text) => {
          text.style.fontSize = "11px"
          text.style.fontStyle = "normal"
          text.style.fontWeight = "500"
          text.style.lineHeight = "15px"
          text.style.color = "#475569"
        })
      })
    })
  })
}

export const NotebookMilkdownEditor = forwardRef(function NotebookMilkdownEditor(
  { noteId, content, onChange },
  ref
) {
  const rootRef = useRef(null)
  const crepeRef = useRef(null)
  const initialContent = splitNotebookTableLayouts(content)
  const lastMarkdownRef = useRef(initialContent.markdown || "")
  const changeRef = useRef(onChange)
  const [activeMarks, setActiveMarks] = useState({
    bold: false,
    italic: false,
    link: false,
    inlineCode: false,
  })

  useImperativeHandle(ref, () => ({
    runToolbarAction(action) {
      const crepe = crepeRef.current
      if (!crepe) return false
      const normalizedAction =
        typeof action === "string" ? { type: action, payload: undefined } : action || {}

      return crepe.editor.action((ctx) => {
        const commands = ctx.get(commandsCtx)
        const view = ctx.get(editorViewCtx)
        const { state } = view

        switch (normalizedAction.type) {
          case "heading-1":
            return commands.call(setBlockTypeCommand.key, {
              nodeType: headingSchema.type(ctx),
              attrs: { level: 1 },
            })
          case "heading-2":
            return commands.call(setBlockTypeCommand.key, {
              nodeType: headingSchema.type(ctx),
              attrs: { level: 2 },
            })
          case "paragraph":
            return commands.call(setBlockTypeCommand.key, {
              nodeType: paragraphSchema.type(ctx),
            })
          case "bold":
            return commands.call(toggleStrongCommand.key)
          case "italic":
            return commands.call(toggleEmphasisCommand.key)
          case "link":
            return commands.call(toggleLinkCommand.key)
          case "bullet-list":
            return commands.call(wrapInBlockTypeCommand.key, {
              nodeType: bulletListSchema.type(ctx),
            })
          case "ordered-list":
            return commands.call(wrapInBlockTypeCommand.key, {
              nodeType: orderedListSchema.type(ctx),
            })
          case "quote":
            return commands.call(wrapInBlockTypeCommand.key, {
              nodeType: blockquoteSchema.type(ctx),
            })
          case "task-list":
            return commands.call(wrapInBlockTypeCommand.key, {
              nodeType: listItemSchema.type(ctx),
              attrs: { checked: false },
            })
          case "code-block":
            return commands.call(setBlockTypeCommand.key, {
              nodeType: codeBlockSchema.type(ctx),
            })
          case "divider":
            return commands.call(addBlockTypeCommand.key, {
              nodeType: hrSchema.type(ctx),
            })
          case "image":
            return commands.call(addBlockTypeCommand.key, {
              nodeType: imageBlockSchema.type(ctx),
            })
          case "table": {
            const { from } = view.state.selection
            const inserted = commands.call(addBlockTypeCommand.key, {
              nodeType: createTable(ctx, 3, 3),
            })
            if (inserted) {
              commands.call(selectTextNearPosCommand.key, { pos: from })
            }
            return inserted
          }
          case "math":
            return commands.call(addBlockTypeCommand.key, {
              nodeType: codeBlockSchema.type(ctx),
              attrs: { language: "LaTeX" },
            })
          case "heading-3":
            return commands.call(setBlockTypeCommand.key, {
              nodeType: headingSchema.type(ctx),
              attrs: { level: 3 },
            })
          case "inline-code":
            if (state.selection.empty) {
              const markType = inlineCodeSchema.type(ctx)
              const hasStoredMark = state.storedMarks?.some((mark) => mark.type === markType)
              if (hasStoredMark) {
                view.dispatch(state.tr.removeStoredMark(markType))
              } else {
                view.dispatch(state.tr.addStoredMark(markType.create()))
              }
              return true
            }
            return commands.call(toggleInlineCodeCommand.key)
          default:
            return false
        }
      })
    },
    focusEditorAtStart() {
      const crepe = crepeRef.current
      if (!crepe) return false

      return crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const paragraph = paragraphSchema.type(ctx).create()
        const tr = view.state.tr.insert(0, paragraph)
        tr.setSelection(TextSelection.near(tr.doc.resolve(1)))
        if (!view.hasFocus()) view.focus()
        view.dispatch(tr.scrollIntoView())
        return true
      })
    },
    getToolbarState() {
      return activeMarks
    },
    getSelectionContext() {
      const crepe = crepeRef.current
      if (!crepe) return { selectedText: "", from: null, to: null }

      let context = { selectedText: "", from: null, to: null }
      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { from, to, empty } = view.state.selection
        context = {
          selectedText: empty ? "" : view.state.doc.textBetween(from, to, "\n\n"),
          from,
          to,
        }
        return true
      })
      return context
    },
    insertMarkdown(markdown) {
      const crepe = crepeRef.current
      if (!crepe || !markdown) return false
      return crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { from, empty } = view.state.selection
        if (empty) return insertPos(markdown, from, false)(ctx)
        return insert(markdown, false)(ctx)
      })
    },
    replaceSelectionWithMarkdown(markdown) {
      const crepe = crepeRef.current
      if (!crepe || !markdown) return false
      return crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { from, to, empty } = view.state.selection
        if (empty) return insertPos(markdown, from, false)(ctx)
        return replaceRange(markdown, { from, to })(ctx)
      })
    },
    insertMarkdownBelow(markdown) {
      const crepe = crepeRef.current
      if (!crepe || !markdown) return false
      return crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx)
        const { to } = view.state.selection
        return replaceRange(`\n${markdown}`, { from: to, to })(ctx)
      })
    },
  }), [activeMarks])

  useEffect(() => {
    const next = splitNotebookTableLayouts(content)
    lastMarkdownRef.current = next.markdown || ""
  }, [content])

  useEffect(() => {
    ensureNotebookSlashOverrides(rootRef.current?.ownerDocument || document)
    const doc = rootRef.current?.ownerDocument || document
    applyNotebookSlashStyles(doc)

    const observer = new MutationObserver(() => {
      applyNotebookSlashStyles(doc)
    })

    observer.observe(doc.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    changeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!rootRef.current) return

    let disposed = false

    const crepe = new Crepe({
      root: rootRef.current,
      defaultValue: splitNotebookTableLayouts(content).markdown || "",
      features: {
        [CrepeFeature.Toolbar]: false,
        [CrepeFeature.TopBar]: false,
        [CrepeFeature.BlockEdit]: false,
        [CrepeFeature.LinkTooltip]: true,
        [CrepeFeature.ImageBlock]: true,
      },
      featureConfigs: {
        [CrepeFeature.ImageBlock]: {
          onUpload: fileToDataUrl,
          inlineOnUpload: fileToDataUrl,
          blockOnUpload: fileToDataUrl,
        },
        [CrepeFeature.BlockEdit]: {
          textGroup: {
            label: "Text 文字",
            text: { label: "Text 正文" },
            h1: { label: "Heading 1 一级标题" },
            h2: { label: "Heading 2 二级标题" },
            h3: { label: "Heading 3 三级标题" },
            quote: { label: "Quote 引用" },
            divider: { label: "Divider 分隔线" },
          },
          listGroup: {
            label: "List 列表",
            bulletList: { label: "Bullet List 无序列表" },
            orderedList: { label: "Ordered List 有序列表" },
            taskList: { label: "Task List 任务列表" },
          },
          advancedGroup: {
            label: "Advanced 高级",
            image: { label: "Image 图片" },
            codeBlock: { label: "Code Block 代码块" },
            table: { label: "Table 表格" },
            math: { label: "Math 公式" },
          },
        },
      },
    })


    crepeRef.current = crepe
    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        if (disposed) return
        if (markdown === lastMarkdownRef.current) return
        lastMarkdownRef.current = markdown
        changeRef.current?.(markdown)
      })
      listener.updated((ctx, doc) => {
        if (disposed) return
        const serializer = ctx.get(serializerCtx)
        const markdown = serializer(doc)
        if (markdown !== lastMarkdownRef.current) {
          lastMarkdownRef.current = markdown
        }
        changeRef.current?.(markdown)
      })
      listener.updated((ctx) => {
        if (disposed) return
        const commands = ctx.get(commandsCtx)
        setActiveMarks({
          bold: commands.call(isMarkSelectedCommand.key, strongSchema.type(ctx)),
          italic: commands.call(isMarkSelectedCommand.key, emphasisSchema.type(ctx)),
          link: commands.call(isMarkSelectedCommand.key, linkSchema.type(ctx)),
          inlineCode: commands.call(isMarkSelectedCommand.key, inlineCodeSchema.type(ctx)),
        })
      })
    })

    void crepe.create()

    return () => {
      disposed = true
      void crepe.destroy()
      crepeRef.current = null
    }
    // Crepe must not recreate while typing, or the cursor, slash menu, and block handles reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  return (
    <div className="notebook-crepe-canvas relative bg-transparent">
      <div ref={rootRef} className="milkdown min-h-[calc(100vh-12rem)] px-0 py-0" />
    </div>
  )
})
