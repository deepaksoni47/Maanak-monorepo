# MAANAK (मानक) — Metrological Automation & Analysis Network for Accuracy & Compliance

> **Software Application for Generation of Standardized Test Reports & Pattern Evaluation Compliance Verification for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76**

[![Problem Statement](https://img.shields.io/badge/Problem%20Statement%20ID-26035-blue.svg)](https://consumeraffairs.gov.in)
[![Ministry](https://img.shields.io/badge/Ministry-Consumer%20Affairs%2C%20Food%20%26%20Public%20Distribution-orange.svg)](https://consumeraffairs.gov.in)
[![Department](<https://img.shields.io/badge/Department-Department%20of%20Consumer%20Affairs%20(DoCA)-green.svg>)](https://consumeraffairs.gov.in)
[![Standard](https://img.shields.io/badge/Standard-OIML%20R%2076--1%20%2F%20R%2076--2-purple.svg)](https://www.oiml.org)
[![Legal Framework](https://img.shields.io/badge/Act-Legal%20Metrology%20Act%202009%20Sec%2022-red.svg)](https://consumeraffairs.gov.in)
[![Stack](https://img.shields.io/badge/Stack-Node.js%20%7C%20TypeScript%20%7C%20Next.js%20%7C%20Prisma%20%7C%20PostgreSQL-blueviolet.svg)](#technology-stack)

---

## 📌 Executive Problem Statement (PS ID: 26035)

- **Problem Statement Title**: Development of a Software Program/Application for Generation of Test Reports for Non-Automatic Weighing Instruments (NAWI) as per OIML Recommendation R-76
- **Organization**: Ministry of Consumer Affairs, Food & Public Distribution
- **Department**: Department of Consumer Affairs (DoCA)
- **Category**: Software | **Theme**: Miscellaneous
- **Statutory Authority**: Section 22 of the Legal Metrology Act, 2009 & Legal Metrology (Approval of Models) Rules, 2011 (amended G.S.R. 823(E) 2019).

### Background & Systemic Challenge

Non-Automatic Weighing Instruments (NAWIs)—such as precision laboratory balances, electronic retail counter scales, platform scales, and heavy industrial weighbridges—are mandated under Indian Law to obtain statutory **Model Approval** prior to commercial manufacture, import, or distribution.

Currently, pattern evaluation test reports at Regional Reference Standard Laboratories (RRSLs) are largely prepared manually using paper clipboards, unprotected spreadsheets, or static document templates. This manual workflow suffers from critical vulnerabilities:

1. **Formula Corruption & Multi-Interval Calculation Errors**: Unprotected spreadsheet formulas break during dynamic multi-interval partial range switching ($e_1, e_2, e_3$).
2. **Lack of Metrological Pre-Validation**: Testing frequently proceeds using standard weights whose expanded uncertainty violates the mandatory NABL 129 / OIML R 76-1 constraint ($U \le \frac{1}{3}\text{MPE}$), invalidating multi-day testing sessions retrospectively.
3. **Absence of Legal Non-Repudiation**: Spreadsheets lack cryptographic audit trails, failing **WELMEC Guide 7.2 Extension L** legal standards.
4. **Rigid Code Coupling**: Conventional software hardcodes equations into application source code, preventing seamless adaptation when OIML recommendations are revised.

---

## 🏛️ MAANAK Architectural Core Principles

MAANAK solves PS 26035 through five non-negotiable architectural pillars:

```
+---------------------------------------------------------------------------------------------------+
|                                      MAANAK SYSTEM TOPOLOGY                                       |
+---------------------------------------------------------------------------------------------------+
|  [CLIENT LAYER]                                                                                   |
|  • Next.js 16+ Web Portal (Executive Lab Dashboard, Reviewer Audit, Director PKI Sign)            |
|  • Responsive Touch Web & Offline PWA (Smartphones 360-430px, Tablets, Phosphor Icons, SQLite WASM)   |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                    HTTPS / TLS 1.3 / REST API / Zod
                                                  v
+---------------------------------------------------------------------------------------------------+
|  [NODE.JS (TYPESCRIPT) API GATEWAY & BUSINESS LAYER]                                              |
|  • High-Throughput Node.js LTS (v20+ / v22+) REST API Engine (Express / Fastify)                  |
|  • Argon2id Password Hashing + JWT Authentication + Role-Based Access Control (RBAC)               |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+-----------------------------------+-----------------------------------+---------------------------+
| [STANDARDS-AS-CODE ENGINE]        | [METROLOGICAL VALIDATION ENGINE]  | [REPORT GENERATION ENGINE]|
| • Versioned JSON Rule Pack Loader | • NABL 129 U <= 1/3 MPE Gatekeeper| • @pdf-lib / pdfkit Engine|
| • OIML R 76-1 Table 3/6 Engine    | • Thermal Drift Rate (<= 5 K/h)   | • docx Word Compiler      |
| • Multi-Interval e1/e2 Switching  | • 100% Deterministic (decimal.js) | • Vector Error Curves     |
+-----------------------------------+-----------------------------------+---------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|  [DATA, PROVENANCE & STORAGE LAYER]                                                               |
|  • PostgreSQL 16 Central DB with Prisma ORM (Master Data, Sessions, Observations, NUMERIC(16,8))  |
|  • SQLite 3.45 Edge Replica (Offline PWA Local Storage on Benchtop Tablets via IndexedDB)         |
|  • WELMEC 7.2 Cryptographic Hash Service (Node.js crypto SHA-256 Provenance Graph & State Locks)  |
|  • S3/Local Object Storage (Nameplate Photos, Sealing Schematics, Digitally Signed PDF Archive)   |
+---------------------------------------------------------------------------------------------------+
```

1. **Standards-as-Code Decoupling**: All R-76 mathematical formulas, Table 3 scale classification limits, and Table 6 Initial Verification MPE step brackets are decoupled from application source code into versioned JSON rule packs (`oiml-r76-2006-v1.json`). Revisions require zero code re-compilation or server downtime.
2. **100% Deterministic Metrological Core (Zero AI)**: All calculation pipelines ($P = I + 0.5e - \Delta L$, $E = P - L$, $E_c = E - E_0$) and compliance decisions are strictly deterministic using arbitrary-precision arithmetic (`decimal.js`). **Artificial Intelligence is strictly prohibited from making legal compliance decisions.**
3. **NABL 129 Standard Weight Uncertainty Pre-Check**: Live algorithmic gatekeeper verifying $U \le \frac{1}{3}\text{MPE}(L)$ prior to bench observation entry.
4. **WELMEC 7.2 Cryptographic Provenance Graph**: Immutable SHA-256 hash chaining across raw bench observations, environmental sensor logs, and weight calibration certificates, creating a tamper-evident audit trail for court admissibility.
5. **Offline-First Continuity**: Benchtop observation logging operates completely offline via SQLite edge replicas inside a Progressive Web App (PWA), synchronizing automatically upon network reconnection.
6. **Universal Multi-Device Responsiveness**: Every web portal screen, intake form, and observation sheet is 100% responsive across mobile phones (smartphones 360px–430px), tablets (768px–1024px), and workstation displays (1280px+).

---

## 🛠️ Technology Stack

| Architecture Layer                | Technology Selection                | Version / Specification                                           | Key Role & Justification                                                                                                                                                                              |
| :-------------------------------- | :---------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web Portal & Dashboard**        | Next.js / React / Phosphor Icons    | Next.js 16 (LTS v16.3.5) / React 19, Phosphor React (Latest Stable) | Server-Side Rendering (SSR) & Server Actions; responsive grid system for multi-tab R 76-2 forms; full mobile phone & desktop responsiveness; native TypeScript type safety; clean Phosphor iconography. |
| **Offline Bench & Field Client**  | PWA / Responsive Touch Web          | PWA Service Workers / Next.js 16                                  | Offline-first architecture allowing field & bench inspectors to record observations on smartphones and tablets without active Wi-Fi; touch-friendly numeric keypads for rapid bench entry.            |
| **Backend API Gateway**           | Node.js / Express / Fastify         | Node.js 20+ LTS / 22 LTS (TypeScript)                             | High-throughput asynchronous non-blocking event loop; native Zod data validation schemas; auto-generated OpenAPI (Swagger) specifications; full TypeScript end-to-end type safety.                    |
| **Calculation Engine**            | Pure TypeScript Engine              | Node.js (`decimal.js` Latest Stable)                              | Arbitrary precision decimal arithmetic avoiding IEEE 754 floating point rounding errors (`0.1 + 0.2 != 0.3`); zero AI dependencies; 100% deterministic test coverage.                                 |
| **Primary Database**              | PostgreSQL                          | PostgreSQL 16.2+                                                  | Enterprise ACID compliance; native `JSONB` support for indexing dynamic OIML R-76 JSON rule packs; robust row-level locking for multi-tenant laboratory isolation.                                    |
| **Offline Edge Storage**          | SQLite / IndexedDB                  | SQLite 3.45 (via WASM / IndexedDB)                                | Zero-configuration SQL database running locally inside PWA Service Worker context for seamless offline storage on benchtop tablets.                                                                   |
| **Database ORM / Migrations**     | Prisma ORM                          | Prisma (Latest Stable)                                            | Type-safe SQL query generation, connection pooling, automated schema migrations, and seamless `Decimal` type support for metrological records.                                                        |
| **Report Generation Engine**      | Node.js PDF Engine & `docx`         | `pdf-lib` / `pdfkit` & `docx` (Latest Stable)                     | Programmatic, pixel-perfect generation of official OIML R 76-2 PDF forms (Forms 1–17) and editable Word documents (`.docx`) with embedded vector curves.                                              |
| **Cryptographic Provenance**      | Node.js `crypto` / `@peculiar/x509` | OpenSSL 3.0 / PKCS#11                                             | SHA-256 hash graph generation, WELMEC 7.2 record locking, and X.509 PKI digital signature integration for USB DSC hardware tokens.                                                                    |
| **UI Iconography**                | Phosphor Icons                      | `@phosphor-icons/react` (Latest Stable)                           | Standardized, accessible, clean UI iconography across web dashboard and PWA bench.                                                                                                                    |
| **Containerization & Web Server** | Docker & Nginx                      | Docker 25.0+ / Nginx 1.25+                                        | Isolated microservice containerization, reverse proxying, SSL/TLS termination, and HTTP/2 performance optimization.                                                                                   |

---

## ⚡ Authoritative Developer Directives

> [!IMPORTANT]
> **Mandatory Guidelines for Developers & Agents:**
>
> 1. **Follow Documentation Strictly**: All implementations, data models, APIs, and business rules must strictly follow the specifications in the `/docs` directory without deviation.
> 2. **Node.js Stack**: The entire backend ecosystem is built on **Node.js (LTS v20+ / v22+) with TypeScript**. Python/FastAPI is strictly superseded.
> 3. **Latest Stable Packages**: Always install and use the latest stable version of all packages and dependencies (e.g. Next.js 16 LTS v16.3.5, React 19, Tailwind CSS v4, Prisma ORM, Express/Fastify, `decimal.js`, `docx`, `pdf-lib`, `zod`, `@phosphor-icons/react`).
> 4. **Mandatory Mobile Phone Responsiveness**: Every single UI design, screen, and component **must be fully responsive for mobile phones (smartphones 360px–430px)** as well as tablets and desktops. No horizontal clipping or overflow.
> 5. **Phosphor React Icons**: All icons across the web dashboard and mobile bench PWA must exclusively use **`@phosphor-icons/react`** (latest stable).
> 6. **Zero Floating Point Errors**: Use `decimal.js` for arbitrary precision fixed-point arithmetic across all metrological calculations ($P, E, E_0, E_c, \text{MPE}$).

---

## 📁 Repository Structure

```
maanak-monorepo/
├── README.md                        # Master Project Documentation & Architecture Overview
├── docker-compose.yml               # Multi-container Docker orchestration (DB, API, Web)
├── packages/
│   ├── types/                       # Shared TypeScript definitions & metrological schemas
│   ├── rules-engine/                # Deterministic OIML R-76 & NABL 129 calculation library
│   ├── report-generator/            # PDF (pdf-lib) & Word (docx) compiler for Forms 1–17
│   └── crypto-provenance/           # WELMEC 7.2 SHA-256 hash graph & X.509 PKI digital signer
├── apps/
│   ├── api/                         # Node.js LTS (TypeScript) REST API Gateway & Business Layer
│   ├── web/                         # Next.js 16 (LTS v16.3.5) App Router (Dashboard, Reviewer, Admin Console)
├── .env.example                     # Environment configuration template
├── docs/                            # Authoritative Technical & Metrological Specifications
│   ├── prd.md                       # Product Requirements Document (PRD)
│   ├── tech_spec.md                 # Complete Technical Architecture Specification
│   ├── app_flow.md                  # User, System & Metrological Step-by-Step Flow Specification
│   ├── maanak-db-schema-spec.md     # PostgreSQL DDL, NUMERIC(16,8) & Prisma Schema Specification
│   ├── maanak-design-system-spec.md # Tailwind CSS v4 Tweakcn Twitter UI Design System & Tokens
│   ├── maanak-implementation-plan.md# Master Atomic Task Implementation Plan (One Iteration Per Task)
│   ├── maanak-implementation-tracker.md # Actionable Task ID Dependency & State Tracker (READY/BLOCKED/VERIFIED)
│   └── maanak-r76-legal-metrology-rules-knowledge-base.md # Authoritative OIML R-76 & LM Act Rules
├── apps/
│   ├── web/                         # Next.js 16 (LTS v16.3.5) App Router (Dashboard, Reviewer, Admin Console)
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts        # Tailwind CSS v4 with Tweakcn Twitter Theme
│   │   └── src/
│   │       ├── app/                 # Routes: /dashboard, /instruments, /sessions, /reports, /audit
│   │       ├── components/          # shadcn/ui components + Phosphor React icons
│   │       ├── lib/                 # Web utilities, API clients, Auth providers
│   │       └── hooks/               # Custom React hooks
│   └── pwa/                         # Touch-Optimized Offline Bench Interface (Mobile/Tablet)
│       ├── package.json
│       └── src/
│           ├── app/                 # Touch bench screens (/bench/[sessionId])
│           ├── db/                  # SQLite / IndexedDB WASM offline database setup
│           └── sync/                # Background sync queue & conflict manager
├── services/
│   └── api-gateway/                 # Node.js (TypeScript) REST API Gateway & Backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   └── schema.prisma        # Prisma ORM Schema & PostgreSQL Migrations
│       └── src/
│           ├── index.ts             # Server Entrypoint (Express / Fastify)
│           ├── routes/              # Endpoints: auth, instruments, sessions, observations, reports
│           ├── core/                # Config, Security (Argon2id, JWT), Database client
│           ├── engine/              # METROLOGY CORE (TypeScript + decimal.js)
│           │   ├── rules_parser.ts  # Standards-as-Code JSON rule pack loader
│           │   ├── calculator.ts    # Fixed-point decimal.js math (P, E, E0, Ec)
│           │   ├── validator.ts     # NABL 129 U <= 1/3 MPE & Table 6 step-bracket checker
│           │   └── provenance.ts    # WELMEC 7.2 SHA-256 hash graph manager
│           ├── pdf/                 # Node.js PDF (@pdf-lib) & Word (docx) Report Generator
│           └── schemas/             # Zod data validation schemas
├── packages/
│   ├── rule-packs/                  # Versioned JSON Rule Packs
│   │   ├── oiml-r76-2006-v1.json    # Master OIML R-76 Rule Pack
│   │   └── schema/                  # JSON Schema validator for rule packs
│   └── shared-types/                # TypeScript shared interfaces & API types
└── tests/
    ├── unit/                        # Engine unit tests (decimal.js math, MPE step brackets)
    ├── integration/                 # API endpoint integration tests
    ├── domain_cases/                # Ground truth test cases from inspector field notes
    └── e2e/                         # Playwright end-to-end user flow tests
```

---

## 🔬 Core Metrological Formulas & Logic (OIML R-76)

1. **Digital Changeover / Pre-Rounding Indication ($P$)**:
   $$P = I + 0.5e - \Delta L$$
   _Where $I$ is displayed indication, $e$ is verification scale interval, $\Delta L$ is small changeover weight added in steps of $0.1e$._

2. **Uncorrected Error ($E$)**:
   $$E = P - L$$
   _Where $L$ is total applied standard load._

3. **Corrected Intrinsic Error ($E_c$)**:
   $$E_c = E - E_0$$
   _Where $E_0$ is calculated error at zero or near-zero load ($L_0 \approx 10e$)._

4. **Table 6 Maximum Permissible Error (MPE) Limits (Initial Verification)**:
   - Class I: $0 \le m \le 50\,000 \implies \pm 0.5e$; $50\,000 < m \le 200\,000 \implies \pm 1.0e$; $m > 200\,000 \implies \pm 1.5e$
   - Class II: $0 \le m \le 5\,000 \implies \pm 0.5e$; $5\,000 < m \le 20\,000 \implies \pm 1.0e$; $20\,000 < m \le 100\,000 \implies \pm 1.5e$
   - Class III: $0 \le m \le 500 \implies \pm 0.5e$; $500 < m \le 2\,000 \implies \pm 1.0e$; $2\,000 < m \le 10\,000 \implies \pm 1.5e$
   - Class IIII: $0 \le m \le 50 \implies \pm 0.5e$; $50 < m \le 200 \implies \pm 1.0e$; $200 < m \le 1\,000 \implies \pm 1.5e$

5. **NABL 129 Standard Weight Uncertainty Pre-Check**:
   $$U_{\text{expanded}} \le \frac{1}{3} \times \text{MPE}(L)$$

---

## 🧪 Ground Truth Domain Test Scenarios

The system includes automated tests validating inspector field notes from Regional Reference Standard Laboratories:

- **TC-01: Class III Single-Interval Weighing Performance ($Max = 15\text{ kg}, e = 5\text{ g}$)**: Verified exact $E_c$ calculations at $L = 0, 2.5\text{ kg}, 10\text{ kg}, 15\text{ kg}$.
- **TC-02: NABL 129 Standard Weight Uncertainty Violation**: Hard gatekeeper blocking when $U = 0.0025\text{ g} > \frac{1}{3}\text{MPE} (0.00166\text{ g})$ for Class II scale.
- **TC-03: Multi-Interval Scale Dynamic Range Switching**: Dynamic transition between $W_1 = 3\text{ kg} (e_1 = 1\text{ g})$ and $W_2 = 6\text{ kg} (e_2 = 2\text{ g})$.
- **TC-04: Temperature Effect No-Load Drift Overrun**: Automated reviewer flag when thermal drift rate $> 5.0\,^\circ\text{C/h}$.
- **TC-05: WELMEC 7.2 Database Tampering Detection**: Cryptographic hash chain failure detection upon manual SQL row alteration.

---

## 🚀 Getting Started & Local Development

### Prerequisites

- **Node.js**: v20+ LTS or v22+ LTS (`node -v`)
- **npm** or **pnpm**: Latest stable (`npm -v`)
- **Docker & Docker Compose**: For local PostgreSQL 16 database

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/deepaksoni47/Maanak-monorepo.git
cd Maanak-monorepo

# Install all workspace dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment variables
cp .env.example .env
```

### 3. Launch Database & Run Prisma Migrations

```bash
# Start PostgreSQL container
docker compose up -d maanak-db

# Run Prisma schema migrations
cd services/api-gateway
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start Development Servers

```bash
# Start API Gateway (Port 8000)
cd services/api-gateway
npm run dev

# Start Web Dashboard (Port 3000) in another terminal
cd apps/web
npm run dev
```

### 5. Run Test Suite

```bash
# Run unit & calculation engine tests
npm run test:unit

# Run domain case verification
npm run test:domain
```

---

## 📖 Complete Documentation Index

All architectural specifications, database schemas, and metrological knowledge bases are located in the `/docs` directory:

1. [Product Requirements Document (PRD)](file:///docs/prd.md) — Problem context, RBAC matrix, module specifications, and NFRs.
2. [Technical Specification (TechSpec)](file:///docs/tech_spec.md) — High-level architecture, Node.js API gateway, decimal.js calculation engine, and security.
3. [Application Flow Specification](file:///docs/app_flow.md) — Step-by-step user, system, and exception flows with Mermaid sequence diagrams.
4. [Database Schema & Data Model Specification](file:///docs/maanak-db-schema-spec.md) — PostgreSQL DDL, NUMERIC(16,8) precision, Prisma models, and WELMEC 7.2 hash graph.
5. [Design System & UI/UX Specification](file:///docs/maanak-design-system-spec.md) — Tailwind CSS v4, Tweakcn Twitter OKLCH theme tokens, and Phosphor React icon standards.
6. [Master Implementation Plan](file:///docs/maanak-implementation-plan.md) — Single consolidated, atomic Task ID execution roadmap where every task is executable by an AI agent in one iteration.
7. [Implementation Tracker & State Graph](file:///docs/maanak-implementation-tracker.md) — Actionable Task ID dependency tracker with state tracking (READY, BLOCKED, IN_PROGRESS, VERIFIED) and unblock actions.
8. [OIML R-76 & Legal Metrology Knowledge Base](file:///docs/maanak-r76-legal-metrology-rules-knowledge-base.md) — Comprehensive regulatory domain truth for developers.

---

## ⚖️ Compliance & Legal Notice

MAANAK is developed under the statutory framework of **The Legal Metrology Act, 2009 (No. 1 of 2010)**, the **Legal Metrology (Approval of Models) Rules, 2011**, and **OIML Recommendation R 76** (_Part 1: 2006_, _Part 2: 2007_). All metrological calculations are deterministic and legally defensible.
