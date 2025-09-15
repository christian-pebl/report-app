/**
 * SUBCAM File Conversion Engine
 * Converts _raw CSV files to _nmax and _obvs formats
 * Implements comprehensive data processing and validation
 */

class SUBCAMConverter {
    constructor() {
        this.timezone = 'Europe/London';
        this.logger = new ConversionLogger();
    }

    /**
     * Convert _raw CSV to _nmax format with daily aggregates
     * @param {string} csvText - Raw CSV content as string
     * @param {Object} options - Conversion options
     * @returns {Object} - Conversion result with data and metadata
     */
    async convertRawToNmax(csvText, options = {}) {
        try {
            this.logger.log('Starting _raw to _nmax conversion');

            // 1. Parse and normalize data
            const rawData = this.parseCSV(csvText);
            const normalizedData = this.normalizeRawData(rawData);

            // 2. Apply quality filters
            const filteredData = this.applyQualityFilters(normalizedData, options);

            // 3. Calculate per-clip Nmax
            const perClipData = this.calculatePerClipNmax(filteredData);

            // 4. Aggregate to daily species totals
            const dailySpecies = this.aggregateDailySpecies(perClipData);

            // 5. Calculate summary metrics
            const result = this.calculateNmaxSummaryMetrics(dailySpecies);

            // 6. Validate output
            this.validateNmaxOutput(result);

            this.logger.log('_raw to _nmax conversion completed successfully');

            return {
                success: true,
                data: result,
                metadata: {
                    inputRows: rawData.length,
                    outputRows: result.length,
                    dateRange: this.getDateRange(result),
                    speciesCount: this.getSpeciesCount(result),
                    processingTime: Date.now()
                },
                logs: this.logger.getLogs()
            };

        } catch (error) {
            this.logger.error('_raw to _nmax conversion failed', error);
            return {
                success: false,
                error: error.message,
                logs: this.logger.getLogs()
            };
        }
    }

    /**
     * Convert _raw CSV to _obvs format with daily observation counts
     * @param {string} csvText - Raw CSV content as string
     * @param {Object} options - Conversion options
     * @returns {Object} - Conversion result with data and metadata
     */
    async convertRawToObvs(csvText, options = {}) {
        try {
            this.logger.log('Starting _raw to _obvs conversion');

            // 1. Parse and normalize data
            const rawData = this.parseCSV(csvText);
            const normalizedData = this.normalizeRawData(rawData);

            // 2. Apply quality filters
            const filteredData = this.applyQualityFilters(normalizedData, options);

            // 3. Count observation events per day/species
            const eventCounts = this.countObservationEvents(filteredData);

            // 4. Calculate summary metrics
            const result = this.calculateObvsSummaryMetrics(eventCounts);

            // 5. Validate output
            this.validateObvsOutput(result);

            this.logger.log('_raw to _obvs conversion completed successfully');

            return {
                success: true,
                data: result,
                metadata: {
                    inputRows: rawData.length,
                    outputRows: result.length,
                    dateRange: this.getDateRange(result),
                    speciesCount: this.getSpeciesCount(result),
                    processingTime: Date.now()
                },
                logs: this.logger.getLogs()
            };

        } catch (error) {
            this.logger.error('_raw to _obvs conversion failed', error);
            return {
                success: false,
                error: error.message,
                logs: this.logger.getLogs()
            };
        }
    }

    /**
     * Parse CSV text into array of objects
     * @param {string} csvText - Raw CSV content
     * @returns {Array} - Parsed data rows
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must contain header row and at least one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        this.logger.log(`Parsed ${data.length} rows from CSV`);
        return data;
    }

    /**
     * Parse a single CSV line handling quoted values
     * @param {string} line - CSV line to parse
     * @returns {Array} - Parsed values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    /**
     * Normalize raw data - clean headers, parse timestamps, select taxon
     * @param {Array} rawData - Parsed raw data
     * @returns {Array} - Normalized data
     */
    normalizeRawData(rawData) {
        this.logger.log('Starting data normalization');
        this.logger.log(`Input raw data: ${rawData.length} rows`);

        // Debug: Show first row headers
        if (rawData.length > 0) {
            this.logger.log('Available columns:', Object.keys(rawData[0]));
        }

        let failedTimestamp = 0;
        let failedTaxon = 0;
        let failedQuantity = 0;

        const normalized = rawData.map((row, index) => {
            // Normalize all text fields
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[this.normalizeText(key)] = this.normalizeText(row[key]);
            });

            // Parse timestamp with priority order
            normalizedRow.eventTimestamp = this.parsePreferredTimestamp(normalizedRow);
            normalizedRow.eventDate = normalizedRow.eventTimestamp ?
                normalizedRow.eventTimestamp.toISOString().split('T')[0] : null;

            // Choose best taxon identifier
            normalizedRow.taxon = this.chooseTaxonLabel(normalizedRow);

            // Parse and validate Nmax quantity
            normalizedRow.quantity = this.parseQuantity(normalizedRow['Quantity (Nmax)']);

            // Debug: Count failures for first few rows
            if (index < 5) {
                this.logger.log(`Row ${index + 1}:`, {
                    timestamp: normalizedRow.eventTimestamp,
                    taxon: normalizedRow.taxon,
                    quantity: normalizedRow.quantity,
                    quantityRaw: normalizedRow['Quantity (Nmax)']
                });
            }

            return normalizedRow;
        }).filter(row => {
            // Remove rows without valid timestamp, taxon, or quantity
            const hasTimestamp = row.eventTimestamp;
            const hasTaxon = row.taxon;
            const hasQuantity = row.quantity >= 0;

            if (!hasTimestamp) failedTimestamp++;
            if (!hasTaxon) failedTaxon++;
            if (!hasQuantity) failedQuantity++;

            return hasTimestamp && hasTaxon && hasQuantity;
        });

        this.logger.log(`Normalization results:`);
        this.logger.log(`- Valid rows: ${normalized.length}`);
        this.logger.log(`- Failed timestamp: ${failedTimestamp}`);
        this.logger.log(`- Failed taxon: ${failedTaxon}`);
        this.logger.log(`- Failed quantity: ${failedQuantity}`);

        return normalized;
    }

    /**
     * Remove NBSP characters, trim, and collapse whitespace
     * @param {string} text - Text to normalize
     * @returns {string} - Normalized text
     */
    normalizeText(text) {
        if (typeof text !== 'string') return text;
        return text.replace(/\xa0/g, ' ').trim().replace(/\s+/g, ' ');
    }

    /**
     * Parse timestamps in priority order
     * @param {Object} row - Data row
     * @returns {Date|null} - Parsed timestamp or null
     */
    parsePreferredTimestamp(row) {
        const timestampCols = [
            'Adjusted Date and Time',
            'Adjusted Date / Time',
            'Date/Time of Recording'
        ];

        // Debug: Show available timestamp columns in first few rows
        const availableTimestampCols = timestampCols.filter(col => col in row);
        if (Object.keys(row).length > 0 && Math.random() < 0.1) { // Show 10% of the time
            this.logger.log(`Available timestamp columns: ${availableTimestampCols.join(', ')}`);
            this.logger.log(`All row keys: ${Object.keys(row).join(', ')}`);
        }

        for (const col of timestampCols) {
            if (row[col]) {
                const parsed = this.parseTimestamp(row[col]);
                if (parsed) return parsed;
            }
        }

        return null;
    }

    /**
     * Parse individual timestamp string
     * @param {string} timestampStr - Timestamp string to parse
     * @returns {Date|null} - Parsed Date object or null
     */
    parseTimestamp(timestampStr) {
        try {
            // Handle various date formats
            const date = new Date(timestampStr);
            return isNaN(date.getTime()) ? null : date;
        } catch (error) {
            return null;
        }
    }

    /**
     * Choose best available taxon identifier
     * @param {Object} row - Data row
     * @returns {string|null} - Selected taxon or null
     */
    chooseTaxonLabel(row) {
        const scientific = row['Lowest Order Scientific Name'];
        const common = row['Common Name'];

        // Debug: Show taxon columns availability occasionally
        if (Math.random() < 0.1) { // Show 10% of the time
            this.logger.log('Taxon lookup:', {
                hasScientific: 'Lowest Order Scientific Name' in row,
                hasCommon: 'Common Name' in row,
                scientificValue: scientific,
                commonValue: common
            });
        }

        if (scientific && scientific.trim()) {
            return scientific;
        } else if (common && common.trim()) {
            return common;
        }

        return null;
    }

    /**
     * Parse quantity value ensuring non-negative integer
     * @param {string|number} quantityStr - Quantity value to parse
     * @returns {number} - Parsed quantity (0 if invalid)
     */
    parseQuantity(quantityStr) {
        const parsed = parseInt(quantityStr);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }

    /**
     * Apply quality filters based on confidence and video quality
     * @param {Array} data - Normalized data
     * @param {Object} options - Filter options
     * @returns {Array} - Filtered data
     */
    applyQualityFilters(data, options) {
        let filtered = data;

        if (options.minConfidence) {
            filtered = filtered.filter(row => {
                const confidence = parseInt(row['Confidence Level']);
                return isNaN(confidence) || confidence >= options.minConfidence;
            });
        }

        if (options.minQuality) {
            filtered = filtered.filter(row => {
                const quality = parseInt(row['Quality of Video']);
                return isNaN(quality) || quality >= options.minQuality;
            });
        }

        this.logger.log(`Applied quality filters: ${filtered.length} rows remaining`);
        return filtered;
    }

    /**
     * Calculate maximum Nmax per clip per taxon per date
     * @param {Array} data - Filtered normalized data
     * @returns {Array} - Per-clip Nmax data
     */
    calculatePerClipNmax(data) {
        const perClip = {};

        data.forEach(row => {
            const key = `${row.eventDate}|${row['File Name']}|${row.taxon}`;

            if (!perClip[key]) {
                perClip[key] = {
                    eventDate: row.eventDate,
                    fileName: row['File Name'],
                    taxon: row.taxon,
                    clipTaxonNmax: row.quantity
                };
            } else {
                perClip[key].clipTaxonNmax = Math.max(perClip[key].clipTaxonNmax, row.quantity);
            }
        });

        return Object.values(perClip);
    }

    /**
     * Aggregate daily species totals from per-clip data
     * @param {Array} perClipData - Per-clip Nmax data
     * @returns {Object} - Daily species matrix
     */
    aggregateDailySpecies(perClipData) {
        const daily = {};

        perClipData.forEach(row => {
            const date = row.eventDate;
            const taxon = row.taxon;

            if (!daily[date]) {
                daily[date] = {};
            }

            if (!daily[date][taxon]) {
                daily[date][taxon] = 0;
            }

            daily[date][taxon] += row.clipTaxonNmax;
        });

        // Convert to array format sorted by date
        const dates = Object.keys(daily).sort();
        const allSpecies = new Set();

        // Collect all species
        dates.forEach(date => {
            Object.keys(daily[date]).forEach(species => allSpecies.add(species));
        });

        const speciesList = Array.from(allSpecies).sort();

        return dates.map(date => {
            const row = { Date: date };
            speciesList.forEach(species => {
                row[species] = daily[date][species] || 0;
            });
            return row;
        });
    }

    /**
     * Calculate all summary metrics for _nmax format
     * @param {Array} speciesData - Daily species data
     * @returns {Array} - Complete _nmax format data
     */
    calculateNmaxSummaryMetrics(speciesData) {
        const result = speciesData.map(row => ({ ...row }));

        // Get species columns (exclude Date)
        const speciesColumns = Object.keys(result[0]).filter(col => col !== 'Date');

        // Calculate basic daily metrics
        result.forEach(row => {
            row['Total Observations'] = speciesColumns.reduce((sum, col) => sum + row[col], 0);
            row['All Unique Organisms Observed Today'] = speciesColumns.filter(col => row[col] > 0).length;
        });

        // Calculate cumulative observations
        let cumulativeObs = 0;
        result.forEach(row => {
            cumulativeObs += row['Total Observations'];
            row['Cumulative Observations'] = cumulativeObs;
        });

        // Calculate new species detection
        const seenSpecies = new Set();
        result.forEach(row => {
            let newSpeciesToday = 0;
            speciesColumns.forEach(species => {
                if (row[species] > 0 && !seenSpecies.has(species)) {
                    newSpeciesToday++;
                    seenSpecies.add(species);
                }
            });
            row['New Unique Organisms Today'] = newSpeciesToday;
        });

        // Calculate cumulative new unique organisms
        let cumulativeNew = 0;
        result.forEach(row => {
            cumulativeNew += row['New Unique Organisms Today'];
            row['Cumulative New Unique Organisms'] = cumulativeNew;
            row['Cumulative Unique Species'] = seenSpecies.size;
        });

        // Reorder columns: summary metrics first, then species alphabetically
        const summaryColumns = [
            'Date',
            'Total Observations',
            'Cumulative Observations',
            'All Unique Organisms Observed Today',
            'New Unique Organisms Today',
            'Cumulative New Unique Organisms',
            'Cumulative Unique Species'
        ];

        return result.map(row => {
            const reorderedRow = {};
            summaryColumns.forEach(col => {
                reorderedRow[col] = row[col];
            });
            speciesColumns.sort().forEach(col => {
                reorderedRow[col] = row[col];
            });
            return reorderedRow;
        });
    }

    /**
     * Count observation events per day/species for _obvs format
     * @param {Array} data - Filtered normalized data
     * @returns {Array} - Daily event counts
     */
    countObservationEvents(data) {
        const events = {};

        data.forEach(row => {
            const date = row.eventDate;
            const taxon = row.taxon;

            if (!events[date]) {
                events[date] = {};
            }

            if (!events[date][taxon]) {
                events[date][taxon] = 0;
            }

            events[date][taxon]++;
        });

        // Convert to array format
        const dates = Object.keys(events).sort();
        const allSpecies = new Set();

        dates.forEach(date => {
            Object.keys(events[date]).forEach(species => allSpecies.add(species));
        });

        const speciesList = Array.from(allSpecies).sort();

        return dates.map(date => {
            const row = { Date: date };
            speciesList.forEach(species => {
                row[species] = events[date][species] || 0;
            });
            return row;
        });
    }

    /**
     * Calculate all summary metrics for _obvs format
     * @param {Array} eventData - Daily event count data
     * @returns {Array} - Complete _obvs format data
     */
    calculateObvsSummaryMetrics(eventData) {
        const result = eventData.map(row => ({ ...row }));

        // Get species columns
        const speciesColumns = Object.keys(result[0]).filter(col => col !== 'Date');

        // Calculate daily metrics
        result.forEach(row => {
            row['Total Observations'] = speciesColumns.reduce((sum, col) => sum + row[col], 0);
            row['Unique Organisms Observed Today'] = speciesColumns.filter(col => row[col] > 0).length;
        });

        // Calculate new species detection and cumulative metrics
        const seenSpecies = new Set();
        result.forEach(row => {
            let newSpeciesToday = 0;
            speciesColumns.forEach(species => {
                if (row[species] > 0 && !seenSpecies.has(species)) {
                    newSpeciesToday++;
                    seenSpecies.add(species);
                }
            });
            row['New Unique Organisms Today'] = newSpeciesToday;
            row['Cumulative Unique Species'] = seenSpecies.size;
        });

        // Reorder columns for _obvs format
        const summaryColumns = [
            'Date',
            'Total Observations',
            'Unique Organisms Observed Today',
            'New Unique Organisms Today',
            'Cumulative Unique Species'
        ];

        return result.map(row => {
            const reorderedRow = {};
            summaryColumns.forEach(col => {
                reorderedRow[col] = row[col];
            });
            speciesColumns.sort().forEach(col => {
                reorderedRow[col] = row[col];
            });
            return reorderedRow;
        });
    }

    /**
     * Validate _nmax output meets all requirements
     * @param {Array} data - _nmax format data to validate
     */
    validateNmaxOutput(data) {
        if (!data || data.length === 0) {
            throw new Error('Output data is empty');
        }

        const summaryColumns = [
            'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species'
        ];

        const speciesColumns = Object.keys(data[0]).filter(col =>
            col !== 'Date' && !summaryColumns.includes(col)
        );

        // Validate all values are non-negative integers
        data.forEach((row, index) => {
            Object.keys(row).forEach(col => {
                if (col !== 'Date') {
                    const value = row[col];
                    if (!Number.isInteger(value) || value < 0) {
                        throw new Error(`Invalid value at row ${index}, column ${col}: ${value}`);
                    }
                }
            });
        });

        // Validate monotonic properties
        for (let i = 1; i < data.length; i++) {
            if (data[i]['Cumulative Observations'] < data[i-1]['Cumulative Observations']) {
                throw new Error(`Cumulative Observations not monotonic at row ${i}`);
            }
            if (data[i]['Cumulative Unique Species'] < data[i-1]['Cumulative Unique Species']) {
                throw new Error(`Cumulative Unique Species not monotonic at row ${i}`);
            }
        }

        // Validate row totals
        data.forEach((row, index) => {
            const speciesTotal = speciesColumns.reduce((sum, col) => sum + row[col], 0);
            if (row['Total Observations'] !== speciesTotal) {
                throw new Error(`Total Observations mismatch at row ${index}`);
            }
        });

        this.logger.log('✅ _nmax validation passed');
    }

    /**
     * Validate _obvs output meets all requirements
     * @param {Array} data - _obvs format data to validate
     */
    validateObvsOutput(data) {
        if (!data || data.length === 0) {
            throw new Error('Output data is empty');
        }

        const summaryColumns = [
            'Total Observations', 'Unique Organisms Observed Today',
            'New Unique Organisms Today', 'Cumulative Unique Species'
        ];

        const speciesColumns = Object.keys(data[0]).filter(col =>
            col !== 'Date' && !summaryColumns.includes(col)
        );

        // Validate all values are non-negative integers
        data.forEach((row, index) => {
            Object.keys(row).forEach(col => {
                if (col !== 'Date') {
                    const value = row[col];
                    if (!Number.isInteger(value) || value < 0) {
                        throw new Error(`Invalid value at row ${index}, column ${col}: ${value}`);
                    }
                }
            });
        });

        // Validate consistency
        data.forEach((row, index) => {
            const speciesTotal = speciesColumns.reduce((sum, col) => sum + row[col], 0);
            const uniqueCount = speciesColumns.filter(col => row[col] > 0).length;

            if (row['Total Observations'] !== speciesTotal) {
                throw new Error(`Total Observations mismatch at row ${index}`);
            }
            if (row['Unique Organisms Observed Today'] !== uniqueCount) {
                throw new Error(`Unique Organisms count mismatch at row ${index}`);
            }
        });

        this.logger.log('✅ _obvs validation passed');
    }

    /**
     * Get date range from data
     * @param {Array} data - Data array
     * @returns {Object} - Date range object
     */
    getDateRange(data) {
        if (!data || data.length === 0) return null;

        const dates = data.map(row => row.Date).sort();
        return {
            start: dates[0],
            end: dates[dates.length - 1],
            days: dates.length
        };
    }

    /**
     * Get species count from data
     * @param {Array} data - Data array
     * @returns {number} - Number of species columns
     */
    getSpeciesCount(data) {
        if (!data || data.length === 0) return 0;

        const summaryColumns = [
            'Date', 'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species',
            'Unique Organisms Observed Today'
        ];

        return Object.keys(data[0]).filter(col => !summaryColumns.includes(col)).length;
    }

    /**
     * Convert data array to CSV string
     * @param {Array} data - Data to convert
     * @returns {string} - CSV string
     */
    dataToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                // Quote values that contain commas
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }
}

/**
 * Logging utility for conversion operations
 */
class ConversionLogger {
    constructor() {
        this.logs = [];
    }

    log(message) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: message
        };
        this.logs.push(entry);
        console.log(`[${entry.timestamp}] ${entry.level}: ${entry.message}`);
    }

    error(message, error) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: message,
            error: error ? error.toString() : null
        };
        this.logs.push(entry);
        console.error(`[${entry.timestamp}] ${entry.level}: ${entry.message}`, error);
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUBCAMConverter, ConversionLogger };
}