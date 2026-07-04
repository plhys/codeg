"use client"

import { memo, useCallback, type RefObject } from "react"
import type { FileChangeStat } from "@/lib/session-files"
import type { MessageScrollContextValue } from "@/components/message/message-scroll-context"
import { cn } from "@/lib/utils"

/** One navigable user message. */
export interface MessageNavEntry {
  threadIndex: number
  turnId: string
  ordinal: number
  label: string
  additions: number
  deletions: number
  files: FileChangeStat[]
  hasChanges: boolean
}

interface ConversationMessageNavProps {
  count: number
  entries: MessageNavEntry[]
  scrollApiRef: RefObject<MessageScrollContextValue | null>
}

/**
 * Minimal dot navigation pinned to the right edge of the chat area.
 * Each dot represents a user message — click to jump. No floating
 * panel, no file diffs, just a clean vertical strip of anchor points.
 */
export const ConversationMessageNav = memo(function ConversationMessageNav({
  count,
  entries,
  scrollApiRef,
}: ConversationMessageNavProps) {
  const jump = useCallback(
    (threadIndex: number) => {
      scrollApiRef.current?.scrollToIndex(threadIndex, {
        align: "start",
        smooth: true,
      })
    },
    [scrollApiRef]
  )

  if (count <= 0) return null

  return (
    <div className="pointer-events-auto flex h-full flex-col items-center justify-center py-4">
      <div className="flex flex-col items-end gap-1.5 pr-1">
        {entries.map((entry) => (
          <button
            key={entry.turnId}
            type="button"
            onClick={() => jump(entry.threadIndex)}
            className={cn(
              "group relative flex items-center gap-2 rounded-full",
              "cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            {/* Hover label: slides out to the left of the dot */}
            <span
              className={cn(
                "pointer-events-none absolute right-5 whitespace-nowrap rounded-md",
                "bg-card/90 px-2 py-1 text-xs text-foreground shadow",
                "opacity-0 transition-opacity group-hover:opacity-100",
                "max-w-[16rem] truncate"
              )}
            >
              {entry.label}
            </span>
            <span
              className={cn(
                "block h-2 w-2 rounded-full",
                "bg-muted-foreground/25 transition-all",
                "group-hover:scale-125 group-hover:bg-muted-foreground/50"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
})
