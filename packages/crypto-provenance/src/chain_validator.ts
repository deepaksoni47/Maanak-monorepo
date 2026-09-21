import {
  GENESIS_PREV_HASH,
  computePayloadHash,
  computeNodeHash,
  verifyNodeHash,
} from './hasher.js';

export interface ProvenanceNodeInput {
  id?: string;
  testSessionId?: string;
  nodeSequence: number;
  nodeType?: string;
  previousNodeHashSha256?: string;
  payloadHashSha256?: string;
  currentNodeHashSha256?: string;
  payload?: any;
  createdAt?: Date | string;
}

export type ChainValidationFailureReason =
  | 'EMPTY_CHAIN'
  | 'INVALID_GENESIS_PREV_HASH'
  | 'SEQUENCE_GAP'
  | 'HASH_LINK_MISMATCH'
  | 'PAYLOAD_TAMPERED'
  | 'DERIVATION_MISMATCH';

export interface ProvenanceValidationResult {
  valid: boolean;
  totalNodesChecked: number;
  brokenAtIndex?: number;
  brokenNodeId?: string;
  failureReason?: ChainValidationFailureReason;
  expectedHash?: string;
  actualHash?: string;
  details?: string;
}

/**
 * Validates the cryptographic integrity of a WELMEC 7.2 session provenance chain.
 * Traverses the chain from root to leaf, validating:
 * 1. Genesis node has the standard 64-zero previous hash.
 * 2. Sequence continuity (no gaps or out-of-order nodes).
 * 3. Linkage integrity (node[i].previousNodeHashSha256 == node[i-1].currentNodeHashSha256).
 * 4. Payload integrity (payloadHash matches SHA256(canonical(payload))).
 * 5. Node derivation integrity (currentNodeHash matches SHA256(prevHash + canonical(payload))).
 */
export function validateSessionProvenanceChain(
  nodes: ProvenanceNodeInput[]
): ProvenanceValidationResult {
  if (!nodes || nodes.length === 0) {
    return {
      valid: false,
      totalNodesChecked: 0,
      failureReason: 'EMPTY_CHAIN',
      details: 'Provenance chain contains zero nodes.',
    };
  }

  // Sort nodes in ascending sequence order to ensure traversal matches timeline
  const sortedNodes = [...nodes].sort((a, b) => a.nodeSequence - b.nodeSequence);

  // 1. Verify Genesis Node (Sequence 0)
  const genesis = sortedNodes[0];

  if (genesis.nodeSequence !== 0) {
    return {
      valid: false,
      totalNodesChecked: 1,
      brokenAtIndex: 0,
      brokenNodeId: genesis.id,
      failureReason: 'SEQUENCE_GAP',
      details: `First node has sequence ${genesis.nodeSequence}, expected genesis sequence 0.`,
    };
  }

  const genesisPrevHash = (genesis.previousNodeHashSha256 || '').toLowerCase();
  if (genesisPrevHash !== GENESIS_PREV_HASH.toLowerCase()) {
    return {
      valid: false,
      totalNodesChecked: 1,
      brokenAtIndex: 0,
      brokenNodeId: genesis.id,
      failureReason: 'INVALID_GENESIS_PREV_HASH',
      expectedHash: GENESIS_PREV_HASH,
      actualHash: genesis.previousNodeHashSha256,
      details: `Genesis node (sequence 0) previous hash does not match 64-zero genesis constant.`,
    };
  }

  // Verify genesis payload derivation if payload is attached
  if (genesis.payload !== undefined) {
    if (genesis.payloadHashSha256) {
      const computedPayloadHash = computePayloadHash(genesis.payload);
      if (computedPayloadHash.toLowerCase() !== genesis.payloadHashSha256.toLowerCase()) {
        return {
          valid: false,
          totalNodesChecked: 1,
          brokenAtIndex: 0,
          brokenNodeId: genesis.id,
          failureReason: 'PAYLOAD_TAMPERED',
          expectedHash: genesis.payloadHashSha256,
          actualHash: computedPayloadHash,
          details: `Genesis node payload does not match recorded payloadHashSha256.`,
        };
      }
    }

    if (genesis.currentNodeHashSha256) {
      const computedNodeHash = computeNodeHash(GENESIS_PREV_HASH, genesis.payload);
      if (computedNodeHash.toLowerCase() !== genesis.currentNodeHashSha256.toLowerCase()) {
        return {
          valid: false,
          totalNodesChecked: 1,
          brokenAtIndex: 0,
          brokenNodeId: genesis.id,
          failureReason: 'DERIVATION_MISMATCH',
          expectedHash: genesis.currentNodeHashSha256,
          actualHash: computedNodeHash,
          details: `Genesis currentNodeHashSha256 does not match cryptographic derivation from payload.`,
        };
      }
    }
  }

  // 2. Traverse subsequent nodes
  for (let i = 1; i < sortedNodes.length; i++) {
    const prevNode = sortedNodes[i - 1];
    const currNode = sortedNodes[i];

    // Check sequence continuity
    if (currNode.nodeSequence !== prevNode.nodeSequence + 1) {
      return {
        valid: false,
        totalNodesChecked: i + 1,
        brokenAtIndex: i,
        brokenNodeId: currNode.id,
        failureReason: 'SEQUENCE_GAP',
        details: `Sequence gap detected: expected nodeSequence ${prevNode.nodeSequence + 1}, found ${currNode.nodeSequence}.`,
      };
    }

    // Check cryptographic parent-child hash linkage
    const expectedParentHash = (prevNode.currentNodeHashSha256 || '').toLowerCase();
    const actualChildPrevHash = (currNode.previousNodeHashSha256 || '').toLowerCase();

    if (actualChildPrevHash !== expectedParentHash) {
      return {
        valid: false,
        totalNodesChecked: i + 1,
        brokenAtIndex: i,
        brokenNodeId: currNode.id,
        failureReason: 'HASH_LINK_MISMATCH',
        expectedHash: expectedParentHash,
        actualHash: currNode.previousNodeHashSha256,
        details: `Hash link broken between sequence ${prevNode.nodeSequence} and ${currNode.nodeSequence}.`,
      };
    }

    // If payload is attached, verify payload hash and node hash derivation
    if (currNode.payload !== undefined) {
      if (currNode.payloadHashSha256) {
        const computedPayloadHash = computePayloadHash(currNode.payload);
        if (computedPayloadHash.toLowerCase() !== currNode.payloadHashSha256.toLowerCase()) {
          return {
            valid: false,
            totalNodesChecked: i + 1,
            brokenAtIndex: i,
            brokenNodeId: currNode.id,
            failureReason: 'PAYLOAD_TAMPERED',
            expectedHash: currNode.payloadHashSha256,
            actualHash: computedPayloadHash,
            details: `Payload at sequence ${currNode.nodeSequence} was modified (payload hash mismatch).`,
          };
        }
      }

      if (currNode.currentNodeHashSha256 && currNode.previousNodeHashSha256) {
        const computedNodeHash = computeNodeHash(currNode.previousNodeHashSha256, currNode.payload);
        if (computedNodeHash.toLowerCase() !== currNode.currentNodeHashSha256.toLowerCase()) {
          return {
            valid: false,
            totalNodesChecked: i + 1,
            brokenAtIndex: i,
            brokenNodeId: currNode.id,
            failureReason: 'DERIVATION_MISMATCH',
            expectedHash: currNode.currentNodeHashSha256,
            actualHash: computedNodeHash,
            details: `Node hash at sequence ${currNode.nodeSequence} does not match cryptographic derivation from payload.`,
          };
        }
      }
    }
  }

  return {
    valid: true,
    totalNodesChecked: sortedNodes.length,
  };
}

/**
 * Checks if a specific observation record has been tampered with compared to its recorded provenance node.
 */
export function verifyObservationTamper(
  recordedNode: { previousNodeHashSha256: string; currentNodeHashSha256: string },
  currentObservationPayload: any
): { isTampered: boolean; expectedHash: string; actualHash: string } {
  const actualHash = computeNodeHash(
    recordedNode.previousNodeHashSha256,
    currentObservationPayload
  );
  const isTampered =
    actualHash.toLowerCase() !== recordedNode.currentNodeHashSha256.toLowerCase();

  return {
    isTampered,
    expectedHash: recordedNode.currentNodeHashSha256,
    actualHash,
  };
}
