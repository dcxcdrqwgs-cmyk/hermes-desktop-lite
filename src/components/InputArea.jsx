import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PaperclipIcon, SendIcon, SquareIcon } from 'lucide-react'
import { Popup } from '../Popup'
import { COMMANDS, SKILLS } from '../data'
import { open } from '@tauri-apps/plugin-dialog'
export function InputArea({ value, onChange, onSend, loading }) {
  const textareaRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)
  const [popup, setPopup] = useState(null)

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    }
  }, [])

  const handleInput = (e) => {
    const v = e.target.value
    onChange(v)
    adjustHeight()
    // 同步 popup 状态：根据输入内容决定是否显示命令/技能弹窗
    if (v.endsWith('/') || v.endsWith('$')) {
      setPopup(v.endsWith('/') ? 'cmd' : 'skill')
    } else if (v.includes('/') || v.includes('$')) {
      setPopup(v.includes('/') ? 'cmd' : 'skill')
    } else {
      setPopup(null)
    }
  }

  // popupQuery 直接从 value 推导（始终与输入同步）
  let popupQuery = ''
  if (popup === 'cmd' && value.includes('/')) {
    popupQuery = value.slice(value.lastIndexOf('/') + 1)
  } else if (popup === 'skill' && value.includes('$')) {
    popupQuery = value.slice(value.lastIndexOf('$') + 1)
  }

  const handleKeyDown = (e) => {
    if (popup) {
      if (e.key === 'Escape') {
        e.preventDefault()
        // 关闭弹窗：删除命令/技能触发符及其参数（保留触发符前的文本）
        if (popup === 'cmd') {
          const slashIdx = value.lastIndexOf('/')
          const newVal = slashIdx >= 0 ? value.slice(0, slashIdx) : value
          onChange(newVal)
          setPopup(null)
        } else if (popup === 'skill') {
          const dollarIdx = value.lastIndexOf('$')
          const newVal = dollarIdx >= 0 ? value.slice(0, dollarIdx) : value
          onChange(newVal)
          setPopup(null)
        }
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        // Enter 由 Popup 内部的搜索框处理选择，这里不干预
        return
      }
      return
    }
    // 弹窗关闭时的正常输入行为
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && value.trim()) {
        onSend()
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    }
  }

  const selectCmd = (item) => {
    const slashIdx = value.lastIndexOf('/')
    // 保留触发符及之前的内容，替换为命令 + 空格
    const prefix = slashIdx >= 0 ? value.slice(0, slashIdx + 1) : ''
    onChange(prefix + item.cmd + ' ')
    setPopup(null) // 关闭弹窗
  }

  const selectSkill = (item) => {
    const dollarIdx = value.lastIndexOf('$')
    const prefix = dollarIdx >= 0 ? value.slice(0, dollarIdx + 1) : ''
    onChange(prefix + '$' + item.name + ' ')
    setPopup(null) // 关闭弹窗
  }

  // Popup 搜索框输入变化时更新 value（保留触发符，替换查询部分）
  const handleQueryChange = (newQuery) => {
    if (popup === 'cmd') {
      const slashIdx = value.lastIndexOf('/')
      const prefix = slashIdx >= 0 ? value.slice(0, slashIdx + 1) : '/'
      onChange(prefix + newQuery)
    } else if (popup === 'skill') {
      const dollarIdx = value.lastIndexOf('$')
      const prefix = dollarIdx >= 0 ? value.slice(0, dollarIdx + 1) : '$'
      onChange(prefix + newQuery)
    }
  }

  const handleFileAttach = async () => {
    try {
      const path = await open({ multiple: false, directory: false })
      if (!path) return
      const fname = path.split('/').pop()
      onChange(value + `[文件: ${fname}] `)
    } catch (e) { console.error(e) }
  }

  const canSend = !loading && value.trim().length > 0

  return (
    <div className="px-4 pb-4">
      <div
        className={cn(
          "mx-auto overflow-visible relative bg-card border rounded-2xl transition-all duration-200",
          isFocused
            ? "border-ring shadow-[0_0_0_3px_var(--color-ring)/20,0_8px_32px_rgba(0,0,0,0.15)]"
            : "border-border shadow-sm dark:shadow-black/30"
        )}
        style={{
          maxWidth: '860px',
        }}
      >

        {/* Popup: commands */}
        {/* Popup: commands */}
        <AnimatePresence>
          {popup === 'cmd' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="px-3 pt-3">
              <Popup
                items={COMMANDS}
                onSelect={selectCmd}
                onClose={() => {}}
                query={popupQuery}
                onQueryChange={handleQueryChange}
                filterFn={(item, q) =>
                  !q ||
                  item.cmd.toLowerCase().includes(q.toLowerCase()) ||
                  (item.desc_zh && item.desc_zh.includes(q)) ||
                  (item.desc_en && item.desc_en.toLowerCase().includes(q.toLowerCase()))
                }
                renderItem={item => (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.desc_zh || item.desc_en}</span>
                    <span className="mono text-xs text-muted-foreground">{item.cmd}</span>
                  </div>
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Popup: skills */}
        <AnimatePresence>
          {popup === 'skill' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="px-3 pt-3">
              <Popup
                items={SKILLS}
                onSelect={selectSkill}
                onClose={() => {}}
                query={popupQuery}
                onQueryChange={handleQueryChange}
                filterFn={(item, q) =>
                  !q ||
                  item.name.includes(q) ||
                  (item.desc_zh && item.desc_zh.includes(q)) ||
                  (item.desc_en && item.desc_en.toLowerCase().includes(q.toLowerCase())) ||
                  item.category.includes(q)
                }
                renderItem={item => (
                  <div className="flex items-center gap-3">
                    <span className="mono text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.desc_zh}</span>
                    <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{item.category}</span>
                  </div>
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="flex items-end px-4 pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            disabled={loading}
            rows={1}
            placeholder="输入消息，发送给你的 Agent..."
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none text-foreground placeholder:text-muted-foreground"
            style={{ maxHeight: '160px' }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleFileAttach}
              className="text-muted-foreground hover:text-foreground"
              title="添加文件"
            >
              <PaperclipIcon width={15} height={15} />
            </Button>

            {/* Hint badges */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-primary/15 text-primary">
                / 命令
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-purple-500/15 text-purple-500">
                $ 技能
              </span>
            </div>
          </div>

          {loading ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={onSend}
              className="gap-1.5"
            >
              <SquareIcon width={12} height={12} fill="currentColor" />
              <span>停止</span>
            </Button>
          ) : (
            <Button
              onClick={onSend}
              disabled={!canSend}
              size="sm"
              className="gap-1.5"
            >
              <SendIcon width={14} height={14} />
              <span>发送</span>
            </Button>
          )}
        </div>

        {/* Hint */}
        <div className="px-4 pb-2.5 text-center">
          <span className="mono text-[10px] text-muted-foreground">
            Enter 发送 · Shift+Enter 换行 · / 命令 · $ 技能
          </span>
        </div>
      </div>
    </div>
  )
}
