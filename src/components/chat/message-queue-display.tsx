"use client"

import { useCallback, type PointerEvent } from "react"
import { Reorder, useDragControls } from "motion/react"
import { GripVertical, Pencil, Send, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { QueuedMessage } from "@/hooks/use-message-queue"

interface MessageQueueDisplayProps {
  queue: QueuedMessage[]
  onReorder: (items: QueuedMessage[]) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onJumpQueue?: (id: string) => void
  editingItemId: string | null
}

interface QueueItemProps {
  item: QueuedMessage
  index: number
  isEditing: boolean
  isFirst: boolean
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onJumpQueue?: (id: string) => void
}

function QueueItem({
  item,
  index,
  isEditing,
  isFirst,
  onEdit,
  onDelete,
  onJumpQueue,
}: QueueItemProps) {
  const t = useTranslations("Folder.chat.messageQueue")
  const dragControls = useDragControls()

  const startDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dragControls.start(event)
    },
    [dragControls]
  )

  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] leading-none select-none [text-box-trim:both] [text-box-edge:cap_alphabetic]",
        "bg-muted/40 border-border/70",
        isEditing && "border-primary/50 bg-primary/5"
      )}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing p-0"
        onPointerDown={startDrag}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/60" />
      </button>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
        #{index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-[10px] text-foreground/80">
        {item.draft.displayText}
      </span>
      {!isFirst && (
        <button
          type="button"
          onClick={() => onJumpQueue?.(item.id)}
          className="shrink-0 rounded-sm p-0.5 hover:bg-primary/20 text-muted-foreground hover:text-primary"
          title={t("jumpQueue")}
        >
          <Send className="h-2.5 w-2.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(item.id)}
        className="shrink-0 rounded-sm p-0.5 hover:bg-muted-foreground/15 text-muted-foreground"
        title={t("editItem")}
      >
        <Pencil className="h-2.5 w-2.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="shrink-0 rounded-sm p-0.5 hover:bg-muted-foreground/15 text-muted-foreground"
        title={t("deleteItem")}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Reorder.Item>
  )
}

export function MessageQueueDisplay({
  queue,
  onReorder,
  onEdit,
  onDelete,
  onJumpQueue,
  editingItemId,
}: MessageQueueDisplayProps) {
  if (queue.length === 0) return null

  return (
    <div className="max-h-28 overflow-y-auto pb-1">
      <Reorder.Group
        as="div"
        axis="y"
        values={queue}
        onReorder={onReorder}
        className="flex flex-col gap-0.5"
      >
        {queue.map((item, index) => (
          <QueueItem
            key={item.id}
            item={item}
            index={index}
            isEditing={editingItemId === item.id}
            isFirst={index === 0}
            onEdit={onEdit}
            onDelete={onDelete}
            onJumpQueue={onJumpQueue}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}
