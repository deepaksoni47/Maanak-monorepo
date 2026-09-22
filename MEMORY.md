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
