// FPOD Plot Functions - Exact implementation from FPODreport 0.3
// These extend NavigationManager with FPOD-specific plotting capabilities

// Site comparison for 24hr files
NavigationManager.prototype.generateSiteComparison = async function(source, sites) {
    console.log('=== GENERATE SITE COMPARISON START ===');
    console.log('Source:', source);
    console.log('Sites:', sites);
    console.log('Available files:', this.availableFiles?.length || 0);
    console.log('Available files list:', this.availableFiles?.map(f => f.name) || []);

    const outputDiv = document.getElementById('siteComparisonOutput');
    if (!outputDiv) {
        console.error('Output div not found');
        return;
    }

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Plot...</h4>
            <p>Loading ${sites.join(', ')} data for ${source} analysis...</p>
            <p style="font-size: 0.8rem; margin-top: 10px;">Debug: Found ${this.availableFiles?.length || 0} files</p>
        </div>
    `;

    try {
        console.log('Starting to load 24hr files...');
        // Load the 24hr CSV files for each selected site
        const siteData = await this.load24hrFilesForSites(sites, source);

        console.log('Loaded site data:', siteData.length, 'files');
        siteData.forEach((data, i) => {
            console.log(`Site ${i + 1}:`, data.site, 'File:', data.file?.name);
        });

        if (siteData.length === 0) {
            throw new Error('No _24hr files found for the selected sites');
        }

        console.log('Creating plot...');
        // Generate the plot
        this.createSiteComparisonPlot(siteData, source, sites, outputDiv);
        console.log('Plot creation completed');

    } catch (error) {
        console.error('Error generating site comparison plot:', error);
        console.error('Error stack:', error.stack);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.85rem;">
                    Make sure the corresponding _24hr files exist for: ${sites.join(', ')}
                </p>
                <p style="margin-top: 10px; font-size: 0.75rem; font-family: monospace;">
                    Debug: Available files: ${this.availableFiles?.map(f => f.name).join(', ') || 'None'}
                </p>
            </div>
        `;
    }
};

// Site comparison for std files
NavigationManager.prototype.generateStdSiteComparison = async function(source, sites) {
    console.log('=== GENERATE STD SITE COMPARISON START ===');
    console.log('Source:', source);
    console.log('Sites:', sites);

    const outputDiv = document.getElementById('siteComparisonStdOutput');
    if (!outputDiv) {
        console.error('Output div not found');
        return;
    }

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Standard DPM Plot...</h4>
            <p>Loading ${sites.join(', ')} data for ${source} analysis...</p>
        </div>
    `;

    try {
        // Load the std CSV files for each selected site
        const siteData = await this.loadStdFilesForSites(sites, source);

        if (siteData.length === 0) {
            throw new Error('No _std files found for the selected sites');
        }

        // Generate the plot
        this.createStdSiteComparisonPlot(siteData, source, sites, outputDiv);

    } catch (error) {
        console.error('Error generating std site comparison plot:', error);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.85rem;">
                    Make sure the corresponding _std files exist for: ${sites.join(', ')}
                </p>
            </div>
        `;
    }
};

// Source comparison for 24hr files
NavigationManager.prototype.generateSourceComparison = async function(site, sources) {
    const outputDiv = document.getElementById('sourceComparisonOutput');
    if (!outputDiv) return;

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Plot...</h4>
            <p>Loading ${sources.join(', ')} data for ${site} analysis...</p>
        </div>
    `;

    try {
        // Load the 24hr CSV file for the selected site
        const siteData = await this.load24hrFileForSite(site, sources);

        if (!siteData) {
            throw new Error(`No _24hr file found for site: ${site}`);
        }

        // Generate the plot
        this.createSourceComparisonPlot(siteData, site, sources, outputDiv);

    } catch (error) {
        console.error('Error generating source comparison plot:', error);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.85rem;">
                    Make sure the corresponding _24hr file exists for: ${site}
                </p>
            </div>
        `;
    }
};

// Source comparison for std files
NavigationManager.prototype.generateStdSourceComparison = async function(site, sources) {
    const outputDiv = document.getElementById('sourceComparisonStdOutput');
    if (!outputDiv) return;

    outputDiv.classList.add('active');

    // Show loading message
    outputDiv.innerHTML = `
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; text-align: center;">
            <h4 style="color: #0369a1; margin-bottom: 8px;">🔄 Generating Standard DPM Plot...</h4>
            <p>Loading ${sources.join(', ')} data for ${site} analysis...</p>
        </div>
    `;

    try {
        // Load the std CSV file for the selected site
        const siteData = await this.loadStdFileForSite(site, sources);

        if (!siteData) {
            throw new Error(`No _std file found for site: ${site}`);
        }

        // Generate the plot
        this.createStdSourceComparisonPlot(siteData, site, sources, outputDiv);

    } catch (error) {
        console.error('Error generating std source comparison plot:', error);
        outputDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 15px;">
                <h4 style="color: #dc2626; margin-bottom: 8px;">❌ Error</h4>
                <p><strong>Could not generate plot:</strong> ${error.message}</p>
                <p style="margin-top: 10px; font-size: 0.85rem;">
                    Make sure the corresponding _std file exists for: ${site}
                </p>
            </div>
        `;
    }
};

// Helper function to create site comparison plot (24hr)
NavigationManager.prototype.createSiteComparisonPlot = function(siteData, source, sites, outputDiv) {
    console.log('=== CREATE SITE COMPARISON PLOT ===');
    console.log('Site data:', siteData.length, 'sites');
    console.log('Source:', source);
    console.log('Sites:', sites);
    console.log('Output div:', !!outputDiv);

    try {
        // Create the plot container
        console.log('Creating plot container...');
        const plotContainer = document.createElement('div');
        if (!plotContainer) {
            throw new Error('Failed to create plot container div');
        }
        plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

        console.log('Creating canvas element...');
        const canvas = document.createElement('canvas');
        if (!canvas) {
            throw new Error('Failed to create canvas element');
        }

        console.log('Setting canvas properties...');
        canvas.width = 800;
        canvas.height = 400;
        canvas.style.cssText = 'width: 100%; height: 100%;';

        console.log('Appending canvas to container...');
        plotContainer.appendChild(canvas);

        console.log('Getting 2D context...');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        console.log('Canvas and context created successfully');

        // Define professional journal-style colors (Nature journal style)
        const journalColors = [
            '#1f77b4', // Blue
            '#ff7f0e', // Orange
            '#d62728', // Red (moved to 3rd for better distinction)
            '#2ca02c', // Green (moved to 4th)
            '#9467bd', // Purple
            '#8c564b', // Brown
            '#e377c2', // Pink
            '#7f7f7f', // Gray
            '#bcbd22', // Olive
            '#17becf'  // Cyan
        ];

        // Set up professional plot dimensions with more space for labels
        const plotArea = {
            left: 90,
            right: 700,
            top: 80,
            bottom: 320,
            width: 610,
            height: 240
        };

        console.log('Clearing canvas...');
        // Clear canvas with professional white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        console.log('Title and subtitle removed for cleaner appearance');
        // Title and subtitle removed

        console.log('Preparing data for plotting...');
        // Prepare data for plotting - first extract all available time points from all sites
        let allTimePoints = new Set();
        siteData.forEach(siteInfo => {
            // For 24hr files, pass '24hr' as fileType to extract hours only
            const hourlyData = this.extractHourlyData(siteInfo.data, source, '24hr');
            Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
        });

        // Sort time points and format them as dates in dd/mm/yy format
        // Smart sorting for different time identifier formats
        const sortedHours = Array.from(allTimePoints).sort((a, b) => {
            // For std files with "YYYY-MM-DD_HH" format
            if (a.includes('_') && b.includes('_')) {
                // Sort lexicographically (works for ISO date format)
                return a.localeCompare(b);
            }
            // For 24hr files with simple hour numbers
            return parseInt(a) - parseInt(b);
        });
        console.log('[SORTING] Sorted', sortedHours.length, 'time points');
        console.log('[SORTING] First 3 after sort:', sortedHours.slice(0, 3));
        const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData[0], "time");
        console.log(`Using ${hours.length} time points from actual data:`, hours.slice(0, 5), '...');

        let maxDPM = 0;

        const plotData = siteData.map((siteInfo, index) => {
            console.log(`Processing data for site: ${siteInfo.site}`);
            // For 24hr files, pass '24hr' as fileType to extract hours only
            const hourlyData = this.extractHourlyData(siteInfo.data, source, '24hr');
            console.log(`Hourly data for ${siteInfo.site}:`, Object.keys(hourlyData).length, 'hours');

            const dpmValues = sortedHours.map(hour => {
                return hourlyData[hour] || 0;
            });
            maxDPM = Math.max(maxDPM, ...dpmValues);

            // Extract clean site name from filename
            const siteName = this.extractSiteNameFromFilename(siteInfo.site);

            return {
                site: siteName, // Use clean site name
                filename: siteInfo.site, // Keep original filename for reference
                dpmValues: dpmValues,
                color: journalColors[index % journalColors.length] // Assign color by index
            };
        });

        console.log('Max DPM found:', maxDPM);

        // Round up maxDPM to nice number
        maxDPM = Math.ceil(maxDPM * 1.1);
        const maxPercentage = Math.ceil((maxDPM / 60) * 100);

        console.log('Drawing axes...');
        // Draw axes
        this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, "Time");

        console.log('Plotting site data...');
        // Plot data for each site
        plotData.forEach(siteData => {
            console.log(`Plotting data for site: ${siteData.site}`);
            this.plotSiteData(ctx, plotArea, siteData, hours, maxDPM);
        });

        console.log('Drawing legend...');
        // Draw legend
        this.drawPlotLegend(ctx, plotData, plotArea);

        console.log('Updating output div...');
        // Clear output div and append plot container directly
        outputDiv.innerHTML = '';

        console.log('Appending plot container...');
        outputDiv.appendChild(plotContainer);
        console.log('Plot creation completed successfully');

    } catch (error) {
        console.error('Error in createSiteComparisonPlot:', error);
        console.error('Error stack:', error.stack);
        throw error; // Re-throw to be caught by the calling function
    }
};

// Similar plot creation for source comparison
NavigationManager.prototype.createSourceComparisonPlot = function(siteData, site, sources, outputDiv) {
    // Create the plot container
    const plotContainer = document.createElement('div');
    plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.cssText = 'width: 100%; height: 100%;';

    plotContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Use professional journal colors for sources
    const journalColors = [
        '#1f77b4', // Blue
        '#ff7f0e', // Orange
        '#2ca02c', // Green
        '#d62728', // Red
        '#9467bd', // Purple
        '#8c564b', // Brown
    ];

    // Set up professional plot dimensions
    const plotArea = {
        left: 90,
        right: 700,
        top: 80,
        bottom: 320,
        width: 610,
        height: 240
    };

    // Clear canvas with professional white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extract clean site name for processing
    const siteName = this.extractSiteNameFromFilename(site);

    // Title and subtitle removed for cleaner appearance

    // Prepare data for plotting - first extract all available time points from all sources
    let allTimePoints = new Set();
    sources.forEach(source => {
        // For 24hr files, pass '24hr' as fileType to extract hours only
        const hourlyData = this.extractHourlyData(siteData.data, source, '24hr');
        Object.keys(hourlyData).forEach(hour => allTimePoints.add(hour));
    });

    // Sort time points and format them as dates in dd/mm/yy format
    const sortedHours = Array.from(allTimePoints).sort((a, b) => {
        // For std files with "YYYY-MM-DD_HH" format
        if (a.includes('_') && b.includes('_')) {
            // Sort lexicographically (works for ISO date format)
            return a.localeCompare(b);
        }
        // For 24hr files with simple hour numbers
        return parseInt(a) - parseInt(b);
    });

    const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData, "time");

    let maxDPM = 0;

    const plotData = sources.map((source, index) => {
        // For 24hr files, pass '24hr' as fileType to extract hours only
        const hourlyData = this.extractHourlyData(siteData.data, source, '24hr');
        const dpmValues = sortedHours.map(hour => hourlyData[hour] || 0);
        maxDPM = Math.max(maxDPM, ...dpmValues);

        return {
            source: source, // This will be Porpoise (DPM), Dolphin (DPM), Sonar (DPM)
            displayName: source.replace(' (DPM)', ''), // Remove (DPM) for cleaner display
            dpmValues: dpmValues,
            color: journalColors[index % journalColors.length]
        };
    });

    // Round up maxDPM to nice number
    maxDPM = Math.ceil(maxDPM * 1.1);
    const maxPercentage = Math.ceil((maxDPM / 60) * 100);

    // Draw axes
    this.drawPlotAxes(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, "Time");

    // Plot data for each source
    plotData.forEach(sourceData => {
        this.plotSourceData(ctx, plotArea, sourceData, hours, maxDPM);
    });

    // Draw legend for sources
    this.drawSourceLegend(ctx, plotData, plotArea);

    // Clear output div and append plot
    outputDiv.innerHTML = '';
    outputDiv.appendChild(plotContainer);
};// FPOD Plot Helper Functions - From FPODreport 0.3

// Create std site comparison plot
NavigationManager.prototype.createStdSiteComparisonPlot = function(siteData, source, sites, outputDiv) {
    console.log('=== CREATE STD SITE COMPARISON PLOT ===');

    // Create plot container
    const plotContainer = document.createElement('div');
    plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.cssText = 'width: 100%; height: 100%;';
    plotContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Professional colors
    const journalColors = [
        '#1f77b4', '#ff7f0e', '#d62728', '#2ca02c', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];

    // Plot dimensions
    const plotArea = {
        left: 90, right: 700, top: 80, bottom: 320,
        width: 610, height: 240
    };

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extract all time points
    let allTimePoints = new Set();
    siteData.forEach(siteInfo => {
        const percentages = this.extractHourlyPercentages(siteInfo.data, source, 'std');
        Object.keys(percentages).forEach(hour => allTimePoints.add(hour));
    });

    const sortedHours = Array.from(allTimePoints).sort((a, b) => parseInt(a) - parseInt(b));
    const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData[0], "time");

    let maxPercentage = 0;

    const plotData = siteData.map((siteInfo, index) => {
        const percentages = this.extractHourlyPercentages(siteInfo.data, source, 'std');
        const percentageValues = sortedHours.map(hour => percentages[hour] || 0);
        maxPercentage = Math.max(maxPercentage, ...percentageValues);

        const siteName = this.extractSiteNameFromFilename(siteInfo.site);

        return {
            site: siteName,
            percentageValues: percentageValues,
            color: journalColors[index % journalColors.length]
        };
    });

    maxPercentage = Math.ceil(maxPercentage * 1.1);

    // Draw axes for std plot
    this.drawStdPlotAxes(ctx, plotArea, hours, maxPercentage, canvas, "Time");

    // Plot data
    plotData.forEach(siteData => {
        this.plotStdSiteData(ctx, plotArea, siteData, hours, maxPercentage);
    });

    // Draw legend
    this.drawPlotLegend(ctx, plotData, plotArea);

    outputDiv.innerHTML = '';
    outputDiv.appendChild(plotContainer);
};

// Create std source comparison plot
NavigationManager.prototype.createStdSourceComparisonPlot = function(siteData, site, sources, outputDiv) {
    const plotContainer = document.createElement('div');
    plotContainer.style.cssText = 'width: 100%; height: 400px; position: relative; background: white; border-radius: 6px; padding: 20px;';

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    canvas.style.cssText = 'width: 100%; height: 100%;';
    plotContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    const journalColors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'
    ];

    const plotArea = {
        left: 90, right: 700, top: 80, bottom: 320,
        width: 610, height: 240
    };

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extract all time points from all sources
    let allTimePoints = new Set();
    sources.forEach(source => {
        const percentages = this.extractHourlyPercentages(siteData.data, source, 'std');
        Object.keys(percentages).forEach(hour => allTimePoints.add(hour));
    });

    const sortedHours = Array.from(allTimePoints).sort((a, b) => parseInt(a) - parseInt(b));
    const hours = this.formatTimePointsAsDateLabels(sortedHours, siteData, "time");

    let maxPercentage = 0;

    const plotData = sources.map((source, index) => {
        const percentages = this.extractHourlyPercentages(siteData.data, source, 'std');
        const percentageValues = sortedHours.map(hour => percentages[hour] || 0);
        maxPercentage = Math.max(maxPercentage, ...percentageValues);

        return {
            source: source,
            displayName: source.replace(' (DPM)', ''),
            percentageValues: percentageValues,
            color: journalColors[index % journalColors.length]
        };
    });

    maxPercentage = Math.ceil(maxPercentage * 1.1);

    // Draw axes
    this.drawStdPlotAxes(ctx, plotArea, hours, maxPercentage, canvas, "Time");

    // Plot data
    plotData.forEach(sourceData => {
        this.plotStdSourceData(ctx, plotArea, sourceData, hours, maxPercentage);
    });

    // Draw legend
    this.drawSourceLegend(ctx, plotData, plotArea);

    outputDiv.innerHTML = '';
    outputDiv.appendChild(plotContainer);
};

// Plot source data for regular DPM plots
NavigationManager.prototype.plotSourceData = function(ctx, plotArea, sourceData, hours, maxDPM) {
    const { dpmValues, color } = sourceData;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const xStep = plotArea.width / (hours.length - 1);

    if (dpmValues.length < 2) return;

    ctx.beginPath();

    const points = dpmValues.map((dpm, i) => ({
        x: plotArea.left + (i * xStep),
        y: plotArea.bottom - (dpm / maxDPM) * plotArea.height
    }));

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        const current = points[i];

        if (i === points.length - 1) {
            ctx.lineTo(current.x, current.y);
        } else {
            const next = points[i + 1];
            const cpX = current.x;
            const cpY = current.y;
            const endX = (current.x + next.x) / 2;
            const endY = (current.y + next.y) / 2;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        }
    }

    ctx.stroke();
};

// Draw source legend
NavigationManager.prototype.drawSourceLegend = function(ctx, plotData, plotArea) {
    const legendX = plotArea.left + 20;
    const legendY = plotArea.top + 20;

    const legendPadding = 6;
    const lineHeight = 20;

    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

    let maxTextWidth = 0;
    plotData.forEach((sourceData) => {
        const displayName = sourceData.displayName || sourceData.source;
        const textWidth = ctx.measureText(displayName).width;
        maxTextWidth = Math.max(maxTextWidth, textWidth);
    });

    const legendWidth = maxTextWidth + 46;
    const legendHeight = (plotData.length * lineHeight) + (legendPadding * 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.textAlign = 'left';

    plotData.forEach((sourceData, i) => {
        const y = legendY + legendPadding + (i * lineHeight) + (lineHeight / 2);

        ctx.strokeStyle = sourceData.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(legendX, y - 2);
        ctx.lineTo(legendX + 24, y - 2);
        ctx.stroke();

        ctx.fillStyle = '#374151';
        const displayName = sourceData.displayName || sourceData.source;
        ctx.fillText(displayName, legendX + 30, y + 2);
    });
};

// Plot std site data
NavigationManager.prototype.plotStdSiteData = function(ctx, plotArea, siteData, hours, maxPercentage) {
    const { percentageValues, color } = siteData;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const xStep = plotArea.width / (hours.length - 1);

    if (percentageValues.length < 2) return;

    ctx.beginPath();

    const points = percentageValues.map((percentage, i) => ({
        x: plotArea.left + (i * xStep),
        y: plotArea.bottom - (percentage / maxPercentage) * plotArea.height
    }));

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        const current = points[i];

        if (i === points.length - 1) {
            ctx.lineTo(current.x, current.y);
        } else {
            const next = points[i + 1];
            const cpX = current.x;
            const cpY = current.y;
            const endX = (current.x + next.x) / 2;
            const endY = (current.y + next.y) / 2;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        }
    }

    ctx.stroke();
};

// Plot std source data
NavigationManager.prototype.plotStdSourceData = function(ctx, plotArea, sourceData, hours, maxPercentage) {
    const { percentageValues, color } = sourceData;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const xStep = plotArea.width / (hours.length - 1);

    if (percentageValues.length < 2) return;

    ctx.beginPath();

    const points = percentageValues.map((percentage, i) => ({
        x: plotArea.left + (i * xStep),
        y: plotArea.bottom - (percentage / maxPercentage) * plotArea.height
    }));

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        const current = points[i];

        if (i === points.length - 1) {
            ctx.lineTo(current.x, current.y);
        } else {
            const next = points[i + 1];
            const cpX = current.x;
            const cpY = current.y;
            const endX = (current.x + next.x) / 2;
            const endY = (current.y + next.y) / 2;

            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        }
    }

    ctx.stroke();
};

// Draw axes for std plots (percentage only)
NavigationManager.prototype.drawStdPlotAxes = function(ctx, plotArea, hours, maxPercentage, canvas, xAxisLabel) {
    // Softer, elegant styling
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.font = '17px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';

    // X-axis
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.bottom);
    ctx.lineTo(plotArea.right, plotArea.bottom);
    ctx.stroke();

    // Y-axis (left - Percentage only for std plots)
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.top);
    ctx.lineTo(plotArea.left, plotArea.bottom);
    ctx.stroke();

    // X-axis labels
    const xStep = plotArea.width / (hours.length - 1);
    const labelSpacing = this.calculateOptimalLabelSpacing(hours.length);

    hours.forEach((hour, i) => {
        const x = plotArea.left + (i * xStep);

        // Tick mark
        ctx.beginPath();
        ctx.moveTo(x, plotArea.bottom);
        ctx.lineTo(x, plotArea.bottom + 5);
        ctx.stroke();

        // Label with rotation
        if (i % labelSpacing === 0 || i === hours.length - 1) {
            ctx.save();
            ctx.translate(x, plotArea.bottom + 20);
            ctx.rotate(-Math.PI / 4);
            ctx.textAlign = 'right';
            ctx.fillText(hour, 0, 0);
            ctx.restore();
        }
    });

    // Y-axis labels (Percentage)
    ctx.textAlign = 'right';
    const percentSteps = 5;
    for (let i = 0; i <= percentSteps; i++) {
        const percentage = (maxPercentage / percentSteps) * i;
        const y = plotArea.bottom - (plotArea.height / percentSteps) * i;

        ctx.beginPath();
        ctx.moveTo(plotArea.left - 5, y);
        ctx.lineTo(plotArea.left, y);
        ctx.stroke();

        ctx.fillText(percentage.toFixed(1) + '%', plotArea.left - 6, y + 4);
    }

    // Add gridlines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    // Horizontal gridlines
    for (let i = 1; i < percentSteps; i++) {
        const y = plotArea.bottom - (plotArea.height / percentSteps) * i;
        ctx.beginPath();
        ctx.moveTo(plotArea.left, y);
        ctx.lineTo(plotArea.right, y);
        ctx.stroke();
    }

    // Top border
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.top);
    ctx.lineTo(plotArea.right, plotArea.top);
    ctx.stroke();

    // Right border
    ctx.beginPath();
    ctx.moveTo(plotArea.right, plotArea.top);
    ctx.lineTo(plotArea.right, plotArea.bottom);
    ctx.stroke();

    // Axis labels
    ctx.textAlign = 'center';
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = '#555555';

    // X-axis label
    ctx.fillText(xAxisLabel, plotArea.left + plotArea.width / 2, plotArea.bottom + 60);

    // Y-axis label
    ctx.save();
    ctx.translate(40, plotArea.top + plotArea.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Detection rate (% of hour)', 0, 0);
    ctx.restore();
};