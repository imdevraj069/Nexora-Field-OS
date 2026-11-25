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

export const AuthService = {
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

    const accessToken = jwt.sign(payload, envConfig.jwtAccessSecret, { expiresIn: '15m' });
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
};
