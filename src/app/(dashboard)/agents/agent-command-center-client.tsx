"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangleIcon,
  BotIcon,
  CheckCircle2Icon,
  FileTextIcon,
  Loader2Icon,
  LockIcon,
  PlayCircleIcon,
  SendIcon,
  ShieldCheckIcon,
  TerminalSquareIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  AgentCommandCenterCommandRow,
  AgentCommandCenterDryRunError,
  AgentCommandCenterDryRunProof,
  AgentCommandCenterMode,
  OwnerAgentCommandCenterContract,
} from "@/types/agent-command-center"

type LocalProposalPacket = {
  id: string
  mode: AgentCommandCenterMode
  command: AgentCommandCenterCommandRow
  participantAgentLabels: readonly string[]
  instruction: string
  state: "proposal_ready"
}

function riskVariant(riskLevel: string) {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") {
    return "destructive" as const
  }

  return "outline" as const
}

function getModuleLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function AgentCommandCenterClient({
  contract,
}: {
  contract: OwnerAgentCommandCenterContract
}) {
  const [mode, setMode] = useState<AgentCommandCenterMode>(contract.defaultMode)
  const [selectedCommandId, setSelectedCommandId] = useState(contract.commands[0]?.operationId ?? "")
  const [selectedGroupId, setSelectedGroupId] = useState(contract.groups[0]?.id ?? "")
  const [instruction, setInstruction] = useState(contract.defaultInstruction)
  const [proposal, setProposal] = useState<LocalProposalPacket | null>(null)
  const [dryRunProof, setDryRunProof] = useState<AgentCommandCenterDryRunProof | null>(null)
  const [dryRunError, setDryRunError] = useState<AgentCommandCenterDryRunError | null>(null)
  const [dryRunPending, setDryRunPending] = useState(false)

  const selectedGroup = useMemo(
    () => contract.groups.find((group) => group.id === selectedGroupId) ?? contract.groups[0],
    [contract.groups, selectedGroupId]
  )

  const visibleCommands = useMemo(() => {
    if (mode === "single_agent" || !selectedGroup) {
      return contract.commands
    }

    return contract.commands.filter((command) =>
      selectedGroup.recommendedOperationIds.includes(command.operationId)
    )
  }, [contract.commands, mode, selectedGroup])

  const selectedCommand = useMemo(() => {
    return (
      visibleCommands.find((command) => command.operationId === selectedCommandId) ??
      visibleCommands[0] ??
      contract.commands[0]
    )
  }, [contract.commands, selectedCommandId, visibleCommands])

  const participantAgentLabels =
    mode === "group_agent" && selectedGroup
      ? selectedGroup.participantAgentLabels
      : selectedCommand?.participantAgentLabels ?? []

  function resetDryRunProof() {
    setDryRunProof(null)
    setDryRunError(null)
  }

  function createProposalPacket() {
    if (!selectedCommand) {
      return
    }

    setProposal({
      id: `local-proposal-${selectedCommand.operationId}`,
      mode,
      command: selectedCommand,
      participantAgentLabels,
      instruction: instruction.trim() || contract.defaultInstruction,
      state: "proposal_ready",
    })
  }

  async function runProtectedDryRun() {
    if (!selectedCommand || dryRunPending) {
      return
    }

    setDryRunPending(true)
    resetDryRunProof()

    const clientRequestId = `agent-command-center-${Date.now()}-${selectedCommand.operationId.replace(
      /[^a-z0-9.-]/gi,
      "-"
    )}`

    try {
      const response = await fetch(selectedCommand.httpDryRun.path, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationId: selectedCommand.httpDryRun.operationId,
          mode: selectedCommand.httpDryRun.mode,
          agentLabel: selectedCommand.ownerAgent,
          targetModule: selectedCommand.httpDryRun.targetModule,
          requestedChecks: ["agent-command-center-proof-panel", mode],
          clientRequestId,
        }),
      })
      const payload = (await response.json().catch(() => null)) as
        | AgentCommandCenterDryRunProof
        | AgentCommandCenterDryRunError
        | null

      if (!response.ok) {
        const errorPayload = payload as AgentCommandCenterDryRunError | null
        setDryRunError({
          error: errorPayload?.error ?? "Protected dry-run request was rejected.",
          code: errorPayload?.code ?? `http_${response.status}`,
          allowedMethods: errorPayload?.allowedMethods,
          allowedOperations: errorPayload?.allowedOperations,
          nextAction:
            errorPayload?.nextAction ??
            "Confirm the owner session, then rerun the protected dry-run from this panel.",
        })
        return
      }

      if (!payload || !("selectedOperation" in payload)) {
        setDryRunError({
          error: "Protected dry-run returned an unexpected proof payload.",
          code: "unexpected_dry_run_payload",
          nextAction: "Run the CLI parity check and inspect the route response shape.",
        })
        return
      }

      setDryRunProof(payload)
    } catch {
      setDryRunError({
        error: "Protected dry-run request failed before a proof DTO was returned.",
        code: "client_request_failed",
        nextAction:
          "Confirm the local app is running with an owner session, then rerun the protected dry-run.",
      })
    } finally {
      setDryRunPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 border-y bg-muted/20 py-4 text-sm md:grid-cols-5">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
          <p className="mt-1 font-semibold">{contract.status}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Operations</p>
          <p className="mt-1 font-semibold">{contract.summary.operationCount} bounded commands</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Groups</p>
          <p className="mt-1 font-semibold">{contract.summary.groupCount} internal groups</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Modules</p>
          <p className="mt-1 font-semibold">{contract.summary.moduleReadinessCount} readiness rows</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">External</p>
          <p className="mt-1 font-semibold">Registerable: {contract.summary.externalRegisterableCount}</p>
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-2">
            <TerminalSquareIcon className="size-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Module operation readiness</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                CLI, protected HTTP, internal bus, audit, and registry boundary per module.
              </p>
            </div>
          </div>
          <Badge variant="outline">{contract.summary.moduleReadinessCount} modules</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="w-[150px] px-4 py-3 font-medium">Module</th>
                <th className="w-[210px] px-4 py-3 font-medium">Operation</th>
                <th className="w-[210px] px-4 py-3 font-medium">Agent / bus</th>
                <th className="w-[250px] px-4 py-3 font-medium">CLI / HTTP</th>
                <th className="w-[190px] px-4 py-3 font-medium">Risk / approval</th>
                <th className="w-[220px] px-4 py-3 font-medium">Audit / registry</th>
              </tr>
            </thead>
            <tbody>
              {contract.moduleReadinessRows.map((row) => (
                <tr key={row.moduleKey} className="border-t align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.moduleLabel}</p>
                    <p className="mt-1 break-words text-muted-foreground">{row.targetModule}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="break-words font-medium">{row.operationId}</p>
                    <p className="mt-1 break-words text-muted-foreground">{row.readiness.state}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.ownerAgent}</p>
                    <p className="mt-1 break-words text-muted-foreground">
                      {row.internalBus.groupLabel ?? "Single-agent route"} / {row.lifecycleState}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {row.internalBus.participantAgentLabels.slice(0, 3).map((label) => (
                        <Badge key={label} variant="outline" className="text-[10px]">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="block break-words rounded-md border bg-muted/30 p-2 leading-relaxed">
                      {row.cliDryRunCommand}
                    </code>
                    <code className="mt-2 block break-words rounded-md border bg-muted/30 p-2 leading-relaxed">
                      POST {row.httpDryRun.path} / {row.httpDryRun.operationId}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={riskVariant(row.riskLevel)}>{row.riskLevel}</Badge>
                      <Badge variant={row.approvalRequired ? "destructive" : "secondary"}>
                        {row.approvalLevel}
                      </Badge>
                    </div>
                    <p className="mt-2 break-words text-muted-foreground">
                      blocked writes: {row.blockedWrites.length}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="break-words font-medium">{row.audit.eventFamily}</p>
                    <p className="mt-1 break-words text-muted-foreground">{row.audit.persistence}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">external {String(row.externalRegisterable)}</Badge>
                      <Badge variant="outline">write {String(row.writeBlocked)}</Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <section className="rounded-lg border bg-background">
          <div className="border-b p-3">
            <div className="flex items-center gap-2">
              <BotIcon className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Command route</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border bg-muted/30 p-1">
              {contract.modes.map((item) => {
                const active = item.id === mode
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id)
                      setProposal(null)
                      resetDryRunProof()
                    }}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {mode === "group_agent" && selectedGroup && (
            <div className="border-b p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Group</p>
              <div className="mt-2 space-y-2">
                {contract.groups.map((group) => {
                  const active = group.id === selectedGroup.id
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setSelectedGroupId(group.id)
                        setSelectedCommandId(group.recommendedOperationIds[0] ?? selectedCommandId)
                        setProposal(null)
                        resetDryRunProof()
                      }}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                        active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                      )}
                    >
                      <span className="block font-semibold">{group.label}</span>
                      <span className="mt-1 block text-muted-foreground">{group.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="max-h-[580px] overflow-y-auto p-2">
            <div className="space-y-1">
              {visibleCommands.map((command) => {
                const active = command.operationId === selectedCommand?.operationId
                return (
                  <button
                    key={command.operationId}
                    type="button"
                    onClick={() => {
                      setSelectedCommandId(command.operationId)
                      setProposal(null)
                      resetDryRunProof()
                    }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{command.label}</span>
                      <Badge variant={riskVariant(command.riskLevel)}>{command.riskLevel}</Badge>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {getModuleLabel(command.moduleKey)} / {command.ownerAgent}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <main className="rounded-lg border bg-background">
          <div className="border-b p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{selectedCommand?.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedCommand?.operationId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCommand && (
                  <>
                    <Badge variant="outline">{getModuleLabel(selectedCommand.moduleKey)}</Badge>
                    <Badge variant={selectedCommand.approvalRequired ? "destructive" : "secondary"}>
                      {selectedCommand.approvalLevel}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4">
            <div>
              <label htmlFor="agent-instruction" className="text-sm font-medium">
                Owner instruction
              </label>
              <Textarea
                id="agent-instruction"
                className="mt-2 min-h-32"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <UsersIcon className="size-4 text-primary" />
                  Participants
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {participantAgentLabels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheckIcon className="size-4 text-primary" />
                  Boundaries
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">proposal only</Badge>
                  <Badge variant="outline">write blocked</Badge>
                  <Badge variant="outline">external false</Badge>
                  <Badge variant="outline">{selectedCommand?.lifecycleState}</Badge>
                </div>
              </div>
            </div>

            {selectedCommand && (
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Proposal outputs</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {selectedCommand.proposalOutputs.map((output) => (
                      <li key={output} className="flex gap-2">
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{output}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Blocked actions</h3>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    {selectedCommand.blockedActions.map((action) => (
                      <li key={action} className="flex gap-2">
                        <LockIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-xs text-muted-foreground">
                Local proposal packet and protected dry-run proof only. No provider call, no DB write, no external runtime.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={runProtectedDryRun}
                  disabled={!selectedCommand || dryRunPending}
                >
                  {dryRunPending ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <PlayCircleIcon className="size-4" />
                  )}
                  {dryRunPending ? "Running dry-run" : "Run protected dry-run"}
                </Button>
                <Button type="button" onClick={createProposalPacket} disabled={!selectedCommand}>
                  <SendIcon className="size-4" />
                  Create proposal packet
                </Button>
              </div>
            </div>
          </div>
        </main>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Proposal packet</h2>
            </div>

            {proposal ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">State</p>
                  <p className="mt-1 font-semibold">{proposal.state}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Instruction</p>
                  <p className="mt-1 rounded-lg border bg-muted/30 p-3 text-muted-foreground">
                    {proposal.instruction}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Participants</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {proposal.participantAgentLabels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Approval required: {proposal.command.approvalRequired ? "yes" : "no"} / writeBlocked:{" "}
                  {proposal.command.writeBlocked ? "true" : "false"} / externalRegisterable:{" "}
                  {proposal.command.externalRegisterable ? "true" : "false"}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No local proposal packet yet.
              </div>
            )}
          </section>

          {selectedCommand && (
            <section className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                <PlayCircleIcon className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Protected dry-run proof</h2>
              </div>

              {dryRunPending && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Running owner-only dry-run proof...
                </div>
              )}

              {dryRunError && !dryRunPending && (
                <div className="mt-4 space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-destructive">
                    <AlertTriangleIcon className="size-4" />
                    {dryRunError.code}
                  </div>
                  <p className="text-muted-foreground">{dryRunError.error}</p>
                  {dryRunError.nextAction && (
                    <p className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
                      {dryRunError.nextAction}
                    </p>
                  )}
                </div>
              )}

              {dryRunProof && !dryRunPending && (
                <div className="mt-4 space-y-4 text-sm">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                    <p className="mt-1 break-words font-semibold">{dryRunProof.status}</p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {dryRunProof.generatedAt} / {dryRunProof.request.clientRequestId}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Registry readiness</p>
                    <p className="mt-1 break-words">
                      manifests: {dryRunProof.registrySnapshot.manifestCount} / internal:{" "}
                      {String(dryRunProof.registrySnapshot.internalDiscoverable)} / external:{" "}
                      {String(dryRunProof.registrySnapshot.externalRegisterable)} / publicDirectory:{" "}
                      {String(dryRunProof.registrySnapshot.publicDirectory)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Validation</p>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      {Object.entries({
                        operationIdKnown: dryRunProof.validation.operationIdKnown,
                        agentMatchesOperation: dryRunProof.validation.agentMatchesOperation,
                        targetMatchesOperation: dryRunProof.validation.targetMatchesOperation,
                        dryRunModeOnly: dryRunProof.validation.dryRunModeOnly,
                        internalDiscoverable: dryRunProof.validation.internalDiscoverable,
                        externalRegisterableBlocked:
                          dryRunProof.validation.externalRegisterableBlocked,
                        noPublicDirectory: dryRunProof.validation.noPublicDirectory,
                        requestSanitized: dryRunProof.validation.requestSanitized,
                      }).map(([key, value]) => (
                        <div key={key} className="rounded-md border p-2">
                          <dt className="break-words text-muted-foreground">{key}</dt>
                          <dd className="mt-1 font-semibold">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Safety</p>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      {Object.entries({
                        writesPerformed: dryRunProof.safety.writesPerformed,
                        databaseAccessed: dryRunProof.safety.databaseAccessed,
                        providerCalled: dryRunProof.safety.providerCalled,
                        externalRegistryWrite: dryRunProof.safety.externalRegistryWrite,
                        autonomousExecution: dryRunProof.safety.autonomousExecution,
                        auditPersisted: dryRunProof.safety.auditPersisted,
                      }).map(([key, value]) => (
                        <div key={key} className="rounded-md border p-2">
                          <dt className="break-words text-muted-foreground">{key}</dt>
                          <dd className="mt-1 font-semibold">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{dryRunProof.selectedOperation.id}</p>
                    <p className="mt-1 break-words">{dryRunProof.nextReview}</p>
                  </div>
                </div>
              )}

              {!dryRunProof && !dryRunError && !dryRunPending && (
                <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No protected dry-run proof yet.
                </div>
              )}
            </section>
          )}

          {selectedCommand && (
            <section className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                <TerminalSquareIcon className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Dry-run parity</h2>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground">CLI</p>
                  <code className="mt-1 block break-words rounded-lg border bg-muted/40 p-2">
                    {selectedCommand.cliDryRunCommand}
                  </code>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">HTTP</p>
                  <code className="mt-1 block break-words rounded-lg border bg-muted/40 p-2">
                    {selectedCommand.httpDryRun.path} / {selectedCommand.httpDryRun.operationId}
                  </code>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Safety state</h2>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(contract.safety).map(([key, value]) => (
                <div key={key} className="rounded-md border p-2">
                  <dt className="break-words text-muted-foreground">{key}</dt>
                  <dd className="mt-1 font-semibold">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  )
}
