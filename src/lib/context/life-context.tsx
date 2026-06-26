"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import type { DailyLog, WeeklyCheckIn, MonthlyPlan, DailyGoals } from "@/types/life"
import {
  mockDailyLogs,
  mockWeeklyCheckIns,
  mockMonthlyPlan,
  defaultDailyGoals,
} from "@/lib/mock/life"

interface LifeContextType {
  dailyLogs: DailyLog[]
  weeklyCheckIns: WeeklyCheckIn[]
  monthlyPlan: MonthlyPlan
  dailyGoals: DailyGoals
  todayLog: DailyLog
  updateTodayLog: (updates: Partial<DailyLog>) => void
  submitWeeklyCheckIn: (data: Omit<WeeklyCheckIn, "id">) => void
  updateMonthlyPlan: (updates: Partial<MonthlyPlan>) => void
  updateDailyGoals: (updates: Partial<DailyGoals>) => void
}

const LifeContext = createContext<LifeContextType | null>(null)

export function LifeProvider({ children }: { children: ReactNode }) {
  const today = new Date().toISOString().split("T")[0]

  const existingToday = mockDailyLogs.find((l) => l.date === today)
  const initialToday: DailyLog = existingToday ?? { id: `log-${today}`, date: today }

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(mockDailyLogs)
  const [weeklyCheckIns, setWeeklyCheckIns] = useState<WeeklyCheckIn[]>(mockWeeklyCheckIns)
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan>(mockMonthlyPlan)
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>(defaultDailyGoals)
  const [todayLog, setTodayLog] = useState<DailyLog>(initialToday)

  const updateTodayLog = (updates: Partial<DailyLog>) => {
    const merged = { ...todayLog, ...updates }
    setTodayLog(merged)
    setDailyLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === today)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = merged
        return next
      }
      return [...prev, merged]
    })
  }

  const submitWeeklyCheckIn = (data: Omit<WeeklyCheckIn, "id">) => {
    const entry: WeeklyCheckIn = { ...data, id: `checkin-w${data.weekNumber}` }
    setWeeklyCheckIns((prev) => {
      const idx = prev.findIndex((c) => c.weekNumber === data.weekNumber)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = entry
        return next
      }
      return [...prev, entry]
    })
  }

  const updateMonthlyPlan = (updates: Partial<MonthlyPlan>) =>
    setMonthlyPlan((prev) => ({ ...prev, ...updates }))

  const updateDailyGoals = (updates: Partial<DailyGoals>) =>
    setDailyGoals((prev) => ({ ...prev, ...updates }))

  return (
    <LifeContext.Provider
      value={{
        dailyLogs,
        weeklyCheckIns,
        monthlyPlan,
        dailyGoals,
        todayLog,
        updateTodayLog,
        submitWeeklyCheckIn,
        updateMonthlyPlan,
        updateDailyGoals,
      }}
    >
      {children}
    </LifeContext.Provider>
  )
}

export function useLife() {
  const ctx = useContext(LifeContext)
  if (!ctx) throw new Error("useLife must be used inside LifeProvider")
  return ctx
}
