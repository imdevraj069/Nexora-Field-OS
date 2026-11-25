import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  AuthTokenPayload,
  PERMISSION_FLAGS,
  generateOrgId,
  generatePrefixedId,
  resolveShardFromOrgId,
} from '@nexora/shared-types';
import { envConfig, publishEmailTask } from '../config/env';
import { IdentityRepo } from '../models/identityRepo';
import { AppError } from '../utils/appError';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(keyHex, 'hex'), derived);
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export const AuthService = {
  async superadminLogin(username?: string, password?: string) {
    if (!username || !password) {
      throw new AppError(400, 'username and password are required');
    }
    if (!safeCompare(username.trim(), envConfig.superadminUsername) || !safeCompare(password, envConfig.superadminPassword)) {
      throw new AppError(401, 'Invalid superadmin credentials');
    }

    const payload: AuthTokenPayload = {
      sub: 'SUPERADMIN-DEVRAJ',
      email: 'devraj@nexora.platform',
      activeOrgId: 'PLATFORM-ROOT',
      shardId: 1,
      roleId: 'PLATFORM_SUPERADMIN',
      isSuperadmin: true,
    };

    const accessToken = jwt.sign(payload, envConfig.jwtAccessSecret, { expiresIn: '4h' });
    return {
      accessToken,
      superadmin: {
        username: envConfig.superadminUsername,
        role: 'PLATFORM_SUPERADMIN',
      },
    };
  },

  async registerOrg(input: {
    fullName?: string;
    email?: string;
    password?: string;
    orgName?: string;
    industryType?: string;
  }) {
    if (!input.email || !input.password || !input.fullName || !input.orgName) {
      throw new AppError(400, 'fullName, email, password, and orgName are required');
    }

    const email = input.email.toLowerCase().trim();
    const userId = generatePrefixedId('USR');
    const verifyOtp = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Generate 3-letter uppercase initials from orgName
    const words = input.orgName.trim().split(/\s+/);
    let orgInitials = words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
    if (orgInitials.length < 2) orgInitials = (input.orgName.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || 'ORG').toUpperCase();

    const orgId = generateOrgId(orgInitials);
    const shardId = resolveShardFromOrgId(orgId);
    const adminFlags = Object.fromEntries(Object.values(PERMISSION_FLAGS).map((f) => [f, true]));
    const adminRoleId = `ROLE-${orgId}-ADMIN`;

    await IdentityRepo.insertUser({
      userId,
      email,
      passwordHash: hashPassword(input.password),
      fullName: input.fullName.trim(),
      verifyTokenHash: hashToken(verifyOtp),
    });

    await IdentityRepo.createOrganization({
      orgId,
      orgName: input.orgName.trim(),
      orgInitials,
      shardId,
      userId,
      industryType: input.industryType ?? 'general_field_ops',
      adminRoleId,
      adminFlags,
    });

    // Auto-verify creator user so they can immediately access the workspace
    await IdentityRepo.verifyUserOtp(email, hashToken(verifyOtp));

    const payload: AuthTokenPayload = {
      sub: userId,
      email,
      activeOrgId: orgId,
      shardId,
      roleId: adminRoleId,
    };
    const accessToken = jwt.sign(payload, envConfig.jwtAccessSecret, { expiresIn: '2h' });
    const refreshToken = jwt.sign({ sub: userId, jti: crypto.randomUUID() }, envConfig.jwtRefreshSecret, {
      expiresIn: '7d',
    });
    await IdentityRepo.saveRefreshToken(crypto.randomUUID(), userId, hashToken(refreshToken));

    publishEmailTask({
      template: 'verify-email',
      to: email,
      subject: 'Welcome to Nexora Field OS — Organization Created',
      data: { fullName: input.fullName.trim(), verifyOtp, orgId },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId,
        email,
        fullName: input.fullName.trim(),
      },
      organization: {
        org_id: orgId,
        name: input.orgName.trim(),
        shardId,
      },
      roleId: adminRoleId,
    };
  },

  async register(input: {
    email?: string;
    password?: string;
    fullName?: string;
    orgName?: string;
    orgInitials?: string;
    orgId?: string;
    roleId?: string;
    industryType?: string;
  }) {
    if (!input.email || !input.password || !input.fullName) {
      throw new AppError(400, 'email, password, and fullName are required');
    }
    const email = input.email.toLowerCase().trim();
    const userId = generatePrefixedId('USR');
    const verifyOtp = crypto.randomBytes(3).toString('hex').toUpperCase();

    await IdentityRepo.insertUser({
      userId,
      email,
      passwordHash: hashPassword(input.password),
      fullName: input.fullName.trim(),
      verifyTokenHash: hashToken(verifyOtp),
    });

    let joinedOrg: { orgId: string; shardId: number; roleId?: string } | null = null;
    if (input.orgName && input.orgInitials) {
      const orgId = generateOrgId(input.orgInitials);
      const shardId = resolveShardFromOrgId(orgId);
      const adminFlags = Object.fromEntries(Object.values(PERMISSION_FLAGS).map((f) => [f, true]));
      const adminRoleId = `ROLE-${orgId}-ADMIN`;

      await IdentityRepo.createOrganization({
        orgId,
        orgName: input.orgName.trim(),
        orgInitials: input.orgInitials.trim().toUpperCase(),
        shardId,
        userId,
        industryType: input.industryType ?? 'general_field_ops',
        adminRoleId,
        adminFlags,
      });
      joinedOrg = { orgId, shardId, roleId: adminRoleId };
    } else if (input.orgId) {
      joinedOrg = await IdentityRepo.addUserToExistingOrg({
        orgId: input.orgId.trim().toUpperCase(),
        userId,
        roleId: input.roleId,
        defaultMemberFlags: {
          [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
          [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
          [PERMISSION_FLAGS.STAGE_VIEW_ONLY]: true,
        },
      });
    }

    publishEmailTask({
      template: 'verify-email',
      to: email,
      subject: 'Verify your Nexora Field OS account',
      data: { fullName: input.fullName.trim(), verifyOtp, orgId: joinedOrg?.orgId ?? null },
    });

    return { userId, org: joinedOrg, message: 'Registered. Check email for verification code.' };
  },

  async verifyEmail(email?: string, otp?: string) {
    if (!email || !otp) throw new AppError(400, 'email and otp are required');
    const row = await IdentityRepo.verifyUserOtp(email.toLowerCase().trim(), hashToken(otp.trim().toUpperCase()));
    if (!row) throw new AppError(400, 'Invalid verification code or email');
    return { verified: true, userId: row.user_id };
  },

  async login(email?: string, password?: string, orgId?: string) {
    if (!email || !password) throw new AppError(400, 'email and password are required');
    const found = await IdentityRepo.findUserWithMemberships(email.toLowerCase().trim());
    if (!found || !verifyPassword(password, found.user.password_hash)) {
      throw new AppError(401, 'Invalid credentials');
    }
    const activeMembership = orgId
      ? found.memberships.find((m) => m.org_id === orgId.toUpperCase())
      : found.memberships[0];
    if (!activeMembership) throw new AppError(403, 'User has no active organization membership');

    const payload: AuthTokenPayload = {
      sub: found.user.user_id,
      email: found.user.email,
      activeOrgId: activeMembership.org_id,
      shardId: activeMembership.shard_id,
      roleId: activeMembership.role_id,
    };

    const accessToken = jwt.sign(payload, envConfig.jwtAccessSecret, { expiresIn: '2h' });
    const refreshToken = jwt.sign({ sub: found.user.user_id, jti: crypto.randomUUID() }, envConfig.jwtRefreshSecret, {
      expiresIn: '7d',
    });

    await IdentityRepo.saveRefreshToken(crypto.randomUUID(), found.user.user_id, hashToken(refreshToken));

    return {
      accessToken,
      refreshToken,
      user: {
        userId: found.user.user_id,
        email: found.user.email,
        fullName: found.user.full_name,
        isVerified: found.user.is_verified,
      },
      activeOrg: activeMembership,
      organizations: found.memberships,
    };
  },

  async refreshSession(refreshToken?: string, orgId?: string) {
    if (!refreshToken) throw new AppError(400, 'refreshToken is required');
    let decoded: { sub: string };
    try {
      decoded = jwt.verify(refreshToken, envConfig.jwtRefreshSecret) as { sub: string };
    } catch {
      throw new AppError(401, 'Refresh token expired or invalid');
    }

    const found = await IdentityRepo.findUserWithMembershipsById(decoded.sub);
    if (!found) throw new AppError(401, 'User account not found');

    const newRefreshToken = jwt.sign(
      { sub: found.user.user_id, jti: crypto.randomUUID() },
      envConfig.jwtRefreshSecret,
      { expiresIn: '7d' },
    );
    const rotated = await IdentityRepo.validateAndRotateRefreshToken(
      found.user.user_id,
      hashToken(refreshToken),
      crypto.randomUUID(),
      hashToken(newRefreshToken),
    );
    if (!rotated) throw new AppError(401, 'Refresh token revoked or expired');

    const activeMembership = orgId
      ? found.memberships.find((m) => m.org_id === orgId.toUpperCase()) || found.memberships[0]
      : found.memberships[0];
    if (!activeMembership) throw new AppError(403, 'User has no active organization membership');

    const payload: AuthTokenPayload = {
      sub: found.user.user_id,
      email: found.user.email,
      activeOrgId: activeMembership.org_id,
      shardId: activeMembership.shard_id,
      roleId: activeMembership.role_id,
    };
    const accessToken = jwt.sign(payload, envConfig.jwtAccessSecret, { expiresIn: '2h' });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        userId: found.user.user_id,
        email: found.user.email,
        fullName: found.user.full_name,
        isVerified: found.user.is_verified,
      },
      activeOrg: activeMembership,
      organizations: found.memberships,
    };
  },

  async requestReset(email?: string) {
    if (!email) throw new AppError(400, 'email is required');
    const normalized = email.toLowerCase().trim();
    const resetToken = crypto.randomBytes(24).toString('hex');
    await IdentityRepo.setResetToken(normalized, hashToken(resetToken));
    publishEmailTask({
      template: 'password-reset',
      to: normalized,
      subject: 'Reset your Nexora Field OS password',
      data: { resetToken },
    });
    return { sent: true };
  },

  async resetPassword(email?: string, resetToken?: string, newPassword?: string) {
    if (!email || !resetToken || !newPassword) {
      throw new AppError(400, 'email, resetToken, and newPassword are required');
    }
    const ok = await IdentityRepo.resetPasswordWithToken(
      email.toLowerCase().trim(),
      hashToken(resetToken),
      hashPassword(newPassword),
    );
    if (!ok) throw new AppError(400, 'Invalid or expired reset token');
    return { reset: true };
  },

  async createInvite(
    authHeader: string | undefined,
    input: { email?: string; roleId?: string; roleName?: string; origin?: string },
  ) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing authorization token');
    }
    let decoded: AuthTokenPayload;
    try {
      decoded = jwt.verify(authHeader.slice(7), envConfig.jwtAccessSecret) as AuthTokenPayload;
    } catch {
      throw new AppError(401, 'Invalid or expired access token');
    }

    if (!input.email) throw new AppError(400, 'Invitee email is required');
    const orgInfo = await IdentityRepo.getOrgInfo(decoded.activeOrgId);
    if (!orgInfo) throw new AppError(404, 'Organization not found');

    const inviteId = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const token = crypto.randomBytes(18).toString('hex');
    const email = input.email.toLowerCase().trim();
    const roleName = input.roleName || 'Member';
    const roleId = input.roleId || '';

    await IdentityRepo.createInvitation({
      inviteId,
      token,
      orgId: orgInfo.org_id,
      orgName: orgInfo.org_name,
      shardId: orgInfo.shard_id,
      email,
      roleId,
      roleName,
      invitedBy: decoded.email,
    });

    const baseUrl = input.origin || 'http://localhost:8080';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    publishEmailTask({
      template: 'org-invite',
      to: email,
      subject: `Invitation to join ${orgInfo.org_name} on Nexora Field OS`,
      data: {
        orgName: orgInfo.org_name,
        orgId: orgInfo.org_id,
        roleName,
        invitedBy: decoded.email,
        inviteUrl,
      },
    });

    return { inviteId, token, inviteUrl, email, orgId: orgInfo.org_id, roleName };
  },

  async getInviteDetails(token: string) {
    const inv = await IdentityRepo.findInvitationByToken(token);
    if (!inv) throw new AppError(404, 'Invitation not found');
    if (inv.accepted_at) throw new AppError(400, 'Invitation has already been accepted');
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      throw new AppError(400, 'Invitation has expired');
    }
    const existingUser = await IdentityRepo.findUserByEmail(inv.email);
    return {
      inviteId: inv.invite_id,
      orgId: inv.org_id,
      orgName: inv.org_name,
      email: inv.email,
      roleName: inv.role_name,
      invitedBy: inv.invited_by,
      requiresOnboarding: !existingUser,
    };
  },

  async acceptInvite(input: { token?: string; fullName?: string; password?: string }) {
    if (!input.token) throw new AppError(400, 'Invitation token is required');
    const inv = await IdentityRepo.findInvitationByToken(input.token);
    if (!inv) throw new AppError(404, 'Invalid invitation token');
    if (inv.accepted_at) throw new AppError(400, 'Invitation has already been accepted');
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      throw new AppError(400, 'Invitation has expired');
    }

    let existingUser = await IdentityRepo.findUserByEmail(inv.email);
    let userId: string;
    let fullName: string;

    if (!existingUser) {
      if (!input.fullName || !input.password) {
        throw new AppError(400, 'fullName and password are required to complete onboarding');
      }
      userId = generatePrefixedId('USR');
      fullName = input.fullName.trim();
      const verifyOtp = crypto.randomBytes(3).toString('hex').toUpperCase();
      await IdentityRepo.insertUser({
        userId,
        email: inv.email,
        passwordHash: hashPassword(input.password),
        fullName,
        verifyTokenHash: hashToken(verifyOtp),
      });
      await IdentityRepo.verifyUserOtp(inv.email, hashToken(verifyOtp));
    } else {
      userId = existingUser.user_id;
      fullName = existingUser.full_name;
    }

    const joined = await IdentityRepo.addUserToExistingOrg({
      orgId: inv.org_id,
      userId,
      roleId: inv.role_id || undefined,
      defaultMemberFlags: {
        [PERMISSION_FLAGS.TASK_EXECUTE_OWN]: true,
        [PERMISSION_FLAGS.TASK_UPLOAD_EVIDENCE]: true,
        [PERMISSION_FLAGS.STAGE_VIEW_ONLY]: true,
      },
    });

    await IdentityRepo.markInvitationAccepted(inv.invite_id);

    const found = await IdentityRepo.findUserWithMemberships(inv.email);
    const activeOrg =
      found?.memberships.find((m) => m.org_id === inv.org_id) || {
        org_id: inv.org_id,
        org_name: inv.org_name,
        role_id: joined.roleId,
        shard_id: joined.shardId,
      };

    const payload: AuthTokenPayload = {
      sub: userId,
      email: inv.email,
      activeOrgId: inv.org_id,
      shardId: joined.shardId,
      roleId: joined.roleId,
    };
    const accessToken = jwt.sign(payload, envConfig.jwtAccessSecret, { expiresIn: '2h' });
    const refreshToken = jwt.sign({ sub: userId, jti: crypto.randomUUID() }, envConfig.jwtRefreshSecret, {
      expiresIn: '7d',
    });
    await IdentityRepo.saveRefreshToken(crypto.randomUUID(), userId, hashToken(refreshToken));

    return {
      accepted: true,
      accessToken,
      refreshToken,
      user: { userId, email: inv.email, fullName },
      activeOrg,
      userOrgs: found?.memberships || [activeOrg],
    };
  },
};
