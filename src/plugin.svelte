<div class="plugin__mobile-header">
    { title }
</div>
<section class="plugin__content">
    <div class="panel-container" class:forecast-active={activeRoute !== null}>
        <!-- Route List Panel -->
        <div class="route-list-panel">
            <div
                class="plugin__title plugin__title--chevron-back"
                on:click={ () => bcast.emit('rqstOpen', 'menu') }
            >
                Sail Router Planner
            </div>
            <RouteListPanel
                routes={allRoutes}
                {highlightedRoute}
                on:routeSelected={handleRouteSelected}
                on:toggleVisibility={handleToggleVisibility}
                on:saveRoute={handleSaveRoute}
                on:deleteRoute={handleDeleteRoute}
                on:routeHighlighted={handleRouteHighlighted}
            />
        </div>

        <!-- Forecast Panel -->
        <div class="forecast-panel">
            <div
                class="plugin__title plugin__title--chevron-back"
                on:click={handleBackToRoutes}
            >
                Routes
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
        </div>
    </div>
</section>
<script lang="ts">
    import bcast from "@windy/broadcast";
    import { map } from '@windy/map';
    import store from '@windy/store';
    import { onDestroy, onMount } from 'svelte';
    import { RouteDefinition } from './types/RouteTypes';
    import { WindyAPI, WeatherForecastService, RouteStorage } from './services';
    import { RouteEditorController } from './controllers/RouteEditorController';
    import ForecastContainer from './components/ForecastContainer.svelte';
    import RouteListPanel from './components/RouteListPanel.svelte';
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
    let forecastUpdateTimer: number | null = null;

    // Wind data display mode
    let showTrueWind: boolean = true;

    // Track the current route
    let activeRoute: RouteDefinition | null = null;
    let highlightedRoute: RouteDefinition | null = null;

    // All routes for multi-route functionality
    let allRoutes: RouteDefinition[] = [];

    // Forecast caching
    let cachedForecasts: Map<string, RouteForecast> = new Map();

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

    // Fetch geo name for route if needed
    function fetchGeoNameIfNeeded(route: RouteDefinition) {
        if (route.name === null && route.waypoints.length >= 2) {
            weatherService!.getRouteName(route).then(geoName => {
                route.setCachedGeoName(geoName);
                // Force reactivity for both activeRoute and allRoutes
                activeRoute = activeRoute;
                allRoutes = routeEditor!.getAllRoutes();
            }).catch(error => {
                console.error('Failed to fetch geo name:', error);
            });
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
            // Cache the forecast for future route switches
            cachedForecasts.set(route.id, forecast);
            // Force Svelte reactivity with new object reference
            currentForecast = { ...forecast };

            console.log('Forecast generated:', forecast.pointForecasts.length, 'points');
        } catch (error) {
            console.error('Failed to generate forecast:', error);
        } finally {
            isLoadingForecast = false;
        }
    }

    // Callback from RouteEditorController when active route changes
    function onActiveRouteChanged(route: RouteDefinition | null) {
        activeRoute = route;
        allRoutes = routeEditor!.getAllRoutes();

        if (route) {

            const serializedState = serializeState(route, showTrueWind);
            setUrl(config.name, { route: serializedState });

            // Check cache first, then generate forecast
            if (cachedForecasts.has(route.id)) {
                currentForecast = cachedForecasts.get(route.id)!;
            } else {
                generateForecastFromRoute(route);
            }

            // Fetch geo name if needed
            fetchGeoNameIfNeeded(route);
        } else {
            setUrl(config.name, { route: null });
            currentForecast = null;
        }
    }

    // Callback from RouteEditorController when highlighted route changes
    function onRouteHighlighted(route: RouteDefinition | null) {
        // Update highlighted route state for list highlighting
        highlightedRoute = route;
    }

    // Multi-route panel handlers
    function handleRouteSelected(event: any) {
        const { route } = event.detail;

        // Set active route immediately (triggers panel slide)
        routeEditor!.setActiveRoute(route);

        // Clear current forecast and set loading state
        currentForecast = null;
        isLoadingForecast = true;

        // Check cache first, then generate forecast
        if (cachedForecasts.has(route.id)) {
            setTimeout(() => {
                currentForecast = cachedForecasts.get(route.id)!;
                isLoadingForecast = false;
            }, 0);
        } else {
            generateForecastFromRoute(route);
        }
    }

    function handleBackToRoutes() {
        routeEditor!.setActiveRoute(null);
    }

    function handleToggleVisibility(event: any) {
        const { route } = event.detail;
        routeEditor!.setRouteVisibility(route, !route.isVisible);
        allRoutes = routeEditor!.getAllRoutes();
    }

    function handleSaveRoute(event: any) {
        const { route } = event.detail;
        routeStorage!.saveRoute(route);
        allRoutes = routeEditor!.getAllRoutes();
    }

    function handleDeleteRoute(event: any) {
        const { route } = event.detail;
        // Only remove from storage, keep in memory/list so user can favorite again
        routeStorage!.deleteRoute(route);
        // Update route.isSaved to false so heart icon becomes empty
        route.isSaved = false;
        allRoutes = routeEditor!.getAllRoutes();
    }

    function handleRouteHighlighted(event: any) {
        const { route } = event.detail;
        routeEditor!.highlightRoute(route);
    }

    export const onopen = (params: any) => {
        console.log('=== PLUGIN ONOPEN ===', params);

        // Load all saved routes first (this is done in onMount, but ensure allRoutes is updated)
        allRoutes = routeEditor!.getAllRoutes();

        // Handle URL route if present
        if (params?.route) {
            const result = deserializeState(params.route);
            if (result?.route) {
                // Set wind mode from deserialization
                showTrueWind = result.windMode;
                console.log('Loaded wind mode from route:', showTrueWind ? 'True Wind' : 'Apparent Wind');

                // Check if this route matches any saved route by ID
                const existingRoute = allRoutes.find(savedRoute => savedRoute.id === result.route.id);

                if (existingRoute) {
                    // Found existing saved route - activate it (RouteEditorController will make it visible)
                    routeEditor!.setActiveRoute(existingRoute);
                    console.log('Activated existing saved route from URL');
                } else {
                    // URL route is new - load and activate it
                    routeEditor!.loadRoute(result.route);
                    routeEditor!.setActiveRoute(result.route);
                    fetchGeoNameIfNeeded(result.route);
                    allRoutes = routeEditor!.getAllRoutes();
                    console.log('Loaded and activated new route from URL');
                }
            }
        }
        // If no URL route, stay in route list view (no active route)
    };


    function onRouteUpdated(route: RouteDefinition) {

        // Generate forecast when route has 2+ waypoints
        if (route.waypoints.length >= 2) {
            // Update URL with current route and wind mode
            const serializedState = serializeState(route, showTrueWind);
            setUrl(config.name, { route: serializedState });

            logWindyRPlannerRoute(route);

            if ( route.isSaved ) {
                routeStorage!.saveRoute(route);
            }

            activeRoute = routeEditor!.getActiveRoute();

            // Clear cached forecast since route properties changed
            cachedForecasts.delete(route.id);
            generateForecastFromRoute(route);

            // Fetch and set geo name only if no name is set yet
            if (route.name === null) {
                weatherService!.getRouteName(route).then(geoName => {
                    route.setCachedGeoName(geoName);
                    activeRoute = activeRoute; // Force reactivity
                    allRoutes = routeEditor!.getAllRoutes(); // Update route list
                });
            }
        } else {
            if ( route.isSaved ) {
                routeStorage!.deleteRoute(route);
            }
            currentForecast = null;
            route.setCachedGeoName(null);
            activeRoute = activeRoute; // Force reactivity
        }

        // Update route list to include new/modified routes
        allRoutes = routeEditor!.getAllRoutes();
    }

    async function checkForForecastUpdates() {
        if (!weatherService) return;

        console.log('Checking for forecast updates...');

        // Check all cached forecasts for updates
        let currentForecastUpdated = false;

        for (const [routeId, forecast] of cachedForecasts) {
            try {
                const hasUpdate = await weatherService.hasUpdatedForecast(forecast);
                if (hasUpdate) {
                    console.log(`Forecast updated for route ${routeId}, removing from cache`);
                    cachedForecasts.delete(routeId);

                    // Check if this is the current active forecast
                    if (activeRoute && activeRoute.id === routeId) {
                        currentForecastUpdated = true;
                    }
                }
            } catch (error) {
                console.error(`Error checking forecast update for route ${routeId}:`, error);
            }
        }

        // If current forecast is outdated, reload it
        if (currentForecastUpdated) {
            console.log('Current forecast is outdated, reloading...');
            generateForecastFromRoute(activeRoute!);
        } else {
            currentForecast = currentForecast; // Force reactivity to update "Updated X minutes ago" timestamp
        }
    }

    function logWindyRPlannerRoute(route: RouteDefinition) {
        let coordinates = route.waypoints.map(wp => `${wp.lat.toFixed(4)},${wp.lng.toFixed(4)}`).join(';');
        let url = `https://www.windy.com/route-planner/boat/${coordinates}?1.370,-85.912,6,p:cities`;
        console.log('Generated Windy RPlanner URL:', url);
    }
    


    function handleTimeHover(event: any) {
        const { timestamp } = event.detail;

        if (timestamp) {
            // Update Windy's store (this may be ignored for past dates without forecast data)
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

        // Update route display (day markers, distance labels, etc.) when route properties change
        if (routeEditor) {
            routeEditor.updateActiveRoute(route);
        }
    }


    onMount(() => {
        routeEditor = new RouteEditorController(map, onRouteUpdated, onActiveRouteChanged, onRouteHighlighted);

        // Initialize weather services
        windyAPI = new WindyAPI();
        weatherService = new WeatherForecastService(windyAPI);
        routeStorage = new RouteStorage(localStorage);

        // Load all routes from storage on startup
        const savedRoutes = routeStorage.listRoutes();
        savedRoutes.forEach(route => {
            routeEditor!.loadRoute(route);
            fetchGeoNameIfNeeded(route);
        });
        allRoutes = routeEditor!.getAllRoutes();


        // Subscribe to timestamp changes to update route marker position
        timestampSubscriptionId = store.on('timestamp', (timestamp: number) => {
            if (routeEditor) {
                // Windy will emit the value we just gave but will emit right after the clamped value 
                if ( currentForecast && timestamp == currentForecast.forecastWindow?.start ) {
                    // If the timestamp is exactly at the start of the forecast window, it's a clamp from Windy. Ignore it to prevent jumping back to the start of the route.
                    return;
                }
                routeEditor.setTimestamp(timestamp);
            }
        });

        // Start forecast update timer (check every minute)
        forecastUpdateTimer = setInterval(checkForForecastUpdates, 60000);

        console.log('Weather services initialized');
    });

    onDestroy(() => {

        // Clean up timestamp subscription
        if (timestampSubscriptionId !== null) {
            // TODO wrong usage, fix me
            store.off('timestamp', timestampSubscriptionId);
        }

        // Clean up forecast update timer
        if (forecastUpdateTimer !== null) {
            clearInterval(forecastUpdateTimer);
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
        overflow: hidden;
    }

    .plugin__title {
        padding: 10px !important;
        margin-bottom: 0px !important;
        position: relative;
        max-width: none !important;
    }

    /* Sliding panel container */
    .panel-container {
        display: flex;
        width: 200%;
        height: 100%;
        transform: translateX(0);
        transition: transform 300ms ease-in-out;

        &.forecast-active {
            transform: translateX(-50%);
        }
    }

    .route-list-panel,
    .forecast-panel {
        width: 50%;
        height: 100%;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
    }

    .forecast-container {
        flex: 1;
        position: relative;
        height: 0; /* Force flex to constrain height */
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
        position: absolute;
        right: 12px;
        bottom: 12px;
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

