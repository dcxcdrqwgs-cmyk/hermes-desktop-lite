// Copyright (c) 2026 MeeJoy

import { ChevronRightIcon, FileCode2Icon, FolderOpenDotIcon, SearchIcon, XIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { buildTreeNodeState } from "@/components/file-tree-state"
import { cn } from "@/lib/utils"

export function FileTreePanel({
  currentPath,
  query,
  queryActive,
  selectedFilePath,
  rootTreeNode,
  expandedDirectories,
  treeChildrenByPath,
  treeLoadingPaths,
  onQueryChange,
  onToggleDirectory,
  onNavigateDirectory,
  onSelectFile,
  t,
}) {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-card">
      <div className="border-b border-border/45 px-3 py-2.5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("files.searchPlaceholder")}
            className="h-8 w-full rounded-[9px] border-border/60 bg-background/90 pl-8.5 pr-8.5 text-[11px] shadow-none transition-all duration-200 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("common.close")}
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border/35 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] leading-4 text-muted-foreground/76">
            {queryActive ? t("files.treeSearchDescription") : t("files.treeCompactHint")}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 py-2">
          <DirectoryTreeNode
            node={rootTreeNode}
            depth={0}
            currentPath={currentPath}
            selectedFilePath={selectedFilePath}
            expandedDirectories={expandedDirectories}
            treeChildrenByPath={treeChildrenByPath}
            treeLoadingPaths={treeLoadingPaths}
            forceExpanded={queryActive}
            onToggleDirectory={onToggleDirectory}
            onNavigateDirectory={onNavigateDirectory}
            onSelectFile={onSelectFile}
            t={t}
          />

          {queryActive && (treeChildrenByPath[""] || []).length === 0 ? (
            <div className="pt-2">
              <EmptyBlock
                title={t("files.searchEmptyTitle")}
                description={t("files.searchEmptyDescription")}
              />
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}

function EmptyBlock({ title, description }) {
  return (
    <Card className="rounded-[10px] border-border/60 border-dashed py-0 shadow-none">
      <CardContent className="px-4 py-6 text-center">
        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-foreground">{title}</div>
          <p className="text-[11px] leading-5 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DirectoryTreeNode({
  node,
  depth,
  currentPath,
  selectedFilePath,
  expandedDirectories,
  treeChildrenByPath,
  treeLoadingPaths,
  forceExpanded = false,
  onToggleDirectory,
  onNavigateDirectory,
  onSelectFile,
  t,
}) {
  const directoryChildren = treeChildrenByPath[node.path || ""] || []
  const children = directoryChildren.map((child) =>
    buildTreeNodeState({
      path: child.path,
      name: child.name,
      kind: "child",
      isDir: child.isDir,
      extension: child.extension,
      expandedDirectories,
      treeChildrenByPath,
      treeLoadingPaths,
    })
  )

  return (
    <div>
      <div
        className={cn(
          "relative flex items-center gap-1 rounded-[7px] px-1.5 py-0.5 transition-all duration-150",
          depth > 0 && "before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border/40",
          node.isDir
            ? currentPath === node.path
              ? "bg-slate-100/95 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
              : "text-slate-600 hover:bg-slate-100/85 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-50"
            : selectedFilePath === node.path
              ? "bg-primary/8 text-primary ring-1 ring-primary/12 dark:bg-primary/18"
              : "text-slate-600 hover:bg-slate-100/85 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-50"
        )}
      >
        {node.isDir ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void onToggleDirectory(node)
              }}
              disabled={!node.nodeCanExpand}
              className={cn(
                "flex size-4.5 shrink-0 items-center justify-center rounded-[5px] text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200",
                !node.nodeCanExpand && "cursor-default opacity-35 hover:bg-transparent hover:text-muted-foreground"
              )}
            >
              <ChevronRightIcon
                className={cn(
                  "size-3 transition-transform duration-150",
                  node.isExpanded ? "rotate-90" : "",
                  node.isLoading && "animate-pulse"
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => onNavigateDirectory(node.path || "")}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-[7px] px-1 py-1 text-left text-[12px]"
            >
              <span
                className="flex size-5.5 shrink-0 items-center justify-center rounded-[6px] text-slate-500 dark:text-slate-400"
                style={{ marginLeft: `${Math.max(depth - 1, 0) * 12}px` }}
              >
                <FolderOpenDotIcon className={cn("size-3.25", node.isExpanded && "text-primary")} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="truncate text-[11.5px] font-medium">{node.name}</span>
                {node.kind === "child" ? (
                  <div className="truncate text-[8.5px] text-slate-400 dark:text-slate-500">{t("files.directoryLabel")}</div>
                ) : null}
              </div>
            </button>
          </>
        ) : (
          <>
            <span className="flex size-5 shrink-0 items-center justify-center opacity-0">
              <ChevronRightIcon className="size-3.5" />
            </span>
            <button
              type="button"
              onClick={() => onSelectFile(node.path || "")}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-[7px] px-1 py-1 text-left text-[12px]"
            >
              <span
                className="flex size-5.5 shrink-0 items-center justify-center rounded-[6px] text-slate-500 dark:text-slate-400"
                style={{ marginLeft: `${Math.max(depth - 1, 0) * 12}px` }}
              >
                <FileCode2Icon className={cn("size-3.25", selectedFilePath === node.path && "text-primary")} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="truncate text-[11.5px]">{node.name}</span>
                <div className="truncate text-[8.5px] text-slate-400 dark:text-slate-500">
                  {node.extension ? node.extension.toUpperCase() : t("files.fileLabel")}
                </div>
              </div>
            </button>
          </>
        )}
      </div>

      {node.isDir && (forceExpanded || node.isExpanded) && children.length > 0 ? (
        <div>
          {children.map((child) => (
            <DirectoryTreeNode
              key={`tree-${child.path}`}
              node={child}
              depth={depth + 1}
              currentPath={currentPath}
              selectedFilePath={selectedFilePath}
              expandedDirectories={expandedDirectories}
              treeChildrenByPath={treeChildrenByPath}
              treeLoadingPaths={treeLoadingPaths}
              forceExpanded={forceExpanded}
              onToggleDirectory={onToggleDirectory}
              onNavigateDirectory={onNavigateDirectory}
              onSelectFile={onSelectFile}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
