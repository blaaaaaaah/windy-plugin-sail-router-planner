<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { RouteForecast } from '../types/WeatherTypes';
    import type { RouteDefinition } from '../types/RouteTypes';
    import ForecastTable from './ForecastTable.svelte';

    export let forecast: RouteForecast | null = null;
    export let isLoading: boolean = false;
    export let activeRoute: RouteDefinition | null = null;

    const dispatch = createEventDispatcher();

    // Debug activeRoute
    $: console.log('ForecastContainer activeRoute:', activeRoute);

    // Wind data display mode
    let showTrueWind: boolean = true;

    function setShowTrueWind(value: boolean) {
        showTrueWind = value;
        dispatch('windModeChanged', { showTrueWind: value });
    }

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

    function handleSettingsClick() {
        console.log('Settings clicked - will implement settings panel later');
        dispatch('settingsClicked');
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
    <!-- Header Controls - only show when there's an active route -->
    {#if activeRoute}
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
            <div class="toggle-center">
            </div>
            <div class="toggle-right">
                <span class="settings-icon iconfont fg-icons" on:click={handleSettingsClick}>1</span>
            </div>
        </div>
    {/if}

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

    /* Wind data toggle header */
    .wind-data-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        font-size: 12px;
        color: #666;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        flex-shrink: 0;
    }

    .toggle-left {
        display: flex;
        align-items: center;
    }

    .toggle-center {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
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

    .departure-control {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
    }

    .departure-label {
        color: #666;
        font-weight: 500;
        white-space: nowrap;
    }

    .departure-input {
        padding: 3px 6px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 11px;
        background: white;
        color: #333;
        font-family: system-ui, -apple-system, sans-serif;
        min-width: 140px;

        &:focus {
            outline: none;
            border-color: #007cba;
            box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.2);
        }

        &:hover {
            border-color: #bbb;
        }
    }

    .settings-icon {
        cursor: pointer;
        color: #666;
        font-size: 16px;
        padding: 4px;
        border-radius: 3px;
        transition: color 0.2s ease, background 0.2s ease;

        &:hover {
            color: #333;
            background: rgba(0, 0, 0, 0.05);
        }
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