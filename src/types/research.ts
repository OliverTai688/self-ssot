// ─── LEGACY TYPES (保留，供舊 [threadId] 頁面繼續使用) ──────────────────────────

export type ResearchThreadStatus = "exploring" | "active" | "writing" | "published" | "paused";

export interface ResearchThread {
  id: string;
  title: string;
  description?: string;
  status: ResearchThreadStatus;
  workLinkage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchIdea {
  id: string;
  threadId: string;
  title: string;
  body: string;
  ideaType: "concept" | "hypothesis" | "question";
  linkedProjectId?: string;
  linkedProjectName?: string;
  createdAt: string;
}

export interface ResearchMaterial {
  id: string;
  threadId: string;
  title: string;
  url?: string;
  notes?: string;
  type: "paper" | "book" | "article" | "data" | "tool";
  createdAt: string;
}

export interface Researcher {
  id: string;
  name: string;
  affiliation?: string;
  researchArea?: string;
  profileUrl?: string;
  relationNote?: string;
  papers: Array<{
    id: string;
    title: string;
    publishedAt?: string;
    url?: string;
    notes?: string;
  }>;
}

export interface PublicationTarget {
  id: string;
  threadId: string;
  venueName: string;
  venueType: "conference" | "journal" | "platform" | "public";
  deadline: string;
  status: "considering" | "submitted" | "accepted" | "rejected";
  notes?: string;
}

export interface ResearchMilestone {
  id: string;
  threadId: string;
  title: string;
  deliverable?: string;
  dueAt: string;
  status: "todo" | "in_progress" | "done";
}

export interface ResearchOutput {
  id: string;
  threadId: string;
  type: "slide" | "poster" | "summary" | "learning_path" | "blog";
  title: string;
  body?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface ResearchData {
  threads: ResearchThread[];
  ideas: ResearchIdea[];
  materials: ResearchMaterial[];
  researchers: Researcher[];
  publicationTargets: PublicationTarget[];
  milestones: ResearchMilestone[];
  outputs: ResearchOutput[];
}

// ─── NETWORK LAYER ─────────────────────────────────────────────────────────────
// Research Object Network — many-to-many 關聯模型

export type ResearchEntityType =
  | "issue"
  | "question"
  | "concept"
  | "source"
  | "idea"
  | "writing_project"
  | "writing_section"
  | "event"
  | "person"
  | "institution"
  | "region";

export type ResearchRelationType =
  | "supports"
  | "contradicts"
  | "defines"
  | "mentions"
  | "inspired_by"
  | "used_in"
  | "related_to"
  | "submitted_to"
  | "authored_by"
  | "affiliated_with"
  | "participates_in"
  | "chaired_by"
  | "belongs_to"
  | "clarifies"
  | "extends";

export interface ResearchLink {
  id: string;
  fromType: ResearchEntityType;
  fromId: string;
  toType: ResearchEntityType;
  toId: string;
  relationType: ResearchRelationType;
  note?: string;
  confidence?: "low" | "medium" | "high";
  createdAt: string;
}

// ─── CORE ENTITIES ────────────────────────────────────────────────────────────

export type ResearchIssueStatus =
  | "exploring"
  | "active"
  | "writing"
  | "submitted"
  | "published"
  | "paused";

export interface ResearchIssue {
  id: string;
  title: string;
  description?: string;
  status: ResearchIssueStatus;
  mainResearchQuestion?: string;
  keywords: string[];
  disciplines: string[];
  regions?: string[];
  methodType?: "qualitative" | "quantitative" | "mixed" | "design_research" | "theoretical";
  createdAt: string;
  updatedAt: string;
}

export interface ResearchQuestion {
  id: string;
  issueId?: string;           // optional — question can exist without an issue
  question: string;
  status: "open" | "clarifying" | "answered" | "paused";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchConcept {
  id: string;
  name: string;
  aliases?: string[];
  shortDefinition?: string;
  myCurrentUnderstanding?: string;
  confusionPoints?: string[];
  status: "raw" | "clarifying" | "stable" | "contested";
  createdAt: string;
  updatedAt: string;
}

export interface ConceptDefinition {
  id: string;
  conceptId: string;
  sourceId?: string;
  authorName?: string;
  definition: string;
  note?: string;
  perspective?: string;
  createdAt: string;
}

// ─── SOURCE (free-standing, no threadId required) ─────────────────────────────

export type ResearchSourceType =
  | "paper"
  | "book"
  | "article"
  | "conference_record"
  | "workshop_record"
  | "meeting_record"
  | "audio_transcript"
  | "institution_report"
  | "dataset"
  | "website"
  | "personal_note";

export type SourceReliability = "primary" | "secondary" | "informal" | "personal_observation";

export interface ResearchSource {
  id: string;
  title: string;
  sourceType: ResearchSourceType;
  authors?: string[];
  year?: number;
  doi?: string;
  url?: string;
  institution?: string;
  region?: string;
  country?: string;
  language?: string;
  abstract?: string;
  summary?: string;
  originalText?: string;
  transcriptText?: string;
  fileUrl?: string;
  sourceReliability?: SourceReliability;
  status: "unprocessed" | "summarized" | "annotated" | "used_in_writing";
  createdAt: string;
  updatedAt: string;
}

// ─── IDEA (free-standing, issueId optional) ──────────────────────────────────

export type IdeaSourceContext =
  | "manual"
  | "meeting"
  | "workshop"
  | "reading"
  | "voice_note"
  | "ai_chat";

export interface ResearchIdeaV2 {
  id: string;
  title: string;
  body: string;
  ideaType: "concept" | "hypothesis" | "question" | "observation" | "connection";
  sourceContext?: IdeaSourceContext;
  issueId?: string;            // optional — idea can exist without an issue
  linkedProjectId?: string;    // work project link (bilateral)
  linkedProjectName?: string;
  status: "inbox" | "linked" | "developing" | "archived";
  createdAt: string;
  updatedAt: string;
}

// ─── WRITING ──────────────────────────────────────────────────────────────────

export interface ResearchWritingProject {
  id: string;
  title: string;
  writingType: "paper" | "conference_paper" | "proposal" | "poster" | "presentation" | "essay";
  status: "idea" | "outline" | "drafting" | "reviewing" | "submitted" | "accepted" | "rejected";
  targetVenueId?: string;
  targetVenueName?: string;
  researchQuestion?: string;
  thesisStatement?: string;
  issueId?: string;            // optional linkage
  createdAt: string;
  updatedAt: string;
}

export interface WritingSection {
  id: string;
  writingProjectId: string;
  title: string;
  order: number;
  body: string;
  status: "empty" | "draft" | "needs_evidence" | "reviewed" | "revised";
  linkedSourceIds?: string[];
  aiNotes?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── AI FEEDBACK ──────────────────────────────────────────────────────────────

export type ReviewPerspective =
  | "method_reviewer"
  | "theory_reviewer"
  | "domain_expert"
  | "critical_reviewer"
  | "friendly_mentor"
  | "conference_chair"
  | "journal_editor";

export interface AIFeedbackRun {
  id: string;
  targetType: ResearchEntityType;
  targetId: string;
  perspective: ReviewPerspective;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  questions: string[];
  suggestions: string[];
  actionItems: string[];
  createdAt: string;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

export type ResearchEventType = "conference" | "workshop" | "seminar" | "summer_school" | "webinar";

export type ParticipationMode =
  | "submit_paper"
  | "submit_poster"
  | "attend"
  | "ask_question"
  | "networking";

export interface ResearchEvent {
  id: string;
  name: string;
  eventType: ResearchEventType;
  fields: string[];
  location?: string;
  country?: string;
  isOnline?: boolean;
  startDate?: string;
  endDate?: string;
  submissionDeadline?: string;
  registrationDeadline?: string;
  url?: string;
  cfpText?: string;
  fitScore?: number;
  aiFitReason?: string;
  suggestedParticipationMode?: ParticipationMode;
  createdAt: string;
  updatedAt: string;
}

// ─── PEOPLE ───────────────────────────────────────────────────────────────────

export type AcademicRole =
  | "author"
  | "chair"
  | "session_chair"
  | "keynote"
  | "editor"
  | "reviewer";

export interface AcademicPerson {
  id: string;
  name: string;
  role?: AcademicRole;
  affiliation?: string;
  country?: string;
  profileUrl?: string;
  researchAreas?: string[];
  importantWorks?: string[];
  backgroundSummary?: string;
  relevanceToMyResearch?: string;
  conversationAngles?: string[];
  createdAt: string;
  updatedAt: string;
}
