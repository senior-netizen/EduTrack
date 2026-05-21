# EduTrack — Design System & UI Specification
## Design Language v1.0

> **Inspiration blend:**
> - **Layout & Navigation** → Linear (minimal, keyboard-first, fast-feeling sidebar)
> - **Tables & Data Screens** → Stripe (dense, readable, financial-grade clarity)
> - **Color & Brand Warmth** → Paystack (trustworthy greens, approachable, African market)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Grid](#4-spacing--grid)
5. [Navigation & Layout](#5-navigation--layout-linear)
6. [Component Library](#6-component-library)
7. [Tables & Data Display](#7-tables--data-display-stripe)
8. [Forms & Inputs](#8-forms--inputs)
9. [Icons & Imagery](#9-icons--imagery)
10. [Motion & Animation](#10-motion--animation)
11. [Dark Mode](#11-dark-mode)
12. [Responsive Breakpoints](#12-responsive-breakpoints)
13. [Screen-by-Screen Guide](#13-screen-by-screen-guide)
14. [Tailwind Config](#14-tailwind-config)
15. [CSS Variables](#15-css-variables)

---

## 1. Design Philosophy

### The Three Lenses

| Lens | Source | What We Steal |
|---|---|---|
| **Structure** | Linear | Sidebar-first navigation, command palette, keyboard shortcuts, tight information density without clutter |
| **Data** | Stripe | Table design, financial row layouts, status badges, monospace numbers, hover states on rows |
| **Warmth** | Paystack | Brand green as primary, rounded friendly buttons, onboarding illustrations, subtle gradients |

### Core Principles

**1. Speed over decoration**
Every screen should feel fast to navigate. No splash screens, no heavy animations on core workflows. Teachers taking attendance or bursars entering payments should feel zero friction.

**2. Data is the hero**
Tables, charts, and numbers are the product. Never hide data behind unnecessary clicks. Show the most important number on every screen at a glance.

**3. Calm confidence**
The UI should feel authoritative but not intimidating. Schools are high-stakes environments — the software should feel reliable, like a well-printed register book, not a flashy app.

**4. Progressive disclosure**
Simple by default, powerful when needed. A new user sees clean defaults. An experienced admin discovers filters, bulk actions, keyboard shortcuts over time.

---

## 2. Color System

### Primary Palette (Paystack-inspired)

```css
/* Brand Greens */
--color-brand-50:  #F0FDF4;   /* Lightest tint, backgrounds */
--color-brand-100: #DCFCE7;   /* Hover backgrounds */
--color-brand-200: #BBF7D0;   /* Borders, dividers */
--color-brand-300: #86EFAC;   /* Disabled states */
--color-brand-400: #4ADE80;   /* Light accent */
--color-brand-500: #22C55E;   /* Primary brand (main green) */
--color-brand-600: #16A34A;   /* Primary buttons, links */
--color-brand-700: #15803D;   /* Hover on buttons */
--color-brand-800: #166534;   /* Dark accent */
--color-brand-900: #14532D;   /* Darkest, headings on light */
```

### Neutral Palette (Linear-inspired)

```css
/* Near-blacks and grays — Linear's signature cool neutrals */
--color-neutral-0:   #FFFFFF;
--color-neutral-50:  #FAFAFA;   /* Page background */
--color-neutral-100: #F4F4F5;   /* Card backgrounds */
--color-neutral-200: #E4E4E7;   /* Borders */
--color-neutral-300: #D1D1D6;   /* Dividers */
--color-neutral-400: #A1A1AA;   /* Placeholder text */
--color-neutral-500: #71717A;   /* Secondary text */
--color-neutral-600: #52525B;   /* Body text */
--color-neutral-700: #3F3F46;   /* Strong body text */
--color-neutral-800: #27272A;   /* Headings */
--color-neutral-900: #18181B;   /* Near-black, sidebar bg */
--color-neutral-950: #09090B;   /* True black */
```

### Semantic Colors

```css
/* Status & Feedback */
--color-success-bg:   #F0FDF4;
--color-success-text: #15803D;
--color-success-border: #86EFAC;

--color-warning-bg:   #FFFBEB;
--color-warning-text: #B45309;
--color-warning-border: #FCD34D;

--color-error-bg:     #FEF2F2;
--color-error-text:   #DC2626;
--color-error-border: #FCA5A5;

--color-info-bg:      #EFF6FF;
--color-info-text:    #1D4ED8;
--color-info-border:  #93C5FD;
```

### Surface Palette

```css
--surface-page:       var(--color-neutral-50);   /* Main content area */
--surface-card:       var(--color-neutral-0);    /* Cards, panels */
--surface-elevated:   var(--color-neutral-0);    /* Modals, dropdowns */
--surface-sidebar:    var(--color-neutral-900);  /* Sidebar (dark) */
--surface-sidebar-hover: #27272A;
--surface-input:      var(--color-neutral-0);

--border-default:     var(--color-neutral-200);
--border-strong:      var(--color-neutral-300);
--border-focus:       var(--color-brand-500);
```

### Color Usage Rules

- **Brand green** only for: primary CTAs, active nav items, success states, key metrics
- **Never** use green for destructive actions — always use `--color-error-*`
- **Sidebar** is always dark (`neutral-900`) regardless of light/dark mode preference
- **Numbers** (fees, marks, counts) use `neutral-900` weight — make them feel important
- **Avoid** blue as a primary action color — it's reserved for links and info states only

---

## 3. Typography

### Font Stack

```css
/* Display / Headings — Distinctive, authoritative */
--font-display: 'DM Sans', sans-serif;

/* Body / UI — Clean, readable at small sizes */
--font-body: 'Inter', sans-serif;

/* Monospace — For IDs, numbers, codes */
--font-mono: 'JetBrains Mono', monospace;
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `text-xs` | 11px | 400 | 1.5 | Labels, badges, helper text |
| `text-sm` | 13px | 400 | 1.5 | Table cells, secondary info |
| `text-base` | 14px | 400 | 1.6 | Body text, form labels |
| `text-md` | 15px | 500 | 1.5 | Emphasized body, nav items |
| `text-lg` | 17px | 600 | 1.4 | Card headings, section titles |
| `text-xl` | 20px | 600 | 1.3 | Page section headings |
| `text-2xl` | 24px | 700 | 1.2 | Page titles |
| `text-3xl` | 30px | 700 | 1.15 | Dashboard stat numbers |
| `text-4xl` | 36px | 700 | 1.1 | Hero numbers |

### Typography Rules

- **Base font size is 14px** (not 16px) — matching Linear's dense information layout
- **Heading font (DM Sans)** for all h1–h3, stat numbers, card titles
- **Body font (Inter)** for paragraphs, labels, table cells, navigation
- **Mono font (JetBrains Mono)** for: Student IDs, receipt numbers, amounts in tables, fee codes
- Never go below 11px
- Line clamp table cells to 1 line — overflow ellipsis

---

## 4. Spacing & Grid

### Base Unit: 4px

```
4px   = space-1   (tight: icon padding, badge padding)
8px   = space-2   (small: between label and input)
12px  = space-3   (default: inner card padding compact)
16px  = space-4   (medium: card padding, list item gap)
20px  = space-5   (comfortable: section gaps)
24px  = space-6   (large: between cards)
32px  = space-8   (xl: page section separation)
48px  = space-12  (2xl: hero spacing)
```

### Page Layout Grid

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content Area        │
│  Dark bg (neutral-900)  │  Scrollable               │
│                         │  ┌─────────────────────┐  │
│  [Logo]                 │  │ Page Header (56px)  │  │
│                         │  ├─────────────────────┤  │
│  [Nav items]            │  │                     │  │
│                         │  │  Content (fluid)    │  │
│  [Sections]             │  │                     │  │
│                         │  │                     │  │
│  [User profile]         │  └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Content Width Constraints

```css
--content-max-width:    1280px;   /* Maximum page content width */
--content-padding-x:    32px;     /* Horizontal page padding */
--content-padding-y:    24px;     /* Vertical page padding */
--card-gap:             16px;     /* Gap between stat cards */
```

---

## 5. Navigation & Layout (Linear)

### Sidebar Structure

```
┌──────────────────────────┐
│  🎓 EduTrack      [⌘K]  │  ← Logo + Command palette shortcut
├──────────────────────────┤
│  ◉ Dashboard             │  ← Active state: brand-green dot + bg
│  ○ Students              │
│  ○ Classes               │
│  ○ Attendance            │
│  ○ Examinations          │
│  ○ Fees                  │
│  ○ Staff                 │
│  ○ Reports               │
├──────────────────────────┤
│  ADMINISTRATION          │  ← Section label (10px uppercase, neutral-500)
│  ○ Library               │
│  ○ Timetable             │
│  ○ Announcements         │
├──────────────────────────┤
│  SETTINGS                │
│  ○ School Settings       │
│  ○ User Management       │
└──────────────────────────┘
│  [Avatar] John Moyo      │  ← Bottom-pinned user profile
│  School Admin    [•••]   │
└──────────────────────────┘
```

### Sidebar Specs

```css
.sidebar {
  width: 240px;
  background: var(--color-neutral-900);
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 16px 12px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--color-neutral-400);
  cursor: pointer;
  transition: all 0.1s ease;
}

.sidebar-nav-item:hover {
  background: var(--surface-sidebar-hover);
  color: var(--color-neutral-100);
}

.sidebar-nav-item.active {
  background: rgba(34, 197, 94, 0.12);  /* brand green tint */
  color: var(--color-brand-400);
}

.sidebar-section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  padding: 12px 10px 4px;
}
```

### Command Palette (Linear-style)

Triggered by `Cmd/Ctrl + K`. Floating modal, centered, searches across:
- Students (by name, ID)
- Navigation items
- Actions ("Add student", "Record payment", "Take attendance")
- Recent pages

```css
.command-palette {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 560px;
  background: var(--color-neutral-0);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  overflow: hidden;
}
```

### Page Header

Every page has a consistent header:

```
┌────────────────────────────────────────────────────────┐
│  Students          [+ Add Student]  [⬆ Import CSV]     │
│  1,247 students · Form 1–6 · 2024 Academic Year        │
└────────────────────────────────────────────────────────┘
```

```css
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 32px 20px;
  border-bottom: 1px solid var(--border-default);
  background: var(--surface-card);
}

.page-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-neutral-900);
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-neutral-500);
  margin-top: 2px;
}
```

---

## 6. Component Library

### Buttons

```css
/* Primary — Brand green (Paystack warmth) */
.btn-primary {
  background: var(--color-brand-600);
  color: white;
  padding: 8px 16px;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.btn-primary:hover {
  background: var(--color-brand-700);
  box-shadow: 0 1px 3px rgba(22,163,74,0.3);
}

/* Secondary — Ghost style */
.btn-secondary {
  background: transparent;
  color: var(--color-neutral-700);
  padding: 8px 14px;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 500;
  border: 1px solid var(--border-default);
}
.btn-secondary:hover {
  background: var(--color-neutral-100);
  border-color: var(--border-strong);
}

/* Danger */
.btn-danger {
  background: var(--color-error-bg);
  color: var(--color-error-text);
  border: 1px solid var(--color-error-border);
  padding: 8px 14px;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 600;
}

/* Sizes */
.btn-sm  { padding: 5px 10px; font-size: 12px; border-radius: 5px; }
.btn-md  { padding: 8px 16px; font-size: 13.5px; }  /* default */
.btn-lg  { padding: 10px 22px; font-size: 15px; border-radius: 8px; }
```

### Status Badges

```css
/* Base badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.badge-active    { background: #DCFCE7; color: #15803D; }
.badge-inactive  { background: #F4F4F5; color: #52525B; }
.badge-suspended { background: #FFFBEB; color: #B45309; }
.badge-transferred { background: #EFF6FF; color: #1D4ED8; }
.badge-overdue   { background: #FEF2F2; color: #DC2626; }
.badge-paid      { background: #DCFCE7; color: #15803D; }
.badge-partial   { background: #FFFBEB; color: #B45309; }
```

### Stat Cards (Dashboard)

```
┌───────────────────────────┐
│  Total Students      ↑ 3% │
│                           │
│  1,247                    │  ← Large monospace number
│                           │
│  ████░░░░░░  vs last term │  ← Sparkline
└───────────────────────────┘
```

```css
.stat-card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 20px;
  min-width: 200px;
}

.stat-card-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-neutral-500);
}

.stat-card-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--color-neutral-900);
  line-height: 1.1;
  margin: 8px 0 4px;
}

.stat-card-delta {
  font-size: 12px;
  font-weight: 600;
}
.stat-card-delta.positive { color: var(--color-brand-600); }
.stat-card-delta.negative { color: var(--color-error-text); }
```

### Cards

```css
.card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-neutral-800);
}
```

### Tabs (Linear-style pill tabs)

```css
.tabs {
  display: flex;
  gap: 2px;
  background: var(--color-neutral-100);
  padding: 3px;
  border-radius: 8px;
  width: fit-content;
}

.tab {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-500);
  cursor: pointer;
  transition: all 0.1s ease;
}

.tab.active {
  background: var(--surface-card);
  color: var(--color-neutral-900);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
```

---

## 7. Tables & Data Display (Stripe)

### Table Anatomy

```
┌──────────────────────────────────────────────────────────────────┐
│  [Search...]   [Class ▾]  [Status ▾]  [Term ▾]      [Export ▾]  │  ← Filter bar
├──────────────────────────────────────────────────────────────────┤
│  □  STUDENT          CLASS    GUARDIAN PHONE   STATUS    BALANCE  │  ← Header row
├──────────────────────────────────────────────────────────────────┤
│  □  [●] John Moyo    Form 2A  +263 77…  ●Active   USD 0.00      │  ← Data rows
│  □  [●] Tafadzwa C.  Form 3B  +263 77…  ⚠ Partial  USD 120.00  │
│  □  [●] Rudo Nyathi  Form 1C  +263 77…  ●Active   USD 0.00      │
├──────────────────────────────────────────────────────────────────┤
│  Showing 1–25 of 1,247  ← Prev  1  2  3 … 50  Next →           │  ← Pagination
└──────────────────────────────────────────────────────────────────┘
```

### Table CSS

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.data-table thead th {
  padding: 10px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-neutral-500);
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--border-default);
  white-space: nowrap;
}

.data-table tbody tr {
  border-bottom: 1px solid var(--border-default);
  transition: background 0.1s ease;
  cursor: pointer;
}

.data-table tbody tr:hover {
  background: var(--color-neutral-50);
}

.data-table tbody td {
  padding: 12px 16px;
  color: var(--color-neutral-700);
  vertical-align: middle;
}

/* Student name column */
.table-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: var(--color-neutral-900);
}

/* Numeric columns (Stripe-style monospace amounts) */
.table-amount {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  text-align: right;
  color: var(--color-neutral-900);
}

.table-amount.overdue {
  color: var(--color-error-text);
  font-weight: 600;
}

/* ID column */
.table-id {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-neutral-500);
}
```

### Filter Bar

```css
.table-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-default);
  background: var(--surface-card);
}

.filter-search {
  flex: 1;
  max-width: 280px;
  padding: 7px 12px 7px 34px;  /* left pad for search icon */
  border: 1px solid var(--border-default);
  border-radius: 7px;
  font-size: 13.5px;
  background: var(--color-neutral-50);
  color: var(--color-neutral-800);
}

.filter-search:focus {
  outline: none;
  border-color: var(--color-brand-500);
  background: white;
  box-shadow: 0 0 0 3px rgba(34,197,94,0.1);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-600);
  background: var(--surface-card);
  cursor: pointer;
}

.filter-chip:hover {
  border-color: var(--border-strong);
  color: var(--color-neutral-900);
}

.filter-chip.active {
  border-color: var(--color-brand-500);
  color: var(--color-brand-700);
  background: var(--color-brand-50);
}
```

### Row Actions (Stripe-style hover reveal)

```css
/* Actions column is hidden until row hover */
.table-row-actions {
  opacity: 0;
  transition: opacity 0.1s ease;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

tr:hover .table-row-actions {
  opacity: 1;
}

.row-action-btn {
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-default);
  background: var(--surface-card);
  color: var(--color-neutral-600);
  cursor: pointer;
}

.row-action-btn:hover {
  background: var(--color-neutral-100);
  color: var(--color-neutral-900);
}
```

---

## 8. Forms & Inputs

### Input Fields

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-700);
}

.form-label .required {
  color: var(--color-error-text);
  margin-left: 2px;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  font-size: 14px;
  color: var(--color-neutral-900);
  background: var(--surface-input);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  width: 100%;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-brand-500);
  box-shadow: 0 0 0 3px rgba(34,197,94,0.12);
}

.form-input:disabled {
  background: var(--color-neutral-100);
  color: var(--color-neutral-400);
  cursor: not-allowed;
}

.form-input.error {
  border-color: var(--color-error-text);
  box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
}

.form-helper {
  font-size: 12px;
  color: var(--color-neutral-500);
}

.form-error {
  font-size: 12px;
  color: var(--color-error-text);
  display: flex;
  align-items: center;
  gap: 4px;
}
```

### Form Layout Patterns

```
/* Two-column form grid (for enrollment forms, staff forms) */
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}

/* Full-width field override */
.form-grid-2 .span-2 {
  grid-column: span 2;
}

/* Form sections */
.form-section {
  margin-bottom: 32px;
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-neutral-500);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-default);
}
```

### Slide-over Panel (Linear-style drawer for edit forms)

```css
.slideover {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 520px;
  background: var(--surface-card);
  border-left: 1px solid var(--border-default);
  box-shadow: -8px 0 32px rgba(0,0,0,0.08);
  transform: translateX(100%);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 50;
  overflow-y: auto;
}

.slideover.open {
  transform: translateX(0);
}
```

---

## 9. Icons & Imagery

### Icon System
Use **Lucide React** exclusively. Size guide:
- **12px** — inline in badges, table cells
- **16px** — nav items, button icons (default)
- **20px** — card headers, section icons
- **24px** — empty states, feature icons

### Avatar / Student Photo

```css
.avatar {
  border-radius: 50%;
  object-fit: cover;
  background: var(--color-brand-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-brand-700);
  flex-shrink: 0;
}

.avatar-sm  { width: 24px;  height: 24px;  font-size: 10px; }
.avatar-md  { width: 32px;  height: 32px;  font-size: 13px; }  /* default */
.avatar-lg  { width: 40px;  height: 40px;  font-size: 15px; }
.avatar-xl  { width: 56px;  height: 56px;  font-size: 20px; }
```

### Empty States

Every empty table or list needs an illustration + copy:

```
        [Icon 48px, neutral-300]
        No students found
        Try adjusting your filters or add a new student.
        [+ Add Student]  (primary button)
```

---

## 10. Motion & Animation

### Principles
- Transitions are **functional**, not decorative — they show state changes
- Max duration: **200ms** for micro-interactions, **300ms** for panels/modals
- Use `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) as default easing

### Standard Transitions

```css
/* All interactive elements */
transition-property: background-color, border-color, color, box-shadow, opacity, transform;
transition-duration: 150ms;
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

/* Slide-over panel */
transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);

/* Modal backdrop */
transition: opacity 180ms ease;

/* Page section fade-in on load */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-content { animation: fadeUp 200ms ease forwards; }
```

### Loading States

```css
/* Skeleton loader — matches table row height */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-neutral-100) 25%,
    var(--color-neutral-200) 50%,
    var(--color-neutral-100) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
```

---

## 11. Dark Mode

EduTrack supports dark mode via a `data-theme="dark"` attribute on `<html>`.

### Dark Surface Tokens

```css
[data-theme="dark"] {
  --surface-page:     #0F0F10;
  --surface-card:     #18181B;
  --surface-elevated: #27272A;
  --surface-input:    #18181B;

  --border-default:   rgba(255,255,255,0.08);
  --border-strong:    rgba(255,255,255,0.14);

  --color-neutral-900: #FAFAFA;   /* Flip: dark text becomes light */
  --color-neutral-800: #F4F4F5;
  --color-neutral-700: #E4E4E7;
  --color-neutral-600: #D1D1D6;
  --color-neutral-500: #A1A1AA;
}
```

> **Note:** The sidebar stays dark in both modes — it is always `#18181B` or deeper.

---

## 12. Responsive Breakpoints

```css
/* Mobile first */
--breakpoint-sm:  640px;   /* Large phones */
--breakpoint-md:  768px;   /* Tablets */
--breakpoint-lg:  1024px;  /* Laptop */
--breakpoint-xl:  1280px;  /* Desktop */
--breakpoint-2xl: 1536px;  /* Large desktop */
```

### Responsive Sidebar Behavior

| Breakpoint | Sidebar |
|---|---|
| < 768px | Hidden, opens as overlay drawer via hamburger menu |
| 768px–1024px | Collapsed to icons only (48px wide) |
| > 1024px | Full sidebar (240px) always visible |

### Table Responsiveness

On mobile (< 768px):
- Hide non-essential columns (keep: name, status, one key metric)
- Replace table with card-list layout
- Filter bar stacks vertically
- Bulk actions collapse into a single `•••` menu

---

## 13. Screen-by-Screen Guide

### Dashboard
- **4 stat cards** top row: Total Students, Today's Attendance %, Fee Collection Rate, Exams This Week
- **2 charts** below: Enrollment by Class (bar), Fee Collection vs Arrears (line, last 6 months)
- **2 activity feeds** right column: Recent Payments, Absent Students Today
- Stat cards use `text-3xl` monospace numbers, brand-green delta indicators

### Students List
- Filter bar: search by name/ID, filter by class, status, fee status
- Table columns: checkbox, photo+name, student ID, class, guardian phone, status badge, fee balance, actions
- Bulk actions bar appears when checkboxes selected: SMS, Change Class, Export, Suspend
- Click row → opens slide-over with student summary + tabs (Profile, Academics, Fees, Attendance)

### Student Profile (Slide-over or full page)
- Hero section: large avatar, name, Student ID (mono), class, status badge
- 4 tabs: Overview, Grades, Fees, Attendance
- Overview: guardian info, medical notes, enrollment date, documents

### Attendance
- Class selector prominently at top
- Date picker defaults to today
- Student list with toggle buttons (P/A/L/E) per student
- Progress bar: "23 / 30 marked"
- Submit button with confirmation
- History tab: calendar heatmap per student

### Fee Management (Stripe-inspired)
- Summary bar: Total Billed, Total Collected, Outstanding (3 stats)
- Table: student, class, term, total billed, paid, balance, last payment date, status
- Balance column: monospace, red if overdue, green if paid
- Click row → fee account detail: invoice list, payment history, record payment form
- "Send Reminder" button per row or bulk

### Report Cards
- Select term → class → generates preview
- PDF preview in-browser before download
- Bulk download all report cards as ZIP
- School letterhead, logo, signature field

### Examinations
- Exam list with status: Draft / Published / Results In
- Mark entry: spreadsheet-like grid — student rows × subject columns
- Color-coded cells: green (pass), yellow (borderline), red (fail)
- Auto-save on blur
- Publish button sends notifications to parents

---

## 14. Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        neutral: {
          950: '#09090B',
        }
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        xs:   ['11px', { lineHeight: '1.5' }],
        sm:   ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.6' }],
        md:   ['15px', { lineHeight: '1.5' }],
        lg:   ['17px', { lineHeight: '1.4' }],
        xl:   ['20px', { lineHeight: '1.3' }],
        '2xl':['24px', { lineHeight: '1.2' }],
        '3xl':['30px', { lineHeight: '1.15' }],
        '4xl':['36px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        DEFAULT: '7px',
        sm:  '5px',
        md:  '7px',
        lg:  '10px',
        xl:  '14px',
        '2xl': '18px',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        panel:  '0 4px 16px rgba(0,0,0,0.08)',
        modal:  '0 20px 60px rgba(0,0,0,0.14)',
        focus:  '0 0 0 3px rgba(34,197,94,0.12)',
      },
      animation: {
        'fade-up':  'fadeUp 200ms ease forwards',
        'shimmer':  'shimmer 1.4s ease infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ]
}
```

---

## 15. CSS Variables

Full token sheet to paste into your global CSS (`globals.css`):

```css
:root {
  /* Brand */
  --color-brand-50:  #F0FDF4;
  --color-brand-100: #DCFCE7;
  --color-brand-200: #BBF7D0;
  --color-brand-300: #86EFAC;
  --color-brand-400: #4ADE80;
  --color-brand-500: #22C55E;
  --color-brand-600: #16A34A;
  --color-brand-700: #15803D;
  --color-brand-800: #166534;
  --color-brand-900: #14532D;

  /* Neutrals */
  --color-neutral-0:   #FFFFFF;
  --color-neutral-50:  #FAFAFA;
  --color-neutral-100: #F4F4F5;
  --color-neutral-200: #E4E4E7;
  --color-neutral-300: #D1D1D6;
  --color-neutral-400: #A1A1AA;
  --color-neutral-500: #71717A;
  --color-neutral-600: #52525B;
  --color-neutral-700: #3F3F46;
  --color-neutral-800: #27272A;
  --color-neutral-900: #18181B;
  --color-neutral-950: #09090B;

  /* Semantic */
  --color-success-bg:     #F0FDF4;
  --color-success-text:   #15803D;
  --color-success-border: #86EFAC;
  --color-warning-bg:     #FFFBEB;
  --color-warning-text:   #B45309;
  --color-warning-border: #FCD34D;
  --color-error-bg:       #FEF2F2;
  --color-error-text:     #DC2626;
  --color-error-border:   #FCA5A5;
  --color-info-bg:        #EFF6FF;
  --color-info-text:      #1D4ED8;
  --color-info-border:    #93C5FD;

  /* Surfaces */
  --surface-page:     #FAFAFA;
  --surface-card:     #FFFFFF;
  --surface-elevated: #FFFFFF;
  --surface-sidebar:  #18181B;
  --surface-input:    #FFFFFF;

  /* Borders */
  --border-default: #E4E4E7;
  --border-strong:  #D1D1D6;
  --border-focus:   #22C55E;

  /* Typography */
  --font-display: 'DM Sans', sans-serif;
  --font-body:    'Inter', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* Spacing */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-5: 20px;  --space-6: 24px;
  --space-8: 32px;  --space-12: 48px;

  /* Layout */
  --sidebar-width:      240px;
  --sidebar-collapsed:  48px;
  --content-max-width:  1280px;
  --content-padding-x:  32px;
  --page-header-height: 60px;

  /* Radius */
  --radius-sm:  5px;
  --radius-md:  7px;
  --radius-lg:  10px;
  --radius-xl:  14px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-panel: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-modal: 0 20px 60px rgba(0,0,0,0.14);
  --shadow-focus: 0 0 0 3px rgba(34,197,94,0.12);
}

/* Dark mode overrides */
[data-theme="dark"] {
  --surface-page:     #0F0F10;
  --surface-card:     #18181B;
  --surface-elevated: #27272A;
  --surface-input:    #18181B;
  --border-default:   rgba(255,255,255,0.08);
  --border-strong:    rgba(255,255,255,0.14);
}
```

---

*EduTrack Design System v1.0*
*Inspired by Linear (layout) · Stripe (tables) · Paystack (brand)*
