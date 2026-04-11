<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LegWaypoint from './LegWaypoint.svelte';
    import RouteDetail from './RouteDetail.svelte';
    import WeatherCell from './forecast-cells/WeatherCell.svelte';
    import DirectionIcon from './forecast-cells/DirectionIcon.svelte';
    import WindCell from './forecast-cells/WindCell.svelte';
    import WaveCell from './forecast-cells/WaveCell.svelte';
    import type { RouteForecast } from '../types/WeatherTypes';
    import type { RouteDefinition } from '../types/RouteTypes';
    import { formatRelativeDirection, formatPrecipitation, formatWaveHeight, formatWindSpeed } from '../utils/FormatUtils';
    import { formatTime, formatWeekDayDate, formatTimeAgo } from '../utils/TimeUtils';
    import { computeSeaIndex } from '../utils/NavigationUtils';
    import { getWindColor, getSeaIndexColor, createGradientBackground, hexToRgb } from '../utils/ColorUtils';

    export let forecast: RouteForecast | null = null;
    export let routeColor: string = '#3498db';
    export let isLoading: boolean = false;
    export let showTrueWind: boolean = true;
    export let route: RouteDefinition | null = null;

    // Data that needs to be recalculated when forecast changes
    let hourlyData: any[] = [];
    let waypointPositions: any[] = [];

    // Refresh method to recalculate data
    function refresh() {
        if (forecast) {

            routeColor = forecast.route.color;

            // Recalculate data
            hourlyData = generateHourlyData();
            waypointPositions = calculateWaypointPositions();

            // Cache row positions after DOM updates and handle auto-scroll
            setTimeout(() => {
                cacheRowPositions();
                autoScrollToDeparture();
            }, 0);
        } else {
            // Generate placeholder data when loading, otherwise clear
            hourlyData = generateHourlyData(); // Will generate placeholder if isLoading
            waypointPositions = []; // No waypoints for placeholder data
            rowPositions = [];

            // Cache row positions for placeholder data
            if (hourlyData.length > 0) {
                setTimeout(() => cacheRowPositions(), 0);
            }
        }
    }

    // Reactive updates when forecast or showTrueWind changes
    $: if (forecast || showTrueWind !== undefined || isLoading) {
        refresh();
    }

    const dispatch = createEventDispatcher();

    let currentHoverIndex: number | null = null;
    let isDragging = false;
    let dragStartIndex: number | null = null;
    let dragDropTargetIndex: number | null = null;
    let autoScrollTimer: number | null = null;
    let tableScrollContainer: HTMLElement | null = null;
    let scrollContainer: HTMLElement | null = null;
    let rowPositions: Array<{top: number, bottom: number, index: number}> = [];



    function getSeaIndexForForecast(forecastData: any): number {
        if (!forecastData?.northUp || !forecast?.route?.legs?.[0]) {
            return 0;
        }

        const waveHeight = forecastData.northUp.wavesHeight || 0;
        const wavePeriod = forecastData.northUp.wavesPeriod || 8;
        const waveDirection = forecastData.northUp.wavesDirection || 0;
        const boatSpeed = forecast.route.legs[0].averageSpeed || 5;
        const boatCourse = forecast.route.legs[0].course || 0;

        return computeSeaIndex(waveHeight, wavePeriod, waveDirection, boatSpeed, boatCourse);
    }



    

    function generateHourlyData() {
        if (!forecast) {
            // If loading and no forecast yet, create empty placeholder rows
            if (isLoading) {
                return generatePlaceholderRows();
            }
            return [];
        }

        if (!forecast.pointForecasts.length) return [];

        const startTime = forecast.route.departureTime;
        const endTime = forecast.route.arrivalTime;

        // Use the actual forecast points directly - they're already hourly
        return forecast.pointForecasts.map(forecastPoint => ({
            timestamp: forecastPoint.timestamp,
            isInRoute: forecastPoint.timestamp >= startTime && forecastPoint.timestamp <= endTime,
            forecast: forecastPoint,
            hour: new Date(forecastPoint.timestamp).getHours(),
            day: new Date(forecastPoint.timestamp).getDate()
        }));
    }

    function generatePlaceholderRows() {
        // Generate 24 hours of placeholder data starting from now
        const now = Date.now();
        const nextHour = Math.ceil(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
        const placeholderRows = [];

        for (let i = 0; i < 24; i++) {
            const timestamp = nextHour + (i * 60 * 60 * 1000);
            placeholderRows.push({
                timestamp,
                isInRoute: false, // All placeholder rows are not in route
                forecast: null, // No actual forecast data
                hour: new Date(timestamp).getHours(),
                day: new Date(timestamp).getDate(),
                isPlaceholder: true
            });
        }

        return placeholderRows;
    }

    function calculateWaypointPositions() {
        if (!hourlyData.length || !forecast) return [];

        const routeWaypoints = forecast.route.waypoints;
        const totalWaypoints = routeWaypoints.length;
        const routeLegs = forecast.route.legs;

        if (totalWaypoints === 0) return [];

        const waypoints = [];

        // Calculate waypoint positions based on actual leg start times
        for (let i = 0; i < totalWaypoints; i++) {
            let waypointTime;

            if (i === 0) {
                // First waypoint - use departure time
                waypointTime = forecast.route.departureTime;
            } else if (i < routeLegs.length + 1) {
                // Intermediate waypoints - use leg start time (which is end of previous leg)
                waypointTime = routeLegs[i - 1].endTime;
            } else {
                // Last waypoint - use arrival time
                waypointTime = forecast.route.arrivalTime;
            }

            const waypointIndex = hourlyData.findIndex(h => h.timestamp >= waypointTime);

            if (waypointIndex >= 0) {
                waypoints.push({
                    index: waypointIndex,
                    number: i + 1,
                    timestamp: waypointTime,
                    isStart: i === 0
                });
            }
        }

        return waypoints;
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
            const containerRect = scrollContainer!.getBoundingClientRect();
            rowPositions.push({
                top: rect.top - containerRect.top + scrollContainer!.scrollTop,
                bottom: rect.bottom - containerRect.top + scrollContainer!.scrollTop,
                index: index
            });
        });
    }

    function autoScrollToDeparture() {
        if (!scrollContainer || !forecast || rowPositions.length === 0) return;

        // Only auto-scroll if currently at the top (user hasn't manually scrolled)
        if (scrollContainer.scrollTop > 0) return;

        const now = Date.now();
        const departureTime = forecast.route.departureTime;

        // Determine target time: departure (if pre-departure) or current time (if post-departure)
        const targetTime = now < departureTime ? departureTime : now;
        const fourHoursBeforeTarget = targetTime - (4 * 60 * 60 * 1000);

        // Find the index of the forecast point closest to 4 hours before target
        let targetIndex = -1;
        let closestTimeDiff = Infinity;

        for (let i = 0; i < hourlyData.length; i++) {
            const timeDiff = Math.abs(hourlyData[i].timestamp - fourHoursBeforeTarget);
            if (timeDiff < closestTimeDiff) {
                closestTimeDiff = timeDiff;
                targetIndex = i;
            }
        }

        // Scroll to show the target row if found
        if (targetIndex >= 0 && targetIndex < rowPositions.length) {
            const targetRow = rowPositions[targetIndex];

            // Position the target row at the top of visible area to show 4h before departure prominently
            const offsetFromTop = 0; // Show target row at the very top
            const targetScrollTop = Math.max(0, targetRow.top - offsetFromTop);

            const targetLabel = now < departureTime ? 'departure' : 'current time';
            console.log(`Auto-scrolling to ${new Date(fourHoursBeforeTarget).toISOString()} (4h before ${targetLabel})`);
            scrollContainer.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        }
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

    // Helper functions to get wind data based on showTrueWind setting
    function getWindSpeed(forecastData: any): number {
        if (showTrueWind) {
            return forecastData?.northUp?.windSpeed || 0;
        } else {
            return forecastData?.apparent?.windSpeed || 0;
        }
    }




    function getGustSpeed(forecastData: any): number {
        if (showTrueWind) {
            return forecastData?.northUp?.gustsSpeed || 0;
        } else {
            return forecastData?.apparent?.gustsSpeed || 0;
        }
    }

    function getForecastFreshness(forecastData: any, sailingHour: number): { level: string; color: string; tooltip: string } | null {
        if (!forecastData?.forecastTimestamp) {
            return null;
        }

        // Calculate the absolute time difference in minutes first
        const timeDiffMinutes = Math.abs(sailingHour - forecastData.forecastTimestamp) / (1000 * 60);
        const hoursDiff = timeDiffMinutes / 60;

        const forecastTimeStr = new Date(forecastData.forecastTimestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });

        if (timeDiffMinutes < 90) { // Less than 1.5 hours
            return {
                level: 'fresh',
                color: '#22c55e', // green
                tooltip: `Fresh forecast from ${forecastTimeStr}`
            };
        } else if (hoursDiff < 6) {
            return {
                level: 'good',
                color: '#eab308', // yellow
                tooltip: `Forecast from ${forecastTimeStr} (${Math.round(hoursDiff)}h off)`
            };
        } else if (hoursDiff < 12) {
            return {
                level: 'stale',
                color: '#f97316', // orange
                tooltip: `Stale forecast from ${forecastTimeStr} (${Math.round(hoursDiff)}h off)`
            };
        } else {
            return {
                level: 'very-stale',
                color: '#ef4444', // red
                tooltip: `Very stale forecast from ${forecastTimeStr} (${Math.round(hoursDiff)}h off)`
            };
        }
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
            if (newStartTime && forecast?.route) {
                console.log(`Moving route start from ${formatTime(hourlyData[dragStartIndex].timestamp)} to ${formatTime(newStartTime)}`);

                // Update the route departure time directly
                forecast.route.setDepartureTime(newStartTime);

                // Dispatch updated route to trigger forecast regeneration
                dispatch('routeUpdated', {
                    route: forecast.route
                });
            }
        }

        handleDragEnd();
    }


    function handleLegSpeedUpdate(event: any) {
        const { legIndex, newSpeed } = event.detail;
        console.log(`Updating leg ${legIndex} speed to ${newSpeed}`);

        if (forecast?.route && legIndex >= 0 && legIndex < forecast.route.legs.length) {
            const speed = parseFloat(newSpeed);
            if (!isNaN(speed) && speed > 0) {
                // Update the route leg speed using the proper method
                forecast.route.setLegSpeed(legIndex, speed);

                // Dispatch with the updated route
                dispatch('routeUpdated', {
                    route: forecast.route
                });
            }
        }
    }

    function handleRouteUpdated(event: any) {
        // Forward the routeUpdated event to parent
        dispatch('routeUpdated', event.detail);
    }

    function isCurrentHour(timestamp: number): boolean {
        const now = Date.now();
        const currentHourStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
        const currentHourEnd = currentHourStart + (60 * 60 * 1000);

        return timestamp >= currentHourStart && timestamp < currentHourEnd;
    }

</script>

<div class="forecast-table-container" style="--route-color: {routeColor}; --route-color-rgb: {hexToRgb(routeColor)};" class:loading={isLoading}>

    <div class="table-container">
        <!-- Table Content -->
        <section class="table-content">
            <!-- Route Summary -->
            {#if route}
                <RouteDetail
                    route={route}
                    routeStats={forecast?.routeStats || null}
                    on:routeUpdated={handleRouteUpdated}
                />
            {/if}

            <!-- Table Header -->
            <div class="table-header">
                <div class="time-column">Time</div>
                <div class="weather-column" on:click={() => onMetricClick('rain')}>Weather</div>
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
                        <div
                            class:dragging={isDragging && dragStartIndex === index && waypoint.isStart}
                            draggable={waypoint.isStart ? "true" : "false"}
                            on:dragstart={waypoint.isStart ? (e) => handleDragStart(e, index) : undefined}
                            on:dragend={waypoint.isStart ? () => handleDragEnd() : undefined}
                        >
                            <LegWaypoint
                                waypointNumber={waypoint.number}
                                isStart={waypoint.isStart}
                                leg={waypoint.number <= forecast.route.legs.length ? forecast.route.legs[waypoint.number - 1] : null}
                                legStats={waypoint.number <= forecast.legStats.length ? forecast.legStats[waypoint.number - 1] : null}
                                arrivalTime={waypoint.number === forecast.route.waypoints.length ? forecast.route.arrivalTime : null}
                                {routeColor}
                                on:speedUpdate={(e) => handleLegSpeedUpdate({ detail: e.detail })}
                            />
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
                        class:current-hour={isCurrentHour(data.timestamp)}
                        on:mouseenter={() => handleHover(index)}
                        on:mouseleave={() => handleHover(null)}
                        on:dragover|preventDefault={(e) => handleDragOver(e, index)}
                        on:dragleave={() => handleDragLeave()}
                        on:drop|preventDefault={(e) => handleDrop(e, index)}
                    >
                        <div class="time-column">
                            <div class="time-row">
                                <div class="time-line">
                                    <div class="time">{formatTime(data.timestamp)}</div>
                                    {#if data.forecast && getForecastFreshness(data.forecast, data.timestamp)}
                                        {@const freshness = getForecastFreshness(data.forecast, data.timestamp)}
                                        {#if freshness.level !== 'fresh'}
                                            <div class="freshness-indicator" style="color: {freshness.color}" title={freshness.tooltip}>
                                                ⚠
                                            </div>
                                        {/if}
                                    {/if}
                                </div>
                                <div class="date">{formatWeekDayDate(data.timestamp)}</div>
                            </div>
                        </div>

                        <div class="weather-column">
                            <WeatherCell
                                forecast={data.forecast}
                            />
                        </div>

                        <div class="wind-column" style="background: {createGradientBackground(
                            getWindSpeed(data.forecast),
                            index > 0 ? getWindSpeed(hourlyData[index - 1].forecast) : null,
                            index < hourlyData.length - 1 ? getWindSpeed(hourlyData[index + 1].forecast) : null,
                            getWindColor
                        )}">
                            <div class="metric-value combined-wind">
                                <WindCell
                                    forecast={data.forecast}
                                    apparent={!showTrueWind}
                                    isGust={false}
                                />
                            </div>
                        </div>

                        <div class="gusts-column" style="background: {createGradientBackground(
                            getGustSpeed(data.forecast),
                            index > 0 ? getGustSpeed(hourlyData[index - 1].forecast) : null,
                            index < hourlyData.length - 1 ? getGustSpeed(hourlyData[index + 1].forecast) : null,
                            getWindColor
                        )}">
                            <div class="metric-value combined-gust">
                                <WindCell
                                    forecast={data.forecast}
                                    apparent={!showTrueWind}
                                    isGust={true}
                                />
                            </div>
                        </div>

                        <div class="waves-column" style="background: {createGradientBackground(
                            getSeaIndexForForecast(data.forecast),
                            index > 0 ? getSeaIndexForForecast(hourlyData[index - 1].forecast) : null,
                            index < hourlyData.length - 1 ? getSeaIndexForForecast(hourlyData[index + 1].forecast) : null,
                            getSeaIndexColor
                        )}">
                            <div class="metric-value wave-value combined-wave">
                                <WaveCell
                                    forecast={data.forecast}
                                    apparent={!showTrueWind}
                                />
                            </div>
                        </div>

                    </div>
                    {/each}
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Footer with forecast update timestamp -->
    <div class="forecast-table-footer">
        {#if forecast?.forecastWindow?.updated}
            <p>Updated {formatTimeAgo(forecast.forecastWindow.updated)}</p>
        {:else}
            <p>&nbsp;</p>
        {/if}
    </div>
</div>

<style lang="less">

    // Main Container
    .forecast-table-container {
        background: #f5f5f5;
        margin: 0;
        padding: 0;
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;

        &.loading {
            opacity: 0.6;
            pointer-events: none;
        }
    }

    // Container Layout
    .table-container {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 0; /* Force flex to constrain height */
    }

    .table-content {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    // Common column base styles
    .column-base {
        min-width: 60px;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }

    .clickable-column {
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s ease;

        &:hover {
            background: rgba(0, 124, 186, 0.15);
            color: #007cba;
        }
    }

    // Table Header
    .table-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: #f8f9fa;
        border-bottom: 2px solid #dee2e6;
        display: flex;
        align-items: center;
        padding: 8px 16px 8px 20px;
        font-weight: 600;
        font-size: 11px;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        .time-column {
            .column-base();
        }

        .weather-column {
            .column-base();
            .clickable-column();
        }

        .wind-column,
        .gusts-column,
        .waves-column {
            .column-base();
            .clickable-column();
            padding: 6px;
        }
    }

    // Main table layout
    .main-table {
        display: flex;
        flex-direction: column;
        background: white;
        flex: 1;
        height: 0; /* Force flex to constrain height */
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

    // Forecast item base styles
    .forecast-item {
        display: flex;
        align-items: center;
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

        &.current-hour {
            background: #e6e6e6;

            &.in-route {
                background: rgba(var(--route-color-rgb), 0.15);
            }
        }
    }

    .forecast-item .time-column {
        min-width: 60px;
        flex: 1;
        margin-left: 8px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;

        .time-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
        }

        .time-line {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .time {
            font-weight: bold;
            font-size: 13px;
            color: #333;
            line-height: 1.2;
        }

        .freshness-indicator {
            font-size: 12px;
            cursor: help;
            line-height: 1;
            opacity: 0.8;

            &:hover {
                opacity: 1;
                transform: scale(1.1);
            }
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
        border-left: 4px solid var(--route-color);
        overflow: visible;
        border-top: 2px solid white;
        border-bottom: 2px solid white;

        &:active,
        &.dragging {
            cursor: grabbing;
        }

        .start-beanie-content {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            position: relative;
            height: 100%;
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


    

    .forecast-item .weather-column {
        min-width: 60px;
        flex: 1;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    // Common metric column styles
    .metric-column-base {
        .column-base();
        padding: 6px;
        min-height: 50px;
        position: relative;

        .metric-value {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
            position: relative;
            z-index: 1;
            width: 100%;
        }

        .combined-metric {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
        }

        .metric-text {
            font-size: 14px;
            font-weight: bold;
            line-height: 1.1;
            text-align: center;
            white-space: nowrap;
        }
    }

    // Forecast item columns
    .forecast-item {
        .wind-column,
        .gusts-column {
            .metric-column-base();

            .metric-value.combined-wind,
            .metric-value.combined-gust {
                .combined-metric();
            }

            .wind-text,
            .gust-text {
                .metric-text();
            }
        }

        .waves-column {
            .metric-column-base();

            .metric-value.combined-wave {
                .combined-metric();
            }

            .wave-text {
                .metric-text();

                .wave-height {
                    font-size: 14px;
                    font-weight: bold;
                }

                .wave-period {
                    font-size: 10px;
                    font-weight: 500;
                    opacity: 0.8;
                    margin-left: 2px;
                }
            }
        }
    }



    .forecast-table-footer {
        padding: 8px 16px;
        border-top: 1px solid #dee2e6;
        background: #f8f9fa;
        text-align: right;

        p {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
        }
    }

</style>