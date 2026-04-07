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
        <ForecastTable
            {forecast}
            {isLoading}
            {showTrueWind}
            route={activeRoute}
            on:timeHover={handleTimeHover}
            on:metricClick={handleMetricClick}
            on:routeUpdated={handleRouteUpdated}
        />
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

</style>