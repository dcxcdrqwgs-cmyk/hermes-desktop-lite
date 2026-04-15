import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const MotionDiv = ({ children, className, direction = "up", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: direction === "up" ? 10 : -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay }}
    className={className}
  >
    {children}
  </motion.div>
)

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function StreamingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.7, repeat: Infinity }}
      className="inline-block w-0.5 h-3.5 align-middle ml-0.5 rounded-full bg-sidebar-primary"
    />
  )
}

export function UserMessage({ content, timestamp }) {
  return (
    <MotionDiv direction="up" className="flex justify-end">
      <div className="max-w-[75%] group">
        <div className="h-8 mb-1" />
        <div className="relative">
          <div className="rounded-2xl rounded-br-md px-4 py-3 bg-primary/10 border border-primary/20">
            <p className="text-sm leading-relaxed text-foreground" style={{ whiteSpace: 'pre-wrap' }}>
              {content}
            </p>
          </div>
          <div className="absolute -bottom-4 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="mono text-[10px] text-muted-foreground">{timestamp}</span>
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}

export function AIMessage({ content, timestamp, isStreaming = false }) {
  return (
    <MotionDiv direction="up" className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 mt-0.5">
            <Avatar size="sm" className="[&_[data-slot=avatar-fallback]]:bg-gradient-to-br [&_[data-slot=avatar-fallback]]:from-primary/30 [&_[data-slot=avatar-fallback]]:to-primary/10 [&_[data-slot=avatar-fallback]]:text-primary">
              <AvatarFallback className="text-xs font-bold">H</AvatarFallback>
            </Avatar>
          </div>

          {/* Bubble */}
          <div className="flex-1">
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 border border-border/60 bg-card">
            <p className="text-sm leading-relaxed text-foreground" style={{ whiteSpace: 'pre-wrap' }}>
              {content}
                {isStreaming && <StreamingCursor />}
              </p>
          </div>
            {timestamp && (
              <div className="mt-1.5 px-1">
                <span className="mono text-[10px] text-muted-foreground">{timestamp}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}

export { ThinkingDots, StreamingCursor, MotionDiv }
