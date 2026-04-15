<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LegWaypoint from './LegWaypoint.svelte';
    import RouteDetail from './RouteDetail.svelte';
    import WeatherCell from './forecast-cells/WeatherCell.svelte';
    import WindCell from './forecast-cells/WindCell.svelte';
    import WaveCell from './forecast-cells/WaveCell.svelte';
    import TimeCell from './forecast-cells/TimeCell.svelte';
    import RouteColorCell from './forecast-cells/RouteColorCell.svelte';
    import ScrollableForecastTable from './ScrollableForecastTable.svelte';
    import DraggableWaypointForecastTable from './DraggableWaypointForecastTable.svelte';
    import type { RouteForecast } from '../types/WeatherTypes';
    import { formatTime, formatTimeAgo } from '../utils/TimeUtils';
    import { ForecastTableDataSource, type ForecastTableRowData } from '../services/ForecastTableDataSource';
    import RouteFavoriteButton from './RouteFavoriteButton.svelte';

    export let forecast: RouteForecast | null = null;
    export let showTrueWind: boolean = true;

    // Derived state from forecast
    $: isLoading = forecast === null || forecast?.pointForecasts === null;





    // Track current route ID to detect route changes
    let currentRouteId: string | null = null;
    let scrollToTimestamp: number | null = null;

    // Data source and generated rows
    let dataSource: ForecastTableDataSource | null = null;
    let rowsData: ForecastTableRowData[] = [];

    // Refresh method to recalculate data
    function refresh() {
        if (forecast) {

            // Check if this is a new route
            const isNewRoute = currentRouteId !== forecast.route.id;
            if (isNewRoute) {
                currentRouteId = forecast.route.id;
                scrollToTimestamp = null; // Reset scroll index for new route
            }


            if (isNewRoute || forecast.pointForecasts !== null) {
                // Create or update data source (handles placeholders internally)
                dataSource = new ForecastTableDataSource(forecast);
                rowsData = dataSource.getRowsData(!showTrueWind); // showApparent = !showTrueWind
            }


            // Calculate scroll index when we don't have one yet and data is available
            if (forecast.pointForecasts && scrollToTimestamp === null && rowsData.length > 0) {
                scrollToTimestamp = calculateScrollTimestamp(rowsData, forecast.route.departureTime);
                console.log(`Setting scrollToTimestamp to ${scrollToTimestamp} for route ${forecast.route.id}`);
            }
            

        } else {
            // No forecast available - clear data
            currentRouteId = null;
            scrollToTimestamp = null;
            dataSource = null;
            rowsData = [];
        }
    }

    // Reactive updates when forecast changes
    $: if (forecast) {
        refresh();
    }

    // Efficient update when only wind mode changes (reuse existing data source)
    $: if (showTrueWind !== undefined) {
        updateRows();   // do not use other variables here because we want this to run only when showTrueWind changes, not on every forecast change
    }

    function updateRows() {
        if ( dataSource && forecast) {
            // Only regenerate rows data with new wind mode, keep the same data source instance
            rowsData = dataSource.getRowsData(!showTrueWind); // showApparent = !showTrueWind
            console.log('ForecastTableDataSource generated', rowsData.length, 'rows');
        }
    }


    const dispatch = createEventDispatcher();


    

    // functions to handle data generation and processing for the table

    function handleRowHover(event: CustomEvent) {
        const { timestamp }  = event.detail;
        dispatch('timeHover', {
            timestamp
        });

    }

    function toggleFavorite(event:CustomEvent) {
        const { route } = event.detail;
        dispatch('toggleFavorite', { route });
    }

    function calculateScrollTimestamp(rowsData: ForecastTableRowData[], departureTime: number): number | null {
        if (rowsData.length === 0) return null;

        const now = Date.now();
        const targetTime = now < departureTime ? departureTime : now;
        const fourHoursBeforeTarget = targetTime - (4 * 60 * 60 * 1000);

        // Find closest index among data rows only (since ScrollableForecastTable only counts .forecast-item)
        let bestDataRowIndex = 0;
        let closestDiff = Infinity;
        let dataRowCount = 0;

        for (let i = 0; i < rowsData.length; i++) {
            if (rowsData[i].type === 'row') {
                const diff = Math.abs(rowsData[i].timestamp - fourHoursBeforeTarget);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    bestDataRowIndex = dataRowCount; // Index among data rows only
                }
                dataRowCount++;
            }
        }

        return rowsData[bestDataRowIndex].timestamp;
    }


    // Handle waypoint index changes from drag operations
    function handleWaypointIndexChanged(event: CustomEvent) {
        const { fromTimestamp, toTimestamp, isDragging } = event.detail;

        console.log(`Waypoint timestamp change: from ${fromTimestamp} to ${toTimestamp}, isDragging: ${isDragging}`);

        if ( isDragging  ) {
            const dropTimestamp = toTimestamp == fromTimestamp ? null : toTimestamp;
            rowsData = dataSource!.getRowsData(!showTrueWind, dropTimestamp); // showApparent = !showTrueWind
        } else {
            if (fromTimestamp !== null && toTimestamp !== fromTimestamp ) {
                if (toTimestamp && forecast?.route) {
                    console.log(`Moving route start to ${formatTime(toTimestamp)}`);

                    // Update the route departure time directly
                    forecast.route.setDepartureTime(toTimestamp);

                    // Dispatch updated route to trigger forecast regeneration
                    dispatch('routeUpdated', {
                        route: forecast.route
                    });
                }
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

<div class="forecast-table-container" class:loading={isLoading}>

    <div class="table-container">
        <!-- Table Content -->
        <section class="table-content">
            <!-- Route Summary -->
            {#if forecast?.route}
                <RouteDetail
                    route={forecast.route}
                    routeStats={forecast?.routeStats || null}
                    on:routeUpdated={handleRouteUpdated}
                />
            {/if}

            <!-- Table Header -->
            <div class="table-header">
                <div class="time-column">Time</div>
                <div class="route-color-header"></div>
                <div class="weather-column" on:click={() => onMetricClick('rain')}>Weather</div>
                <div class="wind-column" on:click={() => onMetricClick('wind')}>Wind</div>
                <div class="gusts-column" on:click={() => onMetricClick('gust')}>Gusts</div>
                <div class="waves-column" on:click={() => onMetricClick('waves')}>Waves</div>
            </div>

            <!-- Vertical Data List -->
            <div class="main-table">
                <DraggableWaypointForecastTable
                     on:waypointIndexChanged={handleWaypointIndexChanged}
                >
                    <ScrollableForecastTable
                         {scrollToTimestamp}
                         on:rowHover={handleRowHover}>
                    <div class="forecast-list">
                {#each rowsData as rowData}
                    <div data-timestamp={rowData.timestamp}>

                        <!-- Waypoint  rows -->
                        {#if rowData.type === 'waypoint' && rowData.waypointData}
                            <LegWaypoint
                                waypointNumber={rowData.waypointData.number}
                                isStart={rowData.waypointData.isStart}
                                isLast={rowData.waypointData.isLast}
                                leg={rowData.waypointData.leg}
                                legStats={rowData.waypointData.stats}
                                departureTime={rowData.waypointData.departureTime}
                                arrivalTime={rowData.waypointData.arrivalTime}
                                color={rowData.waypointData.color}
                                dropGhost={rowData.waypointData.dropGhost}
                                on:speedUpdate={(e) => handleLegSpeedUpdate({ detail: e.detail })}

                                draggable={rowData.waypointData.isStart && !rowData.waypointData.dropGhost}
                            />
                        {/if}

                        

                        {#if rowData.type === 'row'}
                        <div
                            class="forecast-item"
                            class:current-hour={rowData.isCurrentHour}
                            data-timestamp={rowData.timestamp}
                        >
                            {#if rowData.cells}
                                {#each rowData.cells as cellData}
                                    {#if cellData.type === 'time'}
                                        <div class="time-column">
                                            <TimeCell
                                                timestamp={cellData.timestamp}
                                                forecastTimestamp={cellData.forecastTimestamp}
                                            />
                                        </div>
                                    {:else if cellData.type === 'route-color'}
                                        <RouteColorCell
                                            color={cellData.color}
                                            waypointNumber={cellData.waypointNumber}
                                        />
                                    {:else if cellData.type === 'weather'}
                                        <div class="weather-column">
                                            <WeatherCell
                                                precipitations={cellData.precipitations}
                                                weather={cellData.weather}
                                                warnings={cellData.warnings}
                                            />
                                        </div>
                                    {:else if cellData.type === 'wind'}
                                        <div class="wind-column" style="background: {cellData.backgroundColor || ''}">
                                            <WindCell
                                                windSpeed={cellData.windSpeed}
                                                relativeWindDirection={cellData.relativeWindDirection}
                                                trueWindDirection={cellData.trueWindDirection}
                                                course={cellData.course}
                                                apparent={cellData.apparent}
                                            />
                                        </div>
                                    {:else if cellData.type === 'wave'}
                                        <div class="waves-column" style="background: {cellData.backgroundColor || ''}">
                                            <WaveCell
                                                wavesHeight={cellData.wavesHeight}
                                                wavesPeriod={cellData.wavesPeriod}
                                                wavesDirection={cellData.wavesDirection}
                                                course={cellData.course}
                                                apparent={cellData.apparent}
                                            />
                                        </div>
                                    {/if}
                                {/each}
                            {/if}

                        </div>
                        {/if}
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

            {#if forecast}
            <div class="favorite-button">
                    <RouteFavoriteButton route={forecast.route} on:toggleFavorite={toggleFavorite}/>
            </div>
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

    .time-column-base {
        width: 60px;
        min-width: 60px;
        flex: none;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        text-align: left;
        padding-left: 12px;
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
        padding: 8px 16px 8px 0px;
        font-weight: 600;
        font-size: 11px;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.5px;

        .time-column {
            .time-column-base();
        }

        .route-color-header {
            width: 4px;
            min-width: 4px;
            flex: none;
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

    .forecast-list {
        display: flex;
        flex-direction: column;
        overflow: visible;
    }

    // Forecast item base styles
    .forecast-item {
        display: flex;
        align-items: center;

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

    
    // Forecast item columns
    .forecast-item {
        .time-column,
        .weather-column,
        .wind-column,
        .gusts-column,
        .waves-column,
        .route-color-cell {
            .column-base();
            min-height: 50px;
            position: relative;
        }

        .time-column {
            .time-column-base();
        }

        .route-color-cell {
            width: 4px;
            min-width: 4px;
            flex: none;
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
            font-style: italic;
            color: #6c757d;
        }

        .favorite-button {
            margin-left: 10px;
            margin-right: -10px;
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