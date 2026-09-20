# MAANAK (मानक) — Master Atomic Task Implementation Plan

**Platform for Generation of Test Reports & Compliance Verification for Non-Automatic Weighing Instruments (NAWI) per OIML R-76**  
**Problem Statement:** SIH26035 | **System Name:** MAANAK (मानक)  
**Document Version:** 3.0.0 | **Execution Philosophy:** 100% Atomic Tasks — One Iteration Per Task for AI Agents  

---

> [!IMPORTANT]
> **Authoritative Developer Directives:**
> 1. **Strict Documentation Adherence**: All engineers, agents, and contributors must follow this document and the associated `/docs` specifications strictly.
> 2. **Atomic Task Execution**: Every task in this document is engineered to be **self-contained and executable in a single iteration by an AI agent without hallucinating**. Do not combine tasks or skip prerequisites.
> 3. **Node.js Ecosystem**: All backend and calculation services are implemented exclusively in **Node.js (LTS v20+ / v22+) using TypeScript**. Python/FastAPI is completely replaced.
> 4. **Latest Stable Packages**: Always install and use the latest stable releases of all workspace packages (e.g. Next.js 16 LTS v16.3.5, React 19, Tailwind CSS v4, Prisma ORM, Express/Fastify, `decimal.js`, `docx`, `pdf-lib`, `zod`, `lucide-react`).
> 5. **Mandatory Mobile Phone Responsiveness**: Every single UI screen, component, and form **must be 100% responsive for mobile phones (smartphones 360px–430px)** as well as tablets and desktops.
> 6. **Lucide React Icons**: All UI iconography across desktop, tablet, and mobile PWA clients must use **`lucide-react`** (latest stable).
> 7. **Zero Floating Point Errors**: Decimal calculations ($P, E, E_0, E_c, \text{MPE}$) must strictly use `decimal.js` for arbitrary precision arithmetic.

---

## 1. Master Execution Principles for AI Agents

To ensure zero hallucination, maximum precision, and predictable progress across development sessions, every task follows these non-negotiable rules:

1. **Explicit Inputs & Outputs**: Each task defines exact file paths, exported symbols, function signatures, data types, and assertions.
2. **Prerequisite Gating**: A task cannot be marked `READY` or started until all its `Blocked By` task dependencies are verified with passing tests.
3. **Deterministic Testing**: Every task must be verified with an automated test command (`pnpm test ...` or equivalent) proving code correctness before moving to the next task.
4. **No Hidden Logic**: Metrological formulas, Table 3/6 brackets, and NABL 129 rules are explicitly written in the task specification.

---

## 2. Monorepo Structure & Package Boundaries

```
maanak-monorepo/
├── package.json
├── pnpm-workspace.yaml / turbo.json
├── tsconfig.base.json
├── docker-compose.yml
├── .env.example
├── packages/
│   ├── types/                  # Shared TypeScript types & Zod contracts
│   ├── rules-engine/           # Dynamic JSON rule packs, decimal.js math core, R-76/NABL validators
│   ├── db/                     # Prisma schema, migrations, seed scripts, PostgreSQL repository
│   ├── crypto-provenance/      # WELMEC 7.2 SHA-256 hash graph & X.509 PKI digital signer
│   └── report-generator/       # OIML R 76-2 PDF (@pdf-lib) & Word (docx) compiler with vector curves
├── apps/
│   ├── api/                    # Node.js (TypeScript) REST API Gateway & Business Layer
│   └── web/                    # Next.js 16 (LTS v16.3.5) Responsive Mobile PWA & Desktop Console
└── tests/
    └── e2e/                    # Ground truth domain verification tests (TC-01 to TC-05)
```

---

## 3. Module 00: Monorepo Foundation & Tooling

### TASK-001: Monorepo Root Workspace Initialization
* **Target File(s)**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`
* **Blocked By**: None (State: `READY`)
* **Technical Blueprint**:
  - Root `package.json` with `"private": true`, `"packageManager": "pnpm@9.x"` or npm workspaces.
  - Workspaces configured for `packages/*` and `apps/*`.
  - `turbo.json` with pipeline targets: `build`, `lint`, `test`, `dev`.
  - `tsconfig.base.json` with strict mode enabled, `target: "ES2022"`, `moduleResolution: "NodeNext"`, `isolatedModules: true`.
* **Acceptance Criteria**: Running `pnpm install` succeeds and `pnpm turbo run lint` recognizes all workspace packages.

---

### TASK-002: Docker Compose & Infrastructure Configuration
* **Target File(s)**: `docker-compose.yml`, `.env.example`
* **Blocked By**: `TASK-001`
* **Technical Blueprint**:
  - Define PostgreSQL 16 service: image `postgres:16-alpine`, port `5432:5432`, environment `POSTGRES_DB=maanak_dev`, `POSTGRES_USER=maanak_user`, `POSTGRES_PASSWORD=maanak_pass`.
  - Health check on PostgreSQL using `pg_isready -U maanak_user -d maanak_dev`.
  - Environment variables template in `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `CLIENT_URL`.
* **Acceptance Criteria**: Running `docker compose up -d postgres` starts healthy container and responds on port 5432.

---

### TASK-003: Shared Workspace Build & Test Scripts
* **Target File(s)**: `package.json`, `.editorconfig`
* **Blocked By**: `TASK-001`
* **Technical Blueprint**:
  - Add workspace root convenience scripts:
    ```json
    "scripts": {
      "build": "turbo run build",
      "test": "turbo run test",
      "lint": "turbo run lint",
      "db:generate": "pnpm --filter @maanak/db run generate",
      "db:migrate": "pnpm --filter @maanak/db run migrate:dev",
      "db:seed": "pnpm --filter @maanak/db run seed"
    }
    ```
* **Acceptance Criteria**: Running `pnpm test` triggers test suites across all packages without syntax errors.

---

## 4. Module 01: Shared Types & Domain Schemas (`packages/types`)

### TASK-004: Package Scaffolding (`packages/types`)
* **Target File(s)**: `packages/types/package.json`, `packages/types/tsconfig.json`
* **Blocked By**: `TASK-001`
* **Technical Blueprint**:
  - `package.json` with `"name": "@maanak/types"`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`.
  - Dependencies: `zod` (latest stable).
* **Acceptance Criteria**: Running `pnpm --filter @maanak/types build` produces valid TypeScript declaration files in `dist/`.

---

### TASK-005: Metrological & Instrument Domain Types
* **Target File(s)**: `packages/types/src/metrology.ts`
* **Blocked By**: `TASK-004`
* **Technical Blueprint**:
  - Export enums:
    ```typescript
    export enum AccuracyClass {
      CLASS_I = "I",
      CLASS_II = "II",
      CLASS_III = "III",
      CLASS_IIII = "IIII"
    }
    export enum InstrumentType {
      SINGLE_INTERVAL = "SINGLE_INTERVAL",
      MULTI_INTERVAL = "MULTI_INTERVAL",
      MULTIPLE_RANGE = "MULTIPLE_RANGE"
    }
    export enum WeightClass {
      E1 = "E1", E2 = "E2", F1 = "F1", F2 = "F2", M1 = "M1", M2 = "M2", M3 = "M3"
    }
    ```
  - Export interfaces: `PartialWeighingRange` ($W_i, \text{Max}_i, e_i, d_i$), `InstrumentModelSpecification`, `ComplianceStatus` (`PASS | FAIL | INCONCLUSIVE`).
* **Acceptance Criteria**: TypeScript compiles cleanly with zero type errors; exports are accessible to other packages.

---

### TASK-006: Test Session & Observation Domain Types
* **Target File(s)**: `packages/types/src/session.ts`
* **Blocked By**: `TASK-004`, `TASK-005`
* **Technical Blueprint**:
  - Export enums: `TestFormType` (`FORM_1_WEIGHING`, `FORM_2_TEMP_DRIFT`, `FORM_3_ECCENTRICITY`, `FORM_4_DISCRIMINATION`, `FORM_5_REPEATABILITY`, `FORM_6_CREEP`), `SessionStatus` (`DRAFT`, `IN_PROGRESS`, `PENDING_REVIEW`, `FLAGGED`, `APPROVED`, `REJECTED`).
  - Export interfaces:
    - `RawObservation`: `loadMass` ($L$), `indicatedValue` ($I$), `turningPointDeltaL` ($\Delta L$), `timestamp`, `temperature`, `humidity`, `zeroCorrection` ($I_0, \Delta L_0$).
    - `CalculationTraceItem`: calculated values ($P, E, E_0, E_c$), applicable $\text{MPE}$, formula step notes, compliance flag.
* **Acceptance Criteria**: Interfaces strictly match definitions in `docs/maanak-db-schema-spec.md`.

---

### TASK-007: NABL 129, WELMEC 7.2 & Provenance Types
* **Target File(s)**: `packages/types/src/compliance.ts`
* **Blocked By**: `TASK-004`
* **Technical Blueprint**:
  - Export interfaces:
    - `WeightCertificate`: certificate number, calibration date, expiry date, expanded uncertainty ($U$), coverage factor ($k=2$).
    - `NABLPreCheckResult`: `compliant` (boolean), `actualUncertainty`, `maxAllowedUncertainty` ($\frac{1}{3}\text{MPE}$), `warningMessage`.
    - `ProvenanceNode`: `nodeId`, `parentNodeId`, `eventType`, `payloadHash`, `timestamp`, `merkleRoot`.
    - `DigitalSignatureMetadata`: `certificateDn`, `serialNumber`, `signingTime`, `sha256Digest`, `valid`.
* **Acceptance Criteria**: Types compile cleanly and are exported from root `packages/types/src/index.ts`.

---

### TASK-008: Zod Validation Contracts for API & Storage
* **Target File(s)**: `packages/types/src/api.ts`
* **Blocked By**: `TASK-005`, `TASK-006`, `TASK-007`
* **Technical Blueprint**:
  - Export Zod schemas:
    - `CreateInstrumentSchema`: validates name, class, Max, Min, $e, d$, partial ranges.
    - `SubmitObservationSchema`: validates session ID, test type, $L, I, \Delta L$, ambient conditions.
    - `LoginSchema`, `VerifyReportSchema`.
* **Acceptance Criteria**: Zod schemas parse valid fixtures and reject invalid inputs with structured errors.

---

## 5. Module 02: Standards-as-Code Rule Packs (`packages/rules-engine`)

### TASK-009: Dynamic Rule Pack JSON Definition (`oiml-r76-2006-v1.json`)
* **Target File(s)**: `packages/rules-engine/src/rules/oiml-r76-2006-v1.json`
* **Blocked By**: `TASK-001`
* **Technical Blueprint**:
  - Create complete versioned JSON rule pack defining:
    - Metadata: `id: "oiml-r76-2006-v1"`, `standard: "OIML R 76-1:2006"`, `version: "1.0.0"`.
    - Table 3 classification limits: minimum/maximum verification scale divisions ($n$) for Classes I, II, III, IIII.
    - Table 6 Initial Verification MPE step limits:
      - Class I: $[0, 50000e] \to \pm 0.5e$, $(50000e, 200000e] \to \pm 1.0e$, $> 200000e \to \pm 1.5e$.
      - Class II: $[0, 5000e] \to \pm 0.5e$, $(5000e, 20000e] \to \pm 1.0e$, $(20000e, 100000e] \to \pm 1.5e$.
      - Class III: $[0, 500e] \to \pm 0.5e$, $(500e, 2000e] \to \pm 1.0e$, $(2000e, 10000e] \to \pm 1.5e$.
      - Class IIII: $[0, 50e] \to \pm 0.5e$, $(50e, 200e] \to \pm 1.0e$, $(200e, 1000e] \to \pm 1.5e$.
    - Environmental constraints: Max temperature drift rate = $5.0\,^\circ\text{C/h}$, NABL 129 ratio $U/\text{MPE} \le 1/3$.
* **Acceptance Criteria**: File is valid JSON and strictly matches official OIML R 76-1 tables.

---

### TASK-010: Rule Pack Zod Validator & Loader
* **Target File(s)**: `packages/rules-engine/src/loader.ts`
* **Blocked By**: `TASK-008`, `TASK-009`
* **Technical Blueprint**:
  - Write `RulePackSchema` in Zod to validate rule pack JSON structure.
  - Implement `loadRulePack(filePath: string): RulePack`.
  - Implement `validateRulePack(rulePackData: unknown): RulePack`.
* **Acceptance Criteria**: Unit test verifies that `oiml-r76-2006-v1.json` loads without validation errors.

---

### TASK-011: Table 3 NAWI Instrument Classifier
* **Target File(s)**: `packages/rules-engine/src/classifier.ts`
* **Blocked By**: `TASK-010`
* **Technical Blueprint**:
  - Function: `classifyInstrument(max: string, e: string, d: string, accuracyClass: AccuracyClass): { valid: boolean; n: number; minAllowedN: number; maxAllowedN: number; errorReason?: string }`.
  - Formula: $n = \text{Max} / e$ (calculated via `decimal.js`).
  - Validation: Verify $n$ falls within $[n_{\min}, n_{\max}]$ for the requested Accuracy Class per Table 3.
* **Acceptance Criteria**: Unit tests verify that $15\text{ kg} / 5\text{ g} \implies n = 3000$ (Valid Class III), and $15\text{ kg} / 1\text{ mg}$ triggers invalid class error.

---

### TASK-012: Table 6 MPE Step-Bracket Engine
* **Target File(s)**: `packages/rules-engine/src/mpe.ts`
* **Blocked By**: `TASK-010`
* **Technical Blueprint**:
  - Function: `getMpe(load: string, e: string, accuracyClass: AccuracyClass, rulePack: RulePack): { mpeInE: string; mpeInMass: string; stepBracket: string }`.
  - Step logic: Compare $m = \text{load} / e$ against Table 6 brackets.
  - Returns MPE as both multiple of $e$ ($\pm 0.5, \pm 1.0, \pm 1.5$) and absolute mass ($\pm 0.5e, \pm 1.0e, \pm 1.5e$).
* **Acceptance Criteria**: Unit test confirms for Class III scale ($e=5\text{ g}$): load $2.5\text{ kg} (500e) \implies \text{MPE} = \pm 2.5\text{ g}$; load $10\text{ kg} (2000e) \implies \text{MPE} = \pm 5.0\text{ g}$; load $15\text{ kg} \implies \text{MPE} = \pm 7.5\text{ g}$.

---

### TASK-013: Dynamic Rule Pack Registry & Hot-Swap Service
* **Target File(s)**: `packages/rules-engine/src/registry.ts`
* **Blocked By**: `TASK-010`, `TASK-012`
* **Technical Blueprint**:
  - In-memory registry: `RulePackRegistry` class.
  - Methods: `registerRulePack(pack: RulePack)`, `getRulePack(id: string): RulePack`, `listRulePacks(): RulePackMetadata[]`.
  - Hot-swap: Allows registering an updated version (e.g. `oiml-r76-2026-v1.json`) at runtime without server restart.
* **Acceptance Criteria**: Unit test registers a mock rule pack with custom MPE brackets and verifies that subsequent queries return the new rule pack's brackets.

---

## 6. Module 03: Deterministic Metrological Math Core (`packages/rules-engine`)

### TASK-014: Arbitrary-Precision Math Wrapper (`math.ts`)
* **Target File(s)**: `packages/rules-engine/src/math.ts`
* **Blocked By**: `TASK-001`
* **Technical Blueprint**:
  - Configure `decimal.js`: `Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP })`.
  - Export helper functions: `toDecimal(val)`, `add(a, b)`, `sub(a, b)`, `mul(a, b)`, `div(a, b)`, `abs(a)`, `roundToScale(val, scaleInterval)`.
  - Enforce zero use of native JS floating-point operators (`+`, `-`, `*`, `/`) on measurement values.
* **Acceptance Criteria**: Unit test verifies $0.1 + 0.2 = 0.3$ exactly without IEEE 754 rounding artifacts (`0.30000000000000004`).

---

### TASK-015: Vernier Turning Point Indication Calculator (`vernier.ts`)
* **Target File(s)**: `packages/rules-engine/src/vernier.ts`
* **Blocked By**: `TASK-014`
* **Technical Blueprint**:
  - Function: `calculateIndicationP(indicatedI: string, deltaL: string, e: string): string`.
  - Mathematical Formula:
    $$P = I + 0.5e - \Delta L$$
  - Function: `calculateRawErrorE(indicatedP: string, loadMassL: string): string`.
  - Mathematical Formula:
    $$E = P - L$$
* **Acceptance Criteria**: Test Case TC-01 Load 1: $I = 2.500\text{ kg}$, $e = 0.005\text{ kg}$, $\Delta L = 0.0020\text{ kg} \implies P = 2.5005\text{ kg}$, $E = +0.0005\text{ kg} (+0.5\text{ g})$.

---

### TASK-016: Corrected Error & Compliance Evaluator (`corrector.ts`)
* **Target File(s)**: `packages/rules-engine/src/corrector.ts`
* **Blocked By**: `TASK-014`, `TASK-015`
* **Technical Blueprint**:
  - Function: `calculateCorrectedErrorEc(errorE: string, zeroErrorE0: string): string`.
  - Formula:
    $$E_c = E - E_0$$
  - Function: `evaluateCompliance(correctedErrorEc: string, mpeInMass: string): { pass: boolean; ratioToMpe: string; margin: string }`.
  - Constraint: $|E_c| \le |\text{MPE}| \implies \text{PASS}$; otherwise $\text{FAIL}$.
* **Acceptance Criteria**: Correctly computes $E_c$ and evaluates PASS/FAIL against MPE boundaries.

---

### TASK-017: Multi-Interval Range Resolver (`multi_interval.ts`)
* **Target File(s)**: `packages/rules-engine/src/multi_interval.ts`
* **Blocked By**: `TASK-014`
* **Technical Blueprint**:
  - Function: `getActiveRangeForLoad(load: string, partialRanges: PartialWeighingRange[]): PartialWeighingRange`.
  - Evaluates active range $W_i$ where $\text{Max}_{i-1} < \text{load} \le \text{Max}_i$.
  - Returns active scale interval $e_i$ and Vernier step increment.
* **Acceptance Criteria**: Unit test with 2 ranges ($W_1: 0\text{--}3\text{ kg}, e_1=1\text{ g}$; $W_2: 3\text{--}6\text{ kg}, e_2=2\text{ g}$): load $2.5\text{ kg} \to e=1\text{ g}$; load $4.5\text{ kg} \to e=2\text{ g}$.

---

### TASK-018: Form 1 Evaluator: Weighing Performance (`form1_weighing.ts`)
* **Target File(s)**: `packages/rules-engine/src/forms/form1_weighing.ts`
* **Blocked By**: `TASK-015`, `TASK-016`, `TASK-017`
* **Technical Blueprint**:
  - Process increasing and decreasing load runs.
  - Calculate $E_0$ at start from zero load.
  - For each step: calculate $P_i, E_i, E_{c,i}$, compare with Table 6 MPE.
  - Calculate hysteresis error: $E_{\text{hyst}} = |E_{\text{descending}} - E_{\text{ascending}}|$.
  - Check hysteresis compliance: $E_{\text{hyst}} \le |\text{MPE}|$.
* **Acceptance Criteria**: Executes TC-01 full dataset and outputs pass status matching official OIML R 76-2 Form 1.

---

### TASK-019: Form 2 Evaluator: Temperature Effect on No-Load (`form2_temp_drift.ts`)
* **Target File(s)**: `packages/rules-engine/src/forms/form2_temp_drift.ts`
* **Blocked By**: `TASK-014`, `TASK-015`
* **Technical Blueprint**:
  - Calculate zero indication drift between consecutive temperatures:
    $$\Delta E_0 = |E_0(T_2) - E_0(T_1)|$$
  - Compliance threshold: $\Delta E_0 \le 1.0e$ per temperature step.
  - Temperature drift rate check:
    $$\text{Rate} = \frac{|\Delta \theta|}{\Delta t} \le 5.0\,^\circ\text{C/h}$$
* **Acceptance Criteria**: Rate of $8.0\,^\circ\text{C/h}$ flags error; drift of $0.4e$ passes.

---

### TASK-020: Form 3 & Form 4 Evaluator: Eccentricity & Discrimination
* **Target File(s)**: `packages/rules-engine/src/forms/form3_4_ecc_disc.ts`
* **Blocked By**: `TASK-015`, `TASK-016`
* **Technical Blueprint**:
  - Eccentricity (Form 3): Evaluate 4 corner positions + 1 center position with load $L = \text{Max} / 3$ or $\text{Max} / 4$. Check each position $|E_c| \le |\text{MPE}|$.
  - Discrimination (Form 4): Check that extra load $\Delta L = 1.4d$ causes indication to increment by $+1d$.
* **Acceptance Criteria**: Unit tests verify standard corner loading data and 1.4d discrimination pass/fail.

---

### TASK-021: Form 5 & Form 6 Evaluator: Repeatability & Creep
* **Target File(s)**: `packages/rules-engine/src/forms/form5_6_rep_creep.ts`
* **Blocked By**: `TASK-015`, `TASK-016`
* **Technical Blueprint**:
  - Repeatability (Form 5): 10 observations at $\approx 0.5\text{Max}$ and $\text{Max}$. Calculate $E_{\max} - E_{\min} \le |\text{MPE}|$.
  - Creep & Zero Return (Form 6): 30-minute or 4-hour test. Check difference between indication at 30 min and 15 min $\le 0.5e$; zero return after unloading $\le 0.5e$.
* **Acceptance Criteria**: Unit tests verify repeatability spread $E_{\max} - E_{\min}$ within MPE bounds.

---

## 7. Module 04: Metrological Compliance & Pre-Checks (`packages/rules-engine`)

### TASK-022: NABL 129 Standard Weight Uncertainty Pre-Check
* **Target File(s)**: `packages/rules-engine/src/nabl129.ts`
* **Blocked By**: `TASK-012`, `TASK-014`
* **Technical Blueprint**:
  - Function: `validateStandardWeightUncertainty(weightUncertaintyU: string, targetLoad: string, e: string, accuracyClass: AccuracyClass, rulePack: RulePack): NABLPreCheckResult`.
  - Rule: Expanded uncertainty $U$ ($k=2$) of standard weights shall not exceed $\frac{1}{3}$ of applicable Table 6 MPE:
    $$U \le \frac{1}{3}|\text{MPE}(L)|$$
  - Returns `compliant: false` with warning when violated.
* **Acceptance Criteria**: TC-02 test passes: at $L=500\text{ g}$, $\text{MPE}=0.005\text{ g} \implies \text{Max } U = 0.00166\text{ g}$. Input $U=0.0025\text{ g}$ returns `compliant: false`.

---

### TASK-023: Metrological Sanity & Anomaly Detection Engine
* **Target File(s)**: `packages/rules-engine/src/anomalies.ts`
* **Blocked By**: `TASK-014`, `TASK-015`
* **Technical Blueprint**:
  - Class: `AnomalyDetector`.
  - Rules evaluated:
    1. Monotonicity: Indication $I$ must increase with increasing load $L$.
    2. Delta L Bounds: $\Delta L$ must fall within $[0, e]$.
    3. Environmental Stability: Temperature drift rate $\le 5.0\,^\circ\text{C/h}$.
    4. Tare Sanity: Tare indication must cancel completely at zero net load.
* **Acceptance Criteria**: Anomaly detector flags non-monotonic step or excessive $\Delta L > e$ with clear diagnostic codes.

---

### TASK-024: Dynamic Test Plan Generator
* **Target File(s)**: `packages/rules-engine/src/planner.ts`
* **Blocked By**: `TASK-011`, `TASK-012`
* **Technical Blueprint**:
  - Function: `generateTestPlan(instrument: InstrumentModelSpecification, rulePack: RulePack): TestPlan`.
  - Calculates required test loads for Forms 1–6:
    - Min load ($20e$), MPE step change points ($500e, 2000e$), 50% Max, 100% Max.
    - Corner loading positions for Form 3 ($L = \text{Max} / 3$).
* **Acceptance Criteria**: Generates sequence of 10+ standard load points for a 15 kg Class III balance.

---

## 8. Module 05: Database Layer (`packages/db`)

### TASK-025: Prisma Schema Definition
* **Target File(s)**: `packages/db/prisma/schema.prisma`
* **Blocked By**: `TASK-002`, `TASK-005`, `TASK-006`
* **Technical Blueprint**:
  - Models: `User`, `Laboratory`, `InstrumentModel`, `ReferenceStandard`, `TestSession`, `RawObservation`, `CalculationTraceItem`, `Report`, `ProvenanceNode`.
  - All metrological decimal values defined with `@db.Decimal(16, 8)` to prevent precision loss.
  - Foreign keys with referential integrity (`onDelete: Cascade` or `onDelete: Restrict`).
* **Acceptance Criteria**: Running `pnpm --filter @maanak/db prisma validate` returns valid schema with zero errors.

---

### TASK-026: Prisma Database Migration Execution
* **Target File(s)**: `packages/db/prisma/migrations/`
* **Blocked By**: `TASK-025`
* **Technical Blueprint**:
  - Execute `prisma migrate dev --name init_metrology_models`.
  - Verify generated SQL migration creates tables, indexes, unique constraints, and foreign keys.
* **Acceptance Criteria**: Database contains all tables with correct PostgreSQL column types (`numeric(16,8)`).

---

### TASK-027: Database Seed Script
* **Target File(s)**: `packages/db/prisma/seed.ts`
* **Blocked By**: `TASK-026`
* **Technical Blueprint**:
  - Seed 1 Laboratory: "Regional Reference Standard Laboratory (RRSL), Ahmedabad".
  - Seed 4 Users: Inspector (`inspector@rrsl.gov.in`), Reviewer (`reviewer@rrsl.gov.in`), Director (`director@rrsl.gov.in`), Admin (`admin@rrsl.gov.in`).
  - Seed Standard Weight Sets: E2 (1 mg – 500 g), F1 (1 g – 10 kg), M1 (1 kg – 20 kg) with calibration certificates.
  - Seed Sample NAWI Models: Class I (220 g analytical balance), Class III (15 kg retail scale).
* **Acceptance Criteria**: Running `pnpm --filter @maanak/db prisma db seed` seeds database successfully.

---

### TASK-028: Database Client & Repository Wrapper
* **Target File(s)**: `packages/db/src/client.ts`, `packages/db/src/index.ts`
* **Blocked By**: `TASK-026`
* **Technical Blueprint**:
  - Export singleton `prisma` client instance with connection pooling.
  - Export query helper functions: `createSession`, `addObservationWithTrace`, `getSessionWithDetails`, `lockSessionForReview`.
* **Acceptance Criteria**: Integration test connects to database, inserts a test record, and reads it back accurately.

---

## 9. Module 06: WELMEC 7.2 Provenance & Cryptographic Signer (`packages/crypto-provenance`)

### TASK-029: WELMEC 7.2 SHA-256 Hash Graph Node Generator
* **Target File(s)**: `packages/crypto-provenance/src/hasher.ts`
* **Blocked By**: `TASK-007`
* **Technical Blueprint**:
  - Function: `computeObservationHash(obs: RawObservation, prevHash: string): string`.
  - Canonical JSON stringification (deterministic key order) before SHA-256 hashing.
  - Hash chain formula: $\text{NodeHash}_i = \text{SHA256}(\text{NodeHash}_{i-1} + \text{CanonicalJSON}(\text{Payload}_i))$.
* **Acceptance Criteria**: Modifying a single character in observation payload completely changes the resulting hash.

---

### TASK-030: Provenance Chain Validator & Tamper Detector
* **Target File(s)**: `packages/crypto-provenance/src/chain_validator.ts`
* **Blocked By**: `TASK-029`
* **Technical Blueprint**:
  - Function: `validateSessionProvenanceChain(nodes: ProvenanceNode[]): { valid: boolean; brokenAtIndex?: number; expectedHash?: string; actualHash?: string }`.
  - Traverses the chain from root to leaf, re-computing each node hash.
* **Acceptance Criteria**: TC-05 simulated SQL tampering test correctly flags corrupted node index.

---

### TASK-031: X.509 PKI Digital Signature Service
* **Target File(s)**: `packages/crypto-provenance/src/signer.ts`
* **Blocked By**: `TASK-029`
* **Technical Blueprint**:
  - Module using `@peculiar/x509` and Node.js `crypto`.
  - Function: `signReportDigest(pdfBuffer: Buffer, privateKeyPem: string, certPem: string): Promise<Buffer>`.
  - Generates Adobe-compliant digital signature and embeds cryptographic signature dictionary into PDF.
* **Acceptance Criteria**: Generated PDF displays valid signature metadata when inspected.

---

### TASK-032: Public Verification QR Code Generator
* **Target File(s)**: `packages/crypto-provenance/src/qr.ts`
* **Blocked By**: `TASK-029`
* **Technical Blueprint**:
  - Function: `generateVerificationQrSvg(sessionHash: string, verifyBaseUrl: string): Promise<string>`.
  - Encodes URL: `${verifyBaseUrl}/verify/${sessionHash}`.
  - Returns SVG string for direct embedding into PDF Page 1.
* **Acceptance Criteria**: QR SVG is generated and decodes to valid verification URL.

---

## 10. Module 07: Report Generation Engine (`packages/report-generator`)

### TASK-033: Vector Error Curve Generator (`charts.ts`)
* **Target File(s)**: `packages/report-generator/src/charts.ts`
* **Blocked By**: `TASK-016`
* **Technical Blueprint**:
  - Function: `generateErrorCurveSvg(observations: CalculationTraceItem[], maxLoad: string): string`.
  - Generates SVG error curve:
    - X-axis: Load mass $L$.
    - Y-axis: Corrected error $E_c$.
    - Step envelopes: Positive MPE and Negative MPE step lines.
* **Acceptance Criteria**: Generates clean vector SVG with plotted points and colored tolerance envelopes.

---

### TASK-034: OIML R 76-2 Multi-Page PDF Compiler (`pdf.ts`)
* **Target File(s)**: `packages/report-generator/src/pdf.ts`
* **Blocked By**: `TASK-031`, `TASK-032`, `TASK-033`
* **Technical Blueprint**:
  - Use `@pdf-lib` to construct official OIML R 76-2 report:
    - Page 1: Title page, Legal Metrology Act Sec 22 reference, instrument specs, Director digital signature block, QR code.
    - Page 2: Executive summary table of all test forms (PASS/FAIL).
    - Page 3+: Forms 1–6 detailed observation tables ($L, I, \Delta L, P, E, E_c, \text{MPE}$).
    - Embedded vector error curve SVG on Form 1 page.
* **Acceptance Criteria**: Compiles multi-page PDF in $< 1.5$ seconds; formatting aligns with official OIML R 76-2 sample.

---

### TASK-035: Editable Word Document (.docx) Compiler
* **Target File(s)**: `packages/report-generator/src/docx.ts`
* **Blocked By**: `TASK-033`
* **Technical Blueprint**:
  - Use `docx` library to create `.docx` version of the report.
  - Formatted tables with government header, cell borders, and bold headers matching Indian Legal Metrology test sheets.
* **Acceptance Criteria**: Generates valid `.docx` file that opens cleanly in Word/LibreOffice.

---

### TASK-036: Report Storage & Checksum Service
* **Target File(s)**: `packages/report-generator/src/storage.ts`
* **Blocked By**: `TASK-034`, `TASK-035`
* **Technical Blueprint**:
  - Save generated PDF and DOCX to local storage / S3.
  - Calculate and store SHA-256 checksum of generated file.
* **Acceptance Criteria**: Saved file checksum matches database record.

---

## 11. Module 08: Backend REST API Gateway (`apps/api`)

### TASK-037: Express Application Skeleton & Security Middleware
* **Target File(s)**: `apps/api/src/app.ts`, `apps/api/src/server.ts`
* **Blocked By**: `TASK-001`, `TASK-008`
* **Technical Blueprint**:
  - Setup Express app with TypeScript.
  - Security middlewares: `helmet()`, `cors({ origin: clientUrl })`, `express.json({ limit: "10mb" })`.
  - Standard error handling middleware returning `{ error: string, code: string, details?: unknown }`.
* **Acceptance Criteria**: `curl http://localhost:4000/health` returns `{ status: "ok" }`.

---

### TASK-038: Argon2id Authentication & RBAC Middleware
* **Target File(s)**: `apps/api/src/auth/service.ts`, `apps/api/src/auth/middleware.ts`
* **Blocked By**: `TASK-028`, `TASK-037`
* **Technical Blueprint**:
  - Password hashing: `argon2.hash(password)` with Argon2id parameters.
  - JWT token generation (access token: 15m, refresh token: 7d).
  - RBAC guard middleware: `requireRole([Role.INSPECTOR, Role.DIRECTOR])`.
* **Acceptance Criteria**: POST `/api/v1/auth/login` with valid credentials returns JWT; accessing protected route without token returns 401.

---

### TASK-039: Rule Pack Management API Routes
* **Target File(s)**: `apps/api/src/routes/rules.ts`
* **Blocked By**: `TASK-013`, `TASK-038`
* **Technical Blueprint**:
  - `GET /api/v1/rules`: List registered rule packs.
  - `GET /api/v1/rules/:id`: Fetch active rule pack details.
  - `POST /api/v1/rules/upload`: Upload updated rule pack JSON (Admin only).
* **Acceptance Criteria**: Admin user can upload new rule pack and verify it becomes active.

---

### TASK-040: Reference Standard Weight Inventory API Routes
* **Target File(s)**: `apps/api/src/routes/weights.ts`
* **Blocked By**: `TASK-022`, `TASK-028`, `TASK-038`
* **Technical Blueprint**:
  - `GET /api/v1/weights`: List available weight sets for laboratory.
  - `POST /api/v1/weights`: Register new weight set with calibration certificate.
  - `POST /api/v1/weights/precheck`: Real-time NABL 129 validation ($U \le \frac{1}{3}\text{MPE}$).
* **Acceptance Criteria**: Out-of-spec weight set returns `compliant: false` with amber warning payload.

---

### TASK-041: Instrument Model Registration API Routes
* **Target File(s)**: `apps/api/src/routes/instruments.ts`
* **Blocked By**: `TASK-011`, `TASK-028`, `TASK-038`
* **Technical Blueprint**:
  - `POST /api/v1/instruments`: Register new NAWI pattern with Table 3 classification check.
  - `GET /api/v1/instruments`: List instruments with search & filter.
  - `GET /api/v1/instruments/:id`: Retrieve single instrument details.
* **Acceptance Criteria**: Submitting valid instrument returns 201 with computed scale divisions $n$.

---

### TASK-042: Test Session & Plan Generation API Routes
* **Target File(s)**: `apps/api/src/routes/sessions.ts`
* **Blocked By**: `TASK-024`, `TASK-028`, `TASK-038`
* **Technical Blueprint**:
  - `POST /api/v1/sessions`: Create new test session bound to active rule pack.
  - `GET /api/v1/sessions/:id/plan`: Get dynamic test plan with required load points.
  - `PATCH /api/v1/sessions/:id/status`: Transition session status (`DRAFT \to IN_PROGRESS \to PENDING_REVIEW`).
* **Acceptance Criteria**: Returns structured test plan tailored to instrument Class and Max.

---

### TASK-043: Raw Observation Entry & Real-Time Math API
* **Target File(s)**: `apps/api/src/routes/observations.ts`
* **Blocked By**: `TASK-015`, `TASK-016`, `TASK-028`, `TASK-029`
* **Technical Blueprint**:
  - `POST /api/v1/sessions/:id/observations`: Record raw reading ($L, I, \Delta L$).
  - Executes instant $P = I + 0.5e - \Delta L$, $E = P - L$, $E_c = E - E_0$, MPE comparison.
  - Creates atomic `RawObservation`, `CalculationTraceItem`, and `ProvenanceNode`.
* **Acceptance Criteria**: Observation entry returns calculated results within $< 30\text{ms}$.

---

### TASK-044: Reviewer Anomaly Audit API Routes
* **Target File(s)**: `apps/api/src/routes/review.ts`
* **Blocked By**: `TASK-023`, `TASK-028`, `TASK-038`
* **Technical Blueprint**:
  - `GET /api/v1/sessions/:id/audit`: Run automated anomaly rules on session.
  - `POST /api/v1/sessions/:id/approve`: Senior Reviewer approves session.
  - `POST /api/v1/sessions/:id/flag`: Flag session with comments and return for re-test.
* **Acceptance Criteria**: Detects thermal drift or monotonicity violations and reports anomaly list.

---

### TASK-045: Report Generation & PKI Signing API Routes
* **Target File(s)**: `apps/api/src/routes/reports.ts`
* **Blocked By**: `TASK-031`, `TASK-034`, `TASK-035`, `TASK-038`
* **Technical Blueprint**:
  - `POST /api/v1/reports/:sessionId/generate`: Generate PDF and DOCX reports.
  - `POST /api/v1/reports/:id/sign`: Director applies X.509 PKI digital signature.
  - `GET /api/v1/reports/:id/pdf`: Stream report PDF.
* **Acceptance Criteria**: Complete signed PDF downloaded with embedded signature block and QR code.

---

### TASK-046: Public Verification & Offline Sync API Routes
* **Target File(s)**: `apps/api/src/routes/verify.ts`, `apps/api/src/routes/sync.ts`
* **Blocked By**: `TASK-030`, `TASK-038`
* **Technical Blueprint**:
  - `GET /api/v1/verify/:hash`: Public route returning provenance verification status.
  - `POST /api/v1/sync/push`: Batch upload observations captured offline.
  - `GET /api/v1/sync/pull`: Fetch active session metadata for offline storage.
* **Acceptance Criteria**: Sync endpoint ingests batch observations and maintains valid hash chain.

---

## 12. Module 09: Responsive Web Console & Mobile Bench PWA (`apps/web`)

### TASK-047: Next.js 16 Project Setup & Theme Configuration
* **Target File(s)**: `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/src/app/globals.css`
* **Blocked By**: `TASK-001`, `TASK-008`
* **Technical Blueprint**:
  - Next.js 16 (LTS v16.3.5) with App Router and React 19.
  - Tailwind CSS v4 with Tweakcn Twitter OKLCH theme tokens:
    `--primary: oklch(0.6723 0.1606 244.9955)`, `--radius: 1.3rem`.
  - Install `lucide-react` (latest stable).
* **Acceptance Criteria**: Next.js app builds cleanly; renders styled page with Twitter Sky Blue theme tokens.

---

### TASK-048: Universal Responsive Mobile Shell & Layout
* **Target File(s)**: `apps/web/src/components/layout/Shell.tsx`, `apps/web/src/components/layout/MobileNav.tsx`
* **Blocked By**: `TASK-047`
* **Technical Blueprint**:
  - Desktop view ($\ge 1024\text{px}$): Persistent sidebar navigation.
  - Mobile phone view ($360\text{px}\text{--}430\text{px}$): Top header with hamburger button triggering `<SheetContent side="left">` drawer.
  - Sticky bottom action bar container for mobile viewports.
* **Acceptance Criteria**: Verified zero horizontal scroll on 360px viewport (Chrome DevTools).

---

### TASK-049: Shared Metrological UI Component Library
* **Target File(s)**: `apps/web/src/components/ui/` (`Button.tsx`, `Card.tsx`, `Badge.tsx`, `Input.tsx`, `Table.tsx`)
* **Blocked By**: `TASK-047`
* **Technical Blueprint**:
  - Buttons with pill rounding (`rounded-2xl`, `rounded-3xl`) and min touch target $48\text{px} \times 48\text{px}$ on mobile.
  - Badges for PASS (Green), FAIL (Red), WARNING (Amber).
  - Measurement numeric inputs with `inputMode="decimal"` and `text-base` font to prevent iOS zoom.
* **Acceptance Criteria**: Storybook or component page renders components in light and dark mode with correct radii.

---

### TASK-050: Mobile-First Observation Card Component
* **Target File(s)**: `apps/web/src/components/bench/ObservationCard.tsx`
* **Blocked By**: `TASK-049`
* **Technical Blueprint**:
  - Mobile view ($< 640\text{px}$): Stacked card displaying Load #, Status badge, Input values ($I, \Delta L$), and calculated outputs ($P, E_c, \text{MPE}$).
  - Touch-friendly Vernier increment buttons ($+0.1e, +0.2e, +0.5e$).
  - Quick-edit drawer trigger for re-testing.
* **Acceptance Criteria**: Card renders cleanly on 375px iPhone viewport without wrapping issues.

---

### TASK-051: Laboratory Executive Dashboard Page
* **Target File(s)**: `apps/web/src/app/dashboard/page.tsx`
* **Blocked By**: `TASK-048`, `TASK-049`
* **Technical Blueprint**:
  - Responsive metric grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`): Active Sessions, Pending Reviews, Approved Today, Rejection Rate.
  - Recent test sessions list with live status badges.
  - Offline sync status indicator in header.
* **Acceptance Criteria**: Dashboard renders responsively on mobile phone (single column) and desktop (4 columns).

---

### TASK-052: Instrument Intake & Table 3 Classification Page
* **Target File(s)**: `apps/web/src/app/instruments/new/page.tsx`
* **Blocked By**: `TASK-049`
* **Technical Blueprint**:
  - Form fields: Manufacturer, Model, Serial #, Class (I–IIII), Max, Min, $e, d$.
  - Real-time client-side calculation of $n = \text{Max} / e$ with live Table 3 validity pill.
  - Multi-interval range configuration accordion.
* **Acceptance Criteria**: Entering $15\text{ kg}$ and $e=5\text{ g}$ immediately displays `n = 3000 (Valid Class III)` badge.

---

### TASK-053: Standard Weight Inventory & Live NABL Gatekeeper Page
* **Target File(s)**: `apps/web/src/app/weights/page.tsx`
* **Blocked By**: `TASK-049`
* **Technical Blueprint**:
  - Weight set selection interface.
  - Live NABL 129 uncertainty gatekeeper widget: Compares weight expanded uncertainty $U$ against target MPE.
  - Renders prominent amber warning card if $U > \frac{1}{3}\text{MPE}$, disabling test commencement.
* **Acceptance Criteria**: Selecting out-of-spec test weight displays warning banner and locks start button.

---

### TASK-054: Real-Time Bench Observation Logging Page
* **Target File(s)**: `apps/web/src/app/sessions/[id]/bench/page.tsx`
* **Blocked By**: `TASK-050`
* **Technical Blueprint**:
  - Multi-tab navigation between Forms 1–6.
  - Mobile phone layout: Card stack with sticky bottom "Save & Next" bar.
  - Real-time calculation feedback: Indication entry immediately computes $P$ and $E_c$.
  - Offline local storage fallback via IndexedDB.
* **Acceptance Criteria**: Inspector enters $I$ and $\Delta L$, card immediately displays calculated $E_c$ and PASS badge.

---

### TASK-055: Senior Reviewer Anomaly Audit Page
* **Target File(s)**: `apps/web/src/app/sessions/[id]/review/page.tsx`
* **Blocked By**: `TASK-049`
* **Technical Blueprint**:
  - Automated anomaly check list with green checkmarks or red flags.
  - Calculation derivation tree modal: Step-by-step audit showing $I \to \Delta L \to P \to E_c \to \text{MPE}$.
  - Approve Session and Flag for Re-Test action buttons.
* **Acceptance Criteria**: Anomaly audit screen highlights intentionally injected temperature drift error.

---

### TASK-056: Report Preview & Director X.509 PKI Signing Page
* **Target File(s)**: `apps/web/src/app/reports/[id]/page.tsx`
* **Blocked By**: `TASK-049`
* **Technical Blueprint**:
  - Multi-page responsive PDF viewer.
  - Cryptographic hash graph summary card showing session SHA-256 digest.
  - "Sign & Seal Report" button opening PIN confirmation modal for X.509 digital signing.
* **Acceptance Criteria**: Clicking sign executes digital signature and displays verified badge with download link.

---

### TASK-057: Public Verification QR Landing Page
* **Target File(s)**: `apps/web/src/app/verify/[hash]/page.tsx`
* **Blocked By**: `TASK-048`, `TASK-049`
* **Technical Blueprint**:
  - Public mobile-responsive page accessed via QR code scan.
  - Displays: Certificate status (VALID / INVALID), Instrument details, Signing authority, SHA-256 hash.
  - Full cryptographic provenance history tree.
* **Acceptance Criteria**: Scanning QR code opens page with green verified badge and certificate details.

---

### TASK-058: Offline PWA Service Worker & Sync Engine
* **Target File(s)**: `apps/web/src/pwa/sw.ts`, `apps/web/src/pwa/sync.ts`
* **Blocked By**: `TASK-047`, `TASK-054`
* **Technical Blueprint**:
  - Service worker caching static assets and API routes.
  - IndexedDB storage using `idb` for offline observations.
  - Background sync listener uploading pending observations upon network reconnection.
* **Acceptance Criteria**: App functions offline in Airplane Mode; changes sync automatically when reconnected.

---

## 13. Module 10: Ground Truth Verification & SIH Victory (`tests/e2e`)

### TASK-059: Test Suite TC-01: Standard Class III Weighing Performance
* **Target File(s)**: `tests/e2e/tc01_class3_weighing.test.ts`
* **Blocked By**: `TASK-018`, `TASK-043`
* **Technical Blueprint**:
  - Verify complete dataset from `Adobe Scan p. 2`:
    $15\text{ kg}$ scale, $e=5\text{ g}$.
    - Zero: $L=0, I=0, \Delta L=0.0025 \implies E_0 = 0$.
    - $500e$: $L=2.5\text{ kg}, I=2.500, \Delta L=0.0020 \implies P=2.5005, E_c=+0.5\text{ g} \le \pm 2.5\text{ g} \implies \text{PASS}$.
    - $2000e$: $L=10\text{ kg}, I=10.000, \Delta L=0.0015 \implies P=10.0010, E_c=+1.0\text{ g} \le \pm 5.0\text{ g} \implies \text{PASS}$.
    - Max: $L=15\text{ kg}, I=15.000, \Delta L=0.0010 \implies P=15.0015, E_c=+1.5\text{ g} \le \pm 7.5\text{ g} \implies \text{PASS}$.
* **Acceptance Criteria**: Test executes with 100% assertions passing.

---

### TASK-060: Test Suite TC-02: NABL 129 Standard Weight Uncertainty Violation
* **Target File(s)**: `tests/e2e/tc02_nabl_uncertainty.test.ts`
* **Blocked By**: `TASK-022`, `TASK-040`
* **Technical Blueprint**:
  - Verify blocking gatekeeper behavior:
    Class II, $\text{Max}=1\text{ kg}, e=0.01\text{ g}$. At $L=500\text{ g}$, $\text{MPE}=\pm 0.005\text{ g}$.
    Max allowed $U = \frac{1}{3} \times 0.005\text{ g} = 0.00166\text{ g}$.
    Input weight set with $U = 0.0025\text{ g}$.
* **Acceptance Criteria**: Test asserts system marks weight set invalid and blocks observation submission.

---

### TASK-061: Test Suite TC-03: Multi-Interval Partial Range Switching
* **Target File(s)**: `tests/e2e/tc03_multi_interval.test.ts`
* **Blocked By**: `TASK-017`, `TASK-043`
* **Technical Blueprint**:
  - Scale with $W_1 = 3\text{ kg} (e_1=1\text{ g})$ and $W_2 = 6\text{ kg} (e_2=2\text{ g})$.
  - Test at $L=2\text{ kg}$: active $e=1\text{ g}$, Vernier step $0.1\text{ g}$.
  - Test at $L=5\text{ kg}$: active $e=2\text{ g}$, Vernier step $0.2\text{ g}$.
* **Acceptance Criteria**: Test asserts dynamic interval switching and MPE re-calculation match OIML Clause 3.3.

---

### TASK-062: Test Suite TC-04: Temperature Drift Overrun
* **Target File(s)**: `tests/e2e/tc04_temp_drift.test.ts`
* **Blocked By**: `TASK-019`, `TASK-044`
* **Technical Blueprint**:
  - Temperature changes from $20.0\,^\circ\text{C}$ to $28.0\,^\circ\text{C}$ over 1 hour ($\Delta T = 8.0\,^\circ\text{C/h}$).
  - Reviewer audit engine must flag environmental instability violation ($> 5.0\,^\circ\text{C/h}$).
* **Acceptance Criteria**: Test asserts that audit endpoint flags session with code `ERR_TEMP_DRIFT_EXCEEDED`.

---

### TASK-063: Test Suite TC-05: WELMEC 7.2 Database Tampering Audit
* **Target File(s)**: `tests/e2e/tc05_welmec_tamper.test.ts`
* **Blocked By**: `TASK-030`, `TASK-046`
* **Technical Blueprint**:
  - Complete valid session with generated provenance hash chain.
  - Execute direct SQL update modifying raw indication: $I = 10.000\text{ kg} \to 10.005\text{ kg}$.
  - Re-run `validateSessionProvenanceChain`.
* **Acceptance Criteria**: Test asserts provenance validation fails, identifies corrupted node, and prevents report generation.
