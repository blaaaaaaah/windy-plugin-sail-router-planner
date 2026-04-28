<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LegDetail from './LegDetail.svelte';
    import type { RouteDefinition } from '../types/RouteTypes';
    import type { WeatherStats } from '../types/WeatherTypes';
    import { formatDuration } from '../utils/TimeUtils';
    import { formatDistance } from '../utils/FormatUtils';

    export let route: RouteDefinition | null;
    export let routeStats: WeatherStats | null = null; // Overall route statistics (total distance, time, etc.)
    let isExpanded: boolean = false;
    let isEditingName: boolean = false;
    let editedName: string = '';
    let nameInputElement: HTMLInputElement;

    const dispatch = createEventDispatcher();

    function handleClick() {
        isExpanded = !isExpanded;
    }

    function calculateAverageSpeed(): number {
        if (!route || !route.legs || route.legs.length === 0) return 0;
        const totalSpeed = route.legs.reduce((sum, leg) => sum + leg.averageSpeed, 0);
        return totalSpeed / route.legs.length;
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

        if (newDateTimeString && route) {
            const newDepartureTime = new Date(newDateTimeString).getTime();
            if (!isNaN(newDepartureTime)) {
                console.log(`Updated departure time to ${new Date(newDepartureTime)}`);

                // Update the route departure time directly
                route.setDepartureTime(newDepartureTime);

                // Dispatch routeUpdated to trigger forecast regeneration
                dispatch('routeUpdated', {
                    route: route
                });
            }
        }
    }

    function handleSaveClick() {
        console.log('Save route clicked');
        dispatch('saveRoute', { route });
    }

    function handleColorCycle() {
        if (route) {
            route.cycleColor();
            // Dispatch routeUpdated to trigger map and UI updates
            dispatch('routeUpdated', {
                route: route
            });
        }
    }

    function startEditingName() {
        if (route) {
            isEditingName = true;
            editedName = route.name || '';
            // Focus the input after it's rendered
            setTimeout(() => {
                if (nameInputElement) {
                    nameInputElement.focus();
                    nameInputElement.select();
                }
            }, 0);
        }
    }

    function cancelEditing() {
        isEditingName = false;
        editedName = '';
    }

    function saveNameEdit() {
        if (route && editedName.trim() !== (route.name || '').trim()) {
            // Only save if the name actually changed
            route.name = editedName.trim() || null;
            dispatch('routeUpdated', {
                route: route
            });
        }
        isEditingName = false;
    }

    function handleNameKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            saveNameEdit();
        } else if (event.key === 'Escape') {
            cancelEditing();
        }
    }

    $: showExpandChevron = true;
    $: averageSpeed = calculateAverageSpeed();
    $: routeLeg = route ? {
        averageSpeed: averageSpeed,
        distance: route.totalDistance,
        duration: route.totalDuration,
        startTime: route.departureTime,
        endTime: route.departureTime + route.totalDuration
    } : null;

</script>

<div class="route-row-container">
    <div
        class="route-row"
        class:expanded={isExpanded}
        class:clickable={showExpandChevron}
    >
        <div class="route-content">
            <div class="route-info">
                <div class="route-name-row">
                    <div class="route-color-dot" style="background-color: {route.color}" on:click|stopPropagation={handleColorCycle} title="Click to change route color"></div>
                    {#if isEditingName}
                        <input
                            class="route-name-input"
                            type="text"
                            bind:value={editedName}
                            bind:this={nameInputElement}
                            on:blur={saveNameEdit}
                            on:keydown={handleNameKeydown}
                            placeholder="Enter route name..."
                        />
                    {:else}
                        {#if route?.name}
                            <div class="route-name" on:click={startEditingName} title="Click to edit route name">{route.name}</div>
                        {:else}
                            <div class="route-name"><i>Loading route name...</i></div>
                        {/if}
                    {/if}
                </div>
                <div class="route-summary" on:click={showExpandChevron ? handleClick : undefined}>
                    <div class="departure-time">
                        <label class="departure-label">Departure:</label>
                        <input
                            type="datetime-local"
                            class="departure-input"
                            value={toLocalDatetimeString(route.departureTime)}
                            on:change={handleDepartureTimeUpdate}
                        />
                    </div>
                    <span class="total-distance">{formatDistance(route.totalDistance)}</span>
                    <span class="total-duration">{formatDuration(route.totalDuration)}</span>
                    <!--span class="waypoint-count">{route.waypoints.length} waypoints</span-->
                </div>
            </div>
            <!-- Only show expand chevron if we have route stats -->
            {#if showExpandChevron}
                <div class="expand-chevron" class:rotated={isExpanded}>∨</div>
            {/if}
        </div>
    </div>

    <!-- Expanded content - route-level statistics -->
    {#if isExpanded && routeLeg}
        <div class="route-detail-wrapper">
            <LegDetail
                legStats={routeStats}
                leg={routeLeg}
                routeColor="#3498db"
                editable={false}
            />
        </div>
    {/if}
</div>

<style lang="less">
    .route-row-container {
        position: relative;
    }

    .route-detail-wrapper {
        border-left: 4px solid #dee2e6;
        border-bottom: 1px solid #dee2e6;
        background: #f8f9fa;
    }

    .route-row {
        height: auto;
        min-height: 24px;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        padding: 8px 12px;
        position: relative;
        border-bottom: 2px solid #dee2e6;
        z-index: 15;

        &.clickable {
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
                background: #e9ecef;
            }
        }

        .route-content {
            display: flex;
            align-items: center;
            width: 100%;
            position: relative;
            min-height: 20px;
        }

        .route-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;

            .route-name-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .route-color-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                cursor: pointer;
                flex-shrink: 0;
                border: 1px solid rgba(0, 0, 0, 0.1);
                transition: transform 0.2s ease;

                &:hover {
                    transform: scale(1.2);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
            }

            .route-name {
                font-size: 12px;
                color: #495057 !important;
                font-weight: 700;
                text-align: left;
                flex: 1;
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 3px;
                transition: background-color 0.2s ease;

                &:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                }
            }

            .route-name-input {
                font-size: 12px;
                color: #495057;
                font-weight: 700;
                text-align: left;
                flex: 1;
                padding: 2px 4px;
                border: 1px solid #007cba;
                border-radius: 3px;
                background: white;
                font-family: inherit;
                outline: none;

                &::placeholder {
                    font-weight: normal;
                    color: #6c757d;
                    font-style: italic;
                }
            }

            .save-icon {
                cursor: pointer;
                font-size: 12px;
                opacity: 0.7;
                transition: opacity 0.2s ease, transform 0.2s ease;

                &:hover {
                    opacity: 1;
                    transform: scale(1.1);
                }
            }

            .route-summary {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;

                .departure-time {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    flex: 1.5;
                    text-align: left;
                    line-height: 1;
                }

                .total-distance,
                .total-duration,
                .waypoint-count {
                    font-size: 10px;
                    color: #6c757d !important;
                    font-weight: 500;
                    flex: 1;
                    text-align: center;
                    white-space: nowrap;
                    line-height: 1;
                }

                .departure-label {
                    color: #6c757d !important;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .departure-input {
                    padding: 2px 4px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    font-size: 9px;
                    background: white;
                    color: #333;
                    font-family: system-ui, -apple-system, sans-serif;
                    min-width: 120px;

                    &:focus {
                        outline: none;
                        border-color: #007cba;
                        box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.2);
                    }

                    &:hover {
                        border-color: #bbb;
                    }
                }
            }
        }

        .expand-chevron {
            position: absolute;
            right: 6px;
            bottom: 3px;
            font-size: 12px;
            color: #6c757d !important;
            transition: transform 0.2s ease;
            pointer-events: none;

            &.rotated {
                transform: rotate(180deg);
            }
        }
    }

    .route-stats-content {
        padding: 12px 16px;
        color: #6c757d;
        font-size: 11px;
        font-style: italic;
    }
</style>