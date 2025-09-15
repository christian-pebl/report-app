/**
 * Test script for enhanced logging system
 * Tests the raw to NMAX conversion with detailed progress tracking
 */

// Import our modules (for browser testing)
console.log('🧪 Testing Enhanced Raw to NMAX Conversion Logging System');
console.log('===============================================================');

async function testEnhancedLogging() {
    try {
        console.log('⏱️ Test started at:', new Date().toISOString());

        // Create test converter
        const converter = new SUBCAMConverter();

        // Set up progress tracking
        let progressUpdates = [];
        let logEntries = [];

        converter.logger.setProgressCallback((update) => {
            if (update.type === 'log') {
                logEntries.push(update.entry);
                console.log(`[${update.entry.level}] S${update.entry.step || 0}: ${update.entry.message}`);
            } else {
                progressUpdates.push(update);
                console.log(`📊 Progress: ${update.progress}% - ${update.stepName} (${(update.elapsed/1000).toFixed(1)}s)`);
            }
        });

        // Read test data
        console.log('📁 Loading test raw file...');
        const response = await fetch('./test-data/test_raw.csv');
        const csvText = await response.text();

        console.log('📋 Raw file loaded, size:', csvText.length, 'characters');

        // Perform conversion
        console.log('🚀 Starting conversion...');
        const startTime = Date.now();

        const result = await converter.convertRawToNmax(csvText);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Test Results
        console.log('');
        console.log('🎯 TEST RESULTS');
        console.log('===============');
        console.log('✅ Conversion successful:', result.success);
        console.log('⏱️ Total processing time:', totalTime + 'ms');
        console.log('📊 Progress updates received:', progressUpdates.length);
        console.log('📝 Log entries created:', logEntries.length);
        console.log('');

        if (result.success) {
            console.log('📈 CONVERSION METADATA:');
            console.log('  - Input rows:', result.metadata.inputRows);
            console.log('  - Output rows:', result.metadata.outputRows);
            console.log('  - Format compliance:', result.validation.formatCompliance + '%');
            console.log('  - Processing steps:', result.metadata.conversionSteps);
            console.log('');

            console.log('🔍 VALIDATION SUMMARY:');
            console.log('  - Columns validated:', result.validation.columnValidation.length);
            console.log('  - Rows sampled:', result.validation.dataValidation.length);
            console.log('  - Recommendations:', result.validation.recommendations.length);

            if (result.validation.recommendations.length > 0) {
                console.log('');
                console.log('💡 RECOMMENDATIONS:');
                result.validation.recommendations.forEach((rec, i) => {
                    console.log(`  ${i + 1}. ${rec}`);
                });
            }

            console.log('');
            console.log('📋 COLUMN VALIDATION:');
            let passedColumns = 0;
            result.validation.columnValidation.forEach(col => {
                if (col.present && !col.note) passedColumns++;
                const status = col.present && !col.note ? '✅' : col.note ? '⚠️' : '❌';
                console.log(`  ${status} ${col.column}`);
            });
            console.log(`  Summary: ${passedColumns}/${result.validation.columnValidation.length} columns validated`);

            console.log('');
            console.log('🔄 PROCESSING STEPS:');
            const stepGroups = {};
            logEntries.forEach(entry => {
                if (entry.step) {
                    if (!stepGroups[entry.step]) stepGroups[entry.step] = [];
                    stepGroups[entry.step].push(entry);
                }
            });

            Object.keys(stepGroups).forEach(step => {
                const entries = stepGroups[step];
                console.log(`  Step ${step}: ${entries[0].stepName} (${entries.length} log entries)`);
                entries.forEach(entry => {
                    const elapsed = (entry.elapsed / 1000).toFixed(2);
                    console.log(`    [${elapsed}s] ${entry.message}`);
                });
            });
        } else {
            console.log('❌ CONVERSION FAILED:');
            console.log('  Error:', result.error);
        }

        console.log('');
        console.log('🎉 Test completed successfully!');
        return result;

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        throw error;
    }
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.testEnhancedLogging = testEnhancedLogging;
    console.log('🌐 Test function available as window.testEnhancedLogging()');
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testEnhancedLogging };
}