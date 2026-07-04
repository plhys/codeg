import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ConversationMessageNav } from "./conversation-message-nav"
import type { MessageNavEntry } from "./conversation-message-nav"
import type { FileChangeStat } from "@/lib/session-files"
import type { MessageScrollContextValue } from "@/components/message/message-scroll-context"

const emptyFiles: FileChangeStat[] = []

function makeScrollApi() {
  const scrollToIndex = vi.fn()
  const scrollApiRef = { current: { scrollToIndex } as unknown as MessageScrollContextValue }
  return { scrollToIndex, scrollApiRef }
}

function makeEntry(overrides: Partial<MessageNavEntry> = {}): MessageNavEntry {
  return {
    threadIndex: 0,
    turnId: "t1",
    ordinal: 1,
    label: "hello",
    additions: 0,
    deletions: 0,
    files: emptyFiles,
    hasChanges: false,
    ...overrides,
  }
}

describe("ConversationMessageNav", () => {
  it("renders nothing when count is 0", () => {
    const { scrollApiRef } = makeScrollApi()
    const { container } = render(
      <ConversationMessageNav
        count={0}
        entries={[]}
        scrollApiRef={scrollApiRef}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders one dot per entry", () => {
    const { scrollApiRef } = makeScrollApi()
    const entries = [
      makeEntry({ turnId: "t1", ordinal: 1 }),
      makeEntry({ turnId: "t2", ordinal: 2, threadIndex: 1 }),
      makeEntry({ turnId: "t3", ordinal: 3, threadIndex: 2 }),
    ]
    render(
      <ConversationMessageNav
        count={entries.length}
        entries={entries}
        scrollApiRef={scrollApiRef}
      />
    )
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBe(3)
  })

  it("scrolls to the selected message on click", () => {
    const { scrollToIndex, scrollApiRef } = makeScrollApi()
    const entries = [
      makeEntry({ turnId: "t1", threadIndex: 5, ordinal: 1 }),
    ]
    render(
      <ConversationMessageNav
        count={entries.length}
        entries={entries}
        scrollApiRef={scrollApiRef}
      />
    )
    fireEvent.click(screen.getByRole("button"))
    expect(scrollToIndex).toHaveBeenCalledWith(5, {
      align: "start",
      smooth: true,
    })
  })
})
