import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { generatePrefixedId } from '@nexora/shared-types';
import { dataRouter, s3Client, storageEnv } from '../config/s3';
import { AppError } from '../utils/http';

const ORG_QUOTA_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB

export function signClientReadToken(fileId: string, projectId: string, userId: string, expUnix: number): string {
  const payload = `${fileId}:${projectId}:${userId}:${expUnix}`;
  return crypto.createHmac('sha256', storageEnv.signedUrlSecret).update(payload).digest('hex');
}

export function verifyClientReadToken(
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

export const S3Service = {
  async uploadFile(input: {
    bucket?: string;
    file?: Express.Multer.File;
    projectId?: string;
    orgId?: string;
    stageId?: string;
    taskId?: string;
    uploadedBy?: string;
    tags?: string;
  }) {
    if (!input.bucket || !input.file) {
      throw new AppError(400, 'x-bucket-name header and multipart file are required');
    }
    if (!input.projectId || !input.orgId) {
      throw new AppError(400, 'projectId and orgId are required in body');
    }

    const fileId = generatePrefixedId('FIL');
    const safeName = input.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${input.orgId}/${input.projectId}/${input.stageId ?? 'general'}/${fileId}-${safeName}`;
    const parsedTags = input.tags ? JSON.parse(input.tags) : [];

    const shardPool = dataRouter.postgres.getPrimaryForOrg(input.orgId);
    const usageRes = await shardPool.query(
      `SELECT COALESCE(SUM(size_bytes), 0)::bigint AS used FROM media_assets WHERE org_id = $1`,
      [input.orgId],
    );
    const usedBytes = Number(usageRes.rows[0]?.used ?? 0);
    if (usedBytes + input.file.size > ORG_QUOTA_BYTES) {
      throw new AppError(413, 'Organization storage quota of 50 GB exceeded. Delete unused media files first.');
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: objectKey,
        Body: input.file.buffer,
        ContentType: input.file.mimetype,
      }),
    );

    await shardPool.query(
      `INSERT INTO media_assets (file_id, org_id, project_id, stage_id, task_id, bucket, object_key, mime_type, size_bytes, tags, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
      [
        fileId,
        input.orgId,
        input.projectId,
        input.stageId ?? null,
        input.taskId ?? null,
        input.bucket,
        objectKey,
        input.file.mimetype,
        input.file.size,
        JSON.stringify(parsedTags),
        input.uploadedBy ?? 'system',
      ],
    );

    return {
      fileId,
      projectId: input.projectId,
      bucket: input.bucket,
      objectKey,
      mimeType: input.file.mimetype,
      sizeBytes: input.file.size,
      tags: parsedTags,
      url: `/api/v1/storage/files/${fileId}`,
    };
  },

  async fetchProjectStream(orgId: string, projectId: string, fileId: string) {
    const shardPool = dataRouter.postgres.getReadPoolForOrg(orgId);
    const { rows } = await shardPool.query(
      `SELECT bucket, object_key, mime_type FROM media_assets WHERE file_id = $1 AND project_id = $2`,
      [fileId, projectId],
    );
    if (rows.length === 0) {
      throw new AppError(404, 'File not found or unauthorized for projectId');
    }
    const obj = await s3Client.send(new GetObjectCommand({ Bucket: rows[0].bucket, Key: rows[0].object_key }));
    return { mimeType: rows[0].mime_type as string, stream: obj.Body as Readable };
  },

  async deleteProjectFile(orgId: string, projectId: string, fileId: string) {
    const shardPool = dataRouter.postgres.getPrimaryForOrg(orgId);
    const { rows } = await shardPool.query(
      `SELECT bucket, object_key FROM media_assets WHERE file_id = $1 AND org_id = $2`,
      [fileId, orgId],
    );
    if (rows.length === 0) {
      throw new AppError(404, 'File not found');
    }
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: rows[0].bucket, Key: rows[0].object_key }));
    } catch (e) {
      console.warn('[storage-service] S3 delete warning:', (e as Error).message);
    }
    await shardPool.query(`DELETE FROM media_assets WHERE file_id = $1 AND org_id = $2`, [fileId, orgId]);
    return { deleted: true, fileId, projectId };
  },
};
