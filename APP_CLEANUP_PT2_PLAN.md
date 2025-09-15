# App Cleanup Part 2 - Comprehensive Implementation Plan

## 📋 Executive Summary

This document outlines the complete strategy for App Cleanup Part 2, building on the foundation established in Part 1. The plan focuses on major architectural improvements, SUBCAM removal, and modernization of the codebase.

### Completed in Part 1
- ✅ Removed 17 unnecessary files (backups, debug, test files)
- ✅ Reduced repository from 23 to 12 files (48% reduction)
- ✅ Replaced inline styles with CSS classes (16 instances)
- ✅ Added `.hidden` utility class for consistency

### Remaining Critical Issues
- ❌ **Monolithic script.js** (5,374 lines - UNCHANGED)
- ❌ **SUBCAM functionality** (adds 25-30% unnecessary complexity)
- ❌ **No module system** implemented
- ❌ **No build process** (Vite/webpack)
- ❌ **Mixed responsibilities** in CSVManager class
- ❌ **Remaining backup files**

---

## 🎯 Phase 1: Immediate High-Impact Cleanup (Days 1-2)

### Priority 1A: SUBCAM Complete Removal ⭐ **HIGHEST IMPACT**

#### HTML Changes (index.html)
```html
<!-- REMOVE: SUBCAM container from navigation section -->
<div class="subcam-container">
  <div class="mode-slider-container">
    <div class="device-label">SUBCAM</div>
    <div class="slider-track">
      <div class="slider-thumb"></div>
    </div>
    <div class="slider-icons">
      <!-- Delete entire subcam navigation block -->
    </div>
  </div>
</div>

<!-- REMOVE: Entire subcam-reformatPage section -->
<div id="subcam-reformatPage" class="page-content">
  <!-- Delete all SUBCAM reformat content -->
</div>

<!-- REMOVE: Entire subcam-plotPage section -->
<div id="subcam-plotPage" class="page-content">
  <!-- Delete all SUBCAM plot content -->
</div>
```

#### CSS Changes (styles.css)
```css
/* REMOVE all SUBCAM-related selectors: */
.subcam-container { /* DELETE */ }
.subcam-container .mode-slider-container { /* DELETE */ }
.subcam-container .device-label { /* DELETE */ }
.subcam-container .slider-track { /* DELETE */ }
.subcam-container .slider-thumb { /* DELETE */ }
.subcam-container .slider-icons { /* DELETE */ }
.subcam-container .slider-icon { /* DELETE */ }

/* Remove any SUBCAM page-specific styling */
#subcam-reformatPage { /* DELETE */ }
#subcam-plotPage { /* DELETE */ }

/* Remove SUBCAM slider positioning rules */
/* Remove any other SUBCAM-specific styling */
```

#### JavaScript Changes (script.js)
```javascript
// REMOVE all SUBCAM-related code:

// 1. SUBCAM variables and state
// 2. SUBCAM file browser logic
// 3. SUBCAM data processing functions
// 4. SUBCAM event handlers
// 5. SUBCAM slider logic and references
// 6. SUBCAM dropdown update functions
// 7. SUBCAM navigation handling

// UPDATE NavigationManager class to only handle:
//   - reformatPage (FPOD reformat)
//   - plotPage (FPOD plot)

// CLEAN UP:
// - Remove SUBCAM references in comments
// - Remove SUBCAM console.log statements
// - Update any remaining dual-device logic to FPOD-only
```

#### Implementation Commands
```bash
# Create backup branch first
git checkout -b subcam-removal

# Manual editing required for HTML, CSS, JS files
# Use search/replace for "subcam", "SUBCAM", "SubCam" etc.

# Test FPOD functionality after removal
# Verify all FPOD features still work correctly

# Commit the major simplification
git add .
git commit -m "app-cleanup-pt2: Remove SUBCAM functionality, simplify to FPOD-only"
```

**Expected Impact:**
- **~500-800 lines removed** from script.js
- **~50-100 lines removed** from index.html
- **~20-30 CSS rules removed**
- **25-30% overall code reduction**
- **Significantly simplified mental model**

### Priority 1B: Final File Cleanup
```bash
# Remove remaining backup files
git rm script.js.backup-robust-legend styles.css.backup

# Organize documentation
mkdir docs
mv COMPREHENSIVE_PROJECT_REQUIREMENTS.md docs/
mv PROJECT_HISTORY.md docs/
mv PROJECT_REQUIREMENTS.md docs/
mv CLAUDE.md docs/

# Create proper README
cat > README.md << 'EOF'
# Report App - FPOD Data Visualization Tool

A web-based CSV data visualization and processing tool designed for marine acoustic data analysis, specifically handling FPOD (Fish POD) detection data with DPM (Detections Per Minute) metrics.

## Features
- CSV file loading and processing
- Data conversion (raw → std → 24hr formats)
- Interactive plotting and visualization
- Data export functionality

## Quick Start
1. Open `index.html` in a modern browser
2. Load your FPOD CSV files
3. Convert and visualize your data

## Documentation
See `/docs` folder for detailed project requirements and history.
EOF

git add .
git commit -m "app-cleanup-pt2: Remove backups, organize docs, create proper README"
```

---

## 🏗️ Phase 2: Modern Build System Setup (Day 3)

### Build Tool Configuration
```bash
# Initialize modern development environment
npm init -y

# Install development dependencies
npm install --save-dev vite eslint vitest

# Create project structure
mkdir -p src/{config,utils,services,components,store,workers}
mkdir public

# Move files to proper locations
mv index.html public/
mv styles.css public/
mv script.js src/legacy-script.js

# Create entry point
touch src/main.js
```

### Package.json Configuration
```json
{
  "name": "fpod-report-app",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src/**/*.js",
    "test": "vitest"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "eslint": "^8.50.0",
    "vitest": "^1.0.0"
  }
}
```

### Vite Configuration
```javascript
// vite.config.js
export default {
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000
  }
};
```

---

## 📦 Phase 3: Modular Architecture (Days 4-7)

### Step 1: Extract FPOD-Specific Constants
```javascript
// src/config/fpodConstants.js
export const FPOD_CONFIG = {
  SOURCES: ['Porpoise', 'Dolphin', 'Sonar'],
  FILE_SUFFIXES: ['raw', 'std', '24hr'],
  DPM_COLUMNS: ['Porpoise (DPM)', 'Dolphin (DPM)', 'Sonar (DPM)'],
  CLICKS_COLUMNS: ['Porpoise (Clicks)', 'Dolphin (Clicks)', 'Sonar (Clicks)']
};

export const PLOT_CONFIG = {
  MARGINS: { left: 60, right: 40, top: 40, bottom: 80 },
  COLORS: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'],
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 400,
  MAX_LABELS: 10
};

export const UI_CONFIG = {
  VIRTUAL_TABLE_ROW_HEIGHT: 30,
  VISIBLE_ROWS: 50,
  MAX_FILE_SIZE: 50 * 1024 * 1024 // 50MB
};
```

### Step 2: Utility Modules
```javascript
// src/utils/csvParser.js
export class CSVParser {
  static parse(content) {
    // Extract CSV parsing logic from legacy script
  }

  static validateFPODFormat(headers) {
    // FPOD-specific validation only
  }
}

// src/utils/dateUtils.js
export class DateUtils {
  static parseISODate(dateStr) { /* ... */ }
  static formatDateLabel(date, format) { /* ... */ }
  static detectDateFormat(samples) { /* ... */ }
}

// src/utils/validators.js
export class Validators {
  static validateCSVHeaders(headers) { /* ... */ }
  static isNumericColumn(data, colIndex) { /* ... */ }
  static validateFPODData(data) { /* ... */ }
}
```

### Step 3: Service Layer
```javascript
// src/services/FPODDataService.js
export class FPODDataService {
  static convertToStandard(rawData) {
    // Extract std conversion logic
  }

  static convertTo24Hour(stdData) {
    // Extract 24hr conversion logic
  }

  static exportCSV(data, filename) {
    // Extract export logic
  }
}

// src/services/FileService.js
export class FileService {
  static async readFile(file) {
    // Extract file reading logic
  }

  static async saveFile(content, filename) {
    // Extract file saving logic
  }

  static validateFileType(file) {
    // File validation logic
  }
}
```

### Step 4: UI Components
```javascript
// src/components/TableView.js
export class TableView {
  constructor(container) {
    this.container = container;
  }

  render(data) {
    // Extract table rendering logic
  }

  enableVirtualScrolling() {
    // Add virtual scrolling for performance
  }
}

// src/components/PlotView.js
export class PlotView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  renderFPODPlot(plotData) {
    // Extract FPOD-specific plotting logic
  }

  drawLegend(plotData) {
    // Extract legend drawing logic
  }
}

// src/components/Navigation.js (Simplified)
export class Navigation {
  constructor() {
    this.pages = ['reformat', 'plot']; // FPOD-only pages
  }

  switchPage(pageId) {
    // Simplified navigation - only 2 pages
  }
}
```

---

## 🗂️ Phase 4: State Management (Days 8-9)

### Centralized State Store
```javascript
// src/store/AppStore.js
class AppStore {
  constructor() {
    this.state = {
      files: new Map(),           // Loaded FPOD files
      currentFile: null,          // Currently selected file
      view: 'table',             // 'table' or 'plot'
      plotConfig: {              // Plot configuration
        type: 'site',            // 'site' or 'source'
        selectedSources: [],
        selectedSites: [],
        timeRange: null
      },
      processing: {              // Processing status
        isConverting: false,
        convertProgress: 0,
        logs: []
      }
    };
    this.listeners = new Set();
  }

  dispatch(action) {
    switch(action.type) {
      case 'FILE_LOADED':
        this.state.files.set(action.payload.name, action.payload);
        this.state.currentFile = action.payload.name;
        break;

      case 'VIEW_CHANGED':
        this.state.view = action.payload;
        break;

      case 'PLOT_CONFIG_UPDATED':
        this.state.plotConfig = { ...this.state.plotConfig, ...action.payload };
        break;

      case 'PROCESSING_STARTED':
        this.state.processing.isConverting = true;
        this.state.processing.convertProgress = 0;
        break;

      case 'PROCESSING_PROGRESS':
        this.state.processing.convertProgress = action.payload;
        break;

      case 'PROCESSING_COMPLETED':
        this.state.processing.isConverting = false;
        this.state.processing.convertProgress = 100;
        break;
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState() {
    return { ...this.state };
  }
}

export default new AppStore();
```

### Action Creators
```javascript
// src/store/actions.js
export const actions = {
  loadFile: (file, data) => ({
    type: 'FILE_LOADED',
    payload: { name: file.name, data, metadata: { size: file.size, type: file.type } }
  }),

  changeView: (view) => ({
    type: 'VIEW_CHANGED',
    payload: view
  }),

  updatePlotConfig: (config) => ({
    type: 'PLOT_CONFIG_UPDATED',
    payload: config
  }),

  startProcessing: () => ({
    type: 'PROCESSING_STARTED'
  }),

  updateProgress: (progress) => ({
    type: 'PROCESSING_PROGRESS',
    payload: progress
  }),

  completeProcessing: () => ({
    type: 'PROCESSING_COMPLETED'
  })
};
```

---

## ⚡ Phase 5: Performance Optimization (Days 10-12)

### Virtual Scrolling Implementation
```javascript
// src/components/VirtualTable.js
export class VirtualTable {
  constructor(container, options = {}) {
    this.container = container;
    this.rowHeight = options.rowHeight || 30;
    this.visibleRows = options.visibleRows || 50;
    this.buffer = options.buffer || 5;
    this.data = [];
    this.scrollTop = 0;

    this.setupScrollHandler();
  }

  setData(data) {
    this.data = data;
    this.render();
  }

  setupScrollHandler() {
    this.container.addEventListener('scroll', (e) => {
      this.scrollTop = e.target.scrollTop;
      this.render();
    });
  }

  render() {
    const startIndex = Math.floor(this.scrollTop / this.rowHeight);
    const endIndex = Math.min(startIndex + this.visibleRows + this.buffer, this.data.length);

    const visibleData = this.data.slice(startIndex, endIndex);
    this.renderRows(visibleData, startIndex);
  }

  renderRows(data, startIndex) {
    // Render only visible rows for performance
    const tbody = this.container.querySelector('tbody');
    tbody.innerHTML = '';

    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.style.transform = `translateY(${(startIndex + index) * this.rowHeight}px)`;
      // Populate row...
      tbody.appendChild(tr);
    });
  }
}
```

### Web Worker for Data Processing
```javascript
// src/workers/dataProcessor.worker.js
self.addEventListener('message', (e) => {
  const { data, operation, options } = e.data;

  try {
    let result;

    switch(operation) {
      case 'CONVERT_TO_STD':
        result = convertToStandard(data, options);
        break;

      case 'CONVERT_TO_24HR':
        result = convertTo24Hour(data, options);
        break;

      case 'VALIDATE_CSV':
        result = validateCSVData(data);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    self.postMessage({
      success: true,
      result,
      operation
    });

  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
      operation
    });
  }
});

function convertToStandard(data, options) {
  // Move heavy std conversion logic here
  // Report progress back to main thread
  const total = data.length;

  return data.map((row, index) => {
    if (index % 100 === 0) {
      self.postMessage({
        type: 'PROGRESS',
        progress: (index / total) * 100
      });
    }

    // Process row...
    return processedRow;
  });
}

function convertTo24Hour(data, options) {
  // Move heavy 24hr conversion logic here
  // Similar progress reporting
}

function validateCSVData(data) {
  // Move validation logic here
}
```

### Canvas Optimization
```javascript
// src/components/OptimizedPlotView.js
export class OptimizedPlotView extends PlotView {
  constructor(canvas) {
    super(canvas);
    this.offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    this.plotCache = new Map();
  }

  async renderFPODPlot(plotData) {
    const cacheKey = this.generateCacheKey(plotData);

    if (this.plotCache.has(cacheKey)) {
      // Use cached version
      const cachedImageData = this.plotCache.get(cacheKey);
      this.ctx.putImageData(cachedImageData, 0, 0);
      return;
    }

    // Render on offscreen canvas for better performance
    await this.renderOffscreen(plotData);

    // Transfer to main canvas
    const imageData = this.offscreenCtx.getImageData(0, 0,
      this.offscreenCanvas.width, this.offscreenCanvas.height);

    this.plotCache.set(cacheKey, imageData);
    this.ctx.putImageData(imageData, 0, 0);
  }

  async renderOffscreen(plotData) {
    // Use offscreen rendering for complex plots
    // This prevents blocking the main thread
  }

  generateCacheKey(plotData) {
    // Generate cache key based on plot data
    return JSON.stringify({
      data: plotData.map(d => d.values.length),
      type: plotData.type,
      colors: plotData.map(d => d.color)
    });
  }
}
```

---

## 🧪 Phase 6: Testing & Documentation (Days 13-14)

### Testing Framework Setup
```javascript
// tests/csvParser.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { CSVParser } from '../src/utils/csvParser.js';

describe('CSV Parser', () => {
  let sampleCSV;

  beforeEach(() => {
    sampleCSV = `Time,Porpoise (DPM),Dolphin (DPM),Sonar (DPM)
2024-01-01T00:00:00.000Z,0,1,2
2024-01-01T01:00:00.000Z,1,0,3`;
  });

  it('should parse standard FPOD CSV format', () => {
    const result = CSVParser.parse(sampleCSV);

    expect(result.headers).toEqual([
      'Time', 'Porpoise (DPM)', 'Dolphin (DPM)', 'Sonar (DPM)'
    ]);
    expect(result.data).toHaveLength(2);
    expect(result.data[0][1]).toBe('0');  // Porpoise DPM
  });

  it('should validate FPOD format correctly', () => {
    const headers = ['Time', 'Porpoise (DPM)', 'Dolphin (DPM)', 'Sonar (DPM)'];
    expect(CSVParser.validateFPODFormat(headers)).toBe(true);

    const invalidHeaders = ['Date', 'Value1', 'Value2'];
    expect(CSVParser.validateFPODFormat(invalidHeaders)).toBe(false);
  });
});

// tests/fpodDataService.test.js
import { describe, it, expect } from 'vitest';
import { FPODDataService } from '../src/services/FPODDataService.js';

describe('FPOD Data Service', () => {
  it('should convert raw data to standard format', () => {
    const rawData = [
      ['2024-01-01 00:00:00', '0', '1', '2'],
      ['2024-01-01 01:00:00', '1', '0', '3']
    ];

    const result = FPODDataService.convertToStandard(rawData);

    expect(result[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should convert standard data to 24-hour format', () => {
    const stdData = [
      ['2024-01-01T00:00:00.000Z', '0', '1', '2'],
      ['2024-01-01T01:00:00.000Z', '1', '0', '3'],
      ['2024-01-02T00:00:00.000Z', '2', '1', '1'],
      ['2024-01-02T01:00:00.000Z', '1', '2', '0']
    ];

    const result = FPODDataService.convertTo24Hour(stdData);

    expect(result).toHaveLength(24); // 24 hours
    expect(result[0]).toContain('00:00'); // Hour format
  });
});
```

### Documentation Updates
```markdown
# docs/API_REFERENCE.md
# FPOD Report App - API Reference

## Core Classes

### CSVParser
Handles CSV file parsing and validation.

#### Methods
- `parse(content: string): {headers: string[], data: string[][]}` - Parse CSV content
- `validateFPODFormat(headers: string[]): boolean` - Validate FPOD format

### FPODDataService
Handles FPOD-specific data processing.

#### Methods
- `convertToStandard(rawData: string[][]): string[][]` - Convert to standard format
- `convertTo24Hour(stdData: string[][]): string[][]` - Convert to 24-hour averages
- `exportCSV(data: string[][], filename: string): void` - Export data as CSV

### AppStore
Centralized state management.

#### State Structure
```javascript
{
  files: Map<string, FileData>,
  currentFile: string | null,
  view: 'table' | 'plot',
  plotConfig: PlotConfig,
  processing: ProcessingState
}
```

#### Methods
- `dispatch(action: Action): void` - Dispatch state changes
- `subscribe(listener: Function): Function` - Subscribe to state changes
- `getState(): AppState` - Get current state
```

---

## 📊 Implementation Timeline & Commands

### Week 1: Major Cleanup & Foundation

#### Day 1: SUBCAM Removal (Highest Impact)
```bash
# Create feature branch
git checkout -b app-cleanup-pt2

# Manual editing required - remove all SUBCAM references
# - HTML: Remove subcam-container, subcam-reformatPage, subcam-plotPage
# - CSS: Remove all .subcam-* styles
# - JS: Remove all SUBCAM variables, functions, event handlers

# Test thoroughly
# Open index.html and verify all FPOD functionality works

# Commit major simplification
git add .
git commit -m "app-cleanup-pt2: Remove SUBCAM functionality - FPOD-only app

- Removed ~500-800 lines of SUBCAM code
- Simplified navigation to 2 pages only
- 25-30% overall code reduction
- Significantly reduced complexity"
```

#### Day 2: Final Cleanup
```bash
# Remove remaining artifacts
git rm script.js.backup-robust-legend styles.css.backup

# Organize documentation
mkdir docs
git mv COMPREHENSIVE_PROJECT_REQUIREMENTS.md docs/
git mv PROJECT_HISTORY.md docs/
git mv PROJECT_REQUIREMENTS.md docs/
git mv CLAUDE.md docs/

# Create proper README
cat > README.md << 'EOF'
# FPOD Report App

Marine acoustic data visualization tool for FPOD detection data.

## Features
- CSV data loading and processing
- Standard and 24-hour data conversion
- Interactive plotting and visualization
- Data export functionality

## Quick Start
Open `index.html` in a modern browser and load your FPOD CSV files.
EOF

git add .
git commit -m "app-cleanup-pt2: Final cleanup - organize docs, proper README"
```

#### Day 3: Build System
```bash
# Initialize modern development
npm init -y
npm install --save-dev vite eslint vitest

# Create structure
mkdir -p src/{config,utils,services,components,store,workers} public

# Move files
mv index.html public/
mv styles.css public/
mv script.js src/legacy-script.js

# Create configs
echo 'export default { root: "public" };' > vite.config.js

git add .
git commit -m "app-cleanup-pt2: Add build system and modern project structure"

# Merge to main
git checkout main
git merge app-cleanup-pt2
git push origin main
```

### Week 2: Modularization
- Days 4-5: Extract utilities and services
- Days 6-7: Create UI components and state management

### Week 3: Performance & Testing
- Days 8-9: Add virtual scrolling and Web Workers
- Days 10-11: Implement testing framework
- Day 12: Documentation and final testing

---

## 🎯 Expected Outcomes

### After SUBCAM Removal (Day 1)
- **25-30% code reduction**
- **Simplified mental model** - FPOD only
- **Easier debugging and testing**
- **Faster development iterations**

### After Complete Cleanup (Week 3)
- **70% reduction in code complexity**
- **Modern development workflow**
- **3x performance improvement** for large datasets
- **90% test coverage**
- **Production-ready architecture**

### Maintainability Improvements
- **50% faster debugging** with modular code
- **Easier onboarding** for new developers
- **Scalable architecture** for future features
- **Comprehensive documentation** and testing

---

## 🚀 Success Metrics

### Code Quality
- Lines of code: 5,374 → ~3,500 (35% reduction)
- Cyclomatic complexity: High → Low
- Module count: 1 → 15+ focused modules
- Test coverage: 0% → 90%

### Performance
- Initial page load: Baseline → 3x faster
- Large table rendering: Baseline → 5x faster with virtual scrolling
- Data processing: Baseline → 2x faster with Web Workers
- Memory usage: High → Optimized with proper cleanup

### Developer Experience
- Build time: N/A → <2 seconds
- Hot reload: N/A → Instant
- Debugging: Difficult → Easy with source maps
- Testing: None → Comprehensive test suite

---

*This plan provides a complete roadmap for transforming the monolithic report app into a modern, maintainable, and performant FPOD-focused application.*