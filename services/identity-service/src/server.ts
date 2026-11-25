import express from 'express';
import { envConfig, initRabbitMq } from './config/env';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler';
import { startIdentityGrpcServer } from './grpc/identityGrpcServer';

async function bootstrap() {
  await initRabbitMq();
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'identity-service', timestamp: new Date().toISOString() });
  });
  app.get('/api/v1/auth/health', (_req, res) => {
    res.json({ status: 'ok', service: 'identity-service', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);

  app.listen(envConfig.httpPort, () => {
    console.log(`[identity-service] HTTP listening on :${envConfig.httpPort}`);
  });
  startIdentityGrpcServer();
}

bootstrap();
