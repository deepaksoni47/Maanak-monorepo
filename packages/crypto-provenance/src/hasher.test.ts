import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENESIS_PREV_HASH,
  canonicalJsonStringify,
  sha256,
  computePayloadHash,
  computeObservationHash,
  computeNodeHash,
  generateProvenanceNode,
  verifyNodeHash,
} from './hasher.js';

describe('TASK-029: WELMEC 7.2 SHA-256 Hash Graph Node Generator', () => {
  describe('Canonical JSON Serialization (RFC 8785)', () => {
    it('produces identical strings regardless of object key insertion order', () => {
      const objA = { z: 100, a: 'apple', m: { y: 2, x: 1 } };
      const objB = { a: 'apple', m: { x: 1, y: 2 }, z: 100 };

      const canonA = canonicalJsonStringify(objA);
      const canonB = canonicalJsonStringify(objB);

      assert.equal(canonA, canonB);
      assert.equal(canonA, '{"a":"apple","m":{"x":1,"y":2},"z":100}');
    });

    it('handles nested arrays, primitives, and nulls deterministically', () => {
      const complex = {
        list: [{ b: 2, a: 1 }, null, true, 'text', 42.5],
        flag: false,
      };

      const expected = '{"flag":false,"list":[{"a":1,"b":2},null,true,"text",42.5]}';
      assert.equal(canonicalJsonStringify(complex), expected);
    });

    it('formats Dates in ISO 8601 UTC representation', () => {
      const d = new Date('2026-09-21T12:00:00.000Z');
      assert.equal(
        canonicalJsonStringify({ timestamp: d }),
        '{"timestamp":"2026-09-21T12:00:00.000Z"}'
      );
    });
  });

  describe('Standard SHA-256 Hashing', () => {
    it('matches known NIST SHA-256 test vector for empty string', () => {
      const emptyHash = sha256('');
      assert.equal(
        emptyHash,
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });

    it('produces 64-character lowercase hex string', () => {
      const hash = sha256('MAANAK_METROLOGY_2026');
      assert.equal(hash.length, 64);
      assert.match(hash, /^[0-9a-f]{64}$/);
    });
  });

  describe('Observation Avalanche Effect (Acceptance Criteria)', () => {
    it('modifying a single character in observation payload completely changes the hash', () => {
      const baseObservation = {
        testSessionId: 'sess-001',
        sequenceNumber: 1,
        testClause: 'FORM_1',
        targetLoadL: '2.50000000',
        displayedIndicationI: '2.50000000',
        changeoverWeightDl: '0.00200000',
      };

      // Tampered observation: change last decimal digit from 0 to 1
      const tamperedObservation = {
        testSessionId: 'sess-001',
        sequenceNumber: 1,
        testClause: 'FORM_1',
        targetLoadL: '2.50000000',
        displayedIndicationI: '2.50000001',
        changeoverWeightDl: '0.00200000',
      };

      const hashBase = computeObservationHash(baseObservation, GENESIS_PREV_HASH);
      const hashTampered = computeObservationHash(tamperedObservation, GENESIS_PREV_HASH);

      assert.notEqual(hashBase, hashTampered);

      // Compute character differences (avalanche divergence)
      let diffCount = 0;
      for (let i = 0; i < hashBase.length; i++) {
        if (hashBase[i] !== hashTampered[i]) diffCount++;
      }

      // Strong avalanche effect: At least 30 out of 64 hex characters must differ (> 45% divergence)
      assert.ok(
        diffCount >= 30,
        `Expected avalanche divergence >= 30 chars, got ${diffCount}`
      );
    });
  });

  describe('WELMEC 7.2 Chained Node Generation & Hash Verification', () => {
    it('generates genesis node with 64-zero previous hash and valid payload hash', () => {
      const genesisNode = generateProvenanceNode({
        testSessionId: 'session-welmec-01',
        nodeSequence: 0,
        nodeType: 'SESSION_INIT',
        payload: {
          sessionNumber: 'SES-RRSL-2026-001',
          laboratoryId: 'lab-amd-01',
          testingOfficerId: 'officer-rk-verma',
        },
      });

      assert.equal(genesisNode.nodeSequence, 0);
      assert.equal(genesisNode.nodeType, 'SESSION_INIT');
      assert.equal(genesisNode.previousNodeHashSha256, GENESIS_PREV_HASH);
      assert.equal(genesisNode.payloadHashSha256.length, 64);
      assert.equal(genesisNode.currentNodeHashSha256.length, 64);

      const isValid = verifyNodeHash(
        genesisNode,
        {
          sessionNumber: 'SES-RRSL-2026-001',
          laboratoryId: 'lab-amd-01',
          testingOfficerId: 'officer-rk-verma',
        }
      );
      assert.equal(isValid, true);
    });

    it('constructs a multi-node cryptographic chain where altering node 0 breaks node 1 verification', () => {
      // Node 0: Session Init
      const payload0 = { event: 'INIT', instrumentId: 'XPR226' };
      const node0 = generateProvenanceNode({
        testSessionId: 'sess-chain',
        nodeSequence: 0,
        nodeType: 'SESSION_INIT',
        payload: payload0,
      });

      // Node 1: Observation 1
      const payload1 = { event: 'OBS', targetLoad: '5.00000000', indication: '5.00050000' };
      const node1 = generateProvenanceNode({
        testSessionId: 'sess-chain',
        nodeSequence: 1,
        nodeType: 'OBSERVATION_LOG',
        previousNodeHashSha256: node0.currentNodeHashSha256,
        payload: payload1,
      });

      // Node 2: Calculation Run
      const payload2 = { event: 'CALC', status: 'PASS', points: 1 };
      const node2 = generateProvenanceNode({
        testSessionId: 'sess-chain',
        nodeSequence: 2,
        nodeType: 'CALCULATION_RUN',
        previousNodeHashSha256: node1.currentNodeHashSha256,
        payload: payload2,
      });

      // Verify intact chain
      assert.equal(verifyNodeHash(node0, payload0), true);
      assert.equal(verifyNodeHash(node1, payload1), true);
      assert.equal(verifyNodeHash(node2, payload2), true);

      // Tamper with Node 0
      const tamperedPayload0 = { event: 'INIT', instrumentId: 'XPR226_TAMPERED' };
      const tamperedNode0Hash = computeNodeHash(node0.previousNodeHashSha256, tamperedPayload0);

      // Node 1's recorded previousNodeHashSha256 will NOT match tampered Node 0 hash
      assert.notEqual(tamperedNode0Hash, node1.previousNodeHashSha256);

      // If an attacker updates Node 1's previous hash to match, Node 1's own hash changes, breaking Node 2
      const updatedNode1Hash = computeNodeHash(tamperedNode0Hash, payload1);
      assert.notEqual(updatedNode1Hash, node2.previousNodeHashSha256);
    });
  });
});
