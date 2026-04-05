export type WorkflowStep = {
  agent: string;
  action: string;
  status: "planned" | "completed" | "failed";
  detail: string;
  tool_name?: string | null;
};

export type SupportCase = {
  id: string;
  customer_id?: string | null;
  title: string;
  source_text: string;
  issue_category?: string | null;
  assigned_team?: string | null;
  severity?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type Task = {
  id: string;
  case_id?: string | null;
  customer_id?: string | null;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  due_at?: string | null;
  issue_category?: string | null;
  assigned_team?: string | null;
  assigned_member?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Customer = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Event = {
  id: string;
  case_id?: string | null;
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type Note = {
  id: string;
  case_id?: string | null;
  title: string;
  body: string;
  metadata_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type WorkflowResponse = {
  workflow_run_id: string;
  status: "completed" | "failed";
  engine_mode: "gemini_adk" | "heuristic_fallback";
  summary: string;
  case_summary?: string | null;
  steps: WorkflowStep[];
  triage: Record<string, string>;
  case?: SupportCase | null;
  customer?: Customer | null;
  tasks: Task[];
  events: Event[];
  notes: Note[];
  errors: string[];
};

export type StateResponse = {
  customers: Customer[];
  cases: SupportCase[];
  tasks: Task[];
  events: Event[];
  notes: Note[];
  workflow_runs: Array<{
    id: string;
    case_id?: string | null;
    request_text: string;
    status: string;
    summary?: string | null;
    engine_mode?: string | null;
    created_at: string;
  }>;
};

export type DeleteResponse = {
  ok: boolean;
  deleted_id: string;
  resource: "task" | "event" | "note" | "workflow_run" | "support_case" | "customer";
};
