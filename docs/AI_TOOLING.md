# AI Tooling & Context Reference

This document catalogs all skills, commands, agents, and context engineering resources installed in this repo for use with Claude Code.

---

## Sources

| Source | Repository | What it provides |
|--------|-----------|-----------------|
| **Impeccable** | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 21 design skills + 7 reference docs |
| **HumanLayer** | [humanlayer/humanlayer](https://github.com/humanlayer/humanlayer) | 20 slash commands + 6 specialized agents |

---

## Skills (Impeccable)

All skills live in `.claude/skills/<name>/SKILL.md`. They are user-invocable via `/<name>` and focus on frontend design quality.

### Setup

| Skill | Purpose |
|-------|---------|
| `/teach-impeccable` | One-time setup: gathers design context (users, brand, aesthetics) and persists to `.impeccable.md` |
| `/frontend-design` | Core design skill with Context Gathering Protocol; invoked automatically by other skills |

### Assessment

| Skill | Purpose |
|-------|---------|
| `/audit [area]` | Technical quality checks (a11y, performance, theming, responsive, anti-patterns). Scores 0-20 across 5 dimensions. Reports only, no edits. |
| `/critique [area]` | UX design review with persona-based testing, Nielsen's heuristics scoring, cognitive load analysis |

### Enhancement (Add Visual Quality)

| Skill | Purpose |
|-------|---------|
| `/bolder` | Amplify safe/boring designs — typography, color intensity, spatial drama |
| `/colorize` | Add strategic, purposeful color to monochromatic UIs |
| `/animate` | Add purposeful motion and micro-interactions (respects `prefers-reduced-motion`) |
| `/delight` | Add personality — success states, empty states, easter eggs |
| `/overdrive` | Technically ambitious effects — View Transitions, WebGL, scroll-driven animations |
| `/typeset` | Fix fonts, hierarchy, sizing; establish modular scale |

### Refinement

| Skill | Purpose |
|-------|---------|
| `/arrange` | Fix layout, spacing, visual rhythm; break monotonous grids |
| `/distill` | Strip to essence — remove unnecessary complexity |
| `/polish` | Final pass before shipping — alignment, spacing, consistency, interaction states |
| `/normalize` | Realign UI to match design system standards |
| `/quieter` | Tone down overstimulating designs while maintaining character |
| `/optimize` | UI performance — images, JS splitting, CSS, font loading, rendering |

### Functionality & Usability

| Skill | Purpose |
|-------|---------|
| `/clarify` | Improve UX copy, error messages, labels, instructions |
| `/adapt [target]` | Adapt for different screen sizes/devices (mobile, tablet, desktop, print) |
| `/harden` | Error handling, i18n support, text overflow, extreme input testing |
| `/onboard` | Design onboarding flows, empty states, first-run experiences |
| `/extract` | Pull repeated patterns into reusable components and design tokens |

### Reference Documents

Located in `.claude/skills/frontend-design/reference/`:

| File | Covers |
|------|--------|
| `typography.md` | Modular scale, font pairing, vertical rhythm, OpenType |
| `color-and-contrast.md` | OKLCH, tinted neutrals, dark mode, WCAG contrast |
| `spatial-design.md` | 4pt grid, spacing tokens, container queries, cards vs spacing |
| `motion-design.md` | Duration rules (100/300/500), easing curves, stagger, reduced-motion |
| `interaction-design.md` | Forms, focus states, loading patterns |
| `responsive-design.md` | Mobile-first, fluid design, container queries |
| `ux-writing.md` | Button labels, error messages, empty states |

Additional critique references in `.claude/skills/critique/reference/`:
- `cognitive-load.md` — 3 types of cognitive load, 8-item checklist
- `heuristics-scoring.md` — Nielsen's 10 heuristics with scoring rubrics
- `personas.md` — Persona-based testing framework

### Anti-Patterns (Enforced Across All Skills)

All design skills actively avoid "AI slop":
- No overused fonts (Inter, Roboto, Arial as sole choice)
- No gray text on colored backgrounds
- No pure black/gray (always tint)
- No cards nested in cards
- No bounce/elastic easing
- No cyan-on-dark gradients, purple-to-blue gradients, neon accents
- No glassmorphism or gradient text as decoration

---

## Commands (HumanLayer)

All commands live in `.claude/commands/<name>.md`. Invoked via `/<name>`.

### Planning & Research

| Command | Purpose |
|---------|---------|
| `/create_plan` | Interactive plan creation with parallel research agents. Outputs structured plan files. (Opus) |
| `/create_plan_nt` | Same as above, without thoughts directory integration. (Opus) |
| `/create_plan_generic` | Generic variant of plan creation |
| `/iterate_plan` | Update existing plans based on feedback with surgical edits. (Opus) |
| `/iterate_plan_nt` | No-thoughts variant of iterate_plan. (Opus) |
| `/validate_plan` | Verify plan was correctly executed; check success criteria |
| `/research_codebase` | Document codebase as-is with parallel sub-agents. Outputs research docs. (Opus) |
| `/research_codebase_nt` | No-thoughts variant. (Opus) |
| `/research_codebase_generic` | Generic codebase research |

### Implementation

| Command | Purpose |
|---------|---------|
| `/implement_plan` | Execute approved plans with todo tracking and checkpoint verification |
| `/oneshot` | End-to-end: plan + implement a ticket in one command |
| `/oneshot_plan` | Launch planning session for a ticket |

### Git & PR

| Command | Purpose |
|---------|---------|
| `/commit` | Create atomic commits with clear messages (imperative mood, why not what) |
| `/ci_commit` | CI-friendly commit variant |
| `/describe_pr` | Generate comprehensive PR descriptions from template + diff analysis |
| `/describe_pr_nt` | Simplified PR description (no thoughts directory) |
| `/ci_describe_pr` | CI-friendly PR description generation |
| `/create_worktree` | Set up git worktree and launch implementation session |

### Workflow & Handoff

| Command | Purpose |
|---------|---------|
| `/create_handoff` | Create handoff docs for transferring work between sessions |
| `/resume_handoff` | Resume work from a handoff document |
| `/founder_mode` | Founder-oriented workflow mode |
| `/local_review` | Local code review |
| `/debug` | Debugging workflow |

### Integrations

| Command | Purpose |
|---------|---------|
| `/linear` | Manage Linear tickets (create, update, comment, search) |

### Ralph (Automated Workflow)

| Command | Purpose |
|---------|---------|
| `/ralph_plan` | Plan a Linear ticket |
| `/ralph_research` | Research a ticket and launch planning |
| `/ralph_impl` | Implement highest priority ticket with worktree (Sonnet) |

---

## Agents (HumanLayer)

Specialized sub-agents in `.claude/agents/`. Spawned by commands for parallel research. All run on Sonnet.

| Agent | Role | Key Constraint |
|-------|------|---------------|
| `codebase-locator` | Finds WHERE code lives — returns organized file lists by purpose | Locates only, never analyzes |
| `codebase-analyzer` | Analyzes HOW code works with file:line references — entry points, data flows, patterns | Documents as-is, never critiques |
| `codebase-pattern-finder` | Finds similar implementations and existing patterns to model after | Shows examples, never recommends |
| `thoughts-locator` | Discovers relevant docs in thoughts/ directory | Categorizes, never analyzes |
| `thoughts-analyzer` | Extracts high-value insights from thoughts docs — decisions, trade-offs, constraints | Filters aggressively for what matters NOW |
| `web-search-researcher` | Finds information from web sources with authority ranking | Prioritizes API docs and official sources |

### Design Principles

- **Separation of concerns**: Agents are documentarians, not critics
- **Research-first**: Commands follow read → spawn agents → synthesize → iterate with user
- **File precision**: Everything includes `file:line` references
- **No open questions**: Plans must be complete before finalization

---

## Notes

- HumanLayer commands that reference `thoughts/` directories, Linear integration, or `ralph_*` workflows are tailored to HumanLayer's own setup. They may need adaptation for OpenForge.
- The `_nt` command variants skip the `thoughts/` directory and work standalone.
- Impeccable skills expect `/teach-impeccable` to have been run first to establish design context.
