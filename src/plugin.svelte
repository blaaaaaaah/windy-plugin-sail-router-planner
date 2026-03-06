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
    <div class="debug-container">
        <p>Plugin loaded. Check console for debug info.</p>
        <button on:click={testRouteAPI}>Test Route API</button>
        <button on:click={testWeatherService}>Test Weather Service</button>
        <div class="results">
            <h4>Last API Result:</h4>
            <pre>{lastResult}</pre>
        </div>
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

    // Test route coordinates - using exact example from working call
    const testRoute = [
        { lat: 2.8652, lon: -84.7625 },
        { lat: -0.2539, lon: -86.6167 },
        { lat: -0.1687, lon: -88.8618 },
        { lat: -0.7887, lon: -90.2270 }
    ];

    function coordsToString(coords: any[]) {
        return coords.map(c => `${c.lat},${c.lon}`).join(';');
    }

    async function callRouteAPI(coords: any[], routeName: string) {
        try {
            console.log(`=== TESTING ${routeName.toUpperCase()} ROUTE ===`);

            const coordsString = coordsToString(coords);
            console.log('Coordinates:', coordsString);

            const url = `/rplanner/v1/forecast/boat/${coordsString}?dst2=2026/03/06/08&dst=2026/03/05/07&minifest=1772690400000;1773208800000;1,1,90;3,93,144;6,150,354&pr=0&sc=114`;
            console.log('API URL:', url);

            const W = (window as any).W;
            const response = await W.http.get(url);

            console.log('Response:', response);

            // Show full response data
            const data = response.data;
            console.log('Full response data:', data);

            // Format full result for display
            lastResult = JSON.stringify(data, null, 2);

            return response;
        } catch (error) {
            console.error(`Error testing ${routeName} route:`, error);
            lastResult = `Error: ${error}`;
            throw error;
        }
    }

    function debugCurrentState() {
        console.log('=== DEBUGGING CURRENT STATE ===');

        // Add your debug inspection here
        console.log('Window object:', window);
        console.log('Windy W object:', (window as any).W);
    }

    function testRouteAPI() {
        console.log('Testing route...');
        callRouteAPI(testRoute, 'TEST');
    }

    async function testWeatherService() {
        try {
            console.log('=== TESTING WEATHER FORECAST SERVICE ===');

            // Create a test route
            const L = (window as any).L;
            const startPoint = new L.LatLng(2.8652, -84.7625);
            const departureTime = new Date('2026-03-05T07:00:00Z').getTime();

            const route = new RouteDefinition(startPoint, departureTime);
            route.addLeg(new L.LatLng(-0.2539, -86.6167), 5); // 5 knots
            route.addLeg(new L.LatLng(-0.7887, -90.2270), 6); // 6 knots

            console.log('Route created:', route);
            console.log('Route legs:', route.getLegs());

            // Create services
            const windyAPI = new WindyAPI();
            const weatherService = new WeatherForecastService(windyAPI);

            // Get forecast
            const forecast = await weatherService.getRouteForecast(route);

            console.log('Weather forecast:', forecast);
            console.log('Point forecasts count:', forecast.pointForecasts.length);

            // Display first few point forecasts
            forecast.pointForecasts.forEach((point, index) => {
                console.log(`Point ${index}:`, {
                    time: new Date(point.timestamp).toISOString(),
                    position: `${point.point.lat.toFixed(4)}, ${point.point.lng.toFixed(4)}`,
                    northUpWind: `${point.northUp.windSpeed.toFixed(1)} knots @ ${point.northUp.windDirection.toFixed(0)}°`,
                    apparentWind: `${point.apparent.windSpeed.toFixed(1)} knots @ ${point.apparent.windDirection.toFixed(0)}°`,
                    leg: point.leg.course.toFixed(0) + '° course'
                });
            });

            lastResult = `Weather Service Test Complete!\n${forecast.pointForecasts.length} hourly forecasts generated.\nSee console for detailed output.`;

        } catch (error) {
            console.error('Weather service test failed:', error);
            lastResult = `Weather Service Error: ${error}`;
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

    // Additional lifecycle hooks for debugging
    import { beforeUpdate, afterUpdate, tick } from 'svelte';

    beforeUpdate(() => {
        console.log('=== BEFORE UPDATE ===');
    });

    afterUpdate(() => {
        console.log('=== AFTER UPDATE ===');
    });

    // Global error handler
    if (typeof window !== 'undefined') {
        window.addEventListener('error', (event) => {
            console.log('=== GLOBAL ERROR ===');
            console.log('Error:', event.error);
        });
    }
</script>

<style lang="less">
    .debug-container {
        padding: 20px;

        button {
            padding: 10px 20px;
            margin: 10px 0;
            background: #007cba;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
    }

    // Put any additional LESS or CSS styles here
</style>

