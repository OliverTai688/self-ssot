-- ─── CREATE EXTENSIONS ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. USER PROFILES & SYSTEM ROLES ──────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('owner', 'partner', 'client');

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. DYNAMIC MODULE PERMISSIONS (隨插即用微服務權限表) ────────────────────
CREATE TABLE user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL, -- dashboard, work, chamber, company, finance, research, life, ai-input
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, module_key)
);

-- ─── 3. WORK PROJECTS & TASKS & DELIVERABLES ─────────────────────────────────
CREATE TYPE project_status AS ENUM ('exploring', 'active', 'paused', 'completed', 'archived');
CREATE TYPE visibility_type AS ENUM ('internal_only', 'client_visible');
CREATE TYPE deliverable_status AS ENUM ('draft', 'delivered', 'approved');

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  visibility visibility_type NOT NULL DEFAULT 'internal_only',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  origin TEXT CHECK (origin IN ('manual', 'ai', 'client')),
  category TEXT CHECK (category IN ('thought', 'meeting', 'line', 'email')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES project_deliverables(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status deliverable_status NOT NULL DEFAULT 'draft',
  visibility visibility_type NOT NULL DEFAULT 'internal_only',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. RESEARCH INTELLIGENCE WORKSPACE v2 TABLES ────────────────────────────
CREATE TYPE research_thread_status AS ENUM ('exploring', 'active', 'writing', 'published', 'paused');

CREATE TABLE research_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status research_thread_status NOT NULL DEFAULT 'exploring',
  keywords TEXT[] DEFAULT '{}',
  disciplines TEXT[] DEFAULT '{}',
  regions TEXT[] DEFAULT '{}',
  method_type TEXT CHECK (method_type IN ('qualitative', 'quantitative', 'design_research', 'mixed')),
  main_research_question TEXT,
  work_linkage TEXT, -- 與實際工作專案的雙向關聯說明
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 資料來源總庫 (Unified Source Registry)
CREATE TYPE research_source_type AS ENUM (
  'paper', 'book', 'article', 'conference_record', 'workshop_record',
  'meeting_record', 'audio_transcript', 'institution_report', 'dataset', 'website', 'personal_note'
);
CREATE TYPE source_reliability AS ENUM ('primary', 'secondary', 'informal', 'personal_observation');

CREATE TABLE research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type research_source_type NOT NULL DEFAULT 'paper',
  authors TEXT[] DEFAULT '{}',
  year INTEGER,
  doi TEXT,
  url TEXT,
  institution TEXT,
  region TEXT,
  country TEXT,
  language TEXT DEFAULT 'zh-TW',
  abstract TEXT,
  summary TEXT, -- AI 自動產生的 200 字學術摘要
  original_text TEXT,
  file_url TEXT,
  reliability source_reliability NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 概念釐清中心 (Concept Clarifier)
CREATE TABLE research_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  definition TEXT,
  related_sources UUID[] DEFAULT '{}', -- 引用文獻 IDs
  related_authors UUID[] DEFAULT '{}', -- 引用學者 IDs
  competing_definitions JSONB DEFAULT '[]', -- 多作者定義比較 json: [{sourceId, author, definition, note}]
  my_current_understanding TEXT,
  ai_clarification TEXT,
  confusion_points TEXT[] DEFAULT '{}', -- AI 提示易混淆處
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 論文創作工作台 (Writing Studio)
CREATE TYPE writing_project_type AS ENUM ('paper', 'conference_paper', 'proposal', 'essay', 'poster', 'presentation');
CREATE TYPE writing_project_status AS ENUM ('idea', 'outline', 'drafting', 'reviewing', 'submitted');

CREATE TABLE research_writing_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  writing_type writing_project_type NOT NULL DEFAULT 'paper',
  status writing_project_status NOT NULL DEFAULT 'idea',
  target_venue_id UUID, -- 後續可關聯至具體 Event
  research_question TEXT,
  thesis_statement TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE research_writing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES research_writing_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  linked_source_ids UUID[] DEFAULT '{}',
  ai_notes TEXT[] DEFAULT '{}'
);

-- 多視角標註與評審歷史 (AI Feedback Layer)
CREATE TYPE review_perspective AS ENUM (
  'method_reviewer', 'theory_reviewer', 'domain_expert',
  'critical_reviewer', 'friendly_mentor', 'conference_chair', 'journal_editor'
);

CREATE TABLE ai_feedback_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
  writing_project_id UUID REFERENCES research_writing_projects(id) ON DELETE SET NULL,
  source_id UUID REFERENCES research_sources(id) ON DELETE SET NULL,
  input_type TEXT CHECK (input_type IN ('paper_draft', 'outline', 'source', 'concept_note', 'proposal')),
  perspective review_perspective NOT NULL DEFAULT 'friendly_mentor',
  summary TEXT NOT NULL,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  questions TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 定期研究情報簡報 (Scheduled Research Digest)
CREATE TABLE research_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
  schedule_type TEXT CHECK (schedule_type IN ('weekly', 'biweekly', 'monthly')),
  title TEXT NOT NULL,
  new_sources UUID[] DEFAULT '{}',
  key_findings TEXT[] DEFAULT '{}',
  open_questions TEXT[] DEFAULT '{}',
  recommended_readings TEXT[] DEFAULT '{}',
  writing_suggestions TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 研討會活動雷達 (Conference & Event Radar)
CREATE TYPE event_type AS ENUM ('conference', 'workshop', 'seminar', 'summer_school', 'webinar');
CREATE TYPE participation_mode AS ENUM ('submit_paper', 'submit_poster', 'attend', 'ask_question', 'networking');

CREATE TABLE research_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type event_type NOT NULL DEFAULT 'conference',
  field TEXT[] DEFAULT '{}',
  location TEXT,
  country TEXT,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  submission_deadline TIMESTAMPTZ, -- CFP 截止大限
  registration_deadline TIMESTAMPTZ,
  url TEXT,
  cfp_text TEXT,
  related_thread_ids UUID[] DEFAULT '{}',
  fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 100),
  ai_fit_reason TEXT,
  suggested_participation_mode participation_mode NOT NULL DEFAULT 'attend',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 學術人脈 CRM (Academic People Intelligence)
CREATE TABLE academic_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  academic_role TEXT CHECK (academic_role IN ('author', 'chair', 'session_chair', 'keynote', 'editor', 'reviewer')),
  affiliation TEXT,
  country TEXT,
  profile_url TEXT,
  research_areas TEXT[] DEFAULT '{}',
  important_works TEXT[] DEFAULT '{}',
  related_events UUID[] DEFAULT '{}',
  background_summary TEXT,
  relevance_to_my_research TEXT,
  conversation_angles TEXT[] DEFAULT '{}', -- AI 推薦提問、社交破冰角度
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_writing_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_writing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_people ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies for Owner / Partner
CREATE POLICY "Owners manage their profiles" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Owners manage their module permissions" ON user_module_permissions
  FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Owners manage their projects" ON projects
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners manage tasks" ON project_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_tasks.project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners manage notes" ON project_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_notes.project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners manage deliverables" ON project_deliverables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_deliverables.project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners manage research threads" ON research_threads
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners manage research sources" ON research_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM research_threads WHERE id = research_sources.thread_id AND owner_id = auth.uid()
    )
  );
