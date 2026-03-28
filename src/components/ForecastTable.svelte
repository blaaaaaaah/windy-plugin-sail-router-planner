<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { metrics } from '@windy/metrics';
    import LegDetail from './LegDetail.svelte';
    import LegWaypoint from './LegWaypoint.svelte';
    import RouteDetail from './RouteDetail.svelte';
    import type { RouteForecast } from '../types/WeatherTypes';
    import type { RouteDefinition } from '../types/RouteTypes';

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
    $: if (forecast || showTrueWind !== undefined) {
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


    // Create windDetail color object using Windy's Color system




    let windDetailColor:any = null
    let wavesDetailColor:any = null
    let wavesPeriodColor:any = null

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

    function getWavePeriodColor(wavePeriodSeconds: number): string {
        if ( ! wavesPeriodColor ) {
            try {
                wavesPeriodColor = new W.Color.Color({
                    ident: "wavesPeriod",
                    default: [
                        [0, "rgba(255,255,255,0)"],
                        [2, "rgb(151,50,222)"],      // Purple for short periods (2-3s)
                        [3, "rgb(151,50,222)"],      // Purple for short periods
                        [5, "rgb(254,174,0)"],       // Orange for medium periods
                        [7, "rgb(180,180,255)"],     // Blue for long periods (8+s)
                        [15, "rgb(180,180,255)"]
                    ]
                });
                console.log('wavesPeriodColor created successfully');
            } catch (error) {
                console.error('Failed to create wavesPeriod color:', error);
            }
        }
        if (wavesPeriodColor && typeof wavePeriodSeconds === 'number' && !isNaN(wavePeriodSeconds)) {
            try {
                return wavesPeriodColor.getColor().color(wavePeriodSeconds);
            } catch (error) {
                console.warn('WavesPeriod color failed:', error);
            }
        }
        return 'rgba(120, 120, 255, 0.1)'; // fallback
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


    function handleAverageSpeedUpdate(waypointNumber: number, newSpeed: string) {
        const speed = parseFloat(newSpeed);
        if (!isNaN(speed) && speed > 0 && forecast?.route) {
            console.log(`Updated leg ${waypointNumber} average speed to ${speed}kts`);

            // Update the route leg speed directly
            const legIndex = waypointNumber - 1; // Convert to 0-based index
            forecast.route.setLegSpeed(legIndex, speed);

            // Dispatch updated route to trigger forecast regeneration
            dispatch('routeUpdated', {
                route: forecast.route
            });
        }
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

    function autoScrollToDeparture() {
        if (!scrollContainer || !forecast || rowPositions.length === 0) return;

        // Only auto-scroll if currently at the top (user hasn't manually scrolled)
        if (scrollContainer.scrollTop > 0) return;

        const departureTime = forecast.route.departureTime;
        const fourHoursBeforeDeparture = departureTime - (4 * 60 * 60 * 1000);

        // Find the index of the forecast point closest to 4 hours before departure
        let targetIndex = -1;
        let closestTimeDiff = Infinity;

        for (let i = 0; i < hourlyData.length; i++) {
            const timeDiff = Math.abs(hourlyData[i].timestamp - fourHoursBeforeDeparture);
            if (timeDiff < closestTimeDiff) {
                closestTimeDiff = timeDiff;
                targetIndex = i;
            }
        }

        // Scroll to show the target row if found
        if (targetIndex >= 0 && targetIndex < rowPositions.length) {
            const targetRow = rowPositions[targetIndex];
            const containerHeight = scrollContainer.clientHeight;

            // Position the target row at the top of visible area to show 4h before departure prominently
            const offsetFromTop = 0; // Show target row at the very top
            const targetScrollTop = Math.max(0, targetRow.top - offsetFromTop);

            console.log(`Auto-scrolling to ${new Date(fourHoursBeforeDeparture).toISOString()} (4h before departure)`);
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

    function getWindDirection(forecastData: any): number | undefined {
        if (showTrueWind) {
            return forecastData?.northUp?.windDirection;
        } else {
            // Apparent wind direction is already relative to boat (-179 to 180)
            // Convert to 0-360 for arrow rotation
            const apparentAngle = forecastData?.apparent?.windDirection;
            if (apparentAngle === undefined) return undefined;
            return apparentAngle < 0 ? apparentAngle + 360 : apparentAngle;
        }
    }

    function getWindDirectionForTooltip(forecastData: any): string {
        if (showTrueWind) {
            const dir = forecastData?.northUp?.windDirection;
            return dir !== undefined ? `${dir.toFixed(0)}°` : 'N/A°';
        } else {
            // Apparent wind: show as Port/Starboard
            const apparentAngle = forecastData?.apparent?.windDirection;
            if (apparentAngle === undefined) return 'N/A°';

            if (apparentAngle === 180 || apparentAngle === -180) {
                return '180°';
            } else if (apparentAngle > 0) {
                return `${apparentAngle.toFixed(0)}S`;
            } else {
                return `${Math.abs(apparentAngle).toFixed(0)}P`;
            }
        }
    }

    // Reactive boat rotation based on showTrueWind
    $: boatRotation = (() => {
        if (showTrueWind) {
            const course = forecast?.route?.legs?.[0]?.course || 0;
            return course;
        } else {
            // For apparent wind, boat should face up (0 degrees)
            return 0;
        }
    })();

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

        const sailingTimeStr = new Date(sailingHour).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });

        // Debug logging
        //console.log(`Freshness check: Sailing=${sailingTimeStr}, Forecast=${forecastTimeStr}, Diff=${timeDiffMinutes.toFixed(1)}min (${hoursDiff.toFixed(1)}h)`);

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

    function getWaveDirection(forecastData: any): number | undefined {
        if (showTrueWind) {
            return forecastData?.northUp?.wavesDirection;
        } else {
            // For apparent wind mode, waves still use true direction relative to boat
            const waveDir = forecastData?.northUp?.wavesDirection;
            const boatCourse = forecast?.route?.legs?.[0]?.course || 0;
            if (waveDir === undefined) return undefined;

            // Calculate relative to boat
            let relative = waveDir - boatCourse;
            while (relative > 180) relative -= 360;
            while (relative <= -180) relative += 360;
            return relative < 0 ? relative + 360 : relative;
        }
    }

    function getWaveDirectionForTooltip(forecastData: any): string {
        if (showTrueWind) {
            const dir = forecastData?.northUp?.wavesDirection;
            return dir !== undefined ? `${dir.toFixed(0)}°` : 'N/A°';
        } else {
            // In apparent mode, show wave direction relative to boat
            const waveDir = forecastData?.northUp?.wavesDirection;
            const boatCourse = forecast?.route?.legs?.[0]?.course || 0;
            if (waveDir === undefined) return 'N/A°';

            let relative = waveDir - boatCourse;
            while (relative > 180) relative -= 360;
            while (relative <= -180) relative += 360;

            return `${Math.abs(relative).toFixed(0)}° ${relative >= 0 ? 'S' : 'P'}`;
        }
    }

    function formatPrecipitation(mmValue: number): string {
        return W.metrics.rain.convertValue(mmValue);
    }

    function formatWaveHeight(meterValue: number): string {
        return W.metrics.waves.convertValue(meterValue);
    }

    function formatWindSpeed(msValue: number): string {
        return W.metrics.wind.convertValue(msValue);
    }

    function formatDistance(meterValue: number): string {
        return W.metrics.distance.convertValue(meterValue);
    }


    function formatTime(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false
        });
    }

    function formatDayDate(timestamp: number): string {
        return new Date(timestamp).toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric'
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

    function handleLegSpeedUpdate(event: any) {
        const { legIndex, newSpeed } = event.detail;
        console.log(`Updating leg ${legIndex} speed to ${newSpeed}`);

        dispatch('routeUpdated', {
            action: 'update-leg-speed',
            legIndex,
            speed: newSpeed
        });
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
            <RouteDetail
                route={route}
                routeStats={null}
                on:routeUpdated={handleRouteUpdated}
            />

            <!-- Table Header -->
            <div class="table-header">
                <div class="time-column">Time</div>
                <div class="weather-column" on:click={() => onMetricClick('thunder')}>Weather</div>
                <div class="wind-column" on:click={() => onMetricClick('wind')}>Wind</div>
                <div class="gusts-column" on:click={() => onMetricClick('gust')}>Gusts</div>
                <div class="waves-column" on:click={() => onMetricClick('waves')}>Waves</div>
                <div class="period-column" on:click={() => onMetricClick('waves')}>Period</div>
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
                        on:mouseenter={() => handleHover(index)}
                        on:mouseleave={() => handleHover(null)}
                        on:dragover|preventDefault={(e) => handleDragOver(e, index)}
                        on:dragleave={() => handleDragLeave()}
                        on:drop|preventDefault={(e) => handleDrop(e, index)}
                    >
                        <div class="time-column">
                            <div class="time-row">
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
                            <div class="date">{formatDayDate(data.timestamp)}</div>
                        </div>

                        <div class="weather-column">
                            <img
                                src="/img/icons7/png_27@2x/{getWeatherIcon(data.forecast?.weather || 2)}"
                                alt="Weather"
                                class="weather-icon"
                            />
                            <div class="rain-value">{data.forecast?.precipitations != null ? formatPrecipitation(data.forecast.precipitations) : '--'}</div>
                        </div>

                        <div class="wind-column" style="background: {createGradientBackground(
                            getWindSpeed(data.forecast),
                            index > 0 ? getWindSpeed(hourlyData[index - 1].forecast) : null,
                            index < hourlyData.length - 1 ? getWindSpeed(hourlyData[index + 1].forecast) : null,
                            getWindColor
                        )}">
                            <div class="metric-value">
                                {getWindSpeed(data.forecast) ? formatWindSpeed(getWindSpeed(data.forecast)) : '--'}
                                {#if getWindDirection(data.forecast) !== undefined}
                                    <div class="direction-container">
                                        <svg class="wind-dir" width="18" height="24" viewBox="0 0 20 27" style="transform: translate(-50%, -50%) rotate({getWindDirection(data.forecast) + 180}deg)">
                                            <title>{getWindDirectionForTooltip(data.forecast)}</title>
                                            <!-- Arrow shaft -->
                                            <line x1="10" y1="22.5" x2="10" y2="4.5" stroke="#007cba" stroke-width="1"/>
                                            <!-- Arrow head -->
                                            <polygon points="10,1.8 7,7.2 13,7.2" fill="#007cba"/>
                                        </svg>
                                        <svg class="boat-icon" width="18" height="18" viewBox="0 0 100 200" style="transform: translate(-50%, -50%) rotate({boatRotation}deg)">
                                            <path d="
                                                M35 150
                                                L65 150
                                                Q70 100 50 50
                                                Q30 100 35 150
                                                Z"
                                                fill="white"
                                                stroke="gray"
                                                stroke-width="4"/>
                                        </svg>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="gusts-column" style="background: {createGradientBackground(
                            getGustSpeed(data.forecast),
                            index > 0 ? getGustSpeed(hourlyData[index - 1].forecast) : null,
                            index < hourlyData.length - 1 ? getGustSpeed(hourlyData[index + 1].forecast) : null,
                            getWindColor
                        )}">
                            <div class="metric-value gust-value">
                                {getGustSpeed(data.forecast) ? formatWindSpeed(getGustSpeed(data.forecast)) : '--'}
                                {#if getWindDirection(data.forecast) !== undefined}
                                    <div class="direction-container">
                                        <svg class="wind-dir" width="18" height="24" viewBox="0 0 20 27" style="transform: translate(-50%, -50%) rotate({getWindDirection(data.forecast) + 180}deg)">
                                            <title>{getWindDirectionForTooltip(data.forecast)}</title>
                                            <!-- Arrow shaft -->
                                            <line x1="10" y1="22.5" x2="10" y2="4.5" stroke="#007cba" stroke-width="1"/>
                                            <!-- Arrow head -->
                                            <polygon points="10,1.8 7,7.2 13,7.2" fill="#007cba"/>
                                        </svg>
                                        <svg class="boat-icon" width="18" height="18" viewBox="0 0 100 200" style="transform: translate(-50%, -50%) rotate({boatRotation}deg)">
                                            <path d="
                                                M35 150
                                                L65 150
                                                Q70 100 50 50
                                                Q30 100 35 150
                                                Z"
                                                fill="white"
                                                stroke="gray"
                                                stroke-width="4"/>
                                        </svg>
                                    </div>
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
                                {data.forecast?.northUp?.wavesHeight != null ? formatWaveHeight(data.forecast.northUp.wavesHeight) : '--'}
                                {#if getWaveDirection(data.forecast) !== undefined}
                                    <div class="direction-container">
                                        <svg class="wave-dir" width="18" height="24" viewBox="0 0 20 27" style="transform: translate(-50%, -50%) rotate({getWaveDirection(data.forecast) + 180}deg)">
                                            <title>{getWaveDirectionForTooltip(data.forecast)}</title>
                                            <!-- Arrow shaft -->
                                            <line x1="10" y1="22.5" x2="10" y2="4.5" stroke="#007cba" stroke-width="1"/>
                                            <!-- Arrow head -->
                                            <polygon points="10,1.8 7,7.2 13,7.2" fill="#007cba"/>
                                        </svg>
                                        <svg class="boat-icon" width="18" height="18" viewBox="0 0 100 200" style="transform: translate(-50%, -50%) rotate({boatRotation}deg)">
                                            <path d="
                                                M35 150
                                                L65 150
                                                Q70 100 50 50
                                                Q30 100 35 150
                                                Z"
                                                fill="white"
                                                stroke="gray"
                                                stroke-width="4"/>
                                        </svg>
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <div class="period-column" style="background: {createGradientBackground(
                            data.forecast?.northUp?.wavesPeriod || 0,
                            index > 0 ? hourlyData[index - 1].forecast?.northUp?.wavesPeriod || null : null,
                            index < hourlyData.length - 1 ? hourlyData[index + 1].forecast?.northUp?.wavesPeriod || null : null,
                            getWavePeriodColor
                        )}">
                            <div class="metric-value period-value">
                                {data.forecast?.northUp?.wavesPeriod != null ? `${data.forecast.northUp.wavesPeriod.toFixed(1)}s` : '--'}
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


    @keyframes spin {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to { transform: translate(-50%, -50%) rotate(360deg); }
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
            //margin-right: 9px;
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
        .waves-column,
        .period-column {
            width: 60px;
            //margin-right: 12px;
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
        //margin-right: 9px;
        flex-shrink: 0;
        position: relative;

        .time-row {
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

        &.destination-waypoint {
            cursor: default;

            &:hover {
                background: rgba(var(--route-color-rgb), 0.8); // Keep original background
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

    .leg-detail-wrapper {
        border-left: 4px solid var(--route-color);
        border-bottom: 1px solid var(--route-color);
    }

    .waypoint-expanded {
        background: rgba(var(--route-color-rgb), 0.08);
        border-left: 4px solid var(--route-color);
        border-bottom: 1px solid var(--route-color);
        padding: 12px 16px;
        margin: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out, padding 0.3s ease-out;

        .expanded-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .leg-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-end;
            margin-bottom: 12px;
        }

        .leg-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;

            label {
                font-weight: 600;
                color: #444 !important;
                font-size: 9px;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                text-align: center;
            }

            .value {
                color: #555 !important;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
            }
        }

        .leg-item.speed-input {
            .input-group {
                display: flex;
                align-items: center;
                gap: 4px;
                height: 12px; /* Match the line-height of .value elements */
            }

            .compact-input {
                width: 45px;
                padding: 0 6px;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 600;
                text-align: center;
                background: white;
                color: #333 !important;
                height: 14px; /* Match the height of .value text */
                line-height: 16px;

                &:focus {
                    outline: none;
                    border-color: var(--route-color);
                    box-shadow: 0 0 0 2px rgba(var(--route-color-rgb), 0.2);
                }
            }

            .unit {
                font-size: 10px;
                color: #666 !important;
                font-weight: 500;
            }
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
    .forecast-item .gusts-column,
    .forecast-item .period-column {
        width: 60px;
        //margin-right: 12px;
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
            gap: 3px;
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

    .direction-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
    }

    .wind-dir, .wave-dir {
        position: absolute;
        top: 50%;
        left: 50%;
        transform-origin: center;
        transform: translate(-50%, -50%) rotate(0deg);
        transition: transform 0.3s ease;
        z-index: 2;
    }

    .boat-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform-origin: center;
        transform: translate(-50%, -50%) rotate(0deg);
        transition: transform 0.3s ease;
        z-index: 1;
    }





    .bg-gray-dark {
        background: #34495e;
    }

    .uiyellow {
        color: #f39c12;
    }

</style>