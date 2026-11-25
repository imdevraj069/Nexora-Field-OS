import mongoose, { Connection } from 'mongoose';
import { ShardId, resolveShardFromOrgId } from '@nexora/shared-types';

export interface MongoRouterConfig {
  shards: Record<ShardId, string>;
}

/**
 * Maintains isolated Mongoose connections for MongoDB Shards 1, 2, and 3.
 */
export class MongoShardRouter {
  private readonly connections: Partial<Record<ShardId, Connection>> = {};

  constructor(private readonly config: MongoRouterConfig) {}

  async getConnection(shardId: ShardId): Promise<Connection> {
    const existing = this.connections[shardId];
    if (existing && existing.readyState === 1) {
      return existing;
    }

    const conn = mongoose.createConnection(this.config.shards[shardId], {
      maxPoolSize: 15,
      serverSelectionTimeoutMS: 5_000,
    });
    await conn.asPromise();
    this.connections[shardId] = conn;
    return conn;
  }

  async getConnectionForOrg(orgId: string): Promise<Connection> {
    return this.getConnection(resolveShardFromOrgId(orgId));
  }

  async closeAll(): Promise<void> {
    await Promise.allSettled(
      Object.values(this.connections)
        .filter((c): c is Connection => Boolean(c))
        .map((c) => c.close()),
    );
  }
}
