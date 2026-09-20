# Product Requirements Document (PRD): MAANAK

**Platform for Generation of Test Reports & Compliance Verification for Non-Automatic Weighing Instruments (NAWI) per OIML R-76**  
**Problem Statement:** SIH26035 | **System Name:** MAANAK (मानक)  
**Document Version:** 1.0.0 | **Status:** Implementation-Ready Specification

---

## 1. Executive Overview & Problem Context

### 1.1 Problem Context

Under **Section 22 of the Legal Metrology Act, 2009** and the **Legal Metrology (Approval of Models) Rules, 2011** (amended G.S.R. 823(E) 2019), every non-automatic weighing instrument (NAWI) model intended for commercial transaction, healthcare, or industrial protection in India must obtain official Model Approval prior to manufacture, import, or distribution.

Model approval pattern evaluation testing is conducted by designated laboratories, primarily **Regional Reference Standard Laboratories (RRSLs)**, following international metrological procedures laid down in **OIML Recommendation R 76** (_Part 1: Metrological and Technical Requirements_; _Part 2: Pattern Evaluation Report Format_).

### 1.2 Current Operational Baseline

The existing pattern evaluation workflow across testing facilities relies on:

1. **Paper Bench Clipboards**: Raw indications ($I$), applied loads ($L$), and Vernier changeover weights ($\Delta L$) are hand-written on paper sheets during bench execution.
2. **Unprotected Desktop Spreadsheets**: Data is manually re-typed into local Microsoft Excel templates or typed into static Microsoft Word documents.
3. **Manual Peer Review**: Senior officers manually audit multi-page spreadsheets cell-by-cell to detect typographical errors or broken cell formulas.

### 1.3 Demonstrated Systemic Pain Points

- **High Manual Transcription Overhead**: Re-typing technical parameters ($Max, Min, e, d$) across paper logs, calculation sheets, and final summary certificates creates severe delays.
- **Formula Corruption in Complex Scales**: Unprotected Excel formulas frequently break or fail during multi-interval scale edge cases ($e_1, e_2, e_3$), where scale division thresholds shift dynamically.
- **Lack of Metrological Pre-Validation**: Testing often proceeds using standard weights whose expanded uncertainty ($U$) exceeds the mandatory threshold ($U \le \frac{1}{3} \times \text{MPE}$ under NABL 129 / OIML R 76-1 Cl 3.7.1), invalidating multi-day testing sessions retrospectively.
- **Zero Cryptographic Auditability**: Spreadsheets lack cell locks, audit logs, or tamper-evident history, failing **WELMEC Guide 7.2 Extension L** legal non-repudiation standards.
- **Rigid Code Coupling**: Traditional software hardcodes R-76 equations into application source code, preventing seamless adaptation when OIML recommendations are revised.

---

## 2. Product Objectives & Measurable Outcomes

### 2.1 Product Vision: MAANAK

MAANAK is an offline-first, metrologically defensible software platform that decouples regulatory rules from application source code via a **Standards-as-Code** engine, automates NABL 129 weight uncertainty pre-checks, enforces WELMEC 7.2 SHA-256 cryptographic provenance, and generates standardized, digitally signed OIML R 76-2 test reports.

### 2.2 Measurable Target Outcomes

- **Zero Calculation Errors**: 100% elimination of formula corruption and multi-interval scale calculation errors.
- **80% Reduction in Report Turnaround Time**: Automated mapping of raw bench observations directly to pixel-perfect OIML R 76-2 PDF and Word reports.
- **100% Metrological Compliance**: Live algorithmic blocking if standard weight uncertainty violates $U \le \frac{1}{3}\text{MPE}$.
- **Immutable Legal Non-Repudiation**: Full WELMEC 7.2 SHA-256 hash chaining for court-admissible audit trails.

---

## 3. Target User Roles & Permissions (RBAC Matrix)

MAANAK enforces strict separation of duties across four primary user personas:

| Role Name               | System Persona                    | Primary Responsibilities                                                                     | System Permissions                                                                                                             |
| :---------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Testing Officer**     | Lab Inspector / Bench Tech        | Executes bench tests, logs environmental data, enters raw load observations ($I, \Delta L$). | Create session, input observations, run live calculation checks, upload instrument photos. Cannot approve or alter rule packs. |
| **Senior Reviewer**     | Senior Metrologist / Peer Auditor | Conducts second-level review, verifies anomaly flags, audits derivation step trees.          | View session, execute automated reviewer anomaly checks, flag discrepancies, return to officer for correction.                 |
| **Laboratory Director** | RRSL Director / Signing Authority | Grants final legal approval under Section 22, applies X.509 PKI digital signature.           | Final session sign-off, trigger X.509 PKI/DSC signing, lock session immutably, publish report.                                 |
| **Metrology Admin**     | Regulatory System Admin           | Manages standard weight inventory, maintains OIML R-76 JSON rule packs.                      | Upload/activate versioned JSON rule packs, manage user credentials, manage reference weight certs.                             |

---

## 4. OIML R-76 Technical & Calculation Engine Requirements

### 4.1 Core Metrological Formulas

The MAANAK engine executes deterministic metrological calculations strictly adhering to OIML R 76-1 (Annex A) and R 76-2:

1. **Digital Changeover / Pre-Rounding Indication ($P$)**:
   $$P = I + 0.5e - \Delta L$$
   _Where $I$ is displayed indication, $e$ is verification scale interval, $\Delta L$ is small changeover weight added in steps of $0.1e$._

2. **Uncorrected Error ($E$)**:
   $$E = P - L$$
   _Where $L$ is total applied standard load._

3. **Corrected Intrinsic Error ($E_c$)**:
   $$E_c = E - E_0$$
   _Where $E_0$ is calculated error at zero or near-zero load ($L_0 \approx 10e$)._

### 4.2 Initial Verification Maximum Permissible Error (MPE) Brackets (Table 6)

For Accuracy Class I, II, III, and IIII scales, MPE limits are calculated based on load $m$ expressed in scale intervals ($m = L/e$):

| Load Range in Scale Intervals ($m = L/e$) | Class I                    | Class II                 | Class III            | Class IIII | Initial Verification MPE |
| :---------------------------------------- | :------------------------- | :----------------------- | :------------------- | :--------- | :----------------------- |
| $0 \le m \le 50\,000$                     | $0 \le m \le 5\,000$       | $0 \le m \le 500$        | $0 \le m \le 50$     | $\pm 0.5e$ |
| $50\,000 < m \le 200\,000$                | $5\,000 < m \le 20\,000$   | $500 < m \le 2\,000$     | $50 < m \le 200$     | $\pm 1.0e$ |
| $m > 200\,000$                            | $20\,000 < m \le 100\,000$ | $2\,000 < m \le 10\,000$ | $200 < m \le 1\,000$ | $\pm 1.5e$ |

### 4.3 Multi-Interval & Multi-Range Scale Logic (Clause 3.3)

For multi-interval scales with partial weighing ranges ($W_1, W_2, W_3$) having scale intervals $e_1 < e_2 < e_3$:

1. Partial ranges switch automatically based on applied load $L$.
2. Vernier changeover weights $\Delta L$ must be added in steps of $0.1 e_i$ corresponding to active partial range $i$.
3. In formula $P = I + 0.5e_i - \Delta L$, term $0.5e$ dynamically adopts scale division $e_i$ of active range.
4. MPE step boundaries shift dynamically based on $e_i$.
5. On decreasing loads, scale remains in higher partial range $e_i$ until zero is reached.

---

## 5. Functional Module Specifications

```
+---------------------------------------------------------------------------------------------------+
|                                     MAANAK MODULE ARCHITECTURE                                    |
+---------------------------------------------------------------------------------------------------+
| [MOD-01: Instrument Intake] -> [MOD-02: Weight Mgmt] -> [MOD-03: Bench Execution]                  |
|                                                                    |                              |
| [MOD-06: Report & Signing]  <- [MOD-05: Reviewer Audit] <- [MOD-04: Standards-as-Code Engine]     |
+---------------------------------------------------------------------------------------------------+
```

### MOD-01: Instrument Intake & Specification Registration

- **Description**: Captures manufacturer details, model designation, serial numbers, accuracy class (I–IIII), $Max, Min, e, d$, multi-interval parameters, and warm-up requirements.
- **Key Features**: Manual entry forms, live scale parameter sanity checks ($n = Max/e$, $Min \ge 20e$ for Class III), and OCR camera capture of metal instrument nameplates.

### MOD-02: Reference Standard Weight Management (NABL 129 Check)

- **Description**: Maintains digital inventory of laboratory standard weights (Class E2, F1, M1) with NABL calibration certificate numbers, expanded uncertainty values ($U$), and expiration dates.
- **Validation Rule**: Pre-test algorithmic check verifying that standard weight uncertainty satisfies:
  $$U \le \frac{1}{3} \times \text{MPE}(L)$$
  _Blocks test execution if test weight uncertainty violates this boundary._

### MOD-03: Offline Benchtop Test Execution (PWA)

- **Description**: Offline-first Progressive Web App interface for bench tablet data entry.
- **Supported Test Forms (OIML R 76-2)**:
  1. **Weighing Performance (A.4.4 / Form 1)**: Step-up and step-down load runs.
  2. **Temperature Effect No-Load (A.5.3.2 / Form 2)**: Zero drift rate evaluation over climate chamber range ($-10^\circ\text{C}$ to $+40^\circ\text{C}$, max $5^\circ\text{C/h}$ drift).
  3. **Eccentricity / Corner Load (A.4.7 / Form 3)**: Off-center loads ($L = \frac{1}{3}Max$) across 5 receptor positions.
  4. **Discrimination (A.4.8 / Form 4)**: Reaction to $1.4d$ load additions at $Min, \frac{1}{2}Max, Max$.
  5. **Repeatability (A.4.10 / Form 5)**: Range evaluation across 3–10 repeated weighings.
  6. **Creep & Zero Return (A.4.11 / Form 6)**: 30-minute drift under $Max$ load and 30.5-minute zero recovery.
  7. **Tare Weighing Accuracy (A.4.6 / Form 9)**: Net load weighing tolerance checks.

### MOD-04: Standards-as-Code Engine & Rule Pack Registry

- **Description**: Decouples metrological calculation logic from software application code.
- **Mechanism**: Stores R-76 mathematical equations, Table 3 scale limits, and Table 6 MPE step brackets in versioned JSON rule packs (`oiml-r76-2006-v1.json`). Parsed dynamically at runtime.

### MOD-05: Automated Second-Level Reviewer Engine

- **Description**: Automated anomaly detection scanning submitted test sessions prior to senior review.
- **Checks**: Flags physical impossibilities (e.g., negative mass, $\Delta L > e$), temperature drift rate breaches ($> 5\text{ K/h}$), incomplete test sequences, or MPE boundary breaches.

### MOD-06: Report Generation & Cryptographic Provenance

- **Description**: Compiles pixel-perfect OIML R 76-2 test reports (Forms 1–17) in standardized PDF and editable Word (.docx) formats.
- **WELMEC 7.2 Hash Graph**: Calculates SHA-256 hash chain:
  $$\text{Hash}_{\text{Session}} = \text{SHA256}(\text{Metadata} + \text{Observations} + \text{EnvLogs} + \text{WeightCerts})$$
  $$\text{Hash}_{\text{Final}} = \text{SHA256}(\text{Hash}_{\text{Session}} + \text{RulePackVersion} + \text{PDFBinary} + \text{DSCSignature})$$
- **Digital Signatures**: X.509 PKI / USB DSC token digital signature embedding into exported PDFs.

---

## 6. Master Feature Classification Matrix

| Feature / Capability                         | Classification                  | Grounding Source & Justification                                                      |
| :------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------ |
| **Instrument Technical Specs Intake**        | **MANDATORY FROM PS**           | Explicitly required by SIH26035 description; R 76-2 General Info p. 6–7.              |
| **OIML R 76 Test Entry Forms (1–14)**        | **REQUIRED BY R76**             | OIML R 76-2 Pattern Evaluation Report Format.                                         |
| **Deterministic $P, E, E_c$ Math Engine**    | **REQUIRED BY R76**             | OIML R 76-1 Clause 3.5.1, Annex A.4.4.3. Zero AI decision-making.                     |
| **Table 6 MPE Step-Bracket Check**           | **REQUIRED BY R76**             | OIML R 76-1 Clause 3.5.1 & Table 6.                                                   |
| **Decoupled JSON Standards-as-Code Engine**  | **INNOVATION**                  | Fulfills SIH26035 mandate for supporting future OIML revisions without code rewrites. |
| **WELMEC 7.2 SHA-256 Hash Graph**            | **INNOVATION**                  | Fulfills WELMEC Guide 7.2 Extension L legal non-repudiation mandates.                 |
| **NABL 129 Weight Uncertainty Pre-Check**    | **INNOVATION**                  | NABL 129 / OIML R 76-1 Cl 3.7.1 ($U \le \frac{1}{3}\text{MPE}$ rule).                 |
| **Offline PWA / SQLite Sync Engine**         | **SUPPORTED BY INSPECTOR NEED** | Essential for benchtop connectivity constraints in laboratories.                      |
| **OCR Metal Nameplate Scanning**             | **SUPPORTED BY INSPECTOR NEED** | Eliminates manual re-typing errors on benchtop.                                       |
| **Automated Reviewer Anomaly Check**         | **SUPPORTED BY INSPECTOR NEED** | Reduces senior officer manual audit time by 80%.                                      |
| **X.509 PKI / DSC Digital Signature Export** | **SUPPORTED BY INSPECTOR NEED** | Legal Metrology Act 2009 Sec 22 & Model Approval Rules 2011 Sec 11.                   |
| **Government eMaap Portal API Gateway**      | **SUPPORTED BY INSPECTOR NEED** | Gazette Notification G.S.R. 823(E) 2019 Rule 11(4) web publishing.                    |
| **Multi-Tenant RRSL Dashboard**              | **MANDATORY FROM PS**           | Explicitly required by SIH26035 problem statement.                                    |
| **Searchable Test Report Repository**        | **MANDATORY FROM PS**           | Explicitly required by SIH26035 problem statement.                                    |
| **Direct Balance RS232/Bluetooth Intake**    | **OPTIONAL**                    | Future hardware integration enhancement.                                              |

---

## 7. Non-Functional Requirements (NFRs)

### 7.1 Performance & Responsiveness

- Calculation execution time for complete test suite: $< 50\text{ ms}$.
- PDF report generation time for 30-page R 76-2 document: $< 2.5\text{ seconds}$.
- Offline SQLite to PostgreSQL sync duration upon reconnection: $< 3\text{ seconds}$ for 10 test sessions.

### 7.2 Security & Data Protection

- **Encryption at Rest**: AES-256 encryption for PostgreSQL database and local SQLite replicas.
- **Encryption in Transit**: TLS 1.3 for all client-server API communications.
- **Confidentiality**: Strict multi-tenant RBAC isolating proprietary manufacturer PCB schematics and circuit diagrams filed under Section 22.

### 7.3 Reliability & Offline Resilience

- Service Worker caching enabling 100% full offline bench execution without network connection.
- Zero data loss during sudden tablet power loss or network disconnection.

---

## 8. MVP Scope vs. Future Roadmap

```
+---------------------------------------------------------------------------------------------------+
|                                      MAANAK DEVELOPMENT SCOPE                                     |
+---------------------------------------------------------------------------------------------------+
| [SIH HACKATHON MVP SCOPE]                                                                         |
| • Full OIML R-76 calculation engine (P, E, Ec, Table 6 MPE brackets)                              |
| • Decoupled JSON Standards-as-Code engine with oiml-r76-2006-v1.json                              |
| • NABL 129 standard weight uncertainty pre-check engine (U <= 1/3 MPE)                            |
| • PWA offline bench entry forms (Forms 1–6) with SQLite sync                                      |
| • Automated Node.js PDF/Word generator producing pixel-perfect OIML R 76-2 reports            |
| • WELMEC 7.2 SHA-256 cryptographic hash graph logger                                              |
| • Multi-tenant RRSL laboratory dashboard with role-based access control                           |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| [FUTURE ENTERPRISE RELEASE]                                                                       |
| • Live OCR mobile camera scanning for instrument metal nameplates                                 |
| • Direct USB DSC hardware token PKI signing integration                                           |
| • Live REST API integration with Government eMaap portal                                          |
| • Bluetooth / RS232 direct streaming balance intake interface                                     |
+---------------------------------------------------------------------------------------------------+
```

---

## 9. Developer Guidelines & Architectural Constraints

> [!IMPORTANT]
> **Strict Documentation Adherence & Modern Node.js Ecosystem Mandate:**
>
> 1. **Follow Documentation Strictly**: All implementations, data models, APIs, and business rules must strictly follow the specifications in the `/docs` directory without deviation.
> 2. **Node.js Stack**: The entire backend ecosystem is built on **Node.js (LTS v20+ / v22+) with TypeScript**. Python/FastAPI is strictly superseded.
> 3. **Latest Stable Packages**: Always install and use the latest stable version of all packages and dependencies (e.g. Next.js 16 LTS v16.3.5, React 19, Tailwind CSS v4, Prisma ORM, Express/Fastify, `decimal.js`, `docx`, `pdf-lib`/PDFKit, `zod`, `lucide-react`).
> 4. **Mandatory Mobile Phone Responsiveness**: Every user interface, portal screen, evaluation table, and report preview **must be fully responsive for mobile phones (smartphones 360px–430px)** as well as tablets and desktops.
> 5. **Lucide React Icons**: All icons across the web dashboard and mobile bench PWA must exclusively use **`lucide-react`** (latest stable).
> 6. **Zero Floating Point Errors**: Use `decimal.js` for arbitrary precision fixed-point arithmetic across all metrological calculations ($P, E, E_0, E_c, \text{MPE}$).

---

## 10. Assumptions, Constraints & Open Questions

### 10.1 Assumptions

1. Testing officers possess basic tablet/smartphone operational literacy.
2. Standard weights utilized by RRSL laboratories have active NABL calibration certificates with known expanded uncertainty values ($U$).
3. Model approval pattern evaluation testing strictly mandates **Initial Verification MPEs** (Table 6) rather than in-service tolerances.

### 10.2 Constraints

1. **Zero AI Decision-Making**: Metrological Pass/Fail compliance decisions MUST be 100% deterministic, governed strictly by OIML R-76 mathematical rules.
2. **Air-Gapped Sandbox Operations**: Local edge deployment must run without requiring continuous active internet connection.

### 10.3 Open Questions Requiring Field Verification

1. **Digital Signature Hardware**: Are state verification officers currently issued standardized USB DSC hardware tokens, or is physical paper signing legally required in certain jurisdictions?
2. **eMaap API Readiness**: Does the national Legal Metrology portal (eMaap) currently expose active REST API endpoints for direct JSON report payload ingestion, or is submission restricted to manual PDF upload?
3. **RRSL Bench Connectivity**: Is local Wi-Fi available at testing benches across all 5 RRSL facilities (Faridabad, Bengaluru, Bhubaneswar, Ahmedabad, Guwahati), or is offline PWA operation 100% mandatory?

---

Target Specification Document Complete. System Name: MAANAK.
Target Problem: SIH26035. Target Standard: OIML R-76.
Target Authority: Legal Metrology Act, 2009.
Target Status: Published to Studio Panel as prd.md.
