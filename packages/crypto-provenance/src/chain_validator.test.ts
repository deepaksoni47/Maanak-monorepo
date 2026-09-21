import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENESIS_PREV_HASH,
  generateProvenanceNode,
  validateSessionProvenanceChain,
  verifyObservationTamper,
  ProvenanceNodeInput,
} from './index.js';

describe('TASK-030: Provenance Chain Validator & Tamper Detector', () => {
  describe('Basic Validation & Edge Cases', () => {
    it('rejects an empty chain with EMPTY_CHAIN reason', () => {
      const result = validateSessionProvenanceChain([]);
      assert.equal(result.valid, false);
      assert.equal(result.failureReason, 'EMPTY_CHAIN');
      assert.equal(result.totalNodesChecked, 0);
    });

    it('rejects a chain where the first node is not sequence 0', () => {
      const node = generateProvenanceNode({
        testSessionId: 'sess-seq-fail',
        nodeSequence: 1, // should be 0
        nodeType: 'SESSION_INIT',
        payload: { event: 'INIT' },
      });

      const result = validateSessionProvenanceChain([node]);
      assert.equal(result.valid, false);
      assert.equal(result.failureReason, 'SEQUENCE_GAP');
      assert.equal(result.brokenAtIndex, 0);
    });

    it('rejects a chain where genesis node has non-zero previous hash', () => {
      const node = generateProvenanceNode({
        testSessionId: 'sess-gen-fail',
        nodeSequence: 0,
        nodeType: 'SESSION_INIT',
        previousNodeHashSha256: 'abcdef'.repeat(10) + '1234',
        payload: { event: 'INIT' },
      });

      // Force invalid previous hash
      node.previousNodeHashSha256 = '1111'.repeat(16);

      const result = validateSessionProvenanceChain([node]);
      assert.equal(result.valid, false);
      assert.equal(result.failureReason, 'INVALID_GENESIS_PREV_HASH');
      assert.equal(result.brokenAtIndex, 0);
      assert.equal(result.expectedHash, GENESIS_PREV_HASH);
    });

    it('rejects a chain with missing sequence numbers (gap detection)', () => {
      const n0 = generateProvenanceNode({
        testSessionId: 'sess-gap',
        nodeSequence: 0,
        nodeType: 'SESSION_INIT',
        payload: { step: 0 },
      });

      const n1 = generateProvenanceNode({
        testSessionId: 'sess-gap',
        nodeSequence: 1,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: n0.currentNodeHashSha256,
        payload: { step: 1 },
      });

      // Skip sequence 2, jump straight to sequence 3
      const n3 = generateProvenanceNode({
        testSessionId: 'sess-gap',
        nodeSequence: 3,
        nodeType: 'CALCULATION_RUN',
        previousNodeHashSha256: n1.currentNodeHashSha256,
        payload: { step: 3 },
      });

      const result = validateSessionProvenanceChain([n0, n1, n3]);
      assert.equal(result.valid, false);
      assert.equal(result.failureReason, 'SEQUENCE_GAP');
      assert.equal(result.brokenAtIndex, 2);
    });
  });

  describe('Valid Chain Traversal', () => {
    it('validates an intact 5-node session provenance chain without payloads', () => {
      const n0 = generateProvenanceNode({
        testSessionId: 'sess-intact-5',
        nodeSequence: 0,
        nodeType: 'SESSION_INIT',
        payload: { session: 'SES-001' },
      });

      const n1 = generateProvenanceNode({
        testSessionId: 'sess-intact-5',
        nodeSequence: 1,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: n0.currentNodeHashSha256,
        payload: { load: '2.50000000', indication: '2.50000000' },
      });

      const n2 = generateProvenanceNode({
        testSessionId: 'sess-intact-5',
        nodeSequence: 2,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: n1.currentNodeHashSha256,
        payload: { load: '5.00000000', indication: '5.00050000' },
      });

      const n3 = generateProvenanceNode({
        testSessionId: 'sess-intact-5',
        nodeSequence: 3,
        nodeType: 'CALCULATION_RUN',
        previousNodeHashSha256: n2.currentNodeHashSha256,
        payload: { status: 'COMPLIANT', maxRatio: '0.45' },
      });

      const n4 = generateProvenanceNode({
        testSessionId: 'sess-intact-5',
        nodeSequence: 4,
        nodeType: 'REVIEW_AUDIT',
        previousNodeHashSha256: n3.currentNodeHashSha256,
        payload: { decision: 'APPROVED', reviewer: 'reviewer@rrsl.gov.in' },
      });

      // Pass nodes as stored in database
      const result = validateSessionProvenanceChain([n0, n1, n2, n3, n4]);
      assert.equal(result.valid, true);
      assert.equal(result.totalNodesChecked, 5);
      assert.equal(result.brokenAtIndex, undefined);
    });

    it('validates an intact chain including raw payloads', () => {
      const payload0 = { event: 'INIT_SCALE', max: 15.0 };
      const payload1 = { event: 'LOAD_2.5KG', indication: 2.5 };

      const n0 = generateProvenanceNode({
        testSessionId: 'sess-with-payload',
        nodeSequence: 0,
        nodeType: 'SESSION_INIT',
        payload: payload0,
      });

      const n1 = generateProvenanceNode({
        testSessionId: 'sess-with-payload',
        nodeSequence: 1,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: n0.currentNodeHashSha256,
        payload: payload1,
      });

      const nodesWithPayload: ProvenanceNodeInput[] = [
        { ...n0, payload: payload0 },
        { ...n1, payload: payload1 },
      ];

      const result = validateSessionProvenanceChain(nodesWithPayload);
      assert.equal(result.valid, true);
      assert.equal(result.totalNodesChecked, 2);
    });
  });

  describe('TC-05 Ground Truth Acceptance: SQL Tampering Detection', () => {
    it('detects direct SQL tampering when raw indication is modified from 10.000 kg to 10.005 kg', () => {
      // 1. Construct valid 3-point weighing sequence
      const obs0Payload = {
        testClause: 'FORM_1',
        loadRunDirection: 'ASCENDING',
        targetLoadL: '0.00000000',
        displayedIndicationI: '0.00000000',
      };
      const node0 = generateProvenanceNode({
        id: 'node-uuid-0',
        testSessionId: 'sess-tc05',
        nodeSequence: 0,
        nodeType: 'OBSERVATION_LOG',
        payload: obs0Payload,
      });

      const obs1PayloadOriginal = {
        testClause: 'FORM_1',
        loadRunDirection: 'ASCENDING',
        targetLoadL: '10.00000000',
        displayedIndicationI: '10.00000000', // Original indication: 10.000 kg
      };
      const node1 = generateProvenanceNode({
        id: 'node-uuid-1',
        testSessionId: 'sess-tc05',
        nodeSequence: 1,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: node0.currentNodeHashSha256,
        payload: obs1PayloadOriginal,
      });

      const obs2Payload = {
        testClause: 'FORM_1',
        loadRunDirection: 'ASCENDING',
        targetLoadL: '15.00000000',
        displayedIndicationI: '15.00000000',
      };
      const node2 = generateProvenanceNode({
        id: 'node-uuid-2',
        testSessionId: 'sess-tc05',
        nodeSequence: 2,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: node1.currentNodeHashSha256,
        payload: obs2Payload,
      });

      // 2. Simulate SQL tampering:
      // An attacker runs: UPDATE raw_observations SET displayed_indication_i = 10.00500000 WHERE id = 1
      const obs1PayloadTampered = {
        testClause: 'FORM_1',
        loadRunDirection: 'ASCENDING',
        targetLoadL: '10.00000000',
        displayedIndicationI: '10.00500000', // Tampered indication: +5 g
      };

      // 3. Verify single-node tamper helper
      const singleCheck = verifyObservationTamper(node1, obs1PayloadTampered);
      assert.equal(singleCheck.isTampered, true);
      assert.notEqual(singleCheck.actualHash, singleCheck.expectedHash);

      // 4. Run chain validator with the tampered database payload at node 1
      const tamperedChain: ProvenanceNodeInput[] = [
        { ...node0, payload: obs0Payload },
        { ...node1, payload: obs1PayloadTampered },
        { ...node2, payload: obs2Payload },
      ];

      const validation = validateSessionProvenanceChain(tamperedChain);

      // Assert validation failure and precise identification of corrupted node
      assert.equal(validation.valid, false);
      assert.equal(validation.brokenAtIndex, 1);
      assert.equal(validation.brokenNodeId, 'node-uuid-1');
      assert.equal(validation.failureReason, 'PAYLOAD_TAMPERED');
      assert.ok(validation.details?.includes('sequence 1 was modified'));
    });

    it('detects broken hash linkage if an attacker rewrites currentNodeHash without updating child nodes', () => {
      const n0 = generateProvenanceNode({
        testSessionId: 'sess-link-break',
        nodeSequence: 0,
        nodeType: 'SESSION_INIT',
        payload: { a: 1 },
      });

      const n1 = generateProvenanceNode({
        testSessionId: 'sess-link-break',
        nodeSequence: 1,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: n0.currentNodeHashSha256,
        payload: { a: 2 },
      });

      const n2 = generateProvenanceNode({
        testSessionId: 'sess-link-break',
        nodeSequence: 2,
        nodeType: 'CALCULATION_RUN',
        previousNodeHashSha256: n1.currentNodeHashSha256,
        payload: { a: 3 },
      });

      // Attacker altered n1's recorded hash in database
      const tamperedN1 = {
        ...n1,
        currentNodeHashSha256: 'deadbeef'.repeat(8),
      };

      const result = validateSessionProvenanceChain([n0, tamperedN1, n2]);
      assert.equal(result.valid, false);
      assert.equal(result.brokenAtIndex, 2);
      assert.equal(result.failureReason, 'HASH_LINK_MISMATCH');
    });
  });
});
