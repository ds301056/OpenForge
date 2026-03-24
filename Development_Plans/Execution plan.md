# OpenForge — Execution Plan

This is the real build plan. Not aspirational — sequential. Each phase has concrete deliverables, and later phases don't start until earlier ones are working. Every task is scoped to be completable in a focused session.

---

## Phase 0: Repository Scaffolding

**Goal:** A working Next.js project with Supabase connected, deployable to Vercel, with the full directory structure in place and CI passing.

**Duration:** 1 session

### Tasks

- [ ] Initialize Next.js 15 project with TypeScript, Tailwind, App Router
- [ ] Install and configure shadcn/ui
- [ ] Set up Supabase project (or local Supabase CLI for development)
- [ ] Configure environment variables (`.env.example` with all expected keys)
- [ ] Create the full directory structure from README (empty files with TODO comments are fine — the point is the shape exists)
- [ ] Set up ESLint + Prettier config
- [ ] Add a basic GitHub Actions CI workflow (lint + type check + build)
- [ ] Create stub `page.tsx` files for all three views (Goal Inbox, Plan View, Today View) with placeholder UI
- [ ] Wire up basic layout with sidebar navigation between views
- [ ] Deploy to Vercel (even if it's just placeholder pages)

### Definition of Done
You can navigate between three stub views in a deployed app. CI passes. Database connection works.

---

## Phase 1: Data Layer

**Goal:** The complete database schema exists, migrations run cleanly, and typed query functions are available for all core entities.

**Duration:** 1–2 sessions

### Tasks

- [ ] Write the full SQL schema (see below for exact specification)
- [ ] Create Supabase migration files
- [ ] Run migrations against dev database
- [ ] Build typed query layer (`lib/db/queries.ts`) using Supabase client
  - [ ] CRUD for `goals`
  - [ ] CRUD for `milestones` (scoped to plan version)
  - [ ] CRUD for `tasks` (scoped to milestone)
  - [ ] Create/read for `plan_versions` (immutable — no update)
  - [ ] CRUD for `suggestions`
  - [ ] Create/read for `decision_log` (immutable — audit trail)
  - [ ] Read for `dependencies`
- [ ] Add seed data script with one example goal + plan for development
- [ ] Verify with a test page that reads and displays seeded data

### Database Schema — Exact Specification

```sql
-- Workspaces (multi-tenancy prep, single workspace for v1)
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Goals
create table goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  description text,
  domain_template text default 'generic',   -- e.g., 'learning-plan', 'software-project'
  constraints jsonb default '{}',            -- timeline, skill_level, tools, budget, etc.
  status text default 'draft'                -- draft | planning | active | completed | archived
    check (status in ('draft', 'planning', 'active', 'completed', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Plan Versions (immutable snapshots)
create table plan_versions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade,
  version_number integer not null,
  trigger text,                               -- what caused this version: 'initial', 'optimization', 'manual_edit'
  summary text,                               -- human-readable description of this version
  created_at timestamptz default now(),
  unique(goal_id, version_number)
);

-- Milestones
create table milestones (
  id uuid primary key default gen_random_uuid(),
  plan_version_id uuid references plan_versions(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null,
  target_date date,
  status text default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references milestones(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'skipped', 'blocked', 'already_known')),
  priority text default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  effort_estimate text,                       -- e.g., '30min', '2hrs', '1day'
  completion_criteria text,                   -- how to know this task is done
  rationale text,                             -- why this task exists in the plan
  locked boolean default false,               -- user pinned this task, optimizer can't touch it
  sort_order integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Dependencies (task → task edges)
create table dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  depends_on_task_id uuid references tasks(id) on delete cascade,
  dependency_type text default 'blocks'       -- 'blocks' | 'recommends'
    check (dependency_type in ('blocks', 'recommends')),
  unique(task_id, depends_on_task_id)
);

-- Suggestions (optimizer output)
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade,
  plan_version_id uuid references plan_versions(id),
  trigger_event text not null,                -- 'task_completed', 'task_blocked', 'already_known', etc.
  target_entity_type text not null,           -- 'task', 'milestone', 'plan'
  target_entity_id uuid,
  proposed_change jsonb not null,             -- structured diff of what changes
  justification text not null,               -- why this change is proposed
  confidence numeric(3,2) not null           -- 0.00–1.00
    check (confidence >= 0 and confidence <= 1),
  requires_approval boolean default true,
  status text default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- Decision Log (audit trail)
create table decision_log (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade,
  suggestion_id uuid references suggestions(id),  -- null for manual edits
  action text not null                        -- 'approved', 'rejected', 'manual_edit'
    check (action in ('approved', 'rejected', 'manual_edit')),
  previous_state jsonb,
  new_state jsonb,
  user_reason text,                           -- optional: why the user made this decision
  created_at timestamptz default now()
);

-- Indexes
create index idx_goals_workspace on goals(workspace_id);
create index idx_goals_status on goals(status);
create index idx_plan_versions_goal on plan_versions(goal_id);
create index idx_milestones_plan on milestones(plan_version_id);
create index idx_tasks_milestone on tasks(milestone_id);
create index idx_tasks_status on tasks(status);
create index idx_suggestions_goal on suggestions(goal_id);
create index idx_suggestions_status on suggestions(status);
create index idx_decision_log_goal on decision_log(goal_id);

-- Updated_at triggers
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger goals_updated_at before update on goals
  for each row execute function update_modified_column();

create trigger tasks_updated_at before update on tasks
  for each row execute function update_modified_column();
```

### Definition of Done
Migrations run. Seed data loads. A test page renders goal → milestones → tasks from the database.

---

## Phase 2: Planner Pipeline

**Goal:** Given a freeform goal description, the system produces a valid, structured plan using the Learning Plan template. This is the core product — spend the most time here.

**Duration:** 2–3 sessions

### Tasks

#### Step 1: Type Definitions
- [ ] Define TypeScript types for the planner pipeline I/O:
  - `ClassificationResult` — domain, constraints, ambiguities, skill_level
  - `PlanStructure` — milestones with descriptions and ordering
  - `ExpandedPlan` — full plan with tasks, dependencies, rationale per task
  - `ValidationResult` — pass/fail with list of violations

#### Step 2: Learning Plan Template
- [ ] Implement `templates/learning-plan.ts` with:
  - Classification hints (what constraints matter: time commitment per week, current skill level, learning style, target proficiency)
  - Structural rules:
    - Milestones should be 1–2 weeks max
    - First milestone is always foundational/setup
    - Last milestone is always a capstone project
    - Each concept milestone should be followed by a practice milestone
  - Task generation heuristics:
    - Every concept task must have a companion practice task
    - Include "checkpoint" tasks at milestone boundaries
    - Always include environment/tooling setup early
    - Estimate effort based on skill level (beginner = longer estimates)
  - Validation constraints:
    - No milestone > 14 days
    - No task without a rationale
    - No task without completion criteria
    - Every practice task must depend on its concept task
    - At least one capstone/project task in the plan

#### Step 3: Classify Step
- [ ] Implement `planner/classify.ts`
  - Input: raw goal text + template hints
  - Output: `ClassificationResult`
  - Prompt design: system prompt instructs model to extract structured constraints, identify the domain, and flag what's missing or ambiguous
  - JSON output mode — validate against schema, retry once on failure
  - This step can use a fast/cheap model

#### Step 4: Structure Step
- [ ] Implement `planner/structure.ts`
  - Input: `ClassificationResult` + template structural rules
  - Output: `PlanStructure` (ordered milestones with descriptions, no tasks yet)
  - Prompt design: system prompt includes template rules as hard constraints, classification as context
  - This step needs the best available model — it's the hard reasoning step
  - Validate milestone count, duration, ordering

#### Step 5: Expand Step
- [ ] Implement `planner/expand.ts`
  - Input: `PlanStructure` + `ClassificationResult` + template task heuristics
  - Output: `ExpandedPlan` (milestones with tasks, dependencies, effort, rationale)
  - Prompt design: expand one milestone at a time (better quality than expanding all at once)
  - Generate dependencies as part of expansion (task A depends on task B)
  - Mid-tier model is fine here

#### Step 6: Validate Step
- [ ] Implement `planner/validate.ts`
  - Input: `ExpandedPlan` + template validation constraints
  - Output: `ValidationResult`
  - Pure logic — no LLM call
  - Check all template constraints
  - Return list of violations with severity (error vs warning)
  - If errors exist, trigger one retry of the failing step with violation feedback injected into the prompt

#### Step 7: Pipeline Orchestrator
- [ ] Implement `planner/index.ts`
  - Chains all four steps
  - Handles the retry loop on validation failure (max 1 retry)
  - Persists the result: creates `plan_version`, `milestones`, `tasks`, `dependencies` in the database
  - Returns the plan ID for the frontend to fetch and display

#### Step 8: Inference Clients
- [ ] Implement `inference/anthropic.ts` — wraps Anthropic SDK, handles JSON mode
- [ ] Implement `inference/ollama.ts` — wraps Ollama HTTP API, same interface
- [ ] Implement `inference/router.ts` — reads config, selects provider per step
- [ ] (OpenAI client is a stretch goal — Anthropic + Ollama is enough for v1)

### Testing Approach
- Create 5 test goals of varying specificity:
  1. "Learn Rust in 6 weeks" (clear, well-scoped)
  2. "Get better at machine learning" (vague, no timeline)
  3. "Learn piano well enough to play at my sister's wedding in 4 months" (clear deadline, emotional constraint)
  4. "Understand distributed systems" (broad, no timeline)
  5. "Learn TypeScript coming from Python, 10 hours per week" (clear skill transfer context)
- Run each through the pipeline and evaluate:
  - Does the classification correctly identify constraints and ambiguities?
  - Are milestones reasonably scoped and ordered?
  - Do tasks have real completion criteria (not just "understand X")?
  - Are dependencies logical?
  - Does validation catch real issues?

### Definition of Done
All 5 test goals produce valid, structured plans that you would actually want to follow. The plans feel domain-aware, not generic.

---

## Phase 3: Core UI

**Goal:** A functional interface where you can create goals, view generated plans, and interact with tasks (status changes, approve/edit).

**Duration:** 2 sessions

### Tasks

#### Goal Inbox
- [ ] New Goal form: title, description, template selector (only "Learning Plan" for now), optional constraint fields (timeline, skill level, time commitment)
- [ ] Goal list view: cards showing title, status, template, created date
- [ ] "Generate Plan" button that triggers the planner pipeline
- [ ] Loading state during plan generation (this takes 15–60 seconds — needs good UX)
- [ ] Error handling if plan generation fails

#### Plan View
- [ ] Fetch and display plan for a given goal
- [ ] Milestone cards in order, expandable to show tasks
- [ ] Task rows showing: title, status, effort estimate, priority
- [ ] Task detail panel (click to expand): description, rationale, completion criteria, dependencies
- [ ] Status change controls: todo → in_progress → done / skipped / already_known
- [ ] Task edit: inline editing of title, description, priority
- [ ] Task lock toggle (prevent optimizer from modifying)
- [ ] Visual dependency indicators (which tasks are blocked by incomplete dependencies)

#### Today View (Minimal v1)
- [ ] Query: across all active goals, find the highest-priority unblocked task
- [ ] Display: the recommended next task with its rationale and context (which goal, which milestone)
- [ ] "Why this task?" explanation based on priority + dependency position + milestone progress

### UI/UX Notes
- Use shadcn/ui for all components (consistent, accessible, fast to build)
- Plan View is the most important screen — spend the most design time here
- Suggestion cards (Phase 4) will slot into Plan View, so leave space for them
- The loading state during plan generation is a critical UX moment — consider streaming partial results or showing pipeline step progress

### Definition of Done
You can create a goal, generate a plan, view it, change task statuses, and see a "next task" recommendation. The whole loop works end-to-end.

---

## Phase 4: Optimizer + Suggestion System

**Goal:** When task status changes, the optimizer evaluates whether the plan needs adjustment and surfaces suggestions with the approve/reject/edit UI.

**Duration:** 2–3 sessions

### Tasks

#### Event System
- [ ] Define the 5 trigger events as typed constants
- [ ] Hook task status changes to fire trigger events
- [ ] Each trigger passes context: which task, what changed, current plan state

#### Optimization Strategies
- [ ] **Task Completed Strategy**
  - Unlock dependent tasks (change from blocked → todo)
  - Check if milestone is complete (all tasks done/skipped)
  - Recalculate pacing: if ahead of schedule, can suggest compressing timeline; if behind, suggest deprioritization
- [ ] **Task Blocked Strategy**
  - Identify the blocker (dependency that's not done)
  - Suggest resequencing: can another task be done first?
  - Suggest breaking the blocker into smaller pieces
- [ ] **Already Known Strategy**
  - Remove the task and its practice companion
  - Check if this changes the milestone structure (can milestones be merged?)
  - Reassess downstream tasks that assumed the user didn't know this
  - Potentially accelerate the timeline
- [ ] **Deadline Changed Strategy**
  - Rebalance effort across milestones
  - Flag milestones that are now at risk
  - Suggest scope reduction if timeline compressed, or depth increase if extended
- [ ] **Priority Reordered Strategy**
  - Resequence tasks respecting new priority order + existing hard dependencies
  - Flag conflicts (user wants X first but Y is a prerequisite)

#### Suggestion System
- [ ] Suggestion builder: takes strategy output and produces a `Suggestion` record
- [ ] Suggestion persistence in database
- [ ] Suggestion API endpoint: fetch pending suggestions for a goal

#### Suggestion UI
- [ ] Suggestion card component: shows trigger, proposed change, justification, confidence
- [ ] Diff view: what the plan looks like before vs after the suggestion
- [ ] Approve button: applies the change, creates new plan version, logs decision
- [ ] Reject button: marks suggestion as rejected, logs decision with optional reason
- [ ] Edit button: opens the proposed change for modification before applying

#### Plan Versioning
- [ ] On suggestion approval: create new `plan_version`, copy milestones/tasks with the change applied
- [ ] Version history view: list of versions with trigger summaries
- [ ] Diff view between any two versions

### Definition of Done
Changing a task to "already known" triggers an optimization suggestion. The suggestion explains what it wants to change and why. You can approve it and see the plan update. The old version is preserved.

---

## Phase 5: Polish and Ship

**Goal:** The app is usable by someone who isn't you. Auth, error handling, onboarding, and deployment are solid.

**Duration:** 1–2 sessions

### Tasks

- [ ] Supabase Auth integration (email/password + OAuth)
- [ ] Row-level security policies on all tables
- [ ] Default workspace creation on signup
- [ ] Onboarding flow: guided first goal creation with explanation of how the system works
- [ ] Error boundaries and fallback UI throughout
- [ ] Loading skeletons for all async operations
- [ ] Mobile-responsive layout (plan view needs special attention)
- [ ] SEO and Open Graph tags for the landing page
- [ ] Final Vercel deployment with production environment
- [ ] Write CONTRIBUTING.md with setup instructions, PR guidelines, and template contribution guide
- [ ] Tag v0.1.0 release

### Definition of Done
A new user can sign up, create their first goal, get a plan, interact with it, receive optimization suggestions, and the whole experience feels intentional — not like a prototype.

---

## Phase Sequencing Rules

1. **Do not start Phase 2 until Phase 1 is done.** The planner needs real database persistence, not mocks.
2. **Do not start Phase 4 until Phase 3 is working.** You need to interact with plans manually before adding optimization, or you won't know if the optimizer's changes make sense.
3. **Phase 0 and Phase 1 can overlap** — scaffold the app while writing the schema.
4. **Phase 5 can start partially during Phase 4** — auth and error handling can be added incrementally.

## Working in GitHub Workspace

This plan is designed for execution in GitHub Codespaces or a similar cloud dev environment:

- All dependencies are standard npm packages — no native binaries or special system deps
- Supabase can be run locally via CLI (`supabase start`) or connected to a cloud project
- Environment variables are the only config — no file-based secrets
- The CI workflow validates that the project builds and types check on every push
- Each phase maps roughly to a feature branch and PR

### Suggested Branch Strategy

```
main                    ← always deployable
├── phase/0-scaffold    ← repo setup, project structure
├── phase/1-data-layer  ← schema, migrations, query layer
├── phase/2-planner     ← pipeline, templates, inference
├── phase/3-core-ui     ← goal inbox, plan view, today view
├── phase/4-optimizer   ← triggers, strategies, suggestions
└── phase/5-polish      ← auth, onboarding, error handling
```

Feature work within a phase uses sub-branches:

```
phase/2-planner
├── feat/classify-step
├── feat/structure-step
├── feat/expand-step
├── feat/validate-step
└── feat/pipeline-orchestrator
```

### Issue Labels

Use these labels to organize work:

| Label | Meaning |
|---|---|
| `phase:0` through `phase:5` | Which build phase |
| `layer:data` | Database, migrations, queries |
| `layer:planner` | Planning pipeline |
| `layer:optimizer` | Optimization engine |
| `layer:ui` | Frontend components |
| `layer:infra` | CI, deployment, config |
| `type:feature` | New functionality |
| `type:bug` | Something broken |
| `type:template` | Domain template work |
| `good-first-issue` | Good for new contributors |
| `help-wanted` | Community contribution welcome |

---

## Estimated Total Timeline

This is one-person, side-project pacing (evenings + weekends):

| Phase | Estimated Duration |
|---|---|
| Phase 0: Scaffold | 1 day |
| Phase 1: Data Layer | 2–3 days |
| Phase 2: Planner Pipeline | 5–7 days |
| Phase 3: Core UI | 4–5 days |
| Phase 4: Optimizer | 5–7 days |
| Phase 5: Polish | 3–4 days |
| **Total to v0.1** | **~3–4 weeks** |

Phase 2 (planner pipeline) will take the most iteration because prompt engineering and output quality tuning is inherently experimental. Budget extra time there.