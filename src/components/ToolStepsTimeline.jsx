import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const STEPS = [
  { icon: '🤔', text: 'Thinking...', delay: 0 },
  { icon: '⚙️', text: '执行工具...', delay: 600 },
  { icon: '✍️', text: '正在组织回复...', delay: 1400 },
]

export function ToolStepsTimeline() {
  const [visibleSteps, setVisibleSteps] = useState([STEPS[0]])
  const [dots, setDots] = useState('')

  useEffect(() => {
    const timers = []
    STEPS.slice(1).forEach((step) => {
      const t = setTimeout(() => {
        setVisibleSteps(prev => [...prev, step])
      }, step.delay)
      timers.push(t)
    })

    const dotTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 400)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(dotTimer)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start"
    >
      <div className="max-w-[80%]">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 mt-0.5">
            <Avatar size="sm" className="[&_[data-slot=avatar-fallback]]:bg-gradient-to-br [&_[data-slot=avatar-fallback]]:from-primary/30 [&_[data-slot=avatar-fallback]]:to-primary/10 [&_[data-slot=avatar-fallback]]:text-primary">
              <AvatarFallback className="text-xs font-bold">H</AvatarFallback>
            </Avatar>
          </div>

          {/* Timeline Bubble */}
          <div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 border border-border bg-card">
              <div className="flex flex-col gap-1.5">
                {visibleSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="text-sm">{step.icon}</span>
                    <span className="text-sm text-muted-foreground">
                      {step.text}
                      {i === visibleSteps.length - 1 && dots}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Animated thinking indicator */}
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
                <span className="text-xs ml-1 text-muted-foreground">Agent 运行中</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
