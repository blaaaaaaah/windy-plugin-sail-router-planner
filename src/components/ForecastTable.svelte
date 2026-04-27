<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LegWaypoint from './LegWaypoint.svelte';
    import RouteDetail from './RouteDetail.svelte';
    import WeatherCell from './forecast-cells/WeatherCell.svelte';
    import WindCell from './forecast-cells/WindCell.svelte';
    import CombinedWindCell from './forecast-cells/CombinedWindCell.svelte';
    import WaveCell from './forecast-cells/WaveCell.svelte';
    import TimeCell from './forecast-cells/TimeCell.svelte';
    import RouteColorCell from './forecast-cells/RouteColorCell.svelte';
    import ScrollableForecastTable from './ScrollableForecastTable.svelte';
    import DraggableWaypointForecastTable from './DraggableWaypointForecastTable.svelte';
    import type { RouteForecast } from '../types/WeatherTypes';
    import { formatTime, formatTimeAgo } from '../utils/TimeUtils';
    import { ForecastTableDataSource, ForecastTableRowData, ForecastTableCellsGroup } from '../services/ForecastTableDataSource';
    import RouteFavoriteButton from './RouteFavoriteButton.svelte';

    export let routeForecasts: RouteForecast[] = [];
    export let showTrueWind: boolean = true;
    export let currentMetric: string = '';

    // Derived state from forecast
    $: isLoading = routeForecasts.length === 0 || routeForecasts.some(f => f.pointForecasts === null);



    // Track current route ID to detect route changes
    let currentRouteIds: string | null = null;
    let scrollToTimestamp: number | null = null;

    // Data source and generated rows
    let dataSource: ForecastTableDataSource | null = null;
    let rowsData: ForecastTableRowData[] = [];


    // Refresh method to recalculate data
    function refresh() {
        if (routeForecasts.length) {

            // Check if this is a new route
            const routeIds = routeForecasts.map(f => f.route.id).join(',');
            const isNewRoute = currentRouteIds != routeIds;
            if (isNewRoute) {
                currentRouteIds = routeIds;
                scrollToTimestamp = null; // Reset scroll index for new route

            }

            // if new route or if we have data for at least one route, create/update data source (handles placeholders internally)
            if (isNewRoute || routeForecasts.some(f => f.pointForecasts !== null)) {
                // Create or update data source (handles placeholders internally)
                dataSource = new ForecastTableDataSource(routeForecasts);
                rowsData = dataSource.getRowsData(!showTrueWind); // showApparent = !showTrueWind
            }


            // Calculate scroll index when we don't have one yet and data is available for first route only
            // we always have at least one item
            if (routeForecasts[0].pointForecasts && scrollToTimestamp === null && rowsData.length > 0) {
                scrollToTimestamp = calculateScrollTimestamp(rowsData, routeForecasts[0].route.departureTime);
                console.log(`Setting scrollToTimestamp to ${scrollToTimestamp} for route ${routeForecasts[0].route.id}`);
            }
            

        } else {
            // No forecast available - clear data
            currentRouteIds = null;
            scrollToTimestamp = null;
            dataSource = null;
            rowsData = [];
        }
    }

    // Reactive updates when forecast changes
    $: if (routeForecasts) {
        refresh();
    }

    // Efficient update when only wind mode changes (reuse existing data source)
    $: if (showTrueWind !== undefined) {
        updateRows();   // do not use other variables here because we want this to run only when showTrueWind changes, not on every forecast change
    }

    function updateRows() {
        if ( dataSource && routeForecasts) {
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

    function adjustOffsetsForGhostTimestamp(ghostTimestamp: number, routeIndex: number) {
        if (routeForecasts.length <= routeIndex) return;

        const HOUR_MS = 60 * 60 * 1000;
        const routeForecast = routeForecasts[routeIndex];

        if (routeForecast.pointForecasts) {
            const route = routeForecast.route;
            const preDepartureMs = route.preDepartureOffset * HOUR_MS;
            const postArrivalMs = route.postArrivalOffset * HOUR_MS;

            const currentStartTime = route.departureTime - preDepartureMs;
            const currentEndTime = route.arrivalTime + postArrivalMs;
            const twoHoursMs = 2 * HOUR_MS;

            if (ghostTimestamp < currentStartTime + twoHoursMs) {
                // Shift timeline earlier to create more rows to scroll
                const newPreDepartureMs = Math.max(preDepartureMs, route.departureTime - ghostTimestamp + twoHoursMs);
                route.preDepartureOffset = Math.ceil(newPreDepartureMs / HOUR_MS);
            } else if (ghostTimestamp > currentEndTime - twoHoursMs) {
                // Shift timeline later to create more rows to scroll
                const newPostArrivalMs = Math.max(postArrivalMs, ghostTimestamp - route.arrivalTime + twoHoursMs);
                route.postArrivalOffset = Math.ceil(newPostArrivalMs / HOUR_MS);
            }
        }
    }

    function calculateScrollTimestamp(rowsData: ForecastTableRowData[], departureTime: number): number | null {
        if (rowsData.length === 0) return null;

        const now = Date.now();
        const targetTime = now < departureTime ? departureTime : now;
        const fourHoursBeforeTarget = targetTime - (4 * 60 * 60 * 1000);

        // Find closest index among data rows only (since ScrollableForecastTable only counts .forecast-row)
        // Use first route for scroll calculation
        let bestDataRowIndex = 0;
        let closestDiff = Infinity;
        let dataRowCount = 0;

        for (let i = 0; i < rowsData.length; i++) {
            const rowData = rowsData[i];
            if ( rowData.cellsGroups && rowData.cellsGroups[0]) {
                // Use first route as scroll target
                const diff = Math.abs(rowData.cellsGroups[0].timestamp - fourHoursBeforeTarget);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    bestDataRowIndex = dataRowCount; // Index among data rows only
                }
                dataRowCount++;
            }
        }

        return rowsData[bestDataRowIndex] && rowsData[bestDataRowIndex].cellsGroups && rowsData[bestDataRowIndex].cellsGroups![0] ? rowsData[bestDataRowIndex].cellsGroups![0].timestamp : null;
    }


    // Handle waypoint index changes from drag operations
    function handleElementIndexChanged(event: CustomEvent) {
        const { fromTimestamp, toTimestamp, isDragging, routeIndex, elementType } = event.detail;

        // Validate route index
        if (routeIndex < 0 || routeIndex >= routeForecasts.length) {
            console.warn(`Invalid route index: ${routeIndex}`);
            return;
        }

        // if not waypoint, we don't need to compute from departure time but from current timeline start (which may be different from departure time if we have already shifted the timeline by dragging the waypoint near the start or end)

        // Calculate new offset to keep timeline position stable
        const HOUR_MS = 60 * 60 * 1000;
        const route = routeForecasts[routeIndex].route;
        const oldDepartureTime = fromTimestamp;//routeForecasts[routeIndex].route.departureTime;
        const oldTimelineStart = oldDepartureTime - (route.preDepartureOffset * HOUR_MS);

        // Calculate new offset to maintain same timeline start position
        const newPreDepartureMs = toTimestamp - oldTimelineStart;
        let newPreDepartureOffset = Math.ceil(newPreDepartureMs / HOUR_MS);


        if (elementType === 'waypoint') {
            console.log(`Waypoint timestamp change: from ${fromTimestamp} to ${toTimestamp}, isDragging: ${isDragging}, routeIndex: ${routeIndex}`);

            if ( isDragging  ) {
                const dropTimestamp = toTimestamp == fromTimestamp ? null : toTimestamp;

                // Adjust offsets if ghost timestamp is near timeline boundaries
                if (dropTimestamp !== null) {
                    adjustOffsetsForGhostTimestamp(dropTimestamp, routeIndex);
                }

                rowsData = dataSource!.getRowsData(!showTrueWind, dropTimestamp); // showApparent = !showTrueWind
            } else {
                if (fromTimestamp !== null && toTimestamp !== fromTimestamp ) {
                    if (toTimestamp && routeForecasts[routeIndex]?.route) {
                        console.log(`Moving route ${routeIndex} start to ${formatTime(toTimestamp)}`);

                        // Update the offset
                        route.preDepartureOffset = Math.max(newPreDepartureOffset, 1);

                        // Update the route departure time directly
                        routeForecasts[routeIndex].route.setDepartureTime(toTimestamp);
                        // Dispatch updated route to trigger forecast regeneration
                        dispatch('routeUpdated', {
                            route: routeForecasts[routeIndex].route
                        });
                    }
                }
            }
        } else {

            // Apply drag limits when comparing multiple routes (only for dragging down)
            if (routeForecasts.length > 1) {

                // Find maximum offset+duration of other routes
                let maxOffsetPlusDuration = Number.MIN_VALUE;

                routeForecasts.forEach((rf, idx) => {
                    if (idx !== routeIndex) {
                        const otherRouteDurationHours = rf.route.totalDuration / HOUR_MS;
                        const offsetPlusDuration = rf.route.preDepartureOffset + otherRouteDurationHours + 3;
                        maxOffsetPlusDuration = Math.max(maxOffsetPlusDuration, offsetPlusDuration);
                    }
                });

                if (maxOffsetPlusDuration !== Number.MIN_VALUE) {
                    // Dragged route offset shouldn't be greater than max(otherRoute's offset+duration)
                    newPreDepartureOffset = Math.min(maxOffsetPlusDuration, newPreDepartureOffset);
                }
            }

            if (newPreDepartureOffset < 0) {
                // When dragging up, check if we can shift other routes
                const draggedRoute = route;
                const draggedRouteDurationHours = draggedRoute.totalDuration / HOUR_MS;

                // Find minimum offset of other routes
                let minOtherOffset = Number.MAX_VALUE;
                routeForecasts.forEach((rf, idx) => {
                    if (idx !== routeIndex) {
                        minOtherOffset = Math.min(minOtherOffset, rf.route.preDepartureOffset);
                    }
                });

                // If dragged route duration - 6 >= min other offset
                if (draggedRouteDurationHours + 3 >= minOtherOffset) {
                    // Shift other routes to make room
                    let offsetToSubtract = newPreDepartureOffset;
                    routeForecasts.forEach((rf, idx) => {
                        if (idx !== routeIndex) {
                            rf.route.preDepartureOffset = Math.max(0, rf.route.preDepartureOffset - offsetToSubtract);
                        }
                    });              
                }
                newPreDepartureOffset = 0;
            }


            console.log(`All route offsets:`, routeForecasts.map((rf, idx) => `Route ${idx}: pre=${rf.route.preDepartureOffset}h, post=${rf.route.postArrivalOffset}h`));

            // Update the offset
            route.preDepartureOffset = newPreDepartureOffset;


            // if new departure time is after last arrival time, stop
            if (newPreDepartureOffset > 300 ) {
                debugger;
                return;
            }



            // refresh the table with new offsets (handles placeholder generation internally)
            rowsData = dataSource!.getRowsData(!showTrueWind); //
        }
    }


    function normalizeOffsets() {
        // make sure that we don't have unecessary offset, we need min 6h
        const min = Math.min(...routeForecasts.map(rf => rf.route.preDepartureOffset));
        if (min < 6) return;

        routeForecasts.forEach(rf => {
            rf.route.preDepartureOffset = rf.route.preDepartureOffset - 6;
        });
    }


    // functions that will dispatch events

    function onMetricClick(metric: string) {
        dispatch('metricClick', { metric });
    }

    function handleWindModeChange(trueWind: boolean) {
        showTrueWind = trueWind;
        dispatch('windModeChanged', { showTrueWind: trueWind });
    }

    // only works for first route
    function handleLegSpeedUpdate(event: any) {
        if ( routeForecasts.length != 1 ) {
            return; // Only support speed update for single route
        }

        const { legIndex, newSpeed } = event.detail;
        console.log(`Updating leg ${legIndex} speed to ${newSpeed}`);

        const route = routeForecasts[0]?.route

        if (route && legIndex >= 0 && legIndex < route.legs.length) {
            const speed = parseFloat(newSpeed);
            if (!isNaN(speed) && speed > 0) {
                // Update the route leg speed using the proper method
                route.setLegSpeed(legIndex, speed);

                // Dispatch with the updated route
                dispatch('routeUpdated', {
                    route: route
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
            {#if routeForecasts.length == 1 && routeForecasts[0]?.route}
                <RouteDetail
                    route={routeForecasts[0].route}
                    routeStats={routeForecasts[0]?.routeStats || null}
                    on:routeUpdated={handleRouteUpdated}
                />
            {/if}

            <!-- Table Header -->
            <div class="table-header">
                <div class="time-column">Time</div>
                <div class="route-color-header"></div>
                <div class="weather-column" class:active={currentMetric === 'rain'} on:click={() => onMetricClick('rain')}>Weather</div>
                <div class="wind-column" class:active={currentMetric === 'wind'} on:click={() => onMetricClick('wind')}>Wind</div>
                <div class="gusts-column" class:active={currentMetric === 'gust'} on:click={() => onMetricClick('gust')}>Gusts</div>
                <div class="waves-column" class:active={currentMetric === 'waves'} on:click={() => onMetricClick('waves')}>Waves</div>
            </div>

            <!-- Vertical Data List -->
            <div class="main-table">
                <DraggableWaypointForecastTable
                     on:elementIndexChanged={handleElementIndexChanged}
                >
                    <ScrollableForecastTable
                         {scrollToTimestamp}
                         on:rowHover={handleRowHover}>
                    <div class="forecast-list">
                    {#each rowsData as rowData}
                        <div class="forecast-row">
                            {#each rowData.cellsGroups as cellsGroup}
                                <div class="cell-group" class:current-hour={cellsGroup.isCurrentHour} data-timestamp={cellsGroup.timestamp} data-route-index={cellsGroup.routeIndex} draggable={cellsGroup.draggable} data-drag-type='row'>
                                    <div class="time-column" class:hasWaypoint={cellsGroup.waypointData} >
                                        <TimeCell
                                            timestamp={cellsGroup.timestamp}
                                            forecastTimestamp={cellsGroup.forecastTimestamp}
                                        />
                                    </div>
                                    <div class="cell-group-right">
                                            <div class="cell-group-header">
                                            {#if cellsGroup.waypointData}
                                                <LegWaypoint
                                                    timestamp={cellsGroup.waypointData.departureTime}
                                                    waypointNumber={cellsGroup.waypointData.number}
                                                    isStart={cellsGroup.waypointData.isStart}
                                                    isLast={cellsGroup.waypointData.isLast}
                                                    leg={cellsGroup.waypointData.leg}
                                                    legStats={cellsGroup.waypointData.stats}
                                                    departureTime={cellsGroup.waypointData.departureTime}
                                                    arrivalTime={cellsGroup.waypointData.arrivalTime}
                                                    color={cellsGroup.waypointData.color}
                                                    dropGhost={cellsGroup.waypointData.dropGhost}
                                                    on:speedUpdate={(e) => handleLegSpeedUpdate({ detail: e.detail })}
                                                    canExpand={routeForecasts.length === 1 && !cellsGroup.waypointData.isLast}
                                                    draggable={cellsGroup.waypointData.isStart && !cellsGroup.waypointData.dropGhost}
                                                />
                                                {/if}
                                            </div>
                                        
                                        {#if cellsGroup.cells}
                                            <div class="cell-group-content">
                                                {#each cellsGroup.cells as cellData}
                                    {#if cellData.type === 'route-color'}
                                        <RouteColorCell
                                            color={cellData.color}
                                            inRoute={cellData.inRoute}
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
                                        <div class="wind-column">
                                            <WindCell
                                                windSpeed={cellData.windSpeed}
                                                relativeWindDirection={cellData.relativeWindDirection}
                                                trueWindDirection={cellData.trueWindDirection}
                                                course={cellData.course}
                                                apparent={cellData.apparent}
                                                gradient={cellData.gradient}
                                            />
                                        </div>
                                    {:else if cellData.type === 'combined-wind'}
                                        <div class="wind-column">
                                            <CombinedWindCell
                                                windSpeed={cellData.windSpeed}
                                                gustsSpeed={cellData.gustsSpeed}
                                                wavesHeight={cellData.wavesHeight}
                                                relativeWindDirection={cellData.relativeWindDirection}
                                                trueWindDirection={cellData.trueWindDirection}
                                                wavesDirection={cellData.wavesDirection}
                                                precipitations={cellData.precipitations}
                                                weather={cellData.weather}
                                                course={cellData.course}
                                                apparent={cellData.apparent}
                                                windGradient={cellData.windGradient}
                                                gustsGradient={cellData.gustsGradient}
                                                wavesGradient={cellData.wavesGradient}
                                            />
                                        </div>
                                    {:else if cellData.type === 'wave'}
                                        <div class="waves-column">
                                            <WaveCell
                                                wavesHeight={cellData.wavesHeight}
                                                wavesPeriod={cellData.wavesPeriod}
                                                wavesDirection={cellData.wavesDirection}
                                                course={cellData.course}
                                                apparent={cellData.apparent}
                                                gradient={cellData.gradient}
                                            />
                                        </div>
                                    {/if}
                                            {/each}
                                        </div>
                                    {/if}
                                    </div>
                                </div>
                            {/each}
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
            {#if routeForecasts[0]?.forecastWindow?.updated}
                <p>Updated {formatTimeAgo(routeForecasts[0].forecastWindow.updated)}</p>
            {:else}
                <p>&nbsp;</p>
            {/if}

            {#if routeForecasts.length == 1 && routeForecasts[0]}
            <div class="favorite-button">
                    <RouteFavoriteButton route={routeForecasts[0].route} on:toggleFavorite={toggleFavorite}/>
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
        //min-width: 30px;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }

    .time-column-base {
        //min-width: 30px;
        flex-grow: 0.2;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }

    .clickable-column {
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s ease;
        margin: 0 2px;

        &:hover,
        &.active {
            background: rgba(0, 124, 186, 0.15);
            color: #007cba;
        }

        &.active {
            cursor: default;
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
            flex-grow: 0.5;
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

    // Cell group - time column on left, grouped content on right
    .cell-group {
        display: flex;
        flex-direction: row;
        flex: 1;
    }

    .cell-group.current-hour {
        background: #e6e6e6;
    }

    .cell-group-right {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
    }

    .cell-group-header {
        display: flex;
        width: 100%;
    }

    .cell-group-content {
        display: flex;
        flex: 1;
        align-items: stretch;
    }

    // Forecast row - handles layout and styling
    .forecast-row {
        display: flex;
        align-items: stretch;
        min-height: 50px;
        background: white;
        transition: background 0.2s ease;

        &:hover {
            background: #f8f9fa;
        }
    }

    
    // Forecast item columns
    .forecast-row {
        .time-column,
        .weather-column,
        .wind-column,
        .gusts-column,
        .waves-column,
        .route-color-cell {
            .column-base();
            min-height: 50px;
            height: 100%;
            position: relative;
        }

        .time-column {
            .time-column-base();
        }

        .time-column.hasWaypoint {
            align-self: flex-start;
            padding-top: 18px;
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