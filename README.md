# OpenForge

**An open-source AI planning engine that turns vague goals into adaptive, explainable execution plans.**

Most todo apps are glorified storage. You type tasks, check boxes, forget about half of them. OpenForge is different — you describe what you want to accomplish, and the system generates a structured plan with milestones, tasks, dependencies, and reasoning. As you work, it watches progress and proposes optimizations. Every suggestion comes with a justification you can approve, reject, or edit.

This is not "AI slapped onto a todo list." This is a decomposition and replanning engine with a human-in-the-loop approval model.

---

## How It Works

```
You: "I want to learn Rust well enough to build a CLI tool in 6 weeks"

OpenForge:
├── Milestone 1: Foundations (Week 1-2)
│   ├── Task: Set up Rust toolchain and IDE
│   ├── Task: Work through ownership/borrowing concepts
│   ├── Task: Complete Rustlings exercises (ownership section)
│   └── Task: Build a "hello world" CLI with clap
├── Milestone 2: Core Language Deep Dive (Week 2-3)
│   ├── Task: Study error handling patterns (Result, Option)
│   ├── Task: Learn structs, enums, and pattern matching
│   ├── Task: Practice with 3 small exercises per concept
│   └── Task: Build a file reader utility
├── Milestone 3: CLI Architecture (Week 4-5)
│   └── ...
└── Milestone 4: Ship It (Week 6)
    └── ...

Every task includes:
  - why it exists
  - what it depends on
  - estimated effort
  - how to know it's done
```

When you mark "ownership/borrowing concepts" as complete, the optimizer checks whether downstream tasks still make sense. When you mark something as "I already know this," it compresses the plan and reassesses prerequisites. Every change is versioned, justified, and reversible.

---

## Core Principles

- **Human-in-the-loop, always.** The AI proposes. You decide. No autonomous replanning without approval.
- **Explainable suggestions.** Every optimization includes what changed, why, and expected impact. If the model can't justify a change, it doesn't propose one.
- **Structured output, not chat slop.** Plans follow a validated schema. No freeform paragraphs pretending to be project plans.
- **Local-first friendly.** Designed to work with cloud models (Anthropic, OpenAI) or local inference (Ollama) through a routing layer. Run it however you want.
- **Domain templates over generic plans.** A "learn Rust" plan should look fundamentally different from a "launch a YouTube channel" plan. Templates encode domain-specific heuristics that make plans actually useful.

---

## Architecture

OpenForge is a Next.js application backed by Supabase (Postgres) with a modular planning engine.

### Four Layers

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  Next.js App Router + React                      │
│  Goal Inbox │ Plan View │ Today View             │
├─────────────────────────────────────────────────┤
│                 Planner Pipeline                 │
│  Classify → Structure → Expand → Validate        │
│  Domain templates provide heuristics per step    │
├─────────────────────────────────────────────────┤
│               Optimizer (Event-Driven)           │
│  Triggers: completed │ blocked │ known │         │
│            deadline changed │ priority changed   │
│  Every suggestion: trigger + change +            │
│                    justification + confidence     │
├─────────────────────────────────────────────────┤
│                 State Layer                       │
│  Supabase / Postgres                             │
│  Workspace → Goal → PlanVersion → Milestone →    │
│  Task → Dependency → Suggestion → DecisionLog    │
└─────────────────────────────────────────────────┘
```

### Planner Pipeline

The planner is not one monolithic prompt. It's a multi-step pipeline where each step has a focused job:

1. **Classify** — Analyze the goal, extract constraints (timeline, skill level, tools, budget), identify the domain, flag ambiguities. Fast and cheap — can run on a small model.
2. **Structure** — Generate the milestone hierarchy given the classification. This is the hard reasoning step — needs the best model available.
3. **Expand** — Break each milestone into concrete tasks with dependencies, effort estimates, and completion criteria. Can run on a mid-tier model.
4. **Validate** — Check the output against the schema and domain template constraints (e.g., "no milestone longer than 2 weeks," "every concept task must have a follow-up practice task"). Deterministic — no LLM needed.

This pipeline structure gives us natural seams for local/cloud model routing and makes each step independently testable and improvable.

### Optimizer Triggers

The optimizer does not run on a schedule or poll for changes. It fires only on specific events:

| Trigger | Strategy |
|---|---|
| Task completed | Unlock dependents, recalculate pacing, check if milestone is done |
| Task marked blocked | Identify blocker, suggest workaround or resequencing |
| Task marked "already know this" | Compress plan, reassess prerequisites, accelerate timeline |
| Deadline changed | Rebalance effort distribution, flag at-risk milestones |
| User reordered priorities | Resequence tasks respecting new priority + existing dependencies |

Each trigger produces a `Suggestion` with:
- `trigger` — what event caused this
- `proposed_change` — what the optimizer wants to do
- `justification` — why this change improves the plan
- `confidence` — how sure the model is (0-1)
- `requires_approval` — whether the user must approve before it takes effect

### Inference Routing

The `inference/router.ts` module selects the right model for each task:

```
Classification     → local (Ollama) or fast cloud tier
Milestone planning → best available cloud model
Task expansion     → mid-tier cloud or capable local model
Optimization       → depends on trigger complexity
```

Cloud providers: Anthropic (Claude), OpenAI — configured via environment variables.
Local providers: Ollama — auto-detected on localhost.

The router is a strategy pattern. Adding new providers means implementing one interface.

---

## Data Model

```sql
Workspace
  └── Goal
       ├── title, description, constraints (JSON)
       ├── domain_template (e.g., "learning-plan")
       ├── status (draft | active | completed | archived)
       └── PlanVersion (immutable snapshots)
            └── Milestone
                 ├── title, description, target_date
                 ├── order, status
                 └── Task
                      ├── title, description, status
                      ├── priority, effort_estimate
                      ├── completion_criteria
                      ├── rationale (why this task exists)
                      ├── locked (user pinned this)
                      └── Dependency (task → task edges)

Suggestion
  ├── trigger_event, target_entity
  ├── proposed_change (JSON diff)
  ├── justification, confidence
  ├── requires_approval
  └── status (pending | accepted | rejected)

DecisionLog
  ├── action (approved | rejected | edited)
  ├── suggestion_id (nullable — manual edits have no suggestion)
  ├── previous_state, new_state
  └── user_reason (optional)
```

Every plan mutation creates a new `PlanVersion`. You can diff any two versions and roll back.

---

## Domain Templates

Templates are not just prompt text. Each template is a module that provides:

- **Classification hints** — what constraints matter for this domain
- **Structural rules** — milestone duration limits, required milestone types, typical milestone count
- **Task generation heuristics** — e.g., "every concept should have a practice task," "always include a review milestone"
- **Validation constraints** — rules the planner output must satisfy
- **Suggested resources** — common tools, references, starter materials for the domain

### Shipped Templates

**v1: Learning Plan**
Optimized for "learn X" goals. Understands prerequisites, concept → practice loops, skill progression, and pacing based on time commitment.

**Planned:**
- Software Project — shipping features, technical debt, testing, deployment
- Game Dev — asset pipelines, prototyping, playtesting loops
- Content Creation — ideation, production, publishing, promotion cycles

Templates are the long-term moat. Community-contributed templates are a first-class goal.

---

## Project Structure

```
openforge/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/
│   │   │   ├── goals/                # Goal Inbox view
│   │   │   │   └── page.tsx
│   │   │   ├── plan/[goalId]/        # Plan View for a specific goal
│   │   │   │   └── page.tsx
│   │   │   ├── today/                # Today View — what to do next
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── planner/              # Plan generation endpoint
│   │   │   │   └── route.ts
│   │   │   ├── optimizer/            # Optimization trigger endpoint
│   │   │   │   └── route.ts
│   │   │   └── goals/                # CRUD for goals/tasks
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Landing / onboarding
│   │
│   ├── lib/
│   │   ├── planner/
│   │   │   ├── index.ts              # Pipeline orchestrator
│   │   │   ├── classify.ts           # Step 1: goal classification
│   │   │   ├── structure.ts          # Step 2: milestone generation
│   │   │   ├── expand.ts             # Step 3: task expansion
│   │   │   └── validate.ts           # Step 4: schema + template validation
│   │   │
│   │   ├── optimizer/
│   │   │   ├── index.ts              # Event router
│   │   │   ├── triggers.ts           # Trigger type definitions
│   │   │   ├── strategies.ts         # Optimization logic per trigger
│   │   │   └── suggestion.ts         # Suggestion builder
│   │   │
│   │   ├── templates/
│   │   │   ├── types.ts              # Template interface definition
│   │   │   └── learning-plan.ts      # v1 template
│   │   │
│   │   ├── inference/
│   │   │   ├── router.ts             # Model selection logic
│   │   │   ├── anthropic.ts          # Claude API client
│   │   │   ├── openai.ts             # OpenAI API client
│   │   │   └── ollama.ts             # Ollama local client
│   │   │
│   │   └── db/
│   │       ├── schema.sql            # Full database schema
│   │       ├── migrations/           # Incremental migrations
│   │       └── queries.ts            # Typed Supabase queries
│   │
│   ├── components/
│   │   ├── plan-view/
│   │   │   ├── milestone-card.tsx
│   │   │   ├── task-row.tsx
│   │   │   └── dependency-graph.tsx
│   │   ├── goal-inbox/
│   │   │   ├── goal-card.tsx
│   │   │   └── new-goal-form.tsx
│   │   ├── today-view/
│   │   │   ├── next-task.tsx
│   │   │   └── progress-summary.tsx
│   │   └── suggestion-card/
│   │       ├── suggestion-card.tsx     # Approve / reject / edit UI
│   │       └── diff-view.tsx           # What changed in the plan
│   │
│   └── types/
│       ├── goal.ts
│       ├── plan.ts
│       ├── suggestion.ts
│       └── template.ts
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│
├── docs/
│   ├── EXECUTION_PLAN.md             # Phased build plan
│   ├── ARCHITECTURE.md               # Detailed architecture docs
│   ├── TEMPLATES.md                   # How to create domain templates
│   └── CONTRIBUTING.md
│
├── .env.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Supabase account (free tier works) or local Supabase CLI
- At least one inference provider:
  - Anthropic API key (`ANTHROPIC_API_KEY`), or
  - OpenAI API key (`OPENAI_API_KEY`), or
  - Ollama running locally (`OLLAMA_BASE_URL`)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/openforge.git
cd openforge

# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env.local
# Edit .env.local with your API keys and Supabase credentials

# Set up the database
pnpm db:migrate

# Start the dev server
pnpm dev
```

### Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Inference (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434

# Inference preferences
DEFAULT_PROVIDER=anthropic
CLASSIFICATION_PROVIDER=ollama          # optional: use local for cheap steps
STRUCTURE_PROVIDER=anthropic            # use best model for hard reasoning
EXPANSION_PROVIDER=anthropic
```

---

## Roadmap

### v0.1 — Foundation (Current)
- [ ] Database schema and migrations
- [ ] Planner pipeline (classify → structure → expand → validate)
- [ ] Learning Plan template
- [ ] Goal Inbox view (create and list goals)
- [ ] Plan View (render milestones and tasks, approve/edit)
- [ ] Basic task status management (todo → in progress → done → skipped)

### v0.2 — Optimization Loop
- [ ] Optimizer with 5 trigger events
- [ ] Suggestion system with approve/reject/edit UI
- [ ] Plan versioning and diff view
- [ ] Today View (next task recommendation with reasoning)
- [ ] Decision log (audit trail of all approvals and rejections)

### v0.3 — Inference Routing
- [ ] Ollama integration for local inference
- [ ] Model router with per-step provider selection
- [ ] Fallback chain (local fails → cloud)
- [ ] Cost tracking per plan generation

### v0.4 — Templates and Community
- [ ] Template interface and plugin system
- [ ] Software Project template
- [ ] Game Dev template
- [ ] Template contribution guide
- [ ] Community template gallery

### v1.0 — Production Ready
- [ ] Auth (Supabase Auth)
- [ ] Multi-workspace support
- [ ] Calendar-aware scheduling
- [ ] Dependency graph visualization
- [ ] Export (GitHub Issues, Linear, Markdown)
- [ ] Mobile-responsive UI

### Future
- [ ] OpenClaw integration (chat-based control, reminders, cross-channel interaction)
- [ ] Asset generation integration (Meshy, image gen for game dev / content templates)
- [ ] Multi-agent planning (parallel sub-plan generation)
- [ ] Local model packs (curated Ollama model sets per use case)
- [ ] Plugin marketplace for community integrations

---

## Contributing

OpenForge is open source and contributions are welcome. See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

Key areas where contributions are valuable:
- **Domain templates** — if you have expertise in a workflow (game dev, content creation, academic research, job hunting), your heuristics are what make plans go from generic to genuinely useful
- **Optimizer strategies** — new trigger types and optimization logic
- **Inference providers** — additional model integrations
- **UI/UX improvements** — making the approval loop feel seamless

### Template Contributions

Templates are the most impactful thing you can contribute. A good template encodes real domain knowledge — the kind of structure and heuristics that make an AI plan feel like it was made by someone who actually knows the field. See [TEMPLATES.md](docs/TEMPLATES.md) for the template interface and examples.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (Postgres) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Cloud Inference | Anthropic (Claude), OpenAI |
| Local Inference | Ollama |
| Deployment | Vercel (recommended) |

---

## Why "OpenForge"?

Open source. Open planning. Forged iteratively through decomposition, constraint analysis, and continuous refinement. The name reflects both what the tool does — takes raw intent and hammers it into something structured, actionable, and adaptive — and how it's built: in the open, by anyone who wants better planning tools.

---

## License

MIT — see [LICENSE](LICENSE) for details.
