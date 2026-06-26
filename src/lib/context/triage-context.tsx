"use client"

import * as React from "react"
import { triageCapture } from "@/lib/ai/triage"
import { mockTriageCards } from "@/lib/mock/ai"
import type { AICard, AICardStatus, DecisionType } from "@/types/ai"

interface TriageContextValue {
  cards: AICard[]
  addCapture: (content: string) => void
  resolveCard: (id: string, decision: DecisionType, editedContent?: string) => void
  pendingCount: number
}

const TriageContext = React.createContext<TriageContextValue | null>(null)

export function TriageProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = React.useState<AICard[]>(mockTriageCards)

  const addCapture = React.useCallback((content: string) => {
    if (!content.trim()) return

    const id = `triage-${Date.now()}`
    const partial = triageCapture(content, id)

    const card: AICard = {
      ...partial,
      id,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    setCards((prev) => [card, ...prev])
  }, [])

  const resolveCard = React.useCallback(
    (id: string, decision: DecisionType, editedContent?: string) => {
      setCards((prev) =>
        prev.map((card) => {
          if (card.id !== id) return card
          const statusMap: Record<DecisionType, AICardStatus> = {
            confirm: "confirmed",
            edit: "edited",
            dismiss: "dismissed",
            defer: "pending",
          }
          return {
            ...card,
            status: statusMap[decision],
            summary: decision === "edit" && editedContent ? editedContent : card.summary,
          }
        })
      )
    },
    []
  )

  const pendingCount = cards.filter((c) => c.status === "pending").length

  return (
    <TriageContext.Provider value={{ cards, addCapture, resolveCard, pendingCount }}>
      {children}
    </TriageContext.Provider>
  )
}

export function useTriage() {
  const ctx = React.useContext(TriageContext)
  if (!ctx) throw new Error("useTriage must be used within TriageProvider")
  return ctx
}
