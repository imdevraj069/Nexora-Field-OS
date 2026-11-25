-- Global Control Plane Schema (PostgreSQL)
-- Stores global identities, immutable org-to-shard routing, and cross-org project collaborations.

CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(32) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token_hash TEXT,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_directory (
  org_id VARCHAR(16) PRIMARY KEY, -- Format: {ORG}-{YY}-{UNIQUEID}
  org_name VARCHAR(255) NOT NULL,
  org_initials CHAR(3) NOT NULL,
  shard_id SMALLINT NOT NULL CHECK (shard_id IN (1, 2, 3)),
  created_by_user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_org_memberships (
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  org_id VARCHAR(16) NOT NULL REFERENCES org_directory(org_id) ON DELETE CASCADE,
  role_id VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, org_id)
);

-- Cross-Organization Project Collaboration Registry
-- Resolves invited partner users directly to the project's owner_org_id shard.
CREATE TABLE IF NOT EXISTS project_collaborators (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(32) NOT NULL,
  owner_org_id VARCHAR(16) NOT NULL REFERENCES org_directory(org_id) ON DELETE CASCADE,
  owner_shard_id SMALLINT NOT NULL CHECK (owner_shard_id IN (1, 2, 3)),
  partner_org_id VARCHAR(16) NOT NULL REFERENCES org_directory(org_id) ON DELETE CASCADE,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  project_role_name VARCHAR(100) NOT NULL,
  permission_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  allocated_stage_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_user ON project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_project ON project_collaborators(project_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_invitations (
  invite_id VARCHAR(32) PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  org_id VARCHAR(16) NOT NULL REFERENCES org_directory(org_id) ON DELETE CASCADE,
  org_name VARCHAR(255) NOT NULL,
  shard_id SMALLINT NOT NULL CHECK (shard_id IN (1, 2, 3)),
  email VARCHAR(255) NOT NULL,
  role_id VARCHAR(64) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  invited_by VARCHAR(32) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_inv_token ON org_invitations(token);
