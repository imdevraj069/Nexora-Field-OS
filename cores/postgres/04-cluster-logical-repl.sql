-- Consolidated Backup Primary (Cluster Profile)
-- Run on pg-backup after pg-shard1, pg-shard2, and pg-shard3 primaries are up with wal_level=logical.
-- Each shard runs:
--   CREATE PUBLICATION nexora_shard_pub FOR TABLE
--     organizations, roles, org_members, projects, stages, tasks,
--     workflow_transitions, media_assets, task_efficiency_scores;

-- On pg-backup, create subscriptions from all 3 shards into the single consolidated database:
-- CREATE SUBSCRIPTION sub_shard1 CONNECTION 'host=pg-shard1 port=5432 dbname=nexora_s1 user=nexora password=...' PUBLICATION nexora_shard_pub;
-- CREATE SUBSCRIPTION sub_shard2 CONNECTION 'host=pg-shard2 port=5432 dbname=nexora_s2 user=nexora password=...' PUBLICATION nexora_shard_pub;
-- CREATE SUBSCRIPTION sub_shard3 CONNECTION 'host=pg-shard3 port=5432 dbname=nexora_s3 user=nexora password=...' PUBLICATION nexora_shard_pub;
SELECT 1;
