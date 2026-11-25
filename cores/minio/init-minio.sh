#!/bin/sh
set -eu

MINIO_ALIAS="nexora_local"
ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"

echo "[minio-init] Waiting for MinIO at ${ENDPOINT}..."
until mc alias set "${MINIO_ALIAS}" "${ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; do
  sleep 2
done

echo "[minio-init] Creating private buckets..."
for BUCKET in nexora-media nexora-docs nexora-backups; do
  mc mb --ignore-existing "${MINIO_ALIAS}/${BUCKET}"
  mc anonymous set none "${MINIO_ALIAS}/${BUCKET}"
done

echo "[minio-init] Applying 1-day lifecycle cleanup for temporary chunk uploads..."
cat <<'EOF' > /tmp/tmp-cleanup-lifecycle.json
{
  "Rules": [
    {
      "ID": "expire-tmp-upload-chunks",
      "Status": "Enabled",
      "Filter": { "Prefix": "tmp/" },
      "Expiration": { "Days": 1 }
    }
  ]
}
EOF
mc ilm import "${MINIO_ALIAS}/nexora-media" < /tmp/tmp-cleanup-lifecycle.json || true
mc ilm import "${MINIO_ALIAS}/nexora-docs" < /tmp/tmp-cleanup-lifecycle.json || true

echo "[minio-init] Provisioning storage-service IAM user & least-privilege policy..."
cat <<'EOF' > /tmp/storage-svc-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::nexora-media",
        "arn:aws:s3:::nexora-docs",
        "arn:aws:s3:::nexora-backups"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::nexora-media/*",
        "arn:aws:s3:::nexora-docs/*",
        "arn:aws:s3:::nexora-backups/*"
      ]
    }
  ]
}
EOF

mc admin policy create "${MINIO_ALIAS}" nexora-storage-policy /tmp/storage-svc-policy.json || true
mc admin user add "${MINIO_ALIAS}" "${MINIO_STORAGE_ACCESS_KEY}" "${MINIO_STORAGE_SECRET_KEY}" || true
mc admin policy attach "${MINIO_ALIAS}" nexora-storage-policy --user "${MINIO_STORAGE_ACCESS_KEY}" || true

echo "[minio-init] Completed bucket and policy initialization."
