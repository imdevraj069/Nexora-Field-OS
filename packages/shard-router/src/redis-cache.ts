import Redis from 'ioredis';
import { ShardId, resolveShardFromOrgId } from '@nexora/shared-types';

export interface RedisRouterConfig {
  globalUrl: string;
  shards: Record<ShardId, string>;
}

/**
 * Formats cache keys strictly scoped by shard and tenant: `s{shard}:{orgId}:{scope}:{id}`.
 */
export function buildTenantCacheKey(shardId: ShardId, orgId: string, scope: string, id: string): string {
  return `s${shardId}:${orgId.toUpperCase()}:${scope}:${id}`;
}

export class RedisShardRouter {
  private readonly globalClient: Redis;
  private readonly shardClients: Record<ShardId, Redis>;

  constructor(config: RedisRouterConfig) {
    this.globalClient = new Redis(config.globalUrl, { lazyConnect: true, maxRetriesPerRequest: 3 });
    this.shardClients = {
      1: new Redis(config.shards[1], { lazyConnect: true, maxRetriesPerRequest: 3 }),
      2: new Redis(config.shards[2], { lazyConnect: true, maxRetriesPerRequest: 3 }),
      3: new Redis(config.shards[3], { lazyConnect: true, maxRetriesPerRequest: 3 }),
    };
  }

  getGlobalClient(): Redis {
    return this.globalClient;
  }

  getShardClient(shardId: ShardId): Redis {
    return this.shardClients[shardId];
  }

  getClientForOrg(orgId: string): Redis {
    return this.getShardClient(resolveShardFromOrgId(orgId));
  }

  async getOrSetJson<T>(
    orgId: string,
    scope: string,
    id: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const shardId = resolveShardFromOrgId(orgId);
    const client = this.getShardClient(shardId);
    const key = buildTenantCacheKey(shardId, orgId, scope, id);

    const cached = await client.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const fresh = await fetcher();
    await client.set(key, JSON.stringify(fresh), 'EX', ttlSeconds);
    return fresh;
  }

  async invalidate(orgId: string, scope: string, id: string): Promise<void> {
    const shardId = resolveShardFromOrgId(orgId);
    const client = this.getShardClient(shardId);
    const key = buildTenantCacheKey(shardId, orgId, scope, id);
    await client.del(key);
  }

  async closeAll(): Promise<void> {
    const clients = [this.globalClient, ...Object.values(this.shardClients)];
    await Promise.allSettled(clients.map((c) => c.quit()));
  }
}
