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
};