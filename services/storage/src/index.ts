import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import express, { Request, Response } from 'express';
import multer from 'multer';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { STORAGE_PROTO_PATH } from '@nexora/proto';
import { createShardRouterFromEnv } from '@nexora/shard-router';
import { generatePrefixedId } from '@nexora/shared-types';

const HTTP_PORT = Number(process.env.STORAGE_HTTP_PORT ?? 4002);
const GRPC_PORT = Number(process.env.STORAGE_GRPC_PORT ?? 50052);
const MASTER_STORAGE_KEY = process.env.MASTER_STORAGE_KEY ?? 'dev-master-storage-key';
const MASTER_READ_KEY = process.env.MASTER_READ_KEY ?? 'dev-master-read-key';
const SIGNED_URL_SECRET = process.env.SIGNED_URL_SECRET ?? 'dev-signed-url-secret';

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT ?? 'http://minio:9000',
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_STORAGE_ACCESS_KEY ?? 'nexora-storage-svc',
    secretAccessKey: process.env.MINIO_STORAGE_SECRET_KEY ?? 'nexora-storage-secret-123',
  },
});

const router = createShardRouterFromEnv();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 90 * 1024 * 1024 } });

function signClientReadToken(fileId: string, projectId: string, userId: string, expUnix: number): string {
  const payload = `${fileId}:${projectId}:${userId}:${expUnix}`;
  return crypto.createHmac('sha256', SIGNED_URL_SECRET).update(payload).digest('hex');
}

function verifyClientReadToken(
  fileId: string,
  projectId: string,
  userId: string,
  expUnix: number,
  signature: string,
): boolean {
  if (Date.now() / 1000 > expUnix) return false;
  const expected = signClientReadToken(fileId, projectId, userId, expUnix);
  return (
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'storage' });
});

/**
 * Internal Backend -> Storage Service upload endpoint.
 * Requires `x-master-storage-key` + `x-bucket-name` headers and `projectId`, `orgId`, `file`, optional `tags`.
 */
app.post('/api/v1/storage/upload', upload.single('file'), async (req: Request, res: Response) => {
  const masterKey = req.header('x-master-storage-key');
  const bucket = req.header('x-bucket-name');
  if (!masterKey || masterKey !== MASTER_STORAGE_KEY) {
    res.status(401).json({ error: 'Invalid x-master-storage-key' });
    return;
  }
  if (!bucket || !req.file) {
    res.status(400).json({ error: 'x-bucket-name header and multipart file are required' });
    return;
  }

  const { projectId, orgId, stageId, taskId, uploadedBy, tags } = req.body as Record<string, string>;
  if (!projectId || !orgId) {
    res.status(400).json({ error: 'projectId and orgId are required in body' });
    return;
  }

  const fileId = generatePrefixedId('FIL');
  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = `${orgId}/${projectId}/${stageId ?? 'general'}/${fileId}-${safeName}`;
  const parsedTags = tags ? JSON.parse(tags) : [];

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }),
  );

  const shardPool = router.postgres.getPrimaryForOrg(orgId);
  await shardPool.query(
    `INSERT INTO media_assets (file_id, org_id, project_id, stage_id, task_id, bucket, object_key, mime_type, size_bytes, tags, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
    [
      fileId,
      orgId,
      projectId,
      stageId ?? null,
      taskId ?? null,
      bucket,
      objectKey,
      req.file.mimetype,
      req.file.size,
      JSON.stringify(parsedTags),
      uploadedBy ?? 'system',
    ],
  );

  res.status(201).json({
    fileId,
    projectId,
    bucket,
    objectKey,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    tags: parsedTags,
    url: `/api/v1/storage/files/${fileId}`,
  });
});

/**
 * Internal Backend / AI Worker read endpoint gated by `x-master-read-key` + `x-project-id`.
 */
app.get('/api/v1/storage/internal/files/:fileId', async (req: Request, res: Response) => {
  const readKey = req.header('x-master-read-key');
  const projectId = req.header('x-project-id');
  const orgId = req.header('x-org-id');
  if (!readKey || readKey !== MASTER_READ_KEY || !projectId || !orgId) {
    res.status(401).json({ error: 'x-master-read-key, x-project-id, and x-org-id headers are required' });
    return;
  }

  const shardPool = router.postgres.getReadPoolForOrg(orgId);
  const { rows } = await shardPool.query(
    `SELECT bucket, object_key, mime_type FROM media_assets WHERE file_id = $1 AND project_id = $2`,
    [req.params.fileId, projectId],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'File not found or unauthorized for projectId' });
    return;
  }

  const obj = await s3.send(new GetObjectCommand({ Bucket: rows[0].bucket, Key: rows[0].object_key }));
  res.setHeader('Content-Type', rows[0].mime_type);
  (obj.Body as Readable).pipe(res);
});

/**
 * Client-facing signed file download endpoint (no master key exposed to clients).
 */
app.get('/api/v1/storage/files/:fileId', async (req: Request, res: Response) => {
  const { projectId, orgId, userId, exp, sig } = req.query as Record<string, string>;
  if (!projectId || !orgId || !userId || !exp || !sig) {
    res.status(400).json({ error: 'Missing signed URL query parameters' });
    return;
  }
  const fileId = String(req.params.fileId);
  if (!verifyClientReadToken(fileId, projectId, userId, Number(exp), sig)) {
    res.status(403).json({ error: 'Invalid or expired file signature' });
    return;
  }

  const shardPool = router.postgres.getReadPoolForOrg(orgId);
  const { rows } = await shardPool.query(
    `SELECT bucket, object_key, mime_type FROM media_assets WHERE file_id = $1 AND project_id = $2`,
    [fileId, projectId],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const obj = await s3.send(new GetObjectCommand({ Bucket: rows[0].bucket, Key: rows[0].object_key }));
  res.setHeader('Content-Type', rows[0].mime_type);
  (obj.Body as Readable).pipe(res);
});

function startGrpcServer(): void {
  const pkgDef = protoLoader.loadSync(STORAGE_PROTO_PATH, { keepCase: true, longs: String, enums: String });
  const proto = grpc.loadPackageDefinition(pkgDef) as unknown as {
    nexora: { storage: { StorageService: { service: grpc.ServiceDefinition } } };
  };

  const server = new grpc.Server();
  server.addService(proto.nexora.storage.StorageService.service, {
    MintSignedClientUrl: (
      call: grpc.ServerUnaryCall<
        { file_id: string; org_id: string; project_id: string; user_id: string; ttl_seconds?: number },
        unknown
      >,
      callback: grpc.sendUnaryData<unknown>,
    ) => {
      const ttl = call.request.ttl_seconds || 600;
      const exp = Math.floor(Date.now() / 1000) + ttl;
      const sig = signClientReadToken(call.request.file_id, call.request.project_id, call.request.user_id, exp);
      callback(null, {
        signed_url: `/api/v1/storage/files/${call.request.file_id}?orgId=${call.request.org_id}&projectId=${call.request.project_id}&userId=${call.request.user_id}&exp=${exp}&sig=${sig}`,
        expires_at: exp,
      });
    },
  });

  server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`[storage] gRPC listening on :${GRPC_PORT}`);
  });
}

app.listen(HTTP_PORT, () => console.log(`[storage] HTTP listening on :${HTTP_PORT}`));
startGrpcServer();
