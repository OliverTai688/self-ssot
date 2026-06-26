export type WorkoutType =
  | "strength_a"
  | "strength_b"
  | "cardio"
  | "rest"
  | "stretch"
  | "walk"

export interface WorkoutSession {
  type: WorkoutType
  completed: boolean
  duration?: number  // minutes
  rpe?: number       // Rate of Perceived Exertion 1–10
  notes?: string
}

export interface DailyLog {
  id: string
  date: string        // YYYY-MM-DD
  weight?: number     // kg
  bodyFat?: number    // %
  calories?: number   // kcal
  protein?: number    // g
  water?: number      // ml
  steps?: number
  sleep?: number      // hours (previous night)
  mood?: number       // 1–5 energy/mood score
  restingHR?: number  // bpm
  notes?: string
  workout?: WorkoutSession
}

export interface WeeklyCheckIn {
  id: string
  weekNumber: number      // 1–4
  weekStartDate: string   // YYYY-MM-DD (Monday of that week)
  checkInDate: string     // YYYY-MM-DD
  avgWeight?: number      // 7-day average, kg
  waist?: number          // cm
  bodyFat?: number        // %
  muscleMass?: number     // kg
  strengthSessions: number
  cardioSessions: number
  avgSleep?: number       // hours
  energyLevel?: number    // 1–5
  notes?: string
}

export interface MonthlyPlan {
  startDate: string
  startWeight: number
  targetWeightMin: number
  targetWeightMax: number
  startBodyFat: number
  targetBodyFatMin: number
  targetBodyFatMax: number
  startMuscle: number
  targetMuscle: number
  dailyCaloriesMin: number
  dailyCaloriesMax: number
  dailyProteinMin: number
  dailyProteinMax: number
  dailyWaterMin: number
  dailyWaterMax: number
  dailyStepsMin: number
  dailyStepsMax: number
  dailySleepMin: number
}

export interface DailyGoals {
  calories: number
  protein: number
  water: number
  steps: number
  sleep: number
}
