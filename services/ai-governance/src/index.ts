import amqplib, { ConsumeMessage } from 'amqplib';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { AI_PROTO_PATH } from '@nexora/proto';
import { createShardRouterFromEnv } from '@nexora/shard-router';

const GRPC_PORT = Number(process.env.AI_GRPC_PORT ?? 50053);
const STORAGE_HTTP_URL = process.env.STORAGE_HTTP_URL ?? 'http://storage:4002';
const MASTER_READ_KEY = process.env.MASTER_READ_KEY ?? 'dev-master-read-key';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

const router = createShardRouterFromEnv();

interface AiJobPayload {
  orgId: string;
  projectId: string;
  taskId: string;
  userId: string;
  textNote: string;
  fileId: string | null;
  mimeType: string;
}

async function callGeminiText(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('replace-')) return null;
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  );
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function processAiJob(job: AiJobPayload): Promise<void> {
  let mediaSize = 0;
  if (job.fileId) {
    const resp = await fetch(`${STORAGE_HTTP_URL}/api/v1/storage/internal/files/${job.fileId}`, {
      headers: {
        'x-master-read-key': MASTER_READ_KEY,
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

  const pgPool = router.postgres.getPrimaryForOrg(job.orgId);
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
    const mongoConn = await router.mongo.getConnectionForOrg(job.orgId);
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
    console.warn('[ai-governance] MongoDB log write skipped:', (err as Error).message);
  }
}

function startGrpcServer(): void {
  const pkgDef = protoLoader.loadSync(AI_PROTO_PATH, { keepCase: true, longs: String, enums: String });
  const proto = grpc.loadPackageDefinition(pkgDef) as unknown as {
    nexora: { ai: { AiGovernanceService: { service: grpc.ServiceDefinition } } };
  };

  const server = new grpc.Server();
  server.addService(proto.nexora.ai.AiGovernanceService.service, {
    GenerateProjectBlueprint: async (
      call: grpc.ServerUnaryCall<{ org_id: string; prompt: string; industry_hint: string }, unknown>,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      try {
        const llmRaw = await callGeminiText(
          `Convert this field operations project request into JSON with {suggested_title, summary, stages: [{name, order_index, recommended_role}]}. Request: ${call.request.prompt}`,
        );
        if (llmRaw) {
          callback(null, JSON.parse(llmRaw));
          return;
        }
      } catch {
        // Fallback to deterministic blueprint
      }

      callback(null, {
        suggested_title: `Field Rollout: ${call.request.prompt.slice(0, 48)}`,
        summary: `AI-structured execution plan for ${call.request.industry_hint || 'field operations'}`,
        stages: [
          { name: 'Lead & Material Procurement', order_index: 1, recommended_role: 'Manager' },
          { name: 'Transit & Logistics Dispatch', order_index: 2, recommended_role: 'Transit Partner' },
          { name: 'On-Field Execution & Evidence', order_index: 3, recommended_role: 'Field Worker' },
          { name: 'Supervisor Verification & Handover', order_index: 4, recommended_role: 'Supervisor' },
        ],
      });
    },
  });

  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[ai-governance] gRPC listening on :${GRPC_PORT}`);
  });
}

async function startConsumer(): Promise<void> {
  if (!process.env.RABBITMQ_URL) return;
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue('ai_jobs', { durable: true });
    await channel.prefetch(5);
    channel.consume('ai_jobs', async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        await processAiJob(JSON.parse(msg.content.toString()) as AiJobPayload);
        channel.ack(msg);
      } catch (err) {
        console.error('[ai-governance] Failed job:', (err as Error).message);
        channel.nack(msg, false, false);
      }
    });
  } catch (err) {
    console.warn('[ai-governance] RabbitMQ unavailable:', (err as Error).message);
  }
}

startGrpcServer();
startConsumer();
