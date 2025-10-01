// FPOD Plot Helper Functions - From FPODreport 0.3

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