<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { RouteDefinition } from '../types/RouteTypes';
    import type { RouteForecast } from '../types/WeatherTypes';
    import { formatDistance } from '../utils/FormatUtils';
    import { formatDuration, formatDateTime } from '../utils/TimeUtils';
    import { formatCoordinate } from '../utils/NavigationUtils';

    export let routes: RouteDefinition[] = [];
    export let cachedForecasts: Map<string, RouteForecast> = new Map();

    const dispatch = createEventDispatcher();

    function selectRoute(route: RouteDefinition) {
        dispatch('routeSelected', { route });
    }

    function toggleVisibility(route: RouteDefinition) {
        dispatch('toggleVisibility', { route });
    }

    function saveRoute(route: RouteDefinition) {
        dispatch('saveRoute', { route });
    }

    function deleteRoute(route: RouteDefinition) {
        dispatch('deleteRoute', { route });
    }

    function toggleFavorite(route: RouteDefinition) {
        if (route.isSaved) {
            // Remove from favorites (unfavorite) - remove from storage but keep in memory/list
            dispatch('deleteRoute', { route });
        } else {
            // Add to favorites
            dispatch('saveRoute', { route });
        }
    }

    function getRouteName(route: RouteDefinition): string {
        if (route.name) {
            return route.name;
        }

        // Use coordinate formatting from NavigationUtils
        const start = route.waypoints[0];
        const end = route.waypoints[route.waypoints.length - 1];
        return `${formatCoordinate(start.lat, true)} ${formatCoordinate(start.lng, false)} → ${formatCoordinate(end.lat, true)} ${formatCoordinate(end.lng, false)}`;
    }
</script>

<div class="route-list-panel">

    <div class="route-list-content">
        {#if routes.length === 0}
            <div class="no-routes-message">
                <div class="placeholder-icon">🗺️</div>
                <h3>No route created yet</h3>
                <p>Draw a route on the map by clicking to add waypoints. You need at least 2 waypoints to generate a weather forecast.</p>
            </div>
        {:else}
            <div class="route-list">
                {#each routes as route (route.id)}
                    <div class="route-row">
                        <div class="visibility-checkbox" on:click|stopPropagation>
                            <input
                                type="checkbox"
                                checked={route.isVisible}
                                on:change={() => toggleVisibility(route)}
                                title={route.isVisible ? 'Hide route' : 'Show route'}
                            />
                        </div>

                        <div class="route-item" class:unsaved={!route.isSaved} on:click={() => selectRoute(route)} style="border-left: 4px solid {route.color}">
                            <div class="route-content">
                                <div class="route-name">
                                    {getRouteName(route)}
                                </div>
                                <div class="route-metrics">
                                    <span class="metric">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                            <polyline points="22,4 12,14.01 9,11.01"/>
                                        </svg>
                                        {formatDistance(route.totalDistance)}
                                    </span>
                                    <span class="metric">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12,6 12,12 16,14"/>
                                        </svg>
                                        {formatDuration(route.totalDuration)}
                                    </span>
                                    <span class="metric">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                                            <line x1="16" x2="16" y1="2" y2="6"/>
                                            <line x1="8" x2="8" y1="2" y2="6"/>
                                            <line x1="3" x2="21" y1="10" y2="10"/>
                                        </svg>
                                        {formatDateTime(route.departureTime)}
                                    </span>
                                    <button class="metric favorite-button" on:click|stopPropagation={() => toggleFavorite(route)} title={route.isSaved ? 'Remove from favorites' : 'Add to favorites'}>
                                        {#if route.isSaved}
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                        {:else}
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                            </svg>
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if routes.length > 0}
        <div class="route-list-footer">
            <p>⚠️ Non-favorited routes will be lost after browser refresh</p>
        </div>
    {/if}
</div>

<style lang="less">
    .route-list-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #f5f5f5;
        color: #495057;
    }

    .panel-header {
        padding: 16px;
        border-bottom: 1px solid var(--color-border-light);

        h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
    }

    .route-list-content {
        flex: 1;
        overflow-y: auto;
    }

    .no-routes-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        background: #f8f9fa;
        text-align: center;
        height: 100%;
        width: 100%;

        .placeholder-icon {
            font-size: 48px;
            margin-bottom: 20px;
            opacity: 0.6;
        }

        h3 {
            color: #495057;
            font-size: 18px;
            margin: 0 0 12px 0;
            font-weight: 600;
        }

        p {
            color: #6c757d;
            font-size: 14px;
            margin: 0;
            max-width: 320px;
            line-height: 1.5;
        }
    }

    .route-list {
        padding: 8px;
    }

    .route-row {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
    }

    .route-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: var(--color-bg-secondary);
        cursor: pointer;
        flex: 1;
        transition: background-color 0.15s ease;

        &:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        &.unsaved {
            font-style: italic;
        }
    }

    .visibility-checkbox {
        padding: 12px 8px 12px 12px;
        display: flex;
        align-items: center;

        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
    }

    .route-content {
        flex: 1;
        min-width: 0;
        width: 100%;
    }

    .route-name {
        font-weight: 500;
        font-size: 12px;
        margin-bottom: 4px;
        width: 100%;
    }

    .route-metrics {
        display: flex;
        justify-content: space-between;

        .metric {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: #6c757d;
        }

        .favorite-button {
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            color: #dc3545;
            transition: all 0.2s ease;

            &:hover {
                transform: scale(1.1);
            }
        }
    }

    .route-details {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;

        .detail-item {
            font-size: 12px;
            color: #6c757d;
            white-space: nowrap;
        }
    }

    .route-actions {
        display: flex;
        gap: 8px;
        margin-left: 12px;
    }

    .action-button {
        background: transparent;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.1);
        }
    }


    .delete-button:hover {
        background: rgba(220, 53, 69, 0.2);
    }

    .save-button:hover {
        background: rgba(40, 167, 69, 0.2);
    }

    .route-list-footer {
        padding: 16px;
        border-top: 1px solid #dee2e6;
        background: #f8f9fa;
        text-align: center;

        p {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
            font-style: italic;
        }
    }
</style>