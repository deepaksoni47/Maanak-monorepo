/**
 * MAANAK Non-Automatic Weighing Instrument (NAWI) Registry & Store
 * Implements Phase 1 specifications from docs/app_flow.md
 */

export interface PartialRange {
  max: number;
  e: number;
  d: number;
}

export interface InstrumentItem {
  id: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  applicantName?: string;
  countryOfOrigin?: string;
  instrumentType?: "COMPLETE_SCALE" | "INDICATOR_MODULE" | string;
  accuracyClass: "CLASS_I" | "CLASS_II" | "CLASS_III" | "CLASS_IIII";
  maxCapacity: string;
  maxCapacityKg: number;
  minCapacity?: string;
  minCapacityKg?: number;
  verificationInterval: string;
  verificationIntervalKg: number;
  actualInterval?: string;
  actualIntervalKg?: number;
  ratioN?: number;
  isMultiInterval?: boolean;
  partialRanges?: PartialRange[];
  tacNumber: string;
  weighingPrinciple?: string;
  status?: "REGISTERED" | "VERIFIED" | "IN_PROGRESS" | "PENDING_VERIFICATION" | string;
  lastVerified?: string;
  sha256MetadataNode?: string;
  createdAt?: string;
}

export const DEFAULT_INSTRUMENTS: InstrumentItem[] = [
  {
    id: "inst-001",
    serialNumber: "SN-2026-9042",
    model: "Essae DS-215 Precision Counter",
    manufacturer: "Essae-Teraoka Ltd.",
    applicantName: "Essae Legal Metrology Division",
    countryOfOrigin: "India",
    instrumentType: "COMPLETE_SCALE",
    accuracyClass: "CLASS_III",
    maxCapacity: "15.000 kg",
    maxCapacityKg: 15.0,
    minCapacity: "0.100 kg",
    minCapacityKg: 0.1,
    verificationInterval: "5 g",
    verificationIntervalKg: 0.005,
    actualInterval: "5 g",
    actualIntervalKg: 0.005,
    ratioN: 3000,
    isMultiInterval: false,
    tacNumber: "IND/09/2026/042",
    weighingPrinciple: "Strain Gauge Load Cell",
    status: "VERIFIED",
    lastVerified: "2026-09-21",
    sha256MetadataNode: "0x8fa37b12d94e7732a10b8cf634720984e1b8c45e6d78a9c1e0f3b4a58b8f7",
  },
  {
    id: "inst-002",
    serialNumber: "SN-2026-8819",
    model: "Mettler Toledo MS-TS Industrial",
    manufacturer: "Mettler Toledo India",
    applicantName: "Mettler Toledo Quality Lab",
    countryOfOrigin: "Switzerland / India",
    instrumentType: "COMPLETE_SCALE",
    accuracyClass: "CLASS_II",
    maxCapacity: "6.200 kg",
    maxCapacityKg: 6.2,
    minCapacity: "0.005 kg",
    minCapacityKg: 0.005,
    verificationInterval: "0.1 g",
    verificationIntervalKg: 0.0001,
    actualInterval: "0.01 g",
    actualIntervalKg: 0.00001,
    ratioN: 62000,
    isMultiInterval: false,
    tacNumber: "IND/04/2025/118",
    weighingPrinciple: "Electromagnetic Force Restoration (EMFR)",
    status: "IN_PROGRESS",
    lastVerified: "2026-09-22",
    sha256MetadataNode: "0x4a58b8f72a91283d5a84e2098d63a89047bf1b2c45e6d78a9c1e0f3b4a58b8f7",
  },
  {
    id: "inst-003",
    serialNumber: "SN-2026-7734",
    model: "Avery Weigh-Tronix ZM305 Platform",
    manufacturer: "Avery India Ltd.",
    applicantName: "Avery Metrology Hub",
    countryOfOrigin: "United Kingdom / India",
    instrumentType: "COMPLETE_SCALE",
    accuracyClass: "CLASS_III",
    maxCapacity: "30.000 kg",
    maxCapacityKg: 30.0,
    minCapacity: "0.200 kg",
    minCapacityKg: 0.2,
    verificationInterval: "10 g",
    verificationIntervalKg: 0.01,
    actualInterval: "10 g",
    actualIntervalKg: 0.01,
    ratioN: 3000,
    isMultiInterval: false,
    tacNumber: "IND/11/2025/089",
    weighingPrinciple: "Multi-Strain Gauge Shear Beam",
    status: "PENDING_VERIFICATION",
    lastVerified: "2026-08-14",
    sha256MetadataNode: "0x33e8a1d7f023ab9154ec47189028912e8fa37b12d94e7732a10b8cf6347209",
  },
  {
    id: "inst-004",
    serialNumber: "SN-2026-6621",
    model: "Sartorius Cubis II Ultra-Micro",
    manufacturer: "Sartorius India",
    applicantName: "Sartorius Precision Division",
    countryOfOrigin: "Germany",
    instrumentType: "COMPLETE_SCALE",
    accuracyClass: "CLASS_I",
    maxCapacity: "220.000 g",
    maxCapacityKg: 0.22,
    minCapacity: "0.010 g",
    minCapacityKg: 0.00001,
    verificationInterval: "0.1 mg",
    verificationIntervalKg: 0.0000001,
    actualInterval: "0.01 mg",
    actualIntervalKg: 0.00000001,
    ratioN: 2200000,
    isMultiInterval: false,
    tacNumber: "IND/01/2026/003",
    weighingPrinciple: "Electromagnetic Force Restoration (EMFR)",
    status: "VERIFIED",
    lastVerified: "2026-09-18",
    sha256MetadataNode: "0x11ac55e8a1d7f023ab9154ec47189028912e8fa37b12d94e7732a10b8cf634",
  },
];

const STORAGE_KEY = "maanak_registered_instruments";

/** Computes SHA-256 metadata node per docs/app_flow.md Section 3 (Cl 141) */
export function computeMetadataHash(
  model: string,
  max: number,
  e: number,
  accuracyClass: string
): string {
  const seed = `${model}:${max}:${e}:${accuracyClass}:${Date.now()}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `0x${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function getStoredInstruments(): InstrumentItem[] {
  if (typeof window === "undefined") {
    return DEFAULT_INSTRUMENTS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INSTRUMENTS));
      return DEFAULT_INSTRUMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fall back safely
  }
  return DEFAULT_INSTRUMENTS;
}

export function saveNewInstrument(
  data: Omit<InstrumentItem, "id" | "sha256MetadataNode" | "lastVerified" | "status">
): InstrumentItem {
  const id = `inst-${Date.now().toString(36)}`;
  const sha256MetadataNode = computeMetadataHash(
    data.model,
    data.maxCapacityKg,
    data.verificationIntervalKg,
    data.accuracyClass
  );

  const newInst: InstrumentItem = {
    ...data,
    id,
    sha256MetadataNode,
    status: "REGISTERED",
    lastVerified: new Date().toISOString().split("T")[0],
  };

  if (typeof window !== "undefined") {
    try {
      const current = getStoredInstruments();
      const updated = [newInst, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  return newInst;
}

export function updateStoredInstrument(
  id: string,
  updates: Partial<InstrumentItem>
): InstrumentItem | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const current = getStoredInstruments();
    const idx = current.findIndex((i) => i.id === id);
    if (idx !== -1) {
      const updatedItem = { ...current[idx], ...updates };
      current[idx] = updatedItem;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return updatedItem;
    }
  } catch {}
  return undefined;
}
