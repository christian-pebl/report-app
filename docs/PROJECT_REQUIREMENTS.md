# Project Requirements - CSV Data Visualization Tool

## Chart Formatting Rules

### Title and Legend Logic
When creating charts, the following formatting rules should be applied:

1. **When Column Name is Selected First (Primary Selection)**:
   - Use the column name as the chart title, aligned to the left above the chart
   - Display file names in the legend using truncated format: extract text from 2nd underscore up to (but not including) the 4th underscore
   - Example: `FPOD_Alga_Control-S_2406-2407_std.csv` → Legend shows: `Control-S_2406-2407`

2. **When File Name is Selected First (Primary Selection)**:
   - Use the truncated file name as the chart title (same truncation rule as above)
   - Display column headers as legend items
   - Example: Chart title shows `Control-S_2406-2407`, legend shows column names

### File Name Truncation Rule for Legends
**IMPORTANT**: Whenever a file name is being truncated to use as a legend entry, apply this rule:

Extract site identifier from filename by taking text between:
- Start: After the 2nd underscore
- End: Before the 4th underscore

**Implementation**: `parts.slice(2, 4).join('_')` where parts = `fileName.split('_')`

Examples:
- `FPOD_Alga_Control-S_2406-2407_std.csv` → `Control-S_2406-2407`
- `FPOD_Temp_Site-A_2501-2503_24hr.csv` → `Site-A_2501-2503`
- `FPOD_Alga_Control-W_2408-2409_std.csv` → `Control-W_2408-2409`

**Apply this rule for**:
- Chart legends when file names are displayed
- Chart titles when file names are used as titles
- Any UI element where file names need to be displayed in shortened form

### Standard Deviation Scaling
- When plotting std series alongside non-std series, automatically scale std values down by factor of 0.1 relative to the main series range
- Add "(scaled)" indicator to legend for scaled series
- This prevents std series from overwhelming the main data visualization

## Standard Plot Data Reading Requirements

### Single File Selection for Standard Plots
When using standard plots with single file selection:

1. **Complete Data Reading**:
   - When selecting "Dolphin" and just one std file, the app MUST read ALL time values and ALL corresponding Dolphin DPM values from the entire CSV file
   - The plot should display the complete dataset in its entirety, not just a subset

2. **Source Column Mapping**:
   - When "Dolphin" is selected, read from the DPM column that corresponds to Dolphin data
   - When "Porpoise" is selected, read from the DPM column that corresponds to Porpoise data
   - When "Sonar" is selected, read from the DPM column that corresponds to Sonar data

3. **Time Series Completeness**:
   - All time values from the CSV file should be plotted on the x-axis
   - All corresponding DPM values should be plotted on the y-axis
   - No data truncation or limitation should occur for single file selections

**CRITICAL**: Currently this is NOT happening - the std plot is not reading and displaying the complete dataset when selecting a single file with one source variable.

### Standard File Format Reference
Here is a typical std file structure that the plotting functions should handle:

```csv
Time,Porpoise (DPM),Porpoise (Clicks),Dolphin (DPM),Dolphin (Clicks),Sonar (DPM),Sonar (Clicks)
2024-07-31T08:59:00.000Z,0,0,0,0,3,1081
2024-07-31T09:59:00.000Z,0,0,0,0,0,0
2024-07-31T10:59:00.000Z,0,0,0,0,0,0
2024-07-31T11:59:00.000Z,0,0,1,23,0,0
```

**Key Format Characteristics**:
- **Time Column**: ISO 8601 timestamp format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **DPM Columns**: `Porpoise (DPM)`, `Dolphin (DPM)`, `Sonar (DPM)` - these contain the detection per minute values to plot
- **Clicks Columns**: `Porpoise (Clicks)`, `Dolphin (Clicks)`, `Sonar (Clicks)` - supplementary data
- **Data Values**: Numeric values (0, 1, 3, 23, 1081, etc.)

**Implementation Requirements**:
- When "Dolphin" is selected, read from `Dolphin (DPM)` column
- When "Porpoise" is selected, read from `Porpoise (DPM)` column
- When "Sonar" is selected, read from `Sonar (DPM)` column
- Parse ISO timestamps to extract date/time for x-axis labeling
- Plot ALL rows in the file, not just a subset

### X-Axis Time Label Spacing Requirements
For std plots with potentially large datasets spanning days/weeks/months:

**Intelligent Label Density**:
- Time labels on the x-axis should be adjusted to show a sensible amount spanning the entire axis
- Labels must not overlap or crowd the x-axis
- Implement dynamic spacing based on dataset size and plot width
- Show representative time points across the full data range

**Optimal Spacing Logic**:
- Target exactly 8-12 labels across the entire x-axis length
- Calculate spacing dynamically: `spacing = Math.ceil(dataSize / 10)`
- Always include first and last time points for context
- Maintain 45-degree rotation to prevent overlap

**Examples**:
- 24 time points → every 3rd label → 8 labels total
- 100 time points → every 10th label → 10 labels total
- 500 time points → every 50th label → 10 labels total
- 1000 time points → every 100th label → 10 labels total

**Goal**: Clean, readable x-axis with minimal label density regardless of dataset size.

## Implementation Notes
- These rules ensure consistent chart readability and meaningful data comparison
- Chart titles should be left-aligned and positioned above the plotting area
- Legend items should be clearly distinguished between file names and column names based on selection order