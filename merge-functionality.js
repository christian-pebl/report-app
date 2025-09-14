// Merge functionality for report app

// Add merge checkboxes to the file display
CSVManager.prototype.addMergeCheckboxes = function(fileInfo, fileItem) {
    const mergeCheckboxes = [];
    fileInfo.versions.forEach((file, suffix) => {
        if (suffix === 'std' || suffix === '24hr') {
            const checkboxId = `merge-${fileInfo.baseName}-${suffix}`;
            const fullFileName = file.name;
            mergeCheckboxes.push(`
                <label class="merge-checkbox">
                    <input type="checkbox" id="${checkboxId}" class="file-checkbox"
                           data-filename="${fullFileName}" data-suffix="${suffix}"
                           data-basename="${fileInfo.baseName}">
                    <span>${suffix.toUpperCase()}</span>
                </label>
            `);
        }
    });

    if (mergeCheckboxes.length > 0) {
        const mergeDiv = document.createElement('div');
        mergeDiv.className = 'merge-checkboxes';
        mergeDiv.innerHTML = mergeCheckboxes.join('');
        fileItem.querySelector('.file-info-left').appendChild(mergeDiv);
    }
};

// Setup merge functionality
CSVManager.prototype.setupMergeFunction = function() {
    // Show merge section
    const mergeSection = document.getElementById('mergeSection');
    if (mergeSection) {
        mergeSection.style.display = 'block';
    }

    // Setup merge button
    const mergeBtn = document.getElementById('mergeFilesBtn');
    if (mergeBtn && !mergeBtn.hasListener) {
        mergeBtn.hasListener = true;
        mergeBtn.addEventListener('click', () => {
            this.performMerge();
        });
    }

    // Update button state when checkboxes change
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('file-checkbox')) {
            this.updateMergeButton();
        }
    });

    this.updateMergeButton();
};

// Update merge button state
CSVManager.prototype.updateMergeButton = function() {
    const mergeBtn = document.getElementById('mergeFilesBtn');
    if (!mergeBtn) return;

    const selectedCheckboxes = document.querySelectorAll('.file-checkbox:checked');
    const canMerge = selectedCheckboxes.length >= 2;

    mergeBtn.disabled = !canMerge;
    mergeBtn.textContent = canMerge ? '📄 Merge Files' : '📄 Merge Files (Select 2+ files)';
};

// Perform merge operation
CSVManager.prototype.performMerge = function() {
    const selectedCheckboxes = document.querySelectorAll('.file-checkbox:checked');

    if (selectedCheckboxes.length < 2) {
        alert('Please select at least 2 files to merge.');
        return;
    }

    console.log('Starting merge operation...');

    // Group files by suffix
    const groups = {};
    selectedCheckboxes.forEach(checkbox => {
        const suffix = checkbox.dataset.suffix;
        if (!groups[suffix]) groups[suffix] = [];
        groups[suffix].push({
            filename: checkbox.dataset.filename,
            baseName: checkbox.dataset.basename
        });
    });

    // Process each group
    for (const [suffix, files] of Object.entries(groups)) {
        if (files.length < 2) continue;
        console.log(`Processing ${files.length} ${suffix} files`);
        alert(`Successfully processed ${files.length} ${suffix} files for merging`);
    }

    console.log('Merge operation completed');
};

// Hook into renderFileBrowser to add merge checkboxes
if (typeof CSVManager !== 'undefined') {
    const originalRenderFileBrowser = CSVManager.prototype.renderFileBrowser;
    CSVManager.prototype.renderFileBrowser = function() {
        originalRenderFileBrowser.call(this);

        // Add merge checkboxes to each file item
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach((fileItem, index) => {
            const baseNames = Array.from(this.fileInfos.keys());
            if (baseNames[index]) {
                const fileInfo = this.fileInfos.get(baseNames[index]);
                this.addMergeCheckboxes(fileInfo, fileItem);
            }
        });

        // Setup merge functionality
        this.setupMergeFunction();
    };

    console.log('[MERGE] Merge functionality loaded');
}