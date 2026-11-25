import { PostgresShardRouter } from './postgres-router';
import { MongoShardRouter } from './mongo-router';
import { RedisShardRouter } from './redis-cache';

export * from './postgres-router';
export * from './mongo-router';
export * from './redis-cache';

export interface NexoraDataRouter {
  postgres: PostgresShardRouter;
  mongo: MongoShardRouter;
  redis: RedisShardRouter;
  closeAll: () => Promise<void>;
}

function splitReplicas(envValue?: string): string[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Builds the unified Postgres + MongoDB + Redis shard router from environment variables.
 */
export function createShardRouterFromEnv(env: NodeJS.ProcessEnv = process.env): NexoraDataRouter {
  const defaultPg = 'postgresql://nexora:nexora@localhost:5432';
  const postgres = new PostgresShardRouter({
    globalUrl: env.PG_GLOBAL_URL ?? `${defaultPg}/nexora_global`,
    backupUrl: env.PG_BACKUP_URL,
    shards: {
      1: {
        primaryUrl: env.PG_SHARD1_PRIMARY_URL ?? `${defaultPg}/nexora_s1`,
        replicaUrls: splitReplicas(env.PG_SHARD1_REPLICAS),
      },
      2: {
        primaryUrl: env.PG_SHARD2_PRIMARY_URL ?? `${defaultPg}/nexora_s2`,
        replicaUrls: splitReplicas(env.PG_SHARD2_REPLICAS),
      },
      3: {
        primaryUrl: env.PG_SHARD3_PRIMARY_URL ?? `${defaultPg}/nexora_s3`,
        replicaUrls: splitReplicas(env.PG_SHARD3_REPLICAS),
      },
    },
  });

  const mongo = new MongoShardRouter({
    shards: {
      1: env.MONGO_SHARD1_URI ?? 'mongodb://localhost:27017/nexora_s1',
      2: env.MONGO_SHARD2_URI ?? 'mongodb://localhost:27017/nexora_s2',
      3: env.MONGO_SHARD3_URI ?? 'mongodb://localhost:27017/nexora_s3',
    },
  });

  const redis = new RedisShardRouter({
    globalUrl: env.REDIS_GLOBAL_URL ?? 'redis://localhost:6379',
    shards: {
      1: env.REDIS_SHARD1_URL ?? 'redis://localhost:6379',
      2: env.REDIS_SHARD2_URL ?? 'redis://localhost:6379',
      3: env.REDIS_SHARD3_URL ?? 'redis://localhost:6379',
    },
  });

  return {
    postgres,
    mongo,
    redis,
    closeAll: async () => {
      await Promise.all([postgres.closeAll(), mongo.closeAll(), redis.closeAll()]);
    },
  };
}
