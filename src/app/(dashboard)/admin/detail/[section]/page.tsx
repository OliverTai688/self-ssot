import { notFound } from "next/navigation"

import { getAdminOwnerEvidenceSection } from "@/lib/services/admin-readiness.service"
import { OwnerEvidenceClient } from "./owner-evidence-client"

export const dynamic = "force-dynamic"

type AdminDetailSectionPageProps = {
  params: Promise<{ section: string }>
}

export default async function AdminDetailSectionPage({ params }: AdminDetailSectionPageProps) {
  const { section } = await params
  if (section !== "owner-evidence") {
    notFound()
  }

  const consoleState = await getAdminOwnerEvidenceSection()

  return <OwnerEvidenceClient consoleState={consoleState} />
}
