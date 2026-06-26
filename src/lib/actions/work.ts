"use server"

// Compatibility layer for older imports during Phase 1.
// The canonical public Work action surface is src/app/actions/work.ts.
export {
  addProjectNote,
  addProjectTask,
  createDeliverable,
  createProject,
  createProjectDeliverable,
  deleteProject,
  deleteProjectDeliverable,
  deleteProjectNote,
  deleteProjectTask,
  toggleProjectNotePin,
  toggleProjectTaskComplete,
  toggleTaskComplete,
  updateProject,
  updateProjectDeliverable,
  updateProjectDeliverableVisibility,
  updateProjectNote,
  updateProjectTask,
} from "@/app/actions/work"

export type { ActionResult } from "@/app/actions/work"
