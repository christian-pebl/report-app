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

### File Name Truncation Rule
Extract site identifier from filename by taking text between:
- Start: After the 2nd underscore
- End: Before the 4th underscore

Examples:
- `FPOD_Alga_Control-S_2406-2407_std.csv` → `Control-S_2406-2407`
- `FPOD_Temp_Site-A_2501-2503_24hr.csv` → `Site-A_2501-2503`

### Standard Deviation Scaling
- When plotting std series alongside non-std series, automatically scale std values down by factor of 0.1 relative to the main series range
- Add "(scaled)" indicator to legend for scaled series
- This prevents std series from overwhelming the main data visualization

## Implementation Notes
- These rules ensure consistent chart readability and meaningful data comparison
- Chart titles should be left-aligned and positioned above the plotting area
- Legend items should be clearly distinguished between file names and column names based on selection order