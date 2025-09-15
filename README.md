# FPOD Report App

A web-based CSV data visualization and processing tool designed for marine acoustic data analysis, specifically handling FPOD (Fish POD) detection data with DPM (Detections Per Minute) metrics.

## 🎯 Features

- **CSV Data Loading**: Load and process FPOD CSV files with automatic file management
- **Data Conversion**: Convert raw data to standardized (_std) and 24-hour average (_24hr) formats
- **Interactive Visualization**: Generate plots comparing sites and sources across different time periods
- **Data Export**: Export processed data in CSV format
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

1. Open `index.html` in a modern web browser
2. Click "Select CSV Files" to load your FPOD data files
3. View and process your data in the Reformat tab
4. Create visualizations in the Plot tab

## 📊 Supported Data Format

The app expects FPOD CSV files with the following structure:
```csv
Time,Porpoise (DPM),Porpoise (Clicks),Dolphin (DPM),Dolphin (Clicks),Sonar (DPM),Sonar (Clicks)
2024-07-31T08:59:00.000Z,0,0,0,0,3,1081
```

## 📂 File Naming Convention

```
FPOD_{Source}_{Site}_{DateRange}_{Version}.csv

Examples:
- FPOD_Alga_Control-S_2406-2407_raw.csv
- FPOD_Alga_Control-S_2406-2407_std.csv
- FPOD_Alga_Control-S_2406-2407_24hr.csv
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

## 🎉 Recent Updates

**App Cleanup Pt2** - Major simplification:
- Removed SUBCAM functionality (FPOD-only focus)
- Cleaned up codebase and removed backup files
- Improved code organization and maintainability

---

*For technical support or feature requests, please refer to the project documentation.*
