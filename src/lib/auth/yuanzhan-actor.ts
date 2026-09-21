/**
 * 營運工作台的「席位」：把登入帳號對應到 v5 工作台裡的人。
 *
 * v5 runtime 內部用 `DB.me`（'yz' | 'lily'）決定看得到什麼：
 * `isOwner()` 就是 `DB.me === 'yz'`，其餘欄位依契約 §18 保密、§20.4 資安遮蔽。
 * 過去那個右上角的「切換視角」把這件事變成一個按鈕；現在它由登入身分決定，
 * 每個帳號進來就是自己，不能在介面上換人。
 *
 * 例外只有一個：共用帳號（例如 team.yzedtech@gmail.com）保留切換，
 * 用於對外展示與檢查「員工實際看得到什麼」。
 */

export type YuanzhanActorId = "yz" | "lily"

export type YuanzhanSeat = {
  email: string
  actor: YuanzhanActorId
  /** owner 由 actor 推導（與 runtime 的 isOwner() 同一個定義），不獨立設定以免兩邊不一致。 */
  role: "owner" | "member"
  /** 共用帳號才為 true：可在介面上切換公司／員工視角。 */
  canSwitchActor: boolean
}

const ACTOR_IDS: YuanzhanActorId[] = ["yz", "lily"]

const DEFAULT_SEATS: Array<{ email: string; actor: YuanzhanActorId; canSwitchActor: boolean }> = [
  { email: "taioliver688@gmail.com", actor: "yz", canSwitchActor: false },
  { email: "lilyzuo405@gmail.com", actor: "lily", canSwitchActor: false },
  { email: "team.yzedtech@gmail.com", actor: "yz", canSwitchActor: true },
]

function isActorId(value: string): value is YuanzhanActorId {
  return (ACTOR_IDS as string[]).includes(value)
}

function toSeat(entry: { email: string; actor: YuanzhanActorId; canSwitchActor: boolean }): YuanzhanSeat {
  return {
    email: entry.email,
    actor: entry.actor,
    role: entry.actor === "yz" ? "owner" : "member",
    canSwitchActor: entry.canSwitchActor,
  }
}

/**
 * 解析 `YUANZHAN_SEATS`：`email:actor[:switch]`，以逗號分隔。
 * 例：`taioliver688@gmail.com:yz,lilyzuo405@gmail.com:lily,team.yzedtech@gmail.com:yz:switch`
 * 格式錯誤不丟例外——席位設定壞掉不應該讓整個工作台打不開，而是退回預設名單。
 */
export function parseYuanzhanSeatsEnv(raw: string | undefined | null): YuanzhanSeat[] {
  if (!raw) return []

  const seats: YuanzhanSeat[] = []
  for (const entry of raw.split(",")) {
    const [email, actor, flag] = entry.trim().split(":").map((part) => part.trim())
    if (!email || !email.includes("@") || !actor || !isActorId(actor)) {
      console.warn(`[yuanzhan] 略過無法解析的席位設定："${entry.trim()}"`)
      continue
    }
    seats.push(
      toSeat({
        email: email.toLowerCase(),
        actor,
        canSwitchActor: (flag ?? "").toLowerCase() === "switch",
      }),
    )
  }
  return seats
}

export function getYuanzhanSeats(): YuanzhanSeat[] {
  const configured = parseYuanzhanSeatsEnv(process.env.YUANZHAN_SEATS)
  return configured.length > 0 ? configured : DEFAULT_SEATS.map(toSeat)
}

/** 沒有席位就是 null：可以登入 Personal OS，但進不了公司營運工作台。 */
export function resolveYuanzhanSeat(email: string | null | undefined): YuanzhanSeat | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  return getYuanzhanSeats().find((seat) => seat.email === normalized) ?? null
}
