export type ShardId = 1 | 2 | 3;

const BASE36_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ORG_INITIALS_REGEX = /^[A-Z]{3}$/;
const ORG_ID_REGEX = /^([A-Z]{3})-(\d{2})-([0-9A-Z]{5})$/;

function secureRandomIndex(maxExclusive: number): number {
  const arr = new Uint32Array(1);
  globalThis.crypto.getRandomValues(arr);
  return arr[0] % maxExclusive;
}

/**
 * Generates a unique Organization ID in the format `{ORG}-{YY}-{UNIQUEID}`.
 * Example: `SOL-26-AX65T`.
 */
export function generateOrgId(orgInitials: string, date: Date = new Date()): string {
  const normalized = orgInitials.trim().toUpperCase();
  if (!ORG_INITIALS_REGEX.test(normalized)) {
    throw new Error(`Invalid org initials "${orgInitials}": must be exactly 3 uppercase letters A-Z.`);
  }

  const yy = String(date.getUTCFullYear()).slice(-2);
  let uniqueId = '';
  for (let i = 0; i < 5; i += 1) {
    uniqueId += BASE36_ALPHABET[secureRandomIndex(BASE36_ALPHABET.length)];
  }
  return `${normalized}-${yy}-${uniqueId}`;
}

/**
 * Validates `{ORG}-{YY}-{UNIQUEID}` and returns parsed segments.
 */
export function parseOrgId(orgId: string): { initials: string; year: string; uniqueId: string } {
  const normalized = orgId.trim().toUpperCase();
  const match = ORG_ID_REGEX.exec(normalized);
  if (!match) {
    throw new Error(`Invalid orgId "${orgId}": expected format {ORG}-{YY}-{UNIQUEID}.`);
  }
  return {
    initials: match[1],
    year: match[2],
    uniqueId: match[3],
  };
}

/**
 * Deterministically maps an Org ID to Shard 1, 2, or 3 using `UNIQUEID[0]`:
 * - `0-9` and `A-C` -> Shard 1 (13/36 = 36.1%)
 * - `D-O`           -> Shard 2 (12/36 = 33.3%)
 * - `P-Z`           -> Shard 3 (11/36 = 30.6%)
 */
export function resolveShardFromOrgId(orgId: string): ShardId {
  const { uniqueId } = parseOrgId(orgId);
  const firstChar = uniqueId[0];

  if ((firstChar >= '0' && firstChar <= '9') || (firstChar >= 'A' && firstChar <= 'C')) {
    return 1;
  }
  if (firstChar >= 'D' && firstChar <= 'O') {
    return 2;
  }
  if (firstChar >= 'P' && firstChar <= 'Z') {
    return 3;
  }

  throw new Error(`Unexpected shard key character "${firstChar}" in orgId "${orgId}".`);
}

/**
 * Generates prefixed immutable entity identifiers (e.g., `USR-AX91K2B0`).
 */
export function generatePrefixedId(prefix: 'USR' | 'PRJ' | 'STG' | 'TSK' | 'FIL'): string {
  let token = '';
  for (let i = 0; i < 10; i += 1) {
    token += BASE36_ALPHABET[secureRandomIndex(BASE36_ALPHABET.length)];
  }
  return `${prefix}-${token}`;
}
