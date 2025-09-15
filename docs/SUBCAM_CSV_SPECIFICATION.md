# SUBCAM CSV File Specification

## Scope

Covers three file types produced by SUBCAM workflow:

- **_raw**: per-event/per-clip annotations (timestamped)
- **_nmax**: daily aggregates based on Nmax (max individuals visible simultaneously)
- **_obvs**: daily aggregates of observation events (not Nmax)

## 1. File Naming

### Observed Pattern
```
ID_Subcam_<ProjectOrSite>[_W]_<YYMM-YYMM | YYMM_YYMM>_<type>.csv
```

Where:
- `<type>` ∈ {raw, nmax, obvs}
- `[_W]` is optional (appears to flag a variant like "W")
- `<ProjectOrSite>` may use hyphens OR underscores (e.g., Alga-Control vs Alga_Control)
- Date range separator may be hyphen OR underscore (e.g., 2406-2407 vs 2406_2407)

### Filename Parsing Rules
Extract:
- **project_or_site** (string; accept - or _)
- **variant** (optional, e.g., "W")
- **period** (two 4-digit tokens joined with - or _, e.g., 2408-2409)
- **type** (raw/nmax/obvs)

## 2. Encoding & CSV Format

- **Encoding**: UTF-8 (headers may include non-breaking spaces)
- **Delimiter**: comma
- **Header**: present on first row
- **Index artifacts**: columns named like `Unnamed: 0`, `Unnamed: 12` may appear and should be dropped on read

## 3. Normalization (apply on read)

- Trim leading/trailing whitespace from all headers and string fields
- Replace NBSP (\xa0) with regular space in headers and values
- Collapse multiple spaces into one (e.g., `Eutrigla  gurnardus` → `Eutrigla gurnardus`)
- Drop placeholder header `-` if present

### Normalize Known Synonyms/Typos in Aggregate Files' Headers:
- `Cummilative New Unique Organisms` → `Cumulative New Unique Organisms`
- `Total_Observations` → `Total Observations`
- `Cumulative_Observations` → `Cumulative Observations`
- `Unique_Organisms_Observed_Today` → `Unique Organisms Observed Today`

**Note**: Do not auto-split combined taxa headers (e.g., `Merlangius merlangus;Pagurus bernhardus`) unless you provide a curated mapping. Treat as a single column name after whitespace cleanup.

## 4. Datetime & Date Handling

### In _raw files:
One or more of these may appear:
- `Adjusted Date and Time` (preferred when present)
- `Adjusted Date / Time`
- `Date/Time of Recording`

All must be parseable timestamps (timezone not encoded in samples; treat as local/project time).

### In _nmax and _obvs files:
- Column `Date` appears in either ISO (YYYY-MM-DD) or UK (DD/MM/YYYY)
- **Requirement**: write as ISO (YYYY-MM-DD)
- **Read**: accept both; normalize to ISO in your pipeline

### Timecode field in _raw:
- `Timestamps (HH:MM:SS)`: must match `^\d{2}:\d{2}:\d{2}$`

## 5. Schemas by File Type

### A) _raw — per-event annotations

#### Required columns:
- `File Name` (string; e.g., SUBCAM_ALG_2020-01-22_09-00-40.mp4)
- `Timestamps (HH:MM:SS)` (string, HH:MM:SS)
- `Event Observation` (string; e.g., "3 fish", "1 fish")
- `Quantity (Nmax)` (integer ≥ 0)
- `Common Name` (string)
- `Family` (string)
- `Lowest Order Scientific Name` (string)
- `Confidence Level (1-5)` (integer 1–5)
- `Quality of Video (1-5)` (integer 1–5)
- `Notes` (string; free text)

#### Optional columns:
- `Adjusted Date and Time` (timestamp)
- `Adjusted Date / Time` (timestamp)
- `Date/Time of Recording` (timestamp)
- `Order` (string)
- `Genus` (string)
- `Species` (string)
- `Where on Screen (1-9, 3x3 grid)` (integer 1–9)
- `Where on Screen (1-9, 3x3 grid top left to lower right)` (integer 1–9)
- `Analysis Date` (date/datetime)
- `Analysis by` (string)
- `Analysis by Person` (string)

#### Index artifacts to drop:
- `Unnamed: 0`

#### Field constraints:
- `Quantity (Nmax)`: integer ≥ 0
- `Confidence Level (1-5)`, `Quality of Video (1-5)`: integers in [1..5]
- `Where on Screen...`: integer in [1..9]
- `Timestamps (HH:MM:SS)`: must match `^\d{2}:\d{2}:\d{2}$`
- Any present datetime: parseable; within the file's date range if applicable

### B) _nmax — daily Nmax aggregates

#### Required columns:
- `Date` (date; accept ISO or UK on read; normalize to ISO)
- `Total Observations` (integer ≥ 0)
- `Cumulative Observations` (integer ≥ 0; non-decreasing over time)
- `All Unique Organisms Observed Today` (integer ≥ 0)
- `New Unique Organisms Today` (integer ≥ 0)
- `Cumulative New Unique Organisms` (integer ≥ 0; note: some files spell it "Cummilative..."; normalize)
- `Cumulative Unique Species` (integer ≥ 0; non-decreasing)
- **Species columns** (0..N): one column per taxon (integer ≥ 0)

#### Optional columns / artifacts:
- Index artifact: `Unnamed: 0` (drop on read)

#### Species column examples:
Pagurus bernhardus, Pleuronectiformes, Platichthys flesus, Psetta maxima, Trachurus trachurus, etc.

#### Logical checks:
- `Cumulative Observations` == running sum of `Total Observations` by ascending Date
- `Cumulative Unique Species` is non-decreasing by Date
- `New Unique Organisms Today` ≤ `All Unique Organisms Observed Today`
- Per-species daily values: integers ≥ 0

### C) _obvs — daily observation aggregates (non-Nmax)

#### Required columns:
- `Date` (date; accept ISO or UK on read; normalize to ISO)
- `Total Observations` (integer ≥ 0)
- `Unique Organisms Observed Today` (integer ≥ 0)
- `New Unique Organisms Today` (integer ≥ 0)
- `Cumulative Unique Species` (integer ≥ 0; non-decreasing)
- **Species columns** (0..N): one column per taxon (integer ≥ 0)

#### Optional columns / artifacts:
- `Cumulative Observations` (integer ≥ 0; non-decreasing)
- Index artifact: `Unnamed: 0` (drop on read)
- A stray placeholder column named `-` (drop on read)
- Occasional combined taxa headers (e.g., `Merlangius merlangus;Pagurus bernhardus`)

#### Species column examples:
Ammodytes sp., Ammodytidae spp., Aurelia aurita, Callionymus lyra, Cyanea lamarckii, Maja squinado, Merlangius merlangus, Pagurus bernhardus (and a variant with NBSP), Spondyliosoma cantharus, Trisopterus minutus, Trisopterus sp, Trisopterus sp., Carcinus maenas, Asterias rubens, etc.

#### Logical checks:
- `Cumulative Unique Species` non-decreasing by Date
- If present: `Cumulative Observations` equals running sum of `Total Observations`
- `New Unique Organisms Today` ≤ `Unique/All Unique Organisms Observed Today`
- Per-species daily values: integers ≥ 0

## 6. Cross-file Relationships

For the same project/site and period:
- `_raw` covers many event rows (time-coded)
- `_nmax` and `_obvs` are daily roll-ups:
  - `_nmax` roll-ups reflect Nmax logic (maximum individuals concurrently visible)
  - `_obvs` roll-ups reflect observation events (not maximum concurrency)

**Note**: Do not assume `_nmax` totals equal `_obvs` totals.

## 7. Ingestion Validation Checklist

1. Parse filename → extract type, project_or_site, optional variant, and period
2. Read CSV with UTF-8
3. Drop `Unnamed:*` and `-` columns
4. Normalize headers:
   - Strip whitespace; replace NBSP; collapse multiple spaces
   - Apply synonyms/typo fixes listed in §3
5. Verify required columns for the detected type
6. Parse dates:
   - `_raw`: parse any present timestamp fields; ensure valid
   - `_nmax/_obvs`: parse Date (accept ISO or UK), normalize to ISO
7. Coerce numeric fields to integers; validate ranges:
   - Counts ≥ 0; 1–5 for quality/confidence; 1–9 for screen grid
8. Monotonic checks:
   - Cumulative Observations and Cumulative Unique Species non-decreasing by Date
   - If present, Cumulative Observations equals the running sum of Total Observations
9. Row-level checks (`_raw`):
   - Timestamps (HH:MM:SS) regex match
   - Optional datetime fields valid (and consistent with period if you enforce that)
10. Quarantine any rows that fail checks (log reasons) but continue with valid data

## 8. Data Types (Canonical Targets)

| Column (canonical) | Type | Notes |
|---|---|---|
| Date | date (YYYY-MM-DD) | Accept DD/MM/YYYY on read; normalize to ISO |
| File Name | string | Media filename (e.g., SUBCAM_ALG_2020-01-22_09-00-40.mp4) |
| Timestamps (HH:MM:SS) | string (HH:MM:SS) | Position within clip |
| Event Observation | string | Free text like "3 fish" |
| Quantity (Nmax) | integer ≥ 0 | Per-event |
| Order / Family / Genus / Species / Common Name / Lowest Order Scientific Name | string | Optional taxonomy fields |
| Confidence Level (1-5) | integer in 1–5 | _raw only |
| Quality of Video (1-5) | integer in 1–5 | _raw only |
| Where on Screen … | integer in 1–9 | Optional |
| Total Observations | integer ≥ 0 | _nmax & _obvs |
| Cumulative Observations | integer ≥ 0 | Non-decreasing; _nmax & sometimes _obvs |
| Unique Organisms Observed Today | integer ≥ 0 | _obvs (synonyms allowed) |
| All Unique Organisms Observed Today | integer ≥ 0 | _nmax (synonyms allowed) |
| New Unique Organisms Today | integer ≥ 0 | _nmax & _obvs |
| Cumulative New Unique Organisms | integer ≥ 0 | Normalize from "Cummilative…" |
| Cumulative Unique Species | integer ≥ 0 | Non-decreasing |
| \<species\> columns | integer ≥ 0 | One per taxon in aggregate files |

## 9. Species Columns — Concrete Examples Seen

- Ammodytes sp.
- Ammodytidae spp.
- Aurelia aurita
- Callionymus lyra
- Carcinus maenas
- Cyanea lamarckii
- Maja squinado
- Merlangius merlangus
- Pagurus bernhardus (and a variant with NBSP at end)
- Spondyliosoma cantharus
- Trisopterus minutus
- Trisopterus sp
- Trisopterus sp.

…and many more. Expect spelling variants, doubled spaces, and combined taxa (e.g., `Merlangius merlangus;Pagurus bernhardus`).

## 10. Practical Implementation Notes

- Write a header normalizer that:
  - Replaces NBSP with space
  - Strips and collapses spaces
  - Maps the synonyms/typos from §3
- Treat taxonomy headers case-sensitive after normalization; do not merge "sp" vs "sp." automatically unless you supply a curated mapping
- For cross-period analysis, rely on Date (normalized to ISO)
- Treat `Adjusted Date and Time` as the authoritative per-event timestamp in `_raw` when present; otherwise use `Date/Time of Recording`