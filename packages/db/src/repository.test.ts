import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  createSession,
  addObservationWithTrace,
  getSessionWithDetails,
  lockSessionForReview,
  deleteObservation,
  updateObservation,
  assertSessionNotLocked,
  SessionImmutableLockedError,
  sessionWithDetailsInclude,
} from './repository.js';
import { prisma as singletonPrisma, DB_VERSION } from './index.js';

describe('TASK-028: Database Client & Repository Wrapper', () => {
  describe('Prisma Client Singleton & Exports', () => {
    it('exports singleton prisma instance and DB_VERSION', () => {
      assert.ok(singletonPrisma, 'singleton prisma must be defined');
      assert.equal(typeof singletonPrisma.$connect, 'function');
      assert.equal(DB_VERSION, '1.0.0');
    });

    it('exports sessionWithDetailsInclude covering full metrological relation graph', () => {
      assert.ok(sessionWithDetailsInclude.laboratory);
      assert.ok(sessionWithDetailsInclude.instrumentUnit);
      assert.ok(sessionWithDetailsInclude.testPlan);
      assert.ok(sessionWithDetailsInclude.rulePackVersion);
      assert.ok(sessionWithDetailsInclude.testingOfficer);
      assert.ok(sessionWithDetailsInclude.rawObservations);
      assert.ok(sessionWithDetailsInclude.calculationRuns);
      assert.ok(sessionWithDetailsInclude.reviewAudits);
      assert.ok(sessionWithDetailsInclude.reports);
      assert.ok(sessionWithDetailsInclude.digitalSignatures);
    });
  });

  describe('createSession Repository Helper', () => {
    it('creates a new test session in DRAFT status with timestamps', async () => {
      let createdPayload: any = null;

      const mockClient = {
        testSession: {
          create: async ({ data }: any) => {
            createdPayload = data;
            return {
              id: '00000000-0000-0000-0000-000000000001',
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
        },
      } as unknown as PrismaClient;

      const result = await createSession(
        {
          sessionNumber: 'SES-RRSL-2026-001',
          laboratoryId: '11111111-1111-1111-1111-111111111111',
          instrumentUnitId: '22222222-2222-2222-2222-222222222222',
          testPlanId: '33333333-3333-3333-3333-333333333333',
          rulePackVersionId: '44444444-4444-4444-4444-444444444444',
          testingOfficerId: '55555555-5555-5555-5555-555555555555',
        },
        mockClient
      );

      assert.equal(result.sessionNumber, 'SES-RRSL-2026-001');
      assert.equal(result.status, 'DRAFT');
      assert.equal(createdPayload.sessionNumber, 'SES-RRSL-2026-001');
      assert.equal(createdPayload.status, 'DRAFT');
    });
  });

  describe('addObservationWithTrace Repository Helper', () => {
    it('throws error if session does not exist', async () => {
      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            testSession: {
              findUnique: async () => null,
            },
          }),
      } as unknown as PrismaClient;

      await assert.rejects(
        async () => {
          await addObservationWithTrace(
            {
              testSessionId: 'non-existent-session-id',
              testPlanItemId: 'plan-item-id',
              sequenceNumber: 1,
              testClause: 'FORM_1',
              loadRunDirection: 'ASCENDING',
              targetLoadL: '2.50000000',
              displayedIndicationI: '2.50000000',
            },
            mockClient
          );
        },
        {
          name: 'Error',
          message: 'TestSession with ID "non-existent-session-id" does not exist.',
        }
      );
    });

    it('throws error if session is locked for review', async () => {
      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            testSession: {
              findUnique: async () => ({
                id: 'session-id',
                status: 'UNDER_REVIEW',
                rulePackVersionId: 'rule-pack-id',
                testingOfficerId: 'officer-id',
              }),
            },
          }),
      } as unknown as PrismaClient;

      await assert.rejects(
        async () => {
          await addObservationWithTrace(
            {
              testSessionId: 'session-id',
              testPlanItemId: 'plan-item-id',
              sequenceNumber: 1,
              testClause: 'FORM_1',
              loadRunDirection: 'ASCENDING',
              targetLoadL: '2.50000000',
              displayedIndicationI: '2.50000000',
            },
            mockClient
          );
        },
        {
          name: 'Error',
          message:
            'Cannot add observation to session in status "UNDER_REVIEW". Session is locked for modification.',
        }
      );
    });

    it('creates observation, weights used, and calculation trace item with 8-decimal precision', async () => {
      let createdObs: any = null;
      let createdWeights: any = null;
      let createdTrace: any = null;

      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            testSession: {
              findUnique: async () => ({
                id: 'session-id',
                status: 'IN_PROGRESS',
                rulePackVersionId: 'rule-pack-version-id',
                testingOfficerId: 'officer-id',
              }),
            },
            rawObservation: {
              create: async ({ data }: any) => {
                createdObs = data;
                return {
                  id: 'obs-uuid-1',
                  ...data,
                  createdAt: new Date(),
                };
              },
            },
            observationWeightUsed: {
              createMany: async ({ data }: any) => {
                createdWeights = data;
                return { count: data.length };
              },
            },
            calculationRun: {
              findFirst: async () => null,
              create: async ({ data }: any) => ({
                id: 'run-uuid-1',
                ...data,
              }),
            },
            calculationTraceItem: {
              create: async ({ data }: any) => {
                createdTrace = data;
                return {
                  id: 'trace-uuid-1',
                  ...data,
                };
              },
            },
          }),
      } as unknown as PrismaClient;

      const result = await addObservationWithTrace(
        {
          testSessionId: 'session-id',
          testPlanItemId: 'item-1',
          sequenceNumber: 1,
          testClause: 'FORM_1',
          loadRunDirection: 'ASCENDING',
          targetLoadL: '2.50000000',
          displayedIndicationI: '2.50000000',
          changeoverWeightDl: '0.00200000',
          zeroIndicationI0: '0.00000000',
          weightsUsed: [
            {
              calibrationCertificateId: 'cert-1',
              weightMassApplied: '2.50000000',
            },
          ],
          trace: {
            preRoundingIndicationP: '2.50050000',
            rawErrorE: '0.00050000',
            zeroErrorE0: '0.00000000',
            correctedIntrinsicErrorEc: '0.00050000',
            mpeLimitApplied: '0.00250000',
            mpeBracketCategory: 'BRACKET_1',
            complianceStatus: 'PASS',
            stepDerivationTreeJson: { formula: 'Ec = E - E0' },
          },
        },
        mockClient
      );

      assert.ok(result.observation);
      assert.ok(result.traceItem);
      assert.equal(result.observation.id, 'obs-uuid-1');
      assert.equal(result.traceItem.id, 'trace-uuid-1');

      // Check decimal exactness
      assert.ok(createdObs.targetLoadL instanceof Prisma.Decimal);
      assert.equal(createdObs.targetLoadL.toFixed(8), '2.50000000');
      assert.equal(createdObs.changeoverWeightDl.toFixed(8), '0.00200000');

      // Check weights applied
      assert.equal(createdWeights.length, 1);
      assert.equal(createdWeights[0].calibrationCertificateId, 'cert-1');
      assert.equal(createdWeights[0].weightMassApplied.toFixed(8), '2.50000000');

      // Check trace
      assert.equal(createdTrace.complianceStatus, 'PASS');
      assert.equal(createdTrace.correctedIntrinsicErrorEc.toFixed(8), '0.00050000');
    });
  });

  describe('getSessionWithDetails Repository Helper', () => {
    it('executes findUnique with full relational graph', async () => {
      let queriedInclude: any = null;

      const mockClient = {
        testSession: {
          findUnique: async ({ where, include }: any) => {
            queriedInclude = include;
            return {
              id: where.id,
              sessionNumber: 'SES-001',
              laboratory: { name: 'RRSL Ahmedabad' },
              rawObservations: [],
              calculationRuns: [],
              environmentalLogs: [],
              reviewAudits: [],
            };
          },
        },
      } as unknown as PrismaClient;

      const session = await getSessionWithDetails('session-uuid-123', mockClient);
      assert.ok(session);
      assert.equal(session.id, 'session-uuid-123');
      assert.equal(queriedInclude, sessionWithDetailsInclude);
    });
  });

  describe('lockSessionForReview Repository Helper', () => {
    it('transitions status to UNDER_REVIEW and generates ReviewAudit audit trail', async () => {
      let updatedStatus: any = null;
      let reviewAuditData: any = null;

      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            testSession: {
              findUnique: async () => ({
                id: 'session-lock-test',
                status: 'IN_PROGRESS',
              }),
              update: async ({ data }: any) => {
                updatedStatus = data.status;
                return {
                  id: 'session-lock-test',
                  status: data.status,
                };
              },
            },
            reviewAudit: {
              create: async ({ data }: any) => {
                reviewAuditData = data;
                return {
                  id: 'audit-uuid-99',
                  ...data,
                  reviewedAt: new Date(),
                };
              },
            },
          }),
      } as unknown as PrismaClient;

      const result = await lockSessionForReview(
        'session-lock-test',
        'reviewer-user-1',
        'Ready for Class III review',
        [{ code: 'NONE_DETECTED' }],
        mockClient
      );

      assert.equal(result.session.status, 'UNDER_REVIEW');
      assert.equal(updatedStatus, 'UNDER_REVIEW');
      assert.equal(result.reviewAudit.decision, 'PENDING_REVIEW');
      assert.equal(reviewAuditData.reviewerUserId, 'reviewer-user-1');
      assert.equal(reviewAuditData.comments, 'Ready for Class III review');
      assert.deepEqual(reviewAuditData.automatedAnomalyFlagsJson, [{ code: 'NONE_DETECTED' }]);
    });
  });

  describe('TASK-082: Database Immutability WORM Lock on APPROVED_LOCKED', () => {
    it('assertSessionNotLocked throws SessionImmutableLockedError when status is APPROVED_LOCKED', () => {
      assert.throws(
        () => assertSessionNotLocked('session-locked-1', 'APPROVED_LOCKED'),
        (err: any) => {
          assert.equal(err.name, 'SessionImmutableLockedError');
          assert.equal(err.code, 'SESSION_IMMUTABLE_LOCKED');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });

    it('assertSessionNotLocked passes without error for mutable statuses', () => {
      assert.doesNotThrow(() => assertSessionNotLocked('s1', 'DRAFT'));
      assert.doesNotThrow(() => assertSessionNotLocked('s2', 'IN_PROGRESS'));
      assert.doesNotThrow(() => assertSessionNotLocked('s3', 'OBSERVATION_COMPLETE'));
      assert.doesNotThrow(() => assertSessionNotLocked('s4', 'RETURNED_TO_OFFICER'));
    });

    it('throws SessionImmutableLockedError when adding observation to APPROVED_LOCKED session', async () => {
      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            testSession: {
              findUnique: async () => ({
                id: 'session-approved-locked',
                status: 'APPROVED_LOCKED',
                rulePackVersionId: 'rule-pack-1',
                testingOfficerId: 'officer-1',
              }),
            },
          }),
      } as unknown as PrismaClient;

      await assert.rejects(
        async () => {
          await addObservationWithTrace(
            {
              testSessionId: 'session-approved-locked',
              testPlanItemId: 'plan-item-1',
              sequenceNumber: 1,
              testClause: 'A.4.4',
              loadRunDirection: 'ASCENDING',
              targetLoadL: '2.50000000',
              displayedIndicationI: '2.50000000',
            },
            mockClient
          );
        },
        (err: any) => {
          assert.equal(err.name, 'SessionImmutableLockedError');
          assert.equal(err.code, 'SESSION_IMMUTABLE_LOCKED');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });

    it('throws SessionImmutableLockedError when locking an APPROVED_LOCKED session', async () => {
      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            testSession: {
              findUnique: async () => ({
                id: 'session-already-approved',
                status: 'APPROVED_LOCKED',
              }),
            },
          }),
      } as unknown as PrismaClient;

      await assert.rejects(
        async () => {
          await lockSessionForReview(
            'session-already-approved',
            'reviewer-1',
            'Attempt re-lock',
            [],
            mockClient
          );
        },
        (err: any) => {
          assert.equal(err.name, 'SessionImmutableLockedError');
          assert.equal(err.code, 'SESSION_IMMUTABLE_LOCKED');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });

    it('throws SessionImmutableLockedError when deleting observation from APPROVED_LOCKED session', async () => {
      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            rawObservation: {
              findUnique: async () => ({
                id: 'obs-to-delete',
                testSessionId: 'session-approved-worm',
                testSession: {
                  id: 'session-approved-worm',
                  status: 'APPROVED_LOCKED',
                },
              }),
            },
          }),
      } as unknown as PrismaClient;

      await assert.rejects(
        async () => {
          await deleteObservation('obs-to-delete', mockClient);
        },
        (err: any) => {
          assert.equal(err.name, 'SessionImmutableLockedError');
          assert.equal(err.code, 'SESSION_IMMUTABLE_LOCKED');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });

    it('throws SessionImmutableLockedError when updating observation on APPROVED_LOCKED session', async () => {
      const mockClient = {
        $transaction: async (fn: any) =>
          fn({
            rawObservation: {
              findUnique: async () => ({
                id: 'obs-to-update',
                testSessionId: 'session-approved-worm',
                testSession: {
                  id: 'session-approved-worm',
                  status: 'APPROVED_LOCKED',
                },
              }),
            },
          }),
      } as unknown as PrismaClient;

      await assert.rejects(
        async () => {
          await updateObservation('obs-to-update', { displayedIndicationI: new Prisma.Decimal('5.0') }, mockClient);
        },
        (err: any) => {
          assert.equal(err.name, 'SessionImmutableLockedError');
          assert.equal(err.code, 'SESSION_IMMUTABLE_LOCKED');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });
});

