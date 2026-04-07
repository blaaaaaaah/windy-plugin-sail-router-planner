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