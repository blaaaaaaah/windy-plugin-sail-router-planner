<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LegWaypoint from './LegWaypoint.svelte';
    import RouteDetail from './RouteDetail.svelte';
    import WeatherCell from './forecast-cells/WeatherCell.svelte';
    import WindCell from './forecast-cells/WindCell.svelte';
    import WaveCell from './forecast-cells/WaveCell.svelte';
    import TimeCell from './forecast-cells/TimeCell.svelte';
    import ScrollableForecastTable from './ScrollableForecastTable.svelte';
    import DraggableWaypointForecastTable from './DraggableWaypointForecastTable.svelte';
    import DraggableWaypoint from './DraggableWaypoint.svelte';
    import type { RouteForecast } from '../types/WeatherTypes';
    import { formatTime, formatTimeAgo } from '../utils/TimeUtils';
    import { computeSeaIndex } from '../utils/NavigationUtils';
    import { getWindColor, getSeaIndexColor, createGradientBackground, hexToRgb } from '../utils/ColorUtils';

    export let forecast: RouteForecast | null = null;
    export let routeColor: string = '#3498db';
    export let showTrueWind: boolean = true;

    // Derived state from forecast
    $: isLoading = forecast === null || forecast?.pointForecasts === null;
    $: route = forecast?.route || null;

    // Track current route ID to detect route changes
    let currentRouteId: string | null = null;
    let scrollToIndex: number | null = null;

    // Data that needs to be recalculated when forecast changes
    let hourlyData: any[] = [];
    let waypointPositions: any[] = [];

    // Refresh method to recalculate data
    function refresh() {
        if (forecast) {
            routeColor = forecast.route.color;

            // Check if this is a new route
            const isNewRoute = currentRouteId !== forecast.route.id;
            if (isNewRoute) {
                currentRouteId = forecast.route.id;
                scrollToIndex = null; // Reset scroll index for new route
            }

            // Only regenerate data if we have actual forecast data
            // This preserves existing data during loading states
            if (forecast.pointForecasts) {
                hourlyData = generateHourlyData();
                waypointPositions = calculateWaypointPositions();

                // Calculate scroll index when we don't have one yet and data is available
                if (scrollToIndex === null && hourlyData.length > 0) {
                    scrollToIndex = calculateScrollIndex(hourlyData, forecast.route.departureTime);
                    console.log(`Setting scrollToIndex to ${scrollToIndex} for route ${forecast.route.id}`);
                }
            } else if (isNewRoute) {
                // New route with no data yet - show placeholders
                hourlyData = generateHourlyData();
                waypointPositions = [];
            }
            // If same route but no pointForecasts (loading), keep existing data

        } else {
            // No forecast available - clear data
            currentRouteId = null;
            scrollToIndex = null;
            hourlyData = generateHourlyData(); // Will generate placeholder when isLoading
            waypointPositions = []; // No waypoints when no forecast
        }
    }

    // Reactive updates when forecast or showTrueWind changes
    $: if (forecast || showTrueWind !== undefined) {
        refresh();
    }


    const dispatch = createEventDispatcher();


    

    // functions to handle data generation and processing for the table

    function handleRowHover(event: CustomEvent) {
        const index = event.detail.index;
        if (index !== null && hourlyData[index]) {
            dispatch('timeHover', {
                timestamp: hourlyData[index].timestamp,
                forecast: hourlyData[index].forecast
            });
        }    
    }

    function calculateScrollIndex(hourlyData: any[], departureTime: number): number | null {
        if (!hourlyData.length) return null;

        const now = Date.now();
        const targetTime = now < departureTime ? departureTime : now;
        const fourHoursBeforeTarget = targetTime - (4 * 60 * 60 * 1000);

        // Find closest index
        let bestIndex = 0;
        let closestDiff = Infinity;

        for (let i = 0; i < hourlyData.length; i++) {
            const diff = Math.abs(hourlyData[i].timestamp - fourHoursBeforeTarget);
            if (diff < closestDiff) {
                closestDiff = diff;
                bestIndex = i;
            }
        }

        return bestIndex;
    }

    function generateHourlyData() {
        if (!forecast) {
            return generatePlaceholderRows();
        }

        if (!forecast.pointForecasts) {
            return generatePlaceholderRows();
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


    function isCurrentHour(timestamp: number): boolean {
        const now = Date.now();
        const currentHourStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
        const currentHourEnd = currentHourStart + (60 * 60 * 1000);

        return timestamp >= currentHourStart && timestamp < currentHourEnd;
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

    function getSeaIndexForForecast(forecastData: any): number {
        if (!forecastData?.northUp || !forecast?.route?.legs?.[0]) {
            return 0;
        }

        const waveHeight = forecastData.northUp.wavesHeight;
        const wavePeriod = forecastData.northUp.wavesPeriod;
        const waveDirection = forecastData.northUp.wavesDirection;
        const boatSpeed = forecast.route.legs[0].averageSpeed;
        const boatCourse = forecast.route.legs[0].course;

        return computeSeaIndex(waveHeight, wavePeriod, waveDirection, boatSpeed, boatCourse);
    }



    // Handle waypoint index changes from drag operations
    function handleWaypointIndexChanged(event: CustomEvent) {
        const { fromIndex, toIndex } = event.detail;

        if (fromIndex !== null && toIndex !== fromIndex) {
            const newStartTime = hourlyData[toIndex]?.timestamp;
            if (newStartTime && forecast?.route) {
                console.log(`Moving route start from ${formatTime(hourlyData[fromIndex].timestamp)} to ${formatTime(newStartTime)}`);

                // Update the route departure time directly
                forecast.route.setDepartureTime(newStartTime);

                // Dispatch updated route to trigger forecast regeneration
                dispatch('routeUpdated', {
                    route: forecast.route
                });
            }
        }
    }



    // functions that will dispatch events

    function onMetricClick(metric: string) {
        dispatch('metricClick', { metric });
    }

    function handleWindModeChange(trueWind: boolean) {
        showTrueWind = trueWind;
        dispatch('windModeChanged', { showTrueWind: trueWind });
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
                <DraggableWaypointForecastTable
                     on:waypointIndexChanged={handleWaypointIndexChanged}
                     let:isDragging
                     let:dragStartIndex
                     let:dragDropTargetIndex>
                    <ScrollableForecastTable
                         {scrollToIndex}
                         on:rowHover={handleRowHover}>
                    <div class="forecast-list">
                {#each hourlyData as data, index}
                    <!-- Waypoint beanie rows -->
                    {#each waypointPositions.filter(wp => wp.index === index) as waypoint}
                        {#if waypoint.isStart}
                            <DraggableWaypoint {index}>
                                <LegWaypoint
                                    waypointNumber={waypoint.number}
                                    isStart={waypoint.isStart}
                                    leg={waypoint.number <= forecast.route.legs.length ? forecast.route.legs[waypoint.number - 1] : null}
                                    legStats={waypoint.number <= forecast.legStats.length ? forecast.legStats[waypoint.number - 1] : null}
                                    arrivalTime={waypoint.number === forecast.route.waypoints.length ? forecast.route.arrivalTime : null}
                                    {routeColor}
                                    on:speedUpdate={(e) => handleLegSpeedUpdate({ detail: e.detail })}
                                />
                            </DraggableWaypoint>
                        {:else}
                            <LegWaypoint
                                waypointNumber={waypoint.number}
                                isStart={waypoint.isStart}
                                leg={waypoint.number <= forecast.route.legs.length ? forecast.route.legs[waypoint.number - 1] : null}
                                legStats={waypoint.number <= forecast.legStats.length ? forecast.legStats[waypoint.number - 1] : null}
                                arrivalTime={waypoint.number === forecast.route.waypoints.length ? forecast.route.arrivalTime : null}
                                {routeColor}
                                on:speedUpdate={(e) => handleLegSpeedUpdate({ detail: e.detail })}
                            />
                        {/if}
                    {/each}

                    <!-- Insert drop target row if dragging (only if not dropping back to original position) -->
                    {#if isDragging && dragDropTargetIndex === index && dragStartIndex !== index}
                        <div class="start-beanie-row"
                             style="opacity: 0.7;">
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
                        data-index={index}
                    >
                        <div class="time-column">
                            <TimeCell
                                forecast={data.forecast}
                                timestamp={data.timestamp}
                            />
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
                    </ScrollableForecastTable>
                </DraggableWaypointForecastTable>
            </div>
        </section>
    </div>

    <!-- Footer with wind toggle and timestamp -->
    <div class="forecast-table-footer">
        <div class="footer-left">
            <span class="wind-toggle">
                <span
                    class="toggle-option"
                    class:active={showTrueWind}
                    on:click={() => handleWindModeChange(true)}
                >
                    True
                </span>
                <span class="toggle-separator">/</span>
                <span
                    class="toggle-option"
                    class:active={!showTrueWind}
                    on:click={() => handleWindModeChange(false)}
                >
                    Apparent
                </span>
            </span>
        </div>
        <div class="footer-right">
            {#if forecast?.forecastWindow?.updated}
                <p>Updated {formatTimeAgo(forecast.forecastWindow.updated)}</p>
            {:else}
                <p>&nbsp;</p>
            {/if}
        </div>
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

        &.loading .table-container {
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
            margin-left: 8px;
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

        &:active {
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


    

    // Forecast item columns
    .forecast-item {
        .time-column,
        .weather-column,
        .wind-column,
        .gusts-column,
        .waves-column {
            .column-base();
            min-height: 50px;
            position: relative;
        }

        .time-column {
            margin-left: 8px;
        }
    }





    .forecast-table-footer {
        padding: 8px 16px;
        border-top: 1px solid #dee2e6;
        background: #f8f9fa;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .footer-left {
            display: flex;
            align-items: center;
        }

        .footer-right {
            display: flex;
            align-items: center;
        }

        p {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
        }
    }

    .wind-toggle {
        font-size: 12px;
        color: #6c757d;
        display: inline-flex;
        align-items: center;

        .toggle-option {
            cursor: pointer;
            transition: color 0.2s ease;
            font-weight: 500;
            padding: 4px 6px;
            border-radius: 3px;
            color: #6c757d;

            &.active {
                color: #495057;
                font-weight: 600;
                background: rgba(108, 117, 125, 0.1);
            }

            &:not(.active):hover {
                color: #495057;
                background: rgba(108, 117, 125, 0.05);
            }
        }

        .toggle-separator {
            margin: 0 4px;
            color: #adb5bd;
        }
    }

</style>