<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import type { WeatherForecast } from '../types/WeatherTypes';

    export let forecast: WeatherForecast | null = null;
    export let startTime: number = Date.now();
    export let endTime: number = Date.now() + 24 * 60 * 60 * 1000;
    export let routeColor: string = '#3498db';

    const dispatch = createEventDispatcher();

    let canvas: HTMLCanvasElement;
    let tableContainer: HTMLDivElement;
    let currentHoverIndex: number | null = null;
    let scrollPosition = 0;
    let isDragging = false;
    let dragStartIndex: number | null = null;
    let dragDropTargetIndex: number | null = null;
    let autoScrollTimer: number | null = null;
    let tableScrollContainer: HTMLElement | null = null;
    let expandedWaypoints: Set<number> = new Set();

    // Constants
    const HOUR_WIDTH = 30; // 30px per hour
    const ROW_HEIGHTS = {
        weather: 20,
        temperature: 18,
        rain: 22,
        wind: 18,
        windGust: 16,
        windDir: 20,
        waves: 31
    };

    // Calculate hourly data points including 6h before/after
    $: hourlyData = generateHourlyData();
    $: routeProgress = calculateRouteProgress();
    $: waypointPositions = calculateWaypointPositions();
    $: canvasWidth = hourlyData.length * HOUR_WIDTH;
    $: displayWidth = canvasWidth / 2; // Canvas is 2x for retina

    // Redraw canvas when data changes
    $: if (canvas && hourlyData.length > 0) {
        drawCanvas();
    }

    function generateHourlyData() {
        if (!forecast) return [];

        // Start 6 hours before route start, end 6 hours after route end
        const dataStart = startTime - (6 * 60 * 60 * 1000);
        const dataEnd = endTime + (6 * 60 * 60 * 1000);

        const hourlyPoints = [];
        const hourMs = 60 * 60 * 1000;

        for (let time = dataStart; time <= dataEnd; time += hourMs) {
            // Find closest forecast point
            const forecastPoint = findClosestForecastPoint(time);

            hourlyPoints.push({
                timestamp: time,
                isInRoute: time >= startTime && time <= endTime,
                forecast: forecastPoint,
                hour: new Date(time).getHours(),
                day: new Date(time).getDate()
            });
        }

        return hourlyPoints;
    }

    function findClosestForecastPoint(targetTime: number) {
        if (!forecast?.pointForecasts.length) return null;

        return forecast.pointForecasts.reduce((closest, point) => {
            const pointDiff = Math.abs(point.timestamp - targetTime);
            const closestDiff = Math.abs(closest.timestamp - targetTime);
            return pointDiff < closestDiff ? point : closest;
        });
    }

    function calculateRouteProgress() {
        const totalDuration = endTime - startTime;
        const totalDataDuration = (hourlyData.length - 1) * 60 * 60 * 1000;
        const routeStartOffset = startTime - (hourlyData[0]?.timestamp || startTime);

        return {
            startPercent: (routeStartOffset / totalDataDuration) * 100,
            duration: totalDuration,
            durationPercent: (totalDuration / totalDataDuration) * 100
        };
    }

    function calculateWaypointPositions() {
        if (!hourlyData.length) return [];

        const routeDuration = endTime - startTime;
        const legDuration = routeDuration / 3; // 3 legs for now

        const waypoints = [];
        for (let i = 0; i < 4; i++) { // 4 waypoints (start + 3 intermediate)
            const legTime = startTime + (i * legDuration);
            const waypointIndex = hourlyData.findIndex(h => h.timestamp >= legTime);

            if (waypointIndex >= 0) {
                waypoints.push({
                    index: waypointIndex,
                    number: i + 1,
                    timestamp: legTime,
                    isStart: i === 0
                });
            }
        }

        return waypoints;
    }

    function toggleWaypointExpansion(waypointNumber: number) {
        if (expandedWaypoints.has(waypointNumber)) {
            expandedWaypoints.delete(waypointNumber);
        } else {
            expandedWaypoints.add(waypointNumber);
        }
        expandedWaypoints = new Set(expandedWaypoints); // Trigger reactivity
    }

    function handleAverageSpeedUpdate(waypointNumber: number, newSpeed: string) {
        const speed = parseFloat(newSpeed);
        if (!isNaN(speed) && speed > 0) {
            console.log(`Updated leg ${waypointNumber} average speed to ${speed}kts`);

            // Dispatch event to notify parent component of leg speed change
            dispatch('legSpeedChange', {
                legNumber: waypointNumber,
                newAverageSpeed: speed
            });
        }
    }

    function getLegData(waypointNumber: number) {
        if (!forecast?.route?.legs || waypointNumber > forecast.route.legs.length) {
            // TODO: Handle missing leg data properly in UI
            return null;
        }

        const leg = forecast.route.legs[waypointNumber - 1];
        if (!leg) {
            // TODO: Handle missing leg data properly in UI
            return null;
        }

        // Mock weather data for now - TODO: Calculate from weather service
        const mockWeatherStats = {
            avgWindSpeed: 12 + Math.random() * 8, // 12-20 kts
            maxGust: 18 + Math.random() * 12      // 18-30 kts
        };

        // Format leg time
        const hours = Math.floor(leg.duration / 60);
        const minutes = leg.duration % 60;
        const legTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return {
            averageSpeed: leg.averageSpeed,
            avgWindSpeed: Math.round(mockWeatherStats.avgWindSpeed),
            maxGust: Math.round(mockWeatherStats.maxGust),
            legTime: legTime,
            distance: `${leg.distance.toFixed(1)}nm`
        };
    }

    function drawCanvas() {
        if (!canvas || !hourlyData.length) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (2x for retina)
        canvas.width = canvasWidth;
        canvas.height = 370;

        // Scale for retina
        ctx.scale(2, 2);

        // Clear canvas
        ctx.clearRect(0, 0, displayWidth, 185);

        // Draw background grid
        drawGrid(ctx);

        // Draw data backgrounds and gradients
        drawDataBackgrounds(ctx);
    }

    function drawGrid(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 0.5;

        // Vertical lines (hourly)
        for (let i = 0; i <= hourlyData.length; i++) {
            const x = i * 15; // 15px in display coordinates
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 185);
            ctx.stroke();
        }

        // Horizontal lines (row separators)
        let y = 30; // Start after weather icons
        const rowHeights = Object.values(ROW_HEIGHTS);

        for (let i = 0; i < rowHeights.length; i++) {
            y += rowHeights[i];
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(displayWidth, y);
            ctx.stroke();
        }
    }

    function drawDataBackgrounds(ctx: CanvasRenderingContext2D) {
        // Draw route highlight
        const routeStart = routeProgress.startPercent / 100 * displayWidth;
        const routeWidth = routeProgress.durationPercent / 100 * displayWidth;

        const rgb = hexToRgb(routeColor);
        ctx.fillStyle = `rgba(${rgb}, 0.1)`;
        ctx.fillRect(routeStart, 0, routeWidth, 185);

        // Draw temperature gradient background
        drawTemperatureGradient(ctx);
    }

    function drawTemperatureGradient(ctx: CanvasRenderingContext2D) {
        const tempY = 55; // Temperature row position
        const tempHeight = ROW_HEIGHTS.temperature;

        hourlyData.forEach((data, index) => {
            if (!data.forecast?.northUp?.temperature) return;

            const x = index * 15;
            const temp = data.forecast.northUp.temperature;

            // Color based on temperature
            let color;
            if (temp < 15) color = '#74b9ff'; // Cold - blue
            else if (temp < 25) color = '#00b894'; // Cool - green
            else if (temp < 30) color = '#fdcb6e'; // Warm - yellow
            else color = '#e17055'; // Hot - red

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x, tempY, 15, tempHeight);
            ctx.globalAlpha = 1;
        });
    }

    function handleHover(index: number | null) {
        currentHoverIndex = index;
        if (index !== null && hourlyData[index]) {
            dispatch('timeHover', {
                timestamp: hourlyData[index].timestamp,
                forecast: hourlyData[index].forecast
            });
        }
    }

    function handleScroll(event: Event) {
        const target = event.target as HTMLElement;
        scrollPosition = target.scrollLeft;
    }

    function formatTime(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
    }

    function formatDuration(ms: number): string {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days > 0) {
            return `${days}d ${remainingHours}h`;
        }
        return `${hours}h`;
    }

    function getWeatherIcon(weatherCode: number): string {
        // Map weather codes to icon paths
        const iconMap: Record<number, string> = {
            1: '1.png', // sunny
            2: '2.png', // partly cloudy
            3: '3.png', // cloudy
            18: '18.png', // light rain
            19: '19.png', // rain
            21: '21.png' // thunderstorm
        };
        return iconMap[weatherCode] || '2.png';
    }

    function onMetricClick(metric: string) {
        dispatch('metricClick', { metric });
    }

    function handleSpeedEdit(leg: number) {
        console.log(`Editing speed for leg ${leg}`);
    }

    function handleSpeedChange(leg: number, speedText: string) {
        const speed = parseFloat(speedText.replace('kt', ''));
        if (!isNaN(speed) && speed > 0) {
            console.log(`Speed changed to ${speed}kt for leg ${leg}`);
            // TODO: Implement speed change logic
        }
    }

    function handleDragStart(event: DragEvent, index: number) {
        isDragging = true;
        dragStartIndex = index;
        dragDropTargetIndex = null;
        event.dataTransfer?.setData('text/plain', index.toString());

        // Set drag image to be invisible
        const dragImage = new Image();
        dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
        event.dataTransfer?.setDragImage(dragImage, 0, 0);

        // Find table scroll container
        tableScrollContainer = document.querySelector('.data-table');
    }

    function handleDragEnd() {
        isDragging = false;
        dragStartIndex = null;
        dragDropTargetIndex = null;

        // Clear auto-scroll timer
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
            autoScrollTimer = null;
        }

        tableScrollContainer = null;
    }

    function handleDragOver(event: DragEvent, targetIndex: number) {
        event.preventDefault();

        if (isDragging && dragStartIndex !== null) {
            // Only show drop target if it's a different position
            if (targetIndex !== dragStartIndex) {
                dragDropTargetIndex = targetIndex;
            } else {
                dragDropTargetIndex = null;
            }

            // Auto-scroll logic
            const element = event.target as HTMLElement;
            const rect = element.getBoundingClientRect();
            const container = tableScrollContainer;

            if (container) {
                const containerRect = container.getBoundingClientRect();
                const scrollThreshold = 50;

                // Clear existing timer
                if (autoScrollTimer) {
                    clearInterval(autoScrollTimer);
                }

                // Check if we need to scroll up
                if (rect.top - containerRect.top < scrollThreshold) {
                    autoScrollTimer = setInterval(() => {
                        container.scrollTop -= 5;
                    }, 16) as any;
                }
                // Check if we need to scroll down
                else if (containerRect.bottom - rect.bottom < scrollThreshold) {
                    autoScrollTimer = setInterval(() => {
                        container.scrollTop += 5;
                    }, 16) as any;
                }
            }
        }
    }

    function handleDragLeave() {
        // Clear auto-scroll when leaving drag area
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
            autoScrollTimer = null;
        }
    }

    function handleDrop(event: DragEvent, targetIndex: number) {
        event.preventDefault();

        if (dragStartIndex !== null && targetIndex !== dragStartIndex) {
            const newStartTime = hourlyData[targetIndex]?.timestamp;
            if (newStartTime) {
                console.log(`Moving route start from ${formatTime(hourlyData[dragStartIndex].timestamp)} to ${formatTime(newStartTime)}`);

                // Dispatch event to update route start time
                dispatch('routeStartChange', {
                    oldTime: hourlyData[dragStartIndex].timestamp,
                    newTime: newStartTime,
                    fromIndex: dragStartIndex,
                    toIndex: targetIndex
                });
            }
        }

        handleDragEnd();
    }

    function hexToRgb(hex: string): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `${r}, ${g}, ${b}`;
        }
        return '52, 152, 219'; // fallback to default blue
    }

    onMount(() => {
        if (canvas) {
            drawCanvas();
        }
    });
</script>

<div class="forecast-table-container" style="--route-color: {routeColor}; --route-color-rgb: {hexToRgb(routeColor)};">

    <div class="table-container">
        <!-- Table Content -->
        <section class="table-content">
            <!-- Table Header -->
            <div class="table-header">
                <div class="time-column">Time</div>
                <div class="weather-column" on:click={() => onMetricClick('thunder')}>Weather</div>
                <div class="wind-column" on:click={() => onMetricClick('wind')}>Wind</div>
                <div class="gusts-column" on:click={() => onMetricClick('windGust')}>Gusts</div>
                <div class="waves-column" on:click={() => onMetricClick('waves')}>Waves</div>
            </div>

            <!-- Vertical Data List -->
            <div class="main-table">
                <div class="data-table vertical-scroll">
                    <div class="forecast-list">
                {#each hourlyData as data, index}
                    <!-- Waypoint beanie rows -->
                    {#each waypointPositions.filter(wp => wp.index === index) as waypoint}
                        <div class="waypoint-row-container">
                            <div class="start-beanie-row"
                                 class:dragging={isDragging && dragStartIndex === index && waypoint.isStart}
                                 class:waypoint-row={!waypoint.isStart}
                                 class:expanded={expandedWaypoints.has(waypoint.number)}
                                 draggable={waypoint.isStart ? "true" : "false"}
                                 on:dragstart={waypoint.isStart ? (e) => handleDragStart(e, index) : undefined}
                                 on:dragend={waypoint.isStart ? () => handleDragEnd() : undefined}
                                 on:click={() => toggleWaypointExpansion(waypoint.number)}>
                                <div class="start-beanie-content">
                                    <div class="waypoint-number">{waypoint.number}</div>
                                    <div class="waypoint-info">
                                        <div class="waypoint-time">{formatTime(data.timestamp)}</div>
                                        <div class="waypoint-date">{new Date(data.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                    </div>
                                    <div class="waypoint-speed">
                                        {#if getLegData(waypoint.number)}
                                            Avg: {getLegData(waypoint.number).averageSpeed}kts
                                        {:else}
                                            Avg: --kts
                                        {/if}
                                    </div>
                                    <div class="expand-chevron" class:rotated={expandedWaypoints.has(waypoint.number)}>∨</div>
                                </div>
                            </div>

                            <!-- Expanded content -->
                            {#if expandedWaypoints.has(waypoint.number)}
                                <div class="waypoint-expanded">
                                    <div class="expanded-content">
                                        {#if waypoint.number === 1}
                                            <div class="leg-stat">
                                                <label>Departure:</label>
                                                <input type="datetime-local"
                                                       value={new Date(data.timestamp).toISOString().slice(0, 16)}
                                                       on:change={(e) => console.log('Date changed:', e.target.value)} />
                                            </div>
                                        {/if}
                                        {#if getLegData(waypoint.number)}
                                            <div class="leg-stat">
                                                <label>Avg Speed:</label>
                                                <input type="number"
                                                       value={getLegData(waypoint.number).averageSpeed}
                                                       min="0.5" max="50" step="0.5"
                                                       on:change={(e) => handleAverageSpeedUpdate(waypoint.number, e.target.value)} />
                                                <span class="unit">kts</span>
                                            </div>
                                            <div class="leg-stat readonly">
                                                <label>Avg Wind:</label>
                                                <span>{getLegData(waypoint.number).avgWindSpeed}kts</span>
                                            </div>
                                            <div class="leg-stat readonly">
                                                <label>Max Gust:</label>
                                                <span>{getLegData(waypoint.number).maxGust}kts</span>
                                            </div>
                                            <div class="leg-stat readonly">
                                                <label>Leg Time:</label>
                                                <span>{getLegData(waypoint.number).legTime}</span>
                                            </div>
                                            <div class="leg-stat readonly">
                                                <label>Distance:</label>
                                                <span>{getLegData(waypoint.number).distance}</span>
                                            </div>
                                        {:else}
                                            <div class="leg-stat readonly">
                                                <label>No leg data available</label>
                                                <span>--</span>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}

                    <!-- Insert drop target row if dragging (only if not dropping back to original position) -->
                    {#if isDragging && dragDropTargetIndex === index && dragStartIndex !== index}
                        <div class="start-beanie-row"
                             style="opacity: 0.7;"
                             on:dragover|preventDefault={(e) => handleDragOver(e, index)}
                             on:dragleave={() => handleDragLeave()}
                             on:drop|preventDefault={(e) => handleDrop(e, index)}>
                            <div class="start-beanie-content">
                                <div class="waypoint-number">1</div>
                                <div class="start-time-text">{formatTime(data.timestamp)}</div>
                            </div>
                        </div>
                    {/if}

                    <div
                        class="forecast-item"
                        class:in-route={data.isInRoute}
                        on:mouseenter={() => handleHover(index)}
                        on:mouseleave={() => handleHover(null)}
                        on:dragover|preventDefault={(e) => handleDragOver(e, index)}
                        on:dragleave={() => handleDragLeave()}
                        on:drop|preventDefault={(e) => handleDrop(e, index)}
                    >
                        <div class="time-column">
                            <div class="time">{formatTime(data.timestamp)}</div>
                            <div class="date">{new Date(data.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        </div>

                        <div class="weather-column">
                            <img
                                src="/img/icons7/png_27@2x/{getWeatherIcon(data.forecast?.weather || 2)}"
                                alt="Weather"
                                class="weather-icon"
                            />
                            <div class="rain-value">{data.forecast?.precipitations?.toFixed(1) || '0'}mm</div>
                        </div>

                        <div class="wind-column">
                            <div class="metric-value">
                                {data.forecast?.northUp?.windSpeed?.toFixed(0) || '--'}kt
                                {#if data.forecast?.northUp?.windDirection !== undefined}
                                    <span class="wind-dir" style="transform: rotate({data.forecast.northUp.windDirection}deg)">↑</span>
                                {/if}
                            </div>
                        </div>

                        <div class="gusts-column">
                            <div class="metric-value gust-value">{data.forecast?.northUp?.gustsSpeed?.toFixed(0) || '--'}kt</div>
                        </div>

                        <div class="waves-column">
                            <div class="metric-value wave-value">
                                {data.forecast?.northUp?.wavesHeight?.toFixed(1) || '--'}m
                                {#if data.forecast?.northUp?.wavesDirection !== undefined}
                                    <span class="wave-dir" style="transform: rotate({data.forecast.northUp.wavesDirection}deg)">↑</span>
                                {/if}
                            </div>
                        </div>

                    </div>
                    {/each}
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>

<style lang="less">
    .forecast-table-container {
        background: #f5f5f5;
        overflow: hidden;
        height: 100%;
        margin: 0;
        padding: 0;
    }

    .table-container {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    @keyframes pulse-green {
        0%, 100% { box-shadow: 0 2px 6px rgba(0,0,0,0.2), 0 0 0 0 rgba(5, 150, 105, 0.7); }
        50% { box-shadow: 0 2px 6px rgba(0,0,0,0.2), 0 0 0 6px rgba(5, 150, 105, 0); }
    }

    @keyframes pulse-drop {
        0%, 100% { box-shadow: 0 1px 4px rgba(245, 158, 11, 0.4), 0 0 0 0 rgba(34, 197, 94, 0.7); }
        50% { box-shadow: 0 1px 4px rgba(245, 158, 11, 0.4), 0 0 0 4px rgba(34, 197, 94, 0); }
    }

    /* Table Content */
    .table-content {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .table-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: #f8f9fa;
        border-bottom: 2px solid #dee2e6;
        display: flex;
        align-items: center;
        padding: 8px 12px 8px 26px;
        font-weight: 600;
        font-size: 11px;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        .time-column {
            width: 52px;
            margin-right: 9px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            text-align: left;
        }

        .weather-column {
            width: 47px;
            margin-right: 9px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s ease;

            &:hover {
                background: rgba(0, 124, 186, 0.15);
                color: #007cba;
            }
        }

        .wind-column,
        .gusts-column,
        .waves-column {
            width: 60px;
            margin-right: 12px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s ease;
            padding: 6px;

            &:hover {
                background: rgba(0, 124, 186, 0.15);
                color: #007cba;
            }
        }
    }

    .main-table {
        display: flex;
        flex-direction: column;
        background: white;
        height: 100%;
        flex: 1;
    }

    .legend-wrapper {
        display: none; /* Hide legend for vertical layout */
    }

    .legend {
        padding: 0;

        .flex-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 15px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.2s ease;

            &:hover {
                background: #f8f9fa;
            }

            &.legend-temp {
                background: rgba(116, 185, 255, 0.05);
            }

            &.legend-rain {
                background: rgba(74, 144, 226, 0.05);
            }

            &.legend-wind {
                background: rgba(51, 51, 51, 0.05);
            }

            &.legend-windGust {
                background: rgba(102, 102, 102, 0.05);
            }

            &.legend-waves {
                background: rgba(0, 102, 204, 0.05);
            }
        }

        .legend-left {
            font-size: 13px;
            color: #333;
            font-weight: 500;
        }

        .legend-right {
            font-size: 12px;
            color: #666;

            &.metric-clickable {
                color: #007cba;
                font-weight: bold;
                cursor: pointer;

                &:hover {
                    text-decoration: underline;
                    color: #005a87;
                }
            }
        }
    }

    .data-table {
        flex: 1;
        overflow-x: visible;
        overflow-y: auto;
        height: 100%;

        &.vertical-scroll {
            padding: 0;
            padding-left: 12px;
        }
    }

    .forecast-list {
        display: flex;
        flex-direction: column;
        overflow: visible;
    }

    .forecast-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        border-left: 4px solid transparent;
        background: white;
        transition: background 0.2s ease;
        min-height: 50px;

        &:hover {
            background: #f8f9fa;
        }

        &.in-route {
            background: rgba(var(--route-color-rgb), 0.05);
            border-left: 4px solid var(--route-color);
        }

    }

    .forecast-item .time-column {
        width: 52px;
        margin-right: 9px;
        flex-shrink: 0;
        position: relative;

        .time {
            font-weight: bold;
            font-size: 13px;
            color: #333;
            line-height: 1.2;
        }

        .date {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }
    }

    .start-beanie-row {
        height: 12px;
        background: rgba(245, 158, 11, 0.8);
        display: flex;
        align-items: center;
        padding: 0 12px;
        position: relative;
        border-bottom: none;
        cursor: grab;
        z-index: 20;
        //margin: 2px 0;
        border-left: 4px solid var(--route-color);
        overflow: visible;

        &:active,
        &.dragging {
            cursor: grabbing;
        }

        &.waypoint-row {
            cursor: pointer;
            //background: rgba(var(--route-color-rgb), 0.15);
            transition: all 0.2s ease;

            &:hover {
                background: rgba(var(--route-color-rgb), 0.25);
            }

            .waypoint-number {
                background: var(--route-color);
                opacity: 0.8;
            }
        }


        .start-beanie-content {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            position: relative;
            height: 100%;
        }

        .waypoint-info {
            display: flex;
            flex-direction: row;
            gap: 6px;
            margin-left: 24px;

            .waypoint-date {
                font-size: 10px;
                color: #333 !important;
                font-weight: 500;
                line-height: 1;
                order: 1;
            }

            .waypoint-time {
                font-size: 10px;
                color: #333 !important;
                font-weight: 500;
                line-height: 1;
                order: 2;
            }
        }

        .waypoint-speed {
            font-size: 10px;
            color: #333 !important;
            font-weight: 500;
            line-height: 1;
            margin-left: auto;
            padding-right: 20px;
        }

        .expand-chevron {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
            color: #666 !important;
            transition: transform 0.2s ease;
            pointer-events: none;

            &.rotated {
                transform: translateY(-50%) rotate(180deg);
            }
        }

        .waypoint-number {
            position: absolute;
            left: -25px;
            background: var(--route-color);
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(var(--route-color-rgb), 0.4);
            border: 2px solid white;
            flex-shrink: 0;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;

            &:hover {
                transform: translateY(-50%) scale(1.1);
                box-shadow: 0 2px 6px rgba(var(--route-color-rgb), 0.6);
            }
        }

        .start-time-text {
            font-size: 10px;
            color: #666;
            font-weight: 500;
            margin-left: 24px;
        }

    }

    .waypoint-row-container {
        position: relative;
    }

    .waypoint-expanded {
        background: rgba(var(--route-color-rgb), 0.08);
        border-left: 4px solid var(--route-color);
        padding: 12px 16px;
        margin: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out, padding 0.3s ease-out;

        .expanded-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 20px;
            align-items: start;
        }

        .leg-stat {
            display: flex;
            flex-direction: column;
            gap: 4px;

            label {
                font-weight: 600;
                color: #444 !important;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            input {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 11px;
                background: white;
                color: #333 !important;

                &:focus {
                    outline: none;
                    border-color: var(--route-color);
                    box-shadow: 0 0 0 2px rgba(var(--route-color-rgb), 0.2);
                }
            }

            .unit {
                font-size: 10px;
                color: #666 !important;
                margin-left: 4px;
            }

            &.readonly {
                span {
                    color: #555 !important;
                    font-size: 11px;
                    font-weight: 500;
                    padding: 6px 0;
                    display: block;
                }
            }
        }
    }

    

    .forecast-item .weather-column {
        width: 47px;
        margin-right: 9px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;

        .weather-icon {
            width: 24px;
            height: 24px;
        }

        .rain-value {
            font-size: 10px;
            color: #4a90e2;
            font-weight: 500;
        }
    }

    .forecast-item .wind-column,
    .forecast-item .waves-column,
    .forecast-item .gusts-column {
        width: 60px;
        margin-right: 12px;
        padding: 6px;
        flex-shrink: 0;
        display: flex;
        justify-content: center;

        .metric-value {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
    }

    .wind-column {
        .wind-speed {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 2px;
        }

        .gust-speed {
            font-size: 11px;
            color: #666;
            font-weight: 500;
        }
    }

    .wind-dir, .wave-dir {
        display: inline-block;
        font-size: 16px;
        color: #007cba;
        transform-origin: center;
        transition: transform 0.3s ease;
    }

    .forecast-table {
        position: relative;
        cursor: grab;

        &:active {
            cursor: grabbing;
        }

        canvas {
            display: block;
        }
    }

    .rplanner-adjust-top {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;

        text {
            pointer-events: all;
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
                fill: #007cba !important;
                font-weight: bold;
                font-size: 14px;
            }
        }

        image {
            pointer-events: all;
            cursor: pointer;
            transition: transform 0.2s ease;

            &:hover {
                transform: scale(1.2);
            }
        }
    }

    .wind-directions {
        circle {
            transition: all 0.2s ease;
        }

        g:hover circle {
            fill: #e3f2fd;
            stroke: #007cba;
            stroke-width: 1;
        }
    }

    /* Scrollbar styling */
    .horizontal-scroll::-webkit-scrollbar {
        height: 10px;
    }

    .horizontal-scroll::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 5px;
    }

    .horizontal-scroll::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 5px;

        &:hover {
            background: #a8a8a8;
        }
    }

    .bg-gray-dark {
        background: #34495e;
    }

    .uiyellow {
        color: #f39c12;
    }
</style>