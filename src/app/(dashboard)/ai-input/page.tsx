import { connection } from "next/server"

import AIInputClient from "./ai-input-client"
import { buildAIInputFormalReadinessContract } from "@/lib/services/ai-input-readiness.service"

export const dynamic = "force-dynamic"

export default async function AIInputPage() {
  await connection()

  const formalReadiness = await buildAIInputFormalReadinessContract()

  return <AIInputClient formalReadiness={formalReadiness} />
}
