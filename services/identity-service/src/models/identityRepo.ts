import { dataRouter } from '../config/env';
import { ShardId, resolveShardFromOrgId } from '@nexora/shared-types';

export const IdentityRepo = {
  async insertUser(params: {
    userId: string;
    email: string;
    passwordHash: string;
    fullName: string;
    verifyTokenHash: string;
  }) {
    await dataRouter.postgres.getGlobalPool().query(
      `INSERT INTO users (user_id, email, password_hash, full_name, is_verified, verification_token_hash)
       VALUES ($1, $2, $3, $4, FALSE, $5)`,
      [params.userId, params.email, params.passwordHash, params.fullName, params.verifyTokenHash],
    );
  },

  async createOrganization(params: {
    orgId: string;
    orgName: string;
    orgInitials: string;
    shardId: ShardId;
    userId: string;
    industryType: string;
    adminRoleId: string;
    adminFlags: Record<string, boolean>;
  }) {
    const globalPool = dataRouter.postgres.getGlobalPool();
    await globalPool.query(
      `INSERT INTO org_directory (org_id, org_name, org_initials, shard_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.orgId, params.orgName, params.orgInitials, params.shardId, params.userId],
    );

    const shardPool = dataRouter.postgres.getPrimaryPool(params.shardId);
    await shardPool.query(`INSERT INTO organizations (org_id, name, industry_type) VALUES ($1, $2, $3)`, [
      params.orgId,
      params.orgName,
      params.industryType,
    ]);
    await shardPool.query(
      `INSERT INTO roles (role_id, org_id, name, flags, is_system) VALUES ($1, $2, 'Admin', $3::jsonb, TRUE)`,
      [params.adminRoleId, params.orgId, JSON.stringify(params.adminFlags)],
    );
    await shardPool.query(`INSERT INTO org_members (org_id, user_id, role_id) VALUES ($1, $2, $3)`, [
      params.orgId,
      params.userId,
      params.adminRoleId,
    ]);
    await shardPool.query(`INSERT INTO org_member_roles (org_id, user_id, role_id) VALUES ($1, $2, $3)`, [
      params.orgId,
      params.userId,
      params.adminRoleId,
    ]);
    await globalPool.query(`INSERT INTO user_org_memberships (user_id, org_id, role_id) VALUES ($1, $2, $3)`, [
      params.userId,
      params.orgId,
      params.adminRoleId,
    ]);
  },

  async addUserToExistingOrg(params: {
    orgId: string;
    userId: string;
    roleId?: string;
    defaultMemberFlags: Record<string, boolean>;
  }) {
    const globalPool = dataRouter.postgres.getGlobalPool();
    const orgRow = await globalPool.query(`SELECT org_id, shard_id FROM org_directory WHERE org_id = $1`, [
      params.orgId,
    ]);
    if (orgRow.rows.length === 0) {
      throw new Error(`Organization "${params.orgId}" does not exist`);
    }

    const shardId = resolveShardFromOrgId(params.orgId);
    const shardPool = dataRouter.postgres.getPrimaryPool(shardId);

    let assignedRoleId = params.roleId;
    if (!assignedRoleId) {
      assignedRoleId = `ROLE-${params.orgId}-MEMBER`;
      await shardPool.query(
        `INSERT INTO roles (role_id, org_id, name, flags, is_system)
         VALUES ($1, $2, 'Member', $3::jsonb, TRUE)
         ON CONFLICT (org_id, name) DO NOTHING`,
        [assignedRoleId, params.orgId, JSON.stringify(params.defaultMemberFlags)],
      );
    }

    await shardPool.query(
      `INSERT INTO org_members (org_id, user_id, role_id) VALUES ($1, $2, $3) ON CONFLICT (org_id, user_id) DO NOTHING`,
      [params.orgId, params.userId, assignedRoleId],
    );
    await shardPool.query(
      `INSERT INTO org_member_roles (org_id, user_id, role_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [params.orgId, params.userId, assignedRoleId],
    );
    await globalPool.query(
      `INSERT INTO user_org_memberships (user_id, org_id, role_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [params.userId, params.orgId, assignedRoleId],
    );

    return { orgId: params.orgId, shardId, roleId: assignedRoleId };
  },

  async verifyUserOtp(email: string, otpHash: string) {
    const { rows } = await dataRouter.postgres.getGlobalPool().query(
      `UPDATE users SET is_verified = TRUE, verification_token_hash = NULL, updated_at = NOW()
       WHERE email = $1 AND verification_token_hash = $2 RETURNING user_id, email`,
      [email, otpHash],
    );
    return rows[0] ?? null;
  },

  async findUserWithMemberships(email: string) {
    const globalPool = dataRouter.postgres.getGlobalPool();
    const userRes = await globalPool.query(
      `SELECT user_id, email, password_hash, full_name, is_verified FROM users WHERE email = $1`,
      [email],
    );
    if (userRes.rows.length === 0) return null;
    const user = userRes.rows[0];
    const memberships = await globalPool.query(
      `SELECT m.org_id, m.role_id, d.shard_id, d.org_name
       FROM user_org_memberships m
       JOIN org_directory d ON d.org_id = m.org_id
       WHERE m.user_id = $1 AND m.is_active = TRUE`,
      [user.user_id],
    );
    return { user, memberships: memberships.rows };
  },

  async saveRefreshToken(tokenId: string, userId: string, tokenHash: string) {
    await dataRouter.postgres.getGlobalPool().query(
      `INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [tokenId, userId, tokenHash],
    );
  },

  async setResetToken(email: string, resetHash: string) {
    await dataRouter.postgres.getGlobalPool().query(
      `UPDATE users SET reset_token_hash = $1, reset_token_expires_at = NOW() + INTERVAL '30 minutes' WHERE email = $2`,
      [resetHash, email],
    );
  },

  async resetPasswordWithToken(email: string, resetHash: string, passwordHash: string) {
    const { rowCount } = await dataRouter.postgres.getGlobalPool().query(
      `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL
       WHERE email = $2 AND reset_token_hash = $3 AND reset_token_expires_at > NOW()`,
      [passwordHash, email, resetHash],
    );
    return Boolean(rowCount && rowCount > 0);
  },

  async createInvitation(params: {
    inviteId: string;
    token: string;
    orgId: string;
    orgName: string;
    shardId: ShardId;
    email: string;
    roleId: string;
    roleName: string;
    invitedBy: string;
  }) {
    await dataRouter.postgres.getGlobalPool().query(
      `INSERT INTO org_invitations (invite_id, token, org_id, org_name, shard_id, email, role_id, role_name, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.inviteId,
        params.token,
        params.orgId,
        params.orgName,
        params.shardId,
        params.email,
        params.roleId,
        params.roleName,
        params.invitedBy,
      ],
    );
  },

  async findInvitationByToken(token: string) {
    const { rows } = await dataRouter.postgres.getGlobalPool().query(
      `SELECT invite_id, token, org_id, org_name, shard_id, email, role_id, role_name, invited_by, expires_at, accepted_at
       FROM org_invitations WHERE token = $1`,
      [token],
    );
    return rows[0] ?? null;
  },

  async markInvitationAccepted(inviteId: string) {
    await dataRouter.postgres.getGlobalPool().query(
      `UPDATE org_invitations SET accepted_at = NOW() WHERE invite_id = $1`,
      [inviteId],
    );
  },

  async findUserByEmail(email: string) {
    const { rows } = await dataRouter.postgres.getGlobalPool().query(
      `SELECT user_id, email, full_name, is_verified FROM users WHERE email = $1`,
      [email],
    );
    return rows[0] ?? null;
  },

  async getOrgInfo(orgId: string) {
    const { rows } = await dataRouter.postgres.getGlobalPool().query(
      `SELECT org_id, org_name, shard_id FROM org_directory WHERE org_id = $1`,
      [orgId],
    );
    return rows[0] ?? null;
  },
};
