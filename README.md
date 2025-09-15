# CROPreport 0.1

A web-based CSV data visualization and processing tool designed for crop research data analysis, specifically handling algae cultivation measurements with growth metrics, blade dimensions, and harvest data.

## 🎯 Features

- **CSV Data Loading**: Load and process CROP CSV files with automatic file management
- **Data Conversion**: Convert raw data to standardized (_std) and 24-hour average (_24hr) formats
- **Interactive Visualization**: Generate plots comparing sites and sources across different time periods
- **Data Export**: Export processed data in CSV format
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

1. Open `index.html` in a modern web browser
2. Click "Select CSV Files" to load your CROP data files
3. View and process your data in the Reformat tab
4. Create visualizations in the Plot tab

## 📊 Supported Data Format

The app expects CROP CSV files with the following structure:
```csv
Time,Porpoise (DPM),Porpoise (Clicks),Dolphin (DPM),Dolphin (Clicks),Sonar (DPM),Sonar (Clicks)
2024-07-31T08:59:00.000Z,0,0,0,0,3,1081
```

## 📂 File Naming Convention

```
Crop_{Project}_{Site}_{DateRange}_{Version}.csv

Examples:
- Crop_ALGA_2503_Indiv.csv
- Crop_ALGA_2503_Summary.csv

```

## 🛠️ Development

This is a client-side application built with:
- **HTML5** for structure
- **CSS3** for styling
- **Vanilla JavaScript** for functionality
- **Canvas API** for data visualization

## 📖 Documentation

Detailed documentation is available in the `/docs` folder:
- [Comprehensive Requirements](docs/COMPREHENSIVE_PROJECT_REQUIREMENTS.md)
- [Project History](docs/PROJECT_HISTORY.md)
- [Development Guidelines](docs/CLAUDE.md)
- [CROP CSV File Format](docs/CROP_CSV_SPECIFICATION.md)

## 🎉 Recent Updates

**CROPreport 0.1 Initial Release** - Major simplification:
- Adapted from FPOD report app for crop research analysis
- Added CROP CSV format specification and validation
- Updated branding and UI for crop research workflows

---

*For technical support or feature requests, please refer to the project documentation.*
