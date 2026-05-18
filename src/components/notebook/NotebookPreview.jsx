// Copyright (c) 2026 MeeJoy

import ReactMarkdown from "react-markdown"
import { defaultUrlTransform } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeHighlight from "rehype-highlight"
import "katex/dist/katex.min.css"
import "highlight.js/styles/github.css"
import mermaid from "mermaid"
import { CheckIcon, CopyIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useI18n } from "@/i18n.jsx"
import { getNotebookAppearanceValues } from "./notebook-theme-utils"

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function headingRenderer(Tag, className) {
  return function Heading({ children }) {
    const text = Array.isArray(children) ? children.join("") : String(children || "")
    const id = slugify(text)
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    )
  }
}

function getImageScale(alt) {
  const ratio = Number.parseFloat(String(alt || "").trim())
  if (Number.isNaN(ratio) || ratio <= 0) return 1
  return ratio
}

function isRenderableImageSource(src) {
  const value = String(src || "").trim()
  if (!value || value === "undefined" || value === "null") return false
  if (value.startsWith("blob:") || value.startsWith("data:")) return true
  return /^https?:\/\//.test(value) || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")
}

function MermaidBlock({ chart }) {
  const { t } = useI18n()
  const [svg, setSvg] = useState("")

  useEffect(() => {
    let active = true
    mermaid.initialize({ startOnLoad: false, theme: "neutral" })
    void mermaid
      .render(`mermaid-${Math.random().toString(36).slice(2)}`, chart)
      .then(({ svg }) => {
        if (active) setSvg(svg)
      })
      .catch(() => {
        if (active) setSvg(`<pre>${t("notebook.mermaidError")}</pre>`)
      })
    return () => {
      active = false
    }
  }, [chart, t])

  return (
    <div
      className="mb-7 overflow-x-auto rounded-[18px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/65 dark:shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function CodeBlockPreview({ children, codeTheme, languageLabel, t }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const raw = children?.props?.children
    const text = Array.isArray(raw) ? raw.join("") : String(raw || "")
    if (!text.trim()) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className="mb-7 overflow-hidden rounded-[16px]"
      style={{
        background: codeTheme.frameBg,
        border: `1px solid ${codeTheme.frameBorder}`,
        boxShadow: codeTheme.frameShadow,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-1 text-[9px] font-medium"
        style={{
          background: codeTheme.headerBg,
          borderBottom: `1px solid ${codeTheme.headerBorder}`,
          color: codeTheme.headerText,
        }}
      >
        <span className="uppercase tracking-[0.1em] opacity-90">{languageLabel}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-[8px] px-1.5 py-1 text-[9.5px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: codeTheme.headerText }}
          title={copied ? t("notebook.codeCopied") : t("notebook.copyCode")}
        >
          {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
          <span>{copied ? t("notebook.codeCopied") : t("notebook.copyCode")}</span>
        </button>
      </div>
      <pre
        className="overflow-x-auto px-4.5 py-3 text-[13px] leading-6"
        style={{
          background: "transparent",
          color: codeTheme.baseText,
        }}
      >
        {children}
      </pre>
    </div>
  )
}

export function NotebookPreview({ content, appearance }) {
  const { t } = useI18n()
  const normalizedContent = String(content || "")
    .replace(/<\/?br\s*\/?>/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
  const isDark = document.documentElement.classList.contains("dark")
  const notebookAppearance = getNotebookAppearanceValues(appearance, isDark)
  const baseFontSize = notebookAppearance.fontSize
  const baseColor = notebookAppearance.textColor
  const headingColor = baseColor
  const codeTheme = isDark
      ? {
        frameBg: "#0f172a",
        frameBorder: "rgba(71, 85, 105, 0.28)",
        frameShadow: "0 8px 18px rgba(0,0,0,0.16)",
        baseText: "#f8fafc",
        bgSoft: "rgba(255,255,255,0.06)",
        borderSoft: "rgba(255,255,255,0.08)",
        inlineText: "#e2e8f0",
        inlineBg: "rgba(255,255,255,0.08)",
        inlineBorder: "rgba(255,255,255,0.12)",
        blockquoteBg: "rgba(255,255,255,0.03)",
        blockquoteBorder: "rgba(148,163,184,0.16)",
        imageFrame: "transparent",
        imageBorder: "rgba(255,255,255,0.06)",
        imageCaption: "#94a3b8",
        tableBg: "transparent",
        tableBorder: "rgba(71,85,105,0.18)",
        tableHeaderBg: "rgba(255,255,255,0.025)",
        surfaceBorder: "rgba(255,255,255,0.10)",
        tokenKeyword: "#7dd3fc",
        tokenString: "#86efac",
        tokenNumber: "#fca5a5",
        tokenType: "#fcd34d",
        tokenComment: "#94a3b8",
        tokenVariable: "#c4b5fd",
        tokenOperator: "#cbd5e1",
        headerBg: "rgba(255,255,255,0.025)",
        headerBorder: "rgba(255,255,255,0.05)",
        headerText: "#94a3b8",
      }
      : {
        frameBg: "rgba(248,250,252,0.92)",
        frameBorder: "rgba(226, 232, 240, 0.72)",
        frameShadow: "0 6px 16px rgba(15,23,42,0.045)",
        baseText: "#0f172a",
        bgSoft: "#f8fafc",
        borderSoft: "rgba(226,232,240,0.8)",
        inlineText: "#0f172a",
        inlineBg: "#f1f5f9",
        inlineBorder: "rgba(203,213,225,0.85)",
        blockquoteBg: "rgba(248,250,252,0.62)",
        blockquoteBorder: "rgba(203,213,225,0.64)",
        imageFrame: "transparent",
        imageBorder: "rgba(226,232,240,0.68)",
        imageCaption: "#64748b",
        tableBg: "transparent",
        tableBorder: "rgba(203,213,225,0.34)",
        tableHeaderBg: "rgba(248,250,252,0.66)",
        surfaceBorder: "rgba(226,232,240,0.9)",
        tokenKeyword: "#2563eb",
        tokenString: "#16a34a",
        tokenNumber: "#dc2626",
        tokenType: "#d97706",
        tokenComment: "#64748b",
        tokenVariable: "#7c3aed",
        tokenOperator: "#475569",
        headerBg: "rgba(241,245,249,0.86)",
        headerBorder: "rgba(226,232,240,0.64)",
        headerText: "#64748b",
      }
  const codeTokens = isDark
    ? codeTheme
    : codeTheme

  return (
    <div
      className="notebook-preview max-w-none text-foreground"
      style={{
        fontFamily: notebookAppearance.fontFamily,
        fontSize: `${notebookAppearance.fontSize}px`,
        color: notebookAppearance.textColor,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        urlTransform={(url) => {
          if (!url) return url
          if (url.startsWith("blob:") || url.startsWith("data:")) return url
          return defaultUrlTransform(url)
        }}
        components={{
          h1: headingRenderer("h1", "mb-5 mt-0 font-semibold leading-[1.18] tracking-normal"),
          h2: headingRenderer("h2", "mb-3.5 mt-9 font-semibold leading-[1.24] tracking-normal"),
          h3: headingRenderer("h3", "mb-3 mt-7 font-semibold leading-[1.35] tracking-normal"),
          p: ({ children }) => (
            <p
              className="mb-5 leading-[1.94]"
              style={{ fontSize: `${baseFontSize}px`, color: baseColor }}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              className="mb-6 list-disc space-y-1.5 pl-6 leading-[1.9]"
              style={{ fontSize: `${baseFontSize}px`, color: baseColor }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className="mb-6 list-decimal space-y-1.5 pl-6 leading-[1.9]"
              style={{ fontSize: `${baseFontSize}px`, color: baseColor }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className="mb-7 rounded-[14px] px-4 py-2.5 leading-[1.9]"
              style={{
                fontSize: `${baseFontSize}px`,
                color: baseColor,
                background: codeTheme.blockquoteBg,
                border: `1px solid ${codeTheme.blockquoteBorder}`,
              }}
            >
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-9 border-0 border-t border-slate-200/90" />,
          code: ({ inline, className, children }) =>
            inline ? (
              <code
                className="rounded-[6px] px-1.5 py-0.5 text-[0.92em]"
                style={{
                  color: codeTheme.inlineText,
                  background: codeTheme.inlineBg,
                  border: `1px solid ${codeTheme.inlineBorder}`,
                  boxShadow: isDark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                {children}
              </code>
            ) : className?.includes("language-mermaid") ? (
              <MermaidBlock chart={String(children).trim()} />
            ) : (
              <code className={className}>{children}</code>
            ),
          pre: ({ children }) => {
            let languageLabel = "Plain Text"

            if (children?.props?.className) {
              const match = String(children.props.className).match(/language-([\w-]+)/)
              if (match?.[1]) {
                languageLabel = match[1]
              }
            }

            return <CodeBlockPreview children={children} codeTheme={codeTheme} languageLabel={languageLabel} t={t} />
          },
          img: ({ src, alt }) => {
            if (!isRenderableImageSource(src)) return null
            const scale = getImageScale(alt)
            const maxWidth = `${Math.max(28, Math.min(scale * 100, 100)).toFixed(0)}%`

            return (
            <figure
              className="mb-10 mx-auto w-fit max-w-full overflow-hidden rounded-[14px] p-0 shadow-none"
              style={{
                background: codeTheme.imageFrame,
                border: `1px solid ${codeTheme.imageBorder}`,
              }}
            >
              <img
                src={src}
                alt={alt && Number.isNaN(Number.parseFloat(String(alt))) ? alt : t("notebook.imageAlt")}
                className="mx-auto block max-h-[24rem] rounded-[13px] object-contain"
                style={{ width: maxWidth }}
              />
              {alt && Number.isNaN(Number.parseFloat(String(alt))) ? (
                <figcaption
                  className="mx-auto mt-2 max-w-[72%] px-1 text-center text-[9.5px] leading-5"
                  style={{
                    color: codeTheme.imageCaption,
                    letterSpacing: "0.01em",
                    opacity: 0.8,
                  }}
                >
                  {alt}
                </figcaption>
              ) : null}
            </figure>
            )
          },
          table: ({ children }) => {
            return (
            <div
              className="mb-8 overflow-x-auto rounded-[14px]"
              style={{
                background: codeTheme.tableBg,
                border: 0,
              }}
            >
              <table className="min-w-full border-collapse text-left" style={{ fontSize: `${Math.max(baseFontSize - 1, 13)}px` }}>
                {children}
              </table>
            </div>
            )
          },
          th: ({ children }) => (
            <th
              className="px-4 py-2 text-[12px] font-medium"
              style={{
                color: baseColor,
                background: codeTheme.tableHeaderBg,
                border: `1px solid ${codeTheme.tableBorder}`,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="px-4 py-2.5"
              style={{
                color: baseColor,
                border: `1px solid ${codeTheme.tableBorder}`,
              }}
            >
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a href={href} className="font-medium text-blue-600 no-underline hover:text-blue-700 hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {normalizedContent || t("notebook.emptyContent")}
      </ReactMarkdown>
      <style>{`
        .notebook-preview h1 { font-size: ${Math.max(baseFontSize + 17, 28)}px; color: ${headingColor}; }
        .notebook-preview h2 { font-size: ${Math.max(baseFontSize + 9, 22)}px; color: ${headingColor}; }
        .notebook-preview h3 { font-size: ${Math.max(baseFontSize + 3, 18)}px; color: ${headingColor}; }
        .notebook-preview pre {
          color: ${codeTheme.baseText} !important;
          font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
        }
        .notebook-preview pre code {
          color: ${codeTheme.baseText} !important;
          font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
        }
        .notebook-preview pre .hljs {
          display: block;
          background: transparent !important;
          color: ${codeTheme.baseText} !important;
        }
        .notebook-preview table {
          border-collapse: collapse;
        }
        .notebook-preview pre .hljs-keyword,
        .notebook-preview pre .hljs-selector-tag,
        .notebook-preview pre .hljs-literal,
        .notebook-preview pre .hljs-section,
        .notebook-preview pre .hljs-link {
          color: ${codeTokens.tokenKeyword} !important;
        }
        .notebook-preview pre .hljs-string,
        .notebook-preview pre .hljs-attr,
        .notebook-preview pre .hljs-attribute,
        .notebook-preview pre .hljs-template-tag {
          color: ${codeTokens.tokenString} !important;
        }
        .notebook-preview pre .hljs-number,
        .notebook-preview pre .hljs-symbol,
        .notebook-preview pre .hljs-bullet {
          color: ${codeTokens.tokenNumber} !important;
        }
        .notebook-preview pre .hljs-title,
        .notebook-preview pre .hljs-built_in,
        .notebook-preview pre .hljs-type {
          color: ${codeTokens.tokenType} !important;
        }
        .notebook-preview pre .hljs-comment,
        .notebook-preview pre .hljs-quote {
          color: ${codeTokens.tokenComment} !important;
          font-style: italic;
        }
        .notebook-preview pre .hljs-variable,
        .notebook-preview pre .hljs-template-variable {
          color: ${codeTokens.tokenVariable} !important;
        }
        .notebook-preview pre .hljs-operator,
        .notebook-preview pre .hljs-punctuation,
        .notebook-preview pre .hljs-subst {
          color: ${codeTokens.tokenOperator} !important;
        }
        .notebook-preview pre code {
          background: transparent !important;
          border: 0 !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  )
}
