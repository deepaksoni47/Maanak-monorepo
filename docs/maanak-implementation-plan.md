# MAANAK (मानक) — Master Atomic Task Implementation Plan

**Platform for Generation of Test Reports & Compliance Verification for Non-Automatic Weighing Instruments (NAWI) per OIML R-76**  
**Problem Statement:** SIH26035 | **System Name:** MAANAK (मानक)  
**Document Version:** 3.0.0 | **Execution Philosophy:** 100% Atomic Tasks — One Iteration Per Task for AI Agents

---

> [!IMPORTANT]
> **Authoritative Developer Directives:**
>
> 1. **Strict Documentation Adherence**: All engineers, agents, and contributors must follow this document and the associated `/docs` specifications strictly.
> 2. **Atomic Task Execution**: Every task in this document is engineered to be **self-contained and executable in a single iteration by an AI agent without hallucinating**. Do not combine tasks or skip prerequisites.
> 3. **Node.js Ecosystem**: All backend and calculation services are implemented exclusively in **Node.js (LTS v20+ / v22+) using TypeScript**. Python/FastAPI is completely replaced.
> 4. **Latest Stable Packages**: Always install and use the latest stable releases of all workspace packages (e.g. Next.js 16 LTS v16.3.5, React 19, Tailwind CSS v4, Prisma ORM, Express/Fastify, `decimal.js`, `docx`, `pdf-lib`, `zod`, `@phosphor-icons/react`).
> 5. **Mandatory Mobile Phone Responsiveness**: Every single UI screen, component, and form **must be 100% responsive for mobile phones (smartphones 360px–430px)** as well as tablets and desktops.
> 6. **Phosphor React Icons**: All UI iconography across desktop, tablet, and mobile PWA clients must use **`@phosphor-icons/react`** (latest stable).
> 7. **Zero Floating Point Errors**: Decimal calculations ($P, E, E_0, E_c, \text{MPE}$) must strictly use `decimal.js` for arbitrary precision arithmetic.
> 8. **Mandatory Skeleton Loaders (No Generic Spinners)**: All loading states across pages, tables, metrics cards, and forms **must strictly use animated skeleton loaders** (`<Skeleton className="animate-pulse bg-muted/60 rounded-2xl" />`) matching the exact geometry of the content to prevent Cumulative Layout Shift (CLS). Generic spinners (`<Loader2 className="animate-spin" />`) and blank loading screens are strictly prohibited.
> 9. **Dynamic Page Titles & Route Metadata**: Every single page route and view must declare a dynamic document title following the pattern: `<Page Title> | MAANAK (मानक) — OIML R-76 Legal Metrology` with contextual breadcrumbs.

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

- **Target File(s)**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`
- **Blocked By**: None (State: `READY`)
- **Technical Blueprint**:
  - Root `package.json` with `"private": true`, `"packageManager": "pnpm@9.x"` or npm workspaces.
  - Workspaces configured for `packages/*` and `apps/*`.
  - `turbo.json` with pipeline targets: `build`, `lint`, `test`, `dev`.
  - `tsconfig.base.json` with strict mode enabled, `target: "ES2022"`, `moduleResolution: "NodeNext"`, `isolatedModules: true`.
- **Acceptance Criteria**: Running `pnpm install` succeeds and `pnpm turbo run lint` recognizes all workspace packages.

---

### TASK-002: Docker Compose & Infrastructure Configuration

- **Target File(s)**: `docker-compose.yml`, `.env.example`
- **Blocked By**: `TASK-001`
- **Technical Blueprint**:
  - Define PostgreSQL 16 service: image `postgres:16-alpine`, port `5432:5432`, environment `POSTGRES_DB=maanak_dev`, `POSTGRES_USER=maanak_user`, `POSTGRES_PASSWORD=maanak_pass`.
  - Health check on PostgreSQL using `pg_isready -U maanak_user -d maanak_dev`.
  - Environment variables template in `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `CLIENT_URL`.
- **Acceptance Criteria**: Running `docker compose up -d postgres` starts healthy container and responds on port 5432.

---

### TASK-003: Shared Workspace Build & Test Scripts

- **Target File(s)**: `package.json`, `.editorconfig`
- **Blocked By**: `TASK-001`
- **Technical Blueprint**:
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
- **Acceptance Criteria**: Running `pnpm test` triggers test suites across all packages without syntax errors.

---

## 4. Module 01: Shared Types & Domain Schemas (`packages/types`)

### TASK-004: Package Scaffolding (`packages/types`)

- **Target File(s)**: `packages/types/package.json`, `packages/types/tsconfig.json`
- **Blocked By**: `TASK-001`
- **Technical Blueprint**:
  - `package.json` with `"name": "@maanak/types"`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`.
  - Dependencies: `zod` (latest stable).
- **Acceptance Criteria**: Running `pnpm --filter @maanak/types build` produces valid TypeScript declaration files in `dist/`.

---

### TASK-005: Metrological & Instrument Domain Types

- **Target File(s)**: `packages/types/src/metrology.ts`
- **Blocked By**: `TASK-004`
- **Technical Blueprint**:
  - Export enums:
    ```typescript
    export enum AccuracyClass {
      CLASS_I = "I",
      CLASS_II = "II",
      CLASS_III = "III",
      CLASS_IIII = "IIII",
    }
    export enum InstrumentType {
      SINGLE_INTERVAL = "SINGLE_INTERVAL",
      MULTI_INTERVAL = "MULTI_INTERVAL",
      MULTIPLE_RANGE = "MULTIPLE_RANGE",
    }
    export enum WeightClass {
      E1 = "E1",
      E2 = "E2",
      F1 = "F1",
      F2 = "F2",
      M1 = "M1",
      M2 = "M2",
      M3 = "M3",
    }
    ```
  - Export interfaces: `PartialWeighingRange` ($W_i, \text{Max}_i, e_i, d_i$), `InstrumentModelSpecification`, `ComplianceStatus` (`PASS | FAIL | INCONCLUSIVE`).
- **Acceptance Criteria**: TypeScript compiles cleanly with zero type errors; exports are accessible to other packages.

---

### TASK-006: Test Session & Observation Domain Types

- **Target File(s)**: `packages/types/src/session.ts`
- **Blocked By**: `TASK-004`, `TASK-005`
- **Technical Blueprint**:
  - Export enums: `TestFormType` (`FORM_1_WEIGHING`, `FORM_2_TEMP_DRIFT`, `FORM_3_ECCENTRICITY`, `FORM_4_DISCRIMINATION`, `FORM_5_REPEATABILITY`, `FORM_6_CREEP`), `SessionStatus` (`DRAFT`, `IN_PROGRESS`, `PENDING_REVIEW`, `FLAGGED`, `APPROVED`, `REJECTED`).
  - Export interfaces:
    - `RawObservation`: `loadMass` ($L$), `indicatedValue` ($I$), `turningPointDeltaL` ($\Delta L$), `timestamp`, `temperature`, `humidity`, `zeroCorrection` ($I_0, \Delta L_0$).
    - `CalculationTraceItem`: calculated values ($P, E, E_0, E_c$), applicable $\text{MPE}$, formula step notes, compliance flag.
- **Acceptance Criteria**: Interfaces strictly match definitions in `docs/maanak-db-schema-spec.md`.

---

### TASK-007: NABL 129, WELMEC 7.2 & Provenance Types

- **Target File(s)**: `packages/types/src/compliance.ts`
- **Blocked By**: `TASK-004`
- **Technical Blueprint**:
  - Export interfaces:
    - `WeightCertificate`: certificate number, calibration date, expiry date, expanded uncertainty ($U$), coverage factor ($k=2$).
    - `NABLPreCheckResult`: `compliant` (boolean), `actualUncertainty`, `maxAllowedUncertainty` ($\frac{1}{3}\text{MPE}$), `warningMessage`.
    - `ProvenanceNode`: `nodeId`, `parentNodeId`, `eventType`, `payloadHash`, `timestamp`, `merkleRoot`.
    - `DigitalSignatureMetadata`: `certificateDn`, `serialNumber`, `signingTime`, `sha256Digest`, `valid`.
- **Acceptance Criteria**: Types compile cleanly and are exported from root `packages/types/src/index.ts`.

---

### TASK-008: Zod Validation Contracts for API & Storage

- **Target File(s)**: `packages/types/src/api.ts`
- **Blocked By**: `TASK-005`, `TASK-006`, `TASK-007`
- **Technical Blueprint**:
  - Export Zod schemas:
    - `CreateInstrumentSchema`: validates name, class, Max, Min, $e, d$, partial ranges.
    - `SubmitObservationSchema`: validates session ID, test type, $L, I, \Delta L$, ambient conditions.
    - `LoginSchema`, `VerifyReportSchema`.
- **Acceptance Criteria**: Zod schemas parse valid fixtures and reject invalid inputs with structured errors.

---

## 5. Module 02: Standards-as-Code Rule Packs (`packages/rules-engine`)

### TASK-009: Dynamic Rule Pack JSON Definition (`oiml-r76-2006-v1.json`)

- **Target File(s)**: `packages/rules-engine/src/rules/oiml-r76-2006-v1.json`
- **Blocked By**: `TASK-001`
- **Technical Blueprint**:
  - Create complete versioned JSON rule pack defining:
    - Metadata: `id: "oiml-r76-2006-v1"`, `standard: "OIML R 76-1:2006"`, `version: "1.0.0"`.
    - Table 3 classification limits: minimum/maximum verification scale divisions ($n$) for Classes I, II, III, IIII.
    - Table 6 Initial Verification MPE step limits:
      - Class I: $[0, 50000e] \to \pm 0.5e$, $(50000e, 200000e] \to \pm 1.0e$, $> 200000e \to \pm 1.5e$.
      - Class II: $[0, 5000e] \to \pm 0.5e$, $(5000e, 20000e] \to \pm 1.0e$, $(20000e, 100000e] \to \pm 1.5e$.
      - Class III: $[0, 500e] \to \pm 0.5e$, $(500e, 2000e] \to \pm 1.0e$, $(2000e, 10000e] \to \pm 1.5e$.
      - Class IIII: $[0, 50e] \to \pm 0.5e$, $(50e, 200e] \to \pm 1.0e$, $(200e, 1000e] \to \pm 1.5e$.
    - Environmental constraints: Max temperature drift rate = $5.0\,^\circ\text{C/h}$, NABL 129 ratio $U/\text{MPE} \le 1/3$.
- **Acceptance Criteria**: File is valid JSON and strictly matches official OIML R 76-1 tables.

---

### TASK-010: Rule Pack Zod Validator & Loader

- **Target File(s)**: `packages/rules-engine/src/loader.ts`
- **Blocked By**: `TASK-008`, `TASK-009`
- **Technical Blueprint**:
  - Write `RulePackSchema` in Zod to validate rule pack JSON structure.
  - Implement `loadRulePack(filePath: string): RulePack`.
  - Implement `validateRulePack(rulePackData: unknown): RulePack`.
- **Acceptance Criteria**: Unit test verifies that `oiml-r76-2006-v1.json` loads without validation errors.

---

### TASK-011: Table 3 NAWI Instrument Classifier

- **Target File(s)**: `packages/rules-engine/src/classifier.ts`
- **Blocked By**: `TASK-010`
- **Technical Blueprint**:
  - Function: `classifyInstrument(max: string, e: string, d: string, accuracyClass: AccuracyClass): { valid: boolean; n: number; minAllowedN: number; maxAllowedN: number; errorReason?: string }`.
  - Formula: $n = \text{Max} / e$ (calculated via `decimal.js`).
  - Validation: Verify $n$ falls within $[n_{\min}, n_{\max}]$ for the requested Accuracy Class per Table 3.
- **Acceptance Criteria**: Unit tests verify that $15\text{ kg} / 5\text{ g} \implies n = 3000$ (Valid Class III), and $15\text{ kg} / 1\text{ mg}$ triggers invalid class error.

---

### TASK-012: Table 6 MPE Step-Bracket Engine

- **Target File(s)**: `packages/rules-engine/src/mpe.ts`
- **Blocked By**: `TASK-010`
- **Technical Blueprint**:
  - Function: `getMpe(load: string, e: string, accuracyClass: AccuracyClass, rulePack: RulePack): { mpeInE: string; mpeInMass: string; stepBracket: string }`.
  - Step logic: Compare $m = \text{load} / e$ against Table 6 brackets.
  - Returns MPE as both multiple of $e$ ($\pm 0.5, \pm 1.0, \pm 1.5$) and absolute mass ($\pm 0.5e, \pm 1.0e, \pm 1.5e$).
- **Acceptance Criteria**: Unit test confirms for Class III scale ($e=5\text{ g}$): load $2.5\text{ kg} (500e) \implies \text{MPE} = \pm 2.5\text{ g}$; load $10\text{ kg} (2000e) \implies \text{MPE} = \pm 5.0\text{ g}$; load $15\text{ kg} \implies \text{MPE} = \pm 7.5\text{ g}$.

---

### TASK-013: Dynamic Rule Pack Registry & Hot-Swap Service

- **Target File(s)**: `packages/rules-engine/src/registry.ts`
- **Blocked By**: `TASK-010`, `TASK-012`
- **Technical Blueprint**:
  - In-memory registry: `RulePackRegistry` class.
  - Methods: `registerRulePack(pack: RulePack)`, `getRulePack(id: string): RulePack`, `listRulePacks(): RulePackMetadata[]`.
  - Hot-swap: Allows registering an updated version (e.g. `oiml-r76-2026-v1.json`) at runtime without server restart.
- **Acceptance Criteria**: Unit test registers a mock rule pack with custom MPE brackets and verifies that subsequent queries return the new rule pack's brackets.

---

## 6. Module 03: Deterministic Metrological Math Core (`packages/rules-engine`)

### TASK-014: Arbitrary-Precision Math Wrapper (`math.ts`)

- **Target File(s)**: `packages/rules-engine/src/math.ts`
- **Blocked By**: `TASK-001`
- **Technical Blueprint**:
  - Configure `decimal.js`: `Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP })`.
  - Export helper functions: `toDecimal(val)`, `add(a, b)`, `sub(a, b)`, `mul(a, b)`, `div(a, b)`, `abs(a)`, `roundToScale(val, scaleInterval)`.
  - Enforce zero use of native JS floating-point operators (`+`, `-`, `*`, `/`) on measurement values.
- **Acceptance Criteria**: Unit test verifies $0.1 + 0.2 = 0.3$ exactly without IEEE 754 rounding artifacts (`0.30000000000000004`).

---

### TASK-015: Vernier Turning Point Indication Calculator (`vernier.ts`)

- **Target File(s)**: `packages/rules-engine/src/vernier.ts`
- **Blocked By**: `TASK-014`
- **Technical Blueprint**:
  - Function: `calculateIndicationP(indicatedI: string, deltaL: string, e: string): string`.
  - Mathematical Formula:
    $$P = I + 0.5e - \Delta L$$
  - Function: `calculateRawErrorE(indicatedP: string, loadMassL: string): string`.
  - Mathematical Formula:
    $$E = P - L$$
- **Acceptance Criteria**: Test Case TC-01 Load 1: $I = 2.500\text{ kg}$, $e = 0.005\text{ kg}$, $\Delta L = 0.0020\text{ kg} \implies P = 2.5005\text{ kg}$, $E = +0.0005\text{ kg} (+0.5\text{ g})$.

---

### TASK-016: Corrected Error & Compliance Evaluator (`corrector.ts`)

- **Target File(s)**: `packages/rules-engine/src/corrector.ts`
- **Blocked By**: `TASK-014`, `TASK-015`
- **Technical Blueprint**:
  - Function: `calculateCorrectedErrorEc(errorE: string, zeroErrorE0: string): string`.
  - Formula:
    $$E_c = E - E_0$$
  - Function: `evaluateCompliance(correctedErrorEc: string, mpeInMass: string): { pass: boolean; ratioToMpe: string; margin: string }`.
  - Constraint: $|E_c| \le |\text{MPE}| \implies \text{PASS}$; otherwise $\text{FAIL}$.
- **Acceptance Criteria**: Correctly computes $E_c$ and evaluates PASS/FAIL against MPE boundaries.

---

### TASK-017: Multi-Interval Range Resolver (`multi_interval.ts`)

- **Target File(s)**: `packages/rules-engine/src/multi_interval.ts`
- **Blocked By**: `TASK-014`
- **Technical Blueprint**:
  - Function: `getActiveRangeForLoad(load: string, partialRanges: PartialWeighingRange[]): PartialWeighingRange`.
  - Evaluates active range $W_i$ where $\text{Max}_{i-1} < \text{load} \le \text{Max}_i$.
  - Returns active scale interval $e_i$ and Vernier step increment.
- **Acceptance Criteria**: Unit test with 2 ranges ($W_1: 0\text{--}3\text{ kg}, e_1=1\text{ g}$; $W_2: 3\text{--}6\text{ kg}, e_2=2\text{ g}$): load $2.5\text{ kg} \to e=1\text{ g}$; load $4.5\text{ kg} \to e=2\text{ g}$.

---

### TASK-018: Form 1 Evaluator: Weighing Performance (`form1_weighing.ts`)

- **Target File(s)**: `packages/rules-engine/src/forms/form1_weighing.ts`
- **Blocked By**: `TASK-015`, `TASK-016`, `TASK-017`
- **Technical Blueprint**:
  - Process increasing and decreasing load runs.
  - Calculate $E_0$ at start from zero load.
  - For each step: calculate $P_i, E_i, E_{c,i}$, compare with Table 6 MPE.
  - Calculate hysteresis error: $E_{\text{hyst}} = |E_{\text{descending}} - E_{\text{ascending}}|$.
  - Check hysteresis compliance: $E_{\text{hyst}} \le |\text{MPE}|$.
- **Acceptance Criteria**: Executes TC-01 full dataset and outputs pass status matching official OIML R 76-2 Form 1.

---

### TASK-019: Form 2 Evaluator: Temperature Effect on No-Load (`form2_temp_drift.ts`)

- **Target File(s)**: `packages/rules-engine/src/forms/form2_temp_drift.ts`
- **Blocked By**: `TASK-014`, `TASK-015`
- **Technical Blueprint**:
  - Calculate zero indication drift between consecutive temperatures:
    $$\Delta E_0 = |E_0(T_2) - E_0(T_1)|$$
  - Compliance threshold: $\Delta E_0 \le 1.0e$ per temperature step.
  - Temperature drift rate check:
    $$\text{Rate} = \frac{|\Delta \theta|}{\Delta t} \le 5.0\,^\circ\text{C/h}$$
- **Acceptance Criteria**: Rate of $8.0\,^\circ\text{C/h}$ flags error; drift of $0.4e$ passes.

---

### TASK-020: Form 3 & Form 4 Evaluator: Eccentricity & Discrimination

- **Target File(s)**: `packages/rules-engine/src/forms/form3_4_ecc_disc.ts`
- **Blocked By**: `TASK-015`, `TASK-016`
- **Technical Blueprint**:
  - Eccentricity (Form 3): Evaluate 4 corner positions + 1 center position with load $L = \text{Max} / 3$ or $\text{Max} / 4$. Check each position $|E_c| \le |\text{MPE}|$.
  - Discrimination (Form 4): Check that extra load $\Delta L = 1.4d$ causes indication to increment by $+1d$.
- **Acceptance Criteria**: Unit tests verify standard corner loading data and 1.4d discrimination pass/fail.

---

### TASK-021: Form 5 & Form 6 Evaluator: Repeatability & Creep

- **Target File(s)**: `packages/rules-engine/src/forms/form5_6_rep_creep.ts`
- **Blocked By**: `TASK-015`, `TASK-016`
- **Technical Blueprint**:
  - Repeatability (Form 5): 10 observations at $\approx 0.5\text{Max}$ and $\text{Max}$. Calculate $E_{\max} - E_{\min} \le |\text{MPE}|$.
  - Creep & Zero Return (Form 6): 30-minute or 4-hour test. Check difference between indication at 30 min and 15 min $\le 0.5e$; zero return after unloading $\le 0.5e$.
- **Acceptance Criteria**: Unit tests verify repeatability spread $E_{\max} - E_{\min}$ within MPE bounds.

---

## 7. Module 04: Metrological Compliance & Pre-Checks (`packages/rules-engine`)

### TASK-022: NABL 129 Standard Weight Uncertainty Pre-Check

- **Target File(s)**: `packages/rules-engine/src/nabl129.ts`
- **Blocked By**: `TASK-012`, `TASK-014`
- **Technical Blueprint**:
  - Function: `validateStandardWeightUncertainty(weightUncertaintyU: string, targetLoad: string, e: string, accuracyClass: AccuracyClass, rulePack: RulePack): NABLPreCheckResult`.
  - Rule: Expanded uncertainty $U$ ($k=2$) of standard weights shall not exceed $\frac{1}{3}$ of applicable Table 6 MPE:
    $$U \le \frac{1}{3}|\text{MPE}(L)|$$
  - Returns `compliant: false` with warning when violated.
- **Acceptance Criteria**: TC-02 test passes: at $L=500\text{ g}$, $\text{MPE}=0.005\text{ g} \implies \text{Max } U = 0.00166\text{ g}$. Input $U=0.0025\text{ g}$ returns `compliant: false`.

---

### TASK-023: Metrological Sanity & Anomaly Detection Engine

- **Target File(s)**: `packages/rules-engine/src/anomalies.ts`
- **Blocked By**: `TASK-014`, `TASK-015`
- **Technical Blueprint**:
  - Class: `AnomalyDetector`.
  - Rules evaluated:
    1. Monotonicity: Indication $I$ must increase with increasing load $L$.
    2. Delta L Bounds: $\Delta L$ must fall within $[0, e]$.
    3. Environmental Stability: Temperature drift rate $\le 5.0\,^\circ\text{C/h}$.
    4. Tare Sanity: Tare indication must cancel completely at zero net load.
- **Acceptance Criteria**: Anomaly detector flags non-monotonic step or excessive $\Delta L > e$ with clear diagnostic codes.

---

### TASK-024: Dynamic Test Plan Generator

- **Target File(s)**: `packages/rules-engine/src/planner.ts`
- **Blocked By**: `TASK-011`, `TASK-012`
- **Technical Blueprint**:
  - Function: `generateTestPlan(instrument: InstrumentModelSpecification, rulePack: RulePack): TestPlan`.
  - Calculates required test loads for Forms 1–6:
    - Min load ($20e$), MPE step change points ($500e, 2000e$), 50% Max, 100% Max.
    - Corner loading positions for Form 3 ($L = \text{Max} / 3$).
- **Acceptance Criteria**: Generates sequence of 10+ standard load points for a 15 kg Class III balance.

---

## 8. Module 05: Database Layer (`packages/db`)

### TASK-025: Prisma Schema Definition

- **Target File(s)**: `packages/db/prisma/schema.prisma`
- **Blocked By**: `TASK-002`, `TASK-005`, `TASK-006`
- **Technical Blueprint**:
  - Models: `User`, `Laboratory`, `InstrumentModel`, `ReferenceStandard`, `TestSession`, `RawObservation`, `CalculationTraceItem`, `Report`, `ProvenanceNode`.
  - All metrological decimal values defined with `@db.Decimal(16, 8)` to prevent precision loss.
  - Foreign keys with referential integrity (`onDelete: Cascade` or `onDelete: Restrict`).
- **Acceptance Criteria**: Running `pnpm --filter @maanak/db prisma validate` returns valid schema with zero errors.

---

### TASK-026: Prisma Database Migration Execution

- **Target File(s)**: `packages/db/prisma/migrations/`
- **Blocked By**: `TASK-025`
- **Technical Blueprint**:
  - Execute `prisma migrate dev --name init_metrology_models`.
  - Verify generated SQL migration creates tables, indexes, unique constraints, and foreign keys.
- **Acceptance Criteria**: Database contains all tables with correct PostgreSQL column types (`numeric(16,8)`).

---

### TASK-027: Database Seed Script

- **Target File(s)**: `packages/db/prisma/seed.ts`
- **Blocked By**: `TASK-026`
- **Technical Blueprint**:
  - Seed 1 Laboratory: "Regional Reference Standard Laboratory (RRSL), Ahmedabad".
  - Seed 4 Users: Inspector (`inspector@rrsl.gov.in`), Reviewer (`reviewer@rrsl.gov.in`), Director (`director@rrsl.gov.in`), Admin (`admin@rrsl.gov.in`).
  - Seed Standard Weight Sets: E2 (1 mg – 500 g), F1 (1 g – 10 kg), M1 (1 kg – 20 kg) with calibration certificates.
  - Seed Sample NAWI Models: Class I (220 g analytical balance), Class III (15 kg retail scale).
- **Acceptance Criteria**: Running `pnpm --filter @maanak/db prisma db seed` seeds database successfully.

---

### TASK-028: Database Client & Repository Wrapper

- **Target File(s)**: `packages/db/src/client.ts`, `packages/db/src/index.ts`
- **Blocked By**: `TASK-026`
- **Technical Blueprint**:
  - Export singleton `prisma` client instance with connection pooling.
  - Export query helper functions: `createSession`, `addObservationWithTrace`, `getSessionWithDetails`, `lockSessionForReview`.
- **Acceptance Criteria**: Integration test connects to database, inserts a test record, and reads it back accurately.

---

## 9. Module 06: WELMEC 7.2 Provenance & Cryptographic Signer (`packages/crypto-provenance`)

### TASK-029: WELMEC 7.2 SHA-256 Hash Graph Node Generator

- **Target File(s)**: `packages/crypto-provenance/src/hasher.ts`
- **Blocked By**: `TASK-007`
- **Technical Blueprint**:
  - Function: `computeObservationHash(obs: RawObservation, prevHash: string): string`.
  - Canonical JSON stringification (deterministic key order) before SHA-256 hashing.
  - Hash chain formula: $\text{NodeHash}_i = \text{SHA256}(\text{NodeHash}_{i-1} + \text{CanonicalJSON}(\text{Payload}_i))$.
- **Acceptance Criteria**: Modifying a single character in observation payload completely changes the resulting hash.

---

### TASK-030: Provenance Chain Validator & Tamper Detector

- **Target File(s)**: `packages/crypto-provenance/src/chain_validator.ts`
- **Blocked By**: `TASK-029`
- **Technical Blueprint**:
  - Function: `validateSessionProvenanceChain(nodes: ProvenanceNode[]): { valid: boolean; brokenAtIndex?: number; expectedHash?: string; actualHash?: string }`.
  - Traverses the chain from root to leaf, re-computing each node hash.
- **Acceptance Criteria**: TC-05 simulated SQL tampering test correctly flags corrupted node index.

---

### TASK-031: X.509 PKI Digital Signature Service

- **Target File(s)**: `packages/crypto-provenance/src/signer.ts`
- **Blocked By**: `TASK-029`
- **Technical Blueprint**:
  - Module using `@peculiar/x509` and Node.js `crypto`.
  - Function: `signReportDigest(pdfBuffer: Buffer, privateKeyPem: string, certPem: string): Promise<Buffer>`.
  - Generates Adobe-compliant digital signature and embeds cryptographic signature dictionary into PDF.
- **Acceptance Criteria**: Generated PDF displays valid signature metadata when inspected.

---

### TASK-032: Public Verification QR Code Generator

- **Target File(s)**: `packages/crypto-provenance/src/qr.ts`
- **Blocked By**: `TASK-029`
- **Technical Blueprint**:
  - Function: `generateVerificationQrSvg(sessionHash: string, verifyBaseUrl: string): Promise<string>`.
  - Encodes URL: `${verifyBaseUrl}/verify/${sessionHash}`.
  - Returns SVG string for direct embedding into PDF Page 1.
- **Acceptance Criteria**: QR SVG is generated and decodes to valid verification URL.

---

## 10. Module 07: Report Generation Engine (`packages/report-generator`)

### TASK-033: Vector Error Curve Generator (`charts.ts`)

- **Target File(s)**: `packages/report-generator/src/charts.ts`
- **Blocked By**: `TASK-016`
- **Technical Blueprint**:
  - Function: `generateErrorCurveSvg(observations: CalculationTraceItem[], maxLoad: string): string`.
  - Generates SVG error curve:
    - X-axis: Load mass $L$.
    - Y-axis: Corrected error $E_c$.
    - Step envelopes: Positive MPE and Negative MPE step lines.
- **Acceptance Criteria**: Generates clean vector SVG with plotted points and colored tolerance envelopes.

---

### TASK-034: OIML R 76-2 Multi-Page PDF Compiler (`pdf.ts`)

- **Target File(s)**: `packages/report-generator/src/pdf.ts`
- **Blocked By**: `TASK-031`, `TASK-032`, `TASK-033`
- **Technical Blueprint**:
  - Use `@pdf-lib` to construct official OIML R 76-2 report:
    - Page 1: Title page, Legal Metrology Act Sec 22 reference, instrument specs, Director digital signature block, QR code.
    - Page 2: Executive summary table of all test forms (PASS/FAIL).
    - Page 3+: Forms 1–6 detailed observation tables ($L, I, \Delta L, P, E, E_c, \text{MPE}$).
    - Embedded vector error curve SVG on Form 1 page.
- **Acceptance Criteria**: Compiles multi-page PDF in $< 1.5$ seconds; formatting aligns with official OIML R 76-2 sample.

---

### TASK-035: Editable Word Document (.docx) Compiler

- **Target File(s)**: `packages/report-generator/src/docx.ts`
- **Blocked By**: `TASK-033`
- **Technical Blueprint**:
  - Use `docx` library to create `.docx` version of the report.
  - Formatted tables with government header, cell borders, and bold headers matching Indian Legal Metrology test sheets.
- **Acceptance Criteria**: Generates valid `.docx` file that opens cleanly in Word/LibreOffice.

---

### TASK-036: Report Storage & Checksum Service

- **Target File(s)**: `packages/report-generator/src/storage.ts`
- **Blocked By**: `TASK-034`, `TASK-035`
- **Technical Blueprint**:
  - Save generated PDF and DOCX to local storage / S3.
  - Calculate and store SHA-256 checksum of generated file.
- **Acceptance Criteria**: Saved file checksum matches database record.

---

## 11. Module 08: Backend REST API Gateway (`apps/api`)

### TASK-037: Express Application Skeleton & Security Middleware

- **Target File(s)**: `apps/api/src/app.ts`, `apps/api/src/server.ts`
- **Blocked By**: `TASK-001`, `TASK-008`
- **Technical Blueprint**:
  - Setup Express app with TypeScript.
  - Security middlewares: `helmet()`, `cors({ origin: clientUrl })`, `express.json({ limit: "10mb" })`.
  - Standard error handling middleware returning `{ error: string, code: string, details?: unknown }`.
- **Acceptance Criteria**: `curl http://localhost:4000/health` returns `{ status: "ok" }`.

---

### TASK-038: Argon2id Authentication & RBAC Middleware

- **Target File(s)**: `apps/api/src/auth/service.ts`, `apps/api/src/auth/middleware.ts`
- **Blocked By**: `TASK-028`, `TASK-037`
- **Technical Blueprint**:
  - Password hashing: `argon2.hash(password)` with Argon2id parameters.
  - JWT token generation (access token: 15m, refresh token: 7d).
  - RBAC guard middleware: `requireRole([Role.INSPECTOR, Role.DIRECTOR])`.
- **Acceptance Criteria**: POST `/api/v1/auth/login` with valid credentials returns JWT; accessing protected route without token returns 401.

---

### TASK-039: Rule Pack Management API Routes

- **Target File(s)**: `apps/api/src/routes/rules.ts`
- **Blocked By**: `TASK-013`, `TASK-038`
- **Technical Blueprint**:
  - `GET /api/v1/rules`: List registered rule packs.
  - `GET /api/v1/rules/:id`: Fetch active rule pack details.
  - `POST /api/v1/rules/upload`: Upload updated rule pack JSON (Admin only).
- **Acceptance Criteria**: Admin user can upload new rule pack and verify it becomes active.

---

### TASK-040: Reference Standard Weight Inventory API Routes

- **Target File(s)**: `apps/api/src/routes/weights.ts`
- **Blocked By**: `TASK-022`, `TASK-028`, `TASK-038`
- **Technical Blueprint**:
  - `GET /api/v1/weights`: List available weight sets for laboratory.
  - `POST /api/v1/weights`: Register new weight set with calibration certificate.
  - `POST /api/v1/weights/precheck`: Real-time NABL 129 validation ($U \le \frac{1}{3}\text{MPE}$).
- **Acceptance Criteria**: Out-of-spec weight set returns `compliant: false` with amber warning payload.

---

### TASK-041: Instrument Model Registration API Routes

- **Target File(s)**: `apps/api/src/routes/instruments.ts`
- **Blocked By**: `TASK-011`, `TASK-028`, `TASK-038`
- **Technical Blueprint**:
  - `POST /api/v1/instruments`: Register new NAWI pattern with Table 3 classification check.
  - `GET /api/v1/instruments`: List instruments with search & filter.
  - `GET /api/v1/instruments/:id`: Retrieve single instrument details.
- **Acceptance Criteria**: Submitting valid instrument returns 201 with computed scale divisions $n$.

---

### TASK-042: Test Session & Plan Generation API Routes

- **Target File(s)**: `apps/api/src/routes/sessions.ts`
- **Blocked By**: `TASK-024`, `TASK-028`, `TASK-038`
- **Technical Blueprint**:
  - `POST /api/v1/sessions`: Create new test session bound to active rule pack.
  - `GET /api/v1/sessions/:id/plan`: Get dynamic test plan with required load points.
  - `PATCH /api/v1/sessions/:id/status`: Transition session status (`DRAFT \to IN_PROGRESS \to PENDING_REVIEW`).
- **Acceptance Criteria**: Returns structured test plan tailored to instrument Class and Max.

---

### TASK-043: Raw Observation Entry & Real-Time Math API

- **Target File(s)**: `apps/api/src/routes/observations.ts`
- **Blocked By**: `TASK-015`, `TASK-016`, `TASK-028`, `TASK-029`
- **Technical Blueprint**:
  - `POST /api/v1/sessions/:id/observations`: Record raw reading ($L, I, \Delta L$).
  - Executes instant $P = I + 0.5e - \Delta L$, $E = P - L$, $E_c = E - E_0$, MPE comparison.
  - Creates atomic `RawObservation`, `CalculationTraceItem`, and `ProvenanceNode`.
- **Acceptance Criteria**: Observation entry returns calculated results within $< 30\text{ms}$.

---

### TASK-044: Reviewer Anomaly Audit API Routes

- **Target File(s)**: `apps/api/src/routes/review.ts`
- **Blocked By**: `TASK-023`, `TASK-028`, `TASK-038`
- **Technical Blueprint**:
  - `GET /api/v1/sessions/:id/audit`: Run automated anomaly rules on session.
  - `POST /api/v1/sessions/:id/approve`: Senior Reviewer approves session.
  - `POST /api/v1/sessions/:id/flag`: Flag session with comments and return for re-test.
- **Acceptance Criteria**: Detects thermal drift or monotonicity violations and reports anomaly list.

---

### TASK-045: Report Generation & PKI Signing API Routes

- **Target File(s)**: `apps/api/src/routes/reports.ts`
- **Blocked By**: `TASK-031`, `TASK-034`, `TASK-035`, `TASK-038`
- **Technical Blueprint**:
  - `POST /api/v1/reports/:sessionId/generate`: Generate PDF and DOCX reports.
  - `POST /api/v1/reports/:id/sign`: Director applies X.509 PKI digital signature.
  - `GET /api/v1/reports/:id/pdf`: Stream report PDF.
- **Acceptance Criteria**: Complete signed PDF downloaded with embedded signature block and QR code.

---

### TASK-046: Public Verification & Offline Sync API Routes

- **Target File(s)**: `apps/api/src/routes/verify.ts`, `apps/api/src/routes/sync.ts`
- **Blocked By**: `TASK-030`, `TASK-038`
- **Technical Blueprint**:
  - `GET /api/v1/verify/:hash`: Public route returning provenance verification status.
  - `POST /api/v1/sync/push`: Batch upload observations captured offline.
  - `GET /api/v1/sync/pull`: Fetch active session metadata for offline storage.
- **Acceptance Criteria**: Sync endpoint ingests batch observations and maintains valid hash chain.

---

## 12. Module 09: Responsive Web Console & Mobile Bench PWA (`apps/web`)

### TASK-047: Next.js 16 Project Setup & Theme Configuration

- **Target File(s)**: `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`
- **Blocked By**: `TASK-001`, `TASK-008`
- **Technical Blueprint**:
  - Next.js 16 (LTS v16.3.5) with App Router and React 19.
  - Tailwind CSS v4 with Tweakcn Twitter OKLCH theme tokens:
    `--primary: oklch(0.6723 0.1606 244.9955)`, `--radius: 1.3rem`.
  - Install `@phosphor-icons/react` (latest stable).
  - Configure root Next.js metadata template in `layout.tsx`:
    `title: { template: "%s | MAANAK (मानक) — OIML R-76 Legal Metrology", default: "MAANAK (मानक) — OIML R-76 Legal Metrology Workbench" }`.
- **Acceptance Criteria**: Next.js app builds cleanly; renders styled page with Twitter Sky Blue theme tokens and default metadata title.

---

### TASK-048: Universal Responsive Mobile Shell & Layout

- **Target File(s)**: `apps/web/src/components/layout/Shell.tsx`, `apps/web/src/components/layout/MobileNav.tsx`, `apps/web/src/components/layout/Breadcrumbs.tsx`
- **Blocked By**: `TASK-047`
- **Technical Blueprint**:
  - Desktop view ($\ge 1024\text{px}$): Persistent sidebar navigation.
  - Mobile phone view ($360\text{px}\text{--}430\text{px}$): Top header with hamburger button triggering `<SheetContent side="left">` drawer.
  - Sticky bottom action bar container for mobile viewports.
  - Dynamic breadcrumb bar reflecting the active page title and hierarchy with `aria-current="page"`.
- **Acceptance Criteria**: Verified zero horizontal scroll on 360px viewport (Chrome DevTools); breadcrumb displays active route.

---

### TASK-049: Shared Metrological UI Component & Skeleton Library

- **Target File(s)**: `apps/web/src/components/ui/` (`Button.tsx`, `Card.tsx`, `Badge.tsx`, `Input.tsx`, `Table.tsx`, `Skeleton.tsx`)
- **Blocked By**: `TASK-047`
- **Technical Blueprint**:
  - Buttons with pill rounding (`rounded-2xl`, `rounded-3xl`) and min touch target $48\text{px} \times 48\text{px}$ on mobile.
  - Badges for PASS (Green), FAIL (Red), WARNING (Amber).
  - Measurement numeric inputs with `inputMode="decimal"` and `text-base` font to prevent iOS zoom.
  - Core Skeleton components (`TableSkeleton`, `MetricCardSkeleton`, `FormSkeleton`, `ReportPreviewSkeleton`) using `animate-pulse bg-muted/60 rounded-2xl` matching exact component geometry to prevent CLS. Generic spinners (`<Loader2 className="animate-spin" />`) are prohibited.
- **Acceptance Criteria**: Storybook or component page renders components in light and dark mode with correct radii; skeleton components match layout dimensions.

---

### TASK-050: Mobile-First Observation Card Component

- **Target File(s)**: `apps/web/src/components/bench/ObservationCard.tsx`, `apps/web/src/components/bench/BenchCardSkeleton.tsx`
- **Blocked By**: `TASK-049`
- **Technical Blueprint**:
  - Mobile view ($< 640\text{px}$): Stacked card displaying Load #, Status badge, Input values ($I, \Delta L$), and calculated outputs ($P, E_c, \text{MPE}$).
  - Touch-friendly Vernier increment buttons ($+0.1e, +0.2e, +0.5e$).
  - Quick-edit drawer trigger for re-testing.
  - Geometry-matching `BenchCardSkeleton` (`h-44 w-full rounded-3xl animate-pulse bg-muted/60`) for smooth observation load transitions.
- **Acceptance Criteria**: Card renders cleanly on 375px iPhone viewport without wrapping issues; skeleton mirrors card layout.

---

### TASK-051: Laboratory Executive Dashboard Page

- **Target File(s)**: `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/loading.tsx`
- **Blocked By**: `TASK-048`, `TASK-049`
- **Technical Blueprint**:
  - Dynamic page metadata title: `Dashboard & Lab Analytics | MAANAK (मानक) — OIML R-76 Legal Metrology`.
  - Next.js `loading.tsx` utilizing `MetricCardSkeleton` and `TableSkeleton` for zero-CLS loading states (no generic spinners).
  - Responsive metric grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`): Active Sessions, Pending Reviews, Approved Today, Rejection Rate.
  - Recent test sessions list with live status badges.
  - Offline sync status indicator in header.
- **Acceptance Criteria**: Dashboard renders responsively on mobile phone (single column) and desktop (4 columns); loading state displays 4 metric card skeletons and table rows.

---

### TASK-052: Instrument Intake & Table 3 Classification Page

- **Target File(s)**: `apps/web/src/app/instruments/new/page.tsx`
- **Blocked By**: `TASK-049`
- **Technical Blueprint**:
  - Dynamic page metadata title: `Instrument Intake & Model Approval | MAANAK (मानक) — OIML R-76 Legal Metrology`.
  - Form fields: Manufacturer, Model, Serial #, Class (I–IIII), Max, Min, $e, d$.
  - Real-time client-side calculation of $n = \text{Max} / e$ with live Table 3 validity pill.
  - Multi-interval range configuration accordion.
  - Form loading state via `FormSkeleton`.
- **Acceptance Criteria**: Entering $15\text{ kg}$ and $e=5\text{ g}$ immediately displays `n = 3000 (Valid Class III)` badge; dynamic document title displays correctly.

---

### TASK-053: Standard Weight Inventory & Live NABL Gatekeeper Page

- **Target File(s)**: `apps/web/src/app/weights/page.tsx`, `apps/web/src/app/weights/loading.tsx`
- **Blocked By**: `TASK-049`
- **Technical Blueprint**:
  - Dynamic page metadata title: `Standard Weights & NABL 129 Gatekeeper | MAANAK (मानक) — OIML R-76 Legal Metrology`.
  - Weight set selection interface with `TableSkeleton` loading fallback.
  - Live NABL 129 uncertainty gatekeeper widget: Compares weight expanded uncertainty $U$ against target MPE.
  - Renders prominent amber warning card if $U > \frac{1}{3}\text{MPE}$, disabling test commencement.
- **Acceptance Criteria**: Selecting out-of-spec test weight displays warning banner and locks start button; loading state renders table skeleton.

---

### TASK-054: Real-Time Bench Observation Logging Page

- **Target File(s)**: `apps/web/src/app/sessions/[id]/bench/page.tsx`, `apps/web/src/app/sessions/[id]/bench/loading.tsx`
- **Blocked By**: `TASK-050`
- **Technical Blueprint**:
  - Dynamic page metadata title: `Session TS-[id] — Form 1 Weighing Bench | MAANAK (मानक) — OIML R-76 Legal Metrology`.
  - Next.js `loading.tsx` uses `BenchCardSkeleton` stack.
  - Multi-tab navigation between Forms 1–6.
  - Mobile phone layout: Card stack with sticky bottom "Save & Next" bar.
  - Real-time calculation feedback: Indication entry immediately computes $P$ and $E_c$.
  - Offline local storage fallback via IndexedDB.
- **Acceptance Criteria**: Inspector enters $I$ and $\Delta L$, card immediately displays calculated $E_c$ and PASS badge; dynamic session title renders in browser tab.

---

### TASK-055: Senior Reviewer Anomaly Audit Page

- **Target File(s)**: `apps/web/src/app/sessions/[id]/review/page.tsx`, `apps/web/src/app/sessions/[id]/review/loading.tsx`
- **Blocked By**: `TASK-049`
- **Technical Blueprint**:
  - Dynamic page metadata title: `Reviewer Audit & Anomaly Detection — TS-[id] | MAANAK (मानक) — OIML R-76 Legal Metrology`.
  - Loading state using dual-pane card skeleton.
  - Automated anomaly check list with green checkmarks or red flags.
  - Calculation derivation tree modal: Step-by-step audit showing $I \to \Delta L \to P \to E_c \to \text{MPE}$.
  - Approve Session and Flag for Re-Test action buttons.
- **Acceptance Criteria**: Anomaly audit screen highlights intentionally injected temperature drift error; page title dynamically displays session ID.

---

### TASK-056: Report Preview & Director X.509 PKI Signing Page

- **Target File(s)**: `apps/web/src/app/reports/[id]/page.tsx`, `apps/web/src/app/reports/[id]/loading.tsx`
- **Blocked By**: `TASK-049`
- **Technical Blueprint**:
  - Dynamic page metadata title: `Official OIML R 76-2 Pattern Evaluation Report — [id] | MAANAK (मानक) — OIML R-76 Legal Metrology`.
  - Multi-page responsive PDF viewer with `ReportPreviewSkeleton` placeholder.
  - Cryptographic hash graph summary card showing session SHA-256 digest.
  - "Sign & Seal Report" button opening PIN confirmation modal for X.509 digital signing.
- **Acceptance Criteria**: Clicking sign executes digital signature and displays verified badge with download link; loading state renders multi-page document skeleton.

---

### TASK-057: Public Verification QR Landing Page

- **Target File(s)**: `apps/web/src/app/verify/[hash]/page.tsx`
- **Blocked By**: `TASK-048`, `TASK-049`
- **Technical Blueprint**:
  - Dynamic page metadata title: `Certificate Verification — SHA-256 Hash Seal | MAANAK (मानक) — OIML R-76 Legal Metrology`.
  - Public mobile-responsive page accessed via QR code scan with skeleton card loading.
  - Displays: Certificate status (VALID / INVALID), Instrument details, Signing authority, SHA-256 hash.
  - Full cryptographic provenance history tree.
- **Acceptance Criteria**: Scanning QR code opens page with green verified badge and certificate details; dynamic title reflects verification context.

---

### TASK-058: Offline PWA Service Worker & Sync Engine

- **Target File(s)**: `apps/web/src/pwa/sw.ts`, `apps/web/src/pwa/sync.ts`
- **Blocked By**: `TASK-047`, `TASK-054`
- **Technical Blueprint**:
  - Service worker caching static assets and API routes.
  - IndexedDB storage using `idb` for offline observations.
  - Background sync listener uploading pending observations upon network reconnection.
- **Acceptance Criteria**: App functions offline in Airplane Mode; changes sync automatically when reconnected.

---

## 13. Module 10: Ground Truth Verification & SIH Victory (`tests/e2e`)

### TASK-059: Test Suite TC-01: Standard Class III Weighing Performance

- **Target File(s)**: `tests/e2e/tc01_class3_weighing.test.ts`
- **Blocked By**: `TASK-018`, `TASK-043`
- **Technical Blueprint**:
  - Verify complete dataset from `Adobe Scan p. 2`:
    $15\text{ kg}$ scale, $e=5\text{ g}$.
    - Zero: $L=0, I=0, \Delta L=0.0025 \implies E_0 = 0$.
    - $500e$: $L=2.5\text{ kg}, I=2.500, \Delta L=0.0020 \implies P=2.5005, E_c=+0.5\text{ g} \le \pm 2.5\text{ g} \implies \text{PASS}$.
    - $2000e$: $L=10\text{ kg}, I=10.000, \Delta L=0.0015 \implies P=10.0010, E_c=+1.0\text{ g} \le \pm 5.0\text{ g} \implies \text{PASS}$.
    - Max: $L=15\text{ kg}, I=15.000, \Delta L=0.0010 \implies P=15.0015, E_c=+1.5\text{ g} \le \pm 7.5\text{ g} \implies \text{PASS}$.
- **Acceptance Criteria**: Test executes with 100% assertions passing.

---

### TASK-060: Test Suite TC-02: NABL 129 Standard Weight Uncertainty Violation

- **Target File(s)**: `tests/e2e/tc02_nabl_uncertainty.test.ts`
- **Blocked By**: `TASK-022`, `TASK-040`
- **Technical Blueprint**:
  - Verify blocking gatekeeper behavior:
    Class II, $\text{Max}=1\text{ kg}, e=0.01\text{ g}$. At $L=500\text{ g}$, $\text{MPE}=\pm 0.005\text{ g}$.
    Max allowed $U = \frac{1}{3} \times 0.005\text{ g} = 0.00166\text{ g}$.
    Input weight set with $U = 0.0025\text{ g}$.
- **Acceptance Criteria**: Test asserts system marks weight set invalid and blocks observation submission.

---

### TASK-061: Test Suite TC-03: Multi-Interval Partial Range Switching

- **Target File(s)**: `tests/e2e/tc03_multi_interval.test.ts`
- **Blocked By**: `TASK-017`, `TASK-043`
- **Technical Blueprint**:
  - Scale with $W_1 = 3\text{ kg} (e_1=1\text{ g})$ and $W_2 = 6\text{ kg} (e_2=2\text{ g})$.
  - Test at $L=2\text{ kg}$: active $e=1\text{ g}$, Vernier step $0.1\text{ g}$.
  - Test at $L=5\text{ kg}$: active $e=2\text{ g}$, Vernier step $0.2\text{ g}$.
- **Acceptance Criteria**: Test asserts dynamic interval switching and MPE re-calculation match OIML Clause 3.3.

---

### TASK-062: Test Suite TC-04: Temperature Drift Overrun

- **Target File(s)**: `tests/e2e/tc04_temp_drift.test.ts`
- **Blocked By**: `TASK-019`, `TASK-044`
- **Technical Blueprint**:
  - Temperature changes from $20.0\,^\circ\text{C}$ to $28.0\,^\circ\text{C}$ over 1 hour ($\Delta T = 8.0\,^\circ\text{C/h}$).
  - Reviewer audit engine must flag environmental instability violation ($> 5.0\,^\circ\text{C/h}$).
- **Acceptance Criteria**: Test asserts that audit endpoint flags session with code `ERR_TEMP_DRIFT_EXCEEDED`.

---

### TASK-063: Test Suite TC-05: WELMEC 7.2 Database Tampering Audit

- **Target File(s)**: `tests/e2e/tc05_welmec_tamper.test.ts`
- **Blocked By**: `TASK-030`, `TASK-046`
- **Technical Blueprint**:
  - Complete valid session with generated provenance hash chain.
  - Execute direct SQL update modifying raw indication: $I = 10.000\text{ kg} \to 10.005\text{ kg}$.
  - Re-run `validateSessionProvenanceChain`.
- **Acceptance Criteria**: Test asserts provenance validation fails, identifies corrupted node, and prevents report generation.

---

## 14. Module 11: Production Flagship End-to-End Integration & Officer UX Enhancements

Module 11 transforms MAANAK from an atomic verified test engine into an integrated, production-grade flagship application directly connected to the Express backend with zero simulated data, complete authentication, intuitive non-technical officer workflows, dynamic observation ledger tables, and flawless decimal entry.

---

### TASK-064: Genuine End-to-End Authentication & Session Management

- **Target File(s)**: `apps/web/src/app/login/page.tsx`, `apps/web/src/lib/auth-context.tsx`, `apps/web/src/components/layout/Shell.tsx`
- **Blocked By**: `TASK-038`, `TASK-048`
- **Technical Blueprint**:
  - Implement full client authentication context (`AuthContext`) communicating with `POST /api/v1/auth/login` and `GET /api/v1/auth/me`.
  - Persist JWT access token in `localStorage` and browser cookies for SSR compatibility.
  - Create dedicated `/login` page with tabs for Legal Metrology Inspector (`inspector@maanak.gov.in`), Reviewer (`reviewer@maanak.gov.in`), and Director (`director@maanak.gov.in`) with one-click quick-fill credentials.
  - Update `Shell.tsx` to dynamically display the authenticated user's name, role, and facility, replacing all hardcoded mock profile strings.
  - Include responsive Sign Out action with token invalidation and redirect to `/login`.
- **Acceptance Criteria**: User can authenticate with valid credentials, user details reflect across all views, and unauthenticated requests can be redirected.

---

### TASK-065: Unified Live Backend API Client

- **Target File(s)**: `apps/web/src/lib/api.ts`
- **Blocked By**: `TASK-046`, `TASK-064`
- **Technical Blueprint**:
  - Implement centralized, type-safe API client targeting `http://localhost:4000/api/v1` (configurable via `NEXT_PUBLIC_API_URL`).
  - Automatically attach `Authorization: Bearer <token>` and `X-Request-Id` to all outgoing requests.
  - Export structured sub-APIs: `sessionsApi`, `observationsApi`, `weightsApi`, `instrumentsApi`, `rulesApi`, `reviewApi`, `reportsApi`, and `verifyApi`.
  - Wire `/dashboard`, `/bench`, `/review`, `/weights`, and `/instruments/new` to fetch live records from the Express backend, eliminating all simulated or static data fallbacks when online.
- **Acceptance Criteria**: All application views successfully fetch, submit, and display live database records from port 4000.

---

### TASK-066: Live Metrological Test Observation Ledger Table

- **Target File(s)**: `apps/web/src/components/bench/ObservationLedgerTable.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-043`, `TASK-065`
- **Technical Blueprint**:
  - Create `ObservationLedgerTable` component displaying an official OIML test data sheet.
  - As the officer records each load step (Zero $E_0$, Min, 1/4 Max, 1/2 Max, Max, descending, tare, repeatability, eccentricity), dynamically append the row to the ledger table.
  - Table columns: Step #, Direction (▲/▼), Nominal Load ($L$), Indication ($I$), Vernier ($\Delta L$), Turning Point ($P$), Raw Error ($E$), Corrected Error ($E_c$), Table 6 MPE, Metrological Verdict (PASS/FAIL), and WELMEC 7.2 Node Hash snippet.
  - Connect table directly to `POST /api/v1/observations` to commit observations to the backend and update the table in real-time.
- **Acceptance Criteria**: Every recorded observation appends seamlessly to the ledger table with all mathematical derivations and compliance badges displayed accurately.

---

### TASK-067: Decimal Precision Input Engine & Vernier Input Fix

- **Target File(s)**: `apps/web/src/components/bench/ObservationCard.tsx`, `apps/web/src/components/ui/Input.tsx`
- **Blocked By**: `TASK-054`
- **Technical Blueprint**:
  - Refactor controlled numeric inputs from raw number states to string-buffered states (`useState<string>`).
  - Resolve the React numeric re-render bug where typing `"0."` or decimal points is prematurely wiped out by `parseFloat()`.
  - Allow unrestricted decimal string typing with regex validation (`/^-?\d*\.?\d*$/`) and parse to arbitrary precision `decimal.js` on calculation.
  - Ensure mobile devices trigger the decimal numeric keyboard via `inputMode="decimal"` and `step="any"`.
- **Acceptance Criteria**: Officer can type `0.0025`, `10.005`, and `2.5` without any loss of the decimal point or focus jumping.

---

### TASK-068: Dynamic MPE Safety & Test Battery Progress Gauges

- **Target File(s)**: `apps/web/src/components/bench/BenchWorkbenchView.tsx`, `apps/web/src/app/dashboard/page.tsx`
- **Blocked By**: `TASK-066`
- **Technical Blueprint**:
  - Replace static progress and safety bars with dynamic calculation derived from actual test observations:
    - **Step Completion Rate**: $\frac{N_{\text{completed}}}{N_{\text{total}}} \times 100\%$ with visual fraction badge (e.g. `4 / 10 Steps Completed`).
    - **Dynamic MPE Consumption Gauge**: $\text{Margin} = \frac{|E_c|}{|\text{MPE}|} \times 100\%$.
    - Dynamic color coding: Emerald ($0\% - 75\%$ MPE consumed = "Safe Legal Tolerance"), Amber ($75\% - 100\%$ = "Marginal - High Drift"), Crimson ($> 100\%$ = "Statutory MPE Exceeded - Illegal").
- **Acceptance Criteria**: Safety gauge and progress bar dynamically update on every input keystroke and observation submission.

---

### TASK-069: Navigation Routing & Missing Pages Completion

- **Target File(s)**: `apps/web/src/components/layout/MobileNav.tsx`, `apps/web/src/app/instruments/page.tsx`, `apps/web/src/app/reports/page.tsx`, `apps/web/src/app/verify/page.tsx`, `apps/web/src/app/rule-packs/page.tsx`, `apps/web/src/app/provenance/page.tsx`
- **Blocked By**: `TASK-048`, `TASK-065`
- **Technical Blueprint**:
  - Fix `/reviews` link to `/review` in `MobileNav.tsx` and `Shell.tsx`.
  - Build `apps/web/src/app/instruments/page.tsx`: Instrument Inventory listing active NAWI units with "New Intake" CTA.
  - Build `apps/web/src/app/reports/page.tsx`: Reports Directory displaying generated Form 1/2 certificates with search and filter.
  - Build `apps/web/src/app/verify/page.tsx`: Public Verification portal with QR code scanner and manual SHA-256 hash lookup.
  - Build `apps/web/src/app/rule-packs/page.tsx`: Standards-as-Code viewer for OIML R 76-1:2006 and Table 3/6 rules.
  - Build `apps/web/src/app/provenance/page.tsx`: WELMEC 7.2 cryptographic ledger explorer.
- **Acceptance Criteria**: Clicking every item in the navbar navigation routes cleanly to an active, functional page with zero 404 errors.

---

### TASK-070: Non-Technical Officer Guided Mode & Intuitive Field UX

- **Target File(s)**: `apps/web/src/components/bench/BenchWorkbenchView.tsx`, `apps/web/src/components/bench/ObservationCard.tsx`
- **Blocked By**: `TASK-066`, `TASK-067`
- **Technical Blueprint**:
  - Provide an intuitive "Field Guided Mode" for Legal Metrology Officers with limited technical knowledge:
    - Contextual prompt banner: "Step Action: Place 5.000 kg standard weight on the platform and observe display".
    - One-tap quick load buttons (Zero, Min 20e, 1/4 Max, 1/2 Max, Max).
    - Clear, plain-English tooltips for all metrological terms ($L$, $I$, $\Delta L$, $P$, $E$, $E_c$, MPE).
    - High-contrast touch buttons ($\ge 48\text{px}$) designed for gloved or outdoor bay usage.
- **Acceptance Criteria**: Guided prompts adapt to each step of the test battery and simplify testing for non-technical officers.

---

## 15. Module 12: Full Metrological Test Battery on Bench UI (Forms 2–6 Orchestration)

Module 12 expands the physical benchtop interface beyond Form 1 (Weighing Performance) to provide dedicated, touch-optimized observation cards and live calculators for Forms 2 through 6 under OIML R-76 Annex A.

---

### TASK-071: Bench Test Battery Multi-Form Navigator & Form State Router

- **Target File(s)**: `apps/web/src/components/bench/TestBatteryNavigator.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-070`
- **Technical Blueprint**:
  - Implement a mobile-first `TestBatteryNavigator` tab/stepper bar across Form 1 (Weighing), Form 2 (Thermal Drift), Form 3 (Eccentricity), Form 4 (Discrimination), Form 5 (Repeatability), and Form 6 (Creep & Zero Return).
  - Track individual form completion percentage, compliance status (PASS / FAIL / PENDING), and active form tab in URL query parameters (`?form=form3`).
  - Integrate with `ObservationLedgerTable` to filter displayed observation rows according to active test clause.
- **Acceptance Criteria**: Officer can seamlessly navigate between all 6 statutory forms with active state highlights, completion badges, and zero layout shift.

---

### TASK-072: Form 2 Bench Card: Temperature Effect on No-Load & Thermal Drift

- **Target File(s)**: `apps/web/src/components/bench/Form2TempDriftCard.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-071`
- **Technical Blueprint**:
  - Create touch-optimized observation input card for OIML R 76-1 Clause A.5.3.2 (Form 2).
  - Allow logging of climate chamber temperature steps ($-10^\circ\text{C}, +20^\circ\text{C}, +40^\circ\text{C}$), ambient humidity, and start/end timestamps.
  - Automatically evaluate zero drift rate $\frac{\Delta T}{\Delta t} \le 5.0^\circ\text{C/h}$ and zero-load error shift $|E_0| \le 0.5e$ using `@maanak/rules-engine`.
  - Persist observations to PostgreSQL via `POST /api/v1/observations` with `testClause="A.5.3.2"`.
- **Acceptance Criteria**: Officer can log temperature series with instant visual feedback on thermal drift rate and zero-load compliance.

---

### TASK-073: Form 3 Bench Card: Eccentricity & Corner Load 5-Position Receptor

- **Target File(s)**: `apps/web/src/components/bench/Form3EccentricityCard.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-071`
- **Technical Blueprint**:
  - Create interactive visual pan diagram representing the 5 receptor positions (1: Center, 2: Front-Left, 3: Front-Right, 4: Rear-Left, 5: Rear-Right) per Clause A.4.7.
  - Automatically calculate mandatory eccentricity test load $L_{\text{ecc}} = \frac{1}{3}Max$ (or per Table 3 for multi-column receptors).
  - Capture $I$ and $\Delta L$ for each position, calculate $P, E, E_c$, and evaluate corner load spread against Table 6 MPE.
  - Persist records with `testClause="A.4.7"` and `eccentricityPosition=1..5`.
- **Acceptance Criteria**: Tapping any receptor quadrant prompts load placement and displays real-time compliance badge for that corner.

---

### TASK-074: Form 4 Bench Card: Discrimination Test Engine (1.4d Test)

- **Target File(s)**: `apps/web/src/components/bench/Form4DiscriminationCard.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-071`
- **Technical Blueprint**:
  - Build workflow card for OIML R 76-1 Clause A.4.8 (Discrimination).
  - Prompt officer at 3 mandatory loads: $Min$, $\frac{1}{2}Max$, and $Max$.
  - Provide one-tap prompts to place extra load equal to $1.4d$ gently on receptor and record whether displayed indication cleanly advances by $+1d$.
  - Evaluate boolean discrimination response per clause requirements and persist to database.
- **Acceptance Criteria**: Clear step-by-step prompts for $1.4d$ addition and instant pass/fail validation.

---

### TASK-075: Form 5 Bench Card: Repeatability 10-Cycle Data Sheet

- **Target File(s)**: `apps/web/src/components/bench/Form5RepeatabilityCard.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-071`
- **Technical Blueprint**:
  - Build rapid-entry table for OIML R 76-1 Clause A.4.10 (Repeatability).
  - Support 2 series of weighings: Series A at $\frac{1}{2}Max$ (10 cycles) and Series B at $Max$ (10 cycles).
  - Rapid numeric input with auto-advance to next row on Enter/Submit.
  - Compute maximum spread $E_{\max} - E_{\min}$ and evaluate against MPE for that load point ($E_{\max} - E_{\min} \le |\text{MPE}|$).
- **Acceptance Criteria**: 10-run spread calculated instantly with visual compliance pill and standard deviation summary.

---

### TASK-076: Form 6 Bench Card: 30-Minute Creep & Zero Return Timed Workbench

- **Target File(s)**: `apps/web/src/components/bench/Form6CreepCard.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-071`
- **Technical Blueprint**:
  - Build timed execution card for OIML R 76-1 Clause A.4.11 (Creep & Zero Return).
  - Integrated digital countdown timer with audible/visual alerts at:
    - $t = 0\text{ min}$ (initial load application at $Max$)
    - $t = 15\text{ min}$ (intermediate creep indication)
    - $t = 30\text{ min}$ (final creep indication, load removal prompt)
    - $t = 30.5\text{ min}$ (30 seconds post-discharge zero-return check)
  - Compute creep error $\Delta I_{30 - 0}$ and zero recovery error $E_{0,\text{ret}}$ against statutory limits.
- **Acceptance Criteria**: Timers run accurately in background, chime on notification intervals, and record timestamped creep observations.

---

## 16. Module 13: Statutory Evidence, Sealing Plan & Photo Management System

Module 13 satisfies Rule 5(2) of the Legal Metrology (Approval of Models) Rules, 2011 and OIML R 76-2 Form 16/17 by providing robust file upload, EXIF extraction, SHA-256 fingerprinting, and report embedding for physical scale evidence.

---

### TASK-077: Backend Multipart Evidence Upload API

- **Target File(s)**: `apps/api/src/routes/evidence.ts`, `apps/api/src/app.ts`
- **Blocked By**: `TASK-038`, `TASK-042`
- **Technical Blueprint**:
  - Integrate `multer` middleware with strict MIME type filtering (`image/jpeg`, `image/png`, `application/pdf`) and 20MB file limit.
  - Expose `POST /api/v1/evidence/upload` supporting fields: `testSessionId`, `instrumentModelId`, `evidenceType` (`NAMEPLATE_PHOTO`, `SEALING_DIAGRAM`, `CIRCUIT_SCHEMATIC`, `USER_MANUAL`).
  - Calculate SHA-256 hash of the binary stream on upload for WELMEC 7.2 provenance chaining.
  - Pluggable storage driver:
    - If `CLOUDINARY_URL` is set in the environment: upload directly to Cloudinary (folder `maanak/evidence`) and persist the secure CDN HTTPS URL and public ID.
    - If `CLOUDINARY_URL` is omitted: fallback to local volume storage (`uploads/evidence/`).
  - Write record to `EvidenceAttachment` table with original file name, storage path / CDN URL, SHA-256 hash, and size.
- **Acceptance Criteria**: Uploading a photo or PDF stores file securely (on Cloudinary or local disk), persists record in PostgreSQL, and returns 201 Created with SHA-256 fingerprint.

---

### TASK-078: Evidence Attachment Provenance Chaining

- **Target File(s)**: `apps/api/src/routes/evidence.ts`, `packages/crypto-provenance/src/hasher.ts`
- **Blocked By**: `TASK-077`, `TASK-029`
- **Technical Blueprint**:
  - On evidence attachment upload, append a `PROVENANCE_EVIDENCE_ATTACHED` node to the test session's WELMEC 7.2 hash graph.
  - Canonical payload snapshot contains `evidenceType`, `fileName`, `fileSha256Hash`, `uploaderId`, and `timestamp`.
  - Invalidate session tamper check if the physical file on disk is modified or replaced.
- **Acceptance Criteria**: Provenance graph validator verifies evidence node continuity and detects any modification to uploaded evidence files.

---

### TASK-079: Frontend Evidence Vault & Photo Intake Component

- **Target File(s)**: `apps/web/src/components/evidence/EvidenceVaultCard.tsx`, `apps/web/src/app/instruments/new/page.tsx`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-077`
- **Technical Blueprint**:
  - Build `EvidenceVaultCard` supporting drag-and-drop file upload and mobile camera capture (`capture="environment"`).
  - Display thumbnails for uploaded nameplates and sealing plans with verified SHA-256 fingerprint pills.
  - Provide preview modal for PDFs (circuit schematics, user manual) and zoomable lightbox for metal nameplates.
- **Acceptance Criteria**: Mobile inspector can take a photo of the scale nameplate directly from phone browser, upload, and view immediate SHA-256 hash confirmation.

---

### TASK-080: PDF Report Annex Evidence Embedder

- **Target File(s)**: `packages/report-generator/src/pdf.ts`
- **Blocked By**: `TASK-077`, `TASK-034`
- **Technical Blueprint**:
  - Update `compileOimlPdfReport` to accept optional `evidenceAttachments: { type: string, imageBuffer?: Buffer, description: string }[]`.
  - Embed high-resolution JPEG/PNG nameplate photo on Page 5 / Annex of the official OIML R 76-2 PDF report using `pdfDoc.embedJpg` / `embedPng`.
  - Embed sealing location plan diagram with reference callout annotations.
- **Acceptance Criteria**: Generated PDF report includes embedded nameplate photograph and sealing diagram with SHA-256 watermark captions.

---

## 17. Module 14: Complete Lifecycle State Machine, Immutability WORM Lock & Multi-Role Handover

Module 14 enforces strict separation of duties, reviewer re-test correction routing, and irreversible database locks upon Director X.509 PKI approval under Section 22 of the Legal Metrology Act.

---

### TASK-081: Strict Session State Machine & Re-Test Correction Loop

- **Target File(s)**: `apps/api/src/routes/sessions.ts`, `apps/api/src/routes/review.ts`, `apps/web/src/components/review/ReviewAuditView.tsx`
- **Blocked By**: `TASK-042`, `TASK-044`
- **Technical Blueprint**:
  - Enforce atomic state transitions: `DRAFT` $\to$ `OBSERVATION_COMPLETE` $\to$ `UNDER_REVIEW` $\to$ `RETURNED_TO_OFFICER` $\to$ `PENDING_DIRECTOR_APPROVAL` $\to$ `APPROVED_LOCKED`.
  - When Reviewer rejects with `FLAGGED_FOR_CORRECTION`, transition session to `RETURNED_TO_OFFICER` and store structured rejection notes.
  - In `BenchWorkbenchView.tsx`, display amber "Session Returned for Correction" alert showing specific reviewer instructions, allowing the officer to re-execute only the flagged test clause.
- **Acceptance Criteria**: Rejected session returns to officer bench with specific clause unlocked for correction while preserving other valid test data.

---

### TASK-082: Database Immutability WORM Lock on APPROVED_LOCKED

- **Target File(s)**: `packages/db/src/repository.ts`, `apps/api/src/routes/observations.ts`, `apps/api/src/routes/sessions.ts`
- **Blocked By**: `TASK-081`, `TASK-028`
- **Technical Blueprint**:
  - Enforce WORM (Write-Once-Read-Many) immutability at the API and repository level:
    - Any `POST`, `PUT`, `PATCH`, or `DELETE` targeting observations or session metadata where `current_state === 'APPROVED_LOCKED'` throws HTTP 403 `SESSION_IMMUTABLE_LOCKED`.
  - Add PostgreSQL function / trigger or Prisma validation checking `session.status !== 'APPROVED_LOCKED'` before any mutating write.
- **Acceptance Criteria**: Direct attempts to modify or delete observations on an approved session fail with structured `SESSION_IMMUTABLE_LOCKED` error.

---

### TASK-083: Director Live Approval & X.509 Cryptographic Sign-off API

- **Target File(s)**: `apps/api/src/routes/reports.ts`, `packages/crypto-provenance/src/signer.ts`
- **Blocked By**: `TASK-045`, `TASK-031`
- **Technical Blueprint**:
  - Create endpoint `POST /api/v1/sessions/:id/approve-and-sign` restricted strictly to `ROLE_DIRECTOR`.
  - Validate Director PIN / password credentials.
  - Generate X.509 digital signature block using `@peculiar/x509` with Director's RSA key pair.
  - Calculate `Hash_Final = SHA256(Hash_Session + PDF_Bytes + Signature)` and record final provenance closure node.
  - Update session state to `APPROVED_LOCKED` and archive signed PDF in report storage.
- **Acceptance Criteria**: Calling endpoint validates Director authorization, signs document, sets `APPROVED_LOCKED`, and returns downloadable signed certificate URL.

---

### TASK-084: Director Executive Signing Console UI

- **Target File(s)**: `apps/web/src/components/reports/ReportDetailView.tsx`, `apps/web/src/components/reports/SigningPinModal.tsx`
- **Blocked By**: `TASK-083`, `TASK-056`
- **Technical Blueprint**:
  - Connect `SigningPinModal` in `ReportDetailView` to `POST /api/v1/sessions/:id/approve-and-sign`.
  - Display live Director X.509 certificate metadata (Issuer, Subject, Serial Number, Validity Period, SHA-256 Fingerprint).
  - Upon successful signing, transition view to show green "APPROVED & STATUTORILY LOCKED" banner and trigger automated signed PDF download.
- **Acceptance Criteria**: Director can enter PIN, observe signing progress spinner, and receive confirmed digitally signed OIML R 76-2 certificate.

---

## 18. Module 15: Enterprise Multi-Tenancy & Laboratory Data Isolation (RRSL Scoping)

Module 15 enforces strict multi-tenant facility boundaries across Regional Reference Standard Laboratories (RRSL Faridabad, Bengaluru, Bhubaneswar, Ahmedabad, Varanasi, Guwahati) and State Central Laboratories.

---

### TASK-085: Multi-Tenant Laboratory Scoping Middleware in Express API

- **Target File(s)**: `apps/api/src/middleware/tenant.ts`, `apps/api/src/routes/sessions.ts`, `apps/api/src/routes/instruments.ts`, `apps/api/src/routes/weights.ts`
- **Blocked By**: `TASK-038`, `TASK-028`
- **Technical Blueprint**:
  - Implement `tenantMiddleware` extracting `laboratoryId` from authenticated JWT claims (`req.user.laboratoryId`).
  - Automatically inject `where: { laboratoryId: req.user.laboratoryId }` into all Prisma queries for sessions, standard weights, and physical instrument units.
  - Allow `ROLE_ADMIN` users with null `laboratoryId` to query across all facilities.
- **Acceptance Criteria**: Testing officers in RRSL Faridabad cannot view, edit, or list test sessions belonging to RRSL Bengaluru.

---

### TASK-086: PostgreSQL Row-Level Security (RLS) Policies on Operational Tables

- **Target File(s)**: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/rls_policies.sql`
- **Blocked By**: `TASK-085`, `TASK-026`
- **Technical Blueprint**:
  - Author SQL migration enabling PostgreSQL Row-Level Security on operational tables: `test_sessions`, `raw_observations`, `reference_standards`, `evidence_attachments`.
  - Define policies:
    ```sql
    ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY rrsl_tenant_isolation ON test_sessions
      FOR ALL TO public
      USING (laboratory_id = NULLIF(current_setting('app.current_laboratory_id', true), '')::UUID);
    ```
- **Acceptance Criteria**: Direct SQL queries using tenant context are strictly restricted to the tenant's own records.

---

### TASK-087: RRSL Multi-Facility Dashboard & Facility Switcher

- **Target File(s)**: `apps/web/src/components/layout/Shell.tsx`, `apps/web/src/app/dashboard/page.tsx`
- **Blocked By**: `TASK-085`, `TASK-051`
- **Technical Blueprint**:
  - In `Shell.tsx`, add facility indicator badge showing current user's laboratory node (e.g. `RRSL Faridabad (NABL TC-5421)`).
  - For `ROLE_ADMIN` users, provide a multi-facility dropdown switcher allowing inspection of individual RRSL performance KPIs and calibration queues.
  - Dashboard analytics cards adapt dynamically to show facility-specific vs national aggregated statistics.
- **Acceptance Criteria**: Admin can filter dashboard by RRSL branch; officers see their local laboratory branding and jurisdiction details.

---

## 19. Module 16: Full OIML R 76-2 Report Generation (Forms 1–17 Expansion)

Module 16 completes the document compilation pipeline by dynamically binding database observations for Forms 2 through 6 and providing standardized schemas for Forms 7 through 17.

---

### TASK-088: Live Database Observations Binding for Forms 2–6 in Report Compiler

- **Target File(s)**: `apps/api/src/routes/reports.ts`, `packages/report-generator/src/pdf.ts`, `packages/report-generator/src/docx.ts`
- **Blocked By**: `TASK-072`, `TASK-073`, `TASK-074`, `TASK-075`, `TASK-076`
- **Technical Blueprint**:
  - Refactor `buildReportDataFromSession` in `apps/api/src/routes/reports.ts` to query raw observations by clause.
  - Dynamically map:
    - `testClause === 'A.5.3.2'` $\to$ `form2TemperatureDrift`
    - `testClause === 'A.4.7'` $\to$ `form3Eccentricity`
    - `testClause === 'A.4.8'` $\to$ `form4Discrimination`
    - `testClause === 'A.4.10'` $\to$ `form5Repeatability`
    - `testClause === 'A.4.11'` $\to$ `form6Creep`
  - Render actual values in PDF and DOCX tables, replacing all fallback/mock defaults.
- **Acceptance Criteria**: Generated PDF and Word reports display live bench observation data across Forms 1, 2, 3, 4, 5, and 6.

---

### TASK-089: Forms 7–14 Modular Test Report Schema Extension

- **Target File(s)**: `packages/report-generator/src/pdf.ts`, `packages/report-generator/src/docx.ts`, `packages/types/src/reports.ts`
- **Blocked By**: `TASK-088`
- **Technical Blueprint**:
  - Extend `OimlReportData` interface to include optional fields for:
    - Form 7: Warm-up time test (Clause A.5.2)
    - Form 8: Long-term span stability (Clause A.4.4.4)
    - Form 9: Tare weighing accuracy (Clause A.4.6)
    - Forms 10–14: Voltage variations & electrical disturbance tests (AC/DC limits, bursts, electrostatic discharges)
  - Implement PDF table drawing routines in `pdf.ts` and table elements in `docx.ts` for these modular clauses.
- **Acceptance Criteria**: Test reports for modular indicators or electronic balances cleanly render Forms 7 through 14 when present.

---

### TASK-090: Forms 15–17 Administrative Checklist & Marking Verification

- **Target File(s)**: `packages/report-generator/src/pdf.ts`, `packages/report-generator/src/docx.ts`
- **Blocked By**: `TASK-089`
- **Technical Blueprint**:
  - Implement Form 15 (Software examination & legal integrity check per WELMEC 7.2).
  - Implement Form 16 (Descriptive markings checklist: Max, Min, e, d, Class mark, manufacturer plate, serial number).
  - Implement Form 17 (Sealing and verification mark places checklist).
  - Generate structured two-column checklist tables with PASS / FAIL / NA radio mark indicators.
- **Acceptance Criteria**: Multi-page PDF report includes complete Forms 15, 16, and 17 compliance audit checklists.

---

## 20. Module 17: Production Offline PWA Engine & IndexedDB / SQLite WASM Sync

Module 17 replaces in-memory and `localStorage` mock stores with an industrial-grade IndexedDB / SQLite WASM edge database, enabling full offline bench operations in shielded testing bays.

---

### TASK-091: IndexedDB Production Storage Driver

- **Target File(s)**: `apps/web/src/lib/offline-db.ts`, `apps/web/package.json`
- **Blocked By**: `TASK-058`
- **Technical Blueprint**:
  - Install `idb` (lightweight Promise-based IndexedDB wrapper).
  - Create database `maanak_offline_db` (version 1) with object stores:
    - `sessions`: cached active test sessions.
    - `instruments`: cached instrument models and specifications.
    - `standard_weights`: cached standard weight sets with calibration uncertainties.
    - `offline_queue`: observation mutations awaiting network synchronization with fields `queueId`, `sessionId`, `endpoint`, `payload`, `timestamp`, `retryCount`.
- **Acceptance Criteria**: Browser stores full offline dataset reliably across reloads and tab closures without storage size quota errors.

---

### TASK-092: Offline Session Creation & Instrument Intake

- **Target File(s)**: `apps/web/src/app/bench/page.tsx`, `apps/web/src/lib/offline-db.ts`, `apps/web/src/components/bench/BenchWorkbenchView.tsx`
- **Blocked By**: `TASK-091`
- **Technical Blueprint**:
  - Enable starting an observation session while offline using pre-cached instruments from `idb`.
  - Generate client-side RFC 4122 UUID primary keys (`local_id`) for offline observations.
  - Automatically evaluate Turning Point $P, E, E_c$, and Table 6 MPE brackets using local TypeScript calculation engine without active network.
- **Acceptance Criteria**: With Wi-Fi completely disabled, inspector can open bench, select instrument, log 10 observations, and observe live PASS/FAIL math.

---

### TASK-093: Service Worker Background Sync Engine

- **Target File(s)**: `apps/web/public/sw.js`, `apps/web/src/lib/offline-sync.ts`
- **Blocked By**: `TASK-091`, `TASK-046`
- **Technical Blueprint**:
  - Register Service Worker `sync` event handler (`sync-maanak-observations`).
  - When browser triggers `sync` upon reconnect, read all items from `offline_queue` in ascending chronological sequence.
  - Submit batch to `POST /api/v1/sync/push` with JWT credentials.
  - Handle conflict resolution:
    - If server state is `APPROVED_LOCKED`, reject client writes and notify user.
    - If server state is `DRAFT` or `UNDER_REVIEW`, append observations and update client ledger.
- **Acceptance Criteria**: Reconnecting network automatically flushes pending offline queue to PostgreSQL with zero data loss or duplicate records.

---

## 21. Module 18: Role-Based Access Control, Route Guards & Administration Portal

Module 18 introduces explicit client-side route guards, role-scoped navigation filtering, and a dedicated administrative portal for managing users, roles, and laboratory affiliations across the MAANAK platform.

---

### TASK-094: Next.js Client-Side Route Protection & Edge Middleware (`middleware.ts`)

- **Target File(s)**: `apps/web/src/middleware.ts`, `apps/web/src/lib/routes-config.ts`
- **Blocked By**: `TASK-058`
- **Technical Blueprint**:
  - Define an authoritative Route Access Matrix in `routes-config.ts`:
    - `/bench/**`: `[Role.INSPECTOR, Role.ADMIN]`
    - `/review/**`: `[Role.REVIEWER, Role.DIRECTOR, Role.ADMIN]`
    - `/reports/**`: `[Role.INSPECTOR, Role.REVIEWER, Role.DIRECTOR, Role.ADMIN]` (read-only for non-directors)
    - `/rule-packs/**`: `[Role.ADMIN]`
    - `/admin/**`: `[Role.ADMIN]`
  - Implement Next.js `middleware.ts` to intercept route transitions, check the active session/token, and redirect unauthenticated users to `/login`.
  - Provide client-side route guard `<ProtectedRoute allowedRoles={[...]} />` and a 403 Forbidden Access Denied fallback UI (`apps/web/src/app/access-denied/page.tsx`).
- **Acceptance Criteria**: Unauthorized role access to protected routes cleanly redirects to `/access-denied` or dashboard with a clear alert; direct URL visits by unauthorized roles are prevented.

---

### TASK-095: Role-Scoped Navigation & Dynamic Sidebar Filtering

- **Target File(s)**: `apps/web/src/components/layout/Shell.tsx`, `apps/web/src/components/layout/MobileNav.tsx`, `apps/web/src/lib/routes-config.ts`
- **Blocked By**: `TASK-094`
- **Technical Blueprint**:
  - Update `MAIN_NAV_ITEMS` in `MobileNav.tsx` and `Shell.tsx` to associate each navigation item with allowed roles:
    - Bench / Instruments: `INSPECTOR`, `ADMIN`.
    - Review Queue: `REVIEWER`, `DIRECTOR`, `ADMIN`.
    - Rule Packs: `ADMIN`.
    - Admin Console: `ADMIN`.
    - History / Standards: accessible across all authenticated roles.
  - Dynamically filter sidebar items based on `user.role` from `useAuth()`.
  - Add visual role badge in the sidebar header with distinct semantic colors (`INSPECTOR`: blue, `REVIEWER`: amber, `DIRECTOR`: purple, `ADMIN`: rose).
- **Acceptance Criteria**: Switching persona in `AuthContext` instantly updates visible navigation links; inspectors cannot see the Review Queue or Rule Packs; admins see the full navigation suite including Admin Console.

---

### TASK-096: Backend Administrative API Endpoints (`/api/v1/admin/*`)

- **Target File(s)**: `apps/api/src/routes/admin.ts`, `apps/api/src/routes/index.ts`, `apps/api/src/auth/service.ts`
- **Blocked By**: `TASK-046`
- **Technical Blueprint**:
  - Create a dedicated `/api/v1/admin` route module protected with `requireRole(Role.ADMIN)`.
  - Implement core user & role management endpoints:
    - `GET /api/v1/admin/users`: List registered personnel with filtering by role, laboratory ID, and active status.
    - `POST /api/v1/admin/users`: Create a new user with assigned role (`INSPECTOR`, `REVIEWER`, `DIRECTOR`), laboratory ID, and designation.
    - `PATCH /api/v1/admin/users/:id/role`: Update user role or toggle account active/suspended state.
    - `GET /api/v1/admin/audit-logs`: Query paginated immutable system audit log entries.
- **Acceptance Criteria**: Non-admin JWT tokens hitting `/api/v1/admin/*` receive HTTP 403 Forbidden; admin tokens can list, provision, and update personnel accounts.

---

### TASK-097: Frontend Administrative Portal & User Management Page

- **Target File(s)**: `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/admin/users/page.tsx`, `apps/web/src/components/admin/UserManagementTable.tsx`
- **Blocked By**: `TASK-094`, `TASK-096`
- **Technical Blueprint**:
  - Build `/admin` dashboard overviewing system health, active users by role, and laboratory affiliations.
  - Build `/admin/users` page displaying a paginated `UserManagementTable`:
    - Columns: Name, Username/Email, Designation, Assigned Laboratory, Role Badge, Status (Active/Suspended), Actions.
    - Modal for "Add Personnel" with role and laboratory dropdowns.
    - Dropdown menu to reassign roles or toggle user suspension.
- **Acceptance Criteria**: Admin user can navigate to `/admin/users`, view the user roster, provision a new user, and reassign roles with live UI feedback.


