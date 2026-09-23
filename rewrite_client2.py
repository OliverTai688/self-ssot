content = """\"use client\"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlayIcon, CheckCircle2Icon, XCircleIcon, ShieldAlertIcon, PlusIcon, Trash2Icon, InfoIcon, LayoutListIcon, SearchIcon, FilterIcon, SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

import type { AgentCommandCenterCommandRow, OwnerAgentCommandCenterContract } from "@/types/agent-command-center"
import type { AgentOperationDryRunResult } from "@/lib/services/agent-operation.service"
import { createAgentCommand, deleteAgentCommandByOperationId, updateAgentCommandByOperationId } from "@/app/actions/agent-command"

export function AgentCommandCenterBlocked() {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30">
      <ShieldAlertIcon className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">權限不足。此路由僅限 OWNER 存取。</p>
    </div>
  )
}

function getRiskColor(level: string) {
  switch (level.toUpperCase()) {
    case "CRITICAL":
      return "destructive"
    case "HIGH":
      return "destructive"
    case "MEDIUM":
      return "default"
    default:
      return "secondary"
  }
}

export function AgentCommandCenterClient({ contract }: { contract: OwnerAgentCommandCenterContract }) {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null)
  const [dryRunPending, setDryRunPending] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<AgentOperationDryRunResult | null>(null)
  
  // Filters
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [agentFilter, setAgentFilter] = useState("all")
  
  // Creation Form State
  const [newCommandType, setNewCommandType] = useState<"SINGLE_AGENT" | "TEAM_GROUP">("SINGLE_AGENT")
  const [stages, setStages] = useState([{ name: "第一階段", prompt: "" }])
  const [singleInstruction, setSingleInstruction] = useState("")

  const [isDeleting, setIsDeleting] = useState(false)

  const selectedCommand = useMemo(
    () => contract.commands.find((c) => c.operationId === selectedOperationId) ?? null,
    [contract.commands, selectedOperationId]
  )
  
  // Local states for editing boundaries
  const [editOutputs, setEditOutputs] = useState("")
  const [editBlocks, setEditBlocks] = useState("")

  // Update local states when selected command changes
  useEffect(() => {
    if (selectedCommand) {
      setEditOutputs(selectedCommand.proposalOutputs.join("\\n"))
      setEditBlocks(selectedCommand.blockedActions.join("\\n"))
    }
  }, [selectedCommand])

  const allAgents = useMemo(() => {
    const set = new Set<string>()
    contract.commands.forEach(c => {
       c.participantAgentLabels.forEach(a => set.add(a))
       set.add(c.ownerAgent)
    })
    return Array.from(set).sort()
  }, [contract.commands])

  const filteredCommands = useMemo(() => {
    return contract.commands.filter(c => {
      if (activeTab === "single" && c.commandType !== "SINGLE_AGENT") return false
      if (activeTab === "team" && c.commandType !== "TEAM_GROUP") return false
      if (searchQuery) {
         const lowerQ = searchQuery.toLowerCase()
         if (!c.label.toLowerCase().includes(lowerQ) && !c.operationId.toLowerCase().includes(lowerQ)) {
            return false
         }
      }
      if (agentFilter !== "all") {
         if (!c.participantAgentLabels.includes(agentFilter) && c.ownerAgent !== agentFilter) {
            return false
         }
      }
      return true
    })
  }, [contract.commands, activeTab, searchQuery, agentFilter])

  const handleDryRun = async () => {
    if (!selectedCommand) return

    setDryRunPending(true)
    setDryRunResult(null)

    try {
      const res = await fetch("/api/agent-operations/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: selectedCommand.operationId,
          mode: "dry_run",
          agentLabel: selectedCommand.ownerAgent,
          targetModule: selectedCommand.targetModule,
        }),
      })

      const data = await res.json()
      setDryRunResult({
        ok: res.ok,
        status: res.status as any,
        body: data,
      })
    } catch (err) {
      setDryRunResult({
        ok: false,
        status: 503,
        body: {
          error: "Failed to fetch dry-run route.",
          code: "registry_unavailable",
          nextAction: "Check server logs.",
        },
      } as any)
    } finally {
      setDryRunPending(false)
    }
  }

  const handleUpdateBoundaries = async () => {
     if (!selectedCommand) return
     const outputs = editOutputs.split("\\n").map(s => s.trim()).filter(Boolean)
     const blocks = editBlocks.split("\\n").map(s => s.trim()).filter(Boolean)
     await updateAgentCommandByOperationId(selectedCommand.operationId, {
        proposalOutputs: outputs,
        blockedWrites: blocks
     })
     router.refresh()
  }

  const handleToggleSafety = async (field: string, value: boolean) => {
     if (!selectedCommand) return
     if (field === "writeBlocked") {
        await updateAgentCommandByOperationId(selectedCommand.operationId, { writeBlocked: value })
     } else if (field === "externalRegisterable") {
        await updateAgentCommandByOperationId(selectedCommand.operationId, { externalRegisterable: value })
     } else if (field === "approvalRequired") {
        await updateAgentCommandByOperationId(selectedCommand.operationId, { approvalLevel: value ? "MANUAL_APPROVAL" : "AUTO_PROPOSE" })
     }
     router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <LayoutListIcon className="size-5" />
          技能總覽
        </h2>
        <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
          <PlusIcon className="size-4" />
          新增技能
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
           <TabsList>
             <TabsTrigger value="all">全部</TabsTrigger>
             <TabsTrigger value="single">一般技能</TabsTrigger>
             <TabsTrigger value="team">團隊技能</TabsTrigger>
           </TabsList>
         </Tabs>
         
         <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
               <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input 
                 type="search" 
                 placeholder="搜尋技能..." 
                 className="pl-8"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
            </div>
            
            <select 
               className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
               value={agentFilter}
               onChange={e => setAgentFilter(e.target.value)}
            >
               <option value="all">所有 Agent</option>
               {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
         </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>技能名稱</TableHead>
              <TableHead>類型</TableHead>
              <TableHead>Operation ID</TableHead>
              <TableHead>目標模組</TableHead>
              <TableHead>Owner Agent</TableHead>
              <TableHead>風險等級</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCommands.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  找不到符合條件的技能。
                </TableCell>
              </TableRow>
            )}
            {filteredCommands.map((cmd) => (
              <TableRow 
                key={cmd.operationId} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedOperationId(cmd.operationId)}
              >
                <TableCell className="font-medium">{cmd.label}</TableCell>
                <TableCell>
                  <Badge variant="outline">{cmd.commandType === "TEAM_GROUP" ? "Team" : "Single"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{cmd.operationId}</TableCell>
                <TableCell>
                  <Badge variant="outline">{cmd.targetModule}</Badge>
                </TableCell>
                <TableCell>{cmd.ownerAgent}</TableCell>
                <TableCell>
                  <Badge variant={getRiskColor(cmd.riskLevel)}>{cmd.riskLevel}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedOperationId} onOpenChange={(open) => !open && setSelectedOperationId(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto w-full">
          {selectedCommand && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start justify-between pr-8">
                  <div>
                    <SheetTitle className="text-xl flex items-center gap-2">
                       {selectedCommand.label}
                       <Badge variant="outline">{selectedCommand.commandType === "TEAM_GROUP" ? "團隊技能" : "一般技能"}</Badge>
                    </SheetTitle>
                    <SheetDescription className="font-mono text-xs mt-1">{selectedCommand.operationId}</SheetDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    disabled={isDeleting}
                    onClick={async () => {
                      if (!confirm("確定要刪除這個技能嗎？")) return
                      setIsDeleting(true)
                      const res = await deleteAgentCommandByOperationId(selectedCommand.operationId)
                      if (res.success) {
                         setSelectedOperationId(null)
                      } else {
                         alert(res.error)
                      }
                      setIsDeleting(false)
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </SheetHeader>

              <Tabs defaultValue="execute" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="execute">執行預演</TabsTrigger>
                  <TabsTrigger value="config">配置與邊界</TabsTrigger>
                  <TabsTrigger value="safety">安全狀態</TabsTrigger>
                </TabsList>

                <TabsContent value="execute" className="mt-4 space-y-4">
                  {selectedCommand.commandType === "SINGLE_AGENT" && (
                    <div className="space-y-2">
                      <Label>Owner 指令</Label>
                      <Textarea
                        className="min-h-[100px] resize-none text-sm"
                        defaultValue={contract.defaultInstruction}
                      />
                    </div>
                  )}

                  {selectedCommand.commandType === "TEAM_GROUP" && selectedCommand.stages && selectedCommand.stages.length > 0 && (
                    <div className="space-y-4">
                      <Label>團隊協作階段 (Stages)</Label>
                      {selectedCommand.stages.map((stage: any, idx: number) => (
                         <Card key={idx} className="bg-muted/30">
                            <CardContent className="p-4 flex flex-col gap-2">
                               <div className="font-semibold text-sm">{stage.name}</div>
                               <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground bg-muted p-2 rounded">
                                  {stage.prompt}
                               </div>
                            </CardContent>
                         </Card>
                      ))}
                    </div>
                  )}

                  <Button 
                    className="w-full gap-2 mt-4" 
                    disabled={dryRunPending} 
                    onClick={handleDryRun}
                  >
                    <PlayIcon className="size-4" />
                    {dryRunPending ? "預演中..." : "執行受保護預演"}
                  </Button>
                  
                  {dryRunResult && (
                    <div className="mt-6 space-y-2">
                      <Label>受保護預演結果</Label>
                      <Card className="bg-muted/50 border-dashed">
                        <CardContent className="p-4">
                          <pre className="overflow-auto whitespace-pre-wrap text-xs">
                            {JSON.stringify(dryRunResult.body, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="config" className="mt-4 space-y-6">
                  <TooltipProvider>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        參與 Agent
                        <Tooltip>
                          <TooltipTrigger><InfoIcon className="size-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent>此技能涉及的 AI 代理人，包含擁有者與協作的群組成員。</TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedCommand.participantAgentLabels.map((agent) => (
                          <Badge key={agent} variant="secondary">{agent}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <Label className="flex items-center gap-2">
                           提案輸出 (編輯)
                           <Tooltip>
                             <TooltipTrigger><InfoIcon className="size-3 text-muted-foreground" /></TooltipTrigger>
                             <TooltipContent>執行完成後，預期產生的檢查清單或草案結果。每行一項。</TooltipContent>
                           </Tooltip>
                         </Label>
                      </div>
                      <Textarea 
                        className="min-h-[80px] text-sm" 
                        value={editOutputs}
                        onChange={e => setEditOutputs(e.target.value)}
                        onBlur={handleUpdateBoundaries}
                        placeholder="每行輸入一項預期輸出..."
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <Label className="flex items-center gap-2 text-destructive">
                           封鎖動作 / 強制邊界 (編輯)
                           <Tooltip>
                             <TooltipTrigger><InfoIcon className="size-3 text-muted-foreground" /></TooltipTrigger>
                             <TooltipContent>此技能被 NANDA 協定嚴格禁止的行為，包含越權讀寫與對外輸出。每行一項。</TooltipContent>
                           </Tooltip>
                         </Label>
                      </div>
                      <Textarea 
                        className="min-h-[80px] text-sm" 
                        value={editBlocks}
                        onChange={e => setEditBlocks(e.target.value)}
                        onBlur={handleUpdateBoundaries}
                        placeholder="每行輸入一項封鎖動作..."
                      />
                    </div>
                  </TooltipProvider>
                </TabsContent>

                <TabsContent value="safety" className="mt-4 space-y-6">
                  <div className="space-y-4">
                    <Label>安全狀態切換</Label>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center justify-between rounded border p-3 hover:bg-muted/50 cursor-pointer">
                        <span className="text-sm font-medium">寫入保護 (Write Blocked)</span>
                        <input 
                           type="checkbox" 
                           className="h-4 w-4" 
                           checked={selectedCommand.writeBlocked} 
                           onChange={e => handleToggleSafety("writeBlocked", e.target.checked)} 
                        />
                      </label>
                      <label className="flex items-center justify-between rounded border p-3 hover:bg-muted/50 cursor-pointer">
                        <span className="text-sm font-medium text-destructive">允許對外註冊 (External Registerable)</span>
                        <input 
                           type="checkbox" 
                           className="h-4 w-4 accent-destructive" 
                           checked={selectedCommand.externalRegisterable} 
                           onChange={e => handleToggleSafety("externalRegisterable", e.target.checked)} 
                        />
                      </label>
                      <label className="flex items-center justify-between rounded border p-3 hover:bg-muted/50 cursor-pointer">
                        <span className="text-sm font-medium">人工核准 (Approval Required)</span>
                        <input 
                           type="checkbox" 
                           className="h-4 w-4" 
                           checked={selectedCommand.approvalRequired} 
                           onChange={e => handleToggleSafety("approvalRequired", e.target.checked)} 
                        />
                      </label>
                      <label className="flex items-center justify-between rounded border p-3 bg-muted/30">
                        <span className="text-sm font-medium text-muted-foreground">Dry Run (預演模式)</span>
                        <input type="checkbox" className="h-4 w-4" checked disabled />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>CLI 呼叫路徑</Label>
                    <code className="block rounded bg-muted p-2 text-xs text-muted-foreground overflow-x-auto">
                      {selectedCommand.cliDryRunCommand}
                    </code>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>HTTP 呼叫路徑</Label>
                    <code className="block rounded bg-muted p-2 text-xs text-muted-foreground overflow-x-auto">
                      {selectedCommand.httpDryRun.path}
                    </code>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增自訂技能</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              let participants: string[] = []
              if (newCommandType === "TEAM_GROUP") {
                 const extracted = new Set<string>()
                 stages.forEach(s => {
                    const matches = s.prompt.match(/@([\w-]+)/g)
                    if (matches) matches.forEach(m => extracted.add(m.substring(1)))
                 })
                 participants = Array.from(extracted)
              }
            
              const res = await createAgentCommand({
                operationId: formData.get("operationId") as string,
                label: formData.get("label") as string,
                agentInstructionLabel: formData.get("label") as string,
                moduleKey: "work",
                ownerAgent: formData.get("ownerAgent") as string,
                targetModule: "work",
                riskLevel: "LOW",
                approvalLevel: "AUTO_PROPOSE",
                dataVisibilityLevel: "repo-docs",
                commandType: newCommandType,
                uiEntrySurface: "/agents",
                scopes: [],
                allowedModes: ["dry_run"],
                proposalOutputs: [],
                agentProposalOutputs: [],
                blockedWrites: [],
                agentBlockedWrites: [],
                sourceRefs: [],
                participantAgents: participants,
                promptTemplate: newCommandType === "SINGLE_AGENT" ? singleInstruction : null,
                stages: newCommandType === "TEAM_GROUP" ? stages : [],
                writeBlocked: true,
                externalRegisterable: false
              })
              if (res.success) {
                setIsCreateOpen(false)
                router.refresh()
              } else {
                alert(res.error)
              }
            }}
            className="space-y-4 py-4"
          >
            <div>
              <Label>類型</Label>
              <div className="mt-2 flex gap-4">
                 <label className="flex items-center gap-2">
                   <input 
                     type="radio" 
                     name="commandType" 
                     value="SINGLE_AGENT" 
                     checked={newCommandType === "SINGLE_AGENT"}
                     onChange={() => setNewCommandType("SINGLE_AGENT")}
                   />
                   單一 Agent
                 </label>
                 <label className="flex items-center gap-2">
                   <input 
                     type="radio" 
                     name="commandType" 
                     value="TEAM_GROUP" 
                     checked={newCommandType === "TEAM_GROUP"}
                     onChange={() => setNewCommandType("TEAM_GROUP")}
                   />
                   團隊 Agent
                 </label>
              </div>
            </div>
          
            <div>
              <Label>操作代碼 (operationId)</Label>
              <Input name="operationId" required placeholder="例如: custom.agent.skill" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label>技能名稱 (Label)</Label>
                 <Input name="label" required placeholder="例如: 自訂程式碼檢查" />
               </div>
               <div>
                 <Label>負責 Agent (Owner Agent)</Label>
                 <Input name="ownerAgent" required placeholder="例如: WorkAgent" />
               </div>
            </div>

            {newCommandType === "SINGLE_AGENT" ? (
               <div className="space-y-2">
                  <Label>指令 Prompt</Label>
                  <Textarea 
                     required
                     value={singleInstruction}
                     onChange={e => setSingleInstruction(e.target.value)}
                     placeholder="請輸入給 AI 的指令..."
                     className="min-h-[100px]"
                  />
               </div>
            ) : (
               <div className="space-y-4">
                  <Label className="flex justify-between items-center">
                     多階段團隊 Prompt
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setStages([...stages, { name: `第${stages.length + 1}階段`, prompt: "" }])}
                     >
                        <PlusIcon className="size-3 mr-1" /> 新增階段
                     </Button>
                  </Label>
                  <div className="space-y-4 border p-4 rounded-md bg-muted/30">
                     <p className="text-xs text-muted-foreground mb-2">使用 `@Agent名稱` 來指派任務。系統會自動解析參與的 Agent。</p>
                     {stages.map((stage, idx) => (
                        <div key={idx} className="space-y-2 p-3 bg-background border rounded-md relative">
                           <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-2 right-2 size-6 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                 const s = [...stages]
                                 s.splice(idx, 1)
                                 setStages(s)
                              }}
                           >
                              <XCircleIcon className="size-4" />
                           </Button>
                           <Input 
                              value={stage.name}
                              onChange={e => {
                                 const s = [...stages]
                                 s[idx].name = e.target.value
                                 setStages(s)
                              }}
                              placeholder="階段名稱，例如: 第一階段、分析問題"
                              className="font-semibold w-[80%]"
                           />
                           <Textarea 
                              value={stage.prompt}
                              onChange={e => {
                                 const s = [...stages]
                                 s[idx].prompt = e.target.value
                                 setStages(s)
                              }}
                              placeholder='例如: @research-agent 查詢理論，@company-agent 查詢情境...'
                              className="min-h-[80px]"
                           />
                        </div>
                     ))}
                  </div>
               </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
              <Button type="submit">建立技能</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
"""

with open("src/app/(dashboard)/agents/agent-command-center-client.tsx", "w") as f:
    f.write(content)
