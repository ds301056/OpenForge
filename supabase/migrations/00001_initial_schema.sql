-- OpenForge Initial Schema
-- Phase 1: Data Layer

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
  domain_template text default 'generic',
  constraints jsonb default '{}',
  status text default 'draft'
    check (status in ('draft', 'planning', 'active', 'completed', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Plan Versions (immutable snapshots)
create table plan_versions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade,
  version_number integer not null,
  trigger text,
  summary text,
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
  effort_estimate text,
  completion_criteria text,
  rationale text,
  locked boolean default false,
  sort_order integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Dependencies (task -> task edges)
create table dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  depends_on_task_id uuid references tasks(id) on delete cascade,
  dependency_type text default 'blocks'
    check (dependency_type in ('blocks', 'recommends')),
  unique(task_id, depends_on_task_id)
);

-- Suggestions (optimizer output)
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade,
  plan_version_id uuid references plan_versions(id),
  trigger_event text not null,
  target_entity_type text not null,
  target_entity_id uuid,
  proposed_change jsonb not null,
  justification text not null,
  confidence numeric(3,2) not null
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
  suggestion_id uuid references suggestions(id),
  action text not null
    check (action in ('approved', 'rejected', 'manual_edit')),
  previous_state jsonb,
  new_state jsonb,
  user_reason text,
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
