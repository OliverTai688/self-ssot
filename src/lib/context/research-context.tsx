"use client"

import * as React from "react"
import {
  ResearchThread,
  ResearchIdea,
  ResearchMaterial,
  Researcher,
  PublicationTarget,
  ResearchMilestone,
  ResearchOutput,
  ResearchIssue,
  ResearchIssueStatus,
  ResearchQuestion,
  ResearchConcept,
  ResearchSource,
  ResearchSourceType,
  ResearchIdeaV2,
  IdeaSourceContext,
  ResearchWritingProject,
  WritingSection,
  AIFeedbackRun,
  ResearchEvent,
  ResearchEventType,
  AcademicPerson,
  AcademicRole,
  ResearchLink,
  ResearchEntityType,
  ResearchRelationType,
} from "@/types/research"
import {
  mockResearchThreads,
  mockResearchIdeas,
  mockResearchMaterials,
  mockResearchers,
  mockPublicationTargets,
  mockResearchMilestones,
  mockResearchOutputs,
  mockResearchIssues,
  mockResearchQuestions,
  mockResearchConcepts,
  mockResearchSources,
  mockResearchIdeasV2,
  mockResearchWritingProjects,
  mockWritingSections,
  mockAIFeedbackRuns,
  mockResearchEvents,
  mockAcademicPeople,
  mockResearchLinks,
} from "@/lib/mock/research"

interface ResearchContextType {
  // ─── Legacy state ──────────────────────────────────────────────────────────
  threads: ResearchThread[]
  ideas: ResearchIdea[]
  materials: ResearchMaterial[]
  researchers: Researcher[]
  publicationTargets: PublicationTarget[]
  milestones: ResearchMilestone[]
  outputs: ResearchOutput[]
  addThread: (title: string, description?: string, workLinkage?: string) => void
  addIdea: (threadId: string, title: string, body: string, ideaType: "concept" | "hypothesis" | "question", linkedProjectId?: string, linkedProjectName?: string) => void
  addMaterial: (threadId: string, title: string, type: "paper" | "book" | "article" | "data" | "tool", url?: string, notes?: string) => void
  addPublicationTarget: (threadId: string, venueName: string, venueType: "conference" | "journal" | "platform" | "public", deadline: string, notes?: string) => void
  addMilestone: (threadId: string, title: string, deliverable: string, dueAt: string) => void
  addOutput: (threadId: string, type: "slide" | "poster" | "summary" | "learning_path" | "blog", title: string, body?: string) => void
  linkIdeaToWork: (ideaId: string, projectId: string, projectName: string) => void

  // ─── Network model state ────────────────────────────────────────────────────
  issues: ResearchIssue[]
  questions: ResearchQuestion[]
  concepts: ResearchConcept[]
  sources: ResearchSource[]
  ideasV2: ResearchIdeaV2[]
  writingProjects: ResearchWritingProject[]
  writingSections: WritingSection[]
  feedbackRuns: AIFeedbackRun[]
  events: ResearchEvent[]
  people: AcademicPerson[]
  links: ResearchLink[]

  // ─── Network model methods ──────────────────────────────────────────────────
  addIssue: (title: string, description?: string, keywords?: string[], disciplines?: string[]) => void
  addQuestion: (question: string, issueId?: string, notes?: string) => void
  addConcept: (name: string, shortDefinition?: string) => void
  addSource: (title: string, sourceType: ResearchSourceType, authors?: string[], year?: number, url?: string, summary?: string) => void
  addIdeaV2: (title: string, body: string, ideaType: ResearchIdeaV2["ideaType"], sourceContext?: IdeaSourceContext, issueId?: string) => void
  addLink: (fromType: ResearchEntityType, fromId: string, toType: ResearchEntityType, toId: string, relationType: ResearchRelationType, note?: string) => void
  addWritingProject: (title: string, writingType: ResearchWritingProject["writingType"], issueId?: string, targetVenueName?: string) => void
  addEvent: (name: string, eventType: ResearchEventType, fields?: string[]) => void
  addPerson: (name: string, role?: AcademicRole, affiliation?: string) => void
  getLinkedEntities: (entityType: ResearchEntityType, entityId: string) => ResearchLink[]
}

const ResearchContext = React.createContext<ResearchContextType | undefined>(undefined)

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  // ─── Legacy state ──────────────────────────────────────────────────────────
  const [threads, setThreads] = React.useState<ResearchThread[]>([])
  const [ideas, setIdeas] = React.useState<ResearchIdea[]>([])
  const [materials, setMaterials] = React.useState<ResearchMaterial[]>([])
  const [researchers, setResearchers] = React.useState<Researcher[]>([])
  const [publicationTargets, setPublicationTargets] = React.useState<PublicationTarget[]>([])
  const [milestones, setMilestones] = React.useState<ResearchMilestone[]>([])
  const [outputs, setOutputs] = React.useState<ResearchOutput[]>([])

  // ─── Network model state ────────────────────────────────────────────────────
  const [issues, setIssues] = React.useState<ResearchIssue[]>([])
  const [questions, setQuestions] = React.useState<ResearchQuestion[]>([])
  const [concepts, setConcepts] = React.useState<ResearchConcept[]>([])
  const [sources, setSources] = React.useState<ResearchSource[]>([])
  const [ideasV2, setIdeasV2] = React.useState<ResearchIdeaV2[]>([])
  const [writingProjects, setWritingProjects] = React.useState<ResearchWritingProject[]>([])
  const [writingSections, setWritingSections] = React.useState<WritingSection[]>([])
  const [feedbackRuns, setFeedbackRuns] = React.useState<AIFeedbackRun[]>([])
  const [events, setEvents] = React.useState<ResearchEvent[]>([])
  const [people, setPeople] = React.useState<AcademicPerson[]>([])
  const [links, setLinks] = React.useState<ResearchLink[]>([])

  React.useEffect(() => {
    const get = (key: string) => localStorage.getItem(key)
    const parse = <T,>(raw: string | null, fallback: T[]): T[] =>
      raw ? (JSON.parse(raw) as T[]) : fallback

    setThreads(parse(get("pos_res_threads"), mockResearchThreads))
    setIdeas(parse(get("pos_res_ideas"), mockResearchIdeas))
    setMaterials(parse(get("pos_res_materials"), mockResearchMaterials))
    setResearchers(parse(get("pos_res_researchers"), mockResearchers))
    setPublicationTargets(parse(get("pos_res_targets"), mockPublicationTargets))
    setMilestones(parse(get("pos_res_milestones"), mockResearchMilestones))
    setOutputs(parse(get("pos_res_outputs"), mockResearchOutputs))

    setIssues(parse(get("pos_res_issues"), mockResearchIssues))
    setQuestions(parse(get("pos_res_questions"), mockResearchQuestions))
    setConcepts(parse(get("pos_res_concepts"), mockResearchConcepts))
    setSources(parse(get("pos_res_sources"), mockResearchSources))
    setIdeasV2(parse(get("pos_res_ideasv2"), mockResearchIdeasV2))
    setWritingProjects(parse(get("pos_res_writing"), mockResearchWritingProjects))
    setWritingSections(parse(get("pos_res_sections"), mockWritingSections))
    setFeedbackRuns(parse(get("pos_res_feedback"), mockAIFeedbackRuns))
    setEvents(parse(get("pos_res_events"), mockResearchEvents))
    setPeople(parse(get("pos_res_people"), mockAcademicPeople))
    setLinks(parse(get("pos_res_links"), mockResearchLinks))
  }, [])

  const save = (key: string, data: unknown) => localStorage.setItem(key, JSON.stringify(data))

  // ─── Legacy methods ─────────────────────────────────────────────────────────
  const addThread = React.useCallback((title: string, description?: string, workLinkage?: string) => {
    setThreads((prev) => {
      const next = [{ id: `rt-${Date.now()}`, title, description, status: "exploring" as const, workLinkage, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]
      save("pos_res_threads", next)
      return next
    })
  }, [])

  const addIdea = React.useCallback((threadId: string, title: string, body: string, ideaType: "concept" | "hypothesis" | "question", linkedProjectId?: string, linkedProjectName?: string) => {
    setIdeas((prev) => {
      const next = [{ id: `ri-${Date.now()}`, threadId, title, body, ideaType, linkedProjectId, linkedProjectName, createdAt: new Date().toISOString() }, ...prev]
      save("pos_res_ideas", next)
      return next
    })
  }, [])

  const addMaterial = React.useCallback((threadId: string, title: string, type: "paper" | "book" | "article" | "data" | "tool", url?: string, notes?: string) => {
    setMaterials((prev) => {
      const next = [{ id: `rm-${Date.now()}`, threadId, title, type, url, notes, createdAt: new Date().toISOString() }, ...prev]
      save("pos_res_materials", next)
      return next
    })
  }, [])

  const addPublicationTarget = React.useCallback((threadId: string, venueName: string, venueType: "conference" | "journal" | "platform" | "public", deadline: string, notes?: string) => {
    setPublicationTargets((prev) => {
      const next = [{ id: `pt-${Date.now()}`, threadId, venueName, venueType, deadline, status: "considering" as const, notes }, ...prev]
      save("pos_res_targets", next)
      return next
    })
  }, [])

  const addMilestone = React.useCallback((threadId: string, title: string, deliverable: string, dueAt: string) => {
    setMilestones((prev) => {
      const next = [{ id: `rmil-${Date.now()}`, threadId, title, deliverable, dueAt, status: "todo" as const }, ...prev]
      save("pos_res_milestones", next)
      return next
    })
  }, [])

  const addOutput = React.useCallback((threadId: string, type: "slide" | "poster" | "summary" | "learning_path" | "blog", title: string, body?: string) => {
    setOutputs((prev) => {
      const next = [{ id: `ro-${Date.now()}`, threadId, type, title, body, isPublic: false, createdAt: new Date().toISOString() }, ...prev]
      save("pos_res_outputs", next)
      return next
    })
  }, [])

  const linkIdeaToWork = React.useCallback((ideaId: string, projectId: string, projectName: string) => {
    setIdeas((prev) => {
      const next = prev.map((idea) => idea.id === ideaId ? { ...idea, linkedProjectId: projectId, linkedProjectName: projectName } : idea)
      save("pos_res_ideas", next)
      return next
    })
  }, [])

  // ─── Network model methods ──────────────────────────────────────────────────
  const addIssue = React.useCallback((title: string, description?: string, keywords: string[] = [], disciplines: string[] = []) => {
    setIssues((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `iss-${Date.now()}`, title, description, status: "exploring" as ResearchIssueStatus, keywords, disciplines, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_issues", next)
      return next
    })
  }, [])

  const addQuestion = React.useCallback((question: string, issueId?: string, notes?: string) => {
    setQuestions((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `rq-${Date.now()}`, issueId, question, status: "open" as const, notes, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_questions", next)
      return next
    })
  }, [])

  const addConcept = React.useCallback((name: string, shortDefinition?: string) => {
    setConcepts((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `con-${Date.now()}`, name, shortDefinition, status: "raw" as const, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_concepts", next)
      return next
    })
  }, [])

  const addSource = React.useCallback((title: string, sourceType: ResearchSourceType, authors?: string[], year?: number, url?: string, summary?: string) => {
    setSources((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `src-${Date.now()}`, title, sourceType, authors, year, url, summary, status: "unprocessed" as const, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_sources", next)
      return next
    })
  }, [])

  const addIdeaV2 = React.useCallback((title: string, body: string, ideaType: ResearchIdeaV2["ideaType"], sourceContext?: IdeaSourceContext, issueId?: string) => {
    setIdeasV2((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `idea2-${Date.now()}`, title, body, ideaType, sourceContext, issueId, status: "inbox" as const, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_ideasv2", next)
      return next
    })
  }, [])

  const addLink = React.useCallback((fromType: ResearchEntityType, fromId: string, toType: ResearchEntityType, toId: string, relationType: ResearchRelationType, note?: string) => {
    setLinks((prev) => {
      const next = [{ id: `rl-${Date.now()}`, fromType, fromId, toType, toId, relationType, note, createdAt: new Date().toISOString() }, ...prev]
      save("pos_res_links", next)
      return next
    })
  }, [])

  const addWritingProject = React.useCallback((title: string, writingType: ResearchWritingProject["writingType"], issueId?: string, targetVenueName?: string) => {
    setWritingProjects((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `wp-${Date.now()}`, title, writingType, issueId, targetVenueName, status: "idea" as const, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_writing", next)
      return next
    })
  }, [])

  const addEvent = React.useCallback((name: string, eventType: ResearchEventType, fields: string[] = []) => {
    setEvents((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `ev-${Date.now()}`, name, eventType, fields, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_events", next)
      return next
    })
  }, [])

  const addPerson = React.useCallback((name: string, role?: AcademicRole, affiliation?: string) => {
    setPeople((prev) => {
      const now = new Date().toISOString()
      const next = [{ id: `ap-${Date.now()}`, name, role, affiliation, createdAt: now, updatedAt: now }, ...prev]
      save("pos_res_people", next)
      return next
    })
  }, [])

  const getLinkedEntities = React.useCallback((entityType: ResearchEntityType, entityId: string): ResearchLink[] => {
    return links.filter(
      (l) => (l.fromType === entityType && l.fromId === entityId) || (l.toType === entityType && l.toId === entityId)
    )
  }, [links])

  return (
    <ResearchContext.Provider
      value={{
        threads, ideas, materials, researchers, publicationTargets, milestones, outputs,
        addThread, addIdea, addMaterial, addPublicationTarget, addMilestone, addOutput, linkIdeaToWork,
        issues, questions, concepts, sources, ideasV2, writingProjects, writingSections, feedbackRuns, events, people, links,
        addIssue, addQuestion, addConcept, addSource, addIdeaV2, addLink, addWritingProject, addEvent, addPerson, getLinkedEntities,
      }}
    >
      {children}
    </ResearchContext.Provider>
  )
}

export function useResearch() {
  const context = React.useContext(ResearchContext)
  if (context === undefined) {
    throw new Error("useResearch must be used within a ResearchProvider")
  }
  return context
}
