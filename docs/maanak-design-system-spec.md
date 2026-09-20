# MAANAK (मानक) — Design System & UI/UX Specification

**Platform for Generation of Test Reports & Compliance Verification for Non-Automatic Weighing Instruments (NAWI) per OIML R-76**  
**Problem Statement:** SIH26035 | **System Name:** MAANAK (मानक)  
**Specification Version:** 2.0.0 | **Frontend Framework:** Next.js 16 (LTS v16.3.5) / React 19 / Tailwind CSS v4 / shadcn/ui / Lucide React  
**Theme:** Tweakcn "Twitter" Custom Theme (OKLCH Blue Base) | **Target Devices:** Smartphones (Mobile Phone 360px–430px), Touch Tablets (768px–1024px) & Responsive Desktop (1280px+)  

---

> [!IMPORTANT]
> **Authoritative Developer Directives:**
> 1. **Strict Documentation Adherence**: All UI components, page layouts, theme tokens, and typography must follow this document and the design system strictly.
> 2. **Latest Stable Packages**: Always install and use the latest stable releases of all UI dependencies (`next` v16.3.5 LTS, `react` v19, `react-dom` v19, `tailwindcss@next` / v4, `lucide-react`, `shadcn/ui`, `@tanstack/react-query`).
> 3. **Mandatory Mobile Phone Responsiveness**: **EVERY SINGLE SCREEN, COMPONENT, AND DASHBOARD MUST BE FULLY RESPONSIVE FOR MOBILE PHONES (smartphones 360px–430px)** as well as tablets and desktops. No horizontal viewport overflow; tables must collapse to mobile stacked cards or swipeable horizontal scroll containers; navigation must adapt to bottom bars/drawers; touch targets must be $\ge 48\text{px}$.
> 4. **Lucide React Icons**: All UI iconography across desktop, tablet, and mobile phone clients must exclusively use **`lucide-react`** (latest stable).
> 5. **Modern Design Aesthetics**: Render crisp, high-density metrological tables, rounded pill buttons (`--radius: 1.3rem`), and Twitter Sky Blue active state highlights.

---

## 1. Design Principles & Visual Direction

### 1.1 Product Philosophy: Government Metrology Workbench (Desktop to Smartphone)
MAANAK is a mission-critical, enterprise-grade metrological workbench used by state verification officers, Regional Reference Standard Laboratory (RRSL) inspectors, field metrologists on mobile phones, and Laboratory Directors under **Section 22 of the Legal Metrology Act, 2009**.

The visual direction balances **government authority**, **metrological precision**, and **modern multi-device ergonomics**:
1. **Universal Multi-Device Responsiveness (Mobile First & Adaptive Desktop)**: Every design must render flawlessly on smartphones (360px–430px, e.g. field inspection in remote markets or industrial weighbridges), laboratory touch tablets (768px–1024px), and large multi-column desktop displays (1280px–1920px).
2. **Utility & High Density**: Prioritizes raw information clarity, tabular data alignment, and minimal chrome overhead over decorative consumer graphics.
3. **Deterministic Metrological Clarity**: Clear separation between human observation inputs ($I, \Delta L$), automated intermediate calculations ($P, E, E_0, E_c$), and boolean compliance outcomes (PASS / FAIL).
4. **Pill & Capsule Radii**: Employs Twitter-theme rounded pills (`--radius: 1.3rem` / ~20.8px) for interactive elements, badges, inputs, and cards, providing a soft, modern touch-friendly interface across smartphones and tablets.
5. **Touch-Optimized Field & Bench Execution**: Minimum touch targets ($\ge 48\text{px} \times 48\text{px}$) with virtual decimal keyboard support (`inputMode="decimal"`) for inspectors holding mobile phones or tablets in field/bench settings.
6. **Color Restraint with Intentional Accents**: Twitter Sky Blue (`oklch(0.6723 0.1606 244.9955)`) functions as the primary brand and active highlight token. Functional colors (Green, Red, Amber) are strictly reserved for metrological compliance states (PASS, FAIL, WARNING).

---

## 2. Token Precedence & Theme Configuration (Tailwind CSS v4)

### 2.1 Token Authority & Conflict Resolution Matrix
This design system resolves potential conflicts between general shadcn monochromatic style references and the specific **Tweakcn "Twitter" OKLCH theme**:

| Token Category | General shadcn Reference Value | Tweakcn Twitter Theme Value (AUTHORITATIVE) | Precedence & Resolution Rule |
| :--- | :--- | :--- | :--- |
| **Primary Color** | Monochromatic Ink (`#0a0a0a`) | **Sky Blue** `oklch(0.6723 0.1606 244.9955)` | **Twitter Theme Takes Precedence**. Primary actions, active navigation, and focus rings use Twitter Sky Blue. |
| **Border Radius** | 18px / 24px fixed | **`--radius: 1.3rem`** (~20.8px base) | **Twitter Theme Takes Precedence**. Derived Tailwind utilities (`rounded-lg`, `rounded-md`, `rounded-sm`) calculate from `1.3rem`. |
| **Typography** | `Geist` sans-serif | **`Open Sans, sans-serif`** | **Twitter Theme Takes Precedence**. Body and display headings use Open Sans; Menlo is used for monospace numeric data. |
| **Card Surface** | `#ffffff` / `#fafafa` | **`oklch(0.9784 0.0011 197.1387)`** | **Twitter Theme Takes Precedence**. Subtle blue-gray tint on card background in light mode. |
| **Destructive Accent** | `#e7000b` | **`oklch(0.6188 0.2376 25.7658)`** | **Twitter Theme Takes Precedence**. OKLCH high-contrast red for FAIL states, error alerts, and destructive actions. |

---

### 2.2 Complete CSS Theme Variable System (`globals.css`)

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  /* Surface & Canvas Tokens */
  --background: oklch(1.0000 0 0);
  --foreground: oklch(0.1884 0.0128 248.5103);
  --card: oklch(0.9784 0.0011 197.1387);
  --card-foreground: oklch(0.1884 0.0128 248.5103);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.1884 0.0128 248.5103);

  /* Primary Brand & Interactive Tokens (Twitter Sky Blue) */
  --primary: oklch(0.6723 0.1606 244.9955);
  --primary-foreground: oklch(1.0000 0 0);

  /* Secondary & Muted Tokens */
  --secondary: oklch(0.1884 0.0128 248.5103);
  --secondary-foreground: oklch(1.0000 0 0);
  --muted: oklch(0.9222 0.0013 286.3737);
  --muted-foreground: oklch(0.1884 0.0128 248.5103);
  --accent: oklch(0.9392 0.0166 250.8453);
  --accent-foreground: oklch(0.6723 0.1606 244.9955);

  /* Destructive State Token (Ember Red) */
  --destructive: oklch(0.6188 0.2376 25.7658);
  --destructive-foreground: oklch(1.0000 0 0);

  /* Borders, Inputs & Focus Rings */
  --border: oklch(0.9317 0.0118 231.6594);
  --input: oklch(0.9809 0.0025 228.7836);
  --ring: oklch(0.6818 0.1584 243.3540);

  /* Data Visualization / Chart Palettes */
  --chart-1: oklch(0.6723 0.1606 244.9955); /* Primary Blue */
  --chart-2: oklch(0.6907 0.1554 160.3454); /* Compliance Green */
  --chart-3: oklch(0.8214 0.1600 82.5337);  /* Warning Amber */
  --chart-4: oklch(0.7064 0.1822 151.7125); /* Review Purple */
  --chart-5: oklch(0.5919 0.2186 10.5826);  /* Destructive Red */

  /* Navigation Sidebar Tokens */
  --sidebar: oklch(0.9784 0.0011 197.1387);
  --sidebar-foreground: oklch(0.1884 0.0128 248.5103);
  --sidebar-primary: oklch(0.6723 0.1606 244.9955);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9392 0.0166 250.8453);
  --sidebar-accent-foreground: oklch(0.6723 0.1606 244.9955);
  --sidebar-border: oklch(0.9271 0.0101 238.5177);
  --sidebar-ring: oklch(0.6818 0.1584 243.3540);

  /* Font Families & Radii */
  --font-sans: 'Open Sans', sans-serif;
  --font-serif: 'Georgia', serif;
  --font-mono: 'Menlo', monospace;
  --radius: 1.3rem;

  /* Elevation Shadows */
  --shadow-color: rgba(29, 161, 242, 0.15);
  --shadow-sm: 0px 2px 0px 0px rgba(29, 161, 242, 0.05), 0px 1px 2px -1px rgba(0, 0, 0, 0.05);
  --shadow-md: 0px 2px 0px 0px rgba(29, 161, 242, 0.08), 0px 2px 4px -1px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0px 2px 0px 0px rgba(29, 161, 242, 0.12), 0px 4px 6px -1px rgba(0, 0, 0, 0.10);
}

.dark {
  /* Dark Mode Surface Tokens */
  --background: oklch(0 0 0);
  --foreground: oklch(0.9328 0.0025 228.7857);
  --card: oklch(0.2097 0.0080 274.5332);
  --card-foreground: oklch(0.8853 0 0);
  --popover: oklch(0 0 0);
  --popover-foreground: oklch(0.9328 0.0025 228.7857);

  /* Dark Mode Primary Tokens */
  --primary: oklch(0.6692 0.1607 245.0110);
  --primary-foreground: oklch(1.0000 0 0);

  /* Dark Mode Muted & Secondary Tokens */
  --secondary: oklch(0.9622 0.0035 219.5331);
  --secondary-foreground: oklch(0.1884 0.0128 248.5103);
  --muted: oklch(0.2090 0 0);
  --muted-foreground: oklch(0.5637 0.0078 247.9662);
  --accent: oklch(0.1928 0.0331 242.5459);
  --accent-foreground: oklch(0.6692 0.1607 245.0110);

  /* Dark Mode Destructive Token */
  --destructive: oklch(0.6188 0.2376 25.7658);
  --destructive-foreground: oklch(1.0000 0 0);

  /* Dark Mode Borders & Inputs */
  --border: oklch(0.2674 0.0047 248.0045);
  --input: oklch(0.3020 0.0288 244.8244);
  --ring: oklch(0.6818 0.1584 243.3540);

  /* Dark Mode Navigation Sidebar Tokens */
  --sidebar: oklch(0.2097 0.0080 274.5332);
  --sidebar-foreground: oklch(0.8853 0 0);
  --sidebar-primary: oklch(0.6818 0.1584 243.3540);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.1928 0.0331 242.5459);
  --sidebar-accent-foreground: oklch(0.6692 0.1607 245.0110);
  --sidebar-border: oklch(0.3795 0.0220 240.5943);
  --sidebar-ring: oklch(0.6818 0.1584 243.3540);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Sidebar Theme Links */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);

  /* Fonts & Radius Mapping */
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

---

## 3. Typography System & Metrological Data Rules

### 3.1 Font Stack Allocation
* **`--font-sans` (`Open Sans, sans-serif`)**: Default interface font for all headings, form labels, navigation links, and standard body text.
* **`--font-mono` (`Menlo, monospace`)**: Reserved strictly for **metrological values**, raw indications ($I$), total loads ($L$), Vernier changeover weights ($\Delta L$), calculated errors ($E, E_0, E_c$), MPE limits, serial numbers, NABL weight calibration certificate IDs, and SHA-256 cryptographic hashes.

### 3.2 Type Scale
| Role Token | Font Family | Size | Weight | Line Height | Tracking | Tailwind Class Example |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Headline** | `font-sans` | 36px (2.25rem) | 700 (Bold) | 1.15 | `-0.02em` | `text-4xl font-bold tracking-tight` |
| **Page Title (H1)** | `font-sans` | 28px (1.75rem) | 600 (Semibold)| 1.25 | `-0.015em` | `text-3xl font-semibold tracking-tight` |
| **Section Header (H2)**| `font-sans` | 20px (1.25rem) | 600 (Semibold)| 1.35 | `0em` | `text-xl font-semibold` |
| **Subsection Header (H3)**| `font-sans` | 16px (1.00rem) | 600 (Semibold)| 1.40 | `0em` | `text-base font-semibold` |
| **Body Standard** | `font-sans` | 14px (0.875rem) | 400 (Regular) | 1.50 | `0em` | `text-sm font-normal` |
| **Body Small / Helper**| `font-sans` | 12px (0.75rem)  | 400 (Regular) | 1.40 | `0.01em` | `text-xs font-normal text-muted-foreground` |
| **Metrology Numeric** | `font-mono` | 14px (0.875rem) | 500 (Medium)  | 1.00 | `0.02em` | `font-mono text-sm font-medium tabular-nums` |
| **SHA-256 Hash Tag** | `font-mono` | 11px (0.6875rem)| 400 (Regular) | 1.00 | `0.05em` | `font-mono text-[11px] break-all select-all` |

### 3.3 UX Rules for Dense Metrological Data
1. **Tabular Numbers Mandatory**: All numeric data tables must enforce `tabular-nums` (`font-variant-numeric: tabular-nums`) to ensure vertical alignment of decimal points across rows.
2. **Explicit Unit Appending**: Every measurement value displayed in UI must explicitly append its metric unit in `text-muted-foreground` (e.g., `15.0000 kg`, `0.005 g`, `21.5 °C`, `1013.25 hPa`).
3. **Formula Derivation Tooltips**: Hovering over any calculated cell ($P$, $E$, $E_0$, $E_c$) opens a `<Tooltip>` displaying the exact underlying mathematical derivation formula (e.g. `P = 15.000 + 0.0025 - 0.0010 = 15.0015 kg`).

---

## 4. Spacing, Radius, Sizing & Shadow System

### 4.1 Spacing Scale
MAANAK uses Tailwind CSS v4's 4px spacing grid (`--spacing: 0.25rem`):
* **`p-1` / `gap-1`**: 4px — Tight inline element gaps, badge icon padding.
* **`p-2` / `gap-2`**: 8px — Button inner icon gap, small form field padding.
* **`p-3` / `gap-3`**: 12px — Table cell padding, compact card header gap.
* **`p-4` / `gap-4`**: 16px — Standard form control gap, card inner padding.
* **`p-6` / `gap-6`**: 24px — Page section layout grid gap, modal dialog padding.
* **`p-8` / `gap-8`**: 32px — Major workbench section dividers.

### 4.2 Border Radius System
The visual language is defined by the **Twitter-theme pill geometry** (`--radius: 1.3rem` / ~20.8px):
* **Pill Buttons & Inputs (`rounded-2xl` / `1.3rem`)**: Primary buttons, input controls, select dropdowns, search triggers, and badges use full pill rounding.
* **Cards & Container Shells (`rounded-3xl` / `1.6rem`)**: Large content cards, lab bench observation panels, and modal shells use soft container curves.
* **Nested Badges & Small Tags (`rounded-xl` / `0.9rem`)**: Small inline status badges and table tags use a proportional sub-radius.

---

## 5. Layout Grid & Navigation Sidebar Structure

### 5.1 Responsive Breakpoint Grid
* **Mobile (`sm`: 640px)**: Single-column scrollable bench view for field inspectors.
* **Tablet (`md`: 768px)**: Touch-optimized dual-pane layout for bench observation entry.
* **Desktop (`lg`: 1024px)**: Full multi-pane laboratory workbench grid.
* **Wide Workbench (`xl`: 1280px)**: Max content container (`max-w-7xl mx-auto`) with fixed left navigation sidebar (260px width) and right analytical side panel.

### 5.2 Application Navigation Hierarchy
The persistent left navigation bar uses shadcn `<Sidebar>` primitives styled with Twitter theme tokens:

```
+---------------------------------------------------------------------------------------------------+
|  [MAANAK (मानक) LOGO] — Department of Consumer Affairs | Legal Metrology                          |
+---------------------------------------------------------------------------------------------------+
|  NAVIGATION MENU                                                                                  |
|  ├── 📊 Dashboard (`/dashboard`)              — Overview KPIs, active queues, NABL weight alert  |
|  ├── ⚖️ Instrument Intake (`/instruments`)     — NAWI Registration, Max/Min/e/d, Class I-IIII     |
|  ├── 🧪 Bench Execution (`/bench`)            — Live R-76 Forms 1-14, Vernier Delta L entry    |
|  ├── 🔍 Reviewer Audit (`/reviews`)           — Anomaly detection, Step derivation tree viewer   |
|  ├── 📜 Test Reports (`/reports`)              — Signed OIML R 76-2 PDFs, Verification QR        |
|  ├── 🔗 Audit & Provenance (`/provenance`)    — WELMEC 7.2 SHA-256 Hash Graph timeline           |
|  └── ⚙️ Standards & Rules (`/rule-packs`)     — Versioned JSON Rule Packs (OIML R-76:2006/2026)  |
+---------------------------------------------------------------------------------------------------+
|  [USER FOOTER]                                                                                    |
|  👤 Testing Officer Name | RRSL Faridabad Facility | [Offline / Sync Badge]                           |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Metrological Status Colors & Compliance Visuals

To maintain high contrast and metrological legal accuracy, status states follow a strict functional color hierarchy:

| Compliance State | Background Token | Foreground / Text Token | Border Token | Lucide Icon | Visual Presentation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PASS** | `bg-emerald-500/10` | `text-emerald-600 dark:text-emerald-400` | `border-emerald-500/30` | `<CheckCircle2>` | Solid green pill badge, checkmark icon, bold `PASS` tag. |
| **FAIL** | `bg-destructive/10` | `text-destructive` | `border-destructive/30` | `<XCircle>` | High-contrast ember red badge, `FAIL` tag, error ring. |
| **WARNING / BLOCK** | `bg-amber-500/10` | `text-amber-600 dark:text-amber-400` | `border-amber-500/30` | `<AlertTriangle>` | Amber alert pill; used for $U > rac{1}{3}	ext{MPE}$ or thermal drift warnings. |
| **IN PROGRESS** | `bg-primary/10` | `text-primary` | `border-primary/30` | `<Clock>` | Twitter Sky Blue badge with pulsing execution dot. |
| **PENDING REVIEW** | `bg-purple-500/10` | `text-purple-600 dark:text-purple-400` | `border-purple-500/30` | `<FileSearch>` | Muted purple pill badge indicating senior metrologist review queue. |

---

## 7. Complete Component System (shadcn/ui Mappings)

### 7.1 Buttons
* **Primary Filled Button**: `bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-10 px-6 font-medium shadow-sm` — Used for main actions (e.g., "Submit Observation", "Sign Report").
* **Secondary Ghost Button**: `bg-muted text-foreground hover:bg-muted/80 rounded-2xl h-10 px-5 font-medium` — Used for secondary actions ("Cancel", "Back").
* **Outline Button**: `border border-border bg-background hover:bg-accent hover:text-accent-foreground rounded-2xl h-10 px-4 font-medium` — Used for inline table actions.
* **Destructive Button**: `bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl h-10 px-5 font-medium` — Used for rejecting sessions or revoking certificates.

### 7.2 Input Fields & Select Controls
* **Resting Input**: `bg-input/50 border border-border text-foreground rounded-2xl h-11 px-4 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all`
* **Metrology Observation Input (`font-mono`)**: Appends monospace numeric styling and tabular numbers (`font-mono text-base font-semibold tabular-nums`).

### 7.3 Data Tables (`<Table>`)
* **Density**: Compact table rows (`py-2.5 px-4 text-xs`).
* **Header**: `bg-card text-muted-foreground font-semibold uppercase tracking-wider border-b border-border`.
* **Alternating Rows**: `odd:bg-background even:bg-card/50 hover:bg-accent/50 transition-colors`.

---

## 8. Major Application Screen Specifications

### 8.1 Screen 1: Laboratory Dashboard (`/dashboard`)
* **Header Strip**: Laboratory Title ("RRSL Faridabad — NAWI Model Evaluation Facility"), Active Role ("Testing Officer: Officer A. Sharma"), System Status Badge ("WELMEC 7.2 Hash Service: ACTIVE").
* **Stat Block Grid**:
  1. *Active Sessions*: 12 Pending Bench Tests.
  2. *Pending Reviews*: 4 Sessions Awaiting Senior Review.
  3. *Approved Models (2026)*: 48 Approved Certificates.
  4. *NABL Standard Weights*: 100% Calibrated (0 Expired).
* **Recent Activity Data Table**: Columns for Test Session ID, Manufacturer, Model, Accuracy Class (I–IIII), Active Test Clause, Compliance Badge, and Actions.

---

### 8.2 Screen 2: Instrument Intake & Boundary Check (`/instruments/new`)
* **Form Layout**: 2-column card shell (`max-w-4xl mx-auto`).
* **Fields**:
  * Manufacturer Name, Model Designation, Serial Number.
  * Accuracy Class Dropdown (Special Class I, High Class II, Medium Class III, Ordinary Class IIII).
  * Maximum Capacity ($	ext{Max}$), Minimum Capacity ($	ext{Min}$), Verification Scale Interval ($e$), Actual Scale Interval ($d$).
* **Live Boundary Validation Card**:
  * Automatically calculates scale division count:
    $$n = rac{	ext{Max}}{e}$$
  * Validates $n$ against R-76 Table 3 limits (e.g. for Class III, $500 \le n \le 10\,000$).
  * Displays a green `<Badge>` if $n$ is valid, or an ember red alert if scale parameters are misclassified.
* **Camera OCR Intake Button**: Trigger button allowing mobile inspectors to capture the metal nameplate photo and auto-fill parameters via OCR.

---

### 8.3 Screen 3: Bench Execution & Live Observation Entry (`/bench/[sessionId]`)
* **Top Meta Banner**: Instrument Serial, Class III, $	ext{Max} = 15.000	ext{ kg}$, $e = 0.005	ext{ kg}$, Active Clause: `OIML R 76-1 A.4.4 (Weighing Performance)`.
* **Environmental Sensor Bar**: Ambient Temp ($21.5	ext{ °C}$), Relative Humidity ($52\%$), Barometric Pressure ($1013.25	ext{ hPa}$).
* **Bench Touch Pad Entry Section**:
  * Large touch increment buttons for Vernier changeover weights ($\Delta L$): `+0.1e` ($0.5	ext{g}$), `+0.2e` ($1.0	ext{g}$), `+0.5e` ($2.5	ext{g}$).
  * Large numeric input fields for Displayed Indication ($I$) and Total Standard Load ($L$).
* **Real-time Engine Calculation Card**:
  * Live pre-rounding indication display:
    $$P = I + 0.5e - \Delta L$$
  * Corrected intrinsic error calculation:
    $$E_c = E - E_0$$
  * Table 6 MPE step-bracket comparison gauge showing active tolerance bracket ($\pm 1.0e = \pm 0.005	ext{ kg}$) and real-time boolean `PASS` / `FAIL` state indicator.

---

### 8.4 Screen 4: Metrological Pre-Validation & NABL 129 Weight Check (`/bench/[sessionId]/weights`)
* **Standard Weight Selection Table**: List of laboratory standard weights (Class E2, F1, M1).
* **Live Algorithmic Uncertainty Checker**:
  * Compares reference weight expanded uncertainty ($U$) against the mandatory NABL 129 constraint:
    $$U \le rac{1}{3} 	imes 	ext{MPE}(L)$$
  * If $U > rac{1}{3}	ext{MPE}$, the UI renders an amber warning banner and **blocks data entry** for that load point, preventing wasted lab testing time.

---

### 8.5 Screen 5: Reviewer Anomaly Audit (`/reviews/[sessionId]`)
* **Split Workbench View**:
  * **Left Pane**: Step-by-step mathematical derivation tree showing raw inputs $	o$ $P 	o E 	o E_0 	o E_c \le 	ext{MPE}$.
  * **Right Pane**: Automated Reviewer Anomaly Detection Flags:
    * *Check 1*: Thermal drift rate check ($\le 5.0	ext{ °C/hour}$ per A.5.3.2) — `VERIFIED`.
    * *Check 2*: Physical mass sanity (no negative mass or $\Delta L > e$) — `VERIFIED`.
    * *Check 3*: Completeness check (all mandatory R 76-2 Forms 1–14 completed) — `VERIFIED`.
* **Action Footer**: Buttons to "Flag Discrepancy & Return to Officer" or "Approve & Send to Laboratory Director".

---

### 8.6 Screen 6: Report Generation, X.509 Signing & Provenance (`/reports/[reportId]`)
* **Pixel-Perfect Report Preview**: Multi-page preview rendering official OIML R 76-2 Forms 1–17 and summary pages.
* **WELMEC 7.2 Cryptographic Hash Box**: Displays the immutable session hash graph:
  $$	ext{Session Hash: } 	exttt{e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855}$$
* **X.509 PKI / DSC Digital Signature Modal**: Triggers hardware USB DSC token signing, embedding an Adobe-compliant digital signature and verification QR code onto Page 1 of the generated report PDF.

---

## 9. Empty, Loading, Error & Confirmation States

### 9.1 Component State Matrix

| State Type | UI Presentation & Layout | Interactive Behavior |
| :--- | :--- | :--- |
| **Empty Table / List** | Center-aligned card shell with Lucide icon (`<Inbox>` or `<Scale>`), muted description text ("No active test sessions found"). | Includes a primary Sky Blue button ("+ Start New NAWI Evaluation"). |
| **Skeleton Loading** | Animated pulse skeletons (`bg-muted/50 animate-pulse rounded-2xl`) matching table rows and metric cards. | Prevents layout shift while fetching REST API data or offline IndexedDB records. |
| **NABL Uncertainty Error Alert** | High-contrast amber alert card (`bg-amber-500/10 border-amber-500/30 text-amber-600`) with `<AlertTriangle>` icon. | Disables bench input field until a compliant standard weight is selected. |
| **Digital Signing Confirmation** | `<Dialog>` modal overlay displaying report summary, SHA-256 hash preview, and PIN entry field. | Requires explicit PIN entry before invoking X.509 PKI signing key. |

---

## 10. Mandatory Mobile Phone & Multi-Device Responsiveness (a11y & Ergonomics)

> [!IMPORTANT]
> **Mobile-First Responsive Mandate**:
> Every single view, form, table, interactive dialog, drawer, and dashboard in MAANAK **must be fully responsive on mobile phones (smartphones: 360px–430px)** as well as touch tablets (768px–1024px) and large desktop monitors (1280px–1920px+). There must be **zero horizontal window scrolling or layout clipping** on mobile phone screens.

### 10.1 Responsive Viewport Breakpoints & Device Targets

| Target Device Tier | Viewport Width Range | Primary Usage Context | Layout & UI Behavioral Adaptations |
| :--- | :--- | :--- | :--- |
| **Mobile Phone (Smartphones)** | **`360px` – `430px`** (e.g. iPhone SE/14/15, Galaxy S23, Pixel 7) | Field verification officers, market stamping inspectors, on-site weighbridge inspections, mobile status auditing. | **Single-column vertical stack (`flex-col`)**, collapsible navigation drawer (`<Sheet>`), persistent sticky bottom action bar, **table-to-card transformation**, full-screen modal overlays, virtual decimal keypad activation (`inputMode="decimal"`), minimum touch target $\ge 48\text{px} \times 48\text{px}$. |
| **Tablet (Touch Benches)** | **`768px` – `1024px`** (e.g. iPad 10th Gen, Galaxy Tab S8) | Laboratory bench testing, environmental chamber monitoring, dual-pane observation logging. | **Adaptive 2-column layout**, collapsible left sidebar navigation, touch-optimized wide table rows, split-pane observation logging with real-time MPE calculation side-drawer. |
| **Desktop / Workstation** | **`1280px` – `1920px+`** (e.g. 1080p / 1440p / 4K Monitors) | Laboratory Director X.509 PKI signing, Senior Metrologist audit trail review, bulk report generation & export. | **High-density multi-column workspace (3-4 columns)**, persistent left navigation sidebar, floating sticky right-side audit/compliance inspector panel, multi-page side-by-side OIML R 76-2 PDF preview. |

---

### 10.2 Mobile Phone Responsive Component Transformation Rules

#### 1. Metrological Observation Tables (Table-to-Card Stack)
* **Desktop View ($\ge 1024\text{px}$)**: Standard 8-column high-density data table ($L, I, \Delta L, P, E, E_c, \text{MPE}, \text{Status}$).
* **Mobile Phone View ($< 640\text{px}$)**: Tables automatically transform into **stacked observation cards** (`flex flex-col gap-3`) or swipeable tabbed step cards:
  - Header: Load step pill (`Load #3: 100 kg`) + Pass/Fail badge (`PASS` / `FAIL`).
  - Body: 2-column grid showing **Observation Inputs** ($I$: `100.002 kg`, $\Delta L$: `1.2 g`) alongside **Computed Metrics** ($P$: `100.0018 kg`, $E_c$: `+1.8 g`, $\text{MPE}$: `±5.0 g`).
  - Tap card to open quick-edit drawer for re-testing observation.
  - Horizontal swipe containers (`overflow-x-auto scroll-smooth snap-x snap-mandatory`) with visual scroll indicator pills for multi-load sequence reviews.

#### 2. Mobile Navigation & Touch Ergonomics
* **Collapsible Mobile Sheet**: Replace desktop sidebar with a top header containing a hamburger menu button (`<Menu>` Lucide icon) that slides out a fluid touch drawer (`<SheetContent side="left">`).
* **Sticky Mobile Bottom Action Bar**: Fixed at `bottom-0 left-0 right-0` (`z-50 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2 justify-between items-center`):
  - Primary button (`w-full rounded-2xl h-12 text-base font-semibold`): e.g. "Save Observation & Next Load" or "Generate Report".
  - Quick status badge: Offline sync indicator (`<WifiOff className="w-4 h-4 text-amber-500" />`).

#### 3. Touch Targets & Input Field Sizing
* **Minimum Touch Target**: All clickable buttons, pills, dropdown triggers, and checkboxes must be at least **$48\text{px} \times 48\text{px}$** on mobile viewports (`min-h-[48px] min-w-[48px]`).
* **Mobile Numeric Inputs**: Measurement input fields for load ($L$) and turning point ($\Delta L$) must explicitly specify `type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*"` to trigger the numeric decimal keypad on iOS and Android devices without zooming (`text-base` / `16px` font size prevents auto-zoom on iOS Safari).

#### 4. Responsive KPI & Summary Metric Grids
* Metric cards (e.g. Total Sessions, Pass Rate %, Average Error, MPE Margin) use responsive grid classes:
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* KPI Card */}
  </div>
  ```
  On smartphones, cards stack cleanly in a single column with full-width clarity.

#### 5. Offline Field PWA Support on Mobile Phones
* Mobile PWA caching via Service Workers: Inspectors in remote warehouses or underground weighbridge pits can enter observations completely offline.
* Top persistent status indicator: Displays `OFFLINE (IndexedDB Buffer: 4 pending)` in amber, automatically uploading via background sync when 4G/5G/Wi-Fi connection is restored.

---

### 10.3 Accessibility (WCAG 2.1 AA)
* **Contrast Ratios**: All text tokens maintain $\ge 4.5:1$ contrast against card and background surfaces in light and dark OKLCH modes.
* **Screen Reader Live Regions (`aria-live="polite"`)**: Real-time calculation outputs ($P, E_c$, PASS/FAIL status) are wrapped in live regions so bench inspectors receive audible screen reader updates on mobile devices.
* **Keyboard & Touch Focus**: Focus rings use high-visibility Twitter Sky Blue (`ring-2 ring-ring ring-offset-2`).

---

## 11. Component Reuse Guidelines & Developer Do/Don't Rules

### 11.1 Component Reuse Matrix
* Use **`<Card>`** for all discrete analytical panels, intake forms, and summary blocks.
* Use **`<Badge>`** strictly for status tags (PASS, FAIL, Accuracy Class I–IIII, Rule Pack Version).
* Use **`<Table>`** for multi-row test observations, standard weight sets, and report repositories.

### 11.2 Developer Do's and Don'ts

```
+---------------------------------------------------------------------------------------------------+
|                                 DEVELOPER DO's & DON'TS RULES                                     |
+---------------------------------------------------------------------------------------------------+
| DO:                                                                                               |
|  ✓ DO use Tailwind CSS v4 `@theme` classes linked to `globals.css` OKLCH variables.               |
|  ✓ DO enforce `font-mono tabular-nums` for all metrological numbers and formula outputs.          |
|  ✓ DO use `--radius: 1.3rem` pill rounding (`rounded-2xl`, `rounded-3xl`) across interactive elements.|
|  ✓ DO append explicit metric units (`kg`, `g`, `°C`, `hPa`) to every measurement display.         |
|  ✓ DO wrap intermediate calculation cells in `<Tooltip>` components showing derivation steps.     |
|                                                                                                   |
| DON'T:                                                                                            |
|  ❌ DON'T introduce hardcoded hex color codes (e.g. `#1DA1F2` or `#000000`) in component code.    |
|  ❌ DON'T use arbitrary border-radius values (e.g. `rounded-none` or `rounded-xs`).               |
|  ❌ DON'T execute floating-point math in JS string outputs without rounding to scale interval $e$.  |
|  ❌ DON'T use decorative consumer gradients, drop shadows, or non-functional accent fills.        |
|  ❌ DON'T alter OIML R 76-2 form field structures or skip required metadata fields.                |
+---------------------------------------------------------------------------------------------------+
```

---

## 12. Implementation Artifact Export

This specification serves as the authoritative UI/UX design baseline for the MAANAK frontend development team. Developers should reference `globals.css` and the component mappings detailed in Sections 2, 7, and 8 during Next.js page construction.
