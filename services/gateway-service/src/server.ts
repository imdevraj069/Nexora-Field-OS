import http from 'node:http';
import express, { NextFunction, Response } from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { gatewayEnv, initGatewayMq } from './config/env';
import { AuthedRequest, authMiddleware, errorHandler } from './middlewares/auth';
import gatewayRoutes from './routes/gateway.routes';
import { createGraphqlRoot, gatewayGraphqlSchema } from './graphql/schema';
import { attachSocketServer } from './ws/socketServer';

async function bootstrap() {
  await initGatewayMq();
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'gateway-service', timestamp: new Date().toISOString() });
  });

  app.all('/graphql', authMiddleware, (req: AuthedRequest, res: Response, next: NextFunction) => {
    return createHandler({
      schema: gatewayGraphqlSchema,
      rootValue: createGraphqlRoot(req.auth!),
    })(req, res, next);
  });

  app.use('/api/v1', gatewayRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);
  await attachSocketServer(server);
  server.listen(gatewayEnv.port, () => {
    console.log(`[gateway-service] GraphQL + REST + WS listening on :${gatewayEnv.port}`);
  });
}

bootstrap();
