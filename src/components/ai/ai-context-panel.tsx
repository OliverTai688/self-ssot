"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ChevronRightIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAiPanel } from "@/lib/context/ai-panel-context"
import { getGreeting, matchResponse } from "@/lib/mock/ai-panel/mock-responses"
import type { MockAiMessage } from "@/lib/mock/ai-panel/mock-responses"
import { AiNavSuggestionCard } from "@/components/ai/ai-nav-suggestion"

// ─── Message types ────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: "user" | "ai"
  text: string
  navSuggestions?: MockAiMessage["navSuggestions"]
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground leading-relaxed">
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="max-w-[92%] rounded-xl rounded-bl-sm bg-muted px-3 py-2 text-xs leading-relaxed">
        {message.text}
      </div>
      {message.navSuggestions && message.navSuggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          {message.navSuggestions.map((s, i) => (
            <AiNavSuggestionCard key={i} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Collapsed strip ──────────────────────────────────────────────────────────

function CollapsedStrip({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex w-10 flex-col items-center border-l bg-background pt-3 gap-3 shrink-0">
      <button
        onClick={onOpen}
        className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        title="展開 AI 助理"
      >
        <SparklesIcon className="size-4" />
        <ChevronRightIcon className="size-3" />
      </button>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AiContextPanel() {
  const { isOpen, toggle, contextLabel } = useAiPanel()
  const pathname = usePathname()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Seed greeting when panel opens or route changes
  React.useEffect(() => {
    const greeting = getGreeting(pathname)
    setMessages([
      {
        id: "greeting",
        role: "ai",
        text: greeting,
      },
    ])
  }, [pathname])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  function handleSubmit() {
    const text = input.trim()
    if (!text) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      const aiResponse = matchResponse(text, pathname)
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "ai",
        text: aiResponse.text,
        navSuggestions: aiResponse.navSuggestions,
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, 700)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!isOpen) return <CollapsedStrip onOpen={toggle} />

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4 text-primary" />
          <span className="text-sm font-medium">AI 助理</span>
        </div>
        <button
          onClick={toggle}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="收合 AI 面板"
        >
          <XIcon className="size-3.5" />
        </button>
      </div>

      {/* Context label */}
      <div className="border-b px-4 py-2">
        <p className="text-[11px] text-muted-foreground/70">
          目前脈絡：<span className="text-muted-foreground font-medium">{contextLabel}</span>
        </p>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex gap-1 px-3 py-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full bg-muted-foreground/40 animate-bounce",
                  i === 1 && "[animation-delay:150ms]",
                  i === 2 && "[animation-delay:300ms]"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2 items-end rounded-lg border border-border bg-muted/30 px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition-all">
          <textarea
            ref={textareaRef}
            rows={2}
            className="flex-1 resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
            placeholder="問我任何事…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isTyping}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <SendIcon className="size-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/50 text-center">⌘ + Enter 送出</p>
      </div>
    </div>
  )
}
