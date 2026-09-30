<p align="center">
  <img src="logo.avif" alt="MAANAK Logo" width="160" style="border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);" />
</p>

<h1 align="center">MAANAK (मानक)</h1>

<p align="center">
  <strong>Metrological Automation & Analysis Network for Accuracy & Compliance</strong><br>
  <em>Enterprise Operating System for Automated Pattern Evaluation, Deterministic OIML R-76 Metrological Calculation & Standardized Test Certificate Generation</em>
</p>

<p align="center">
  <a href="https://consumeraffairs.gov.in"><img src="https://img.shields.io/badge/Problem%20Statement%20ID-26035-blue.svg?style=for-the-badge&logo=target" alt="PS ID 26035" /></a>
  <a href="https://consumeraffairs.gov.in"><img src="https://img.shields.io/badge/Ministry-Consumer%20Affairs%2C%20Food%20%26%20Public%20Distribution-orange.svg?style=for-the-badge" alt="Ministry" /></a>
  <a href="https://consumeraffairs.gov.in"><img src="https://img.shields.io/badge/Department-DoCA%20(Consumer%20Affairs)-green.svg?style=for-the-badge" alt="Department of Consumer Affairs" /></a>
  <a href="https://www.oiml.org"><img src="https://img.shields.io/badge/Standard-OIML%20R%2076--1%20%2F%20R%2076--2-purple.svg?style=for-the-badge" alt="OIML R-76" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-DoCA%20%26%20SIH%20Use%20%26%20Deploy%20%7C%20Competitors%20Prohibited-red.svg?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20%2B%20LTS-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16%20App%20Router-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16%2B%20Prisma-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/PWA-Offline%20WASM%20Engine-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="Offline PWA" />
  <img src="https://img.shields.io/badge/Security-WELMEC%207.2%20%2B%20X.509%20PKI-008080?style=flat-square" alt="WELMEC 7.2" />
</p>

---

## 🏛️ Statutory Problem Statement (SIH ID: 26035)

| Parameter | Statutory Specification |
| :--- | :--- |
| **Problem Statement ID** | **26035** |
| **Problem Statement Title** | **Development of a Software Program/Application for Generation of Test Reports for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R- 76** |
| **Nodal Ministry** | Ministry of Consumer Affairs, Food & Public Distribution |
| **Governing Department** | Department of Consumer Affairs (DoCA), Government of India |
| **Category & Theme** | Software \| Miscellaneous / Digital Governance & Standards |
| **Statutory Mandate** | The Legal Metrology Act, 2009 (Sec 22) & Legal Metrology (Approval of Models) Rules, 2011 (amended G.S.R. 823(E)) |
| **Reference Standard** | International Organization of Legal Metrology — **OIML R 76-1:2006 (E)** & **OIML R 76-2:2007 (E)** |

### The Systemic Metrological Challenge
Non-Automatic Weighing Instruments (NAWIs)—spanning ultra-micro balances ($Class\ I$), retail counter scales ($Class\ III$), platform scales, and heavy industrial weighbridges—are mandated under Indian Law to obtain statutory **Model Approval** prior to commercial manufacture, import, or distribution. 

Presently, pattern evaluation at designated national laboratories (e.g., RRSLs, NPL) is conducted through manual paper logbooks and unprotected office spreadsheets:
1. **IEEE 754 Floating-Point Truncation**: Standard spreadsheets suffer from binary rounding errors (`0.1 + 0.2 ≠ 0.3`) when calculating turning points ($P = I + 0.5e - \Delta L$) and corrected errors ($E_c = E - E_0$).
2. **Absence of NABL 129 Uncertainty Pre-Check**: Tests are frequently performed using standard weights whose expanded uncertainty violates $U \le \frac{1}{3}\text{MPE}(L)$, invalidating multi-day testing sessions retrospectively.
3. **Multi-Interval Partial Range Fragility**: Dynamic partial weighing range switching ($e_1, e_2, e_3$) breaks static formulas, leading to incorrect MPE tier assignments.
4. **Vulnerability to Post-Test Tampering**: Spreadsheets lack non-repudiation, immutable audit trails, and cryptographic chaining, falling short of **WELMEC Guide 7.2 (Software)** legal admissibility.
5. **Rigid Hardcoded Systems**: Legacy software hardcodes metrological limits into application logic, requiring complete code refactoring whenever OIML recommendations or Indian national standards are revised.

---

## 💡 Why MAANAK Is Unique (Beyond Generic Form Builders)

MAANAK was engineered specifically for statutory metrologists, RRSL testing officers, and the Department of Consumer Affairs. It is **not** a generic questionnaire or CRUD interface. It is a full-fledged **Metrological Operating System**:

```mermaid
flowchart TD
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef gateway fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e;
    classDef engine fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#6b21a8;
    classDef data fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#15803d;
    classDef report fill:#ffe4e6,stroke:#e11d48,stroke-width:2px,color:#be123c;

    subgraph CLIENT["1. Client & Field Execution Layer"]
        WEB["Desktop / Tablet Web Portal<br/>(Reviewer Audit & Director Sign-Off)"]:::client
        PWA["Offline Benchtop PWA<br/>(Shielded Labs & Weighbridges)"]:::client
    end

    subgraph GATEWAY["2. Secure API Gateway (apps/api)"]
        API["Node.js LTS REST API Engine<br/>• Multi-Tenant Lab Isolation (RRSLs)<br/>• 3-Tier RBAC (Inspector / Reviewer / Director)"]:::gateway
    end

    subgraph CORE["3. Metrology Core & Standards-as-Code"]
        RULES["Standards-as-Code Engine (@maanak/rules-engine)<br/>• Versioned OIML JSON Rule Packs<br/>• Table 3 Classification & Table 6 MPE Brackets"]:::engine
        CALC["100% Deterministic Math Engine (@maanak/rules-engine)<br/>• Fixed-Point decimal.js (Zero Black-Box AI)<br/>• Live NABL 129 Uncertainty Gatekeeper"]:::engine
    end

    subgraph PROVENANCE["4. Data & Legal Provenance Layer"]
        DB[("PostgreSQL 16 Central Store<br/>NUMERIC 16,8 Metrological Fields")]:::data
        CHAIN["WELMEC 7.2 Hash Graph & PKI (@maanak/crypto-provenance)<br/>• Immutable SHA-256 Observation Chaining<br/>• X.509 PKI Digital Signer & QR Verifier"]:::data
    end

    subgraph OUTPUT["5. Statutory Report Output"]
        DOCS["Report Generator Engine (@maanak/report-generator)<br/>• Pixel-Perfect OIML R 76-2 Official PDF<br/>• Fully Editable Microsoft Word .docx Archive"]:::report
    end

    WEB -->|"HTTPS / REST"| API
    PWA -->|"Sync / Conflict Queue"| API

    API -->|"Execute Rule Pack"| RULES
    RULES -->|"Compute P, E, Ec, MPE"| CALC

    CALC -->|"Persist Observations"| DB
    CALC -->|"Chained Audit Event"| CHAIN
    CHAIN -->|"Cryptographic Seal"| DB

    DB -->|"Export Certified Data"| DOCS
    CHAIN -->|"Embedded PKI Signature & QR"| DOCS
```

### 🌟 Key Differentiators:
1. **Standards-as-Code Decoupling**: All OIML R-76 mathematical formulas, Table 3 scale classification limits, and Table 6 Initial Verification MPE step brackets are decoupled into versioned JSON rule packs (`oiml-r76-2006-v1.json`). Regulatory amendments require **zero recompilation or downtime**.
2. **100% Deterministic Engine (Zero Black-Box AI in Compliance Math)**: To guarantee statutory defensibility in a court of law, all calculation pipelines ($P = I + 0.5e - \Delta L$, $E = P - L$, $E_c = E - E_0$) use fixed-point arbitrary precision (`decimal.js`). **Artificial Intelligence is strictly prohibited from altering metrological calculations.**
3. **Live NABL 129 Uncertainty Gatekeeper**: Live algorithmic verification enforces $U_{\text{expanded}} \le \frac{1}{3}\text{MPE}(L)$ on standard weights *before* test observations can be submitted, preventing costly multi-day session invalidations.
4. **WELMEC 7.2 Cryptographic Provenance Graph**: Every raw observation, environmental sensor log, and inspector modification is linked in an immutable SHA-256 hash graph. Any database alteration breaks the cryptographic seal immediately.
5. **Dual Report Compilation (PDF & Editable Word)**: Generates both official, pixel-perfect OIML R 76-2 PDF certificates (with embedded QR verification codes & vector error curves) and fully styled Microsoft Word (`.docx`) reports for formal administrative records.
6. **Statutory 3-Tier RBAC & Review Workflow**: 
   - **Testing Officer (Inspector)**: Bench recording, standard weight selection, photo upload.
   - **Senior Reviewer**: Algorithmic anomaly inspection, flag resolution, technical concurrence.
   - **Director / Controller**: Final legal sign-off with X.509 PKI digital certificate and statutory session lock.
7. **Offline-First PWA for Shielded Lab Enclosures**: Testing officers in RF-shielded environmental chambers or remote weighbridge pits can record observations offline using IndexedDB/SQLite WASM with automatic conflict resolution upon reconnection.

---

## 🔬 Core Metrological Mathematics (OIML R-76 Ground Truth)

MAANAK implements the complete statutory mathematics mandated by **OIML Recommendation R 76-1 (2006)**:

### 1. Digital Turning Point / Changeover Indication ($P$)
When an instrument indicates a value $I$, small changeover weights $\Delta L = 0.1e$ are added until the displayed value increases to $I + e$:
$$P = I + \frac{1}{2}e - \Delta L$$

### 2. Uncorrected Indication Error ($E$)
The uncorrected error of indication relative to the applied standard load $L$:
$$E = P - L = I + \frac{1}{2}e - \Delta L - L$$

### 3. Corrected Intrinsic Error ($E_c$)
The corrected error eliminates zero-point shift by deducting the error observed at near-zero load ($L_0 \approx 10e$):
$$E_c = E - E_0$$

### 4. Maximum Permissible Error (MPE) Limits (Table 6 — Initial Verification)

| Accuracy Class | Tier 1 ($\pm 0.5e$) | Tier 2 ($\pm 1.0e$) | Tier 3 ($\pm 1.5e$) |
| :--- | :--- | :--- | :--- |
| **Class I** ($\text{Special}$) | $0 \le m \le 50\,000$ | $50\,000 < m \le 200\,000$ | $m > 200\,000$ |
| **Class II** ($\text{High}$) | $0 \le m \le 5\,000$ | $5\,000 < m \le 20\,000$ | $20\,000 < m \le 100\,000$ |
| **Class III** ($\text{Medium}$) | $0 \le m \le 500$ | $500 < m \le 2\,000$ | $2\,000 < m \le 10\,000$ |
| **Class IIII** ($\text{Ordinary}$) | $0 \le m \le 50$ | $50 < m \le 200$ | $200 < m \le 1\,000$ |

*Compliance Criterion: $|E_c| \le \text{MPE}(L)$ across all test points.*

### 5. Mandatory NABL 129 Standard Weight Uncertainty Pre-Check
$$U_{\text{expanded}} \le \frac{1}{3} \times \text{MPE}(L) \quad \text{at 95\% confidence level } (k = 2)$$

---

## 📋 Comprehensive OIML R 76-2 Test Coverage Matrix

MAANAK automates the complete test suite prescribed by **OIML R 76-2 (2007)**:

| Form ID | Test Module Name | Automated Metrological Calculations & Statutory Checks |
| :--- | :--- | :--- |
| **Form 1** | **General Information & Admin** | Instrument metadata, manufacturer, capacity ($Max$), interval ($e$), multi-interval ranges ($W_1, W_2$), serial number, environmental limits, and sealing schema. |
| **Form 2** | **Weighing Performance** | Step-by-step loading/unloading (min 10 points), changeover $P$, uncorrected $E$, zero correction $E_c$, MPE tier determination, and compliance check. |
| **Form 3** | **Tare & Preset Tare** | Subtractive tare accuracy, tare weighing performance, tare balancing at multiple load levels, and residual error verification. |
| **Form 4** | **Eccentricity (Off-Center)** | Standard $1/3Max$ eccentric loading across 4 corners / 5 positions (prismatic vs. cylindrical platforms, rolling load simulation for weighbridges). |
| **Form 5** | **Repeatability (Reproducibility)**| Minimum 3 series of 10 observations at half-load and near-capacity; automated evaluation of maximum error spread: $(E_{\max} - E_{\min}) \le |\text{MPE}|$. |
| **Form 6** | **Time Dependence (Creep)** | 30-minute constant load test with automated error tracking at 0, 5, 15, and 30 minutes ($\Delta E \le 0.5e$) and zero return evaluation ($\le 0.5e$). |
| **Form 7** | **Tilt & Level Sensitivity** | Ground and marine tilt testing (limiting value of tilt $\ge 50/1000$); zero-shift and loaded tilt error calculation against MPE limits. |
| **Form 8** | **Warm-up Time & Span Drift** | Zero and span observation tracking immediately upon power-on and at 5, 15, and 30 minutes; verification that error remains within prescribed limits. |
| **Form 9** | **Temperature Influence** | Evaluation at reference temperature ($20^\circ\text{C}$), upper limit ($+40^\circ\text{C}$), lower limit ($-10^\circ\text{C}$), and return; **thermal drift rate validation ($\le 5.0\text{ K/h}$)**. |
| **Form 10** | **Voltage Variations** | Extreme supply voltage testing ($U_{\text{nom}} \times 1.10$, $U_{\text{nom}} \times 0.85$, and minimum DC battery voltage) for electronic indicators. |

---

## 💻 Monorepo Workspace Structure

MAANAK is structured as a modular, high-velocity **Turborepo** monorepo:

```
maanak-monorepo/
├── apps/
│   ├── api/                         # Node.js LTS (TypeScript) REST API Gateway & Business Layer
│   │   ├── src/
│   │   │   ├── auth/                # Argon2id + JWT + RBAC Security Middlewares
│   │   │   ├── routes/              # admin, instruments, sessions, observations, review, reports, audit
│   │   │   ├── middleware/          # Multi-tenant isolation & request validation
│   │   │   └── server.ts            # High-throughput Express API Server
│   │   └── package.json
│   └── web/                         # Next.js 16 (App Router) Executive Web Portal
│       ├── public/                  # Static assets & platform logo (logo.avif)
│       ├── src/
│       │   ├── app/                 # /dashboard, /instruments, /sessions, /reports, /review, /audit, /admin
│       │   ├── components/          # Metrological forms (Forms 1–10), Reviewer audit tools, Phosphor icons
│       │   └── hooks/               # Offline synchronization & state management hooks
│       └── package.json
├── packages/
│   ├── db/                          # Database Domain & Prisma ORM Layer
│   │   ├── prisma/schema.prisma     # Central PostgreSQL schema with NUMERIC(16,8) metrological precision
│   │   ├── src/client.ts            # Singleton Prisma client with connection pooling
│   │   └── src/repository.ts        # Type-safe repository abstraction for sessions & audit nodes
│   ├── rules-engine/                # 100% Deterministic OIML R-76 & NABL 129 Metrology Engine
│   │   ├── src/classifier.ts        # Table 3 Accuracy Class classification (Class I, II, III, IIII)
│   │   ├── src/mpe.ts               # Table 6 Initial Verification MPE step brackets calculation
│   │   ├── src/math.ts              # Arbitrary-precision decimal arithmetic (decimal.js)
│   │   ├── src/nabl129.ts           # NABL 129 U <= 1/3 MPE live gatekeeper
│   │   ├── src/anomalies.ts         # Automated reviewer anomaly detection rules
│   │   ├── src/planner.ts           # Automatic test point & standard load generator
│   │   └── src/rules/               # Versioned Standards-as-Code JSON rule packs (OIML R-76 2006)
│   ├── report-generator/            # Statutory OIML R 76-2 Report Generation Engine
│   │   ├── src/pdf.ts               # Pixel-perfect OIML R 76-2 PDF Certificate Compiler (@pdf-lib)
│   │   ├── src/docx.ts              # Fully editable Microsoft Word document generator (docx)
│   │   ├── src/charts.ts            # High-resolution vector error curves & MPE envelope visualization
│   │   └── src/storage.ts           # Cloudinary / S3 / Local encrypted report archival service
│   ├── crypto-provenance/           # WELMEC 7.2 Cryptographic Audit & X.509 PKI Signing
│   │   ├── src/hasher.ts            # Deterministic SHA-256 observation & session hash generator
│   │   ├── src/chain_validator.ts   # Merkle hash graph integrity & anti-tamper verifier
│   │   ├── src/signer.ts            # X.509 PKI Digital Signature generator & certificate validator
│   │   └── src/qr.ts                # Tamper-evident verification QR code builder
│   └── types/                       # Shared TypeScript metrological schemas & API contracts
├── LICENSE                          # Proprietary Limited Evaluation License (SIH & DoCA)
├── README.md                        # Master Technical & Metrological Documentation
├── turbo.json                       # Turborepo build pipeline orchestration
└── package.json                     # Monorepo workspaces definition (pnpm)
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- **Node.js**: v20.0.0+ LTS or v22.0.0+ LTS (`node -v`)
- **pnpm**: v9.0.0+ or v10.0.0+ (`pnpm -v`)
- **Docker & Docker Compose**: For local PostgreSQL 16 database

### 1. Clone the Repository
```bash
git clone https://github.com/deepaksoni47/Maanak-monorepo.git
cd Maanak-monorepo
```

### 2. Install Workspace Dependencies
```bash
# Install all dependencies across apps and packages
pnpm install
```

### 3. Configure Environment Variables
```bash
# Create local environment configuration from template
cp .env.example .env
```
*Configure `DATABASE_URL` (default: `postgresql://postgres:postgres@localhost:5432/maanak_db?schema=public`) and `JWT_SECRET`.*

### 4. Database Initialization & Seeding
```bash
# Generate Prisma Client
pnpm db:generate

# Run schema migrations to create all metrological tables
pnpm db:migrate

# Seed standard OIML R-76 rule packs, test instruments & role-based credentials
pnpm db:seed
```

### 5. Launch the Development Cluster
```bash
# Starts both Backend API (Port 8000) and Web Portal (Port 3000) concurrently via Turbo
pnpm dev
```
- **Web Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000/api/v1`
- **Health Check**: `http://localhost:8000/api/v1/health`

### Default Statutory Test Credentials:
| Role | Email / Identifier | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Testing Officer (Inspector)** | `inspector@rrsl.gov.in` | `Inspector@123` | Bench data entry, raw observations, photo attachments |
| **Technical Reviewer** | `reviewer@rrsl.gov.in` | `Reviewer@123` | Anomaly inspection, compliance audit, return for correction |
| **Director / Controller** | `director@rrsl.gov.in` | `Director@123` | Final approval, X.509 digital sign-off, certificate locking |
| **System Administrator** | `admin@doca.gov.in` | `Admin@123` | Rule packs, lab onboarding, personnel management |

---

## 🧪 Automated Testing & Verification Suite

MAANAK features automated test coverage across metrological calculation precision, NABL 129 gatekeepers, cryptographic hash chains, and report compilation:

```bash
# Run all workspace test suites
pnpm test

# Run deterministic metrology engine tests (decimal.js & Table 6 brackets)
pnpm --filter @maanak/rules-engine test

# Run cryptographic provenance & hash chain tamper-detection tests
pnpm --filter @maanak/crypto-provenance test

# Run PDF & Word document generation verification tests
pnpm --filter @maanak/report-generator test

# Run API gateway integration and RBAC security tests
pnpm --filter @maanak/api test
```

---

## ⚖️ Proprietary Evaluation License & Legal Notice

This software is developed for the **Smart India Hackathon (SIH)** in response to **Problem Statement ID 26035** issued by the **Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution, Government of India**.

> [!IMPORTANT]
> **PROPRIETARY LIMITED USE & NON-COMPETE EVALUATION LICENSE**
>
> 1. **Permitted Beneficiaries (Full Rights to Copy, Use & Deploy)**: Full permission is granted to **Smart India Hackathon Evaluators, Jury Members, Technical Judges**, authorized representatives and divisions of the **Ministry of Consumer Affairs, Food & Public Distribution (DoCA)**, and designated statutory testing laboratories (RRSLs / NPL) to **review, evaluate, copy, run, test, use, adapt, and deploy** this software application.
> 2. **Strict Competitor & Plagiarism Prohibition**: Competing hackathon participants, competing teams, and external commercial entities are **strictly prohibited** from copying, borrowing, cloning, modifying, or adopting any portion of this code, mathematical algorithms, schemas, or documentation.
> 3. **Intellectual Property Protection**: All rights not expressly granted to the authorized beneficiaries remain reserved by the authors.
>
> *Refer to the complete legal terms in the [LICENSE](file:///LICENSE) file.*

---

## 📞 Primary Author & Lead Contact

For technical queries, statutory evaluation demonstrations, or licensing inquiries regarding MAANAK:

<p>
  <strong>Deepak Soni</strong><br>
  Lead Architect & Developer — Project MAANAK<br>
  📧 <strong>Email</strong>: <a href="mailto:deepaksoni23022004@gmail.com">deepaksoni23022004@gmail.com</a><br>
  🏛️ <strong>Submission for</strong>: Smart India Hackathon | Problem Statement ID 26035<br>
  🏢 <strong>Organization</strong>: Ministry of Consumer Affairs, Food & Public Distribution (DoCA)
</p>
