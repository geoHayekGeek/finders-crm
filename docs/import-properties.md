# Import Properties from Excel / CSV

This document describes the **Import Properties** feature: supported file format, required headers, mapping rules, and API usage.

## Overview

- **Endpoint:** `POST /api/properties/import`
- **Auth:** Required (JWT).
- **Permissions:** Restricted to roles that can manage properties (`canManageProperties`: admin, operations manager, operations, agent manager).
- **File:** Multipart form field `file`; accepted types: `.xlsx`, `.csv` (max 10MB).

## Excel / CSV Template

### Sheet name (XLSX)

- Use a sheet named **"Sheet1"** (as in "Properties 26.xlsx"). If missing, the first sheet is used and a warning is returned.

### Headers (trimmed; trailing spaces handled)

Header names are normalized by trimming. The following columns are expected:

| Column | Required | Description |
|--------|----------|-------------|
| Date | No | Property date (Excel date or YYYY-MM-DD / DD/MM/YYYY). Default: today + warning. |
| Reference | No* | Property reference (e.g. FSL26001). If missing, DB generates one. If duplicate → skip or upsert by mode. |
| Active | Yes** | "Active" or "Inactive" → status_id. Must resolve to a system status. |
| Location | No | Area/location string (e.g. Spears, Hamra). Stored in location field. |
| Category | **Yes** | Apartment, Shop, Office, Land, etc. Resolved to category_id (synonyms + fuzzy ≥0.88). |
| Bldg Name | No | Building name. |
| Owner Name | **Yes** | Full name of owner; used to find or create owner lead. |
| Phone Number | **Yes** | Lebanon format (03/145375 → +9613145375). Used to link owner_id to leads.id. |
| Surface | **Yes** | Numeric (sqm). Invalid/missing → row error. |
| Details ( Floor, Balcony, Parking, Cave) | No | Text; stored in details JSONB. |
| Interior Details | No | Text; stored in interior_details JSONB. |
| Built Year | No | Integer 1800..currentYear+1; else NULL + warning. |
| Concierge | No | Yes/No → boolean. |
| View | No | Yes/No → view_type (open view / no view). |
| Agent Name | No | Fuzzy match to users → agent_id; else stored as note + warning. |
| Price | No | Decimal; commas allowed. Invalid → NULL + warning. |
| Notes | No | Free text. |
| Operations | **Yes** | Initials (MA, GC) or full name → created_by. No match → current user + warning. |

\* Reference is used for duplicate detection; if provided and unique, it is stored.  
\** Active and Category must resolve to existing status/category; otherwise row is skipped.

## Mapping Rules

### Date

- Accepts Excel date serials, `YYYY-MM-DD`, or `DD/MM/YYYY`.
- Normalized to `YYYY-MM-DD`. If missing or invalid, defaults to **today** and a warning is added.

### Reference

- If non-empty and not already in DB: used as `reference_number`.
- If duplicate: behaviour depends on **mode** (skip or upsert).
- If missing: system generates via `generate_reference_number()`; warning added.

### Active → status_id

- **Active** (and synonyms: active, actif) → status with code/name "Active".
- **Inactive** (and synonyms: inactive, inactif, archived) → status Inactive or Archived.
- If no matching status: **row error** (skipped).

### Category → category_id

- Normalize: lowercase, trim, collapse spaces.
- Synonym map: e.g. "commercial building" → Office, "industrial warehouse" → Industrial Warehouse.
- Fuzzy match (≥0.88) against categories table; if no match and "Other" exists, use Other + warning.
- If no match and no Other: **row error** (skipped).

### Owner (Owner Name + Phone Number) → owner_id

- Phone normalized (same as leads: Lebanese format, +961…).
- Lookup existing lead by normalized phone; if found, use that lead as owner.
- If not found: create a minimal lead (customer_name, phone_number, date, reference_source "Property Import", one referral). If lead creation fails (validation): **row error** (skipped).

### Agent Name → agent_id

- Fuzzy match users (assignable) with threshold ≥0.88.
- Match: set property `agent_id`.
- No match: `agent_id` = null, add note "Agent: &lt;name&gt; (not in system)" and warning (non-fatal).

### Operations → created_by

- Initials (MA, GC) or full name; same matching as leads import (initials / role priority).
- If no match: **fallback to current user** (importer) + warning (e.g. "Ops: MA (not in system)").

### Price, Surface, Details, Interior Details, Built Year, Concierge, View, Notes

- Price: decimal; invalid → NULL + warning.
- Surface: required; invalid → row error.
- Details/Interior Details/Notes: stored in appropriate columns or concatenated if single description field.
- Built Year: 1800..currentYear+1; else NULL + warning.
- Concierge/View: Yes/No → boolean or view_type; else NULL.

### Property referral (required by validators)

- At least one referral per property:
  - If agent_id resolved: type "employee", employee_id = agent_id.
  - Else: type "custom", name = Agent Name or "Import".
- 30-day external rule applied (same as propertyReferralModel).

### Duplicate detection

- **Primary key:** `reference_number` (Reference column).
- If reference exists in DB:
  - **mode=skip:** skip row; report in `skipped_duplicates`.
  - **mode=upsert:** update existing (fill only missing fields; do not overwrite non-null with null); add note "Updated via import &lt;timestamp&gt;".

### Platform (platform_id)

- Excel does not include platform. If required by schema: use safe "Unknown"/"Other" platform + warning; else NULL.

## API

### Dry-run (preview only, no DB writes)

```http
POST /api/properties/import?dryRun=true
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary .xlsx or .csv>
```

**Response:**

- `dryRun: true`
- `summary`: `{ totalRows, validRows, invalidRows, duplicatesCount, willImportCount }`
- `rowsPreview` / `perRow`: first N rows with normalized payload and per-row `warnings` / `errors`
- `errors`: rows with blocking errors

### Commit import

```http
POST /api/properties/import
POST /api/properties/import?dryRun=false
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary>
mode: skip   (optional; "skip" | "upsert", default "skip")
```

**Response:**

- `dryRun: false`
- `importedCount`, `skippedDuplicatesCount`, `errorCount`
- `imported`, `skipped_duplicates`, `errors` arrays with row details and messages

- Only **valid** rows are imported; invalid rows are skipped and reported.
- Transaction uses savepoints per row so one row failure does not roll back others.

## Frontend

- **Properties** dashboard: **Import** button (next to Export), visible to users who can manage properties.
- Modal: choose file → **Preview** (dry-run) → review table, errors, and warnings → **Import** (import valid rows only; option to download errors.csv for skipped rows).
- Loading states: separate preview vs import; buttons disabled while loading; no double submit.

## Validation and safety

- Headers with trailing spaces (e.g. "Location ", "Notes ") are trimmed and matched.
- Values `""`, `"N/A"`, `"null"`, `"-"` treated as missing where applicable.
- All DB writes use parameterized queries; savepoints used per row.
- Import is rate-limited; server logs summary counts without PII.
