export type SuggestionStatus = "pending" | "accepted" | "rejected" | "expired";

export type DecisionAction = "approved" | "rejected" | "manual_edit";

export interface Suggestion {
  id: string;
  goal_id: string;
  plan_version_id: string | null;
  trigger_event: string;
  target_entity_type: string;
  target_entity_id: string | null;
  proposed_change: Record<string, unknown>;
  justification: string;
  confidence: number;
  requires_approval: boolean;
  status: SuggestionStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface SuggestionInsert {
  goal_id: string;
  plan_version_id?: string | null;
  trigger_event: string;
  target_entity_type: string;
  target_entity_id?: string | null;
  proposed_change: Record<string, unknown>;
  justification: string;
  confidence: number;
  requires_approval?: boolean;
  status?: SuggestionStatus;
}

export interface SuggestionUpdate {
  status?: SuggestionStatus;
  resolved_at?: string | null;
}

export interface DecisionLog {
  id: string;
  goal_id: string;
  suggestion_id: string | null;
  action: DecisionAction;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  user_reason: string | null;
  created_at: string;
}

export interface DecisionLogInsert {
  goal_id: string;
  suggestion_id?: string | null;
  action: DecisionAction;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  user_reason?: string | null;
}
