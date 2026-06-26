import type { LINEChat } from "@/types/sync-scope"

export const mockLINEChats: LINEChat[] = [
  {
    id: "lc-001",
    type: "group",
    name: "商會核心幹部群",
    memberCount: 12,
    unreadSinceLastSync: 34,
    lastMessageAt: "2026-05-09T10:22:00Z",
    previewMessage: "Mark：下週四的聚餐確定了，記得帶名片",
    isSelected: true,
    recentMessages: [
      { id: "m1", authorName: "Mark Wu",       text: "下週四的聚餐確定了，記得帶名片",            sentAt: "2026-05-09T10:22:00Z" },
      { id: "m2", authorName: "Allen Huang",   text: "收到，我會帶提案資料",                        sentAt: "2026-05-09T09:15:00Z" },
      { id: "m3", authorName: "Oliver",        text: "好的，我先確認場地容量",                      sentAt: "2026-05-09T08:50:00Z" },
    ],
  },
  {
    id: "lc-002",
    type: "direct",
    name: "Cathy Chen",
    memberCount: 2,
    unreadSinceLastSync: 5,
    lastMessageAt: "2026-05-08T22:10:00Z",
    previewMessage: "Cathy：那篇碳揭露的 paper 很值得看，我傳連結給你",
    isSelected: true,
    recentMessages: [
      { id: "m4", authorName: "Cathy Chen",    text: "那篇碳揭露的 paper 很值得看，我傳連結給你", sentAt: "2026-05-08T22:10:00Z" },
      { id: "m5", authorName: "Cathy Chen",    text: "另外我研究夥伴推薦了一個碳捕捉的資料庫",     sentAt: "2026-05-08T21:55:00Z" },
    ],
  },
  {
    id: "lc-003",
    type: "group",
    name: "nuva藍設計討論",
    memberCount: 5,
    unreadSinceLastSync: 18,
    lastMessageAt: "2026-05-08T16:30:00Z",
    previewMessage: "Amy：第三版 logo 出來了，請 Oliver 確認方向",
    isSelected: false,
    recentMessages: [
      { id: "m6", authorName: "Amy Lin",       text: "第三版 logo 出來了，請 Oliver 確認方向",     sentAt: "2026-05-08T16:30:00Z" },
      { id: "m7", authorName: "Oliver",        text: "好，我今晚看完給你",                          sentAt: "2026-05-08T16:45:00Z" },
    ],
  },
  {
    id: "lc-004",
    type: "direct",
    name: "Allen Huang",
    memberCount: 2,
    unreadSinceLastSync: 2,
    lastMessageAt: "2026-05-07T14:00:00Z",
    previewMessage: "Allen：我有一份舊的財務表格可以提供參考",
    isSelected: false,
    recentMessages: [
      { id: "m8", authorName: "Allen Huang",   text: "我有一份舊的財務表格可以提供參考",            sentAt: "2026-05-07T14:00:00Z" },
    ],
  },
  {
    id: "lc-005",
    type: "group",
    name: "演藝經紀 AI 專案",
    memberCount: 4,
    unreadSinceLastSync: 11,
    lastMessageAt: "2026-05-09T11:00:00Z",
    previewMessage: "PM：需求書第三版已更新到 Google Drive",
    isSelected: true,
    recentMessages: [
      { id: "m9",  authorName: "PM Leo",       text: "需求書第三版已更新到 Google Drive",           sentAt: "2026-05-09T11:00:00Z" },
      { id: "m10", authorName: "Oliver",       text: "收到，我下午審閱",                             sentAt: "2026-05-09T11:05:00Z" },
    ],
  },
]
