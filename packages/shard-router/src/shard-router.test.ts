import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTenantCacheKey, PostgresShardRouter } from './index';

test('buildTenantCacheKey namespaces keys by shard and uppercase orgId', () => {
  assert.equal(buildTenantCacheKey(1, 'sol-26-ax65t', 'rbac', 'usr_1'), 's1:SOL-26-AX65T:rbac:usr_1');
  assert.equal(buildTenantCacheKey(2, 'FAC-26-D991A', 'project', 'prj_9'), 's2:FAC-26-D991A:project:prj_9');
});

test('PostgresShardRouter round-robins across 3 read replicas and supports forcePrimary', async () => {
  const router = new PostgresShardRouter({
    globalUrl: 'postgresql://u:p@localhost:5432/global',
    shards: {
      1: {
        primaryUrl: 'postgresql://u:p@primary1:5432/s1',
        replicaUrls: [
          'postgresql://u:p@r1a:5432/s1',
          'postgresql://u:p@r1b:5432/s1',
          'postgresql://u:p@r1c:5432/s1',
        ],
      },
      2: { primaryUrl: 'postgresql://u:p@primary2:5432/s2', replicaUrls: [] },
      3: { primaryUrl: 'postgresql://u:p@primary3:5432/s3', replicaUrls: [] },
    },
  });

  const p1 = router.getReadPoolForOrg('SOL-26-A1111');
  const p2 = router.getReadPoolForOrg('SOL-26-A1111');
  const p3 = router.getReadPoolForOrg('SOL-26-A1111');
  const p4 = router.getReadPoolForOrg('SOL-26-A1111');
  const forced = router.getReadPoolForOrg('SOL-26-A1111', true);

  assert.notEqual(p1, p2);
  assert.notEqual(p2, p3);
  assert.equal(p1, p4); // wraps cleanly across 3 replicas
  assert.equal(forced, router.getPrimaryForOrg('SOL-26-A1111'));
  assert.equal(router.getReadPoolForOrg('LOG-26-D1111'), router.getPrimaryPool(2));

  await router.closeAll();
});
