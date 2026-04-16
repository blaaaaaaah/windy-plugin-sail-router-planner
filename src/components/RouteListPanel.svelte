<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { RouteDefinition } from '../types/RouteTypes';
    import { formatDistance } from '../utils/FormatUtils';
    import { formatDuration, formatDateTime } from '../utils/TimeUtils';
    import RouteFavoriteButton from './RouteFavoriteButton.svelte';

    export let routes: RouteDefinition[] = [];
    export let highlightedRoute: RouteDefinition | null = null;

    const dispatch = createEventDispatcher();

    function selectRoute(route: RouteDefinition) {
        dispatch('routeSelected', { route });
    }

    function toggleVisibility(route: RouteDefinition) {
        dispatch('toggleVisibility', { route });
    }

    function toggleFavorite(event:CustomEvent) {
        const { route } = event.detail;
        dispatch('toggleFavorite', { route });
    }

    function handleCompare(event:CustomEvent) {
        const visibleRoutes = routes.filter(route => route.isVisible);
        dispatch('compareRoutes', { routes: visibleRoutes });
    }
    
    function onRouteHover(route: RouteDefinition) {
        dispatch('routeHighlighted', { route });
    }

    function onRouteUnhover() {
        dispatch('routeHighlighted', { route: null });
    }

    function toggleSelectAll() {
        const visibleRoutes = routes.filter(route => route.isVisible);
        const allVisible = visibleRoutes.length === routes.length;

        if (allVisible) {
            // All routes visible -> hide all
            routes.forEach(route => {
                if (route.isVisible) {
                    toggleVisibility(route);
                }
            });
        } else {
            // Some or no routes visible -> show all
            routes.forEach(route => {
                if (!route.isVisible) {
                    toggleVisibility(route);
                }
            });
        }
    }

    $: visibleRoutes = routes.filter(route => route.isVisible);
    $: selectAllState = visibleRoutes.length === 0 ? 'none' :
                       visibleRoutes.length === routes.length ? 'all' : 'partial';
    $: isCompareDisabled = visibleRoutes.length == 0 || visibleRoutes.length > 3;

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
            <div class="route-list-header">
                <div class="select-all-checkbox" on:click|stopPropagation>
                    <input
                        type="checkbox"
                        checked={selectAllState !== 'none'}
                        class:partial={selectAllState === 'partial'}
                        on:change={toggleSelectAll}
                        title={selectAllState === 'all' ? 'Hide all routes' : 'Show all routes'}
                    />
                </div>
                <button class="compare-button" disabled={isCompareDisabled} title="Compare routes" on:click={handleCompare}>
                    Compare 
                </button>
                <div class="header-chevron">
                    <svg width="20" height="14" viewBox="0 0 20 14">
                        <path d="M0 2 L10 12 L20 2 Z" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1"/>
                        <path d="M0 2 L20 2" stroke="#f8f9fa" stroke-width="1"/>
                    </svg>
                </div>
            </div>
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

                        <div
                            class="route-item"
                            class:unsaved={!route.isSaved}
                            class:highlighted={highlightedRoute?.id === route.id}
                            on:click={() => selectRoute(route)}
                            on:mouseover={() => onRouteHover(route)}
                            on:mouseout={onRouteUnhover}
                            style="border-left: 4px solid {route.color}"
                        >
                            <div class="route-content">
                                <div class="route-name">
                                    {route.name || ''}
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
                                </div>
                            </div>
                            <RouteFavoriteButton {route} on:toggleFavorite={toggleFavorite}/>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if routes.length > 0}
        <div class="route-list-footer">
            <p>♥️ Favorited routes are saved when leaving the page</p>
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

    .route-list-header {
        padding: 8px 12px;
        border-bottom: 1px solid #dee2e6;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        position: relative;
        gap: 8px;
    }

    .compare-button {
        background: #ffffff;
        border: 1px solid #dee2e6;
        color: #6c757d;
        font-size: 12px;
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

        &:disabled {
            cursor: not-allowed;
            background: #f8f9fa;
            opacity: 0.6;
        }
    }

    .select-all-checkbox {
        display: flex;
        align-items: center;

        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: #007bff;

            &.partial {
                background-color: #6c757d;
                accent-color: #6c757d;
            }

            &:checked.partial {
                background-color: #6c757d;
            }
        }
    }

    .header-chevron {
        position: absolute;
        bottom: -12px;
        left: 8px;
        background: transparent;
        z-index: 10;
        padding: 1px;

        svg {
            display: block;
        }
    }

    .route-list {
        padding-top: 8px;
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
        gap: 12px;

        &:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        &.highlighted {
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
        font-size: 13px;
        margin-bottom: 8px;
        width: 100%;
    }

    .route-metrics {
        display: flex;
        justify-content: space-between;

        .metric {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #6c757d;
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
        padding: 8px 16px;
        border-top: 1px solid #dee2e6;
        background: #f8f9fa;
        text-align: center;

        p {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
        }
    }
</style>