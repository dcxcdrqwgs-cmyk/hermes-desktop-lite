// Copyright (c) 2026 MeeJoy

const DEFAULT_FONT_FAMILY =
  "\"Microsoft YaHei\", \"PingFang SC\", \"Hiragino Sans GB\", \"SF Pro Text\", sans-serif"
export const NOTEBOOK_DEFAULT_FONT_SIZE = 15

export function getNotebookAppearanceValues(appearance = {}, isDark = false) {
  return {
    fontFamily: appearance?.fontFamily || DEFAULT_FONT_FAMILY,
    fontSize: appearance?.fontSize || NOTEBOOK_DEFAULT_FONT_SIZE,
    textColor: appearance?.textColor || (isDark ? "#e5e7eb" : "#1f2937"),
    placeholderColor: isDark ? "#6b7280" : "#cbd5e1",
  }
}
