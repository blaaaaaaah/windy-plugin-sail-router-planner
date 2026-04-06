<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={ () => bcast.emit('rqstOpen', 'menu') }
    >
    { title }
    {#if activeRoute}
        <span class="wind-toggle-compact">
            <span
                class="toggle-option"
                class:active={showTrueWind}
                on:click|stopPropagation={() => setShowTrueWind(true)}
            >
                True
            </span>
            <span class="toggle-separator">/</span>
            <span
                class="toggle-option"
                class:active={!showTrueWind}
                on:click|stopPropagation={() => setShowTrueWind(false)}
            >
                Apparent
            </span>
        </span>
    {/if}
    </div>

    <div class="forecast-container">
        <ForecastContainer
            forecast={currentForecast}
            isLoading={isLoadingForecast}
            activeRoute={activeRoute}
            showTrueWind={showTrueWind}
            on:windModeChanged={handleWindModeChanged}
            on:timeHover={handleTimeHover}
            on:metricClick={handleMetricClick}
            on:routeUpdated={handleRouteUpdated}
        />
    </div>
</section>
<script lang="ts">
    import bcast from "@windy/broadcast";
    import { map } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';
    import { onDestroy, onMount } from 'svelte';
    import { RouteDefinition } from './types/RouteTypes';
    import { WindyAPI, WeatherForecastService, RouteStorage } from './services';
    import { RouteEditorController } from './controllers/RouteEditorController';
    import ForecastContainer from './components/ForecastContainer.svelte';
    import { serializeState, deserializeState } from './utils/RouteSerializer';
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
    let routeStorage: RouteStorage | null = null;
    let timestampSubscriptionId: number | null = null;

    // Wind data display mode
    let showTrueWind: boolean = true;

    // Track the current route
    let activeRoute: RouteDefinition | null = null;

    function setShowTrueWind(value: boolean) {
        showTrueWind = value;

        // Update URL to persist wind mode
        if (activeRoute) {
            const serializedState = serializeState(activeRoute, value);
            setUrl(config.name, { route: serializedState });
        } else {
            // If no route, create minimal route with just wind mode
        }
    }

    function handleWindModeChanged(event: any) {
        const { showTrueWind: newShowTrueWind } = event.detail;
        setShowTrueWind(newShowTrueWind);
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
            const result = deserializeState(params.route);
            if (result?.route && routeEditor) {
                routeEditor.loadRoute(result.route);
                console.log('Loaded route from URL');

                // Set wind mode from deserialization
                showTrueWind = result.windMode;
                console.log('Loaded wind mode from route:', showTrueWind ? 'True Wind' : 'Apparent Wind');
            }
        } else if (routeStorage) {
            // No route in URL, try to load last saved route
            const routes = routeStorage.listRoutes();
            if (routes.length > 0) {
                const lastRoute = routes[routes.length - 1];
                if (routeEditor) {
                    routeEditor.loadRoute(lastRoute);
                    console.log('Loaded last saved route');
                }
            }
        }
    };


    function onRouteUpdated(route: RouteDefinition) {
        // Update current route state
        activeRoute = routeEditor!.getActiveRoute();

        // Update URL with current route and wind mode
        const serializedState = serializeState(route, showTrueWind);
        setUrl(config.name, { route: serializedState });

        logWindyRPlannerRoute(route);

        // Generate forecast when route has 2+ waypoints
        if (route.waypoints.length >= 2) {
            generateForecastFromRoute(route);

            // Save route to storage
            routeStorage!.saveRoute(route);

            // Fetch and set route name
            weatherService!.getRouteName(route).then(routeName => {
                route.setRouteName(routeName);
                activeRoute = activeRoute; // Force reactivity
            });
        } else {
            currentForecast = null;
            route.setRouteName(null);
            activeRoute = activeRoute; // Force reactivity

            // Delete route from storage if it has less than 2 waypoints
            routeStorage!.deleteRoute(route);
        }
    }

    function logWindyRPlannerRoute(route: RouteDefinition) {
        let coordinates = route.waypoints.map(wp => `${wp.lat.toFixed(4)},${wp.lng.toFixed(4)}`).join(';');
        let url = `https://www.windy.com/route-planner/boat/${coordinates}?1.370,-85.912,6,p:cities`;
        console.log('Generated Windy RPlanner URL:', url);
    }
    


    function handleTimeHover(event: any) {
        const { timestamp, forecast } = event.detail;

        // Update Windy's store - marker will react to this change
        if (timestamp) {
            store.set('timestamp', timestamp);
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


    onMount(() => {
        routeEditor = new RouteEditorController(map, onRouteUpdated);

        // Initialize weather services
        windyAPI = new WindyAPI();
        weatherService = new WeatherForecastService(windyAPI);
        routeStorage = new RouteStorage(localStorage);

        // Subscribe to timestamp changes to update route marker position
        timestampSubscriptionId = store.on('timestamp', (timestamp: number) => {
            if (routeEditor) {
                routeEditor.setTimestamp(timestamp);
            }
        });

        console.log('Weather services initialized');
    });

    onDestroy(() => {

        // Clean up timestamp subscription
        if (timestampSubscriptionId !== null) {
            store.off('timestamp', timestampSubscriptionId);
        }

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

    .plugin__title {
        padding: 10px !important;
        margin-bottom: 0px !important;
    }

    .forecast-container {
        position: absolute;
        top: 0;
        bottom: 0;
        left:0; 
        right:0; 
        margin-top: 50px;
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

    /* Compact wind toggle in title */
    .wind-toggle-compact {
        margin-left: 12px;
        font-size: 11px;
        color: #ccc;
        display: inline-flex;
        align-items: center;
    }

    .wind-toggle-compact .toggle-option {
        cursor: pointer;
        transition: color 0.2s ease;
        font-weight: 500;
        padding: 2px 4px;
        border-radius: 2px;
        color: #bbb;
    }

    .wind-toggle-compact .toggle-option.active {
        color: #fff;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.15);
    }

    .wind-toggle-compact .toggle-option:not(.active):hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
    }

    .wind-toggle-compact .toggle-separator {
        margin: 0 4px;
        color: #888;
    }
</style>

