import express from 'express';
import { storageEnv } from './config/s3';
import storageRoutes from './routes/storage.routes';
import { errorHandler } from './middlewares/auth';
import { startStorageGrpcServer } from './grpc/storageGrpcServer';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'storage-service', timestamp: new Date().toISOString() });
});

app.use('/api/v1/storage', storageRoutes);
app.use(errorHandler);

app.listen(storageEnv.httpPort, () => {
  console.log(`[storage-service] HTTP listening on :${storageEnv.httpPort}`);
});
startStorageGrpcServer();
