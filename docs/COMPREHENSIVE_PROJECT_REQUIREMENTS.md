# CSV Data Visualization Tool - Comprehensive Project Requirements

## 1. APPLICATION OVERVIEW

### 1.1 Purpose
A web-based CSV data visualization and processing tool designed for marine acoustic data analysis, specifically handling FPOD (Fish POD) detection data with DPM (Detections Per Minute) metrics for Porpoise, Dolphin, and Sonar sources.

### 1.2 Core Functionality
- **File Management**: Load, process, and manage CSV files with version tracking
- **Data Processing**: Convert raw data to standardized (_std) and 24-hour average (_24hr) formats
- **Visualization**: Generate interactive plots comparing sites and sources across different time periods
- **Data Export**: Export processed data in CSV format

## 2. TECHNICAL ARCHITECTURE

### 2.1 File Structure
```
report-app/
├── index.html              # Main application interface
├── script.js               # Core JavaScript functionality (5,342 lines)
├── styles.css              # Styling and layout (834 lines, 122 CSS rules)
├── PROJECT_REQUIREMENTS.md # Legacy requirements document
└── COMPREHENSIVE_PROJECT_REQUIREMENTS.md # This document
```

### 2.2 Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Visualization**: HTML5 Canvas API for plotting
- **File Processing**: Client-side CSV parsing and manipulation
- **Data Storage**: Browser memory (no server/database)

## 3. USER INTERFACE SPECIFICATION

### 3.1 Application Layout
- **Top Navigation**: Two-tab interface (Reformat | Plot)
- **Modal System**: File loading modal with multi-file selection
- **Responsive Design**: Adapts to different screen sizes
- **Color Scheme**: Teal/blue palette (#2B7A78 primary)

### 3.2 Reformat Page
- **File Browser**: Working directory display with version indicators
- **Data Table**: Interactive CSV data viewer with sorting
- **Plot Preview**: Canvas-based time series visualization
- **File Actions**: Load, convert (STD/24HR), export functions

### 3.3 Plot Page
#### 3.3.1 24-Hour Average DPM Section
- **Site Comparison**: Compare multiple sites for one source
- **Source Comparison**: Compare multiple sources for one site
- **Controls**: Dropdown selectors for sources and sites
- **Output**: Canvas-based plots with legends

#### 3.3.2 Standard DPM Analysis Section
- **Site Comparison**: Compare multiple sites for one source (std files)
- **Source Comparison**: Compare multiple sources for one site (std files)
- **Controls**: Similar to 24hr section but for _std files

## 4. DATA PROCESSING WORKFLOWS

### 4.1 File Version System
The application manages three versions of each dataset:
- **Raw**: Original uploaded CSV file
- **_std**: Standardized format with ISO timestamps and hourly data
- **_24hr**: 24-hour averaged data for daily analysis

### 4.2 File Naming Convention
```
FPOD_{Source}_{Site}_{DateRange}_{Version}.csv

Examples:
- FPOD_Alga_Control-S_2406-2407_raw.csv
- FPOD_Alga_Control-S_2406-2407_std.csv
- FPOD_Alga_Control-S_2406-2407_24hr.csv
```

### 4.3 Standard File Format (_std)
```csv
Time,Porpoise (DPM),Porpoise (Clicks),Dolphin (DPM),Dolphin (Clicks),Sonar (DPM),Sonar (Clicks)
2024-07-31T08:59:00.000Z,0,0,0,0,3,1081
2024-07-31T09:59:00.000Z,0,0,0,0,0,0
2024-07-31T10:59:00.000Z,0,0,0,0,0,0
2024-07-31T11:59:00.000Z,0,0,1,23,0,0
```

**Key Characteristics**:
- **Time Column**: ISO 8601 timestamp format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **DPM Columns**: `Porpoise (DPM)`, `Dolphin (DPM)`, `Sonar (DPM)`
- **Clicks Columns**: `Porpoise (Clicks)`, `Dolphin (Clicks)`, `Sonar (Clicks)`
- **Data Values**: Numeric values (0, 1, 3, 23, 1081, etc.)

### 4.4 Data Processing Pipeline

#### 4.4.1 Raw to Standard (_std) Conversion
1. **Time Column Detection**: Identify time/date columns using pattern matching
2. **Timestamp Standardization**: Convert various formats to ISO 8601
3. **Data Validation**: Ensure numeric values in DPM columns
4. **Missing Data Handling**: Replace missing values with 0
5. **Output Formatting**: Create standardized CSV with proper headers

#### 4.4.2 Standard to 24-Hour (_24hr) Conversion
1. **Time Grouping**: Group data by hour (0-23)
2. **Average Calculation**: Calculate mean DPM values for each hour
3. **Data Aggregation**: Combine data across multiple days
4. **Output Generation**: Create 24-row CSV (one per hour)

## 5. PLOTTING SYSTEM SPECIFICATION

### 5.1 Plot Types
1. **Site Comparison Plots**: Multiple sites, single source
2. **Source Comparison Plots**: Single site, multiple sources
3. **Dual-Axis Plots**: DPM values + percentage detection rates

### 5.2 Plot Configuration

#### 5.2.1 Canvas Settings
- **Dimensions**: 800px × 400px base size
- **Responsive**: Scales to container width
- **Background**: White with professional styling

#### 5.2.2 Plot Areas
- **Plot Area**: Inner plotting region with data
- **Margins**: 60px left, 40px right, 40px top, 80px bottom
- **Grid**: Optional vertical gridlines for time points

#### 5.2.3 Axes Configuration
- **X-Axis**: Date labels in dd/mm/yy format
- **Y-Axis Left**: DPM values (0 to max)
- **Y-Axis Right**: Percentage values (0-100%) for dual-axis plots
- **Labels**: 45-degree rotation to prevent overlap

### 5.3 Time Label Management

#### 5.3.1 Intelligent Spacing Algorithm
```javascript
calculateOptimalLabelSpacing(dataSize) {
    const targetLabelCount = 10; // Aim for ~10 labels total
    const spacing = Math.max(1, Math.ceil(dataSize / targetLabelCount));
    return spacing;
}
```

#### 5.3.2 Spacing Examples
- **24 time points** → every 3rd label → 8 labels total
- **100 time points** → every 10th label → 10 labels total
- **500 time points** → every 50th label → 10 labels total
- **1000 time points** → every 100th label → 10 labels total

#### 5.3.3 Label Formatting

**24hr Plots:**
- **Format**: HH:MM (e.g., "00:00", "12:00", "23:00")
- **Rotation**: -45 degrees for readability
- **Alignment**: Right-aligned after rotation
- **Positioning**: 20px below x-axis line

**Standard Plots:**
- **Format**: dd/mm/yy (e.g., "31/07/24")
- **Rotation**: -45 degrees for readability
- **Alignment**: Right-aligned after rotation
- **Positioning**: 20px below x-axis line

### 5.4 Legend System

#### 5.4.1 Intelligent Sizing
```javascript
// Measure text width dynamically
plotData.forEach((item) => {
    const textWidth = ctx.measureText(item.name).width;
    maxTextWidth = Math.max(maxTextWidth, textWidth);
});

// Calculate optimal width
const legendWidth = Math.max(120, maxTextWidth + 50);
```

#### 5.4.2 Legend Types
1. **Single Legend**: Site/source names with color indicators
2. **Dual-Axis Legend**: Separate sections for DPM and percentage values
3. **Scaling Indicators**: "(scaled)" notation for adjusted values

#### 5.4.3 Visual Properties
- **Background**: Semi-transparent white (rgba(255, 255, 255, 0.7))
- **Border**: Light gray with 0.5px thickness
- **Padding**: 10-12px for proper text spacing
- **Position**: Top-left corner of plot area

### 5.5 File Name Truncation

#### 5.5.1 Truncation Rule
Extract site identifier from filename using pattern:
```javascript
// Extract from 2nd underscore to 4th underscore
parts.slice(2, 4).join('_')
```

#### 5.5.2 Examples
- `FPOD_Alga_Control-S_2406-2407_std.csv` → `Control-S_2406-2407`
- `FPOD_Temp_Site-A_2501-2503_24hr.csv` → `Site-A_2501-2503`
- `FPOD_Alga_Control-W_2408-2409_std.csv` → `Control-W_2408-2409`

## 6. DATA VALIDATION AND ERROR HANDLING

### 6.1 File Validation
- **Format Check**: Ensure CSV format with proper delimiters
- **Header Validation**: Verify presence of required columns
- **Data Type Validation**: Ensure numeric values in DPM columns
- **Size Limits**: Handle files up to reasonable memory limits

### 6.2 Error Messages
- **User-Friendly**: Clear, actionable error descriptions
- **Specific**: Identify exact issues (missing columns, invalid data)
- **Helpful**: Provide suggestions for fixing problems

### 6.3 Data Sanitization
- **Missing Values**: Replace with 0 or appropriate defaults
- **Invalid Timestamps**: Flag and handle gracefully
- **Outliers**: Display warnings for unusual values

## 7. SELECTION AND VALIDATION LOGIC

### 7.1 Single File/Variable Support
- **Minimum Selection**: Changed from 2 to 1 items required
- **Button States**: Enabled with single selection
- **Plot Generation**: Works with single file or variable

### 7.2 Validation Rules
```javascript
// Updated validation logic
generateSiteComparisonBtn.disabled = !sourceSelected || sitesSelected.length < 1;
generateSourceComparisonBtn.disabled = !siteSelected || sourcesSelected.length < 1;
```

### 7.3 User Feedback
- **Button States**: Visual indication of enabled/disabled states
- **Status Messages**: Real-time feedback on selections
- **Error Prevention**: Disable invalid combinations

## 8. PERFORMANCE CONSIDERATIONS

### 8.1 Memory Management
- **Client-Side Processing**: All operations in browser memory
- **File Size Limits**: Reasonable limits to prevent browser crashes
- **Garbage Collection**: Proper cleanup of large data structures

### 8.2 Rendering Performance
- **Canvas Optimization**: Efficient drawing operations
- **Data Reduction**: Intelligent sampling for large datasets
- **Responsive Updates**: Smooth user interactions

### 8.3 User Experience
- **Loading Indicators**: Visual feedback during processing
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Accessibility**: Keyboard navigation and screen reader support

## 9. TESTING AND QUALITY ASSURANCE

### 9.1 Test Data Requirements
- **Sample Files**: Representative CSV files for testing
- **Edge Cases**: Large files, missing data, invalid formats
- **Browser Compatibility**: Testing across modern browsers

### 9.2 Validation Checklist
- [ ] File loading and parsing
- [ ] Data conversion (std/24hr)
- [ ] Plot generation (all types)
- [ ] Legend positioning and sizing
- [ ] Label spacing and rotation
- [ ] Single file selection
- [ ] Error handling
- [ ] Export functionality

## 10. FUTURE ENHANCEMENTS

### 10.1 Potential Features
- **Data Persistence**: Save/load project states
- **Export Options**: PNG/PDF plot export
- **Advanced Filtering**: Date range and value filtering
- **Statistical Analysis**: Trend analysis and statistics
- **Batch Processing**: Multiple file operations

### 10.2 Technical Improvements
- **Server Integration**: Optional backend for large files
- **Database Support**: Persistent data storage
- **API Integration**: External data sources
- **Real-time Updates**: Live data streaming

## 11. DEVELOPMENT GUIDELINES

### 11.1 Code Standards
- **ES6+**: Modern JavaScript features
- **Modular Design**: Clear separation of concerns
- **Documentation**: Comprehensive inline comments
- **Error Handling**: Robust error catching and reporting

### 11.2 Version Control
- **Git Workflow**: Feature branches for development
- **Commit Messages**: Clear, descriptive commit messages
- **Release Tagging**: Version tags for releases
- **Documentation**: Keep requirements updated

### 11.3 Deployment
- **Static Hosting**: Can be deployed as static files
- **CDN Support**: Assets can be cached
- **HTTPS Required**: For file system access APIs
- **Browser Requirements**: Modern browsers with canvas support

---

*This document serves as the comprehensive technical specification for the CSV Data Visualization Tool. It should be updated whenever significant changes are made to the application architecture or functionality.*