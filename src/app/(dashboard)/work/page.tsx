import { getProjects } from "@/app/actions/work"
import WorkClient from "./work-client"

export const dynamic = "force-dynamic"

export default async function WorkPage() {
  const projects = await getProjects()

  return <WorkClient initialProjects={projects} />
}
