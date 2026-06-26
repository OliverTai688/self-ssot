import type { ProjectTimeline } from "@/types/work"

export const mockProjectTimelines: Record<string, ProjectTimeline> = {
  // ─── p1: Lisa Q2 Dashboard (phase: review) ────────────────────────────────
  p1: {
    projectId: "p1",
    generatedAt: "2026-05-09T07:30:00Z",
    phases: [
      {
        phase: "discovery",
        label: "探索",
        startDate: "2026-04-01",
        endDate: "2026-04-07",
        status: "done",
        milestones: [
          { id: "m1-p1", title: "需求訪談完成", date: "2026-04-05", status: "completed" },
          { id: "m2-p1", title: "範圍文件確認", date: "2026-04-07", status: "completed" },
        ],
      },
      {
        phase: "planning",
        label: "規劃",
        startDate: "2026-04-08",
        endDate: "2026-04-21",
        status: "done",
        milestones: [
          { id: "m3-p1", title: "原型稿（Wireframe）交付", date: "2026-04-15", status: "completed" },
          { id: "m4-p1", title: "視覺風格確認", date: "2026-04-20", status: "completed" },
        ],
      },
      {
        phase: "execution",
        label: "執行",
        startDate: "2026-04-22",
        endDate: "2026-05-09",
        status: "done",
        milestones: [
          { id: "m5-p1", title: "銷售趨勢模組完成", date: "2026-04-30", status: "completed" },
          { id: "m6-p1", title: "客戶分層模組完成", date: "2026-05-05", status: "completed" },
          { id: "m7-p1", title: "渠道分析模組完成", date: "2026-05-09", status: "completed" },
        ],
      },
      {
        phase: "review",
        label: "審稿",
        startDate: "2026-05-10",
        endDate: "2026-05-17",
        status: "active",
        milestones: [
          { id: "m8-p1", title: "客戶反饋整合", date: "2026-05-15", status: "upcoming" },
          { id: "m9-p1", title: "WCAG AA 色彩驗收", date: "2026-05-16", status: "upcoming" },
        ],
      },
      {
        phase: "maintenance",
        label: "維護",
        startDate: "2026-05-18",
        endDate: "2026-05-20",
        status: "upcoming",
        milestones: [
          { id: "m10-p1", title: "最終版本交付", date: "2026-05-20", status: "upcoming" },
        ],
      },
    ],
  },

  // ─── p2: Allen NGO Proposal (phase: execution) ────────────────────────────
  p2: {
    projectId: "p2",
    generatedAt: "2026-05-08T09:00:00Z",
    phases: [
      {
        phase: "discovery",
        label: "探索",
        startDate: "2026-04-15",
        endDate: "2026-04-20",
        status: "done",
        milestones: [
          { id: "m1-p2", title: "NGO 背景研究完成", date: "2026-04-18", status: "completed" },
        ],
      },
      {
        phase: "planning",
        label: "規劃",
        startDate: "2026-04-21",
        endDate: "2026-04-30",
        status: "done",
        milestones: [
          { id: "m2-p2", title: "封面風格確認", date: "2026-04-25", status: "completed" },
          { id: "m3-p2", title: "版面結構規劃", date: "2026-04-30", status: "completed" },
        ],
      },
      {
        phase: "execution",
        label: "執行",
        startDate: "2026-05-01",
        endDate: "2026-05-10",
        status: "active",
        milestones: [
          { id: "m4-p2", title: "封面設計完成", date: "2026-05-03", status: "completed" },
          { id: "m5-p2", title: "執行摘要頁完成", date: "2026-05-06", status: "completed" },
          { id: "m6-p2", title: "財務規劃章節完成", date: "2026-05-10", status: "upcoming" },
        ],
      },
      {
        phase: "review",
        label: "審稿",
        startDate: "2026-05-11",
        endDate: "2026-05-12",
        status: "upcoming",
        milestones: [
          { id: "m7-p2", title: "Allen 最終確認", date: "2026-05-12", status: "upcoming" },
        ],
      },
      {
        phase: "maintenance",
        label: "維護",
        startDate: "2026-05-12",
        endDate: "2026-05-12",
        status: "upcoming",
        milestones: [],
      },
    ],
  },

  // ─── p3: 商會活動 Banner (phase: execution) ───────────────────────────────
  p3: {
    projectId: "p3",
    generatedAt: "2026-05-07T08:30:00Z",
    phases: [
      {
        phase: "discovery",
        label: "探索",
        startDate: "2026-04-20",
        endDate: "2026-04-22",
        status: "done",
        milestones: [
          { id: "m1-p3", title: "活動資訊收集", date: "2026-04-22", status: "completed" },
        ],
      },
      {
        phase: "planning",
        label: "規劃",
        startDate: "2026-04-23",
        endDate: "2026-04-27",
        status: "done",
        milestones: [
          { id: "m2-p3", title: "Banner 尺寸規格確認", date: "2026-04-25", status: "completed" },
        ],
      },
      {
        phase: "execution",
        label: "執行",
        startDate: "2026-04-28",
        endDate: "2026-05-07",
        status: "active",
        milestones: [
          { id: "m3-p3", title: "活動一 Banner 完成", date: "2026-04-30", status: "completed" },
          { id: "m4-p3", title: "活動二 Banner 完成", date: "2026-05-03", status: "completed" },
          { id: "m5-p3", title: "活動三 Banner 完成", date: "2026-05-07", status: "upcoming" },
        ],
      },
      {
        phase: "review",
        label: "審稿",
        startDate: "2026-05-07",
        endDate: "2026-05-08",
        status: "upcoming",
        milestones: [
          { id: "m6-p3", title: "Mark 最終確認", date: "2026-05-08", status: "upcoming" },
        ],
      },
      {
        phase: "maintenance",
        label: "維護",
        startDate: "2026-05-08",
        endDate: "2026-05-08",
        status: "upcoming",
        milestones: [],
      },
    ],
  },
}
