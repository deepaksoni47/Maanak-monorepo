# Technical Specification (TechSpec): MAANAK
**System Name:** MAANAK (मानक) - Metrological Automation & Analysis Network for Accuracy & Compliance  
**Problem Statement:** SIH26035 | **OIML Recommendation:** R 76-1:2006 & R 76-2:2007  
**Legal Framework:** Legal Metrology Act, 2009 (Sec 22) & Approval of Models Rules, 2011/2019  
**Document Version:** 2.0.0 | **Status:** Production-Ready Technical Architecture Specification  

---

> [!IMPORTANT]
> **Authoritative Developer Directives:**
> 1. **Strict Documentation Adherence**: All engineers, agents, and contributors must follow this document and the associated `/docs` specifications strictly.
> 2. **Node.js Ecosystem**: All backend and calculation services are implemented exclusively in **Node.js (LTS v20+ / v22+) using TypeScript**. Python/FastAPI is completely replaced.
> 3. **Latest Stable Packages**: Always install and use the latest stable releases of all workspace packages (e.g. Next.js 16 LTS v16.3.5, React 19, Tailwind CSS v4, Prisma ORM, Express/Fastify, `decimal.js`, `docx`, `pdf-lib`, `zod`, `lucide-react`).
> 4. **Mandatory Mobile Phone Responsiveness**: All UI portals, screens, forms, tables, and workflows **must be fully responsive on mobile phones (smartphones 360px–430px)** as well as tablets and desktops.
> 5. **Lucide React Icons**: All UI iconography across desktop, tablet, and mobile PWA clients must use **`lucide-react`** (latest stable).
> 6. **Zero Floating Point Errors**: Decimal calculations ($P, E, E_0, E_c, \text{MPE}$) must strictly use `decimal.js` for arbitrary precision arithmetic.

---

## 1. Executive Technical Summary & System Architecture

### 1.1 Technical Vision
**MAANAK** is a production-grade, offline-first metrological software platform designed for laboratories such as Regional Reference Standard Laboratories (RRSLs). It automates pattern evaluation testing and report generation for Non-Automatic Weighing Instruments (NAWI) strictly adhering to **OIML Recommendation R-76** (Parts 1 & 2) and Indian Legal Metrology statutory mandates.

The platform's architectural foundation is built on three non-negotiable principles:
1. **Decoupled "Standards-as-Code" Engine**: Regulatory math, Table 3 scale classification limits, Table 6 Maximum Permissible Error (MPE) step brackets, and formula logic are decoupled from application source code into external, versioned JSON rule packs (`oiml-r76-2006-v1.json`). This satisfies the SIH26035 core mandate for supporting future OIML revisions without application re-compilation or code deployments.
2. **Deterministic Metrological Core (Zero AI)**: All calculation pipelines ($P = I + 0.5e - \Delta L$, $E = P - L$, $E_c = E - E_0$) and Pass/Fail compliance evaluations are 100% deterministic, executed using arbitrary precision arithmetic (`decimal.js`). **Artificial Intelligence is strictly forbidden from making metrological compliance decisions.**
3. **WELMEC 7.2 Cryptographic Provenance Graph**: Every test session constructs an immutable SHA-256 hash graph linking raw bench observations, environmental sensor logs, standard weight calibration certificates, and calculation step traces prior to applying X.509 PKI digital signatures, satisfying WELMEC Guide 7.2 Extension L legal non-repudiation standards.

---

### 1.2 High-Level System Architecture Topology

```
+---------------------------------------------------------------------------------------------------+
|                                      MAANAK SYSTEM ARCHITECTURE                                   |
+---------------------------------------------------------------------------------------------------+
|  [PRESENTATION LAYER]                                                                             |
|  • Next.js 16 Web Portal (Desktop Dashboard for Lab Mgmt, Senior Review & Director Sign-Off)       |
|  • Progressive Web App (PWA) / Responsive Mobile (Smartphones 360-430px, Tablets, Touch Benches)  |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                       HTTPS / TLS 1.3 / REST API
                                                  v
+---------------------------------------------------------------------------------------------------+
|  [API GATEWAY & SECURITY LAYER]                                                                   |
|  • Node.js (TypeScript) / Express / Fastify / Nginx Gateway (Async RESTful Endpoints & OpenAPI)   |
|  • Auth Middleware: JWT (HS256/RS256) + Role-Based Access Control (RBAC) Enforcement              |
|  • Security Middleware: Input Sanitization (Zod), Rate Limiting, AES-256 Payload Encryption       |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-----------------------------------+-----------------------------------+---------------------------+
| [STANDARDS-AS-CODE ENGINE]        | [METROLOGICAL VALIDATION ENGINE]  | [REPORT GENERATION ENGINE]|
| • JSON Rule Pack Loader           | • NABL 129 U <= 1/3 MPE Validator | • Node.js PDFKit/@pdf-lib |
| • OIML R76 Table 3/6 Step Engine  | • Temp Stability Drift (5 K/h)    | • Node.js docx Compiler   |
| • Multi-Interval e1/e2 Switching  | • Physical Mass Sanity Rules      | • Vector Error Graphing   |
+-----------------------------------+-----------------------------------+---------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|  [DATA, PROVENANCE & STORAGE LAYER]                                                               |
|  • PostgreSQL 16 Central DB with Prisma ORM (Master Data, Users, Rule Packs, Session Records)     |
|  • SQLite 3.45 Edge Replica (Offline PWA Local Storage on Benchtop Tablets via IndexedDB)         |
|  • WELMEC 7.2 Cryptographic Hash Service (Node.js crypto SHA-256 Provenance Graph & State Locks)  |
|  • Local/S3 Object Storage (Nameplate Images, Circuit Diagrams, Digitally Signed PDFs)            |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Technology Stack & Technical Justification

| Architecture Layer | Technology Selection | Version / Specification | Technical Justification |
| :--- | :--- | :--- | :--- |
| **Web Portal Interface** | Next.js / React / Lucide React | Next.js 16 (LTS v16.3.5) / React 19, Lucide React (Latest Stable) | Server-Side Rendering (SSR) & Server Actions; responsive grid system for multi-tab R 76-2 forms; full mobile phone (360px-430px) & desktop responsiveness; native TypeScript type safety; rich Lucide iconography. |
| **Offline Bench & Field Client** | PWA / Responsive Touch Web | PWA Service Workers / Next.js 16 | Offline-first architecture allowing field & bench inspectors to record observations on smartphones and tablets without active Wi-Fi; touch-friendly numeric keypads for rapid bench entry. |
| **Backend API Gateway** | Node.js / Express / Fastify | Node.js 20+ LTS / 22 LTS (TypeScript) | High-throughput asynchronous non-blocking event loop; native Zod / Typia data validation schemas; auto-generated OpenAPI (Swagger) specifications; full TypeScript end-to-end type safety. |
| **Calculation Engine** | Pure TypeScript Engine | Node.js (`decimal.js` Latest Stable) | Arbitrary precision decimal arithmetic avoiding IEEE 754 floating point rounding errors (`0.1 + 0.2 != 0.3`); zero AI dependencies; 100% deterministic test coverage. |
| **Primary Database** | PostgreSQL | PostgreSQL 16.2+ | Enterprise ACID compliance; native `JSONB` support for indexing dynamic OIML R-76 JSON rule packs; robust row-level locking for multi-tenant laboratory isolation. |
| **Offline Edge Storage** | SQLite / IndexedDB | SQLite 3.45 (via WASM / IndexedDB) | Zero-configuration SQL database running locally inside PWA Service Worker context for seamless offline storage on benchtop tablets. |
| **Database ORM / Migrations**| Prisma ORM | Prisma (Latest Stable) | Type-safe SQL query generation, connection pooling, automated schema migrations, and seamless `Decimal` type support for metrological records. |
| **Report Generation Engine**| Node.js PDF Engine & `docx`| `pdf-lib` / `pdfkit` & `docx` (Latest Stable) | Programmatic, pixel-perfect generation of official OIML R 76-2 PDF forms (Forms 1–17) and editable Word documents (`.docx`) with embedded vector curves. |
| **Cryptographic Provenance**| Node.js `crypto` / `@peculiar/x509` | OpenSSL 3.0 / PKCS#11 | SHA-256 hash graph generation, WELMEC 7.2 record locking, and X.509 PKI digital signature integration for USB DSC hardware tokens. |
| **UI Iconography** | Lucide React | `lucide-react` (Latest Stable) | Clean, accessible, unified metrological iconography across all dashboards and bench entry screens. |
| **Containerization & Web Server**| Docker & Nginx | Docker 25.0+ / Nginx 1.25+ | Isolated microservice containerization, reverse proxying, SSL/TLS termination, and HTTP/2 performance optimization. |

---

## 3. Major Service Modules & Component Boundaries

```
+---------------------------------------------------------------------------------------------------+
|                                   MODULE BOUNDARIES & INTERFACES                                  |
+---------------------------------------------------------------------------------------------------+
| 1. AuthService                --> Issues JWT tokens; enforces RBAC matrix (Testing Officer,       |
|                                   Senior Reviewer, Laboratory Director, Metrology Admin).         |
| 2. InstrumentIntakeService    --> Registers NAWI models, logs Max/Min/e/d specs, parses nameplate |
|                                   metadata via OCR engine.                                        |
| 3. StandardWeightService      --> Tracks standard weight calibration certs; executes NABL 129     |
|                                   uncertainty pre-validation (U <= 1/3 MPE).                      |
| 4. RulePackEngine             --> Loads, validates, and evaluates versioned OIML JSON rule packs |
|                                   (Standards-as-Code execution engine).                           |
| 5. DeterministicMathEngine    --> Executes P = I + 0.5e - dL, E = P - L, Ec = E - E0, MPE step     |
|                                   bracket calculations, and multi-interval scale switching.        |
| 6. MetrologicalValidationService-> Verifies temp drift (<= 5K/h), physical mass sanity limits,   |
|                                   and zero-load error thresholds.                                 |
| 7. ReviewerAnomalyService     --> Scans test records for boundary breaches, missing tests, or     |
|                                   abnormal observations prior to senior review.                   |
| 8. ReportGeneratorService     --> Renders OIML R 76-2 PDF/Word documents and plots vector error   |
|                                   curves (Ec vs Load L).                                         |
| 9. ProvenanceService          --> Constructs WELMEC 7.2 SHA-256 hash graphs, enforces state locks,  |
|                                   and embeds X.509 PKI signatures.                                |
| 10. SyncManagerService        --> Handles bidirectional sync between edge SQLite DBs and central  |
|                                   PostgreSQL master with timestamp conflict resolution.           |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. End-to-End Data Flow Specifications

```
[Inspector: Intake] --> (Register NAWI & Specs: Max, Min, e, d, Class)
         |
         v
[StandardWeightService] --> (Verify Weight Cert Expiry & Run NABL 129 U <= 1/3 MPE Pre-Check)
         |
         | Pass Validation
         v
[Bench PWA Client] --> (Record Env Temp/Humidity & Raw Load Observations: L, I, dL)
         |
         | Save Local (SQLite Edge DB) -> Auto Sync
         v
[RulePackEngine + DeterministicMathEngine]
         |--> (Execute P = I + 0.5e - dL, E = P - L, Ec = E - E0)
         |--> (Evaluate Table 6 Initial Verification MPE Step Brackets)
         |--> (Check Multi-Interval e1/e2/e3 Dynamic Range Switching)
         v
[ReviewerAnomalyService] --> (Flag Out-of-Tolerance Errors & Missing Test Clauses)
         |
         v
[Senior Reviewer Portal] --> (Peer Audit Derivation Trees & Confirm Pass/Fail Summary)
         |
         v
[Director Signing Portal] --> (Approve & Apply X.509 PKI / USB DSC Digital Signature)
         |
         v
[ProvenanceService & ReportGeneratorEngine]
         |--> (Build Final WELMEC 7.2 SHA-256 Hash Graph)
         |--> (Export Pixel-Perfect OIML R 76-2 PDF/Word Reports)
         |--> (Expose Public Verification Endpoint / eMaap REST Gateway)
```

---

## 5. R-76 Rules & Calculation Engine Architecture ("Standards-as-Code")

### 5.1 JSON Rule Pack Specification Schema (`oiml-r76-2006-v1.json`)
The application decouples regulatory logic by executing rules parsed from JSON schemas. Below is the complete specification schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "rule_pack_id": "oiml-r76-2006-v1",
  "standard_name": "OIML R 76-1:2006",
  "effective_date": "2006-10-01",
  "accuracy_classes": ["I", "II", "III", "IIII"],
  "scale_classification_rules": {
    "Class_I": { "min_e_g": 0.001, "min_n": 50000, "max_n": null },
    "Class_II": { "min_e_g": 0.001, "max_e_g": 0.05, "min_n": 100, "max_n": 100000 },
    "Class_III": { "min_e_g": 0.1, "min_n": 100, "max_n": 10000 },
    "Class_IIII": { "min_e_g": 5.0, "min_n": 100, "max_n": 1000 }
  },
  "mpe_step_brackets_initial_verification": {
    "Class_I": [
      { "m_min": 0, "m_max": 50000, "mpe_multiplier_e": 0.5 },
      { "m_min": 50000, "m_max": 200000, "mpe_multiplier_e": 1.0 },
      { "m_min": 200000, "m_max": null, "mpe_multiplier_e": 1.5 }
    ],
    "Class_II": [
      { "m_min": 0, "m_max": 5000, "mpe_multiplier_e": 0.5 },
      { "m_min": 5000, "m_max": 20000, "mpe_multiplier_e": 1.0 },
      { "m_min": 20000, "m_max": 100000, "mpe_multiplier_e": 1.5 }
    ],
    "Class_III": [
      { "m_min": 0, "m_max": 500, "mpe_multiplier_e": 0.5 },
      { "m_min": 500, "m_max": 2000, "mpe_multiplier_e": 1.0 },
      { "m_min": 2000, "m_max": 10000, "mpe_multiplier_e": 1.5 }
    ],
    "Class_IIII": [
      { "m_min": 0, "m_max": 50, "mpe_multiplier_e": 0.5 },
      { "m_min": 50, "m_max": 200, "mpe_multiplier_e": 1.0 },
      { "m_min": 200, "m_max": 1000, "mpe_multiplier_e": 1.5 }
    ]
  },
  "formulas": {
    "pre_rounding_indication": "I + 0.5 * e - delta_L",
    "uncorrected_error": "P - L",
    "corrected_intrinsic_error": "E - E_0"
  },
  "uncertainty_rules": {
    "nabl_129_max_weight_un### 5.2 Deterministic Calculation Implementation Core (TypeScript / Node.js with decimal.js)

```typescript
import { Decimal } from 'decimal.js';

// Configure Decimal for standard metrological precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface RulePackBracket {
  m_min: number | string;
  m_max: number | string | null;
  mpe_multiplier_e: number | string;
}

export interface RulePack {
  rule_pack_id: string;
  standard_name: string;
  mpe_step_brackets_initial_verification: Record<string, RulePackBracket[]>;
  formulas: Record<string, string>;
  uncertainty_rules: {
    nabl_129_max_weight_uncertainty_ratio: number;
  };
}

export interface MultiIntervalRangeConfig {
  range_index: number;
  max_load: number | string;
  e_val: number | string;
  d_val: number | string;
}

export interface ActiveRangeEvaluation {
  range_index: number;
  active_e: Decimal;
  active_d: Decimal;
}

export interface ObservationEvaluationResult {
  pre_rounding_P: Decimal;
  raw_error_E: Decimal;
  corrected_error_Ec: Decimal;
  mpe_limit: Decimal;
  is_compliant: boolean;
  compliance_status: 'PASS' | 'FAIL';
}

export class DeterministicMathEngine {
  /**
   * 100% Deterministic Metrological Engine executing OIML R 76-1 math.
   * Uses decimal.js to guarantee zero IEEE 754 floating point errors.
   */

  /**
   * Digital changeover pre-rounding indication: P = I + 0.5e - delta_L
   */
  public static calculatePreRoundingIndication(
    indication_I: Decimal.Value,
    e_interval: Decimal.Value,
    delta_L: Decimal.Value
  ): Decimal {
    const I = new Decimal(indication_I);
    const e = new Decimal(e_interval);
    const dL = new Decimal(delta_L);
    const half_e = new Decimal('0.5').times(e);
    return I.plus(half_e).minus(dL);
  }

  /**
   * Returns [Raw Error E, Corrected Intrinsic Error Ec]
   * E = P - L
   * Ec = E - E0
   */
  public static calculateErrors(
    P_val: Decimal.Value,
    applied_load_L: Decimal.Value,
    zero_error_E0: Decimal.Value
  ): [Decimal, Decimal] {
    const P = new Decimal(P_val);
    const L = new Decimal(applied_load_L);
    const E0 = new Decimal(zero_error_E0);

    const E = P.minus(L);
    const Ec = E.minus(E0);
    return [E, Ec];
  }

  /**
   * Calculates Table 6 Initial Verification MPE in mass units (grams/kg).
   * m = L / e (load in scale intervals)
   */
  public static getInitialMpeLimit(
    applied_load_L: Decimal.Value,
    e_interval: Decimal.Value,
    accuracy_class: string,
    rule_pack: RulePack
  ): Decimal {
    const L = new Decimal(applied_load_L);
    const e = new Decimal(e_interval);

    if (e.lessThanOrEqualTo(0)) {
      throw new Error('Scale division e must be strictly positive.');
    }

    const m_scale_intervals = L.dividedBy(e);
    const brackets = rule_pack.mpe_step_brackets_initial_verification[accuracy_class];

    if (!brackets) {
      throw new Error(`Unknown accuracy class: ${accuracy_class}`);
    }

    let mpe_multiplier: Decimal | null = null;
    for (const b of brackets) {
      const m_min = new Decimal(b.m_min);
      const m_max = b.m_max !== null ? new Decimal(b.m_max) : new Decimal(Infinity);

      if (m_scale_intervals.greaterThanOrEqualTo(m_min) && m_scale_intervals.lessThanOrEqualTo(m_max)) {
        mpe_multiplier = new Decimal(b.mpe_multiplier_e);
        break;
      }
    }

    if (!mpe_multiplier) {
      throw new Error(`Load m=${m_scale_intervals.toString()}e out of bounds for Class ${accuracy_class}`);
    }

    return mpe_multiplier.times(e);
  }

  /**
   * Dynamically selects active interval e_i for multi-interval scale ranges W1, W2, W3.
   */
  public static evaluateMultiIntervalActiveRange(
    applied_load_L: Decimal.Value,
    multi_interval_config: MultiIntervalRangeConfig[]
  ): ActiveRangeEvaluation {
    const L = new Decimal(applied_load_L);
    const sortedRanges = [...multi_interval_config].sort((a, b) =>
      new Decimal(a.max_load).comparedTo(new Decimal(b.max_load))
    );

    for (const rangeCfg of sortedRanges) {
      if (L.lessThanOrEqualTo(new Decimal(rangeCfg.max_load))) {
        return {
          range_index: rangeCfg.range_index,
          active_e: new Decimal(rangeCfg.e_val),
          active_d: new Decimal(rangeCfg.d_val)
        };
      }
    }

    const highest = sortedRanges[sortedRanges.length - 1];
    return {
      range_index: highest.range_index,
      active_e: new Decimal(highest.e_val),
      active_d: new Decimal(highest.d_val)
    };
  }

  /**
   * Complete deterministic evaluation pipeline for a single observation point.
   */
  public static evaluateObservationCompliance(
    indication_I: Decimal.Value,
    applied_load_L: Decimal.Value,
    delta_L: Decimal.Value,
    zero_error_E0: Decimal.Value,
    e_interval: Decimal.Value,
    accuracy_class: string,
    rule_pack: RulePack
  ): ObservationEvaluationResult {
    const P = this.calculatePreRoundingIndication(indication_I, e_interval, delta_L);
    const [E, Ec] = this.calculateErrors(P, applied_load_L, zero_error_E0);
    const mpe_limit = this.getInitialMpeLimit(applied_load_L, e_interval, accuracy_class, rule_pack);

    const is_compliant = Ec.abs().lessThanOrEqualTo(mpe_limit);

    return {
      pre_rounding_P: P,
      raw_error_E: E,
      corrected_error_Ec: Ec,
      mpe_limit: mpe_limit,
      is_compliant: is_compliant,
      compliance_status: is_compliant ? 'PASS' : 'FAIL'
    };
  }
}
```

---

## 6. Metrological Validation & Compliance Engine

MAANAK executes strict, automated pre-validation rules prior to and during bench execution:

### 6.1 NABL 129 Standard Weight Uncertainty Rule
Per **NABL 129** and **OIML R 76-1 Clause 3.7.1**, standard test weights used for pattern evaluation must satisfy:
$$U_{\text{expanded}} \le \frac{1}{3} \times \text{MPE}(L)$$
*Validation Rule*: Before allowing an inspector to record observations for load $L$, the system retrieves the selected weight set's calibration certificate from `StandardWeightService`. If expanded uncertainty $U > \frac{1}{3} \text{MPE}(L)$, the observation interface **locks data entry** and displays an alert:  
`"NABL 129 VIOLATION: Standard Weight Set #W-402 expanded uncertainty U=0.25g exceeds 1/3 MPE limit (0.16g) for load L=500g. Select Class E2 standard weights."`

### 6.2 Temperature Stability & Drift Rate Rule
Per **OIML R 76-1 Clause A.5.3.2**, ambient temperature during testing must remain within specified limits ($T_{\min} \le T \le T_{\max}$), and thermal drift rate must not exceed $5.0\,^\circ\text{C}/\text{hour}$.
$$\text{Drift Rate} = \frac{|T_{\text{end}} - T_{\text{start}}|}{\Delta t_{\text{hours}}} \le 5.0\,^\circ\text{C}/\text{h}$$
*Validation Rule*: If thermal drift rate $> 5.0\,^\circ\text{C}/\text{h}$, the session is flagged as `INVALID_THERMAL_DRIFT`.

### 6.3 Physical Mass Sanity Rules
* **Vernier Addition Range**: $0.0 \le \Delta L \le 1.1e$.
* **Minimum Scale Capacity**: $L \ge \text{Min}$.
* **Overload Protection Limit**: $L \le \text{Max} + 9e$.

---

## 7. Report Generation & Rendering Engine

MAANAK generates standardized **OIML R 76-2** pattern evaluation report PDFs using Node.js PDF engines (`@pdf-lib` / `pdfkit`) and editable Microsoft Word documents using the `docx` Node.js library.

```
+---------------------------------------------------------------------------------------------------+
|                                  REPORT GENERATION ARCHITECTURE                                   |
+---------------------------------------------------------------------------------------------------+
|  [Test Session Data] + [Active RulePack metadata] + [X.509 PKI Signature]                         |
|                                         |                                                         |
|                                         v                                                         |
|  [ReportGeneratorService] -------------------------------------------------------------+           |
|         |                                                                              |          |
|         v                                                                              v          |
|  [Headless Chart / Canvas Engine]                                        [PDFKit / @pdf-lib / docx]|
|  • Plots Vector Error Curves: Corrected Error Ec vs Applied Load L       • Maps Data to OIML      |
|  • Overlays Table 6 MPE Step Limit Brackets                              | R 76-2 Forms 1-17      |
|  • Renders High-Resolution Vector Chart Artifacts                        | Layout Schemas         |
|         |                                                                              |          |
|         +---------------------------------------+--------------------------------------+          |
|                                                 |                                                 |
|                                                 v                                                 |
|                             [Compiled PDF / Word Artifacts]                                       |
|                             • OIML R 76-2 Compliant Report PDF                                    |
|                             • Editable MS Word (.docx) Report                                     |
|                             • Embedded SHA-256 Hash QR Code & Digital Signature                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 8. Authentication, Authorization & RBAC Architecture

MAANAK uses **JSON Web Tokens (JWT)** with RS256/HS256 signature algorithms. The RBAC matrix is defined in TypeScript below:

```typescript
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  TestingOfficer: [
    "session:create",
    "observation:write",
    "observation:read",
    "image:upload",
    "calculation:execute_draft"
  ],
  SeniorReviewer: [
    "session:read_all",
    "observation:read",
    "review:execute_anomaly_audit",
    "review:flag_discrepancy",
    "review:approve_peer"
  ],
  LaboratoryDirector: [
    "session:read_all",
    "approval:grant_final",
    "signature:apply_pki_dsc",
    "session:lock_immutable",
    "report:publish"
  ],
  MetrologyAdmin: [
    "rule_pack:upload",
    "rule_pack:activate",
    "weight_inventory:write",
    "user_account:manage"
  ]
};
```

---ntory:write",
        "user_account:manage"
    ]
}
```

---

## 9. Database Schema & Storage Approach

### 9.1 PostgreSQL 16 Central Database Schema (DDL)

```sql
-- PostgreSQL 16 Production Relational Schema for MAANAK

CREATE TYPE accuracy_class_enum AS ENUM ('I', 'II', 'III', 'IIII');
CREATE TYPE session_state_enum AS ENUM ('DRAFT', 'OBSERVATION_COMPLETE', 'REVIEWED', 'APPROVED_LOCKED');
CREATE TYPE user_role_enum AS ENUM ('TestingOfficer', 'SeniorReviewer', 'LaboratoryDirector', 'MetrologyAdmin');

-- Users & Authentication Table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    dsc_certificate_serial VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- NAWI Instrument Registry
CREATE TABLE instruments (
    instrument_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer_name VARCHAR(200) NOT NULL,
    model_designation VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    accuracy_class accuracy_class_enum NOT NULL,
    max_capacity_g NUMERIC(12, 4) NOT NULL,
    min_capacity_g NUMERIC(12, 4) NOT NULL,
    verification_scale_interval_e NUMERIC(10, 6) NOT NULL,
    scale_division_d NUMERIC(10, 6) NOT NULL,
    is_multi_interval BOOLEAN DEFAULT FALSE,
    multi_interval_config JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Standard Weight Calibration Inventory
CREATE TABLE standard_weights (
    weight_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_serial_number VARCHAR(100) UNIQUE NOT NULL,
    oiml_class VARCHAR(10) NOT NULL,
    nabl_cert_number VARCHAR(100) NOT NULL,
    expanded_uncertainty_u_g NUMERIC(10, 6) NOT NULL,
    calibration_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Versioned OIML Standards-as-Code Rule Packs
CREATE TABLE rule_packs (
    rule_pack_id VARCHAR(50) PRIMARY KEY,
    standard_name VARCHAR(100) NOT NULL,
    version_tag VARCHAR(20) NOT NULL,
    json_rules JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Test Sessions
CREATE TABLE test_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_id UUID REFERENCES instruments(instrument_id),
    testing_officer_id UUID REFERENCES users(user_id),
    senior_reviewer_id UUID REFERENCES users(user_id),
    lab_director_id UUID REFERENCES users(user_id),
    rule_pack_id VARCHAR(50) REFERENCES rule_packs(rule_pack_id),
    weight_set_id UUID REFERENCES standard_weights(weight_set_id),
    current_state session_state_enum DEFAULT 'DRAFT',
    start_temp_c NUMERIC(4, 2),
    end_temp_c NUMERIC(4, 2),
    humidity_rh NUMERIC(4, 2),
    session_sha256_hash VARCHAR(64),
    pki_signature_base64 TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Raw & Computed Test Observations
CREATE TABLE test_observations (
    observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES test_sessions(session_id) ON DELETE CASCADE,
    test_clause VARCHAR(20) NOT NULL,
    applied_load_l NUMERIC(12, 4) NOT NULL,
    displayed_indication_i NUMERIC(12, 4) NOT NULL,
    delta_l NUMERIC(10, 6) NOT NULL,
    zero_error_e0 NUMERIC(10, 6) DEFAULT 0.0,
    computed_p NUMERIC(12, 4),
    computed_raw_e NUMERIC(10, 6),
    computed_ec NUMERIC(10, 6),
    mpe_limit NUMERIC(10, 6),
    is_compliant BOOLEAN,
    observation_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    observation_sha256_hash VARCHAR(64)
);

-- Cryptographic Audit & Provenance Log
CREATE TABLE provenance_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES test_sessions(session_id),
    actor_id UUID REFERENCES users(user_id),
    action_type VARCHAR(50) NOT NULL,
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64) NOT NULL,
    payload_snapshot JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for High-Performance Queries
CREATE INDEX idx_instruments_serial ON instruments(serial_number);
CREATE INDEX idx_test_sessions_state ON test_sessions(current_state);
CREATE INDEX idx_observations_session ON test_observations(session_id);
CREATE INDEX idx_provenance_session ON provenance_logs(session_id);
```

---

### 9.2 Local Edge SQLite Schema (PWA Offline Database)
The PWA client runs an embedded SQLite database replicating `test_sessions` and `test_observations` tables locally, adding a `sync_status` column (`PENDING_SYNC`, `SYNCED`, `CONFLICT`).

---

## 10. Audit Trail & WELMEC 7.2 Cryptographic Provenance Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                WELMEC 7.2 PROVENANCE HASH CHAIN                                   |
+---------------------------------------------------------------------------------------------------+
|  [Step 1: Atomic Observation Hash]                                                                |
|  Hash_Obs_i = SHA256( session_id || clause || Load_L || Indication_I || dL || timestamp )        |
|                                         |                                                         |
|                                         v                                                         |
|  [Step 2: Session Intermediate Hash]                                                              |
|  Hash_Session = SHA256( Instrument_Serial || WeightSet_Cert || SUM(Hash_Obs_i) || RulePack_ID )   |
|                                         |                                                         |
|                                         v                                                         |
|  [Step 3: State Lock & Final Certificate Hash]                                                    |
|  Hash_Final = SHA256( Hash_Session || PDF_Binary_Hash || Director_X509_PKI_Signature )             |
+---------------------------------------------------------------------------------------------------+
```

When a session transitions to `APPROVED_LOCKED`, the system triggers an immutable state lock:
1. `current_state` is updated to `APPROVED_LOCKED`.
2. Database UPDATE and DELETE triggers are locked for that `session_id`. Any subsequent modification attempt raises a SQL exception.
3. `Hash_Final` is written to a QR code embedded on Page 1 of the generated test report PDF.

---

## 11. Offline & Sync Architecture

1. **Edge Storage**: PWA bench tablets record observations directly to local SQLite DB.
2. **Background Sync Worker**: Service Worker monitors network state (`window.navigator.onLine`).
3. **Sync Queue Protocol**: When Wi-Fi reconnects, PWA sends an HTTP POST `/api/v1/sync/push` containing pending SQLite session records.
4. **Conflict Resolution**: MAANAK enforces a **Vector Clock + Session State Rule**:
   * If central session state is `DRAFT`, edge observations append seamlessly.
   * If central session state is `APPROVED_LOCKED`, edge writes are rejected, and an alert is raised.

---

## 12. API Specifications & Key REST Endpoints

### 12.1 Authentication: `POST /api/v1/auth/login`
* Request: `{"email": "officer@rrsl.gov.in", "password": "SecretPassword123"}`
* Response: `{"access_token": "eyJhbGciOi...", "token_type": "bearer", "role": "TestingOfficer"}`

### 12.2 Session Creation: `POST /api/v1/test-sessions`
* Request:
```json
{
  "instrument_id": "a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d",
  "weight_set_id": "w1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
  "rule_pack_id": "oiml-r76-2006-v1",
  "start_temp_c": 21.5,
  "humidity_rh": 55.0
}
```
* Response: `{"session_id": "s1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c", "status": "DRAFT"}`

### 12.3 Observation Entry: `POST /api/v1/test-sessions/{id}/observations`
* Request:
```json
{
  "test_clause": "A.4.4",
  "applied_load_l": 500.0,
  "displayed_indication_i": 500.0,
  "delta_l": 0.2,
  "zero_error_e0": 0.0
}
```
* Response:
```json
{
  "observation_id": "o1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "computed_p": 500.3,
  "computed_raw_e": 0.3,
  "computed_ec": 0.3,
  "mpe_limit": 0.5,
  "is_compliant": true,
  "compliance_status": "PASS"
}
```

### 12.4 Verification Endpoint: `GET /api/v1/reports/verify/{session_hash}`
* Response: Returns verified metadata, Director digital signature certificate status, and WELMEC 7.2 hash chain integrity status.

---

## 13. Security, Error Handling & Deployment Architecture

### 13.1 Security Safeguards
* **Encryption at Rest**: PostgreSQL tables encrypted using AES-256 (pgcrypto).
* **Encryption in Transit**: Strict TLS 1.3 enforcement on Nginx reverse proxy.
* **OWASP Mitigation**: SQL injection protection via Prisma ORM parameterized queries; XSS prevention via React HTML escaping; CORS restricted to trusted laboratory domains; schema validation via Zod.

### 13.2 Deployment Architecture (Docker Compose Setup)

```yaml
version: '3.8'

services:
  maanak-db:
    image: postgres:16-alpine
    container_name: maanak_postgres
    environment:
      POSTGRES_DB: maanak_db
      POSTGRES_USER: maanak_admin
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  maanak-api:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    container_name: maanak_api
    environment:
      DATABASE_URL: postgresql://maanak_admin:SecretPass@maanak-db:5432/maanak_db?schema=public
      RULE_PACK_DIR: /app/rule_packs
      PORT: 8000
    depends_on:
      - maanak-db
    ports:
      - "8000:8000"

  maanak-web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    container_name: maanak_web
    ports:
      - "3000:3000"

volumes:
  pgdata:
```

---

## 14. External Integrations & Data Sources

| Integration Gateway | Target System | Protocol & Format | Data Payload Scope | Status |
| :--- | :--- | :--- | :--- | :--- |
| **eMaap Gateway** | National Legal Metrology Portal (eMaap) | RESTful API / JSON | Model approval certificate metadata, Section 22 approval ID, final PDF hash under Rule 11(4). | **PRODUCTION SPECIFIED** |
| **NABL Calibration Gateway** | NABL Accredited Cal Lab Portal | RESTful API / JSON | Real-time verification of standard weight calibration certificate numbers and expanded uncertainty values. | **TBD / FUTURE SCOPE** |

---

## 15. MVP Scope vs Future Production Roadmap

| Architectural Capability | SIH Hackathon MVP Scope (MUST BUILD) | Future Enterprise Release |
| :--- | :--- | :--- |
| **Standards-as-Code Engine** | Local JSON rule pack parsing (`oiml-r76-2006-v1.json`). | Dynamic web UI for Metrology Admins to upload and diff new rule packs. |
| **Bench Client** | Responsive offline PWA for bench tablets. | Native Android/iOS mobile application with offline SQLite sync. |
| **Nameplate Intake** | Manual parameter entry with basic validation. | Real-time OCR camera scanning of metal instrument nameplates. |
| **Digital Signatures** | Software-based X.509 PKI certificate signing. | Hardware USB DSC token signing via PKCS#11 driver integration. |

---

## 16. Assumptions, Constraints & TBD Items (Verification Matrix)

| Item Code | Category | Description / Constraint | Operational Status |
| :--- | :--- | :--- | :--- |
| **TBD-01** | Government API | Direct REST API schemas for the eMaap national portal. | **TBD / UNVERIFIED**: Currently modeled as a RESTful JSON export. |
| **TBD-02** | Hardware Interface | RS232 / USB direct streaming from bench scale indicators. | **TBD / UNVERIFIED**: Manual observation entry enforced for MVP. |
| **TBD-03** | DSC Hardware Driver | PKCS#11 USB token hardware driver compatibility across OS platforms. | **TBD / UNVERIFIED**: Software X.509 PKI certificates used for MVP. |

---
