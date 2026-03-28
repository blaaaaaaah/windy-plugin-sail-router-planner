<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LegDetail from './LegDetail.svelte';
    import type { RouteLeg } from '../types/RouteTypes';
    import { formatDayDate, formatTime } from '../utils/TimeUtils';

    export let waypointNumber: number;
    export let isStart: boolean = false; // Is this the departure waypoint?
    export let leg: RouteLeg | null = null; // Null for destination waypoint
    export let legData: any | null = null; // Weather statistics, null for destination
    export let arrivalTime: number | null = null; // For destination waypoint only
    export let routeColor: string = '#3498db';
    let isExpanded: boolean = false;

    const dispatch = createEventDispatcher();

    function handleClick() {
        if (!isDestinationWaypoint) {
            isExpanded = !isExpanded;
        }
    }

    function handleSpeedUpdate(e: any) {
        dispatch('speedUpdate', {
            legIndex: waypointNumber - 1,
            newSpeed: e.detail.newSpeed
        });
    }


    function formatDistance(distance: number): string {
        const W = (window as any).W;
        return W.metrics.distance.convertValue(distance);
    }

    $: isDestinationWaypoint = leg === null;
    $: showExpandChevron = !isDestinationWaypoint;
</script>

<div class="waypoint-row-container">
    <div
        class="start-beanie-row"
        class:waypoint-row={!isStart}
        class:expanded={isExpanded}
        class:destination-waypoint={isDestinationWaypoint}
        style="--route-color: {routeColor}; --route-color-rgb: {routeColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '52, 152, 219'}"
        on:click={showExpandChevron ? handleClick : undefined}
    >
        <div class="start-beanie-content">
            <div class="waypoint-number">{waypointNumber}</div>
            <div class="waypoint-info">
                {#if leg && legData}
                    <div class="leg-datetime">
                        {#if isStart}
                            Departure: {formatDayDate(leg.startTime)} {formatTime(leg.startTime)}
                        {:else}
                            Leg {waypointNumber}: {formatDayDate(leg.startTime)} {formatTime(leg.startTime)}
                        {/if}
                    </div>
                    <div class="leg-distance">{formatDistance(leg.distance)}</div>
                    <div class="leg-speed">{leg.averageSpeed}knts</div>
                    <div class="leg-duration">{legData.legTime}</div>
                {:else if isDestinationWaypoint && arrivalTime}
                    <div class="leg-datetime">
                        Arrival: {formatDayDate(arrivalTime)} {formatTime(arrivalTime)}
                    </div>
                {:else}
                    <div class="leg-placeholder">No leg data</div>
                {/if}
            </div>
            <!-- Only show expand chevron for non-destination waypoints -->
            {#if showExpandChevron}
                <div class="expand-chevron" class:rotated={isExpanded}>∨</div>
            {/if}
        </div>
    </div>

    <!-- Expanded content - only for non-destination waypoints -->
    {#if isExpanded && !isDestinationWaypoint && legData}
        <div class="leg-detail-wrapper" style="--route-color: {routeColor}; --route-color-rgb: {routeColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '52, 152, 219'}">
            <LegDetail
                {legData}
                isVisible={true}
                {routeColor}
                on:speedUpdate={handleSpeedUpdate}
            />
        </div>
    {/if}
</div>

<style lang="less">
    .waypoint-row-container {
        position: relative;
    }

    .leg-detail-wrapper {
        border-left: 4px solid var(--route-color);
        border-bottom: 1px solid var(--route-color);
    }

    .start-beanie-row {
        height: 18px;
        background: rgba(var(--route-color-rgb), 0.8);
        display: flex;
        align-items: center;
        padding: 0 12px;
        position: relative;
        border-bottom: none;
        cursor: grab;
        z-index: 20;
        border-left: 4px solid var(--route-color);
        overflow: visible;
        border-top: 2px solid white;
        border-bottom: 2px solid white;

        &.waypoint-row {
            cursor: pointer;
            transition: all 0.2s ease;

            &:hover {
                background: rgba(var(--route-color-rgb), 0.25);
            }

            .waypoint-number {
                background: var(--route-color);
                opacity: 0.8;
            }
        }

        &.destination-waypoint {
            cursor: default;

            &:hover {
                background: rgba(var(--route-color-rgb), 0.8);
            }
        }

        .start-beanie-content {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            position: relative;
            height: 100%;
        }

        .waypoint-info {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            flex: 1;
            gap: 8px;

            .leg-datetime {
                font-size: 10px;
                color: #333 !important;
                font-weight: 500;
                flex: 1.5;
                text-align: left;
                line-height: 1;
                white-space: nowrap;
            }

            .leg-distance,
            .leg-speed,
            .leg-duration {
                font-size: 10px;
                color: #555 !important;
                font-weight: 500;
                flex: 1;
                text-align: center;
                white-space: nowrap;
            }

            .leg-placeholder {
                font-size: 10px;
                color: #666;
                font-style: italic;
            }
        }

        .expand-chevron {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
            color: #666 !important;
            transition: transform 0.2s ease;
            pointer-events: none;

            &.rotated {
                transform: translateY(-50%) rotate(180deg);
            }
        }

        .waypoint-number {
            position: absolute;
            left: -25px;
            background: var(--route-color);
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(var(--route-color-rgb), 0.4);
            border: 2px solid white;
            flex-shrink: 0;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;

            &:hover {
                transform: translateY(-50%) scale(1.1);
                box-shadow: 0 2px 6px rgba(var(--route-color-rgb), 0.6);
            }
        }
    }
</style>