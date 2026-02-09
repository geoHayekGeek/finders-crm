# Import Leads from Excel / CSV

This document describes the **Import Leads** feature: supported file format, template headers, mapping rules, and API usage.

## Overview

- **Endpoint:** `POST /api/leads/import`
- **Auth:** Required (JWT).
- **Permissions:** Admin, Operations Manager, Operations, Agent Manager only (agents and team leaders cannot import).
- **File:** Multipart form field `file`; accepted types: `.xlsx`, `.csv` (max 10MB).

## Excel / CSV Template

### Sheet name (XLSX)

- Use a sheet named **"Customers"** for best compatibility. If missing, the first sheet is used and a warning is returned.

### Headers (exact or case-insensitive)

| Column        | Required | Description                                      |
|---------------|----------|--------------------------------------------------|
| Date          | No       | Lead date (Excel date or YYYY-MM-DD / DD/MM/YYYY)|
| Customer Name | **Yes**  | Full name; internal spaces collapsed             |
| Phone Number  | **Yes**  | Lebanon format supported (03/729646 → +961…)     |
| Agent Name    | No       | Matched to users; fallback stored if no match    |
| Price         | No       | Decimal; commas allowed                          |
| Source        | No       | Mapped to reference_sources; missing/unknown → null |
| Operations    | **Yes**  | Initials (MA/EW/GC) or full name → added_by_id   |

### Ignored columns

- **"Code "** (with or without trailing space)  
- **"Reference"**  
- Empty spacer columns  

These are not stored in the database.

## Mapping Rules

### Date

- Accepts Excel date serials, `YYYY-MM-DD`, or `DD/MM/YYYY`.
- Normalized to `YYYY-MM-DD`. If missing or invalid, defaults to **today** and a warning is added.

### Customer Name

- Trimmed and internal whitespace collapsed.
- **Required.** Missing or empty → row **error** (not imported).

### Phone Number

- Non-digits removed. Lebanon rules:
  - Starts with `0` and 7–8 digits → `+961` + digits without leading 0 (e.g. `03/729646` → `+9613729646`, `76/321434` → `+96176321434`).
  - Already starts with `961` → prefix `+` if missing.
- **Required.** Invalid or too short → row **error**.

### Price

- Parsed as decimal; commas allowed. Missing or invalid → stored as `NULL` and a warning is added.

### Source → reference_sources

- Synonyms (case-insensitive):  
  **FB, FACEBOOK** → Facebook; **INSTA, IG, INSTAGRAM** → Instagram; **DUBBIZLE, DUBIZZLE** → Dubizzle; **WEBSITE, WEB** → Website; **OLX** → OLX.
- If the mapped name does not exist in the DB:
  - Users who can manage leads (admin, operations manager, operations, agent manager) **can create** the source.
  - Otherwise the system falls back to an existing “Other”/“External” source if present.
- If source is missing or cannot be resolved, the lead is still imported with `reference_source_id` = null and a warning is added.

### Operations → added_by_id (required)

- Treated as **initials** (e.g. MA, EW, GC) or **full name** if the value contains a space.
- Matching: `user_code` or initials from `name` (first + last initial).
- If multiple matches: prefer role order **operations_manager > operations > admin > agent_manager > team_leader > agent**, then most recent `updated_at`, then lowest `id`.
- If **no match:** `added_by_id` is set to the **current user** (importer), a warning “Ops: &lt;value&gt; (not in system)” is added, and a lead note is stored with the original operations value.

### Agent Name → agent_id / agent_name

- Fuzzy match (e.g. Jaro–Winkler / Levenshtein) against users who can be assigned leads; threshold **0.88**.
- **Match:** `agent_id` set, `agent_name` left empty (name from join).
- **No match:** `agent_id` = null, `agent_name` = “&lt;trimmed name&gt; (not in system)” and a warning is added.

### Lead status

- Not in the file. Set to **Active** by default.

### Referrals

- One referral is created per imported lead:
  - If `agent_id` is set: type **employee** with that agent and referral_date = lead date.
  - Else: type **custom** with name = agent_name (or customer name), referral_date = lead date.
- The 30-day external rule is applied after import for each lead.

### Duplicates

- Duplicate key: **normalized phone + normalized customer name**.
- **mode** (request body or form):  
  - **skip** (default): do not overwrite; report as `skipped_duplicates`.  
  - **upsert**: update existing lead (fill only missing fields; do not overwrite non-null with null), and add a note “Updated via import &lt;timestamp&gt;”.

## API

### Dry-run (preview only, no DB writes)

```http
POST /api/leads/import?dryRun=true
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary .xlsx or .csv>
```

**Response:**  
- `dryRun: true`  
- `summary`: `{ total, valid, invalid, duplicate }`  
- `parsedRows`: first N rows with normalized payload and per-row `warnings` / `errors`  
- `errors`: list of rows with blocking errors  

### Commit import

```http
POST /api/leads/import
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary>
mode: skip   (optional; "skip" | "upsert")
```

**Response:**  
- `dryRun: false`  
- `importedCount`, `skippedDuplicatesCount`, `errorCount`  
- `imported`, `skipped_duplicates`, `errors` arrays with row details and messages  

## Frontend

- **Leads** dashboard: **Import** button (visible to roles that can import).
- Modal: choose file → **Preview** (calls API with `dryRun=true`) → review table and errors → **Import** (enabled only when there are no blocking errors).
- Errors can be downloaded as **errors.csv**.

## Validation and safety

- Values `""`, `"N/A"`, `"NULL"`, `"null"`, `"-"` are treated as missing.
- All DB writes use parameterized queries; raw SQL errors are not exposed to the client.
- Import is rate-limited with the same leads rate limit.
- Server logs import summary (e.g. counts, user id) without PII.
