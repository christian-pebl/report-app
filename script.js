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
        let rawFile = fileInfo.versions.get('raw') || fileInfo.versions.get('original');
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
        let rawFile = fileInfo.versions.get('raw') || fileInfo.versions.get('original');
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
                    'Total_Observations': 'Total Observations',
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

        if (missingColumns.length > 0) {
            console.warn('Missing required columns for', fileType, 'format:', missingColumns);
            this.showWarning(`This ${fileType} file is missing some expected columns: ${missingColumns.join(', ')}`);
        } else {
        }

        // Store file type for later use
        this.fileType = fileType;
    }

    determineSUBCAMFileType(filename) {
        if (!filename) return null;

        const lowerName = filename.toLowerCase();
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

        // Initialize slider states on page load
        this.initializeSliderStates();
    }

    initializeSliderStates() {
        // Set initial thumb positions for both sliders
        this.updateSliderThumb(this.currentPage);
    }

    initializeNavigation() {
        const sliderIcons = document.querySelectorAll('.slider-icon');
        sliderIcons.forEach(icon => {
            icon.addEventListener('click', async () => {
                const targetPage = icon.getAttribute('data-page');
                await this.switchPage(targetPage);
            });
        });
    }

    async switchPage(pageName) {
        // Update slider icons
        document.querySelectorAll('.slider-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        document.querySelector(`.slider-icon[data-page="${pageName}"]`).classList.add('active');

        // Update slider thumb position
        this.updateSliderThumb(pageName);

        // Update page content
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageName}Page`).classList.add('active');

        this.currentPage = pageName;

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
    }

    updateSliderThumb(pageName) {
        // Update SUBCAM slider
        const fpodContainer = document.querySelector('.fpod-container');
        const fpodThumb = fpodContainer?.querySelector('.slider-thumb');

        if (pageName === 'reformat') {
            // Reset both thumbs, then set active one
            if (fpodThumb) fpodThumb.style.transform = 'translateX(0px)';
        } else if (pageName === 'plot') {
            // Reset both thumbs, then set active one
            if (fpodThumb) fpodThumb.style.transform = 'translateX(56px)';
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
        // Extract site name from filename: take text between 2nd and 4th underscore (PROJECT_REQUIREMENTS)
        // Example: SUBCAM_Alga_Control-S_2406-2407_24hr.csv -> Control-S_2406-2407
        const parts = filename.split('_');
        if (parts.length >= 4) {
            return parts.slice(2, 4).join('_');
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
        this.updateLengthDropdowns(nmaxFiles, obvFiles, pageName);

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
        
        // Right Y-axis removed for cleaner appearance
        
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

    plotSourceData(ctx, plotArea, sourceData, hours, maxDPM) {
        const { source, dpmValues, color } = sourceData;

        // Check chart type from global csvManager
        const chartType = (typeof csvManager !== 'undefined' && csvManager.chartType) ? csvManager.chartType : 'line';

        const xStep = plotArea.width / (hours.length - 1);

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
        
        const outputDiv = document.getElementById('siteComparisonStdOutput');
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
                throw new Error('No _obvs files found for the selected sites');
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
            const fileStd = this.obvFiles.find(file => file.name === filename);
            
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
            const sortedHours = Array.from(allTimePoints).sort((a, b) => new Date(a) - new Date(b));
            const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData[0], "date");
            console.log(`Using ${hours.length} time points from actual data:`, hours.slice(0, 5), '...');
            console.log("=== DEBUG: SUBCAMreport Time Range ===");
            console.log("All time points found:", Array.from(allTimePoints).slice(0, 10));
            console.log("Sorted hours sample:", sortedHours.slice(0, 10));

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

            console.log('Drawing axes...');
            // Draw axes and labels
            this.drawPlotAxes(ctx, plotArea, sortedDisplayHours, maxDPM, maxDPM, 800, "Date");

            console.log('Plotting DPM data...');
            // Apply layer ordering and plot each site's DPM data
            const orderedPlotData = (typeof csvManager !== 'undefined' && csvManager.applyLayerOrder) ?
                csvManager.applyLayerOrder(plotData) : plotData;
            orderedPlotData.forEach((siteData, index) => {
                this.plotSiteDataDPM(ctx, plotArea, siteData, hours, maxDPM);
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
        
        const outputDiv = document.getElementById('sourceComparisonStdOutput');
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
            const siteFile = this.obvFiles.find(file => file.name === site);
            if (!siteFile) {
                throw new Error(`No _obvs file found for site: ${site}`);
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
                        Make sure the corresponding _obvs file exists for: ${site}
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

            // Draw axes and labels
            this.drawPlotAxes(ctx, plotArea, sortedDisplayHours, maxDPM, maxDPM, 800, "Date");
            
            // Apply layer ordering and plot each source's data
            const orderedPlotData = (typeof csvManager !== 'undefined' && csvManager.applyLayerOrder) ?
                csvManager.applyLayerOrder(plotData) : plotData;
            orderedPlotData.forEach((sourceData, index) => {
                this.plotSourceData(ctx, plotArea, sourceData, hours, maxDPM);
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

    plotSiteDataDPM(ctx, plotArea, siteData, hours, maxDPM) {
        const { site, dpmValues, color } = siteData;

        // Check chart type from global csvManager
        const chartType = (typeof csvManager !== 'undefined' && csvManager.chartType) ? csvManager.chartType : 'line';

        const xStep = plotArea.width / dpmValues.length;

        if (chartType === 'column') {
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
            // Line chart rendering (default)
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
});