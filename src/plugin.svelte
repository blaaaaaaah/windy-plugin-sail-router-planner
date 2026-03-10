<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={ () => bcast.emit('rqstOpen', 'menu') }
    >
    { title }
    </div>


    <!-- Forecast Table -->
    {#if currentForecast}
        <ForecastTable
            forecast={currentForecast}
            startTime={forecastStartTime}
            endTime={forecastEndTime}
            on:timeHover={handleTimeHover}
            on:metricClick={handleMetricClick}
        />
    {/if}

</section>
<script lang="ts">
    import bcast from "@windy/broadcast";
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import { onDestroy, onMount } from 'svelte';
    import { RouteDefinition } from './types/RouteTypes';
    import { WindyAPI, WeatherForecastService } from './services';
    import { RouteEditorController } from './controllers/RouteEditorController';
    import ForecastTable from './components/ForecastTable.svelte';
    import { serializeRoute, deserializeRoute } from './utils/RouteSerializer';
    import { setUrl } from '@windy/location';

    import config from './pluginConfig';

    const { title } = config;


    // Interactive route editor
    let routeEditor: RouteEditorController | null = null;
    let currentRoutes: RouteDefinition[] = [];
    let editorInstruction = 'Click "Start New Route" then click on the map to add waypoints';

    // Forecast data
    let currentForecast: any = null;
    let forecastStartTime: number = Date.now();
    let forecastEndTime: number = Date.now() + 24 * 60 * 60 * 1000;
    let isLoadingForecast: boolean = false;

    // Weather service instances
    let windyAPI: WindyAPI | null = null;
    let weatherService: WeatherForecastService | null = null;

    // Generate forecast from route using WeatherForecastService
    async function generateForecastFromRoute(route: RouteDefinition) {
        if (!weatherService || !route.waypoints.length || route.waypoints.length < 2) {
            return;
        }

        try {
            isLoadingForecast = true;
            console.log('Generating forecast for route with', route.waypoints.length, 'waypoints');

            const forecast = await weatherService.getRouteForecast(route);
            currentForecast = forecast;

            if (forecast.pointForecasts?.length > 0) {
                // Set times based on forecast data
                forecastStartTime = forecast.pointForecasts[0].timestamp;
                forecastEndTime = forecast.pointForecasts[forecast.pointForecasts.length - 1].timestamp;
            }

            console.log('Forecast generated:', forecast.pointForecasts.length, 'points');
        } catch (error) {
            console.error('Failed to generate forecast:', error);
        } finally {
            isLoadingForecast = false;
        }
    }



    export const onopen = (params: any) => {
        console.log('=== PLUGIN ONOPEN ===', params);

        // Load route from URL if available
        if (params?.route) {
            const route = deserializeRoute(params.route);
            if (route && routeEditor) {
                routeEditor.loadRoute(route);
                console.log('Loaded route from URL');
            }
        }
    };


    function onRouteUpdated(route: RouteDefinition) {
        currentRoutes = routeEditor ? routeEditor.getRoutes() : [];

        if (route.waypoints.length === 1) {
            editorInstruction = 'Click on the map to add more waypoints';
        } else {
            editorInstruction = `Route has ${route.waypoints.length} waypoints. Continue clicking to add more or start a new route.`;
        }

        // Update URL with current route
        const serializedRoute = serializeRoute(route);
        console.log('Updating URL with route:', serializedRoute);
        setUrl(config.name, { route: serializedRoute });

        // Generate forecast when route has 2+ waypoints
        if (route.waypoints.length >= 2) {
            generateForecastFromRoute(route);
        }
    }

    function handleMapClick(latLon: any) {
        if (routeEditor) {
            // Convert singleclick position to proper Leaflet LatLng object
            const position = new L.LatLng(latLon.lat, latLon.lon);
            routeEditor.onMapClick(position);
        }
    }

    function handleTimeHover(event: any) {
        const { timestamp, forecast } = event.detail;
        console.log('Time hover:', new Date(timestamp), forecast);
    }

    function handleMetricClick(event: any) {
        const { metric } = event.detail;
        console.log('Metric clicked:', metric);
        // TODO: Change Windy layer based on metric
        // bcast.emit('rqstOpen', 'windy-layer-' + metric);
    }

    onMount(() => {
        routeEditor = new RouteEditorController(map, onRouteUpdated);

        singleclick.on(config.name, handleMapClick);

        // Initialize weather services
        windyAPI = new WindyAPI();
        weatherService = new WeatherForecastService(windyAPI);

        console.log('Weather services initialized');
    });

    onDestroy(() => {
        // Clean up singleclick listener
        singleclick.off(config.name, handleMapClick);
    });

</script>

<style lang="less">
    /* Remove default plugin content padding */
    .plugin__content {
        padding: 0 !important;
    }

    /* Windy-style waypoint markers */
    :global(.windy-waypoint-marker) {
        position: relative;
        cursor: move;
    }

    :global(.windy-waypoint-marker:hover) {
        cursor: move;
    }

    :global(.windy-waypoint-marker:active) {
        cursor: move;
    }

    :global(.waypoint-circle) {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease;
        position: relative;
        z-index: 2;
    }

    :global(.waypoint-number) {
        color: white;
        font-weight: bold;
        font-size: 12px;
        font-family: system-ui, -apple-system, sans-serif;
    }

    :global(.waypoint-delete-pill) {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        background-color: rgba(68, 68, 68, 0.9);
        border-radius: 0 12px 12px 0;
        width: 40px;
        height: 26px;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-left: none;
        z-index: 1;
    }

    :global(.waypoint-delete) {
        color: white;
        font-size: 20px;
        font-weight: normal;
        line-height: 1;
        user-select: none;
        margin-left: 12px;
        margin-top: -3px
    }

    :global(.windy-waypoint-marker:hover .waypoint-delete-pill) {
        display: flex;
    }

    :global(.windy-waypoint-marker:hover .waypoint-circle) {
        transform: scale(1.1);
    }

    :global(.waypoint-delete-pill:hover) {
        background-color: rgba(220, 53, 69, 0.9);
        transform: translateY(-50%) scale(1.1);
        transition: all 0.2s ease;
    }

    :global(.custom-waypoint-icon) {
        background: transparent !important;
        border: none !important;
    }
</style>

