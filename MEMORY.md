# MAANAK (मानक) — System Memory, Technical Insights & Operational Gotchas

This document serves as the persistent operational memory bank for the MAANAK legal metrology monorepo platform. It captures critical implementation subtleties, architectural decisions, environment quirks, and domain edge cases discovered during engineering that are **not** present in the initial static documentation (`docs/`).

---

## 1. System & Environment Quirks

### 1.1 Windows PowerShell Command Chaining
- **Issue**: Standard POSIX `&&` chaining fails in Windows PowerShell environments with syntax parsing errors.
- **Rule**: Always use the semicolon (`;`) operator to chain multi-step commands:
  ```powershell
  # Correct
  pnpm --filter @maanak/api build ; pnpm --filter @maanak/api test

  # Incorrect (fails on Windows PowerShell)
  pnpm --filter @maanak/api build && pnpm --filter @maanak/api test
  ```

### 1.2 Node.js Native Test Runner (`node:test`)
- Tests use Node's native runner (`node:test` and `node:assert/strict`).
- Test execution scripts are configured as `"test": "node --test dist/*.test.js"`.
- **Gotcha**: Node executes compiled JavaScript ESM modules from `dist/`. Source changes in TypeScript files under `src/` will **not** be reflected in tests until `tsc` (or `pnpm build`) is run. Always build before testing:
  ```powershell
  pnpm --filter <package> build ; pnpm --filter <package> test
  ```

---

## 2. Monorepo Architecture & Cross-Package Patterns

### 2.1 Cross-Package `instanceof` Mismatches (e.g. `ZodError`)
- **Issue**: In a pnpm monorepo with workspace packages, checking `err instanceof ZodError` can evaluate to `false` if the error was thrown by a different package's resolved instance of `zod`.
- **Pattern**: Centralized error middleware must check both `instanceof` and `.name`:
  ```typescript
  if (err instanceof ZodError || err?.name === "ZodError") {
    // Return structured 400 VALIDATION_ERROR
  }
  ```

### 2.2 Prisma Client Resolution & Singleton Pattern
- `@maanak/db/src/client.ts` initializes the singleton Prisma client and exports `export * from '@prisma/client'`.
- Downstream applications (`apps/api`) should import `PrismaClient` and `prisma` directly from `@maanak/db` rather than adding a redundant direct `@prisma/client` dependency. This prevents client version skew and dual runtime initialization.

### 2.3 Non-TypeScript Asset Packaging in `packages/rules-engine`
- TypeScript compiler (`tsc`) does not copy raw `.json` files into `dist/`.
- The bundled rule pack `oiml-r76-2006-v1.json` is copied post-compilation via `packages/rules-engine/package.json`:
  ```json
  "build": "tsc && node --input-type=module -e \"import fs from 'node:fs'; fs.cpSync('src/rules', 'dist/rules', { recursive: true, filter: src => !src.endsWith('.ts') });\""
  ```

### 2.4 Test Isolation & In-Memory Dependency Injection
- API routers (`createAuthRouter`, `createRulesRouter`, `createWeightsRouter`, `createInstrumentsRouter`) and `createApp` support dependency injection via options (`authService`, `rulesRegistry`, `db`).
- This allows test suites to supply mock Prisma clients and isolated `RulePackRegistry` instances without requiring active Docker PostgreSQL containers during local testing.

---

## 3. Legal Metrology & Domain Calculation Insights

### 3.1 Default Rule Pack Schema & Identifiers
- **Default Pack ID**: `"oiml-r76-2006-v1"` (Standard string: `"OIML R 76-1:2006"`). Do not use `"oiml-r76-2006"`.
- **Classification Schema Key**: Table 3 classification limits are keyed under `table3Classification` on the RulePack object (not `table3ClassificationLimits`).

### 3.2 MPE Evaluation Mode Casing
- The rules engine (`packages/rules-engine/src/mpe.ts`) types evaluation modes as `"initialVerification" | "inService"`.
- API endpoints support uppercase strings (`INITIAL_VERIFICATION`, `IN_SERVICE`) from client requests and normalize them using `normalizeMode()`:
  ```typescript
  function normalizeMode(mode?: string): "initialVerification" | "inService" | undefined {
    if (!mode) return undefined;
    if (mode === "IN_SERVICE" || mode === "inService") return "inService";
    return "initialVerification";
  }
  ```

### 3.3 NABL 129 Standard Weight Uncertainty Rule
- Clause 3.7.1 & NABL 129 require standard weight expanded uncertainty $U \le \frac{1}{3}\text{MPE}$.
- When $U > \frac{1}{3}\text{MPE}$, the system must **not** throw an HTTP 500 error; it returns HTTP 200 with `compliant: false`, `status: "NON_COMPLIANT"`, and a structured amber warning payload specifying the violating load point and recommending the higher OIML R 111 weight class.

### 3.4 Arbitrary-Precision Math Core
- IEEE 754 floating-point numbers exhibit drift (e.g. `0.1 + 0.2 = 0.30000000000000004`).
- All calculations for Vernier Turning Point ($P = I + 0.5e - \Delta L$), Raw Error ($E = P - L$), and Intrinsic Error ($E_c = E - E_0$) are strictly performed using `decimal.js` with 30-digit precision (`Decimal.ROUND_HALF_UP`).

---

## 4. Cryptography, Signatures & Document Processing

### 4.1 `pdf-lib` Font Encoding Constraints (WinAnsi vs Unicode)
- Standard PDF Type 1 fonts (Helvetica, Times, Courier) in `pdf-lib` use WinAnsi character encoding.
- Attempting to draw unicode characters like `°C`, `µg`, or `±` causes runtime crashes (`WinAnsi cannot encode "°"`).
- **Solution**: The report generator implements `safeAscii()` to transform special metrological symbols to WinAnsi-safe equivalents (`+/-`, `deg C`, `ug`).

### 4.2 OpenXML Word Document (.docx) Archive Structure
- A `.docx` file is a ZIP container holding XML parts (principally `word/document.xml`).
- When validating document contents in automated tests, files cannot be inspected via raw text search; they must be inflated with `zlib.inflateRawSync()` or unzipped.

### 4.3 WELMEC 7.2 Hash Graph Canonicalization
- Cryptographic hash chaining requires canonical JSON strings: keys must be sorted alphabetically and serialized with deterministic whitespace. Any non-deterministic key ordering breaks the avalanche test and creates artificial tamper alarms.

---

## 5. Security & Authentication Architecture

### 5.1 Argon2id Password Hashing Parameters
- Password hashing uses `argon2` with the `argon2id` variant.
- Parameters balanced for legal metrology security and API responsiveness:
  - `memoryCost`: 19456 KiB (19 MiB)
  - `timeCost`: 2 iterations
  - `parallelism`: 1 thread
  - `type`: `argon2.argon2id`
- This configuration achieves execution times of ~30–50ms, avoiding event-loop starvation and keeping integration tests snappy.

### 5.2 JWT Lifecycle
- Access tokens expire in **15 minutes** (`expiresIn: "15m"`).
- Refresh tokens expire in **7 days** (`expiresIn: "7d"`).
- Decoded access tokens attach `req.user: AuthenticatedUser` with metrological permissions and `role`.

---

## 6. Frontend Web & UI Architectural Insights

### 6.1 Dual CSS/SVG Masking (`-webkit-mask-image` + `mask-image`)
- **Issue**: Tailwind arbitrary mask utilities such as `[mask-image:radial-gradient(...)]` only compile standard `mask-image`. In Chromium (Chrome, Edge) and WebKit (Safari), CSS masks applied to SVG background containers fail to render or render the elements invisible unless `-webkit-mask-image` is present.
- **Rule**: Whenever creating radial vignette fades or blurred edges on grids/backgrounds, always supply both properties via inline style or dual properties:
  ```tsx
  style={{
    WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, white 25%, transparent 85%)",
    maskImage: "radial-gradient(ellipse 75% 65% at 50% 35%, white 25%, transparent 85%)",
  }}
  ```

### 6.2 Layout Continuity vs Section Divider Borders
- **Issue**: Alternating full-width background color bands (`bg-card/40` vs `bg-background`) coupled with hard full-width horizontal dividing lines (`border-b`, `border-t`) creates a visual "striped" fragmentation where adjacent sections look like unrelated, stacked sub-pages.
- **Pattern**: Maintain a unified canvas (`bg-background`) throughout the landing page. Rely on consistent vertical spacing (`py-12 lg:py-16`) and self-contained card containers (`rounded-3xl bg-card border border-border`) rather than full-bleed section dividers.

### 6.3 Transparent Artwork & Frameless Hero Illustrations
- **Issue**: Wrapping transparent cutout illustrations (e.g. `hero.avif` scale artwork) inside a rectangular card container (`rounded-3xl border bg-card shadow-lg`) destroys the organic cutout depth and adds unnecessary visual clutter.
- **Pattern**: Let transparent illustrations float freely on the background canvas/grid with a natural `drop-shadow-lg` and proportional constraints (`max-w-lg xl:max-w-xl`), preserving spaciousness and visual lightness.

### 6.4 Magic UI `GridPattern` with `useId()` and Decorative Squares
- SVG grid patterns defined inside `<defs><pattern id={id}>` require dynamic `useId()` generation to prevent pattern collisions across pages or concurrent test runs.
- Decorative accent filled squares (`squares={[ [x, y], ... ]}`) should be rendered inside an `<svg className="overflow-visible">` overlay using exact coordinate multiples (`sqX * width + 1`) and subtle primary-tinted opacity (`fill-primary/15 dark:fill-primary/20`).

---

## 7. Database (PostgreSQL/Prisma), Docker & Live Integration Gotchas

### 7.1 PostgreSQL Native UUID Type Enforcement (Error `P2023`)
- **Issue**: Columns mapped to `@db.Uuid` (e.g. `TestSession.testingOfficerId`, `User.id`, `Laboratory.id`) are strictly validated by PostgreSQL driver and Prisma engine. Passing non-UUID strings like `"usr-insp-001"` throws:
  ```
  P2023: Inconsistent column data: Error creating UUID, invalid character: expected an optional prefix of `urn:uuid:` followed by [0-9a-fA-F-], found `u` at 1
  ```
- **Rule**: All mock fallback IDs, default persona tokens, and seed entities must always be authentic 36-character RFC 4122 UUIDs (e.g., `a1755e83-65fb-4b85-9fe9-3659af6501bc`).

### 7.2 Strict Non-Nullable Database Fields during Dynamic Registration
- **Issue**: `schema.prisma` specifies `mobileNumber String @map("mobile_number") @db.VarChar(20)` as non-nullable. User creation (`prisma.user.create`) without this field fails immediately with `PrismaClientValidationError: Argument mobileNumber is missing`.
- **Rule**: When programmatically registering users or importing testing officers, always provide standard telephone strings (e.g. `+91-9876543299`) and auto-generated government identifiers (`GOV-LM-...`).

### 7.3 Schema Column Naming vs Assumed Aliases
- **Discrepancy**: The `Laboratory` entity columns are named `name` and `code`, **not** `laboratoryName` or `laboratoryCode`.
- **Discrepancy**: The `TestSession` entity does **not** contain a `notes` column (session-level annotations belong in `rawObservations` or `reviewAudits`). Passing unknown keys to Prisma `create()` triggers validation exceptions.

### 7.4 Email & Username Alias Normalization
- **Context**: Seeded PostgreSQL users hold institutional emails (`inspector@rrsl.gov.in`, `admin@rrsl.gov.in`), but client apps and automated tests frequently submit `@maanak.gov.in` addresses or short usernames (`inspector`).
- **Pattern**: The authentication service resolves credentials across multiple identity permutations:
  ```typescript
  const usernamePart = identifier.split("@")[0];
  const rrslEmail = identifier.includes("@") 
    ? identifier.replace(/@[^@]+$/, "@rrsl.gov.in") 
    : `${identifier}@rrsl.gov.in`;

  where: {
    OR: [
      { email: identifier },
      { email: rrslEmail },
      { username: identifier },
      { username: usernamePart },
    ],
  }
  ```

### 7.5 Read-Only Directory Endpoints vs `optionalAuth`
- **Issue**: Enforcing strict `requireAuth` on read-only endpoints (`GET /api/v1/sessions`, `GET /api/v1/instruments`, `GET /api/v1/reports`, `GET /api/v1/weights`) causes initial page loads, unauthenticated guests, or public QR verification scans to fail with 401 UNAUTHORIZED before a session token is acquired.
- **Pattern**: Read-only listing routes use `optionalAuth` middleware, which attaches `req.user` if a valid Bearer token is provided without rejecting unauthenticated requests. Mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`) strictly retain `requireAuth` and `requireRole`.

---

## 8. Frontend React & Next.js Operational Insights

### 8.1 SSR `renderToStaticMarkup` vs Client-Side `useEffect` Data Hydration
- **Issue**: In Node.js SSR unit tests (e.g. `renderToStaticMarkup(<DashboardPage />)`), React's `useEffect` hook **never executes**. If a view initializes state to an empty array (`[]`) and only fetches from the API inside `useEffect`, SSR unit test assertions checking for initial table rows fail.
- **Pattern**: Initialize component state with structured default values (`RECENT_SESSIONS`, `DEFAULT_INSTRUMENTS`, `REPORTS_DATA`). In the browser, `useEffect` fires immediately on mount, replacing initial markup with live PostgreSQL records. This guarantees:
  1. Zero layout shift (CLS) and instant server-side HTML rendering.
  2. Passing SSR unit test suites.
  3. Seamless, dynamic client hydration from live database API endpoints.

### 8.2 Decimal Precision Input Buffering (`inputMode="decimal"`)
- **Issue**: Directly binding numeric inputs to a JavaScript `number` state causes immediate cursor-reset and wipes trailing dots or zeroes while typing (e.g., typing `0.` collapses to `0`, preventing entry of micro-weights like `0.0025 kg`).
- **Pattern**: Maintain string-buffered intermediate states (`indicationStr`, `deltaLStr`) validated with regex (`/^\d*\.?\d*$/`) and set `inputMode="decimal"`. Parse to numeric float only when updating calculations or persisting to the database.

### 8.3 Next.js Turbopack Process Concurrency
- **Issue**: Next.js Turbopack (`next dev`) enforces a single server instance per directory and port. Attempting to launch a second instance while port 3000 is occupied exits with code 1.
- **Rule**: Always verify active background processes (`manage_task list`) or check port availability before launching new dev server tasks.

---

## 9. Next.js App Router, Component Directives & UI State Architecture

### 9.1 Phosphor Icons & React Context in Server Components (`createContext` TypeError)
- **Issue**: In Next.js App Router, importing from `@phosphor-icons/react` inside Server Components or presentational atoms (e.g., `Badge.tsx`, `Pill.tsx`, `Button.tsx`) causes a fatal module evaluation crash:
  ```
  Runtime TypeError: createContext only works in Client Components. 
  Add the "use client" directive at the top of the file to use it.
  ```
- **Root Cause**: `@phosphor-icons/react` internally references React's `IconContext` (`createContext`), which is prohibited in Server Component evaluation.
- **Rule**: Any component file that directly imports from `@phosphor-icons/react` or packages using React context MUST declare `"use client";` at line 1, even if the component does not manage local state or effects.

### 9.2 Statutory Metrological Stepper & Application Flow
- **Context**: The Verification Bench must strictly guide Testing Officers through the 5 statutory legal metrology phases rather than jumping directly to data entry:
  1. **Step 1: Instrument Registration & Verification Parameters**: Instrument selection, applicant metadata, accuracy class (I–IIII), $Max$, $Min$, $e$, $d$, multi-interval/range toggles, and ratio $n = Max / e$ validation against Table 3 limits.
  2. **Step 2: Standards Selection & Uncertainty Ratio**: Selecting OIML R 111 standard weight sets ($E_1, E_2, F_1, F_2, M_1, M_2$) and verifying $U \le \frac{1}{3}\text{MPE}$ per Clause 3.7.1 and NABL 129.
  3. **Step 3: Environmental Pre-checks**: Recording temperature ($15^\circ\text{C} - 25^\circ\text{C}$), relative humidity, barometric pressure, spirit level bubble centering, and warm-up stabilization time.
  4. **Step 4: Physical Testing & Turning Point Observations**: Form 1 Weighing performance with Vernier small weight additions ($\Delta L$) to determine turning point $P = I + 0.5e - \Delta L$, raw error $E = P - L$, and tare-corrected error $E_c = E - E_0$.
  5. **Step 5: Review & Cryptographic Stamping**: Final compliance ledger verification, inspector digital sign-off, and WELMEC 7.2 hash graph commitment.

### 9.3 Dynamic Test Point Generation per OIML R-76 Clause A.4.4
- **Issue**: Test load points cannot be hardcoded (e.g. fixed at 0 kg, 0.1 kg, 1 kg, 15 kg). Applying fixed loads across diverse instruments (e.g. Class I analytical micro-balance $Max = 200\text{ g}$ vs Class III platform scale $Max = 15\text{ kg}$) causes physical capacity overloads or insufficient resolution.
- **Pattern**: The workbench implements `generateStepsForInstrument(inst: InstrumentItem)`:
  - Minimum test load: $Min = 100e$ (Class I), $50e$ (Class II), $20e$ (Class III), $10e$ (Class IIII).
  - First MPE step-change ($0.5e \to 1.0e$): $50,000e$ (Class I), $5,000e$ (Class II), $500e$ (Class III), $50e$ (Class IIII).
  - Second MPE step-change ($1.0e \to 1.5e$): $200,000e$ (Class I), $20,000e$ (Class II), $2,000e$ (Class III), $200e$ (Class IIII).
  - Intermediate and maximum points: $0.5 Max$, $Max$, and descending unloading steps to evaluate hysteresis.

### 9.4 Dynamic Instrument Switching & Table 3 Scale Boundary Validation ($n = Max / e$)
- **Issue**: When switching instruments or editing serial numbers, static forms may preserve outdated calibration parameters or allow illegal configurations.
- **Pattern**: Switching an instrument in the UI dynamically:
  1. Updates active capacity ($Max$) and verification interval ($e$).
  2. Evaluates scale interval count $n = \frac{Max}{e}$ against OIML R 76 Table 3 statutory limits ($n_{min} \le n \le n_{max}$).
  3. Displays an amber boundary violation alert if $n$ is invalid for the declared class.
  4. Regenerates the observation schedule for the new instrument and clears unrelated previous test steps.
  5. Leaves physical unit identifiers (Serial Number, TAC Number, Manufacturer) fully editable for the inspector.

### 9.5 Safe URL Search Parameter Extraction in Client Components (`useSafeBenchParams`)
- **Issue**: Direct invocation of Next.js `useSearchParams()` can throw during prerendering or static generation if Suspense boundaries are not strictly configured.
- **Pattern**: Wrap `useSearchParams()` in a defensive helper `useSafeBenchParams()` with try/catch fallback, enabling seamless deep-linking via query parameters (`?session=<uuid>` or `?instrumentId=<id>`) without build-time hydration failures.

---

## 10. End-to-End Live Metrology Persistence & Serialization

### 10.1 Zero-Static Data Flow & Live PostgreSQL State Synchronization
- **Principle**: The platform strictly enforces zero static, mocked, or simulated data across all production pages:
  - **Dashboard**: Hydrates dynamically via `sessionsApi.list()` and `weightsApi.list()`. Computes active testing counts, pending approvals, and weight calibration statuses from live PostgreSQL records.
  - **Instruments Directory**: Loads registered models and physical serial units via `instrumentsApi.list()`.
  - **Reports Hub**: Queries completed sessions and issued certificates from `reportsApi.list()` and `sessionsApi.list()`.
  - **Observation Ledger**: Physical load entries on the bench persist live to PostgreSQL via `observationsApi.logObservation(sessionId, payload)`.
- **Dual Hydration Architecture**: Components initialize with structured fallback defaults to ensure Node.js SSR unit tests (`renderToStaticMarkup`) pass without layout shift (CLS), while client-side `useEffect` instantly swaps in live database records upon mount.

### 10.2 Prisma `Decimal` Column String Serialization vs Metrological Precision
- **Issue**: PostgreSQL `DECIMAL`/`NUMERIC` fields (`maxCapacity`, `verificationScaleIntervalE`, `loadMass`, `indicatedValue`, `errorEc`, `mpeApplied`) are represented as `Prisma.Decimal` instances.
- **Gotcha**: Express `res.json()` serializes `Prisma.Decimal` instances into JSON string primitives (e.g. `"15.000"` or `"0.0050"`), **not** numeric floats.
- **Rule**: Consuming client code and API layers must convert values via `toDecimal()` (from `@maanak/rules-engine`) or `Number()` / `parseFloat()`. Never perform strict JavaScript number comparisons (`=== 15`) on raw API response objects.

### 10.3 Windows Host vs Docker PostgreSQL Port 5432 Conflicts
- **Issue**: Starting the Docker PostgreSQL container (`maanak-postgres`) on Windows fails if a native Windows PostgreSQL service (e.g. `postgresql-x64-16`) is already running and binding to `0.0.0.0:5432`.
- **Rule**: Before starting Docker containers on Windows, verify port 5432 occupancy:
  ```powershell
  Get-Service *postgres* | Stop-Service
  docker run -d --name maanak-postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=maanak postgres:16-alpine
  ```

### 10.4 WELMEC 7.2 Cryptographic Observation Chaining in Active Sessions
- **Genesis Block**: The session's cryptographic hash chain originates from `GENESIS_PREV_HASH` (`"0".repeat(64)`).
- **Observation Nodes**: Every physical observation logged at the bench generates a SHA-256 provenance node with canonical key ordering covering `sessionId`, `stepNumber`, `loadMass`, `indicatedValue`, `turningPointP`, `errorEc`, `mpe`, `timestamp`, and `previousHash`.
- **Tamper Evident**: Modifying or removing any past observation breaks the hash avalanche test and immediately flags the session as tampered during review and certificate generation.

### 10.5 Mock Prisma In-Memory DI & Optional Chaining in Unit Tests
- **Issue**: Unit test suites mock Prisma with a localized subset of tables (e.g., `mockPrisma` in `instruments.test.ts` mocks `instrumentModel`, `accuracyClass`, and `manufacturer`, but does not mock `instrumentUnit`).
- **Gotcha**: Directly invoking newly added relations (such as `db.instrumentUnit.create`) causes `TypeError: Cannot read properties of undefined (reading 'create')` during in-memory unit tests.
- **Pattern**: When introducing child model persistence in route handlers, guard the call with defensive checks (`if (db.instrumentUnit && typeof db.instrumentUnit.create === "function")`). This preserves 100% compatibility with test mocks while ensuring full relational persistence when connected to PostgreSQL.

### 10.6 Express Route Auth Guards & Frontend API Client Token Propagation
- **Issue**: Unit test suites explicitly assert that unauthenticated calls to `GET /api/v1/instruments`, `GET /api/v1/sessions`, `GET /api/v1/weights`, and `GET /api/v1/reports/:id/pdf` return `401 UNAUTHORIZED`.
- **Pattern**: Routes must enforce `requireAuth` rather than `optionalAuth`. The Next.js client (`apps/web/src/lib/api.ts`) automatically retrieves the authenticated session token (`maanak_access_token` from localStorage) and attaches `Authorization: Bearer <token>` to all downstream requests, including binary PDF/DOCX downloads and background synchronization pushes.

