import { createHash } from 'node:crypto';

/**
 * WELMEC 7.2 Genesis Hash Constant: 64 hexadecimal zeros.
 * Represents NodeHash(-1) for the root/genesis node of a test session.
 */
export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * Deterministic JSON Canonicalization Scheme (RFC 8785 subset).
 * Recursively sorts all object keys in lexicographical order (UTF-16 code units)
 * and eliminates non-semantic whitespace to ensure identical cryptographic hashes.
 */
export function canonicalJsonStringify(val: any): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }

  if (val instanceof Date) {
    return JSON.stringify(val.toISOString());
  }

  // Handle Decimal types (e.g. Prisma.Decimal, Decimal.js)
  if (typeof val.toFixed === 'function' && (typeof val.d === 'object' || typeof val.s === 'number')) {
    return JSON.stringify(val.toString());
  }

  if (Array.isArray(val)) {
    const items = val.map((item) => canonicalJsonStringify(item));
    return `[${items.join(',')}]`;
  }

  // Object: sort keys strictly
  const sortedKeys = Object.keys(val).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const v = val[key];
    if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
      entries.push(`${JSON.stringify(key)}:${canonicalJsonStringify(v)}`);
    }
  }

  return `{${entries.join(',')}}`;
}

/**
 * Computes standard SHA-256 hexadecimal digest of input string or buffer.
 */
export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Computes the SHA-256 hash of a payload after canonical JSON serialization.
 */
export function computePayloadHash(payload: any): string {
  const canonical = canonicalJsonStringify(payload);
  return sha256(canonical);
}

/**
 * WELMEC 7.2 Hash Chain Node Formula:
 * NodeHash_i = SHA256(NodeHash_{i-1} + CanonicalJSON(Payload_i))
 *
 * Computes the cryptographic node hash for an observation record.
 */
export function computeObservationHash(obs: any, prevHash: string = GENESIS_PREV_HASH): string {
  const canonicalPayload = canonicalJsonStringify(obs);
  return sha256(prevHash + canonicalPayload);
}

/**
 * Generic node hash calculator for any event payload in the provenance graph.
 */
export function computeNodeHash(prevHash: string, payload: any): string {
  const canonicalPayload = canonicalJsonStringify(payload);
  return sha256(prevHash + canonicalPayload);
}

export type ProvenanceNodeType =
  | 'SESSION_INIT'
  | 'OBSERVATION_LOG'
  | 'CALCULATION_RUN'
  | 'REVIEW_AUDIT'
  | 'PDF_SIGN'
  | string;

export interface GenerateProvenanceNodeParams {
  id?: string;
  testSessionId: string;
  nodeSequence: number;
  nodeType: ProvenanceNodeType;
  previousNodeHashSha256?: string | null;
  payload: any;
  createdAt?: Date;
}

export interface ProvenanceNodeRecord {
  id?: string;
  testSessionId: string;
  nodeSequence: number;
  nodeType: string;
  previousNodeHashSha256: string;
  payloadHashSha256: string;
  currentNodeHashSha256: string;
  createdAt: Date;
}

/**
 * Generates an immutable, cryptographically chained ProvenanceNode record.
 * For genesis nodes (sequence 0), defaults previousNodeHashSha256 to 64 zeros.
 */
export function generateProvenanceNode(params: GenerateProvenanceNodeParams): ProvenanceNodeRecord {
  const previousHash =
    params.previousNodeHashSha256 && params.previousNodeHashSha256.length === 64
      ? params.previousNodeHashSha256
      : GENESIS_PREV_HASH;

  const payloadHash = computePayloadHash(params.payload);
  const currentNodeHash = computeNodeHash(previousHash, params.payload);

  return {
    id: params.id,
    testSessionId: params.testSessionId,
    nodeSequence: params.nodeSequence,
    nodeType: params.nodeType,
    previousNodeHashSha256: previousHash,
    payloadHashSha256: payloadHash,
    currentNodeHashSha256: currentNodeHash,
    createdAt: params.createdAt ?? new Date(),
  };
}

/**
 * Validates whether a given provenance node's currentNodeHashSha256 accurately
 * derives from its previous hash and raw payload.
 */
export function verifyNodeHash(
  node: { previousNodeHashSha256: string; currentNodeHashSha256: string },
  payload: any
): boolean {
  const expected = computeNodeHash(node.previousNodeHashSha256, payload);
  return expected.toLowerCase() === node.currentNodeHashSha256.toLowerCase();
}
