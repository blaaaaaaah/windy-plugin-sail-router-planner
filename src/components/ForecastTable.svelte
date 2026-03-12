<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { RouteForecast } from '../types/WeatherTypes';

    export let forecast: RouteForecast | null = null;
    export let routeColor: string = '#3498db';
    export let isLoading: boolean = false;

    // Data that needs to be recalculated when forecast changes
    let hourlyData: any[] = [];
    let waypointPositions: any[] = [];

    // Debug reactive updates and recalculate data when forecast changes
    $: if (forecast) {
        console.log('ForecastTable: forecast updated, pointForecasts:', forecast.pointForecasts?.length || 0);
        console.log('ForecastTable: forecast route waypoints:', forecast.route?.waypoints?.length || 0);

        routeColor = forecast.route.color;

        // Recalculate data when forecast changes
        hourlyData = generateHourlyData();
        waypointPositions = calculateWaypointPositions();
        console.log('ForecastTable: recalculated hourlyData:', hourlyData.length, 'waypointPositions:', waypointPositions.length);

        // Cache row positions after DOM updates
        setTimeout(() => cacheRowPositions(), 0);
    } else {
        // Clear data when no forecast
        hourlyData = [];
        waypointPositions = [];
        rowPositions = [];
    }

    const dispatch = createEventDispatcher();

    let currentHoverIndex: number | null = null;
    let isDragging = false;
    let dragStartIndex: number | null = null;
    let dragDropTargetIndex: number | null = null;
    let autoScrollTimer: number | null = null;
    let tableScrollContainer: HTMLElement | null = null;
    let expandedWaypoints: Set<number> = new Set();
    let scrollContainer: HTMLElement | null = null;
    let rowPositions: Array<{top: number, bottom: number, index: number}> = [];


    // Create windDetail color object using Windy's Color system




    let windDetailColor:any = null
    let wavesDetailColor:any = null

    // Color helper function using windDetail palette
    function getWindColor(windSpeedMs: number): string {
        if ( ! windDetailColor ) {
            try {
                windDetailColor = new W.Color.Color({
                    ident: "windDetail",
                    default: [
                        [0,"rgb(243,243,243)"],
                        [3,"rgb(243,243,243)"],
                        [4,"rgb(0,200,254)"],
                        [6,"rgb(0,230,0)"],
                        [10,"rgb(254,174,0)"],
                        [19,"rgb(254,0,150)"],
                        [100,"rgb(151,50,222)"]
                    ]
                });
                console.log('windDetailColor created successfully');
            } catch (error) {
                console.error('Failed to create windDetail color:', error);
            }
        }
        if (windDetailColor && typeof windSpeedMs === 'number' && !isNaN(windSpeedMs)) {
            try {
                return windDetailColor.getColor().color(windSpeedMs);
            } catch (error) {
                console.warn('WindDetail color failed:', error);
            }
        }
        return 'rgba(0, 119, 190, 0.1)'; // fallback
    }

    function getWaveColor(waveHeightMeters: number): string {
        if ( ! wavesDetailColor ) {
            try {
                wavesDetailColor = new W.Color.Color({
                    ident: "wavesDetail",
                    default: [
                        [0, "rgba(255,255,255,0)"],
                        [0.1, "rgba(255,255,255,0)"],
                        [1, "rgb(180,180,255)"],
                        [2.5, "rgb(254,174,0)"],
                        [20, "rgb(255,255,255)"]
                    ]
                });
                console.log('wavesDetailColor created successfully');
            } catch (error) {
                console.error('Failed to create wavesDetail color:', error);
            }
        }
        if (wavesDetailColor && typeof waveHeightMeters === 'number' && !isNaN(waveHeightMeters)) {
            try {
                return wavesDetailColor.getColor().color(waveHeightMeters);
            } catch (error) {
                console.warn('WavesDetail color failed:', error);
            }
        }
        return 'rgba(40, 146, 199, 0.1)'; // fallback
    }

    // Helper function to interpolate between two RGB colors
    function interpolateColors(color1: string, color2: string, factor: number = 0.5): string {
        const rgb1 = color1.match(/\d+/g)!.map(Number);
        const rgb2 = color2.match(/\d+/g)!.map(Number);

        const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * factor);
        const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * factor);
        const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * factor);

        return `rgb(${r},${g},${b})`;
    }

    function createGradientBackground(currentValue: number, prevValue: number | null, nextValue: number | null, colorFunc: (value: number) => string): string {
        const currentColor = colorFunc(currentValue);

        if (prevValue === null && nextValue === null) {
            // Single cell, use solid color
            return currentColor;
        }

        const prevColor = prevValue !== null ? colorFunc(prevValue) : currentColor;
        const nextColor = nextValue !== null ? colorFunc(nextValue) : currentColor;

        // Calculate blended colors at borders
        const topBlendColor = interpolateColors(prevColor, currentColor);  // Half between prev and current
        const bottomBlendColor = interpolateColors(currentColor, nextColor); // Half between current and next

        // Create gradient: top blend -> current color -> bottom blend
        return `linear-gradient(to bottom, ${topBlendColor} 0%, ${currentColor} 50%, ${bottomBlendColor} 100%)`;
    }


    

    function generateHourlyData() {
        if (!forecast) return [];

        const startTime = forecast.route.departureTime;
        const endTime = forecast.route.arrivalTime;

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


    function calculateWaypointPositions() {
        if (!hourlyData.length || !forecast) return [];

        const routeWaypoints = forecast.route.waypoints;
        const totalWaypoints = routeWaypoints.length;

        if (totalWaypoints === 0) return [];

        const waypoints = [];
        const startTime = forecast.route.departureTime;
        const endTime = forecast.route.arrivalTime;
        const routeDuration = endTime - startTime;

        // Calculate time intervals based on actual waypoint count
        for (let i = 0; i < totalWaypoints; i++) {
            const waypoint = routeWaypoints[i];

            // Use waypoint.estimatedTime if available, otherwise distribute evenly
            const legTime = waypoint.estimatedTime || (startTime + (i * routeDuration / (totalWaypoints - 1)));
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

        // Format leg time (duration is in milliseconds)
        const totalMinutes = Math.floor(leg.duration / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const legTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return {
            averageSpeed: leg.averageSpeed,
            avgWindSpeed: Math.round(mockWeatherStats.avgWindSpeed),
            maxGust: Math.round(mockWeatherStats.maxGust),
            legTime: legTime,
            distance: `${leg.distance.toFixed(1)}nm`
        };
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

    function cacheRowPositions() {
        if (!scrollContainer) return;

        rowPositions = [];
        const forecastItems = scrollContainer.querySelectorAll('.forecast-item');

        forecastItems.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            rowPositions.push({
                top: rect.top - containerRect.top + scrollContainer.scrollTop,
                bottom: rect.bottom - containerRect.top + scrollContainer.scrollTop,
                index: index
            });
        });
    }

    function handleScroll() {
        if (!scrollContainer || rowPositions.length === 0) return;

        const scrollTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.clientHeight;
        const centerY = scrollTop + (containerHeight / 2);

        // Find the row that contains the center Y position
        for (const row of rowPositions) {
            if (centerY >= row.top && centerY <= row.bottom) {
                if (currentHoverIndex !== row.index && hourlyData[row.index]) {
                    handleHover(row.index);
                }
                break;
            }
        }
    }


    function formatTime(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
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

</script>

<div class="forecast-table-container" style="--route-color: {routeColor}; --route-color-rgb: {hexToRgb(routeColor)};" class:loading={isLoading}>

    <div class="table-container">
        <!-- Table Content -->
        <section class="table-content">
            <!-- Table Header -->
            <div class="table-header">
                <div class="time-column">Time</div>
                <div class="weather-column" on:click={() => onMetricClick('thunder')}>Weather</div>
                <div class="wind-column" on:click={() => onMetricClick('wind')}>Wind</div>
                <div class="gusts-column" on:click={() => onMetricClick('gust')}>Gusts</div>
                <div class="waves-column" on:click={() => onMetricClick('waves')}>Waves</div>
            </div>

            <!-- Vertical Data List -->
            <div class="main-table">
                <div class="data-table vertical-scroll"
                     bind:this={scrollContainer}
                     on:scroll={handleScroll}>
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
                                        {#if getLegData(waypoint.number)}
                                            {@const legData = getLegData(waypoint.number)}
                                            {@const leg = forecast.route.legs[waypoint.number - 1]}
                                            <div class="leg-datetime">
                                                {#if waypoint.number === 1}
                                                    Departure: {new Date(leg.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {formatTime(leg.startTime)}
                                                {:else}
                                                    Leg {waypoint.number}: {new Date(leg.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {formatTime(leg.startTime)}
                                                {/if}
                                            </div>
                                            <div class="leg-distance">{leg.distance.toFixed(1)}nm</div>
                                            <div class="leg-speed">{leg.averageSpeed}knts</div>
                                            <div class="leg-duration">{legData.legTime}</div>
                                        {:else}
                                            {#if waypoint.number === forecast.route.waypoints.length}
                                                <div class="leg-datetime">
                                                    Arrival: {new Date(forecast.route.arrivalTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {formatTime(forecast.route.arrivalTime)}
                                                </div>
                                            {:else}
                                                <div class="leg-placeholder">No leg data</div>
                                            {/if}
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

                        <div class="wind-column" style="background: {createGradientBackground(
                            data.forecast?.northUp?.windSpeed || 0,
                            index > 0 ? hourlyData[index - 1].forecast?.northUp?.windSpeed || null : null,
                            index < hourlyData.length - 1 ? hourlyData[index + 1].forecast?.northUp?.windSpeed || null : null,
                            getWindColor
                        )}">
                            <div class="metric-value">
                                {data.forecast?.northUp?.windSpeed ? (data.forecast.northUp.windSpeed * 1.94384).toFixed(0) : '--'}kt
                                {#if data.forecast?.northUp?.windDirection !== undefined}
                                    <span class="wind-dir" style="transform: rotate({data.forecast.northUp.windDirection + 180}deg)">↑</span>
                                {/if}
                            </div>
                        </div>

                        <div class="gusts-column" style="background: {createGradientBackground(
                            data.forecast?.northUp?.gustsSpeed || 0,
                            index > 0 ? hourlyData[index - 1].forecast?.northUp?.gustsSpeed || null : null,
                            index < hourlyData.length - 1 ? hourlyData[index + 1].forecast?.northUp?.gustsSpeed || null : null,
                            getWindColor
                        )}">
                            <div class="metric-value gust-value">
                                {data.forecast?.northUp?.gustsSpeed ? (data.forecast.northUp.gustsSpeed * 1.94384).toFixed(0) : '--'}kt
                                {#if data.forecast?.northUp?.windDirection !== undefined}
                                    <span class="wind-dir" style="transform: rotate({data.forecast.northUp.windDirection + 180}deg)">↑</span>
                                {/if}
                            </div>
                        </div>

                        <div class="waves-column" style="background: {createGradientBackground(
                            data.forecast?.northUp?.wavesHeight || 0,
                            index > 0 ? hourlyData[index - 1].forecast?.northUp?.wavesHeight || null : null,
                            index < hourlyData.length - 1 ? hourlyData[index + 1].forecast?.northUp?.wavesHeight || null : null,
                            getWaveColor
                        )}">
                            <div class="metric-value wave-value">
                                {data.forecast?.northUp?.wavesHeight?.toFixed(1) || '--'}m
                                {#if data.forecast?.northUp?.wavesDirection !== undefined}
                                    <span class="wave-dir" style="transform: rotate({data.forecast.northUp.wavesDirection + 180}deg)">↑</span>
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
        position: relative;
    }

    .forecast-table-container.loading {
        opacity: 0.6;
        pointer-events: none;
    }

    .forecast-table-container.loading::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(248, 249, 250, 0.8);
        z-index: 100;
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
        padding: 0px 12px;
        //border-bottom: 1px solid #f0f0f0;
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
        height: 18px;
        background: rgba(var(--route-color-rgb), 0.8);
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
        border-top: 2px solid white;
        border-bottom: 2px solid white;

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
            justify-content: space-between;
            align-items: center;
            //margin-left: 24px;
            flex: 1;
            padding-right: 30px;

            .leg-datetime,
            .leg-distance,
            .leg-speed,
            .leg-duration {
                font-size: 10px;
                color: #333 !important;
                font-weight: 500;
                line-height: 1;
                white-space: nowrap;
                flex: 1;
                text-align: center;
            }

            .leg-datetime {
                text-align: left;
                flex: 1.5; /* Give more space for datetime since it's longer */
            }

            .leg-placeholder {
                font-size: 10px;
                color: #6c757d !important;
                font-style: italic;
                text-align: left;
                flex: 1.5;
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
        align-items: center;
        min-height: 50px;
        position: relative;

        .metric-value {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
            position: relative;
            z-index: 1;
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





    .bg-gray-dark {
        background: #34495e;
    }

    .uiyellow {
        color: #f39c12;
    }

</style>