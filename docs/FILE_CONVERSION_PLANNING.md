# SUBCAM File Format Conversion Planning Guide

## Overview

This document provides implementation-ready plans for converting SUBCAM CSV files between different formats. Each conversion includes detailed specifications, algorithms, validation steps, and implementation guidance.

## Supported Conversions

1. [**_raw → _nmax**](#raw-to-nmax-conversion) - Convert per-event annotations to daily Nmax aggregates
2. [**_raw → _obvs**](#raw-to-obvs-conversion) - Convert per-event annotations to daily observation counts
3. **_nmax → summary** *(planned)* - Generate summary statistics from daily Nmax data

---

## _raw to _nmax Conversion

### Goal
Transform per-event annotations (_raw) into daily Nmax aggregates (_nmax) with one row per date and columns for summary metrics and per-species daily Nmax values.

### 1. Input Requirements & Assumptions

#### Required Columns in _raw CSV:
- **File Name** (string) - Identifies the clip/deployment
- **Timestamps (HH:MM:SS)** (string) - Time of observation
- **Event Observation** (string) - Description of observation
- **Quantity (Nmax)** (integer ≥ 0) - Maximum individuals visible at that moment
- **Common Name** (string) and/or **Lowest Order Scientific Name** (string) - Species identification

#### Optional Timestamp Columns (priority order):
1. **Adjusted Date and Time** *(preferred)*
2. **Adjusted Date / Time**
3. **Date/Time of Recording** *(fallback)*

#### Optional Taxonomy Columns:
- Order, Family, Genus, Species
- Use for enhanced species identification when available

#### Optional Quality Assurance Columns:
- **Confidence Level** (1-5) - Observer confidence in identification
- **Quality of Video** (1-5) - Video quality rating
- **Where on Screen** (1-9) - 3x3 grid position reference

#### Data Cleaning Rules:
- Drop any `Unnamed:*` columns (pandas artifacts)
- Remove NBSP characters (`\xa0`) from headers and values
- Normalize whitespace (trim, collapse multiple spaces)

### 2. Timezone & Day Boundary Handling

**Timezone**: All timestamps treated as Europe/London
- Naive timestamps → localize to Europe/London
- Timezone-aware timestamps → convert to Europe/London

**Daily Aggregation Boundary**: Local midnight 00:00:00 – 23:59:59

### 3. Taxon Key Selection

**Priority Order:**
1. Use **Lowest Order Scientific Name** if present and non-empty
2. Fallback to **Common Name** if scientific name unavailable
3. Drop records with no valid taxon identifier

**Normalization:**
- Apply NBSP removal, trimming, space collapse to taxonomy strings
- Preserve combined taxa (e.g., "Merlangius merlangus;Pagurus bernhardus") as single units
- Do not auto-split unless curated mapping provided

### 4. Nmax Calculation Algorithm

#### Step 1: Per-Clip Nmax
For each combination of:
- **File Name** (clip identifier)
- **Taxon** (normalized species name)
- **Date** (local date from timestamp)

Calculate: `max(Quantity (Nmax))` within that clip for that taxon

#### Step 2: Daily Species Nmax
For each combination of:
- **Date**
- **Taxon**

Calculate: `sum(per_clip_nmax)` across all clips on that date

**Rationale**: This captures multiple deployments/clips per day and follows standard marine survey practices.

### 5. Daily Metrics Calculation

For each date, calculate:

#### Basic Counts:
- **Total Observations** = Σ(daily species Nmax) across all taxa
- **All Unique Organisms Observed Today** = Count of taxa with Nmax > 0

#### New Species Detection:
- **New Unique Organisms Today** = Taxa appearing for first time in dataset
- Track first occurrence date for each taxon

#### Cumulative Metrics (sorted by ascending date):
- **Cumulative Observations** = Running sum of Total Observations
- **Cumulative Unique Species** = Running count of distinct taxa seen so far
- **Cumulative New Unique Organisms** = Running sum of New Unique Organisms Today

### 6. Output Schema (_nmax format)

#### Column Order (left to right):
```
Date | Total Observations | Cumulative Observations | All Unique Organisms Observed Today | New Unique Organisms Today | Cumulative New Unique Organisms | Cumulative Unique Species | [Species Columns...]
```

#### Data Types:
- **Date**: YYYY-MM-DD (ISO format, Europe/London local date)
- **All numeric fields**: Integer ≥ 0
- **Species columns**: Integer ≥ 0 (daily Nmax for that species)

#### Format Specifications:
- CSV with UTF-8 encoding
- Comma delimiter
- Header row present
- No `Unnamed:*` or placeholder `-` columns
- Species columns sorted alphabetically by normalized taxon names

### 7. Validation & Quality Assurance

#### Type Validation:
- All count fields must be integers ≥ 0
- Dates must be valid ISO format
- No missing values in required columns

#### Logical Validation:
- **Monotonic**: Cumulative fields must be non-decreasing
- **Consistency**: Cumulative Observations = running sum of Total Observations
- **Uniqueness**: Exactly one row per date
- **Totals**: Total Observations = sum of all species columns for each row

#### Optional Quality Filters:
- Filter events with Confidence Level < threshold (e.g., < 3)
- Filter events with Quality of Video < threshold (e.g., < 3)

### 8. Implementation Pseudocode

```python
import pandas as pd
import numpy as np
import pytz

TZ = pytz.timezone("Europe/London")

def convert_raw_to_nmax(raw_path, nmax_path, min_confidence=None, min_quality=None):
    """Convert _raw CSV to _nmax format with daily aggregates"""

    # 1. Load and normalize data
    df = load_and_normalize_raw(raw_path)

    # 2. Apply quality filters if specified
    if min_confidence:
        df = df[df['Confidence Level'] >= min_confidence]
    if min_quality:
        df = df[df['Quality of Video'] >= min_quality]

    # 3. Calculate per-clip Nmax
    per_clip = calculate_per_clip_nmax(df)

    # 4. Aggregate to daily species totals
    daily_species = aggregate_daily_species(per_clip)

    # 5. Calculate summary metrics
    result = calculate_summary_metrics(daily_species)

    # 6. Validate output
    validate_nmax_output(result)

    # 7. Write to file
    result.to_csv(nmax_path, index_label="Date", encoding="utf-8")

    return result

def load_and_normalize_raw(raw_path):
    """Load raw CSV and apply normalization"""
    df = pd.read_csv(raw_path)

    # Remove unnamed columns
    df = df.loc[:, ~df.columns.str.startswith("Unnamed")]

    # Normalize headers
    df.columns = [normalize_text(c) for c in df.columns]

    # Parse timestamps
    df["event_ts"] = parse_preferred_timestamp(df)
    df["event_date"] = df["event_ts"].dt.date

    # Choose taxon label
    df["taxon"] = df.apply(choose_taxon_label, axis=1)

    # Clean and validate Nmax values
    df["Quantity (Nmax)"] = pd.to_numeric(df["Quantity (Nmax)"], errors="coerce")
    df = df[(df["Quantity (Nmax)"].notna()) & (df["Quantity (Nmax)"] >= 0)]

    # Remove rows without valid taxon or timestamp
    df = df[df["taxon"].notna() & df["event_ts"].notna()]

    return df

def normalize_text(text):
    """Remove NBSP, trim, and collapse whitespace"""
    return " ".join(str(text).replace("\xa0", " ").strip().split())

def parse_preferred_timestamp(df):
    """Parse timestamps in priority order"""
    timestamp_cols = ["Adjusted Date and Time", "Adjusted Date / Time", "Date/Time of Recording"]

    result = pd.Series(pd.NaT, index=df.index)
    for col in timestamp_cols:
        if col in df.columns:
            ts = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
            result = result.fillna(ts)

    # Localize to Europe/London
    if result.dt.tz is None:
        result = result.dt.tz_localize(TZ, ambiguous='infer', nonexistent='shift_forward')
    else:
        result = result.dt.tz_convert(TZ)

    return result

def choose_taxon_label(row):
    """Choose best available taxon identifier"""
    scientific = row.get("Lowest Order Scientific Name")
    common = row.get("Common Name")

    if isinstance(scientific, str) and scientific.strip():
        return normalize_text(scientific)
    elif isinstance(common, str) and common.strip():
        return normalize_text(common)
    else:
        return None

def calculate_per_clip_nmax(df):
    """Calculate maximum Nmax per clip per taxon per date"""
    return (df.groupby(["event_date", "File Name", "taxon"])["Quantity (Nmax)"]
            .max()
            .reset_index()
            .rename(columns={"Quantity (Nmax)": "clip_taxon_nmax"}))

def aggregate_daily_species(per_clip_df):
    """Sum clip Nmax values by date and species"""
    daily = (per_clip_df.groupby(["event_date", "taxon"])["clip_taxon_nmax"]
             .sum()
             .reset_index()
             .rename(columns={"clip_taxon_nmax": "nmax"}))

    # Pivot to wide format with species columns
    wide = daily.pivot(index="event_date", columns="taxon", values="nmax").fillna(0).astype(int)
    wide.index.name = "Date"

    return wide.sort_index()

def calculate_summary_metrics(species_df):
    """Calculate all summary metrics for daily aggregates"""
    result = species_df.copy()

    # Basic daily metrics
    result["Total Observations"] = result.sum(axis=1)
    result["All Unique Organisms Observed Today"] = (species_df > 0).sum(axis=1)

    # Cumulative metrics
    result["Cumulative Observations"] = result["Total Observations"].cumsum()

    # New species detection
    first_seen = (species_df > 0).idxmax()  # First date each species appears
    new_species_daily = pd.Series(0, index=result.index)
    for species, first_date in first_seen.items():
        if pd.notna(first_date) and species_df.loc[first_date, species] > 0:
            new_species_daily.loc[first_date] += 1

    result["New Unique Organisms Today"] = new_species_daily
    result["Cumulative New Unique Organisms"] = result["New Unique Organisms Today"].cumsum()

    # Cumulative unique species count
    cumulative_seen = (species_df > 0).cumsum().clip(upper=1)
    result["Cumulative Unique Species"] = cumulative_seen.sum(axis=1)

    # Reorder columns: summary metrics first, then species alphabetically
    summary_cols = [
        "Total Observations", "Cumulative Observations",
        "All Unique Organisms Observed Today", "New Unique Organisms Today",
        "Cumulative New Unique Organisms", "Cumulative Unique Species"
    ]
    species_cols = sorted([c for c in result.columns if c not in summary_cols])

    return result[summary_cols + species_cols]

def validate_nmax_output(df):
    """Validate output meets all requirements"""
    species_cols = [c for c in df.columns if c not in [
        "Total Observations", "Cumulative Observations",
        "All Unique Organisms Observed Today", "New Unique Organisms Today",
        "Cumulative New Unique Organisms", "Cumulative Unique Species"
    ]]

    # Type and value validation
    assert (df >= 0).all().all(), "All values must be >= 0"
    assert df.index.is_unique, "Each date must appear exactly once"

    # Monotonic validation
    assert (df["Cumulative Observations"].diff().fillna(0) >= 0).all(), "Cumulative Observations must be non-decreasing"
    assert (df["Cumulative Unique Species"].diff().fillna(0) >= 0).all(), "Cumulative Unique Species must be non-decreasing"

    # Consistency validation
    assert (df["Total Observations"] == df[species_cols].sum(axis=1)).all(), "Total Observations must equal sum of species columns"

    print("✅ All validation checks passed")
```

### 9. Error Handling & Edge Cases

#### Common Issues:
- **Invalid timestamps**: Log and skip rows with unparseable dates
- **Negative Nmax values**: Log and set to 0 or skip row
- **Missing taxon identifiers**: Skip rows without valid species identification
- **Duplicate file names**: Handle multiple clips with same name by including path if available

#### Logging Recommendations:
- Count of rows processed vs. skipped
- List of taxa found and normalized
- Date range of output data
- Any quality filtering applied

### 10. Testing & Validation Checklist

#### Pre-conversion Validation:
- [ ] Raw file contains required columns
- [ ] Timestamps are parseable
- [ ] Nmax values are numeric
- [ ] At least some rows have valid taxon identifiers

#### Post-conversion Validation:
- [ ] Output has expected date range
- [ ] All numeric fields are integers ≥ 0
- [ ] Cumulative fields are monotonic
- [ ] Row totals match species column sums
- [ ] No duplicate dates
- [ ] Species columns match taxa found in raw data

#### Manual Spot Checks:
- [ ] Sample a few dates and manually verify Total Observations calculation
- [ ] Check that first occurrence dates for new species are correct
- [ ] Verify cumulative metrics increase appropriately

---

## Implementation Notes

### Performance Considerations:
- Large raw files (>100k rows): Consider chunked processing
- Memory usage: Monitor for wide species matrices
- Time complexity: O(n log n) for sorting and grouping operations

### Future Enhancements:
- **Taxon reconciliation**: Mapping system for variant species names
- **Clip timing**: Use precise start/stop times when available
- **Quality metrics**: Additional validation and outlier detection
- **Interactive validation**: Web interface for reviewing conversions

### Integration with SUBCAMreport App:
- Add conversion functions to main script.js
- Create UI for selecting conversion parameters
- Implement progress tracking for large conversions
- Add download functionality for converted files

---

*This planning document serves as the technical specification for implementing file format conversions in the SUBCAMreport application. Each conversion should be implemented following these guidelines with appropriate error handling and validation.*