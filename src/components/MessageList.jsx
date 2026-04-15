import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserMessage, AIMessage, MotionDiv } from './ChatMessage'
import { ToolStepsTimeline } from './ToolStepsTimeline'

export function MessageList({ messages, pendingContent, isLoading, showToolTimeline }) {
  const viewportRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const isUserScrollingRef = useRef(false)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = viewportRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior })
    }
  }, [])

  useEffect(() => {
    if (!isUserScrollingRef.current) {
      scrollToBottom('smooth')
    }
  }, [messages, isLoading, pendingContent, scrollToBottom])

  const handleScroll = useCallback((e) => {
    const el = e.target
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    shouldAutoScrollRef.current = isAtBottom
    if (!isAtBottom) {
      isUserScrollingRef.current = true
    } else {
      isUserScrollingRef.current = false
    }
  }, [])

  const formatTime = () => {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      ref={viewportRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6"
    >
      <div className="mx-auto space-y-8" style={{ maxWidth: '860px' }}>
        {messages.length === 0 && !isLoading && (
          <EmptyState />
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => {
            const isLast = idx === messages.length - 1
            return (
              <div key={idx}>
                {msg.role === 'user'
                  ? <UserMessage content={msg.content} timestamp={formatTime()} />
                  : <AIMessage content={msg.content} timestamp={formatTime()} />
                }
              </div>
            )
          })}
        </AnimatePresence>

        {/* 工具执行时间线 — AI还没开始输出内容时 */}
        {isLoading && showToolTimeline && !pendingContent && (
          <ToolStepsTimeline />
        )}

        {/* 流式输出中 — pendingContent 有内容则显示 */}
        {isLoading && pendingContent !== '' && (
          <AIMessage content={pendingContent} isStreaming={true} />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  const suggestions = [
    { icon: '🎮', label: 'Build a game', desc: '创建一个经典游戏' },
    { icon: '📄', label: 'Analyze PDF', desc: '分析文档内容' },
    { icon: '📋', label: 'Sprint planning', desc: '制定冲刺计划' },
  ]

  return (
    <MotionDiv direction="up" className="flex flex-col items-center justify-center py-24">
      {/* Logo mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-sidebar-primary border border-sidebar-border"
          style={{
            boxShadow: '0 0 40px oklch(0.488 0.243 264.376 / 0.15)',
          }}>
          <span className="text-2xl font-bold text-sidebar-primary-foreground">H</span>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-2xl font-semibold mb-2 tracking-tight text-foreground">
        Let's build something
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-sm mb-10 text-muted-foreground">
        Hermes agent 已就绪，开始你的对话吧
      </motion.p>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="grid grid-cols-3 gap-3 w-full max-w-lg">
        {suggestions.map((item, i) => (
            <motion.button
              key={i}
              className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl text-sm cursor-pointer bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:shadow-sm"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}>
            <span className="text-xl">{item.icon}</span>
            <div className="text-center">
              <div className="text-xs font-medium text-foreground">{item.label}</div>
              <div className="text-[10px] mt-0.5 text-muted-foreground">{item.desc}</div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </MotionDiv>
  )
}
