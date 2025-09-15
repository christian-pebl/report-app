# Crop_ALGA_2503 — File Format Specification (v0.1)

**Scope:** This document defines the on-disk CSV formats for two related datasets:
- `Crop_ALGA_2503_Indiv.csv` — row-level measurements per blade/subset.
- `Crop_ALGA_2503_Summary.csv` — aggregated/summary rows with a small metadata preamble.

Treat this as the canonical reference for ingest/validation in the CROPreport app.

---

## 1) Common conventions

- **Filenames:** `Crop_ALGA_2503_{Type}.csv` where `{Type}` ∈ {`Indiv`, `Summary`}.
- **Encoding:** UTF-8 (no BOM).
- **Delimiter:** Comma `,`.
- **Quote char:** `"` (RFC 4180).
- **Line endings:** `\n`.
- **Header row:** Present (but see §3 for Summary's *preamble* row).
- **Date format:** `DD/MM/YY` (day-first), e.g. `25/03/25`.
  Parse as day-first to avoid `MM/DD/YY` misreads.
- **Missing values:** Empty cell.
- **Decimals:** Dot `.`.
- **Units:**
  - Length/width columns are in **centimetres (cm)**.
  - Percent columns are **0–100**.
  - Weight columns as labelled (`lb`, `kg/m`).
- **Filename stability:** Names include an experiment/run identifier (`2503` here). Treat it as opaque; do not parse meaning from it.

---

## 2) Individual Measurements CSV (`Indiv`)

**File:** `Crop_ALGA_2503_Indiv.csv`
**Row semantics:** One row per measured blade (or grouped subset entry) on a given date & sample.

> **Recommended composite key:** (`Date`, `sample ID`, `subset`, `blade ID`)
> No single unique column is guaranteed; use the composite for de-duplication.

### 2.1 Column dictionary

| Column            | Type      | Required? | Unit | Description |
|------------------ |-----------|-----------|------|-------------|
| `Date`            | date      | Yes       | —    | Sampling/measurement date (`DD/MM/YY`, day-first). |
| `sample ID`       | string    | Yes       | —    | Sample identifier, e.g. `4-SW-1`. |
| `subset`          | string    | No        | —    | Optional grouping label within the sample. |
| `blade ID`        | number    | No        | —    | Numeric blade identifier (if measured at blade level). |
| `length (cm)`     | number    | No        | cm   | Measured blade length. |
| `width (cm)`      | number    | No        | cm   | Measured blade width. |
| `AV sml_l (cm)`   | number    | No        | cm   | Average length of **small** blades in subset. |
| `AV sml_w (cm)`   | number    | No        | cm   | Average width of **small** blades in subset. |
| `AV lrg_l (cm)`   | number    | No        | cm   | Average length of **large** blades in subset. |
| `AV lrg_w (cm)`   | number    | No        | cm   | Average width of **large** blades in subset. |
| `AV all_l (cm)`   | number    | No        | cm   | Average length across **all** blades in subset. |
| `AV all_w (cm)`   | number    | No        | cm   | Average width across **all** blades in subset. |
| `SD sml_l (cm)`   | number    | No        | cm   | Std. dev. length of **small** blades. |
| `SD sml_w (cm)`   | number    | No        | cm   | Std. dev. width of **small** blades. |
| `SD lrg_l (cm)`   | number    | No        | cm   | Std. dev. length of **large** blades. |
| `SD lrg_w (cm)`   | number    | No        | cm   | Std. dev. width of **large** blades. |
| `SD all_l (cm)`   | number    | No        | cm   | Std. dev. length across **all** blades. |
| `SD all_w (cm)`   | number    | No        | cm   | Std. dev. width across **all** blades. |
| `# sml blades`    | integer   | No        | —    | Count of **small** blades used in the averages. |
| `# lrg blades`    | integer   | No        | —    | Count of **large** blades used in the averages. |
| `# all blades`    | integer   | No        | —    | Count of **all** blades (should equal `# sml blades + # lrg blades`). |

### 2.2 Validation rules (recommended)

- `Date` must parse as day-first.
- Percent columns: *(none in this file)*.
- `# all blades = # sml blades + # lrg blades` (when all three present).
- All `SD …` columns non-negative.
- All cm measurements non-negative and reasonable (domain-specific bounds if desired).

---

## 3) Summary CSV (`Summary`)

**File:** `Crop_ALGA_2503_Summary.csv`
**Structure:** This file has a **one-line preamble**, then the real header row, then data.

- **Preamble row 0:** `lb:kg conversion,0.454`
  Store this as file-level metadata (conversion factor from pounds to kilograms). **Do not** treat it as a header.

- **Header row 1:** Actual column names (see below).
- **Data rows:** Start at row index 2 (0-based).

> **Parsing tip:** When loading, **skip the first line** or treat it as metadata, then read the next line as headers.

### 3.1 Column dictionary (after skipping the preamble)

| Column               | Type    | Required? | Unit | Description |
|--------------------- |---------|-----------|------|-------------|
| `Date`               | date    | Yes       | —    | Sampling/measurement date (`DD/MM/YY`, day-first). |
| `sample ID`          | string  | Yes       | —    | Sample identifier, e.g. `4-SW-1`. |
| `FW in bag (lb)`     | number  | No        | lb   | Fresh weight including bag. |
| `FW (lb) ex bag`     | number  | No        | lb   | Fresh weight excluding bag. |
| `FW kg/m`            | number  | No        | kg/m | Fresh weight per metre (derived; see conversion note). |
| `AV sml_l (cm)`      | number  | No        | cm   | Avg **small** blade length. |
| `AV sml_w (cm)`      | number  | No        | cm   | Avg **small** blade width. |
| `AV lrg_l (cm)`      | number  | No        | cm   | Avg **large** blade length. |
| `AV lrg_w (cm)`      | number  | No        | cm   | Avg **large** blade width. |
| `AV all_l (cm)`      | number  | No        | cm   | Avg length across **all** blades. |
| `AV all_w (cm)`      | number  | No        | cm   | Avg width across **all** blades. |
| `SD sml_l (cm)`      | number  | No        | cm   | Std. dev. **small** length. |
| `SD sml_w (cm)`      | number  | No        | cm   | Std. dev. **small** width. |
| `SD lrg_l (cm)`      | number  | No        | cm   | Std. dev. **large** length. |
| `SD lrg_w (cm)`      | number  | No        | cm   | Std. dev. **large** width. |
| `SD all_l (cm)`      | number  | No        | cm   | Std. dev. length across **all** blades. |
| `SD all_w (cm)`      | number  | No        | cm   | Std. dev. width across **all** blades. |
| `# sml blades`       | integer | No        | —    | Count of **small** blades used in averages. |
| `# lrg blades`       | integer | No        | —    | Count of **large** blades used in averages. |
| `# all blades`       | integer | No        | —    | Count of **all** blades. |
| `fertility %`        | number  | No        | %    | Fertility percentage (0–100). |
| `fouling %`          | number  | No        | %    | Fouling percentage (0–100). |
| `epiphytes %`        | number  | No        | %    | Epiphyte coverage percentage (0–100). |

### 3.2 Metadata & conversions

- **`lb:kg conversion`** from the preamble (expected value: **0.454**).
  If required, compute kilograms as `pounds * conversion_factor`.

### 3.3 Validation rules (recommended)

- `Date` must parse as day-first.
- Percent columns in **[0, 100]**.
- `# all blades = # sml blades + # lrg blades` (when all three present).
- All cm/weight values non-negative and reasonable.
- If computing `FW kg/m` from `FW (lb) ex bag`, use the file's `lb:kg conversion` and the correct length normaliser used in your study (document formula in code).

---

## 4) Reader hints (ingest configuration)

### 4.1 CSV loader settings

**For `Indiv`:**
- `encoding="utf-8"`, `delimiter=","`, `header=True`.
- Parse dates with `dayfirst=True`.

**For `Summary`:**
- Skip the **first** line (preamble) when reading; the **second** line is the header.
- Alternatively, read the file raw, capture the conversion from the first line, then re-read from the next line as a CSV with header.
- Parse dates with `dayfirst=True`.

### 4.2 Example loader (Python/pandas)

```python
import pandas as pd
from pathlib import Path

# --- Indiv ---
indiv = pd.read_csv("Crop_ALGA_2503_Indiv.csv", encoding="utf-8", dayfirst=True, parse_dates=["Date"])

# --- Summary ---
with open("Crop_ALGA_2503_Summary.csv", "r", encoding="utf-8") as f:
    first = f.readline().strip()
    # Expect "lb:kg conversion,0.454"
    key, val = first.split(",", 1)
    lb_to_kg = float(val)

summary = pd.read_csv("Crop_ALGA_2503_Summary.csv", encoding="utf-8", skiprows=1, dayfirst=True, parse_dates=["Date"])
```

### 4.3 JavaScript/Web CSV parsing

**For `Indiv`:**
```javascript
// Standard CSV parsing with date handling
function parseIndivCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        const obj = {};

        headers.forEach((header, index) => {
            const value = row[index]?.trim() || null;

            if (header === 'Date' && value) {
                // Parse DD/MM/YY format (day-first)
                obj[header] = parseDayFirstDate(value);
            } else if (isNumericColumn(header) && value) {
                obj[header] = parseFloat(value);
            } else {
                obj[header] = value;
            }
        });

        data.push(obj);
    }

    return data;
}
```

**For `Summary`:**
```javascript
// Parse Summary CSV with preamble handling
function parseSummaryCSV(csvText) {
    const lines = csvText.trim().split('\n');

    // Extract metadata from preamble (first line)
    const preamble = lines[0];
    const [key, value] = preamble.split(',');
    const lbToKgConversion = parseFloat(value);

    // Parse actual CSV data starting from line 1 (headers) and line 2+ (data)
    const headers = lines[1].split(',');
    const data = [];

    for (let i = 2; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        const obj = {};

        headers.forEach((header, index) => {
            const value = row[index]?.trim() || null;

            if (header === 'Date' && value) {
                obj[header] = parseDayFirstDate(value);
            } else if (isNumericColumn(header) && value) {
                obj[header] = parseFloat(value);
            } else {
                obj[header] = value;
            }
        });

        data.push(obj);
    }

    return {
        metadata: { lbToKgConversion },
        data: data
    };
}

// Helper functions
function parseDayFirstDate(dateStr) {
    // Parse DD/MM/YY format
    const [day, month, year] = dateStr.split('/');
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(fullYear, month - 1, day);
}

function isNumericColumn(header) {
    return header.includes('(cm)') ||
           header.includes('(lb)') ||
           header.includes('kg/m') ||
           header.includes('%') ||
           header.includes('# ') ||
           header === 'blade ID';
}

function parseCSVRow(row) {
    // Simple CSV row parser - enhance as needed for quoted fields
    return row.split(',');
}
```

---

## 5) Data quality & validation framework

### 5.1 Critical validation checks

**File structure validation:**
- File encoding is UTF-8
- File contains expected headers (after preamble for Summary)
- Required columns present (`Date`, `sample ID`)
- Preamble parsing successful (Summary files only)

**Data type validation:**
- All numeric columns parse correctly
- Date columns parse with day-first format
- Percentage columns within [0, 100] range
- Integer columns contain whole numbers

**Logical consistency validation:**
- `# all blades = # sml blades + # lrg blades` when all present
- Standard deviation values ≥ 0
- Physical measurements > 0 and within reasonable bounds
- Sample IDs follow expected naming patterns

### 5.2 Data range recommendations

**Reasonable bounds for validation:**
- Blade length: 0.1 - 200 cm
- Blade width: 0.1 - 50 cm
- Blade counts: 1 - 10,000 per sample
- Percentages: 0 - 100%
- Weights: 0.01 - 1000 lbs or equivalent kg

### 5.3 Warning conditions

**Data quality warnings:**
- Missing data in key measurement columns
- Unusual sample ID patterns
- Extreme statistical values (outliers)
- Inconsistent measurement units
- Date ranges outside expected experiment periods

---

## 6) File naming conventions & variants

### 6.1 Expected filename patterns

**Standard format:**
- `Crop_ALGA_2503_Indiv.csv`
- `Crop_ALGA_2503_Summary.csv`

**Possible variants:**
- `Crop_ALGA_2503_Individual.csv` (full word)
- `Crop_ALGA_2503_Indiv_v2.csv` (versioned)
- `Crop_ALGA_2503_Summary_cleaned.csv` (processing stage)

**Pattern matching:**
```regex
^Crop_[A-Z]+_\d+_(Indiv|Individual|Summary).*\.csv$
```

### 6.2 Experiment identifier handling

The experiment ID (`2503` in this example) should be:
- Treated as opaque string
- Used for file grouping and organization
- Not parsed for semantic meaning
- Preserved in metadata for traceability

---

## 7) Implementation guidelines for CROPreport app

### 7.1 File detection & classification

1. **File upload validation:**
   - Check filename patterns
   - Validate file encoding
   - Detect file type (Indiv vs Summary)

2. **Automatic file pairing:**
   - Match files by experiment ID
   - Warn if only one file type found
   - Support independent analysis of single files

### 7.2 Data processing pipeline

1. **Parse & validate** using specifications above
2. **Clean & normalize** data (handle missing values, outliers)
3. **Cross-validate** between Indiv and Summary files when both present
4. **Generate** summary statistics and data quality reports
5. **Prepare** data for visualization and analysis

### 7.3 Error handling strategy

**Parse errors:**
- Log specific line/column where error occurred
- Provide clear user feedback with correction suggestions
- Allow partial loading with warnings for recoverable errors

**Validation failures:**
- Categorize as errors (blocking) vs warnings (informational)
- Provide data quality dashboard
- Allow user to proceed with warnings after acknowledgment

---

## 8) Future considerations

### 8.1 Format evolution

- **Backward compatibility:** Support older format versions
- **Column additions:** Handle new measurement types gracefully
- **Unit changes:** Support conversion between measurement units
- **Metadata expansion:** Additional preamble fields in Summary files

### 8.2 Multi-experiment support

- **Batch processing:** Handle multiple experiment sets
- **Cross-experiment analysis:** Compare results across experiments
- **Temporal analysis:** Track changes over experimental time periods

---

*This specification serves as the definitive reference for CROP CSV file handling in the CROPreport application. All parsing, validation, and processing logic should conform to these standards.*