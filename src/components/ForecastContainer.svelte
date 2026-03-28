<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { RouteForecast } from '../types/WeatherTypes';
    import type { RouteDefinition } from '../types/RouteTypes';
    import ForecastTable from './ForecastTable.svelte';

    export let forecast: RouteForecast | null = null;
    export let isLoading: boolean = false;
    export let activeRoute: RouteDefinition | null = null;
    export let showTrueWind: boolean = true;

    const dispatch = createEventDispatcher();

    // Debug activeRoute
    $: console.log('ForecastContainer activeRoute:', activeRoute);



    function toLocalDatetimeString(timestamp: number): string {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function handleDepartureTimeUpdate(event: Event) {
        const target = event.target as HTMLInputElement;
        const newDateTimeString = target.value;

        if (newDateTimeString && forecast?.route) {
            const newDepartureTime = new Date(newDateTimeString).getTime();
            if (!isNaN(newDepartureTime)) {
                console.log(`Updated departure time to ${new Date(newDepartureTime)}`);

                // Update the route departure time directly
                forecast.route.setDepartureTime(newDepartureTime);

                // Dispatch routeUpdated to trigger forecast regeneration
                dispatch('routeUpdated', {
                    route: forecast.route
                });
            }
        }
    }


    function handleTimeHover(event: any) {
        dispatch('timeHover', event.detail);
    }

    function handleMetricClick(event: any) {
        dispatch('metricClick', event.detail);
    }

    function handleRouteUpdated(event: any) {
        dispatch('routeUpdated', event.detail);
    }
</script>

<div class="forecast-container-wrapper">

    <!-- Content Area -->
    <div class="forecast-content">
        {#if activeRoute && activeRoute.waypoints.length > 1}
            <ForecastTable
                {forecast}
                {isLoading}
                {showTrueWind}
                route={activeRoute}
                on:timeHover={handleTimeHover}
                on:metricClick={handleMetricClick}
                on:routeUpdated={handleRouteUpdated}
            />
        {:else}
            <div class="forecast-placeholder">
                <div class="placeholder-icon">🗺️</div>
                <h3>No route created yet</h3>
                <p>Draw a route on the map by clicking to add waypoints. You need at least 2 waypoints to generate a weather forecast.</p>
            </div>
        {/if}
    </div>
</div>

<style lang="less">
    .forecast-container-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #f5f5f5;
    }


    /* Content area */
    .forecast-content {
        flex: 1;
        overflow: hidden;
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    /* Forecast placeholder */
    .forecast-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        background: #f8f9fa;
        text-align: center;
        height: 100%;
        width: 100%;
    }

    .placeholder-icon {
        font-size: 48px;
        margin-bottom: 20px;
        opacity: 0.6;
    }

    .forecast-placeholder h3 {
        color: #495057;
        font-size: 18px;
        margin: 0 0 12px 0;
        font-weight: 600;
    }

    .forecast-placeholder p {
        color: #6c757d;
        font-size: 14px;
        margin: 0;
        max-width: 320px;
        line-height: 1.5;
    }
</style>