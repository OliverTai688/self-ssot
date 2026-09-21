import type { ActorId, OperatingRecord } from "@/types/yuanzhan-ui"
export function weekOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7)
  return d.toISOString().slice(0, 10)
}
export function workMetrics(records: OperatingRecord[], actor?: ActorId, size?: string) {
  const tasks = records.filter(r => r.kind === "task" && (!actor || r.assignee === actor) && (!size || r.size === size))
  const done = tasks.filter(r => r.status === "完成" && r.started && r.completed && r.completed >= r.started)
  const cycles = done.map(r => (Date.parse(r.completed!) - Date.parse(r.started!)) / 86400000).sort((a, b) => a - b)
  const weekCounts = done.reduce<Record<string, number>>((counts, r) => { const week = weekOf(r.completed!); counts[week] = (counts[week] ?? 0) + 1; return counts }, {})
  const sortedWeeks = Object.keys(weekCounts).sort()
  const spanWeeks = sortedWeeks.length ? Math.round((Date.parse(sortedWeeks.at(-1)!) - Date.parse(sortedWeeks[0])) / (86400000 * 7)) + 1 : 0
  const count = done.length
  return { count, weeks: spanWeeks, weekCounts, throughput: spanWeeks ? count / spanWeeks : null, p50: count ? cycles[Math.ceil(count * .5) - 1] : null, p85: count ? cycles[Math.ceil(count * .85) - 1] : null, wip: tasks.filter(r => r.status === "進行中" || r.status === "受阻").length, forecastReady: count >= 8 && spanWeeks >= 4 }
}
export function signalsFor(records: OperatingRecord[], today: string) {
  return records.flatMap(r => {
    if ((r.kind === "task" || r.kind === "commitment") && r.due && r.due < today && r.status !== "完成") return [{ id: `overdue-${r.id}`, recordId: r.id, title: r.title, reason: "期限已過，請確認下一步" }]
    if (r.kind === "transaction" && !r.fileIds?.length) return [{ id: `voucher-${r.id}`, recordId: r.id, title: r.title, reason: "尚未附上憑證" }]
    if (r.kind === "task" && r.status === "受阻") return [{ id: `blocked-${r.id}`, recordId: r.id, title: r.title, reason: "工作受阻，需要協助" }]
    return []
  })
}
