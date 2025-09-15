/**
 * SUBCAM Conversion Test Suite
 * Comprehensive testing for _raw to _nmax and _raw to _obvs conversions
 */

class ConversionTestSuite {
    constructor() {
        this.converter = new SUBCAMConverter();
        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    /**
     * Run all conversion tests
     * @returns {Object} - Complete test results
     */
    async runAllTests() {
        console.log('🧪 Starting SUBCAM Conversion Test Suite');
        console.log('=' .repeat(50));

        this.testResults = [];
        this.passedTests = 0;
        this.failedTests = 0;

        // Core functionality tests
        await this.testBasicNmaxConversion();
        await this.testBasicObvsConversion();
        await this.testDataNormalization();
        await this.testTimestampParsing();
        await this.testTaxonSelection();

        // Edge case tests
        await this.testEdgeCases();
        await this.testQualityFiltering();
        await this.testValidationRules();

        // Performance tests
        await this.testPerformance();

        // Integration tests
        await this.testEndToEndWorkflow();

        this.printSummary();
        return this.getResults();
    }

    /**
     * Test basic _raw to _nmax conversion
     */
    async testBasicNmaxConversion() {
        try {
            console.log('Testing basic _raw to _nmax conversion...');

            const testData = this.generateBasicTestData();
            const result = await this.converter.convertRawToNmax(testData);

            this.assert(result.success, 'Conversion should succeed');
            this.assert(result.data.length > 0, 'Should produce output data');
            this.assert(result.data[0]['Date'], 'Should have Date column');
            this.assert(result.data[0]['Total Observations'] >= 0, 'Should have valid Total Observations');

            // Verify cumulative observations are monotonic
            for (let i = 1; i < result.data.length; i++) {
                this.assert(
                    result.data[i]['Cumulative Observations'] >= result.data[i-1]['Cumulative Observations'],
                    'Cumulative Observations should be monotonic'
                );
            }

            this.pass('Basic _nmax conversion test');

        } catch (error) {
            this.fail('Basic _nmax conversion test', error.message);
        }
    }

    /**
     * Test basic _raw to _obvs conversion
     */
    async testBasicObvsConversion() {
        try {
            console.log('Testing basic _raw to _obvs conversion...');

            const testData = this.generateBasicTestData();
            const result = await this.converter.convertRawToObvs(testData);

            this.assert(result.success, 'Conversion should succeed');
            this.assert(result.data.length > 0, 'Should produce output data');
            this.assert(result.data[0]['Date'], 'Should have Date column');
            this.assert(result.data[0]['Total Observations'] >= 0, 'Should have valid Total Observations');

            // Verify unique species count logic
            const firstRow = result.data[0];
            const speciesColumns = Object.keys(firstRow).filter(col =>
                !['Date', 'Total Observations', 'Unique Organisms Observed Today',
                  'New Unique Organisms Today', 'Cumulative Unique Species'].includes(col)
            );

            const activeSpecies = speciesColumns.filter(col => firstRow[col] > 0).length;
            this.assert(
                firstRow['Unique Organisms Observed Today'] === activeSpecies,
                'Unique organisms count should match active species'
            );

            this.pass('Basic _obvs conversion test');

        } catch (error) {
            this.fail('Basic _obvs conversion test', error.message);
        }
    }

    /**
     * Test data normalization functions
     */
    async testDataNormalization() {
        try {
            console.log('Testing data normalization...');

            // Test text normalization
            const normalizedText = this.converter.normalizeText('  Test\\xa0Text  \\xa0 ');
            this.assert(normalizedText === 'Test Text', 'Should normalize NBSP and whitespace');

            // Test quantity parsing
            this.assert(this.converter.parseQuantity('5') === 5, 'Should parse valid number');
            this.assert(this.converter.parseQuantity('-5') === 0, 'Should convert negative to 0');
            this.assert(this.converter.parseQuantity('invalid') === 0, 'Should handle invalid input');

            this.pass('Data normalization test');

        } catch (error) {
            this.fail('Data normalization test', error.message);
        }
    }

    /**
     * Test timestamp parsing functionality
     */
    async testTimestampParsing() {
        try {
            console.log('Testing timestamp parsing...');

            // Test valid timestamp
            const validTime = this.converter.parseTimestamp('2024-03-01 10:30:45');
            this.assert(validTime instanceof Date, 'Should parse valid timestamp');

            // Test invalid timestamp
            const invalidTime = this.converter.parseTimestamp('invalid-date');
            this.assert(invalidTime === null, 'Should return null for invalid timestamp');

            this.pass('Timestamp parsing test');

        } catch (error) {
            this.fail('Timestamp parsing test', error.message);
        }
    }

    /**
     * Test taxon selection logic
     */
    async testTaxonSelection() {
        try {
            console.log('Testing taxon selection...');

            // Test scientific name priority
            const row1 = {
                'Lowest Order Scientific Name': 'Gadus morhua',
                'Common Name': 'Cod'
            };
            this.assert(
                this.converter.chooseTaxonLabel(row1) === 'Gadus morhua',
                'Should prefer scientific name'
            );

            // Test common name fallback
            const row2 = {
                'Lowest Order Scientific Name': '',
                'Common Name': 'Cod'
            };
            this.assert(
                this.converter.chooseTaxonLabel(row2) === 'Cod',
                'Should use common name if scientific name empty'
            );

            // Test no valid identifier
            const row3 = {
                'Lowest Order Scientific Name': '',
                'Common Name': ''
            };
            this.assert(
                this.converter.chooseTaxonLabel(row3) === null,
                'Should return null if no valid identifier'
            );

            this.pass('Taxon selection test');

        } catch (error) {
            this.fail('Taxon selection test', error.message);
        }
    }

    /**
     * Test edge cases and error handling
     */
    async testEdgeCases() {
        try {
            console.log('Testing edge cases...');

            // Test empty data
            try {
                await this.converter.convertRawToNmax('');
                this.fail('Edge cases test', 'Should reject empty data');
            } catch (error) {
                // Expected to fail
            }

            // Test single row data
            const singleRowData = this.generateSingleRowTestData();
            const result = await this.converter.convertRawToNmax(singleRowData);
            this.assert(result.success, 'Should handle single row data');

            // Test duplicate dates
            const duplicateData = this.generateDuplicateDateTestData();
            const duplicateResult = await this.converter.convertRawToNmax(duplicateData);
            this.assert(duplicateResult.success, 'Should handle duplicate dates by aggregation');

            this.pass('Edge cases test');

        } catch (error) {
            this.fail('Edge cases test', error.message);
        }
    }

    /**
     * Test quality filtering functionality
     */
    async testQualityFiltering() {
        try {
            console.log('Testing quality filtering...');

            const testData = this.generateQualityTestData();

            // Test minimum confidence filter
            const confidenceResult = await this.converter.convertRawToNmax(testData, {
                minConfidence: 4
            });
            this.assert(confidenceResult.success, 'Should apply confidence filter');

            // Test minimum quality filter
            const qualityResult = await this.converter.convertRawToNmax(testData, {
                minQuality: 4
            });
            this.assert(qualityResult.success, 'Should apply quality filter');

            // Test combined filters
            const combinedResult = await this.converter.convertRawToNmax(testData, {
                minConfidence: 4,
                minQuality: 4
            });
            this.assert(combinedResult.success, 'Should apply combined filters');

            this.pass('Quality filtering test');

        } catch (error) {
            this.fail('Quality filtering test', error.message);
        }
    }

    /**
     * Test validation rules
     */
    async testValidationRules() {
        try {
            console.log('Testing validation rules...');

            // Test with valid data
            const validData = this.generateValidTestData();
            const validResult = await this.converter.convertRawToNmax(validData);
            this.assert(validResult.success, 'Should pass validation with valid data');

            // Create manually crafted invalid data for validation testing
            const invalidData = [
                { Date: '2024-03-01', 'Total Observations': -1, 'Species A': 1 }
            ];

            try {
                this.converter.validateNmaxOutput(invalidData);
                this.fail('Validation rules test', 'Should reject negative values');
            } catch (error) {
                // Expected to fail validation
            }

            this.pass('Validation rules test');

        } catch (error) {
            this.fail('Validation rules test', error.message);
        }
    }

    /**
     * Test performance with larger datasets
     */
    async testPerformance() {
        try {
            console.log('Testing performance...');

            const startTime = performance.now();
            const largeData = this.generateLargeTestData(1000); // 1000 rows
            const result = await this.converter.convertRawToNmax(largeData);
            const endTime = performance.now();

            const processingTime = endTime - startTime;

            this.assert(result.success, 'Should handle large dataset');
            this.assert(processingTime < 5000, 'Should complete within 5 seconds'); // 5 second limit

            console.log(`  ⏱️  Processed 1000 rows in ${processingTime.toFixed(2)}ms`);

            this.pass('Performance test');

        } catch (error) {
            this.fail('Performance test', error.message);
        }
    }

    /**
     * Test end-to-end workflow
     */
    async testEndToEndWorkflow() {
        try {
            console.log('Testing end-to-end workflow...');

            // Load sample test data
            const testData = this.generateBasicTestData();

            // Test _nmax conversion
            const nmaxResult = await this.converter.convertRawToNmax(testData);
            this.assert(nmaxResult.success, '_nmax conversion should succeed');

            // Test _obvs conversion
            const obvsResult = await this.converter.convertRawToObvs(testData);
            this.assert(obvsResult.success, '_obvs conversion should succeed');

            // Test CSV output generation
            const nmaxCSV = this.converter.dataToCSV(nmaxResult.data);
            this.assert(nmaxCSV.length > 0, 'Should generate CSV output');
            this.assert(nmaxCSV.includes('Date'), 'CSV should contain headers');

            this.pass('End-to-end workflow test');

        } catch (error) {
            this.fail('End-to-end workflow test', error.message);
        }
    }

    // Test Data Generators

    generateBasicTestData() {
        return `File Name,Timestamps (HH:MM:SS),Adjusted Date and Time,Event Observation,Quantity (Nmax),Common Name,Lowest Order Scientific Name,Confidence Level,Quality of Video
SUBCAM_Test_01.mp4,08:15:23,2024-03-01 08:15:23,Test observation 1,5,Test Species A,Testus speciesus,5,5
SUBCAM_Test_01.mp4,09:30:45,2024-03-01 09:30:45,Test observation 2,3,Test Species B,Testus speciesb,4,4
SUBCAM_Test_02.mp4,10:45:12,2024-03-02 10:45:12,Test observation 3,7,Test Species A,Testus speciesus,5,5
SUBCAM_Test_02.mp4,11:22:33,2024-03-02 11:22:33,Test observation 4,2,Test Species C,Testus speciesc,3,3`;
    }

    generateSingleRowTestData() {
        return `File Name,Timestamps (HH:MM:SS),Adjusted Date and Time,Event Observation,Quantity (Nmax),Common Name,Lowest Order Scientific Name
SINGLE_Test.mp4,12:00:00,2024-03-01 12:00:00,Single observation,1,Single Species,Singulus species`;
    }

    generateDuplicateDateTestData() {
        return `File Name,Timestamps (HH:MM:SS),Adjusted Date and Time,Event Observation,Quantity (Nmax),Common Name,Lowest Order Scientific Name
DUP_Test_A.mp4,08:00:00,2024-03-01 08:00:00,First observation,3,Test Species,Testus species
DUP_Test_B.mp4,16:00:00,2024-03-01 16:00:00,Second observation,5,Test Species,Testus species`;
    }

    generateQualityTestData() {
        return `File Name,Timestamps (HH:MM:SS),Adjusted Date and Time,Event Observation,Quantity (Nmax),Common Name,Confidence Level,Quality of Video
QUAL_Test_01.mp4,08:00:00,2024-03-01 08:00:00,High quality obs,5,High Quality Species,5,5
QUAL_Test_02.mp4,09:00:00,2024-03-01 09:00:00,Low confidence obs,3,Low Conf Species,2,5
QUAL_Test_03.mp4,10:00:00,2024-03-01 10:00:00,Low quality obs,4,Low Qual Species,5,2
QUAL_Test_04.mp4,11:00:00,2024-03-01 11:00:00,Both low obs,2,Both Low Species,2,2`;
    }

    generateValidTestData() {
        return `File Name,Timestamps (HH:MM:SS),Adjusted Date and Time,Event Observation,Quantity (Nmax),Common Name,Lowest Order Scientific Name
VALID_Test.mp4,12:00:00,2024-03-01 12:00:00,Valid observation,5,Valid Species,Validus species`;
    }

    generateLargeTestData(numRows) {
        const species = ['Species A', 'Species B', 'Species C', 'Species D', 'Species E'];
        const files = ['File_01.mp4', 'File_02.mp4', 'File_03.mp4'];

        let csv = 'File Name,Timestamps (HH:MM:SS),Adjusted Date and Time,Event Observation,Quantity (Nmax),Common Name,Lowest Order Scientific Name\n';

        for (let i = 0; i < numRows; i++) {
            const date = new Date(2024, 2, 1 + (i % 30)); // March 1-30, 2024
            const hour = 8 + (i % 10);
            const minute = i % 60;
            const file = files[i % files.length];
            const speciesName = species[i % species.length];
            const quantity = Math.floor(Math.random() * 20) + 1;

            const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

            csv += `${file},${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00,${timestamp},Large dataset observation ${i},${quantity},${speciesName},${speciesName.toLowerCase().replace(' ', '')}\n`;
        }

        return csv;
    }

    // Test Utilities

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    pass(testName) {
        console.log(`  ✅ ${testName} - PASSED`);
        this.testResults.push({ name: testName, status: 'PASSED' });
        this.passedTests++;
    }

    fail(testName, error) {
        console.log(`  ❌ ${testName} - FAILED: ${error}`);
        this.testResults.push({ name: testName, status: 'FAILED', error });
        this.failedTests++;
    }

    printSummary() {
        console.log('\n' + '=' .repeat(50));
        console.log('📊 TEST SUMMARY');
        console.log('=' .repeat(50));
        console.log(`Total Tests: ${this.passedTests + this.failedTests}`);
        console.log(`✅ Passed: ${this.passedTests}`);
        console.log(`❌ Failed: ${this.failedTests}`);
        console.log(`Success Rate: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(1)}%`);

        if (this.failedTests > 0) {
            console.log('\n🚨 FAILED TESTS:');
            this.testResults.filter(test => test.status === 'FAILED').forEach(test => {
                console.log(`  • ${test.name}: ${test.error}`);
            });
        }

        console.log('\n' + '=' .repeat(50));
    }

    getResults() {
        return {
            totalTests: this.passedTests + this.failedTests,
            passed: this.passedTests,
            failed: this.failedTests,
            successRate: (this.passedTests / (this.passedTests + this.failedTests)) * 100,
            results: this.testResults
        };
    }
}

// Automated test runner function
async function runConversionTests() {
    const testSuite = new ConversionTestSuite();
    return await testSuite.runAllTests();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConversionTestSuite, runConversionTests };
}