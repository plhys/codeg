"use client"

const QUICK_ACTIONS_TAB_KEY = "workspace:quick-actions-tab"

/** Which skill group the welcome-page quick actions show. */
export type QuickActionsTab = "office" | "design" | "coding"

export function loadQuickActionsTab(): QuickActionsTab {
  if (typeof window === "undefined") return "office"
  try {
    const raw = localStorage.getItem(QUICK_ACTIONS_TAB_KEY)
    if (raw === "office" || raw === "design" || raw === "coding") return raw
  } catch {
    /* ignore */
  }
  return "office"
}

export function saveQuickActionsTab(value: QuickActionsTab): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(QUICK_ACTIONS_TAB_KEY, value)
  } catch {
    /* ignore */
  }
}
