import "server-only"

import { RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE } from "@/lib/contracts/research-owner-read-adapter-runtime.contract"

export type ResearchOwnerReadIssuesAdapterTaskId =
  "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF"

export type ResearchOwnerReadIssuesAdapterMode =
  "issues_adapter_interface_mapper_proof_no_runtime_db_read"

export type ResearchOwnerReadIssuesAdapterStatus =
  "ready_for_issues_adapter_interface_and_mapper_proof"

export type ResearchOwnerReadIssueAuthorizedRow = {
  id: string
  title: string
  description: string | null
  status: string
  keywords: readonly string[]
  disciplines: readonly string[]
  regions: readonly string[]
  methodType: string | null
  mainResearchQuestion: string | null
  workLinkage: string | null
  createdAt: string | Date
  updatedAt: string | Date
  _count: {
    sources: number
    concepts: number
    writingProjects: number
  }
}

export type ResearchOwnerReadIssueReadDto = {
  id: string
  title: string
  description: string | null
  status: string
  keywords: readonly string[]
  disciplines: readonly string[]
  regions: readonly string[]
  methodType: string | null
  mainResearchQuestion: string | null
  workLinkage: string | null
  counts: {
    sources: number
    concepts: number
    writingProjects: number
  }
  createdAt: string
  updatedAt: string
  auditRef: string
}

export type ResearchOwnerReadIssuesAdapterProof = {
  taskId: ResearchOwnerReadIssuesAdapterTaskId
  status: ResearchOwnerReadIssuesAdapterStatus
  mode: ResearchOwnerReadIssuesAdapterMode
  selectedFamily: "issues"
  selectedModel: "ResearchThread"
  futureAdapterSignature: string
  mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state"
  mapperOutputBoundary: "ui_safe_research_issue_read_dto"
  ownerScopeProofPath: string
  selectedFieldKeys: readonly string[]
  proofFixtureRowCount: number
  proofDtoCount: number
  proofDtos: readonly ResearchOwnerReadIssueReadDto[]
  unavailableResponse: {
    state: "model-ready-read-unavailable"
    items: []
    count: 0
    runtimeDbReadEnabled: false
    adapterExecutionAllowed: false
    nextAction: string
  }
  blockedFields: readonly string[]
  stopConditions: readonly string[]
  safety: {
    adapterInterfaceDefined: true
    mapperProofDefined: true
    runtimeDbReadEnabled: false
    runtimeDbWriteEnabled: false
    adapterExecutionAllowed: false
    routeHandlerEnabled: false
    serverActionWriteEnabled: false
    publicOutputEnabled: false
    externalCollaborationEnabled: false
    externalAgentDatabaseAccessAllowed: false
    agentFinalWriteAllowed: false
    externalRegisterable: false
    launchLevelUpgradeClaimed: false
  }
  nandaBoundary: {
    affectedSurface: "Research agent proposals"
    runtimeAgentChanged: false
    protocolStatus: "protected_owner_visible_proposal_only"
    externalRegisterable: false
    finalWritesRequireHumanApproval: true
  }
  nextTasks: readonly string[]
}

const RESEARCH_OWNER_READ_ISSUES_PROOF_ROW: ResearchOwnerReadIssueAuthorizedRow = {
  id: "proof-research-thread-issues-001",
  title: "Owner-scoped Research issue adapter proof",
  description:
    "Fixture row used only to prove the selected-field mapper shape before runtime DB reads are enabled.",
  status: "EXPLORING",
  keywords: ["owner-read", "adapter", "proof"],
  disciplines: ["software-architecture"],
  regions: ["private-owner"],
  methodType: "implementation-proof",
  mainResearchQuestion:
    "Can the Research issues adapter map only owner-authorized selected fields into a UI-safe DTO?",
  workLinkage: "RESEARCH-BFF-010",
  createdAt: "2026-06-24T16:48:09.193Z",
  updatedAt: "2026-06-24T16:48:09.193Z",
  _count: {
    sources: 0,
    concepts: 0,
    writingProjects: 0,
  },
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

export function mapAuthorizedResearchIssueRowToDto(
  row: ResearchOwnerReadIssueAuthorizedRow,
): ResearchOwnerReadIssueReadDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    keywords: row.keywords,
    disciplines: row.disciplines,
    regions: row.regions,
    methodType: row.methodType,
    mainResearchQuestion: row.mainResearchQuestion,
    workLinkage: row.workLinkage,
    counts: {
      sources: row._count.sources,
      concepts: row._count.concepts,
      writingProjects: row._count.writingProjects,
    },
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    auditRef: `research-owner-read:issues:${row.id}`,
  }
}

export function mapAuthorizedResearchIssueRowsToDtos(
  rows: readonly ResearchOwnerReadIssueAuthorizedRow[],
): ResearchOwnerReadIssueReadDto[] {
  return rows.map(mapAuthorizedResearchIssueRowToDto)
}

const RESEARCH_OWNER_READ_ISSUES_PROOF_DTOS =
  mapAuthorizedResearchIssueRowsToDtos([RESEARCH_OWNER_READ_ISSUES_PROOF_ROW])

export const RESEARCH_OWNER_READ_ISSUES_ADAPTER_PROOF: ResearchOwnerReadIssuesAdapterProof =
  {
    taskId: "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF",
    status: "ready_for_issues_adapter_interface_and_mapper_proof",
    mode: "issues_adapter_interface_mapper_proof_no_runtime_db_read",
    selectedFamily: "issues",
    selectedModel: "ResearchThread",
    futureAdapterSignature:
      "loadResearchIssuesForOwner({ ownerProfileId }) -> Promise<ResearchIssueReadDtoResponse>",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    mapperOutputBoundary: "ui_safe_research_issue_read_dto",
    ownerScopeProofPath:
      RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.selectedAuthzDecision.ownerScopeProofPath,
    selectedFieldKeys:
      RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.selectedQueryPlan.selectedFields,
    proofFixtureRowCount: 1,
    proofDtoCount: RESEARCH_OWNER_READ_ISSUES_PROOF_DTOS.length,
    proofDtos: RESEARCH_OWNER_READ_ISSUES_PROOF_DTOS,
    unavailableResponse: {
      state: "model-ready-read-unavailable",
      items: [],
      count: 0,
      runtimeDbReadEnabled: false,
      adapterExecutionAllowed: false,
      nextAction:
        "Keep runtime Research issues reads disabled until requireUser(), Profile mapping, service authorization, and proof-target evidence are available.",
    },
    blockedFields: [
      "ownerId",
      "raw Prisma model payload",
      "caller-supplied ownerId",
      "direct threadId-only access",
      "private source bodies",
      "unselected relation payloads",
    ],
    stopConditions: [
      "Stop before Prisma import or DB read while AUTH-005/Profile proof is absent.",
      "Stop before runtime read while service authorization runtime proof is absent.",
      "Stop before runtime read while selected-field redaction or proof target approval is unclear.",
      "Stop before route handler, server action write, public output, external collaboration, Research agent final write, external agent database access, external registration, or launch-level claim.",
    ],
    safety: {
      adapterInterfaceDefined: true,
      mapperProofDefined: true,
      runtimeDbReadEnabled: false,
      runtimeDbWriteEnabled: false,
      adapterExecutionAllowed: false,
      routeHandlerEnabled: false,
      serverActionWriteEnabled: false,
      publicOutputEnabled: false,
      externalCollaborationEnabled: false,
      externalAgentDatabaseAccessAllowed: false,
      agentFinalWriteAllowed: false,
      externalRegisterable: false,
      launchLevelUpgradeClaimed: false,
    },
    nandaBoundary: {
      affectedSurface: "Research agent proposals",
      runtimeAgentChanged: false,
      protocolStatus: "protected_owner_visible_proposal_only",
      externalRegisterable: false,
      finalWritesRequireHumanApproval: true,
    },
    nextTasks: [
      "LOOP-163-RESEARCH-POST-ISSUES-ADAPTER-GAP-REVIEW",
      "AUTH-005 when Supabase public env plus signed-in /auth/status evidence appears",
      "WORK-009 when safe proof target plus exact write confirmations appear",
    ],
  }

export function buildResearchOwnerReadIssuesAdapterProof(): ResearchOwnerReadIssuesAdapterProof {
  return RESEARCH_OWNER_READ_ISSUES_ADAPTER_PROOF
}
