import { aiEnv, dataRouter } from '../config/env';

export interface AiJobPayload {
  orgId: string;
  projectId: string;
  taskId: string;
  userId: string;
  textNote: string;
  fileId: string | null;
  mimeType: string;
}

export const AiService = {
  async generateBlueprint(prompt: string, industryHint: string) {
    if (aiEnv.geminiApiKey && !aiEnv.geminiApiKey.startsWith('replace-')) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${aiEnv.geminiModel}:generateContent?key=${aiEnv.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Convert this field operations project request into JSON with {suggested_title, summary, stages: [{name, order_index, recommended_role}]}. Request: ${prompt}`,
                    },
                  ],
                },
              ],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          },
        );
        if (resp.ok) {
          const data = (await resp.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) return JSON.parse(raw);
        }
      } catch {
        // Fallback below
      }
    }

    return {
      suggested_title: `Field Rollout: ${prompt.slice(0, 48)}`,
      summary: `AI-structured execution plan for ${industryHint || 'field operations'}`,
      stages: [
        { name: 'Lead & Material Procurement', order_index: 1, recommended_role: 'Manager' },
        { name: 'Transit & Logistics Dispatch', order_index: 2, recommended_role: 'Transit Partner' },
        { name: 'On-Field Execution & Evidence', order_index: 3, recommended_role: 'Field Worker' },
        { name: 'Supervisor Verification & Handover', order_index: 4, recommended_role: 'Supervisor' },
      ],
    };
  },

  async evaluateEvidenceJob(job: AiJobPayload): Promise<void> {
    let mediaSize = 0;
    if (job.fileId) {
      const resp = await fetch(`${aiEnv.storageHttpUrl}/api/v1/storage/internal/files/${job.fileId}`, {
        headers: {
          'x-master-read-key': aiEnv.masterReadKey,
          'x-project-id': job.projectId,
          'x-org-id': job.orgId,
        },
      });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        mediaSize = buf.byteLength;
      }
    }

    const evidenceScore = job.fileId ? 90 : job.textNote ? 65 : 20;
    const timelinessScore = 95;
    const overall = Number(((evidenceScore + timelinessScore) / 2).toFixed(2));
    const riskFlags = job.fileId ? [] : ['MISSING_VISUAL_OR_AUDIO_EVIDENCE'];

    const pgPool = dataRouter.postgres.getPrimaryForOrg(job.orgId);
    const taskRes = await pgPool.query(`SELECT stage_id FROM tasks WHERE task_id = $1`, [job.taskId]);
    const stageId = taskRes.rows[0]?.stage_id ?? 'UNKNOWN';

    await pgPool.query(
      `INSERT INTO task_efficiency_scores
         (org_id, project_id, stage_id, task_id, user_id, timeliness_score, evidence_completeness, overall_efficiency, ai_risk_flags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (task_id) DO UPDATE SET
         evidence_completeness = EXCLUDED.evidence_completeness,
         overall_efficiency = EXCLUDED.overall_efficiency,
         ai_risk_flags = EXCLUDED.ai_risk_flags,
         evaluated_at = NOW()`,
      [
        job.orgId,
        job.projectId,
        stageId,
        job.taskId,
        job.userId,
        timelinessScore,
        evidenceScore,
        overall,
        JSON.stringify(riskFlags),
      ],
    );

    try {
      const mongoConn = await dataRouter.mongo.getConnectionForOrg(job.orgId);
      await mongoConn.collection('ai_raw_analyses').insertOne({
        orgId: job.orgId,
        projectId: job.projectId,
        taskId: job.taskId,
        fileId: job.fileId,
        mimeType: job.mimeType,
        mediaBytesAnalyzed: mediaSize,
        textNote: job.textNote,
        overallEfficiency: overall,
        riskFlags,
        createdAt: new Date(),
      });
    } catch (err) {
      console.warn('[ai-governance-service] MongoDB log write skipped:', (err as Error).message);
    }
  },
};
