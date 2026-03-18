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

    <div class="wind-data-toggle">
        <div class="toggle-left">
            <span
                class="toggle-option"
                class:active={showTrueWind}
                class:clickable={!showTrueWind}
                on:click={() => setShowTrueWind(true)}
            >
                True
            </span>
            <span class="toggle-separator">/</span>
            <span
                class="toggle-option"
                class:active={!showTrueWind}
                class:clickable={showTrueWind}
                on:click={() => setShowTrueWind(false)}
            >
                Apparent
            </span>
        </div>
        <div class="toggle-right">
            <span class="settings-icon iconfont fg-icons" on:click={handleSettingsClick}>1</span>
        </div>
    </div>


    <!-- Forecast Table -->
    {#if currentForecast}
        <ForecastTable
            forecast={currentForecast}
            isLoading={isLoadingForecast}
            showTrueWind={showTrueWind}
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

</section>
<script lang="ts">
    import bcast from "@windy/broadcast";
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';
    import { onDestroy, onMount } from 'svelte';
    import { RouteDefinition } from './types/RouteTypes';
    import { WindyAPI, WeatherForecastService } from './services';
    import { RouteEditorController } from './controllers/RouteEditorController';
    import ForecastTable from './components/ForecastTable.svelte';
    import { serializeRoute, deserializeRoute } from './utils/RouteSerializer';
    import { setUrl } from '@windy/location';

    import config from './pluginConfig';
    import { RouteForecast } from "./types/WeatherTypes";

    const { title } = config;


    // Interactive route editor
    let routeEditor: RouteEditorController | null = null;

    // Forecast data
    let currentForecast: RouteForecast|null = null;
    let isLoadingForecast: boolean = false;

    // Weather service instances
    let windyAPI: WindyAPI | null = null;
    let weatherService: WeatherForecastService | null = null;

    // Wind data display mode
    let showTrueWind: boolean = true;

    function setShowTrueWind(value: boolean) {
        showTrueWind = value;

        // Update URL to persist wind mode
        const activeRoute = routeEditor?.getActiveRoute();

        if (activeRoute) {
            const serializedRoute = serializeRoute(activeRoute, value);
            setUrl(config.name, { route: serializedRoute });
        } else {
            // If no route, create minimal route with just wind mode
        }
    }

    // Generate forecast from route using WeatherForecastService
    async function generateForecastFromRoute(route: RouteDefinition) {
        if (!weatherService || !route.waypoints.length || route.waypoints.length < 2) {
            return;
        }

        try {
            isLoadingForecast = true;
            console.log('Generating forecast for route with', route.waypoints.length, 'waypoints');

            const forecast = await weatherService.getRouteForecast(route);
            // Force Svelte reactivity with new object reference
            currentForecast = { ...forecast };


            console.log('Forecast generated:', forecast.pointForecasts.length, 'points');
        } catch (error) {
            console.error('Failed to generate forecast:', error);
        } finally {
            isLoadingForecast = false;
        }
    }



    export const onopen = (params: any) => {
        console.log('=== PLUGIN ONOPEN ===', params);

        // Load route and wind mode from URL if available
        if (params?.route) {
            const result = deserializeRoute(params.route);
            if (result?.route && routeEditor) {
                routeEditor.loadRoute(result.route);
                console.log('Loaded route from URL');

                // Set wind mode from deserialization
                showTrueWind = result.windMode;
                console.log('Loaded wind mode from route:', showTrueWind ? 'True Wind' : 'Apparent Wind');
            }
        }
    };


    function onRouteUpdated(route: RouteDefinition) {
        // Update URL with current route and wind mode
        const serializedRoute = serializeRoute(route, showTrueWind);
        setUrl(config.name, { route: serializedRoute });

        logWindyRPlannerRoute(route);

        // Generate forecast when route has 2+ waypoints
        if (route.waypoints.length >= 2) {
            generateForecastFromRoute(route);
        } else {
            currentForecast = null;
        }
    }

    function logWindyRPlannerRoute(route: RouteDefinition) {
        let coordinates = route.waypoints.map(wp => `${wp.lat.toFixed(4)},${wp.lng.toFixed(4)}`).join(';');
        let url = `https://www.windy.com/route-planner/boat/${coordinates}?1.370,-85.912,6,p:cities`;
        console.log('Generated Windy RPlanner URL:', url);
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

        // Update both Windy's store and RouteEditor for immediate progress updates
        if (timestamp) {
            store.set('timestamp', timestamp);
            routeEditor?.setTimestamp(timestamp);
        }
    }

    function handleMetricClick(event: any) {
        const { metric } = event.detail;
        console.log('Metric clicked:', metric);
        store.set('overlay', metric);
    }

    function handleRouteUpdated(event: any) {
        const { route } = event.detail;
        //onRouteUpdated(route);
        // Update route display (day markers, distance labels, etc.) when route properties change
        if (routeEditor) {
            routeEditor.loadRoute(route);
        }
    }

    function handleSettingsClick() {
        console.log('Settings clicked - will implement settings panel later');
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

        // Clean up route editor and all map layers/markers
        if (routeEditor) {
            routeEditor.destroy();
            routeEditor = null;
        }

        // Clear forecast data
        currentForecast = null;

        console.log('Plugin destroyed and cleaned up');
    });

</script>

<style lang="less">
    /* Remove default plugin content padding */
    .plugin__content {
        padding: 0 !important;
    }

    .settings-icon {
        cursor: pointer;
        color: #666;
        font-size: 16px;
        padding: 4px;
        border-radius: 3px;
        transition: color 0.2s ease, background 0.2s ease;
    }

    .settings-icon:hover {
        color: #333;
        background: rgba(0, 0, 0, 0.05);
    }

    /* Wind data toggle */
    .wind-data-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        font-size: 12px;
        color: #666;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
    }

    .toggle-left {
        display: flex;
        align-items: center;
    }

    .toggle-right {
        display: flex;
        align-items: center;
    }

    .toggle-option {
        cursor: pointer;
        transition: color 0.2s ease;
        font-weight: 500;
    }

    .toggle-option.active {
        color: #333;
        font-weight: 600;
    }

    .toggle-option.clickable {
        text-decoration: underline;
        color: #007cba;
    }

    .toggle-option.clickable:hover {
        color: #005a8b;
    }

    .toggle-separator {
        margin: 0 6px;
        color: #999;
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

    /* Distance labels on route lines */
    :global(.custom-distance-label) {
        background: transparent !important;
        border: none !important;
        pointer-events: none;
    }

    :global(.route-distance-label) {
        position: relative;
        cursor: default;
        user-select: none;
        pointer-events: none;
    }

    :global(.distance-text) {
        color: rgba(255, 255, 255, 0.9);
        font-size: 11px;
        font-weight: 500;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
        white-space: nowrap;
        font-family: system-ui, -apple-system, sans-serif;
        background: none;
        border: none;
        padding: 0;
    }

    /* Day markers on route lines */
    :global(.custom-day-marker) {
        background: transparent !important;
        border: none !important;
        pointer-events: none;
    }

    :global(.route-day-marker) {
        position: relative;
        cursor: default;
        user-select: none;
        pointer-events: none;
    }

    :global(.day-text) {
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
        white-space: nowrap;
        font-family: system-ui, -apple-system, sans-serif;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
        background: none;
        border: none;
        padding: 0;
    }

    /* Day dots on route lines */
    :global(.custom-day-dot) {
        background: transparent !important;
        border: none !important;
        pointer-events: none;
    }

    :global(.route-day-dot) {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
</style>

