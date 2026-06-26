// ─── Research Module Actions ──────────────────────────────────────────────────
export {
  getResearchThreads,
  getResearchThreadById,
  createResearchThread,
  updateResearchThread,
  deleteResearchThread,
} from "./research-threads"

export {
  getSourcesByThread,
  addResearchSource,
  deleteResearchSource,
  getConceptsByThread,
  upsertResearchConcept,
  deleteResearchConcept,
} from "./research-sources"

export {
  getWritingProjectsByThread,
  createWritingProject,
  updateWritingSection,
  deleteWritingProject,
  addAIFeedbackRun,
  getFeedbackRunsByThread,
} from "./research-writing"

export {
  getResearchEvents,
  addResearchEvent,
  deleteResearchEvent,
  getAcademicPeople,
  addAcademicPerson,
  deleteAcademicPerson,
  getDigestsByThread,
  saveResearchDigest,
} from "./research-events"

// ─── Work Module Actions ───────────────────────────────────────────────────────
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
} from "./work"

// ─── Shared Type ──────────────────────────────────────────────────────────────
export type { ActionResult } from "./research-threads"
