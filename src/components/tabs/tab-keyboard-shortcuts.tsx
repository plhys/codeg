"use client"

import { useEffect } from "react"
import { useTabContext } from "@/contexts/tab-context"
import { useWorkspaceView } from "@/contexts/workspace-context"
import { useShortcutSettings } from "@/hooks/use-shortcut-settings"
import { matchShortcutEvent } from "@/lib/keyboard-shortcuts"

/**
 * Non-visual component that handles keyboard shortcuts for tab navigation
 * (next/prev tab, close current tab). Only active when the conversation
 * pane is focused.
 *
 * Extracted from the now-removed TabBar — the sidebar already provides
 * conversation switching and state indication, so the visual tab strip
 * is redundant, but the keyboard shortcuts remain useful.
 */
export function TabKeyboardShortcuts() {
  const { tabs, activeTabId, switchTab, closeTab } = useTabContext()
  const { mode, activePane, filesMaximized } = useWorkspaceView()
  const { shortcuts } = useShortcutSettings()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shouldHandleShortcut =
        mode === "conversation" ||
        (mode === "fusion" && activePane === "conversation" && !filesMaximized)
      if (!shouldHandleShortcut) return

      const isNextTab = matchShortcutEvent(event, shortcuts.next_tab)
      const isPrevTab = matchShortcutEvent(event, shortcuts.prev_tab)
      if (isNextTab || isPrevTab) {
        if (tabs.length < 2 || !activeTabId) return
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId)
        if (currentIndex === -1) return

        event.preventDefault()
        const offset = isNextTab ? 1 : -1
        const nextIndex = (currentIndex + offset + tabs.length) % tabs.length
        switchTab(tabs[nextIndex].id)
        return
      }

      if (!matchShortcutEvent(event, shortcuts.close_current_tab)) return
      if (!activeTabId) return

      event.preventDefault()
      closeTab(activeTabId)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    activePane,
    activeTabId,
    closeTab,
    filesMaximized,
    mode,
    shortcuts.close_current_tab,
    shortcuts.next_tab,
    shortcuts.prev_tab,
    switchTab,
    tabs,
  ])

  return null
}
