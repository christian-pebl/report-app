class CSVManager {
    constructor() {
        this.csvData = [];
        this.headers = [];
        this.fileName = '';
        this.workingDirFiles = [];
        this.fileInfos = new Map(); // Map of baseName -> {original, std, hr24}
        this.showWorkingDirModal = true;
        
        this.initializeEventListeners();
        this.initializeWorkingDirModal();
    }

    initializeEventListeners() {
        const exportBtn = document.getElementById('exportBtn');

        // Export functionality
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCSV();
            });
        }

        // File info toggle functionality
        const fileInfoToggle = document.getElementById('fileInfoToggle');
        if (fileInfoToggle) {
            fileInfoToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('fileInfoDropdown');
                dropdown.classList.toggle('hidden');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('fileInfoDropdown');
            const toggle = document.getElementById('fileInfoToggle');
            
            if (dropdown && !dropdown.contains(e.target) && !toggle.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });

        // Change working directory button
        const changeWorkingDirBtn = document.getElementById('changeWorkingDirBtn');
        if (changeWorkingDirBtn) {
            changeWorkingDirBtn.addEventListener('click', () => {
                this.showWorkingDirModal = true;
                const modal = document.getElementById('workingDirModal');
                modal.classList.remove('hidden');
            });
        }

        // Add file button
        const addFileBtn = document.getElementById('addFileBtn');
        const csvFileInput = document.getElementById('csvFile');
        if (addFileBtn && csvFileInput) {
            addFileBtn.addEventListener('click', () => {
                csvFileInput.click();
            });
            
            csvFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileUpload(file);
                    // Clear the input so the same file can be selected again
                    e.target.value = '';
                }
            });
        }

        // Toggle view button functionality (table ↔ plot)
        const toggleViewBtn = document.getElementById('toggleViewBtn');
        const toggleTableBtn = document.getElementById('toggleTableBtn');
        
        if (toggleViewBtn) {
            toggleViewBtn.addEventListener('click', () => {
                const plotSection = document.getElementById('plotSection');
                const tableSection = document.getElementById('tableSection');
                const confirmSavePlotBtn = document.getElementById('confirmSavePlotBtn');
                
                // Switch from table to plot
                this.renderPlotWithVariableSelection();
                toggleViewBtn.textContent = '📄 Show Table';
                
                // Show confirm save button in plot section if we have pending conversion
                if (this.pendingConversion) {
                    confirmSavePlotBtn.style.display = 'inline-block';
                }
            });
        }
        
        if (toggleTableBtn) {
            toggleTableBtn.addEventListener('click', () => {
                const confirmSaveBtn = document.getElementById('confirmSaveBtn');
                const toggleViewBtn = document.getElementById('toggleViewBtn');
                
                // Switch from plot to table
                this.renderTable();
                toggleViewBtn.textContent = '📊 Show Plot';
                
                // Show confirm save button in table section if we have pending conversion
                if (this.pendingConversion) {
                    confirmSaveBtn.style.display = 'inline-block';
                }
            });
        }

        // Confirm save button functionality
        const confirmSaveBtn = document.getElementById('confirmSaveBtn');
        const confirmSavePlotBtn = document.getElementById('confirmSavePlotBtn');
        
        const handleConfirmSave = () => {
            if (!this.pendingConversion) return;
            
            const { fileName, suffix, baseName, fileInfo } = this.pendingConversion;
            
            // Save the file
            this.autoSaveConvertedFile(fileName, suffix);
            
            // Create a mock file object and add to fileInfo
            const mockFile = this.createMockFileFromCurrentData(fileName);
            fileInfo.versions.set(suffix, mockFile);
            
            // Update UI
            this.renderFileBrowser();
            this.showSuccess(`Saved ${fileName} successfully!`);
            
            // Hide buttons and clear pending conversion
            confirmSaveBtn.style.display = 'none';
            confirmSavePlotBtn.style.display = 'none';
            document.getElementById('toggleViewBtn').style.display = 'none';
            this.pendingConversion = null;
            
            // Reset title
            document.getElementById('dataTitle').textContent = 'CSV Data';
        };
        
        if (confirmSaveBtn) {
            confirmSaveBtn.addEventListener('click', handleConfirmSave);
        }
        
        if (confirmSavePlotBtn) {
            confirmSavePlotBtn.addEventListener('click', handleConfirmSave);
        }
    }

    initializeWorkingDirModal() {
        const modal = document.getElementById('workingDirModal');
        const selectDirBtn = document.getElementById('selectDirBtn');
        const skipDirBtn = document.getElementById('skipDirBtn');
        const workingDirInput = document.getElementById('workingDirInput');

        // Show modal on startup
        if (this.showWorkingDirModal) {
            modal.classList.remove('hidden');
        }

        // Select directory button
        selectDirBtn.addEventListener('click', () => {
            workingDirInput.click();
        });

        // Skip button
        skipDirBtn.addEventListener('click', () => {
            this.hideWorkingDirModal();
        });

        // Directory selection
        workingDirInput.addEventListener('change', (e) => {
            this.handleWorkingDirSelection(e.target.files);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideWorkingDirModal();
            }
        });
    }

    hideWorkingDirModal() {
        const modal = document.getElementById('workingDirModal');
        modal.classList.add('hidden');
        this.showWorkingDirModal = false;
    }

    handleWorkingDirSelection(files) {
        if (!files || files.length === 0) return;

        this.workingDirFiles = Array.from(files);
        this.analyzeWorkingDirFiles();
        this.hideWorkingDirModal();
        this.renderFileBrowser();
        
        // Show success message
        const csvFileCount = this.workingDirFiles.filter(f => f.name.toLowerCase().endsWith('.csv')).length;
        this.showSuccess(`Working directory set! Found ${csvFileCount} CSV files.`);
    }

    analyzeWorkingDirFiles() {
        this.fileInfos.clear();
        
        this.workingDirFiles.forEach(file => {
            if (!file.name.toLowerCase().endsWith('.csv')) return;
            
            const fileName = file.name.replace('.csv', '');
            let baseName, suffix;
            
            // Check for any _suffix pattern
            const suffixMatch = fileName.match(/^(.+)_([^_]+)$/);
            if (suffixMatch) {
                baseName = suffixMatch[1];
                suffix = suffixMatch[2].toLowerCase();
            } else {
                baseName = fileName;
                suffix = 'original';
            }
            
            if (!this.fileInfos.has(baseName)) {
                this.fileInfos.set(baseName, {
                    baseName,
                    versions: new Map()
                });
            }
            
            const fileInfo = this.fileInfos.get(baseName);
            fileInfo.versions.set(suffix, file);
        });
        
        console.log('Analyzed files:', this.fileInfos);
    }

    renderFileBrowser() {
        const fileBrowser = document.getElementById('fileBrowser');
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');

        if (this.fileInfos.size === 0) {
            fileBrowser.style.display = 'none';
            return;
        }

        // Show file browser
        fileBrowser.style.display = 'block';
        
        // Update file count
        fileCount.textContent = `${this.fileInfos.size} file groups`;

        // Clear existing content
        fileList.innerHTML = '';

        // Render each file group
        this.fileInfos.forEach(fileInfo => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            // Create version badges
            const versionBadges = Array.from(fileInfo.versions.keys()).map(suffix => {
                const displaySuffix = suffix === 'original' ? 'BASE' : suffix.toUpperCase();
                const colorClass = this.getSuffixColorClass(suffix);
                return `<span class="version-indicator ${colorClass}">${displaySuffix}</span>`;
            }).join('');

            // Create aligned table and plot button pairs
            const buttonPairs = [];
            
            Array.from(fileInfo.versions.keys()).forEach(suffix => {
                const tableDisplayName = suffix === 'original' ? '📄 Table' : `📄 ${suffix.toUpperCase()}`;
                const tableButton = `<button class="btn-small btn-load" onclick="csvManager.loadFileFromBrowser('${fileInfo.baseName}', '${suffix}')">${tableDisplayName}</button>`;
                
                let plotButton = '';
                if (suffix === 'std' || suffix === '24hr') {
                    const plotDisplayName = `📊 ${suffix.toUpperCase()}`;
                    plotButton = `<button class="btn-small btn-plot" onclick="csvManager.loadPlotFromBrowser('${fileInfo.baseName}', '${suffix}')">${plotDisplayName}</button>`;
                }
                
                buttonPairs.push({ table: tableButton, plot: plotButton });
            });
            
            const loadTableButtons = buttonPairs.map(pair => pair.table).join('');
            const loadPlotButtons = buttonPairs.map(pair => pair.plot).join('');

            // Create convert buttons with progressive logic
            const hasRaw = fileInfo.versions.has('raw') || fileInfo.versions.has('original');
            const hasStd = fileInfo.versions.has('std');
            const has24hr = fileInfo.versions.has('24hr');
            const canConvert = fileInfo.versions.size > 0; // Has at least one version to convert from

            let convertButtons = '';
            if (canConvert) {
                // Only show STD conversion if we have raw but no STD
                if (hasRaw && !hasStd) {
                    convertButtons += `<button class="btn-small btn-convert" onclick="csvManager.generateStdFromBrowser('${fileInfo.baseName}')">⚡ STD</button>`;
                }
                // Only show 24HR conversion if we have STD but no 24HR
                if (hasStd && !has24hr) {
                    convertButtons += `<button class="btn-small btn-convert" onclick="csvManager.generate24hrFromBrowser('${fileInfo.baseName}')">⚡ 24HR</button>`;
                }
            }

            fileItem.innerHTML = `
                <div class="file-info-left">
                    <div class="file-name">${fileInfo.baseName}</div>
                    <div class="file-versions">${versionBadges}</div>
                </div>
                <div class="file-actions">
                    <div class="action-columns">
                        ${buttonPairs.map(pair => `
                            <div class="button-column">
                                ${pair.table}
                                ${pair.plot}
                            </div>
                        `).join('')}
                        <div class="convert-buttons">
                            ${convertButtons}
                        </div>
                    </div>
                </div>
            `;

            fileList.appendChild(fileItem);
        });
    }

    getSuffixColorClass(suffix) {
        const colorMap = {
            'original': 'version-original',
            'raw': 'version-raw',
            'std': 'version-std',
            '24hr': 'version-24hr',
            'processed': 'version-processed',
            'filtered': 'version-filtered',
            'clean': 'version-clean'
        };
        return colorMap[suffix] || 'version-default';
    }

    loadFileFromBrowser(baseName, suffix) {
        console.log('=== LOADING FILE FROM BROWSER ===');
        console.log('Base name:', baseName);
        console.log('Suffix:', suffix);
        
        const fileInfo = this.fileInfos.get(baseName);
        if (!fileInfo) {
            console.error('No file info found for base name:', baseName);
            return;
        }
        
        if (!fileInfo.versions.has(suffix)) {
            console.error('No version found for suffix:', suffix);
            console.log('Available versions:', Array.from(fileInfo.versions.keys()));
            return;
        }

        const file = fileInfo.versions.get(suffix);
        console.log('Found file:', {
            name: file.name,
            size: file.size,
            type: file.type,
            constructor: file.constructor.name
        });
        
        this.handleFileUpload(file);
        this.showSuccess(`Loaded ${file.name}`);
    }

    async loadPlotFromBrowser(baseName, suffix) {
        const fileInfo = this.fileInfos.get(baseName);
        if (!fileInfo || !fileInfo.versions.has(suffix)) return;

        const file = fileInfo.versions.get(suffix);
        
        try {
            const text = await this.readFileAsText(file);
            this.parseCSV(text);
            this.fileName = file.name;
            
            // Show plot section instead of table
            this.renderPlot();
            this.displayFileInfo(file);
            
            this.showSuccess(`Loaded ${file.name} for plotting`);
        } catch (error) {
            this.showError(`Error loading file for plot: ${error.message}`);
        }
    }

    generateStdFromBrowser(baseName) {
        const fileInfo = this.fileInfos.get(baseName);
        if (!fileInfo || fileInfo.versions.size === 0) return;

        // Always use the raw file for conversion
        let rawFile = fileInfo.versions.get('raw') || fileInfo.versions.get('original');
        if (!rawFile) {
            // If no raw file, use first available as fallback
            rawFile = Array.from(fileInfo.versions.values())[0];
        }
        
        // Load the raw file first
        this.handleFileUpload(rawFile);
        
        // Then convert it to STD
        setTimeout(() => {
            this.convertToStdFormat();
            
            // Show converted data with preview controls
            const convertedFileName = `${baseName}_std.csv`;
            this.showConvertedDataPreview(convertedFileName, 'std', baseName, fileInfo);
        }, 500);
    }

    generate24hrFromBrowser(baseName) {
        const fileInfo = this.fileInfos.get(baseName);
        if (!fileInfo || fileInfo.versions.size === 0) return;

        // Always use the STD file for 24HR conversion (not raw)
        let stdFile = fileInfo.versions.get('std');
        if (!stdFile) {
            this.showError('STD file must be created first before generating 24HR averages.');
            return;
        }
        
        console.log('Using STD file for 24HR conversion:', stdFile.name);
        
        // Load the STD file first
        this.handleFileUpload(stdFile);
        
        // Then convert it to 24hr average
        setTimeout(() => {
            this.convertTo24hrAverage();
            
            // Show converted data with preview controls
            const convertedFileName = `${baseName}_24hr.csv`;
            this.showConvertedDataPreview(convertedFileName, '24hr', baseName, fileInfo);
        }, 500);
    }

    showConvertedDataPreview(fileName, suffix, baseName, fileInfo) {
        // Update the table title to show the converted file name
        const dataTitle = document.getElementById('dataTitle');
        dataTitle.textContent = fileName;
        
        // Show the table with converted data
        this.renderTable();
        this.displayFileInfo({ name: fileName, size: 0, lastModified: Date.now() });
        
        // Show toggle and confirm buttons
        const toggleViewBtn = document.getElementById('toggleViewBtn');
        const confirmSaveBtn = document.getElementById('confirmSaveBtn');
        const confirmSavePlotBtn = document.getElementById('confirmSavePlotBtn');
        
        toggleViewBtn.style.display = 'inline-block';
        confirmSaveBtn.style.display = 'inline-block';
        
        // Store conversion details for later saving
        this.pendingConversion = {
            fileName,
            suffix,
            baseName,
            fileInfo,
            data: [...this.csvData],
            headers: [...this.headers]
        };
        
        this.showSuccess(`Converted to ${suffix.toUpperCase()} format! Review the data and click "Confirm & Save" to save the file.`);
    }

    showSaveConfirmation(fileName, suffix, baseName, fileInfo) {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>💾 Confirm Save</h2>
                    <p>Review the converted data and confirm to save as <strong>${fileName}</strong></p>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 15px;">
                        <strong>Preview:</strong> ${this.csvData.length} records, ${this.headers.length} columns
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" id="confirmSaveBtn">✅ Confirm & Save</button>
                        <button class="btn-secondary" id="cancelSaveBtn">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const confirmBtn = modal.querySelector('#confirmSaveBtn');
        const cancelBtn = modal.querySelector('#cancelSaveBtn');
        
        confirmBtn.addEventListener('click', () => {
            // Save the file
            this.autoSaveConvertedFile(fileName, suffix);
            
            // Create a mock file object for the converted data and add to fileInfo
            const mockFile = this.createMockFileFromCurrentData(fileName);
            fileInfo.versions.set(suffix, mockFile);
            
            // Update UI
            this.renderFileBrowser();
            this.showSuccess(`Generated and saved ${fileName}`);
            
            // Remove modal
            document.body.removeChild(modal);
        });
        
        cancelBtn.addEventListener('click', () => {
            // Just remove modal without saving
            document.body.removeChild(modal);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    autoSaveConvertedFile(fileName, suffix) {
        if (this.csvData.length === 0) return;

        // Create CSV content from current data
        const csvContent = this.createCSVContent();
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    createCSVContent() {
        console.log('=== CREATING CSV CONTENT ===');
        console.log('Headers:', this.headers);
        console.log('Data rows:', this.csvData.length);
        
        if (this.csvData.length === 0) {
            console.log('No data to create CSV content');
            return '';
        }
        
        // Create header row
        const headerRow = this.headers.join(',');
        console.log('Header row:', headerRow);
        
        // Create data rows - csvData is an array of arrays, not objects
        const dataRows = this.csvData.map((row, rowIndex) => {
            const csvRow = row.map((value, colIndex) => {
                // Handle values that contain commas by wrapping in quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    // Escape quotes by doubling them and wrap in quotes
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value !== undefined && value !== null ? value : '';
            }).join(',');
            
            if (rowIndex < 3) {
                console.log(`Row ${rowIndex}:`, csvRow);
            }
            
            return csvRow;
        });
        
        const csvContent = [headerRow, ...dataRows].join('\n');
        console.log('Total CSV content length:', csvContent.length);
        
        return csvContent;
    }

    createMockFileFromCurrentData(fileName) {
        console.log('=== CREATING MOCK FILE ===');
        console.log('File name:', fileName);
        console.log('Current headers:', this.headers);
        console.log('Current data rows:', this.csvData.length);
        console.log('Sample data:', this.csvData.slice(0, 2));
        
        const csvContent = this.createCSVContent();
        console.log('Generated CSV content length:', csvContent.length);
        console.log('CSV content preview:', csvContent.substring(0, 200));
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        // Create a File-like object
        const mockFile = new File([blob], fileName, { 
            type: 'text/csv',
            lastModified: Date.now()
        });
        
        console.log('Created mock file:', {
            name: mockFile.name,
            size: mockFile.size,
            type: mockFile.type,
            lastModified: mockFile.lastModified
        });
        
        return mockFile;
    }

    handleFileUpload(file) {
        console.log('=== HANDLE FILE UPLOAD ===');
        console.log('File received:', file);
        
        if (!file) {
            console.error('No file provided');
            return;
        }

        console.log('File details:', {
            name: file.name,
            size: file.size,
            type: file.type,
            constructor: file.constructor.name,
            lastModified: file.lastModified
        });

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            console.error('Invalid file type:', file.type, 'name:', file.name);
            this.showError('Please select a CSV file.');
            return;
        }

        this.fileName = file.name;
        const reader = new FileReader();

        reader.onload = (e) => {
            const csvContent = e.target.result;
            console.log('File read successfully, content length:', csvContent.length);
            console.log('Content preview:', csvContent.substring(0, 200));
            
            this.parseCSV(csvContent);
            console.log('After parsing - Headers:', this.headers.length, 'Data rows:', this.csvData.length);
            
            this.displayFileInfo(file);
            this.renderTable();
        };

        reader.onerror = (e) => {
            console.error('File read error:', e);
            this.showError('Error reading the file. Please try again.');
        };

        reader.readAsText(file);
    }

    async readFileAsText(file) {
        console.log('=== READ FILE AS TEXT ===');
        console.log('File:', file.name, 'Size:', file.size);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const content = e.target.result;
                console.log('File content read, length:', content.length);
                console.log('Content preview:', content.substring(0, 200));
                resolve(content);
            };
            
            reader.onerror = (e) => {
                console.error('Error reading file:', e);
                reject(new Error('Failed to read file: ' + file.name));
            };
            
            reader.readAsText(file);
        });
    }

    parseCSV(csvContent) {
        console.log('=== PARSING CSV ===');
        console.log('CSV content length:', csvContent.length);
        
        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
        console.log('Total lines after filtering:', lines.length);
        
        if (lines.length === 0) {
            this.showError('The CSV file appears to be empty.');
            return;
        }

        // Parse headers
        this.headers = this.parseCSVLine(lines[0]);
        
        // Parse data rows
        this.csvData = [];
        for (let i = 1; i < lines.length; i++) {
            const row = this.parseCSVLine(lines[i]);
            if (row.length > 0) {
                // Ensure row has same number of columns as headers
                while (row.length < this.headers.length) {
                    row.push('');
                }
                this.csvData.push(row);
            }
        }
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        result.push(current.trim());
        
        return result;
    }

    displayFileInfo(file) {
        const fileInfoCompact = document.getElementById('fileInfoCompact');
        const fileDetails = document.getElementById('fileDetails');
        
        const fileSize = (file.size / 1024).toFixed(2);
        const recordCount = this.csvData.length;
        const columnCount = this.headers.length;
        
        fileDetails.innerHTML = `
            <div class="file-detail">
                <strong>File Name</strong>
                ${file.name}
            </div>
            <div class="file-detail">
                <strong>File Size</strong>
                ${fileSize} KB
            </div>
            <div class="file-detail">
                <strong>Records</strong>
                ${recordCount}
            </div>
            <div class="file-detail">
                <strong>Columns</strong>
                ${columnCount}
            </div>
            <div class="file-detail">
                <strong>Last Modified</strong>
                ${new Date(file.lastModified).toLocaleString()}
            </div>
        `;
        
        fileInfoCompact.style.display = 'block';
    }

    renderPlot() {
        const plotSection = document.getElementById('plotSection');
        const tableSection = document.getElementById('tableSection');
        const plotInfo = document.getElementById('plotInfo');
        
        // Hide table section and show plot section
        tableSection.style.display = 'none';
        plotSection.style.display = 'block';
        
        if (this.csvData.length === 0) {
            this.showError('No data available for plotting.');
            return;
        }
        
        // Update plot info
        plotInfo.textContent = `${this.csvData.length} records`;
        
        // Draw the time series plot
        this.drawTimeSeries();
    }

    renderPlotWithVariableSelection() {
        const plotSection = document.getElementById('plotSection');
        const tableSection = document.getElementById('tableSection');
        const plotInfo = document.getElementById('plotInfo');
        const variableControls = document.getElementById('variableControls');
        const variableCheckboxes = document.getElementById('variableCheckboxes');
        const plotTitle = document.getElementById('plotTitle');
        
        // Hide table section and show plot section
        tableSection.style.display = 'none';
        plotSection.style.display = 'block';
        variableControls.style.display = 'block';
        
        if (this.csvData.length === 0) {
            this.showError('No data available for plotting.');
            return;
        }
        
        // Update plot info and title
        plotInfo.textContent = `${this.csvData.length} records`;
        if (this.pendingConversion) {
            plotTitle.textContent = `${this.pendingConversion.fileName} - Time Series Plot`;
        }
        
        // Find time column
        let timeColumnIndex = 0;
        const timeColumnCandidate = this.headers.findIndex(header => {
            const lowerHeader = header.toLowerCase();
            return (lowerHeader.includes('time') || lowerHeader.includes('date')) && 
                   !lowerHeader.includes('%') && 
                   !lowerHeader.includes('lost') &&
                   !lowerHeader.includes('percent');
        });
        if (timeColumnCandidate !== -1) {
            timeColumnIndex = timeColumnCandidate;
        }
        
        // Get numeric columns for plotting (exclude time column)
        const numericColumns = this.headers
            .map((header, index) => ({ header, index }))
            .filter(col => col.index !== timeColumnIndex)
            .filter(col => this.isNumericColumn(col.index));
        
        // Create variable selection checkboxes
        variableCheckboxes.innerHTML = '';
        this.selectedVariables = this.selectedVariables || numericColumns.map(col => col.header);
        
        numericColumns.forEach(col => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'variable-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `var_${col.index}`;
            checkbox.checked = this.selectedVariables.includes(col.header);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (!this.selectedVariables.includes(col.header)) {
                        this.selectedVariables.push(col.header);
                    }
                } else {
                    this.selectedVariables = this.selectedVariables.filter(v => v !== col.header);
                }
                this.drawTimeSeriesWithSelection();
            });
            
            const label = document.createElement('label');
            label.htmlFor = `var_${col.index}`;
            label.textContent = col.header;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            variableCheckboxes.appendChild(checkboxDiv);
        });
        
        // Draw the time series plot with selected variables
        this.drawTimeSeriesWithSelection();
    }

    drawTimeSeries() {
        const canvas = document.getElementById('plotCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size for high DPI displays
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.csvData.length === 0 || this.headers.length === 0) return;
        
        // Find time column (assume first column or column with 'time' in name)
        let timeColumnIndex = 0;
        const timeColumnCandidate = this.headers.findIndex(header => 
            header.toLowerCase().includes('time') || 
            header.toLowerCase().includes('date')
        );
        if (timeColumnCandidate !== -1) {
            timeColumnIndex = timeColumnCandidate;
        }
        
        // Get numeric columns for plotting (exclude time column)
        const numericColumns = this.headers
            .map((header, index) => ({ header, index }))
            .filter(col => col.index !== timeColumnIndex)
            .filter(col => this.isNumericColumn(col.index));
        
        if (numericColumns.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No numeric columns found for plotting', canvas.width/2, canvas.height/2);
            return;
        }
        
        // Parse time data and prepare for plotting
        const plotData = this.prepareTimeSeriesData(timeColumnIndex, numericColumns);
        
        if (plotData.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No valid data for plotting', canvas.width/2, canvas.height/2);
            return;
        }
        
        this.drawTimeSeriesChart(ctx, canvas, plotData, numericColumns);
    }

    drawTimeSeriesWithSelection() {
        const canvas = document.getElementById('plotCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size for high DPI displays
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.csvData.length === 0 || this.headers.length === 0) return;
        
        // Find time column
        let timeColumnIndex = 0;
        const timeColumnCandidate = this.headers.findIndex(header => {
            const lowerHeader = header.toLowerCase();
            return (lowerHeader.includes('time') || lowerHeader.includes('date')) && 
                   !lowerHeader.includes('%') && 
                   !lowerHeader.includes('lost') &&
                   !lowerHeader.includes('percent');
        });
        if (timeColumnCandidate !== -1) {
            timeColumnIndex = timeColumnCandidate;
        }
        
        // Get selected numeric columns for plotting
        const selectedColumns = this.headers
            .map((header, index) => ({ header, index }))
            .filter(col => col.index !== timeColumnIndex)
            .filter(col => this.selectedVariables.includes(col.header))
            .filter(col => this.isNumericColumn(col.index));
        
        if (selectedColumns.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No variables selected for plotting', canvas.width/(2*window.devicePixelRatio), canvas.height/(2*window.devicePixelRatio));
            return;
        }
        
        // Parse time data and prepare for plotting
        const plotData = this.prepareTimeSeriesData(timeColumnIndex, selectedColumns);
        
        if (plotData.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No valid data for plotting', canvas.width/(2*window.devicePixelRatio), canvas.height/(2*window.devicePixelRatio));
            return;
        }
        
        this.drawTimeSeriesChart(ctx, canvas, plotData, selectedColumns);
    }

    isNumericColumn(columnIndex) {
        // Check if most values in the column are numeric
        let numericCount = 0;
        const sampleSize = Math.min(100, this.csvData.length);
        
        for (let i = 0; i < sampleSize; i++) {
            const value = this.csvData[i][columnIndex];
            if (value !== null && value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
                numericCount++;
            }
        }
        
        return numericCount > sampleSize * 0.7; // 70% numeric threshold
    }

    prepareTimeSeriesData(timeColumnIndex, numericColumns) {
        const plotData = [];
        
        for (let rowIndex = 0; rowIndex < this.csvData.length; rowIndex++) {
            const row = this.csvData[rowIndex];
            const timeValue = row[timeColumnIndex];
            
            // Try to parse time
            let time;
            if (!isNaN(Date.parse(timeValue))) {
                time = new Date(timeValue);
            } else if (!isNaN(parseFloat(timeValue))) {
                // Assume it's a numeric time (hours, minutes, etc.)
                time = parseFloat(timeValue);
            } else {
                continue; // Skip invalid time values
            }
            
            const dataPoint = { time, values: {} };
            
            // Extract numeric values
            for (const col of numericColumns) {
                const value = parseFloat(row[col.index]);
                if (!isNaN(value)) {
                    dataPoint.values[col.header] = value;
                }
            }
            
            plotData.push(dataPoint);
        }
        
        // Sort by time
        plotData.sort((a, b) => {
            if (a.time instanceof Date && b.time instanceof Date) {
                return a.time - b.time;
            } else {
                return a.time - b.time;
            }
        });
        
        return plotData;
    }

    drawTimeSeriesChart(ctx, canvas, plotData, numericColumns) {
        const margin = 60;
        const plotWidth = canvas.width / window.devicePixelRatio - 2 * margin;
        const plotHeight = canvas.height / window.devicePixelRatio - 2 * margin;
        
        // Colors for different series
        const colors = ['#007aff', '#34c759', '#ff3b30', '#ff9500', '#af52de', '#00c7be', '#ff2d92'];
        
        // Find min/max for each series
        const seriesStats = {};
        numericColumns.forEach(col => {
            const values = plotData.map(d => d.values[col.header]).filter(v => v !== undefined);
            if (values.length > 0) {
                seriesStats[col.header] = {
                    min: Math.min(...values),
                    max: Math.max(...values)
                };
            }
        });
        
        // Find time range
        let timeMin = plotData[0].time;
        let timeMax = plotData[plotData.length - 1].time;
        
        // Draw axes
        ctx.strokeStyle = '#d1d1d6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, margin + plotHeight);
        ctx.lineTo(margin + plotWidth, margin + plotHeight);
        ctx.stroke();
        
        // Draw time series
        numericColumns.forEach((col, seriesIndex) => {
            if (!seriesStats[col.header]) return;
            
            const color = colors[seriesIndex % colors.length];
            const stats = seriesStats[col.header];
            const range = stats.max - stats.min;
            
            if (range === 0) return; // Skip constant series
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            let firstPoint = true;
            plotData.forEach(point => {
                const value = point.values[col.header];
                if (value === undefined) return;
                
                let x, y;
                
                // Calculate x position based on time
                if (point.time instanceof Date) {
                    const timeRange = timeMax - timeMin;
                    x = margin + (point.time - timeMin) / timeRange * plotWidth;
                } else {
                    const timeRange = timeMax - timeMin;
                    x = margin + (point.time - timeMin) / timeRange * plotWidth;
                }
                
                // Calculate y position (inverted for canvas)
                y = margin + plotHeight - ((value - stats.min) / range) * plotHeight;
                
                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        });
        
        // Draw legend
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const legendY = 20;
        let legendX = margin;
        
        numericColumns.forEach((col, seriesIndex) => {
            if (!seriesStats[col.header]) return;
            
            const color = colors[seriesIndex % colors.length];
            ctx.fillStyle = color;
            ctx.fillRect(legendX, legendY, 12, 12);
            
            ctx.fillStyle = '#1d1d1f';
            ctx.fillText(col.header, legendX + 18, legendY + 9);
            
            legendX += ctx.measureText(col.header).width + 40;
        });
    }

    renderTable() {
        const tableSection = document.getElementById('tableSection');
        const plotSection = document.getElementById('plotSection');
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');
        const recordCount = document.getElementById('recordCount');
        
        // Hide plot section and show table section
        plotSection.style.display = 'none';
        tableSection.style.display = 'block';

        // Clear existing content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('tr');
        this.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header || 'Unnamed Column';
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Create data rows
        this.csvData.forEach((row, index) => {
            const tr = document.createElement('tr');
            row.forEach((cell, cellIndex) => {
                const td = document.createElement('td');
                td.textContent = cell || '';
                
                // Add title attribute for long content
                if (cell && cell.length > 50) {
                    td.title = cell;
                    td.textContent = cell.substring(0, 50) + '...';
                }
                
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });

        // Update record count
        recordCount.textContent = `${this.csvData.length} records`;

        // Show table section
        tableSection.style.display = 'block';
        
        // Scroll to table
        tableSection.scrollIntoView({ behavior: 'smooth' });
    }

    exportCSV() {
        if (this.csvData.length === 0) return;

        let csvContent = this.headers.map(header => this.escapeCSVField(header)).join(',') + '\n';
        
        this.csvData.forEach(row => {
            const escapedRow = row.map(field => this.escapeCSVField(field)).join(',');
            csvContent += escapedRow + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `processed_${this.fileName}`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    escapeCSVField(field) {
        if (field == null) return '';
        
        const stringField = String(field);
        
        if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n')) {
            return '"' + stringField.replace(/"/g, '""') + '"';
        }
        
        return stringField;
    }

    convertToStdFormat() {
        if (this.csvData.length === 0) {
            this.showError('No data to convert. Please upload a CSV file first.');
            return;
        }

        try {
            const stdData = this.processToStdFormat();
            
            // Update the current view with converted data for preview
            this.displayConvertedData(stdData);
            
            this.showSuccess('Successfully converted to _std format! Preview the data and use the export button to download.');
        } catch (error) {
            this.showError(`Conversion failed: ${error.message}`);
        }
    }

    displayConvertedData(stdData) {
        // Update the internal data structure
        this.headers = stdData.headers;
        this.csvData = stdData.data;
        
        // Update the filename display - fix duplicate _std issue
        if (this.fileName.toLowerCase().includes('_raw')) {
            this.fileName = this.fileName.replace(/_raw/gi, '_std');
        } else if (!this.fileName.toLowerCase().includes('_std')) {
            const baseName = this.fileName.replace(/\.csv$/i, '');
            this.fileName = `${baseName}_std.csv`;
        }
        
        // Re-render the table with converted data
        this.renderTable();
        
        // Update file info to show conversion details
        this.updateFileInfoForConversion(stdData);
    }

    updateFileInfoForConversion(stdData) {
        const fileDetails = document.getElementById('fileDetails');
        
        const recordCount = stdData.data.length;
        const columnCount = stdData.headers.length;
        
        // Create conversion details
        const conversionInfo = document.createElement('div');
        conversionInfo.className = 'conversion-info';
        conversionInfo.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: #e6f3ff;
            border-radius: 8px;
            border-left: 4px solid #007aff;
        `;
        
        conversionInfo.innerHTML = `
            <div style="font-weight: 600; color: #007aff; margin-bottom: 10px;">
                ✓ Converted to _std format
            </div>
            <div style="font-size: 0.9rem; color: #1d1d1f;">
                <strong>Processed:</strong> ${recordCount} records, ${columnCount} columns<br>
                <strong>Columns found:</strong> ${stdData.headers.slice(1).join(', ')}
            </div>
        `;
        
        // Remove existing conversion info if present
        const existingInfo = document.querySelector('.conversion-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        fileDetails.appendChild(conversionInfo);
    }

    processToStdFormat() {
        // Updated column mappings with flexible pattern matching
        const columnMappings = [
            { patterns: ['Harbour Porpoise (DPM)_F', 'NBHF_DPM'], target: 'Porpoise (DPM)' },
            { patterns: ['Harbour Porpoise (Clicks)_F', 'NBHFclx'], target: 'Porpoise (Clicks)' },
            { patterns: ['Other Cetaceans (DPM)_F', 'DOL_DPM'], target: 'Dolphin (DPM)' },
            { patterns: ['Other Cetaceans (Clicks)_F', 'DOLclx'], target: 'Dolphin (Clicks)' },
            { patterns: ['Sonar (DPM)_F', 'SONAR_DPM'], target: 'Sonar (DPM)' },
            { patterns: ['SONARclx'], target: 'Sonar (Clicks)' }
        ];

        // Find date and time columns dynamically
        const { dateColIndex, timeColIndex, isCombined } = this.findDateTimeColumns();
        
        if (dateColIndex === -1 || timeColIndex === -1) {
            throw new Error('Could not find valid date and time columns in the CSV.');
        }

        // Extract and combine timestamps
        const timestamps = this.extractTimestamps(dateColIndex, timeColIndex, isCombined);

        // Find and extract data columns based on patterns
        const dataColumns = this.extractDataColumns(columnMappings);
        
        if (dataColumns.length === 0) {
            throw new Error('No matching data columns found for conversion.');
        }

        // Align all data with timestamps
        const maxLength = timestamps.length;
        const alignedData = this.alignDataColumns(dataColumns, maxLength);

        // Create the _std format data structure
        const stdHeaders = ['Time', ...alignedData.map(col => col.name)];
        const stdData = [];
        
        for (let i = 0; i < maxLength; i++) {
            const row = [timestamps[i]];
            alignedData.forEach(col => {
                row.push(col.data[i] || '');
            });
            stdData.push(row);
        }

        return {
            headers: stdHeaders,
            data: stdData
        };
    }

    findDateTimeColumns() {
        let dateColIndex = -1;
        let timeColIndex = -1;
        let combinedColIndex = -1;

        // Look for date/time patterns in headers
        for (let i = 0; i < this.headers.length; i++) {
            const header = (this.headers[i] || '').toLowerCase().trim();
            
            // Look for ChunkEnd column (combined date/time)
            if (header === 'chunkend' || header.includes('chunkend')) {
                if (this.csvData.length > 0 && this.isCombinedDateTimeColumn(i)) {
                    combinedColIndex = i;
                    break; // Use combined column if found
                }
            }
            
            // Look for separate date column
            if (dateColIndex === -1 && (
                header.includes('date') || 
                header.includes('datum') || 
                header === 'c' ||
                i === 2  // Column C fallback
            )) {
                // Verify this column contains date-like data
                if (this.csvData.length > 0 && this.isDateColumn(i)) {
                    dateColIndex = i;
                }
            }
            
            // Look for separate time column
            if (timeColIndex === -1 && (
                header.includes('time') || 
                header.includes('zeit') || 
                header === 'd' ||
                i === 3  // Column D fallback
            )) {
                // Verify this column contains time-like data
                if (this.csvData.length > 0 && this.isTimeColumn(i)) {
                    timeColIndex = i;
                }
            }
        }

        // Return combined column index if found, otherwise separate columns
        if (combinedColIndex !== -1) {
            return { 
                dateColIndex: combinedColIndex, 
                timeColIndex: combinedColIndex, 
                isCombined: true 
            };
        }

        return { dateColIndex, timeColIndex, isCombined: false };
    }

    isDateColumn(colIndex) {
        // Check first few non-empty rows for date patterns
        for (let i = 0; i < Math.min(5, this.csvData.length); i++) {
            const value = this.csvData[i][colIndex];
            if (value && typeof value === 'string') {
                // Check for common date patterns
                if (value.match(/^\d{4}-\d{2}-\d{2}$/) || 
                    value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || 
                    value.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
                    return true;
                }
            }
        }
        return false;
    }

    isTimeColumn(colIndex) {
        // Check first few non-empty rows for time patterns
        for (let i = 0; i < Math.min(5, this.csvData.length); i++) {
            const value = this.csvData[i][colIndex];
            if (value && typeof value === 'string') {
                // Check for time patterns
                if (value.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
                    return true;
                }
            }
        }
        return false;
    }

    isCombinedDateTimeColumn(colIndex) {
        // Check first few non-empty rows for combined date/time patterns like "3/30/2025 19:59:00"
        for (let i = 0; i < Math.min(5, this.csvData.length); i++) {
            const value = this.csvData[i][colIndex];
            if (value && typeof value === 'string') {
                // Check for ChunkEnd format: M/D/YYYY H:MM:SS or MM/DD/YYYY HH:MM:SS
                if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}$/)) {
                    return true;
                }
            }
        }
        return false;
    }

    extractTimestamps(dateColIndex, timeColIndex, isCombined = false) {
        const timestamps = [];
        
        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            
            if (isCombined) {
                // Handle combined ChunkEnd format
                const combinedStr = row[dateColIndex] || '';
                if (combinedStr) {
                    try {
                        const timestamp = this.parseCombinedDateTime(combinedStr);
                        timestamps.push(timestamp);
                    } catch (error) {
                        timestamps.push(''); // Add empty timestamp for invalid data
                    }
                } else {
                    timestamps.push('');
                }
            } else {
                // Handle separate date and time columns
                const dateStr = row[dateColIndex] || '';
                const timeStr = row[timeColIndex] || '';
                
                if (dateStr && timeStr) {
                    try {
                        const timestamp = this.combineDateTime(dateStr, timeStr);
                        timestamps.push(timestamp);
                    } catch (error) {
                        timestamps.push(''); // Add empty timestamp for invalid data
                    }
                } else {
                    timestamps.push('');
                }
            }
        }
        
        return timestamps;
    }

    extractDataColumns(columnMappings) {
        const dataColumns = [];
        
        // Search for each pattern in the headers
        columnMappings.forEach(mapping => {
            for (let i = 0; i < this.headers.length; i++) {
                const header = this.headers[i] || '';
                
                // Check if header matches any of the patterns
                const matches = mapping.patterns.some(pattern => 
                    header.trim() === pattern.trim() || 
                    header.toLowerCase().includes(pattern.toLowerCase())
                );
                
                if (matches) {
                    // Extract data from this column
                    const columnData = [];
                    for (let j = 0; j < this.csvData.length; j++) {
                        columnData.push(this.csvData[j][i] || '');
                    }
                    
                    dataColumns.push({
                        name: mapping.target,
                        data: columnData,
                        originalHeader: header
                    });
                    break; // Only take first match for each mapping
                }
            }
        });
        
        return dataColumns;
    }

    alignDataColumns(dataColumns, maxLength) {
        return dataColumns.map(col => ({
            name: col.name,
            data: col.data.slice(0, maxLength), // Trim to match timestamp length
            originalHeader: col.originalHeader
        }));
    }

    parseCombinedDateTime(combinedStr) {
        // Handle ChunkEnd format: "3/30/2025 19:59:00"
        const match = combinedStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
        
        if (!match) {
            throw new Error(`Invalid ChunkEnd format: ${combinedStr}`);
        }

        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        const hours = parseInt(match[4], 10);
        const minutes = parseInt(match[5], 10);
        const seconds = parseInt(match[6], 10);

        // Validate values
        if (month < 1 || month > 12 || day < 1 || day > 31 || 
            hours > 23 || minutes > 59 || seconds > 59) {
            throw new Error(`Invalid date/time values: ${combinedStr}`);
        }

        // Create date object (month is 0-indexed in JavaScript)
        const date = new Date(year, month - 1, day, hours, minutes, seconds);

        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${combinedStr}`);
        }

        // Return ISO 8601 format
        return date.toISOString();
    }

    combineDateTime(dateStr, timeStr) {
        // Handle various date formats
        let date;
        
        // Try parsing as YYYY-MM-DD
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateStr + 'T00:00:00.000Z');
        }
        // Try parsing as MM/DD/YYYY or DD/MM/YYYY
        else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const parts = dateStr.split('/');
            // Assume MM/DD/YYYY format for now
            date = new Date(parts[2], parts[0] - 1, parts[1]);
        }
        // Try parsing as DD-MM-YYYY
        else if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
            const parts = dateStr.split('-');
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        else {
            throw new Error(`Unsupported date format: ${dateStr}`);
        }

        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${dateStr}`);
        }

        // Parse time (handle HH:MM:SS or HH:MM format)
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (!timeMatch) {
            throw new Error(`Invalid time format: ${timeStr}`);
        }

        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const seconds = parseInt(timeMatch[3] || '0', 10);

        if (hours > 23 || minutes > 59 || seconds > 59) {
            throw new Error(`Invalid time values: ${timeStr}`);
        }

        // Combine date and time
        const combined = new Date(date);
        combined.setUTCHours(hours, minutes, seconds, 0);

        // Return ISO 8601 format
        return combined.toISOString();
    }

    exportStdCSV(stdData) {
        if (!stdData || stdData.data.length === 0) return;

        let csvContent = stdData.headers.join(',') + '\n';
        
        stdData.data.forEach(row => {
            const escapedRow = row.map(field => this.escapeCSVField(field)).join(',');
            csvContent += escapedRow + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // Generate _std filename with _raw replacement logic - fix duplicate _std issue
            let stdFileName;
            if (this.fileName.toLowerCase().includes('_raw')) {
                stdFileName = this.fileName.replace(/_raw/gi, '_std');
            } else if (!this.fileName.toLowerCase().includes('_std')) {
                const baseName = this.fileName.replace(/\.csv$/i, '');
                stdFileName = `${baseName}_std.csv`;
            } else {
                stdFileName = this.fileName; // Already has _std
            }
            
            link.setAttribute('download', stdFileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #34c759;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 500;
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }

    convertTo24hrAverage() {
        if (this.csvData.length === 0) {
            this.showError('No data to convert. Please upload a CSV file first.');
            return;
        }

        try {
            const avgData = this.processTo24hrAverage();
            
            // Update the current view with averaged data for preview
            this.displayAveragedData(avgData);
            
            this.showSuccess('Successfully created 24-hour averages! Preview the data and use the export button to download.');
        } catch (error) {
            this.showError(`24hr averaging failed: ${error.message}`);
        }
    }

    processTo24hrAverage() {
        console.log('=== 24HR CONVERSION FROM STD FILE ===');
        console.log('File name:', this.fileName);
        console.log('Headers:', this.headers);
        console.log('Header details:', this.headers.map((h, i) => `${i}: ${h}`));
        console.log('Total data rows:', this.csvData.length);
        console.log('Data sample (first 3 rows):', this.csvData.slice(0, 3));
        
        if (this.csvData.length === 0) {
            throw new Error('No data available for 24HR averaging.');
        }
        
        if (this.headers.length < 2) {
            throw new Error('Data must have at least 2 columns for 24hr averaging.');
        }

        // Find time column - look for actual time/date columns, not percentages
        let timeColumnIndex = 0;
        const timeColumnCandidate = this.headers.findIndex(header => {
            const lowerHeader = header.toLowerCase();
            // Look for time/date columns but exclude percentage columns
            return (lowerHeader.includes('time') || lowerHeader.includes('date')) && 
                   !lowerHeader.includes('%') && 
                   !lowerHeader.includes('lost') &&
                   !lowerHeader.includes('percent');
        });
        
        if (timeColumnCandidate !== -1) {
            timeColumnIndex = timeColumnCandidate;
        }
        
        console.log('Using time column index:', timeColumnIndex, 'Header:', this.headers[timeColumnIndex]);
        
        // Get first timestamp to determine base date
        const firstTimestamp = this.csvData[0][timeColumnIndex];
        let baseDate;
        try {
            baseDate = new Date(firstTimestamp);
            if (isNaN(baseDate.getTime())) {
                throw new Error(`Invalid timestamp format: ${firstTimestamp}`);
            }
        } catch (error) {
            throw new Error(`Cannot parse timestamp from column "${this.headers[timeColumnIndex]}": ${firstTimestamp}`);
        }
        
        // Set to start of day (00:00:00.000)
        baseDate.setHours(0, 0, 0, 0);
        console.log('Base date (start of day):', baseDate.toISOString());
        
        // Group data by hour and calculate averages
        const hourlyAverages = this.calculatePreciseHourlyAverages(timeColumnIndex, baseDate);
        
        // Format the output according to specifications
        const result = this.formatPrecise24HourOutput(hourlyAverages, baseDate, timeColumnIndex);
        console.log('24HR processing complete. Result headers:', result.headers);
        console.log('Sample output rows:', result.data.slice(0, 3));
        
        return result;
    }

    calculatePreciseHourlyAverages(timeColumnIndex, baseDate) {
        console.log('=== CALCULATING PRECISE HOURLY AVERAGES ===');
        
        // Initialize 24-hour groups
        const hourlyGroups = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyGroups[hour] = [];
        }
        
        let validTimeCount = 0;
        let invalidTimeCount = 0;
        
        // Group data by hour
        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            const timeStr = row[timeColumnIndex];
            
            if (timeStr) {
                try {
                    const timestamp = new Date(timeStr);
                    if (!isNaN(timestamp.getTime())) {
                        const hour = timestamp.getHours();
                        validTimeCount++;
                        
                        // Extract numeric data from all columns except time column
                        const numericData = {};
                        let numericFieldCount = 0;
                        
                        for (let j = 0; j < row.length; j++) {
                            if (j !== timeColumnIndex) {
                                const value = parseFloat(row[j]);
                                if (!isNaN(value)) {
                                    numericData[this.headers[j]] = value;
                                    numericFieldCount++;
                                }
                            }
                        }
                        
                        if (numericFieldCount > 0) {
                            hourlyGroups[hour].push(numericData);
                        }
                    } else {
                        invalidTimeCount++;
                    }
                } catch (error) {
                    invalidTimeCount++;
                }
            }
        }
        
        console.log(`Grouped ${validTimeCount} valid timestamps, ${invalidTimeCount} invalid`);
        
        // Calculate averages for each hour
        const hourlyAverages = {};
        for (let hour = 0; hour < 24; hour++) {
            const hourData = hourlyGroups[hour];
            hourlyAverages[hour] = {};
            
            console.log(`Hour ${hour}: ${hourData.length} records`);
            
            if (hourData.length > 0) {
                // Calculate average for each numeric column
                for (let j = 0; j < this.headers.length; j++) {
                    if (j !== timeColumnIndex) {
                        const columnName = this.headers[j];
                        const validValues = hourData
                            .map(record => record[columnName])
                            .filter(val => val !== undefined && !isNaN(val));
                        
                        if (validValues.length > 0) {
                            const sum = validValues.reduce((acc, val) => acc + val, 0);
                            const average = sum / validValues.length;
                            // Round to 3 decimal places as per specifications
                            hourlyAverages[hour][columnName] = parseFloat(average.toFixed(3));
                        } else {
                            hourlyAverages[hour][columnName] = null; // Handle missing data
                        }
                    }
                }
            } else {
                // No data for this hour, set all values to null
                for (let j = 0; j < this.headers.length; j++) {
                    if (j !== timeColumnIndex) {
                        hourlyAverages[hour][this.headers[j]] = null;
                    }
                }
            }
        }
        
        return hourlyAverages;
    }

    formatPrecise24HourOutput(hourlyAverages, baseDate, timeColumnIndex) {
        console.log('=== FORMATTING 24HR OUTPUT ===');
        
        // Create headers: Time first, then all numeric columns (excluding original time column)
        const headers = ['Time'];
        for (let i = 0; i < this.headers.length; i++) {
            if (i !== timeColumnIndex) {
                headers.push(this.headers[i]);
            }
        }
        
        console.log('Output headers:', headers);
        
        // Create 24 rows, one for each hour
        const data = [];
        for (let hour = 0; hour < 24; hour++) {
            const timeForHour = new Date(baseDate);
            timeForHour.setHours(hour, 0, 0, 0);
            
            // Format time as YYYY-MM-DDTHH:MM:SS.000Z
            const formattedTime = timeForHour.toISOString();
            
            const row = [formattedTime];
            
            // Add averaged values for this hour
            for (let i = 0; i < this.headers.length; i++) {
                if (i !== timeColumnIndex) {
                    const columnName = this.headers[i];
                    const value = hourlyAverages[hour][columnName];
                    // Handle null values appropriately - use empty string or 0
                    row.push(value !== null ? value : 0);
                }
            }
            
            data.push(row);
        }
        
        console.log('Created 24 hourly records');
        console.log('Sample records:', data.slice(0, 3));
        
        return { headers, data };
    }

    groupDataByHour(timeColumnIndex) {
        const hourlyGroups = {};
        
        // Initialize 24 hours (0-23)
        for (let hour = 0; hour < 24; hour++) {
            hourlyGroups[hour] = [];
        }

        console.log('Processing', this.csvData.length, 'rows for grouping');

        let validTimeCount = 0;
        let invalidTimeCount = 0;
        let emptyTimeCount = 0;

        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            const timeStr = row[timeColumnIndex];
            
            if (timeStr) {
                try {
                    // Try multiple time parsing approaches
                    let date;
                    let hour;
                    
                    // First try standard Date parsing
                    date = new Date(timeStr);
                    if (!isNaN(date.getTime())) {
                        hour = date.getHours();
                    } else {
                        // Try parsing as time only (HH:MM or HH:MM:SS)
                        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                        if (timeMatch) {
                            hour = parseInt(timeMatch[1], 10);
                            if (hour >= 0 && hour <= 23) {
                                date = new Date(); // Use today as base
                                date.setHours(hour, parseInt(timeMatch[2], 10), parseInt(timeMatch[3] || '0', 10));
                            }
                        } else {
                            // Try parsing as decimal hour (e.g., 13.5 for 1:30 PM)
                            const decimalHour = parseFloat(timeStr);
                            if (!isNaN(decimalHour) && decimalHour >= 0 && decimalHour < 24) {
                                hour = Math.floor(decimalHour);
                                date = new Date();
                                date.setHours(hour, (decimalHour % 1) * 60, 0);
                            }
                        }
                    }
                    
                    if (!isNaN(date.getTime()) && hour !== undefined && hour >= 0 && hour <= 23) {
                        validTimeCount++;
                        
                        // Extract numeric data from other columns (excluding time column)
                        const numericData = {};
                        let numericFieldCount = 0;
                        for (let j = 0; j < this.headers.length; j++) {
                            if (j !== timeColumnIndex) { // Skip time column
                                const value = parseFloat(row[j]);
                                if (!isNaN(value)) {
                                    numericData[this.headers[j]] = value;
                                    numericFieldCount++;
                                }
                            }
                        }
                        
                        if (numericFieldCount > 0) {
                            hourlyGroups[hour].push(numericData);
                        }
                        
                        // Debug first few rows
                        if (i < 3) {
                            console.log(`Row ${i}: time="${timeStr}" → hour=${hour}, numeric fields=${numericFieldCount}`, numericData);
                        }
                    } else {
                        invalidTimeCount++;
                        if (i < 10) console.log('Invalid date:', timeStr, 'at row', i);
                    }
                } catch (error) {
                    invalidTimeCount++;
                    if (i < 10) console.log('Error parsing date:', timeStr, 'at row', i, 'Error:', error);
                    continue;
                }
            } else {
                emptyTimeCount++;
                if (i < 10) console.log('Empty time value at row', i);
            }
        }

        console.log(`Time parsing summary: ${validTimeCount} valid, ${invalidTimeCount} invalid, ${emptyTimeCount} empty`);

        return hourlyGroups;
    }

    calculateHourlyAverages(hourlyGroups, timeColumnIndex) {
        const averages = {};

        for (let hour = 0; hour < 24; hour++) {
            const hourData = hourlyGroups[hour];
            averages[hour] = {};

            if (hourData.length > 0) {
                console.log(`Hour ${hour}: ${hourData.length} records`);
                // Calculate average for each column (excluding time column)
                for (let j = 0; j < this.headers.length; j++) {
                    if (j !== timeColumnIndex) { // Skip time column
                        const columnName = this.headers[j];
                        const validValues = hourData
                            .map(row => row[columnName])
                            .filter(val => val !== undefined && !isNaN(val));

                        if (validValues.length > 0) {
                            const sum = validValues.reduce((acc, val) => acc + val, 0);
                            averages[hour][columnName] = (sum / validValues.length);
                            console.log(`  ${columnName}: ${validValues.length} values, avg = ${averages[hour][columnName]}`);
                        } else {
                            averages[hour][columnName] = 0; // Default for missing data
                        }
                    }
                }
            } else {
                // No data for this hour, fill with zeros
                for (let j = 0; j < this.headers.length; j++) {
                    if (j !== timeColumnIndex) { // Skip time column
                        averages[hour][this.headers[j]] = 0;
                    }
                }
            }
        }

        return averages;
    }

    formatHourlyOutput(averages, timeColumnIndex) {
        // Get the first date from the dataset to use as base
        const firstTimestamp = this.csvData.length > 0 ? this.csvData[0][timeColumnIndex] : null;
        let baseDate;
        
        if (firstTimestamp) {
            try {
                baseDate = new Date(firstTimestamp);
                // Set to start of day
                baseDate.setHours(0, 0, 0, 0);
            } catch {
                baseDate = new Date();
                baseDate.setHours(0, 0, 0, 0);
            }
        } else {
            baseDate = new Date();
            baseDate.setHours(0, 0, 0, 0);
        }

        // Build headers: put Time first, then other columns (excluding the original time column)
        const headers = ['Time'];
        for (let j = 0; j < this.headers.length; j++) {
            if (j !== timeColumnIndex) {
                headers.push(this.headers[j]);
            }
        }
        
        console.log('Output headers:', headers);
        
        const data = [];

        for (let hour = 0; hour < 24; hour++) {
            const timeForHour = new Date(baseDate);
            timeForHour.setHours(hour);
            
            const row = [timeForHour.toISOString()];
            
            // Add averaged values, rounded to 3 decimal places
            for (let j = 0; j < this.headers.length; j++) {
                if (j !== timeColumnIndex) {
                    const columnName = this.headers[j];
                    const value = averages[hour][columnName] || 0;
                    row.push(parseFloat(value.toFixed(3)));
                }
            }
            
            data.push(row);
        }

        console.log('Sample output rows:', data.slice(0, 3));
        return { headers, data };
    }

    displayAveragedData(avgData) {
        // Update the internal data structure
        this.headers = avgData.headers;
        this.csvData = avgData.data;
        
        // Update the filename for 24hr file
        let newFileName;
        if (this.fileName.toLowerCase().includes('_std')) {
            newFileName = this.fileName.replace(/_std\.csv$/i, '_24hr.csv');
        } else {
            const baseName = this.fileName.replace(/\.csv$/i, '');
            newFileName = `${baseName}_24hr.csv`;
        }
        this.fileName = newFileName;
        
        // Re-render the table with averaged data
        this.renderTable();
        
        // Update file info to show averaging details
        this.updateFileInfoForAveraging(avgData);
    }

    updateFileInfoForAveraging(avgData) {
        const fileDetails = document.getElementById('fileDetails');
        
        const recordCount = avgData.data.length;
        const columnCount = avgData.headers.length;
        
        // Create averaging details
        const averagingInfo = document.createElement('div');
        averagingInfo.className = 'averaging-info';
        averagingInfo.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: #e6f8e6;
            border-radius: 8px;
            border-left: 4px solid #34c759;
        `;
        
        averagingInfo.innerHTML = `
            <div style="font-weight: 600; color: #34c759; margin-bottom: 10px;">
                ✓ Converted to 24-hour averages
            </div>
            <div style="font-size: 0.9rem; color: #1d1d1f;">
                <strong>Output:</strong> ${recordCount} hourly records, ${columnCount} columns<br>
                <strong>Columns averaged:</strong> ${avgData.headers.slice(1).join(', ')}<br>
                <strong>Time range:</strong> 00:00 - 23:00 (24 hours)
            </div>
        `;
        
        // Remove existing conversion/averaging info if present
        const existingInfo = document.querySelectorAll('.conversion-info, .averaging-info');
        existingInfo.forEach(info => info.remove());
        
        fileDetails.appendChild(averagingInfo);
    }

    showError(message) {
        // Create a simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff3b30;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 500;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        // Create a simple success notification
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2B7A78;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 500;
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize the CSV Manager when the page loads
let csvManager;
document.addEventListener('DOMContentLoaded', () => {
    csvManager = new CSVManager();
});