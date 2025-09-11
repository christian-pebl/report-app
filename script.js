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
            document.getElementById('dataTitle').textContent = this.fileName || 'CSV Data';
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
        const selectFilesBtn = document.getElementById('selectFilesBtn');
        const skipDirBtn = document.getElementById('skipDirBtn');
        const csvFilesInput = document.getElementById('csvFilesInput');

        // Show modal on startup
        if (this.showWorkingDirModal) {
            modal.classList.remove('hidden');
        }

        // Select CSV files button
        selectFilesBtn.addEventListener('click', () => {
            csvFilesInput.click();
        });

        // Skip button
        skipDirBtn.addEventListener('click', () => {
            this.hideWorkingDirModal();
        });

        // CSV files selection
        csvFilesInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFileSelection(e.target.files, 'files');
            }
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

    handleFileSelection(files, selectionType) {
        if (!files || files.length === 0) return;

        // Filter to only CSV files
        this.workingDirFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.csv'));
        
        if (this.workingDirFiles.length === 0) {
            this.showError('No CSV files found in the selected location. Please try again.');
            return;
        }

        this.analyzeWorkingDirFiles();
        this.hideWorkingDirModal();
        this.renderFileBrowser();
        
        // Auto-load the first CSV file found
        if (this.workingDirFiles.length > 0) {
            const firstFile = this.workingDirFiles[0];
            this.handleFileUpload(firstFile);
        }
        
        // Show success message
        const message = `Successfully loaded ${this.workingDirFiles.length} CSV file${this.workingDirFiles.length !== 1 ? 's' : ''}.`;
        this.showSuccess(message);
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
        const plotTitle = document.getElementById('plotTitle');
        
        // Hide table section and show plot section
        tableSection.style.display = 'none';
        plotSection.style.display = 'block';
        
        if (this.csvData.length === 0) {
            this.showError('No data available for plotting.');
            return;
        }
        
        // Update plot info and title
        plotInfo.textContent = `${this.csvData.length} records`;
        if (this.fileName) {
            plotTitle.textContent = `${this.fileName} - Time Series Plot`;
        }
        
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
        } else if (this.fileName) {
            plotTitle.textContent = `${this.fileName} - Time Series Plot`;
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
        const dataTitle = document.getElementById('dataTitle');
        
        // Hide plot section and show table section
        plotSection.style.display = 'none';
        tableSection.style.display = 'block';
        
        // Update table title with filename
        if (this.fileName) {
            dataTitle.textContent = this.fileName;
        }

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

// Navigation functionality
class NavigationManager {
    constructor() {
        this.currentPage = 'reformat';
        this.availableFiles = [];
        this.sites = new Set();
        this.sources = new Set();
        this.initializeNavigation();
        this.initializePlotPage();
    }

    initializeNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPage = tab.getAttribute('data-page');
                this.switchPage(targetPage);
            });
        });
    }

    switchPage(pageName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // Update page content
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageName}Page`).classList.add('active');

        this.currentPage = pageName;

        // If switching to plot page, update file info
        if (pageName === 'plot') {
            this.updatePlotPageFileInfo();
        }
    }

    initializePlotPage() {
        // Initialize dropdowns and button event listeners
        this.initializeComparisonControls();
    }

    initializeComparisonControls() {
        // Site comparison controls
        const sourceSelect1 = document.getElementById('sourceSelect1');
        const sitesSelect1 = document.getElementById('sitesSelect1');
        const generateSiteComparisonBtn = document.getElementById('generateSiteComparisonBtn');

        // Source comparison controls
        const siteSelect2 = document.getElementById('siteSelect2');
        const sourcesSelect2 = document.getElementById('sourcesSelect2');
        const generateSourceComparisonBtn = document.getElementById('generateSourceComparisonBtn');

        // Add event listeners for enabling/disabling buttons
        const updateSiteComparisonButton = () => {
            const sourceSelected = sourceSelect1.value;
            const sitesSelected = Array.from(sitesSelect1.selectedOptions).map(option => option.value);
            generateSiteComparisonBtn.disabled = !sourceSelected || sitesSelected.length < 2;
        };

        const updateSourceComparisonButton = () => {
            const siteSelected = siteSelect2.value;
            const sourcesSelected = Array.from(sourcesSelect2.selectedOptions).map(option => option.value);
            generateSourceComparisonBtn.disabled = !siteSelected || sourcesSelected.length < 2;
        };

        // Add event listeners
        if (sourceSelect1) sourceSelect1.addEventListener('change', updateSiteComparisonButton);
        if (sitesSelect1) sitesSelect1.addEventListener('change', updateSiteComparisonButton);
        if (siteSelect2) siteSelect2.addEventListener('change', updateSourceComparisonButton);
        if (sourcesSelect2) sourcesSelect2.addEventListener('change', updateSourceComparisonButton);

        // Button click handlers (placeholder functionality)
        if (generateSiteComparisonBtn) {
            generateSiteComparisonBtn.addEventListener('click', () => {
                const source = sourceSelect1.value;
                const sites = Array.from(sitesSelect1.selectedOptions).map(option => option.value);
                this.generateSiteComparison(source, sites);
            });
        }

        if (generateSourceComparisonBtn) {
            generateSourceComparisonBtn.addEventListener('click', () => {
                const site = siteSelect2.value;
                const sources = Array.from(sourcesSelect2.selectedOptions).map(option => option.value);
                this.generateSourceComparison(site, sources);
            });
        }
    }

    updatePlotPageFileInfo() {
        // Get file info from csvManager if available
        const fileList = csvManager && csvManager.workingDirFiles ? csvManager.workingDirFiles : [];
        this.availableFiles = fileList;
        
        // Extract sites and sources from filenames
        this.extractSitesAndSources(fileList);
        
        // Update dropdowns
        this.updateDropdowns();
        
        // Update status display
        this.updateStatusDisplay();
    }

    extractSitesAndSources(fileList) {
        this.sites.clear();
        this.sources.clear();
        this.hr24Files = []; // Store actual _24hr files
        
        // First, get sources from column headers if we have loaded files
        if (csvManager && csvManager.headers && csvManager.headers.length > 0) {
            // Look for Porpoise, Dolphin, or Sonar in column headers
            csvManager.headers.forEach(header => {
                const headerLower = header.toLowerCase();
                if (headerLower.includes('porpoise')) {
                    this.sources.add('Porpoise');
                } else if (headerLower.includes('dolphin')) {
                    this.sources.add('Dolphin');
                } else if (headerLower.includes('sonar')) {
                    this.sources.add('Sonar');
                }
            });
        }
        
        // If no sources found in headers, fall back to checking all available files
        if (this.sources.size === 0) {
            // Check headers of all available files for sources
            this.checkAllFilesForSources(fileList);
        }
        
        // Find all _24hr.csv files instead of extracting site names
        fileList.forEach(file => {
            const fileName = file.name.toLowerCase();
            if (fileName.includes('24hr') && fileName.endsWith('.csv')) {
                console.log(`Found _24hr file: ${file.name}`);
                this.hr24Files.push(file);
                // Also add to sites for backward compatibility
                this.sites.add(file.name);
            }
        });
        
        console.log(`Found ${this.hr24Files.length} _24hr.csv files`);
    }

    extractSiteFromFilename(baseName) {
        const sites = [];
        console.log(`  Analyzing filename: ${baseName}`);
        
        // Strategy 1: Standard format - site after second underscore
        // Example: FPOD_Alga_Control-S_2504-2506 -> Control-S
        const parts = baseName.split('_');
        if (parts.length >= 3) {
            const potentialSite = parts[2];
            if (potentialSite && !this.isDateLike(potentialSite)) {
                sites.push(potentialSite);
                console.log(`    Strategy 1 (after 2nd underscore): ${potentialSite}`);
            }
        }
        
        // Strategy 2: Look for known site patterns anywhere in the filename
        const sitePatterns = [
            /control[-_]?s/i,
            /farm[-_]?as/i,
            /farm[-_]?l/i,
            /control/i,
            /farm/i
        ];
        
        sitePatterns.forEach((pattern, index) => {
            const match = baseName.match(pattern);
            if (match) {
                let site = match[0];
                // Normalize the site name
                if (site.toLowerCase().includes('control') && site.toLowerCase().includes('s')) {
                    site = 'Control-S';
                } else if (site.toLowerCase().includes('farm') && site.toLowerCase().includes('as')) {
                    site = 'Farm-AS';
                } else if (site.toLowerCase().includes('farm') && site.toLowerCase().includes('l')) {
                    site = 'Farm-L';
                } else if (site.toLowerCase().includes('control')) {
                    site = 'Control';
                } else if (site.toLowerCase().includes('farm')) {
                    site = 'Farm';
                }
                
                if (!sites.includes(site)) {
                    sites.push(site);
                    console.log(`    Strategy 2 (pattern ${index + 1}): ${site}`);
                }
            }
        });
        
        // Strategy 3: Look for parts that look like site names (contains letters and possibly dashes)
        parts.forEach((part, index) => {
            if (index > 0 && // Skip first part (usually FPOD)
                part.length > 1 && 
                /[a-zA-Z]/.test(part) && 
                !this.isDateLike(part) &&
                !part.toLowerCase().includes('24hr') &&
                !part.toLowerCase().includes('std')) {
                
                if (!sites.some(s => s.toLowerCase() === part.toLowerCase())) {
                    sites.push(part);
                    console.log(`    Strategy 3 (part analysis): ${part}`);
                }
            }
        });
        
        return sites;
    }

    isDateLike(str) {
        // Check if string looks like a date or number
        return /^\d{4}[-]?\d{0,4}$/.test(str) || /^\d+$/.test(str);
    }

    extractSiteNameFromFilename(filename) {
        // Extract site name from filename: take text after 2nd underscore to before 3rd underscore
        // Example: FPOD_Alga_Control-S_2504-2506_24hr.csv -> Control-S
        const parts = filename.split('_');
        if (parts.length >= 3) {
            return parts[2];
        }
        // Fallback to the filename if extraction fails
        return filename.replace(/\.(csv|CSV)$/, '');
    }

    async checkAllFilesForSources(fileList) {
        // This would ideally check all files for their column headers
        // For now, we'll use the standard sources
        this.sources.add('Porpoise');
        this.sources.add('Dolphin');
        this.sources.add('Sonar');
    }

    updateDropdowns() {
        const sources = Array.from(this.sources).sort();
        const hr24Files = this.hr24Files || [];
        
        console.log('Updating dropdowns with:', sources.length, 'sources and', hr24Files.length, '_24hr files');
        
        // Update source dropdown for site comparison (DPM columns)
        const sourceSelect1 = document.getElementById('sourceSelect1');
        if (sourceSelect1) {
            sourceSelect1.innerHTML = '<option value="">Select DPM column to plot...</option>';
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = `${source} (DPM)`;
                sourceSelect1.appendChild(option);
            });
        }
        
        // Update sites dropdown for site comparison (_24hr files)
        const sitesSelect1 = document.getElementById('sitesSelect1');
        if (sitesSelect1) {
            sitesSelect1.innerHTML = '';
            hr24Files.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name; // Use full filename as value
                option.textContent = file.name; // Show full filename
                sitesSelect1.appendChild(option);
            });
        }
        
        // Update site dropdown for source comparison (_24hr files)
        const siteSelect2 = document.getElementById('siteSelect2');
        if (siteSelect2) {
            siteSelect2.innerHTML = '<option value="">Select a _24hr.csv file...</option>';
            hr24Files.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name; // Use full filename as value
                option.textContent = file.name; // Show full filename
                siteSelect2.appendChild(option);
            });
        }
        
        // Update sources dropdown for source comparison (DPM columns)
        const sourcesSelect2 = document.getElementById('sourcesSelect2');
        if (sourcesSelect2) {
            sourcesSelect2.innerHTML = '';
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = `${source} (DPM)`;
                sourcesSelect2.appendChild(option);
            });
        }
    }

    updateStatusDisplay() {
        const availableFilesStatus = document.getElementById('availableFilesStatus');
        const availableSitesStatus = document.getElementById('availableSitesStatus');
        const availableSourcesStatus = document.getElementById('availableSourcesStatus');
        
        if (this.availableFiles.length > 0) {
            if (availableFilesStatus) {
                availableFilesStatus.textContent = `Found ${this.availableFiles.length} CSV files in working directory.`;
            }
            if (availableSitesStatus) {
                const sites = Array.from(this.sites);
                availableSitesStatus.textContent = `Available Sites: ${sites.length > 0 ? sites.join(', ') : 'None detected'}`;
            }
            if (availableSourcesStatus) {
                const sources = Array.from(this.sources);
                availableSourcesStatus.textContent = `Available Sources: ${sources.length > 0 ? sources.join(', ') : 'None detected'}`;
            }
        } else {
            if (availableFilesStatus) {
                availableFilesStatus.textContent = 'No directory selected. Please select a working directory first.';
            }
            if (availableSitesStatus) {
                availableSitesStatus.textContent = '';
            }
            if (availableSourcesStatus) {
                availableSourcesStatus.textContent = '';
            }
        }
    }

    async generateSiteComparison(source, sites) {
        console.log('=== GENERATE SITE COMPARISON START ===');
        console.log('Source:', source);
        console.log('Sites:', sites);
        console.log('Available files:', this.availableFiles?.length || 0);
        console.log('Available files list:', this.availableFiles?.map(f => f.name) || []);
        
        const outputDiv = document.getElementById('siteComparisonOutput');
        if (!outputDiv) {
            console.error('Output div not found');
            return;
        }

        outputDiv.classList.add('active');
        
        // Show loading message
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Plot...</h4>
                <p>Loading ${sites.join(', ')} data for ${source} analysis...</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">Debug: Found ${this.availableFiles?.length || 0} files</p>
            </div>
        `;

        try {
            console.log('Starting to load 24hr files...');
            // Load the 24hr CSV files for each selected site
            const siteData = await this.load24hrFilesForSites(sites, source);
            
            console.log('Loaded site data:', siteData.length, 'files');
            siteData.forEach((data, i) => {
                console.log(`Site ${i + 1}:`, data.site, 'File:', data.file?.name);
            });
            
            if (siteData.length === 0) {
                throw new Error('No _24hr files found for the selected sites');
            }

            console.log('Creating plot...');
            // Generate the plot
            this.createSiteComparisonPlot(siteData, source, sites, outputDiv);
            console.log('Plot creation completed');
            
        } catch (error) {
            console.error('Error generating site comparison plot:', error);
            console.error('Error stack:', error.stack);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Could not generate plot:</strong> ${error.message}</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        Make sure the corresponding _24hr files exist for: ${sites.join(', ')}
                    </p>
                    <p style="margin-top: 10px; font-size: 0.75rem; font-family: monospace;">
                        Debug: Available files: ${this.availableFiles?.map(f => f.name).join(', ') || 'None'}
                    </p>
                </div>
            `;
        }
    }

    async load24hrFilesForSites(selectedFilenames, source) {
        console.log('=== LOAD 24HR FILES FOR SITES ===');
        console.log('Selected filenames:', selectedFilenames);
        console.log('Available files count:', this.availableFiles?.length || 0);
        
        const siteData = [];
        
        for (const filename of selectedFilenames) {
            console.log(`Looking for file: ${filename}`);
            // Find the file by exact filename match
            const file24hr = this.availableFiles.find(file => file.name === filename);
            
            console.log(`Found file for ${filename}:`, file24hr?.name || 'NOT FOUND');
            
            if (file24hr) {
                try {
                    console.log(`Parsing CSV file: ${file24hr.name}`);
                    const data = await this.parseCSVFile(file24hr);
                    console.log(`Parsed data for ${filename}:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');
                    
                    siteData.push({
                        site: filename, // Use filename as site identifier
                        file: file24hr,
                        data: data,
                        source: source
                    });
                } catch (error) {
                    console.error(`Error loading file ${filename}:`, error);
                }
            } else {
                console.warn(`File not found: ${filename}`);
            }
        }
        
        console.log('Total site data loaded:', siteData.length);
        return siteData;
    }

    find24hrFileForSite(site) {
        console.log(`=== FIND 24HR FILE FOR SITE: ${site} ===`);
        console.log('Available files:', this.availableFiles?.map(f => f.name) || []);
        
        if (!this.availableFiles || this.availableFiles.length === 0) {
            console.warn('No available files to search through');
            return null;
        }
        
        // Normalize the site name for flexible matching
        const normalizedSite = this.normalizeSiteName(site);
        console.log(`Normalized site name: "${site}" -> "${normalizedSite}"`);
        
        // Try multiple matching strategies
        const strategies = [
            // Strategy 1: Exact match with underscores and 24hr
            (fileName) => {
                const normalized = fileName.toLowerCase().replace(/[-\s]/g, '');
                const siteNormalized = normalizedSite.replace(/[-\s]/g, '');
                return normalized.includes(siteNormalized) && normalized.includes('24hr');
            },
            
            // Strategy 2: Match with original site name and 24hr variations
            (fileName) => {
                const normalized = fileName.toLowerCase();
                const siteVariations = this.getSiteVariations(site);
                const has24hr = normalized.includes('24hr') || normalized.includes('_24hr') || normalized.includes('-24hr');
                return siteVariations.some(variation => normalized.includes(variation.toLowerCase())) && has24hr;
            },
            
            // Strategy 3: Flexible matching for filename parts
            (fileName) => {
                const parts = fileName.toLowerCase().split(/[_\-\.]/);
                const siteVariations = this.getSiteVariations(site);
                const has24hr = parts.some(part => part.includes('24hr'));
                const hasSite = siteVariations.some(variation => 
                    parts.some(part => part.includes(variation.toLowerCase()))
                );
                return hasSite && has24hr;
            }
        ];
        
        // Try each strategy
        for (let i = 0; i < strategies.length; i++) {
            console.log(`Trying strategy ${i + 1}...`);
            
            const foundFile = this.availableFiles.find(file => {
                const fileName = file.name;
                const isMatch = strategies[i](fileName);
                
                console.log(`  Checking file: ${fileName}`);
                console.log(`    Strategy ${i + 1} match: ${isMatch}`);
                
                return isMatch;
            });
            
            if (foundFile) {
                console.log(`Found file with strategy ${i + 1}: ${foundFile.name}`);
                return foundFile;
            }
        }
        
        console.log(`No file found for site: ${site}`);
        console.log('Consider these available files:');
        this.availableFiles.forEach(file => {
            console.log(`  - ${file.name}`);
        });
        
        return null;
    }

    normalizeSiteName(site) {
        // Remove common prefixes/suffixes and normalize
        return site
            .replace(/^(site|location|area)/i, '')
            .replace(/(site|location|area)$/i, '')
            .trim()
            .toLowerCase();
    }

    getSiteVariations(site) {
        const variations = [site];
        const normalized = site.toLowerCase();
        
        // Add variations with different separators
        variations.push(
            site.replace(/-/g, '_'),     // Control-S -> Control_S
            site.replace(/_/g, '-'),     // Control_S -> Control-S
            site.replace(/[-_]/g, ''),   // Control-S -> ControlS
            normalized,
            normalized.replace(/-/g, '_'),
            normalized.replace(/_/g, '-'),
            normalized.replace(/[-_]/g, '')
        );
        
        // Add specific common variations
        if (normalized.includes('control')) {
            variations.push('ctrl', 'control', 'cont');
        }
        if (normalized.includes('farm')) {
            variations.push('farm', 'frm');
        }
        
        // Remove duplicates
        return [...new Set(variations)];
    }

    async parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csvText = e.target.result;
                    const lines = csvText.trim().split(/\r\n|\n/);
                    const headers = lines[0].split(',').map(h => h.trim());
                    const data = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index];
                        });
                        data.push(row);
                    }
                    
                    resolve({ headers, data });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    createSiteComparisonPlot(siteData, source, sites, outputDiv) {
        console.log('=== CREATE SITE COMPARISON PLOT ===');
        console.log('Site data:', siteData.length, 'sites');
        console.log('Source:', source);
        console.log('Sites:', sites);
        console.log('Output div:', !!outputDiv);
        
        try {
            // Create the plot container
            console.log('Creating plot container...');
            const plotContainer = document.createElement('div');
            if (!plotContainer) {
                throw new Error('Failed to create plot container div');
            }
            plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';
            
            console.log('Creating canvas element...');
            const canvas = document.createElement('canvas');
            if (!canvas) {
                throw new Error('Failed to create canvas element');
            }
            
            console.log('Setting canvas properties...');
            canvas.width = 800;
            canvas.height = 400;
            canvas.style.cssText = 'width: 100%; height: 100%;';
            
            console.log('Appending canvas to container...');
            plotContainer.appendChild(canvas);
            
            console.log('Getting 2D context...');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Failed to get 2D context from canvas');
            }
            console.log('Canvas and context created successfully');
        
            // Define professional journal-style colors (Nature journal style)
            const journalColors = [
                '#1f77b4', // Blue
                '#ff7f0e', // Orange  
                '#2ca02c', // Green
                '#d62728', // Red
                '#9467bd', // Purple
                '#8c564b', // Brown
                '#e377c2', // Pink
                '#7f7f7f', // Gray
                '#bcbd22', // Olive
                '#17becf'  // Cyan
            ];
            
            // Set up professional plot dimensions with more space for labels
            const plotArea = {
                left: 90,
                right: 700,
                top: 80,
                bottom: 320,
                width: 610,
                height: 240
            };
            
            console.log('Clearing canvas...');
            // Clear canvas with professional white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            console.log('Drawing title...');
            // Draw professional title
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 14px "Times New Roman", serif';
            ctx.textAlign = 'center';
            ctx.fillText(`24-Hour ${source} Detection Patterns`, canvas.width / 2, 25);
            
            // Add subtitle
            ctx.font = '12px "Times New Roman", serif';
            ctx.fillStyle = '#333333';
            ctx.fillText('Detections per minute (DPM) and percentage detection rates by hour', canvas.width / 2, 45);
            
            console.log('Preparing data for plotting...');
            // Prepare data for plotting
            const hours = Array.from({length: 24}, (_, i) => String(i + 1).padStart(2, '0') + ':00');
            let maxDPM = 0;
            
            const plotData = siteData.map((siteInfo, index) => {
                console.log(`Processing data for site: ${siteInfo.site}`);
                const hourlyData = this.extractHourlyData(siteInfo.data, source);
                console.log(`Hourly data for ${siteInfo.site}:`, Object.keys(hourlyData).length, 'hours');
                
                const dpmValues = hours.map(hour => {
                    const hourKey = hour.replace(':00', '');
                    return hourlyData[hourKey] || 0;
                });
                maxDPM = Math.max(maxDPM, ...dpmValues);
                
                // Extract clean site name from filename
                const siteName = this.extractSiteNameFromFilename(siteInfo.site);
                
                return {
                    site: siteName, // Use clean site name
                    filename: siteInfo.site, // Keep original filename for reference
                    dpmValues: dpmValues,
                    color: journalColors[index % journalColors.length] // Assign color by index
                };
            });
            
            console.log('Max DPM found:', maxDPM);
            
            // Round up maxDPM to nice number
            maxDPM = Math.ceil(maxDPM * 1.1);
            const maxPercentage = Math.ceil((maxDPM / 60) * 100);
            
            console.log('Drawing axes...');
            // Draw axes
            this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas);
            
            console.log('Plotting site data...');
            // Plot data for each site
            plotData.forEach(siteData => {
                console.log(`Plotting data for site: ${siteData.site}`);
                this.plotSiteData(ctx, plotArea, siteData, hours, maxDPM);
            });
            
            console.log('Drawing legend...');
            // Draw legend
            this.drawPlotLegend(ctx, plotData, plotArea);
            
            console.log('Updating output div...');
            // Update output div
            outputDiv.innerHTML = `
                <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #15803d; margin-bottom: 10px;">✅ Site Comparison Plot Generated</h4>
                    <p style="margin-bottom: 15px;"><strong>Source:</strong> ${source} | <strong>Sites:</strong> ${sites.join(', ')}</p>
                </div>
            `;
            
            console.log('Appending plot container...');
            outputDiv.appendChild(plotContainer);
            console.log('Plot creation completed successfully');
            
        } catch (error) {
            console.error('Error in createSiteComparisonPlot:', error);
            console.error('Error stack:', error.stack);
            throw error; // Re-throw to be caught by the calling function
        }
    }

    extractHourlyData(csvData, source) {
        console.log(`=== EXTRACT HOURLY DATA FOR SOURCE: ${source} ===`);
        console.log('CSV headers:', csvData.headers);
        console.log('CSV data rows:', csvData.data.length);
        
        const hourlyData = {};
        
        csvData.data.forEach((row, index) => {
            if (index < 3) { // Log first few rows for debugging
                console.log(`Row ${index}:`, row);
            }
            
            // Look for hour column (might be 'Hour', 'Time', etc.)
            const hourKey = Object.keys(row).find(key => 
                key.toLowerCase().includes('hour') || key.toLowerCase().includes('time')
            );
            
            // Look for the source column (Porpoise, Dolphin, Sonar)
            const sourceKey = Object.keys(row).find(key => 
                key.toLowerCase().includes(source.toLowerCase())
            );
            
            if (index < 3) {
                console.log(`Row ${index} - Hour key: "${hourKey}", Source key: "${sourceKey}"`);
                if (hourKey) console.log(`  Hour value: "${row[hourKey]}"`);
                if (sourceKey) console.log(`  Source value: "${row[sourceKey]}"`);
            }
            
            if (hourKey && sourceKey && row[hourKey] && row[sourceKey]) {
                let hour = row[hourKey];
                
                // Extract hour from timestamp if it's a full date/time
                if (typeof hour === 'string' && hour.includes('T')) {
                    // Extract hour from ISO timestamp like "2025-03-30T01:00:00.000Z"
                    const dateObj = new Date(hour);
                    hour = String(dateObj.getHours() + 1).padStart(2, '0'); // +1 because we want 01-24 not 00-23
                } else {
                    // Use as-is and pad
                    hour = String(hour).padStart(2, '0');
                }
                
                const dpm = parseFloat(row[sourceKey]) || 0;
                hourlyData[hour] = dpm;
                
                if (index < 3) {
                    console.log(`  Stored: hour="${hour}", dpm=${dpm}`);
                }
            }
        });
        
        console.log('Extracted hourly data:', Object.keys(hourlyData).length, 'hours');
        console.log('Sample hourly data:', Object.fromEntries(Object.entries(hourlyData).slice(0, 5)));
        
        return hourlyData;
    }

    drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas) {
        // Softer, elegant styling
        ctx.strokeStyle = '#d0d0d0';  // Light gray for axes
        ctx.lineWidth = 1;
        ctx.font = '11px "Helvetica Neue", "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666666';  // Softer text color
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(plotArea.left, plotArea.bottom);
        ctx.lineTo(plotArea.right, plotArea.bottom);
        ctx.stroke();
        
        // Y-axis (left - DPM)
        ctx.beginPath();
        ctx.moveTo(plotArea.left, plotArea.top);
        ctx.lineTo(plotArea.left, plotArea.bottom);
        ctx.stroke();
        
        // Y-axis (right - Percentage)
        ctx.beginPath();
        ctx.moveTo(plotArea.right, plotArea.top);
        ctx.lineTo(plotArea.right, plotArea.bottom);
        ctx.stroke();
        
        // X-axis labels (hours)
        const xStep = plotArea.width / (hours.length - 1);
        hours.forEach((hour, i) => {
            const x = plotArea.left + (i * xStep);
            
            // Tick mark
            ctx.beginPath();
            ctx.moveTo(x, plotArea.bottom);
            ctx.lineTo(x, plotArea.bottom + 5);
            ctx.stroke();
            
            // Label (show every 2 hours to avoid crowding)
            if (i % 2 === 0) {
                ctx.fillText(hour, x, plotArea.bottom + 20);
            }
        });
        
        // Left Y-axis labels (DPM)
        ctx.textAlign = 'right';
        const dpmSteps = 5;
        for (let i = 0; i <= dpmSteps; i++) {
            const dpm = (maxDPM / dpmSteps) * i;
            const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;
            
            // Tick mark
            ctx.beginPath();
            ctx.moveTo(plotArea.left - 5, y);
            ctx.lineTo(plotArea.left, y);
            ctx.stroke();
            
            // Label
            ctx.fillText(dpm.toFixed(1), plotArea.left - 10, y + 4);
        }
        
        // Right Y-axis labels (Percentage)
        ctx.textAlign = 'left';
        for (let i = 0; i <= dpmSteps; i++) {
            const percentage = (maxPercentage / dpmSteps) * i;
            const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;
            
            // Tick mark
            ctx.beginPath();
            ctx.moveTo(plotArea.right, y);
            ctx.lineTo(plotArea.right + 5, y);
            ctx.stroke();
            
            // Label
            ctx.fillText(percentage.toFixed(1) + '%', plotArea.right + 10, y + 4);
        }
        
        // Elegant axis labels
        ctx.textAlign = 'center';
        ctx.font = '12px "Helvetica Neue", "Arial", sans-serif';
        ctx.fillStyle = '#555555';
        
        // X-axis label
        ctx.fillText('Time of day (hours)', plotArea.left + plotArea.width / 2, plotArea.bottom + 40);
        
        // Left Y-axis label
        ctx.save();
        ctx.translate(25, plotArea.top + plotArea.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Detections per minute', 0, 0);
        ctx.restore();
        
        // Right Y-axis label
        ctx.save();
        ctx.translate(canvas.width - 15, plotArea.top + plotArea.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText('Detection rate (%)', 0, 0);
        ctx.restore();
    }

    plotSiteData(ctx, plotArea, siteData, hours, maxDPM) {
        const { site, dpmValues, color } = siteData;
        
        // Professional smooth line styling
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const xStep = plotArea.width / (hours.length - 1);
        
        // Create smooth curve without data points
        if (dpmValues.length < 2) return;
        
        ctx.beginPath();
        
        // Calculate points
        const points = dpmValues.map((dpm, i) => ({
            x: plotArea.left + (i * xStep),
            y: plotArea.bottom - (dpm / maxDPM) * plotArea.height
        }));
        
        // Start the path
        ctx.moveTo(points[0].x, points[0].y);
        
        // Draw smooth curves using quadratic bezier curves
        for (let i = 1; i < points.length; i++) {
            const current = points[i];
            const previous = points[i - 1];
            
            if (i === points.length - 1) {
                // Last point - draw straight line
                ctx.lineTo(current.x, current.y);
            } else {
                // Create smooth curve using quadratic bezier
                const next = points[i + 1];
                const cpX = current.x;
                const cpY = current.y;
                const endX = (current.x + next.x) / 2;
                const endY = (current.y + next.y) / 2;
                
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            }
        }
        
        ctx.stroke();
    }

    drawPlotLegend(ctx, plotData, plotArea) {
        // Professional legend positioning (top right)
        const legendX = plotArea.right - 150;
        const legendY = plotArea.top + 15;
        
        // Draw legend background
        const legendWidth = 140;
        const legendHeight = (plotData.length * 22) + 15;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(legendX - 10, legendY - 10, legendWidth, legendHeight);
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX - 10, legendY - 10, legendWidth, legendHeight);
        
        // Legend items
        ctx.font = '11px "Times New Roman", serif';
        ctx.textAlign = 'left';
        
        plotData.forEach((siteData, i) => {
            const y = legendY + (i * 22) + 8;
            
            // Draw line sample
            ctx.strokeStyle = siteData.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(legendX, y - 2);
            ctx.lineTo(legendX + 20, y - 2);
            ctx.stroke();
            
            // Draw marker sample
            ctx.beginPath();
            ctx.arc(legendX + 10, y - 2, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = siteData.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(legendX + 10, y - 2, 2, 0, 2 * Math.PI);
            ctx.fillStyle = siteData.color;
            ctx.fill();
            
            // Site name
            ctx.fillStyle = '#000000';
            ctx.fillText(siteData.site, legendX + 28, y + 2);
        });
    }

    async generateSourceComparison(site, sources) {
        const outputDiv = document.getElementById('sourceComparisonOutput');
        if (!outputDiv) return;

        outputDiv.classList.add('active');
        
        // Show loading message
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Plot...</h4>
                <p>Loading ${sources.join(', ')} data for ${site} analysis...</p>
            </div>
        `;

        try {
            // Load the 24hr CSV file for the selected site
            const siteData = await this.load24hrFileForSite(site, sources);
            
            if (!siteData) {
                throw new Error(`No _24hr file found for site: ${site}`);
            }

            // Generate the plot
            this.createSourceComparisonPlot(siteData, site, sources, outputDiv);
            
        } catch (error) {
            console.error('Error generating source comparison plot:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Could not generate plot:</strong> ${error.message}</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        Make sure the corresponding _24hr file exists for: ${site}
                    </p>
                </div>
            `;
        }
    }

    async load24hrFileForSite(filename, sources) {
        console.log('=== LOAD 24HR FILE FOR SOURCE COMPARISON ===');
        console.log('Selected filename:', filename);
        
        // Find the file by exact filename match
        const file24hr = this.availableFiles.find(file => file.name === filename);
        
        if (file24hr) {
            try {
                console.log(`Parsing CSV file: ${file24hr.name}`);
                const data = await this.parseCSVFile(file24hr);
                console.log(`Parsed data:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');
                
                return {
                    site: filename, // Use filename as identifier
                    file: file24hr,
                    data: data,
                    sources: sources
                };
            } catch (error) {
                console.error(`Error loading file ${filename}:`, error);
                throw error;
            }
        }
        
        console.warn(`File not found: ${filename}`);
        return null;
    }

    createSourceComparisonPlot(siteData, site, sources, outputDiv) {
        // Create the plot container
        const plotContainer = document.createElement('div');
        plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';
        
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.cssText = 'width: 100%; height: 100%;';
        
        plotContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Use professional journal colors for sources
        const journalColors = [
            '#1f77b4', // Blue
            '#ff7f0e', // Orange  
            '#2ca02c', // Green
            '#d62728', // Red
            '#9467bd', // Purple
            '#8c564b', // Brown
        ];
        
        // Set up professional plot dimensions
        const plotArea = {
            left: 90,
            right: 700,
            top: 80,
            bottom: 320,
            width: 610,
            height: 240
        };
        
        // Clear canvas with professional white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Extract clean site name for title
        const siteName = this.extractSiteNameFromFilename(site);
        
        // Draw professional title
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.fillText(`24-Hour Detection Source Comparison - ${siteName}`, canvas.width / 2, 25);
        
        // Add subtitle
        ctx.font = '12px "Times New Roman", serif';
        ctx.fillStyle = '#333333';
        ctx.fillText('Detections per minute (DPM) and percentage detection rates by hour', canvas.width / 2, 45);
        
        // Prepare data for plotting
        const hours = Array.from({length: 24}, (_, i) => String(i + 1).padStart(2, '0') + ':00');
        let maxDPM = 0;
        
        const plotData = sources.map((source, index) => {
            const hourlyData = this.extractHourlyData(siteData.data, source);
            const dpmValues = hours.map(hour => {
                const hourKey = hour.replace(':00', '');
                return hourlyData[hourKey] || 0;
            });
            maxDPM = Math.max(maxDPM, ...dpmValues);
            
            return {
                source: source,
                dpmValues: dpmValues,
                color: journalColors[index % journalColors.length] // Assign color by index
            };
        });
        
        // Round up maxDPM to nice number
        maxDPM = Math.ceil(maxDPM * 1.1);
        const maxPercentage = Math.ceil((maxDPM / 60) * 100);
        
        // Draw axes
        this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas);
        
        // Plot data for each source
        plotData.forEach(sourceData => {
            this.plotSourceData(ctx, plotArea, sourceData, hours, maxDPM);
        });
        
        // Draw legend
        this.drawSourcePlotLegend(ctx, plotData, plotArea);
        
        // Update output div
        outputDiv.innerHTML = `
            <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 15px;">
                <h4 style="color: #15803d; margin-bottom: 10px;">✅ Source Comparison Plot Generated</h4>
                <p style="margin-bottom: 15px;"><strong>Site:</strong> ${site} | <strong>Sources:</strong> ${sources.join(', ')}</p>
            </div>
        `;
        
        outputDiv.appendChild(plotContainer);
    }

    plotSourceData(ctx, plotArea, sourceData, hours, maxDPM) {
        const { source, dpmValues, color } = sourceData;
        
        // Professional smooth line styling
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const xStep = plotArea.width / (hours.length - 1);
        
        // Create smooth curve without data points
        if (dpmValues.length < 2) return;
        
        ctx.beginPath();
        
        // Calculate points
        const points = dpmValues.map((dpm, i) => ({
            x: plotArea.left + (i * xStep),
            y: plotArea.bottom - (dpm / maxDPM) * plotArea.height
        }));
        
        // Start the path
        ctx.moveTo(points[0].x, points[0].y);
        
        // Draw smooth curves using quadratic bezier curves
        for (let i = 1; i < points.length; i++) {
            const current = points[i];
            const previous = points[i - 1];
            
            if (i === points.length - 1) {
                // Last point - draw straight line
                ctx.lineTo(current.x, current.y);
            } else {
                // Create smooth curve using quadratic bezier
                const next = points[i + 1];
                const cpX = current.x;
                const cpY = current.y;
                const endX = (current.x + next.x) / 2;
                const endY = (current.y + next.y) / 2;
                
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            }
        }
        
        ctx.stroke();
    }

    drawSourcePlotLegend(ctx, plotData, plotArea) {
        const legendX = plotArea.left + 20;
        const legendY = plotArea.top + 20;
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        
        plotData.forEach((sourceData, i) => {
            const y = legendY + (i * 20);
            
            // Color box
            ctx.fillStyle = sourceData.color;
            ctx.fillRect(legendX, y - 8, 12, 12);
            
            // Source name
            ctx.fillStyle = '#374151';
            ctx.fillText(sourceData.source, legendX + 20, y + 2);
        });
    }
}

// Initialize the CSV Manager and Navigation when the page loads
let csvManager;
let navigationManager;
document.addEventListener('DOMContentLoaded', () => {
    csvManager = new CSVManager();
    navigationManager = new NavigationManager();
    
    // Hook into csvManager's file loading to update plot page
    const originalUpdateFileBrowser = csvManager.updateFileBrowser;
    csvManager.updateFileBrowser = function(files) {
        originalUpdateFileBrowser.call(this, files);
        // Update plot page when files are loaded
        if (navigationManager) {
            navigationManager.updatePlotPageFileInfo();
        }
    };
});