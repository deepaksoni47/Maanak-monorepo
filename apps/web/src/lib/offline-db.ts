/**
 * MAANAK (मानक) - Production Offline Storage Driver
 * Industrial-grade client-side edge database using IndexedDB (via idb)
 * Supports full offline bench operations in shielded testing bays with spotty connectivity.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export const OFFLINE_DB_NAME = "maanak_offline_db";
export const OFFLINE_DB_VERSION = 1;

export interface CachedSession {
  id: string;
  sessionNumber: string;
  status: string;
  instrumentId: string;
  instrument?: any;
  testPlan?: any;
  observations?: any[];
  laboratoryId?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface CachedInstrument {
  id: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  accuracyClass: string;
  maxCapacity: number | string;
  minCapacity: number | string;
  verificationScaleIntervalE: number | string;
  actualScaleIntervalD?: number | string;
  unit: string;
  [key: string]: any;
}

export interface CachedWeight {
  id: string;
  oimlClass: string;
  certificateNumber: string;
  nominalMass: number | string;
  unit: string;
  expandedUncertaintyU: number | string;
  calibrationDate?: string;
  validUntil?: string;
  [key: string]: any;
}

export type OfflineMutationStatus = "PENDING" | "SYNCING" | "FAILED" | "RESOLVED";

export interface OfflineMutation {
  queueId: string;
  sessionId: string;
  endpoint: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  status: OfflineMutationStatus;
  error?: string;
}

export interface MaanakOfflineDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: CachedSession;
    indexes: {
      status: string;
      updatedAt: string;
    };
  };
  instruments: {
    key: string;
    value: CachedInstrument;
    indexes: {
      serialNumber: string;
      model: string;
    };
  };
  standard_weights: {
    key: string;
    value: CachedWeight;
    indexes: {
      oimlClass: string;
      certificateNumber: string;
    };
  };
  offline_queue: {
    key: string;
    value: OfflineMutation;
    indexes: {
      sessionId: string;
      endpoint: string;
      timestamp: string;
      status: string;
    };
  };
}

// In-Memory fallback store for SSR and Node.js testing environments
class InMemoryOfflineStore {
  sessions = new Map<string, CachedSession>();
  instruments = new Map<string, CachedInstrument>();
  standardWeights = new Map<string, CachedWeight>();
  offlineQueue = new Map<string, OfflineMutation>();

  clear() {
    this.sessions.clear();
    this.instruments.clear();
    this.standardWeights.clear();
    this.offlineQueue.clear();
  }
}

export const inMemoryOfflineStore = new InMemoryOfflineStore();

export function isIndexedDBAvailable(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as any).indexedDB !== "undefined" &&
    (globalThis as any).indexedDB !== null
  );
}

let dbPromise: Promise<IDBPDatabase<MaanakOfflineDBSchema>> | null = null;

/**
 * Initializes and opens the IndexedDB database instance.
 */
export async function getOfflineDb(): Promise<IDBPDatabase<MaanakOfflineDBSchema> | null> {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<MaanakOfflineDBSchema>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db) {
        // 1. Sessions store
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
          sessionStore.createIndex("status", "status");
          sessionStore.createIndex("updatedAt", "updatedAt");
        }

        // 2. Instruments store
        if (!db.objectStoreNames.contains("instruments")) {
          const instrumentStore = db.createObjectStore("instruments", { keyPath: "id" });
          instrumentStore.createIndex("serialNumber", "serialNumber");
          instrumentStore.createIndex("model", "model");
        }

        // 3. Standard Weights store
        if (!db.objectStoreNames.contains("standard_weights")) {
          const weightStore = db.createObjectStore("standard_weights", { keyPath: "id" });
          weightStore.createIndex("oimlClass", "oimlClass");
          weightStore.createIndex("certificateNumber", "certificateNumber");
        }

        // 4. Offline Queue store
        if (!db.objectStoreNames.contains("offline_queue")) {
          const queueStore = db.createObjectStore("offline_queue", { keyPath: "queueId" });
          queueStore.createIndex("sessionId", "sessionId");
          queueStore.createIndex("endpoint", "endpoint");
          queueStore.createIndex("timestamp", "timestamp");
          queueStore.createIndex("status", "status");
        }
      },
    });
  }

  return dbPromise;
}

// ==========================================
// SESSION OPERATIONS
// ==========================================

export async function cacheSession(session: CachedSession): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    await db.put("sessions", session);
  } else {
    inMemoryOfflineStore.sessions.set(session.id, session);
  }
}

export async function cacheSessions(sessions: CachedSession[]): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    const tx = db.transaction("sessions", "readwrite");
    await Promise.all([
      ...sessions.map((s) => tx.store.put(s)),
      tx.done,
    ]);
  } else {
    for (const s of sessions) {
      inMemoryOfflineStore.sessions.set(s.id, s);
    }
  }
}

export async function getCachedSession(id: string): Promise<CachedSession | undefined> {
  const db = await getOfflineDb();
  if (db) {
    return await db.get("sessions", id);
  }
  return inMemoryOfflineStore.sessions.get(id);
}

export async function getCachedSessions(): Promise<CachedSession[]> {
  const db = await getOfflineDb();
  if (db) {
    return await db.getAll("sessions");
  }
  return Array.from(inMemoryOfflineStore.sessions.values());
}

// ==========================================
// INSTRUMENT OPERATIONS
// ==========================================

export async function cacheInstrument(instrument: CachedInstrument): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    await db.put("instruments", instrument);
  } else {
    inMemoryOfflineStore.instruments.set(instrument.id, instrument);
  }
}

export async function cacheInstruments(instruments: CachedInstrument[]): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    const tx = db.transaction("instruments", "readwrite");
    await Promise.all([
      ...instruments.map((i) => tx.store.put(i)),
      tx.done,
    ]);
  } else {
    for (const inst of instruments) {
      inMemoryOfflineStore.instruments.set(inst.id, inst);
    }
  }
}

export async function getCachedInstrument(id: string): Promise<CachedInstrument | undefined> {
  const db = await getOfflineDb();
  if (db) {
    return await db.get("instruments", id);
  }
  return inMemoryOfflineStore.instruments.get(id);
}

export async function getCachedInstruments(): Promise<CachedInstrument[]> {
  const db = await getOfflineDb();
  if (db) {
    return await db.getAll("instruments");
  }
  return Array.from(inMemoryOfflineStore.instruments.values());
}

// ==========================================
// STANDARD WEIGHT OPERATIONS
// ==========================================

export async function cacheStandardWeights(weights: CachedWeight[]): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    const tx = db.transaction("standard_weights", "readwrite");
    await Promise.all([
      ...weights.map((w) => tx.store.put(w)),
      tx.done,
    ]);
  } else {
    for (const w of weights) {
      inMemoryOfflineStore.standardWeights.set(w.id, w);
    }
  }
}

export async function getCachedStandardWeights(): Promise<CachedWeight[]> {
  const db = await getOfflineDb();
  if (db) {
    return await db.getAll("standard_weights");
  }
  return Array.from(inMemoryOfflineStore.standardWeights.values());
}

// ==========================================
// OFFLINE QUEUE MUTATION OPERATIONS
// ==========================================

export async function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, "queueId" | "timestamp" | "retryCount" | "status"> & {
    queueId?: string;
  }
): Promise<OfflineMutation> {
  const record: OfflineMutation = {
    ...mutation,
    queueId: mutation.queueId ?? `mut-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    status: "PENDING",
  };

  const db = await getOfflineDb();
  if (db) {
    await db.put("offline_queue", record);
  } else {
    inMemoryOfflineStore.offlineQueue.set(record.queueId, record);
  }

  return record;
}

export async function getPendingOfflineMutations(): Promise<OfflineMutation[]> {
  const db = await getOfflineDb();
  if (db) {
    const all = await db.getAll("offline_queue");
    return all.filter((m) => m.status === "PENDING" || m.status === "FAILED");
  }
  return Array.from(inMemoryOfflineStore.offlineQueue.values()).filter(
    (m) => m.status === "PENDING" || m.status === "FAILED"
  );
}

export async function updateMutationStatus(
  queueId: string,
  status: OfflineMutationStatus,
  error?: string
): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    const existing = await db.get("offline_queue", queueId);
    if (existing) {
      existing.status = status;
      if (status === "FAILED") {
        existing.retryCount += 1;
        existing.error = error;
      }
      await db.put("offline_queue", existing);
    }
  } else {
    const existing = inMemoryOfflineStore.offlineQueue.get(queueId);
    if (existing) {
      existing.status = status;
      if (status === "FAILED") {
        existing.retryCount += 1;
        existing.error = error;
      }
    }
  }
}

export async function removeOfflineMutation(queueId: string): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    await db.delete("offline_queue", queueId);
  } else {
    inMemoryOfflineStore.offlineQueue.delete(queueId);
  }
}

export async function clearAllOfflineData(): Promise<void> {
  const db = await getOfflineDb();
  if (db) {
    await Promise.all([
      db.clear("sessions"),
      db.clear("instruments"),
      db.clear("standard_weights"),
      db.clear("offline_queue"),
    ]);
  } else {
    inMemoryOfflineStore.clear();
  }
}

/**
 * Standard RFC 4122 v4 UUID generator that operates in browser, Web Worker, and Node.js.
 */
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates an offline session directly on the edge client using pre-cached instrument specs.
 * Assigns an RFC 4122 UUID and persists to maanak_offline_db.
 */
export async function createOfflineSession(params: {
  instrument: CachedInstrument;
  officerName?: string;
  laboratoryId?: string;
}): Promise<CachedSession> {
  const sessionId = generateUuid();
  const sessionNumber = `OFFLINE-${params.instrument.model.replace(/\s+/g, "").toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const newSession: CachedSession = {
    id: sessionId,
    sessionNumber,
    status: "IN_PROGRESS",
    instrumentId: params.instrument.id,
    instrument: params.instrument,
    laboratoryId: params.laboratoryId ?? "RRSL-HQ",
    officerName: params.officerName ?? "Local Metrologist",
    observations: [],
    createdAt: now,
    updatedAt: now,
    isOfflineCreated: true,
  };

  await cacheSession(newSession);
  return newSession;
}

/**
 * Evaluates Turning Point and MPE math locally in pure TypeScript and
 * persists the observation with an RFC 4122 UUID primary key (local_id)
 * into maanak_offline_db.
 */
export async function logOfflineObservation(params: {
  sessionId: string;
  stepNumber: number;
  targetLoadL: number;
  displayedIndicationI: number;
  changeoverWeightDl: number;
  eVal: number;
  e0?: number;
  mpeLimit: number;
  unit?: string;
  direction?: string;
}): Promise<{
  localId: string;
  turningPointP: number;
  errorE: number;
  intrinsicErrorEc: number;
  isPass: boolean;
  mutation: OfflineMutation;
}> {
  const localId = generateUuid();
  const P = params.displayedIndicationI + 0.5 * params.eVal - params.changeoverWeightDl;
  const E = P - params.targetLoadL;
  const zeroCorrection = params.e0 ?? 0;
  const Ec = E - zeroCorrection;
  const isPass = Math.abs(Ec) <= params.mpeLimit + 1e-9;
  const cleanNum = (n: number) => (Object.is(n, -0) || Math.abs(n) < 1e-12 ? 0 : +n.toFixed(6));

  const payload = {
    localId,
    sessionId: params.sessionId,
    formType: "FORM_1_WEIGHING",
    sequenceNumber: params.stepNumber,
    targetLoadL: params.targetLoadL,
    displayedIndicationI: params.displayedIndicationI,
    changeoverWeightDl: params.changeoverWeightDl,
    turningPointP: cleanNum(P),
    errorE: cleanNum(E),
    intrinsicErrorEc: cleanNum(Ec),
    mpeLimit: params.mpeLimit,
    unit: params.unit ?? "kg",
    direction: params.direction ?? "ASCENDING",
    isPass,
    timestamp: new Date().toISOString(),
  };

  const mutation = await enqueueOfflineMutation({
    sessionId: params.sessionId,
    endpoint: "/api/v1/sync/push",
    payload,
  });

  const session = await getCachedSession(params.sessionId);
  if (session) {
    if (!session.observations) session.observations = [];
    session.observations.push(payload);
    session.updatedAt = new Date().toISOString();
    await cacheSession(session);
  }

  return {
    localId,
    turningPointP: cleanNum(P),
    errorE: cleanNum(E),
    intrinsicErrorEc: cleanNum(Ec),
    isPass,
    mutation,
  };
}
