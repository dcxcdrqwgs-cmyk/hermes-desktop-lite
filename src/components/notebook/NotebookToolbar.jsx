// Copyright (c) 2026 MeeJoy

import {
  BoldIcon,
  ItalicIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Code2Icon,
  LinkIcon,
  MinusIcon,
  PilcrowIcon,
  PlusCircleIcon,
  ChevronDownIcon,
  ImageIcon,
  TableIcon,
  SigmaIcon,
  ListTodoIcon,
  SparklesIcon,
  EllipsisVerticalIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/i18n.jsx"

export function NotebookToolbar({
  onToolAction,
  activeToolState,
  onAiTrigger,
  onExportMarkdown,
  onExportWord,
  onCopyFullText,
}) {
  const { t } = useI18n()
  const preserveSelection = (event) => {
    event.preventDefault()
  }

  const shortcuts = [
    { group: "heading", label: t("notebookToolbar.heading1Short"), title: t("notebookToolbar.heading1"), icon: Heading1Icon, action: "heading-1" },
    { group: "heading", label: t("notebookToolbar.heading2Short"), title: t("notebookToolbar.heading2"), icon: Heading2Icon, action: "heading-2" },
    { group: "heading", label: t("notebookToolbar.paragraphShort"), title: t("notebookToolbar.paragraph"), icon: PilcrowIcon, action: "paragraph" },
    { group: "style", label: "B", title: t("notebookToolbar.bold"), icon: BoldIcon, action: "bold", active: activeToolState?.bold },
    { group: "style", label: "I", title: t("notebookToolbar.italic"), icon: ItalicIcon, action: "italic", active: activeToolState?.italic },
    { group: "style", label: t("notebookToolbar.linkShort"), title: t("notebookToolbar.link"), icon: LinkIcon, action: "link", active: activeToolState?.link },
    { group: "block", label: t("notebookToolbar.bulletShort"), title: t("notebookToolbar.bulletList"), icon: ListIcon, action: "bullet-list" },
    { group: "block", label: t("notebookToolbar.orderedShort"), title: t("notebookToolbar.orderedList"), icon: ListOrderedIcon, action: "ordered-list" },
    { group: "block", label: t("notebookToolbar.quoteShort"), title: t("notebookToolbar.quote"), icon: QuoteIcon, action: "quote" },
    { group: "block", label: t("notebookToolbar.codeShort"), title: t("notebookToolbar.codeBlock"), icon: Code2Icon, action: "code-block" },
    { group: "block", label: t("notebookToolbar.dividerShort"), title: t("notebookToolbar.divider"), icon: MinusIcon, action: "divider" },
  ]

  const shortcutGroups = [
    shortcuts.filter((item) => item.group === "heading"),
    shortcuts.filter((item) => item.group === "style"),
    shortcuts.filter((item) => item.group === "block"),
  ]

  const insertGroups = [
    {
      label: "文字",
      items: [
        { label: "Text 正文", action: "paragraph", icon: PilcrowIcon },
        { label: "Heading 1 一级标题", action: "heading-1", icon: Heading1Icon },
        { label: "Heading 2 二级标题", action: "heading-2", icon: Heading2Icon },
        { label: "Heading 3 三级标题", action: "heading-3", icon: Heading3Icon },
        { label: "Quote 引用", action: "quote", icon: QuoteIcon },
        { label: "Divider 分隔线", action: "divider", icon: MinusIcon },
      ],
    },
    {
      label: "列表",
      items: [
        { label: "Bullet List 无序列表", action: "bullet-list", icon: ListIcon },
        { label: "Ordered List 有序列表", action: "ordered-list", icon: ListOrderedIcon },
        { label: "Task List 任务列表", action: "task-list", icon: ListTodoIcon },
      ],
    },
    {
      label: "高级",
      items: [
        { label: "Image 图片", action: "image", icon: ImageIcon },
        { label: "Code Block 代码块", action: "code-block", icon: Code2Icon },
        { label: "Table 表格", action: "table", icon: TableIcon },
        { label: "Math 公式", action: "math", icon: SigmaIcon },
      ],
    },
  ]

  return (
    <div className="border-b border-slate-200/75 bg-[rgba(255,255,255,0.94)] px-3 py-1.5 backdrop-blur-xl dark:border-slate-700/90 dark:bg-[rgba(28,29,33,0.9)]">
      <div className="flex min-h-9 items-center gap-1.5 overflow-x-auto">
        <div className="flex shrink-0 items-center gap-1.5 pr-1">
          <button
            type="button"
            onMouseDown={preserveSelection}
            onClick={() => onAiTrigger?.()}
            className="inline-flex h-7 items-center gap-1 rounded-[8px] px-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100/90 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            title={t("notebookToolbar.aiTrigger")}
          >
            <SparklesIcon className="size-3.5 text-sky-500" />
            <span className="select-none bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 bg-clip-text text-[14px] font-bold leading-none text-transparent">
              Ai
            </span>
          </button>
          <div className="h-5 w-px bg-border/70" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onMouseDown={preserveSelection}
                className="h-7 rounded-[8px] px-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:bg-white/10"
                title="插入"
              >
                <PlusCircleIcon className="size-3.5 text-blue-500" />
                插入
                <ChevronDownIcon className="size-3 text-slate-400 dark:text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[15rem] rounded-[10px] border-border/65 bg-[rgba(247,248,250,0.96)] p-1.5 dark:border-slate-700 dark:bg-[rgba(28,29,33,0.96)]">
              {insertGroups.map((group, index) => (
                <DropdownMenuGroup key={group.label}>
                  {index > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}
                  <DropdownMenuLabel className="px-2 pb-1 pt-0.5 text-[9.5px] tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    {group.label}
                  </DropdownMenuLabel>
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.action}
                      onMouseDown={preserveSelection}
                      onSelect={() => onToolAction?.(item.action)}
                      className="rounded-[8px] px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-100"
                    >
                      <item.icon className="size-3.5 text-slate-500 dark:text-slate-400" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex min-w-max items-center gap-0.5">
          {shortcutGroups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={groupIndex === 0 ? "flex items-center gap-0.5" : "flex items-center gap-0.5 border-l border-border/50 pl-1.5 dark:border-slate-700/85"}
            >
              {group.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onMouseDown={preserveSelection}
                  onClick={() => onToolAction?.(item.action)}
                  className={`flex h-8 min-w-[52px] flex-col items-center justify-center gap-[1px] rounded-[8px] px-1.5 text-[9.5px] font-medium shadow-none transition-all ${
                    item.active
                      ? "bg-slate-900 text-white ring-1 ring-slate-900/10 shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-slate-800 hover:text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      : "text-slate-500 hover:bg-slate-100/95 hover:text-slate-900 active:scale-[0.985] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                  title={item.title}
                >
                  <item.icon className="size-3.5" />
                  <span className="leading-none tracking-[0.01em]">{item.label}</span>
                </Button>
              ))}
            </div>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 border-l border-slate-200/75 pl-2 dark:border-slate-700/90">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onMouseDown={preserveSelection}
                className="h-7 rounded-[8px] px-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100/90 dark:text-slate-200 dark:hover:bg-white/10"
                title={t("notebookToolbar.more")}
              >
                {t("notebookToolbar.more")}
                <EllipsisVerticalIcon className="size-3.5 text-slate-400 dark:text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11.5rem] rounded-[10px] border-border/65 bg-[rgba(247,248,250,0.96)] p-1.5 dark:border-slate-700 dark:bg-[rgba(28,29,33,0.96)]">
              <DropdownMenuItem
                onMouseDown={preserveSelection}
                onSelect={() => onExportMarkdown?.()}
                className="rounded-[8px] px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-100"
              >
                {t("notebookToolbar.exportMarkdown")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={preserveSelection}
                onSelect={() => onExportWord?.()}
                className="rounded-[8px] px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-100"
              >
                {t("notebookToolbar.exportWord")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={preserveSelection}
                onSelect={() => onCopyFullText?.()}
                className="rounded-[8px] px-2 py-1.5 text-[11px] text-slate-700 dark:text-slate-100"
              >
                {t("notebookToolbar.copyFullText")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
