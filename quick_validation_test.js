// Quick browser-based validation test
// Open test_enhanced_logging.html and run this in the browser console

console.log('🔍 Quick Format Validation Test');
console.log('===============================');

// Test our validation logic directly
async function quickValidationTest() {
    try {
        // Load test data
        const response = await fetch('./test-data/test_raw.csv');
        const csvText = await response.text();

        console.log('📁 Test data loaded:', csvText.length, 'characters');

        // Parse CSV manually to test validation
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        console.log('📋 Headers found:', headers.length);
        console.log('📋 Headers list:');
        headers.forEach((header, i) => {
            console.log(`  ${i + 1}. "${header}"`);
        });

        // Create a simple data sample
        const sampleRows = [];
        for (let i = 1; i <= 5 && i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            sampleRows.push(row);
        }

        console.log('📊 Sample data created:', sampleRows.length, 'rows');

        // Create logger and test validation
        const logger = new ConversionLogger();
        const validation = logger.validateRawFileFormat(headers, sampleRows);

        console.log('');
        console.log('🎯 VALIDATION RESULTS:');
        console.log('======================');
        console.log('✅ Compliance Score:', validation.formatCompliance + '%');
        console.log('📋 Columns Validated:', validation.columnValidation.length);
        console.log('📊 Data Rows Validated:', validation.dataValidation.length);

        console.log('');
        console.log('📋 COLUMN VALIDATION:');
        validation.columnValidation.forEach(col => {
            const status = col.present && !col.note ? '✅' : col.note ? '⚠️' : '❌';
            console.log(`  ${status} ${col.column}${col.note ? ` (${col.note})` : ''}`);
        });

        console.log('');
        console.log('📊 DATA VALIDATION:');
        validation.dataValidation.forEach(row => {
            const status = row.status;
            const issues = row.issues.length > 0 ? ` - Issues: ${row.issues.join(', ')}` : '';
            console.log(`  ${status} Row ${row.row}${issues}`);
        });

        if (validation.recommendations.length > 0) {
            console.log('');
            console.log('💡 RECOMMENDATIONS:');
            validation.recommendations.forEach((rec, i) => {
                console.log(`  ${i + 1}. ${rec}`);
            });
        }

        console.log('');
        console.log('🎉 Quick validation test completed!');

        return validation;

    } catch (error) {
        console.error('❌ Validation test failed:', error);
        throw error;
    }
}

// Auto-run if ConversionLogger is available
if (typeof ConversionLogger !== 'undefined') {
    quickValidationTest().then(result => {
        console.log('✅ Quick test passed!');
        window.quickValidationResult = result;
    }).catch(console.error);
} else {
    console.log('⚠️ ConversionLogger not available. Load conversion-engine.js first.');
}