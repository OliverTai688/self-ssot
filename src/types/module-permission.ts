export type ModuleKey =
  | "ai-input"   // AI 工作桌
  | "dashboard"  // 今日
  | "inbox"      // 收件匣
  | "self"       // 自己
  | "work"       // 工作
  | "research"   // 研究
  | "chamber"    // 商會
  | "finance"    // 財務
  | "life"       // 生活
  | "company"    // 公司
  | "workflow";  // 自動化

export interface ModuleMetadata {
  key: ModuleKey;
  name: string;
  description: string;
  path: string;
}

export type UserRole = "owner" | "partner" | "client";

export type ModulePermissionSource =
  | "database"
  | "role_default"
  | "browser_override"
  | "unauthenticated";

export interface UserModulePermission {
  role: UserRole;
  enabledModules: ModuleKey[];
}

export interface ModulePermissionSnapshot extends UserModulePermission {
  source: ModulePermissionSource;
  dbPermissionRows: number;
  unknownModuleRows: number;
  disabledModules: ModuleKey[];
  generatedAt: string;
}

export const ALL_MODULES: ModuleMetadata[] = [
  { key: "ai-input", name: "AI 工作桌", description: "多源資料同步、AI Ingestion、Capture Inbox", path: "/ai-input" },
  { key: "dashboard", name: "今日", description: "AI 每日聚合摘要、行動引導與當日焦點", path: "/dashboard" },
  { key: "inbox", name: "收件匣", description: "擷取項目暫存與人工審核分流", path: "/inbox" },
  { key: "self", name: "自己", description: "個人反思與自我整理專區", path: "/self" },
  { key: "work", name: "工作", description: "內外雙視角的專案與任務管理、工作記憶時間軸", path: "/work" },
  { key: "research", name: "研究", description: "想法、文獻材料、學術人脈、發表與轉化輸出", path: "/research" },
  { key: "chamber", name: "商會", description: "商會成員 CRM、雙向關係圖與引薦 DM 庫", path: "/chamber" },
  { key: "finance", name: "財務", description: "內外帳分流記帳、專案毛利與收支圖表", path: "/finance" },
  { key: "life", name: "生活", description: "週期性健康護理事項、朋友與人生回憶牆", path: "/life" },
  { key: "company", name: "公司", description: "公司願景策略 Markdown 定版與專案映射", path: "/company" },
  { key: "workflow", name: "自動化", description: "Agent 協作規則設定與跨模組訊息流視覺化", path: "/workflow" },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, ModuleKey[]> = {
  owner: ["ai-input", "dashboard", "inbox", "self", "work", "research", "chamber", "finance", "life", "company", "workflow"],
  partner: ["dashboard", "inbox", "chamber", "company"],
  client: ["work"], // 客戶主要對應 /client/[token] 安全頁面，在此模擬中預設僅能看工作
};
