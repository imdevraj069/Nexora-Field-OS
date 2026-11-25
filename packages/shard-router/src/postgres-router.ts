import { Pool, PoolConfig } from 'pg';
import { ShardId, resolveShardFromOrgId } from '@nexora/shared-types';

export interface PostgresShardConfig {
  primaryUrl: string;
  replicaUrls: string[];
}

export interface PostgresRouterConfig {
  globalUrl: string;
  backupUrl?: string;
  shards: Record<ShardId, PostgresShardConfig>;
  maxPoolSize?: number;
}

/**
 * Manages PostgreSQL connection pools across:
 * - Global Control Plane (`users`, `org_directory`, `project_collaborators`)
 * - 3 Shards (each with 1 Primary + up to 3 Read Replicas using round-robin)
 * - Optional Consolidated Logical-Replication Backup Primary
 */
export class PostgresShardRouter {
  private readonly globalPool: Pool;
  private readonly backupPool?: Pool;
  private readonly shardPrimaries: Record<ShardId, Pool>;
  private readonly shardReplicas: Record<ShardId, Pool[]>;
  private readonly replicaCursors: Record<ShardId, number> = { 1: 0, 2: 0, 3: 0 };

  constructor(config: PostgresRouterConfig) {
    const poolBase: Partial<PoolConfig> = {
      max: config.maxPoolSize ?? 15,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    };

    this.globalPool = new Pool({ connectionString: config.globalUrl, ...poolBase });
    if (config.backupUrl) {
      this.backupPool = new Pool({ connectionString: config.backupUrl, ...poolBase });
    }

    this.shardPrimaries = {
      1: new Pool({ connectionString: config.shards[1].primaryUrl, ...poolBase }),
      2: new Pool({ connectionString: config.shards[2].primaryUrl, ...poolBase }),
      3: new Pool({ connectionString: config.shards[3].primaryUrl, ...poolBase }),
    };

    this.shardReplicas = {
      1: this.buildReplicaPools(config.shards[1], poolBase),
      2: this.buildReplicaPools(config.shards[2], poolBase),
      3: this.buildReplicaPools(config.shards[3], poolBase),
    };
  }

  private buildReplicaPools(shardCfg: PostgresShardConfig, base: Partial<PoolConfig>): Pool[] {
    const urls = shardCfg.replicaUrls.filter((u) => u.trim().length > 0);
    if (urls.length === 0) {
      return [];
    }
    return urls.map((url) => new Pool({ connectionString: url, ...base }));
  }

  getGlobalPool(): Pool {
    return this.globalPool;
  }

  getBackupPool(): Pool | undefined {
    return this.backupPool;
  }

  getPrimaryPool(shardId: ShardId): Pool {
    return this.shardPrimaries[shardId];
  }

  getPrimaryForOrg(orgId: string): Pool {
    return this.getPrimaryPool(resolveShardFromOrgId(orgId));
  }

  /**
   * Returns a read-replica pool in round-robin order for the given shard.
   * Falls back to the shard primary if no read replicas are configured or `forcePrimary` is set.
   */
  getReadPool(shardId: ShardId, forcePrimary = false): Pool {
    if (forcePrimary) {
      return this.shardPrimaries[shardId];
    }
    const replicas = this.shardReplicas[shardId];
    if (replicas.length === 0) {
      return this.shardPrimaries[shardId];
    }
    const idx = this.replicaCursors[shardId] % replicas.length;
    this.replicaCursors[shardId] = (idx + 1) % replicas.length;
    return replicas[idx];
  }

  getReadPoolForOrg(orgId: string, forcePrimary = false): Pool {
    return this.getReadPool(resolveShardFromOrgId(orgId), forcePrimary);
  }

  async closeAll(): Promise<void> {
    const pools: Pool[] = [
      this.globalPool,
      ...(this.backupPool ? [this.backupPool] : []),
      ...Object.values(this.shardPrimaries),
      ...Object.values(this.shardReplicas).flat(),
    ];
    await Promise.allSettled(pools.map((p) => p.end()));
  }
}
