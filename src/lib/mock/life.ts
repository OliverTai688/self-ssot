import type { DailyLog, WeeklyCheckIn, MonthlyPlan, DailyGoals } from "@/types/life"

// ─── Monthly Plan (一個月減脂保肌) ────────────────────────────────────────────

export const mockMonthlyPlan: MonthlyPlan = {
  startDate: "2026-05-01",
  startWeight: 72.9,
  targetWeightMin: 71.0,
  targetWeightMax: 71.5,
  startBodyFat: 20.8,
  targetBodyFatMin: 19.0,
  targetBodyFatMax: 20.0,
  startMuscle: 54.7,
  targetMuscle: 54.0,
  dailyCaloriesMin: 1800,
  dailyCaloriesMax: 2100,
  dailyProteinMin: 110,
  dailyProteinMax: 130,
  dailyWaterMin: 2000,
  dailyWaterMax: 2500,
  dailyStepsMin: 7000,
  dailyStepsMax: 9000,
  dailySleepMin: 7,
}

export const defaultDailyGoals: DailyGoals = {
  calories: 2100,
  protein: 130,
  water: 2500,
  steps: 9000,
  sleep: 7,
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function log(date: string, data: Omit<DailyLog, "id" | "date">): DailyLog {
  return { id: `log-${date}`, date, ...data }
}

// ─── Daily Logs — May 1–20, 2026 ─────────────────────────────────────────────
// May 2026: May 1 = Thu, May 5 = Mon, May 12 = Mon, May 19 = Mon
// Weekly schedule: Mon=strength_a, Tue=cardio, Wed=strength_b, Thu=rest, Fri=strength(alt), Sat=cardio+stretch, Sun=rest

export const mockDailyLogs: DailyLog[] = [
  // ── Week 1 (May 1–7) ──────────────────────────────────────────────────────
  log("2026-05-01", {
    weight: 72.9, bodyFat: 20.8,
    calories: 1980, protein: 115, water: 2200, steps: 7200, sleep: 7.0, mood: 3, restingHR: 62,
    workout: { type: "rest", completed: true },
  }),
  log("2026-05-02", {
    weight: 72.8,
    calories: 2050, protein: 120, water: 2300, steps: 8100, sleep: 7.5, mood: 4, restingHR: 60,
    workout: { type: "strength_a", completed: true, duration: 45, rpe: 6 },
  }),
  log("2026-05-03", {
    weight: 72.7,
    calories: 1920, protein: 112, water: 2100, steps: 7800, sleep: 7.0, mood: 4, restingHR: 61,
    workout: { type: "cardio", completed: true, duration: 30, rpe: 5 },
  }),
  log("2026-05-04", {
    weight: 72.9, bodyFat: 20.6,
    calories: 2100, protein: 108, water: 1900, steps: 6500, sleep: 8.0, mood: 3, restingHR: 63,
    workout: { type: "rest", completed: true },
  }),
  log("2026-05-05", {
    weight: 72.6,
    calories: 1960, protein: 118, water: 2400, steps: 8500, sleep: 6.5, mood: 3, restingHR: 61,
    workout: { type: "strength_a", completed: true, duration: 50, rpe: 7 },
  }),
  log("2026-05-06", {
    weight: 72.5,
    calories: 1890, protein: 114, water: 2200, steps: 9100, sleep: 7.5, mood: 4, restingHR: 59,
    workout: { type: "cardio", completed: true, duration: 35, rpe: 5 },
  }),
  log("2026-05-07", {
    weight: 72.4,
    calories: 2020, protein: 119, water: 2300, steps: 7600, sleep: 7.0, mood: 4, restingHR: 60,
    workout: { type: "strength_b", completed: true, duration: 48, rpe: 7 },
  }),

  // ── Week 2 (May 8–14) ─────────────────────────────────────────────────────
  log("2026-05-08", {
    weight: 72.5, bodyFat: 20.5,
    calories: 1950, protein: 116, water: 2100, steps: 7000, sleep: 7.5, mood: 3, restingHR: 61,
    workout: { type: "rest", completed: true },
  }),
  log("2026-05-09", {
    weight: 72.3,
    calories: 2080, protein: 122, water: 2400, steps: 8800, sleep: 7.0, mood: 4, restingHR: 59,
    workout: { type: "strength_a", completed: true, duration: 50, rpe: 7, notes: "深蹲重量+1kg" },
  }),
  log("2026-05-10", {
    weight: 72.4,
    calories: 1900, protein: 117, water: 2300, steps: 8200, sleep: 6.5, mood: 3, restingHR: 62,
    workout: { type: "cardio", completed: true, duration: 30, rpe: 5 },
  }),
  log("2026-05-11", {
    weight: 72.6,
    calories: 2200, protein: 105, water: 1800, steps: 5800, sleep: 8.5, mood: 3, restingHR: 64,
    workout: { type: "rest", completed: true, notes: "週日聚餐，飲食較寬鬆" },
  }),
  log("2026-05-12", {
    weight: 72.3,
    calories: 1940, protein: 123, water: 2500, steps: 8900, sleep: 7.0, mood: 4, restingHR: 59,
    workout: { type: "strength_a", completed: true, duration: 52, rpe: 8 },
  }),
  log("2026-05-13", {
    weight: 72.2,
    calories: 1880, protein: 118, water: 2300, steps: 9200, sleep: 7.5, mood: 5, restingHR: 58,
    workout: { type: "cardio", completed: true, duration: 35, rpe: 6 },
  }),
  log("2026-05-14", {
    weight: 72.1,
    calories: 2010, protein: 124, water: 2400, steps: 8100, sleep: 7.0, mood: 4, restingHR: 59,
    workout: { type: "strength_b", completed: true, duration: 50, rpe: 7, notes: "側棒式加到35秒" },
  }),

  // ── Week 3 (May 15–20, partial) ───────────────────────────────────────────
  log("2026-05-15", {
    weight: 72.2, bodyFat: 20.3,
    calories: 1960, protein: 120, water: 2200, steps: 7400, sleep: 7.0, mood: 3, restingHR: 61,
    workout: { type: "rest", completed: true },
  }),
  log("2026-05-16", {
    weight: 72.0,
    calories: 2040, protein: 126, water: 2600, steps: 9300, sleep: 7.5, mood: 4, restingHR: 59,
    workout: { type: "strength_a", completed: true, duration: 52, rpe: 7 },
  }),
  log("2026-05-17", {
    weight: 71.9,
    calories: 1910, protein: 121, water: 2400, steps: 8700, sleep: 6.5, mood: 4, restingHR: 60,
    workout: { type: "cardio", completed: true, duration: 32, rpe: 5 },
  }),
  log("2026-05-18", {
    weight: 72.1,
    calories: 2080, protein: 110, water: 2000, steps: 6200, sleep: 8.0, mood: 3, restingHR: 63,
    workout: { type: "rest", completed: true },
  }),
  log("2026-05-19", {
    weight: 71.9,
    calories: 1990, protein: 128, water: 2500, steps: 8600, sleep: 7.5, mood: 4, restingHR: 59,
    workout: { type: "strength_a", completed: true, duration: 48, rpe: 7 },
  }),
  // Today: May 20 (Tuesday = cardio) — partial data only
  log("2026-05-20", {
    weight: 72.0, sleep: 7.0, mood: 4,
    calories: 850, protein: 55, water: 1200, steps: 3200,
    workout: { type: "cardio", completed: false },
  }),
]

// ─── Weekly Check-ins ─────────────────────────────────────────────────────────

export const mockWeeklyCheckIns: WeeklyCheckIn[] = [
  {
    id: "checkin-w1",
    weekNumber: 1,
    weekStartDate: "2026-05-01",
    checkInDate: "2026-05-07",
    avgWeight: 72.7,
    waist: 82.0,
    bodyFat: 20.6,
    muscleMass: 54.7,
    strengthSessions: 3,
    cardioSessions: 2,
    avgSleep: 7.2,
    energyLevel: 3,
    notes: "第一週建立節奏，飲食基本達標，重訓完成3次，整體狀態穩定。",
  },
  {
    id: "checkin-w2",
    weekNumber: 2,
    weekStartDate: "2026-05-08",
    checkInDate: "2026-05-14",
    avgWeight: 72.35,
    waist: 81.5,
    bodyFat: 20.4,
    muscleMass: 54.6,
    strengthSessions: 3,
    cardioSessions: 2,
    avgSleep: 7.4,
    energyLevel: 4,
    notes: "體重持續下降，深蹲重量+1kg，精神狀態明顯改善，腰圍縮小0.5cm。",
  },
  {
    id: "checkin-w3",
    weekNumber: 3,
    weekStartDate: "2026-05-15",
    checkInDate: "2026-05-21",
    avgWeight: undefined,
    waist: undefined,
    bodyFat: undefined,
    muscleMass: undefined,
    strengthSessions: 2,
    cardioSessions: 1,
    avgSleep: 7.1,
    energyLevel: undefined,
    notes: "",
  },
]

// ─── Workout plans (reference data) ──────────────────────────────────────────

export const workoutPlanA = [
  { name: "啞鈴高腳杯深蹲", sets: 3, repsOrTime: "8–12 下" },
  { name: "啞鈴臥推", sets: 3, repsOrTime: "8–12 下" },
  { name: "單臂啞鈴划船", sets: 3, repsOrTime: "10–12 下" },
  { name: "啞鈴羅馬尼亞硬舉", sets: 3, repsOrTime: "8–12 下" },
  { name: "平板撐", sets: 3, repsOrTime: "30–45 秒" },
]

export const workoutPlanB = [
  { name: "保加利亞分腿蹲或弓箭步", sets: 3, repsOrTime: "8–10 下" },
  { name: "啞鈴肩推", sets: 3, repsOrTime: "8–12 下" },
  { name: "伏地挺身或上斜啞鈴臥推", sets: 3, repsOrTime: "8–12 下" },
  { name: "啞鈴臀推或臀橋", sets: 3, repsOrTime: "10–15 下" },
  { name: "側棒式", sets: 3, repsOrTime: "20–40 秒" },
]

export const mealPlanCycle = [
  {
    day: "Day 1",
    meals: [
      { time: "早餐", desc: "無糖豆漿＋水煮蛋 2 顆＋香蕉 1 根" },
      { time: "午餐", desc: "雞胸/雞腿便當，飯半碗，青菜加量" },
      { time: "點心", desc: "希臘優格或無糖優酪乳" },
      { time: "晚餐", desc: "豆腐＋魚/雞肉＋青菜，澱粉半碗" },
    ],
  },
  {
    day: "Day 2",
    meals: [
      { time: "早餐", desc: "燕麥＋無糖豆漿＋蛋 1–2 顆" },
      { time: "午餐", desc: "牛肉/豬里肌飯，飯半碗，避免炸物" },
      { time: "點心", desc: "茶葉蛋 2 顆或高蛋白飲" },
      { time: "晚餐", desc: "雞胸沙拉＋地瓜半條" },
    ],
  },
  {
    day: "Day 3",
    meals: [
      { time: "早餐", desc: "全麥吐司 1–2 片＋蛋＋無糖豆漿" },
      { time: "午餐", desc: "滷雞腿/魚排便當，飯半碗，青菜加量" },
      { time: "點心", desc: "無糖優酪乳或豆漿" },
      { time: "晚餐", desc: "火鍋清湯：肉片＋豆腐＋青菜，少加工火鍋料" },
    ],
  },
  {
    day: "Day 4",
    meals: [
      { time: "早餐", desc: "飯糰半顆或御飯糰＋無糖豆漿＋茶葉蛋" },
      { time: "午餐", desc: "雞肉/魚肉便當，飯半碗，少醬汁" },
      { time: "點心", desc: "香蕉或水果 1 份＋蛋白質飲品" },
      { time: "晚餐", desc: "蛋 2 顆＋豆腐＋青菜＋少量澱粉" },
    ],
  },
  {
    day: "Day 5",
    meals: [
      { time: "早餐", desc: "優格＋燕麥＋蛋 1 顆" },
      { time: "午餐", desc: "牛肉麵可吃，但麵減量，補青菜與蛋白質" },
      { time: "點心", desc: "茶葉蛋 2 顆" },
      { time: "晚餐", desc: "雞胸/魚＋青菜＋地瓜半條" },
    ],
  },
  {
    day: "Day 6",
    meals: [
      { time: "早餐", desc: "無糖豆漿＋蛋餅，少醬" },
      { time: "午餐", desc: "正常外食，但避免炸物與含糖飲" },
      { time: "點心", desc: "無糖優酪乳或高蛋白飲" },
      { time: "晚餐", desc: "清淡高蛋白餐：肉/魚/豆腐＋青菜" },
    ],
  },
  {
    day: "Day 7",
    meals: [
      { time: "早餐", desc: "蛋 2 顆＋水果 1 份＋無糖豆漿" },
      { time: "午餐", desc: "可安排彈性餐，但不要吃到過飽" },
      { time: "點心", desc: "視飢餓程度補蛋白質" },
      { time: "晚餐", desc: "回到清淡：蛋白質＋青菜，澱粉少量" },
    ],
  },
]

export const weekFocuses = [
  { week: 1, label: "第 1 週", focus: "建立節奏，不追求操爆", icon: "🌱" },
  { week: 2, label: "第 2 週", focus: "每個動作多 1–2 下或重量微增", icon: "📈" },
  { week: 3, label: "第 3 週", focus: "飲食最穩的一週，步數拉到 8000–10000", icon: "🎯" },
  { week: 4, label: "第 4 週", focus: "不暴衝，穩定完成並檢查成果", icon: "🏆" },
]
