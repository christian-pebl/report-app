// FPOD Complete Functionality Module
// Extracted from FPODreport 0.3 latest commit

// Add these methods to NavigationManager prototype
NavigationManager.prototype.generateFPODSiteComparison = async function(source, sites, outputDivId, isStandard = false) {
    console.log('=== FPOD SITE COMPARISON START ===');
    console.log('Source:', source);
    console.log('Sites:', sites);
    console.log('Is Standard:', isStandard);
    console.log('Output div ID:', outputDivId);

    const outputDiv = document.getElementById(outputDivId);
    if (!outputDiv) {
        console.error('Output div not found:', outputDivId);
        return;
    }

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating FPOD Plot...</h4>
            <p>Loading ${sites.join(', ')} data for ${source} analysis...</p>
        </div>
    `;

    try {
        // Load the CSV files for each selected site
        const fileType = isStandard ? '_std' : '_24hr';
        const siteData = await this.loadFPODFilesForSites(sites, source, fileType);

        console.log('Loaded site data:', siteData.length, 'files');

        if (siteData.length === 0) {
            throw new Error(`No ${fileType} files found for the selected sites`);
        }

        // Generate the plot
        this.createFPODSiteComparisonPlot(siteData, source, sites, outputDiv, fileType);

    } catch (error) {
        console.error('Error generating FPOD site comparison:', error);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
            </div>
        `;
    }
};

NavigationManager.prototype.generateFPODSourceComparison = async function(site, sources, outputDivId, isStandard = false) {
    console.log('=== FPOD SOURCE COMPARISON START ===');
    console.log('Site:', site);
    console.log('Sources:', sources);
    console.log('Is Standard:', isStandard);

    const outputDiv = document.getElementById(outputDivId);
    if (!outputDiv) {
        console.error('Output div not found:', outputDivId);
        return;
    }

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating FPOD Plot...</h4>
            <p>Loading ${site} data for ${sources.join(', ')} analysis...</p>
        </div>
    `;

    try {
        const fileType = isStandard ? '_std' : '_24hr';
        // Load the file for the selected site
        const fileData = await this.loadFPODFileForSite(site, fileType);

        if (!fileData) {
            throw new Error(`No ${fileType} file found for ${site}`);
        }

        // Generate the plot
        this.createFPODSourceComparisonPlot(fileData, sources, site, outputDiv, fileType);

    } catch (error) {
        console.error('Error generating FPOD source comparison:', error);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
            </div>
        `;
    }
};

// Data loading functions
NavigationManager.prototype.loadFPODFilesForSites = async function(selectedFilenames, source, fileType) {
    console.log('=== LOAD FPOD FILES FOR SITES ===');
    console.log('Selected filenames:', selectedFilenames);
    console.log('File type:', fileType);

    const siteData = [];
    const availableFiles = csvManager?.workingDirFiles || [];

    for (const filename of selectedFilenames) {
        console.log(`Looking for file: ${filename}`);

        // Find the file by exact filename match
        const file = availableFiles.find(f => f.name === filename);

        if (file) {
            try {
                console.log(`Parsing CSV file: ${file.name}`);
                const data = await this.parseFPODCSVFile(file);

                siteData.push({
                    site: filename,
                    file: file,
                    data: data,
                    source: source
                });
            } catch (error) {
                console.error(`Error loading file ${filename}:`, error);
            }
        } else {
            console.warn(`File not found: ${filename}`);
        }
    }

    console.log('Total site data loaded:', siteData.length);
    return siteData;
};

NavigationManager.prototype.loadFPODFileForSite = async function(filename, fileType) {
    console.log('=== LOAD FPOD FILE FOR SITE ===');
    console.log('Filename:', filename);
    console.log('File type:', fileType);

    const availableFiles = csvManager?.workingDirFiles || [];
    const file = availableFiles.find(f => f.name === filename);

    if (file) {
        try {
            const data = await this.parseFPODCSVFile(file);
            return {
                site: filename,
                file: file,
                data: data
            };
        } catch (error) {
            console.error(`Error loading file ${filename}:`, error);
            return null;
        }
    }

    console.warn(`File not found: ${filename}`);
    return null;
};

NavigationManager.prototype.parseFPODCSVFile = async function(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const lines = csvText.trim().split(/\r\n|\n/);
                const headers = lines[0].split(',').map(h => h.trim());
                const data = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim());
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    data.push(row);
                }

                resolve({ headers, data });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};

// Plot creation functions
NavigationManager.prototype.createFPODSiteComparisonPlot = function(siteData, source, sites, outputDiv, fileType) {
    console.log('=== CREATE FPOD SITE COMPARISON PLOT ===');

    try {
        // Create the plot container
        const plotContainer = document.createElement('div');
        plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.cssText = 'width: 100%; height: 100%;';
        plotContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Define professional colors
        const journalColors = [
            '#1f77b4', '#ff7f0e', '#d62728', '#2ca02c', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ];

        // Set up plot dimensions
        const plotArea = {
            left: 90, right: 700, top: 80, bottom: 320,
            width: 610, height: 240
        };

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Prepare data
        let allTimePoints = new Set();
        siteData.forEach(siteInfo => {
            const hourlyData = this.extractFPODHourlyData(siteInfo.data, source, fileType);
            Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
        });

        const sortedHours = Array.from(allTimePoints).sort((a, b) => {
            if (a.includes('_') && b.includes('_')) {
                return a.localeCompare(b);
            }
            return parseInt(a) - parseInt(b);
        });

        let maxDPM = 0;
        const plotData = siteData.map((siteInfo, index) => {
            const hourlyData = this.extractFPODHourlyData(siteInfo.data, source, fileType);
            const dpmValues = sortedHours.map(hour => hourlyData[hour] || 0);
            maxDPM = Math.max(maxDPM, ...dpmValues);

            return {
                site: this.extractSiteName(siteInfo.site),
                dpmValues: dpmValues,
                color: journalColors[index % journalColors.length]
            };
        });

        maxDPM = Math.ceil(maxDPM * 1.1);

        // Draw axes
        this.drawFPODAxes(ctx, plotArea, sortedHours, maxDPM, canvas);

        // Plot data for each site
        plotData.forEach(siteData => {
            this.plotFPODSiteData(ctx, plotArea, siteData, sortedHours, maxDPM);
        });

        // Draw legend
        this.drawFPODLegend(ctx, plotData, plotArea);

        // Update output div
        outputDiv.innerHTML = '';
        outputDiv.appendChild(plotContainer);

    } catch (error) {
        console.error('Error in createFPODSiteComparisonPlot:', error);
        throw error;
    }
};

NavigationManager.prototype.createFPODSourceComparisonPlot = function(fileData, sources, site, outputDiv, fileType) {
    console.log('=== CREATE FPOD SOURCE COMPARISON PLOT ===');

    try {
        // Create the plot container
        const plotContainer = document.createElement('div');
        plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.cssText = 'width: 100%; height: 100%;';
        plotContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Define professional colors
        const journalColors = [
            '#1f77b4', '#ff7f0e', '#d62728', '#2ca02c', '#9467bd'
        ];

        // Set up plot dimensions
        const plotArea = {
            left: 90, right: 700, top: 80, bottom: 320,
            width: 610, height: 240
        };

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Prepare data for all sources
        let allTimePoints = new Set();
        const sourceData = {};

        sources.forEach(source => {
            const hourlyData = this.extractFPODHourlyData(fileData.data, source, fileType);
            sourceData[source] = hourlyData;
            Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
        });

        const sortedHours = Array.from(allTimePoints).sort((a, b) => {
            if (a.includes('_') && b.includes('_')) {
                return a.localeCompare(b);
            }
            return parseInt(a) - parseInt(b);
        });

        let maxDPM = 0;
        const plotData = sources.map((source, index) => {
            const dpmValues = sortedHours.map(hour => sourceData[source][hour] || 0);
            maxDPM = Math.max(maxDPM, ...dpmValues);

            return {
                source: source,
                dpmValues: dpmValues,
                color: journalColors[index % journalColors.length]
            };
        });

        maxDPM = Math.ceil(maxDPM * 1.1);

        // Draw axes
        this.drawFPODAxes(ctx, plotArea, sortedHours, maxDPM, canvas);

        // Plot data for each source
        plotData.forEach(sourceInfo => {
            this.plotFPODSourceData(ctx, plotArea, sourceInfo, sortedHours, maxDPM);
        });

        // Draw legend for sources
        this.drawFPODSourceLegend(ctx, plotData, plotArea);

        // Update output div
        outputDiv.innerHTML = '';
        outputDiv.appendChild(plotContainer);

    } catch (error) {
        console.error('Error in createFPODSourceComparisonPlot:', error);
        throw error;
    }
};

// Helper functions for data extraction and plotting
NavigationManager.prototype.extractFPODHourlyData = function(csvData, source, fileType) {
    const hourlyData = {};

    csvData.data.forEach((row, index) => {
        // Look for hour/time column
        const hourKey = Object.keys(row).find(key =>
            key.toLowerCase().includes('hour') || key.toLowerCase().includes('time')
        );

        // Look for the source column
        const sourceKey = Object.keys(row).find(key =>
            key.toLowerCase().includes(source.toLowerCase())
        );

        if (hourKey && sourceKey && row[hourKey] && row[sourceKey] !== undefined) {
            let timeIdentifier = row[hourKey];

            // Handle different time formats
            if (typeof timeIdentifier === 'string' && timeIdentifier.includes('T')) {
                const dateObj = new Date(timeIdentifier);

                if (fileType === '_24hr') {
                    timeIdentifier = String(dateObj.getUTCHours()).padStart(2, '0');
                } else {
                    const dateStr = dateObj.toISOString().split('T')[0];
                    const hourStr = String(dateObj.getUTCHours()).padStart(2, '0');
                    timeIdentifier = `${dateStr}_${hourStr}`;
                }
            } else {
                timeIdentifier = String(timeIdentifier).padStart(2, '0');
            }

            const dpm = parseFloat(row[sourceKey]) || 0;
            hourlyData[timeIdentifier] = dpm;
        }
    });

    return hourlyData;
};

NavigationManager.prototype.extractSiteName = function(filename) {
    // Extract clean site name from filename
    return filename
        .replace(/_24hr\.csv$/i, '')
        .replace(/_std\.csv$/i, '')
        .replace(/\.csv$/i, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ');
};

NavigationManager.prototype.drawFPODAxes = function(ctx, plotArea, timePoints, maxDPM, canvas) {
    // Draw axes lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.top);
    ctx.lineTo(plotArea.left, plotArea.bottom);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.bottom);
    ctx.lineTo(plotArea.right, plotArea.bottom);
    ctx.stroke();

    // Y-axis labels (DPM)
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'right';

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const value = (maxDPM * i) / ySteps;
        const y = plotArea.bottom - (plotArea.height * i) / ySteps;

        ctx.fillText(Math.round(value), plotArea.left - 10, y + 4);

        // Grid lines
        if (i > 0) {
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(plotArea.left, y);
            ctx.lineTo(plotArea.right, y);
            ctx.stroke();
        }
    }

    // X-axis labels (Time)
    ctx.textAlign = 'center';
    const labelSpacing = Math.max(1, Math.floor(timePoints.length / 10));

    timePoints.forEach((time, index) => {
        if (index % labelSpacing === 0) {
            const x = plotArea.left + (index * plotArea.width) / (timePoints.length - 1);
            ctx.save();
            ctx.translate(x, plotArea.bottom + 15);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(time, 0, 0);
            ctx.restore();
        }
    });

    // Axis labels
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333333';

    // Y-axis label
    ctx.save();
    ctx.translate(25, plotArea.top + plotArea.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('DPM', 0, 0);
    ctx.restore();

    // X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Time', plotArea.left + plotArea.width / 2, plotArea.bottom + 60);
};

NavigationManager.prototype.plotFPODSiteData = function(ctx, plotArea, siteData, timePoints, maxDPM) {
    ctx.strokeStyle = siteData.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    siteData.dpmValues.forEach((value, index) => {
        const x = plotArea.left + (index * plotArea.width) / (timePoints.length - 1);
        const y = plotArea.bottom - (value * plotArea.height) / maxDPM;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
};

NavigationManager.prototype.plotFPODSourceData = function(ctx, plotArea, sourceInfo, timePoints, maxDPM) {
    ctx.strokeStyle = sourceInfo.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    sourceInfo.dpmValues.forEach((value, index) => {
        const x = plotArea.left + (index * plotArea.width) / (timePoints.length - 1);
        const y = plotArea.bottom - (value * plotArea.height) / maxDPM;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
};

NavigationManager.prototype.drawFPODLegend = function(ctx, plotData, plotArea) {
    const legendX = plotArea.right - 150;
    const legendY = plotArea.top;

    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    plotData.forEach((item, index) => {
        const y = legendY + index * 20;

        // Color box
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, y - 8, 15, 15);

        // Label
        ctx.fillStyle = '#333333';
        ctx.fillText(item.site, legendX + 20, y);
    });
};

NavigationManager.prototype.drawFPODSourceLegend = function(ctx, plotData, plotArea) {
    const legendX = plotArea.right - 150;
    const legendY = plotArea.top;

    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    plotData.forEach((item, index) => {
        const y = legendY + index * 20;

        // Color box
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, y - 8, 15, 15);

        // Label
        ctx.fillStyle = '#333333';
        ctx.fillText(item.source, legendX + 20, y);
    });
};