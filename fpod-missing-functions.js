// Missing FPOD Helper Functions from FPODreport 0.3

// Load 24hr files for multiple sites
NavigationManager.prototype.load24hrFilesForSites = async function(selectedFilenames, source) {
    console.log('=== LOAD 24HR FILES FOR SITES ===');
    console.log('Selected filenames:', selectedFilenames);
    console.log('Available files count:', this.availableFiles?.length || 0);

    const siteData = [];

    for (const filename of selectedFilenames) {
        console.log(`Looking for file: ${filename}`);
        // Find the file by exact filename match
        const file24hr = this.availableFiles.find(file => file.name === filename);

        console.log(`Found file for ${filename}:`, file24hr?.name || 'NOT FOUND');

        if (file24hr) {
            try {
                console.log(`Parsing CSV file: ${file24hr.name}`);
                const data = await this.parseCSVFile(file24hr);
                console.log(`Parsed data for ${filename}:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');

                siteData.push({
                    site: filename, // Use filename as site identifier
                    file: file24hr,
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

// Load 24hr file for site
NavigationManager.prototype.load24hrFileForSite = async function(filename, sources) {
    console.log('=== LOAD 24HR FILE FOR SOURCE COMPARISON ===');
    console.log('Selected filename:', filename);

    // Find the file by exact filename match
    const file24hr = this.availableFiles.find(file => file.name === filename);

    if (file24hr) {
        try {
            console.log(`Parsing CSV file: ${file24hr.name}`);
            const data = await this.parseCSVFile(file24hr);
            console.log(`Parsed data:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');

            return {
                site: filename, // Use filename as identifier
                file: file24hr,
                data: data,
                sources: sources
            };
        } catch (error) {
            console.error(`Error loading file ${filename}:`, error);
            throw error;
        }
    }

    console.warn(`File not found: ${filename}`);
    return null;
};

// Load std files for multiple sites
NavigationManager.prototype.loadStdFilesForSites = async function(selectedFilenames, source) {
    console.log('=== LOAD STD FILES FOR SITES ===');
    console.log('Selected filenames:', selectedFilenames);

    const siteData = [];

    for (const filename of selectedFilenames) {
        console.log(`Looking for file: ${filename}`);
        // Find the file by exact filename match
        const fileStd = this.availableFiles.find(file => file.name === filename);

        console.log(`Found file for ${filename}:`, fileStd?.name || 'NOT FOUND');

        if (fileStd) {
            try {
                console.log(`Parsing CSV file: ${fileStd.name}`);
                const data = await this.parseCSVFile(fileStd);
                console.log(`Parsed data for ${filename}:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');

                siteData.push({
                    site: filename,
                    file: fileStd,
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

    console.log('Total std site data loaded:', siteData.length);
    return siteData;
};

// Load std file for site
NavigationManager.prototype.loadStdFileForSite = async function(filename, sources) {
    console.log('=== LOAD STD FILE FOR SOURCE COMPARISON ===');
    console.log('Selected filename:', filename);

    // Find the file by exact filename match
    const fileStd = this.availableFiles.find(file => file.name === filename);

    if (fileStd) {
        try {
            console.log(`Parsing CSV file: ${fileStd.name}`);
            const data = await this.parseCSVFile(fileStd);
            console.log(`Parsed data:`, data.headers?.length || 0, 'headers,', data.data?.length || 0, 'rows');

            return {
                site: filename,
                file: fileStd,
                data: data,
                sources: sources
            };
        } catch (error) {
            console.error(`Error loading file ${filename}:`, error);
            throw error;
        }
    }

    console.warn(`File not found: ${filename}`);
    return null;
};

// Parse CSV file
NavigationManager.prototype.parseCSVFile = async function(file) {
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

// Extract hourly data
NavigationManager.prototype.extractHourlyData = function(csvData, source, fileType = 'auto') {
    console.log(`=== EXTRACT HOURLY DATA FOR SOURCE: ${source} ===`);
    console.log('CSV headers:', csvData.headers);
    console.log('CSV data rows:', csvData.data.length);
    console.log('File type parameter:', fileType);

    const hourlyData = {};

    csvData.data.forEach((row, index) => {
        if (index < 3) { // Log first few rows for debugging
            console.log(`Row ${index}:`, row);
            console.log(`Row ${index} keys:`, Object.keys(row));
        }

        // Look for hour column (might be 'Hour', 'Time', etc.)
        const hourKey = Object.keys(row).find(key =>
            key.toLowerCase().includes('hour') || key.toLowerCase().includes('time')
        );

        // Look for the source column - need to handle "Porpoise (DPM)" format
        let sourceKey = Object.keys(row).find(key =>
            key === source || key.toLowerCase().includes(source.toLowerCase().replace(' (dpm)', ''))
        );

        if (index < 3) {
            console.log(`Row ${index} - Hour key: "${hourKey}", Source key: "${sourceKey}"`);
            if (hourKey) console.log(`  Hour value: "${row[hourKey]}"`);
            if (sourceKey) console.log(`  Source value: "${row[sourceKey]}"`);
        }

        if (hourKey && sourceKey && row[hourKey] && row[sourceKey] !== undefined) {
            let timeIdentifier = row[hourKey];

            // Handle different time formats for std files vs 24hr files
            if (typeof timeIdentifier === 'string' && timeIdentifier.includes('T')) {
                // ISO timestamp like "2024-06-06T01:00:00.000Z"
                const dateObj = new Date(timeIdentifier);

                // For 24hr files, only use the hour (ignore the date)
                // This allows multiple 24hr files from different days to align properly
                if (fileType === '24hr') {
                    timeIdentifier = String(dateObj.getUTCHours()).padStart(2, '0');
                    if (index < 3) {
                        console.log(`  [24HR FIX] ISO: ${row[hourKey]} -> Hour only: ${timeIdentifier}`);
                    }
                } else {
                    // For std files, keep date and hour for proper chronological ordering
                    const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                    const hourStr = String(dateObj.getUTCHours()).padStart(2, '0');
                    timeIdentifier = `${dateStr}_${hourStr}`; // e.g., "2024-06-06_14"
                    if (index < 3) {
                        console.log(`  [STD FIX] ISO: ${row[hourKey]} -> ${dateStr}_${hourStr}`);
                    }
                }
            } else {
                // Use as-is for simple hour numbers
                timeIdentifier = String(timeIdentifier).padStart(2, '0');
            }

            const dpm = parseFloat(row[sourceKey]) || 0;

            // For 24hr files, if we already have data for this hour from another file,
            // we could average them or take the latest. For now, we'll take the latest.
            if (fileType === '24hr' && hourlyData[timeIdentifier] !== undefined) {
                console.log(`  [24HR] Hour ${timeIdentifier} already has data (${hourlyData[timeIdentifier]}), replacing with ${dpm}`);
            }

            hourlyData[timeIdentifier] = dpm;

            if (index < 3) {
                console.log(`  Stored: timeIdentifier="${timeIdentifier}", dpm=${dpm}`);
            }
        }
    });

    console.log('Extracted hourly data:', Object.keys(hourlyData).length, 'hours');
    console.log('Sample hourly data:', Object.fromEntries(Object.entries(hourlyData).slice(0, 5)));

    return hourlyData;
};

// Extract hourly percentages for std files
NavigationManager.prototype.extractHourlyPercentages = function(csvData, source, fileType = 'std') {
    console.log(`=== EXTRACT HOURLY PERCENTAGES FOR SOURCE: ${source} ===`);

    const hourlyPercentages = {};
    const hoursPerDay = {};

    csvData.data.forEach(row => {
        // Look for hour/time column
        const hourKey = Object.keys(row).find(key =>
            key.toLowerCase().includes('hour') || key.toLowerCase().includes('time')
        );

        // Look for the source column
        let sourceKey = Object.keys(row).find(key =>
            key === source || key.toLowerCase().includes(source.toLowerCase().replace(' (dpm)', ''))
        );

        if (hourKey && sourceKey && row[hourKey] && row[sourceKey] !== undefined) {
            let timeIdentifier = row[hourKey];

            // Extract hour from timestamp
            if (typeof timeIdentifier === 'string' && timeIdentifier.includes('T')) {
                const dateObj = new Date(timeIdentifier);
                const hour = String(dateObj.getUTCHours()).padStart(2, '0');
                const dpm = parseFloat(row[sourceKey]) || 0;

                // Calculate percentage (DPM / 60 * 100)
                const percentage = (dpm / 60) * 100;

                if (!hourlyPercentages[hour]) {
                    hourlyPercentages[hour] = [];
                }
                hourlyPercentages[hour].push(percentage);
            }
        }
    });

    // Average percentages for each hour
    const averagedPercentages = {};
    Object.keys(hourlyPercentages).forEach(hour => {
        const percentages = hourlyPercentages[hour];
        const avg = percentages.reduce((sum, val) => sum + val, 0) / percentages.length;
        averagedPercentages[hour] = avg;
    });

    console.log('Extracted hourly percentages:', Object.keys(averagedPercentages).length, 'hours');
    return averagedPercentages;
};

// Format time points as date labels
NavigationManager.prototype.formatTimePointsAsDateLabels = function(sortedHours, sampleSiteData, formatType = "date") {
    console.log('[DATE LABELS] Converting', sortedHours.length, 'time points to labels, format:', formatType);
    console.log('[DATE LABELS] First 3 sorted hours:', sortedHours.slice(0, 3));

    // For 24hr file format - use time format when requested
    if (formatType === "time") {
        return sortedHours.map((hour) => {
            const hourNum = hour.includes("_") ? parseInt(hour.split("_")[1], 10) : parseInt(hour, 10);
            const hours = String(hourNum).padStart(2, "0");
            return `${hours}:00`;
        });
    }

    // For std file format with date_hour identifiers
    if (sortedHours.length > 0 && sortedHours[0].includes("_")) {
        console.log('[DATE LABELS] Detected STD format with underscore');
        const labels = sortedHours.map(timeIdentifier => {
            const [dateStr, hourStr] = timeIdentifier.split("_");
            const date = new Date(dateStr + "T00:00:00Z");
            const day = String(date.getUTCDate()).padStart(2, "0");
            const month = String(date.getUTCMonth() + 1).padStart(2, "0");
            const year = String(date.getUTCFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
        });
        console.log('[DATE LABELS] First 3 formatted labels:', labels.slice(0, 3));
        return labels;
    }

    // Fallback for simple hour numbers
    return sortedHours.map(hour => `${hour}:00`);
};

// Calculate optimal label spacing
NavigationManager.prototype.calculateOptimalLabelSpacing = function(dataSize) {
    const targetLabelCount = 10;
    const spacing = Math.max(1, Math.ceil(dataSize / targetLabelCount));
    console.log(`Dataset size: ${dataSize}, calculated spacing: ${spacing}, estimated labels: ${Math.ceil(dataSize / spacing)}`);
    return spacing;
};

// Extract site name from filename
NavigationManager.prototype.extractSiteNameFromFilename = function(filename) {
    // Extract clean site name from filename
    return filename
        .replace(/_24hr\.csv$/i, '')
        .replace(/_std\.csv$/i, '')
        .replace(/\.csv$/i, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ');
};

// Plot site data
NavigationManager.prototype.plotSiteData = function(ctx, plotArea, siteData, hours, maxDPM) {
    const { site, dpmValues, color } = siteData;

    // Professional smooth line styling
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const xStep = plotArea.width / (hours.length - 1);

    // Create smooth curve without data points
    if (dpmValues.length < 2) return;

    ctx.beginPath();

    // Calculate points
    const points = dpmValues.map((dpm, i) => ({
        x: plotArea.left + (i * xStep),
        y: plotArea.bottom - (dpm / maxDPM) * plotArea.height
    }));

    // Start the path
    ctx.moveTo(points[0].x, points[0].y);

    // Draw smooth curves using quadratic bezier curves
    for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const previous = points[i - 1];

        if (i === points.length - 1) {
            // Last point - draw straight line
            ctx.lineTo(current.x, current.y);
        } else {
            // Create smooth curve using quadratic bezier
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

// Draw plot axes
NavigationManager.prototype.drawPlotAxes = function(ctx, plotArea, hours, maxDPM, maxPercentage, canvas, xAxisLabel = "Date") {
    // Softer, elegant styling
    ctx.strokeStyle = '#d0d0d0';  // Light gray for axes
    ctx.lineWidth = 1;
    ctx.font = '17px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666666';  // Softer text color

    // X-axis
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.bottom);
    ctx.lineTo(plotArea.right, plotArea.bottom);
    ctx.stroke();

    // Y-axis (left - DPM)
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.top);
    ctx.lineTo(plotArea.left, plotArea.bottom);
    ctx.stroke();

    // Y-axis (right - Percentage)
    ctx.beginPath();
    ctx.moveTo(plotArea.right, plotArea.top);
    ctx.lineTo(plotArea.right, plotArea.bottom);
    ctx.stroke();

    // X-axis labels (hours)
    const xStep = plotArea.width / (hours.length - 1);
    hours.forEach((hour, i) => {
        const x = plotArea.left + (i * xStep);

        // Tick mark
        ctx.beginPath();
        ctx.moveTo(x, plotArea.bottom);
        ctx.lineTo(x, plotArea.bottom + 5);
        ctx.stroke();

        // Label with intelligent spacing to avoid crowding - rotated at 45 degrees
        const labelSpacing = this.calculateOptimalLabelSpacing(hours.length);
        if (i % labelSpacing === 0 || i === hours.length - 1) { // Always show first, last, and spaced labels
            ctx.save();
            ctx.translate(x, plotArea.bottom + 20);
            ctx.rotate(-Math.PI / 4); // -45 degrees
            ctx.textAlign = 'right';
            ctx.fillText(hour, 0, 0);
            ctx.restore();
        }
    });

    // Left Y-axis labels (DPM)
    ctx.textAlign = 'right';
    const dpmSteps = 5;
    for (let i = 0; i <= dpmSteps; i++) {
        const dpm = (maxDPM / dpmSteps) * i;
        const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;

        // Tick mark
        ctx.beginPath();
        ctx.moveTo(plotArea.left - 5, y);
        ctx.lineTo(plotArea.left, y);
        ctx.stroke();

        // Label (moved closer to axis)
        ctx.fillText(dpm.toFixed(1), plotArea.left - 6, y + 4);
    }

    // Add horizontal gridlines for Y-axis major ticks (faint)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < dpmSteps; i++) { // Skip 0 and max to avoid overlapping with axes
        const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;
        ctx.beginPath();
        ctx.moveTo(plotArea.left, y);
        ctx.lineTo(plotArea.right, y);
        ctx.stroke();
    }

    // Add vertical gridlines for X-axis major ticks (faint)
    const gridSpacing = this.calculateOptimalLabelSpacing(hours.length);
    for (let i = gridSpacing; i < hours.length - 1; i += gridSpacing) {
        const x = plotArea.left + (i * xStep);
        ctx.beginPath();
        ctx.moveTo(x, plotArea.top);
        ctx.lineTo(x, plotArea.bottom);
        ctx.stroke();
    }

    // Add horizontal line at top to complete the rectangle
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotArea.left, plotArea.top);
    ctx.lineTo(plotArea.right, plotArea.top);
    ctx.stroke();

    // Reset styles for other elements
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;

    // Right Y-axis labels (Percentage)
    ctx.textAlign = 'left';
    for (let i = 0; i <= dpmSteps; i++) {
        const percentage = (maxPercentage / dpmSteps) * i;
        const y = plotArea.bottom - (plotArea.height / dpmSteps) * i;

        // Tick mark
        ctx.beginPath();
        ctx.moveTo(plotArea.right, y);
        ctx.lineTo(plotArea.right + 5, y);
        ctx.stroke();

        // Label (moved closer to axis)
        ctx.fillText(percentage.toFixed(1) + '%', plotArea.right + 6, y + 4);
    }

    // Elegant axis labels
    ctx.textAlign = 'center';
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.fillStyle = '#555555';

    // X-axis label
    ctx.fillText(xAxisLabel, plotArea.left + plotArea.width / 2, xAxisLabel === "Date" ? plotArea.bottom + 70 : plotArea.bottom + 60);

    // Left Y-axis label
    ctx.save();
    ctx.translate(40, plotArea.top + plotArea.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Detection Positive Minutes (DPM)', 0, 0);
    ctx.restore();

    // Right Y-axis label
    ctx.save();
    ctx.translate(plotArea.right + 70, plotArea.top + plotArea.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('Detection rate (% of hour)', 0, 0);
    ctx.restore();
};

// Draw plot legend
NavigationManager.prototype.drawPlotLegend = function(ctx, plotData, plotArea) {
    // Legend positioning aligned to left like the second plot
    const legendX = plotArea.left + 20;
    const legendY = plotArea.top + 20;

    // File name truncation function (2nd to 4th underscore)
    const truncateFileName = (fileName) => {
        const parts = fileName.split('_');
        if (parts.length >= 4) {
            return parts.slice(2, 4).join('_');
        }
        return fileName; // Return original if not enough underscores
    };

    // Calculate legend box dimensions dynamically based on text content
    const legendPadding = 6;
    const lineHeight = 20;

    // Set font for measurement
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';

    // Calculate maximum text width
    let maxTextWidth = 0;
    plotData.forEach((siteData) => {
        let displayName;
        if (plotData.length === 1) {
            displayName = truncateFileName(siteData.site);
        } else {
            displayName = siteData.site; // Already truncated by extractSiteNameFromFilename
        }
        const textWidth = ctx.measureText(displayName).width;
        maxTextWidth = Math.max(maxTextWidth, textWidth);
    });

    // Legend width: line sample (30px) + text width + padding
    const legendWidth = maxTextWidth + 46; // Component-based: 8px padding + 24px icon + 6px gap + text + 8px padding
    const legendHeight = (plotData.length * lineHeight) + (legendPadding * 2);

    // Draw legend background box with transparency
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // White with 30% transparency
    ctx.fillRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    // Draw legend border
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'; // Light grey with 50% transparency
    ctx.lineWidth = 0.5; // Reduced from 1 to 0.5 for thinner border
    ctx.strokeRect(legendX - legendPadding, legendY - legendPadding, legendWidth, legendHeight);

    // Draw legend items
    ctx.font = '18px "Segoe UI", "SF Pro Display", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
    ctx.textAlign = 'left';

    plotData.forEach((siteData, i) => {
        const y = legendY + legendPadding + (i * lineHeight) + (lineHeight / 2);

        // Draw line sample only (no boxes) - adjusted for double padding
        ctx.strokeStyle = siteData.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(legendX, y - 2);
        ctx.lineTo(legendX + 24, y - 2);
        ctx.stroke();

        // Site name with truncation - adjusted for double padding
        ctx.fillStyle = '#374151';
        const displayName = truncateFileName(siteData.site);
        ctx.fillText(displayName, legendX + 30, y + 2);
    });
};