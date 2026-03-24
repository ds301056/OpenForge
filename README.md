# OpenForge

**An open-source AI planning engine that turns vague goals into adaptive, explainable execution plans.**

Most todo apps are glorified storage. OpenForge is different — you describe what you want to accomplish, and the system generates a structured plan with milestones, tasks, dependencies, and reasoning. As you work, it watches progress and proposes optimizations. Every suggestion comes with a justification you can approve, reject, or edit.

This is not "AI slapped onto a todo list." This is a decomposition and replanning engine with a human-in-the-loop approval model, designed to use local LLMs and optionally call premium models for difficult tasks.

The OpenForge engine exposes API endpoints ensuring compatibility with other open-source frameworks such as [OpenClaw](https://github.com/openclaw/openclaw), and syncs directly with **GitHub Issues & Projects**, **Linear**, and **Jira** — so your AI-generated plans live where your team already works.

---

## Why OpenForge?

| Pain Point | OpenForge Solution |
|---|---|
| "I have a huge goal but don't know where to start" | Automatic decomposition into milestones, tasks, and dependencies |
| "My tasks lack context — I forget why they exist" | Every task carries rationale, completion criteria, and its own AI chat |
| "I pay $20/mo for AI features in every tool" | Local-first — runs on Ollama, your hardware, your data, free |
| "AI plans are generic and useless" | Domain-specific templates encode real expertise (learning, software, game dev) |
| "My plans don't connect to my actual workflow" | Syncs to GitHub, Linear, Jira — plans become real issues and projects |
| "AI makes changes I didn't ask for" | Human-in-the-loop — every suggestion requires your approval |

### Built to Integrate

OpenForge isn't a walled garden. It's an engine with an API.

- **GitHub** — Export plans as Issues with milestones, labels, and dependency references. Import existing backlogs for AI-powered restructuring. Bidirectional sync keeps both sides current.
- **Linear & Jira** — Same sync model. Your plans become real project tickets.
- **OpenClaw** — Chat-based control via a separate open-source project. "Create a plan for learning Go." "What should I work on today?"
- **Your tools** — RESTful API for every feature. Build CLI tools, Discord bots, or custom dashboards on top.

---

## What Makes This Different

**Automatic decomposition.** You say "learn Rust in 6 weeks." OpenForge produces milestones with tasks, each task with a rationale, completion criteria, effort estimate, and dependency chain. Not a flat list — a structured plan that understands sequencing.

**Per-task AI chat.** Every task is its own conversation. Click into "Learn ownership and borrowing" and talk to the AI about it — the task's context (what it is, why it exists, what depends on it, what the goal is) is pre-loaded. Like having a dedicated terminal per task.

**Local-first inference.** The planning pipeline runs entirely on local models via Ollama. A 5th optional step sends the finished plan to a cloud model (Claude, Gemini) for review. You can run OpenForge fully offline, fully free.

**Adaptive replanning.** Mark a task as "already known" and the optimizer compresses the plan, reassesses prerequisites, and suggests timeline acceleration. Every change is versioned, justified, and reversible.

**Domain templates.** A "learn Rust" plan should look nothing like a "launch a YouTube channel" plan. Templates encode domain-specific heuristics — concept/practice loops for learning, sprint structure for software, asset pipelines for game dev. JSON-first, forkable, community-contributed.

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
│   └── Task: Build a file reader utility
├── Milestone 3: CLI Architecture (Week 4-5)
│   └── ...
└── Milestone 4: Ship It (Week 6)
    └── ...

Every task includes:
  - why it exists (rationale)
  - what it depends on (dependency chain)
  - estimated effort
  - how to know it's done (completion criteria)
  - its own AI chat context
```

The planner pipeline runs in 5 steps:

1. **Classify** — Extract constraints, skill level, domain, ambiguities. Runs on a small local model.
2. **Structure** — Generate the milestone hierarchy. Hardest reasoning step — uses the best available local model.
3. **Expand** — Break each milestone into tasks, one at a time. Mid-tier local model.
4. **Validate** — Check against template constraints (no LLM — pure logic). Retry on failure.
5. **Review** (optional) — Send the finished plan to a cloud model for critique. Produces suggestions, not replacements.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  Next.js App Router + React + shadcn/ui                  │
│  Today Dashboard │ Goals │ Plan View │ Calendar │ Settings│
├─────────────────────────────────────────────────────────┤
│                   Planner Pipeline                       │
│  Classify → Structure → Expand → Validate → [Review]     │
│  Local LLM (Ollama) for steps 1-4                        │
│  Cloud (Claude/Gemini) for optional step 5               │
├─────────────────────────────────────────────────────────┤
│                 Template System (JSON-first)              │
│  TemplateConfig schema → compile() → runtime              │
│  Shipped templates decompile to JSON for export/forking   │
│  Custom templates loaded at runtime from JSON             │
├─────────────────────────────────────────────────────────┤
│                Optimizer (Event-Driven)                   │
│  Triggers: completed │ blocked │ already_known │          │
│            deadline changed │ priority reordered          │
│  Per-task AI chat with persistent context                 │
├─────────────────────────────────────────────────────────┤
│                   State Layer                             │
│  Supabase (Postgres) + REST API                          │
│  Goal → PlanVersion → Milestone → Task → Dependency       │
│  Suggestion → DecisionLog → TaskConversation              │
├─────────────────────────────────────────────────────────┤
│                  Integrations                             │
│  GitHub (Issues, Projects, Milestones)                    │
│  Linear │ Jira │ Any tool via API                         │
│  OpenClaw (external chat-based control)                   │
└─────────────────────────────────────────────────────────┘
```

### Inference Strategy: Local-First

| Pipeline Step | Default | Model Tier |
|---|---|---|
| Classify | Ollama (auto-detected) | Small/fast |
| Structure | Ollama (auto-detected) | Best available |
| Expand | Ollama (auto-detected) | Mid-tier |
| Validate | No model (pure logic) | — |
| Review | Cloud (optional) | Claude / Gemini |

The inference router queries Ollama's `/api/tags` to discover installed models, ranks them by capability tier (small → medium → large → xlarge), and assigns the best fit per step. You can override any assignment via environment variables.

Cloud providers (Anthropic Claude, Google Gemini) are used **only for the optional review step** — critiquing a locally-generated plan, not generating one. Review triggers: `on_request` (default), `always`, `on_warnings`, `on_schedule`.

### Domain Templates

Templates are JSON-first. Every template — shipped or custom — is defined by a `TemplateConfig` JSON schema that compiles to a runtime template and decompiles back for export.

Each template provides:
- **Classification hints** — what constraints matter for this domain
- **Structural rules** — milestone limits, required types, ordering rules
- **Task heuristics** — concept/practice pairing, checkpoint tasks, effort multipliers
- **Validation constraints** — rules the output must satisfy

**Shipped:** Learning Plan (v1)
**Planned:** Software Project, Game Dev, Content Creation, Research

Custom templates: fork a shipped template with `"extends": "learning-plan"` and override fields, or build from scratch as a JSON config. No code changes needed.

---

## Per-Task AI Chat

Every task in OpenForge can have its own AI conversation. When you open a task's chat:

- The task's full context is pre-loaded: title, description, rationale, completion criteria, dependencies, parent milestone, parent goal constraints
- The conversation persists across page loads — come back to it anytime
- You can ask questions, brainstorm approaches, or request task mutations ("mark this done", "change priority to high")
- Each task's chat is independent — switching tasks switches context

This is like having a dedicated terminal per task. The AI knows exactly what you're working on and why.

---

## Integrations

OpenForge is designed to work with the tools you already use, not replace them.

### GitHub
- Export plans as GitHub Issues with milestones, labels, and dependency references
- Sync goals to GitHub Projects v2
- Import existing GitHub Issues into OpenForge for structuring
- Bidirectional sync: closing a GitHub issue marks the task done in OpenForge

### Linear & Jira (Planned)
- Same sync model as GitHub — export plans, import backlogs, bidirectional status sync

### OpenClaw
[OpenClaw](https://github.com/openclaw/openclaw) is a separate project that uses OpenForge's API for chat-based plan control — "create a plan for learning Go," "what should I work on today," "mark my current task as done."

### API
Every feature is accessible via REST endpoints:

```
POST /api/planner          Generate a plan for a goal
POST /api/goals            Create a goal
GET  /api/goals/[id]/plan  Fetch the full plan tree
PATCH /api/tasks/[id]      Update task status/details
GET  /api/today            Get recommended next tasks
GET  /api/templates        List available templates
```

Build your own integrations, CLI tools, or automations on top.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for local Supabase)
- Ollama (for local inference) — optional but recommended

### Setup

```bash
# Clone the repo
git clone https://github.com/ds301056/OpenForge.git
cd OpenForge

# Install dependencies
pnpm install

# Start local Supabase (runs Postgres + auth + storage in Docker)
supabase start
# This automatically runs migrations and seeds example data

# Copy environment config
cp .env.example .env.local
# The local Supabase credentials are printed by `supabase start`

# Start the dev server
pnpm dev
```

### Environment Variables

```env
# Database (local Supabase — filled in by `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Local inference
OLLAMA_BASE_URL=http://localhost:11434

# Cloud review (optional — omit to disable)
REVIEW_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
REVIEW_TRIGGER=on_request
```

### Running Tests

```bash
pnpm test          # 60 tests (data layer, validation, templates, model detector)
pnpm typecheck     # TypeScript type checking
pnpm lint          # ESLint
pnpm build         # Production build
```

---

## Roadmap

### Done
- [x] Database schema, migrations, typed query layer (8 tables, full CRUD)
- [x] Planner pipeline (classify → structure → expand → validate)
- [x] Learning Plan template (JSON-first with compile/decompile)
- [x] Local-first inference with Ollama auto-detection
- [x] Cloud review step (Anthropic, Google Gemini)
- [x] Today Dashboard (next task recommendation with rationale)
- [x] Goal Inbox (create, list, filter, progress tracking)
- [x] Plan View (milestones, tasks, status controls, dependencies)
- [x] Calendar View (weekly + monthly)
- [x] Settings (inference status, templates)
- [x] REST API (9 endpoints)
- [x] CI pipeline (lint + typecheck + build)
- [x] 60 tests passing

### In Progress
- [ ] Optimizer with 5 trigger events (task completed, blocked, already known, deadline changed, priority reordered)
- [ ] Suggestion system with approve/reject/edit UI
- [ ] Plan versioning and diff view

### Planned
- [ ] Per-task AI chat with persistent context
- [ ] GitHub integration (export/import/bidirectional sync)
- [ ] Linear and Jira integration
- [ ] Software Project, Game Dev, Content Creation templates
- [ ] Auth (Supabase Auth) and multi-workspace support
- [ ] Template community gallery
- [ ] OpenClaw API integration
- [ ] Dependency graph visualization
- [ ] Mobile-responsive UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (Postgres) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui v4 |
| Local Inference | Ollama (auto-detected) |
| Cloud Review | Anthropic (Claude), Google (Gemini) |
| Testing | Vitest |
| Deployment | Vercel (recommended) |

---

## Contributing

OpenForge is open source and contributions are welcome.

**High-impact contribution areas:**

- **Domain templates** — Encode real workflow knowledge as JSON configs. A "learn Rust" plan should look fundamentally different from a "launch a YouTube channel" plan. Your domain expertise is what makes plans useful.
- **Integrations** — GitHub, Linear, Jira connectors. The sync architecture is designed to be extensible.
- **Optimizer strategies** — New trigger types and optimization logic for the replanning engine.
- **Inference providers** — Additional model integrations beyond Ollama/Anthropic/Google.

See [docs/PLANNING_PIPELINE.md](docs/PLANNING_PIPELINE.md) for detailed architecture documentation.

---

## Why "OpenForge"?

Open source. Open planning. Forged iteratively through decomposition, constraint analysis, and continuous refinement. The name reflects both what the tool does — takes raw intent and hammers it into something structured, actionable, and adaptive — and how it's built: in the open, by anyone who wants better planning tools.

---

## License

MIT — see [LICENSE](LICENSE) for details.
