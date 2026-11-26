import crypto from 'node:crypto';
import { PERMISSION_FLAGS, hasPermission } from '@nexora/shared-types';
import { dataRouter, gatewayEnv } from '../config/env';
import { AuthContext } from '../middlewares/auth';
import { AppError } from '../utils/http';
import { ProjectService } from './projectService';

async function uploadReceiptToMinio(
  orgId: string,
  projectId: string,
  userId: string,
  file?: Express.Multer.File,
): Promise<string | null> {
  if (!file) return null;
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
  form.append('projectId', projectId || 'FINANCE');
  form.append('orgId', orgId);
  form.append('uploadedBy', userId);
  form.append('tags', '["finance-receipt"]');

  const resp = await fetch(`${gatewayEnv.storageHttpUrl}/api/v1/storage/upload`, {
    method: 'POST',
    headers: {
      'x-master-storage-key': gatewayEnv.masterStorageKey,
      'x-bucket-name': 'nexora-docs',
    },
    body: form,
  });
  if (!resp.ok) {
    const err = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new AppError(resp.status, err.error || 'Failed to store receipt in MinIO');
  }
  const json = (await resp.json()) as { fileId?: string };
  return json.fileId ?? null;
}

export const FinanceService = {
  async getOverview(auth: AuthContext) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const [bRes, eRes, rRes] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total_budget_paise), 0)::bigint AS total_allocated,
                COALESCE(SUM(distributed_budget_paise), 0)::bigint AS total_distributed,
                COALESCE(SUM(floated_budget_paise), 0)::bigint AS total_floated
         FROM project_budgets WHERE org_id = $1`,
        [auth.activeOrgId],
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount_paise), 0)::bigint AS total_spent,
                COALESCE(SUM(amount_paise) FILTER (WHERE payment_status = 'PAID'), 0)::bigint AS paid_spent
         FROM expenses WHERE org_id = $1`,
        [auth.activeOrgId],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS pending_count,
                COALESCE(SUM(amount_paise), 0)::bigint AS pending_amount
         FROM reimbursement_claims WHERE org_id = $1 AND status IN ('SUBMITTED', 'PENDING')`,
        [auth.activeOrgId],
      ),
    ]);

    const totalAllocated = Number(bRes.rows[0]?.total_allocated ?? 0);
    const totalSpent = Number(eRes.rows[0]?.total_spent ?? 0);
    const burnRatePct = totalAllocated > 0 ? Number(((totalSpent / totalAllocated) * 100).toFixed(1)) : 0;

    return {
      totalAllocatedPaise: totalAllocated,
      totalDistributedPaise: Number(bRes.rows[0]?.total_distributed ?? 0),
      totalFloatedPaise: Number(bRes.rows[0]?.total_floated ?? 0),
      totalSpentPaise: totalSpent,
      paidSpentPaise: Number(eRes.rows[0]?.paid_spent ?? 0),
      pendingClaimsCount: Number(rRes.rows[0]?.pending_count ?? 0),
      pendingClaimsPaise: Number(rRes.rows[0]?.pending_amount ?? 0),
      burnRatePct,
    };
  },

  async listBudgets(auth: AuthContext) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const res = await pool.query(
      `SELECT b.*, p.title AS project_title,
              COALESCE((SELECT SUM(e.amount_paise) FROM expenses e WHERE e.project_id = b.project_id), 0)::bigint AS spent_paise
       FROM project_budgets b
       JOIN projects p ON p.project_id = b.project_id
       WHERE b.org_id = $1
       ORDER BY b.updated_at DESC`,
      [auth.activeOrgId],
    );
    return res.rows;
  },

  async upsertBudget(
    auth: AuthContext,
    body: {
      projectId: string;
      totalBudgetPaise: number;
      distributedBudgetPaise?: number;
      floatedBudgetPaise?: number;
      currency?: string;
      notes?: string;
      reason?: string;
    },
  ) {
    const roleCtx = await ProjectService.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.PROJECT_MANAGE) && !hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS)) {
      throw new AppError(403, 'Forbidden: requires project.manage or org.manage_settings');
    }
    const pool = dataRouter.postgres.getPrimaryPool(auth.shardId);
    const existing = await pool.query(`SELECT total_budget_paise FROM project_budgets WHERE project_id = $1`, [
      body.projectId,
    ]);
    const prevTotal = Number(existing.rows[0]?.total_budget_paise ?? 0);
    const budgetId = `BDG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const total = Number(body.totalBudgetPaise);
    const distributed = body.distributedBudgetPaise !== undefined ? Number(body.distributedBudgetPaise) : total;
    const floated = body.floatedBudgetPaise !== undefined ? Number(body.floatedBudgetPaise) : 0;

    await pool.query(
      `INSERT INTO project_budgets (budget_id, org_id, project_id, total_budget_paise, distributed_budget_paise, floated_budget_paise, currency, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (project_id) DO UPDATE SET
         total_budget_paise = EXCLUDED.total_budget_paise,
         distributed_budget_paise = EXCLUDED.distributed_budget_paise,
         floated_budget_paise = EXCLUDED.floated_budget_paise,
         notes = EXCLUDED.notes,
         revisions_count = project_budgets.revisions_count + 1,
         last_revised_by = $9,
         updated_at = NOW()`,
      [budgetId, auth.activeOrgId, body.projectId, total, distributed, floated, body.currency || 'INR', body.notes || '', auth.userId],
    );

    if (existing.rows.length > 0 && prevTotal !== total) {
      await pool.query(
        `INSERT INTO budget_revisions (org_id, project_id, previous_total_paise, new_total_paise, reason, revised_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [auth.activeOrgId, body.projectId, prevTotal, total, body.reason || 'Budget revision', auth.userId],
      );
    }

    return { projectId: body.projectId, totalBudgetPaise: total, distributedBudgetPaise: distributed, floatedBudgetPaise: floated };
  },

  async listBudgetRevisions(auth: AuthContext, projectId: string) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const res = await pool.query(
      `SELECT revision_id, project_id, previous_total_paise, new_total_paise, reason, revised_by, created_at
       FROM budget_revisions
       WHERE org_id = $1 AND project_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [auth.activeOrgId, projectId],
    );
    return res.rows;
  },

  async listExpenses(auth: AuthContext, projectId?: string) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const params: unknown[] = [auth.activeOrgId];
    let where = `e.org_id = $1`;
    if (projectId) {
      params.push(projectId);
      where += ` AND e.project_id = $${params.length}`;
    }
    const res = await pool.query(
      `SELECT e.*, p.title AS project_title
       FROM expenses e LEFT JOIN projects p ON p.project_id = e.project_id
       WHERE ${where}
       ORDER BY e.created_at DESC`,
      params,
    );
    return res.rows;
  },

  async createExpense(
    auth: AuthContext,
    body: {
      projectId?: string;
      title: string;
      description?: string;
      expenseType?: string;
      category?: string;
      amountPaise: number;
      fundingSource?: string;
      vendorName?: string;
      invoiceNumber?: string;
    },
    file?: Express.Multer.File,
  ) {
    const receiptFileId = await uploadReceiptToMinio(auth.activeOrgId, body.projectId || 'FINANCE', auth.userId, file);
    const expenseId = `EXP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await dataRouter.postgres.getPrimaryPool(auth.shardId).query(
      `INSERT INTO expenses (expense_id, org_id, project_id, title, description, expense_type, category, amount_paise, funding_source, vendor_name, invoice_number, receipt_file_id, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        expenseId,
        auth.activeOrgId,
        body.projectId || null,
        body.title,
        body.description || '',
        body.expenseType || 'PROJECT',
        body.category || 'MATERIALS',
        Number(body.amountPaise),
        body.fundingSource || 'COMPANY_FUNDED',
        body.vendorName || '',
        body.invoiceNumber || '',
        receiptFileId,
        auth.userId,
      ],
    );
    return { expenseId, receiptFileId };
  },

  async markExpensePaid(auth: AuthContext, expenseId: string) {
    await dataRouter.postgres
      .getPrimaryPool(auth.shardId)
      .query(`UPDATE expenses SET payment_status = 'PAID' WHERE expense_id = $1 AND org_id = $2`, [
        expenseId,
        auth.activeOrgId,
      ]);
    return { expenseId, paymentStatus: 'PAID' };
  },

  async listReimbursements(auth: AuthContext) {
    const pool = dataRouter.postgres.getReadPool(auth.shardId, true);
    const res = await pool.query(
      `SELECT c.*, p.title AS project_title
       FROM reimbursement_claims c LEFT JOIN projects p ON p.project_id = c.project_id
       WHERE c.org_id = $1
       ORDER BY c.created_at DESC`,
      [auth.activeOrgId],
    );
    return res.rows;
  },

  async createReimbursement(
    auth: AuthContext,
    body: { projectId?: string; title: string; description?: string; amountPaise: number },
    file?: Express.Multer.File,
  ) {
    const receiptFileId = await uploadReceiptToMinio(auth.activeOrgId, body.projectId || 'FINANCE', auth.userId, file);
    const claimId = `CLM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await dataRouter.postgres.getPrimaryPool(auth.shardId).query(
      `INSERT INTO reimbursement_claims (claim_id, org_id, project_id, user_id, title, description, amount_paise, receipt_file_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        claimId,
        auth.activeOrgId,
        body.projectId || null,
        auth.userId,
        body.title,
        body.description || '',
        Number(body.amountPaise),
        receiptFileId,
      ],
    );
    return { claimId, receiptFileId, status: 'SUBMITTED' };
  },

  async reviewReimbursement(auth: AuthContext, claimId: string, status: string, reviewNotes?: string) {
    const roleCtx = await ProjectService.getOrgMemberRoleContext(auth.activeOrgId, auth.shardId, auth.userId);
    if (!hasPermission(roleCtx, PERMISSION_FLAGS.TASK_VERIFY_APPROVE) && !hasPermission(roleCtx, PERMISSION_FLAGS.ORG_MANAGE_SETTINGS)) {
      throw new AppError(403, 'Forbidden: requires approval permission');
    }
    await dataRouter.postgres.getPrimaryPool(auth.shardId).query(
      `UPDATE reimbursement_claims SET status = $1, reviewed_by = $2, review_notes = $3, updated_at = NOW()
       WHERE claim_id = $4 AND org_id = $5`,
      [status.toUpperCase(), auth.userId, reviewNotes || '', claimId, auth.activeOrgId],
    );
    return { claimId, status: status.toUpperCase() };
  },
};
