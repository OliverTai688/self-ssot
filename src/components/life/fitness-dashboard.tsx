"use client"

import { useState, useMemo } from "react"
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts"
import {
  ActivityIcon, FlameIcon, DropletsIcon, FootprintsIcon, MoonIcon,
  DumbbellIcon, UtensilsIcon, TargetIcon, CalendarIcon, TrendingDownIcon,
  HeartPulseIcon, SmileIcon, SettingsIcon, BarChart2Icon, ClipboardListIcon,
  BookOpenIcon, CheckCircle2Icon, CircleIcon, ChevronUpIcon, ChevronDownIcon,
  StarIcon,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function RangeSlider({
  min, max, step, value, onChange,
}: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none bg-secondary cursor-pointer accent-primary"
    />
  )
}
import { useLife } from "@/lib/context/life-context"
import {
  workoutPlanA, workoutPlanB, mealPlanCycle, weekFocuses,
} from "@/lib/mock/life"
import type { WorkoutType, WeeklyCheckIn } from "@/types/life"

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ProgressBar({
  value, max = 100, colorClass = "bg-primary",
}: { value: number; max?: number; colorClass?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-1.5">
      <div className={cn("h-full transition-all duration-500", colorClass)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function MetricCard({
  label, value, unit, max, color, icon: Icon, note,
}: {
  label: string; value: number | undefined; unit: string; max: number;
  color: string; icon: React.ElementType; note?: string
}) {
  const v = value ?? 0
  return (
    <Card className={cn("border shadow-sm", `bg-${color}-500/10 border-${color}-500/20`)}>
      <CardContent className="p-4 flex flex-col gap-1.5">
        <div className={cn("flex items-center gap-1.5 text-sm font-medium", `text-${color}-600 dark:text-${color}-400`)}>
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{v.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">/ {max.toLocaleString()} {unit}</span>
        </div>
        <ProgressBar value={v} max={max} colorClass={`bg-${color}-500`} />
        {note && <p className="text-[11px] text-muted-foreground mt-0.5">{note}</p>}
      </CardContent>
    </Card>
  )
}

function WorkoutBadge({ type }: { type: WorkoutType }) {
  const map: Record<WorkoutType, { label: string; color: string }> = {
    strength_a:  { label: "重訓 A", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
    strength_b:  { label: "重訓 B", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
    cardio:      { label: "有氧",   color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
    rest:        { label: "休息",   color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
    stretch:     { label: "伸展",   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    walk:        { label: "散步",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  }
  const { label, color } = map[type] ?? map.rest
  return <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", color)}>{label}</span>
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab() {
  const { todayLog, updateTodayLog, dailyGoals, monthlyPlan, dailyLogs } = useLife()

  // Determine today's scheduled workout from day-of-week
  const todayDow = new Date().getDay() // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const scheduleMap: Record<number, { type: WorkoutType; label: string; detail: string }> = {
    1: { type: "strength_a", label: "全身重訓 A", detail: "深蹲 / 臥推 / 划船 / 硬舉 / 平板撐" },
    2: { type: "cardio",     label: "輕有氧 25–35 分鐘", detail: "快走 / 慢跑 / 腳踏車 / 橢圓機" },
    3: { type: "strength_b", label: "全身重訓 B", detail: "分腿蹲 / 肩推 / 伏地挺身 / 臀推 / 側棒式" },
    4: { type: "rest",       label: "休息或散步", detail: "輕鬆活動即可" },
    5: { type: "strength_a", label: "全身重訓 A/B 輪替", detail: "參照本週前幾次選A或B" },
    6: { type: "cardio",     label: "輕有氧 30 分鐘＋伸展", detail: "有氧後做 2–3 個伸展動作" },
    0: { type: "rest",       label: "休息", detail: "完全休息，為下週儲備能量" },
  }
  const todaySchedule = scheduleMap[todayDow]

  // Streak: consecutive days with a log
  const sortedLogs = [...dailyLogs].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  let d = new Date()
  d.setDate(d.getDate() - 1)  // start from yesterday
  for (const log of sortedLogs) {
    const yyyymmdd = d.toISOString().split("T")[0]
    if (log.date === yyyymmdd && (log.calories || log.weight)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else if (log.date < yyyymmdd) break
  }

  // Today's day in the 7-day meal cycle
  const planStart = new Date(monthlyPlan.startDate)
  const today = new Date()
  const dayInPlan = Math.floor((today.getTime() - planStart.getTime()) / 86400000)
  const mealDayIdx = dayInPlan % 7
  const todayMeals = mealPlanCycle[mealDayIdx]

  const [form, setForm] = useState({
    weight:    String(todayLog.weight ?? ""),
    bodyFat:   String(todayLog.bodyFat ?? ""),
    calories:  String(todayLog.calories ?? ""),
    protein:   String(todayLog.protein ?? ""),
    water:     String(todayLog.water ?? ""),
    steps:     String(todayLog.steps ?? ""),
    sleep:     String(todayLog.sleep ?? ""),
    mood:      todayLog.mood ?? 3,
    restingHR: String(todayLog.restingHR ?? ""),
    notes:     todayLog.notes ?? "",
  })

  const handleSave = () => {
    updateTodayLog({
      weight:    form.weight    ? Number(form.weight)    : undefined,
      bodyFat:   form.bodyFat   ? Number(form.bodyFat)   : undefined,
      calories:  form.calories  ? Number(form.calories)  : undefined,
      protein:   form.protein   ? Number(form.protein)   : undefined,
      water:     form.water     ? Number(form.water)     : undefined,
      steps:     form.steps     ? Number(form.steps)     : undefined,
      sleep:     form.sleep     ? Number(form.sleep)     : undefined,
      mood:      form.mood,
      restingHR: form.restingHR ? Number(form.restingHR) : undefined,
      notes:     form.notes || undefined,
    })
  }

  const toggleWorkout = () => {
    updateTodayLog({
      workout: {
        type: todayLog.workout?.type ?? todaySchedule.type,
        completed: !(todayLog.workout?.completed ?? false),
        rpe: todayLog.workout?.rpe,
        duration: todayLog.workout?.duration,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            計畫第 {dayInPlan + 1} 天 &nbsp;·&nbsp; {todayMeals.day}
            {streak > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-orange-500 font-medium">
                🔥 {streak} 天連續記錄
              </span>
            )}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" })}
        </Badge>
      </div>

      {/* Metric progress cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="熱量" value={todayLog.calories} unit="kcal" max={dailyGoals.calories} color="orange" icon={FlameIcon} />
        <MetricCard label="蛋白質" value={todayLog.protein}  unit="g"    max={dailyGoals.protein}  color="blue"   icon={ActivityIcon} />
        <MetricCard label="水分"   value={todayLog.water}    unit="ml"   max={dailyGoals.water}    color="cyan"   icon={DropletsIcon} />
        <MetricCard label="步數"   value={todayLog.steps}    unit="步"   max={dailyGoals.steps}    color="green"  icon={FootprintsIcon} />
        <MetricCard label="睡眠"   value={todayLog.sleep}    unit="hr"   max={dailyGoals.sleep}    color="indigo" icon={MoonIcon} />
        <MetricCard
          label="心情/精力" value={todayLog.mood} unit="/5" max={5} color="pink" icon={SmileIcon}
          note={["😴", "😐", "🙂", "😊", "🔥"][Math.min((todayLog.mood ?? 1) - 1, 4)]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Log form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ActivityIcon className="size-4 text-primary" /> 更新今日數據
            </CardTitle>
            <CardDescription>記錄飲食、活動與身體指標</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "weight",    label: "體重 (kg)",       type: "number", step: "0.1" },
                { key: "bodyFat",   label: "體脂率 (%)",       type: "number", step: "0.1" },
                { key: "calories",  label: "熱量 (kcal)",     type: "number" },
                { key: "protein",   label: "蛋白質 (g)",       type: "number" },
                { key: "water",     label: "飲水量 (ml)",      type: "number", step: "100" },
                { key: "steps",     label: "步數",             type: "number", step: "100" },
                { key: "sleep",     label: "睡眠時數 (hr)",    type: "number", step: "0.5" },
                { key: "restingHR", label: "靜態心率 (bpm)",   type: "number" },
              ].map(({ key, label, type, step }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type={type}
                    step={step}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="h-8 text-sm bg-muted/40"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>

            {/* Mood slider */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">心情/精力指數 ({form.mood}/5)</Label>
              <RangeSlider
                min={1} max={5} step={1} value={form.mood}
                onChange={(v) => setForm((p) => ({ ...p, mood: v }))}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                {["疲憊", "一般", "還好", "不錯", "絕佳"].map((t) => <span key={t}>{t}</span>)}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">備注</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="今日飲食特殊情況、身體感受…"
                className="text-sm bg-muted/40 min-h-16 resize-none"
              />
            </div>

            <Button onClick={handleSave} className="w-full">儲存今日記錄</Button>
          </CardContent>
        </Card>

        {/* Workout + Meal */}
        <div className="flex flex-col gap-4">
          {/* Today's workout */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DumbbellIcon className="size-4 text-primary" /> 今日運動計畫
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
                  todayLog.workout?.completed
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
                onClick={toggleWorkout}
              >
                <div className="flex items-center gap-3">
                  {todayLog.workout?.completed
                    ? <CheckCircle2Icon className="size-5 text-green-500 shrink-0" />
                    : <CircleIcon className="size-5 text-muted-foreground shrink-0" />
                  }
                  <div>
                    <p className="font-medium text-sm">{todaySchedule.label}</p>
                    <p className="text-xs text-muted-foreground">{todaySchedule.detail}</p>
                  </div>
                </div>
                <WorkoutBadge type={todaySchedule.type} />
              </div>

              {/* RPE + Duration quick entry */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">時長 (分鐘)</Label>
                  <Input
                    type="number"
                    value={todayLog.workout?.duration ?? ""}
                    onChange={(e) => updateTodayLog({ workout: { ...todayLog.workout!, duration: Number(e.target.value) } })}
                    className="h-8 text-sm bg-muted/40"
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">費力感 RPE (1–10)</Label>
                  <Input
                    type="number" min={1} max={10}
                    value={todayLog.workout?.rpe ?? ""}
                    onChange={(e) => updateTodayLog({ workout: { ...todayLog.workout!, rpe: Number(e.target.value) } })}
                    className="h-8 text-sm bg-muted/40"
                    placeholder="—"
                  />
                </div>
              </div>

              {/* Stretch reminder */}
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">久坐伸展提醒</p>
                <p>肩頸放鬆 1 min · 胸椎旋轉 10 次 · 髖屈肌伸展 30s×2</p>
              </div>
            </CardContent>
          </Card>

          {/* Today's meal suggestion */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <UtensilsIcon className="size-4 text-primary" /> 今日飲食參考
                </span>
                <span className="text-xs font-normal text-muted-foreground">{todayMeals.day}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayMeals.meals.map((meal) => (
                <div key={meal.time} className="flex gap-2.5 items-start text-sm">
                  <Badge variant="outline" className="shrink-0 w-10 justify-center text-[10px] h-5">{meal.time}</Badge>
                  <span className="text-muted-foreground leading-5">{meal.desc}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                <p>❌ 禁止：含糖飲料、油炸宵夜、晚餐高油＋高澱粉</p>
                <p>✅ 每餐比例：蛋白質 1.5-2掌心 / 蔬菜 2拳頭 / 澱粉 0.5-1拳頭</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Trends Tab ───────────────────────────────────────────────────────────────

function TrendsTab() {
  const { dailyLogs, monthlyPlan } = useLife()

  // Last 14 days with 7-day rolling avg
  const sorted = [...dailyLogs]
    .filter((l) => l.weight)
    .sort((a, b) => a.date.localeCompare(b.date))

  const weightData = sorted.slice(-14).map((log, idx, arr) => {
    const window = arr.slice(Math.max(0, idx - 6), idx + 1).map((l) => l.weight!)
    const avg7d = +(window.reduce((s, v) => s + v, 0) / window.length).toFixed(2)
    return {
      date: log.date.slice(5),
      weight: log.weight!,
      avg7d,
      target: monthlyPlan.targetWeightMax,
    }
  })

  // Sleep trend (last 14 days)
  const sleepData = [...dailyLogs]
    .filter((l) => l.sleep)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((l) => ({ date: l.date.slice(5), sleep: l.sleep!, target: 7 }))

  // Weekly macro aggregation
  const weeklyMacros = (() => {
    const weeks: Record<number, { calories: number[]; protein: number[] }> = {}
    for (const log of dailyLogs) {
      if (!log.calories) continue
      const planStart = new Date(monthlyPlan.startDate)
      const d = new Date(log.date)
      const diffDays = Math.floor((d.getTime() - planStart.getTime()) / 86400000)
      const wk = Math.floor(diffDays / 7) + 1
      if (wk < 1 || wk > 4) continue
      if (!weeks[wk]) weeks[wk] = { calories: [], protein: [] }
      weeks[wk].calories.push(log.calories)
      if (log.protein) weeks[wk].protein.push(log.protein)
    }
    return [1, 2, 3, 4].map((wk) => {
      const data = weeks[wk]
      if (!data || data.calories.length === 0) return { week: `第${wk}週`, avgCalories: 0, avgProtein: 0, calTarget: 2100, protTarget: 130 }
      return {
        week: `第${wk}週`,
        avgCalories: Math.round(data.calories.reduce((s, v) => s + v, 0) / data.calories.length),
        avgProtein:  Math.round(data.protein.reduce((s, v) => s + v, 0) / (data.protein.length || 1)),
        calTarget: 2100,
        protTarget: 130,
      }
    })
  })()

  // 4-week workout heatmap (Mon–Sun columns, weeks as rows)
  const heatmapData = (() => {
    const planStart = new Date(monthlyPlan.startDate)
    const days: { date: string; type: string; completed: boolean; isFuture: boolean; dayLabel: string }[] = []
    const today = new Date().toISOString().split("T")[0]
    for (let i = 0; i < 28; i++) {
      const d = new Date(planStart)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split("T")[0]
      const log = dailyLogs.find((l) => l.date === dateStr)
      const dayOfWeek = d.getDay()
      const dayLabels = ["日", "一", "二", "三", "四", "五", "六"]
      days.push({
        date: dateStr,
        type: log?.workout?.type ?? "rest",
        completed: log?.workout?.completed ?? false,
        isFuture: dateStr > today,
        dayLabel: dayLabels[dayOfWeek],
      })
    }
    // Arrange into 4 rows of 7
    return [0, 1, 2, 3].map((wk) => days.slice(wk * 7, wk * 7 + 7))
  })()

  const workoutColors: Record<string, string> = {
    strength_a: "bg-purple-500",
    strength_b: "bg-indigo-500",
    cardio:     "bg-cyan-500",
    rest:       "bg-muted",
    stretch:    "bg-green-400",
    walk:       "bg-emerald-400",
  }

  // Steps trend
  const stepsData = [...dailyLogs]
    .filter((l) => l.steps)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((l) => ({ date: l.date.slice(5), steps: l.steps!, target: 9000 }))

  return (
    <div className="space-y-6">
      {/* Weight trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDownIcon className="size-4 text-blue-500" /> 體重趨勢（近14天）
          </CardTitle>
          <CardDescription>實際體重 + 7日滾動平均 — 看均線才是真實走勢</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={["dataMin - 0.3", "dataMax + 0.3"]} tick={{ fontSize: 11 }} unit="kg" />
              <Tooltip formatter={(v) => [`${v} kg`]} />
              <ReferenceLine y={monthlyPlan.targetWeightMax} stroke="#f97316" strokeDasharray="4 4" label={{ value: "目標", fontSize: 10 }} />
              <Line dataKey="weight" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 3 }} name="體重" />
              <Line dataKey="avg7d"  stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 3" name="7日均線" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly macros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlameIcon className="size-4 text-orange-500" /> 每週平均熱量＆蛋白質
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyMacros} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avgCalories" name="熱量(kcal)" fill="#f97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="avgProtein"  name="蛋白質(g)"  fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <ReferenceLine y={2100} stroke="#f97316" strokeDasharray="3 3" />
                <ReferenceLine y={130}  stroke="#3b82f6" strokeDasharray="3 3" />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sleep trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MoonIcon className="size-4 text-indigo-500" /> 睡眠趨勢（近14天）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={sleepData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[5, 10]} tick={{ fontSize: 11 }} unit="h" />
                <Tooltip formatter={(v) => [`${v} hr`, "睡眠"]} />
                <ReferenceLine y={7} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "目標 7h", fontSize: 10 }} />
                <Area dataKey="sleep" stroke="#6366f1" fill="url(#sleepGrad)" strokeWidth={2} dot={{ r: 3 }} name="睡眠" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Steps trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FootprintsIcon className="size-4 text-green-500" /> 步數趨勢（近14天）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stepsData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, "步數"]} />
              <ReferenceLine y={9000} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "目標", fontSize: 10 }} />
              <Bar dataKey="steps" name="步數" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4-week heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-4 text-primary" /> 四週運動完成率
          </CardTitle>
          <CardDescription>綠色=完成 · 灰色=休息 · 白色=未來</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Day labels */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <span />
              {["四", "五", "六", "日", "一", "二", "三"].map((d) => (
                <span key={d} className="text-center text-[10px] text-muted-foreground">{d}</span>
              ))}
            </div>
            {heatmapData.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-8 gap-1 items-center">
                <span className="text-[10px] text-muted-foreground text-right pr-1">第{wIdx + 1}週</span>
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date} · ${day.type}${day.completed ? " ✓" : ""}`}
                    className={cn(
                      "h-8 rounded-md border transition-all",
                      day.isFuture
                        ? "bg-muted/20 border-dashed border-muted"
                        : day.completed
                          ? cn(workoutColors[day.type] ?? "bg-gray-400", "border-transparent opacity-90")
                          : day.type === "rest"
                            ? "bg-muted/40 border-muted"
                            : "bg-red-200 dark:bg-red-900/40 border-red-300"
                    )}
                  />
                ))}
              </div>
            ))}
            <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-purple-500" /> 重訓A</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-indigo-500" /> 重訓B</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-cyan-500" /> 有氧</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-muted/60 border" /> 休息</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded bg-red-200 dark:bg-red-900/40 border-red-300 border" /> 未完成</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Weekly Check-in Tab ──────────────────────────────────────────────────────

function WeeklyCheckInTab() {
  const { weeklyCheckIns, submitWeeklyCheckIn, monthlyPlan, dailyLogs } = useLife()

  const planStart = new Date(monthlyPlan.startDate)
  const today = new Date()
  const currentWeek = Math.min(4, Math.floor((today.getTime() - planStart.getTime()) / (7 * 86400000)) + 1)

  const currentCheckIn = weeklyCheckIns.find((c) => c.weekNumber === currentWeek)

  // Auto-compute 7-day avg weight for current week
  const computedAvgWeight = useMemo(() => {
    const weekStart = new Date(planStart)
    weekStart.setDate(weekStart.getDate() + (currentWeek - 1) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const ws = weekStart.toISOString().split("T")[0]
    const we = weekEnd.toISOString().split("T")[0]
    const weights = dailyLogs
      .filter((l) => l.date >= ws && l.date <= we && l.weight)
      .map((l) => l.weight!)
    if (weights.length === 0) return undefined
    return +(weights.reduce((s, v) => s + v, 0) / weights.length).toFixed(2)
  }, [dailyLogs, currentWeek, planStart])

  const [form, setForm] = useState({
    avgWeight:      String(currentCheckIn?.avgWeight ?? computedAvgWeight ?? ""),
    waist:          String(currentCheckIn?.waist ?? ""),
    bodyFat:        String(currentCheckIn?.bodyFat ?? ""),
    muscleMass:     String(currentCheckIn?.muscleMass ?? ""),
    strengthSessions: String(currentCheckIn?.strengthSessions ?? 0),
    cardioSessions:   String(currentCheckIn?.cardioSessions ?? 0),
    avgSleep:       String(currentCheckIn?.avgSleep ?? ""),
    energyLevel:    currentCheckIn?.energyLevel ?? 3,
    notes:          currentCheckIn?.notes ?? "",
  })

  const [saved, setSaved] = useState(false)

  const handleSubmit = () => {
    const weekStartDate = new Date(planStart)
    weekStartDate.setDate(weekStartDate.getDate() + (currentWeek - 1) * 7)
    submitWeeklyCheckIn({
      weekNumber: currentWeek,
      weekStartDate: weekStartDate.toISOString().split("T")[0],
      checkInDate: today.toISOString().split("T")[0],
      avgWeight:    form.avgWeight    ? Number(form.avgWeight)    : undefined,
      waist:        form.waist        ? Number(form.waist)        : undefined,
      bodyFat:      form.bodyFat      ? Number(form.bodyFat)      : undefined,
      muscleMass:   form.muscleMass   ? Number(form.muscleMass)   : undefined,
      strengthSessions: Number(form.strengthSessions),
      cardioSessions:   Number(form.cardioSessions),
      avgSleep:     form.avgSleep     ? Number(form.avgSleep)     : undefined,
      energyLevel:  form.energyLevel,
      notes:        form.notes || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Current week form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardListIcon className="size-4 text-primary" /> 第 {currentWeek} 週檢查
              </CardTitle>
              <CardDescription>
                {weekFocuses[currentWeek - 1]?.focus}
              </CardDescription>
            </div>
            {computedAvgWeight && (
              <Badge variant="secondary" className="text-xs">
                自動計算均重 {computedAvgWeight} kg
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Body composition */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">身體組成</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "avgWeight",  label: "7日平均體重 (kg)", step: "0.01" },
                { key: "waist",      label: "腰圍 (cm)",         step: "0.5" },
                { key: "bodyFat",    label: "體脂率 (%)",         step: "0.1" },
                { key: "muscleMass", label: "肌肉量 (kg)",        step: "0.1" },
              ].map(({ key, label, step }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number" step={step}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="h-8 text-sm bg-muted/40"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">本週活動</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "strengthSessions", label: "重訓次數" },
                { key: "cardioSessions",   label: "有氧次數" },
                { key: "avgSleep",         label: "平均睡眠 (hr)", step: "0.1" },
              ].map(({ key, label, step }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number" step={step}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="h-8 text-sm bg-muted/40"
                    placeholder="—"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">本週精神狀態 ({form.energyLevel}/5)</Label>
                <RangeSlider
                  min={1} max={5} step={1} value={form.energyLevel}
                  onChange={(v) => setForm((p) => ({ ...p, energyLevel: v }))}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">本週總結與下週調整</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="本週感受、飲食調整、下週目標…"
              className="text-sm bg-muted/40 min-h-20 resize-none"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" variant={saved ? "outline" : "default"}>
            {saved ? "✓ 已儲存" : "提交本週檢查"}
          </Button>
        </CardContent>
      </Card>

      {/* Previous weeks */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">歷週紀錄</p>
        {weeklyCheckIns.filter((c) => c.weekNumber < currentWeek && c.avgWeight).map((c) => {
          const prev = weeklyCheckIns.find((x) => x.weekNumber === c.weekNumber - 1)
          const weightDiff = prev?.avgWeight && c.avgWeight ? +(c.avgWeight - prev.avgWeight).toFixed(2) : undefined
          return (
            <Card key={c.id} className="bg-muted/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">第 {c.weekNumber} 週</span>
                      <Badge variant="secondary" className="text-[10px]">{c.checkInDate}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{weekFocuses[c.weekNumber - 1]?.focus}</p>
                    {c.notes && <p className="text-xs text-muted-foreground mt-2 italic">「{c.notes}」</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right shrink-0">
                    <span className="text-lg font-bold">{c.avgWeight} kg</span>
                    {weightDiff !== undefined && (
                      <span className={cn("text-xs flex items-center gap-0.5", weightDiff < 0 ? "text-green-500" : "text-red-400")}>
                        {weightDiff < 0 ? <ChevronDownIcon className="size-3" /> : <ChevronUpIcon className="size-3" />}
                        {Math.abs(weightDiff)} kg
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t">
                  {c.bodyFat !== undefined  && <div className="text-center"><p className="text-xs text-muted-foreground">體脂%</p><p className="font-semibold">{c.bodyFat}%</p></div>}
                  {c.waist   !== undefined  && <div className="text-center"><p className="text-xs text-muted-foreground">腰圍</p><p className="font-semibold">{c.waist}cm</p></div>}
                  <div className="text-center"><p className="text-xs text-muted-foreground">重訓</p><p className="font-semibold">{c.strengthSessions}次</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">有氧</p><p className="font-semibold">{c.cardioSessions}次</p></div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────

function PlanTab() {
  const { monthlyPlan, weeklyCheckIns, dailyLogs } = useLife()
  const [workoutView, setWorkoutView] = useState<"a" | "b">("a")
  const [expandedMealDay, setExpandedMealDay] = useState<number | null>(0)

  const planStart = new Date(monthlyPlan.startDate)
  const today = new Date()
  const currentWeek = Math.min(4, Math.floor((today.getTime() - planStart.getTime()) / (7 * 86400000)) + 1)
  const endDate = new Date(planStart)
  endDate.setDate(endDate.getDate() + 28)
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000))

  // Latest known body composition
  const latestWithBodyFat = [...dailyLogs].reverse().find((l) => l.bodyFat)
  const latestWeight = [...dailyLogs].reverse().find((l) => l.weight)
  const latestWeeklyMuscle = [...weeklyCheckIns].reverse().find((c) => c.muscleMass)

  const currentWeight = latestWeight?.weight ?? monthlyPlan.startWeight
  const currentBodyFat = latestWithBodyFat?.bodyFat ?? monthlyPlan.startBodyFat
  const currentMuscle = latestWeeklyMuscle?.muscleMass ?? monthlyPlan.startMuscle

  const weightProgress = Math.min(100,
    ((monthlyPlan.startWeight - currentWeight) / (monthlyPlan.startWeight - monthlyPlan.targetWeightMin)) * 100
  )
  const fatProgress = Math.min(100,
    ((monthlyPlan.startBodyFat - currentBodyFat) / (monthlyPlan.startBodyFat - monthlyPlan.targetBodyFatMax)) * 100
  )
  const muscleOK = currentMuscle >= monthlyPlan.targetMuscle

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {monthlyPlan.startDate} → {endDate.toISOString().split("T")[0]}
          </p>
          <p className="text-xs text-muted-foreground">剩餘 {daysLeft} 天 · 目前第 {currentWeek} 週</p>
        </div>
        <Badge className="text-xs">{weekFocuses[currentWeek - 1]?.icon} {weekFocuses[currentWeek - 1]?.focus}</Badge>
      </div>

      {/* Goal progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">體重目標</CardTitle>
            <CardDescription>{monthlyPlan.startWeight}kg → {monthlyPlan.targetWeightMin}–{monthlyPlan.targetWeightMax}kg</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold">{currentWeight} <span className="text-sm font-normal text-muted-foreground">kg</span></span>
              <Badge variant={currentWeight <= monthlyPlan.targetWeightMax ? "default" : "secondary"}>
                {currentWeight <= monthlyPlan.targetWeightMax ? "達成 🎉" : "進行中"}
              </Badge>
            </div>
            <ProgressBar value={Math.max(0, weightProgress)} max={100} colorClass="bg-blue-500" />
            <p className="text-xs text-muted-foreground mt-1">
              已減 {(monthlyPlan.startWeight - currentWeight).toFixed(1)} kg · 目標 {(monthlyPlan.startWeight - monthlyPlan.targetWeightMin).toFixed(1)} kg
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">體脂率目標</CardTitle>
            <CardDescription>{monthlyPlan.startBodyFat}% → {monthlyPlan.targetBodyFatMin}–{monthlyPlan.targetBodyFatMax}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold">{currentBodyFat} <span className="text-sm font-normal text-muted-foreground">%</span></span>
              <Badge variant={currentBodyFat <= monthlyPlan.targetBodyFatMax ? "default" : "secondary"}>
                {currentBodyFat <= monthlyPlan.targetBodyFatMax ? "達成 🎉" : "進行中"}
              </Badge>
            </div>
            <ProgressBar value={Math.max(0, fatProgress)} max={100} colorClass="bg-orange-500" />
            <p className="text-xs text-muted-foreground mt-1">
              已減 {(monthlyPlan.startBodyFat - currentBodyFat).toFixed(1)}% · 目標 {(monthlyPlan.startBodyFat - monthlyPlan.targetBodyFatMax).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">肌肉量維持</CardTitle>
            <CardDescription>≥ {monthlyPlan.targetMuscle}kg（起始 {monthlyPlan.startMuscle}kg）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-bold">{currentMuscle} <span className="text-sm font-normal text-muted-foreground">kg</span></span>
              <Badge variant={muscleOK ? "default" : "destructive"}>
                {muscleOK ? "良好 ✓" : "注意流失"}
              </Badge>
            </div>
            <ProgressBar value={currentMuscle} max={monthlyPlan.startMuscle + 1} colorClass={muscleOK ? "bg-green-500" : "bg-red-500"} />
          </CardContent>
        </Card>
      </div>

      {/* 4-week progression */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" /> 四週執行重點
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {weekFocuses.map((wf) => (
              <div
                key={wf.week}
                className={cn(
                  "rounded-xl border p-3 text-sm",
                  wf.week === currentWeek
                    ? "bg-primary/10 border-primary/30"
                    : wf.week < currentWeek
                      ? "bg-muted/20 border-muted"
                      : "bg-muted/10 border-dashed border-muted"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{wf.icon}</span>
                  <span className="font-semibold">{wf.label}</span>
                  {wf.week === currentWeek && <Badge variant="default" className="text-[9px] h-4 ml-auto">當前</Badge>}
                  {wf.week < currentWeek && <Badge variant="outline" className="text-[9px] h-4 ml-auto">完成</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{wf.focus}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workout plans */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DumbbellIcon className="size-4 text-primary" /> 重訓計畫
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={workoutView === "a" ? "default" : "outline"} onClick={() => setWorkoutView("a")} className="h-7 text-xs">計畫 A</Button>
              <Button size="sm" variant={workoutView === "b" ? "default" : "outline"} onClick={() => setWorkoutView("b")} className="h-7 text-xs">計畫 B</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(workoutView === "a" ? workoutPlanA : workoutPlanB).map((ex, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm font-medium">{ex.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{ex.sets} 組</Badge>
                  <Badge variant="secondary" className="text-xs">{ex.repsOrTime}</Badge>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1 pl-8">
              {workoutView === "a"
                ? "週一 / 週五（奇數週）— 全身推拉+核心"
                : "週三 / 週五（偶數週）— 下肢主導+推拉+核心"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Meal plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UtensilsIcon className="size-4 text-primary" /> 7天循環飲食菜單
          </CardTitle>
          <CardDescription>連續執行4週，外食符合「蛋白質足、澱粉適量、少油炸」即可替換</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {mealPlanCycle.map((dayPlan, idx) => (
            <div key={idx} className="border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpandedMealDay(expandedMealDay === idx ? null : idx)}
              >
                <span className="font-semibold text-sm text-primary">{dayPlan.day}</span>
                <span className="text-muted-foreground">{expandedMealDay === idx ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}</span>
              </button>
              {expandedMealDay === idx && (
                <div className="px-3 pb-3 space-y-2">
                  {dayPlan.meals.map((meal) => (
                    <div key={meal.time} className="flex gap-2.5 items-start text-sm">
                      <Badge variant="outline" className="shrink-0 w-10 justify-center text-[10px] h-5">{meal.time}</Badge>
                      <span className="text-muted-foreground text-xs leading-5">{meal.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Success criteria */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <StarIcon className="size-4 text-yellow-500" /> 成功判斷標準
          </CardTitle>
          <CardDescription>一個月後達成多數即成功</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: "體重下降 1.5–2 kg",                done: (monthlyPlan.startWeight - currentWeight) >= 1.0 },
              { label: "體脂率下降約 1–1.5%",               done: (monthlyPlan.startBodyFat - currentBodyFat) >= 0.5 },
              { label: "腰圍下降 2–4 cm",                   done: false },
              { label: "肌肉量維持 54 kg 以上",              done: currentMuscle >= 54 },
              { label: "啞鈴重量或次數有進步",                done: false },
              { label: "白天精神與專注力更穩",                done: false },
            ].map(({ label, done }, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                {done
                  ? <CheckCircle2Icon className="size-4 text-green-500 shrink-0" />
                  : <CircleIcon className="size-4 text-muted-foreground shrink-0" />}
                <span className={cn("text-sm", done ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
                {done && <Badge variant="outline" className="ml-auto text-[10px] text-green-600 border-green-300">✓</Badge>}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center italic">
            「這個月不是追求極速變瘦，而是讓身體變得更緊、更穩、更有力量。」
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { dailyGoals, updateDailyGoals, monthlyPlan, updateMonthlyPlan } = useLife()

  const [goalForm, setGoalForm] = useState({
    calories:  String(dailyGoals.calories),
    protein:   String(dailyGoals.protein),
    water:     String(dailyGoals.water),
    steps:     String(dailyGoals.steps),
    sleep:     String(dailyGoals.sleep),
  })

  const [planForm, setPlanForm] = useState({
    startDate:   monthlyPlan.startDate,
    startWeight: String(monthlyPlan.startWeight),
    targetWeightMin: String(monthlyPlan.targetWeightMin),
    targetWeightMax: String(monthlyPlan.targetWeightMax),
    startBodyFat: String(monthlyPlan.startBodyFat),
    targetBodyFatMin: String(monthlyPlan.targetBodyFatMin),
    targetBodyFatMax: String(monthlyPlan.targetBodyFatMax),
    startMuscle: String(monthlyPlan.startMuscle),
    targetMuscle: String(monthlyPlan.targetMuscle),
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateDailyGoals({
      calories: Number(goalForm.calories),
      protein:  Number(goalForm.protein),
      water:    Number(goalForm.water),
      steps:    Number(goalForm.steps),
      sleep:    Number(goalForm.sleep),
    })
    updateMonthlyPlan({
      startDate:        planForm.startDate,
      startWeight:      Number(planForm.startWeight),
      targetWeightMin:  Number(planForm.targetWeightMin),
      targetWeightMax:  Number(planForm.targetWeightMax),
      startBodyFat:     Number(planForm.startBodyFat),
      targetBodyFatMin: Number(planForm.targetBodyFatMin),
      targetBodyFatMax: Number(planForm.targetBodyFatMax),
      startMuscle:      Number(planForm.startMuscle),
      targetMuscle:     Number(planForm.targetMuscle),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Daily goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TargetIcon className="size-4 text-primary" /> 每日目標設定
          </CardTitle>
          <CardDescription>調整符合你當前狀況的每日追蹤目標</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "calories", label: "熱量目標 (kcal)",   hint: "1800–2100" },
              { key: "protein",  label: "蛋白質目標 (g)",     hint: "110–130" },
              { key: "water",    label: "飲水目標 (ml)",      hint: "2000–2500" },
              { key: "steps",    label: "步數目標",           hint: "7000–9000" },
              { key: "sleep",    label: "睡眠目標 (hr)",      hint: "7+" },
            ].map(({ key, label, hint }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  value={(goalForm as Record<string, string>)[key]}
                  onChange={(e) => setGoalForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="bg-muted/40"
                  placeholder={hint}
                />
                <p className="text-[10px] text-muted-foreground">建議：{hint}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan body composition goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulseIcon className="size-4 text-primary" /> 計畫身體組成目標
          </CardTitle>
          <CardDescription>設定一個月計畫的起始值與目標值</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">計畫開始日期</Label>
              <Input
                type="date"
                value={planForm.startDate}
                onChange={(e) => setPlanForm((p) => ({ ...p, startDate: e.target.value }))}
                className="bg-muted/40"
              />
            </div>
            {[
              { key: "startWeight",     label: "起始體重 (kg)" },
              { key: "targetWeightMin", label: "目標體重下限 (kg)" },
              { key: "targetWeightMax", label: "目標體重上限 (kg)" },
              { key: "startBodyFat",    label: "起始體脂率 (%)" },
              { key: "targetBodyFatMin", label: "目標體脂下限 (%)" },
              { key: "targetBodyFatMax", label: "目標體脂上限 (%)" },
              { key: "startMuscle",     label: "起始肌肉量 (kg)" },
              { key: "targetMuscle",    label: "肌肉量目標 (kg)" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="number" step="0.1"
                  value={(planForm as Record<string, string>)[key]}
                  onChange={(e) => setPlanForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="bg-muted/40"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" size="lg" variant={saved ? "outline" : "default"}>
        {saved ? "✓ 設定已儲存" : "儲存設定"}
      </Button>
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export function FitnessDashboard() {
  return (
    <div className="flex flex-col w-full h-full overflow-y-auto">
      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full max-w-xl grid-cols-5 mb-6">
            <TabsTrigger value="today"   className="text-xs gap-1"><ActivityIcon className="size-3" />今日</TabsTrigger>
            <TabsTrigger value="trends"  className="text-xs gap-1"><BarChart2Icon className="size-3" />趨勢</TabsTrigger>
            <TabsTrigger value="weekly"  className="text-xs gap-1"><ClipboardListIcon className="size-3" />週檢查</TabsTrigger>
            <TabsTrigger value="plan"    className="text-xs gap-1"><BookOpenIcon className="size-3" />計畫</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1"><SettingsIcon className="size-3" />設定</TabsTrigger>
          </TabsList>

          <TabsContent value="today">    <TodayTab />         </TabsContent>
          <TabsContent value="trends">   <TrendsTab />        </TabsContent>
          <TabsContent value="weekly">   <WeeklyCheckInTab /> </TabsContent>
          <TabsContent value="plan">     <PlanTab />          </TabsContent>
          <TabsContent value="settings"> <SettingsTab />      </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
