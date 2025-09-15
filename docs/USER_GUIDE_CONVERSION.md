# SUBCAM File Conversion User Guide

## Overview

The SUBCAM File Conversion system allows you to transform raw observation data (_raw format) into aggregated daily summaries in two different formats:

- **_nmax format**: Daily maximum individual counts per species
- **_obvs format**: Daily observation event counts per species

## Getting Started

### 1. Load Your Data

1. Click "📄 Select CSV Files" when the app starts
2. Choose your _raw format CSV file(s)
3. The conversion section will automatically appear for compatible files

### 2. Select Conversion Type

Choose between two conversion options:

#### _raw → _nmax (Daily Maximum Counts)
- **Purpose**: Calculate the maximum number of individuals observed per species per day
- **Method**: Takes the maximum count from each clip, then sums across all clips for each day
- **Use for**: Population estimates, abundance analysis, biomass calculations

#### _raw → _obvs (Daily Observation Events)
- **Purpose**: Count the number of observation events per species per day
- **Method**: Counts each observation record as one event
- **Use for**: Detection frequency, observation effort analysis, activity patterns

### 3. Apply Quality Filters (Optional)

Filter your data based on observation quality:

#### Minimum Confidence Level (1-5)
- **1**: Very Low confidence
- **2**: Low confidence
- **3**: Medium confidence
- **4**: High confidence
- **5**: Very High confidence

#### Minimum Video Quality (1-5)
- **1**: Very Poor quality
- **2**: Poor quality
- **3**: Fair quality
- **4**: Good quality
- **5**: Excellent quality

**Recommendation**: Use minimum confidence level 3 and minimum quality 3 for reliable results.

### 4. Validate Your Data

Click **"📋 Validate Data"** to check your file for:
- Required columns presence
- Data format consistency
- Timestamp validity
- Species identifier completeness
- Quantity value accuracy

The validation report will show:
- ✅ **Errors**: Critical issues that must be fixed
- ⚠️ **Warnings**: Non-critical issues to review
- 📊 **Metrics**: Data quality summary
- 💡 **Recommendations**: Suggestions for improvement

### 5. Convert Your File

Click **"🔄 Convert File"** to start the conversion process. You'll see:
- Real-time progress bar
- Processing status updates
- Conversion completion notification

### 6. Review Results

After conversion, review the results including:
- **Conversion Summary**: Input/output row counts, date range, species count
- **Output Validation**: Confirmation that converted data passes quality checks
- **Data Preview**: First 5 rows of converted data

### 7. Download Results

Click **"💾 Download Result"** to save your converted file. The filename will be automatically generated as:
```
original_filename_nmax_YYYY-MM-DD.csv
original_filename_obvs_YYYY-MM-DD.csv
```

## Understanding Your Data

### Required Input Columns

Your _raw CSV file must contain:

#### Essential Columns:
- **File Name**: Identifies the video clip/deployment
- **Event Observation**: Description of what was observed
- **Quantity (Nmax)**: Maximum individuals visible in the observation

#### Timestamp Columns (at least one):
- **Adjusted Date and Time** *(preferred)*
- **Adjusted Date / Time** *(alternative)*
- **Date/Time of Recording** *(fallback)*

#### Species Identification (at least one):
- **Lowest Order Scientific Name** *(preferred)*
- **Common Name** *(fallback)*

#### Optional Quality Columns:
- **Confidence Level** (1-5): Observer confidence in identification
- **Quality of Video** (1-5): Video quality rating
- **Where on Screen** (1-9): Position reference

### Output Format Differences

#### _nmax Output Columns:
```
Date | Total Observations | Cumulative Observations | All Unique Organisms Observed Today |
New Unique Organisms Today | Cumulative New Unique Organisms | Cumulative Unique Species |
[Species Columns...]
```

#### _obvs Output Columns:
```
Date | Total Observations | Unique Organisms Observed Today | New Unique Organisms Today |
Cumulative Unique Species | [Species Columns...]
```

## Advanced Features

### Timezone Handling

All timestamps are automatically converted to **Europe/London** timezone for consistent daily aggregation.

### Species Name Selection

The system automatically selects the best available species identifier:
1. **Scientific Name** (if available and non-empty)
2. **Common Name** (if scientific name not available)
3. Skip record if neither is available

### Data Normalization

The system automatically:
- Removes non-breaking space characters (NBSP)
- Trims whitespace from all text fields
- Normalizes text formatting
- Validates numeric values

### Multiple File Processing

For datasets with multiple clips per day:
- **_nmax**: Takes maximum from each clip, then sums across clips
- **_obvs**: Counts all events regardless of clip

## Troubleshooting

### Common Issues

#### "No valid timestamps found"
- Check that at least one timestamp column contains valid dates
- Ensure date format is recognizable (YYYY-MM-DD HH:MM:SS preferred)

#### "No valid species identifiers found"
- Verify that either Common Name or Scientific Name columns have data
- Check for empty or whitespace-only values

#### "Missing required columns"
- Ensure your CSV has File Name, Event Observation, and Quantity columns
- Check column names match exactly (case-sensitive)

#### "Negative quantity values"
- Review Quantity (Nmax) column for negative numbers
- Use quality filters to exclude problematic records

### File Format Tips

1. **Use UTF-8 encoding** for CSV files
2. **Ensure consistent date formats** across all timestamps
3. **Avoid special characters** in species names
4. **Use numeric values only** for Quantity, Confidence, and Quality columns
5. **Keep file names descriptive** for easy identification

### Performance Guidelines

- **Small files** (<1,000 rows): Process instantly
- **Medium files** (1,000-10,000 rows): Complete within seconds
- **Large files** (10,000+ rows): Progress tracking will show status

## Quality Assurance

### Validation Checks

The system performs comprehensive validation:

#### Pre-conversion:
- Column presence and format validation
- Data type and range checking
- Completeness assessment
- Quality metric calculation

#### Post-conversion:
- Output format compliance
- Mathematical consistency verification
- Cumulative field monotonicity
- Row total accuracy

### Best Practices

1. **Always validate** your data before conversion
2. **Review quality metrics** to understand your dataset
3. **Apply appropriate filters** based on confidence and quality
4. **Verify results** by checking the data preview
5. **Keep original files** as backup before conversion

## Example Workflow

1. **Upload** your `SUBCAM_Site_A_raw.csv` file
2. **Choose** "_raw → _nmax" conversion
3. **Set** minimum confidence to 3 and minimum quality to 3
4. **Validate** data (check for any issues)
5. **Convert** file (monitor progress)
6. **Review** results (check species count and date range)
7. **Download** as `SUBCAM_Site_A_nmax_2024-03-15.csv`

## Support

For technical support or questions:
- Check validation messages for specific guidance
- Review error messages for troubleshooting steps
- Ensure your CSV follows the required format
- Contact your system administrator for persistent issues

---

*This guide covers the complete file conversion workflow. For additional technical details, see the FILE_CONVERSION_PLANNING.md documentation.*