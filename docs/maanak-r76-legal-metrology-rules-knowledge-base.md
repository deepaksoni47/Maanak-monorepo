# MAANAK (मानक) — OIML R-76 & Legal Metrology Rules Knowledge Base

**Authoritative Metrological & Regulatory Domain Specification for Developers**  
**Project:** SIH26035 — Generation of Test Reports for Non-Automatic Weighing Instruments (NAWI) as per OIML R-76  
**Document Version:** 2.0.0 (Authoritative Baseline)  
**Classification:** Technical Domain Specification & Rules Engine Reference

---

> [!IMPORTANT]
> **Authoritative Developer Directives:**
>
> 1. **Strict Documentation Adherence**: All engineers, agents, and contributors must follow this document and the associated `/docs` specifications strictly.
> 2. **Node.js Ecosystem**: All backend and calculation services are implemented exclusively in **Node.js (LTS v20+ / v22+) using TypeScript**. Python/FastAPI is completely replaced.
> 3. **Latest Stable Packages**: Always install and use the latest stable releases of all workspace packages (e.g. Next.js 16 LTS v16.3.5, React 19, Tailwind CSS v4, Prisma ORM, Express/Fastify, `decimal.js`, `docx`, `pdf-lib`, `zod`, `lucide-react`).
> 4. **Mandatory Mobile Phone Responsiveness**: Every single UI design, screen, and component **must be fully responsive for mobile phones (smartphones 360px–430px)** as well as tablets and desktops.
> 5. **Lucide React Icons**: All UI iconography across desktop, tablet, and mobile PWA clients must use **`lucide-react`** (latest stable).
> 6. **Zero Floating Point Errors**: Decimal calculations ($P, E, E_0, E_c, \text{MPE}$) must strictly use `decimal.js` for arbitrary precision arithmetic.

---

## Executive Summary & Purpose

This document serves as the **single source of domain truth** for developers, metrological software engineers, and QA auditors building the **MAANAK (मानक)** software platform. It extracts, organizes, and formalizes every legal rule, metrological constraint, mathematical formula, accuracy threshold, environmental requirement, test procedure, data validation check, and reporting schema derived from the complete corpus of uploaded source materials:

1. **OIML Recommendation R 76-1 (2006)**: Metrological and technical requirements – Tests.
2. **OIML Recommendation R 76-2 (1993/2007)**: Pattern Evaluation Report Format (Forms 1–17).
3. **The Legal Metrology Act, 2009 (No. 1 of 2010)**: Sections 22, 24, 25–32, 52.
4. **Legal Metrology (Approval of Models) Rules, 2011** & **2019 Amendments (G.S.R. 823(E))**: Rules 5, 6, 7, 8, 9, 11(4), 16, 17, 18, 19.
5. **Legal Metrology (General) Rules, 2011 & Gazette Notifications** (G.S.R. 183(E), etc.).
6. **NABL 129**: Specific guidelines for calibration of standard weights ($U \le \frac{1}{3} \text{MPE}$).
7. **Inspector Material & Bench Field Notes**: Scanned bench clipboards, Vernier changeover weight notes, and operational laboratory workflows from Regional Reference Standard Laboratories (RRSLs).

---

## Table of Contents

1. [Source Documents & Regulatory Applicability](#1-source-documents--regulatory-applicability)
2. [Definitions and Metrological Terminology](#2-definitions-and-metrological-terminology)
3. [Indian Legal Metrology Statutory Requirements](#3-indian-legal-metrology-statutory-requirements)
4. [OIML R-76 Structure & Technical Architecture](#4-oiml-r-76-structure--technical-architecture)
5. [Instrument Classification Framework](#5-instrument-classification-framework)
6. [Accuracy Classes, Max/Min, e, d, n, and Scale Intervals](#6-accuracy-classes-maxmin-e-d-n-and-scale-intervals)
7. [Maximum Permissible Error (MPE) Rules & Formulas](#7-maximum-permissible-error-mpe-rules--formulas)
8. [Reference Standard & Test Weight Requirements](#8-reference-standard--test-weight-requirements)
9. [Complete Test-by-Test Technical Requirements](#9-complete-test-by-test-technical-requirements)
10. [Test Conditions and Execution Procedures](#10-test-conditions-and-execution-procedures)
11. [Bench Observation & Data-Entry Rules](#11-bench-observation--data-entry-rules)
12. [Calculations, Formulas, and Intermediate Values](#12-calculations-formulas-and-intermediate-values)
13. [PASS / FAIL Compliance Rules Engine](#13-pass--fail-compliance-rules-engine)
14. [Environmental, Thermal, and Electrical Conditions](#14-environmental-thermal-and-electrical-conditions)
15. [Special Cases, Module Testing, and Boundary Conditions](#15-special-cases-module-testing-and-boundary-conditions)
16. [Multi-Interval and Multiple-Range Instrument Logic](#16-multi-interval-and-multiple-range-instrument-logic)
17. [OIML R 76-2 Report Contents & Mandatory Schema](#17-oiml-r-76-2-report-contents--mandatory-schema)
18. [Evidence, Document, Photo, and OCR Requirements](#18-evidence-document-photo-and-ocr-requirements)
19. [Review, Approval, Digital Signatures, and Audit Requirements](#19-review-approval-digital-signatures-and-audit-requirements)
20. [Data Validation & Pre-Check Rules](#20-data-validation--pre-check-rules)
21. [Rules Requiring Deterministic Software Automation](#21-rules-requiring-deterministic-software-automation)
22. [Rules Requiring Human Inspector Judgement](#22-rules-requiring-human-inspector-judgement)
23. [Versioning & Regulatory Change-Management Requirements](#23-versioning--regulatory-change-management-requirements)
24. [Complete Developer Implementation Checklist](#24-complete-developer-implementation-checklist)
25. [Unresolved Rules & Ambiguities Requiring Verification](#25-unresolved-rules--ambiguities-requiring-verification)

---

## 1. Source Documents & Regulatory Applicability

| Document Identifier                                  | Title / Description                                                                          | Regulatory Jurisdiction                 | Primary Application Scope                                                                      |
| :--------------------------------------------------- | :------------------------------------------------------------------------------------------- | :-------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **OIML R 76-1 (2006)**                               | Non-automatic weighing instruments — Part 1: Metrological and technical requirements - Tests | International (OIML) / Adopted in India | Technical requirements, metrological limits, calculation formulas, test procedures.            |
| **OIML R 76-2 (1993/2007)**                          | Non-automatic weighing instruments — Part 2: Pattern Evaluation Report Format                | International (OIML) / Adopted in India | Forms 1–17 report layout blueprint, mandatory metadata, visual curve formatting.               |
| **Legal Metrology Act, 2009 (No. 1 of 2010)**        | Enacted by Parliament of India (14th January 2010)                                           | Statutory Act of India                  | Section 22 (Model Approval mandate), Section 24 (Verification), Sections 25–32 (Penalties).    |
| **Model Approval Rules, 2011 (G.S.R. 183(E))**       | Legal Metrology (Approval of Models) Rules, 2011                                             | Central Rules under LM Act Sec 52       | Rules 5, 6, 7, 8, 9, 11, 16, 17, 18, 19 (Model submission, laboratory testing, certs).         |
| **Model Approval Amendment (2019, G.S.R. 823(E))**   | Gazette Notification G.S.R. 823(E) dated 6th November 2019                                   | Amendment to 2011 Rules                 | Rule 11(4) website publication mandate; Rule 19 fee structure (₹10k mechanical, ₹25k digital). |
| **Legal Metrology General Rules, 2011 & Amendments** | Standards of Weights and Measures / Gazette Notifications                                    | Central Statutory Rules                 | Specifications for secondary standards, working standards, tolerances, sealing provisions.     |
| **NABL 129**                                         | Specific Criteria for Calibration of Weights                                                 | NABL / Regional Ref Labs                | Constraint $U_{ext} \le \frac{1}{3} \text{MPE}$ for reference standard test weights.           |
| **Inspector Bench Notes & Field Materials**          | Scanned clipboards, bench sheets, Vernier changeover weight notes                            | Operational RRSL Practice               | Ground truth laboratory workflow, Vernier weight method ($0.1e$ steps), bench sequence.        |

---

## 2. Definitions and Metrological Terminology

- **Non-Automatic Weighing Instrument (NAWI)**: An instrument that requires the intervention of an operator during the weighing process (e.g. to deposit or remove the load from the receptor or to obtain the result) [Source: OIML R 76-1 T.1.2].
- **Maximum Capacity ($Max$)**: The maximum weighing capacity of an instrument, not taking into account the additive tare capacity [Source: OIML R 76-1 T.3.1.1].
- **Minimum Capacity ($Min$)**: The value of the load below which the weighing results may be subject to excessive relative error [Source: OIML R 76-1 T.3.1.2].
- **Scale Interval ($d$)**: Value expressed in units of mass of the difference between two consecutive indicated values for digital indication, or two consecutive scale marks for analog indication [Source: OIML R 76-1 T.3.2.2].
- **Verification Scale Interval ($e$)**: Value expressed in units of mass, used for the classification and verification of an instrument [Source: OIML R 76-1 T.3.2.3].
- **Number of Verification Scale Intervals ($n$)**: Quotient of the maximum capacity and the verification scale interval: $n = Max / e$ [Source: OIML R 76-1 T.3.2.5].
- **Multi-Interval Instrument**: An instrument having one weighing range which is divided into partial weighing ranges each with different verification scale intervals $e_i$, with the partial weighing range determined automatically according to the load applied, both on increasing and decreasing loads [Source: OIML R 76-1 T.3.2.6].
- **Multiple Range Instrument**: An instrument having two or more weighing ranges with different maximum capacities and different scale intervals for the same load receptor, each range extending from zero to its maximum capacity [Source: OIML R 76-1 T.3.2.7].
- **Indication ($I$)**: The unrounded displayed reading on the weight display [Source: OIML R 76-1 T.5.5.1].
- **Pre-Rounding Indication ($P$)**: The indication of an instrument prior to digital rounding, calculated as $P = I + 0.5e - \Delta L$ [Source: OIML R 76-1 A.4.4.3].
- **Changeover Load ($\Delta L$)**: Additional small standard weights (in steps of $0.1e$) added to the load receptor to cause the digital indication to flip unambiguously by $+1e$ [Source: OIML R 76-1 A.4.4.3].
- **Uncorrected Intrinsic Error ($E$)**: The error of an instrument determined under reference conditions, calculated as $E = P - L = I + 0.5e - \Delta L - L$ [Source: OIML R 76-1 A.4.4.3].
- **Corrected Intrinsic Error ($E_c$)**: The intrinsic error minus the zero-load error: $E_c = E - E_0 \le \text{MPE}$ [Source: OIML R 76-1 A.4.4.3].
- **Maximum Permissible Error (MPE)**: The maximum positive or negative deviation allowed by regulation between the indication of an instrument and the corresponding true value determined by reference standards [Source: OIML R 76-1 T.5.5.4].

---

## 3. Indian Legal Metrology Statutory Requirements

### 3.1 Statutory Mandates under The Legal Metrology Act, 2009

1. **Section 22 (Approval of Model)**: Mandatory requirement that every person, before manufacturing or importing any weight or measure (including NAWIs), must seek model approval from the Director of Legal Metrology after pattern evaluation testing at a recognized laboratory [Source: Legal Metrology Act, 2009 Sec 22].
2. **Section 24 (Verification and Stamping)**: Every weighing instrument used in trade, commercial transactions, or industrial protection must be verified and stamped prior to deployment [Source: LM Act 2009 Sec 24].
3. **Sections 25–32 (Offences and Penalties)**:
   - **Section 25**: Penalty up to ₹25,000 for using non-standard weights/measures; second offence punishable by up to 6 months imprisonment plus fine.
   - **Section 32**: Penalty up to ₹20,000 for failure to obtain model approval prior to manufacture or import.

### 3.2 Legal Metrology (Approval of Models) Rules, 2011 & 2019 Amendments

1. **Rule 6 (Submission for Testing)**: The applicant deposits testing fees and submits the instrument sample along with technical documentation (PCB schematics, circuit diagrams, sealing locations, user manual) [Source: Model Approval Rules 2011 Rule 6].
2. **Rule 7 (Tests for Model Approval)**: Tests must ascertain conformity with standards established under OIML recommendations (R 76 for NAWI) under varied usage conditions [Source: Model Approval Rules 2011 Rule 7].
3. **Rule 11(4) (Website Publication Mandate - 2019 Amendment)**: Substitutes old rules to mandate that _"The Director shall cause the model approval certificates issued under section 22 of the Act to be published on the website of the Department"_ [Source: Gazette Notification G.S.R. 823(E) dated 6 Nov 2019 Rule 2(ii)].
4. **Rule 19 (Testing Fee Schedule - 2019 Amendment)**: Replaces fee provisions with explicit statutory rates:
   - **Mechanical Type Models**: ₹10,000 [Source: Rule 19(1)(i)].
   - **Digital or Electronic Type Models**: ₹25,000 [Source: Rule 19(1)(ii)].
   - **Substitute Material Testing**: Half of the testing fee (₹12,500 for digital) [Source: Rule 19(2)].

---

## 4. OIML R-76 Structure & Technical Architecture

OIML R-76 is strictly bifurcated into two parts:

- **OIML R 76-1 (2006)**: Defines the metrological requirements, technical design constraints, mathematical calculation equations, influence factor test protocols, and disturbance test setups.
- **OIML R 76-2 (1993/2007)**: Provides the standardized **Pattern Evaluation Report Format** containing 17 mandatory standardized form schemas (Forms 1–17) and executive summary templates.

---

## 5. Instrument Classification Framework

Instruments are classified into four Accuracy Classes based on their application domain, scale division $e$, and verification interval count $n$:

| Accuracy Class | Class Mark (OIML) | Class Designation | Typical Usage & Applications                                                          |
| :------------- | :---------------- | :---------------- | :------------------------------------------------------------------------------------ |
| **Class I**    | (I)               | Special Accuracy  | Analytical balances, micro-balances, precious metal assay, pharmaceutical research.   |
| **Class II**   | (II)              | High Accuracy     | Laboratory balances, jewelry scales, pharmaceutical compounding, gold trade.          |
| **Class III**  | (III)             | Medium Accuracy   | Commercial retail scales, platform scales, warehouse weighbridges, healthcare scales. |
| **Class IIII** | (IIII)            | Ordinary Accuracy | Industrial bulk scales, crane scales, construction material scales.                   |

---

## 6. Accuracy Classes, Max/Min, e, d, n and Scale Intervals

### 6.1 Classification Criteria Table (OIML R 76-1 Table 3)

The relationship between verification scale interval $e$, scale interval count $n = Max/e$, and minimum capacity $Min$ is strictly governed by Table 3:

| Accuracy Class      | Verification Scale Interval ($e$)      | Minimum Scale Count ($n_{min}$) | Maximum Scale Count ($n_{max}$) | Minimum Capacity ($Min$) |
| :------------------ | :------------------------------------- | :------------------------------ | :------------------------------ | :----------------------- |
| **Special (I)**     | $0.001 	ext{ g} \le e$                  | 50 000                          | No upper limit                  | $100 e$                  |
| **High (II)**       | $0.001 	ext{ g} \le e \le 0.05 	ext{ g}$ | 100                             | 100 000                         | $20 e$                   |
| **High (II)**       | $0.1 	ext{ g} \le e$                    | 5 000                           | 100 000                         | $50 e$                   |
| **Medium (III)**    | $0.1 	ext{ g} \le e \le 2 	ext{ g}$      | 100                             | 10 000                          | $20 e$                   |
| **Medium (III)**    | $5 	ext{ g} \le e$                      | 500                             | 10 000                          | $20 e$                   |
| **Ordinary (IIII)** | $5 	ext{ g} \le e$                      | 100                             | 1 000                           | $10 e$                   |

- **Class I Exception (Clause 3.4.4)**: For Class I instruments with $d < 0.1 	ext{ mg}$, $n$ may be less than 50 000 [Source: OIML R 76-1 Cl 3.4.4].
- **Class I Verification Limit**: Due to test load uncertainty limits, testing to $e < 1 	ext{ mg}$ is not normally feasible unless special enclosures are used [Source: OIML R 76-1 Table 3 Note **].
- **Grading Instruments Exception**: Minimum capacity $Min$ is reduced to $5e$ for postal scales, toll/tariff scales, and waste weighing instruments [Source: OIML R 76-1 Cl 3.2 Note *].

### 6.2 Scale Division Relationship ($d$ vs $e$) Rules

- **Graduated Without Auxiliary Device**: $e = d$ [Source: OIML R 76-1 Table 2].
- **Graduated With Auxiliary Device**: $d < e \le 10 d$ [Source: OIML R 76-1 Cl 3.4.2].
- **Expression of $e$**: $e = 10^k 	ext{ kg}$, where $k$ is a positive or negative whole number, or zero ($1	ext{ mg}, 10	ext{ mg}, 0.1	ext{ g}, 1	ext{ g}, 10	ext{ g}, 1	ext{ kg}$, etc.) [Source: OIML R 76-1 Cl 3.4.2].

---

## 7. Maximum Permissible Error (MPE) Rules & Formulas

### 7.1 Initial Verification MPE Step Brackets (Table 6)

For pattern evaluation testing under Section 22 of the Legal Metrology Act, **Initial Verification MPEs** strictly apply. MPE is expressed as a step function based on the test load $m$ expressed in scale intervals ($m = L/e$):

| Load Range $m = L/e$ (Class I) | Load Range $m = L/e$ (Class II) | Load Range $m = L/e$ (Class III) | Load Range $m = L/e$ (Class IIII) | Initial Verification MPE ($	ext{mpe}$) |
| :----------------------------- | :------------------------------ | :------------------------------- | :-------------------------------- | :------------------------------------ |
| $0 \le m \le 50\,000$          | $0 \le m \le 5\,000$            | $0 \le m \le 500$                | $0 \le m \le 50$                  | $\pm 0.5 e$                           |
| $50\,000 < m \le 200\,000$     | $5\,000 < m \le 20\,000$        | $500 < m \le 2\,000$             | $50 < m \le 200$                  | $\pm 1.0 e$                           |
| $200\,000 < m$                 | $20\,000 < m \le 100\,000$      | $2\,000 < m \le 10\,000$         | $200 < m \le 1\,000$              | $\pm 1.5 e$                           |

### 7.2 In-Service Inspection MPE Rules

- In-service inspection MPE values are exactly **double** the initial verification MPEs ($\pm 1.0e, \pm 2.0e, \pm 3.0e$) [Source: OIML R 76-1 Cl 3.5.2].
- **CRITICAL RULE**: Software engines must toggle strictly to Initial Verification MPEs for model approval pattern evaluation [Source: Research Doc Sec 4.2].

---

## 8. Reference Standard & Test Weight Requirements

### 8.1 Expanded Uncertainty Constraint ($U \le rac{1}{3} 	ext{MPE}$)

- Standard weights or standard masses used for pattern evaluation shall meet OIML R 111 metrological requirements [Source: OIML R 76-1 Cl 3.7.1].
- **Mandatory Constraint**: Standard weights shall not have an error (or expanded uncertainty $U_{ext}$) greater than **one-third ($rac{1}{3}$)** of the Maximum Permissible Error ($	ext{MPE}$) of the instrument for the applied load $L$:
  $$U_{ext} \le rac{1}{3} 	imes 	ext{MPE}(L)$$
  [Source: NABL 129 / OIML R 76-1 Cl 3.7.1].

### 8.2 Standard Weight Substitution Rules (Clause 3.7.3)

When testing instruments with $Max > 1 	ext{ ton}$, substitution materials (e.g. static ballast) may replace test weights provided:

1. At least **1 ton** or **50% of $Max$** (whichever is greater) is comprised of standard weights [Source: GOI Gazette Rule 9(3) / OIML R 76-1 Cl 3.7.3].
2. The standard weight portion may be reduced to **$rac{1}{3} Max$** if the repeatability error is $\le 0.3e$ [Source: OIML R 76-1 Cl 3.7.3].
3. The standard weight portion may be reduced to **$rac{1}{5} Max$** if the repeatability error is $\le 0.2e$ [Source: OIML R 76-1 Cl 3.7.3].

---

## 9. Complete Test-by-Test Technical Requirements

| Test Name                 | Source Clause & Form               | Required Test Loads & Conditions                                                                 | Mathematical Evaluation Formula                                                                | Pass / Fail Compliance Criteria                                                              |
| :------------------------ | :--------------------------------- | :----------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Weighing Performance**  | OIML R 76-1 A.4.4; R 76-2 Form 1   | At least 5 ascending and descending load steps including $Min, 500e, 2000e, Max$.                | $P = I + 0.5e - \Delta L$<br>$E = P - L$<br>$E_c = E - E_0$                                    | $                                                                                            | E_c      | \le ext{MPE}$ for all applied loads $L$.                              |
| **Temp Effect No-Load**   | OIML R 76-1 A.5.3.2; R 76-2 Form 2 | Tested at reference temp, $T_{max}, T_{min}, T_{ref}$. Max $5^\circ	ext{C/h}$ drift rate.         | Zero drift rate = $rac{\Delta E_0}{\Delta T}$ per $1^\circ	ext{C}$ or $5^\circ	ext{C}$           | Zero change $\le 1e$ over specified temperature range ($p_i \cdot e / 5	ext{K}$ for modules). |
| **Eccentricity (Corner)** | OIML R 76-1 A.4.7; R 76-2 Form 3   | Load $L pprox rac{1}{3} Max$ placed at center and 4 quadrant positions.                          | $P = I + 0.5e - \Delta L$<br>$E_c = P - L - E_0$                                               | $                                                                                            | E_c      | \le ext{MPE}$ for applied load across all positions.                  |
| **Discrimination**        | OIML R 76-1 A.4.8; R 76-2 Form 4   | Tested at $Min, rac{1}{2}Max, Max$. Extra load $1.4d$ added gently.                              | Indication displacement check                                                                  | Extra load of $1.4d$ MUST flip indication cleanly by $+1d$.                                  |
| **Repeatability**         | OIML R 76-1 A.4.10; R 76-2 Form 5  | 3 to 10 repeated weighings at $rac{1}{2}Max$ and $Max$.                                          | Range = $P_{max} - P_{min}$                                                                    | Range difference $(P_{max} - P_{min}) \le                                                    | ext{MPE} | $ for applied load.                                                   |
| **Creep & Zero Return**   | OIML R 76-1 A.4.11; R 76-2 Form 6  | Constant temp; load at $Max$ for 30 min. Readings at $0, 15, 30$ min; zero at $30.5$ min.        | Creep = $P_{30} - P_0$<br>$15	ext{m–}30	ext{m} = P_{30} - P_{15}$<br>Zero ret = $P_{30.5} - P_0$ | $30	ext{m}$ Creep $\le 0.5e$; $15	ext{m–}30	ext{m}$ drift $\le 0.2e$; Zero return $\le 0.5e$.   |
| **Tare Weighing Acc.**    | OIML R 76-1 A.4.6; R 76-2 Form 9   | Tare loads applied at $rac{1}{3}$ and $rac{2}{3}$ $Max$. Net load weighing checked across range. | $P = I + 0.5e - \Delta L$<br>$E_{net} = P - L_{net}$                                           | Tare setting error $\le \pm 0.25e$; Net weighing $                                           | E_{net}  | \le ext{MPE}(L_{net})$.                                               |
| **Disturbance Tests**     | OIML R 76-1 Annex B; Forms 11–14   | ESD, AC power dips/bursts, radiated EMC in shielded chamber.                                     | Variation $V =                                                                                 | E_{dist} - E_{base}                                                                          | $        | Variation $V \le 1e$ OR instrument detects fault and inhibits output. |

---

## 10. Test Conditions and Execution Procedures

1. **Warm-Up Time (A.5.2)**: An instrument shall be powered on and allowed to stabilize for the warm-up period specified by the manufacturer (typically 30 minutes) prior to testing [Source: OIML R 76-1 Cl A.5.2].
2. **Leveling Verification**: The instrument must be leveled using its level indicator bubble prior to applying any test load [Source: OIML R 76-1 Cl 3.9.1.1].
3. **Zero-Tracking Inoperative**: Automatic zero-setting and zero-tracking devices must be made inoperative during testing by applying a small pre-load (e.g. $10e$) [Source: OIML R 76-1 Cl A.4.1.2].

---

## 11. Bench Observation & Data-Entry Rules

1. **Changeover Load Method ($\Delta L$)**: Small weights of $0.1e$ (up to $1.0e$) are placed manually on the load receptor until the digital indication $I$ unambiguously switches to $I + e$ [Source: OIML R 76-1 A.4.4.3].
2. **Required Bench Fields**:
   - Applied Load ($L$)
   - Unrounded Displayed Indication ($I$)
   - Added Changeover Load ($\Delta L$)
   - Calculated Pre-rounding Indication ($P$)
   - Calculated Intrinsic Error ($E$)
   - Corrected Intrinsic Error ($E_c$)

---

## 12. Calculations, Formulas, and Intermediate Values

1. **Digital Pre-Rounding Indication ($P$)**:
   $$P = I + 0.5e - \Delta L$$
2. **Uncorrected Intrinsic Error ($E$)**:
   $$E = P - L = I + 0.5e - \Delta L - L$$
3. **Zero-Load Error ($E_0$)**:
   $$E_0 = I_0 + 0.5e - \Delta L_0 - L_0$$
4. **Corrected Intrinsic Error ($E_c$)**:
   $$E_c = E - E_0 = (P - L) - (P_0 - L_0)$$
   [Source: OIML R 76-1 Annex A.4.4.3].

---

## 13. PASS / FAIL Compliance Rules Engine

The software compliance engine MUST evaluate boolean pass/fail status strictly deterministically:
$$	ext{Status}(L) = egin{cases} 	ext{PASS} & 	ext{if } |E_c(L)| \le 	ext{MPE}(L) \ 	ext{FAIL} & 	ext{if } |E_c(L)| > 	ext{MPE}(L) \end{cases}$$
**Overall Session Status**: A test session is marked **PASS** if and only if every mandatory test clause returns **PASS**. If a single test point fails, the overall session status is **FAIL**.

---

## 14. Environmental, Thermal, and Electrical Conditions

1. **Standard Temperature Limits**: Unless marked otherwise, instruments must operate within $-10^\circ	ext{C}$ to $+40^\circ	ext{C}$ [Source: OIML R 76-1 Cl 3.9.2.2].
2. **Temperature Rate of Change**: Ambient temperature drift must not exceed $5^\circ	ext{C}$ per hour during general testing, and $2^\circ	ext{C}$ per hour during creep testing [Source: OIML R 76-1 Cl A.5.3.1].
3. **Power Voltage Variations**:
   - Mains AC Power: $-15\%$ to $+10\%$ of nominal voltage [Source: OIML R 76-1 Cl A.5.4].
   - Battery Operated: Down to minimum operating voltage $V_{min}$ before display shutdown.

---

## 15. Special Cases, Module Testing, and Boundary Conditions

### 15.1 Separate Testing of Modules (Clause 3.10.2)

When testing major NAWI modules separately (Load Cell, Indicator, Weighing Module), the MPE is apportioned using a fraction factor $p_i$:

- **Load Cell ($p_{LC}$)**: $p_{LC} = 0.7$ [Source: OIML R 76-1 Cl F.2.2].
- **Indicator ($p_{ind}$)**: $p_{ind} = 0.5$ [Source: OIML R 76-1 Cl F.3.2].
- **Connecting Elements ($p_{con}$)**: $p_{con} = 0.5$ [Source: OIML R 76-1 Cl F.4].
- **Constraint**: $\sum p_i^2 = p_{LC}^2 + p_{ind}^2 + p_{con}^2 \le 1.0$.
- **Apportioned MPE**:
  $$	ext{MPE}_{	ext{module}} = p_i 	imes 	ext{MPE}_{	ext{complete}}$$

---

## 16. Multi-Interval and Multiple-Range Instrument Logic

### 16.1 Multi-Interval Instrument Rules (Clause 3.3)

For multi-interval scales with partial weighing ranges ($W_1, W_2, W_3$) having scale intervals $e_1 < e_2 < e_3$:

1. Partial ranges switch automatically based on applied load $L$.
2. Vernier changeover weights $\Delta L$ must be added in steps of $0.1 e_i$ corresponding to the **active partial range $i$**.
3. In formula $P = I + 0.5e_i - \Delta L$, term $0.5e$ dynamically adopts division $e_i$ of active partial range.
4. MPE step boundaries shift dynamically based on $e_i$: For range $i$, MPE is evaluated against $e_i$ (e.g. $0 \le m \le 500 e_i \implies \pm 0.5 e_i$).
5. On decreasing loads, scale remains in higher partial range $e_i$ until zero is reached.

---

## 17. OIML R 76-2 Report Contents & Mandatory Schema

A compliant report must contain fields structured across 10 mandatory categories:

1. **Instrument Information**: Report No, Pattern Designation, Accuracy Class (I–IIII), $Max, Min, e, d, n$, Multi-interval parameters ($e_1, e_2$), Temp limits ($T_{min}, T_{max}$), Voltage/Power specs, Serial No.
2. **Manufacturer / Model Info**: Manufacturer Name & Address, Applicant Details, Model Name, Country of Origin, Facility Location.
3. **Test Conditions & Metadata**: Testing Lab Name (RRSL), Lab Location, Test Date/Time, Observer Name, Ambient Temp ($T$), Humidity (%RH), Barometer (hPa).
4. **Test Observations**: Applied Load $L$, Indication $I$, Changeover Load $\Delta L$, Zero Indication $I_0$, Tare Load $T$, Eccentricity Position No (1–5).
5. **Calculations & Derivations**: Pre-rounding $P$, Zero Error $E_0$, Raw Error $E$, Corrected Error $E_c$, MPE Limit.
6. **Results & Visual Graphs**: Pass/Fail per clause, Max Observed Error vs MPE Table, $E_c$ vs Load Error Curves (Form 1 p. 41 graph).
7. **Compliance Decision**: Final Recommendation (Approved/Rejected), Legal Metrology Act Sec 22 Alignment Statement.
8. **Signatures & Approvals**: Testing Officer Signature, Lab Director Approval Signature, Official Lab Stamp/Seal, Unique Certificate Hash ID.
9. **Evidence & Attachments**: Nameplate Photo, Sealing Diagram, Circuit Schematics (digital), User Manual copy, Reference Weight Calibration Cert Numbers & Uncertainty $U$.
10. **Regulatory References**: OIML R 76-1:2006, OIML R 76-2:2007, Legal Metrology Act 2009 (Sec 22), Model Approval Rules 2011/2019, NABL 129.

---

## 18. Evidence, Document, Photo, and OCR Requirements

1. **Nameplate Photograph**: High-resolution image of instrument descriptive markings [Source: R 76-2 Form 16].
2. **Sealing Plan**: Diagram/photo of verification mark stamping places preventing fraudulent access [Source: Model Approval Rules Sec 5(2)(viii)].
3. **Circuit Schematics**: Digital PDF attachment of PCB layout and actual circuit diagram [Source: Model Approval Rules Sec 5(2)(vii)].

---

## 19. Review, Approval, Digital Signatures, and Audit Requirements

1. **Role-Based Access Control (RBAC)**: Strict separation across Testing Officer, Senior Reviewer, Laboratory Director, and Metrology Admin.
2. **WELMEC 7.2 Cryptographic Provenance**: SHA-256 hash graph immutably linking raw bench observations $	o$ environmental logs $	o$ standard weight certs $	o$ calculation step trace $	o$ final signed PDF.
3. **X.509 PKI Digital Signatures**: PDF exports signed using USB DSC hardware tokens (India eSign / PKCS#11).

---

## 20. Data Validation & Pre-Check Rules

1. **NABL 129 Weight Uncertainty Check**: Algorithmic block if test weight $U_{ext} > rac{1}{3} 	ext{MPE}(L)$.
2. **Thermal Drift Check**: Block test if room temperature variation exceeds $5.0^\circ	ext{C/hour}$.
3. **Scale Division Count Validation**: Block registration if $n = Max/e$ violates Table 3 class limits.

---

## 21. Rules Requiring Deterministic Software Automation

1. **Calculation Engine**: $P = I + 0.5e - \Delta L$, $E = P - L$, $E_c = E - E_0$.
2. **MPE Step-Bracket Lookup**: Table 6 step-function tolerance evaluation.
3. **Pass/Fail Boolean Logic**: $|E_c| \le 	ext{MPE}$.
4. **NABL 129 Uncertainty Check**: $U \le rac{1}{3}	ext{MPE}$.
5. **Multi-Interval Scale Division Switching**: Dynamic selection of $e_i$ based on applied load $L$.

---

## 22. Rules Requiring Human Inspector Judgement

1. **Scale Physical Leveling**: Verifying bubble level indicator position.
2. **Visual Markings & Sealing Integrity**: Inspecting physical nameplate and verification stamp locations.
3. **Gentle Load Application**: Ensuring Vernier changeover weights are placed gently without shocking the receptor.
4. **Physical Scale Stability**: Observing digital display settling before recording indication $I$.

---

## 23. Versioning & Regulatory Change-Management Requirements

1. **Standards-as-Code Engine**: Regulatory logic stored in external JSON rule packs (`oiml-r76-2006-v1.json`).
2. **Rule Pack Immutability**: Historical test sessions remain permanently bound to the rule pack version active at the time of testing, ensuring deterministic historical re-computation during court audits.

---

## 24. Complete Developer Implementation Checklist

- [ ] Implement `decimal.js` arbitrary precision fixed-point arithmetic for all metrological calculations ($P, E, E_0, E_c$).
- [ ] Create JSON Schema validator for `oiml-r76-2006-v1.json` rule packs.
- [ ] Build Table 3 class scale division ($n = Max/e$) boundary check during instrument intake.
- [ ] Build NABL 129 standard weight uncertainty pre-validation check ($U \le \frac{1}{3}\text{MPE}$).
- [ ] Implement Vernier changeover weight calculation logic ($P = I + 0.5e - \Delta L$).
- [ ] Build multi-interval partial range switching engine ($e_1, e_2, e_3$).
- [ ] Build Table 6 MPE step-bracket lookup function.
- [ ] Build WELMEC 7.2 SHA-256 hash graph provenance generator using Node.js `crypto`.
- [ ] Implement Node.js PDF (`@pdf-lib` / `pdfkit`) and Word (`docx`) generators rendering OIML R 76-2 Forms 1–17.
- [ ] Build X.509 PKI / DSC digital signature signing pipeline using `@peculiar/x509`.
- [ ] Implement web dashboard and responsive mobile/tablet PWA bench UI using Next.js 16 (LTS v16.3.5), React 19, Tailwind CSS v4, and Lucide React icons.

---

## 25. Unresolved Rules & Ambiguities Requiring Official Verification

1. **Bench Note Ambiguity ("Max/1000g")**: Handwritten note on Adobe Scan p. 3 contains marginal text "Max/1000g" next to eccentricity test requirements — requires verification whether this represents a local RRSL threshold or inspector scratch work.
2. **eMaap Government API Schema**: Exact JSON REST API payload schema for automated publishing to national Legal Metrology portal under Rule 11(4) requires official technical confirmation from the Department of Consumer Affairs.

---
