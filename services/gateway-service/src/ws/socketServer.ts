import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { dataRouter } from '../config/env';

export async function attachSocketServer(server: http.Server): Promise<SocketIOServer> {
  const io = new SocketIOServer(server, { cors: { origin: '*' } });

  try {
    const pubClient = dataRouter.redis.getGlobalClient();
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch {
    console.warn('[gateway-service] Redis Socket.IO adapter unavailable, running single-node WS');
  }

  io.on('connection', (socket) => {
    socket.on('join:project', ({ projectId }: { projectId: string }) => {
      socket.join(`project:${projectId}`);
    });
    socket.on('transit:ping', (payload: { projectId: string; taskId: string; lat: number; lng: number }) => {
      io.to(`project:${payload.projectId}`).emit('transit:update', { ...payload, ts: Date.now() });
    });
  });

  return io;
}
