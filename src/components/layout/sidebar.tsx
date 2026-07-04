"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  FolderGit2,
  FolderOpenDot,
  FolderPlus,
  Rocket,
  Search,
  SquarePen,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useActiveFolder } from "@/contexts/active-folder-context"
import { useAppWorkspace } from "@/contexts/app-workspace-context"
import { useSidebarContext } from "@/contexts/sidebar-context"
import { useTabContext } from "@/contexts/tab-context"
import { useSearchDialog } from "@/contexts/search-dialog-context"
import { useAutomationsView } from "@/contexts/automations-view-context"
import { useWorkbenchRoute } from "@/contexts/workbench-route-context"
import {
  SidebarConversationList,
  type SidebarConversationListHandle,
} from "@/components/conversations/sidebar-conversation-list"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CloneDialog } from "@/components/layout/clone-dialog"
import { DirectoryBrowserDialog } from "@/components/shared/directory-browser-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useIsMac } from "@/hooks/use-is-mac"
import { useShortcutSettings } from "@/hooks/use-shortcut-settings"
import { formatShortcutLabel } from "@/lib/keyboard-shortcuts"
import { openProjectBootWindow } from "@/lib/api"
import { isDesktop, openFileDialog } from "@/lib/platform"
import { getActiveRemoteConnectionId } from "@/lib/transport"
import {
  loadShowCompleted,
  loadSortMode,
  loadSectionOrder,
  type SidebarSortMode,
  type SidebarSectionOrder,
} from "@/lib/sidebar-view-mode-storage"
import { cn } from "@/lib/utils"

// Keyboard-shortcut hint at the trailing edge of the New chat / Search rows.
// Mirrors the folder count badge exactly — same chip (0.9375rem height,
// 0.3125rem radius, bg-primary/10, text-primary, 0.625rem text) per the request
// to match it. That pairing is also solidly legible (text-primary on
// primary/10 ≈ 14:1 light / 11:1 dark), unlike the muted-on-muted kbd it
// replaces (4.34:1). Revealed only on hover / keyboard focus of its row (each
// row is a `group`); font-mono renders the shortcut glyphs cleanly.
const SHORTCUT_BADGE_CLASS = cn(
  "ml-auto inline-flex h-[0.9375rem] shrink-0 items-center justify-center",
  "rounded-[0.3125rem] bg-primary/10 px-[0.25rem]",
  "font-mono text-[0.625rem] font-medium leading-none text-primary",
  "opacity-0 transition-opacity duration-150",
  "group-hover:opacity-100 group-focus-visible:opacity-100"
)

/**
 * A fixed top-of-sidebar action / route row. `active` marks the row as the
 * current workbench route (selected styling); `trailing` carries a shortcut hint
 * or a count badge. Extracting this keeps every fixed nav item — and any future
 * route — on one geometry instead of copy-pasting the className. Each row is a
 * `group` so a `group-hover`-revealed trailing element works.
 */
function SidebarNavButton({
  icon: Icon,
  label,
  onClick,
  active,
  trailing,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 w-full items-center gap-[0.4375rem] rounded-full pl-[0.4375rem] pr-1.5",
        "text-[0.9375rem] text-sidebar-foreground outline-none",
        "transition-colors duration-150 hover:bg-sidebar-accent",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        active && "bg-sidebar-primary/8"
      )}
    >
      <Icon className="h-[0.875rem] w-[0.875rem] shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
      {trailing}
    </button>
  )
}

export function Sidebar() {
  const t = useTranslations("Folder.sidebar")
  const { isOpen, toggle } = useSidebarContext()
  const { activeFolder } = useActiveFolder()
  const { openNewConversationTab, openChatModeTab } = useTabContext()
  const { setOpen: setSearchOpen } = useSearchDialog()
  const { unseenFailures } = useAutomationsView()
  const { routeId, setRoute, openConversations } = useWorkbenchRoute()
  const isMac = useIsMac()
  const { shortcuts } = useShortcutSettings()
  const isMobile = useIsMobile()
  const listRef = useRef<SidebarConversationListHandle>(null)

  const [showCompleted, setShowCompleted] = useState(false)
  const [sortMode, setSortMode] = useState<SidebarSortMode>("created")
  const [sectionOrder, setSectionOrder] =
    useState<SidebarSectionOrder>("folders-first")
  // Sidebar view toggle: "chats" = folderless conversations, "projects" = folders
  const [sidebarView, setSidebarView] = useState<"chats" | "projects">("chats")
  const searchShortcutLabel = formatShortcutLabel(
    shortcuts.toggle_search,
    isMac
  )
  const newConversationShortcutLabel = formatShortcutLabel(
    shortcuts.new_conversation,
    isMac
  )

  useEffect(() => {
    // Hydrate from localStorage after mount to keep SSR/CSR markup consistent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowCompleted(loadShowCompleted())
    setSortMode(loadSortMode())
    setSectionOrder(loadSectionOrder())
  }, [])

  const handleNewConversation = useCallback(() => {
    // Starting a conversation always returns to the conversation workspace (in
    // case a route like Automations was taking over the content region).
    openConversations()
    // Defense-in-depth: with no active folder (e.g. a cold start that recovered
    // to nothing, or all folders closed) fall back to folderless chat mode
    // rather than no-op, so this entry point is never a dead end.
    if (!activeFolder) {
      openChatModeTab()
      return
    }
    openNewConversationTab(activeFolder.id, activeFolder.path)
  }, [activeFolder, openChatModeTab, openNewConversationTab, openConversations])

  // Folder actions pinned to the sidebar's bottom-left corner, paired with the
  // view-options buttons on the bottom-right. These mirror NewFolderDropdown's
  // three entries but rendered as standalone icon buttons (no dropdown) so they
  // sit flat in the bottom row. CloneDialog + DirectoryBrowserDialog are owned
  // here; openProjectBootWindow opens a separate window.
  const tFolder = useTranslations("Folder.folderNameDropdown")
  const { openFolder } = useAppWorkspace()
  const [cloneOpen, setCloneOpen] = useState(false)
  const [browserOpen, setBrowserOpen] = useState(false)

  const handleOpenFolder = useCallback(async () => {
    // Same remote-vs-local logic as NewFolderDropdown / FolderTitleBar: the
    // native Tauri dialog browses the LOCAL filesystem, so a remote workspace
    // must fall through to the in-app DirectoryBrowserDialog.
    if (isDesktop() && getActiveRemoteConnectionId() === null) {
      try {
        const result = await openFileDialog({
          directory: true,
          multiple: false,
        })
        if (!result) return
        const selected = Array.isArray(result) ? result[0] : result
        await openFolder(selected)
      } catch (err) {
        console.error("[Sidebar] failed to open folder:", err)
      }
    } else {
      setBrowserOpen(true)
    }
  }, [openFolder])

  if (!isOpen) return null

  return (
    <aside className="@container/sidebar flex h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground select-none">
      {/* Fixed actions above the scrollable list. `shrink-0` keeps them pinned —
          they never scroll with the conversation list. Rows are `rounded-full`
          like the conversation pills, and the icon/text geometry matches the
          folder header: a 0.875rem icon + 0.875rem label at a 0.4375rem gap, with
          the row's pl-[0.4375rem] (atop the container's px-1.5) placing the icon
          center on the same 0.875rem rail axis as the folder/conversation icons in
          the list below. Each row is a `group` so its shortcut hint reveals on
          hover / keyboard focus. */}
      <div className="flex shrink-0 flex-col gap-0.5 px-1.5 pt-1.5">
        <SidebarNavButton
          icon={SquarePen}
          label={t("newChat")}
          onClick={handleNewConversation}
          trailing={
            newConversationShortcutLabel ? (
              <kbd className={SHORTCUT_BADGE_CLASS}>
                {newConversationShortcutLabel}
              </kbd>
            ) : null
          }
        />
        <SidebarNavButton
          icon={Search}
          label={t("search")}
          onClick={() => setSearchOpen(true)}
          trailing={
            searchShortcutLabel ? (
              <kbd className={SHORTCUT_BADGE_CLASS}>{searchShortcutLabel}</kbd>
            ) : null
          }
        />
        <SidebarNavButton
          icon={Zap}
          label={t("automations")}
          active={routeId === "automations"}
          onClick={() => setRoute("automations")}
          trailing={
            unseenFailures > 0 ? (
              <span className="ml-auto inline-flex h-[0.9375rem] min-w-[0.9375rem] shrink-0 items-center justify-center rounded-full bg-destructive/15 px-1 font-mono text-[0.625rem] font-medium leading-none text-destructive">
                {unseenFailures}
              </span>
            ) : null
          }
        />
      </div>

      {/* Subtle recessed divider between nav buttons and the view toggle. */}
      <div className="mx-3 my-2.5 border-t border-sidebar-border/50" />

      {/* View toggle + folder actions row.
          Left: "对话/项目" pill toggle (120px total). Right: folder-action
          dropdown (open folder / clone / project launcher). */}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-1">
        <div className="flex rounded-full bg-muted/50" style={{ width: 120 }}>
          <button
            type="button"
            onClick={() => setSidebarView("chats")}
            className={cn(
              "flex-1 rounded-full py-0.5 text-center text-[0.6875rem] font-medium leading-relaxed transition-colors",
              sidebarView === "chats"
                ? "bg-sidebar-primary/20 text-sidebar-foreground"
                : "text-muted-foreground/70 hover:bg-sidebar-accent"
            )}
          >
            {t("viewChats")}
          </button>
          <button
            type="button"
            onClick={() => setSidebarView("projects")}
            className={cn(
              "flex-1 rounded-full py-0.5 text-center text-[0.6875rem] font-medium leading-relaxed transition-colors",
              sidebarView === "projects"
                ? "bg-sidebar-primary/20 text-sidebar-foreground"
                : "text-muted-foreground/70 hover:bg-sidebar-accent"
            )}
          >
            {t("viewProjects")}
          </button>
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-sidebar-foreground"
                title={tFolder("openFolder")}
              >
                <FolderPlus aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40">
              <DropdownMenuItem onSelect={handleOpenFolder}>
                <FolderOpenDot className="h-3.5 w-3.5" />
                {tFolder("openFolder")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCloneOpen(true)}>
                <FolderGit2 className="h-3.5 w-3.5" />
                {tFolder("cloneRepository")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openProjectBootWindow()}>
                <Rocket className="h-3.5 w-3.5" />
                {tFolder("projectBoot")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* On mobile, clicking a conversation card auto-closes the Sheet */}
      <div
        className="flex flex-col flex-1 min-h-0 overflow-hidden pt-1"
        onClick={
          isMobile
            ? (e) => {
                const target = e.target as HTMLElement
                if (target.closest("[data-conversation-id]")) {
                  toggle()
                }
              }
            : undefined
        }
      >
        <SidebarConversationList
          ref={listRef}
          showCompleted={showCompleted}
          sortMode={sortMode}
          sectionOrder={sectionOrder}
          visibleSections={sidebarView === "chats" ? "chats" : "projects"}
        />
      </div>
      <CloneDialog open={cloneOpen} onOpenChange={setCloneOpen} />
      <DirectoryBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelect={(path) => {
          openFolder(path).catch((err) => {
            console.error("[Sidebar] failed to open folder:", err)
          })
        }}
      />
    </aside>
  )
}
