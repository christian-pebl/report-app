# SUBCAM Plot Page Specifications

## Overview
The Plot page has been converted from FPOD (acoustic detection) to SUBCAM (visual marine organism detection) functionality. This document specifies the updated features and requirements.

## Key Changes from FPOD to SUBCAM

### **Section 1: Nmax Analysis (Daily Maximum Individuals)**
**Previously:** "24 Hour Average DPM"

#### **1.1 Nmax Constant Variable, Comparing Sites**
- **File Type:** Works with `_nmax.csv` files only
- **Variable Selection:** First dropdown selects any column header (excluding time/date columns)
- **Site Selection:** Second dropdown allows multiple selection of different sites
- **Site Names:** Displayed as truncated filenames (using existing FPOD truncation logic)
- **Purpose:** Compare how one variable (e.g., "Pagurus bernhardus") varies across multiple sites

#### **1.2 Nmax Constant Site, Comparing Variables**
- **File Type:** Works with `_nmax.csv` files only
- **Site Selection:** First dropdown selects one `_nmax.csv` file
- **Variable Selection:** Second dropdown allows multiple selection of variable columns
- **Purpose:** Compare multiple variables (species) within a single site

### **Section 2: Observation Events Analysis (Daily Totals)**
**Previously:** "Standard DPM Analysis"

#### **2.1 Observations Constant Variable, Comparing Sites**
- **File Type:** Works with `_obvs.csv` files only
- **Variable Selection:** First dropdown selects any column header (excluding time/date columns)
- **Site Selection:** Second dropdown allows multiple selection of different sites
- **Purpose:** Compare how one variable varies across multiple sites using observation event data

#### **2.2 Observations Constant Site, Comparing Variables**
- **File Type:** Works with `_obvs.csv` files only
- **Site Selection:** First dropdown selects one `_obvs.csv` file
- **Variable Selection:** Second dropdown allows multiple selection of variable columns
- **Purpose:** Compare multiple variables within a single site using observation event data

## Technical Implementation Details

### **File Filtering Logic**
- `_nmax.csv` files for Nmax Analysis section
- `_obvs.csv` files for Observation Events Analysis section
- Existing FPOD file truncation logic reused for site name display

### **Variable Selection Criteria**
**Include:**
- All species columns (e.g., "Pagurus bernhardus", "Merlangius merlangus")
- Analysis columns ("Total Observations", "Cumulative Observations", etc.)
- Numeric data columns

**Exclude:**
- Date/time columns ("Date", "Adjusted Date and Time", etc.)
- Index columns ("Unnamed: 0", etc.)

### **SUBCAM Data Context**
- **_nmax files:** Daily aggregates based on Nmax (maximum individuals visible simultaneously)
- **_obvs files:** Daily aggregates of observation events (not maximum concurrency)
- **Species examples:** Pagurus bernhardus, Ammodytes sp., Callionymus lyra, Carcinus maenas, etc.

## UI Labels and Text

### **Updated Labels**
| Old FPOD Label | New SUBCAM Label |
|---|---|
| "Select DPM Column" | "Select Variable" |
| "Select _24hr.csv Files" | "Select _nmax.csv Files" |
| "Select _std.csv Files" | "Select _obvs.csv Files" |
| "Generate Source Comparison Plot" | "Generate Variable Comparison Plot" |

### **Updated Help Text**
| Context | New Help Text |
|---|---|
| Variable Selection | "Choose any variable column (excluding time/date columns)" |
| File Selection | "Hold Ctrl/Cmd to select multiple _nmax.csv files" |
| File Selection | "Hold Ctrl/Cmd to select multiple _obvs.csv files" |
| Multi-Variable | "Hold Ctrl/Cmd to select multiple variables" |

## Button Functions
- **"Generate Site Comparison Plot"** - Compare sites for a selected variable
- **"Generate Variable Comparison Plot"** - Compare variables for a selected site

## File Naming Convention Reference
```
ID_Subcam_<ProjectOrSite>[_W]_<YYMM-YYMM>_<type>.csv

Examples:
- ID_Subcam_Alga_Control_2406-2407_nmax.csv
- ID_Subcam_Alga_Control_2406-2407_obvs.csv
```

## Implementation Status
✅ **Completed - 2025-09-15**
- All HTML labels and text updated
- Section headers converted to SUBCAM context
- Form controls updated for _nmax and _obvs file types
- Help text updated for species/variable selection
- Button labels updated appropriately

## Next Steps Required
🔄 **JavaScript Backend Updates Needed:**
1. Update file filtering logic (_24hr → _nmax, _std → _obvs)
2. Update variable population logic (exclude time columns)
3. Ensure site name truncation works with SUBCAM filename format
4. Test dropdown population with real SUBCAM data files

---

*Generated: 2025-09-15*
*Project: SUBCAMreport 0.2*
*Context: Converting from FPOD acoustic detection to SUBCAM visual organism detection*
