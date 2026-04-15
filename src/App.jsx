import { useState, useRef, useEffect } from 'react'
import { sendChatStream, onChatToken, onChatDone, getConfig } from './api'
import SkillsView from './SkillsView'
import MemoryView from './MemoryView'
import TaskView from './TaskView'
import SettingsModal from './SettingsModal'
import { I18nProvider } from './i18n'
import { MessageList } from './components/MessageList'
import { InputArea } from './components/InputArea'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  SunIcon, MoonIcon, GlobeIcon, SettingsIcon,
  ChevronDownIcon, CheckIcon, PlusIcon,
  MessageSquareIcon, PinIcon, Trash2Icon,
  PanelLeftCloseIcon, PanelLeftIcon,
  SparklesIcon, BrainIcon, ListTodoIcon,
  ChevronRightIcon, CircleUserIcon,
  ChevronsLeft,
  GripVertical,
} from 'lucide-react'

const MotionDiv = motion.div

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}

function AppInner() {
  const [theme, setTheme] = useState(null) // null = loading
  const [view, setView] = useState('chat')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [pendingContent, setPendingContent] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showToolTimeline, setShowToolTimeline] = useState(false)
  const [conversations, setConversations] = useState([
    { id: 'c1', title: '项目报告生成', pinned: true, date: '今天' },
    { id: 'c2', title: 'SQL 查询优化', pinned: false, date: '今天' },
    { id: 'c3', title: '会议纪要整理', pinned: false, date: '昨天' },
    { id: 'c4', title: '代码审查', pinned: false, date: '本周' },
    { id: 'c5', title: '技术方案讨论', pinned: false, date: '本周' },
  ])
  const [activeConvId, setActiveConvId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [agent, setAgent] = useState('hermes-agent')
  const unlistenTokenRef = useRef(null)
  const unlistenDoneRef = useRef(null)
  const safeAgent = agent || 'hermes-agent'

  // Load persisted theme from config
  useEffect(() => {
    getConfig().then(cfg => {
      setTheme(cfg.theme)
      setAgent(cfg.current_agent || 'hermes-agent')
    }).catch(() => {
      setTheme('light')
      setAgent('hermes-agent')
    })
  }, [])

  // Apply theme class to <html>
  useEffect(() => {
    if (theme) {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
    }
  }, [theme])

  useEffect(() => {
    return () => {
      unlistenTokenRef.current?.()
      unlistenDoneRef.current?.()
    }
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setPendingContent('')
    setLoading(true)
    setShowToolTimeline(true)

    let accumulated = ''

    try {
      unlistenTokenRef.current?.()
      unlistenDoneRef.current?.()

      setShowToolTimeline(true)

      unlistenTokenRef.current = await onChatToken((token) => {
        accumulated += token
        setPendingContent(accumulated)
      })

      unlistenDoneRef.current = await onChatDone(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: accumulated }])
        setPendingContent('')
        setLoading(false)
        setShowToolTimeline(false)
      })

      await sendChatStream([...messages, userMsg])

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `错误: ${e.message}` }])
      setPendingContent('')
      setLoading(false)
      setShowToolTimeline(false)
    }
  }

  const newConversation = () => {
    const id = 'c_' + Date.now()
    const title = `新对话 ${conversations.filter(c => c.date === '今天').length + 1}`
    const newConv = { id, title, pinned: false, date: '今天' }
    setConversations(prev => [newConv, ...prev])
    setActiveConvId(id)
    setMessages([])
    setView('chat')
  }

  const deleteConversation = (id) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConvId === id) {
      setActiveConvId(null)
      setMessages([])
    }
  }

  const togglePin = (id) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, pinned: !c.pinned } : c
    ))
  }

  const selectConversation = (id) => {
    setActiveConvId(id)
    setMessages([])
    setView('chat')
  }

  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  }

  const pageTransition = {
    type: 'tween',
    ease: [0.22, 1, 0.36, 1],
    duration: 0.25,
  }

  const AGENTS = [
    { id: 'hermes-agent', label: 'Hermes Agent', desc: '默认助手' },
    { id: 'coder', label: 'Coder', desc: '代码专家' },
    { id: 'data-expert', label: 'Data Expert', desc: '数据分析' },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* ─── Top Bar ─── */}
      <header className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-50 bg-sidebar border-b border-sidebar-border shadow-sm">
        {/* Left: Logo + App Name */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-sidebar-primary border border-sidebar-border">
            <span className="text-xs font-semibold text-sidebar-primary-foreground">H</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Hermes</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
            lite
          </span>
        </div>

        {/* Center: Agent Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 font-normal">
                <Avatar size="sm" className="[&_[data-slot=avatar-fallback]]:bg-primary/20 [&_[data-slot=avatar-fallback]]:text-primary">
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-bold">
                  {safeAgent[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              <span className="text-sm">{AGENTS.find(a => a.id === safeAgent)?.label ?? safeAgent}</span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-52">
            {AGENTS.map(a => (
              <DropdownMenuItem
                key={a.id}
                onClick={() => setAgent(a.id)}
                className="gap-2.5"
              >
                <Avatar size="sm" className="[&_[data-slot=avatar-fallback]]:bg-primary/20 [&_[data-slot=avatar-fallback]]:text-primary">
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-bold">
                    {a.label[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{a.label}</span>
                  <span className="text-xs text-muted-foreground">{a.desc}</span>
                </div>
                {safeAgent === a.id && <CheckIcon className="ml-auto size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-normal text-muted-foreground">
            <GlobeIcon width={14} height={14} />
            <span>中文</span>
          </Button>

          <IconBtn onClick={() => setTheme(v => v === 'dark' ? 'light' : 'dark')} title="切换主题">
            {theme === 'dark'
              ? <SunIcon width={15} height={15} />
              : <MoonIcon width={15} height={15} />
            }
          </IconBtn>

          <IconBtn onClick={() => setSettingsOpen(true)} title="设置">
            <SettingsIcon width={15} height={15} />
          </IconBtn>
        </div>
      </header>

      {/* ─── Main Layout ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <Sidebar
          view={view}
          onViewChange={setView}
          conversations={conversations}
          activeConvId={activeConvId}
          onSelectConversation={selectConversation}
          onDeleteConversation={deleteConversation}
          onTogglePin={togglePin}
          onNewConversation={newConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* ─── Content Area ─── */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-background">
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={view}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="absolute inset-0 overflow-hidden">
                {view === 'skills' && <SkillsView />}
                {view === 'memory' && <MemoryView />}
                {view === 'tasks' && <TaskView />}
                {view === 'chat' && (
                  <div className="h-full flex flex-col">
                    <MessageList messages={messages} pendingContent={pendingContent} isLoading={loading} showToolTimeline={showToolTimeline} />
                  </div>
                )}
              </MotionDiv>
            </AnimatePresence>
          </div>

          {/* Input Area — only for chat */}
          <AnimatePresence>
            {view === 'chat' && (
              <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                <InputArea
                  value={input}
                  onChange={setInput}
                  onSend={send}
                  loading={loading}
                />
              </MotionDiv>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal onClose={() => setSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── TopBar Icon Button ───
function IconBtn({ onClick, title, children }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      title={title}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </Button>
  )
}

// ─── Sidebar ───
function Sidebar({ view, onViewChange, conversations, activeConvId, onSelectConversation, onDeleteConversation, onTogglePin, onNewConversation, searchQuery, onSearchChange }) {
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(220)
  const [isDragging, setIsDragging] = useState(false)

  // Use effect to add/remove global mouse events
  useEffect(() => {
    if (isDragging) {
      const handleResize = (e) => {
        const newWidth = Math.min(Math.max(e.clientX, 160), 400)
        setSidebarWidth(newWidth)
      }
      const handleMouseUp = () => setIsDragging(false)

      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  const NAV = [
    { id: 'chat', label: '对话', icon: <MessageSquareIcon width={16} height={16} /> },
    { id: 'memory', label: '记忆', icon: <BrainIcon width={16} height={16} /> },
    { id: 'skills', label: '技能', icon: <SparklesIcon width={16} height={16} /> },
    { id: 'tasks', label: '任务', icon: <ListTodoIcon width={16} height={16} /> },
  ]

  const filtered = searchQuery
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations
  const pinned = filtered.filter(c => c.pinned)
  const grouped = filtered.reduce((acc, c) => {
    if (c.pinned) return acc
    if (!acc[c.date]) acc[c.date] = []
    acc[c.date].push(c)
    return acc
  }, {})

  const toggleWidth = collapsed ? 64 : sidebarWidth

  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden flex-shrink-0 bg-sidebar border-r border-sidebar-border relative",
        !isDragging && "transition-all duration-300 ease-in-out"
      )}
      style={{ width: toggleWidth }}
    >
      {/* ─── Resize Handle ─── */}
      <div
        className="absolute top-0 right-0 w-5 h-full cursor-ew-resize z-10 group flex items-center justify-end pe-0.5"
        onMouseDown={(e) => { e.preventDefault(); setIsDragging(true) }}
      >
        <GripVertical
          size={18}
          className={cn(
            "transition-all duration-150",
            isDragging ? "text-sidebar-primary" : "text-sidebar-primary/60 group-hover:text-sidebar-primary group-hover:scale-110"
          )}
        />
      </div>
      {/* ─── Header with Toggle ─── */}
      <div className="h-12 flex items-center px-3 flex-shrink-0 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Hermes
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          className={cn(
            "ml-auto text-muted-foreground hover:text-sidebar-foreground transition-all",
            collapsed && "ml-0 mx-auto"
          )}
        >
          {collapsed
            ? <PanelLeftIcon width={16} height={16} />
            : <PanelLeftCloseIcon width={16} height={16} />
          }
        </Button>
      </div>

      {/* ─── Nav Tabs ─── */}
      <nav className={cn("p-2 flex-shrink-0", collapsed ? "space-y-1" : "space-y-0.5")}>
        {NAV.map(({ id, label, icon }) => (
          <div key={id} className="relative">
            <Button
              variant="ghost"
              className={cn(
                "h-auto rounded-lg transition-all",
                collapsed ? "w-10 h-10 mx-auto p-0 justify-center" : "w-full justify-start gap-2.5 px-3 py-2.5 text-sm font-medium"
              )}
              onClick={() => onViewChange(id)}
              title={collapsed ? label : undefined}
            >
              <span className={view === id ? 'text-sidebar-primary' : 'text-muted-foreground'}>{icon}</span>
              {!collapsed && (
                <span className={cn("mono", view === id ? 'text-sidebar-foreground' : 'text-muted-foreground')}>{label}</span>
              )}
              {view === id && !collapsed && (
                <MotionDiv
                  layoutId="sidebar-nav-indicator"
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sidebar-primary"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </Button>
          </div>
        ))}
      </nav>

      {/* ─── Divider ─── */}
      {!collapsed && (
        <div className="mx-3 flex-shrink-0 border-t border-sidebar-border" />
      )}

      {/* ─── New Conv Button (collapsed) ─── */}
      {collapsed && (
        <div className="p-2 flex-shrink-0 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNewConversation}
            title="新建对话"
            className="w-10 h-10 mx-auto p-0 text-muted-foreground hover:text-sidebar-foreground transition-colors"
          >
            <PlusIcon width={16} height={16} />
          </Button>
        </div>
      )}

      {/* ─── Conversation List (hidden when collapsed) ─── */}
      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto p-2 pt-3">
            <div className="px-3 mb-2.5">
              <span className="mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                历史对话
              </span>
            </div>

            {/* Search */}
            <div className="px-3 mb-2.5">
              <div className="relative focus-within:[&_svg]:text-foreground">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground transition-colors" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-full pl-7.5 pr-2.5 py-1.5 rounded-lg text-[12px] outline-none bg-input border border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:bg-input/80 transition-colors focus:ring-1 focus:ring-ring"
                  placeholder="搜索..."
                />
              </div>
            </div>

            {/* Pinned */}
            {pinned.length > 0 && (
              <div className="mb-2">
                <div className="mono px-3 py-1 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L12 12M8 6L12 2L16 6M5 22L19 8"/></svg>
                  置顶
                </div>
                {pinned.map(item => (
                  <ConvItem
                    key={item.id}
                    conv={item}
                    isActive={activeConvId === item.id}
                    onSelect={() => onSelectConversation(item.id)}
                    onDelete={() => onDeleteConversation(item.id)}
                    onTogglePin={() => onTogglePin(item.id)}
                  />
                ))}
              </div>
            )}

            {/* Grouped by date */}
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="mb-2">
                <div className="mono px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {date}
                </div>
                {items.map(item => (
                  <ConvItem
                    key={item.id}
                    conv={item}
                    isActive={activeConvId === item.id}
                    onSelect={() => onSelectConversation(item.id)}
                    onDelete={() => onDeleteConversation(item.id)}
                    onTogglePin={() => onTogglePin(item.id)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* ─── New Conversation Button ─── */}
          <div className="p-3 flex-shrink-0 border-t border-sidebar-border">
            <Button
              variant="outline"
              className="mono w-full gap-2 text-muted-foreground hover:text-sidebar-foreground transition-colors"
              onClick={onNewConversation}
            >
              <PlusIcon width={14} height={14} />
              新建对话
            </Button>
          </div>
        </>
      )}

      {/* ─── User Area ─── */}
      <div
        className="p-3 flex-shrink-0 flex items-center gap-2.5 border-t border-sidebar-border"
        title={collapsed ? '用户信息' : undefined}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-sidebar-primary border border-sidebar-border">
          <CircleUserIcon width={14} height={14} className="text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="mono text-xs font-medium truncate text-sidebar-foreground">用户</span>
            <span className="mono text-[10px] truncate text-muted-foreground">hermes@local</span>
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Conversation Item ───
function ConvItem({ conv, isActive, onSelect, onDelete, onTogglePin }) {
  return (
    <div className="relative group">
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 px-3 py-2 h-auto text-[13px] rounded-lg font-normal",
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
        )}
        onClick={onSelect}
      >
        <MessageSquareIcon width={12} height={12} className="shrink-0 opacity-60" />
        <span className="mono truncate flex-1 text-left">{conv.title}</span>
      </Button>

      {/* Hover Actions */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 translate-x-2 group-hover:translate-x-0">
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-sidebar-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); onTogglePin() }}
          title={conv.pinned ? '取消置顶' : '置顶'}
        >
          <PinIcon width={11} height={11} fill={conv.pinned ? 'currentColor' : 'none'} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive transition-colors"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="删除"
        >
          <Trash2Icon width={11} height={11} />
        </Button>
      </div>
    </div>
  )
}
