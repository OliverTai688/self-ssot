"use client"
import { Button } from "@/components/ui/button"
export default function OperatingError({ reset }: { reset: () => void }) {
  return <main className="max-w-xl mx-auto p-10"><h1 className="text-xl font-semibold">工作台暫時無法載入</h1><p className="text-sm text-muted-foreground my-5">請重試；若仍未恢復，請檢查本機設定。既有資料不會以示例資料取代。</p><Button onClick={reset}>重新載入</Button></main>
}
