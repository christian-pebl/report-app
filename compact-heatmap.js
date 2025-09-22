// Compact Heatmap JavaScript - Clean, focused implementation
class CompactHeatmap {
    constructor() {
        this.fileData = [];
        this.currentFile = null;
        this.selectedSpecies = [];
        this.init();
    }

    init() {
        this.loadAvailableFiles();
        this.setupEventListeners();
        console.log('Compact Heatmap initialized');
    }

    setupEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const generateBtn = document.getElementById('generateBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const deselectAllBtn = document.getElementById('deselectAllBtn');

        fileInput.addEventListener('change', (e) => this.handleFileInput(e));
        generateBtn.addEventListener('click', () => this.generateHeatmap());
        selectAllBtn.addEventListener('click', () => this.selectAllSpecies());
        deselectAllBtn.addEventListener('click', () => this.deselectAllSpecies());
    }

    async loadAvailableFiles() {
        // File input ready - no need to populate options
        console.log('File input ready for user selection');
    }

    async handleFileInput(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log(`Loading file: ${file.name}`);

        try {
            const csvContent = await this.readFileContent(file);
            this.parseCSVData(csvContent);
            this.currentFile = file.name;
        } catch (error) {
            console.error('Error loading file:', error);
            alert('Error loading file: ' + error.message);
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    getMockCsvData() {
        // Mock CSV data for testing
        return `Date,Total Observations,Cumulative Observations,All Unique Organisms Observed Today,New Unique Organisms Today,Cumulative New Unique Organisms,Cumulative Unique Species,Species A,Species B,Species C,Species D,Species E
2024-06-01,10,10,3,3,3,3,5,2,1,0,2
2024-06-02,8,18,2,1,4,4,3,1,0,2,2
2024-06-03,12,30,4,2,6,6,2,3,2,1,4
2024-06-04,6,36,2,0,6,6,1,0,1,2,2
2024-06-05,15,51,5,1,7,7,4,2,3,3,3`;
    }

    parseCSVData(csvContent) {
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        console.log('Headers found:', headers);

        // Extract species columns (columns 8+)
        const speciesHeaders = headers.slice(7);
        console.log('Species found:', speciesHeaders);

        // Parse data rows
        this.fileData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            this.fileData.push(row);
        }

        console.log(`Parsed ${this.fileData.length} data rows`);

        // Show species selection
        this.populateSpeciesSelection(speciesHeaders);
        document.getElementById('speciesSelectionContainer').classList.remove('hidden');
    }

    populateSpeciesSelection(species) {
        const container = document.getElementById('speciesCheckboxes');
        container.innerHTML = '';

        species.forEach(speciesName => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'species-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `species_${speciesName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            checkbox.value = speciesName;
            checkbox.checked = true; // Auto-select all for compact view

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = speciesName;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
        });

        document.getElementById('generateBtn').disabled = false;
        console.log('Species selection populated');
    }

    selectAllSpecies() {
        const checkboxes = document.querySelectorAll('#speciesCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    deselectAllSpecies() {
        const checkboxes = document.querySelectorAll('#speciesCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    getSelectedSpecies() {
        const checkboxes = document.querySelectorAll('#speciesCheckboxes input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    generateHeatmap() {
        const selectedSpecies = this.getSelectedSpecies();

        if (selectedSpecies.length === 0) {
            alert('Please select at least one species to display.');
            return;
        }

        console.log(`Generating ultra-compact matrix for ${selectedSpecies.length} species and ${this.fileData.length} dates`);

        const heatmapGrid = document.getElementById('heatmapGrid');
        heatmapGrid.innerHTML = '';

        // Calculate max value for legend
        let maxValue = 0;
        selectedSpecies.forEach(species => {
            this.fileData.forEach(row => {
                const value = parseInt(row[species]) || 0;
                if (value > maxValue) maxValue = value;
            });
        });

        // Update legend
        document.getElementById('maxValue').textContent = `${maxValue}+`;

        // Create ultra-compact HTML table
        const table = document.createElement('table');
        table.className = 'ultra-compact-table';
        table.style.cssText = 'border-collapse: collapse; font-size: 0.3rem;';

        // Create header row with dates (vertical)
        const headerRow = document.createElement('tr');
        const cornerCell = document.createElement('td');
        cornerCell.style.cssText = 'width: 60px !important; background: #546e7a;';
        headerRow.appendChild(cornerCell);

        // Add date headers (show every 10th)
        this.fileData.forEach((row, index) => {
            const th = document.createElement('td');
            th.className = 'date-header';
            th.style.cssText = 'width: 8px !important; height: 40px !important; writing-mode: vertical-rl; text-orientation: mixed; font-size: 0.25rem; background: #f8f9fa; color: #666;';

            if (index % 10 === 0) {
                const formattedDate = this.formatDate(row.Date || row.date);
                th.textContent = formattedDate;
            }
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Create data rows for each species
        selectedSpecies.forEach(species => {
            const row = document.createElement('tr');

            // Species name cell (abbreviated)
            const speciesCell = document.createElement('td');
            speciesCell.className = 'species-cell';
            speciesCell.style.cssText = 'width: 60px !important; padding: 0 2px !important; font-size: 0.4rem; background: #546e7a; color: white; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

            // Abbreviate species name if longer than 10 chars
            const abbrevName = species.length > 10 ?
                species.substring(0, 8) + '...' : species;
            speciesCell.textContent = abbrevName;
            speciesCell.title = species;
            row.appendChild(speciesCell);

            // Data cells
            this.fileData.forEach(rowData => {
                const td = document.createElement('td');
                const value = parseInt(rowData[species]) || 0;

                // Apply inline styles directly to ensure 8px size
                const bgColor = this.getColorForValue(value);
                td.style.cssText = `width: 8px !important; height: 8px !important; padding: 0 !important; background: ${bgColor}; border: 1px solid #f0f0f0; font-size: 0.3rem; text-align: center; overflow: hidden;`;

                // Only show text for non-zero values
                if (value > 0 && value < 10) {
                    td.textContent = value;
                    td.style.color = value > 5 ? 'white' : '#333';
                } else if (value >= 10) {
                    td.textContent = '+';
                    td.style.color = 'white';
                }

                const formattedDate = this.formatDate(rowData.Date || rowData.date);
                td.title = `${species} on ${formattedDate}: ${value}`;

                row.appendChild(td);
            });

            table.appendChild(row);
        });

        heatmapGrid.appendChild(table);

        // Update info
        document.getElementById('dataInfo').textContent =
            `${selectedSpecies.length} species × ${this.fileData.length} dates | Cell: 8px | Total width: ${60 + (this.fileData.length * 8)}px`;

        // Show heatmap container
        document.getElementById('heatmapContainer').classList.remove('hidden');
        document.getElementById('heatmapTitle').textContent =
            `Ultra-Compact Matrix - ${this.currentFile}`;

        console.log('Ultra-compact matrix generated successfully!');
    }

    getColorForValue(value) {
        // Return color directly as hex for inline styles
        if (value === 0) return '#f8f9fa';
        if (value <= 1) return '#e3f2fd';
        if (value <= 2) return '#bbdefb';
        if (value <= 3) return '#90caf9';
        if (value <= 4) return '#64b5f6';
        if (value <= 5) return '#42a5f5';
        if (value <= 6) return '#2196f3';
        if (value <= 7) return '#1976d2';
        if (value <= 8) return '#1565c0';
        if (value <= 9) return '#0d47a1';
        return '#3f51b5';
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    }

    getAbundanceClass(value) {
        if (value === 0) return 'abundance-0';
        if (value <= 1) return 'abundance-1';
        if (value <= 2) return 'abundance-2';
        if (value <= 3) return 'abundance-3';
        if (value <= 4) return 'abundance-4';
        if (value <= 5) return 'abundance-5';
        if (value <= 6) return 'abundance-6';
        if (value <= 7) return 'abundance-7';
        if (value <= 8) return 'abundance-8';
        if (value <= 9) return 'abundance-9';
        return 'abundance-10-plus';
    }
}

// Initialize compact heatmap when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.compactHeatmap = new CompactHeatmap();
});