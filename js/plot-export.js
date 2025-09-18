// Plot Export System for SUBCAMreport
// Target: Chrome only, Plot 1 canvas only

console.log('🚀 PLOT EXPORT SCRIPT LOADED!');
alert('Plot export script is loading!');

class Plot1Exporter {
    constructor() {
        this.targetCanvasId = 'plotCanvas';
        console.log('Plot1Exporter: Initializing...');
        this.init();
    }

    init() {
        console.log('Plot1Exporter: Document ready state:', document.readyState);
        // Wait for DOM and canvas to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }

        // Also try after a delay to catch dynamically created canvases
        setTimeout(() => this.setup(), 1000);
        setTimeout(() => this.setup(), 3000);
    }

    setup() {
        console.log('Plot1Exporter: Setting up...');
        // Only add button if Plot 1 canvas exists
        const canvas = document.getElementById(this.targetCanvasId);
        console.log('Plot1Exporter: Canvas found:', !!canvas);
        if (canvas) {
            console.log('Plot1Exporter: Canvas element:', canvas);
            console.log('Plot1Exporter: Canvas parent:', canvas.parentElement);
            this.addExportButton();
        } else {
            console.log('Plot1Exporter: No canvas with ID', this.targetCanvasId);
        }
    }

    addExportButton() {
        console.log('Plot1Exporter: Adding export button...');
        // Find parent container of plotCanvas
        const canvas = document.getElementById(this.targetCanvasId);
        const container = canvas.closest('.plot-section') || canvas.parentElement;
        console.log('Plot1Exporter: Container found:', container);

        // Check if button already exists
        if (container.querySelector('.plot-export-btn')) {
            console.log('Plot1Exporter: Button already exists');
            return;
        }

        // Create export button matching existing style
        const btn = document.createElement('button');
        btn.className = 'plot-export-btn btn-secondary';
        btn.innerHTML = '📥 Export';
        btn.onclick = () => this.showExportModal();

        // Position in top-right of plot area
        btn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            font-size: 14px;
            padding: 6px 12px;
            border: 1px solid #ddd;
            background: white;
            cursor: pointer;
        `;

        // Make container relative if not already
        const currentPosition = getComputedStyle(container).position;
        console.log('Plot1Exporter: Container position:', currentPosition);
        if (currentPosition === 'static') {
            container.style.position = 'relative';
        }

        container.appendChild(btn);
        console.log('Plot1Exporter: Button added successfully!', btn);
    }

    showExportModal() {
        // Remove existing modal if any
        const existing = document.getElementById('plotExportModal');
        if (existing) existing.remove();

        // Create modal using existing modal structure
        const modal = this.createModal();
        document.body.appendChild(modal);

        // Show modal (remove hidden class after DOM insert)
        setTimeout(() => modal.classList.remove('hidden'), 10);
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'plotExportModal';
        modal.className = 'modal'; // Using existing modal class

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Export Plot</h2>
                    <p>Choose export option for your plot</p>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <button class="btn-primary export-option" onclick="plot1Exporter.copyToClipboard()">
                            📋 Copy to Clipboard
                            <small style="display: block; font-weight: normal; margin-top: 4px; opacity: 0.8;">
                                Quick paste into documents
                            </small>
                        </button>
                        <button class="btn-primary export-option" onclick="plot1Exporter.saveHighDPI()" style="margin-top: 12px;">
                            💾 Save High Quality (300 DPI)
                            <small style="display: block; font-weight: normal; margin-top: 4px; opacity: 0.8;">
                                For reports & publications
                            </small>
                        </button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="plot1Exporter.closeModal()">Cancel</button>
                </div>
            </div>
        `;

        return modal;
    }

    async copyToClipboard() {
        const canvas = document.getElementById(this.targetCanvasId);
        if (!canvas) return;

        try {
            // Chrome optimized - use Clipboard API
            const blob = await new Promise(resolve =>
                canvas.toBlob(resolve, 'image/png', 1.0)
            );

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            this.showSuccess('✅ Copied to clipboard!');
            this.closeModal();
        } catch (err) {
            console.error('Copy failed:', err);
            this.showError('Failed to copy to clipboard');
        }
    }

    saveHighDPI() {
        const canvas = document.getElementById(this.targetCanvasId);
        if (!canvas) return;

        // Get current dimensions
        const rect = canvas.getBoundingClientRect();
        const scale = 300 / 96; // 300 DPI scaling

        // Create high-res canvas
        const hdCanvas = document.createElement('canvas');
        hdCanvas.width = rect.width * scale;
        hdCanvas.height = rect.height * scale;

        const hdCtx = hdCanvas.getContext('2d');
        hdCtx.imageSmoothingEnabled = true;
        hdCtx.imageSmoothingQuality = 'high';

        // Scale and render
        hdCtx.scale(scale, scale);
        hdCtx.fillStyle = 'white';
        hdCtx.fillRect(0, 0, rect.width, rect.height);
        hdCtx.drawImage(canvas, 0, 0, rect.width, rect.height);

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `subcam_plot_300dpi_${timestamp}.png`;

        // Download
        hdCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess(`✅ Saved as ${filename}`);
            this.closeModal();
        }, 'image/png', 1.0);
    }

    showSuccess(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showError(message) {
        alert(message); // Simple fallback for errors
    }

    closeModal() {
        const modal = document.getElementById('plotExportModal');
        if (modal) modal.remove();
    }
}

// Initialize when script loads
const plot1Exporter = new Plot1Exporter();