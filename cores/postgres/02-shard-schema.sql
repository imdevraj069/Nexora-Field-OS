-- Per-Shard Operational Schema (PostgreSQL Shards 1, 2, 3)
-- Disjoint across shards via org_id, supporting Logical Replication to Consolidated Backup DB.

CREATE TABLE IF NOT EXISTS organizations (
  org_id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  industry_type VARCHAR(100) NOT NULL DEFAULT 'general_field_ops',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  role_id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(16) NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id VARCHAR(16) NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  user_id VARCHAR(32) NOT NULL,
  role_id VARCHAR(64) REFERENCES roles(role_id),
  allocated_stage_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (org_id, user_id)
);

-- Many-to-many role assignments: one user can hold multiple roles within an organization
CREATE TABLE IF NOT EXISTS org_member_roles (
  org_id VARCHAR(16) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  role_id VARCHAR(64) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id, role_id),
  FOREIGN KEY (org_id, user_id) REFERENCES org_members(org_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(32) PRIMARY KEY,
  org_id VARCHAR(16) NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'LEAD',
  custom_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_source TEXT,
  lead_brief TEXT,
  manager_user_id VARCHAR(32),
  workflow_statuses JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date DATE,
  target_end_date DATE,
  created_by VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stages (
  stage_id VARCHAR(32) PRIMARY KEY,
  project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  org_id VARCHAR(16) NOT NULL,
  name VARCHAR(255) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  deadline TIMESTAMPTZ,
  stage_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id VARCHAR(32) PRIMARY KEY,
  stage_id VARCHAR(32) NOT NULL REFERENCES stages(stage_id) ON DELETE CASCADE,
  project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  org_id VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(64) NOT NULL DEFAULT 'ON_FIELD', -- TRANSIT, ON_FIELD, INSPECTION, HANDOVER
  status VARCHAR(32) NOT NULL DEFAULT 'TODO',
  assigned_user_id VARCHAR(32),
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  checklist_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  text_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  transition_id BIGSERIAL PRIMARY KEY,
  org_id VARCHAR(16) NOT NULL,
  project_id VARCHAR(32) NOT NULL,
  entity_type VARCHAR(32) NOT NULL, -- PROJECT, STAGE, TASK
  entity_id VARCHAR(32) NOT NULL,
  from_status VARCHAR(32),
  to_status VARCHAR(32) NOT NULL,
  actor_user_id VARCHAR(32) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_assets (
  file_id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(16) NOT NULL,
  project_id VARCHAR(32) NOT NULL,
  stage_id VARCHAR(32),
  task_id VARCHAR(32),
  bucket VARCHAR(64) NOT NULL,
  object_key TEXT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_by VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_efficiency_scores (
  score_id BIGSERIAL PRIMARY KEY,
  org_id VARCHAR(16) NOT NULL,
  project_id VARCHAR(32) NOT NULL,
  stage_id VARCHAR(32) NOT NULL,
  task_id VARCHAR(32) NOT NULL UNIQUE,
  user_id VARCHAR(32),
  timeliness_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  evidence_completeness NUMERIC(5,2) NOT NULL DEFAULT 0,
  overall_efficiency NUMERIC(5,2) NOT NULL DEFAULT 0,
  ai_risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_stages_project ON stages(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_stage_assignee ON tasks(stage_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_media_project ON media_assets(project_id, stage_id, task_id);

-- Finance & Budget Allocation tables (TeamConnect-inspired)
CREATE TABLE IF NOT EXISTS project_budgets (
  budget_id VARCHAR(32) PRIMARY KEY,
  org_id VARCHAR(32) NOT NULL,
  project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  total_budget_paise BIGINT NOT NULL DEFAULT 0,
  distributed_budget_paise BIGINT NOT NULL DEFAULT 0,
  floated_budget_paise BIGINT NOT NULL DEFAULT 0,
  spent_paise BIGINT NOT NULL DEFAULT 0,
  revisions_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, project_id)
);

CREATE TABLE IF NOT EXISTS budget_revisions (
  revision_id VARCHAR(32) PRIMARY KEY,
  budget_id VARCHAR(32) NOT NULL REFERENCES project_budgets(budget_id) ON DELETE CASCADE,
  previous_budget_paise BIGINT NOT NULL,
  new_budget_paise BIGINT NOT NULL,
  reason TEXT,
  changed_by VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  expense_id VARCHAR(32) PRIMARY KEY,
  org_id VARCHAR(32) NOT NULL,
  project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'MATERIAL',
  amount_paise BIGINT NOT NULL,
  funding_source VARCHAR(32) NOT NULL DEFAULT 'PROJECT_BUDGET',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
  vendor_name VARCHAR(255),
  invoice_number VARCHAR(128),
  receipt_file_id VARCHAR(32),
  recorded_by VARCHAR(32),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reimbursement_claims (
  claim_id VARCHAR(32) PRIMARY KEY,
  org_id VARCHAR(32) NOT NULL,
  project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount_paise BIGINT NOT NULL,
  receipt_file_id VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  reviewed_by VARCHAR(32),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_org_project ON project_budgets(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_project ON expenses(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_claims_org_project ON reimbursement_claims(org_id, project_id);
