// MongoDB Shards Initialization Script (Indexes for high-volume operational collections)
const dbs = ['nexora_s1', 'nexora_s2', 'nexora_s3'];
for (const name of dbs) {
  const shardDb = db.getSiblingDB(name);
  shardDb.field_logs.createIndex({ orgId: 1, projectId: 1, taskId: 1, createdAt: -1 });
  shardDb.transit_events.createIndex({ orgId: 1, projectId: 1, taskId: 1, timestamp: -1 });
  shardDb.form_submissions.createIndex({ orgId: 1, projectId: 1, stageId: 1, createdAt: -1 });
  shardDb.ai_raw_analyses.createIndex({ orgId: 1, projectId: 1, taskId: 1, createdAt: -1 });
}
