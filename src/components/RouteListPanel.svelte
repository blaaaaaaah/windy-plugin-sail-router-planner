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
                    <div class="route-item" class:unsaved={!route.isSaved} on:click={() => selectRoute(route)}>
                        <div class="route-main-info">
                            <div class="route-header">
                                <span class="route-icon">🗺️</span>
                                <span class="route-name" class:italic={!route.isSaved}>
                                    {getRouteName(route)}
                                    {#if !route.isSaved}
                                        <span class="unsaved-indicator"> (unsaved)</span>
                                    {/if}
                                </span>
                            </div>

                            <div class="route-details">
                                <span class="detail-item">
                                    📏 {formatDistance(route.totalDistance / 1852)}
                                </span>
                                <span class="detail-item">
                                    ⏱️ {formatDuration(route.totalDuration)}
                                </span>
                                <span class="detail-item">
                                    🛫 {formatDateTime(route.departureTime)}
                                </span>
                            </div>
                        </div>

                        <div class="route-actions" on:click|stopPropagation>
                            <button
                                class="action-button visibility-button"
                                class:visible={route.isVisible}
                                on:click={() => toggleVisibility(route)}
                                title={route.isVisible ? 'Hide route' : 'Show route'}
                            >
                                {#if route.isVisible}
                                    👁️
                                {:else}
                                    👁️‍🗨️
                                {/if}
                            </button>

                            {#if !route.isSaved}
                                <button
                                    class="action-button save-button"
                                    on:click={() => saveRoute(route)}
                                    title="Save route"
                                >
                                    💾
                                </button>
                            {/if}

                            <button
                                class="action-button delete-button"
                                on:click={() => deleteRoute(route)}
                                title="Delete route"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
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

    .route-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        margin-bottom: 8px;
        background: var(--color-bg-secondary);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
            background: var(--color-bg-hover);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        &.unsaved {
            border-left: 4px solid #f39c12;
        }
    }

    .route-main-info {
        flex: 1;
        min-width: 0;
    }

    .route-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;

        .route-icon {
            font-size: 14px;
            margin-right: 8px;
        }

        .route-name {
            font-weight: 500;
            font-size: 14px;

            &.italic {
                font-style: italic;
            }

            .unsaved-indicator {
                color: #6c757d;
                font-size: 12px;
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

    .visibility-button {
        &.visible {
            opacity: 1;
        }

        &:not(.visible) {
            opacity: 0.5;
        }
    }

    .delete-button:hover {
        background: rgba(220, 53, 69, 0.2);
    }

    .save-button:hover {
        background: rgba(40, 167, 69, 0.2);
    }
</style>