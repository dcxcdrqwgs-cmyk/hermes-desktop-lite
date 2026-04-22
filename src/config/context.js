// 🔧 Context Optimization Configuration
// 调整这些参数来平衡 token 消耗与对话质量

export const CONTEXT_CONFIG = {
  // 最大消息数量（包含系统消息）
  // 建议值：8-16（根据模型上下文窗口调整）
  MAX_MESSAGES: 12,

  // 自动压缩阈值（消息数超过此值显示压缩按钮）
  COMPRESS_THRESHOLD: 10,

  // 自动压缩触发阈值（消息数超过此值自动压缩）
  AUTO_COMPRESS_THRESHOLD: 20,

  // 单条消息最大字符数（防止超大附件/代码块）
  MAX_MESSAGE_LENGTH: 4000,

  // 保留的最近对话轮数（压缩后）
  KEEP_RECENT_TURNS: 4, // 8 条消息（用户+助手）

  // 是否启用自动摘要（压缩早期对话）
  ENABLE_AUTO_SUMMARY: true,

  // 是否在控制台打印优化日志
  DEBUG: false,
};
