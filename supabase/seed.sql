-- Seed data: one example workspace, goal, plan version, milestones, and tasks
-- Run this against your dev database after migrations

-- Workspace
insert into workspaces (id, name)
values ('a0000000-0000-0000-0000-000000000001', 'Default Workspace');

-- Goal: Learn Rust
insert into goals (id, workspace_id, title, description, domain_template, constraints, status)
values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Learn Rust well enough to build a CLI tool',
  'I want to learn Rust programming and be able to build a command-line tool within 6 weeks. I have experience with Python and TypeScript.',
  'learning-plan',
  '{"timeline": "6 weeks", "skill_level": "intermediate_programmer", "time_commitment": "10 hours per week", "prior_knowledge": ["Python", "TypeScript"]}',
  'active'
);

-- Plan Version
insert into plan_versions (id, goal_id, version_number, trigger, summary)
values (
  'c0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  1,
  'initial',
  'Initial plan generated for learning Rust in 6 weeks'
);

-- Milestone 1: Foundations
insert into milestones (id, plan_version_id, title, description, sort_order, target_date, status)
values (
  'd0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'Foundations',
  'Set up the Rust development environment and learn ownership, borrowing, and basic syntax.',
  1,
  current_date + interval '14 days',
  'in_progress'
);

-- Milestone 2: Core Language
insert into milestones (id, plan_version_id, title, description, sort_order, target_date, status)
values (
  'd0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'Core Language Deep Dive',
  'Learn error handling, structs, enums, pattern matching, and traits.',
  2,
  current_date + interval '28 days',
  'pending'
);

-- Milestone 3: Build the CLI
insert into milestones (id, plan_version_id, title, description, sort_order, target_date, status)
values (
  'd0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  'Build the CLI Tool',
  'Apply learned concepts to build a real command-line application.',
  3,
  current_date + interval '42 days',
  'pending'
);

-- Tasks for Milestone 1
insert into tasks (id, milestone_id, title, description, status, priority, effort_estimate, completion_criteria, rationale, sort_order)
values
  (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Install Rust toolchain',
    'Install rustup, cargo, and configure your IDE with rust-analyzer.',
    'done',
    'high',
    '30min',
    'Running `cargo --version` returns a valid version.',
    'Every Rust project needs the toolchain. This removes setup friction before learning begins.',
    1
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'Read ownership and borrowing chapter',
    'Work through The Rust Book chapters on ownership, references, and borrowing.',
    'in_progress',
    'high',
    '2hrs',
    'Can explain ownership rules and write code that compiles without borrow checker errors.',
    'Ownership is the core concept that differentiates Rust. Everything else builds on it.',
    2
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000001',
    'Complete Rustlings ownership exercises',
    'Work through the ownership section of the Rustlings exercise set.',
    'todo',
    'high',
    '1.5hrs',
    'All ownership exercises pass.',
    'Practice reinforces the ownership concepts. Rustlings provides structured, incremental exercises.',
    3
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000001',
    'Build hello world CLI with clap',
    'Create a simple CLI application using the clap argument parser.',
    'todo',
    'medium',
    '1hr',
    'A CLI app that accepts a --name flag and prints a greeting.',
    'Early project experience builds confidence and shows how Rust tooling works in practice.',
    4
  );

-- Tasks for Milestone 2
insert into tasks (id, milestone_id, title, description, status, priority, effort_estimate, completion_criteria, rationale, sort_order)
values
  (
    'e0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000002',
    'Study error handling patterns',
    'Learn Result, Option, the ? operator, and custom error types.',
    'todo',
    'high',
    '2hrs',
    'Can write functions that return Result and propagate errors with ?.',
    'Rust error handling is fundamentally different from exceptions. Must internalize before building real code.',
    1
  ),
  (
    'e0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000002',
    'Learn structs, enums, and pattern matching',
    'Study how Rust models data with structs and enums, and how to destructure with match.',
    'todo',
    'high',
    '2hrs',
    'Can define complex types and use match expressions to handle all variants.',
    'Structs and enums are the foundation of Rust data modeling. Pattern matching makes them powerful.',
    2
  );

-- Tasks for Milestone 3
insert into tasks (id, milestone_id, title, description, status, priority, effort_estimate, completion_criteria, rationale, sort_order)
values
  (
    'e0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000003',
    'Design CLI architecture',
    'Plan the command structure, subcommands, and data flow for your CLI tool.',
    'todo',
    'high',
    '1hr',
    'A written design doc or diagram showing commands, inputs, and outputs.',
    'Planning before coding prevents rework. Good CLI design makes the tool intuitive.',
    1
  ),
  (
    'e0000000-0000-0000-0000-000000000008',
    'd0000000-0000-0000-0000-000000000003',
    'Implement core functionality',
    'Build the main logic of the CLI tool using all learned concepts.',
    'todo',
    'critical',
    '6hrs',
    'Core commands work end-to-end with proper error handling.',
    'This is the capstone — applying everything learned to a real, useful tool.',
    2
  );

-- Dependencies
insert into dependencies (task_id, depends_on_task_id, dependency_type)
values
  ('e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'blocks'),
  ('e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'blocks'),
  ('e0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'blocks'),
  ('e0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003', 'recommends'),
  ('e0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000005', 'blocks'),
  ('e0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000006', 'recommends'),
  ('e0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000007', 'blocks');
