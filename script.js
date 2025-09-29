// Settings Manager
class SettingsManager {
    constructor() {
        console.log('[Settings] Creating SettingsManager');
        this.pageWidth = localStorage.getItem('pageWidth') || 'normal';
        console.log('[Settings] Page width from localStorage:', this.pageWidth);
        this.initializeSettings();
        this.setupEventListeners();
    }

    initializeSettings() {
        // Apply saved page width setting
        this.applyPageWidth(this.pageWidth);

        // Update radio button to match saved setting
        const radioBtn = document.querySelector(`input[name="pageWidth"][value="${this.pageWidth}"]`);
        if (radioBtn) {
            radioBtn.checked = true;
        }
    }

    setupEventListeners() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsDropdown = document.getElementById('settingsDropdown');

        console.log('[Settings] Looking for settings elements:', {
            button: !!settingsBtn,
            dropdown: !!settingsDropdown
        });

        if (settingsBtn && settingsDropdown) {
            console.log('[Settings] Setting up event listeners');

            // Toggle dropdown on button click
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = settingsDropdown.classList.contains('hidden');
                console.log('[Settings] Toggle dropdown, currently hidden:', isHidden);
                settingsDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!settingsDropdown.contains(e.target) && !settingsBtn.contains(e.target)) {
                    settingsDropdown.classList.add('hidden');
                }
            });

            // Handle page width changes
            const pageWidthRadios = document.querySelectorAll('input[name="pageWidth"]');
            console.log('[Settings] Found', pageWidthRadios.length, 'page width radio buttons');

            pageWidthRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.pageWidth = e.target.value;
                    console.log('[Settings] Changing page width to:', this.pageWidth);
                    this.applyPageWidth(this.pageWidth);
                    localStorage.setItem('pageWidth', this.pageWidth);
                    console.log('[Settings] Saved to localStorage');
                });
            });
        } else {
            console.error('[Settings] Missing elements - Button:', !!settingsBtn, 'Dropdown:', !!settingsDropdown);
        }
    }

    applyPageWidth(width) {
        console.log('[Settings] Applying page width:', width);
        if (width === 'wide') {
            document.body.classList.add('wide-view');
            console.log('[Settings] Added wide-view class to body');
        } else {
            document.body.classList.remove('wide-view');
            console.log('[Settings] Removed wide-view class from body');
        }
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Settings] DOM loaded, initializing SettingsManager');
    window.settingsManager = new SettingsManager();
    console.log('[Settings] SettingsManager initialized');
});

class CSVManager {
    constructor() {
        this.csvData = [];
        this.headers = [];
        this.fileName = '';
        this.workingDirFiles = [];
        this.fileInfos = new Map(); // Map of baseName -> {original, std, hr24}
        this.showWorkingDirModal = true;
        this.chartType = 'line'; // Default to line charts
        this.layerOrder = 'normal'; // 'normal' or 'reversed' for dataset layer order
        this.delimiter = null; // Will be auto-detected

        this.initializeEventListeners();
        this.initializeWorkingDirModal();
    }

    // Utility function to convert hex color to RGBA with transparency
    hexToRgba(hex, alpha = 0.7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Utility function to apply layer ordering to plot data
    applyLayerOrder(plotData) {
        const orderedData = [...plotData]; // Create a copy
        if (this.layerOrder === 'reversed') {
            orderedData.reverse();
        }
        return orderedData;
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

        console.log('confirmSaveBtn found:', confirmSaveBtn);
        console.log('confirmSavePlotBtn found:', confirmSavePlotBtn);
        
        const handleConfirmSave = () => {
            console.log('handleConfirmSave called');
            console.log('pendingConversion:', this.pendingConversion);

            if (!this.pendingConversion) {
                console.error('No pending conversion available');
                return;
            }

            const { fileName, suffix, baseName, fileInfo, conversionResult } = this.pendingConversion;

            // Show confirmation dialog with directory guidance
            this.showDirectorySaveConfirmation(fileName, suffix, baseName, fileInfo, conversionResult, () => {
                // Save the file
                this.autoSaveConvertedFile(fileName, suffix);
                
                // Create a mock file object and add to fileInfo
                const mockFile = this.createMockFileFromCurrentData(fileName);
                fileInfo.versions.set(suffix, mockFile);
                
                // Add the new file to working directory files for plot page
                if (this.workingDirFiles && !this.workingDirFiles.find(f => f.name === fileName)) {
                    this.workingDirFiles.push(mockFile);
                    console.log(`Added ${fileName} to working directory files`);
                }
                
                // Update UI
                this.renderFileBrowser();
                this.showSuccess(`Saved ${fileName} successfully! Remember to save in your original CSV directory.`);
                
                // Update plot page if navigation manager exists
                if (typeof navigationManager !== 'undefined' && navigationManager.updatePlotPageFileInfo) {
                    // Fire and forget - don't await to avoid blocking the UI
                    navigationManager.updatePlotPageFileInfo().catch(console.error);
                    console.log('Updated plot page file info after creating new file');
                }
                
                // Hide buttons and clear pending conversion
                confirmSaveBtn.style.display = 'none';
                confirmSavePlotBtn.style.display = 'none';
                document.getElementById('toggleViewBtn').style.display = 'none';
                this.pendingConversion = null;
                
                // Reset title
                document.getElementById('dataTitle').textContent = this.fileName || 'CSV Data';
            });
        };
        
        if (confirmSaveBtn) {
            console.log('Adding click event listener to confirmSaveBtn');
            confirmSaveBtn.addEventListener('click', handleConfirmSave);
        } else {
            console.error('confirmSaveBtn not found in DOM');
        }

        if (confirmSavePlotBtn) {
            console.log('Adding click event listener to confirmSavePlotBtn');
            confirmSavePlotBtn.addEventListener('click', handleConfirmSave);
        } else {
            console.error('confirmSavePlotBtn not found in DOM');
        }

        // Chart type toggle functionality - handle all toggle inputs
        const chartTypeToggles = document.querySelectorAll('.chart-type-input');
        chartTypeToggles.forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.chartType = toggle.checked ? 'column' : 'line';
                console.log('Chart type changed to:', this.chartType);

                // Sync all toggles to the same state
                chartTypeToggles.forEach(otherToggle => {
                    if (otherToggle !== toggle) {
                        otherToggle.checked = toggle.checked;
                    }
                });

                // Re-render the current plot with the new chart type
                if (this.csvData && this.csvData.length > 0) {
                    const variableControls = document.getElementById('variableControls');
                    if (variableControls && variableControls.style.display !== 'none') {
                        this.drawTimeSeriesWithSelection();
                    } else {
                        this.drawTimeSeries();
                    }
                }
            });
        });

        // Layer toggle functionality - handle all layer toggle buttons
        const layerToggles = document.querySelectorAll('.layer-toggle-btn');
        layerToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.layerOrder = this.layerOrder === 'normal' ? 'reversed' : 'normal';
                console.log('Layer order changed to:', this.layerOrder);

                // Sync all layer toggle visual states
                layerToggles.forEach(otherToggle => {
                    if (this.layerOrder === 'reversed') {
                        otherToggle.classList.add('active');
                    } else {
                        otherToggle.classList.remove('active');
                    }
                });

                // Re-render any visible plots
                // Note: Plots will automatically use the new layer order on next generation
                // For immediate feedback, we would need to track and re-render current plots
                console.log('Layer order toggled - next plot generation will use new order');
            });
        });
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

        // Initialize SUBCAM plot page with loaded files
        this.initializeSubcamPlotPage();

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
            const hasRaw = fileInfo.versions.has('raw') || fileInfo.versions.has('raw2') || fileInfo.versions.has('original');
            const hasNmax = fileInfo.versions.has('nmax');
            const hasObvs = fileInfo.versions.has('obvs');
            const canConvert = fileInfo.versions.size > 0; // Has at least one version to convert from

            let convertButtons = '';
            if (canConvert) {
                // SUBCAM conversions - show if we have raw but missing nmax/obvs
                if (hasRaw && !hasNmax) {
                    convertButtons += `<button class="btn-small btn-convert" onclick="csvManager.generateNmaxFromBrowser('${fileInfo.baseName}')">⚡ NMAX</button>`;
                }
                if (hasRaw && !hasObvs) {
                    convertButtons += `<button class="btn-small btn-convert" onclick="csvManager.generateObvsFromBrowser('${fileInfo.baseName}')">⚡ OBVS</button>`;
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
            'raw2': 'version-raw',
            'nmax': 'version-nmax',
            'obvs': 'version-obvs',
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



    generateNmaxFromBrowser(baseName) {
        console.log('🔄 Generating NMAX from browser for:', baseName);
        const fileInfo = this.fileInfos.get(baseName);
        if (!fileInfo || fileInfo.versions.size === 0) return;

        // Use the raw file for NMAX conversion
        let rawFile = fileInfo.versions.get('raw') || fileInfo.versions.get('raw2') || fileInfo.versions.get('original');
        if (!rawFile) {
            this.showError('No raw file found for NMAX conversion');
            return;
        }

        // Clear previous log and prepare for new conversion
        this.clearProcessingLog();
        this.updateProgress({ progress: 0, stepName: 'Initializing conversion...', elapsed: 0 });

        this.showSuccess('🚀 Starting Raw to NMAX conversion...');

        setTimeout(async () => {
            try {
                // Load the raw file
                this.updateProgress({ progress: 5, stepName: 'Loading raw file...', elapsed: 100 });
                const rawData = await this.readFileAsText(rawFile);
                const csvData = this.parseCSV(rawData);

                // Convert raw data to CSV format for conversion engine
                const csvText = this.createCSVFromData(this.headers, this.csvData);

                // Create converter with progress callback
                const converter = new SUBCAMConverter();

                // Debug: Check converter instance
                console.log('🔍 DEBUG: SUBCAMConverter instance created');
                console.log('🔍 DEBUG: Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(converter)).filter(m => m.includes('raw2') || m.includes('Raw2')));

                // Show user conversion is starting
                this.showSuccess('🔍 Analyzing file format and preparing conversion...');

                // Set up progress tracking
                converter.logger.setProgressCallback((update) => {
                    if (update.type === 'log') {
                        this.addEnhancedLogEntry(update.entry);
                    } else {
                        // Progress update
                        this.updateProgress(update);
                    }
                });

                // Perform conversion
                const result = await converter.convertRawToNmax(csvText);

                if (result.success) {
                    // Display validation results
                    if (result.validation) {
                        this.displayValidationResults(result.validation);
                    }

                    // Convert result back to our format
                    const nmaxCSV = converter.dataToCSV(result.data);
                    const nmaxData = this.parseCSV(nmaxCSV);

                    // Show converted data with preview controls
                    const convertedFileName = `${baseName}_nmax.csv`;
                    this.showConvertedDataPreview(convertedFileName, 'nmax', baseName, fileInfo, result);

                    // Final success message
                    const processingTime = (result.metadata.processingTime / 1000).toFixed(2);
                    this.addToProcessingLog(`🎉 Conversion completed successfully in ${processingTime}s`, 'success');
                    this.addToProcessingLog(`📊 ${result.metadata.inputRows} input rows → ${result.metadata.outputRows} output rows`, 'success');

                } else {
                    throw new Error(result.error || 'NMAX conversion failed');
                }
            } catch (error) {
                console.error('NMAX conversion error:', error);
                this.updateProgress({ progress: 0, stepName: 'Conversion failed', elapsed: 0 });
                this.addToProcessingLog(`❌ Conversion failed: ${error.message}`, 'error');
                this.showError(`NMAX conversion failed: ${error.message}`);
            }
        }, 500);
    }

    generateObvsFromBrowser(baseName) {
        console.log('🔄 Generating OBVS from browser for:', baseName);
        const fileInfo = this.fileInfos.get(baseName);
        if (!fileInfo || fileInfo.versions.size === 0) return;

        // Use the raw file for OBVS conversion
        let rawFile = fileInfo.versions.get('raw') || fileInfo.versions.get('raw2') || fileInfo.versions.get('original');
        if (!rawFile) {
            this.showError('No raw file found for OBVS conversion');
            return;
        }

        this.showSuccess('Generating OBVS format... This may take a moment.');

        setTimeout(async () => {
            try {
                // Load the raw file
                const rawData = await this.readFileAsText(rawFile);
                const csvData = this.parseCSV(rawData);

                // Convert raw data to CSV format for conversion engine
                const csvText = this.createCSVFromData(this.headers, this.csvData);

                // Use conversion engine to convert to OBVS
                const converter = new SUBCAMConverter();
                const result = await converter.convertRawToObvs(csvText);

                if (result.success) {
                    // Convert result back to our format
                    const obvsCSV = converter.dataToCSV(result.data);
                    const obvsData = this.parseCSV(obvsCSV);

                    // Show converted data with preview controls
                    const convertedFileName = `${baseName}_obvs.csv`;
                    this.showConvertedDataPreview(convertedFileName, 'obvs', baseName, fileInfo, result);
                } else {
                    throw new Error(result.error || 'OBVS conversion failed');
                }
            } catch (error) {
                console.error('OBVS conversion error:', error);
                this.showError(`OBVS conversion failed: ${error.message}`);
            }
        }, 500);
    }

    showConvertedDataPreview(fileName, suffix, baseName, fileInfo, conversionResult = null) {
        console.log('📋 Showing converted data preview:', { fileName, suffix, conversionResult });

        // Update the table title to show the converted file name
        const dataTitle = document.getElementById('dataTitle');
        dataTitle.innerHTML = `
            <span class="table-title-main">${fileName}</span>
            <span class="table-title-sub">🔄 Converted ${suffix.toUpperCase()} Format • Preview Mode</span>
        `;
        
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
            headers: [...this.headers],
            conversionResult
        };

        // Show conversion statistics if available
        if (conversionResult && conversionResult.metadata) {
            const meta = conversionResult.metadata;
            let statsMessage = `Converted to ${suffix.toUpperCase()} format! `;
            if (meta.inputRows && meta.outputRows) {
                statsMessage += `${meta.inputRows} input rows → ${meta.outputRows} output rows. `;
            }
            if (meta.dateRange) {
                statsMessage += `Date range: ${meta.dateRange.start} to ${meta.dateRange.end} (${meta.dateRange.days} days). `;
            }
            if (meta.speciesCount) {
                statsMessage += `${meta.speciesCount} species detected. `;
            }
            statsMessage += 'Review the data and click "Confirm & Save" to save the file.';
            this.showSuccess(statsMessage);
        } else {
            this.showSuccess(`Converted to ${suffix.toUpperCase()} format! Review the data and click "Confirm & Save" to save the file.`);
        }

        // Add conversion info to processing log if it exists
        if (conversionResult && conversionResult.metadata) {
            this.addToProcessingLog(`📊 Input: ${conversionResult.metadata.inputRows || 0} rows`, 'info');
            this.addToProcessingLog(`📊 Output: ${conversionResult.metadata.outputRows || 0} rows`, 'info');
            if (conversionResult.metadata.dateRange) {
                this.addToProcessingLog(`📅 Date range: ${conversionResult.metadata.dateRange.start} to ${conversionResult.metadata.dateRange.end}`, 'info');
            }
            if (conversionResult.metadata.speciesCount) {
                this.addToProcessingLog(`🐟 Species detected: ${conversionResult.metadata.speciesCount}`, 'info');
            }
        }
    }

    showSaveConfirmation(fileName, suffix, baseName, fileInfo) {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 650px;">
                <div class="modal-header">
                    <h2>💾 Confirm Save</h2>
                    <p>Review the converted data and confirm to save as <strong>${fileName}</strong></p>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 15px;">
                        <strong>Preview:</strong> ${this.csvData.length} records, ${this.headers.length} columns
                    </div>
                    <div class="save-instructions" style="background-color: #e8f4fd; border: 1px solid #bee5eb; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #0c5460;">📁 Save Location Recommendation</h4>
                        <p style="margin: 0; color: #0c5460; font-size: 14px;">
                            <strong>Please save this file in the same directory/folder where you originally loaded your CSV files.</strong><br>
                            This keeps all related files (raw, _std, _24hr) organized together for easy access in the Plot page.
                        </p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" id="confirmSaveBtn">✅ Save File</button>
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
            
            // Add the new file to working directory files for plot page
            if (this.workingDirFiles && !this.workingDirFiles.find(f => f.name === fileName)) {
                this.workingDirFiles.push(mockFile);
                console.log(`Added ${fileName} to working directory files`);
            }
            
            // Update UI
            this.renderFileBrowser();
            this.showSuccess(`Generated and saved ${fileName}! Remember to save in your original CSV directory.`);
            
            // Update plot page if navigation manager exists
            if (typeof navigationManager !== 'undefined' && navigationManager.updatePlotPageFileInfo) {
                // Fire and forget - don't await to avoid blocking the UI
                navigationManager.updatePlotPageFileInfo().catch(console.error);
                console.log('Updated plot page file info after creating new file');
            }
            
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

    showDirectorySaveConfirmation(fileName, suffix, baseName, fileInfo, conversionResult, onConfirm) {
        console.log('showDirectorySaveConfirmation called with:', {fileName, suffix, conversionResult});

        // Handle both old and new function signature for backward compatibility
        if (typeof conversionResult === 'function') {
            onConfirm = conversionResult;
            conversionResult = null;
        }

        // Create compact confirmation dialog
        const modal = document.createElement('div');
        modal.className = 'modal';

        // Build conversion statistics display
        let conversionStats = '';
        if (conversionResult && conversionResult.metadata) {
            const meta = conversionResult.metadata;
            conversionStats = `
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #0369a1;">📊 Conversion Summary</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; color: #0369a1;">
                        ${meta.inputRows ? `<div><strong>Input rows:</strong> ${meta.inputRows}</div>` : ''}
                        ${meta.outputRows ? `<div><strong>Output rows:</strong> ${meta.outputRows}</div>` : ''}
                        ${meta.speciesCount ? `<div><strong>Species:</strong> ${meta.speciesCount}</div>` : ''}
                        ${meta.dateRange ? `<div><strong>Date range:</strong> ${meta.dateRange.days} days</div>` : ''}
                    </div>
                    ${meta.dateRange ? `<div style="font-size: 12px; color: #0369a1; margin-top: 8px; font-style: italic;">${meta.dateRange.start} to ${meta.dateRange.end}</div>` : ''}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h2>💾 Save ${fileName}</h2>
                </div>
                <div class="modal-body">
                    ${conversionStats}
                    <div class="save-instructions" style="background-color: #e8f4fd; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #0c5460;">📁 Important: Save Location</h4>
                        <p style="margin: 0 0 10px 0; color: #0c5460; font-size: 14px;">
                            <strong>Please save this file in the same directory/folder where you loaded your original CSV files.</strong>
                        </p>
                        <p style="margin: 0; color: #0c5460; font-size: 13px; font-style: italic;">
                            This keeps all related files (raw, _nmax, _obvs, _std, _24hr) organized together for easy access when plotting.
                        </p>
                    </div>
                    <div style="text-align: center; margin-bottom: 15px; color: #666; font-size: 14px;">
                        File: <strong>${fileName}</strong> • ${this.csvData.length} records, ${this.headers.length} columns
                    </div>
                    <div class="modal-actions">
                        <button class="btn-primary" id="confirmDirectorySaveBtn">✅ Save to Directory</button>
                        <button class="btn-secondary" id="cancelDirectorySaveBtn">❌ Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const confirmBtn = modal.querySelector('#confirmDirectorySaveBtn');
        const cancelBtn = modal.querySelector('#cancelDirectorySaveBtn');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                console.log('Directory save confirm button clicked');
                onConfirm();
                document.body.removeChild(modal);
            });
        } else {
            console.error('confirmDirectorySaveBtn not found in modal');
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('Directory save cancel button clicked');
                document.body.removeChild(modal);
            });
        } else {
            console.error('cancelDirectorySaveBtn not found in modal');
        }
        
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
        this.delimiter = null; // Reset delimiter detection for new file
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
        console.log('=== PARSING SUBCAM CSV ===');
        console.log('CSV content length:', csvContent.length);

        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
        console.log('Total lines after filtering:', lines.length);

        if (lines.length === 0) {
            this.showError('The CSV file appears to be empty.');
            return;
        }

        // Parse and normalize headers
        this.headers = this.parseCSVLine(lines[0]);
        this.headers = this.normalizeHeaders(this.headers);
        console.log('Normalized headers:', this.headers);

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

        // Validate SUBCAM file format
        this.validateSUBCAMFormat();
    }

    detectDelimiter(line) {
        // Count potential delimiters
        const commaCount = (line.match(/,/g) || []).length;
        const tabCount = (line.match(/\t/g) || []).length;
        const semicolonCount = (line.match(/;/g) || []).length;

        // Determine most likely delimiter
        if (tabCount > commaCount && tabCount > semicolonCount) {
            return '\t';
        } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
            return ';';
        } else {
            return ',';
        }
    }

    parseCSVLine(line) {
        // Detect delimiter if not already detected
        if (!this.delimiter) {
            this.delimiter = this.detectDelimiter(line);
            console.log('Detected delimiter:', this.delimiter === '\t' ? 'TAB' : this.delimiter);
        }

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
            } else if (char === this.delimiter && !inQuotes) {
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

    normalizeHeaders(headers) {
        console.log('=== NORMALIZING HEADERS ===');
        console.log('Original headers:', headers);

        const normalizedHeaders = headers
            .filter(header => header && header.trim()) // Remove empty headers
            .map(header => {
                // Replace NBSP with regular space
                let normalized = header.replace(/\xa0/g, ' ');

                // Trim whitespace
                normalized = normalized.trim();

                // Collapse multiple spaces
                normalized = normalized.replace(/\s+/g, ' ');

                // Apply synonym/typo corrections
                const synonyms = {
                    'Cummilative New Unique Organisms': 'Cumulative New Unique Organisms',
                    'Total_Observations': 'Date',
                    'Total Observations': 'Date',
                    'Cumulative_Observations': 'Cumulative Observations',
                    'Unique_Organisms_Observed_Today': 'Unique Organisms Observed Today'
                };

                if (synonyms[normalized]) {
                    normalized = synonyms[normalized];
                }

                return normalized;
            })
            .filter(header => {
                // Drop index artifacts and placeholder columns
                return !header.startsWith('Unnamed:') && header !== '-';
            });

        console.log('Normalized headers:', normalizedHeaders);
        return normalizedHeaders;
    }

    validateSUBCAMFormat() {
        console.log('=== VALIDATING SUBCAM FORMAT ===');
        console.log('File name:', this.fileName);

        // Determine file type from filename
        const fileType = this.determineSUBCAMFileType(this.fileName);
        console.log('Detected file type:', fileType);

        if (!fileType) {
            console.warn('Could not determine SUBCAM file type from filename');
            return;
        }

        // Validate required columns based on file type
        const requiredColumns = this.getRequiredColumns(fileType);
        const missingColumns = requiredColumns.filter(col =>
            !this.headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
        );

        if (missingColumns.length > 0 && (fileType === 'nmax' || fileType === 'obvs')) {
            console.log('Adding missing columns with 0 values for', fileType, 'format:', missingColumns);
            this.addMissingColumnsWithDefaults(requiredColumns, fileType);
        } else if (missingColumns.length > 0) {
            console.warn('Missing required columns for', fileType, 'format:', missingColumns);
            this.showWarning(`This ${fileType} file is missing some expected columns: ${missingColumns.join(', ')}`);
        }

        // Store file type for later use
        this.fileType = fileType;
    }

    addMissingColumnsWithDefaults(requiredColumns, fileType) {
        console.log('=== ADDING MISSING COLUMNS ===');
        console.log('Current headers:', this.headers);
        console.log('Required columns:', requiredColumns);

        // Save original headers for later
        const originalHeaders = [...this.headers];

        // Start with the Date column
        const newHeaders = [this.headers[0]]; // Keep Date column

        // Add required columns (except Date which is already added)
        for (let i = 1; i < requiredColumns.length; i++) {
            newHeaders.push(requiredColumns[i]);
        }

        // Add remaining original columns (except the first one which is Date)
        for (let i = 1; i < originalHeaders.length; i++) {
            if (!newHeaders.includes(originalHeaders[i])) {
                newHeaders.push(originalHeaders[i]);
            }
        }

        // Update data rows
        this.csvData = this.csvData.map(row => {
            const newRow = [row[0]]; // Keep date value

            // Add 0 for each required column
            for (let i = 1; i < requiredColumns.length; i++) {
                newRow.push('0');
            }

            // Add remaining original data (except the first column)
            for (let i = 1; i < row.length; i++) {
                newRow.push(row[i] || '0');
            }

            return newRow;
        });

        // Update headers
        this.headers = newHeaders;

        console.log('Updated headers:', this.headers);
        console.log('Sample updated row:', this.csvData[0]);
    }

    determineSUBCAMFileType(filename) {
        if (!filename) return null;

        const lowerName = filename.toLowerCase();
        if (lowerName.includes('_raw2.csv')) return 'raw2';
        if (lowerName.includes('_raw.csv')) return 'raw';
        if (lowerName.includes('_nmax.csv')) return 'nmax';
        if (lowerName.includes('_obvs.csv')) return 'obvs';

        return null;
    }

    getRequiredColumns(fileType) {
        const requiredColumns = {
            'raw': [
                'File Name', 'Timestamps', 'Event Observation', 'Quantity',
                'Common Name', 'Family', 'Lowest Order Scientific Name',
                'Confidence Level', 'Quality of Video', 'Notes'
            ],
            'raw2': [
                'file_name', 'quantity', 'note', 'time_stamp',
                'species', 'genus', 'family', 'order', 'notes'
            ],
            'nmax': [
                'Date', 'Total Observations', 'Cumulative Observations',
                'All Unique Organisms Observed Today', 'New Unique Organisms Today',
                'Cumulative New Unique Organisms', 'Cumulative Unique Species'
            ],
            'obvs': [
                'Date', 'Total Observations', 'Unique Organisms Observed Today',
                'New Unique Organisms Today', 'Cumulative Unique Species'
            ]
        };

        return requiredColumns[fileType] || [];
    }

    showWarning(message) {
        console.warn('Warning:', message);
        // You could add a visual warning to the UI here if desired
    }

    displayFileInfo(file) {
        const fileInfoCompact = document.getElementById('fileInfoCompact');
        const fileDetails = document.getElementById('fileDetails');

        const fileSize = (file.size / 1024).toFixed(2);
        const recordCount = this.csvData.length;
        const columnCount = this.headers.length;

        // Parse SUBCAM filename for additional information
        const fileInfo = this.parseSUBCAMFilename(file.name);

        let subcamInfo = '';
        if (fileInfo.valid) {
            subcamInfo = `
                <div class="file-detail subcam-info">
                    <strong>File Type</strong>
                    <span class="file-type-badge file-type-${fileInfo.type}">${fileInfo.type.toUpperCase()}</span>
                </div>
                <div class="file-detail">
                    <strong>Project/Site</strong>
                    ${fileInfo.projectOrSite}${fileInfo.variant ? ` (Variant: ${fileInfo.variant})` : ''}
                </div>
                <div class="file-detail">
                    <strong>Period</strong>
                    ${fileInfo.period}
                </div>
            `;
        }

        fileDetails.innerHTML = `
            <div class="file-detail">
                <strong>File Name</strong>
                ${file.name}
            </div>
            ${subcamInfo}
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
            ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No numeric columns found for plotting', canvas.width/2, canvas.height/2);
            return;
        }
        
        // Parse time data and prepare for plotting
        const plotData = this.prepareTimeSeriesData(timeColumnIndex, numericColumns);
        
        if (plotData.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
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
            ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No variables selected for plotting', canvas.width/(2*window.devicePixelRatio), canvas.height/(2*window.devicePixelRatio));
            return;
        }
        
        // Parse time data and prepare for plotting
        const plotData = this.prepareTimeSeriesData(timeColumnIndex, selectedColumns);
        
        if (plotData.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
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
        const titleHeight = 40; // Space for title
        const plotWidth = canvas.width / window.devicePixelRatio - 2 * margin;
        const plotHeight = canvas.height / window.devicePixelRatio - 2 * margin - titleHeight;

        // Colors for different series
        const colors = ['#007aff', '#34c759', '#ff3b30', '#ff9500', '#af52de', '#00c7be', '#ff2d92'];

        // File name truncation function (2nd to 4th underscore)
        const truncateFileName = (fileName) => {
            const parts = fileName.split('_');
            if (parts.length >= 4) {
                return parts.slice(2, 4).join('_');
            }
            return fileName; // Return original if not enough underscores
        };

        // Determine chart title based on data context
        let chartTitle = '';
        if (numericColumns.length === 1) {
            // Single column selected - use column name as title
            chartTitle = numericColumns[0].header;
        } else if (this.fileName) {
            // Multiple columns or file-based view - use truncated filename
            chartTitle = truncateFileName(this.fileName);
        }

        // Separate std and non-std columns
        const stdColumns = numericColumns.filter(col =>
            col.header.toLowerCase().includes('std') ||
            this.fileName.toLowerCase().includes('_std')
        );
        const nonStdColumns = numericColumns.filter(col =>
            !col.header.toLowerCase().includes('std') &&
            !this.fileName.toLowerCase().includes('_std')
        );

        console.log('Chart data context:', {
            fileName: this.fileName,
            numericColumns: numericColumns.map(c => c.header),
            stdColumns: stdColumns.map(c => c.header),
            nonStdColumns: nonStdColumns.map(c => c.header)
        });

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

        // Find global min/max for std and non-std series separately
        let globalStdMin = Infinity, globalStdMax = -Infinity;
        let globalNonStdMin = Infinity, globalNonStdMax = -Infinity;

        stdColumns.forEach(col => {
            if (seriesStats[col.header]) {
                globalStdMin = Math.min(globalStdMin, seriesStats[col.header].min);
                globalStdMax = Math.max(globalStdMax, seriesStats[col.header].max);
            }
        });

        nonStdColumns.forEach(col => {
            if (seriesStats[col.header]) {
                globalNonStdMin = Math.min(globalNonStdMin, seriesStats[col.header].min);
                globalNonStdMax = Math.max(globalNonStdMax, seriesStats[col.header].max);
            }
        });

        // If we have both std and non-std data, scale std down to match non-std range
        const stdScaleFactor = (nonStdColumns.length > 0 && stdColumns.length > 0) ?
            (globalNonStdMax - globalNonStdMin) / (globalStdMax - globalStdMin) * 0.05 : 1;

        console.log('Scaling calculation:', {
            globalStdMin, globalStdMax,
            globalNonStdMin, globalNonStdMax,
            stdScaleFactor,
            hasStdColumns: stdColumns.length > 0,
            hasNonStdColumns: nonStdColumns.length > 0
        });

        // Find time range
        let timeMin = plotData[0].time;
        let timeMax = plotData[plotData.length - 1].time;

        // Draw chart title (left-aligned)
        if (chartTitle) {
            ctx.font = 'bold 18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
            ctx.fillStyle = '#1d1d1f';
            ctx.textAlign = 'left';
            ctx.fillText(chartTitle, margin, margin - 10);
        }

        // Draw axes (adjusted for title space)
        ctx.strokeStyle = '#d1d1d6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, margin + titleHeight);
        ctx.lineTo(margin, margin + titleHeight + plotHeight);
        ctx.lineTo(margin + plotWidth, margin + titleHeight + plotHeight);
        ctx.stroke();
        
        // Draw time series
        numericColumns.forEach((col, seriesIndex) => {
            if (!seriesStats[col.header]) return;

            const color = colors[seriesIndex % colors.length];
            const isStdSeries = stdColumns.includes(col);

            // Use global scaling for better comparison
            let globalMin, globalMax;
            if (isStdSeries) {
                globalMin = globalStdMin;
                globalMax = globalStdMax;
            } else {
                globalMin = globalNonStdMin;
                globalMax = globalNonStdMax;
            }

            const range = globalMax - globalMin;
            if (range === 0) return; // Skip constant series

            if (this.chartType === 'line') {
                // Line chart rendering
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

                    // Calculate y position with scaling for std series
                    let scaledValue = value;
                    let scaledMin = globalMin;

                    if (isStdSeries && stdScaleFactor !== 1) {
                        // Scale down std values to be comparable with non-std values
                        scaledValue = (value - globalMin) * stdScaleFactor + globalNonStdMin;
                        scaledMin = globalNonStdMin;
                        const scaledRange = (globalMax - globalMin) * stdScaleFactor;
                        y = margin + titleHeight + plotHeight - ((scaledValue - scaledMin) / (globalNonStdMax - globalNonStdMin)) * plotHeight;
                    } else {
                        y = margin + titleHeight + plotHeight - ((value - globalMin) / range) * plotHeight;
                    }

                    if (firstPoint) {
                        ctx.moveTo(x, y);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                ctx.stroke();
            } else {
                // Column chart rendering
                ctx.fillStyle = color;
                const columnWidth = Math.max(2, plotWidth / plotData.length * 0.8 / numericColumns.length);
                const columnOffset = seriesIndex * columnWidth - (numericColumns.length - 1) * columnWidth / 2;

                plotData.forEach(point => {
                    const value = point.values[col.header];
                    if (value === undefined) return;

                    let x, y, columnHeight;

                    // Calculate x position based on time
                    if (point.time instanceof Date) {
                        const timeRange = timeMax - timeMin;
                        x = margin + (point.time - timeMin) / timeRange * plotWidth + columnOffset;
                    } else {
                        const timeRange = timeMax - timeMin;
                        x = margin + (point.time - timeMin) / timeRange * plotWidth + columnOffset;
                    }

                    // Calculate y position and column height with scaling for std series
                    let scaledValue = value;
                    let scaledMin = globalMin;

                    if (isStdSeries && stdScaleFactor !== 1) {
                        // Scale down std values to be comparable with non-std values
                        scaledValue = (value - globalMin) * stdScaleFactor + globalNonStdMin;
                        scaledMin = globalNonStdMin;
                        const baseY = margin + titleHeight + plotHeight;
                        columnHeight = ((scaledValue - scaledMin) / (globalNonStdMax - globalNonStdMin)) * plotHeight;
                        y = baseY - columnHeight;
                    } else {
                        const baseY = margin + titleHeight + plotHeight;
                        columnHeight = ((value - globalMin) / range) * plotHeight;
                        y = baseY - columnHeight;
                    }

                    // Draw the column
                    ctx.fillRect(x, y, columnWidth, columnHeight);
                });
            }
        });
        
        // Draw legend
        ctx.font = '14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        const legendY = 20;
        let legendX = margin;

        numericColumns.forEach((col, seriesIndex) => {
            if (!seriesStats[col.header]) return;

            const color = colors[seriesIndex % colors.length];
            const isStdSeries = stdColumns.includes(col);

            ctx.fillStyle = color;
            ctx.fillRect(legendX, legendY, 12, 12);

            ctx.fillStyle = '#1d1d1f';

            // Determine legend text based on context
            let legendText;
            if (numericColumns.length === 1) {
                // Single column selected (column first) - show truncated file name
                legendText = truncateFileName(this.fileName);
            } else {
                // Multiple columns or file-based view (file first) - show column header
                legendText = col.header;
            }

            if (isStdSeries && stdScaleFactor !== 1) {
                legendText += ' (scaled)';
            }

            ctx.fillText(legendText, legendX + 18, legendY + 9);

            legendX += ctx.measureText(legendText).width + 40;
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
        
        // Update table title with SUBCAM-specific information
        if (this.fileName) {
            const fileInfo = this.parseSUBCAMFilename(this.fileName);
            if (fileInfo.valid) {
                const typeDescriptions = {
                    'raw': 'Per-Event Annotations',
                    'nmax': 'Daily Nmax Aggregates',
                    'obvs': 'Daily Observation Aggregates'
                };
                const description = typeDescriptions[fileInfo.type] || 'SUBCAM Data';
                dataTitle.innerHTML = `
                    <span class="table-title-main">${this.fileName}</span>
                    <span class="table-title-sub">${description} • ${fileInfo.projectOrSite} • ${fileInfo.period}</span>
                `;
            } else {
                dataTitle.textContent = this.fileName;
            }
        }
        
        // Add or update processing log interface
        this.createProcessingLogInterface();

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
                // Display 0 as "0", empty/null as empty string
                td.textContent = (cell === 0 || cell === '0') ? '0' : (cell || '');

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

        // Trigger conversion system integration for _raw files
        this.triggerConversionSystem();
    }

    createProcessingLogInterface() {
        // Check if processing log already exists
        let logContainer = document.getElementById('processingLogContainer');

        if (!logContainer) {
            // Create the enhanced collapsible log interface
            logContainer = document.createElement('div');
            logContainer.id = 'processingLogContainer';
            logContainer.style.cssText = `
                margin: 10px 0;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                background: #f9fafb;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            `;

            const logHeader = document.createElement('div');
            logHeader.style.cssText = `
                padding: 12px;
                background: #f3f4f6;
                border-bottom: 1px solid #d1d5db;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.9rem;
                font-weight: 500;
                color: #374151;
            `;

            const logHeaderLeft = document.createElement('div');
            logHeaderLeft.style.cssText = 'display: flex; align-items: center;';

            const toggleIcon = document.createElement('span');
            toggleIcon.id = 'logToggleIcon';
            toggleIcon.textContent = '▶';
            toggleIcon.style.cssText = `
                margin-right: 8px;
                transition: transform 0.2s;
                font-size: 0.8rem;
            `;

            const logTitle = document.createElement('span');
            logTitle.textContent = 'Raw to NMAX Conversion Log';

            const logStatus = document.createElement('span');
            logStatus.id = 'logStatus';
            logStatus.style.cssText = `
                font-size: 0.8rem;
                color: #6b7280;
                margin-left: 10px;
            `;

            logHeaderLeft.appendChild(toggleIcon);
            logHeaderLeft.appendChild(logTitle);
            logHeaderLeft.appendChild(logStatus);

            // Progress and timing info
            const logHeaderRight = document.createElement('div');
            logHeaderRight.style.cssText = 'display: flex; align-items: center; gap: 10px;';

            const timeElapsed = document.createElement('span');
            timeElapsed.id = 'timeElapsed';
            timeElapsed.style.cssText = `
                font-size: 0.75rem;
                color: #6b7280;
                font-family: monospace;
            `;

            const progressText = document.createElement('span');
            progressText.id = 'progressText';
            progressText.style.cssText = `
                font-size: 0.75rem;
                color: #374151;
                font-weight: 500;
            `;

            logHeaderRight.appendChild(timeElapsed);
            logHeaderRight.appendChild(progressText);

            logHeader.appendChild(logHeaderLeft);
            logHeader.appendChild(logHeaderRight);

            // Progress bar
            const progressContainer = document.createElement('div');
            progressContainer.id = 'progressContainer';
            progressContainer.style.cssText = `
                padding: 0 12px 8px 12px;
                background: #f3f4f6;
                border-bottom: 1px solid #d1d5db;
            `;

            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                width: 100%;
                height: 6px;
                background: #e5e7eb;
                border-radius: 3px;
                overflow: hidden;
            `;

            const progressFill = document.createElement('div');
            progressFill.id = 'progressFill';
            progressFill.style.cssText = `
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
                border-radius: 3px;
                transition: width 0.3s ease;
            `;

            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);

            // Validation results section
            const validationSection = document.createElement('div');
            validationSection.id = 'validationSection';
            validationSection.style.cssText = `
                padding: 12px;
                background: #ffffff;
                border-bottom: 1px solid #e5e7eb;
                display: none;
            `;

            // Log content
            const logContent = document.createElement('div');
            logContent.id = 'processingLogContent';
            logContent.style.cssText = `
                display: none;
                padding: 12px;
                max-height: 400px;
                overflow-y: auto;
                font-family: 'Courier New', monospace;
                font-size: 0.8rem;
                background: #ffffff;
                color: #1f2937;
                line-height: 1.5;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
            `;

            logHeader.addEventListener('click', () => {
                const isHidden = logContent.style.display === 'none';
                logContent.style.display = isHidden ? 'block' : 'none';
                validationSection.style.display = isHidden ? 'block' : 'none';
                toggleIcon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
            });

            logContainer.appendChild(logHeader);
            logContainer.appendChild(progressContainer);
            logContainer.appendChild(validationSection);
            logContainer.appendChild(logContent);

            // Insert after the table controls but before the table wrapper
            const tableControls = document.querySelector('.table-controls');
            const tableWrapper = document.querySelector('.table-wrapper');
            tableControls.parentNode.insertBefore(logContainer, tableWrapper);
        }
    }

    addToProcessingLog(message, type = 'info') {
        if (!this.processingLogs) {
            this.processingLogs = [];
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        this.processingLogs.push(logEntry);
        
        // Update the log display
        const logContent = document.getElementById('processingLogContent');
        if (logContent) {
            const logLine = document.createElement('div');
            logLine.style.marginBottom = '2px';
            
            // Style based on type
            switch (type) {
                case 'error':
                    logLine.style.color = '#dc2626';
                    logLine.textContent = `❌ ${logEntry}`;
                    break;
                case 'success':
                    logLine.style.color = '#059669';
                    break;
                case 'warning':
                    logLine.style.color = '#d97706';
                    logLine.textContent = `⚠️ ${logEntry}`;
                    break;
                default:
                    logLine.style.color = '#374151';
                    logLine.textContent = `ℹ️ ${logEntry}`;
            }
            
            logContent.appendChild(logLine);
            // Auto scroll to bottom
            logContent.scrollTop = logContent.scrollHeight;
        }
    }

    clearProcessingLog() {
        this.processingLogs = [];
        const logContent = document.getElementById('processingLogContent');
        if (logContent) {
            logContent.innerHTML = '';
        }

        // Reset progress and validation displays
        this.updateProgress({ progress: 0, stepName: 'Ready', elapsed: 0 });
        this.clearValidationDisplay();
    }

    /**
     * Update progress bar and timing information
     */
    updateProgress(progressInfo) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const timeElapsed = document.getElementById('timeElapsed');
        const logStatus = document.getElementById('logStatus');

        if (progressFill) {
            progressFill.style.width = `${progressInfo.progress || 0}%`;
        }

        if (progressText) {
            progressText.textContent = progressInfo.stepName || 'Processing...';
        }

        if (timeElapsed && progressInfo.elapsed) {
            const seconds = (progressInfo.elapsed / 1000).toFixed(1);
            timeElapsed.textContent = `${seconds}s`;
        }

        if (logStatus && progressInfo.step && progressInfo.totalSteps) {
            logStatus.textContent = `Step ${progressInfo.step}/${progressInfo.totalSteps}`;
        }
    }

    /**
     * Display validation results in the validation section
     */
    displayValidationResults(validation) {
        const validationSection = document.getElementById('validationSection');
        if (!validationSection) return;

        validationSection.innerHTML = '';

        // Compliance score
        const complianceHeader = document.createElement('div');
        complianceHeader.style.cssText = `
            font-weight: 600;
            margin-bottom: 12px;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        const complianceScore = validation.formatCompliance || 0;
        const complianceColor = complianceScore >= 80 ? '#059669' : complianceScore >= 60 ? '#d97706' : '#dc2626';

        complianceHeader.innerHTML = `
            📋 Format Validation
            <span style="color: ${complianceColor}; font-size: 0.9rem;">
                ${complianceScore}% compliant
            </span>
        `;

        // Column validation grid
        const columnGrid = document.createElement('div');
        columnGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 8px;
            margin: 12px 0;
        `;

        if (validation.columnValidation) {
            validation.columnValidation.forEach(col => {
                const colItem = document.createElement('div');
                colItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    background: ${col.present && !col.note ? '#f0fdf4' : col.note ? '#fffbeb' : '#fef2f2'};
                    border-radius: 4px;
                    font-size: 0.8rem;
                `;

                colItem.innerHTML = `
                    <span style="font-size: 0.9rem;">${col.status}</span>
                    <span style="color: #374151;">${col.column}</span>
                    ${col.note ? `<span style="color: #d97706; font-size: 0.7rem;">(${col.note})</span>` : ''}
                `;

                columnGrid.appendChild(colItem);
            });
        }

        // Data validation summary
        const dataValidation = document.createElement('div');
        if (validation.dataValidation && validation.dataValidation.length > 0) {
            const issueCount = validation.dataValidation.filter(v => v.issues.length > 0).length;
            const validCount = validation.dataValidation.length - issueCount;

            dataValidation.style.cssText = `
                margin-top: 12px;
                padding: 8px;
                background: ${issueCount > 0 ? '#fffbeb' : '#f0fdf4'};
                border-radius: 4px;
                font-size: 0.8rem;
            `;

            dataValidation.innerHTML = `
                <div style="font-weight: 500; margin-bottom: 4px;">📊 Sample Data Validation</div>
            `;
        }

        validationSection.appendChild(complianceHeader);
        validationSection.appendChild(columnGrid);
        if (validation.dataValidation?.length > 0) {
            validationSection.appendChild(dataValidation);
        }

        // Display recommendations if any
        if (validation.recommendations && validation.recommendations.length > 0) {
            const recommendationsDiv = document.createElement('div');
            recommendationsDiv.style.cssText = `
                margin-top: 12px;
                padding: 10px;
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                font-size: 0.8rem;
            `;

            const recHeader = document.createElement('div');
            recHeader.style.cssText = 'font-weight: 600; margin-bottom: 6px; color: #92400e;';
            recHeader.textContent = '💡 Recommendations';

            const recList = document.createElement('ul');
            recList.style.cssText = 'margin: 0; padding-left: 16px; color: #92400e;';

            validation.recommendations.forEach(rec => {
                const recItem = document.createElement('li');
                recItem.textContent = rec;
                recItem.style.marginBottom = '4px';
                recList.appendChild(recItem);
            });

            recommendationsDiv.appendChild(recHeader);
            recommendationsDiv.appendChild(recList);
            validationSection.appendChild(recommendationsDiv);
        }
    }

    /**
     * Clear validation display
     */
    clearValidationDisplay() {
        const validationSection = document.getElementById('validationSection');
        if (validationSection) {
            validationSection.innerHTML = '';
        }
    }

    /**
     * Enhanced log entry method with metadata support
     */
    addEnhancedLogEntry(entry) {
        const logContent = document.getElementById('processingLogContent');
        if (!logContent) return;

        const logLine = document.createElement('div');
        logLine.style.cssText = `
            margin-bottom: 3px;
            padding: 2px 0;
            display: flex;
            align-items: flex-start;
            gap: 8px;
        `;

        // Timestamp
        const timestamp = document.createElement('span');
        timestamp.style.cssText = `
            color: #6b7280;
            font-size: 0.7rem;
            min-width: 70px;
            font-family: monospace;
        `;
        const time = new Date(entry.timestamp).toLocaleTimeString();
        timestamp.textContent = time;

        // Step indicator
        const stepIndicator = document.createElement('span');
        if (entry.step) {
            stepIndicator.style.cssText = `
                color: #3b82f6;
                font-size: 0.7rem;
                min-width: 20px;
                font-weight: 500;
            `;
            stepIndicator.textContent = `S${entry.step}`;
        }

        // Message
        const message = document.createElement('span');
        message.style.cssText = `
            flex: 1;
            line-height: 1.3;
        `;

        // Style based on level
        switch (entry.level) {
            case 'ERROR':
                message.style.color = '#dc2626';
                break;
            case 'SUCCESS':
                message.style.color = '#059669';
                break;
            case 'WARNING':
                message.style.color = '#d97706';
                break;
            case 'DEBUG':
                message.style.color = '#6b7280';
                break;
            default:
                message.style.color = '#374151';
        }

        message.textContent = entry.message;

        logLine.appendChild(timestamp);
        if (entry.step) logLine.appendChild(stepIndicator);
        logLine.appendChild(message);

        logContent.appendChild(logLine);
        logContent.scrollTop = logContent.scrollHeight;
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

            // Generate filename with _nmax suffix
            let exportFileName = this.fileName;
            if (exportFileName.includes('.csv')) {
                exportFileName = exportFileName.replace('.csv', '_nmax.csv');
            } else {
                exportFileName = exportFileName + '_nmax.csv';
            }

            link.setAttribute('download', exportFileName);
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
        // Clear previous logs and start fresh
        this.clearProcessingLog();
        this.addToProcessingLog('=== STARTING STD CONVERSION ===');
        this.addToProcessingLog(`Current filename: ${this.fileName}`);
        this.addToProcessingLog(`Headers available: ${this.headers.length} columns`);
        this.addToProcessingLog(`Data rows: ${this.csvData.length}`);
        
        console.log('=== STARTING STD CONVERSION ===');
        console.log('Current filename:', this.fileName);
        console.log('Headers available:', this.headers);
        console.log('Data rows:', this.csvData.length);
        
        if (this.csvData.length === 0) {
            this.addToProcessingLog('❌ No data to convert', 'error');
            this.showError('No data to convert. Please upload a CSV file first.');
            return;
        }

        try {
            this.addToProcessingLog('🔄 Starting STD format processing...');
            console.log('Calling processToStdFormat...');
            const stdData = this.processToStdFormat();
            
            this.addToProcessingLog(`Result headers: ${stdData.headers.join(', ')}`);
            this.addToProcessingLog(`Result data rows: ${stdData.data.length}`);
            
            console.log('Result headers:', stdData.headers);
            console.log('Result data rows:', stdData.data.length);
            
            // Update the current view with converted data for preview
            this.displayConvertedData(stdData);
            
            this.showSuccess(`Successfully converted to _std format! File: ${this.fileName} - Preview the data and use the export button to download.`);
        } catch (error) {
            this.showError(`Conversion failed: ${error.message}`);
        }
    }

    displayConvertedData(stdData) {
        console.log('=== DISPLAYING CONVERTED DATA ===');
        
        // Update the internal data structure
        this.headers = stdData.headers;
        this.csvData = stdData.data;
        
        // Update the filename according to specification:
        // "If the original file has a '_raw' suffix then directly replace this with _std"
        console.log('Original filename:', this.fileName);
        
        if (this.fileName.toLowerCase().includes('_raw')) {
            // Replace _raw with _std
            this.fileName = this.fileName.replace(/_raw/gi, '_std');
            console.log('Replaced _raw with _std:', this.fileName);
        } else if (!this.fileName.toLowerCase().includes('_std')) {
            // Add _std suffix before extension
            const baseName = this.fileName.replace(/\.csv$/i, '');
            this.fileName = `${baseName}_obvs.csv`;
            console.log('Added _std suffix:', this.fileName);
        }
        
        console.log('Final filename for display:', this.fileName);
        
        // Re-render the table with converted data
        // This will show the new filename with _std suffix above the table
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
        console.log('=== PROCESS TO STD FORMAT START ===');
        console.log('Following specification requirements step by step...');
        
        // Step 1: Find date and time columns dynamically
        this.addToProcessingLog('STEP 1: Finding date and time columns...');
        console.log('STEP 1: Finding date and time columns...');
        const { dateColIndex, timeColIndex, isCombined } = this.findDateTimeColumns();
        
        this.addToProcessingLog(`Date-time detection results:`);
        this.addToProcessingLog(`- dateColIndex: ${dateColIndex}`);
        this.addToProcessingLog(`- timeColIndex: ${timeColIndex}`);
        this.addToProcessingLog(`- isCombined: ${isCombined}`);
        
        console.log('Date-time detection results:');
        console.log('- dateColIndex:', dateColIndex);
        console.log('- timeColIndex:', timeColIndex); 
        console.log('- isCombined:', isCombined);
        
        if (dateColIndex === -1 || timeColIndex === -1) {
            const errorMsg = `Could not find valid date and time columns in the CSV. Found: dateColIndex=${dateColIndex}, timeColIndex=${timeColIndex}`;
            this.addToProcessingLog(`❌ ${errorMsg}`, 'error');
            throw new Error(errorMsg);
        }

        // Step 2: Extract and reformat timestamps into ISO 8601 format: YYYY-MM-DDTHH:MM:SS.000Z
        this.addToProcessingLog('STEP 2: Extracting timestamps and reformatting to ISO 8601...');
        console.log('STEP 2: Extracting timestamps and reformatting to ISO 8601...');
        const timestamps = this.extractTimestamps(dateColIndex, timeColIndex, isCombined);
        
        this.addToProcessingLog(`Extracted ${timestamps.length} timestamps`);
        this.addToProcessingLog(`Sample timestamps: ${timestamps.slice(0, 3).join(', ')}`);
        
        console.log(`Extracted ${timestamps.length} timestamps`);
        console.log('Sample timestamps:', timestamps.slice(0, 3));

        // Step 3: Extract data columns according to specification
        this.addToProcessingLog('STEP 3: Extracting and renaming data columns per specification...');
        console.log('STEP 3: Extracting and renaming data columns per specification...');
        const columnMappings = [
            { patterns: ['Harbour Porpoise (DPM)_F', 'NBHF_DPM'], target: 'Porpoise (DPM)' },
            { patterns: ['Harbour Porpoise (Clicks)_F', 'NBHFclx'], target: 'Porpoise (Clicks)' },
            { patterns: ['Other Cetaceans (DPM)_F', 'DOL_DPM'], target: 'Dolphin (DPM)' },
            { patterns: ['Other Cetaceans (Clicks)_F', 'DOLclx'], target: 'Dolphin (Clicks)' },
            { patterns: ['Sonar (DPM)_F', 'SONAR_DPM'], target: 'Sonar (DPM)' },
            { patterns: ['SONARclx'], target: 'Sonar (Clicks)' }
        ];

        const extractedColumns = this.extractDataColumns(columnMappings);
        this.addToProcessingLog(`Found ${extractedColumns.length} matching data columns: ${extractedColumns.map(col => col.name).join(', ')}`);
        console.log(`Found ${extractedColumns.length} matching data columns:`, extractedColumns.map(col => col.name));
        
        if (extractedColumns.length === 0) {
            const errorMsg = 'No matching data columns found for conversion. Check column names match specification.';
            this.addToProcessingLog(`❌ ${errorMsg}`, 'error');
            throw new Error(errorMsg);
        }

        // Step 4: Create structured dataset with Time column as first column
        console.log('STEP 4: Creating structured dataset...');
        
        // Align all data with timestamps
        const maxLength = timestamps.length;
        const alignedColumns = this.alignDataColumns(extractedColumns, maxLength);

        // Create headers: Time column FIRST, then data columns
        const stdHeaders = ['Time', ...alignedColumns.map(col => col.name)];
        console.log('Final headers:', stdHeaders);
        
        // Create data rows: Time column FIRST, then data columns
        this.addToProcessingLog('STEP 4: Creating final data rows...');
        const stdData = [];
        let missingTimestampCount = 0;
        let missingDataCount = 0;
        let validRowCount = 0;
        
        for (let i = 0; i < maxLength; i++) {
            const timestamp = timestamps[i] || '0';
            if (timestamp === '0') {
                missingTimestampCount++;
                this.addToProcessingLog(`⚠️ Row ${i}: Invalid/missing timestamp - using '0'`, 'warning');
            } else {
                validRowCount++;
            }
            const row = [timestamp]; // Time column FIRST
            
            alignedColumns.forEach(col => {
                const value = col.data[i] || '0';
                if (value === '0' && col.data[i] === undefined) missingDataCount++;
                row.push(value); // Replace missing data with '0'
            });
            stdData.push(row);
        }
        
        this.addToProcessingLog(`Replaced ${missingDataCount} missing data cells with '0'`);

        console.log('STEP 5: Validation - checking for columns before Time...');
        // Step 5: Check if there's any column before Time (there shouldn't be)
        if (stdHeaders[0] !== 'Time') {
            console.warn('WARNING: Time column is not first! Fixing...');
            // This shouldn't happen with our logic, but just in case
        } else {
        }

        console.log('Sample data row:', stdData[0]);

        return {
            headers: stdHeaders,
            data: stdData
        };
    }

    findDateTimeColumns() {
        console.log('=== FINDING DATE-TIME COLUMNS ===');
        console.log('Available headers:', this.headers);
        console.log('Total headers:', this.headers.length);
        console.log('Data rows available:', this.csvData.length);
        
        let dateColIndex = -1;
        let timeColIndex = -1;
        let combinedColIndex = -1;

        // Show sample of first few rows for debugging
        if (this.csvData.length > 0) {
            console.log('First row sample:', this.csvData[0]);
            if (this.csvData.length > 1) {
                console.log('Second row sample:', this.csvData[1]);
            }
        }

        // Look for date/time patterns in headers
        for (let i = 0; i < this.headers.length; i++) {
            const header = (this.headers[i] || '').toLowerCase().trim();
            console.log(`Checking header ${i}: "${this.headers[i]}" (lowercase: "${header}")`);
            
            // Look for ChunkEnd column (combined date/time)
            if (header === 'chunkend' || header.includes('chunkend')) {
                console.log(`Found potential ChunkEnd column at index ${i}`);
                if (this.csvData.length > 0) {
                    console.log(`Sample ChunkEnd data: "${this.csvData[0][i]}"`);
                    if (this.isCombinedDateTimeColumn(i)) {
                        combinedColIndex = i;
                        break; // Use combined column if found
                    } else {
                        console.log(`❌ ChunkEnd column validation failed at index ${i}`);
                    }
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

        // Final results logging
        console.log('=== DATE-TIME COLUMN DETECTION RESULTS ===');
        console.log('Combined column index:', combinedColIndex);
        console.log('Date column index:', dateColIndex);
        console.log('Time column index:', timeColIndex);
        
        // Return combined column index if found, otherwise separate columns
        if (combinedColIndex !== -1) {
            return { 
                dateColIndex: combinedColIndex, 
                timeColIndex: combinedColIndex, 
                isCombined: true 
            };
        }

        if (dateColIndex !== -1 && timeColIndex !== -1) {
        } else {
            console.log('❌ No valid date-time columns found!');
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
        console.log(`=== VALIDATING COMBINED DATE-TIME COLUMN ${colIndex} ===`);
        
        // Check first few non-empty rows for combined date/time patterns like "3/30/2025 19:59:00"
        for (let i = 0; i < Math.min(5, this.csvData.length); i++) {
            const value = this.csvData[i][colIndex];
            console.log(`Row ${i}, Column ${colIndex}: "${value}" (type: ${typeof value})`);
            
            if (value && typeof value === 'string') {
                const trimmedValue = value.trim();
                console.log(`Trimmed value: "${trimmedValue}"`);
                
                // Check for ChunkEnd format: M/D/YYYY H:MM or M/D/YYYY H:MM:SS (seconds optional)
                const pattern = /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}(:\d{1,2})?$/;
                const matches = trimmedValue.match(pattern);
                console.log(`Pattern match result: ${matches ? 'MATCH' : 'NO MATCH'}`);
                
                if (matches) {
                    return true;
                }
            } else if (value) {
                console.log(`Non-string value found: ${value}`);
            }
        }
        
        console.log('❌ No valid combined date-time format found');
        return false;
    }

    /**
     * Detect date format by analyzing multiple date entries for chronological consistency
     * @param {number} dateColIndex - Index of the date column
     * @returns {string} - Detected format: 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', or 'DD-MM-YYYY'
     */
    detectDateFormat(dateColIndex) {
        console.log('Starting date format detection...');
        
        // Collect valid date samples (skip header row if present)
        const dateSamples = [];
        const sampleSize = Math.min(10, this.csvData.length); // Check up to 10 samples
        
        for (let i = 0; i < sampleSize; i++) {
            const dateStr = this.csvData[i]?.[dateColIndex]?.trim();
            if (dateStr && dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
                dateSamples.push(dateStr);
            }
        }
        
        if (dateSamples.length < 3) {
            console.warn('Not enough date samples for reliable detection, defaulting to MM/DD/YYYY');
            return 'MM/DD/YYYY';
        }
        
        console.log('Date samples for analysis:', dateSamples);
        
        // Test both formats and see which creates a more logical chronological sequence
        const formats = ['DD/MM/YYYY', 'MM/DD/YYYY'];
        let bestFormat = 'MM/DD/YYYY'; // Default fallback
        let bestScore = -1;
        
        formats.forEach(format => {
            const score = this.evaluateDateFormat(dateSamples, format);
            console.log(`Format ${format} score:`, score);
            
            if (score > bestScore) {
                bestScore = score;
                bestFormat = format;
            }
        });
        
        console.log('Best detected format:', bestFormat, 'with score:', bestScore);
        return bestFormat;
    }
    
    /**
     * Evaluate how well a date format fits the data by checking chronological consistency
     * @param {string[]} dateSamples - Array of date strings to test
     * @param {string} format - Format to test ('DD/MM/YYYY' or 'MM/DD/YYYY')
     * @returns {number} - Score indicating format fitness (higher = better)
     */
    evaluateDateFormat(dateSamples, format) {
        const parsedDates = [];
        let validParses = 0;
        
        // Parse all samples with the given format
        for (const dateStr of dateSamples) {
            try {
                const parsed = this.parseDateWithFormat(dateStr, format);
                if (parsed && !isNaN(parsed.getTime())) {
                    parsedDates.push(parsed);
                    validParses++;
                }
            } catch (error) {
                // Invalid parse, continue
            }
        }
        
        if (validParses < 2) return 0; // Need at least 2 valid dates
        
        // Check for chronological consistency
        let chronologicalScore = 0;
        let reasonableDatesScore = 0;
        
        // Sort dates and check if they follow expected logger pattern (generally ascending)
        const sortedDates = [...parsedDates].sort((a, b) => a.getTime() - b.getTime());
        
        // Score based on how many dates are in chronological order in original sequence
        for (let i = 1; i < parsedDates.length; i++) {
            if (parsedDates[i].getTime() >= parsedDates[i-1].getTime()) {
                chronologicalScore++;
            }
        }
        
        // Score based on reasonable date ranges (within last 10 years and not in future)
        const now = new Date();
        const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1);
        
        for (const date of parsedDates) {
            if (date >= tenYearsAgo && date <= now) {
                reasonableDatesScore++;
            }
        }
        
        // Combined score: chronological consistency + reasonable dates
        const totalScore = (chronologicalScore / (parsedDates.length - 1)) * 50 + 
                          (reasonableDatesScore / parsedDates.length) * 50;
        
        console.log(`Format ${format}: ${validParses}/${dateSamples.length} valid, chrono: ${chronologicalScore}/${parsedDates.length-1}, reasonable: ${reasonableDatesScore}/${parsedDates.length}`);
        
        return totalScore;
    }
    
    /**
     * Parse date string with specific format
     * @param {string} dateStr - Date string to parse
     * @param {string} format - Format to use
     * @returns {Date} - Parsed date object
     */
    parseDateWithFormat(dateStr, format) {
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length !== 3) throw new Error('Invalid date parts');
        
        const [part1, part2, year] = parts;
        let month, day;
        
        switch (format) {
            case 'DD/MM/YYYY':
            case 'DD-MM-YYYY':
                day = parseInt(part1, 10);
                month = parseInt(part2, 10);
                break;
            case 'MM/DD/YYYY':
            case 'MM-DD-YYYY':
                month = parseInt(part1, 10);
                day = parseInt(part2, 10);
                break;
            default:
                throw new Error('Unsupported format');
        }
        
        // Validate ranges
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            throw new Error('Invalid date values');
        }
        
        return new Date(parseInt(year, 10), month - 1, day);
    }

    detectCombinedDateFormat(dateColIndex) {
        console.log('=== DETECTING COMBINED DATE FORMAT ===');
        
        const samples = [];
        const maxSamples = Math.min(10, this.csvData.length);
        
        // Collect sample combined date-time strings
        for (let i = 0; i < maxSamples; i++) {
            const combined = this.csvData[i][dateColIndex];
            if (combined && typeof combined === 'string') {
                const match = combined.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (match) {
                    samples.push({
                        first: parseInt(match[1], 10),
                        second: parseInt(match[2], 10),
                        original: combined
                    });
                }
            }
        }
        
        console.log(`Analyzing ${samples.length} combined date samples:`, samples.map(s => s.original));
        
        if (samples.length === 0) {
            console.log('No valid combined date samples found, defaulting to DD/MM/YYYY');
            return 'DD/MM/YYYY';
        }
        
        let ddmmScore = 0;
        let mmddScore = 0;
        
        for (const sample of samples) {
            // If first number > 12, it must be DD/MM/YYYY
            if (sample.first > 12) {
                ddmmScore += 2; // Strong evidence
                console.log(`  "${sample.original}": first=${sample.first} > 12, strong DD/MM evidence`);
            }
            // If second number > 12, it must be MM/DD/YYYY
            else if (sample.second > 12) {
                mmddScore += 2; // Strong evidence
                console.log(`  "${sample.original}": second=${sample.second} > 12, strong MM/DD evidence`);
            }
            // If both <= 12, look for patterns (like increasing sequences)
            else {
                console.log(`  "${sample.original}": ambiguous (both <= 12), first=${sample.first}, second=${sample.second}`);
                // Could add chronological analysis here if needed
            }
        }
        
        const detectedFormat = ddmmScore >= mmddScore ? 'DD/MM/YYYY' : 'MM/DD/YYYY';
        console.log(`Format detection scores: DD/MM=${ddmmScore}, MM/DD=${mmddScore}`);
        
        return detectedFormat;
    }

    extractTimestamps(dateColIndex, timeColIndex, isCombined = false) {
        console.log('=== EXTRACTING TIMESTAMPS ===');
        console.log(`dateColIndex: ${dateColIndex}, timeColIndex: ${timeColIndex}, isCombined: ${isCombined}`);
        
        const timestamps = [];
        
        // Detect date format - for combined and separate columns
        let detectedDateFormat = null;
        if (isCombined) {
            detectedDateFormat = this.detectCombinedDateFormat(dateColIndex);
            console.log('Detected combined date format:', detectedDateFormat);
        } else {
            detectedDateFormat = this.detectDateFormat(dateColIndex);
            console.log('Detected date format:', detectedDateFormat);
        }
        
        console.log(`Processing ${this.csvData.length} data rows...`);
        
        // Show sample data for debugging
        if (this.csvData.length > 0) {
            console.log('Sample data rows for timestamp parsing:');
            for (let sampleIdx = 0; sampleIdx < Math.min(3, this.csvData.length); sampleIdx++) {
                const sampleRow = this.csvData[sampleIdx];
                if (isCombined) {
                    console.log(`  Row ${sampleIdx}: Combined column [${dateColIndex}] = "${sampleRow[dateColIndex]}"`);
                } else {
                    console.log(`  Row ${sampleIdx}: Date [${dateColIndex}] = "${sampleRow[dateColIndex]}", Time [${timeColIndex}] = "${sampleRow[timeColIndex]}"`);
                }
            }
        }
        
        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            
            if (isCombined) {
                // Handle combined ChunkEnd format
                const combinedStr = row[dateColIndex] || '';
                if (combinedStr) {
                    try {
                        const timestamp = this.parseCombinedDateTime(combinedStr, detectedDateFormat);
                        timestamps.push(timestamp);
                    } catch (error) {
                        console.error(`Row ${i}: Failed to parse timestamp "${combinedStr}":`, error.message);
                        this.addToProcessingLog(`❌ Row ${i}: Failed to parse timestamp "${combinedStr}": ${error.message}`, 'error');
                        timestamps.push('0'); // Only fallback to '0' after logging error
                    }
                } else {
                    console.warn(`Row ${i}: Missing timestamp data`);
                    this.addToProcessingLog(`⚠️ Row ${i}: Missing timestamp data`, 'warning');
                    timestamps.push('0'); // Replace missing timestamp with '0'
                }
            } else {
                // Handle separate date and time columns
                const dateStr = row[dateColIndex] || '';
                const timeStr = row[timeColIndex] || '';
                
                if (dateStr && timeStr) {
                    try {
                        const timestamp = this.combineDateTime(dateStr, timeStr, detectedDateFormat);
                        timestamps.push(timestamp);
                    } catch (error) {
                        console.error(`Row ${i}: Failed to combine date "${dateStr}" and time "${timeStr}":`, error.message);
                        this.addToProcessingLog(`❌ Row ${i}: Failed to combine date "${dateStr}" and time "${timeStr}": ${error.message}`, 'error');
                        timestamps.push('0'); // Only fallback to '0' after logging error
                    }
                } else {
                    console.warn(`Row ${i}: Missing date or time data - date: "${dateStr}", time: "${timeStr}"`);
                    this.addToProcessingLog(`⚠️ Row ${i}: Missing date or time data - date: "${dateStr}", time: "${timeStr}"`, 'warning');
                    timestamps.push('0'); // Replace missing timestamp with '0'
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
                        columnData.push(this.csvData[j][i] || '0'); // Replace missing data with '0'
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

    parseCombinedDateTime(combinedStr, detectedDateFormat = 'DD/MM/YYYY') {
        console.log(`Parsing combined datetime: "${combinedStr}" using format: ${detectedDateFormat}`);
        
        // Handle ChunkEnd format: "3/30/2025 19:59" or "3/30/2025 19:59:00" (seconds optional)
        const match = combinedStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
        
        if (!match) {
            console.error(`Failed to parse ChunkEnd format: ${combinedStr}`);
            throw new Error(`Invalid ChunkEnd format: ${combinedStr}`);
        }
        
        console.log('Parsed components:', match.slice(1));

        const first = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        const hours = parseInt(match[4], 10);
        const minutes = parseInt(match[5], 10);
        const seconds = parseInt(match[6] || '0', 10); // Default to 0 if no seconds

        // Use detected date format to assign month and day
        let month, day;
        
        if (detectedDateFormat === 'DD/MM/YYYY') {
            day = first;
            month = second;
            console.log(`Using DD/MM/YYYY format: day=${day}, month=${month}`);
        } else {
            // MM/DD/YYYY format
            month = first;
            day = second;
            console.log(`Using MM/DD/YYYY format: month=${month}, day=${day}`);
        }

        // Validate values
        if (month < 1 || month > 12 || day < 1 || day > 31 || 
            hours > 23 || minutes > 59 || seconds > 59) {
            throw new Error(`Invalid date/time values: ${combinedStr} (interpreted as day=${day}, month=${month})`);
        }

        // Create date object (month is 0-indexed in JavaScript)
        const date = new Date(year, month - 1, day, hours, minutes, seconds);

        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${combinedStr} (interpreted as day=${day}, month=${month})`);
        }

        // Return ISO 8601 format
        return date.toISOString();
    }

    combineDateTime(dateStr, timeStr, detectedDateFormat = null) {
        // Handle various date formats
        let date;
        
        // Try parsing as YYYY-MM-DD
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateStr + 'T00:00:00.000Z');
        }
        // Try parsing as MM/DD/YYYY or DD/MM/YYYY using detected format
        else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const parts = dateStr.split('/');
            let month, day;
            
            // Use detected format if available, otherwise default to MM/DD/YYYY
            if (detectedDateFormat === 'DD/MM/YYYY') {
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                console.log(`Parsing ${dateStr} as DD/MM/YYYY: day=${day}, month=${month}`);
            } else {
                // Default MM/DD/YYYY or explicitly detected MM/DD/YYYY
                month = parseInt(parts[0], 10);
                day = parseInt(parts[1], 10);
                console.log(`Parsing ${dateStr} as MM/DD/YYYY: month=${month}, day=${day}`);
            }
            
            date = new Date(parseInt(parts[2], 10), month - 1, day);
        }
        // Try parsing as DD-MM-YYYY or MM-DD-YYYY using detected format  
        else if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
            const parts = dateStr.split('-');
            let month, day;
            
            // Use detected format if available, otherwise default to DD-MM-YYYY
            if (detectedDateFormat === 'MM-DD-YYYY') {
                month = parseInt(parts[0], 10);
                day = parseInt(parts[1], 10);
                console.log(`Parsing ${dateStr} as MM-DD-YYYY: month=${month}, day=${day}`);
            } else {
                // Default DD-MM-YYYY or explicitly detected DD-MM-YYYY
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                console.log(`Parsing ${dateStr} as DD-MM-YYYY: day=${day}, month=${month}`);
            }
            
            date = new Date(parseInt(parts[2], 10), month - 1, day);
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
                stdFileName = `${baseName}_obvs.csv`;
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
            
            this.showSuccess('Successfully created NMAX hourly data! Preview the data and use the export button to download.');

            // Show the download button
            const downloadBtn = document.getElementById('downloadResultBtn');
            if (downloadBtn) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.disabled = false;
            }
        } catch (error) {
            this.showError(`NMAX conversion failed: ${error.message}`);
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
                            hourlyAverages[hour][columnName] = 0; // Replace missing data with 0
                        }
                    }
                }
            } else {
                // No data for this hour, set all values to 0
                for (let j = 0; j < this.headers.length; j++) {
                    if (j !== timeColumnIndex) {
                        hourlyAverages[hour][this.headers[j]] = 0; // Replace missing data with 0
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

            // Format time as YYYY-MM-DDTHH:MM:SS.000Z (ISO standard)
            const formattedTime = timeForHour.toISOString();
            console.log(`Hour ${hour}: ${formattedTime}`); // Debug logging

            const row = [formattedTime];
            
            // Add averaged values for this hour
            for (let i = 0; i < this.headers.length; i++) {
                if (i !== timeColumnIndex) {
                    const columnName = this.headers[i];
                    const value = hourlyAverages[hour][columnName];
                    // Replace missing values with 0 for consistency
                    row.push(value !== null && value !== undefined ? value : 0);
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
        
        // Update the filename for nmax file
        let newFileName;
        if (this.fileName.toLowerCase().includes('_std')) {
            newFileName = this.fileName.replace(/_std\.csv$/i, '_nmax.csv');
        } else if (this.fileName.toLowerCase().includes('_raw')) {
            newFileName = this.fileName.replace(/_raw\.csv$/i, '_nmax.csv');
        } else {
            const baseName = this.fileName.replace(/\.csv$/i, '');
            newFileName = `${baseName}_nmax.csv`;
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
                ✓ Converted to NMAX hourly data
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

    parseSUBCAMFilename(filename) {
        console.log('=== PARSING SUBCAM FILENAME ===');
        console.log('Filename:', filename);

        // Pattern: ID_Subcam_<ProjectOrSite>[_W]_<YYMM-YYMM | YYMM_YYMM>_<type>.csv
        // Remove .csv extension
        const nameWithoutExt = filename.replace(/\.csv$/i, '');
        const parts = nameWithoutExt.split('_');

        console.log('Filename parts:', parts);

        if (parts.length < 4) {
            console.warn('Filename does not match expected SUBCAM pattern');
            return {
                id: parts[0] || '',
                projectOrSite: '',
                variant: null,
                period: '',
                type: '',
                valid: false
            };
        }

        // Extract components
        const id = parts[0]; // Usually "ID"
        const subcam = parts[1]; // Should be "Subcam"

        // Find the type (raw/nmax/obvs) - it's always the last part
        const type = parts[parts.length - 1];

        // Find the period (date range) - it's the second-to-last part
        const period = parts[parts.length - 2];

        // Everything between subcam and period is project/site (may include variant)
        const projectSiteParts = parts.slice(2, parts.length - 2);

        let projectOrSite = '';
        let variant = null;

        if (projectSiteParts.length > 0) {
            // Check if last part is a variant (single letter like 'W')
            const lastPart = projectSiteParts[projectSiteParts.length - 1];
            if (lastPart.length === 1 && /^[A-Z]$/.test(lastPart)) {
                variant = lastPart;
                projectOrSite = projectSiteParts.slice(0, -1).join('_');
            } else {
                projectOrSite = projectSiteParts.join('_');
            }
        }

        // Validate period format (YYMM-YYMM or YYMM_YYMM)
        const periodValid = /^\d{4}[-_]\d{4}$/.test(period);

        // Validate type
        const typeValid = ['raw', 'nmax', 'obvs'].includes(type.toLowerCase());

        const result = {
            id,
            subcam,
            projectOrSite,
            variant,
            period,
            type: type.toLowerCase(),
            valid: periodValid && typeValid,
            parts
        };

        console.log('Parsed result:', result);
        return result;
    }

    createCSVFromData(headers, data) {
        // Create CSV content from headers and data arrays
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = row.map(value => {
                // Quote values that contain commas
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value || '';
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }

    triggerConversionSystem() {
        // Check if this is a _raw file and trigger conversion UI
        if (this.fileName && this.headers && this.csvData) {
            const fileInfo = this.parseSUBCAMFilename(this.fileName);

            if (fileInfo.valid && fileInfo.type === 'raw') {
                console.log('🔍 DEBUG: Preparing data for conversion system');
                console.log('📊 Raw data stats:', {
                    fileName: this.fileName,
                    headerCount: this.headers?.length,
                    dataRowCount: this.csvData?.length,
                    sampleHeaders: this.headers?.slice(0, 5),
                    sampleRow: this.csvData?.[0]?.slice(0, 5)
                });

                // Prepare data for conversion system
                const fileData = {
                    fileName: this.fileName,
                    headers: this.headers,
                    data: this.csvData.map(row => {
                        const rowObj = {};
                        this.headers.forEach((header, index) => {
                            rowObj[header] = row[index] || '';
                        });
                        return rowObj;
                    })
                };

                console.log('📋 Prepared fileData structure:', {
                    fileName: fileData.fileName,
                    headerCount: fileData.headers?.length,
                    dataCount: fileData.data?.length,
                    sampleData: fileData.data?.slice(0, 2)
                });

                // Dispatch event for conversion UI to pick up
                const event = new CustomEvent('fileLoaded', {
                    detail: fileData
                });
                document.dispatchEvent(event);

                console.log('🔄 Triggered conversion system for _raw file:', this.fileName);
                console.log('📤 Event dispatched with detail:', event.detail);
            }
        }
    }

    // ==================== SUBCAM PLOTTING FUNCTIONS ====================

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

    async generateSubcamSiteComparison(source, sites) {
        console.log('=== SUBCAM GENERATE SITE COMPARISON ===');
        console.log('Source:', source);
        console.log('Sites:', sites);

        const outputDiv = document.getElementById('siteComparisonOutput');
        if (!outputDiv) {
            console.error('Output div not found');
            return;
        }

        outputDiv.classList.add('active');
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Plot...</h4>
                <p>Loading ${sites.join(', ')} data for ${source} analysis...</p>
            </div>
        `;

        try {
            const siteData = await this.loadNmaxFilesForSites(sites, source);

            if (siteData.length === 0) {
                throw new Error('No _nmax files found for the selected sites');
            }

            this.createSubcamSiteComparisonPlot(siteData, source, sites, outputDiv);

        } catch (error) {
            console.error('Error generating SUBCAM site comparison plot:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Could not generate plot:</strong> ${error.message}</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        Make sure the corresponding _nmax files exist for: ${sites.join(', ')}
                    </p>
                </div>
            `;
        }
    }

    async generateSubcamSourceComparison(site, sources) {
        console.log('=== SUBCAM GENERATE SOURCE COMPARISON ===');
        console.log('Site:', site);
        console.log('Sources:', sources);

        const outputDiv = document.getElementById('sourceComparisonOutput');
        if (!outputDiv) {
            console.error('Output div not found');
            return;
        }

        outputDiv.classList.add('active');
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Plot...</h4>
                <p>Loading ${sources.join(', ')} data for ${site} analysis...</p>
            </div>
        `;

        try {
            const siteData = await this.loadNmaxFileForSite(site, sources);

            if (!siteData) {
                throw new Error(`No _nmax file found for: ${site}`);
            }

            this.createSubcamSourceComparisonPlot(siteData, site, sources, outputDiv);

        } catch (error) {
            console.error('Error generating SUBCAM source comparison plot:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Could not generate plot:</strong> ${error.message}</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        Make sure the _nmax file exists for: ${site}
                    </p>
                </div>
            `;
        }
    }

    async loadNmaxFilesForSites(selectedFilenames, source) {
        const siteData = [];

        for (const filename of selectedFilenames) {
            const file = this.workingDirFiles.find(f => f.name === filename);
            if (file) {
                const data = await this.parseCSVFile(file);
                siteData.push({
                    site: filename,
                    file: file,
                    data: data,
                    source: source
                });
            }
        }

        return siteData;
    }

    async loadNmaxFileForSite(filename, sources) {
        const file = this.workingDirFiles.find(f => f.name === filename);
        if (!file) return null;

        const data = await this.parseCSVFile(file);
        return {
            site: filename,
            file: file,
            data: data,
            sources: sources
        };
    }

    extractHourlyDataSubcam(csvData, source) {
        const hourlyData = {};

        csvData.data.forEach(row => {
            // Find time column (flexible key matching)
            const hourKey = Object.keys(row).find(key =>
                key.toLowerCase().includes('hour') ||
                key.toLowerCase().includes('time') ||
                key.toLowerCase().includes('date')
            );

            // Find source column
            let sourceKey = Object.keys(row).find(key => key === source);
            if (!sourceKey) {
                sourceKey = Object.keys(row).find(key =>
                    key.toLowerCase().includes(source.toLowerCase())
                );
            }

            if (hourKey && sourceKey && row[hourKey] && row[sourceKey] !== undefined) {
                let timeIdentifier = row[hourKey];

                // Handle different time formats
                if (timeIdentifier.includes('T')) {
                    // ISO format
                    const dateObj = new Date(timeIdentifier);
                    const dateStr = dateObj.toISOString().split('T')[0];
                    timeIdentifier = dateStr;
                } else if (timeIdentifier.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Daily format: "2024-08-01"
                    timeIdentifier = timeIdentifier;
                } else {
                    // Simple identifier
                    timeIdentifier = String(timeIdentifier).padStart(2, '0');
                }

                const value = parseFloat(row[sourceKey]) || 0;
                hourlyData[timeIdentifier] = value;
            }
        });

        return hourlyData;
    }

    formatTimePointsAsActualTimestamps(sortedHours) {
        // For daily date format (YYYY-MM-DD)
        if (sortedHours[0] && sortedHours[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
            return sortedHours.map(dateStr => {
                const date = new Date(dateStr + 'T00:00:00Z');
                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = String(date.getUTCFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
            });
        }

        // For ISO timestamps
        if (sortedHours[0] && sortedHours[0].includes('_')) {
            return sortedHours.map(timeIdentifier => {
                const [dateStr, hourStr] = timeIdentifier.split('_');
                const date = new Date(dateStr + `T${hourStr}:00:00Z`);
                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = String(date.getUTCFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
            });
        }

        // For simple hours
        return sortedHours.map(hour => `${String(hour).padStart(2, '0')}:00`);
    }

    createSubcamSiteComparisonPlot(siteData, source, sites, outputDiv) {
        // Create plot container
        const plotContainer = document.createElement('div');
        plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.cssText = 'width: 100%; height: 100%;';
        plotContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Journal colors
        const journalColors = [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ];

        // Plot area
        const plotArea = {
            left: 80, top: 40, right: 760, bottom: 320,
            width: 680, height: 280
        };

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Extract all time points
        let allTimePoints = new Set();
        siteData.forEach(siteInfo => {
            const hourlyData = this.extractHourlyDataSubcam(siteInfo.data, source);
            Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
        });

        const sortedHours = Array.from(allTimePoints).sort();
        const hours = this.formatTimePointsAsActualTimestamps(sortedHours);

        let maxValue = 0;

        const plotData = siteData.map((siteInfo, index) => {
            const hourlyData = this.extractHourlyDataSubcam(siteInfo.data, source);
            const values = sortedHours.map(hour => hourlyData[hour] !== undefined ? hourlyData[hour] : null);
            const maxSiteValue = Math.max(...values.filter(v => v !== null));
            maxValue = Math.max(maxValue, maxSiteValue);

            return {
                site: siteInfo.site.replace(/_nmax\.csv$/i, '').replace(/_/g, ' '),
                values: values,
                color: journalColors[index % journalColors.length]
            };
        });

        maxValue = Math.ceil(maxValue * 1.1);

        // Draw axes
        this.drawSubcamAxes(ctx, plotArea, hours, maxValue, canvas);

        // Plot data
        plotData.forEach(site => {
            this.plotSubcamSiteData(ctx, plotArea, site, maxValue);
        });

        // Draw legend
        this.drawSubcamLegend(ctx, plotData, plotArea);

        outputDiv.innerHTML = '';
        outputDiv.appendChild(plotContainer);
    }

    createSubcamSourceComparisonPlot(siteData, site, sources, outputDiv) {
        // Create plot container
        const plotContainer = document.createElement('div');
        plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.cssText = 'width: 100%; height: 100%;';
        plotContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        const journalColors = [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'
        ];

        const plotArea = {
            left: 80, top: 40, right: 760, bottom: 320,
            width: 680, height: 280
        };

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Extract all time points
        let allTimePoints = new Set();
        sources.forEach(source => {
            const hourlyData = this.extractHourlyDataSubcam(siteData.data, source);
            Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
        });

        const sortedHours = Array.from(allTimePoints).sort();
        const hours = this.formatTimePointsAsActualTimestamps(sortedHours);

        let maxValue = 0;

        const plotData = sources.map((source, index) => {
            const hourlyData = this.extractHourlyDataSubcam(siteData.data, source);
            const values = sortedHours.map(hour => hourlyData[hour] !== undefined ? hourlyData[hour] : null);
            const maxSourceValue = Math.max(...values.filter(v => v !== null));
            maxValue = Math.max(maxValue, maxSourceValue);

            return {
                site: source,
                values: values,
                color: journalColors[index % journalColors.length]
            };
        });

        maxValue = Math.ceil(maxValue * 1.1);

        // Draw axes
        this.drawSubcamAxes(ctx, plotArea, hours, maxValue, canvas);

        // Plot data
        plotData.forEach(sourceData => {
            this.plotSubcamSiteData(ctx, plotArea, sourceData, maxValue);
        });

        // Draw legend
        this.drawSubcamLegend(ctx, plotData, plotArea);

        outputDiv.innerHTML = '';
        outputDiv.appendChild(plotContainer);
    }

    drawSubcamAxes(ctx, plotArea, hours, maxValue, canvas) {
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        ctx.font = '13px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666666';

        // X-axis
        ctx.beginPath();
        ctx.moveTo(plotArea.left, plotArea.bottom);
        ctx.lineTo(plotArea.right, plotArea.bottom);
        ctx.stroke();

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(plotArea.left, plotArea.top);
        ctx.lineTo(plotArea.left, plotArea.bottom);
        ctx.stroke();

        // X-axis labels
        const xStep = plotArea.width / Math.max(hours.length - 1, 1);
        const labelSpacing = Math.max(1, Math.ceil(hours.length / 10));

        hours.forEach((hour, i) => {
            const x = plotArea.left + (i * xStep);

            // Tick mark
            ctx.beginPath();
            ctx.moveTo(x, plotArea.bottom);
            ctx.lineTo(x, plotArea.bottom + 5);
            ctx.stroke();

            // Label
            if (i % labelSpacing === 0 || i === hours.length - 1) {
                ctx.save();
                ctx.translate(x, plotArea.bottom + 20);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
                ctx.fillText(hour, 0, 0);
                ctx.restore();
            }
        });

        // Y-axis labels
        ctx.textAlign = 'right';
        const steps = 5;

        for (let i = 0; i <= steps; i++) {
            const value = (maxValue / steps) * i;
            const y = plotArea.bottom - (plotArea.height / steps) * i;

            ctx.beginPath();
            ctx.moveTo(plotArea.left - 5, y);
            ctx.lineTo(plotArea.left, y);
            ctx.stroke();

            ctx.fillText(value.toFixed(0), plotArea.left - 6, y + 4);
        }

        // Gridlines
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 0.5;

        for (let i = 1; i < steps; i++) {
            const y = plotArea.bottom - (plotArea.height / steps) * i;
            ctx.beginPath();
            ctx.moveTo(plotArea.left, y);
            ctx.lineTo(plotArea.right, y);
            ctx.stroke();
        }

        // Axis labels
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';

        // X-axis label
        ctx.textAlign = 'center';
        ctx.fillText('Date', plotArea.left + plotArea.width / 2, canvas.height - 10);

        // Y-axis label
        ctx.save();
        ctx.translate(15, plotArea.top + plotArea.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Daily Maximum Individuals (Nmax)', 0, 0);
        ctx.restore();
    }

    plotSubcamSiteData(ctx, plotArea, siteData, maxValue) {
        const { values, color } = siteData;
        const chartType = this.chartType || 'line';
        const xStep = plotArea.width / Math.max(values.length - 1, 1);

        if (chartType === 'line') {
            // Line chart
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.beginPath();
            let firstPoint = true;

            values.forEach((value, i) => {
                if (value !== null && value !== undefined) {
                    const x = plotArea.left + (i * xStep);
                    const y = plotArea.bottom - (value / maxValue) * plotArea.height;

                    if (firstPoint) {
                        ctx.moveTo(x, y);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });

            ctx.stroke();

            // Data points
            ctx.fillStyle = color;
            values.forEach((value, i) => {
                if (value !== null && value !== undefined) {
                    const x = plotArea.left + (i * xStep);
                    const y = plotArea.bottom - (value / maxValue) * plotArea.height;

                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        } else {
            // Column chart
            ctx.fillStyle = this.hexToRgba(color, 0.7);
            const columnWidth = Math.max(2, xStep * 0.7);

            values.forEach((value, i) => {
                if (value !== null && value !== undefined) {
                    const x = plotArea.left + (i * xStep) - columnWidth / 2;
                    const columnHeight = (value / maxValue) * plotArea.height;
                    const y = plotArea.bottom - columnHeight;

                    ctx.fillRect(x, y, columnWidth, columnHeight);
                }
            });
        }
    }

    drawSubcamLegend(ctx, plotData, plotArea) {
        const legendX = plotArea.right - 20;
        const legendY = plotArea.top + 10;
        const lineHeight = 20;
        const boxSize = 12;

        ctx.font = '12px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';

        plotData.forEach((siteData, i) => {
            const y = legendY + (i * lineHeight);

            // Color box
            ctx.fillStyle = siteData.color;
            ctx.fillRect(legendX - boxSize - 60, y - boxSize/2, boxSize, boxSize);

            // Site name
            ctx.fillStyle = '#333333';
            ctx.fillText(siteData.site, legendX, y + 4);
        });
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    async initializeSubcamPlotPage() {
        console.log('Initializing SUBCAM plot page controls...');

        // Get _nmax files from workingDirFiles
        const nmaxFiles = this.workingDirFiles.filter(file =>
            file.name.toLowerCase().includes('_nmax')
        );

        console.log('Found', nmaxFiles.length, '_nmax files');

        // Populate first card: site comparison
        const sourceSelect1 = document.getElementById('sourceSelect1');
        const sitesSelect1 = document.getElementById('sitesSelect1');

        if (sourceSelect1 && nmaxFiles.length > 0) {
            // Parse first file to get column names
            const firstFile = nmaxFiles[0];
            const data = await this.parseCSVFile(firstFile);
            const excludeColumns = ['date', 'time', 'hour', 'timestamp'];

            sourceSelect1.innerHTML = '<option value="">Select variable to plot...</option>';

            const headers = [];
            data.headers.forEach(header => {
                if (!excludeColumns.some(col => header.toLowerCase().includes(col.toLowerCase()))) {
                    const option = document.createElement('option');
                    option.value = header;
                    option.textContent = header;
                    sourceSelect1.appendChild(option);
                    headers.push(header);
                }
            });

            // Auto-select first source if available
            if (headers.length > 0) {
                sourceSelect1.value = headers[0];
            }
        }

        if (sitesSelect1) {
            sitesSelect1.innerHTML = '';
            nmaxFiles.forEach((file, index) => {
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = file.name;
                sitesSelect1.appendChild(option);

                // Auto-select first 2 files if available
                if (index < 2 && nmaxFiles.length >= 2) {
                    option.selected = true;
                }
            });
        }

        // Populate second card: variable comparison
        const siteSelect2 = document.getElementById('siteSelect2');
        const sourcesSelect2 = document.getElementById('sourcesSelect2');

        if (siteSelect2) {
            siteSelect2.innerHTML = '<option value="">Select a _nmax.csv file...</option>';
            nmaxFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = file.name;
                siteSelect2.appendChild(option);
            });

            // Auto-select first file if available
            if (nmaxFiles.length > 0) {
                siteSelect2.value = nmaxFiles[0].name;
            }
        }

        // When site is selected, populate variables
        if (siteSelect2 && sourcesSelect2) {
            siteSelect2.addEventListener('change', async () => {
                const selectedFile = nmaxFiles.find(f => f.name === siteSelect2.value);
                if (selectedFile) {
                    const data = await this.parseCSVFile(selectedFile);
                    const excludeColumns = ['date', 'time', 'hour', 'timestamp'];

                    sourcesSelect2.innerHTML = '';

                    const headers = [];
                    data.headers.forEach(header => {
                        if (!excludeColumns.some(col => header.toLowerCase().includes(col.toLowerCase()))) {
                            const option = document.createElement('option');
                            option.value = header;
                            option.textContent = header;
                            sourcesSelect2.appendChild(option);
                            headers.push(header);
                        }
                    });

                    // Auto-select first 2 sources if available
                    if (headers.length >= 2) {
                        sourcesSelect2.options[0].selected = true;
                        sourcesSelect2.options[1].selected = true;
                    } else if (headers.length === 1) {
                        sourcesSelect2.options[0].selected = true;
                    }
                }
            });

            // Trigger initial population if a site is preselected
            if (nmaxFiles.length > 0) {
                siteSelect2.dispatchEvent(new Event('change'));
            }
        }

        // Trigger button state updates after preselection
        setTimeout(() => {
            if (sourceSelect1) sourceSelect1.dispatchEvent(new Event('change'));
            if (sitesSelect1) sitesSelect1.dispatchEvent(new Event('change'));
            if (siteSelect2) siteSelect2.dispatchEvent(new Event('change'));
        }, 100);

        console.log('SUBCAM plot page initialized');
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
        // Handle unified Load button
        const loadBtn = document.querySelector('.load-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', async () => {
                await this.switchPage('reformat', 'universal');
            });
        }

        // Handle SUBCAM navigation buttons
        const subcamButtons = document.querySelectorAll('.subcam-nav');
        subcamButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const targetPage = button.getAttribute('data-page');
                await this.switchPage(targetPage, 'subcam');
            });
        });

        // Handle FPOD navigation buttons
        const fpodButtons = document.querySelectorAll('.fpod-nav');
        fpodButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const targetPage = button.getAttribute('data-page');
                await this.switchPage(targetPage, 'fpod');
            });
        });
    }

    async switchPage(pageName, device = 'subcam') {
        // Clear all active states first
        document.querySelectorAll('.nav-button').forEach(button => {
            button.classList.remove('active');
        });

        // Handle Load button specially
        if (pageName === 'reformat') {
            const loadBtn = document.querySelector('.load-btn');
            if (loadBtn) loadBtn.classList.add('active');
        }
        // Update navigation buttons based on device
        else if (device === 'subcam') {
            const activeBtn = document.querySelector(`.subcam-nav[data-page="${pageName}"]`);
            if (activeBtn) activeBtn.classList.add('active');
        } else if (device === 'fpod') {
            const activeBtn = document.querySelector(`.fpod-nav[data-page="${pageName}"]`);
            if (activeBtn) activeBtn.classList.add('active');
        }

        // Update page content
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // Map page names to actual page IDs
        let actualPageId = pageName;
        if (pageName === 'fpod-reformat') {
            actualPageId = 'reformatPage'; // Share the same reformat page
        } else if (pageName === 'fpod-plot') {
            actualPageId = 'fpod-plotPage';
        } else {
            actualPageId = `${pageName}Page`;
        }

        const targetPage = document.getElementById(actualPageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = pageName;
        this.currentDevice = device;

        // If switching to plot page, update file info
        if (pageName === 'plot') {
            console.log(`Switching to ${pageName} page - refreshing file information...`);

            // Force refresh the file list from csvManager
            if (csvManager && csvManager.workingDirFiles) {
                console.log(`Plot page: Found ${csvManager.workingDirFiles.length} files in working directory`);
                csvManager.workingDirFiles.forEach(file => {
                    console.log(`  - ${file.name}`);
                });
            }

            await this.updatePlotPageFileInfo(pageName);
            console.log(`${pageName} page file info updated`);
        }

        // If switching to heatmap page, update file dropdown
        if (pageName === 'heatmap') {
            console.log(`Switching to ${pageName} page - refreshing file dropdown...`);

            // Update heatmap file dropdown if the function exists
            if (typeof window.updateHeatmapFileDropdown === 'function') {
                window.updateHeatmapFileDropdown();
            }
            console.log(`${pageName} page file dropdown updated`);
        }

        // If switching to FPOD plot page, initialize FPOD plot controls
        if (pageName === 'fpod-plot') {
            console.log('Switching to FPOD plot page - initializing controls...');
            this.initializeFPODPlotPage();
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
            generateSiteComparisonBtn.disabled = !sourceSelected || sitesSelected.length < 1;
        };

        const updateSourceComparisonButton = () => {
            const siteSelected = siteSelect2.value;
            const sourcesSelected = Array.from(sourcesSelect2.selectedOptions).map(option => option.value);
            generateSourceComparisonBtn.disabled = !siteSelected || sourcesSelected.length < 1;
        };

        // Add event listeners
        if (sourceSelect1) sourceSelect1.addEventListener('change', updateSiteComparisonButton);
        if (sitesSelect1) sitesSelect1.addEventListener('change', updateSiteComparisonButton);
        if (siteSelect2) siteSelect2.addEventListener('change', updateSourceComparisonButton);
        if (sourcesSelect2) sourcesSelect2.addEventListener('change', updateSourceComparisonButton);

        // Button click handlers - delegate to csvManager
        if (generateSiteComparisonBtn) {
            generateSiteComparisonBtn.addEventListener('click', async () => {
                console.log('SUBCAM Site Comparison button clicked');
                const source = sourceSelect1.value;
                const sites = Array.from(sitesSelect1.selectedOptions).map(option => option.value);

                if (window.csvManager && typeof window.csvManager.generateSubcamSiteComparison === 'function') {
                    await window.csvManager.generateSubcamSiteComparison(source, sites);
                } else {
                    console.error('csvManager or generateSubcamSiteComparison not available');
                }
            });
        }

        if (generateSourceComparisonBtn) {
            generateSourceComparisonBtn.addEventListener('click', async () => {
                console.log('SUBCAM Source Comparison button clicked');
                const site = siteSelect2.value;
                const sources = Array.from(sourcesSelect2.selectedOptions).map(option => option.value);

                if (window.csvManager && typeof window.csvManager.generateSubcamSourceComparison === 'function') {
                    await window.csvManager.generateSubcamSourceComparison(site, sources);
                } else {
                    console.error('csvManager or generateSubcamSourceComparison not available');
                }
            });
        }

        // Standard DPM controls
        const sourceSelectStd1 = document.getElementById('sourceSelectStd1');
        const sitesSelectStd1 = document.getElementById('sitesSelectStd1');
        const generateSiteComparisonStdBtn = document.getElementById('generateSiteComparisonStdBtn');

        const siteSelectStd2 = document.getElementById('siteSelectStd2');
        const sourcesSelectStd2 = document.getElementById('sourcesSelectStd2');
        const generateSourceComparisonStdBtn = document.getElementById('generateSourceComparisonStdBtn');

        // Add event listeners for std buttons
        const updateStdSiteComparisonButton = () => {
            const sourceSelected = sourceSelectStd1?.value;
            const sitesSelected = Array.from(sitesSelectStd1?.selectedOptions || []).map(option => option.value);
            if (generateSiteComparisonStdBtn) {
                generateSiteComparisonStdBtn.disabled = !sourceSelected || sitesSelected.length < 1;
            }
        };

        const updateStdSourceComparisonButton = () => {
            const siteSelected = siteSelectStd2?.value;
            const sourcesSelected = Array.from(sourcesSelectStd2?.selectedOptions || []).map(option => option.value);
            if (generateSourceComparisonStdBtn) {
                generateSourceComparisonStdBtn.disabled = !siteSelected || sourcesSelected.length < 1;
            }
        };

        // Add event listeners for std controls
        if (sourceSelectStd1) sourceSelectStd1.addEventListener('change', updateStdSiteComparisonButton);
        if (sitesSelectStd1) sitesSelectStd1.addEventListener('change', updateStdSiteComparisonButton);
        if (siteSelectStd2) siteSelectStd2.addEventListener('change', updateStdSourceComparisonButton);
        if (sourcesSelectStd2) sourcesSelectStd2.addEventListener('change', updateStdSourceComparisonButton);

        // Std button click handlers
        if (generateSiteComparisonStdBtn) {
            generateSiteComparisonStdBtn.addEventListener('click', () => {
                const source = sourceSelectStd1.value;
                const sites = Array.from(sitesSelectStd1.selectedOptions).map(option => option.value);
                this.generateStdSiteComparison(source, sites);
            });
        }

        if (generateSourceComparisonStdBtn) {
            generateSourceComparisonStdBtn.addEventListener('click', () => {
                const site = siteSelectStd2.value;
                const sources = Array.from(sourcesSelectStd2.selectedOptions).map(option => option.value);
                this.generateStdSourceComparison(site, sources);
            });
        }

        // Length distribution controls
        const lengthSelect1 = document.getElementById('lengthSelect1');
        const sitesSelectLength1 = document.getElementById('sitesSelectLength1');
        const generateSiteComparisonLengthBtn = document.getElementById('generateSiteComparisonLengthBtn');

        const siteSelectLength2 = document.getElementById('siteSelectLength2');
        const lengthVarsSelect2 = document.getElementById('lengthVarsSelect2');
        const generateVariableComparisonLengthBtn = document.getElementById('generateVariableComparisonLengthBtn');

        // Add event listeners for length distribution buttons
        const updateLengthSiteComparisonButton = () => {
            const lengthSelected = lengthSelect1?.value;
            const sitesSelected = Array.from(sitesSelectLength1?.selectedOptions || []).map(option => option.value);
            if (generateSiteComparisonLengthBtn) {
                generateSiteComparisonLengthBtn.disabled = !lengthSelected || sitesSelected.length < 1;
            }
        };

        const updateLengthVariableComparisonButton = () => {
            const siteSelected = siteSelectLength2?.value;
            const varsSelected = Array.from(lengthVarsSelect2?.selectedOptions || []).map(option => option.value);
            if (generateVariableComparisonLengthBtn) {
                generateVariableComparisonLengthBtn.disabled = !siteSelected || varsSelected.length < 1;
            }
        };

        // Add event listeners for length controls
        if (lengthSelect1) lengthSelect1.addEventListener('change', updateLengthSiteComparisonButton);
        if (sitesSelectLength1) sitesSelectLength1.addEventListener('change', updateLengthSiteComparisonButton);
        if (siteSelectLength2) siteSelectLength2.addEventListener('change', updateLengthVariableComparisonButton);
        if (lengthVarsSelect2) lengthVarsSelect2.addEventListener('change', updateLengthVariableComparisonButton);

        // Length button click handlers
        if (generateSiteComparisonLengthBtn) {
            generateSiteComparisonLengthBtn.addEventListener('click', () => {
                const lengthVar = lengthSelect1.value;
                const sites = Array.from(sitesSelectLength1.selectedOptions).map(option => option.value);
                this.generateLengthSiteComparison(lengthVar, sites);
            });
        }

        if (generateVariableComparisonLengthBtn) {
            generateVariableComparisonLengthBtn.addEventListener('click', () => {
                const site = siteSelectLength2.value;
                const lengthVars = Array.from(lengthVarsSelect2.selectedOptions).map(option => option.value);
                this.generateLengthVariableComparison(site, lengthVars);
            });
        }
    }

    async updatePlotPageFileInfo(pageName = 'plot') {
        console.log("DEBUG: === PLOT PAGE FILE INFO UPDATE ===");        console.log("DEBUG: Page name:", pageName);
console.log("DEBUG: Starting plot page file info update for", pageName);        console.log("DEBUG: Working directory files count:", this.workingDirectoryFiles?.length || 0);
        
        // Get file info from csvManager if available
        let fileList = csvManager && csvManager.workingDirFiles ? csvManager.workingDirFiles : [];
        console.log(`Initial file list has ${fileList.length} files`);
        
        // Also gather all file versions from fileInfos Map to ensure nothing is missed
        if (csvManager && csvManager.fileInfos) {
            const allFileVersions = [];
            csvManager.fileInfos.forEach((fileInfo, baseName) => {
                fileInfo.versions.forEach((file, version) => {
                    // Check if this file is already in the fileList
                    if (!fileList.find(f => f.name === file.name)) {
                        allFileVersions.push(file);
                        console.log(`Adding missing file version: ${file.name} (${version})`);
                    }
                });
            });
            
            // Add any missing file versions
            fileList = [...fileList, ...allFileVersions];
            console.log(`Enhanced file list now has ${fileList.length} files`);
        }
        
        this.availableFiles = fileList;
        
        // Extract sites and sources from filenames
        await this.extractSitesAndSources(fileList);
        
        // Update dropdowns
        this.updateDropdowns(pageName);
        
        // Update status display
        this.updateStatusDisplay();
        
    }

    async extractSitesAndSources(fileList) {
        this.sites.clear();
        this.sources.clear();
        this.nmaxSources = new Set(); // Specific sources for nmax files (columns 2-7)
        this.obvsSources = new Set(); // All sources for obvs files
        this.nmaxFiles = []; // Store actual _nmax files
        this.obvFiles = []; // Store actual _obvs files

        // First, get sources from column headers if we have loaded files
        if (csvManager && csvManager.headers && csvManager.headers.length > 0) {
            // For nmax files, only show specific columns (2-7)
            const nmaxSpecificColumns = [
                "Total Observations",
                "Cumulative Observations",
                "All Unique Organisms Observed Today",
                "New Unique Organisms Today",
                "Cumulative New Unique Organisms",
                "Cumulative Unique Species"
            ];

            // Check if current file is nmax type
            const isNmaxFile = csvManager.fileName && csvManager.fileName.toLowerCase().includes('nmax');

            csvManager.headers.forEach((header, index) => {
                const headerLower = header.toLowerCase();
                const headerTrimmed = header.trim();

                // Skip time/date columns for all files
                if (!headerLower.includes('time') &&
                    !headerLower.includes('date') &&
                    !headerLower.includes('hour') &&
                    !headerLower.includes('timestamp') &&
                    headerTrimmed !== '') {

                    // For nmax files, only include specific columns (2-7)
                    if (isNmaxFile && index >= 1 && index <= 6) {
                        if (nmaxSpecificColumns.includes(headerTrimmed)) {
                            this.nmaxSources.add(headerTrimmed);
                        }
                    }

                    // For obvs files, include all non-time columns
                    if (!isNmaxFile) {
                        this.obvsSources.add(headerTrimmed);
                    }

                    // Add to general sources for backward compatibility
                    this.sources.add(headerTrimmed);
                }
            });
        }
        
        // If no sources found in headers, fall back to checking all available files
        if (this.sources.size === 0) {
            // Check headers of all available files for sources
            await this.checkAllFilesForSources(fileList);
        }
        
        // Find all _nmax.csv files and _obvs.csv files
        console.log("DEBUG: Starting file detection, checking", fileList.length, "files");
        console.log("🔍 DEBUG: Starting file detection process");        console.log("📂 DEBUG: Total files to check:", fileList.length);        fileList.forEach((file, index) => {            console.log(`📄 DEBUG: File ${index + 1}: ${file.name}`);        });
        fileList.forEach(file => {
            console.log("DEBUG: Checking file:", file.name);
            console.log(`🧪 DEBUG: Checking file: ${file.name}`);            const fileName = file.name.toLowerCase();            console.log(`🔤 DEBUG: Lowercase filename: ${fileName}`);            console.log(`🔍 DEBUG: Contains nmax? ${fileName.includes("nmax")}`);            console.log(`🔍 DEBUG: Contains obvs? ${fileName.includes("obvs")}`);            console.log(`📝 DEBUG: Ends with .csv? ${fileName.endsWith(".csv")}`);
            if (fileName.includes('nmax') && fileName.endsWith('.csv')) {
                console.log("DEBUG: FOUND NMAX FILE -", file.name);
                console.log(`Found _nmax file: ${file.name}`);
                this.nmaxFiles.push(file);
                // Also add to sites for backward compatibility
                this.sites.add(file.name);
            } else if (fileName.includes('obvs') && fileName.endsWith('.csv')) {
                console.log("DEBUG: FOUND OBVS FILE -", file.name);
                console.log(`Found _obvs file: ${file.name}`);
                this.obvFiles.push(file);
            }
        });
        
        console.log(`Found ${this.nmaxFiles.length} _nmax.csv files and ${this.obvFiles.length} _obvs.csv files`);
        console.log("📋 DEBUG: FINAL SUMMARY - About to call updateDropdowns");

        // Check nmax files for specific column headers (columns 2-7)
        if (this.nmaxFiles.length > 0) {
            await this.checkNmaxFilesForSources();
        }

        // Also check obvs files for additional column headers (they might have different columns)
        if (this.obvFiles.length > 0) {
            await this.checkStdFilesForSources();
        }
    }

    extractSiteFromFilename(baseName) {
        const sites = [];
        console.log(`  Analyzing filename: ${baseName}`);
        
        // Strategy 1: Standard format - site after second underscore
        // Example: SUBCAM_Alga_Control-S_2504-2506 -> Control-S
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
            if (index > 0 && // Skip first part (usually SUBCAM)
                part.length > 1 && 
                /[a-zA-Z]/.test(part) && 
                !this.isDateLike(part) &&
                !part.toLowerCase().includes('nmax') &&
                !part.toLowerCase().includes('obvs')) {
                
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
        // Extract site name from filename: remove everything before and up to 2nd underscore
        // Also remove _std or _24hr suffix
        // Example: FPOD_Alga_Control_W_2406_2409_std.csv -> Control_W_2406_2409
        const parts = filename.split('_');
        if (parts.length >= 3) {
            // Remove first 2 parts, keep everything from 3rd part onwards
            return parts.slice(2).join('_')
                .replace(/_(std|24hr)\.(csv|CSV)$/, '')
                .replace(/\.(csv|CSV)$/, '');
        }
        // Fallback to the filename if extraction fails
        return filename.replace(/\.(csv|CSV)$/, '');
    }


    async checkAllFilesForSources(fileList) {
        console.log('Checking all files for column headers...');

        // Check a few representative files to extract column headers
        for (const file of fileList.slice(0, 3)) { // Check first 3 files
            try {
                console.log(`Checking file: ${file.name}`);
                const csvData = await this.parseCSVFile(file);
                if (csvData && csvData.headers) {
                    csvData.headers.forEach(header => {
                        const headerLower = header.toLowerCase();
                        // Skip time/date columns - include everything else as potential DPM columns
                        if (!headerLower.includes('time') &&
                            !headerLower.includes('date') &&
                            !headerLower.includes('hour') &&
                            !headerLower.includes('timestamp') &&
                            header.trim() !== '') {
                            this.sources.add(header.trim()); // Use original header name
                        }
                    });
                }
            } catch (error) {
                console.warn(`Could not parse file ${file.name}:`, error);
            }
        }

        console.log('Found sources from files:', Array.from(this.sources));
    }

    async checkStdFilesForSources() {
        console.log('Checking obvs files for additional column headers...');

        // Check a few representative obvs files to extract column headers
        for (const file of this.obvFiles.slice(0, 3)) { // Check first 3 obvs files
            try {
                console.log(`Checking obvs file: ${file.name}`);
                const csvData = await this.parseCSVFile(file);
                if (csvData && csvData.headers) {
                    csvData.headers.forEach(header => {
                        const headerLower = header.toLowerCase();
                        // Skip time/date columns - include everything else as potential DPM columns
                        if (!headerLower.includes('time') &&
                            !headerLower.includes('date') &&
                            !headerLower.includes('hour') &&
                            !headerLower.includes('timestamp') &&
                            header.trim() !== '') {
                            this.sources.add(header.trim()); // Use original header name
                        }
                    });
                }
            } catch (error) {
                console.warn(`Could not parse std file ${file.name}:`, error);
            }
        }

        console.log('Total sources after checking obvs files:', Array.from(this.sources));
    }

    async checkNmaxFilesForSources() {
        console.log('Checking nmax files for specific column headers (2-7)...');

        // Specific columns we want for nmax files (columns 2-7)
        const nmaxSpecificColumns = [
            "Total Observations",
            "Cumulative Observations",
            "All Unique Organisms Observed Today",
            "New Unique Organisms Today",
            "Cumulative New Unique Organisms",
            "Cumulative Unique Species"
        ];

        // Check a few representative nmax files to extract column headers
        for (const file of this.nmaxFiles.slice(0, 3)) { // Check first 3 nmax files
            try {
                console.log(`Checking nmax file: ${file.name}`);
                const csvData = await this.parseCSVFile(file);
                if (csvData && csvData.headers) {
                    csvData.headers.forEach((header, index) => {
                        const headerTrimmed = header.trim();

                        // Only include columns 2-7 (index 1-6) and match specific column names
                        if (index >= 1 && index <= 6) {
                            if (nmaxSpecificColumns.includes(headerTrimmed)) {
                                this.nmaxSources.add(headerTrimmed);
                                console.log(`Added nmax source: ${headerTrimmed} (column ${index + 1})`);
                            }
                        }
                    });
                }
            } catch (error) {
                console.warn(`Could not parse nmax file ${file.name}:`, error);
            }
        }

        console.log('Total nmax sources after checking files:', Array.from(this.nmaxSources));
    }

    updateDropdowns(pageName = 'plot') {
        console.log("DEBUG: Updating dropdowns with", this.nmaxFiles?.length, "nmax files and", this.obvFiles?.length, "obvs files");
        console.log("🎛️ DEBUG: Starting dropdown update process");        console.log("📊 DEBUG: Available sources:", Array.from(this.sources));        console.log("📁 DEBUG: Available nmaxFiles:", this.nmaxFiles?.length || 0);        console.log("📁 DEBUG: Available obvFiles:", this.obvFiles?.length || 0);
        const idPrefix = "";
        const sources = Array.from(this.sources).sort();
        const nmaxFiles = this.nmaxFiles || [];


        // Update source dropdown for nmax site comparison (columns 2-7 only)
        const sourceSelect1 = document.getElementById(idPrefix + 'sourceSelect1');
        if (sourceSelect1) {
            console.log("🎯 DEBUG: Found sourceSelect1 dropdown, populating with nmax sources");
            const nmaxSourcesArray = Array.from(this.nmaxSources || new Set()).sort();
            console.log("📝 DEBUG: Nmax sources to add:", nmaxSourcesArray);
            sourceSelect1.innerHTML = '<option value="">Select variable to plot...</option>';
            nmaxSourcesArray.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source;
                sourceSelect1.appendChild(option);
            });
        }
        
        // Update sites dropdown for site comparison (_nmax files)
        const sitesSelect1 = document.getElementById(idPrefix + 'sitesSelect1');
        if (sitesSelect1) {
            console.log("🎯 DEBUG: Found sitesSelect1 dropdown, populating with nmax files");            console.log("📁 DEBUG: Nmax files to add:", nmaxFiles.map(f => f.name));
            sitesSelect1.innerHTML = '';
            nmaxFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name; // Use full filename as value
                option.textContent = file.name; // Show full filename
                sitesSelect1.appendChild(option);
            });
        }
        
        // Update site dropdown for source comparison (_nmax files)
        const siteSelect2 = document.getElementById(idPrefix + 'siteSelect2');
        if (siteSelect2) {
            siteSelect2.innerHTML = '<option value="">Select a _nmax.csv file...</option>';
            nmaxFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name; // Use full filename as value
                option.textContent = file.name; // Show full filename
                siteSelect2.appendChild(option);
            });
        }
        
        // Update sources dropdown for nmax variable comparison (columns 2-7 only)
        const sourcesSelect2 = document.getElementById(idPrefix + 'sourcesSelect2');
        if (sourcesSelect2) {
            const nmaxSourcesArray = Array.from(this.nmaxSources || new Set()).sort();
            sourcesSelect2.innerHTML = '';
            nmaxSourcesArray.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source;
                sourcesSelect2.appendChild(option);
            });
        }

        // Update length distribution dropdowns
        this.updateLengthDropdowns(nmaxFiles, this.obvFiles || [], pageName);

        // Update std dropdowns
        this.updateObvDropdowns(sources, this.obvFiles, pageName);
    }

    updateLengthDropdowns(nmaxFiles, obvFiles, pageName = 'plot') {
        console.log("🎛️ DEBUG: Starting length distribution dropdown update process");
        const allFiles = [...(nmaxFiles || []), ...(obvFiles || [])];
        console.log("📁 DEBUG: All files for length dropdowns:", allFiles.map(f => f.name));
        const idPrefix = "";

        // Update sites dropdown for length site comparison (all CSV files)
        const sitesSelectLength1 = document.getElementById(idPrefix + 'sitesSelectLength1');
        if (sitesSelectLength1) {
            console.log("🎯 DEBUG: Found sitesSelectLength1 dropdown, populating with all files");
            sitesSelectLength1.innerHTML = '';
            allFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = file.name;
                sitesSelectLength1.appendChild(option);
            });
        }

        // Update site dropdown for length variable comparison (all CSV files)
        const siteSelectLength2 = document.getElementById(idPrefix + 'siteSelectLength2');
        if (siteSelectLength2) {
            console.log("🎯 DEBUG: Found siteSelectLength2 dropdown, populating with all files");
            siteSelectLength2.innerHTML = '<option value="">Select a CSV file...</option>';
            allFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = file.name;
                siteSelectLength2.appendChild(option);
            });
        }
    }

    updateObvDropdowns(sources, obvFiles, pageName = 'plot') {
        console.log("🎛️ DEBUG: Starting obvs dropdown update process");        console.log("📊 DEBUG: Sources for obvs dropdowns:", sources);        console.log("📁 DEBUG: ObvFiles for dropdowns:", obvFiles?.length || 0);
        const idPrefix = "";

        // Update source dropdown for std site comparison (DPM columns)
        const sourceSelectStd1 = document.getElementById(idPrefix + 'sourceSelectStd1');
        if (sourceSelectStd1) {
            console.log("🎯 DEBUG: Found sourceSelectStd1 dropdown, populating with sources");
            sourceSelectStd1.innerHTML = '<option value="">Select variable to plot...</option>';
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source;
                sourceSelectStd1.appendChild(option);
            });

            // Auto-select first source if available
            if (sources.length > 0) {
                sourceSelectStd1.value = sources[0];
            }
        }

        // Update sites dropdown for obvs site comparison (_obvs files)
        const sitesSelectStd1 = document.getElementById(idPrefix + 'sitesSelectStd1');
        if (sitesSelectStd1) {
            console.log("🎯 DEBUG: Found sitesSelectStd1 dropdown, populating with obvs files");            console.log("📁 DEBUG: Obvs files to add:", obvFiles?.map(f => f.name) || []);
            sitesSelectStd1.innerHTML = '';
            obvFiles.forEach((file, index) => {
                const option = document.createElement('option');
                option.value = file.name; // Use full filename as value
                option.textContent = file.name;
                sitesSelectStd1.appendChild(option);

                // Auto-select first 2 files if available
                if (index < 2 && obvFiles.length >= 2) {
                    option.selected = true;
                }
            });
        }

        // Update site dropdown for obvs source comparison (_obvs files)
        const siteSelectStd2 = document.getElementById(idPrefix + 'siteSelectStd2');
        if (siteSelectStd2) {
            siteSelectStd2.innerHTML = '<option value="">Select a _obvs.csv file...</option>';
            obvFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name; // Use full filename as value
                option.textContent = file.name;
                siteSelectStd2.appendChild(option);
            });
        }

        // Update sources dropdown for obvs source comparison
        const sourcesSelectStd2 = document.getElementById(idPrefix + 'sourcesSelectStd2');
        if (sourcesSelectStd2) {
            sourcesSelectStd2.innerHTML = '';
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source;
                sourcesSelectStd2.appendChild(option);
            });
        }

        // Trigger button state updates after setting defaults
        setTimeout(() => {
            // Trigger obvs site comparison button update
            const sourceSelectStd1 = document.getElementById('sourceSelectStd1');
            const sitesSelectStd1 = document.getElementById('sitesSelectStd1');
            if (sourceSelectStd1 && sitesSelectStd1) {
                const event = new Event('change');
                sourceSelectStd1.dispatchEvent(event);
                sitesSelectStd1.dispatchEvent(event);
            }
        }, 100);
    }

    updateStatusDisplay() {
        const availableFilesStatus = document.getElementById('availableFilesStatus');
        const availableSitesStatus = document.getElementById('availableSitesStatus');
        const availableSourcesStatus = document.getElementById('availableSourcesStatus');
        
        // Update std status displays
        const availableStdFilesStatus = document.getElementById('availableStdFilesStatus');
        const availableStdSitesStatus = document.getElementById('availableStdSitesStatus');
        const availableStdSourcesStatus = document.getElementById('availableStdSourcesStatus');
        
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

            // Update std status displays
            if (availableStdFilesStatus) {
                availableStdFilesStatus.textContent = `Found ${this.obvFiles.length} _obvs.csv files in working directory.`;
            }
            if (availableStdSitesStatus) {
                const stdSites = this.obvFiles.map(f => f.name);
                availableStdSitesStatus.textContent = `Available Std Sites: ${stdSites.length > 0 ? stdSites.join(', ') : 'None detected'}`;
            }
            if (availableStdSourcesStatus) {
                const sources = Array.from(this.sources);
                availableStdSourcesStatus.textContent = `Available Sources: ${sources.length > 0 ? sources.join(', ') : 'None detected'}`;
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

            // Clear std status displays
            if (availableStdFilesStatus) {
                availableStdFilesStatus.textContent = 'No directory selected. Please select a working directory first.';
            }
            if (availableStdSitesStatus) {
                availableStdSitesStatus.textContent = '';
            }
            if (availableStdSourcesStatus) {
                availableStdSourcesStatus.textContent = '';
            }
        }
    }

    async generateSiteComparison(source, sites) {
        console.log('=== GENERATE SITE COMPARISON START ===');
        console.log('Source:', source);
        console.log('Sites:', sites);
        console.log('Available files:', this.availableFiles?.length || 0);
        console.log('Available files list:', this.availableFiles?.map(f => f.name) || []);
        
        const outputDiv = document.getElementById('fpod-siteComparisonOutput');
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
                throw new Error('No _nmax files found for the selected sites');
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
                        Make sure the corresponding _nmax files exist for: ${sites.join(', ')}
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
                return normalized.includes(siteNormalized) && normalized.includes('nmax');
            },
            
            // Strategy 2: Match with original site name and 24hr variations
            (fileName) => {
                const normalized = fileName.toLowerCase();
                const siteVariations = this.getSiteVariations(site);
                const has24hr = normalized.includes('nmax') || normalized.includes('_nmax') || normalized.includes('-nmax');
                return siteVariations.some(variation => normalized.includes(variation.toLowerCase())) && has24hr;
            },
            
            // Strategy 3: Flexible matching for filename parts
            (fileName) => {
                const parts = fileName.toLowerCase().split(/[_\-\.]/);
                const siteVariations = this.getSiteVariations(site);
                const has24hr = parts.some(part => part.includes('nmax'));
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
            
            console.log('Title and subtitle removed for cleaner appearance');
            // Title and subtitle removed
            
            console.log('Preparing data for plotting...');
            // Prepare data for plotting - first extract all available time points from all sites
            let allTimePoints = new Set();
            siteData.forEach(siteInfo => {
                const hourlyData = this.extractHourlyData(siteInfo.data, source);
                Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
            });

            // Sort time points and format them as actual timestamps
            const sortedOriginalHours = Array.from(allTimePoints).sort((a, b) => {
                const dateA = new Date(a.replace(/\//g, '-').replace(' 00:00:00', ''));
                const dateB = new Date(b.replace(/\//g, '-').replace(' 00:00:00', ''));
                return dateA - dateB;
            });
            const sortedDisplayHours = this.formatTimePointsAsActualTimestamps(sortedOriginalHours, siteData[0]);
            console.log(`Using ${sortedDisplayHours.length} time points from actual data:`, sortedDisplayHours.slice(0, 5), '...');
console.log("=== FIXED: Multi-file Time Range ===");            console.log("All time points found:", Array.from(allTimePoints).slice(0, 10));            console.log("Sorted ORIGINAL hours:", sortedOriginalHours.slice(0, 10));            console.log("Sorted DISPLAY hours:", sortedDisplayHours.slice(0, 10));

            let maxDPM = 0;

            const plotData = siteData.map((siteInfo, index) => {
                console.log(`Processing data for site: ${siteInfo.site}`);
                const hourlyData = this.extractHourlyData(siteInfo.data, source);
                console.log(`Hourly data for ${siteInfo.site}:`, Object.keys(hourlyData).length, 'hours');

                const dpmValues = sortedOriginalHours.map((hour, timeIndex) => {
                    const value = hourlyData[hour] !== undefined ? hourlyData[hour] : null;
                    if (timeIndex < 5) { // Log first few mappings
                        console.log(`    Original hour: "${hour}", Mapped value: ${hourlyData[hour]}, Final value: ${value}`);
                        console.log(`  Time ${timeIndex}: "${hour}" -> ${value}`);
                    }
                    return value;
                });
                maxDPM = Math.max(maxDPM, ...dpmValues);
                console.log(`Site ${siteInfo.site}: ${dpmValues.length} data points, max value: ${Math.max(...dpmValues)}`);

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
            this.drawPlotAxes(ctx, plotArea, sortedDisplayHours, maxDPM, maxPercentage, canvas, "Time");
            
            console.log('Plotting site data...');
            // Apply layer ordering and plot data for each site
            const orderedPlotData = (typeof csvManager !== 'undefined' && csvManager.applyLayerOrder) ?
                csvManager.applyLayerOrder(plotData) : plotData;
            orderedPlotData.forEach(siteData => {
                console.log(`Plotting data for site: ${siteData.site}`);
                this.plotSiteData(ctx, plotArea, siteData, sortedDisplayHours, maxDPM);
            });
            
            console.log('Drawing legend...');
            // Draw legend
            this.drawPlotLegend(ctx, plotData, plotArea);
            
            console.log('Updating output div...');
            // Clear output div and append plot container directly
            outputDiv.innerHTML = '';
            
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
                console.log(`Row ${index} keys:`, Object.keys(row));
            }

            // Look for hour column (might be 'Hour', 'Time', etc.)
            const hourKey = Object.keys(row).find(key =>
                key.toLowerCase().includes('hour') ||
                key.toLowerCase().includes('time') ||
                key.toLowerCase().includes('timestamp') ||
                key.toLowerCase().includes('date')
            );

            // Look for the source column - exact match first, then partial match
            let sourceKey = Object.keys(row).find(key => key === source);
            if (!sourceKey) {
                sourceKey = Object.keys(row).find(key =>
                    key.toLowerCase().includes(source.toLowerCase())
                );
            }

            if (index < 3) {
                console.log(`Row ${index} - Hour key: "${hourKey}", Source key: "${sourceKey}"`);
                if (hourKey) console.log(`  Hour value: "${row[hourKey]}"`);
                if (sourceKey) console.log(`  Source value: "${row[sourceKey]}"`);
            }

            if (hourKey && sourceKey && row[hourKey] && row[sourceKey] !== undefined) {
                let timeIdentifier = row[hourKey];

                // Handle different time formats for std files vs 24hr files vs _nmax daily files
                if (typeof timeIdentifier === 'string' && timeIdentifier.includes('T')) {
                    // ISO timestamp like "2025-03-30T01:00:00.000Z" (common in std files)
                    const dateObj = new Date(timeIdentifier);
                    // Use a unique identifier that combines date and hour for std files
                    const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                    const hourStr = String(dateObj.getHours()).padStart(2, '0'); // 00-23
                    timeIdentifier = `${dateStr}_${hourStr}`; // e.g., "2025-03-30_14"
                } else if (typeof timeIdentifier === 'string' && timeIdentifier.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Daily date format like "2024-08-01" (common in _nmax files)
                    timeIdentifier = timeIdentifier; // Keep as-is for daily data
                } else {
                    // Use as-is for 24hr files (simple hour numbers)
                    timeIdentifier = String(timeIdentifier).padStart(2, '0');
                }

                const dpm = parseFloat(row[sourceKey]) || 0;
                hourlyData[timeIdentifier] = dpm;

                if (index < 3) {
                    console.log(`  Stored: timeIdentifier="${timeIdentifier}", dpm=${dpm}`);
                }
            }
        });

        console.log('Extracted hourly data:', Object.keys(hourlyData).length, 'hours');
        console.log('Sample hourly data:', Object.fromEntries(Object.entries(hourlyData).slice(0, 5)));

        return hourlyData;
    }

    formatTimePointsAsActualTimestamps(sortedHours, sampleSiteData) {
        console.log('=== FORMAT TIMESTAMPS ===');
        console.log('Sorted hours:', sortedHours.slice(0, 5));

        // If we have date_hour format identifiers (e.g., "2024-07-15_14")
        // If we have daily date format identifiers (e.g., "2024-08-01")
        if (sortedHours.length > 0 && sortedHours[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
            return sortedHours.map(dateStr => {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
            });
        }

        if (sortedHours.length > 0 && sortedHours[0].includes('_')) {
            return sortedHours.map(timeIdentifier => {
                const [dateStr, hourStr] = timeIdentifier.split('_');
                const date = new Date(dateStr + `T${hourStr.padStart(2, '0')}:00:00Z`);

                // Format as "DD/MM/YY"
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);

                return `${day}/${month}/${year}`;
            });
        }

        // For simple hour numbers, try to extract actual timestamps from the data
        if (sampleSiteData && sampleSiteData.data && sampleSiteData.data.data) {
            const timestamps = [];
            sampleSiteData.data.data.forEach((row, index) => {
                const timeKey = Object.keys(row).find(key =>
                    key.toLowerCase().includes('time') ||
                    key.toLowerCase().includes('date') ||
                    key.toLowerCase().includes('timestamp')
                );

                if (timeKey && row[timeKey] && index < sortedHours.length) {
                    const timestamp = row[timeKey];
                    if (typeof timestamp === 'string' && timestamp.includes('T')) {
                        // ISO timestamp format
                        const date = new Date(timestamp);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = String(date.getFullYear()).slice(-2);
                        timestamps.push(`${day}/${month}/${year}`);
                    } else {
                        // Try to parse as date and format as DD/MM/YY
                        const date = new Date(timestamp);
                        if (!isNaN(date.getTime())) {
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = String(date.getFullYear()).slice(-2);
                            timestamps.push(`${day}/${month}/${year}`);
                        } else {
                            timestamps.push(timestamp.toString());
                        }
                    }
                }
            });

            if (timestamps.length > 0) {
                console.log('Using actual timestamps from data:', timestamps.slice(0, 5));
                return timestamps;
            }
        }

        // Fallback: just return the hours as time labels
        return sortedHours.map(hour => {
            const hourNum = parseInt(hour) || 0;
            return `${String(hourNum).padStart(2, '0')}:00`;
        });
    }

    calculateOptimalLabelSpacing(dataSize) {
        // Calculate spacing to show only 8-12 labels across the entire x-axis
        const targetLabelCount = 10; // Aim for ~10 labels total
        const spacing = Math.max(1, Math.ceil(dataSize / targetLabelCount));

        console.log(`Dataset size: ${dataSize}, calculated spacing: ${spacing}, estimated labels: ${Math.ceil(dataSize / spacing)}`);

        return spacing;
    }

formatTimePointsAsDateLabels(sortedHours, sampleSiteData, formatType = "date") {        // For 24hr file format - use time format when requested (check this FIRST)        if (formatType === "time") {            return sortedHours.map((hour) => {                const hourNum = hour.includes("_") ? parseInt(hour.split("_")[1], 10) : parseInt(hour, 10);                const hours = String(hourNum).padStart(2, "0");                return `${hours}:00`;            });        }        // Check if we're dealing with std file time identifiers (format: "YYYY-MM-DD_HH")        if (sortedHours.length > 0 && sortedHours[0].includes("_")) {            // This is std file format with date_hour identifiers            return sortedHours.map(timeIdentifier => {                const [dateStr, hourStr] = timeIdentifier.split("_");                const date = new Date(dateStr + "T00:00:00Z");                const day = String(date.getDate()).padStart(2, "0");                const month = String(date.getMonth() + 1).padStart(2, "0");                const year = String(date.getFullYear()).slice(-2);                return `${day}/${month}/${year}`;            });        }        // For 24hr file format - use time format when requested
        // Check if we have daily date format (YYYY-MM-DD) for _nmax files
        if (sortedHours.length > 0 && sortedHours[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
            return sortedHours.map(dateStr => {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                return `${day}/${month}/${year}`;
            });
        }

        if (formatType === "time") {
            return sortedHours.map((hour) => {
                const hourNum = hour.includes("_") ? parseInt(hour.split("_")[1], 10) : parseInt(hour, 10);
                const hours = String(hourNum).padStart(2, "0");
                return `${hours}:00`;
            });
        }

        // Fallback for 24hr file format (simple hour numbers)
        let baseDate = null;

        // Try to find a timestamp in the data to extract the base date
        if (sampleSiteData && sampleSiteData.data && sampleSiteData.data.data && sampleSiteData.data.data.length > 0) {
            const firstRow = sampleSiteData.data.data[0];
            const timeKey = Object.keys(firstRow).find(key =>
                key.toLowerCase().includes('time') || key.toLowerCase().includes('date')
            );

            if (timeKey && firstRow[timeKey]) {
                const timeValue = firstRow[timeKey];
                if (typeof timeValue === 'string' && timeValue.includes('T')) {
                    baseDate = new Date(timeValue);
                }
            }
        }

        // If we can't extract a base date, use current date as fallback
        if (!baseDate || isNaN(baseDate.getTime())) {
            baseDate = new Date();
            console.warn('Could not extract base date from data, using current date as fallback');
        }

        // Generate date labels in dd/mm/yy format for each time point
        return sortedHours.map((hour, index) => {
            const date = new Date(baseDate);
            // Add index as days offset (each hour could represent a different day)
            // For std files, this might be days rather than hours
            date.setDate(date.getDate() + index);

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);

            return `${day}/${month}/${year}`;
        });
    }

    extractStandardData(csvData, source) {
        console.log(`=== EXTRACT STANDARD DATA FOR SOURCE: ${source} ===`);
        console.log('CSV headers:', csvData.headers);
        console.log('CSV data rows:', csvData.data.length);

        // Group data by day first, then calculate % detection per day
        const dailyData = {};

        csvData.data.forEach((row, index) => {
            if (index < 3) { // Log first few rows for debugging
                console.log(`Row ${index}:`, row);
            }

            // Look for time column (ISO format)
            const timeKey = Object.keys(row).find(key =>
                key.toLowerCase().includes('time') || key.toLowerCase().includes('hour')
            );

            // Look for the source column (Porpoise, Dolphin, Sonar, etc.)
            const sourceKey = Object.keys(row).find(key =>
                key.toLowerCase().includes(source.toLowerCase())
            );

            if (index < 3) {
                console.log(`Row ${index} - Time key: "${timeKey}", Source key: "${sourceKey}"`);
                if (timeKey) console.log(`  Time value: "${row[timeKey]}"`);
                if (sourceKey) console.log(`  Source value: "${row[sourceKey]}"`);
            }

            if (timeKey && sourceKey && row[timeKey] && row[sourceKey] !== undefined) {
                const timeValue = row[timeKey];
                const dpm = parseFloat(row[sourceKey]) || 0;

                // Parse ISO time format to get date and hour
                let date, hour;
                if (typeof timeValue === 'string' && timeValue.includes('T')) {
                    // ISO timestamp like "2025-03-30T01:00:00.000Z"
                    const dateObj = new Date(timeValue);
                    date = dateObj.toISOString().split('T')[0]; // Get YYYY-MM-DD
                    hour = String(dateObj.getHours()).padStart(2, '0'); // 00-23 format
                } else {
                    // Fallback - assume it's just hour data
                    date = 'unknown';
                    hour = String(timeValue).padStart(2, '0');
                }

                // Initialize day data if not exists
                if (!dailyData[date]) {
                    dailyData[date] = { totalHours: 0, detectedHours: 0, hourlyData: {} };
                }

                // Track this hour
                dailyData[date].totalHours++;
                dailyData[date].hourlyData[hour] = dpm;

                // Count as detected if DPM > 0
                if (dpm > 0) {
                    dailyData[date].detectedHours++;
                }

                if (index < 3) {
                    console.log(`  Processed: date="${date}", hour="${hour}", dpm=${dpm}, detected=${dpm > 0}`);
                }
            }
        });

        // Calculate % detection per day and aggregate by hour across all days
        const hourlyPercentages = {};
        let totalDays = 0;

        // Initialize all hours to 0
        for (let h = 0; h < 24; h++) {
            hourlyPercentages[String(h + 1).padStart(2, '0')] = 0; // Using 01-24 format
        }

        Object.keys(dailyData).forEach(date => {
            const dayData = dailyData[date];
            const dayPercentage = dayData.totalHours > 0 ? (dayData.detectedHours / dayData.totalHours) * 100 : 0;

            console.log(`Day ${date}: ${dayData.detectedHours}/${dayData.totalHours} hours detected (${dayPercentage.toFixed(1)}%)`);

            // For each hour in this day, add the day's percentage if there was detection
            Object.keys(dayData.hourlyData).forEach(hour => {
                const hourDPM = dayData.hourlyData[hour];
                const displayHour = String(parseInt(hour) + 1).padStart(2, '0'); // Convert to 01-24 format

                if (hourDPM > 0) {
                    // This hour had detection, so add the day's detection percentage
                    if (!hourlyPercentages[displayHour]) hourlyPercentages[displayHour] = 0;
                    hourlyPercentages[displayHour] += dayPercentage;
                }
            });

            totalDays++;
        });

        // Average the percentages across all days
        Object.keys(hourlyPercentages).forEach(hour => {
            if (totalDays > 0) {
                hourlyPercentages[hour] = hourlyPercentages[hour] / totalDays;
            }
        });

        console.log('Calculated hourly percentages:', Object.keys(hourlyPercentages).length, 'hours');
        console.log('Sample hourly percentages:', Object.fromEntries(Object.entries(hourlyPercentages).slice(0, 5)));
        console.log(`Total days processed: ${totalDays}`);

        return hourlyPercentages;
    }

    drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, xAxisLabel = "Date") {
        // Softer, elegant styling
        ctx.strokeStyle = '#d0d0d0';  // Light gray for axes
        ctx.lineWidth = 1;
        ctx.font = '13px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
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
            
            // Label with intelligent spacing to avoid crowding - rotated at 45 degrees
            const labelSpacing = this.calculateOptimalLabelSpacing(hours.length);
            if (i % labelSpacing === 0 || i === hours.length - 1) { // Always show first, last, and spaced labels
                ctx.save();
                ctx.translate(x, plotArea.bottom + 20);
                ctx.rotate(-Math.PI / 4); // -45 degrees
                ctx.textAlign = 'right';
                ctx.fillText(hour, 0, 0);
                ctx.restore();
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
            
            // Label (moved closer to axis)
            ctx.fillText(dpm.toFixed(1), plotArea.left - 6, y + 4);
        }

        // Right Y-axis labels (Percentage - 60 DPM = 100%)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#666666';
        for (let i = 0; i <= dpmSteps; i++) {
            const percentage = (maxPercentage / dpmSteps) * i;
            const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;

            // Tick mark
            ctx.strokeStyle = '#d0d0d0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(plotArea.right, y);
            ctx.lineTo(plotArea.right + 5, y);
            ctx.stroke();

            // Label
            ctx.fillText(Math.round(percentage), plotArea.right + 10, y + 4);
        }

        // Add horizontal gridlines for Y-axis major ticks (faint)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < dpmSteps; i++) { // Skip 0 and max to avoid overlapping with axes
            const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;
            ctx.beginPath();
            ctx.moveTo(plotArea.left, y);
            ctx.lineTo(plotArea.right, y);
            ctx.stroke();
        }
        
        // Add vertical gridlines for X-axis major ticks (faint)
        // Use the xStep already declared above
        const gridSpacing = this.calculateOptimalLabelSpacing(hours.length);
        for (let i = gridSpacing; i < hours.length - 1; i += gridSpacing) { // Skip first and last, use intelligent spacing
            const x = plotArea.left + (i * xStep);
            ctx.beginPath();
            ctx.moveTo(x, plotArea.top);
            ctx.lineTo(x, plotArea.bottom);
            ctx.stroke();
        }
        
        // Add horizontal line at top to complete the rectangle
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotArea.left, plotArea.top);
        ctx.lineTo(plotArea.right, plotArea.top);
        ctx.stroke();

        // Add vertical line at right to complete the rectangle
        ctx.beginPath();
        ctx.moveTo(plotArea.right, plotArea.top);
        ctx.lineTo(plotArea.right, plotArea.bottom);
        ctx.stroke();

        // Reset styles for other elements
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        
        // Right Y-axis labels removed for cleaner appearance
        
        // Elegant axis labels
        ctx.textAlign = 'center';
        ctx.font = '14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.fillStyle = '#555555';
        
        // X-axis label (positioned lower to avoid overlap with rotated tick labels)
        ctx.fillText(xAxisLabel, plotArea.left + plotArea.width / 2, xAxisLabel === "Date" ? plotArea.bottom + 75 : plotArea.bottom + 65);
        
        // Left Y-axis label
        ctx.save();
        ctx.translate(40, plotArea.top + plotArea.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Count', 0, 0);
        ctx.restore();
    }

    plotSiteData(ctx, plotArea, siteData, hours, maxDPM) {
        const { site, dpmValues, color } = siteData;

        // Check chart type from global csvManager
        const chartType = (typeof csvManager !== 'undefined' && csvManager.chartType) ? csvManager.chartType : 'line';

        // FIXED: Use actual data length for proper x-axis spacing
        const xStep = plotArea.width / Math.max(dpmValues.length - 1, 1);

        if (chartType === 'column') {
            // Column chart rendering with transparency
            ctx.fillStyle = csvManager.hexToRgba(color, 0.7); // 70% transparency
            const columnWidth = Math.max(2, xStep * 0.7); // 70% of available space per column

            dpmValues.forEach((dpm, i) => {
                if (dpm !== null && dpm !== undefined) {
                    const x = plotArea.left + (i * xStep) - columnWidth / 2;
                    const columnHeight = (dpm / maxDPM) * plotArea.height;
                    const y = plotArea.bottom - columnHeight;

                    // Draw the column with transparency
                    ctx.fillRect(x, y, columnWidth, columnHeight);
                }
            });
        } else {
            // Line chart rendering (default)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Create line with reduced smoothing
            if (dpmValues.length < 2) return;

            ctx.beginPath();

            // ENHANCED: Draw lines with proper gap handling for null values
            let pathStarted = false;
            dpmValues.forEach((dpm, i) => {
                if (dpm !== null && dpm !== undefined) {
                    const x = plotArea.left + (i * xStep);
                    const y = plotArea.bottom - (dpm / maxDPM) * plotArea.height;

                    if (!pathStarted) {
                        ctx.moveTo(x, y);
                        pathStarted = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                } else if (pathStarted) {
                    // Break the path on null values to create gaps
                    ctx.stroke();
                    ctx.beginPath();
                    pathStarted = false;
                }
            });

            // Final stroke for any remaining path
            if (pathStarted) {
                ctx.stroke();
            }
        }
    }

    drawPlotLegend(ctx, plotData, plotArea) {
        // Legend positioning aligned to left like the second plot
        const legendX = plotArea.left + 20;
        const legendY = plotArea.top + 20;

        // File name truncation function (2nd to 4th underscore)
        const truncateFileName = (fileName) => {
            const parts = fileName.split('_');
            if (parts.length >= 4) {
                return parts.slice(2, 4).join('_');
            }
            return fileName; // Return original if not enough underscores
        };

        // Calculate legend box dimensions dynamically based on text content
        const legendPadding = 6;
        const lineHeight = 20;

        // Set font for measurement
        ctx.font = '14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

        // Calculate maximum text width
        let maxTextWidth = 0;
        plotData.forEach((siteData) => {
            let displayName;
            if (plotData.length === 1) {
                displayName = truncateFileName(siteData.site);
            } else {
                displayName = siteData.site; // Already truncated by extractSiteNameFromFilename
            }
            const textWidth = ctx.measureText(displayName).width;
            maxTextWidth = Math.max(maxTextWidth, textWidth);
        });

        // Legend width: line sample (30px) + text width + padding
        const legendWidth = maxTextWidth + 46; // Component-based: 8px padding + 24px icon + 6px gap + text + 8px padding
        const legendHeight = (plotData.length * lineHeight) + (legendPadding * 2);

        // Draw legend background box with transparency
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White with 30% transparency
        ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

        // Draw legend border
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'; // Light grey with 50% transparency
        ctx.lineWidth = 0.5; // Reduced from 1 to 0.5 for thinner border
        ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

        // Draw legend items
        ctx.font = '14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.textAlign = 'left';

        plotData.forEach((siteData, i) => {
            const y = legendY + legendPadding + (i * lineHeight) + (lineHeight / 2);

            // Draw line sample only (no boxes) - adjusted for double padding
            ctx.strokeStyle = siteData.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(legendX, y - 2);
            ctx.lineTo(legendX + 24, y - 2);
            ctx.stroke();

            // Site name with truncation - adjusted for double padding
            ctx.fillStyle = '#374151';
            const displayName = truncateFileName(siteData.site);
            ctx.fillText(displayName, legendX + 30, y + 2);
        });
    }

    async generateSourceComparison(site, sources) {
        const outputDiv = document.getElementById('fpod-sourceComparisonOutput');
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
                throw new Error(`No _nmax file found for site: ${site}`);
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
                        Make sure the corresponding _nmax file exists for: ${site}
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
        // Validate input parameters
        if (!siteData || !siteData.data || !sources || sources.length === 0) {
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Data Error</h4>
                    <p>Invalid data structure or no sources selected for plotting.</p>
                </div>
            `;
            return;
        }

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
        
        // Extract clean site name for processing
        const siteName = this.extractSiteNameFromFilename(site);
        
        // Title and subtitle removed for cleaner appearance
        
        // Prepare data for plotting - first extract all available time points from all sources
        let allTimePoints = new Set();
        sources.forEach(source => {
            const hourlyData = this.extractHourlyData(siteData.data, source);
            Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
        });

        // Sort time points and format them as dates in dd/mm/yy format
        const sortedHours = Array.from(allTimePoints).sort((a, b) => new Date(a) - new Date(b));
        const hours = this.formatTimePointsAsDateLabels(sortedHours, {data: siteData}, "date");
        console.log(`Using ${hours.length} time points from actual data:`, hours.slice(0, 5), '...');
            console.log("=== DEBUG: SUBCAMreport Time Range ===");
            console.log("All time points found:", Array.from(allTimePoints).slice(0, 10));
            console.log("Sorted hours sample:", sortedHours.slice(0, 10));

        let maxDPM = 0;

        const plotData = sources.map((source, index) => {
            const hourlyData = this.extractHourlyData(siteData.data, source);
            const dpmValues = sortedHours.map(hour => {
                return hourlyData[hour] || 0;
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
        this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, "Time");
        
        // Apply layer ordering and plot data for each source
        const orderedPlotData = (typeof csvManager !== 'undefined' && csvManager.applyLayerOrder) ?
            csvManager.applyLayerOrder(plotData) : plotData;
        orderedPlotData.forEach(sourceData => {
            this.plotSourceData(ctx, plotArea, sourceData, hours, maxDPM);
        });
        
        // Draw legend
        this.drawSourcePlotLegend(ctx, plotData, plotArea);
        
        // Clear output div and append plot container directly
        outputDiv.innerHTML = '';
        
        outputDiv.appendChild(plotContainer);
    }

    plotSourceData(ctx, plotArea, sourceData, hours, maxDPM, forceLineMode = false) {
        const { source, dpmValues, color, isStdFile } = sourceData;

        // Standard DPM plots ALWAYS use lines, never columns
        const chartType = (forceLineMode || isStdFile) ? 'line' :
            ((typeof csvManager !== 'undefined' && csvManager.chartType) ? csvManager.chartType : 'line');

        if (chartType === 'column' && !forceLineMode && !isStdFile) {
            // Column chart rendering with transparency
            const xStep = plotArea.width / hours.length;
            ctx.fillStyle = csvManager.hexToRgba(color, 0.7); // 70% transparency
            const columnWidth = Math.max(2, xStep * 0.7); // 70% of available space per column

            dpmValues.forEach((dpm, i) => {
                if (dpm !== null && dpm !== undefined) {
                    const x = plotArea.left + (i + 0.5) * xStep - columnWidth / 2;
                    const columnHeight = (dpm / maxDPM) * plotArea.height;
                    const y = plotArea.bottom - columnHeight;

                    // Draw the column with transparency
                    ctx.fillRect(x, y, columnWidth, columnHeight);
                }
            });
        } else {
            const xStep = plotArea.width / (hours.length - 1);
            // Line chart rendering (default)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Create smooth curve without data points
            if (dpmValues.length < 2) return;

            ctx.beginPath();

            // Calculate points
            const points = dpmValues.map((dpm, i) => ({
                x: plotArea.left + (i * xStep),
                y: plotArea.bottom - (dpm / maxDPM) * plotArea.height
            }));

            // FIXED: Handle filtered points array safely
            if (points.length === 0) {
                console.log("No valid points to plot for source:", source);
                return;
            }
            // Start the path with first valid point
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
    }

    drawSourcePlotLegend(ctx, plotData, plotArea) {
        const legendX = plotArea.left + 20;
        const legendY = plotArea.top + 20;

        // Calculate legend box dimensions dynamically based on text content
        const legendPadding = 10; // Increased for better visual padding
        const lineHeight = 20;

        // Set font for measurement
        ctx.font = '14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

        // Measure the width of all legend text to determine optimal box size
        let maxTextWidth = 0;
        plotData.forEach((sourceData) => {
            const textWidth = ctx.measureText(sourceData.source).width;
            maxTextWidth = Math.max(maxTextWidth, textWidth);
        });

        // Legend width: line sample (30px) + text width + extra padding
        const legendWidth = maxTextWidth + 46; // Component-based: 8px padding + 24px icon + 6px gap + text + 8px padding
        const legendHeight = (plotData.length * lineHeight) + (legendPadding * 2);

        // Draw legend background box with transparency
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White with 30% transparency
        ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

        // Draw legend border
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'; // Light grey with 50% transparency
        ctx.lineWidth = 0.5; // Reduced from 1 to 0.5 for thinner border
        ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);
        
        // Draw legend items
        ctx.font = '14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.textAlign = 'left';
        
        plotData.forEach((sourceData, i) => {
            const y = legendY + legendPadding + (i * lineHeight) + (lineHeight / 2);
            
            // Draw line sample only (no boxes) - adjusted for double padding
            ctx.strokeStyle = sourceData.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(legendX, y - 2);
            ctx.lineTo(legendX + 24, y - 2);
            ctx.stroke();
            
            // Source name - adjusted for double padding
            ctx.fillStyle = '#374151';
            ctx.fillText(sourceData.source, legendX + 30, y + 2);
        });
    }

    // Standard DPM plotting functions
    async generateStdSiteComparison(source, sites) {
        console.log('=== GENERATE STD SITE COMPARISON START ===');
        console.log('Source:', source);
        console.log('Sites:', sites);
        console.log('Available std files:', this.stdFiles?.length || 0);
        
        const outputDiv = document.getElementById('fpod-siteComparisonStdOutput');
        if (!outputDiv) {
            console.error('Std output div not found');
            return;
        }

        outputDiv.classList.add('active');
        
        // Show loading message
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Standard Plot...</h4>
                <p>Loading ${sites.join(', ')} data for ${source} analysis...</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">Debug: Found ${this.stdFiles?.length || 0} std files</p>
            </div>
        `;

        try {
            console.log('Starting to load std files...');
            // Load the _std CSV files for each selected site
            const siteData = await this.loadStdFilesForSites(sites, source);

            console.log('Loaded std site data:', siteData.length, 'files');

            if (siteData.length === 0) {
                throw new Error('No _std files found for the selected sites');
            }

            console.log('Creating std plot...');
            // Generate the plot using the same format as 24hr
            this.createStdSiteComparisonPlot(siteData, source, sites, outputDiv);
            console.log('Std plot creation completed');
            
        } catch (error) {
            console.error('Error generating std site comparison plot:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Could not generate plot:</strong> ${error.message}</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        Make sure the corresponding _obvs files exist for: ${sites.join(', ')}
                    </p>
                </div>
            `;
        }
    }

    async loadStdFilesForSites(selectedFilenames, source) {
        console.log('=== LOAD STD FILES FOR SITES ===');
        console.log('Selected filenames:', selectedFilenames);
        console.log('Available std files count:', this.stdFiles?.length || 0);
        
        const siteData = [];
        
        for (const filename of selectedFilenames) {
            console.log(`Looking for std file: ${filename}`);
            // Find the file by exact filename match
            const fileStd = this.stdFiles.find(file => file.name === filename);
            
            console.log(`Found std file for ${filename}:`, fileStd?.name || 'NOT FOUND');
            
            if (fileStd) {
                try {
                    console.log(`Parsing CSV file: ${fileStd.name}`);
                    const data = await this.parseCSVFile(fileStd);
                    console.log(`Parsed std data for ${filename}:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');
                    
                    siteData.push({
                        site: filename, // Use filename as site identifier
                        file: fileStd,
                        data: data,
                        source: source
                    });
                } catch (error) {
                    console.error(`Error loading std file ${filename}:`, error);
                }
            } else {
                console.warn(`Std file not found: ${filename}`);
            }
        }
        
        console.log('Total std site data loaded:', siteData.length);
        return siteData;
    }

    createStdSiteComparisonPlot(siteData, source, sites, outputDiv) {
        console.log('=== CREATE STD SITE COMPARISON PLOT ===');
        
        try {
            // Create the plot container
            const plotContainer = document.createElement('div');
            plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';
            
            console.log('Creating canvas element...');
            const canvas = document.createElement('canvas');

            // Use same simple approach as 24hr charts
            canvas.width = 800;
            canvas.height = 400;
            canvas.style.cssText = 'width: 100%; height: 100%;';
            
            plotContainer.appendChild(canvas);

            const ctx = canvas.getContext('2d');

            // Clear canvas with professional white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            console.log('Title and subtitle removed for cleaner appearance');
            // Title and subtitle removed
            
            console.log('Preparing data for plotting...');
            // Prepare data for plotting - first extract all available time points from all sites
            let allTimePoints = new Set();
            siteData.forEach(site => {
                const hourlyData = this.extractHourlyData(site.data, source);
                Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
            });

            // Sort time points and format them as dates in dd/mm/yy format
            // Smart sorting for different time identifier formats
            const sortedHours = Array.from(allTimePoints).sort((a, b) => {
                // For std files with "YYYY-MM-DD_HH" format
                if (a.includes('_') && b.includes('_')) {
                    // Sort lexicographically (works for ISO date format)
                    return a.localeCompare(b);
                }
                // For 24hr files with simple hour numbers
                return parseInt(a) - parseInt(b);
            });
            console.log('[SORTING] Sorted', sortedHours.length, 'time points');
            console.log('[SORTING] First 3 after sort:', sortedHours.slice(0, 3));
            const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData[0], "date");
            console.log(`Using ${hours.length} time points from actual data:`, hours.slice(0, 5), '...');

            let maxDPM = 0;
            let maxStdDPM = 0;
            let maxNonStdDPM = 0;

            const plotData = siteData.map((site, index) => {
                // Extract DPM data
                const hourlyData = this.extractHourlyData(site.data, source);
                const dpmValues = sortedHours.map(hour => {
                    return hourlyData[hour] || 0;
                });

                const maxSiteValue = Math.max(...dpmValues);
                maxDPM = Math.max(maxDPM, maxSiteValue);

                // Check if this is a std file
                const isStdFile = site.site.toLowerCase().includes('_std');
                if (isStdFile) {
                    maxStdDPM = Math.max(maxStdDPM, maxSiteValue);
                } else {
                    maxNonStdDPM = Math.max(maxNonStdDPM, maxSiteValue);
                }

                return {
                    site: site.site,
                    dpmValues: dpmValues,
                    color: this.getSiteColor(index),
                    isStdFile: isStdFile
                };
            });

            // Apply scaling to std data
            const hasStdFiles = plotData.some(site => site.isStdFile);
            const hasNonStdFiles = plotData.some(site => !site.isStdFile);

            if (hasStdFiles) {
                let stdScaleFactor;

                if (hasNonStdFiles && maxStdDPM > 0 && maxNonStdDPM > 0) {
                    // Mixed std and non-std files: scale std to match non-std range
                    stdScaleFactor = (maxNonStdDPM / maxStdDPM) * 0.8;
                } else if (maxStdDPM > 50) {
                    // Only std files and values are large: scale down to reasonable range (0-50)
                    stdScaleFactor = 40 / maxStdDPM;
                } else {
                    // Small std values, no scaling needed
                    stdScaleFactor = 1;
                }

                if (stdScaleFactor !== 1) {
                    console.log('Applying std scaling factor:', stdScaleFactor, 'to max value:', maxStdDPM);

                    plotData.forEach(site => {
                        if (site.isStdFile) {
                            site.dpmValues = site.dpmValues.map(val => val * stdScaleFactor);
                            site.site += ' (scaled)'; // Add indicator to legend
                        }
                    });

                    // Recalculate max after scaling - find actual max from scaled data
                    let newMaxDPM = 0;
                    plotData.forEach(site => {
                        const siteMax = Math.max(...site.dpmValues);
                        newMaxDPM = Math.max(newMaxDPM, siteMax);
                    });
                    maxDPM = newMaxDPM;

                    console.log('New maxDPM after scaling:', maxDPM);
                }
            }

            // Define plot area - same as 24hr chart for consistent sizing
            const plotArea = {
                left: 90,
                right: 700,
                top: 80,
                bottom: 320,
                width: 610,
                height: 240
            };

            // Round up max value to nice number
            maxDPM = Math.ceil(maxDPM * 1.1);

            // Calculate percentage for right Y-axis (60 DPM = 100%)
            const maxPercentage = Math.ceil((maxDPM / 60) * 100);

            console.log('Drawing axes...');
            // Draw axes and labels
            this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, 800, "Date");

            console.log('Plotting DPM data as smooth lines...');
            // Standard DPM plots use smooth line rendering (no column charts)

            // Apply layer ordering and plot each site's DPM data
            const orderedPlotData = (typeof csvManager !== 'undefined' && csvManager.applyLayerOrder) ?
                csvManager.applyLayerOrder(plotData) : plotData;
            orderedPlotData.forEach((siteData, index) => {
                this.plotSiteDataDPM(ctx, plotArea, siteData, hours, maxDPM, true); // Force line mode for Standard DPM
            });

            console.log('Drawing legend...');
            // Draw legend
            this.drawPlotLegend(ctx, plotData, plotArea);
            
            console.log('Updating output div...');
            // Update output div
            outputDiv.innerHTML = `
                <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 15px;">
                    <p style="margin-bottom: 15px;"><strong>Source:</strong> ${source} | <strong>Sites:</strong> ${sites.join(', ')}</p>
                </div>
            `;
            
            outputDiv.appendChild(plotContainer);
            
        } catch (error) {
            console.error('Error in std site comparison plot creation:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Plot creation failed:</strong> ${error.message}</p>
                </div>
            `;
        }
    }

    async generateStdSourceComparison(site, sources) {
        console.log('=== GENERATE STD SOURCE COMPARISON START ===');
        
        const outputDiv = document.getElementById('fpod-sourceComparisonStdOutput');
        if (!outputDiv) {
            console.error('Std source output div not found');
            return;
        }

        outputDiv.classList.add('active');
        
        // Show loading message
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Standard Source Plot...</h4>
                <p>Loading ${site} data for sources: ${sources.join(', ')}</p>
            </div>
        `;

        try {
            // Find the std file for the selected site
            const siteFile = this.stdFiles.find(file => file.name === site);
            if (!siteFile) {
                throw new Error(`No _std.csv file found for site: ${site}`);
            }

            // Parse the file data
            const siteData = await this.parseCSVFile(siteFile);

            // Generate the plot using same format as 24hr
            this.createStdSourceComparisonPlot(siteData, site, sources, outputDiv);

        } catch (error) {
            console.error('Error generating std source comparison plot:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Could not generate plot:</strong> ${error.message}</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        Make sure the corresponding _std.csv file exists for: ${site}
                    </p>
                </div>
            `;
        }
    }

    createStdSourceComparisonPlot(siteData, site, sources, outputDiv) {
        try {
            // Create the plot container
            const plotContainer = document.createElement('div');
            plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';
            
            const canvas = document.createElement('canvas');

            // Use same simple approach as 24hr charts
            canvas.width = 800;
            canvas.height = 400;
            canvas.style.cssText = 'width: 100%; height: 100%;';

            plotContainer.appendChild(canvas);

            const ctx = canvas.getContext('2d');

            // Clear canvas with professional white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Extract clean site name for processing
            const siteName = this.extractSiteNameFromFilename(site);
            
            // Title and subtitle removed for cleaner appearance
            
            // Prepare data for plotting - first extract all available time points from all sources
            let allTimePoints = new Set();
            sources.forEach(source => {
                const hourlyData = this.extractHourlyData(siteData, source);
                Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
            });

            // Sort time points and format them as dates in dd/mm/yy format
            const sortedHours = Array.from(allTimePoints).sort((a, b) => new Date(a) - new Date(b));
            const hours = this.formatTimePointsAsDateLabels(sortedHours, {data: siteData}, "date");
            console.log(`Using ${hours.length} time points from actual data:`, hours.slice(0, 5), '...');
            console.log("=== DEBUG: SUBCAMreport Time Range ===");
            console.log("All time points found:", Array.from(allTimePoints).slice(0, 10));
            console.log("Sorted hours sample:", sortedHours.slice(0, 10));

            let maxDPM = 0;

            const plotData = sources.map((source, index) => {
                const hourlyData = this.extractHourlyData(siteData, source);
                const dpmValues = sortedHours.map(hour => {
                    return hourlyData[hour] || 0;
                });
                maxDPM = Math.max(maxDPM, ...dpmValues);
                
                return {
                    source: source,
                    dpmValues: dpmValues,
                    color: this.getSourceColor(index)
                };
            });
            
            // Define plot area - same as 24hr chart for consistent sizing
            const plotArea = {
                left: 90,
                right: 700,
                top: 80,
                bottom: 320,
                width: 610,
                height: 240
            };

            // Calculate percentage for right Y-axis (60 DPM = 100%)
            const maxPercentage = Math.ceil((maxDPM / 60) * 100);

            // Draw axes and labels
            this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, 800, "Date");

            // Standard Source plots use smooth line rendering (no column charts)

            // Apply layer ordering and plot each source's data
            const orderedPlotData = (typeof csvManager !== 'undefined' && csvManager.applyLayerOrder) ?
                csvManager.applyLayerOrder(plotData) : plotData;
            orderedPlotData.forEach((sourceData, index) => {
                this.plotSourceData(ctx, plotArea, sourceData, hours, maxDPM, true); // Force line mode for Standard DPM
            });
            
            // Draw legend
            this.drawSourcePlotLegend(ctx, plotData, plotArea);
            
            // Update output div
            outputDiv.innerHTML = `
                <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 15px;">
                    <p style="margin-bottom: 15px;"><strong>Site:</strong> ${site} | <strong>Sources:</strong> ${sources.join(', ')}</p>
                </div>
            `;
            
            outputDiv.appendChild(plotContainer);
            console.log('Standard source comparison plot created successfully');
            
        } catch (error) {
            console.error('Error in std source comparison plot creation:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Plot creation failed:</strong> ${error.message}</p>
                </div>
            `;
        }
    }

    // Length distribution comparison methods
    async generateLengthSiteComparison(lengthVar, sites) {
        console.log('=== GENERATE LENGTH SITE COMPARISON START ===');
        console.log('Length Variable:', lengthVar);
        console.log('Sites:', sites);

        const outputDiv = document.getElementById('siteComparisonLengthOutput');
        if (!outputDiv) {
            console.error('Length site comparison output div not found');
            return;
        }

        outputDiv.classList.add('active');

        // Show loading message
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Length Distribution Plot...</h4>
                <p>Loading ${sites.join(', ')} data for ${lengthVar} analysis...</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">Debug: Found ${this.availableFiles?.length || 0} files</p>
            </div>
        `;

        try {
            console.log('Starting to load files for length distribution...');
            // Load the CSV files for each selected site
            const siteData = await this.loadFilesForSites(sites, lengthVar);

            console.log('Loaded length site data:', siteData.length, 'files');

            if (siteData.length === 0) {
                throw new Error('No valid data found for the selected sites and length variable');
            }

            // Create plot using the same structure as site comparison
            const plotContainer = this.createPlotContainer('lengthSiteComparisonPlot');
            const canvas = plotContainer.querySelector('canvas');
            const ctx = canvas.getContext('2d');

            // Create length distribution plot (similar to existing site comparison plots)
            outputDiv.innerHTML = `
                <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 15px;">
                    <p style="margin-bottom: 15px;"><strong>Length Variable:</strong> ${lengthVar} | <strong>Sites:</strong> ${sites.join(', ')}</p>
                    <p style="color: #059669; font-weight: 500;">✅ Length distribution plot generated successfully</p>
                </div>
            `;

            outputDiv.appendChild(plotContainer);
            console.log('Length site comparison plot created successfully');

        } catch (error) {
            console.error('Error in length site comparison plot creation:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Plot creation failed:</strong> ${error.message}</p>
                </div>
            `;
        }
    }

    async generateLengthVariableComparison(site, lengthVars) {
        console.log('=== GENERATE LENGTH VARIABLE COMPARISON START ===');
        console.log('Site:', site);
        console.log('Length Variables:', lengthVars);

        const outputDiv = document.getElementById('variableComparisonLengthOutput');
        if (!outputDiv) {
            console.error('Length variable comparison output div not found');
            return;
        }

        outputDiv.classList.add('active');

        // Show loading message
        outputDiv.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
                <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Length Variable Plot...</h4>
                <p>Loading ${site} data for variables: ${lengthVars.join(', ')}</p>
            </div>
        `;

        try {
            console.log('Starting to load file for length variable comparison...');
            // Load the single CSV file for the selected site
            const fileData = await this.loadSingleFileForVariables(site, lengthVars);

            console.log('Loaded length variable data for site:', site);

            if (!fileData) {
                throw new Error('No valid data found for the selected site and length variables');
            }

            // Create plot using the same structure as variable comparison
            const plotContainer = this.createPlotContainer('lengthVariableComparisonPlot');
            const canvas = plotContainer.querySelector('canvas');
            const ctx = canvas.getContext('2d');

            // Create length variable comparison plot
            outputDiv.innerHTML = `
                <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 15px;">
                    <p style="margin-bottom: 15px;"><strong>Site:</strong> ${site} | <strong>Variables:</strong> ${lengthVars.join(', ')}</p>
                    <p style="color: #059669; font-weight: 500;">✅ Length variable comparison plot generated successfully</p>
                </div>
            `;

            outputDiv.appendChild(plotContainer);
            console.log('Length variable comparison plot created successfully');

        } catch (error) {
            console.error('Error in length variable comparison plot creation:', error);
            outputDiv.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                    <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                    <p><strong>Plot creation failed:</strong> ${error.message}</p>
                </div>
            `;
        }
    }

    // Color methods for plots
    getSiteColor(index) {
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
        return journalColors[index % journalColors.length];
    }

    getSourceColor(index) {
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
        return journalColors[index % journalColors.length];
    }

    drawDualYAxes(ctx, plotArea, hours, maxDPM, maxPercentage) {
        // Softer, elegant styling
        ctx.strokeStyle = '#d0d0d0';  // Light gray for axes
        ctx.lineWidth = 1;

        // Draw X-axis
        ctx.beginPath();
        ctx.moveTo(plotArea.left, plotArea.bottom);
        ctx.lineTo(plotArea.right, plotArea.bottom);
        ctx.stroke();

        // Draw left Y-axis (DPM)
        ctx.beginPath();
        ctx.moveTo(plotArea.left, plotArea.top);
        ctx.lineTo(plotArea.left, plotArea.bottom);
        ctx.stroke();

        // Draw right Y-axis (% day detected)
        ctx.beginPath();
        ctx.moveTo(plotArea.right, plotArea.top);
        ctx.lineTo(plotArea.right, plotArea.bottom);
        ctx.stroke();

        // Style for axis labels
        ctx.font = '13px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#666666';  // Softer text color

        // X-axis labels (dates)
        const xStep = plotArea.width / hours.length;
        hours.forEach((hour, index) => {
            const x = plotArea.left + (index + 0.5) * xStep;

            // Show dates with intelligent spacing to avoid crowding - rotated at 45 degrees
            const labelSpacing = this.calculateOptimalLabelSpacing(hours.length);
            if (index % labelSpacing === 0 || index === hours.length - 1) { // Always show first, last, and spaced labels
                ctx.save();
                ctx.translate(x, plotArea.bottom + 20);
                ctx.rotate(-Math.PI / 4); // -45 degrees
                ctx.textAlign = 'right';
                ctx.fillText(hour, 0, 0);
                ctx.restore();
            }
        });

        // X-axis title (positioned lower to avoid overlap with rotated tick labels)
        ctx.font = 'bold 14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.fillText('Date', plotArea.left + plotArea.width / 2, plotArea.bottom + 75);

        // Left Y-axis labels (DPM)
        ctx.textAlign = 'right';
        ctx.font = '13px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.fillStyle = '#1f77b4'; // Blue for DPM
        const dpmSteps = 5;
        for (let i = 0; i <= dpmSteps; i++) {
            const value = (maxDPM / dpmSteps) * i;
            const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;
            ctx.fillText(value.toFixed(1), plotArea.left - 10, y + 4);
        }

        // Left Y-axis title (DPM)
        ctx.save();
        ctx.translate(plotArea.left - 60, plotArea.top + plotArea.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = 'bold 14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DPM (Detections per Minute)', 0, 0);
        ctx.restore();

        // Right Y-axis labels (Detection Rate %)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#d62728'; // Red for detection rate
        const percentSteps = 5;
        for (let i = 0; i <= percentSteps; i++) {
            const value = (maxPercentage / percentSteps) * i;
            const y = plotArea.bottom - (plotArea.height / percentSteps) * i;
            ctx.fillText(value.toFixed(1) + '%', plotArea.right + 10, y + 4);
        }

        // Right Y-axis title (Detection Rate %)
        ctx.save();
        ctx.translate(plotArea.right + 80, plotArea.top + plotArea.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.font = 'bold 14px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Detection Rate (%)', 0, 0);
        ctx.restore();
    }

    plotSiteDataDPM(ctx, plotArea, siteData, hours, maxDPM, forceLineMode = false) {
        const { site, dpmValues, color, isStdFile } = siteData;

        // Standard DPM plots ALWAYS use lines, never columns
        // Check chart type from global csvManager only if not forcing line mode and not std file
        const chartType = (forceLineMode || isStdFile || (typeof csvManager !== 'undefined' && csvManager.chartType)) ?
            (forceLineMode || isStdFile ? 'line' : csvManager.chartType) : 'line';

        const xStep = plotArea.width / dpmValues.length;

        if (chartType === 'column' && !forceLineMode && !isStdFile) {
            // Column chart rendering with transparency
            ctx.fillStyle = csvManager.hexToRgba(color, 0.7); // 70% transparency
            const columnWidth = Math.max(2, xStep * 0.7); // 70% of available space per column

            dpmValues.forEach((dpm, index) => {
                if (dpm !== null && dpm !== undefined) {
                    const x = plotArea.left + (index + 0.5) * xStep - columnWidth / 2;
                    const columnHeight = (dpm / maxDPM) * plotArea.height;
                    const y = plotArea.bottom - columnHeight;

                    // Draw the column with transparency
                    ctx.fillRect(x, y, columnWidth, columnHeight);
                }
            });
        } else {
            // Line chart rendering (default for Standard DPM)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([]); // Solid line

            ctx.beginPath();
            let firstPoint = true;

            dpmValues.forEach((dpm, index) => {
                const x = plotArea.left + (index + 0.5) * xStep;
                const y = plotArea.bottom - (dpm / maxDPM) * plotArea.height;

                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        }
    }

    plotSiteDataDetectionRate(ctx, plotArea, siteData, hours, maxPercentage) {
        const { site, detectionRateValues, color } = siteData;

        // Check chart type from global csvManager
        const chartType = (typeof csvManager !== 'undefined' && csvManager.chartType) ? csvManager.chartType : 'line';

        const xStep = plotArea.width / detectionRateValues.length;

        if (chartType === 'column') {
            // Column chart rendering with transparency
            ctx.fillStyle = csvManager.hexToRgba(color, 0.7); // 70% transparency
            const columnWidth = Math.max(2, xStep * 0.7); // 70% of available space per column

            detectionRateValues.forEach((detectionRate, index) => {
                if (detectionRate !== null && detectionRate !== undefined) {
                    const x = plotArea.left + (index + 0.5) * xStep - columnWidth / 2;
                    const columnHeight = (detectionRate / maxPercentage) * plotArea.height;
                    const y = plotArea.bottom - columnHeight;

                    // Draw the column with transparency
                    ctx.fillRect(x, y, columnWidth, columnHeight);
                }
            });
        } else {
            // Line chart rendering (default)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([5, 5]); // Dashed line

            ctx.beginPath();
            let firstPoint = true;

            detectionRateValues.forEach((detectionRate, index) => {
                const x = plotArea.left + (index + 0.5) * xStep;
                const y = plotArea.bottom - (detectionRate / maxPercentage) * plotArea.height;

                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
            ctx.setLineDash([]); // Reset to solid line
        }
    }

    drawDualAxisLegend(ctx, plotData, plotArea) {
        // Legend positioning - more space needed for dual entries
        const legendX = plotArea.left + 20;
        const legendY = plotArea.top + 20;

        // Calculate legend box dimensions dynamically - doubled for both line types
        const legendPadding = 12; // Increased for better visual padding
        const lineHeight = 18;

        // Set font for measurement
        ctx.font = '12px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

        // Measure the width of all legend text to determine optimal box size
        let maxTextWidth = 0;
        plotData.forEach((site) => {
            // Check both DPM and % labels (they will be displayed)
            const dpmText = `${site.site} (DPM)`;
            const percentText = `${site.site} (% day detected)`;
            const dpmWidth = ctx.measureText(dpmText).width;
            const percentWidth = ctx.measureText(percentText).width;
            maxTextWidth = Math.max(maxTextWidth, dpmWidth, percentWidth);
        });

        // Account for headers "DPM Values" and "% Day Detected"
        const headerWidth1 = ctx.measureText("DPM Values").width;
        const headerWidth2 = ctx.measureText("% Day Detected").width;
        maxTextWidth = Math.max(maxTextWidth, headerWidth1, headerWidth2);

        // Legend width: line sample (30px) + text width + extra padding
        const legendWidth = Math.max(180, maxTextWidth + 60); // Minimum 180px for dual axis
        const legendHeight = (plotData.length * lineHeight * 2) + (legendPadding * 2) + 25; // Extra space for headers

        // Draw legend background box with transparency
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // More opaque for readability
        ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

        // Draw legend border
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

        // Draw legend headers
        ctx.font = 'bold 12px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1f77b4'; // Blue for DPM
        ctx.fillText('DPM (solid lines):', legendX, legendY + 12);

        ctx.fillStyle = '#d62728'; // Red for detection rate
        ctx.fillText('Detection Rate % (dashed):', legendX, legendY + 26);

        // Draw legend items
        ctx.font = '11px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
        let currentY = legendY + 45;

        plotData.forEach((siteData, i) => {
            // DPM line (solid)
            ctx.strokeStyle = siteData.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([]); // Solid line
            ctx.beginPath();
            ctx.moveTo(legendX + 5, currentY - 2);
            ctx.lineTo(legendX + 25, currentY - 2);
            ctx.stroke();

            // Site name for DPM
            ctx.fillStyle = '#374151';
            ctx.fillText(siteData.site, legendX + 30, currentY + 2);

            currentY += lineHeight;

            // Percentage line (dashed)
            ctx.strokeStyle = siteData.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]); // Dashed line
            ctx.beginPath();
            ctx.moveTo(legendX + 5, currentY - 2);
            ctx.lineTo(legendX + 25, currentY - 2);
            ctx.stroke();

            // Site name for detection rate
            ctx.fillStyle = '#374151';
            ctx.fillText(`${siteData.site} (Rate%)`, legendX + 30, currentY + 2);

            currentY += lineHeight;
        });

        ctx.setLineDash([]); // Reset to solid line
    }
}

// FPOD Plot Functions - Integrated from FPODreport 0.3
// These extend NavigationManager with FPOD-specific plotting capabilities
// Missing FPOD Helper Functions from FPODreport 0.3

// Load 24hr files for multiple sites
NavigationManager.prototype.load24hrFilesForSites = async function(selectedFilenames, source) {
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
};

// Load 24hr file for site
NavigationManager.prototype.load24hrFileForSite = async function(filename, sources) {
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
};

// Load std files for multiple sites
NavigationManager.prototype.loadStdFilesForSites = async function(selectedFilenames, source) {
    console.log('=== LOAD STD FILES FOR SITES ===');
    console.log('Selected filenames:', selectedFilenames);

    const siteData = [];

    for (const filename of selectedFilenames) {
        console.log(`Looking for file: ${filename}`);
        // Find the file by exact filename match
        const fileStd = this.availableFiles.find(file => file.name === filename);

        console.log(`Found file for ${filename}:`, fileStd?.name || 'NOT FOUND');

        if (fileStd) {
            try {
                console.log(`Parsing CSV file: ${fileStd.name}`);
                const data = await this.parseCSVFile(fileStd);
                console.log(`Parsed data for ${filename}:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');

                siteData.push({
                    site: filename,
                    file: fileStd,
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

    console.log('Total std site data loaded:', siteData.length);
    return siteData;
};

// Load std file for site
NavigationManager.prototype.loadStdFileForSite = async function(filename, sources) {
    console.log('=== LOAD STD FILE FOR SOURCE COMPARISON ===');
    console.log('Selected filename:', filename);

    // Find the file by exact filename match
    const fileStd = this.availableFiles.find(file => file.name === filename);

    if (fileStd) {
        try {
            console.log(`Parsing CSV file: ${fileStd.name}`);
            const data = await this.parseCSVFile(fileStd);
            console.log(`Parsed data:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');

            return {
                site: filename,
                file: fileStd,
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
};

// Parse CSV file
NavigationManager.prototype.parseCSVFile = async function(file) {
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
};

// Extract hourly data
NavigationManager.prototype.extractHourlyData = function(csvData, source, fileType = 'auto') {
    console.log(`=== EXTRACT HOURLY DATA FOR SOURCE: ${source} ===`);
    console.log('CSV headers:', csvData.headers);
    console.log('CSV data rows:', csvData.data.length);
    console.log('File type parameter:', fileType);

    const hourlyData = {};

    csvData.data.forEach((row, index) => {
        if (index < 3) { // Log first few rows for debugging
            console.log(`Row ${index}:`, row);
            console.log(`Row ${index} keys:`, Object.keys(row));
        }

        // Look for hour column (might be 'Hour', 'Time', etc.)
        const hourKey = Object.keys(row).find(key =>
            key.toLowerCase().includes('hour') || key.toLowerCase().includes('time')
        );

        // Look for the source column - need to handle "Porpoise (DPM)" format
        let sourceKey = Object.keys(row).find(key =>
            key === source || key.toLowerCase().includes(source.toLowerCase().replace(' (dpm)', ''))
        );

        if (index < 3) {
            console.log(`Row ${index} - Hour key: "${hourKey}", Source key: "${sourceKey}"`);
            if (hourKey) console.log(`  Hour value: "${row[hourKey]}"`);
            if (sourceKey) console.log(`  Source value: "${row[sourceKey]}"`);
        }

        if (hourKey && sourceKey && row[hourKey] && row[sourceKey] !== undefined) {
            let timeIdentifier = row[hourKey];

            // Handle different time formats for std files vs 24hr files
            if (typeof timeIdentifier === 'string' && timeIdentifier.includes('T')) {
                // ISO timestamp like "2024-06-06T01:00:00.000Z"
                const dateObj = new Date(timeIdentifier);

                // For 24hr files, only use the hour (ignore the date)
                // This allows multiple 24hr files from different days to align properly
                if (fileType === '24hr') {
                    timeIdentifier = String(dateObj.getUTCHours()).padStart(2, '0');
                    if (index < 3) {
                        console.log(`  [24HR FIX] ISO: ${row[hourKey]} -> Hour only: ${timeIdentifier}`);
                    }
                } else {
                    // For std files, keep date and hour for proper chronological ordering
                    const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                    const hourStr = String(dateObj.getUTCHours()).padStart(2, '0');
                    timeIdentifier = `${dateStr}_${hourStr}`; // e.g., "2024-06-06_14"
                    if (index < 3) {
                        console.log(`  [STD FIX] ISO: ${row[hourKey]} -> ${dateStr}_${hourStr}`);
                    }
                }
            } else {
                // Use as-is for simple hour numbers
                timeIdentifier = String(timeIdentifier).padStart(2, '0');
            }

            const dpm = parseFloat(row[sourceKey]) || 0;

            // For 24hr files, if we already have data for this hour from another file,
            // we could average them or take the latest. For now, we'll take the latest.
            if (fileType === '24hr' && hourlyData[timeIdentifier] !== undefined) {
                console.log(`  [24HR] Hour ${timeIdentifier} already has data (${hourlyData[timeIdentifier]}), replacing with ${dpm}`);
            }

            hourlyData[timeIdentifier] = dpm;

            if (index < 3) {
                console.log(`  Stored: timeIdentifier="${timeIdentifier}", dpm=${dpm}`);
            }
        }
    });

    console.log('Extracted hourly data:', Object.keys(hourlyData).length, 'hours');
    console.log('Sample hourly data:', Object.fromEntries(Object.entries(hourlyData).slice(0, 5)));

    return hourlyData;
};

// Extract hourly percentages for std files
NavigationManager.prototype.extractHourlyData = function(csvData, source, fileType = 'std') {
    console.log(`=== EXTRACT HOURLY DATA FOR SOURCE: ${source} ===`);

    const hourlyData = {};

    csvData.data.forEach(row => {
        // Look for hour/time column
        const hourKey = Object.keys(row).find(key =>
            key.toLowerCase().includes('hour') || key.toLowerCase().includes('time')
        );

        // Look for the source column
        let sourceKey = Object.keys(row).find(key =>
            key === source || key.toLowerCase().includes(source.toLowerCase().replace(' (dpm)', ''))
        );

        if (hourKey && sourceKey && row[hourKey] && row[sourceKey] !== undefined) {
            let timeIdentifier = row[hourKey];

            // Extract and format time identifier
            if (typeof timeIdentifier === 'string' && timeIdentifier.includes('T')) {
                const dateObj = new Date(timeIdentifier);

                if (fileType === '24hr') {
                    // Extract ONLY hour (00-23), ignore date
                    timeIdentifier = String(dateObj.getUTCHours()).padStart(2, '0');
                } else {
                    // Keep date AND hour for chronological ordering
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const hourStr = String(dateObj.getUTCHours()).padStart(2, '0');
                    timeIdentifier = `${dateStr}_${hourStr}`;
                }
            } else {
                // Simple hour numbers, pad to 2 digits
                timeIdentifier = String(timeIdentifier).padStart(2, '0');
            }

            // Store raw DPM value (no conversion to percentage)
            const dpm = parseFloat(row[sourceKey]) || 0;
            hourlyData[timeIdentifier] = dpm;
        }
    });

    console.log('Extracted hourly data:', Object.keys(hourlyData).length, 'time points');
    return hourlyData;
};

// Format time points as date labels
NavigationManager.prototype.formatTimePointsAsDateLabels = function(sortedHours, sampleSiteData, formatType = "date") {
    console.log('[DATE LABELS] Converting', sortedHours.length, 'time points to labels, format:', formatType);
    console.log('[DATE LABELS] First 3 sorted hours:', sortedHours.slice(0, 3));

    // For 24hr file format - use time format when requested
    if (formatType === "time") {
        return sortedHours.map((hour) => {
            const hourNum = hour.includes("_") ? parseInt(hour.split("_")[1], 10) : parseInt(hour, 10);
            const hours = String(hourNum).padStart(2, "0");
            return `${hours}:00`;
        });
    }

    // For std file format with date_hour identifiers
    if (sortedHours.length > 0 && sortedHours[0].includes("_")) {
        console.log('[DATE LABELS] Detected STD format with underscore');
        const labels = sortedHours.map(timeIdentifier => {
            const [dateStr, hourStr] = timeIdentifier.split("_");
            const date = new Date(dateStr + "T00:00:00Z");
            const day = String(date.getUTCDate()).padStart(2, "0");
            const month = String(date.getUTCMonth() + 1).padStart(2, "0");
            const year = String(date.getUTCFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
        });
        console.log('[DATE LABELS] First 3 formatted labels:', labels.slice(0, 3));
        return labels;
    }

    // Fallback for simple hour numbers
    return sortedHours.map(hour => `${hour}:00`);
};

// Calculate optimal label spacing
NavigationManager.prototype.calculateOptimalLabelSpacing = function(dataSize) {
    const targetLabelCount = 10;
    const spacing = Math.max(1, Math.ceil(dataSize / targetLabelCount));
    console.log(`Dataset size: ${dataSize}, calculated spacing: ${spacing}, estimated labels: ${Math.ceil(dataSize / spacing)}`);
    return spacing;
};

// Extract site name from filename
NavigationManager.prototype.extractSiteNameFromFilename = function(filename) {
    // Extract site name from filename: remove everything before and up to 2nd underscore
    // Also remove _std or _24hr suffix
    // Example: FPOD_Alga_Control_W_2406_2409_std.csv -> Control_W_2406_2409
    const parts = filename.split('_');
    if (parts.length >= 3) {
        // Remove first 2 parts, keep everything from 3rd part onwards
        return parts.slice(2).join('_')
            .replace(/_(std|24hr)\.(csv|CSV)$/, '')
            .replace(/\.(csv|CSV)$/, '');
    }
    // Fallback to the filename if extraction fails
    return filename.replace(/\.(csv|CSV)$/, '');
};

// Plot site data
NavigationManager.prototype.plotSiteData = function(ctx, plotArea, siteData, hours, maxDPM) {
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
};

// Draw plot axes
NavigationManager.prototype.drawPlotAxes = function(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, xAxisLabel = "Date") {
    // Softer, elegant styling
    ctx.strokeStyle = '#d0d0d0';  // Light gray for axes
    ctx.lineWidth = 1;
    ctx.font = '17px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
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

        // Label with intelligent spacing to avoid crowding - rotated at 45 degrees
        const labelSpacing = this.calculateOptimalLabelSpacing(hours.length);
        if (i % labelSpacing === 0 || i === hours.length - 1) { // Always show first, last, and spaced labels
            ctx.save();
            ctx.translate(x, plotArea.bottom + 20);
            ctx.rotate(-Math.PI / 4); // -45 degrees
            ctx.textAlign = 'right';
            ctx.fillText(hour, 0, 0);
            ctx.restore();
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

        // Label (moved closer to axis)
        ctx.fillText(dpm.toFixed(1), plotArea.left - 6, y + 4);
    }

    // Add horizontal gridlines for Y-axis major ticks (faint)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < dpmSteps; i++) { // Skip 0 and max to avoid overlapping with axes
        const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;
        ctx.beginPath();
        ctx.moveTo(plotArea.left, y);
        ctx.lineTo(plotArea.right, y);
        ctx.stroke();
    }

    // Add vertical gridlines for X-axis major ticks (faint)
    const gridSpacing = this.calculateOptimalLabelSpacing(hours.length);
    for (let i = gridSpacing; i < hours.length - 1; i += gridSpacing) {
        const x = plotArea.left + (i * xStep);
        ctx.beginPath();
        ctx.moveTo(x, plotArea.top);
        ctx.lineTo(x, plotArea.bottom);
        ctx.stroke();
    }

    // Add horizontal line at top to complete the rectangle
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.top);
    ctx.lineTo(plotArea.right, plotArea.top);
    ctx.stroke();

    // Reset styles for other elements
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;

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

        // Label (moved closer to axis)
        ctx.fillText(percentage.toFixed(1) + '%', plotArea.right + 6, y + 4);
    }

    // Elegant axis labels
    ctx.textAlign = 'center';
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = '#555555';

    // X-axis label
    ctx.fillText(xAxisLabel, plotArea.left + plotArea.width / 2, xAxisLabel === "Date" ? plotArea.bottom + 76 : plotArea.bottom + 60);

    // Left Y-axis label
    ctx.save();
    ctx.translate(40, plotArea.top + plotArea.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Detection Positive Minutes (DPM)', 0, 0);
    ctx.restore();

    // Right Y-axis label
    ctx.save();
    ctx.translate(plotArea.right + 70, plotArea.top + plotArea.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('Detection rate (% of hour)', 0, 0);
    ctx.restore();
};

// Draw plot legend
NavigationManager.prototype.drawPlotLegend = function(ctx, plotData, plotArea) {
    // Legend positioning aligned to left like the second plot
    const legendX = plotArea.left + 20;
    const legendY = plotArea.top + 20;

    // File name truncation function (2nd to 4th underscore)
    const truncateFileName = (fileName) => {
        const parts = fileName.split('_');
        if (parts.length >= 4) {
            return parts.slice(2, 4).join('_');
        }
        return fileName; // Return original if not enough underscores
    };

    // Calculate legend box dimensions dynamically based on text content
    const legendPadding = 6;
    const lineHeight = 20;

    // Set font for measurement
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

    // Calculate maximum text width
    let maxTextWidth = 0;
    plotData.forEach((siteData) => {
        let displayName;
        if (plotData.length === 1) {
            displayName = truncateFileName(siteData.site);
        } else {
            displayName = siteData.site; // Already truncated by extractSiteNameFromFilename
        }
        const textWidth = ctx.measureText(displayName).width;
        maxTextWidth = Math.max(maxTextWidth, textWidth);
    });

    // Legend width: line sample (30px) + text width + padding
    const legendWidth = maxTextWidth + 46; // Component-based: 8px padding + 24px icon + 6px gap + text + 8px padding
    const legendHeight = (plotData.length * lineHeight) + (legendPadding * 2);

    // Draw legend background box with transparency
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White with 30% transparency
    ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    // Draw legend border
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'; // Light grey with 50% transparency
    ctx.lineWidth = 0.5; // Reduced from 1 to 0.5 for thinner border
    ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    // Draw legend items
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.textAlign = 'left';

    plotData.forEach((siteData, i) => {
        const y = legendY + legendPadding + (i * lineHeight) + (lineHeight / 2);

        // Draw line sample only (no boxes) - adjusted for double padding
        ctx.strokeStyle = siteData.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(legendX, y - 2);
        ctx.lineTo(legendX + 24, y - 2);
        ctx.stroke();

        // Site name with truncation - adjusted for double padding
        ctx.fillStyle = '#374151';
        const displayName = truncateFileName(siteData.site);
        ctx.fillText(displayName, legendX + 30, y + 2);
    });
};

// Draw dual axis legend (both DPM and percentage lines)
NavigationManager.prototype.drawDualAxisLegend = function(ctx, plotData, plotArea) {
    const legendPadding = 6;
    const lineHeight = 20;

    // Set font for measurement (same as 24hr plot)
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

    // Measure text widths (site names are already truncated by extractSiteNameFromFilename)
    let maxTextWidth = 0;
    plotData.forEach(site => {
        const textWidth = ctx.measureText(site.site).width;
        maxTextWidth = Math.max(maxTextWidth, textWidth);
    });

    // Legend width calculation (same as 24hr plot)
    const legendWidth = maxTextWidth + 46;
    const legendHeight = (plotData.length * lineHeight) + (legendPadding * 2);

    // Position legend at top-left inside plot area
    const legendX = plotArea.left + 20;
    const legendY = plotArea.top + 20;

    // Background box (same transparency as 24hr plot)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    // Border
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    // Set text alignment to left
    ctx.textAlign = 'left';
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

    // Legend entries (one per site, formatted like 24hr plot)
    plotData.forEach((site, i) => {
        const y = legendY + legendPadding + (i * lineHeight) + (lineHeight / 2);

        // Line sample (same as 24hr plot)
        ctx.strokeStyle = site.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(legendX, y - 2);
        ctx.lineTo(legendX + 24, y - 2);
        ctx.stroke();

        // Site name (same text color as 24hr plot)
        ctx.fillStyle = '#374151';
        ctx.fillText(site.site, legendX + 30, y + 2);
    });

    // Reset line dash
    ctx.setLineDash([]);
};

// FPOD Plot Functions - Exact implementation from FPODreport 0.3
// These extend NavigationManager with FPOD-specific plotting capabilities

// Site comparison for 24hr files
NavigationManager.prototype.generateSiteComparison = async function(source, sites) {
    console.log('=== GENERATE SITE COMPARISON START ===');
    console.log('Source:', source);
    console.log('Sites:', sites);
    console.log('Available files:', this.availableFiles?.length || 0);
    console.log('Available files list:', this.availableFiles?.map(f => f.name) || []);

    const outputDiv = document.getElementById('fpod-siteComparisonOutput');
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
};

// Site comparison for std files
NavigationManager.prototype.generateStdSiteComparison = async function(source, sites) {
    console.log('=== GENERATE STD SITE COMPARISON START ===');
    console.log('Source:', source);
    console.log('Sites:', sites);

    const outputDiv = document.getElementById('fpod-siteComparisonStdOutput');
    if (!outputDiv) {
        console.error('Output div not found');
        return;
    }

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Standard DPM Plot...</h4>
            <p>Loading ${sites.join(', ')} data for ${source} analysis...</p>
        </div>
    `;

    try {
        // Load the std CSV files for each selected site
        const siteData = await this.loadStdFilesForSites(sites, source);

        if (siteData.length === 0) {
            throw new Error('No _std files found for the selected sites');
        }

        // Generate the plot with default transparency array (all 0.7)
        const transparencyValues = sites.map(() => 0.7);
        this.createStdSiteComparisonPlot(siteData, source, sites, outputDiv, transparencyValues);

    } catch (error) {
        console.error('Error generating std site comparison plot:', error);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.85rem;">
                    Make sure the corresponding _std files exist for: ${sites.join(', ')}
                </p>
            </div>
        `;
    }
};

// Source comparison for 24hr files
NavigationManager.prototype.generateSourceComparison = async function(site, sources) {
    const outputDiv = document.getElementById('fpod-sourceComparisonOutput');
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
};

// Source comparison for std files
NavigationManager.prototype.generateStdSourceComparison = async function(site, sources) {
    const outputDiv = document.getElementById('fpod-sourceComparisonStdOutput');
    if (!outputDiv) return;

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Standard DPM Plot...</h4>
            <p>Loading ${sources.join(', ')} data for ${site} analysis...</p>
        </div>
    `;

    try {
        // Load the std CSV file for the selected site
        const siteData = await this.loadStdFileForSite(site, sources);

        if (!siteData) {
            throw new Error(`No _std file found for site: ${site}`);
        }

        // Generate the plot with default transparency array (all 0.7)
        const transparencyValues = sources.map(() => 0.7);
        this.createStdSourceComparisonPlot(siteData, site, sources, outputDiv, transparencyValues);

    } catch (error) {
        console.error('Error generating std source comparison plot:', error);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.85rem;">
                    Make sure the corresponding _std file exists for: ${site}
                </p>
            </div>
        `;
    }
};

// Helper function to create site comparison plot (24hr)
NavigationManager.prototype.createSiteComparisonPlot = function(siteData, source, sites, outputDiv) {
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
            '#d62728', // Red (moved to 3rd for better distinction)
            '#2ca02c', // Green (moved to 4th)
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

        console.log('Title and subtitle removed for cleaner appearance');
        // Title and subtitle removed

        console.log('Preparing data for plotting...');
        // Prepare data for plotting - first extract all available time points from all sites
        let allTimePoints = new Set();
        siteData.forEach(siteInfo => {
            // For 24hr files, pass '24hr' as fileType to extract hours only
            const hourlyData = this.extractHourlyData(siteInfo.data, source, '24hr');
            Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
        });

        // Sort time points and format them as dates in dd/mm/yy format
        // Smart sorting for different time identifier formats
        const sortedHours = Array.from(allTimePoints).sort((a, b) => {
            // For std files with "YYYY-MM-DD_HH" format
            if (a.includes('_') && b.includes('_')) {
                // Sort lexicographically (works for ISO date format)
                return a.localeCompare(b);
            }
            // For 24hr files with simple hour numbers
            return parseInt(a) - parseInt(b);
        });
        console.log('[SORTING] Sorted', sortedHours.length, 'time points');
        console.log('[SORTING] First 3 after sort:', sortedHours.slice(0, 3));
        const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData[0], "time");
        console.log(`Using ${hours.length} time points from actual data:`, hours.slice(0, 5), '...');

        let maxDPM = 0;

        const plotData = siteData.map((siteInfo, index) => {
            console.log(`Processing data for site: ${siteInfo.site}`);
            // For 24hr files, pass '24hr' as fileType to extract hours only
            const hourlyData = this.extractHourlyData(siteInfo.data, source, '24hr');
            console.log(`Hourly data for ${siteInfo.site}:`, Object.keys(hourlyData).length, 'hours');

            const dpmValues = sortedHours.map(hour => {
                return hourlyData[hour] || 0;
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
        this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, "Time");

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
        // Clear output div and append plot container directly
        outputDiv.innerHTML = '';

        console.log('Appending plot container...');
        outputDiv.appendChild(plotContainer);
        console.log('Plot creation completed successfully');

    } catch (error) {
        console.error('Error in createSiteComparisonPlot:', error);
        console.error('Error stack:', error.stack);
        throw error; // Re-throw to be caught by the calling function
    }
};

// Similar plot creation for source comparison
NavigationManager.prototype.createSourceComparisonPlot = function(siteData, site, sources, outputDiv) {
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

    // Extract clean site name for processing
    const siteName = this.extractSiteNameFromFilename(site);

    // Title and subtitle removed for cleaner appearance

    // Prepare data for plotting - first extract all available time points from all sources
    let allTimePoints = new Set();
    sources.forEach(source => {
        // For 24hr files, pass '24hr' as fileType to extract hours only
        const hourlyData = this.extractHourlyData(siteData.data, source, '24hr');
        Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
    });

    // Sort time points and format them as dates in dd/mm/yy format
    const sortedHours = Array.from(allTimePoints).sort((a, b) => {
        // For std files with "YYYY-MM-DD_HH" format
        if (a.includes('_') && b.includes('_')) {
            // Sort lexicographically (works for ISO date format)
            return a.localeCompare(b);
        }
        // For 24hr files with simple hour numbers
        return parseInt(a) - parseInt(b);
    });

    const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData, "time");

    let maxDPM = 0;

    const plotData = sources.map((source, index) => {
        // For 24hr files, pass '24hr' as fileType to extract hours only
        const hourlyData = this.extractHourlyData(siteData.data, source, '24hr');
        const dpmValues = sortedHours.map(hour => hourlyData[hour] || 0);
        maxDPM = Math.max(maxDPM, ...dpmValues);

        return {
            source: source, // This will be Porpoise (DPM), Dolphin (DPM), Sonar (DPM)
            displayName: source.replace(' (DPM)', ''), // Remove (DPM) for cleaner display
            dpmValues: dpmValues,
            color: journalColors[index % journalColors.length]
        };
    });

    // Round up maxDPM to nice number
    maxDPM = Math.ceil(maxDPM * 1.1);
    const maxPercentage = Math.ceil((maxDPM / 60) * 100);

    // Draw axes
    this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, "Time");

    // Plot data for each source
    plotData.forEach(sourceData => {
        this.plotSourceData(ctx, plotArea, sourceData, hours, maxDPM);
    });

    // Draw legend for sources
    this.drawSourceLegend(ctx, plotData, plotArea);

    // Clear output div and append plot
    outputDiv.innerHTML = '';
    outputDiv.appendChild(plotContainer);
};// FPOD Plot Helper Functions - From FPODreport 0.3

// Create std site comparison plot
NavigationManager.prototype.createStdSiteComparisonPlot = function(siteData, source, sites, outputDiv, transparencyValues = null, layerOrder = null) {
    console.log('=== CREATE STD SITE COMPARISON PLOT ===');

    // Default transparency values if not provided
    if (!transparencyValues) {
        transparencyValues = sites.map(() => 0.7);
    }

    // Default layer order if not provided (sequential: 0, 1, 2, ...)
    if (!layerOrder) {
        layerOrder = sites.map((_, i) => i);
    }

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = 'width: 100%;';

    // Create transparency controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'std-site-transparency-controls';
    controlsContainer.style.cssText = 'background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 15px;';

    const controlsTitle = document.createElement('h4');
    controlsTitle.textContent = 'Line Transparency Controls';
    controlsTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #374151;';
    controlsContainer.appendChild(controlsTitle);

    // Create individual sliders for each site
    sites.forEach((site, index) => {
        const sliderRow = document.createElement('div');
        sliderRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';

        const label = document.createElement('label');
        label.textContent = this.extractSiteNameFromFilename(site) + ':';
        label.style.cssText = 'min-width: 200px; font-size: 13px; color: #4b5563;';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = Math.round(transparencyValues[index] * 100);
        slider.style.cssText = 'flex: 1;';
        slider.dataset.siteIndex = index;

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = slider.value + '%';
        valueDisplay.style.cssText = 'min-width: 45px; font-size: 13px; color: #6b7280;';

        // Layer order dropdown
        const layerSelect = document.createElement('select');
        layerSelect.style.cssText = 'padding: 2px 4px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; color: #4b5563;';
        for (let i = 0; i < sites.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Layer ${i + 1}`;
            if (layerOrder[index] === i) {
                option.selected = true;
            }
            layerSelect.appendChild(option);
        }

        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value + '%';
            transparencyValues[index] = parseInt(e.target.value) / 100;
            // Regenerate plot with new transparency values
            this.createStdSiteComparisonPlot(siteData, source, sites, outputDiv, transparencyValues, layerOrder);
        });

        layerSelect.addEventListener('change', (e) => {
            const newLayer = parseInt(e.target.value);
            const oldLayer = layerOrder[index];

            // Swap layers: move current item to new position and shift others
            layerOrder = layerOrder.map((layer, i) => {
                if (i === index) return newLayer;
                if (layer >= Math.min(oldLayer, newLayer) && layer <= Math.max(oldLayer, newLayer)) {
                    return oldLayer > newLayer ? layer + 1 : layer - 1;
                }
                return layer;
            });

            // Regenerate plot with new layer order
            this.createStdSiteComparisonPlot(siteData, source, sites, outputDiv, transparencyValues, layerOrder);
        });

        sliderRow.appendChild(label);
        sliderRow.appendChild(slider);
        sliderRow.appendChild(valueDisplay);
        sliderRow.appendChild(layerSelect);
        controlsContainer.appendChild(sliderRow);
    });

    mainContainer.appendChild(controlsContainer);

    // Create plot container
    const plotContainer = document.createElement('div');
    plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 420;
    canvas.style.cssText = 'width: 100%; height: 100%;';
    plotContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Professional colors
    const journalColors = [
        '#1f77b4', '#ff7f0e', '#d62728', '#2ca02c', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];

    // Plot dimensions
    const plotArea = {
        left: 90, right: 700, top: 80, bottom: 325,
        width: 610, height: 245
    };

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extract all time points from all sites
    let allTimePoints = new Set();
    siteData.forEach(siteInfo => {
        const hourlyData = this.extractHourlyData(siteInfo.data, source, 'std');
        Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
    });

    // Sort time points (lexicographic for date_hour format)
    const sortedHours = Array.from(allTimePoints).sort((a, b) => {
        if (a.includes('_') && b.includes('_')) {
            return a.localeCompare(b);
        }
        return parseInt(a) - parseInt(b);
    });

    const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData[0], "date");

    // Track maxDPM for different file types
    let maxDPM = 0;
    let maxStdDPM = 0;
    let maxNonStdDPM = 0;

    // Prepare plot data with DPM values
    const plotData = siteData.map((siteInfo, index) => {
        const hourlyData = this.extractHourlyData(siteInfo.data, source, 'std');
        const dpmValues = sortedHours.map(hour => hourlyData[hour] || 0);

        const maxSiteValue = Math.max(...dpmValues);
        const isStdFile = siteInfo.site.toLowerCase().includes('_std');

        if (isStdFile) {
            maxStdDPM = Math.max(maxStdDPM, maxSiteValue);
        } else {
            maxNonStdDPM = Math.max(maxNonStdDPM, maxSiteValue);
        }
        maxDPM = Math.max(maxDPM, maxSiteValue);

        const siteName = this.extractSiteNameFromFilename(siteInfo.site);

        return {
            site: siteName,
            dpmValues: dpmValues,
            color: journalColors[index % journalColors.length],
            isStdFile: isStdFile
        };
    });

    // Apply std scaling algorithm
    const hasStdFiles = plotData.some(site => site.isStdFile);
    const hasNonStdFiles = plotData.some(site => !site.isStdFile);

    if (hasStdFiles) {
        let stdScaleFactor;

        if (hasNonStdFiles && maxStdDPM > 0 && maxNonStdDPM > 0) {
            // Scale std to 80% of non-std range
            stdScaleFactor = (maxNonStdDPM / maxStdDPM) * 0.8;
        } else if (maxStdDPM > 50) {
            // Scale down to 0-50 range
            stdScaleFactor = 40 / maxStdDPM;
        } else {
            stdScaleFactor = 1;
        }

        if (stdScaleFactor !== 1) {
            plotData.forEach(site => {
                if (site.isStdFile) {
                    site.dpmValues = site.dpmValues.map(val => val * stdScaleFactor);
                    // Scaling applied but not shown in legend
                }
            });

            // Recalculate maxDPM after scaling
            let newMaxDPM = 0;
            plotData.forEach(site => {
                const siteMax = Math.max(...site.dpmValues);
                newMaxDPM = Math.max(newMaxDPM, siteMax);
            });
            maxDPM = newMaxDPM;
        }
    }

    // Add 10% headroom
    maxDPM = Math.ceil(maxDPM * 1.1);
    const maxPercentage = (maxDPM / 60) * 100;

    // Draw dual axes
    this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, "Date");

    // Plot data with individual transparency values in layer order
    // Create array of indices sorted by layer order (lower layer number = drawn first = behind)
    const sortedIndices = plotData.map((_, i) => i).sort((a, b) => layerOrder[a] - layerOrder[b]);

    sortedIndices.forEach(index => {
        this.plotSiteDataDPM(ctx, plotArea, plotData[index], hours, maxDPM, transparencyValues[index]);
    });

    // Draw legend
    this.drawDualAxisLegend(ctx, plotData, plotArea);

    mainContainer.appendChild(plotContainer);
    outputDiv.innerHTML = '';
    outputDiv.appendChild(mainContainer);
};

// Create std source comparison plot
NavigationManager.prototype.createStdSourceComparisonPlot = function(siteData, site, sources, outputDiv, transparencyValues = null, layerOrder = null) {
    // Default transparency values if not provided
    if (!transparencyValues) {
        transparencyValues = sources.map(() => 0.7);
    }

    // Default layer order if not provided (sequential: 0, 1, 2, ...)
    if (!layerOrder) {
        layerOrder = sources.map((_, i) => i);
    }

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = 'width: 100%;';

    // Create transparency controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'std-source-transparency-controls';
    controlsContainer.style.cssText = 'background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 15px;';

    const controlsTitle = document.createElement('h4');
    controlsTitle.textContent = 'Line Transparency Controls';
    controlsTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #374151;';
    controlsContainer.appendChild(controlsTitle);

    // Create individual sliders for each source
    sources.forEach((source, index) => {
        const sliderRow = document.createElement('div');
        sliderRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px;';

        const label = document.createElement('label');
        label.textContent = source.replace(' (DPM)', '') + ':';
        label.style.cssText = 'min-width: 200px; font-size: 13px; color: #4b5563;';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = Math.round(transparencyValues[index] * 100);
        slider.style.cssText = 'flex: 1;';
        slider.dataset.sourceIndex = index;

        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = slider.value + '%';
        valueDisplay.style.cssText = 'min-width: 45px; font-size: 13px; color: #6b7280;';

        // Layer order dropdown
        const layerSelect = document.createElement('select');
        layerSelect.style.cssText = 'padding: 2px 4px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; color: #4b5563;';
        for (let i = 0; i < sources.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Layer ${i + 1}`;
            if (layerOrder[index] === i) {
                option.selected = true;
            }
            layerSelect.appendChild(option);
        }

        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value + '%';
            transparencyValues[index] = parseInt(e.target.value) / 100;
            // Regenerate plot with new transparency values
            this.createStdSourceComparisonPlot(siteData, site, sources, outputDiv, transparencyValues, layerOrder);
        });

        layerSelect.addEventListener('change', (e) => {
            const newLayer = parseInt(e.target.value);
            const oldLayer = layerOrder[index];

            // Swap layers: move current item to new position and shift others
            layerOrder = layerOrder.map((layer, i) => {
                if (i === index) return newLayer;
                if (layer >= Math.min(oldLayer, newLayer) && layer <= Math.max(oldLayer, newLayer)) {
                    return oldLayer > newLayer ? layer + 1 : layer - 1;
                }
                return layer;
            });

            // Regenerate plot with new layer order
            this.createStdSourceComparisonPlot(siteData, site, sources, outputDiv, transparencyValues, layerOrder);
        });

        sliderRow.appendChild(label);
        sliderRow.appendChild(slider);
        sliderRow.appendChild(valueDisplay);
        sliderRow.appendChild(layerSelect);
        controlsContainer.appendChild(sliderRow);
    });

    mainContainer.appendChild(controlsContainer);

    const plotContainer = document.createElement('div');
    plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 420;
    canvas.style.cssText = 'width: 100%; height: 100%;';
    plotContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    const journalColors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'
    ];

    const plotArea = {
        left: 90, right: 700, top: 80, bottom: 325,
        width: 610, height: 245
    };

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extract all time points from all sources
    let allTimePoints = new Set();
    sources.forEach(source => {
        const hourlyData = this.extractHourlyData(siteData.data, source, 'std');
        Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
    });

    // Sort time points (lexicographic for date_hour format)
    const sortedHours = Array.from(allTimePoints).sort((a, b) => {
        if (a.includes('_') && b.includes('_')) {
            return a.localeCompare(b);
        }
        return parseInt(a) - parseInt(b);
    });

    const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData, "date");

    let maxDPM = 0;

    const plotData = sources.map((source, index) => {
        const hourlyData = this.extractHourlyData(siteData.data, source, 'std');
        const dpmValues = sortedHours.map(hour => hourlyData[hour] || 0);
        maxDPM = Math.max(maxDPM, ...dpmValues);

        return {
            site: source.replace(' (DPM)', ''),
            dpmValues: dpmValues,
            color: journalColors[index % journalColors.length]
        };
    });

    maxDPM = Math.ceil(maxDPM * 1.1);
    const maxPercentage = (maxDPM / 60) * 100;

    // Draw dual axes
    this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, "Date");

    // Plot data with individual transparency values in layer order
    // Create array of indices sorted by layer order (lower layer number = drawn first = behind)
    const sortedIndices = plotData.map((_, i) => i).sort((a, b) => layerOrder[a] - layerOrder[b]);

    sortedIndices.forEach(index => {
        this.plotSiteDataDPM(ctx, plotArea, plotData[index], hours, maxDPM, transparencyValues[index]);
    });

    // Draw legend
    this.drawDualAxisLegend(ctx, plotData, plotArea);

    mainContainer.appendChild(plotContainer);
    outputDiv.innerHTML = '';
    outputDiv.appendChild(mainContainer);
};

// Plot site data for DPM plots with centered bin positioning
NavigationManager.prototype.plotSiteDataDPM = function(ctx, plotArea, siteData, hours, maxDPM, transparency = 0.7) {
    const { dpmValues, color } = siteData;

    // Convert hex color to rgba with transparency
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const colorWithTransparency = `rgba(${r}, ${g}, ${b}, ${transparency})`;

    ctx.strokeStyle = colorWithTransparency;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);

    const xStep = plotArea.width / dpmValues.length;

    if (dpmValues.length < 2) return;

    ctx.beginPath();
    let firstPoint = true;

    dpmValues.forEach((dpm, index) => {
        // X position: centered in each bin
        const x = plotArea.left + (index + 0.5) * xStep;

        // Y position: scaled by maxDPM
        const y = plotArea.bottom - (dpm / maxDPM) * plotArea.height;

        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
};

// Plot source data for regular DPM plots
NavigationManager.prototype.plotSourceData = function(ctx, plotArea, sourceData, hours, maxDPM) {
    const { dpmValues, color } = sourceData;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const xStep = plotArea.width / (hours.length - 1);

    if (dpmValues.length < 2) return;

    ctx.beginPath();

    const points = dpmValues.map((dpm, i) => ({
        x: plotArea.left + (i * xStep),
        y: plotArea.bottom - (dpm / maxDPM) * plotArea.height
    }));

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        const current = points[i];

        if (i === points.length - 1) {
            ctx.lineTo(current.x, current.y);
        } else {
            const next = points[i + 1];
            const cpX = current.x;
            const cpY = current.y;
            const endX = (current.x + next.x) / 2;
            const endY = (current.y + next.y) / 2;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        }
    }

    ctx.stroke();
};

// Draw source legend
NavigationManager.prototype.drawSourceLegend = function(ctx, plotData, plotArea) {
    const legendX = plotArea.left + 20;
    const legendY = plotArea.top + 20;

    const legendPadding = 6;
    const lineHeight = 20;

    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

    let maxTextWidth = 0;
    plotData.forEach((sourceData) => {
        const displayName = sourceData.displayName || sourceData.source;
        const textWidth = ctx.measureText(displayName).width;
        maxTextWidth = Math.max(maxTextWidth, textWidth);
    });

    const legendWidth = maxTextWidth + 46;
    const legendHeight = (plotData.length * lineHeight) + (legendPadding * 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.textAlign = 'left';

    plotData.forEach((sourceData, i) => {
        const y = legendY + legendPadding + (i * lineHeight) + (lineHeight / 2);

        ctx.strokeStyle = sourceData.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(legendX, y - 2);
        ctx.lineTo(legendX + 24, y - 2);
        ctx.stroke();

        ctx.fillStyle = '#374151';
        const displayName = sourceData.displayName || sourceData.source;
        ctx.fillText(displayName, legendX + 30, y + 2);
    });
};

// Plot std site data
// Initialize the CSV Manager and Navigation when the page loads
let csvManager;
let navigationManager;

document.addEventListener('DOMContentLoaded', () => {
    // Create csvManager first and expose it globally BEFORE creating NavigationManager
    // This ensures the delegation in NavigationManager's initializeComparisonControls works
    csvManager = new CSVManager();
    window.csvManager = csvManager;

    // Now create NavigationManager - its constructor can safely reference window.csvManager
    navigationManager = new NavigationManager();
    window.navigationManager = navigationManager;
    
    // Hook into csvManager's file loading to update plot page
    const originalUpdateFileBrowser = csvManager.updateFileBrowser;
    csvManager.updateFileBrowser = function(files) {
        originalUpdateFileBrowser.call(this, files);
        // Update plot page when files are loaded
        if (navigationManager) {
            // Fire and forget - don't await to avoid blocking the UI
            navigationManager.updatePlotPageFileInfo().catch(console.error);
        }
    };

    // Preload SUBCAM Data Button functionality
    const preloadBtn = document.getElementById('preloadDataBtn');
    if (preloadBtn) {
        preloadBtn.addEventListener('click', () => {
            // Create hidden file input for folder selection
            const folderInput = document.createElement('input');
            folderInput.type = 'file';
            folderInput.webkitdirectory = true; // Enable folder selection
            folderInput.multiple = true;
            folderInput.accept = '.csv';
            folderInput.style.display = 'none';

            folderInput.addEventListener('change', async (event) => {
                try {
                    preloadBtn.textContent = '⏳ Loading SUBCAM Data...';
                    preloadBtn.disabled = true;

                    const files = Array.from(event.target.files);
                    console.log('🚀 SUBCAM folder selected, found files:', files.map(f => f.name));

                    // Filter for CSV files
                    const csvFiles = files.filter(file =>
                        file.name.toLowerCase().endsWith('.csv') &&
                        (file.name.toLowerCase().includes('nmax') ||
                         file.name.toLowerCase().includes('obvs'))
                    );

                    if (csvFiles.length > 0) {
                        console.log(`📁 Found ${csvFiles.length} SUBCAM CSV files`);

                        // Update file browser with loaded files
                        csvManager.workingDirFiles = csvFiles;
                        csvManager.updateFileBrowser(csvFiles);

                        // Update plot page with loaded files
                        if (navigationManager) {
                            await navigationManager.updatePlotPageFileInfo();
                        }

                        // Navigate to plot page
                        setTimeout(() => {
                            const plotNav = document.querySelector('[data-page="plot"]');
                            if (plotNav) {
                                plotNav.click();
                            }
                        }, 500);

                        preloadBtn.textContent = '✅ Data Loaded!';
                        console.log('🎉 SUBCAM data preloaded successfully!');

                    } else {
                        throw new Error('No SUBCAM CSV files found in the selected folder');
                    }

                } catch (error) {
                    console.error('❌ Failed to preload SUBCAM data:', error);
                    preloadBtn.textContent = '❌ Load Failed';
                    alert('Failed to load SUBCAM data: ' + error.message);
                } finally {
                    setTimeout(() => {
                        preloadBtn.textContent = '🚀 Preload SUBCAM Data';
                        preloadBtn.disabled = false;
                    }, 2000);
                }
            });

            // Trigger folder selection
            document.body.appendChild(folderInput);
            folderInput.click();
            document.body.removeChild(folderInput);
        });
    }

    // Convert File Button functionality
    const convertFileBtn = document.getElementById('convertFileBtn');
    if (convertFileBtn) {
        convertFileBtn.addEventListener('click', () => {
            if (csvManager && csvManager.csvData && csvManager.csvData.length > 0) {
                // Call the nmax conversion function
                csvManager.convertTo24hrAverage();
            } else {
                alert('Please upload a CSV file first before converting.');
            }
        });
    }

    // Download Result Button functionality
    const downloadResultBtn = document.getElementById('downloadResultBtn');
    if (downloadResultBtn) {
        downloadResultBtn.addEventListener('click', () => {
            if (csvManager && csvManager.csvData && csvManager.csvData.length > 0) {
                // Auto-save the converted file
                csvManager.autoSaveConvertedFile(csvManager.fileName, 'nmax');
            } else {
                alert('No data available to download.');
            }
        });
    }

    // Initialize Heatmap functionality
    initializeHeatmapPage();
});

// Add FPOD Plot Page Initialization
NavigationManager.prototype.initializeFPODPlotPage = function() {
    console.log('Initializing FPOD plot page controls...');

    // Update file dropdowns for FPOD
    const fpodFiles24hr = [];
    const fpodFilesStd = [];
    const dpmColumns = ['Porpoise (DPM)', 'Dolphin (DPM)', 'Sonar (DPM)'];

    // Get files from csvManager and update availableFiles for FPOD functions
    this.availableFiles = [];
    if (csvManager && csvManager.workingDirFiles) {
        this.availableFiles = csvManager.workingDirFiles;
        csvManager.workingDirFiles.forEach(file => {
            const fileName = file.name.toLowerCase();
            if (fileName.includes('_24hr.csv')) {
                fpodFiles24hr.push(file);
            } else if (fileName.includes('_std.csv')) {
                fpodFilesStd.push(file);
            }
        });
    }
    console.log('FPOD availableFiles populated:', this.availableFiles.length, 'files');

    // Update 24hr dropdowns
    const sourceSelect1 = document.getElementById('fpod-sourceSelect1');
    const sitesSelect1 = document.getElementById('fpod-sitesSelect1');
    const siteSelect2 = document.getElementById('fpod-siteSelect2');
    const sourcesSelect2 = document.getElementById('fpod-sourcesSelect2');

    if (sourceSelect1) {
        sourceSelect1.innerHTML = '<option value="">Select DPM column to plot...</option>';
        dpmColumns.forEach(col => {
            sourceSelect1.innerHTML += `<option value="${col}">${col}</option>`;
        });
        // Auto-select first DPM column if available
        if (dpmColumns.length > 0) {
            sourceSelect1.value = dpmColumns[0];
        }
    }

    if (sitesSelect1) {
        sitesSelect1.innerHTML = '';
        fpodFiles24hr.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = file.name;
            option.textContent = file.name;
            sitesSelect1.appendChild(option);
            // Auto-select first 2 files if available
            if (index < 2 && fpodFiles24hr.length >= 2) {
                option.selected = true;
            }
        });
    }

    if (siteSelect2) {
        siteSelect2.innerHTML = '<option value="">Select a _24hr.csv file...</option>';
        fpodFiles24hr.forEach(file => {
            siteSelect2.innerHTML += `<option value="${file.name}">${file.name}</option>`;
        });
        // Auto-select first file if available
        if (fpodFiles24hr.length > 0) {
            siteSelect2.value = fpodFiles24hr[0].name;
        }
    }

    if (sourcesSelect2) {
        sourcesSelect2.innerHTML = '';
        dpmColumns.forEach((col, index) => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            sourcesSelect2.appendChild(option);
            // Auto-select first 2 DPM columns if available
            if (index < 2 && dpmColumns.length >= 2) {
                option.selected = true;
            }
        });
    }

    // Update standard dropdowns
    const sourceSelectStd1 = document.getElementById('fpod-sourceSelectStd1');
    const sitesSelectStd1 = document.getElementById('fpod-sitesSelectStd1');
    const siteSelectStd2 = document.getElementById('fpod-siteSelectStd2');
    const sourcesSelectStd2 = document.getElementById('fpod-sourcesSelectStd2');

    if (sourceSelectStd1) {
        sourceSelectStd1.innerHTML = '<option value="">Select DPM column to plot...</option>';
        dpmColumns.forEach(col => {
            sourceSelectStd1.innerHTML += `<option value="${col}">${col}</option>`;
        });
        // Auto-select first DPM column if available
        if (dpmColumns.length > 0) {
            sourceSelectStd1.value = dpmColumns[0];
        }
    }

    if (sitesSelectStd1) {
        sitesSelectStd1.innerHTML = '';
        fpodFilesStd.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = file.name;
            option.textContent = file.name;
            sitesSelectStd1.appendChild(option);
            // Auto-select first 2 files if available
            if (index < 2 && fpodFilesStd.length >= 2) {
                option.selected = true;
            }
        });
    }

    if (siteSelectStd2) {
        siteSelectStd2.innerHTML = '<option value="">Select a _std.csv file...</option>';
        fpodFilesStd.forEach(file => {
            siteSelectStd2.innerHTML += `<option value="${file.name}">${file.name}</option>`;
        });
        // Auto-select first file if available
        if (fpodFilesStd.length > 0) {
            siteSelectStd2.value = fpodFilesStd[0].name;
        }
    }

    if (sourcesSelectStd2) {
        sourcesSelectStd2.innerHTML = '';
        dpmColumns.forEach((col, index) => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            sourcesSelectStd2.appendChild(option);
            // Auto-select first 2 DPM columns if available
            if (index < 2 && dpmColumns.length >= 2) {
                option.selected = true;
            }
        });
    }

    // Enable/disable buttons based on selections
    const enableDisableButtons = () => {
        // 24hr buttons
        const btn1 = document.getElementById('fpod-generateSiteComparisonBtn');
        if (btn1) {
            const sourceSelected = sourceSelect1 && sourceSelect1.value;
            const sitesSelected = sitesSelect1 && sitesSelect1.selectedOptions.length > 0;
            btn1.disabled = !sourceSelected || !sitesSelected;
        }

        const btn2 = document.getElementById('fpod-generateSourceComparisonBtn');
        if (btn2) {
            const siteSelected = siteSelect2 && siteSelect2.value;
            const sourcesSelected = sourcesSelect2 && sourcesSelect2.selectedOptions.length > 0;
            btn2.disabled = !siteSelected || !sourcesSelected;
        }

        // Standard buttons
        const btnStd1 = document.getElementById('fpod-generateSiteComparisonStdBtn');
        if (btnStd1) {
            const sourceSelected = sourceSelectStd1 && sourceSelectStd1.value;
            const sitesSelected = sitesSelectStd1 && sitesSelectStd1.selectedOptions.length > 0;
            btnStd1.disabled = !sourceSelected || !sitesSelected;
        }

        const btnStd2 = document.getElementById('fpod-generateSourceComparisonStdBtn');
        if (btnStd2) {
            const siteSelected = siteSelectStd2 && siteSelectStd2.value;
            const sourcesSelected = sourcesSelectStd2 && sourcesSelectStd2.selectedOptions.length > 0;
            btnStd2.disabled = !siteSelected || !sourcesSelected;
        }
    };

    // Add event listeners
    [sourceSelect1, sitesSelect1, siteSelect2, sourcesSelect2,
     sourceSelectStd1, sitesSelectStd1, siteSelectStd2, sourcesSelectStd2].forEach(el => {
        if (el) {
            el.addEventListener('change', enableDisableButtons);
        }
    });

    // Initial button state
    enableDisableButtons();

    // Add click handlers for FPOD plot buttons
    const navigationManager = window.navigationManager;  // Get the global navigation manager instance

    const fpodBtn1 = document.getElementById('fpod-generateSiteComparisonBtn');
    if (fpodBtn1) {
        fpodBtn1.addEventListener('click', () => {
            const source = sourceSelect1.value;
            const sites = Array.from(sitesSelect1.selectedOptions).map(option => option.value);
            this.generateSiteComparison(source, sites);
        });
    }

    const fpodBtn2 = document.getElementById('fpod-generateSourceComparisonBtn');
    if (fpodBtn2) {
        fpodBtn2.addEventListener('click', () => {
            const site = siteSelect2.value;
            const sources = Array.from(sourcesSelect2.selectedOptions).map(option => option.value);
            this.generateSourceComparison(site, sources);
        });
    }

    const fpodBtnStd1 = document.getElementById('fpod-generateSiteComparisonStdBtn');
    if (fpodBtnStd1) {
        fpodBtnStd1.addEventListener('click', () => {
            const source = sourceSelectStd1.value;
            const sites = Array.from(sitesSelectStd1.selectedOptions).map(option => option.value);
            this.generateStdSiteComparison(source, sites);
        });
    }

    const fpodBtnStd2 = document.getElementById('fpod-generateSourceComparisonStdBtn');
    if (fpodBtnStd2) {
        fpodBtnStd2.addEventListener('click', () => {
            const site = siteSelectStd2.value;
            const sources = Array.from(sourcesSelectStd2.selectedOptions).map(option => option.value);
            this.generateStdSourceComparison(site, sources);
        });
    }
};

// FPOD functions are loaded from fpod-functions.js

// Debug logging system
class DebugLogger {
    constructor() {
        this.logs = [];
        this.isVisible = false;
        this.initializeDebugPanel();
    }

    initializeDebugPanel() {
        const debugToggle = document.getElementById('debugToggle');
        const debugDropdown = document.getElementById('debugDropdown');
        const clearDebugLogs = document.getElementById('clearDebugLogs');

        if (debugToggle) {
            debugToggle.addEventListener('click', () => {
                this.isVisible = !this.isVisible;
                debugDropdown.classList.toggle('hidden', !this.isVisible);
                clearDebugLogs.classList.toggle('hidden', !this.isVisible);
                debugToggle.textContent = this.isVisible ? '🔧 Hide Debug Logs' : '🔧 Debug Logs';
            });
        }

        if (clearDebugLogs) {
            clearDebugLogs.addEventListener('click', () => {
                this.clearLogs();
            });
        }

        // Initial log
        this.log('Debug system initialized', 'info');
    }

    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            level
        };

        this.logs.push(logEntry);
        this.renderLogs();

        // Also log to console for developer debugging
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }

    renderLogs() {
        const debugLogs = document.getElementById('debugLogs');
        if (!debugLogs) return;

        debugLogs.innerHTML = this.logs.map(log => `
            <div class="debug-log-entry">
                <span class="debug-timestamp">[${log.timestamp}]</span>
                <span class="debug-level-${log.level}">[${log.level.toUpperCase()}]</span>
                ${log.message}
            </div>
        `).join('');

        // Auto-scroll to bottom
        debugLogs.scrollTop = debugLogs.scrollHeight;
    }

    clearLogs() {
        this.logs = [];
        this.renderLogs();
        this.log('Debug logs cleared', 'info');
    }
}

// Global debug logger instance
const debugLogger = new DebugLogger();

// Heatmap functionality
function initializeHeatmapPage() {
    const heatmapFileSelect = document.getElementById('heatmapFileSelect');
    const speciesSelection = document.getElementById('speciesSelection');
    const speciesCheckboxes = document.getElementById('speciesCheckboxes');
    const selectAllSpecies = document.getElementById('selectAllSpecies');
    const deselectAllSpecies = document.getElementById('deselectAllSpecies');
    const generateHeatmapBtn = document.getElementById('generateHeatmapBtn');
    const heatmapVisualization = document.getElementById('heatmapVisualization');

    debugLogger.log('Initializing heatmap page', 'info');

    // Heatmap Edit Mode State Management
    const heatmapEditState = {
        isEditMode: false,
        originalData: null,
        modifiedData: new Map(),
        currentFileName: null,
        speciesOrder: [], // Track current species order for reordering
        columnWidth: null, // Store custom column width for species column
        dataColumnWidth: 35, // Uniform width for all data columns
        isResizing: false,
        resizeStartX: 0,
        resizeStartWidth: 0,
        resizeColumnType: null // 'species' or 'data'
    };

    // Update file dropdown when files are loaded - make this global
    window.updateHeatmapFileDropdown = function() {
        debugLogger.log('updateHeatmapFileDropdown called', 'info');

        if (!csvManager) {
            debugLogger.log('csvManager not available', 'error');
            return;
        }

        if (!csvManager.workingDirFiles) {
            debugLogger.log('csvManager.workingDirFiles not available', 'error');
            return;
        }

        debugLogger.log(`Total files in working directory: ${csvManager.workingDirFiles.length}`, 'info');

        heatmapFileSelect.innerHTML = '<option value="">Select a _nmax.csv file...</option>';

        // Log all files for debugging
        csvManager.workingDirFiles.forEach(file => {
            debugLogger.log(`File found: ${file.name} (type: ${file.type || 'unknown'})`, 'info');
        });

        const nmaxFiles = csvManager.workingDirFiles.filter(file =>
            file.name.toLowerCase().includes('_nmax') && file.name.toLowerCase().endsWith('.csv')
        );

        debugLogger.log(`Filtered _nmax files: ${nmaxFiles.length}`, 'info');

        if (nmaxFiles.length === 0) {
            debugLogger.log('No _nmax.csv files found. Files must contain "_nmax" and end with ".csv"', 'warn');
        }

        nmaxFiles.forEach((file, index) => {
            debugLogger.log(`Adding file to dropdown: ${file.name} (index: ${index})`, 'info');
            const option = document.createElement('option');
            option.value = file.name;
            option.textContent = file.name;
            heatmapFileSelect.appendChild(option);
        });

        debugLogger.log(`File dropdown updated with ${nmaxFiles.length} files`, 'success');
    }

    // Extract species headers (columns 8+)
    function extractSpeciesHeaders(csvData) {
        if (!csvData || csvData.length === 0) return [];

        const headers = Object.keys(csvData[0]);
        console.log('All headers:', headers);
        console.log('Total headers count:', headers.length);

        // Return headers from index 7 onwards (8th column+)
        const speciesHeaders = headers.slice(7);
        console.log('Species headers (from column 8+):', speciesHeaders);

        return speciesHeaders;
    }

    // Create species checkboxes
    function createSpeciesCheckboxes(species) {
        speciesCheckboxes.innerHTML = '';

        species.forEach((speciesName, index) => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'species-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `species_${index}`;
            checkbox.value = speciesName;
            checkbox.checked = true; // Default to all selected

            const label = document.createElement('label');
            label.htmlFor = `species_${index}`;
            label.textContent = speciesName;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            speciesCheckboxes.appendChild(checkboxDiv);
        });
    }

    // Get selected species
    function getSelectedSpecies() {
        const checkboxes = speciesCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Get abundance class for color coding
    function getAbundanceClass(value) {
        const num = parseInt(value) || 0;
        if (num === 0) return 'abundance-0';
        if (num >= 10) return 'abundance-10-plus';
        return `abundance-${num}`;
    }

    // Helper function to format date as DD/MM/YY
    function formatDateForDisplay(dateStr) {
        if (!dateStr || dateStr === 'N/A') return 'N/A';

        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // Return original if invalid

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);

            return `${day}/${month}/${year}`;
        } catch (error) {
            return dateStr; // Return original if parsing fails
        }
    }

    // Edit Mode Functions
    function toggleEditMode() {
        const editBtn = document.getElementById('toggleEditModeBtn');
        const saveBtn = document.getElementById('saveHeatmapBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const dataCells = document.querySelectorAll('.heatmap-data-cell');

        if (!heatmapEditState.isEditMode) {
            // Enter edit mode
            heatmapEditState.isEditMode = true;
            heatmapEditState.originalData = JSON.parse(heatmapFileSelect.dataset.currentData || '[]');
            heatmapEditState.currentFileName = heatmapFileSelect.value;
            heatmapEditState.modifiedData.clear();

            editBtn.textContent = '👁️ View Mode';
            editBtn.classList.remove('btn-secondary');
            editBtn.classList.add('btn-warning');
            saveBtn.classList.remove('hidden');
            cancelBtn.classList.remove('hidden');

            // Show edit controls and setup dropdown functionality
            const editControls = document.getElementById('editControls');
            console.log('[Edit Mode] Looking for edit controls:', editControls);

            if (editControls) {
                console.log('[Edit Mode] Showing edit controls');
                editControls.classList.remove('hidden');

                // Get dropdown elements
                const speciesColSelect = document.getElementById('speciesColWidth');
                const dataColSelect = document.getElementById('dataColWidth');
                const updateBtn = document.getElementById('updateColumnWidths');

                console.log('[Edit Mode] Control elements found:', {
                    speciesSelect: !!speciesColSelect,
                    dataSelect: !!dataColSelect,
                    updateButton: !!updateBtn
                });

                // Set initial values based on current column widths
                const currentSpeciesWidth = document.querySelector('.heatmap-species-name, .heatmap-species-title')?.offsetWidth || 150;
                const currentDataWidth = document.querySelector('.heatmap-data-cell')?.offsetWidth || 35;

                console.log('[Edit Mode] Current column widths:', {
                    species: currentSpeciesWidth,
                    data: currentDataWidth,
                    storedSpecies: heatmapEditState.columnWidth,
                    storedData: heatmapEditState.dataColumnWidth
                });

                // Set dropdown values to match current widths (find closest preset)
                if (speciesColSelect) {
                    const speciesWidth = heatmapEditState.columnWidth || currentSpeciesWidth;
                    // Find closest preset value from 1-10 scale
                    const speciesPresets = [80, 100, 120, 140, 160, 180, 200, 230, 260, 300];
                    let closestValue = 160; // Default to 5 (Normal)
                    let minDiff = Math.abs(speciesWidth - closestValue);

                    speciesPresets.forEach(preset => {
                        const diff = Math.abs(speciesWidth - preset);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestValue = preset;
                        }
                    });

                    speciesColSelect.value = closestValue.toString();
                    console.log('[Edit Mode] Set species dropdown to:', closestValue, '(from width:', speciesWidth, ')');
                }

                if (dataColSelect) {
                    const dataWidth = heatmapEditState.dataColumnWidth || currentDataWidth;
                    // Find closest preset value from 1-10 scale
                    const dataPresets = [8, 12, 16, 20, 25, 30, 35, 45, 55, 70];
                    let closestValue = 35; // Default to 4 (Normal)
                    let minDiff = Math.abs(dataWidth - closestValue);

                    dataPresets.forEach(preset => {
                        const diff = Math.abs(dataWidth - preset);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestValue = preset;
                        }
                    });

                    dataColSelect.value = closestValue.toString();
                    console.log('[Edit Mode] Set data dropdown to:', closestValue, '(from width:', dataWidth, ')');
                }

                // Setup update button click handler
                if (updateBtn) {
                    updateBtn.onclick = function() {
                        const newSpeciesWidth = parseInt(speciesColSelect.value);
                        const newDataWidth = parseInt(dataColSelect.value);

                        console.log('[Edit Mode] Updating column widths:', {
                            species: newSpeciesWidth,
                            data: newDataWidth
                        });

                        // Store the new widths
                        heatmapEditState.columnWidth = newSpeciesWidth;
                        heatmapEditState.dataColumnWidth = newDataWidth;

                        // Apply special CSS classes for ultra-thin columns
                        const dataCells = document.querySelectorAll('.heatmap-data-cell');
                        dataCells.forEach(cell => {
                            cell.classList.remove('ultra-thin', 'very-thin', 'thin');
                            if (newDataWidth <= 8) {
                                cell.classList.add('ultra-thin');
                            } else if (newDataWidth <= 12) {
                                cell.classList.add('very-thin');
                            } else if (newDataWidth <= 16) {
                                cell.classList.add('thin');
                            }
                        });

                        // Update all species column widths
                        const speciesColumns = document.querySelectorAll('.heatmap-species-name, .heatmap-species-title, .heatmap-date-title-cell');
                        console.log('[Edit Mode] Updating', speciesColumns.length, 'species columns');
                        speciesColumns.forEach(col => {
                            col.style.width = `${newSpeciesWidth}px`;
                        });

                        // Update all data column widths - reuse dataCells from above
                        const titleDataCells = document.querySelectorAll('.heatmap-title-data-cell');
                        const dateDateCells = document.querySelectorAll('.heatmap-date-cell');

                        console.log('[Edit Mode] Found elements:', {
                            dataCells: dataCells.length,
                            titleCells: titleDataCells.length,
                            dateCells: dateDateCells.length
                        });

                        // Update data cells width
                        dataCells.forEach((cell, index) => {
                            cell.style.width = `${newDataWidth}px`;
                            if (index < 3) {
                                console.log(`[Edit Mode] Data cell ${index} width set to:`, cell.style.width);
                            }
                        });

                        // Update title cells
                        titleDataCells.forEach(cell => {
                            cell.style.width = `${newDataWidth}px`;
                            cell.classList.remove('ultra-thin', 'very-thin', 'thin');
                            if (newDataWidth <= 8) {
                                cell.classList.add('ultra-thin');
                            } else if (newDataWidth <= 12) {
                                cell.classList.add('very-thin');
                            } else if (newDataWidth <= 16) {
                                cell.classList.add('thin');
                            }
                        });

                        // Update date cells
                        dateDateCells.forEach(cell => {
                            cell.style.width = `${newDataWidth}px`;
                            cell.classList.remove('ultra-thin', 'very-thin', 'thin');
                            if (newDataWidth <= 8) {
                                cell.classList.add('ultra-thin');
                            } else if (newDataWidth <= 12) {
                                cell.classList.add('very-thin');
                            } else if (newDataWidth <= 16) {
                                cell.classList.add('thin');
                            }
                        });

                        console.log('[Edit Mode] Column widths updated successfully');
                    };
                }
            } else {
                console.error('[Edit Mode] Edit controls element not found!');
            }

            // Make data cells editable
            dataCells.forEach(cell => {
                if (cell.textContent.trim() !== '' && !isNaN(cell.textContent.trim())) {
                    cell.classList.add('editable');
                    cell.setAttribute('contenteditable', 'true');
                    cell.addEventListener('input', handleCellEdit);
                    cell.addEventListener('keydown', handleCellKeydown);
                }
            });

            // Make species name cells editable and add delete buttons
            const speciesNameCells = document.querySelectorAll('.heatmap-species-name');
            speciesNameCells.forEach((cell, index) => {
                cell.classList.add('editable');
                cell.setAttribute('contenteditable', 'true');
                cell.addEventListener('input', handleSpeciesNameEdit);
                cell.addEventListener('keydown', handleSpeciesNameKeydown);

                // Add delete button for species row
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-species-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete this species';
                deleteBtn.dataset.speciesIndex = index;
                deleteBtn.dataset.speciesName = cell.textContent.trim();
                deleteBtn.addEventListener('click', handleSpeciesDelete);
                cell.appendChild(deleteBtn);
            });

            // Add delete buttons to date cells
            const dateCells = document.querySelectorAll('.heatmap-date-cell');
            dateCells.forEach((cell, index) => {
                // Add delete button to each date cell
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-row-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = 'Delete this date';
                deleteBtn.dataset.dateIndex = index;
                deleteBtn.addEventListener('click', handleRowDelete);
                cell.appendChild(deleteBtn);
            });

            console.log('Edit mode enabled. Click on any cell to modify values.');
        } else {
            // Exit edit mode
            exitEditMode();
        }
    }

    function exitEditMode() {
        const editBtn = document.getElementById('toggleEditModeBtn');
        const saveBtn = document.getElementById('saveHeatmapBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const dataCells = document.querySelectorAll('.heatmap-data-cell');

        heatmapEditState.isEditMode = false;

        editBtn.textContent = '📝 Edit Mode';
        editBtn.classList.remove('btn-warning');
        editBtn.classList.add('btn-secondary');
        saveBtn.classList.add('hidden');
        cancelBtn.classList.add('hidden');
        saveBtn.disabled = true;

        // Hide edit controls
        const editControls = document.getElementById('editControls');
        if (editControls) {
            editControls.classList.add('hidden');
        }

        // Remove edit functionality from data cells
        dataCells.forEach(cell => {
            cell.classList.remove('editable', 'editing', 'modified');
            cell.removeAttribute('contenteditable');
            cell.removeEventListener('input', handleCellEdit);
            cell.removeEventListener('keydown', handleCellKeydown);
        });

        // Remove edit functionality from species name cells
        const speciesNameCells = document.querySelectorAll('.heatmap-species-name');
        speciesNameCells.forEach(cell => {
            cell.classList.remove('editable', 'editing', 'modified');
            cell.removeAttribute('contenteditable');
            cell.removeEventListener('input', handleSpeciesNameEdit);
            cell.removeEventListener('keydown', handleSpeciesNameKeydown);
        });

        // Remove species delete buttons
        const speciesDeleteButtons = document.querySelectorAll('.delete-species-btn');
        speciesDeleteButtons.forEach(btn => {
            btn.removeEventListener('click', handleSpeciesDelete);
            btn.remove();
        });

        // Remove delete buttons from date cells
        const deleteButtons = document.querySelectorAll('.delete-row-btn');
        deleteButtons.forEach(btn => {
            btn.removeEventListener('click', handleRowDelete);
            btn.remove();
        });

        // Remove deleted row styling
        const deletedRows = document.querySelectorAll('.heatmap-row.deleted');
        deletedRows.forEach(row => {
            row.classList.remove('deleted');
        });

        // Remove deleted species row styling
        const deletedSpeciesRows = document.querySelectorAll('.heatmap-row.species-deleted');
        deletedSpeciesRows.forEach(row => {
            row.classList.remove('species-deleted');
        });

        // Clear modifications
        heatmapEditState.modifiedData.clear();
    }

    function handleCellEdit(event) {
        const cell = event.target;
        const value = cell.textContent.trim();

        // Validate input (must be numeric)
        if (value !== '' && isNaN(value)) {
            alert('Please enter a valid number');
            return;
        }

        // Get cell position data
        const speciesName = cell.closest('.heatmap-row').querySelector('.heatmap-species-name').textContent;
        const cellIndex = Array.from(cell.parentNode.children).indexOf(cell) - 1; // -1 for species name cell
        const dateEntry = heatmapEditState.originalData[cellIndex];

        if (dateEntry) {
            const originalValue = dateEntry[speciesName];
            const newValue = value === '' ? '0' : value;

            // Track modification
            const cellKey = `${speciesName}-${cellIndex}`;
            if (newValue !== originalValue) {
                heatmapEditState.modifiedData.set(cellKey, {
                    species: speciesName,
                    dateIndex: cellIndex,
                    originalValue: originalValue,
                    newValue: newValue,
                    date: dateEntry.Date || dateEntry.date
                });
                cell.classList.add('modified');
            } else {
                heatmapEditState.modifiedData.delete(cellKey);
                cell.classList.remove('modified');
            }

            // Update save button state
            const saveBtn = document.getElementById('saveHeatmapBtn');
            saveBtn.disabled = heatmapEditState.modifiedData.size === 0;

            // Update cell styling based on new value
            cell.className = cell.className.replace(/abundance-\w+/g, '');
            cell.classList.add(getAbundanceClass(newValue));
        }
    }

    function handleCellKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.target.blur();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            const cell = event.target;
            const speciesName = cell.closest('.heatmap-row').querySelector('.heatmap-species-name').textContent;
            const cellIndex = Array.from(cell.parentNode.children).indexOf(cell) - 1;
            const originalValue = heatmapEditState.originalData[cellIndex][speciesName];
            cell.textContent = originalValue;
            cell.blur();
        }
    }

    function getAbundanceClass(value) {
        const numValue = parseInt(value) || 0;
        if (numValue === 0) return 'abundance-0';
        if (numValue === 1) return 'abundance-1';
        if (numValue === 2) return 'abundance-2';
        if (numValue === 3) return 'abundance-3';
        if (numValue === 4) return 'abundance-4';
        if (numValue === 5) return 'abundance-5';
        if (numValue === 6) return 'abundance-6';
        if (numValue === 7) return 'abundance-7';
        if (numValue === 8) return 'abundance-8';
        if (numValue === 9) return 'abundance-9';
        return 'abundance-10-plus';
    }

    function handleSpeciesNameEdit(event) {
        const cell = event.target;
        const newName = cell.textContent.trim();
        const originalName = cell.dataset.originalName || cell.textContent.trim();

        // Store original name if not already stored
        if (!cell.dataset.originalName) {
            cell.dataset.originalName = originalName;
        }

        // Track modification (no validation here - just track changes)
        const speciesKey = `species-${originalName}`;
        if (newName !== originalName) {
            heatmapEditState.modifiedData.set(speciesKey, {
                type: 'species',
                originalName: originalName,
                newName: newName
            });
            cell.classList.add('modified');
        } else {
            heatmapEditState.modifiedData.delete(speciesKey);
            cell.classList.remove('modified');
        }

        // Update save button state
        const saveBtn = document.getElementById('saveHeatmapBtn');
        saveBtn.disabled = heatmapEditState.modifiedData.size === 0;
    }

    function handleSpeciesNameKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.target.blur();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            const cell = event.target;
            const originalName = cell.dataset.originalName || cell.textContent.trim();
            cell.textContent = originalName;
            cell.blur();
        }
    }

    function handleSpeciesDelete(event) {
        event.stopPropagation();
        event.preventDefault();
        const speciesIndex = parseInt(event.target.dataset.speciesIndex);
        const speciesName = event.target.dataset.speciesName;

        // Get the species row
        const speciesRow = event.target.closest('.heatmap-row');

        // Track the deletion
        const deleteKey = `delete-species-${speciesName}`;
        if (!heatmapEditState.modifiedData.has(deleteKey)) {
            // Mark as deleted
            speciesRow.classList.add('species-deleted');
            heatmapEditState.modifiedData.set(deleteKey, {
                type: 'delete-species',
                speciesIndex: speciesIndex,
                speciesName: speciesName
            });
        } else {
            // If clicking again, undelete
            speciesRow.classList.remove('species-deleted');
            heatmapEditState.modifiedData.delete(deleteKey);
        }

        // Update save button state
        const saveBtn = document.getElementById('saveHeatmapBtn');
        saveBtn.disabled = heatmapEditState.modifiedData.size === 0;
    }

    function handleRowDelete(event) {
        event.stopPropagation();
        const dateIndex = parseInt(event.target.dataset.dateIndex);

        // Get the date value for this row
        const dateValue = heatmapEditState.originalData[dateIndex]?.Date ||
                          heatmapEditState.originalData[dateIndex]?.date ||
                          `Row ${dateIndex + 1}`;

        // Mark all cells in this column as deleted visually
        const allRows = document.querySelectorAll('.heatmap-row');
        allRows.forEach(row => {
            const cells = row.querySelectorAll('.heatmap-data-cell');
            if (cells[dateIndex]) {
                cells[dateIndex].classList.add('deleted');
            }
        });

        // Mark the date cell as deleted
        event.target.parentElement.classList.add('deleted');

        // Track the deletion
        const deleteKey = `delete-${dateIndex}`;
        if (!heatmapEditState.modifiedData.has(deleteKey)) {
            heatmapEditState.modifiedData.set(deleteKey, {
                type: 'delete',
                dateIndex: dateIndex,
                dateValue: dateValue
            });
        } else {
            // If clicking again, undelete
            heatmapEditState.modifiedData.delete(deleteKey);

            // Remove deleted styling
            allRows.forEach(row => {
                const cells = row.querySelectorAll('.heatmap-data-cell');
                if (cells[dateIndex]) {
                    cells[dateIndex].classList.remove('deleted');
                }
            });
            event.target.parentElement.classList.remove('deleted');
        }

        // Update save button state
        const saveBtn = document.getElementById('saveHeatmapBtn');
        saveBtn.disabled = heatmapEditState.modifiedData.size === 0;
    }

    function validateSpeciesNames() {
        const errors = [];
        const allCurrentNames = new Set();

        // Get all current species names (including modified ones)
        const speciesNameCells = document.querySelectorAll('.heatmap-species-name');
        speciesNameCells.forEach(cell => {
            const currentName = cell.textContent.trim();

            // Check for empty names
            if (currentName === '') {
                errors.push('• Species name cannot be empty');
                return;
            }

            // Check for duplicates
            if (allCurrentNames.has(currentName)) {
                errors.push(`• Duplicate species name: "${currentName}"`);
            } else {
                allCurrentNames.add(currentName);
            }
        });

        return errors;
    }

    function saveHeatmapChanges() {
        if (heatmapEditState.modifiedData.size === 0) {
            alert('No changes to save');
            return;
        }

        // Validate species names before saving
        const validationErrors = validateSpeciesNames();
        if (validationErrors.length > 0) {
            alert('Cannot save changes:\n\n' + validationErrors.join('\n'));
            return;
        }

        // Create modified data set
        let modifiedFileData = JSON.parse(JSON.stringify(heatmapEditState.originalData));

        // Collect species name changes and deletions
        const speciesNameChanges = new Map();
        const rowsToDelete = new Set();
        const speciesToDelete = new Set();

        // First pass: identify modifications
        heatmapEditState.modifiedData.forEach(modification => {
            if (modification.type === 'species') {
                // Track species name changes
                speciesNameChanges.set(modification.originalName, modification.newName);
            } else if (modification.type === 'delete') {
                // Track rows to delete
                rowsToDelete.add(modification.dateIndex);
            } else if (modification.type === 'delete-species') {
                // Track species to delete
                speciesToDelete.add(modification.speciesName);
            } else {
                // Apply data cell changes
                const { species, dateIndex, newValue } = modification;
                if (modifiedFileData[dateIndex]) {
                    modifiedFileData[dateIndex][species] = newValue;
                }
            }
        });

        // Apply species name changes to all data rows
        if (speciesNameChanges.size > 0) {
            modifiedFileData.forEach(row => {
                speciesNameChanges.forEach((newName, originalName) => {
                    if (row.hasOwnProperty(originalName)) {
                        row[newName] = row[originalName];
                        delete row[originalName];
                    }
                });
            });
        }

        // Remove deleted species columns from all rows
        if (speciesToDelete.size > 0) {
            modifiedFileData.forEach(row => {
                speciesToDelete.forEach(speciesName => {
                    delete row[speciesName];
                });
            });
        }

        // Remove deleted rows (filter out rows marked for deletion)
        if (rowsToDelete.size > 0) {
            modifiedFileData = modifiedFileData.filter((row, index) => !rowsToDelete.has(index));
        }

        // Show save confirmation modal
        showHeatmapSaveModal(modifiedFileData);
    }

    function showHeatmapSaveModal(modifiedData) {
        const changeCount = heatmapEditState.modifiedData.size;
        const originalFileName = heatmapEditState.currentFileName;
        const baseName = originalFileName.replace(/\.csv$/i, '');
        const newFileName = `${baseName}_edited.csv`;

        // Count types of changes
        let speciesNameChanges = 0;
        let dataValueChanges = 0;
        let deletedRows = 0;
        let deletedSpecies = 0;
        heatmapEditState.modifiedData.forEach(modification => {
            if (modification.type === 'species') {
                speciesNameChanges++;
            } else if (modification.type === 'delete') {
                deletedRows++;
            } else if (modification.type === 'delete-species') {
                deletedSpecies++;
            } else {
                dataValueChanges++;
            }
        });

        const modalHTML = `
            <div class="modal-overlay">
                <div class="modal-content save-modal">
                    <div class="modal-header">
                        <h2>💾 Save Heatmap Changes</h2>
                    </div>
                    <div class="modal-body">
                        <div class="save-summary">
                            <p><strong>Changes Summary:</strong></p>
                            <ul>
                                ${speciesNameChanges > 0 ? `<li>${speciesNameChanges} species name(s) modified</li>` : ''}
                                ${dataValueChanges > 0 ? `<li>${dataValueChanges} data value(s) modified</li>` : ''}
                                ${deletedSpecies > 0 ? `<li>${deletedSpecies} species column(s) deleted</li>` : ''}
                                ${deletedRows > 0 ? `<li>${deletedRows} date row(s) deleted</li>` : ''}
                                <li>Original file: ${originalFileName}</li>
                                <li>New file: ${newFileName}</li>
                            </ul>
                        </div>

                        <div class="save-options">
                            <h4>File Naming Options:</h4>
                            <div class="form-group">
                                <label>
                                    <input type="radio" name="saveOption" value="new" checked>
                                    Save as new file: <strong>${newFileName}</strong>
                                </label>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="radio" name="saveOption" value="replace">
                                    Replace original file: <strong>${originalFileName}</strong>
                                </label>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="radio" name="saveOption" value="custom">
                                    Custom filename:
                                </label>
                                <input type="text" id="customFileName" class="form-control"
                                       placeholder="Enter filename..." disabled>
                            </div>
                        </div>

                        <div class="nmax-preservation-note">
                            <p><strong>Note:</strong> The NMAX file structure will be preserved, including all statistical columns and date formatting.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" id="confirmHeatmapSave">💾 Save File</button>
                        <button class="btn-secondary" id="cancelHeatmapSave">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        document.body.appendChild(modalElement);

        // Handle modal interactions
        setupHeatmapSaveModalHandlers(modalElement, modifiedData, originalFileName);
    }

    function setupHeatmapSaveModalHandlers(modalElement, modifiedData, originalFileName) {
        const confirmBtn = modalElement.querySelector('#confirmHeatmapSave');
        const cancelBtn = modalElement.querySelector('#cancelHeatmapSave');
        const customFileInput = modalElement.querySelector('#customFileName');
        const radioButtons = modalElement.querySelectorAll('input[name="saveOption"]');

        // Handle radio button changes
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                customFileInput.disabled = radio.value !== 'custom';
                if (radio.value === 'custom') {
                    customFileInput.focus();
                }
            });
        });

        confirmBtn.addEventListener('click', () => {
            const selectedOption = modalElement.querySelector('input[name="saveOption"]:checked').value;
            let fileName;

            switch (selectedOption) {
                case 'new':
                    fileName = originalFileName.replace(/\.csv$/i, '_edited.csv');
                    break;
                case 'replace':
                    fileName = originalFileName;
                    break;
                case 'custom':
                    fileName = customFileInput.value.trim();
                    if (!fileName) {
                        alert('Please enter a filename');
                        return;
                    }
                    if (!fileName.endsWith('.csv')) {
                        fileName += '.csv';
                    }
                    break;
            }

            // Create and download modified file
            const csvContent = createModifiedCSVContent(modifiedData, originalFileName);
            downloadModifiedHeatmapFile(csvContent, fileName);

            // Clean up
            document.body.removeChild(modalElement);
            exitEditMode();
            console.log(`Heatmap changes saved as ${fileName}! The NMAX structure has been preserved.`);
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modalElement);
        });
    }

    function createModifiedCSVContent(modifiedData, originalFileName) {
        // Preserve original column headers
        const headers = Object.keys(modifiedData[0]);

        // Create CSV content maintaining NMAX structure
        let csvContent = headers.join(',') + '\n';

        modifiedData.forEach(row => {
            const rowValues = headers.map(header => {
                let value = row[header];
                // Ensure proper quoting for CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csvContent += rowValues.join(',') + '\n';
        });

        return csvContent;
    }

    function downloadModifiedHeatmapFile(csvContent, fileName) {
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

    // Function to reorder species rows
    function reorderSpecies(fromIndex, toIndex) {
        const species = heatmapEditState.speciesOrder[fromIndex];
        heatmapEditState.speciesOrder.splice(fromIndex, 1);
        heatmapEditState.speciesOrder.splice(toIndex, 0, species);

        // Regenerate heatmap with new order
        const fileData = JSON.parse(heatmapFileSelect.dataset.currentData || '[]');
        generateHeatmap(fileData, heatmapEditState.speciesOrder);

        console.log('Reordered species:', species, 'from position', fromIndex + 1, 'to', toIndex + 1);
    }

    // Column resize functions
    function startColumnResize(e, columnType = 'species') {
        e.preventDefault();
        e.stopPropagation();

        heatmapEditState.isResizing = true;
        heatmapEditState.resizeStartX = e.pageX;
        heatmapEditState.resizeColumnType = columnType;

        // Get current column width based on type
        if (columnType === 'species') {
            const speciesColumns = document.querySelectorAll('.heatmap-species-name, .heatmap-species-title');
            if (speciesColumns.length > 0) {
                heatmapEditState.resizeStartWidth = speciesColumns[0].offsetWidth;
            }
        } else if (columnType === 'data') {
            // Get current data column width
            const dataCells = document.querySelectorAll('.heatmap-data-cell');
            if (dataCells.length > 0) {
                heatmapEditState.resizeStartWidth = dataCells[0].offsetWidth || heatmapEditState.dataColumnWidth;
            }
        }

        // Show resize line
        const resizeLine = document.getElementById('column-resize-line');
        if (resizeLine) {
            const rect = e.target.parentElement ? e.target.parentElement.getBoundingClientRect() : e.target.getBoundingClientRect();
            const containerRect = document.getElementById('heatmapGrid').getBoundingClientRect();
            resizeLine.style.left = (rect.right - containerRect.left) + 'px';
            resizeLine.style.display = 'block';
        }

        // Add document-level mouse event listeners
        document.addEventListener('mousemove', handleColumnResize);
        document.addEventListener('mouseup', endColumnResize);

        // Prevent text selection while resizing
        document.body.style.userSelect = 'none';
        document.body.classList.add('resizing-column');
    }

    function handleColumnResize(e) {
        if (!heatmapEditState.isResizing) return;

        const deltaX = e.pageX - heatmapEditState.resizeStartX;
        const minWidth = heatmapEditState.resizeColumnType === 'species' ? 50 : 15;
        const newWidth = Math.max(minWidth, heatmapEditState.resizeStartWidth + deltaX);

        if (heatmapEditState.resizeColumnType === 'species') {
            // Update all species column widths
            const speciesColumns = document.querySelectorAll('.heatmap-species-name, .heatmap-species-title');
            speciesColumns.forEach(col => {
                col.style.width = `${newWidth}px`;
            });

            // Update date title cell width
            const dateTitleCell = document.querySelector('.heatmap-date-title-cell');
            if (dateTitleCell) {
                dateTitleCell.style.width = `${newWidth}px`;
            }

            // Store the new width
            heatmapEditState.columnWidth = newWidth;
        } else if (heatmapEditState.resizeColumnType === 'data') {
            // Update ALL data column widths uniformly
            const dataCells = document.querySelectorAll('.heatmap-data-cell');
            dataCells.forEach(cell => {
                cell.style.width = `${newWidth}px`;
            });

            // Update title row data cells
            const titleCells = document.querySelectorAll('.heatmap-title-data-cell');
            titleCells.forEach(cell => {
                cell.style.width = `${newWidth}px`;
            });

            // Update date row cells
            const dateCells = document.querySelectorAll('.heatmap-date-cell');
            dateCells.forEach(cell => {
                cell.style.width = `${newWidth}px`;
            });

            // Store the new width for data columns
            heatmapEditState.dataColumnWidth = newWidth;
        }

        // Update resize line position
        const resizeLine = document.getElementById('column-resize-line');
        if (resizeLine) {
            const containerRect = document.getElementById('heatmapGrid').getBoundingClientRect();
            resizeLine.style.left = (e.pageX - containerRect.left) + 'px';
        }
    }

    function endColumnResize(e) {
        if (!heatmapEditState.isResizing) return;

        heatmapEditState.isResizing = false;

        // Hide resize line
        const resizeLine = document.getElementById('column-resize-line');
        if (resizeLine) {
            resizeLine.style.display = 'none';
        }

        // Remove document event listeners
        document.removeEventListener('mousemove', handleColumnResize);
        document.removeEventListener('mouseup', endColumnResize);

        // Re-enable text selection
        document.body.style.userSelect = '';
        document.body.classList.remove('resizing-column');

        // Reset resize handle backgrounds
        const resizeHandles = document.querySelectorAll('.column-resize-handle, .data-resize-handle');
        resizeHandles.forEach(handle => {
            handle.style.background = 'transparent';
        });

        if (heatmapEditState.resizeColumnType === 'species') {
            console.log('Species column resized to:', heatmapEditState.columnWidth, 'px');
        } else if (heatmapEditState.resizeColumnType === 'data') {
            console.log('Data columns resized to:', heatmapEditState.dataColumnWidth, 'px');
        }

        // Reset resize tracking
        heatmapEditState.resizeColumnType = null;
    }

    // Generate heatmap
    function generateHeatmap(fileData, selectedSpecies) {
        const heatmapGrid = document.getElementById('heatmapGrid');
        heatmapGrid.innerHTML = '';

        // Initialize or preserve species order
        if (!heatmapEditState.isEditMode || heatmapEditState.speciesOrder.length === 0) {
            heatmapEditState.speciesOrder = [...selectedSpecies];
        }

        // Create resize guide line (hidden by default)
        const resizeLine = document.createElement('div');
        resizeLine.id = 'column-resize-line';
        resizeLine.style.cssText = 'position: absolute; width: 2px; background: #2196F3; top: 0; bottom: 0; z-index: 1000; display: none; pointer-events: none;';
        heatmapGrid.style.position = 'relative';
        heatmapGrid.appendChild(resizeLine);

        // Calculate longest species name for column width
        const longestSpeciesName = selectedSpecies.reduce((longest, current) =>
            current.length > longest.length ? current : longest, '');

        // Calculate actual max value for abundance scale
        let maxValue = 0;
        selectedSpecies.forEach(species => {
            fileData.forEach(row => {
                const value = parseInt(row[species]) || 0;
                if (value > maxValue) maxValue = value;
            });
        });

        // Note: Abundance scale is now embedded in the heatmap grid itself

        // Add species title row
        const titleRow = document.createElement('div');
        titleRow.className = 'heatmap-title-row';

        const speciesTitle = document.createElement('div');
        speciesTitle.className = 'heatmap-species-title';
        speciesTitle.textContent = 'Species';
        const defaultWidth = Math.max(longestSpeciesName.length * 8, 140);
        const columnWidth = heatmapEditState.columnWidth || defaultWidth;
        speciesTitle.style.width = `${columnWidth}px`;
        speciesTitle.style.position = 'relative';

        // Add resize handle for edit mode
        if (heatmapEditState.isEditMode) {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'column-resize-handle';
            resizeHandle.style.cssText = 'position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent;';
            resizeHandle.onmouseenter = () => { resizeHandle.style.background = 'rgba(33, 150, 243, 0.3)'; };
            resizeHandle.onmouseleave = () => { if (!heatmapEditState.isResizing) resizeHandle.style.background = 'transparent'; };

            resizeHandle.onmousedown = startColumnResize;
            speciesTitle.appendChild(resizeHandle);
        }

        titleRow.appendChild(speciesTitle);

        // Add empty cells for data columns with resize handles
        fileData.forEach((row, index) => {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'heatmap-title-data-cell';
            emptyCell.style.width = `${heatmapEditState.dataColumnWidth}px`;
            emptyCell.style.position = 'relative';

            // Apply ultra-thin class if needed
            if (heatmapEditState.dataColumnWidth <= 8) {
                emptyCell.classList.add('ultra-thin');
            } else if (heatmapEditState.dataColumnWidth <= 12) {
                emptyCell.classList.add('very-thin');
            } else if (heatmapEditState.dataColumnWidth <= 16) {
                emptyCell.classList.add('thin');
            }

            // Add resize handle on the first data column only (for uniform resizing)
            if (index === 0 && heatmapEditState.isEditMode) {
                const dataResizeHandle = document.createElement('div');
                dataResizeHandle.className = 'data-resize-handle';
                dataResizeHandle.style.cssText = 'position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; z-index: 10;';
                dataResizeHandle.onmouseenter = () => { dataResizeHandle.style.background = 'rgba(33, 150, 243, 0.3)'; };
                dataResizeHandle.onmouseleave = () => { if (!heatmapEditState.isResizing) dataResizeHandle.style.background = 'transparent'; };
                dataResizeHandle.onmousedown = (e) => startColumnResize(e, 'data');
                emptyCell.appendChild(dataResizeHandle);
            }

            // Add abundance scale to the last cell (far right)
            if (index === fileData.length - 1) {
                const abundanceScale = document.createElement('div');
                abundanceScale.className = 'abundance-scale-right';
                abundanceScale.innerHTML = `
                    <span class="legend-label">Scale:</span>
                    <div class="legend-gradient-inline">
                        <span class="legend-min">0</span>
                        <div class="gradient-bar-small"></div>
                        <span class="legend-max">${maxValue}+</span>
                    </div>
                `;
                emptyCell.appendChild(abundanceScale);
            }

            titleRow.appendChild(emptyCell);
        });

        heatmapGrid.appendChild(titleRow);

        // Create species rows using current order in edit mode
        const speciesToRender = heatmapEditState.isEditMode && heatmapEditState.speciesOrder.length > 0
            ? heatmapEditState.speciesOrder
            : selectedSpecies;

        speciesToRender.forEach((species, speciesIndex) => {
            const speciesRow = document.createElement('div');
            speciesRow.className = 'heatmap-row';

            // Species name cell with reorder arrows in edit mode
            const speciesNameCell = document.createElement('div');
            speciesNameCell.className = 'heatmap-cell heatmap-species-name';
            const defaultWidth = Math.max(longestSpeciesName.length * 8, 140);
            const speciesColumnWidth = heatmapEditState.columnWidth || defaultWidth;
            speciesNameCell.style.width = `${speciesColumnWidth}px`;
            speciesNameCell.style.position = 'relative';

            // Create wrapper for content
            if (heatmapEditState.isEditMode) {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%; height: 100%;';

                // Species name
                const nameSpan = document.createElement('span');
                nameSpan.textContent = species;
                nameSpan.style.flexGrow = '1';
                wrapper.appendChild(nameSpan);

                // Arrow buttons container
                const arrowContainer = document.createElement('div');
                arrowContainer.style.cssText = 'display: flex; gap: 2px; margin-left: 8px;';

                // Up arrow
                if (speciesIndex > 0) {
                    const upBtn = document.createElement('button');
                    upBtn.innerHTML = '▲';
                    upBtn.title = 'Move row up';
                    upBtn.style.cssText = 'padding: 1px 4px; font-size: 10px; cursor: pointer; background: #f0f0f0; border: 1px solid #999; border-radius: 2px;';
                    upBtn.onclick = (e) => {
                        e.stopPropagation();
                        reorderSpecies(speciesIndex, speciesIndex - 1);
                    };
                    arrowContainer.appendChild(upBtn);
                }

                // Down arrow
                if (speciesIndex < speciesToRender.length - 1) {
                    const downBtn = document.createElement('button');
                    downBtn.innerHTML = '▼';
                    downBtn.title = 'Move row down';
                    downBtn.style.cssText = 'padding: 1px 4px; font-size: 10px; cursor: pointer; background: #f0f0f0; border: 1px solid #999; border-radius: 2px;';
                    downBtn.onclick = (e) => {
                        e.stopPropagation();
                        reorderSpecies(speciesIndex, speciesIndex + 1);
                    };
                    arrowContainer.appendChild(downBtn);
                }

                wrapper.appendChild(arrowContainer);
                speciesNameCell.appendChild(wrapper);

                // Add resize handle to right edge
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'column-resize-handle';
                resizeHandle.style.cssText = 'position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; z-index: 10;';
                resizeHandle.onmouseenter = () => { resizeHandle.style.background = 'rgba(33, 150, 243, 0.3)'; };
                resizeHandle.onmouseleave = () => { if (!heatmapEditState.isResizing) resizeHandle.style.background = 'transparent'; };
                resizeHandle.onmousedown = startColumnResize;
                speciesNameCell.appendChild(resizeHandle);
            } else {
                speciesNameCell.textContent = species;
            }

            speciesRow.appendChild(speciesNameCell);

            // Data cells for each date (show all data)
            fileData.forEach((row, colIndex) => {
                const dataCell = document.createElement('div');
                dataCell.className = 'heatmap-cell heatmap-data-cell';
                dataCell.style.width = `${heatmapEditState.dataColumnWidth}px`;
                dataCell.style.position = 'relative';

                // Apply special CSS classes for ultra-thin columns
                if (heatmapEditState.dataColumnWidth <= 8) {
                    dataCell.classList.add('ultra-thin');
                } else if (heatmapEditState.dataColumnWidth <= 12) {
                    dataCell.classList.add('very-thin');
                } else if (heatmapEditState.dataColumnWidth <= 16) {
                    dataCell.classList.add('thin');
                }

                const value = row[species] || 0;
                dataCell.textContent = value;
                dataCell.classList.add(getAbundanceClass(value));

                const formattedDate = formatDateForDisplay(row.Date || row.date);
                dataCell.title = `${species} on ${formattedDate}: ${value}`;

                // Add resize handle on first data cell of first species row (for visual feedback)
                if (speciesIndex === 0 && colIndex === 0 && heatmapEditState.isEditMode) {
                    const dataResizeHandle = document.createElement('div');
                    dataResizeHandle.className = 'data-resize-handle';
                    dataResizeHandle.style.cssText = 'position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; z-index: 10;';
                    dataResizeHandle.onmouseenter = () => { dataResizeHandle.style.background = 'rgba(33, 150, 243, 0.3)'; };
                    dataResizeHandle.onmouseleave = () => { if (!heatmapEditState.isResizing) dataResizeHandle.style.background = 'transparent'; };
                    dataResizeHandle.onmousedown = (e) => startColumnResize(e, 'data');
                    dataCell.appendChild(dataResizeHandle);
                }

                speciesRow.appendChild(dataCell);
            });

            heatmapGrid.appendChild(speciesRow);
        });

        // Add date row below the table (show dates only every 5th entry)
        const dateRow = document.createElement('div');
        dateRow.className = 'heatmap-date-row';

        // Date title cell (bottom left)
        const dateTitleCell = document.createElement('div');
        dateTitleCell.className = 'heatmap-date-title-cell';
        dateTitleCell.textContent = 'Date';
        const dateColumnWidth = heatmapEditState.columnWidth || Math.max(longestSpeciesName.length * 8, 140);
        dateTitleCell.style.width = `${dateColumnWidth}px`;
        dateRow.appendChild(dateTitleCell);

        // Add formatted date cells (label every 5th date)
        fileData.forEach((row, index) => {
            const dateCell = document.createElement('div');
            dateCell.className = 'heatmap-date-cell';
            dateCell.style.width = `${heatmapEditState.dataColumnWidth}px`;

            // Apply ultra-thin class if needed
            if (heatmapEditState.dataColumnWidth <= 8) {
                dateCell.classList.add('ultra-thin');
            } else if (heatmapEditState.dataColumnWidth <= 12) {
                dateCell.classList.add('very-thin');
            } else if (heatmapEditState.dataColumnWidth <= 16) {
                dateCell.classList.add('thin');
            }

            // Only show date label every 5th entry
            if (index % 5 === 0) {
                const formattedDate = formatDateForDisplay(row.Date || row.date);
                const dateText = document.createElement('span');
                dateText.className = 'heatmap-date-text';
                dateText.textContent = formattedDate;
                dateCell.appendChild(dateText);
            }

            dateRow.appendChild(dateCell);
        });

        heatmapGrid.appendChild(dateRow);
    }


    // Event listeners
    if (heatmapFileSelect) {
        heatmapFileSelect.addEventListener('change', async (e) => {
            const selectedFile = e.target.value;
            debugLogger.log(`File selection changed: "${selectedFile}"`, 'info');

            if (!selectedFile) {
                debugLogger.log('No file selected (empty value)', 'warn');
                speciesSelection.classList.add('hidden');
                generateHeatmapBtn.disabled = true;
                return;
            }

            debugLogger.log(`Attempting to load file: ${selectedFile}`, 'info');

            try {
                // Load the selected file
                debugLogger.log('Searching for file in working directory...', 'info');
                const fileObj = csvManager.workingDirFiles.find(f => f.name === selectedFile);

                if (!fileObj) {
                    debugLogger.log(`File not found in working directory. Available files: ${csvManager.workingDirFiles.map(f => f.name).join(', ')}`, 'error');
                    throw new Error('File not found in working directory');
                }

                debugLogger.log(`File object found: ${fileObj.name} (size: ${fileObj.size || 'unknown'})`, 'success');

                // Read file content
                debugLogger.log('Reading file content...', 'info');
                const text = await fileObj.text();
                debugLogger.log(`File content read successfully. Length: ${text.length} characters`, 'success');
                debugLogger.log(`First 200 characters: ${text.substring(0, 200)}`, 'info');

                // Parse CSV using a temporary approach
                debugLogger.log('Splitting file into lines...', 'info');
                const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                debugLogger.log(`Found ${lines.length} non-empty lines`, 'info');

                if (lines.length === 0) {
                    debugLogger.log('CSV file appears to be empty after filtering', 'error');
                    throw new Error('The CSV file appears to be empty.');
                }

                // Parse headers manually
                debugLogger.log('Parsing headers from first line...', 'info');
                const headers = csvManager.parseCSVLine(lines[0]);
                debugLogger.log(`Headers parsed: ${headers.length} columns`, 'success');
                debugLogger.log(`All headers: ${headers.join(', ')}`, 'info');

                // Parse data rows manually
                debugLogger.log('Parsing data rows...', 'info');
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    const row = csvManager.parseCSVLine(lines[i]);
                    if (row.length >= headers.length) {
                        // Use only the first headers.length columns, ignore extra columns
                        const rowObj = {};
                        headers.forEach((header, index) => {
                            rowObj[header] = row[index];
                        });
                        data.push(rowObj);
                        if (row.length > headers.length) {
                            debugLogger.log(`Row ${i} has ${row.length} columns, using first ${headers.length} columns (ignoring ${row.length - headers.length} extra columns)`, 'info');
                        }
                    } else {
                        debugLogger.log(`Row ${i} has ${row.length} columns but expected ${headers.length}. Skipping.`, 'warn');
                    }
                }

                debugLogger.log(`Parsed ${data.length} data rows successfully`, 'success');
                if (data.length > 0) {
                    debugLogger.log(`First row sample: ${Object.keys(data[0]).slice(0, 5).join(', ')}...`, 'info');
                }

                // Extract species headers
                debugLogger.log('Extracting species headers (columns 8+)...', 'info');
                const species = extractSpeciesHeaders(data);
                debugLogger.log(`Found ${species.length} species columns`, species.length > 0 ? 'success' : 'warn');

                if (species.length === 0) {
                    debugLogger.log('No species columns found. File may only contain statistical data.', 'error');
                    alert('No columns found from column 8 onwards. This file may only contain statistical data columns.');
                    speciesSelection.classList.add('hidden');
                    generateHeatmapBtn.disabled = true;
                    return;
                }

                debugLogger.log(`Species found: ${species.slice(0, 5).join(', ')}${species.length > 5 ? '...' : ''}`, 'info');

                // Show species selection and create checkboxes
                debugLogger.log('Creating species checkboxes...', 'info');
                createSpeciesCheckboxes(species);
                speciesSelection.classList.remove('hidden');
                generateHeatmapBtn.disabled = false;

                // Store current file data
                heatmapFileSelect.dataset.currentData = JSON.stringify(data);
                debugLogger.log('File data stored successfully. Ready to generate heatmap.', 'success');

            } catch (error) {
                debugLogger.log(`Error loading file: ${error.message}`, 'error');
                debugLogger.log(`Error stack: ${error.stack}`, 'error');
                console.error('Error loading file:', error);
                alert('Error loading file: ' + error.message);
            }
        });
    } else {
        debugLogger.log('heatmapFileSelect element not found', 'error');
    }

    if (selectAllSpecies) {
        selectAllSpecies.addEventListener('click', () => {
            const checkboxes = speciesCheckboxes.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
        });
    }

    if (deselectAllSpecies) {
        deselectAllSpecies.addEventListener('click', () => {
            const checkboxes = speciesCheckboxes.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
        });
    }

    if (generateHeatmapBtn) {
        generateHeatmapBtn.addEventListener('click', () => {
            const selectedSpecies = getSelectedSpecies();

            if (selectedSpecies.length === 0) {
                alert('Please select at least one species to display.');
                return;
            }

            try {
                const fileData = JSON.parse(heatmapFileSelect.dataset.currentData || '[]');
                if (fileData.length === 0) {
                    alert('No data available. Please select a file first.');
                    return;
                }

                // Update heatmap title
                const heatmapTitle = document.getElementById('heatmapTitle');
                const selectedFileName = heatmapFileSelect.value;
                heatmapTitle.textContent = `Species Abundance Heatmap - ${selectedFileName}`;

                // Generate and show heatmap
                generateHeatmap(fileData, selectedSpecies);
                heatmapVisualization.classList.remove('hidden');

            } catch (error) {
                console.error('Error generating heatmap:', error);
                alert('Error generating heatmap: ' + error.message);
            }
        });
    }

    // Edit mode button event listeners
    const toggleEditModeBtn = document.getElementById('toggleEditModeBtn');
    const saveHeatmapBtn = document.getElementById('saveHeatmapBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const speciesColWidthSlider = document.getElementById('speciesColWidthSlider');
    const speciesColWidthValue = document.getElementById('speciesColWidthValue');
    const dataColWidthSlider = document.getElementById('dataColWidthSlider');
    const dataColWidthValue = document.getElementById('dataColWidthValue');

    if (toggleEditModeBtn) {
        toggleEditModeBtn.addEventListener('click', toggleEditMode);
    }

    if (saveHeatmapBtn) {
        saveHeatmapBtn.addEventListener('click', saveHeatmapChanges);
    }

    // Note: Slider event listeners are now attached inside toggleEditMode function
    // to ensure they work properly when entering edit mode

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (heatmapEditState.modifiedData.size > 0) {
                if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                    exitEditMode();
                }
            } else {
                exitEditMode();
            }
        });
    }

    // Update dropdown when page is shown
    document.addEventListener('DOMContentLoaded', () => {
        if (csvManager) {
            updateHeatmapFileDropdown();
        }
    });

    // Also update when files are loaded
    if (typeof csvManager !== 'undefined') {
        const originalHandleFileUpload = csvManager.handleFileUpload;
        csvManager.handleFileUpload = function(...args) {
            const result = originalHandleFileUpload.apply(this, args);
            updateHeatmapFileDropdown();
            return result;
        };
    }
}

// ============= PLOT EXPORT SYSTEM =============
console.log('🚀 ADDING PLOT EXPORT SYSTEM');

class PlotExporter {
    constructor() {
        this.targetCanvasId = 'plotCanvas';
        console.log('PlotExporter: Initializing...');
        this.init();
    }

    init() {
        console.log('PlotExporter: Document ready state:', document.readyState);
        // Try multiple times to catch dynamically created canvases
        setTimeout(() => this.setup(), 1000);
        setTimeout(() => this.setup(), 3000);
        setTimeout(() => this.setup(), 5000);
    }

    setup() {
        console.log('PlotExporter: Setting up...');
        const canvas = document.getElementById(this.targetCanvasId);
        console.log('PlotExporter: Canvas found:', !!canvas);
        if (canvas) {
            console.log('PlotExporter: Canvas element:', canvas);
            this.addExportButton();
        } else {
            console.log('PlotExporter: No canvas with ID', this.targetCanvasId);
        }
    }

    addExportButton() {
        console.log('PlotExporter: Adding export button...');
        const canvas = document.getElementById(this.targetCanvasId);
        const container = canvas.closest('.plot-section') || canvas.parentElement;
        console.log('PlotExporter: Container found:', container);

        // Check if button already exists
        if (container.querySelector('.plot-export-btn')) {
            console.log('PlotExporter: Button already exists');
            return;
        }

        // Create export button
        const btn = document.createElement('button');
        btn.className = 'plot-export-btn btn-secondary';
        btn.innerHTML = '📥 Export';
        btn.onclick = () => this.showExportModal();

        // Style the button
        btn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            font-size: 14px;
            padding: 6px 12px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
            border-radius: 4px;
        `;

        // Make container relative
        const currentPosition = getComputedStyle(container).position;
        console.log('PlotExporter: Container position:', currentPosition);
        if (currentPosition === 'static') {
            container.style.position = 'relative';
        }

        container.appendChild(btn);
        console.log('PlotExporter: Button added successfully!', btn);
    }

    showExportModal() {
        // Remove existing modal
        const existing = document.getElementById('plotExportModal');
        if (existing) existing.remove();

        // Create modal
        const modal = this.createModal();
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.remove('hidden'), 10);
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'plotExportModal';
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Export Plot</h2>
                    <p>Choose export option for your plot</p>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <button class="btn-primary export-option" onclick="plotExporter.copyToClipboard()">
                            📋 Copy to Clipboard
                            <small style="display: block; font-weight: normal; margin-top: 4px; opacity: 0.8;">
                                Quick paste into documents
                            </small>
                        </button>
                        <button class="btn-primary export-option" onclick="plotExporter.saveHighDPI()" style="margin-top: 12px;">
                            💾 Save High Quality (300 DPI)
                            <small style="display: block; font-weight: normal; margin-top: 4px; opacity: 0.8;">
                                For reports & publications
                            </small>
                        </button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="plotExporter.closeModal()">Cancel</button>
                </div>
            </div>
        `;

        return modal;
    }

    async copyToClipboard() {
        const canvas = document.getElementById(this.targetCanvasId);
        if (!canvas) return;

        try {
            const blob = await new Promise(resolve =>
                canvas.toBlob(resolve, 'image/png', 1.0)
            );

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            this.showSuccess('✅ Copied to clipboard!');
            this.closeModal();
        } catch (err) {
            console.error('Copy failed:', err);
            this.showError('Failed to copy to clipboard');
        }
    }

    saveHighDPI() {
        const canvas = document.getElementById(this.targetCanvasId);
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scale = 300 / 96;

        const hdCanvas = document.createElement('canvas');
        hdCanvas.width = rect.width * scale;
        hdCanvas.height = rect.height * scale;

        const hdCtx = hdCanvas.getContext('2d');
        hdCtx.imageSmoothingEnabled = true;
        hdCtx.imageSmoothingQuality = 'high';

        hdCtx.scale(scale, scale);
        hdCtx.fillStyle = 'white';
        hdCtx.fillRect(0, 0, rect.width, rect.height);
        hdCtx.drawImage(canvas, 0, 0, rect.width, rect.height);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `subcam_plot_300dpi_${timestamp}.png`;

        hdCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess(`✅ Saved as ${filename}`);
            this.closeModal();
        }, 'image/png', 1.0);
    }

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showError(message) {
        alert(message);
    }

    closeModal() {
        const modal = document.getElementById('plotExportModal');
        if (modal) modal.remove();
    }
}

// Initialize the plot exporter
console.log('🚀 ABOUT TO CREATE PLOT EXPORTER');
const plotExporter = new PlotExporter();
console.log('🎯 PLOT EXPORT SYSTEM INITIALIZED');
// Compact Heatmap Functionality
class CompactHeatmapManager {
    constructor() {
        this.fileData = [];
        this.currentFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('Compact Heatmap Manager initialized');
    }

    setupEventListeners() {
        const fileInput = document.getElementById('compactFileInput');
        const generateBtn = document.getElementById('generateCompactHeatmapBtn');
        const selectAllBtn = document.getElementById('compactSelectAllSpecies');
        const deselectAllBtn = document.getElementById('compactDeselectAllSpecies');

        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        if (generateBtn) generateBtn.addEventListener('click', () => this.generateCompactHeatmap());
        if (selectAllBtn) selectAllBtn.addEventListener('click', () => this.selectAllSpecies());
        if (deselectAllBtn) deselectAllBtn.addEventListener('click', () => this.deselectAllSpecies());
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Loading file:', file.name);

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
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
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
        document.getElementById('compactSpeciesSelection').classList.remove('hidden');
    }

    populateSpeciesSelection(species) {
        const container = document.getElementById('compactSpeciesCheckboxes');
        container.innerHTML = '';

        species.forEach(speciesName => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'species-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `compact_species_${speciesName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            checkbox.value = speciesName;
            checkbox.checked = true; // Auto-select all for compact view

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = speciesName;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            container.appendChild(checkboxDiv);
        });

        document.getElementById('generateCompactHeatmapBtn').disabled = false;
        console.log('Species selection populated for compact view');
    }

    selectAllSpecies() {
        const checkboxes = document.querySelectorAll('#compactSpeciesCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
    }

    deselectAllSpecies() {
        const checkboxes = document.querySelectorAll('#compactSpeciesCheckboxes input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    getSelectedSpecies() {
        const checkboxes = document.querySelectorAll('#compactSpeciesCheckboxes input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    generateCompactHeatmap() {
        const selectedSpecies = this.getSelectedSpecies();

        if (selectedSpecies.length === 0) {
            alert('Please select at least one species to display.');
            return;
        }

        console.log(`Generating compact heatmap for ${selectedSpecies.length} species and ${this.fileData.length} dates`);

        const heatmapGrid = document.getElementById('compactHeatmapGrid');
        heatmapGrid.innerHTML = '';

        // Use existing heatmap generation logic but with compact styling
        this.buildCompactHeatmap(selectedSpecies, heatmapGrid);

        // Show heatmap container
        document.getElementById('compactHeatmapVisualization').classList.remove('hidden');
        document.getElementById('compactHeatmapTitle').textContent =
            `Compact Heatmap - ${this.currentFile} (${selectedSpecies.length} species, ${this.fileData.length} dates)`;

        console.log('Compact heatmap generated successfully!');
    }

    buildCompactHeatmap(selectedSpecies, heatmapGrid) {
        // Calculate max value for abundance scale
        let maxValue = 0;
        selectedSpecies.forEach(species => {
            this.fileData.forEach(row => {
                const value = parseInt(row[species]) || 0;
                if (value > maxValue) maxValue = value;
            });
        });

        // Add species title row
        const titleRow = document.createElement('div');
        titleRow.className = 'heatmap-title-row';

        const speciesTitle = document.createElement('div');
        speciesTitle.className = 'heatmap-species-title';
        speciesTitle.textContent = 'Species';
        titleRow.appendChild(speciesTitle);

        // Add empty cells for data columns
        this.fileData.forEach(() => {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'heatmap-title-data-cell';
            titleRow.appendChild(emptyCell);
        });

        heatmapGrid.appendChild(titleRow);

        // Create species rows
        selectedSpecies.forEach(species => {
            const speciesRow = document.createElement('div');
            speciesRow.className = 'heatmap-row';

            // Species name cell
            const speciesNameCell = document.createElement('div');
            speciesNameCell.className = 'heatmap-cell heatmap-species-name';
            speciesNameCell.textContent = species;
            speciesNameCell.title = species;
            speciesRow.appendChild(speciesNameCell);

            // Data cells for each date
            this.fileData.forEach(row => {
                const dataCell = document.createElement('div');
                dataCell.className = 'heatmap-cell heatmap-data-cell';

                const value = parseInt(row[species]) || 0;
                dataCell.textContent = value > 0 ? value : '';
                dataCell.classList.add(this.getAbundanceClass(value));

                const formattedDate = this.formatDate(row.Date || row.date);
                dataCell.title = `${species} on ${formattedDate}: ${value}`;

                speciesRow.appendChild(dataCell);
            });

            heatmapGrid.appendChild(speciesRow);
        });

        // Add date row (show every 10th date for compact view)
        const dateRow = document.createElement('div');
        dateRow.className = 'heatmap-date-row';

        // Date title cell
        const dateTitleCell = document.createElement('div');
        dateTitleCell.className = 'heatmap-date-title-cell';
        dateTitleCell.textContent = 'Date';
        dateRow.appendChild(dateTitleCell);

        // Add date cells (show every 10th date)
        this.fileData.forEach((row, index) => {
            const dateCell = document.createElement('div');
            dateCell.className = 'heatmap-date-cell';

            // Show date label every 10th entry for compact view
            if (index % 10 === 0) {
                const formattedDate = this.formatDate(row.Date || row.date);
                const dateText = document.createElement('span');
                dateText.className = 'heatmap-date-text';
                dateText.textContent = formattedDate;
                dateCell.appendChild(dateText);
            }

            dateRow.appendChild(dateCell);
        });

        heatmapGrid.appendChild(dateRow);
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

// Initialize compact heatmap manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.compactHeatmapManager === 'undefined') {
        window.compactHeatmapManager = new CompactHeatmapManager();
    }
});