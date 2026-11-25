import { S3Client } from '@aws-sdk/client-s3';
import { createShardRouterFromEnv } from '@nexora/shard-router';

export const storageEnv = {
  httpPort: Number(process.env.STORAGE_HTTP_PORT ?? 4002),
  grpcPort: Number(process.env.STORAGE_GRPC_PORT ?? 50052),
  masterStorageKey: process.env.MASTER_STORAGE_KEY ?? 'dev-master-storage-key',
  masterReadKey: process.env.MASTER_READ_KEY ?? 'dev-master-read-key',
  signedUrlSecret: process.env.SIGNED_URL_SECRET ?? 'dev-signed-url-secret',
};

export const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT ?? 'http://minio:9000',
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_STORAGE_ACCESS_KEY ?? 'nexora-storage-svc',
    secretAccessKey: process.env.MINIO_STORAGE_SECRET_KEY ?? 'nexora-storage-secret-123',
  },
});

export const dataRouter = createShardRouterFromEnv();
