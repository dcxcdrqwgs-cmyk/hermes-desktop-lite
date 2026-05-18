// Copyright (c) 2026 MeeJoy

export function resolveShellLayout({
  view,
  isMobile,
  terminalDockOpen,
}) {
  if (isMobile) {
    return {
      contentMode: view === "chat" ? "chat" : view === "terminal" ? "terminal-focus" : "view",
      showDesktopRightDrawer: false,
      rightDrawerMode: null,
      showTerminalDock: false,
      terminalDockExpanded: false,
      showTerminalFocusPanel: false,
    }
  }

  if (view === "chat") {
    return {
      contentMode: "chat",
      showDesktopRightDrawer: true,
      rightDrawerMode: "tool-activity",
      showTerminalDock: terminalDockOpen,
      terminalDockExpanded: false,
      showTerminalFocusPanel: false,
    }
  }

  if (view === "terminal") {
    return {
      contentMode: "terminal-focus",
      showDesktopRightDrawer: false,
      rightDrawerMode: null,
      showTerminalDock: true,
      terminalDockExpanded: true,
      showTerminalFocusPanel: true,
    }
  }

  return {
    contentMode: "view",
    showDesktopRightDrawer: false,
    rightDrawerMode: null,
    showTerminalDock: terminalDockOpen,
    terminalDockExpanded: false,
    showTerminalFocusPanel: false,
  }
}
