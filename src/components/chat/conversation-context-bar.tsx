"use client"

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslations } from "next-intl"
import {
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
} from "lucide-react"
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-react"
import { useAppWorkspace } from "@/contexts/app-workspace-context"
import { useTabContext } from "@/contexts/tab-context"
import { gitListAllBranches } from "@/lib/api"
import {
  buildBranchTree,
  buildRemoteBranchSections,
  expandedKeysForBranch,
  localBranchItems,
  type BranchTreeNode,
} from "@/lib/branch-tree"
import { useBranchTreeExpansion } from "@/hooks/use-branch-tree-expansion"
import type { GitBranchList } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useSwitchToBranch } from "@/hooks/use-switch-to-branch"

interface ConversationContextBarProps {
  extraContent?: React.ReactNode
  hasExtraContent?: boolean
  scrollEndTrigger?: number
}

export const ConversationContextBar = memo(function ConversationContextBar({
  extraContent,
  hasExtraContent = false,
  scrollEndTrigger,
}: ConversationContextBarProps = {}) {
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const prevScrollTriggerRef = useRef<number>(scrollEndTrigger ?? 0)
  useEffect(() => {
    if (scrollEndTrigger == null) return
    if (scrollEndTrigger <= prevScrollTriggerRef.current) {
      prevScrollTriggerRef.current = scrollEndTrigger
      return
    }
    prevScrollTriggerRef.current = scrollEndTrigger
    requestAnimationFrame(() => {
      const viewport = scrollRef.current?.osInstance()?.elements().viewport
      if (!viewport) return
      viewport.scrollTo({ left: viewport.scrollWidth, behavior: "smooth" })
    })
  }, [scrollEndTrigger])

  useEffect(() => {
    if (!hasExtraContent) return
    const inner = innerRef.current
    if (!inner) return
    const handler = (e: WheelEvent) => {
      const viewport = scrollRef.current?.osInstance()?.elements().viewport
      if (!viewport) return
      if (viewport.scrollWidth <= viewport.clientWidth) return
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX
      if (delta === 0) return
      e.preventDefault()
      viewport.scrollLeft += delta
    }
    inner.addEventListener("wheel", handler, { passive: false })
    return () => inner.removeEventListener("wheel", handler)
  }, [hasExtraContent])

  if (!hasExtraContent) return null

  return (
    <div className="flex shrink-0 items-center gap-1.5 px-2 pt-2 text-xs text-muted-foreground">
      <ScrollArea
        x="scroll"
        y="hidden"
        className="min-w-0 flex-1"
        ref={scrollRef}
      >
        <div ref={innerRef} className="flex w-max items-center gap-1.5">
          {extraContent}
        </div>
      </ScrollArea>
    </div>
  )
})

ConversationContextBar.displayName = "ConversationContextBar"

// ============================================================================
// ConversationFolderBranchPicker — folder + branch buttons rendered below the
// message input.
// ============================================================================

interface ConversationFolderBranchPickerProps {
  tabId?: string | null
}

export const ConversationFolderBranchPicker = memo(
  function ConversationFolderBranchPicker({
    tabId,
  }: ConversationFolderBranchPickerProps) {
    const t = useTranslations("Folder.conversationContextBar")
    const { tabs, activeTabId } = useTabContext()
    const { allFolders, branches } = useAppWorkspace()
    const switchToBranch = useSwitchToBranch()

    const ownTab = useMemo(() => {
      const lookupId = tabId ?? activeTabId
      return tabs.find((x) => x.id === lookupId) ?? null
    }, [tabs, tabId, activeTabId])

    const ownFolder = useMemo(
      () =>
        ownTab
          ? (allFolders.find((f) => f.id === ownTab.folderId) ?? null)
          : null,
      [ownTab, allFolders]
    )

    if (!ownTab) return null
    // Chat mode: either a draft flagged `isChat` (no folder yet) or a bound
    // conversation whose folder is a hidden chat folder. Only the branch
    // picker is shown below the composer (folder switching during a
    // conversation just opens a new tab, not useful inline).
    const isChatMode = ownTab.isChat === true || ownFolder?.kind === "chat"
    if (!ownFolder && !isChatMode) return null

    const currentBranch =
      isChatMode || !ownFolder
        ? null
        : (branches.get(ownFolder.id) ?? ownFolder.git_branch ?? null)
    const showBranchPicker = currentBranch != null

    return (
      <>
        {showBranchPicker && ownFolder && (
          <BranchPicker
            folderId={ownFolder.id}
            folderPath={ownFolder.path}
            currentBranch={currentBranch}
            title={`${t("branchTitle")}: ${currentBranch ?? t("noBranch")}`}
            onCheckout={async (branchName, isRemote) => {
              // Both draft and existing conversations route through the shared
              // switch logic (mirroring the top-bar branch dropdown). It never
              // mutates the live conversation: a branch checked out in another
              // worktree navigates to that folder (opening a fresh draft there
              // via the singleton), and a free branch checks out in place only
              // when the active folder is already the root tree. A bare
              // in-place `git checkout` would instead fail (branch already
              // checked out elsewhere) or hijack a worktree onto another branch.
              await switchToBranch({
                activeFolder: ownFolder,
                branchName,
                currentBranch,
                isRemote,
              })
            }}
          />
        )}
      </>
    )
  }
)

ConversationFolderBranchPicker.displayName = "ConversationFolderBranchPicker"

/**
 * Mirror the visibility check inside `ConversationFolderBranchPicker` so the
 * parent can decide whether to render its wrapper row at all. After removing the
 * FolderPicker (folder switching during a conversation just opens a new tab, not
 * useful inline), the row only shows when the branch picker is available.
 */
export function useConversationFolderBranchPickerVisible(
  tabId?: string | null
): boolean {
  const { tabs, activeTabId } = useTabContext()
  const { allFolders, branches } = useAppWorkspace()
  const lookupId = tabId ?? activeTabId
  const ownTab = tabs.find((x) => x.id === lookupId) ?? null
  const ownFolder = ownTab
    ? (allFolders.find((f) => f.id === ownTab.folderId) ?? null)
    : null
  if (!ownTab || !ownFolder || ownFolder.kind === "chat") return false
  // Only visible when git branch info is available.
  const currentBranch =
    branches.get(ownFolder.id) ?? ownFolder.git_branch ?? null
  return currentBranch != null
}

// ============================================================================
// BranchPicker
// ============================================================================

interface BranchPickerProps {
  folderId: number
  folderPath: string
  currentBranch: string | null
  title: string
  onCheckout: (branchName: string, isRemote: boolean) => Promise<void>
}

const BranchPicker = memo(function BranchPicker({
  folderId,
  folderPath,
  currentBranch,
  title,
  onCheckout,
}: BranchPickerProps) {
  const t = useTranslations("Folder.conversationContextBar")
  const tBd = useTranslations("Folder.branchDropdown")
  const [open, setOpen] = useState(false)
  const [branchList, setBranchList] = useState<GitBranchList | null>(null)
  const [loading, setLoading] = useState(false)

  const loadBranches = useCallback(async () => {
    setLoading(true)
    try {
      const list = await gitListAllBranches(folderPath)
      setBranchList(list)
    } catch (err) {
      console.error("[BranchPicker] list failed:", err)
      setBranchList({ local: [], remote: [], worktree_branches: [] })
    } finally {
      setLoading(false)
    }
  }, [folderPath])

  useEffect(() => {
    if (open) void loadBranches()
  }, [open, loadBranches])

  // Tree mode (browse) when the search box is empty; flat list (cmdk filters)
  // when the user types — cmdk unmounts filtered items, so collapsed branches
  // would otherwise be unsearchable. The query is controlled, so it must be
  // cleared explicitly (an uncontrolled input used to reset when the popover
  // content unmounted).
  const [query, setQuery] = useState("")

  // Clear the search on EVERY close, regardless of path. `onOpenChange` doesn't
  // fire when a leaf's `onSelect` closes the popover via `setOpen(false)`
  // directly, so reset off the `open` transition (render-time, not an effect)
  // — covers select, Escape, outside-click, and trigger-toggle alike.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) setQuery("")
  }

  // Reset branches cache + search when folder changes.
  useEffect(() => {
    setBranchList(null)
    setQuery("")
  }, [folderId])
  const isSearching = query.trim().length > 0

  const localNodes = useMemo(
    () => buildBranchTree(localBranchItems(branchList?.local ?? []), "local"),
    [branchList]
  )
  const remoteSections = useMemo(
    () => buildRemoteBranchSections(branchList?.remote ?? []),
    [branchList]
  )

  // Auto-expand the prefix groups leading to the current (local) branch.
  const seedKeys = useMemo(
    () =>
      currentBranch ? expandedKeysForBranch(localNodes, currentBranch) : [],
    [currentBranch, localNodes]
  )
  const { isExpanded, toggle } = useBranchTreeExpansion(open, seedKeys)

  const indentStyle = (depth: number) => ({
    paddingLeft: `${0.5 + depth * 0.75}rem`,
  })

  // Recursively render the prefix tree as cmdk items. Group headers toggle
  // expansion (and never close the popover); leaves check out.
  const renderTreeItems = (
    nodes: BranchTreeNode[],
    depth: number,
    isRemote: boolean
  ): React.ReactNode[] =>
    nodes.flatMap((node) => {
      if (node.type === "group") {
        const groupOpen = isExpanded(node.key)
        const header = (
          <CommandItem
            key={node.key}
            value={node.key}
            aria-expanded={groupOpen}
            onSelect={() => toggle(node.key)}
            style={indentStyle(depth)}
          >
            <ChevronRight
              className={cn(
                "size-3 shrink-0 text-muted-foreground/70 transition-transform",
                groupOpen && "rotate-90"
              )}
            />
            <span className="min-w-0 flex-1 truncate">{node.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground/60">
              {node.count}
            </span>
          </CommandItem>
        )
        return groupOpen
          ? [header, ...renderTreeItems(node.children, depth + 1, isRemote)]
          : [header]
      }
      const localName = isRemote
        ? node.fullName.replace(/^[^/]+\//, "")
        : node.fullName
      const selected = localName === currentBranch
      return [
        <CommandItem
          key={node.key}
          value={node.key}
          title={node.fullName}
          onSelect={() => {
            setOpen(false)
            if (localName !== currentBranch)
              void onCheckout(localName, isRemote)
          }}
          style={indentStyle(depth)}
        >
          <GitBranch
            className={cn("h-4 w-4 shrink-0", isRemote && "opacity-60")}
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              isRemote && "text-muted-foreground"
            )}
          >
            {node.label}
          </span>
          {selected && <Check className="h-4 w-4 shrink-0" />}
        </CommandItem>,
      ]
    })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          title={title}
          className="min-w-0 gap-0.5 px-1.5"
        >
          <GitBranch className="size-3 shrink-0 text-muted-foreground" />
          <span className="max-w-[160px] truncate">
            {currentBranch ?? t("noBranch")}
          </span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground/60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-80 overflow-hidden">
        <Command className="rounded-2xl" shouldFilter={isSearching}>
          <CommandInput
            placeholder={t("searchBranch")}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
              </div>
            ) : (
              <>
                <CommandEmpty>{t("noBranches")}</CommandEmpty>
                {branchList && branchList.local.length > 0 && (
                  <CommandGroup
                    heading={tBd("localBranches", {
                      count: branchList.local.length,
                    })}
                  >
                    {isSearching
                      ? branchList.local.map((b) => (
                          <CommandItem
                            key={`local-${b}`}
                            value={`local ${b}`}
                            onSelect={() => {
                              setOpen(false)
                              if (b !== currentBranch) void onCheckout(b, false)
                            }}
                          >
                            <GitBranch className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{b}</span>
                            {b === currentBranch && (
                              <Check className="h-4 w-4 shrink-0" />
                            )}
                          </CommandItem>
                        ))
                      : renderTreeItems(localNodes, 0, false)}
                  </CommandGroup>
                )}
                {branchList && branchList.remote.length > 0 && (
                  <CommandGroup
                    heading={tBd("remoteBranches", {
                      count: branchList.remote.length,
                    })}
                  >
                    {isSearching
                      ? branchList.remote.map((b) => {
                          const localName = b.replace(/^[^/]+\//, "")
                          return (
                            <CommandItem
                              key={`remote-${b}`}
                              value={`remote ${b}`}
                              onSelect={() => {
                                setOpen(false)
                                if (localName !== currentBranch)
                                  void onCheckout(localName, true)
                              }}
                            >
                              <GitBranch className="h-4 w-4 shrink-0 opacity-60" />
                              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                {b}
                              </span>
                              {localName === currentBranch && (
                                <Check className="h-4 w-4 shrink-0" />
                              )}
                            </CommandItem>
                          )
                        })
                      : remoteSections.map((section) =>
                          section.remoteName == null ? (
                            <Fragment key="remote-single">
                              {renderTreeItems(section.nodes, 0, true)}
                            </Fragment>
                          ) : (
                            <Fragment key={section.key}>
                              <CommandItem
                                value={section.key}
                                aria-expanded={isExpanded(section.key)}
                                onSelect={() => toggle(section.key)}
                                style={indentStyle(0)}
                              >
                                <ChevronRight
                                  className={cn(
                                    "size-3 shrink-0 text-muted-foreground/70 transition-transform",
                                    isExpanded(section.key) && "rotate-90"
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {section.remoteName}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground/60">
                                  {section.count}
                                </span>
                              </CommandItem>
                              {isExpanded(section.key) &&
                                renderTreeItems(section.nodes, 1, true)}
                            </Fragment>
                          )
                        )}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
