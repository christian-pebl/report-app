/**
 * SUBCAM Validation and Quality Assurance System
 * Comprehensive data validation for file conversions
 */

class SUBCAMValidator {
    constructor() {
        this.validationRules = new ValidationRules();
        this.qualityMetrics = new QualityMetrics();
        this.logger = new ValidationLogger();
    }

    /**
     * Validate raw CSV data before conversion
     * @param {Array} rawData - Parsed raw data
     * @returns {Object} - Validation result
     */
    validateRawData(rawData) {
        this.logger.log('Starting raw data validation');

        const results = {
            isValid: true,
            errors: [],
            warnings: [],
            metrics: {},
            recommendations: []
        };

        try {
            // Required column validation
            this.validateRequiredColumns(rawData, results);

            // Data type validation
            this.validateDataTypes(rawData, results);

            // Timestamp validation
            this.validateTimestamps(rawData, results);

            // Species identifier validation
            this.validateSpeciesIdentifiers(rawData, results);

            // Quantity validation
            this.validateQuantities(rawData, results);

            // Quality metrics calculation
            results.metrics = this.qualityMetrics.calculateRawDataMetrics(rawData);

            // Generate recommendations
            this.generateRecommendations(rawData, results);

            this.logger.log(`Raw data validation completed: ${results.errors.length} errors, ${results.warnings.length} warnings`);

        } catch (error) {
            results.isValid = false;
            results.errors.push(`Validation failed: ${error.message}`);
            this.logger.error('Raw data validation failed', error);
        }

        return results;
    }

    /**
     * Validate converted output data
     * @param {Array} outputData - Converted data
     * @param {string} format - Output format (_nmax or _obvs)
     * @returns {Object} - Validation result
     */
    validateConvertedData(outputData, format) {
        this.logger.log(`Starting ${format} output validation`);

        const results = {
            isValid: true,
            errors: [],
            warnings: [],
            metrics: {},
            integrityChecks: {}
        };

        try {
            if (format === '_nmax') {
                this.validateNmaxOutput(outputData, results);
            } else if (format === '_obvs') {
                this.validateObvsOutput(outputData, results);
            } else {
                throw new Error(`Unknown format: ${format}`);
            }

            // Calculate quality metrics
            results.metrics = this.qualityMetrics.calculateOutputMetrics(outputData, format);

            // Perform integrity checks
            results.integrityChecks = this.performIntegrityChecks(outputData, format);

            this.logger.log(`${format} validation completed: ${results.errors.length} errors`);

        } catch (error) {
            results.isValid = false;
            results.errors.push(`${format} validation failed: ${error.message}`);
            this.logger.error(`${format} validation failed`, error);
        }

        return results;
    }

    /**
     * Validate required columns are present
     */
    validateRequiredColumns(rawData, results) {
        const requiredColumns = [
            'File Name',
            'Event Observation',
            'Quantity (Nmax)'
        ];

        const timestampColumns = [
            'Adjusted Date and Time',
            'Adjusted Date / Time',
            'Date/Time of Recording'
        ];

        const speciesColumns = [
            'Common Name',
            'Lowest Order Scientific Name'
        ];

        if (rawData.length === 0) {
            results.errors.push('No data rows found');
            results.isValid = false;
            return;
        }

        const headers = Object.keys(rawData[0]);

        // Check required columns
        requiredColumns.forEach(col => {
            if (!headers.includes(col)) {
                results.errors.push(`Missing required column: ${col}`);
                results.isValid = false;
            }
        });

        // Check timestamp columns (at least one required)
        const hasTimestamp = timestampColumns.some(col => headers.includes(col));
        if (!hasTimestamp) {
            results.errors.push('Missing timestamp column. Need one of: ' + timestampColumns.join(', '));
            results.isValid = false;
        }

        // Check species columns (at least one required)
        const hasSpecies = speciesColumns.some(col => headers.includes(col));
        if (!hasSpecies) {
            results.errors.push('Missing species identifier column. Need one of: ' + speciesColumns.join(', '));
            results.isValid = false;
        }

        // Check for unknown columns
        const knownColumns = [
            ...requiredColumns,
            ...timestampColumns,
            ...speciesColumns,
            'Confidence Level',
            'Quality of Video',
            'Where on Screen',
            'Order', 'Family', 'Genus', 'Species',
            'Timestamps (HH:MM:SS)'
        ];

        const unknownColumns = headers.filter(col =>
            !knownColumns.includes(col) && !col.startsWith('Unnamed:')
        );

        unknownColumns.forEach(col => {
            results.warnings.push(`Unknown column: ${col}`);
        });
    }

    /**
     * Validate data types in raw data
     */
    validateDataTypes(rawData, results) {
        let numericErrors = 0;
        let stringErrors = 0;

        rawData.forEach((row, index) => {
            // Validate quantity is numeric
            const quantity = row['Quantity (Nmax)'];
            if (quantity !== undefined && quantity !== '' && isNaN(parseFloat(quantity))) {
                numericErrors++;
                if (numericErrors <= 5) { // Limit error reporting
                    results.errors.push(`Row ${index + 1}: Invalid quantity value '${quantity}'`);
                }
            }

            // Validate confidence and quality are numeric if present
            ['Confidence Level', 'Quality of Video'].forEach(col => {
                const value = row[col];
                if (value !== undefined && value !== '' && isNaN(parseInt(value))) {
                    results.warnings.push(`Row ${index + 1}: Non-numeric ${col} value '${value}'`);
                }
            });

            // Validate required string fields are not empty
            ['File Name', 'Event Observation'].forEach(col => {
                const value = row[col];
                if (!value || typeof value !== 'string' || value.trim() === '') {
                    stringErrors++;
                    if (stringErrors <= 5) {
                        results.errors.push(`Row ${index + 1}: Empty or invalid ${col}`);
                    }
                }
            });
        });

        if (numericErrors > 5) {
            results.errors.push(`... and ${numericErrors - 5} more numeric validation errors`);
        }
        if (stringErrors > 5) {
            results.errors.push(`... and ${stringErrors - 5} more string validation errors`);
        }

        if (numericErrors > 0 || stringErrors > 0) {
            results.isValid = false;
        }
    }

    /**
     * Validate timestamp fields
     */
    validateTimestamps(rawData, results) {
        const timestampColumns = [
            'Adjusted Date and Time',
            'Adjusted Date / Time',
            'Date/Time of Recording'
        ];

        let validTimestamps = 0;
        let invalidTimestamps = 0;

        rawData.forEach((row, index) => {
            let hasValidTimestamp = false;

            timestampColumns.forEach(col => {
                if (row[col]) {
                    const parsed = new Date(row[col]);
                    if (!isNaN(parsed.getTime())) {
                        hasValidTimestamp = true;
                    }
                }
            });

            if (hasValidTimestamp) {
                validTimestamps++;
            } else {
                invalidTimestamps++;
                if (invalidTimestamps <= 10) {
                    results.warnings.push(`Row ${index + 1}: No valid timestamp found`);
                }
            }
        });

        if (invalidTimestamps > 10) {
            results.warnings.push(`... and ${invalidTimestamps - 10} more timestamp warnings`);
        }

        results.metrics = results.metrics || {};
        results.metrics.timestampValidation = {
            validTimestamps,
            invalidTimestamps,
            validationRate: (validTimestamps / rawData.length) * 100
        };

        if (validTimestamps === 0) {
            results.errors.push('No valid timestamps found in any row');
            results.isValid = false;
        }
    }

    /**
     * Validate species identifiers
     */
    validateSpeciesIdentifiers(rawData, results) {
        let validSpecies = 0;
        let invalidSpecies = 0;
        const uniqueSpecies = new Set();

        rawData.forEach((row, index) => {
            const scientific = row['Lowest Order Scientific Name'];
            const common = row['Common Name'];

            let hasValidSpecies = false;

            if (scientific && typeof scientific === 'string' && scientific.trim()) {
                hasValidSpecies = true;
                uniqueSpecies.add(scientific.trim());
            } else if (common && typeof common === 'string' && common.trim()) {
                hasValidSpecies = true;
                uniqueSpecies.add(common.trim());
            }

            if (hasValidSpecies) {
                validSpecies++;
            } else {
                invalidSpecies++;
                if (invalidSpecies <= 10) {
                    results.warnings.push(`Row ${index + 1}: No valid species identifier`);
                }
            }
        });

        if (invalidSpecies > 10) {
            results.warnings.push(`... and ${invalidSpecies - 10} more species identifier warnings`);
        }

        results.metrics = results.metrics || {};
        results.metrics.speciesValidation = {
            validSpecies,
            invalidSpecies,
            uniqueSpeciesCount: uniqueSpecies.size,
            validationRate: (validSpecies / rawData.length) * 100
        };

        if (validSpecies === 0) {
            results.errors.push('No valid species identifiers found');
            results.isValid = false;
        }
    }

    /**
     * Validate quantity values
     */
    validateQuantities(rawData, results) {
        let validQuantities = 0;
        let invalidQuantities = 0;
        let negativeQuantities = 0;
        let zeroQuantities = 0;
        let maxQuantity = 0;

        rawData.forEach((row, index) => {
            const quantity = parseFloat(row['Quantity (Nmax)']);

            if (isNaN(quantity)) {
                invalidQuantities++;
            } else {
                validQuantities++;
                if (quantity < 0) {
                    negativeQuantities++;
                    if (negativeQuantities <= 5) {
                        results.warnings.push(`Row ${index + 1}: Negative quantity ${quantity}`);
                    }
                } else if (quantity === 0) {
                    zeroQuantities++;
                } else {
                    maxQuantity = Math.max(maxQuantity, quantity);
                }
            }
        });

        if (negativeQuantities > 5) {
            results.warnings.push(`... and ${negativeQuantities - 5} more negative quantity warnings`);
        }

        results.metrics = results.metrics || {};
        results.metrics.quantityValidation = {
            validQuantities,
            invalidQuantities,
            negativeQuantities,
            zeroQuantities,
            maxQuantity,
            averageQuantity: validQuantities > 0 ? maxQuantity / validQuantities : 0
        };
    }

    /**
     * Generate recommendations based on validation results
     */
    generateRecommendations(rawData, results) {
        const metrics = results.metrics;

        // Timestamp recommendations
        if (metrics.timestampValidation && metrics.timestampValidation.validationRate < 95) {
            results.recommendations.push('Consider reviewing timestamp format consistency');
        }

        // Species recommendations
        if (metrics.speciesValidation && metrics.speciesValidation.uniqueSpeciesCount < 5) {
            results.recommendations.push('Low species diversity detected - verify data completeness');
        }

        // Quantity recommendations
        if (metrics.quantityValidation) {
            if (metrics.quantityValidation.negativeQuantities > 0) {
                results.recommendations.push('Consider filtering out or correcting negative quantities');
            }
            if (metrics.quantityValidation.zeroQuantities / rawData.length > 0.5) {
                results.recommendations.push('High proportion of zero quantities - verify data quality');
            }
        }

        // Quality filter recommendations
        const confidenceValues = rawData.filter(row => !isNaN(parseInt(row['Confidence Level'])));
        if (confidenceValues.length > 0) {
            const avgConfidence = confidenceValues.reduce((sum, row) => sum + parseInt(row['Confidence Level']), 0) / confidenceValues.length;
            if (avgConfidence < 3) {
                results.recommendations.push('Consider applying confidence level filtering (minimum 3)');
            }
        }
    }

    /**
     * Validate _nmax output format
     */
    validateNmaxOutput(outputData, results) {
        this.validationRules.validateNmaxFormat(outputData, results);
        this.validationRules.validateMonotonicFields(outputData, results, '_nmax');
        this.validationRules.validateRowTotals(outputData, results);
        this.validationRules.validateDateUniqueness(outputData, results);
    }

    /**
     * Validate _obvs output format
     */
    validateObvsOutput(outputData, results) {
        this.validationRules.validateObvsFormat(outputData, results);
        this.validationRules.validateMonotonicFields(outputData, results, '_obvs');
        this.validationRules.validateRowTotals(outputData, results);
        this.validationRules.validateDateUniqueness(outputData, results);
        this.validationRules.validateUniqueOrganismsCounts(outputData, results);
    }

    /**
     * Perform integrity checks on output data
     */
    performIntegrityChecks(outputData, format) {
        return {
            dateRange: this.calculateDateRange(outputData),
            speciesCount: this.countSpecies(outputData),
            dataCompleteness: this.checkDataCompleteness(outputData),
            consistencyChecks: this.performConsistencyChecks(outputData, format)
        };
    }

    calculateDateRange(outputData) {
        const dates = outputData.map(row => row.Date).filter(date => date).sort();
        return {
            startDate: dates[0] || null,
            endDate: dates[dates.length - 1] || null,
            totalDays: dates.length,
            dateGaps: this.findDateGaps(dates)
        };
    }

    findDateGaps(sortedDates) {
        const gaps = [];
        for (let i = 1; i < sortedDates.length; i++) {
            const current = new Date(sortedDates[i]);
            const previous = new Date(sortedDates[i - 1]);
            const dayDiff = (current - previous) / (1000 * 60 * 60 * 24);

            if (dayDiff > 1) {
                gaps.push({
                    after: sortedDates[i - 1],
                    before: sortedDates[i],
                    days: dayDiff - 1
                });
            }
        }
        return gaps;
    }

    countSpecies(outputData) {
        if (outputData.length === 0) return 0;

        const summaryColumns = [
            'Date', 'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species',
            'Unique Organisms Observed Today'
        ];

        return Object.keys(outputData[0]).filter(col => !summaryColumns.includes(col)).length;
    }

    checkDataCompleteness(outputData) {
        let emptyValues = 0;
        let totalValues = 0;

        outputData.forEach(row => {
            Object.values(row).forEach(value => {
                totalValues++;
                if (value === null || value === undefined || value === '') {
                    emptyValues++;
                }
            });
        });

        return {
            totalValues,
            emptyValues,
            completenessRate: ((totalValues - emptyValues) / totalValues) * 100
        };
    }

    performConsistencyChecks(outputData, format) {
        const checks = {};

        // Check cumulative field consistency
        if (format === '_nmax') {
            checks.cumulativeObservations = this.checkCumulativeObservations(outputData);
        }

        checks.cumulativeSpecies = this.checkCumulativeSpecies(outputData);
        checks.totalCalculations = this.checkTotalCalculations(outputData);

        return checks;
    }

    checkCumulativeObservations(outputData) {
        let expectedCumulative = 0;
        const errors = [];

        outputData.forEach((row, index) => {
            expectedCumulative += row['Total Observations'];
            if (row['Cumulative Observations'] !== expectedCumulative) {
                errors.push({
                    row: index,
                    expected: expectedCumulative,
                    actual: row['Cumulative Observations']
                });
            }
        });

        return { errors, isValid: errors.length === 0 };
    }

    checkCumulativeSpecies(outputData) {
        const seenSpecies = new Set();
        const errors = [];

        const summaryColumns = [
            'Date', 'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species',
            'Unique Organisms Observed Today'
        ];

        const speciesColumns = Object.keys(outputData[0]).filter(col => !summaryColumns.includes(col));

        outputData.forEach((row, index) => {
            speciesColumns.forEach(species => {
                if (row[species] > 0) {
                    seenSpecies.add(species);
                }
            });

            if (row['Cumulative Unique Species'] !== seenSpecies.size) {
                errors.push({
                    row: index,
                    expected: seenSpecies.size,
                    actual: row['Cumulative Unique Species']
                });
            }
        });

        return { errors, isValid: errors.length === 0 };
    }

    checkTotalCalculations(outputData) {
        const errors = [];

        const summaryColumns = [
            'Date', 'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species',
            'Unique Organisms Observed Today'
        ];

        const speciesColumns = Object.keys(outputData[0]).filter(col => !summaryColumns.includes(col));

        outputData.forEach((row, index) => {
            const calculatedTotal = speciesColumns.reduce((sum, col) => sum + row[col], 0);
            if (row['Total Observations'] !== calculatedTotal) {
                errors.push({
                    row: index,
                    expected: calculatedTotal,
                    actual: row['Total Observations']
                });
            }
        });

        return { errors, isValid: errors.length === 0 };
    }
}

/**
 * Validation rules for different output formats
 */
class ValidationRules {
    validateNmaxFormat(outputData, results) {
        const requiredColumns = [
            'Date',
            'Total Observations',
            'Cumulative Observations',
            'All Unique Organisms Observed Today',
            'New Unique Organisms Today',
            'Cumulative New Unique Organisms',
            'Cumulative Unique Species'
        ];

        if (outputData.length === 0) {
            results.errors.push('Output data is empty');
            results.isValid = false;
            return;
        }

        const headers = Object.keys(outputData[0]);

        requiredColumns.forEach(col => {
            if (!headers.includes(col)) {
                results.errors.push(`Missing required _nmax column: ${col}`);
                results.isValid = false;
            }
        });
    }

    validateObvsFormat(outputData, results) {
        const requiredColumns = [
            'Date',
            'Total Observations',
            'Unique Organisms Observed Today',
            'New Unique Organisms Today',
            'Cumulative Unique Species'
        ];

        if (outputData.length === 0) {
            results.errors.push('Output data is empty');
            results.isValid = false;
            return;
        }

        const headers = Object.keys(outputData[0]);

        requiredColumns.forEach(col => {
            if (!headers.includes(col)) {
                results.errors.push(`Missing required _obvs column: ${col}`);
                results.isValid = false;
            }
        });
    }

    validateMonotonicFields(outputData, results, format) {
        const monotonicFields = format === '_nmax' ?
            ['Cumulative Observations', 'Cumulative Unique Species'] :
            ['Cumulative Unique Species'];

        monotonicFields.forEach(field => {
            for (let i = 1; i < outputData.length; i++) {
                if (outputData[i][field] < outputData[i - 1][field]) {
                    results.errors.push(`${field} is not monotonic at row ${i + 1}`);
                    results.isValid = false;
                }
            }
        });
    }

    validateRowTotals(outputData, results) {
        const summaryColumns = [
            'Date', 'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species',
            'Unique Organisms Observed Today'
        ];

        outputData.forEach((row, index) => {
            const speciesColumns = Object.keys(row).filter(col => !summaryColumns.includes(col));
            const speciesTotal = speciesColumns.reduce((sum, col) => sum + (row[col] || 0), 0);

            if (row['Total Observations'] !== speciesTotal) {
                results.errors.push(`Row total mismatch at row ${index + 1}: expected ${speciesTotal}, got ${row['Total Observations']}`);
                results.isValid = false;
            }
        });
    }

    validateDateUniqueness(outputData, results) {
        const dates = outputData.map(row => row.Date);
        const uniqueDates = new Set(dates);

        if (dates.length !== uniqueDates.size) {
            results.errors.push('Duplicate dates found in output');
            results.isValid = false;
        }
    }

    validateUniqueOrganismsCounts(outputData, results) {
        const summaryColumns = [
            'Date', 'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species',
            'Unique Organisms Observed Today'
        ];

        outputData.forEach((row, index) => {
            const speciesColumns = Object.keys(row).filter(col => !summaryColumns.includes(col));
            const activeSpeciesCount = speciesColumns.filter(col => row[col] > 0).length;

            if (row['Unique Organisms Observed Today'] !== activeSpeciesCount) {
                results.errors.push(`Unique organisms count mismatch at row ${index + 1}: expected ${activeSpeciesCount}, got ${row['Unique Organisms Observed Today']}`);
                results.isValid = false;
            }
        });
    }
}

/**
 * Quality metrics calculator
 */
class QualityMetrics {
    calculateRawDataMetrics(rawData) {
        return {
            totalRows: rawData.length,
            dateRange: this.calculateInputDateRange(rawData),
            speciesDistribution: this.calculateSpeciesDistribution(rawData),
            qualityScores: this.calculateQualityScores(rawData),
            fileDistribution: this.calculateFileDistribution(rawData)
        };
    }

    calculateOutputMetrics(outputData, format) {
        return {
            totalRows: outputData.length,
            dateRange: this.calculateOutputDateRange(outputData),
            speciesMetrics: this.calculateSpeciesMetrics(outputData),
            observationMetrics: this.calculateObservationMetrics(outputData, format)
        };
    }

    calculateInputDateRange(rawData) {
        const timestampColumns = [
            'Adjusted Date and Time',
            'Adjusted Date / Time',
            'Date/Time of Recording'
        ];

        const validDates = [];
        rawData.forEach(row => {
            timestampColumns.forEach(col => {
                if (row[col]) {
                    const parsed = new Date(row[col]);
                    if (!isNaN(parsed.getTime())) {
                        validDates.push(parsed);
                    }
                }
            });
        });

        if (validDates.length === 0) return null;

        validDates.sort((a, b) => a - b);
        return {
            start: validDates[0].toISOString().split('T')[0],
            end: validDates[validDates.length - 1].toISOString().split('T')[0],
            totalDays: Math.ceil((validDates[validDates.length - 1] - validDates[0]) / (1000 * 60 * 60 * 24)) + 1
        };
    }

    calculateSpeciesDistribution(rawData) {
        const species = {};
        rawData.forEach(row => {
            const scientific = row['Lowest Order Scientific Name'];
            const common = row['Common Name'];

            let speciesName = null;
            if (scientific && scientific.trim()) {
                speciesName = scientific.trim();
            } else if (common && common.trim()) {
                speciesName = common.trim();
            }

            if (speciesName) {
                species[speciesName] = (species[speciesName] || 0) + 1;
            }
        });

        return {
            uniqueSpecies: Object.keys(species).length,
            distribution: species
        };
    }

    calculateQualityScores(rawData) {
        const confidenceValues = rawData
            .map(row => parseInt(row['Confidence Level']))
            .filter(val => !isNaN(val));

        const qualityValues = rawData
            .map(row => parseInt(row['Quality of Video']))
            .filter(val => !isNaN(val));

        return {
            confidence: {
                count: confidenceValues.length,
                average: confidenceValues.length > 0 ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length : null,
                distribution: this.calculateDistribution(confidenceValues)
            },
            quality: {
                count: qualityValues.length,
                average: qualityValues.length > 0 ? qualityValues.reduce((a, b) => a + b, 0) / qualityValues.length : null,
                distribution: this.calculateDistribution(qualityValues)
            }
        };
    }

    calculateDistribution(values) {
        const dist = {};
        values.forEach(val => {
            dist[val] = (dist[val] || 0) + 1;
        });
        return dist;
    }

    calculateFileDistribution(rawData) {
        const files = {};
        rawData.forEach(row => {
            const fileName = row['File Name'];
            if (fileName) {
                files[fileName] = (files[fileName] || 0) + 1;
            }
        });

        return {
            uniqueFiles: Object.keys(files).length,
            distribution: files
        };
    }

    calculateOutputDateRange(outputData) {
        const dates = outputData.map(row => row.Date).filter(date => date).sort();
        return {
            start: dates[0] || null,
            end: dates[dates.length - 1] || null,
            totalDays: dates.length
        };
    }

    calculateSpeciesMetrics(outputData) {
        if (outputData.length === 0) return null;

        const summaryColumns = [
            'Date', 'Total Observations', 'Cumulative Observations',
            'All Unique Organisms Observed Today', 'New Unique Organisms Today',
            'Cumulative New Unique Organisms', 'Cumulative Unique Species',
            'Unique Organisms Observed Today'
        ];

        const speciesColumns = Object.keys(outputData[0]).filter(col => !summaryColumns.includes(col));

        return {
            totalSpecies: speciesColumns.length,
            speciesNames: speciesColumns,
            speciesActivity: this.calculateSpeciesActivity(outputData, speciesColumns)
        };
    }

    calculateSpeciesActivity(outputData, speciesColumns) {
        const activity = {};

        speciesColumns.forEach(species => {
            const activeDays = outputData.filter(row => row[species] > 0).length;
            const totalObservations = outputData.reduce((sum, row) => sum + row[species], 0);

            activity[species] = {
                activeDays,
                totalObservations,
                activityRate: (activeDays / outputData.length) * 100
            };
        });

        return activity;
    }

    calculateObservationMetrics(outputData, format) {
        const totalObs = outputData.reduce((sum, row) => sum + row['Total Observations'], 0);
        const avgDaily = totalObs / outputData.length;

        const dailyTotals = outputData.map(row => row['Total Observations']);
        const maxDaily = Math.max(...dailyTotals);
        const minDaily = Math.min(...dailyTotals);

        return {
            totalObservations: totalObs,
            averageDailyObservations: avgDaily,
            maxDailyObservations: maxDaily,
            minDailyObservations: minDaily,
            observationType: format === '_nmax' ? 'Individual counts' : 'Event counts'
        };
    }
}

/**
 * Validation logging utility
 */
class ValidationLogger {
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
        console.log(`[VALIDATION] ${entry.message}`);
    }

    error(message, error) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: message,
            error: error ? error.toString() : null
        };
        this.logs.push(entry);
        console.error(`[VALIDATION] ${entry.message}`, error);
    }

    getLogs() {
        return this.logs;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUBCAMValidator, ValidationRules, QualityMetrics, ValidationLogger };
}