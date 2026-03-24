# OpenForge Planning Pipeline

This document describes how OpenForge turns a vague goal into an adaptive, structured execution plan. It covers the pipeline architecture, inference strategy, template system, and the iterative refinement process.

---

## Pipeline Overview

The planning pipeline is a multi-step process where each step has a focused job. The output of each step feeds into the next.

```
User Goal (freeform text)
        │
        ▼
┌──────────────┐
│  1. Classify  │  Extract domain, constraints, skill level, ambiguities
│  (local LLM)  │  Fast, cheap — small model is fine
└──────┬───────┘
       │ ClassificationResult
       ▼
┌──────────────┐
│  2. Structure │  Generate milestone hierarchy
│  (local LLM)  │  Hardest reasoning step — best local model
└──────┬───────┘
       │ PlanStructure
       ▼
┌──────────────┐
│  3. Expand    │  Break milestones into tasks (one at a time)
│  (local LLM)  │  Mid-tier model, called once per milestone
└──────┬───────┘
       │ ExpandedPlan
       ▼
┌──────────────┐
│  4. Validate  │  Check against template constraints
│  (no LLM)     │  Pure logic — deterministic
└──────┬───────┘
       │ ValidationResult
       ▼
  ┌────┴────┐
  │  Valid?  │
  └────┬────┘
   yes │    no → retry steps 2-3 with violation feedback (max 1 retry)
       ▼
┌──────────────┐
│  5. Review    │  OPTIONAL: premium model critiques the finished plan
│  (cloud LLM)  │  Produces suggestions, not replacements
└──────┬───────┘
       │ Suggestions[]
       ▼
  Persist to database → User reviews suggestions → Plan finalized
```

---

## Inference Strategy: Local-First, Cloud-Optional

OpenForge is designed to run **90%+ on local models** via Ollama. Cloud inference (Anthropic Claude, Google Gemini, OpenAI, etc.) is an optional enhancement, not a requirement.

### Why Local-First?

- **Free to run.** No API costs for plan generation.
- **Private.** Goal descriptions and plans never leave the user's machine unless they opt in.
- **Fast iteration.** No rate limits, no latency spikes, no API outages.
- **Good enough.** Modern local models (Llama 3, Mistral, DeepSeek, Phi) produce solid structured output for classification and task generation.

### When Cloud Adds Value

Cloud models aren't used to generate plans — they review them. This is a fundamentally easier task (critique is simpler than creation), so a single API call adds disproportionate value:

- **Logical gap detection:** "You have a task about error handling but no prerequisite covering basic syntax."
- **Quality of completion criteria:** "The criterion 'understand recursion' is vague — suggest 'implement 3 recursive algorithms without reference.'"
- **Domain expertise:** A frontier model may know that a specific learning path is suboptimal for the domain.
- **Timeline sanity check:** "This 4-week plan for learning distributed systems is unrealistic for a beginner."

### Model Routing

The inference router selects a model for each pipeline step based on user configuration:

```
Step        │ Default (local)     │ Premium (cloud)
────────────┼─────────────────────┼──────────────────
Classify    │ Small/fast model    │ Not needed
Structure   │ Best local model    │ Not needed
Expand      │ Mid-tier model      │ Not needed
Validate    │ No model (logic)    │ No model (logic)
Review      │ Not applicable      │ Claude / Gemini / GPT
```

Configuration via environment variables:

```env
# Local inference (required)
OLLAMA_BASE_URL=http://localhost:11434

# Model selection per step (optional — auto-detected if omitted)
# If omitted, the router queries Ollama for installed models and picks
# the best available per step based on a capability ranking.
CLASSIFY_MODEL=llama3.2:3b
STRUCTURE_MODEL=llama3.1:70b
EXPAND_MODEL=llama3.1:8b

# Premium review (optional — omit to disable)
REVIEW_PROVIDER=anthropic           # or "google", "openai"
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
OPENAI_API_KEY=sk-...
REVIEW_TRIGGER=on_request           # "always", "on_request", "on_warnings", "on_schedule"
REVIEW_SCHEDULE_INTERVAL=5          # for on_schedule: review after every N task completions
```

### Model Auto-Detection

When model-per-step env vars are not set, the router queries Ollama's `/api/tags` endpoint to discover installed models. It ranks them by capability tier and assigns the best fit per step:

```
Discovered models: llama3.1:70b, llama3.1:8b, phi-3:mini
  → classify:  phi-3:mini     (smallest capable model)
  → structure: llama3.1:70b   (largest for hard reasoning)
  → expand:    llama3.1:8b    (mid-tier)
```

The user can override any assignment via env vars or (in future) a settings UI. The auto-detection result is logged on startup so users know what was selected.

### Model Packs (Future)

Pre-configured model sets optimized for different hardware:

| Pack | Target Hardware | Models |
|---|---|---|
| Lite | 8GB VRAM | phi-3:mini for all steps |
| Standard | 16GB VRAM | llama3.1:8b (classify/expand), llama3.1:8b (structure) |
| Quality | 24GB+ VRAM | llama3.1:70b for structure, llama3.1:8b for others |
| Cloud | No GPU | All steps via cloud API |

---

## Pipeline Steps in Detail

### Step 1: Classify

**Purpose:** Understand what the user is asking for.

**Input:** Raw goal title + description
**Output:** `ClassificationResult`

```typescript
{
  domain: "programming",
  domain_template: "learning-plan",
  constraints: {
    timeline: "6 weeks",
    time_commitment: "10 hours per week",
    skill_level: "intermediate",
    prior_knowledge: ["Python", "TypeScript"],
    learning_style: "project-based",
    target_proficiency: "build a CLI tool",
    tools: ["VS Code"],
    budget: null
  },
  ambiguities: [
    "No specific Rust topics prioritized",
    "No mention of async/concurrency needs"
  ],
  summary: "Learn Rust programming to build CLI tools, with prior experience in Python and TypeScript"
}
```

The template provides **classification hints** that tell the model what constraints matter for this domain. A learning plan template cares about skill level and time commitment; a software project template would care about team size and tech stack.

**Model choice:** Smallest/fastest available. Classification is extraction, not reasoning.

### Step 2: Structure

**Purpose:** Design the milestone hierarchy.

**Input:** ClassificationResult + template structural rules
**Output:** `PlanStructure`

The template provides **structural rules** as hard constraints:
- Milestone count range (e.g., 3-8 for learning plans)
- Max milestone duration (e.g., 14 days)
- Required milestone types (e.g., must start with "foundation", end with "capstone")
- Ordering rules (e.g., concept before practice)

The model generates milestones that satisfy all rules. If the output violates constraints, the validate step catches it and triggers a retry.

**Model choice:** Best available. This is the hardest reasoning step — the model must balance constraints, sequencing, and domain knowledge.

### Step 3: Expand

**Purpose:** Generate concrete tasks for each milestone.

**Input:** PlanStructure + ClassificationResult + template task heuristics
**Output:** `ExpandedPlan`

Key design decision: **expand one milestone at a time**, not all at once. This produces higher quality output because:
- The model focuses on one scope at a time
- Each milestone's context fits easily in a small context window
- Failures are isolated — if one expansion fails, only that milestone retries

The template provides **task heuristics**:
- Every concept task must have a companion practice task
- Include checkpoint tasks at milestone boundaries
- Effort estimates adjust based on skill level (beginner = 1.5x)
- Completion criteria must be specific and measurable

**Model choice:** Mid-tier. Task generation is more formulaic than structure design.

### Step 4: Validate

**Purpose:** Verify the plan meets all constraints.

**Input:** ExpandedPlan + template validation constraints
**Output:** `ValidationResult`

This step is **pure logic — no LLM call**. It checks:

| Rule | Severity | Example |
|---|---|---|
| Milestone duration <= max | Error | "Week 3-4 milestone is 21 days" |
| Every task has rationale | Error | "Task 'Read chapter 5' has no rationale" |
| Every task has completion criteria | Error | "Task has vague criteria: 'understand X'" |
| First milestone is foundation | Error | "Plan starts with advanced content" |
| Last milestone is capstone/project | Error | "Plan ends without a hands-on deliverable" |
| Concept tasks have practice companions | Warning | "3 concept tasks with no practice tasks" |
| No circular dependencies | Error | "Task A → B → C → A" |
| Task count per milestone is reasonable | Warning | "Milestone has 12 tasks" |

If **errors** exist, the pipeline retries steps 2-3 once with the violation list injected into the prompt. If the retry also fails validation, the plan is still returned but flagged as having issues.

### Step 5: Review (Optional)

**Purpose:** A premium cloud model critiques the locally-generated plan.

**Input:** The complete ExpandedPlan + ClassificationResult
**Output:** `Suggestion[]` — fed into the existing suggestion system

The reviewer doesn't regenerate the plan. It receives the finished output and produces structured critique:

```typescript
{
  trigger_event: "plan_review",
  target_entity_type: "milestone",   // or "task", "plan"
  target_entity_id: "...",
  proposed_change: {
    action: "reorder",
    details: "Move error handling before the file I/O milestone"
  },
  justification: "Error handling is a prerequisite for writing robust file operations. Learning it after means the student writes fragile code first and has to relearn.",
  confidence: 0.85,
  requires_approval: true
}
```

**Review triggers:**
- `on_request` — user clicks "Review with Claude" **(default)**
- `always` — every plan generation includes a review step
- `on_warnings` — auto-triggered when validation produces warnings
- `on_schedule` — periodic review after N task completions or N days of activity (configurable interval)

The user chooses which cloud provider to use for review (Anthropic Claude, Google Gemini, OpenAI, etc.) based on preference or task type. The review output flows through the same approval UI as optimizer suggestions. The user sees what the reviewer wants to change, why, and can approve/reject/edit.

---

## Template System

Templates are the domain expertise layer. They encode heuristics that make plans actually useful for a specific type of goal.

**Key principle:** Templates are JSON-first. Every template — shipped or custom — is defined by a `TemplateConfig` JSON schema. Shipped templates are authored in TypeScript for developer ergonomics but **decompile** to the same JSON format. There is one system, not two.

### Template Config Schema

Every template is a JSON document with this structure:

```json
{
  "name": "Learning Plan",
  "slug": "learning-plan",
  "version": "1.0.0",
  "description": "Optimized for 'learn X' goals.",
  "extends": null,

  "classification_hints": {
    "relevant_constraints": ["timeline", "skill_level", "time_commitment", ...],
    "example_questions": ["How much time per week can you dedicate?", ...],
    "default_values": {
      "skill_level": "beginner",
      "time_commitment": "5 hours per week"
    }
  },

  "structural_rules": {
    "max_milestone_duration_days": 14,
    "min_milestones": 3,
    "max_milestones": 8,
    "required_milestone_types": ["foundation", "capstone"],
    "milestone_ordering_rules": [
      "First milestone must be type 'foundation'.",
      "Last milestone must be type 'capstone' or 'project'."
    ]
  },

  "task_heuristics": {
    "rules": [
      "Every concept task must have a companion practice task.",
      "Include a checkpoint task at the end of each milestone."
    ],
    "effort_multipliers": {
      "beginner": 1.5,
      "intermediate": 1.0,
      "advanced": 0.7
    }
  },

  "validation_rules": [
    {
      "id": "max_milestone_duration",
      "description": "No milestone exceeds the maximum duration",
      "severity": "error",
      "scope": "milestone",
      "condition": "milestone.duration_days <= structural_rules.max_milestone_duration_days"
    },
    {
      "id": "task_requires_rationale",
      "description": "Every task must have a rationale",
      "severity": "error",
      "scope": "task",
      "condition": "task.rationale != null && task.rationale.trim().length > 0"
    },
    {
      "id": "concept_needs_practice",
      "description": "Milestones with concept tasks should have practice tasks",
      "severity": "warning",
      "scope": "milestone",
      "condition": "milestone.tasks.filter(t => t.task_type == 'concept').length == 0 || milestone.tasks.filter(t => t.task_type == 'practice').length > 0"
    }
  ]
}
```

### How Templates Work

```
┌──────────────────────────────────────────────────────┐
│                  Template Lifecycle                    │
│                                                      │
│  Author (TS or JSON)                                 │
│       │                                              │
│       ▼                                              │
│  TemplateConfig (JSON)  ← canonical format           │
│       │                                              │
│       ▼                                              │
│  compile() → RuntimeTemplate                         │
│       │    (validation rules become executable fns)   │
│       ▼                                              │
│  Used by pipeline steps                              │
│       │                                              │
│       ▼                                              │
│  decompile() → TemplateConfig (JSON)                 │
│       (round-trips cleanly for export/sharing)       │
└──────────────────────────────────────────────────────┘
```

- **Shipped templates** are authored in TypeScript for type safety, but export a `toConfig()` method that produces the JSON format.
- **Custom templates** are authored directly as JSON and loaded at runtime.
- **Forked templates** use `"extends": "learning-plan"` and override specific fields. The loader merges the base config with overrides.
- The `compile()` function converts JSON validation rule conditions into executable functions.
- The `decompile()` function serializes a runtime template back to JSON for export.

### Template Inheritance

When `extends` is set, the loader:
1. Loads the base template config
2. Deep-merges the child's overrides on top
3. For array fields (rules, constraints), the child can `append`, `replace`, or `remove` entries

```json
{
  "name": "Accelerated Learning Plan",
  "slug": "accelerated-learning",
  "extends": "learning-plan",
  "overrides": {
    "structural_rules": {
      "max_milestone_duration_days": 7,
      "min_milestones": 4
    },
    "task_heuristics": {
      "effort_multipliers": {
        "beginner": 1.0,
        "intermediate": 0.7,
        "advanced": 0.5
      }
    }
  }
}
```

### Shipped Templates (v1+)

| Template | Domain | Key Heuristics |
|---|---|---|
| Learning Plan | "Learn X" goals | Concept-practice loops, skill progression, capstone project |
| Software Project | Ship features | Sprint structure, testing milestones, deployment gates |
| Game Dev | Build a game | Prototype-first, asset pipeline, playtesting loops |
| Content Creation | Launch content | Ideation, production, publishing, promotion cycles |
| Research | Academic/exploration | Literature review, hypothesis, experimentation, writing |

### Custom Template Creation

Users can create templates by:
1. **Forking a shipped template** — set `"extends"` and override what you want
2. **Building from scratch** — fill in the full `TemplateConfig` schema
3. **Exporting an existing template** — `decompile()` any active template to JSON, edit it, load it back

Templates are stored as JSON files and loaded at runtime. No code changes required to add a new template.

---

## The Iterative Process

Plan generation is not a one-shot operation. OpenForge plans evolve through three loops:

### Loop 1: Generation (Pipeline)

```
Goal → Classify → Structure → Expand → Validate → [Review] → Plan v1
```

This produces the initial plan. The user can immediately start working from it.

### Loop 2: Execution (Optimizer)

As the user works through the plan, status changes trigger optimization:

```
User marks task "done"
  → Optimizer checks: are dependent tasks unblocked?
  → Optimizer checks: is the milestone complete?
  → Optimizer checks: is pacing ahead/behind schedule?
  → Produces Suggestions → User approves/rejects → Plan v2, v3, ...
```

Triggers:
- Task completed → unlock dependents, check pacing
- Task marked "already known" → compress plan, reassess prereqs
- Task blocked → suggest resequencing or splitting
- Deadline changed → rebalance effort across milestones
- User reordered priorities → resequence respecting dependencies

### Loop 3: Review (Premium — Optional)

At any point, the user can request a cloud review:

```
Current plan state
  → Sent to premium model with full context
  → Model produces structured suggestions
  → Suggestions appear in the same approval UI
  → User approves/rejects → Plan vN+1
```

This loop is especially valuable:
- After initial generation (catch issues early)
- After significant plan changes (many tasks completed/skipped)
- When the user feels stuck or unsure about the plan
- Periodically as a "health check"

### Plan Versioning

Every change creates an immutable snapshot:

```
Plan v1  ← initial generation
Plan v2  ← user approved optimizer suggestion
Plan v3  ← user manually edited a task
Plan v4  ← cloud review suggestion approved
```

Each version records:
- What triggered the change
- What was different from the previous version
- Who/what made the decision (user, optimizer, reviewer)

Users can diff any two versions and roll back if needed.

---

## Integration Points

The pipeline is designed to be controllable from external systems:

### API Endpoints

```
POST /api/planner          Generate a plan for a goal
POST /api/planner/review   Trigger premium review of existing plan
POST /api/optimizer        Trigger optimization for a specific event
GET  /api/goals            List goals
GET  /api/goals/:id/plan   Get current plan for a goal
```

### External Control (Future)

These endpoints enable integration with:
- **OpenClaw** — chat-based control ("generate a plan for learning Go", "what should I work on today?")
- **Claude Code / CLI tools** — programmatic plan management
- **Webhooks** — notify external systems when plans change
- **Calendar apps** — sync milestone target dates

---

## Design Principles

1. **Local-first.** The product must work fully offline with Ollama. Cloud is an enhancement.
2. **Human-in-the-loop.** Every AI-generated change requires approval. No autonomous replanning.
3. **Structured output.** Plans follow a validated schema. The pipeline rejects malformed output.
4. **Template-driven.** Domain expertise lives in templates, not prompts. Templates are the moat.
5. **Iterative, not one-shot.** Plans improve over time through execution, optimization, and review.
6. **Transparent.** Every suggestion includes what, why, and confidence. Every version is diffable.
