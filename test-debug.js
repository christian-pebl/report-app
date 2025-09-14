// Debug testing functionality
window.testBasicFunctions = function() {
    console.log("=== TESTING BASIC FUNCTIONS ===");
    console.log("csvManager exists:", !!window.csvManager);
    console.log("csvManager.fileInfos:", csvManager?.fileInfos?.size || 0);
    console.log("csvManager.workingDirFiles:", csvManager?.workingDirFiles?.length || 0);
    
    // Test file buttons
    const fileButtons = document.querySelectorAll('.btn-load, .btn-plot');
    console.log("Found file buttons:", fileButtons.length);
    
    // Test merge section
    const mergeSection = document.getElementById('mergeSection');
    console.log("Merge section visible:", mergeSection?.style.display !== 'none');
    
    return {
        csvManager: !!window.csvManager,
        fileInfos: csvManager?.fileInfos?.size || 0,
        workingFiles: csvManager?.workingDirFiles?.length || 0,
        buttons: fileButtons.length
    };
};

// Auto-run basic test after page loads
setTimeout(() => {
    console.log("[AUTO TEST] Running basic functionality test...");
    window.testBasicFunctions();
}, 3000);

console.log("[DEBUG] Test functionality loaded");
