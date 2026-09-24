import { PrismaClient, Prisma, TestSession, RawObservation, CalculationTraceItem, ReviewAudit } from '@prisma/client';
import { prisma as defaultPrisma } from './client.js';

export class SessionImmutableLockedError extends Error {
  readonly code = 'SESSION_IMMUTABLE_LOCKED';
  readonly statusCode = 403;

  constructor(sessionId: string) {
    super(
      `TestSession "${sessionId}" is statutorily APPROVED_LOCKED (WORM). Direct observation additions, modifications, or deletions are strictly prohibited by legal metrology compliance rules.`
    );
    this.name = 'SessionImmutableLockedError';
  }
}

/**
 * Asserts that a session is not in statutory APPROVED_LOCKED WORM state.
 * Throws SessionImmutableLockedError (HTTP 403) if locked.
 */
export function assertSessionNotLocked(sessionId: string, status: string): void {
  if (status === 'APPROVED_LOCKED') {
    throw new SessionImmutableLockedError(sessionId);
  }
}

export interface CreateSessionInput {
  sessionNumber: string;
  laboratoryId: string;
  instrumentUnitId: string;
  testPlanId: string;
  rulePackVersionId: string;
  testingOfficerId: string;
  deviceId?: string;
  localId?: string;
  status?: string;
  startedAt?: Date;
}

export interface WeightUsedInput {
  calibrationCertificateId: string;
  weightMassApplied: Prisma.Decimal | string | number;
}

export interface CalculationTraceInput {
  calculationRunId?: string;
  preRoundingIndicationP: Prisma.Decimal | string | number;
  rawErrorE: Prisma.Decimal | string | number;
  zeroErrorE0?: Prisma.Decimal | string | number;
  correctedIntrinsicErrorEc: Prisma.Decimal | string | number;
  mpeLimitApplied: Prisma.Decimal | string | number;
  mpeBracketCategory: string;
  complianceStatus: 'PASS' | 'FAIL';
  stepDerivationTreeJson: Record<string, any>;
}

export interface AddObservationWithTraceInput {
  testSessionId: string;
  testPlanItemId: string;
  sequenceNumber: number;
  testClause: string;
  loadRunDirection: 'ASCENDING' | 'DESCENDING' | 'STATIC';
  targetLoadL: Prisma.Decimal | string | number;
  displayedIndicationI: Prisma.Decimal | string | number;
  changeoverWeightDl?: Prisma.Decimal | string | number;
  zeroIndicationI0?: Prisma.Decimal | string | number;
  eccentricityPosition?: number | null;
  elapsedTimeMinutes?: Prisma.Decimal | string | number | null;
  activePartialRangeIndex?: number;
  recordedAt?: Date;
  weightsUsed?: WeightUsedInput[];
  trace?: CalculationTraceInput;
}

export const sessionWithDetailsInclude = {
  laboratory: true,
  instrumentUnit: {
    include: {
      instrumentModel: {
        include: {
          accuracyClass: true,
          manufacturer: true,
          partialRanges: true,
        },
      },
    },
  },
  testPlan: {
    include: {
      items: {
        orderBy: { executionOrder: 'asc' as const },
      },
    },
  },
  rulePackVersion: {
    include: {
      rulePack: true,
    },
  },
  testingOfficer: {
    select: {
      id: true,
      username: true,
      fullName: true,
      designation: true,
      email: true,
    },
  },
  rawObservations: {
    orderBy: { sequenceNumber: 'asc' as const },
    include: {
      weightsUsed: {
        include: {
          calibrationCertificate: true,
        },
      },
      calculationTraceItems: true,
    },
  },
  calculationRuns: {
    orderBy: { executedAt: 'desc' as const },
    include: {
      traceItems: true,
    },
  },
  environmentalLogs: {
    orderBy: { loggedAt: 'asc' as const },
  },
  reviewAudits: {
    orderBy: { reviewedAt: 'desc' as const },
    include: {
      reviewerUser: {
        select: {
          id: true,
          username: true,
          fullName: true,
          designation: true,
        },
      },
    },
  },
  reports: {
    include: {
      versions: true,
    },
  },
  digitalSignatures: true,
} satisfies Prisma.TestSessionInclude;

export type SessionWithDetails = Prisma.TestSessionGetPayload<{
  include: typeof sessionWithDetailsInclude;
}>;

function toDecimal(val: Prisma.Decimal | string | number | undefined | null, fallback = '0.0'): Prisma.Decimal {
  if (val === undefined || val === null) {
    return new Prisma.Decimal(fallback);
  }
  if (val instanceof Prisma.Decimal) {
    return val;
  }
  return new Prisma.Decimal(val.toString());
}

/**
 * Creates a new test session in DRAFT status.
 */
export async function createSession(
  data: CreateSessionInput,
  client: PrismaClient = defaultPrisma
): Promise<TestSession> {
  return await client.testSession.create({
    data: {
      sessionNumber: data.sessionNumber,
      laboratoryId: data.laboratoryId,
      instrumentUnitId: data.instrumentUnitId,
      testPlanId: data.testPlanId,
      rulePackVersionId: data.rulePackVersionId,
      testingOfficerId: data.testingOfficerId,
      deviceId: data.deviceId,
      localId: data.localId,
      status: data.status ?? 'DRAFT',
      startedAt: data.startedAt ?? new Date(),
    },
  });
}

/**
 * Atomic transaction helper: Adds a raw turning-point observation,
 * links reference weights applied, and creates a mathematical calculation trace item.
 */
export async function addObservationWithTrace(
  data: AddObservationWithTraceInput,
  client: PrismaClient = defaultPrisma
): Promise<{ observation: RawObservation; traceItem?: CalculationTraceItem }> {
  return await client.$transaction(async (tx) => {
    // 1. Ensure test session exists and is not locked for review
    const session = await tx.testSession.findUnique({
      where: { id: data.testSessionId },
      select: { id: true, status: true, rulePackVersionId: true, testingOfficerId: true },
    });

    if (!session) {
      throw new Error(`TestSession with ID "${data.testSessionId}" does not exist.`);
    }

    assertSessionNotLocked(session.id, session.status);

    if (session.status === 'UNDER_REVIEW' || session.status === 'COMPLETED' || session.status === 'LOCKED') {
      throw new Error(
        `Cannot add observation to session in status "${session.status}". Session is locked for modification.`
      );
    }

    // 2. Create the raw observation record
    const observation = await tx.rawObservation.create({
      data: {
        testSessionId: data.testSessionId,
        testPlanItemId: data.testPlanItemId,
        sequenceNumber: data.sequenceNumber,
        testClause: data.testClause,
        loadRunDirection: data.loadRunDirection,
        targetLoadL: toDecimal(data.targetLoadL),
        displayedIndicationI: toDecimal(data.displayedIndicationI),
        changeoverWeightDl: toDecimal(data.changeoverWeightDl, '0.0'),
        zeroIndicationI0: toDecimal(data.zeroIndicationI0, '0.0'),
        eccentricityPosition: data.eccentricityPosition,
        elapsedTimeMinutes: data.elapsedTimeMinutes != null ? toDecimal(data.elapsedTimeMinutes) : null,
        activePartialRangeIndex: data.activePartialRangeIndex ?? 1,
        recordedAt: data.recordedAt ?? new Date(),
      },
    });

    // 3. Link weights used if provided
    if (data.weightsUsed && data.weightsUsed.length > 0) {
      await tx.observationWeightUsed.createMany({
        data: data.weightsUsed.map((w) => ({
          rawObservationId: observation.id,
          calibrationCertificateId: w.calibrationCertificateId,
          weightMassApplied: toDecimal(w.weightMassApplied),
        })),
      });
    }

    // 4. Create calculation trace if provided
    let traceItem: CalculationTraceItem | undefined;
    if (data.trace) {
      let calculationRunId = data.trace.calculationRunId;

      if (!calculationRunId) {
        // Find existing calculation run for this session or create an initial run
        const existingRun = await tx.calculationRun.findFirst({
          where: { testSessionId: data.testSessionId },
          orderBy: { executedAt: 'desc' },
        });

        if (existingRun) {
          calculationRunId = existingRun.id;
        } else {
          const newRun = await tx.calculationRun.create({
            data: {
              testSessionId: data.testSessionId,
              rulePackVersionId: session.rulePackVersionId,
              executedByUserId: session.testingOfficerId,
              overallComplianceStatus: data.trace.complianceStatus === 'PASS' ? 'COMPLIANT' : 'NON_COMPLIANT',
              totalPointsEvaluated: 1,
              totalPointsFailed: data.trace.complianceStatus === 'FAIL' ? 1 : 0,
              maxErrorToMpeRatio: new Prisma.Decimal('0.5000'),
            },
          });
          calculationRunId = newRun.id;
        }
      }

      traceItem = await tx.calculationTraceItem.create({
        data: {
          calculationRunId: calculationRunId,
          rawObservationId: observation.id,
          preRoundingIndicationP: toDecimal(data.trace.preRoundingIndicationP),
          rawErrorE: toDecimal(data.trace.rawErrorE),
          zeroErrorE0: toDecimal(data.trace.zeroErrorE0, '0.0'),
          correctedIntrinsicErrorEc: toDecimal(data.trace.correctedIntrinsicErrorEc),
          mpeLimitApplied: toDecimal(data.trace.mpeLimitApplied),
          mpeBracketCategory: data.trace.mpeBracketCategory,
          complianceStatus: data.trace.complianceStatus,
          stepDerivationTreeJson: data.trace.stepDerivationTreeJson as Prisma.InputJsonValue,
        },
      });
    }

    return { observation, traceItem };
  });
}

/**
 * Fetches a test session with all relations, observations, trace items, and review audits.
 */
export async function getSessionWithDetails(
  sessionId: string,
  client: PrismaClient = defaultPrisma
): Promise<SessionWithDetails | null> {
  return await client.testSession.findUnique({
    where: { id: sessionId },
    include: sessionWithDetailsInclude,
  });
}

/**
 * Locks a test session for review, preventing further observation mutations
 * and writing an audit trail record.
 */
export async function lockSessionForReview(
  sessionId: string,
  reviewerUserId: string,
  comments?: string,
  automatedAnomalyFlags: any[] = [],
  client: PrismaClient = defaultPrisma
): Promise<{ session: TestSession; reviewAudit: ReviewAudit }> {
  return await client.$transaction(async (tx) => {
    const session = await tx.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`TestSession with ID "${sessionId}" does not exist.`);
    }

    assertSessionNotLocked(session.id, session.status);

    if (session.status === 'UNDER_REVIEW' || session.status === 'LOCKED') {
      throw new Error(`TestSession is already in "${session.status}" status.`);
    }

    // 1. Update session status
    const updatedSession = await tx.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'UNDER_REVIEW',
      },
    });

    // 2. Insert ReviewAudit record
    const reviewAudit = await tx.reviewAudit.create({
      data: {
        testSessionId: sessionId,
        reviewerUserId: reviewerUserId,
        reviewStage: 'INTAKE_REVIEW',
        decision: 'PENDING_REVIEW',
        comments: comments ?? 'Session submitted and locked for technical metrological review.',
        automatedAnomalyFlagsJson: automatedAnomalyFlags as Prisma.InputJsonValue,
      },
    });

    return { session: updatedSession, reviewAudit };
  });
}

/**
 * Deletes a raw observation and its associated records.
 * Throws SessionImmutableLockedError (HTTP 403) if the session is APPROVED_LOCKED.
 */
export async function deleteObservation(
  observationId: string,
  client: PrismaClient = defaultPrisma
): Promise<RawObservation> {
  return await client.$transaction(async (tx) => {
    const obs = await tx.rawObservation.findUnique({
      where: { id: observationId },
      include: { testSession: true },
    });

    if (!obs) {
      throw new Error(`RawObservation with ID "${observationId}" not found.`);
    }

    assertSessionNotLocked(obs.testSessionId, obs.testSession.status);

    if (
      obs.testSession.status === 'UNDER_REVIEW' ||
      obs.testSession.status === 'COMPLETED' ||
      obs.testSession.status === 'LOCKED'
    ) {
      throw new Error(
        `Cannot delete observation in session status "${obs.testSession.status}". Session is locked for modification.`
      );
    }

    await tx.observationWeightUsed.deleteMany({
      where: { rawObservationId: observationId },
    });
    await tx.calculationTraceItem.deleteMany({
      where: { rawObservationId: observationId },
    });

    return await tx.rawObservation.delete({
      where: { id: observationId },
    });
  });
}

/**
 * Updates a raw observation record.
 * Throws SessionImmutableLockedError (HTTP 403) if the session is APPROVED_LOCKED.
 */
export async function updateObservation(
  observationId: string,
  data: Partial<Prisma.RawObservationUpdateInput>,
  client: PrismaClient = defaultPrisma
): Promise<RawObservation> {
  return await client.$transaction(async (tx) => {
    const obs = await tx.rawObservation.findUnique({
      where: { id: observationId },
      include: { testSession: true },
    });

    if (!obs) {
      throw new Error(`RawObservation with ID "${observationId}" not found.`);
    }

    assertSessionNotLocked(obs.testSessionId, obs.testSession.status);

    return await tx.rawObservation.update({
      where: { id: observationId },
      data: data as Prisma.RawObservationUpdateInput,
    });
  });
}

/**
 * Operational tables protected under statutory multi-tenant laboratory data isolation.
 */
export const RLS_OPERATIONAL_TABLES = [
  'test_sessions',
  'reference_standards',
  'raw_observations',
  'evidence_attachments',
] as const;

export type RlsOperationalTable = typeof RLS_OPERATIONAL_TABLES[number];

/**
 * Returns the DDL SQL statement defining PostgreSQL Row-Level Security (RLS) for the given operational table.
 */
export function getTenantIsolationPolicySql(table: RlsOperationalTable | string): string {
  if (table === 'test_sessions' || table === 'reference_standards') {
    return [
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
      `DROP POLICY IF EXISTS rrsl_tenant_isolation ON ${table};`,
      `CREATE POLICY rrsl_tenant_isolation ON ${table}`,
      `  FOR ALL TO public`,
      `  USING (`,
      `    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL`,
      `    OR current_setting('app.bypass_rls', true) = 'true'`,
      `    OR laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID`,
      `  )`,
      `  WITH CHECK (`,
      `    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL`,
      `    OR current_setting('app.bypass_rls', true) = 'true'`,
      `    OR laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID`,
      `  );`,
    ].join('\n');
  }

  if (table === 'raw_observations' || table === 'evidence_attachments') {
    return [
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
      `DROP POLICY IF EXISTS rrsl_tenant_isolation ON ${table};`,
      `CREATE POLICY rrsl_tenant_isolation ON ${table}`,
      `  FOR ALL TO public`,
      `  USING (`,
      `    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL`,
      `    OR current_setting('app.bypass_rls', true) = 'true'`,
      `    OR EXISTS (`,
      `      SELECT 1 FROM test_sessions ts`,
      `      WHERE ts.id = ${table}.test_session_id`,
      `        AND ts.laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID`,
      `    )`,
      `  )`,
      `  WITH CHECK (`,
      `    NULLIF(current_setting('app.current_laboratory_id', true), '') IS NULL`,
      `    OR current_setting('app.bypass_rls', true) = 'true'`,
      `    OR EXISTS (`,
      `      SELECT 1 FROM test_sessions ts`,
      `      WHERE ts.id = ${table}.test_session_id`,
      `        AND ts.laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID`,
      `    )`,
      `  );`,
    ].join('\n');
  }

  throw new Error(`Unsupported RLS operational table: "${table}"`);
}

/**
 * Executes a callback within a scoped PostgreSQL tenant transaction, setting
 * `app.current_laboratory_id` for PostgreSQL Row-Level Security (RLS).
 * When `laboratoryId` is undefined, null, or empty, sets it to '' (unrestricted admin mode).
 */
export async function withTenantContext<T>(
  laboratoryId: string | null | undefined,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  client: PrismaClient = defaultPrisma
): Promise<T> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (laboratoryId && !UUID_REGEX.test(laboratoryId)) {
    throw new Error(`Invalid laboratory UUID format for RLS tenant context: "${laboratoryId}"`);
  }

  return await client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_laboratory_id', ${laboratoryId || ''}, true)`;
    return await fn(tx);
  });
}


