/**
 * SUBCAM Conversion UI Integration
 * Handles user interface for file conversions
 */

class ConversionUI {
    constructor() {
        this.converter = new SUBCAMConverter();
        this.validator = new SUBCAMValidator();
        this.currentData = null;
        this.currentConversionResult = null;
        this.isProcessing = false;

        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners for conversion UI
     */
    initializeEventListeners() {
        // Conversion type selection
        document.getElementById('conversionTypeSelect').addEventListener('change', (e) => {
            this.handleConversionTypeChange(e.target.value);
        });

        // Button event listeners
        document.getElementById('validateDataBtn').addEventListener('click', () => {
            this.handleValidateData();
        });

        document.getElementById('convertFileBtn').addEventListener('click', () => {
            this.handleConvertFile();
        });

        document.getElementById('downloadResultBtn').addEventListener('click', () => {
            this.handleDownloadResult();
        });

        // Listen for file selection from main app
        document.addEventListener('fileLoaded', (event) => {
            this.handleFileLoaded(event.detail);
        });

        console.log('ConversionUI initialized');
    }

    /**
     * Handle conversion type selection change
     */
    handleConversionTypeChange(conversionType) {
        const qualityFilters = document.getElementById('qualityFilters');
        const validateBtn = document.getElementById('validateDataBtn');
        const convertBtn = document.getElementById('convertFileBtn');

        if (conversionType) {
            // Show quality filters
            qualityFilters.classList.remove('hidden');

            // Enable buttons if we have data
            if (this.currentData) {
                validateBtn.disabled = false;
                convertBtn.disabled = false;
            }
        } else {
            // Hide quality filters and disable buttons
            qualityFilters.classList.add('hidden');
            validateBtn.disabled = true;
            convertBtn.disabled = true;
        }

        // Clear previous results
        this.clearResults();
    }

    /**
     * Handle file loaded from main app
     */
    handleFileLoaded(fileData) {
        console.log('🔍 DEBUG handleFileLoaded - Received fileData:', fileData);
        console.log('📊 Data structure:', {
            hasFileName: !!fileData?.fileName,
            hasHeaders: !!fileData?.headers,
            hasData: !!fileData?.data,
            headerCount: fileData?.headers?.length,
            dataCount: fileData?.data?.length
        });

        this.currentData = fileData;

        // Check if this looks like a _raw file
        if (this.isRawDataFile(fileData)) {
            console.log('✅ Detected _raw file - showing conversion section');
            this.showConversionSection();
            this.enableConversionOptions();
        } else {
            console.log('❌ Not a _raw file - hiding conversion section');
            this.hideConversionSection();
        }
    }

    /**
     * Check if loaded data appears to be _raw format
     */
    isRawDataFile(fileData) {
        if (!fileData || !fileData.headers || !fileData.data) return false;

        // Check for key _raw format columns
        const requiredColumns = ['File Name', 'Quantity (Nmax)', 'Event Observation'];
        const hasRequired = requiredColumns.some(col =>
            fileData.headers.includes(col)
        );

        // Check for timestamp columns
        const timestampColumns = [
            'Adjusted Date and Time',
            'Adjusted Date / Time',
            'Date/Time of Recording'
        ];
        const hasTimestamp = timestampColumns.some(col =>
            fileData.headers.includes(col)
        );

        // Check for species identifier columns
        const speciesColumns = ['Common Name', 'Lowest Order Scientific Name'];
        const hasSpecies = speciesColumns.some(col =>
            fileData.headers.includes(col)
        );

        return hasRequired && hasTimestamp && hasSpecies;
    }

    /**
     * Show conversion section
     */
    showConversionSection() {
        document.getElementById('conversionSection').classList.remove('hidden');
    }

    /**
     * Hide conversion section
     */
    hideConversionSection() {
        document.getElementById('conversionSection').classList.add('hidden');
    }

    /**
     * Enable conversion options
     */
    enableConversionOptions() {
        const conversionTypeSelect = document.getElementById('conversionTypeSelect');
        if (conversionTypeSelect.value) {
            document.getElementById('validateDataBtn').disabled = false;
            document.getElementById('convertFileBtn').disabled = false;
        }
    }

    /**
     * Handle data validation
     */
    async handleValidateData() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.showProgress('Validating data...', 0);

        try {
            // Convert current data to CSV format for validation
            const csvText = this.convertDataToCSV(this.currentData);
            const rawData = this.converter.parseCSV(csvText);

            this.updateProgress('Running validation checks...', 50);

            // Validate raw data
            const validationResult = this.validator.validateRawData(rawData);

            this.updateProgress('Validation complete', 100);
            this.hideProgress();

            // Display validation results
            this.displayValidationResults(validationResult);

        } catch (error) {
            console.error('Validation error:', error);
            this.hideProgress();
            this.displayError('Validation failed: ' + error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Handle file conversion
     */
    async handleConvertFile() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        const conversionType = document.getElementById('conversionTypeSelect').value;

        this.showProgress(`Converting to ${conversionType} format...`, 0);

        try {
            // Get conversion options
            const options = this.getConversionOptions();

            // Convert current data to CSV format
            const csvText = this.convertDataToCSV(this.currentData);

            this.updateProgress('Processing data...', 25);

            // Perform conversion
            let result;
            if (conversionType === '_nmax') {
                result = await this.converter.convertRawToNmax(csvText, options);
            } else if (conversionType === '_obvs') {
                result = await this.converter.convertRawToObvs(csvText, options);
            } else {
                throw new Error('Invalid conversion type');
            }

            this.updateProgress('Validating output...', 75);

            if (result.success) {
                // Validate the converted output
                const outputValidation = this.validator.validateConvertedData(result.data, conversionType);

                this.updateProgress('Conversion complete', 100);
                this.hideProgress();

                // Store result for download
                this.currentConversionResult = {
                    data: result.data,
                    type: conversionType,
                    metadata: result.metadata,
                    validation: outputValidation
                };

                // Display results
                this.displayConversionResults(result, outputValidation);

                // Enable download button
                document.getElementById('downloadResultBtn').classList.remove('hidden');
                document.getElementById('downloadResultBtn').disabled = false;

            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Conversion error:', error);
            this.hideProgress();
            this.displayError('Conversion failed: ' + error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Handle download result
     */
    handleDownloadResult() {
        if (!this.currentConversionResult) return;

        try {
            // Convert data to CSV string
            const csvContent = this.converter.dataToCSV(this.currentConversionResult.data);

            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0];
            const originalName = this.currentData.fileName || 'subcam_data';
            const baseName = originalName.replace(/\.(csv|txt)$/i, '');
            const filename = `${baseName}${this.currentConversionResult.type}_${timestamp}.csv`;

            // Create and trigger download
            this.downloadCSV(csvContent, filename);

            // Show success message
            this.displaySuccess(`File downloaded as: ${filename}`);

        } catch (error) {
            console.error('Download error:', error);
            this.displayError('Download failed: ' + error.message);
        }
    }

    /**
     * Get conversion options from UI
     */
    getConversionOptions() {
        const options = {};

        const minConfidence = document.getElementById('minConfidenceSelect').value;
        if (minConfidence) {
            options.minConfidence = parseInt(minConfidence);
        }

        const minQuality = document.getElementById('minQualitySelect').value;
        if (minQuality) {
            options.minQuality = parseInt(minQuality);
        }

        return options;
    }

    /**
     * Convert loaded data back to CSV format
     */
    convertDataToCSV(fileData) {
        console.log('🔍 DEBUG convertDataToCSV - Input fileData:', fileData);

        if (!fileData) {
            console.error('❌ fileData is null/undefined');
            throw new Error('Invalid file data - fileData is null');
        }

        if (!fileData.headers) {
            console.error('❌ fileData.headers is missing:', fileData);
            throw new Error('Invalid file data - headers missing');
        }

        if (!fileData.data) {
            console.error('❌ fileData.data is missing:', fileData);
            throw new Error('Invalid file data - data missing');
        }

        console.log(`📊 Converting ${fileData.data.length} rows with ${fileData.headers.length} headers`);
        console.log('📋 Headers:', fileData.headers);
        console.log('📄 First 3 rows:', fileData.data.slice(0, 3));

        const csvRows = [fileData.headers.join(',')];

        fileData.data.forEach((row, index) => {
            const values = fileData.headers.map(header => {
                const value = row[header] || '';
                // Quote values that contain commas
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));

            if (index < 3) {
                console.log(`📝 Row ${index} CSV:`, values.join(','));
            }
        });

        const csvResult = csvRows.join('\n');
        console.log(`✅ Generated CSV with ${csvRows.length} lines (including header)`);
        console.log('📋 First 200 chars of CSV:', csvResult.substring(0, 200) + '...');

        return csvResult;
    }

    /**
     * Show progress indicator
     */
    showProgress(message, percentage) {
        const progressContainer = document.getElementById('conversionProgress');
        const progressFill = document.getElementById('conversionProgressFill');
        const progressText = document.getElementById('conversionProgressText');

        progressContainer.classList.remove('hidden');
        progressFill.style.width = percentage + '%';
        progressText.textContent = message;
    }

    /**
     * Update progress indicator
     */
    updateProgress(message, percentage) {
        const progressFill = document.getElementById('conversionProgressFill');
        const progressText = document.getElementById('conversionProgressText');

        progressFill.style.width = percentage + '%';
        progressText.textContent = message;
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        setTimeout(() => {
            document.getElementById('conversionProgress').classList.add('hidden');
        }, 1000);
    }

    /**
     * Display validation results
     */
    displayValidationResults(validationResult) {
        const container = document.getElementById('validationResults');

        let html = '<div class="validation-report">';
        html += '<h4>📋 Data Validation Report</h4>';

        // Overall status
        html += `<div class="validation-status ${validationResult.isValid ? 'valid' : 'invalid'}">`;
        html += `<strong>Status:</strong> ${validationResult.isValid ? '✅ Valid' : '❌ Issues Found'}`;
        html += '</div>';

        // Errors
        if (validationResult.errors.length > 0) {
            html += '<div class="validation-errors">';
            html += '<h5>❌ Errors:</h5>';
            html += '<ul>';
            validationResult.errors.forEach(error => {
                html += `<li>${error}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        // Warnings
        if (validationResult.warnings.length > 0) {
            html += '<div class="validation-warnings">';
            html += '<h5>⚠️ Warnings:</h5>';
            html += '<ul>';
            validationResult.warnings.slice(0, 10).forEach(warning => {
                html += `<li>${warning}</li>`;
            });
            if (validationResult.warnings.length > 10) {
                html += `<li>... and ${validationResult.warnings.length - 10} more warnings</li>`;
            }
            html += '</ul>';
            html += '</div>';
        }

        // Metrics
        if (validationResult.metrics) {
            html += '<div class="validation-metrics">';
            html += '<h5>📊 Data Summary:</h5>';
            html += `<p><strong>Total Rows:</strong> ${validationResult.metrics.totalRows || 0}</p>`;

            if (validationResult.metrics.speciesValidation) {
                const species = validationResult.metrics.speciesValidation;
                html += `<p><strong>Species:</strong> ${species.uniqueSpeciesCount} unique species found</p>`;
                html += `<p><strong>Species Validation Rate:</strong> ${species.validationRate.toFixed(1)}%</p>`;
            }

            if (validationResult.metrics.timestampValidation) {
                const timestamp = validationResult.metrics.timestampValidation;
                html += `<p><strong>Timestamp Validation Rate:</strong> ${timestamp.validationRate.toFixed(1)}%</p>`;
            }

            html += '</div>';
        }

        // Recommendations
        if (validationResult.recommendations && validationResult.recommendations.length > 0) {
            html += '<div class="validation-recommendations">';
            html += '<h5>💡 Recommendations:</h5>';
            html += '<ul>';
            validationResult.recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul>';
            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    /**
     * Display conversion results
     */
    displayConversionResults(conversionResult, validationResult) {
        const container = document.getElementById('conversionResults');

        let html = '<div class="conversion-report">';
        html += '<h4>🔄 Conversion Results</h4>';

        // Success status
        html += '<div class="conversion-status success">';
        html += '<strong>✅ Conversion Successful!</strong>';
        html += '</div>';

        // Metadata
        if (conversionResult.metadata) {
            const meta = conversionResult.metadata;
            html += '<div class="conversion-metadata">';
            html += '<h5>📊 Conversion Summary:</h5>';
            html += `<p><strong>Input Rows:</strong> ${meta.inputRows}</p>`;
            html += `<p><strong>Output Rows:</strong> ${meta.outputRows}</p>`;

            if (meta.dateRange) {
                html += `<p><strong>Date Range:</strong> ${meta.dateRange.start} to ${meta.dateRange.end} (${meta.dateRange.days} days)</p>`;
            }

            html += `<p><strong>Species Count:</strong> ${meta.speciesCount}</p>`;
            html += '</div>';
        }

        // Output validation
        if (validationResult) {
            html += '<div class="output-validation">';
            html += `<h5>✅ Output Validation: ${validationResult.isValid ? 'Passed' : 'Issues Found'}</h5>`;

            if (validationResult.errors.length > 0) {
                html += '<p style="color: #dc3545;">❌ Output validation errors detected</p>';
            }

            if (validationResult.integrityChecks) {
                html += '<p>🔍 All integrity checks completed</p>';
            }
            html += '</div>';
        }

        // Preview of converted data
        if (conversionResult.data && conversionResult.data.length > 0) {
            html += '<div class="data-preview">';
            html += '<h5>👀 Data Preview (First 5 rows):</h5>';
            html += '<div class="table-wrapper">';
            html += '<table class="preview-table">';

            // Headers
            html += '<thead><tr>';
            Object.keys(conversionResult.data[0]).forEach(header => {
                html += `<th>${header}</th>`;
            });
            html += '</tr></thead>';

            // Data rows (first 5)
            html += '<tbody>';
            conversionResult.data.slice(0, 5).forEach(row => {
                html += '<tr>';
                Object.values(row).forEach(value => {
                    html += `<td>${value}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';

            html += '</table>';
            html += '</div>';
            html += '</div>';
        }

        html += '</div>';

        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    /**
     * Display error message
     */
    displayError(message) {
        const container = document.getElementById('conversionResults');

        const html = `
            <div class="error-message">
                <h4>❌ Error</h4>
                <p>${message}</p>
            </div>
        `;

        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    /**
     * Display success message
     */
    displaySuccess(message) {
        const container = document.getElementById('conversionResults');

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `<p>✅ ${message}</p>`;

        container.appendChild(successDiv);

        // Remove success message after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    /**
     * Clear all results
     */
    clearResults() {
        document.getElementById('conversionResults').classList.add('hidden');
        document.getElementById('validationResults').classList.add('hidden');
        document.getElementById('downloadResultBtn').classList.add('hidden');
        document.getElementById('downloadResultBtn').disabled = true;

        this.currentConversionResult = null;
    }

    /**
     * Download CSV file
     */
    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

// Initialize conversion UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing ConversionUI...');

    // Wait a moment for other scripts to load
    setTimeout(() => {
        console.log('🔍 Checking dependencies...');
        console.log('SUBCAMConverter available:', typeof SUBCAMConverter !== 'undefined');
        console.log('SUBCAMValidator available:', typeof SUBCAMValidator !== 'undefined');

        if (typeof SUBCAMConverter !== 'undefined' && typeof SUBCAMValidator !== 'undefined') {
            window.conversionUI = new ConversionUI();
            console.log('✅ ConversionUI initialized successfully');
            console.log('📍 ConversionUI instance:', window.conversionUI);
        } else {
            console.error('❌ ConversionUI: Required dependencies not loaded');
            console.log('Available globals:', Object.keys(window).filter(key => key.includes('SUBCAM')));
        }
    }, 100);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConversionUI };
}