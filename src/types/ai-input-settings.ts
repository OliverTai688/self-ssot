// src/types/ai-input-settings.ts

export type SourceSyncMode = "manual_only" | "manual_and_scheduled";
export type SourceAnalysisMode = "manual_only" | "manual_and_scheduled";
export type SourceRiskClassification = "high" | "medium" | "low";
export type SourceApprovalLevel = "always_require" | "auto_execute_low_risk" | "full_automation";

export interface SourceThinkingNodeDTO {
  id: string;
  nodeType: string;
  order: number;
  enabled: boolean;
  instruction: string | null;
}

export interface SourceProcessingPolicyDTO {
  sourceConnectionId: string;
  syncMode: SourceSyncMode;
  syncSchedule: string | null; // Cron expression or interval string
  syncEnabled: boolean;
  analysisMode: SourceAnalysisMode;
  analysisSchedule: string | null; // Cron expression or interval string
  analysisEnabled: boolean;
  analyzeOnlyWhenPending: boolean;
  defaultModule: string;
  allowedTargetModules: string[];
  riskClassification: SourceRiskClassification;
  approvalLevel: SourceApprovalLevel;
  includeInMorningBrief: boolean;
  retentionDays: number; // 0 for infinite, or specific days like 30, 90
  piiMaskingEnabled: boolean;
  uploadDirectory: string;
  thinkingNodes: SourceThinkingNodeDTO[];
}
