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
                      text: `Convert this field operations project request into JSON with {suggested_title, summary, stages: [{name, order_index, recommended_role, tasks: [{title, description, checklist_items: []}]}]}. Request: ${prompt}`,
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
        { name: 'Lead & Material Procurement', order_index: 1, recommended_role: 'Manager', tasks: [] },
        { name: 'Transit & Logistics Dispatch', order_index: 2, recommended_role: 'Transit Partner', tasks: [] },
        { name: 'On-Field Execution & Evidence', order_index: 3, recommended_role: 'Field Worker', tasks: [] },
        { name: 'Supervisor Verification & Handover', order_index: 4, recommended_role: 'Supervisor', tasks: [] },
      ],
    };
  },

  async evaluateEvidenceJob(job: AiJobPayload): Promise<void> {
    let mediaSize = 0;
    let base64Media: string | null = null;
    let audioTranscript = '';
    let detectedLanguages: string[] = [];
    let aiSummary = '';
    let evidenceScore = job.fileId ? 90 : job.textNote ? 65 : 20;
    const timelinessScore = 95;
    let riskFlags: string[] = job.fileId ? [] : ['MISSING_VISUAL_OR_AUDIO_EVIDENCE'];

    if (job.fileId) {
      try {
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
          if (job.mimeType.startsWith('audio/') || job.mimeType.startsWith('video/') || job.mimeType.startsWith('image/')) {
            base64Media = Buffer.from(buf).toString('base64');
          }
        }
      } catch (e) {
        console.warn('[ai-governance-service] Error fetching media for AI analysis:', (e as Error).message);
      }
    }

    // Call Gemini 2.5 Flash for Multimodal Voice/Audio/Image Analysis with Multi-language identification
    if (aiEnv.geminiApiKey && (base64Media || job.textNote)) {
      try {
        const parts: Array<Record<string, unknown>> = [];
        if (base64Media) {
          parts.push({
            inlineData: {
              mimeType: job.mimeType,
              data: base64Media,
            },
          });
        }
        parts.push({
          text: `You are Nexora Field OS AI Governance Inspector. Analyze this field submission proof (audio/voice note, video, image, and/or technician note).
Support multi-language and mixed-language detection (e.g. English, Hindi, Hinglish, Spanish, Regional dialects).
Technician Note: "${job.textNote || 'None provided'}"

Return JSON strictly matching this schema:
{
  "transcript": "Full transcript or description of audio/evidence",
  "identified_languages": ["Hindi", "English"],
  "quality_score": 0-100,
  "evidence_completeness": 0-100,
  "summary": "Concise assessment of evidence against field task",
  "risk_flags": ["ANY_RISK_FLAG"]
}`,
        });

        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${aiEnv.geminiModel}:generateContent?key=${aiEnv.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          },
        );

        if (geminiResp.ok) {
          const geminiData = (await geminiResp.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            audioTranscript = parsed.transcript || '';
            detectedLanguages = Array.isArray(parsed.identified_languages) ? parsed.identified_languages : [];
            aiSummary = parsed.summary || '';
            if (typeof parsed.evidence_completeness === 'number') {
              evidenceScore = Math.max(0, Math.min(100, parsed.evidence_completeness));
            } else if (typeof parsed.quality_score === 'number') {
              evidenceScore = Math.max(0, Math.min(100, parsed.quality_score));
            }
            if (Array.isArray(parsed.risk_flags)) {
              riskFlags = parsed.risk_flags.map((f: unknown) => String(f));
            }
          }
        }
      } catch (aiErr) {
        console.warn('[ai-governance-service] Gemini evidence evaluation error:', (aiErr as Error).message);
      }
    }

    const overall = Number(((evidenceScore + timelinessScore) / 2).toFixed(2));

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
        userId: job.userId,
        fileId: job.fileId,
        mimeType: job.mimeType,
        mediaBytesAnalyzed: mediaSize,
        textNote: job.textNote,
        audioTranscript,
        aiSummary,
        identifiedLanguages: detectedLanguages,
        overallEfficiency: overall,
        riskFlags,
        createdAt: new Date(),
      });
    } catch (err) {
      console.warn('[ai-governance-service] MongoDB log write skipped:', (err as Error).message);
    }
  },

  async analyzeProjectProgress(orgId: string, projectId: string, userId: string) {
    const pgPool = dataRouter.postgres.getPrimaryForOrg(orgId);
    const projRes = await pgPool.query(`SELECT * FROM projects WHERE project_id = $1`, [projectId]);
    const stagesRes = await pgPool.query(`SELECT * FROM stages WHERE project_id = $1 ORDER BY order_index ASC`, [projectId]);
    const tasksRes = await pgPool.query(`SELECT * FROM tasks WHERE project_id = $1`, [projectId]);

    const totalTasks = tasksRes.rows.length;
    const completedTasks = tasksRes.rows.filter(
      (t) => t.status === 'DONE' || t.status === 'COMPLETED' || t.status === 'VERIFIED' || t.status === 'SUBMITTED',
    ).length;

    let pendingChecklists = 0;
    for (const t of tasksRes.rows) {
      const items = Array.isArray(t.checklist) ? t.checklist : [];
      pendingChecklists += items.filter((item: { completed?: boolean }) => !item.completed).length;
    }

    let mongoAnalyses: Array<Record<string, unknown>> = [];
    try {
      const mongoConn = await dataRouter.mongo.getConnectionForOrg(orgId);
      mongoAnalyses = await mongoConn
        .collection('ai_raw_analyses')
        .find({ projectId })
        .sort({ createdAt: -1 })
        .toArray();
    } catch {
      // ignore
    }

    const totalFilesSubmitted = mongoAnalyses.filter((a) => a.fileId).length;
    const allLanguages = new Set<string>();
    const transcripts: string[] = [];
    for (const a of mongoAnalyses) {
      if (Array.isArray(a.identifiedLanguages)) {
        a.identifiedLanguages.forEach((l) => allLanguages.add(String(l)));
      }
      if (a.audioTranscript) {
        transcripts.push(String(a.audioTranscript));
      }
    }

    const completionPercentage = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;
    let executiveSummary = `Project ${projRes.rows[0]?.title || projectId} is at ${completionPercentage}% progress across ${stagesRes.rows.length} stages and ${totalTasks} tasks.`;
    let recommendations = 'Ensure pending checklist items are verified on-field before final supervisor signoff.';
    let healthScore = 85.0;

    // Call Gemini to generate intelligent synthesis
    if (aiEnv.geminiApiKey) {
      try {
        const prompt = `You are Nexora Field OS Executive AI Governance Assistant.
Analyze this field project progress on-demand for the Project Manager / Org Admin:
Project: ${JSON.stringify(projRes.rows[0] || {})}
Stages: ${JSON.stringify(stagesRes.rows)}
Tasks: ${JSON.stringify(tasksRes.rows.map((t) => ({ title: t.title, status: t.status, checklist: t.checklist, file_requirements: t.file_requirements })))}
Voice Transcripts / Media Submissions: ${JSON.stringify(transcripts.slice(0, 10))}
Identified Languages in Field Submissions: ${Array.from(allLanguages).join(', ') || 'English'}

Provide JSON response:
{
  "overall_health_score": 0-100,
  "executive_summary": "Thorough executive breakdown of project milestones, execution speed, and field performance",
  "risk_flags": ["ANY_RISK"],
  "recommendations": "Actionable next steps for the field manager"
}`;

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${aiEnv.geminiModel}:generateContent?key=${aiEnv.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          },
        );

        if (resp.ok) {
          const gData = (await resp.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const raw = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            healthScore = Number(parsed.overall_health_score ?? 85);
            executiveSummary = String(parsed.executive_summary ?? executiveSummary);
            recommendations = String(parsed.recommendations ?? recommendations);
          }
        }
      } catch (e) {
        console.warn('[ai-governance-service] Error generating project AI synthesis:', (e as Error).message);
      }
    }

    return {
      project_id: projectId,
      overall_health_score: healthScore,
      completion_percentage: completionPercentage,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_checklists: pendingChecklists,
      total_files_submitted: totalFilesSubmitted,
      identified_languages: Array.from(allLanguages),
      voice_transcripts: transcripts.slice(0, 5),
      risk_flags: pendingChecklists > 0 ? ['PENDING_UNVERIFIED_CHECKLISTS'] : [],
      executive_summary: executiveSummary,
      recommendations: recommendations,
    };
  },
};
