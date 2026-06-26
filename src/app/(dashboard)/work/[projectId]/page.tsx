import { notFound } from "next/navigation"
import { getProjectById } from "@/app/actions/work"
import { getProjectPulse, getProjectTimeline, getPublicOutputs, getPulseSourceMeta } from "@/lib/services/mock-ai.service"
import ProjectDetailClient from "./project-detail-client"

export const dynamic = "force-dynamic"

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = await params
  const data = await getProjectById(resolvedParams.projectId)

  if (!data) {
    notFound()
  }

  // Fetch adjunct AI prototype data through the mock adapter layer.
  const pulseCard = await getProjectPulse(data.project.id)
  const publicOutput = pulseCard ? await getPublicOutputs(pulseCard.id) : null
  const pulseMeta = pulseCard ? await getPulseSourceMeta(pulseCard.id) : null
  const timeline = await getProjectTimeline(data.project.id)

  return (
    <ProjectDetailClient
      project={data.project}
      initialTasks={data.tasks}
      initialNotes={data.notes}
      initialDeliverables={data.deliverables}
      pulseCard={pulseCard}
      publicOutput={publicOutput}
      pulseMeta={pulseMeta}
      timeline={timeline}
    />
  )
}
