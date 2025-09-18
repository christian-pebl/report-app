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
            // Detect if this is a _raw2 format file (inline detection)
            const firstLine = csvText.split('\n')[0];
            const expectedRaw2Headers = [
                'file_name', 'location_1-9_thirds', 'quantity', 'note', 'time_stamp',
                'confidence_1-5', 'species', 'genus', 'family', 'order', 'class', 'phylum', 'kingdom', 'notes'
            ];
            const isRaw2Format = expectedRaw2Headers.every(header =>
                firstLine.toLowerCase().includes(header.toLowerCase())
            );

            if (isRaw2Format) {
                this.logger.log('🔍 Detected _raw2 format, converting with _raw2 logic');
                return await this.convertRaw2ToNmaxInline(csvText, options);
            }

            this.logger.log('🚀 Starting _raw to _nmax conversion');

            // STEP 1: Parse and validate CSV format
            this.logger.setCurrentStep(1, 'Parsing CSV and validating format');
            const rawData = this.parseCSV(csvText);

            // Validate format on first 5 rows for performance
            const sampleData = rawData.slice(0, 5);
            const headers = Object.keys(rawData[0] || {});
            const validation = this.logger.validateRawFileFormat(headers, sampleData);

            this.logger.success(`CSV parsed successfully: ${rawData.length} rows`, {
                headers: headers.length,
                formatCompliance: validation.formatCompliance
            });

            // STEP 2: Normalize and clean data
            this.logger.setCurrentStep(2, 'Normalizing and cleaning data');
            const normalizedData = this.normalizeRawData(rawData);
            this.logger.success(`Data normalized: ${normalizedData.length} valid records`);

            // STEP 3: Apply quality filters
            this.logger.setCurrentStep(3, 'Applying quality filters');
            const filteredData = this.applyQualityFilters(normalizedData, options);
            const filterRatio = ((filteredData.length / normalizedData.length) * 100).toFixed(1);
            this.logger.success(`Quality filters applied: ${filteredData.length} records passed (${filterRatio}%)`);

            // STEP 4: Calculate per-clip Nmax
            this.logger.setCurrentStep(4, 'Calculating per-clip Nmax values');
            const perClipData = this.calculatePerClipNmax(filteredData);
            this.logger.success(`Per-clip Nmax calculated for ${Object.keys(perClipData).length} unique clips`);

            // STEP 5: Aggregate to daily species totals
            this.logger.setCurrentStep(5, 'Aggregating daily species totals');
            const dailySpecies = this.aggregateDailySpecies(perClipData);
            this.logger.success(`Daily aggregation complete: ${dailySpecies.length} daily species records`);

            // STEP 6: Calculate summary metrics and validate
            this.logger.setCurrentStep(6, 'Calculating summary metrics and validating output');
            const result = this.calculateNmaxSummaryMetrics(dailySpecies);
            this.validateNmaxOutput(result);
            this.logger.success(`Output validation complete: ${result.length} final records`);

            const totalElapsed = Date.now() - this.logger.startTime;
            this.logger.success(`🎉 _raw to _nmax conversion completed successfully in ${totalElapsed}ms`);

            return {
                success: true,
                data: result,
                metadata: {
                    inputRows: rawData.length,
                    outputRows: result.length,
                    dateRange: this.getDateRange(result),
                    speciesCount: this.getSpeciesCount(result),
                    processingTime: totalElapsed,
                    formatValidation: validation,
                    conversionSteps: this.logger.totalSteps
                },
                logs: this.logger.getLogs(),
                validation: this.logger.validationResults
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
     * Convert _raw2 CSV to _nmax format (inline implementation)
     * @param {string} csvText - Raw2 CSV content as string
     * @param {Object} options - Conversion options
     * @returns {Object} - Conversion result with data and metadata
     */
    async convertRaw2ToNmaxInline(csvText, options = {}) {
        try {
            this.logger.log('🚀 Starting _raw2 to _nmax conversion (inline)');

            // STEP 1: Parse _raw2 CSV with comma handling
            this.logger.setCurrentStep(1, 'Parsing _raw2 CSV format');
            const rawData = this.parseRaw2CSVInline(csvText);
            this.logger.success(`_raw2 CSV parsed successfully: ${rawData.length} rows`);

            // STEP 2: Normalize and clean _raw2 data
            this.logger.setCurrentStep(2, 'Normalizing _raw2 data');
            const normalizedData = this.normalizeRaw2DataInline(rawData);
            this.logger.success(`_raw2 data normalized: ${normalizedData.length} valid records`);

            // STEP 3: Apply quality filters (confidence only for _raw2)
            this.logger.setCurrentStep(3, 'Applying quality filters');
            const filteredData = this.applyQualityFiltersRaw2Inline(normalizedData, options);
            const filterRatio = ((filteredData.length / normalizedData.length) * 100).toFixed(1);
            this.logger.success(`Quality filters applied: ${filteredData.length} records passed (${filterRatio}%)`);

            // STEP 4: Calculate per-clip Nmax (reuse existing logic)
            this.logger.setCurrentStep(4, 'Calculating per-clip Nmax values');
            const perClipData = this.calculatePerClipNmax(filteredData);
            this.logger.success(`Per-clip Nmax calculated for ${Object.keys(perClipData).length} unique clips`);

            // STEP 5: Aggregate to daily species totals (reuse existing logic)
            this.logger.setCurrentStep(5, 'Aggregating daily species totals');
            const dailySpecies = this.aggregateDailySpecies(perClipData);
            this.logger.success(`Daily aggregation complete: ${dailySpecies.length} daily species records`);

            // STEP 6: Calculate summary metrics and validate (reuse existing logic)
            this.logger.setCurrentStep(6, 'Calculating summary metrics and validating output');
            const result = this.calculateNmaxSummaryMetrics(dailySpecies);
            this.validateNmaxOutput(result);
            this.logger.success(`Output validation complete: ${result.length} final records`);

            const totalElapsed = Date.now() - this.logger.startTime;
            this.logger.success(`🎉 _raw2 to _nmax conversion completed successfully in ${totalElapsed}ms`);

            return {
                success: true,
                data: result,
                metadata: {
                    sourceFormat: '_raw2',
                    inputRows: rawData.length,
                    outputRows: result.length,
                    dateRange: this.getDateRange(result),
                    speciesCount: this.getSpeciesCount(result),
                    processingTime: totalElapsed
                },
                logs: this.logger.getLogs()
            };

        } catch (error) {
            this.logger.error('_raw2 to _nmax conversion failed', error);
            return {
                success: false,
                error: error.message,
                logs: this.logger.getLogs()
            };
        }
    }

    /**
     * Parse _raw2 CSV with special handling for commas in notes column (inline)
     */
    parseRaw2CSVInline(csvText) {
        this.logger.log(`DEBUG: _raw2 CSV input length: ${csvText.length} characters`);

        const expectedColumns = 14; // file_name through notes
        const lines = csvText.trim().split('\n');
        this.logger.log(`DEBUG: Total lines after split: ${lines.length}`);

        if (lines.length === 0) {
            throw new Error('CSV content is empty');
        }

        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        this.logger.log(`DEBUG: Parsed headers (${headers.length}): ${JSON.stringify(headers)}`);

        const data = [];
        let commaOverflowCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);

            // Handle comma overflow in notes column (last column)
            if (values.length > expectedColumns) {
                commaOverflowCount++;
                const notesIndex = expectedColumns - 1; // notes is the last column

                // Merge extra columns into notes and remove commas for CSV safety
                const mergedNotes = values.slice(notesIndex)
                    .join(' ')
                    .replace(/,/g, ''); // Remove commas to prevent CSV parsing issues

                // Replace the overflow columns with cleaned notes
                values.splice(notesIndex, values.length - notesIndex, mergedNotes);
            }

            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            } else {
                this.logger.warning(`Row ${i+1}: Column count mismatch (${values.length} vs ${expectedColumns})`);
            }
        }

        if (commaOverflowCount > 0) {
            this.logger.log(`DEBUG: Fixed comma overflow in ${commaOverflowCount} rows (notes column)`);
        }

        return data;
    }

    /**
     * Normalize _raw2 data for processing (inline)
     */
    normalizeRaw2DataInline(rawData) {
        this.logger.log('Starting _raw2 data normalization');
        this.logger.log(`Input _raw2 data: ${rawData.length} rows`);

        let failedTimestamp = 0;
        let failedTaxon = 0;
        let failedQuantity = 0;

        const normalized = rawData.map((row, index) => {
            if (index === 0) {
                this.logger.log(`🔍 Processing first row as example: ${JSON.stringify(row).substring(0, 200)}...`);
            }

            // Normalize all text fields
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[this.normalizeText(key)] = this.normalizeText(row[key]);
            });

            if (index === 0) {
                this.logger.log(`📝 Normalized first row keys: ${Object.keys(normalizedRow)}`);
                this.logger.log(`📂 file_name: "${normalizedRow.file_name}"`);
            }

            // Extract date/time from filename
            normalizedRow.eventTimestamp = this.extractDateFromFilenameInline(normalizedRow.file_name);
            normalizedRow.eventDate = normalizedRow.eventTimestamp ?
                normalizedRow.eventTimestamp.toISOString().split('T')[0] : null;

            if (index === 0) {
                this.logger.log(`📅 Extracted timestamp: ${normalizedRow.eventTimestamp}`);
                this.logger.log(`📅 Extracted date: ${normalizedRow.eventDate}`);
            }

            if (!normalizedRow.eventTimestamp) {
                failedTimestamp++;
                if (index < 3) { // Log first few failures
                    this.logger.warning(`❌ Row ${index + 1}: Failed to extract timestamp from "${normalizedRow.file_name}"`);
                }
            }

            // Choose best taxon identifier
            normalizedRow.taxon = this.chooseTaxonLabelRaw2Inline(normalizedRow);
            if (index === 0) {
                this.logger.log(`🐟 Species identification: "${normalizedRow.taxon}" (from species:"${normalizedRow.species}", note:"${normalizedRow.note}", genus:"${normalizedRow.genus}")`);
            }

            if (!normalizedRow.taxon) {
                failedTaxon++;
                if (index < 3) { // Log first few failures
                    this.logger.warning(`❌ Row ${index + 1}: No taxon identified`);
                }
            }

            // Parse and validate quantity
            normalizedRow.quantity = this.parseQuantityRaw2Inline(normalizedRow.quantity);
            if (index === 0) {
                this.logger.log(`🔢 Parsed quantity: ${normalizedRow.quantity} (from "${row.quantity}")`);
            }

            if (normalizedRow.quantity === 0) {
                failedQuantity++;
                if (index < 3) { // Log first few failures
                    this.logger.warning(`❌ Row ${index + 1}: Zero or invalid quantity "${row.quantity}"`);
                }
            }

            // Map _raw2 fields to standard format
            normalizedRow['File Name'] = normalizedRow.file_name || '';
            normalizedRow['Adjusted Date and Time'] = normalizedRow.eventTimestamp;
            normalizedRow['Timestamps (HH:MM:SS)'] = normalizedRow.time_stamp || '';
            normalizedRow['Event Observation'] = ''; // Not used in _raw2
            normalizedRow['Quantity (Nmax)'] = normalizedRow.quantity;
            normalizedRow['Notes'] = normalizedRow.notes || '';
            normalizedRow['Common Name'] = normalizedRow.note || '';
            normalizedRow['Order'] = normalizedRow.order || '';
            normalizedRow['Family'] = normalizedRow.family || '';
            normalizedRow['Genus'] = normalizedRow.genus || '';
            normalizedRow['Species'] = normalizedRow.species || '';
            normalizedRow['Lowest Order Scientific Name'] = ''; // Not available in _raw2
            normalizedRow['Confidence Level (1-5)'] = normalizedRow['confidence_1-5'] || '';
            normalizedRow['Quality of Video (1-5)'] = ''; // Always blank for _raw2
            normalizedRow['Where on Screen (1-9, 3x3 grid top left to lower right)'] = normalizedRow['location_1-9_thirds'] || '';
            normalizedRow['Analysis Date'] = '';
            normalizedRow['Analysis by Person'] = '';

            return normalizedRow;
        }).filter(row => row.eventTimestamp && row.taxon); // Only keep rows with valid dates and species

        this.logger.log(`Normalization complete: ${normalized.length} valid records`);
        if (failedTimestamp > 0) this.logger.warning(`${failedTimestamp} rows failed timestamp parsing`);
        if (failedTaxon > 0) this.logger.warning(`${failedTaxon} rows failed taxon identification`);
        if (failedQuantity > 0) this.logger.warning(`${failedQuantity} rows had zero/invalid quantity`);

        return normalized;
    }

    /**
     * Extract date/time from _raw2 filename pattern (inline)
     */
    extractDateFromFilenameInline(filename) {
        this.logger.log(`🔍 Extracting date from filename: ${filename}`);

        // Pattern: algapelago_1_2025-04-05_10-00-47
        const match = filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
        if (match) {
            const [_, year, month, day, hour, minute, second] = match;
            const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
            this.logger.log(`📅 Parsed ISO string: ${isoString}`);

            // Create date object with timezone (inline implementation)
            try {
                // Assume UTC and convert to Europe/London timezone like the original system
                const utcDate = new Date(isoString + 'Z'); // Add Z to treat as UTC
                this.logger.log(`🕒 Created UTC date: ${utcDate.toISOString()}`);
                return utcDate;
            } catch (error) {
                this.logger.warning(`❌ Failed to create date object from ${isoString}: ${error.message}`);
                return null;
            }
        }

        this.logger.warning(`❌ Failed to parse date from filename pattern: ${filename}`);
        return null;
    }

    /**
     * Choose best taxon label for _raw2 data (inline)
     */
    chooseTaxonLabelRaw2Inline(row) {
        // Priority order: species (scientific) → note (common name) → genus → family
        if (row.species?.trim()) return row.species.trim();
        if (row.note?.trim()) return row.note.trim();
        if (row.genus?.trim()) return row.genus.trim();
        if (row.family?.trim()) return row.family.trim();
        return null; // Will be filtered out
    }

    /**
     * Parse quantity from _raw2 data (inline)
     */
    parseQuantityRaw2Inline(quantityStr) {
        if (!quantityStr) return 0;

        // Handle "100+" format - remove '+' and parse as number
        const cleaned = quantityStr.toString().replace('+', '');
        const parsed = parseInt(cleaned);

        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Apply quality filters for _raw2 data (inline)
     */
    applyQualityFiltersRaw2Inline(normalizedData, options) {
        let filteredData = [...normalizedData];

        // Apply confidence level filter if specified
        if (options.minConfidence && options.minConfidence > 0) {
            const originalLength = filteredData.length;
            filteredData = filteredData.filter(row => {
                const confidence = parseInt(row['Confidence Level (1-5)']);
                return !isNaN(confidence) && confidence >= options.minConfidence;
            });
            this.logger.log(`Confidence filter (min ${options.minConfidence}): ${originalLength} → ${filteredData.length} rows`);
        }

        // No video quality filter for _raw2 (always blank)

        return filteredData;
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
        this.logger.log(`DEBUG: CSV input length: ${csvText.length} characters`);
        this.logger.log(`DEBUG: First 200 chars: ${csvText.substring(0, 200)}`);

        const lines = csvText.trim().split('\n');
        this.logger.log(`DEBUG: Total lines after split: ${lines.length}`);

        if (lines.length < 2) {
            throw new Error('CSV must contain header row and at least one data row');
        }

        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        this.logger.log(`DEBUG: Parsed headers (${headers.length}): ${JSON.stringify(headers)}`);

        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            } else {
                this.logger.log(`DEBUG: Row ${i} skipped - expected ${headers.length} columns, got ${values.length}`);
                if (i <= 3) { // Log first few problematic rows for debugging
                    this.logger.log(`DEBUG: Row ${i} content: ${JSON.stringify(values)}`);
                }
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
                // Don't include the quote character in the output
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
    /**
     * Fill missing days in daily species data with zeros
     * @param {Array} dailySpeciesData - Array of daily species records
     * @returns {Array} - Complete daily series with no date gaps
     */
    fillMissingDays(dailySpeciesData) {
        if (!dailySpeciesData || dailySpeciesData.length === 0) {
            return dailySpeciesData;
        }

        // Get all species columns (exclude Date column)
        const speciesColumns = Object.keys(dailySpeciesData[0]).filter(col => col !== 'Date');
        
        // Sort by date to ensure proper order
        const sortedData = [...dailySpeciesData].sort((a, b) => a.Date.localeCompare(b.Date));
        
        const result = [];
        
        for (let i = 0; i < sortedData.length; i++) {
            // Add current day
            result.push(sortedData[i]);
            
            // Check if there's a next day and if there's a gap
            if (i < sortedData.length - 1) {
                const currentDate = new Date(sortedData[i].Date);
                const nextDate = new Date(sortedData[i + 1].Date);
                
                // Calculate days between current and next
                const daysDiff = Math.floor((nextDate - currentDate) / (1000 * 60 * 60 * 24));
                
                // Fill missing days if gap > 1
                for (let dayOffset = 1; dayOffset < daysDiff; dayOffset++) {
                    const missingDate = new Date(currentDate);
                    missingDate.setDate(missingDate.getDate() + dayOffset);
                    
                    // Create row for missing day with zeros for all species
                    const missingDayRow = { 
                        Date: missingDate.toISOString().split('T')[0] 
                    };
                    
                    // Set all species counts to 0
                    speciesColumns.forEach(species => {
                        missingDayRow[species] = 0;
                    });
                    
                    result.push(missingDayRow);
                }
            }
        }
        
        // Sort final result by date
        return result.sort((a, b) => a.Date.localeCompare(b.Date));
    }

    /**
     * Aggregate daily species totals from per-clip data
     * @param {Array} perClipData - Per-clip Nmax data
     * @returns {Array} - Daily species matrix with filled missing days
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

        const dailySpeciesData = dates.map(date => {
            const row = { Date: date };
            speciesList.forEach(species => {
                row[species] = daily[date][species] || 0;
            });
            return row;
        });

        // Fill missing days with zeros for complete time series
        return this.fillMissingDays(dailySpeciesData);
    }

    /**
     * Calculate all summary metrics for _nmax format
     * @param {Array} speciesData - Daily species data
     * @returns {Array} - Complete _nmax format data
     */
    calculateNmaxSummaryMetrics(speciesData) {
        // Add null/empty check to prevent crashes
        if (!speciesData || speciesData.length === 0) {
            this.logger.warning('⚠️ No species data available for summary metrics calculation');
            return [];
        }

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
        this.startTime = Date.now();
        this.currentStep = null;
        this.totalSteps = 6;
        this.validationResults = {
            formatCompliance: 0,
            columnValidation: [],
            dataValidation: []
        };
        this.progressCallback = null;
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    setCurrentStep(stepNumber, stepName) {
        this.currentStep = { number: stepNumber, name: stepName };
        this.updateProgress();
    }

    updateProgress() {
        if (this.progressCallback && this.currentStep) {
            const elapsed = Date.now() - this.startTime;
            const progress = (this.currentStep.number / this.totalSteps) * 100;
            this.progressCallback({
                step: this.currentStep.number,
                totalSteps: this.totalSteps,
                stepName: this.currentStep.name,
                progress: Math.round(progress),
                elapsed: elapsed
            });
        }
    }

    log(message, level = 'INFO', metadata = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            step: this.currentStep ? this.currentStep.number : null,
            stepName: this.currentStep ? this.currentStep.name : null,
            metadata: metadata,
            elapsed: Date.now() - this.startTime
        };
        this.logs.push(entry);
        console.log(`[${entry.timestamp}] ${entry.level}: ${entry.message}`);

        // Trigger UI update if callback exists
        if (this.progressCallback) {
            this.progressCallback({ type: 'log', entry: entry });
        }
    }

    success(message, metadata = {}) {
        this.log(`✅ ${message}`, 'SUCCESS', metadata);
    }

    warning(message, metadata = {}) {
        this.log(`⚠️ ${message}`, 'WARNING', metadata);
    }

    debug(message, metadata = {}) {
        this.log(`🔍 ${message}`, 'DEBUG', metadata);
    }

    error(message, error = null, metadata = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: `❌ ${message}`,
            error: error ? error.toString() : null,
            step: this.currentStep ? this.currentStep.number : null,
            stepName: this.currentStep ? this.currentStep.name : null,
            metadata: metadata,
            elapsed: Date.now() - this.startTime
        };
        this.logs.push(entry);
        console.error(`[${entry.timestamp}] ${entry.level}: ${entry.message}`, error);

        // Trigger UI update if callback exists
        if (this.progressCallback) {
            this.progressCallback({ type: 'log', entry: entry });
        }
    }

    /**
     * Validate raw file format and structure
     * @param {Array} headers - CSV headers
     * @param {Array} sampleData - First few rows of data
     * @returns {Object} - Validation results with compliance score
     */
    validateRawFileFormat(headers, sampleData = []) {
        this.log('🔍 Starting raw file format validation...', 'INFO');

        // Expected columns for SUBCAM raw files
        const expectedColumns = [
            'File Name',
            'Adjusted Date and Time',
            'Timestamps (HH:MM:SS)',
            'Event Observation',
            'Quantity (Nmax)',
            'Notes',
            'Common Name',
            'Order',
            'Family',
            'Genus',
            'Species',
            'Lowest Order Scientific Name',
            'Confidence Level (1-5)',
            'Quality of Video (1-5)',
            'Where on Screen (1-9, 3x3 grid top left to lower right)',
            'Analysis Date',
            'Analysis by Person',
            'Adjusted Date / Time'
        ];

        const validationResults = {
            formatCompliance: 0,
            columnValidation: [],
            dataValidation: [],
            recommendations: []
        };

        // Column validation
        let matchedColumns = 0;
        expectedColumns.forEach(expectedCol => {
            const found = headers.some(header =>
                header.trim().toLowerCase() === expectedCol.toLowerCase()
            );

            validationResults.columnValidation.push({
                column: expectedCol,
                present: found,
                status: found ? '✅' : '❌'
            });

            if (found) {
                matchedColumns++;
                this.success(`Column found: ${expectedCol}`);
            } else {
                this.warning(`Missing expected column: ${expectedCol}`);
            }
        });

        // Check for unexpected columns
        headers.forEach(header => {
            const expected = expectedColumns.some(expectedCol =>
                header.trim().toLowerCase() === expectedCol.toLowerCase()
            );

            if (!expected) {
                this.warning(`Unexpected column found: ${header}`);
                validationResults.columnValidation.push({
                    column: header,
                    present: true,
                    status: '⚠️',
                    note: 'Unexpected column'
                });
            }
        });

        // Calculate compliance score
        validationResults.formatCompliance = Math.round((matchedColumns / expectedColumns.length) * 100);

        // Data validation on sample rows
        if (sampleData.length > 0) {
            this.log('🔍 Validating sample data...', 'INFO');

            sampleData.forEach((row, index) => {
                const rowValidation = this.validateSampleRow(row, index + 1, headers);
                validationResults.dataValidation.push(rowValidation);
            });
        }

        // Generate recommendations
        if (validationResults.formatCompliance < 80) {
            validationResults.recommendations.push(
                'File format compliance is below 80%. Please check column headers match expected SUBCAM format.'
            );
        }

        if (validationResults.formatCompliance < 50) {
            validationResults.recommendations.push(
                'Format compliance is critically low. This may not be a valid SUBCAM raw file.'
            );
        }

        // Check for common issues
        const missingCritical = validationResults.columnValidation
            .filter(col => !col.present && ['File Name', 'Adjusted Date and Time', 'Common Name'].includes(col.column));

        if (missingCritical.length > 0) {
            validationResults.recommendations.push(
                `Critical columns missing: ${missingCritical.map(c => c.column).join(', ')}. These are required for conversion.`
            );
        }

        // Check for data quality issues
        const dataIssues = validationResults.dataValidation.filter(v => v.issues.length > 0);
        if (dataIssues.length > 2) {
            validationResults.recommendations.push(
                `${dataIssues.length} rows have data quality issues. Check date formats, numeric values, and required fields.`
            );
        }

        this.validationResults = validationResults;
        this.success(`Format validation complete. Compliance: ${validationResults.formatCompliance}%`);

        return validationResults;
    }

    /**
     * Validate individual data row
     */
    validateSampleRow(row, rowNumber, headers) {
        const validation = {
            row: rowNumber,
            issues: [],
            status: '✅'
        };

        // Check for empty critical fields
        const criticalFields = ['File Name', 'Adjusted Date and Time', 'Common Name'];
        criticalFields.forEach(field => {
            const value = row[field];
            if (!value || value.toString().trim() === '') {
                validation.issues.push(`Empty ${field}`);
                validation.status = '❌';
            }
        });

        // Validate date format
        const dateField = row['Adjusted Date and Time'];
        if (dateField) {
            const datePattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/;
            if (!datePattern.test(dateField.toString().trim())) {
                validation.issues.push('Invalid date format');
                validation.status = '⚠️';
            }
        }

        // Validate numeric fields
        const numericFields = ['Confidence Level (1-5)', 'Quality of Video (1-5)'];
        numericFields.forEach(field => {
            const value = row[field];
            if (value && isNaN(parseFloat(value))) {
                validation.issues.push(`Non-numeric value in ${field}`);
                validation.status = '⚠️';
            }
        });

        return validation;
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
    }

    // ============= _RAW2 FORMAT CONVERSION METHODS =============

    /**
     * Detect if CSV content is in _raw2 format
     * @param {string} csvText - CSV content to analyze
     * @returns {boolean} - True if _raw2 format detected
     */
    isRaw2Format(csvText) {
        const firstLine = csvText.split('\n')[0];
        const expectedRaw2Headers = [
            'file_name', 'location_1-9_thirds', 'quantity', 'note', 'time_stamp',
            'confidence_1-5', 'species', 'genus', 'family', 'order', 'class', 'phylum', 'kingdom', 'notes'
        ];

        // Check if first line contains the expected _raw2 headers
        const hasRaw2Headers = expectedRaw2Headers.every(header =>
            firstLine.toLowerCase().includes(header.toLowerCase())
        );

        return hasRaw2Headers;
    }

    /**
     * Convert _raw2 CSV to _nmax format
     * @param {string} csvText - Raw2 CSV content as string
     * @param {Object} options - Conversion options
     * @returns {Object} - Conversion result with data and metadata
     */
    async convertRaw2ToNmax(csvText, options = {}) {
        try {
            this.logger.log('🚀 Starting _raw2 to _nmax conversion');

            // STEP 1: Parse _raw2 CSV with comma handling
            this.logger.setCurrentStep(1, 'Parsing _raw2 CSV format');
            const rawData = this.parseRaw2CSV(csvText);
            this.logger.success(`_raw2 CSV parsed successfully: ${rawData.length} rows`);

            // STEP 2: Normalize and clean _raw2 data
            this.logger.setCurrentStep(2, 'Normalizing _raw2 data');
            const normalizedData = this.normalizeRaw2Data(rawData);
            this.logger.success(`_raw2 data normalized: ${normalizedData.length} valid records`);

            // STEP 3: Apply quality filters (confidence only for _raw2)
            this.logger.setCurrentStep(3, 'Applying quality filters');
            const filteredData = this.applyQualityFiltersRaw2(normalizedData, options);
            const filterRatio = ((filteredData.length / normalizedData.length) * 100).toFixed(1);
            this.logger.success(`Quality filters applied: ${filteredData.length} records passed (${filterRatio}%)`);

            // STEP 4: Calculate per-clip Nmax (reuse existing logic)
            this.logger.setCurrentStep(4, 'Calculating per-clip Nmax values');
            const perClipData = this.calculatePerClipNmax(filteredData);
            this.logger.success(`Per-clip Nmax calculated for ${Object.keys(perClipData).length} unique clips`);

            // STEP 5: Aggregate to daily species totals (reuse existing logic)
            this.logger.setCurrentStep(5, 'Aggregating daily species totals');
            const dailySpecies = this.aggregateDailySpecies(perClipData);
            this.logger.success(`Daily aggregation complete: ${dailySpecies.length} daily species records`);

            // STEP 6: Calculate summary metrics and validate (reuse existing logic)
            this.logger.setCurrentStep(6, 'Calculating summary metrics and validating output');
            const result = this.calculateNmaxSummaryMetrics(dailySpecies);
            this.validateNmaxOutput(result);
            this.logger.success(`Output validation complete: ${result.length} final records`);

            const totalElapsed = Date.now() - this.logger.startTime;
            this.logger.success(`🎉 _raw2 to _nmax conversion completed successfully in ${totalElapsed}ms`);

            return {
                success: true,
                data: result,
                metadata: {
                    sourceFormat: '_raw2',
                    inputRows: rawData.length,
                    outputRows: result.length,
                    dateRange: this.getDateRange(result),
                    speciesCount: this.getSpeciesCount(result),
                    processingTime: totalElapsed
                },
                logs: this.logger.getLogs()
            };

        } catch (error) {
            this.logger.error('_raw2 to _nmax conversion failed', error);
            return {
                success: false,
                error: error.message,
                logs: this.logger.getLogs()
            };
        }
    }

    /**
     * Parse _raw2 CSV with special handling for commas in notes column
     * @param {string} csvText - Raw CSV content
     * @returns {Array} - Parsed data rows
     */
    parseRaw2CSV(csvText) {
        this.logger.log(`DEBUG: _raw2 CSV input length: ${csvText.length} characters`);

        const expectedColumns = 14; // file_name through notes
        const lines = csvText.trim().split('\n');
        this.logger.log(`DEBUG: Total lines after split: ${lines.length}`);

        if (lines.length === 0) {
            throw new Error('CSV content is empty');
        }

        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        this.logger.log(`DEBUG: Parsed headers (${headers.length}): ${JSON.stringify(headers)}`);

        const data = [];
        let commaOverflowCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);

            // Handle comma overflow in notes column (last column)
            if (values.length > expectedColumns) {
                commaOverflowCount++;
                const notesIndex = expectedColumns - 1; // notes is the last column

                // Merge extra columns into notes and remove commas for CSV safety
                const mergedNotes = values.slice(notesIndex)
                    .join(' ')
                    .replace(/,/g, ''); // Remove commas to prevent CSV parsing issues

                // Replace the overflow columns with cleaned notes
                values.splice(notesIndex, values.length - notesIndex, mergedNotes);
            }

            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            } else {
                this.logger.warning(`Row ${i+1}: Column count mismatch (${values.length} vs ${expectedColumns})`);
            }
        }

        if (commaOverflowCount > 0) {
            this.logger.log(`DEBUG: Fixed comma overflow in ${commaOverflowCount} rows (notes column)`);
        }

        return data;
    }

    /**
     * Extract date/time from _raw2 filename pattern
     * @param {string} filename - Filename to parse
     * @returns {Date|null} - Parsed date or null if parsing fails
     */
    extractDateFromFilename(filename) {
        // Pattern: algapelago_1_2025-04-05_10-00-47
        const match = filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
        if (match) {
            const [_, year, month, day, hour, minute, second] = match;
            const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

            // Use same timezone handling as current system
            return this.parseTimestampWithTimezone(isoString);
        }

        this.logger.warning(`Failed to parse date from filename: ${filename}`);
        return null;
    }

    /**
     * Choose best taxon label for _raw2 data (priority: scientific → common → genus → family)
     * @param {Object} row - Data row
     * @returns {string|null} - Best available taxon label
     */
    chooseTaxonLabelRaw2(row) {
        // Priority order: species (scientific) → note (common name) → genus → family
        if (row.species?.trim()) return row.species.trim();
        if (row.note?.trim()) return row.note.trim();
        if (row.genus?.trim()) return row.genus.trim();
        if (row.family?.trim()) return row.family.trim();
        return null; // Will be filtered out
    }

    /**
     * Parse quantity from _raw2 data (handle "100+" format)
     * @param {string} quantityStr - Quantity string
     * @returns {number} - Parsed quantity
     */
    parseQuantityRaw2(quantityStr) {
        if (!quantityStr) return 0;

        // Handle "100+" format - remove '+' and parse as number
        const cleaned = quantityStr.toString().replace('+', '');
        const parsed = parseInt(cleaned);

        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Normalize _raw2 data for processing
     * @param {Array} rawData - Raw parsed data
     * @returns {Array} - Normalized data
     */
    normalizeRaw2Data(rawData) {
        this.logger.log('Starting _raw2 data normalization');
        this.logger.log(`Input _raw2 data: ${rawData.length} rows`);

        let failedTimestamp = 0;
        let failedTaxon = 0;
        let failedQuantity = 0;

        const normalized = rawData.map((row, index) => {
            // Normalize all text fields
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
                normalizedRow[this.normalizeText(key)] = this.normalizeText(row[key]);
            });

            // Extract date/time from filename
            normalizedRow.eventTimestamp = this.extractDateFromFilename(normalizedRow.file_name);
            normalizedRow.eventDate = normalizedRow.eventTimestamp ?
                normalizedRow.eventTimestamp.toISOString().split('T')[0] : null;

            if (!normalizedRow.eventTimestamp) failedTimestamp++;

            // Choose best taxon identifier
            normalizedRow.taxon = this.chooseTaxonLabelRaw2(normalizedRow);
            if (!normalizedRow.taxon) failedTaxon++;

            // Parse and validate quantity
            normalizedRow.quantity = this.parseQuantityRaw2(normalizedRow.quantity);
            if (normalizedRow.quantity === 0) failedQuantity++;

            // Map _raw2 fields to standard format
            normalizedRow['File Name'] = normalizedRow.file_name || '';
            normalizedRow['Adjusted Date and Time'] = normalizedRow.eventTimestamp;
            normalizedRow['Timestamps (HH:MM:SS)'] = normalizedRow.time_stamp || '';
            normalizedRow['Event Observation'] = ''; // Not used in _raw2
            normalizedRow['Quantity (Nmax)'] = normalizedRow.quantity;
            normalizedRow['Notes'] = normalizedRow.notes || '';
            normalizedRow['Common Name'] = normalizedRow.note || '';
            normalizedRow['Order'] = normalizedRow.order || '';
            normalizedRow['Family'] = normalizedRow.family || '';
            normalizedRow['Genus'] = normalizedRow.genus || '';
            normalizedRow['Species'] = normalizedRow.species || '';
            normalizedRow['Lowest Order Scientific Name'] = ''; // Not available in _raw2
            normalizedRow['Confidence Level (1-5)'] = normalizedRow['confidence_1-5'] || '';
            normalizedRow['Quality of Video (1-5)'] = ''; // Always blank for _raw2
            normalizedRow['Where on Screen (1-9, 3x3 grid top left to lower right)'] = normalizedRow['location_1-9_thirds'] || '';
            normalizedRow['Analysis Date'] = '';
            normalizedRow['Analysis by Person'] = '';

            return normalizedRow;
        }).filter(row => row.eventTimestamp && row.taxon); // Only keep rows with valid dates and species

        this.logger.log(`Normalization complete: ${normalized.length} valid records`);
        if (failedTimestamp > 0) this.logger.warning(`${failedTimestamp} rows failed timestamp parsing`);
        if (failedTaxon > 0) this.logger.warning(`${failedTaxon} rows failed taxon identification`);
        if (failedQuantity > 0) this.logger.warning(`${failedQuantity} rows had zero/invalid quantity`);

        return normalized;
    }

    /**
     * Apply quality filters for _raw2 data (confidence only, no video quality)
     * @param {Array} normalizedData - Normalized data
     * @param {Object} options - Filter options
     * @returns {Array} - Filtered data
     */
    applyQualityFiltersRaw2(normalizedData, options) {
        let filteredData = [...normalizedData];

        // Apply confidence level filter if specified
        if (options.minConfidence && options.minConfidence > 0) {
            const originalLength = filteredData.length;
            filteredData = filteredData.filter(row => {
                const confidence = parseInt(row['Confidence Level (1-5)']);
                return !isNaN(confidence) && confidence >= options.minConfidence;
            });
            this.logger.log(`Confidence filter (min ${options.minConfidence}): ${originalLength} → ${filteredData.length} rows`);
        }

        // No video quality filter for _raw2 (always blank)

        return filteredData;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUBCAMConverter, ConversionLogger };
}