import { connection } from "next/server"

import AIInputClient from "./ai-input-client"
import { buildAIInputFormalReadinessContract } from "@/lib/services/ai-input-readiness.service"
import { loadAIInputSourceConnectionCatalog } from "@/lib/services/ai-input-source-connection-catalog.service"

export const dynamic = "force-dynamic"

export default async function AIInputPage() {
  await connection()

  const [formalReadiness, sourceConnectionCatalog] = await Promise.all([
    buildAIInputFormalReadinessContract(),
    loadAIInputSourceConnectionCatalog(),
  ])

  return (
    <AIInputClient
      formalReadiness={formalReadiness}
      sourceConnectionCatalog={sourceConnectionCatalog}
    />
  )
}
