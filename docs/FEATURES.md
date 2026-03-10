# Links Cargo — Feature Documentation

Comprehensive documentation of all features in the Links Cargo Freight Enquiry System.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Application Structure](#application-structure)
- [Authentication & Authorization](#authentication--authorization)
- [Database Schema](#database-schema)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Overview

Links Cargo is a full-stack enquiry management system that enables:

- **Sales users** to create, edit, and view freight enquiries with full cargo and party details
- **Admin users** to access an analytics dashboard with KPIs, charts, and team performance reports
- **Role-based access** so sales users see only their enquiries while admins see all data

The application uses Supabase for authentication, PostgreSQL storage, and file storage. All data access is performed client-side via the Supabase JavaScript client.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Components | Radix UI (Select, Label, Slot), custom primitives |
| Auth & Database | Supabase (Auth, PostgreSQL, Storage) |
| Charts | Recharts |
| Utilities | xlsx (Excel export), clsx, tailwind-merge, class-variance-authority |
| Theme | next-themes (light/dark/system) |

---

## Features

### 1. Authentication

**Location:** `/login`

- **Sign in:** Email and password via Supabase Auth (`signInWithPassword`)
- **Sign up:** Email, password, and full name; stores `full_name` in user metadata
- **Email confirmation:** Required for new accounts; users must confirm before signing in
- **Session:** Cookie-based sessions via `@supabase/ssr`
- **Post-login redirect:** Authenticated users are redirected to `/enquiry`
- **Logout:** Signs out and redirects to `/login`

---

### 2. Enquiry Form (Create & Edit)

**Location:** `/enquiry`

A comprehensive form for capturing freight enquiries, organized into logical sections.

#### Reference Strip

- **Enq Ref No:** Auto-generated (display-only)
- **Receipt Date:** Date picker for when the enquiry was received

#### Core Details

- **Mode:** Air or Sea
- **Exim:** Export, Import, or Cross Trade
- **F/N:** Freehand or Nomination
- **Enquiry Type:** Local or Overseas

#### Team & Status

- **Sales Person:** Dropdown (SALES_PERSONS)
- **Branch:** Dropdown (BRANCHES)
- **Status:** WIN, LOSE, FOLLOW UP, NO FEEDBACK, PENDING, QUOTED
- **Incoterms:** CIF, DAP, DDP, FOB, etc.

#### Route & Cargo

- **POL / Origin Airport:** Searchable combobox (PORT_CITIES)
- **POD / Dest. Airport:** Searchable combobox (PORT_CITIES)
- **Container Type:** 20GP, 40HC, LCL, Reefer, etc.
- **Network:** 3F, ALNA, COOP, CROSS TRADE, NON NETWORK, UOL

#### Parties

- **Shipper:** Text input
- **Consignee:** Text input
- **Agent Name:** Text input
- **Country:** Searchable combobox (COUNTRIES)

#### Info & Details

- **Shipment Awarded To:** Agent or carrier awarded (stored in `email_subject_line`)
- **Remarks:** Multi-line text area
- **MBL / AWB No:** Master Bill of Lading or Air Waybill number
- **Job / Invoice No:** Job or invoice reference

#### Assignment & Tracking

- **GOP:** General Operating Procedure reference
- **Assigned User:** Employee name for follow-up
- **Quotation Given Date:** Date when quotation was provided

#### Rate Attachments

- **Buy Rate:** File upload (PDF, XLSX, XLS, PNG, JPG, JPEG)
- **Sell Rate:** File upload (same formats)
- Files are stored in Supabase Storage bucket `enquiry-files`
- Path format: `{userId}/{timestamp}-{filename}`
- Existing attachments can be downloaded via signed URLs (60-second expiry)

#### Form Behavior

- **Validation:** Required fields enforced; inline error messages
- **Edit mode:** Loaded via `?edit=<id>`; form pre-filled from enquiry record
- **Reset:** Clears form and restores defaults or edit data
- **Cancel Edit:** Exits edit mode and returns to new enquiry state
- **Submit / Update:** Inserts or updates enquiry; `created_by` set on insert

---

### 3. Recent Enquiries

**Location:** `/enquiry` (below the form)

- Shows the **last 5 enquiries** created by the current user
- **Search:** Client-side search across all visible fields
- **Columns:** Enq No, Date, Shipper, Consignee, Sales Person, Branch, Remarks, Status
- **Click Enq No:** Navigates to `/enquiry?edit=<id>` to edit
- **Status badges:** Color-coded (success, danger, warning, info, secondary)
- **Refresh:** List refreshes when a new enquiry is submitted or updated

---

### 4. Enquiry List (Full List)

**Location:** `/enquiries`

- **Paginated table:** 20 rows per page with page navigation
- **Search:** Client-side search across all columns
- **Columns:** Enq No, Date, Shipper, Consignee, Sales Person, Branch, Remarks, Status
- **Data scope:**
  - **Sales users:** Only enquiries they created (`created_by = user.id`)
  - **Admin users:** All enquiries
- **Click Enq No:** Navigates to `/enquiry?edit=<id>`
- **Status badges:** Same color scheme as Recent Enquiries

---

### 5. Admin Dashboard

**Location:** `/dashboard` (admin role only)

Analytics overview with filters, KPI cards, charts, and team performance reports.

#### Dashboard Filters

- **Period:** All Time, This Month, Last Month, Last 3 Months, Last 6 Months, This Year
- **Mode:** All, Air, Sea
- **Branch:** All or specific branch (Mumbai, New Delhi, Madras, etc.)
- **Type:** All, Local, Overseas

#### Stats Cards (KPIs)

Four cards with current-period values and period-over-period deltas:

1. **Total Enquiries:** Count for selected period; "All time" when period is All Time
2. **Won:** Count and win rate percentage; delta vs previous period
3. **Lost:** Count and lose rate percentage; delta vs previous period
4. **In Progress:** Follow-up + pending enquiries; delta vs previous period

Deltas show percentage change with up/down indicators (green for positive, red for negative).

#### Charts

1. **Monthly Enquiries:** Bar chart of Air vs Sea by month
2. **Enquiries by Sales Person:** Top 10 sales persons by enquiry count
3. **Local vs Overseas:** Breakdown by enquiry type
4. **Export / Import / Cross Trade:** Breakdown by exim type

#### Team Performance

**Sales Leaderboard**

- Table of all sales persons with:
  - Rank badge (1st, 2nd, 3rd highlighted)
  - Total enquiries
  - Won / Lost / Active counts
  - Win rate percentage (color-coded: green 60%+, amber 35%+, red below 35%)
- Sorted by win rate, then won count, then total
- Respects dashboard filters (period, mode, branch, type)

**Slacking Report (Overdue Follow-ups)**

- Lists enquiries with `assigned_user` and `assigned_date` set that are:
  - Not WIN or LOSE
  - Overdue by configurable threshold (default 3 days)
- **Urgency levels:**
  - **Critical:** 8+ days overdue (red highlight)
  - **Warning:** 4-7 days overdue (amber highlight)
  - **New:** 3 days overdue (yellow highlight)
- **Columns:** Enq No, Assigned User, Assigned Date, Days Pending, Status, Branch, POL, POD, Sales Person
- **Export to Excel:** Downloads XLSX with all overdue items
- Sorted by days pending (most overdue first)

---

### 6. Layout & Navigation

**Protected Layout** (all routes except `/login`)

- **Header:** Links Cargo branding, user display name, branch, logout button
- **Sidebar:** Hover-expand navigation
  - New Enquiry to `/enquiry`
  - Recent Enquiries to `/enquiries`
  - Dashboard to `/dashboard` (admin only)
  - Theme toggle (light/dark) at bottom
- **Main content:** Scrollable area for page content

---

### 7. Dropdown Data Sources

All dropdown options are defined in `lib/constants/dropdowns.ts`:

| Constant | Use |
|----------|-----|
| SALES_PERSONS | Sales person selector |
| FN_OPTIONS | Freehand / Nomination |
| BRANCHES | Branch selector |
| NETWORKS | Network selector |
| CONTAINER_TYPES | Container type selector |
| STATUSES | Enquiry status |
| INCOTERMS | Incoterms selector |
| COUNTRIES | Country combobox (searchable) |
| PORT_CITIES | POL / POD comboboxes (searchable) |
| AGENTS | Available for future use |

Searchable comboboxes (Country, POL, POD) filter options as the user types and support scrolling through long lists.

---

## Application Structure

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Redirects to `/enquiry` |
| `/login` | Public | Sign in / sign up |
| `/enquiry` | Protected | New enquiry form + recent enquiries; supports `?edit=<id>` |
| `/enquiries` | Protected | Full enquiry list with pagination and search |
| `/dashboard` | Admin only | Analytics dashboard |

---

## Authentication & Authorization

### Flow

1. Unauthenticated users visiting any protected route are redirected to `/login`
2. Authenticated users visiting `/login` are redirected to `/enquiry`
3. Protected layout loads `user_profiles` for role, display name, and branch
4. Dashboard access is restricted: only users with `role = 'admin'` can access `/dashboard`
5. Sales users attempting `/dashboard` are redirected to `/enquiry`

### Middleware

Session refresh and route protection are handled by `lib/supabase/middleware.ts` via `updateSession`. For Next.js to use this, ensure a root-level `middleware.ts` exists that exports the middleware as default (e.g. re-export from `proxy.ts` if that file contains the matcher config).

---

## Database Schema

### Table: enquiries

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| enq_ref_no | text | Auto-generated reference |
| enq_receipt_date | date | |
| enq_type | text | Local, Overseas |
| mode | text | Air, Sea |
| exim | text | Export, Import, Cross Trade |
| fn | text | FREEHAND, NOMINATION |
| sales_person | text | |
| agent_name | text | |
| country | text | |
| branch | text | |
| network | text | |
| pol | text | Port of loading |
| pod | text | Port of discharge |
| incoterms | text | |
| container_type | text | |
| status | text | WIN, LOSE, FOLLOW UP, NO FEEDBACK, PENDING, QUOTED |
| email_subject_line | text | Shipment Awarded To |
| shipper | text | |
| consignee | text | |
| remarks | text | |
| mbl_awb_no | text | |
| job_invoice_no | text | |
| gop | text | |
| assigned_user | text | |
| assigned_date | date | |
| buy_rate_file | text | Storage path |
| sell_rate_file | text | Storage path |
| created_by | uuid | FK to auth.users |
| created_at | timestamp | |

### Table: user_profiles

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, FK to auth.users |
| role | text | admin, sales |
| full_name | text | |
| branch | text | |
| email | text | |

### Storage

- **Bucket:** enquiry-files
- **Path pattern:** {userId}/{timestamp}-{filename}
- **Allowed types:** PDF, XLSX, XLS, PNG, JPG, JPEG

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase project

### Steps

1. Clone the repository and run `npm install`
2. Create a Supabase project and set up `enquiries` and `user_profiles` tables
3. Configure Row Level Security (RLS) as needed
4. Create `enquiry-files` storage bucket with appropriate policies
5. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Run `npm run dev` and open http://localhost:3000

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Supabase anonymous (public) key |

---

## Project Structure

- `app/` — Next.js App Router pages and layouts
- `components/` — React components (enquiry, dashboard, layout, ui)
- `lib/` — Supabase clients, constants, utilities
- `proxy.ts` — Middleware entry point
