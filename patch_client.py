import re
import sys

with open('src/app/(dashboard)/agents/agent-command-center-client.tsx', 'r') as f:
    content = f.read()

# Add imports
imports = """
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { createAgentCommand, deleteAgentCommand } from "@/app/actions/agent-command"
"""
content = content.replace('import { useMemo, useState } from "react"', 'import { useMemo, useState } from "react"\n' + imports)

# Add router to component
content = content.replace(
    'const [dryRunPending, setDryRunPending] = useState(false)',
    'const [dryRunPending, setDryRunPending] = useState(false)\n  const router = useRouter()\n  const [isCreateOpen, setIsCreateOpen] = useState(false)\n  const [isDeleting, setIsDeleting] = useState(false)'
)

# Add delete button next to the title in the main area
title_area = """<div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{selectedCommand?.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedCommand?.operationId}</p>
              </div>"""

new_title_area = """<div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">{selectedCommand?.label}</h2>
                  {selectedCommand && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-6 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                      onClick={async () => {
                         if (!confirm("確定要刪除這個技能嗎？")) return;
                         setIsDeleting(true);
                         // find real DB ID if needed, wait, we don't have db id in row. 
                         // we can delete by operationId if we change the action, or we map it.
                         // Let's assume operationId is unique and we can delete by it in our custom route or action.
                         // Actually the action deleteAgentCommand expects db id. Let's pass it if we add it, else wait.
                      }}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{selectedCommand?.operationId}</p>
              </div>"""
# content = content.replace(title_area, new_title_area)

# Add Create button in the header of the resource index
command_route_title = '<h2 className="text-sm font-semibold">{agentsCopy.commandRoute.title}</h2>'
command_route_title_new = """<div className="flex flex-1 items-center justify-between">
                <h2 className="text-sm font-semibold">{agentsCopy.commandRoute.title}</h2>
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setIsCreateOpen(true)}>
                  <PlusIcon className="size-4" />
                </Button>
              </div>"""
content = content.replace(command_route_title, command_route_title_new)

# Add Dialog at the end of the component
dialog_jsx = """
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增自訂技能</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
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
                commandType: formData.get("commandType") as "SINGLE_AGENT" | "TEAM_GROUP",
                uiEntrySurface: "/agents",
              })
              if (res.success) {
                setIsCreateOpen(false)
                router.refresh()
              } else {
                alert(res.error)
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>操作代碼 (operationId)</Label>
              <Input name="operationId" required placeholder="例如: custom.agent.skill" />
            </div>
            <div>
              <Label>技能名稱 (Label)</Label>
              <Input name="label" required placeholder="例如: 自訂程式碼檢查" />
            </div>
            <div>
              <Label>負責 Agent (Owner Agent)</Label>
              <Input name="ownerAgent" required placeholder="例如: WorkAgent" />
            </div>
            <div>
              <Label>類型</Label>
              <select name="commandType" className="w-full rounded-md border p-2 text-sm">
                <option value="SINGLE_AGENT">單一 Agent (Single)</option>
                <option value="TEAM_GROUP">群組 Agent (Team)</option>
              </select>
            </div>
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

content = content.replace('    </div>\n  )\n}\n', dialog_jsx)

with open('src/app/(dashboard)/agents/agent-command-center-client.tsx', 'w') as f:
    f.write(content)
