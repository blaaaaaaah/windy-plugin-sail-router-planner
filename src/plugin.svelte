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

    <div class="route-editor">
        <h3>Route Editor</h3>

        <div class="url-input-container">
            <label for="route-url">Windy Route Planner URL:</label>
            <input
                id="route-url"
                type="text"
                placeholder="https://www.windy.com/route-planner/boat/..."
                bind:value={routeUrl}
                class="route-url-input"
            />
            <button on:click={parseRoute} class="parse-btn" disabled={!routeUrl.trim()}>
                Parse Route
            </button>
        </div>

        <div class="route-actions">
            <button on:click={getForecast} class="forecast-btn" disabled={!isRouteValid}>Get Forecast</button>
        </div>

        {#if parsedRoute.length > 0}
            <div class="route-preview">
                <h4>Route Preview:</h4>
                <ul>
                    {#each parsedRoute as point, index}
                        <li>{point.lat.toFixed(4)}, {point.lng.toFixed(4)} {index === 0 ? '(start)' : ''}</li>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>

    <div class="results">
        <h4>Last Result:</h4>
        <pre>{lastResult}</pre>
    </div>
</section>
<script lang="ts">
    import bcast from "@windy/broadcast";
    import { onDestroy, onMount } from 'svelte';
    import { RouteDefinition } from './types/RouteTypes';
    import { WindyAPI, WeatherForecastService } from './services';

    import config from './pluginConfig';

    const { title } = config;

    let lastResult = 'No API calls made yet';

    // Route editor state
    let routeUrl = 'https://www.windy.com/route-planner/boat/2.8726,-84.8206;-0.2539,-86.6167;-0.1687,-88.8618;-0.7887,-90.2270;1.0536,-89.9273;2.8996,-91.9098;0.6286,-94.1834?-1.115,-90.163,6,p:cities';
    let parsedRoute: { lat: number; lng: number }[] = [];

    // Reactive validation
    $: isRouteValid = parsedRoute.length >= 2;

    function parseRoute() {
        try {
            console.log('Parsing route URL:', routeUrl);

            // Extract coordinates from URL
            // URL format: https://www.windy.com/route-planner/boat/2.8652,-84.7625;1.4136,-88.0899;-0.7887,-90.2270?...
            const match = routeUrl.match(/route-planner\/boat\/([^?]+)/);

            if (!match) {
                throw new Error('Invalid Windy route planner URL format');
            }

            const coordsString = match[1];
            console.log('Extracted coordinates string:', coordsString);

            // Split by semicolon to get coordinate pairs
            const coordPairs = coordsString.split(';');

            if (coordPairs.length < 2) {
                throw new Error('Route must have at least 2 waypoints');
            }

            // Parse each coordinate pair
            const coordinates = coordPairs.map((pair, index) => {
                const coords = pair.split(',');
                if (coords.length !== 2) {
                    throw new Error(`Invalid coordinate pair at position ${index + 1}: ${pair}`);
                }

                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);

                if (isNaN(lat) || isNaN(lng)) {
                    throw new Error(`Invalid coordinates at position ${index + 1}: ${pair}`);
                }

                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    throw new Error(`Coordinates out of range at position ${index + 1}: ${pair}`);
                }

                return { lat, lng };
            });

            parsedRoute = coordinates;
            console.log('Successfully parsed route:', parsedRoute);
            lastResult = `Route parsed successfully with ${parsedRoute.length} waypoints.`;

        } catch (error) {
            console.error('Error parsing route:', error);
            lastResult = `Error parsing route: ${error}`;
            parsedRoute = [];
        }
    }

    async function getForecast() {
        if (!isRouteValid) return;

        try {
            console.log('=== CREATING ROUTE FROM PARSED URL ===');

            const L = (window as any).L;

            // Create start point from first coordinate
            const startPoint = new L.LatLng(parsedRoute[0].lat, parsedRoute[0].lng);
            const departureTime = Date.now(); // Use current time as departure

            const route = new RouteDefinition(startPoint, departureTime);

            // Add all legs with 5 knots default speed
            for (let i = 1; i < parsedRoute.length; i++) {
                const endPoint = new L.LatLng(parsedRoute[i].lat, parsedRoute[i].lng);
                route.addLeg(endPoint, 5); // Default 5 knots speed
            }

            console.log('Route created:', route);
            console.log('Route legs:', route.getLegs());

            // Get forecast
            const windyAPI = new WindyAPI();
            const weatherService = new WeatherForecastService(windyAPI);
            const forecast = await weatherService.getRouteForecast(route);

            console.log('Weather forecast:', forecast);
            console.log('Point forecasts count:', forecast.pointForecasts.length);

            // Display results
            lastResult = `Route Forecast Complete!\\n${forecast.pointForecasts.length} hourly forecasts generated.\\nSee console for detailed output.`;

            // Log sample forecasts
            forecast.pointForecasts.slice(0, 5).forEach((point, index) => {
                console.log(`Point ${index}:`, {
                    time: new Date(point.timestamp).toISOString(),
                    position: `${point.point.lat.toFixed(4)}, ${point.point.lng.toFixed(4)}`,
                    bearing: `${point.bearing.toFixed(0)}°`,
                    northUpWind: `${point.northUp.windSpeed.toFixed(1)} knots @ ${point.northUp.windDirection.toFixed(0)}°`,
                    apparentWind: `${point.apparent.windSpeed.toFixed(1)} knots @ ${point.apparent.windDirection.toFixed(0)}°`,
                    leg: point.leg.course.toFixed(0) + '° course'
                });
            });

        } catch (error) {
            console.error('Route forecast failed:', error);
            lastResult = `Route Forecast Error: ${error}`;
        }
    }


    export const onopen = (params: unknown) => {
        console.log('=== PLUGIN ONOPEN ===');

        console.log('onopen params:', params);
        console.log('Window W:', (window as any).W);

        // Inspect available APIs
        if ((window as any).W) {
            const W = (window as any).W;
            console.log('W.user:', W.user);
            console.log('W.store:', W.store);
            console.log('W.utils:', W.utils);
            console.log('W.subscription:', W.subscription);
        }
    };

    onMount(() => {
        console.log('=== PLUGIN ONMOUNT ===');

        console.log('Plugin mounted');
        console.log('Global window:', window);

        // Check for Windy globals
        if (typeof (window as any).W !== 'undefined') {
            console.log('Windy W object available:', (window as any).W);

            // Log all available keys
            console.log('W keys:', Object.keys((window as any).W));

            // Check for specific APIs we need
            const W = (window as any).W;
            console.log('Has interpolateLatLon?', typeof W.interpolateLatLon);
            console.log('Has user?', !!W.user);
            console.log('Has store?', !!W.store);

            // Try to access store if available
            if (W.store) {
                console.log('Store methods:', Object.keys(W.store));
            }
        } else {
            console.log('Windy W object not available yet');
        }

        // Check localStorage/sessionStorage
        console.log('localStorage keys:', Object.keys(localStorage));
        console.log('sessionStorage keys:', Object.keys(sessionStorage));
    });

    onDestroy(() => {
        console.log('=== PLUGIN ONDESTROY ===');

        console.log('Plugin destroyed');
    });

</script>

<style lang="less">
    .route-editor {
        padding: 20px;
        border-bottom: 1px solid #ddd;

        h3 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
        }

        .url-input-container {
            margin-bottom: 15px;

            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #333;
                font-size: 14px;
            }

            .route-url-input {
                width: 100%;
                padding: 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
                margin-bottom: 10px;
                box-sizing: border-box;

                &::placeholder {
                    color: #999;
                }
            }

            .parse-btn {
                padding: 8px 16px;
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;

                &:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                &:hover:not(:disabled) {
                    background: #138496;
                }
            }
        }

        .route-preview {
            margin-top: 15px;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;

            h4 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 14px;
            }

            ul {
                margin: 0;
                padding-left: 20px;

                li {
                    margin-bottom: 5px;
                    font-family: monospace;
                    font-size: 13px;
                    color: #555;
                }
            }
        }

        .route-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;

            .forecast-btn {
                padding: 10px 20px;
                background: #007cba;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;

                &:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                &:hover:not(:disabled) {
                    background: #006ba1;
                }
            }
        }
    }

    .results {
        padding: 20px;

        h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 14px;
        }

        pre {
            background: #f8f9fa;
            padding: 10px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            font-size: 12px;
            overflow-x: auto;
            max-height: 200px;
            overflow-y: auto;
        }
    }
</style>

