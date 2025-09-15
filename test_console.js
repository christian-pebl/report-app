/**
 * Console-based test for the enhanced logging system
 * Run with: node test_console.js
 */

const fs = require('fs');
const path = require('path');

// Mock browser globals for Node.js
global.Date = Date;
global.console = console;

// Load our modules
eval(fs.readFileSync(path.join(__dirname, 'js', 'conversion-engine.js'), 'utf8'));

async function runConsoleTest() {
    console.log('🧪 Enhanced Raw to NMAX Conversion Test (Node.js)');
    console.log('==================================================');

    try {
        // Load test data
        const testDataPath = path.join(__dirname, 'test-data', 'test_raw.csv');

        if (!fs.existsSync(testDataPath)) {
            console.log('❌ Test data not found at:', testDataPath);
            console.log('💡 Trying sample data instead...');

            const sampleDataPath = path.join(__dirname, 'test-data', 'sample_raw_data.csv');
            if (fs.existsSync(sampleDataPath)) {
                testDataPath = sampleDataPath;
                console.log('✅ Using sample data from:', sampleDataPath);
            } else {
                throw new Error('No test data available');
            }
        }

        const csvText = fs.readFileSync(testDataPath, 'utf8');
        console.log('📁 Test data loaded:', csvText.length, 'characters');

        // Create converter
        const converter = new SUBCAMConverter();

        // Track progress
        let progressUpdates = 0;
        let logEntries = 0;

        converter.logger.setProgressCallback((update) => {
            if (update.type === 'log') {
                logEntries++;
                const elapsed = (update.entry.elapsed / 1000).toFixed(2);
                console.log(`[${elapsed}s] [${update.entry.level}] S${update.entry.step || 0}: ${update.entry.message}`);
            } else {
                progressUpdates++;
                const elapsed = (update.elapsed / 1000).toFixed(2);
                console.log(`📊 [${elapsed}s] ${update.progress}% - ${update.stepName}`);
            }
        });

        // Run conversion
        console.log('🚀 Starting conversion...');
        const startTime = Date.now();

        const result = await converter.convertRawToNmax(csvText);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Display results
        console.log('');
        console.log('🎯 TEST RESULTS SUMMARY');
        console.log('========================');
        console.log('✅ Success:', result.success);
        console.log('⏱️ Total time:', totalTime + 'ms');
        console.log('📊 Progress updates:', progressUpdates);
        console.log('📝 Log entries:', logEntries);

        if (result.success) {
            console.log('');
            console.log('📈 CONVERSION METADATA:');
            console.log('  Input rows:', result.metadata.inputRows);
            console.log('  Output rows:', result.metadata.outputRows);
            console.log('  Processing time:', result.metadata.processingTime + 'ms');
            console.log('  Conversion steps:', result.metadata.conversionSteps);

            console.log('');
            console.log('🔍 FORMAT VALIDATION:');
            console.log('  Compliance score:', result.validation.formatCompliance + '%');
            console.log('  Columns validated:', result.validation.columnValidation.length);
            console.log('  Rows sampled:', result.validation.dataValidation.length);

            if (result.validation.recommendations.length > 0) {
                console.log('');
                console.log('💡 RECOMMENDATIONS:');
                result.validation.recommendations.forEach((rec, i) => {
                    console.log(`  ${i + 1}. ${rec}`);
                });
            }

            console.log('');
            console.log('📊 COLUMN VALIDATION DETAILS:');
            let passed = 0, warned = 0, failed = 0;

            result.validation.columnValidation.forEach(col => {
                if (col.present && !col.note) {
                    passed++;
                    console.log(`  ✅ ${col.column}`);
                } else if (col.note) {
                    warned++;
                    console.log(`  ⚠️  ${col.column} (${col.note})`);
                } else {
                    failed++;
                    console.log(`  ❌ ${col.column}`);
                }
            });

            console.log(`  Summary: ${passed} passed, ${warned} warnings, ${failed} failed`);

            console.log('');
            console.log('🔄 STEP PERFORMANCE:');
            const stepTimes = {};
            let lastTime = converter.logger.startTime;

            converter.logger.logs.forEach(entry => {
                if (entry.step && entry.level === 'SUCCESS') {
                    const stepTime = entry.elapsed - (stepTimes[entry.step - 1] || 0);
                    stepTimes[entry.step] = entry.elapsed;
                    console.log(`  Step ${entry.step}: ${entry.stepName} (${stepTime}ms)`);
                }
            });

            // Save results to file
            const outputPath = path.join(__dirname, 'test_results.json');
            fs.writeFileSync(outputPath, JSON.stringify({
                testTimestamp: new Date().toISOString(),
                totalTime: totalTime,
                progressUpdates: progressUpdates,
                logEntries: logEntries,
                result: result
            }, null, 2));

            console.log('');
            console.log('💾 Results saved to:', outputPath);

        } else {
            console.log('');
            console.log('❌ CONVERSION FAILED:');
            console.log('  Error:', result.error);

            if (result.logs) {
                console.log('');
                console.log('📝 ERROR LOGS:');
                result.logs.forEach(log => {
                    if (log.level === 'ERROR') {
                        console.log(`  ${log.message}`);
                    }
                });
            }
        }

        console.log('');
        console.log('🎉 Console test completed!');
        return result;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    runConsoleTest().catch(console.error);
}

module.exports = { runConsoleTest };