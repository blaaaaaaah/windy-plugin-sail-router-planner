<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LegDetail from './LegDetail.svelte';
    import type { RouteLeg } from '../types/RouteTypes';
    import { formatDateTime, formatDuration } from '../utils/TimeUtils';
    import { formatCoordinate } from '../utils/NavigationUtils';
    import { formatDistance } from '../utils/FormatUtils';

    export let timestamp: number;
    export let waypointNumber: number;
    export let isStart: boolean = false; // Is this the departure waypoint?
    export let isLast: boolean = false; // Is this the arrival waypoint?
    export let dropGhost: boolean = false; // Is this a drop ghost waypoint?
    export let leg: RouteLeg | null = null; // Null for destination waypoint
    export let legStats: any | null = null; // Weather statistics, null for destination
    export let departureTime: number; // For destination waypoint only
    export let arrivalTime: number; // For destination waypoint only
    export let color: string = '#3498db';

    export let draggable:boolean = false;
    export let canExpand: boolean = true; // Whether leg waypoint can be expanded
    export let editable: boolean = true;

    let isExpanded: boolean = false;

    const dispatch = createEventDispatcher();

    function handleClick() {
        if (canExpand) {
            isExpanded = !isExpanded;
        }
    }

    function handleSpeedUpdate(e: any) {
        dispatch('speedUpdate', {
            legIndex: waypointNumber - 1,
            newSpeed: e.detail.newSpeed
        });
    }


    $: showExpandChevron = !dropGhost && canExpand;
</script>

<div class="waypoint-row-container" draggable={draggable} data-timestamp={timestamp} data-drag-type="waypoint">
    <div
        class="waypoint-row"
        class:expanded={isExpanded}
        class:destination-waypoint={isLast}
        class:drop-ghost={dropGhost}
        style="--route-color: {color}; --route-color-rgb: {color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '52, 152, 219'}"
        on:click={showExpandChevron ? handleClick : undefined}
    >
        <div class="waypoint-content">
            <div class="waypoint-number">{waypointNumber}</div>
            <div class="waypoint-info">
                {#if isLast }
                    <div class="leg-datetime">
                        <span class="datetime-label">Arrival:</span>
                        <span class="datetime-value">{formatDateTime(arrivalTime)}</span>
                    </div>
                {:else if dropGhost}
                    <div class="leg-datetime">
                        <span class="datetime-label">Departure:</span>
                        <span class="datetime-value">{formatDateTime(departureTime)}</span>
                    </div>
                {:else if leg}
                    <div class="leg-datetime">
                        <span class="datetime-label">
                            {#if isStart }
                                Departure:
                            {:else}
                                Leg {waypointNumber}:
                            {/if}
                        </span>
                        <span class="datetime-value">
                            {#if isStart }
                                {formatDateTime(departureTime)}
                            {:else}
                                {formatDateTime(leg.startTime)}
                            {/if}
                        </span>
                    </div>
                    <div class="leg-distance">{formatDistance(leg.distance)}</div>
                    <div class="leg-speed">{leg.averageSpeed}knts</div>
                    <div class="leg-duration">{formatDuration(leg.duration)}</div>
                {/if}
            </div>
            <!-- Only show expand chevron for non-destination waypoints -->
            {#if showExpandChevron}
                <div class="expand-chevron" class:rotated={isExpanded}>∨</div>
            {/if}
        </div>
    </div>

    <!-- Expanded content - only for expandable waypoints -->
    {#if isExpanded && canExpand && leg}
        <div class="leg-detail-wrapper" style="--route-color: {color}; --route-color-rgb: {color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '52, 152, 219'}">
            <!-- Coordinates and Course Row -->
            <div class="coordinate-row">
                <div class="coord-item">
                    <label>FROM</label>
                    <span class="coordinate coordinate-full">
                        {formatCoordinate(leg.startPoint.lat, true, true)}<br/>
                        {formatCoordinate(leg.startPoint.lng, false, true)}
                    </span>
                    <span class="coordinate coordinate-compact">
                        {formatCoordinate(leg.startPoint.lat, true, false)}<br/>
                        {formatCoordinate(leg.startPoint.lng, false, false)}
                    </span>
                </div>
                <div class="coord-item">
                    <label>COURSE</label>
                    <span class="value">{leg.course.toFixed(0)}°<br/>&nbsp;</span>
                </div>
                <div class="coord-item">
                    <label>TO</label>
                    <span class="coordinate coordinate-full">
                        {formatCoordinate(leg.endPoint.lat, true, true)}<br/>
                        {formatCoordinate(leg.endPoint.lng, false, true)}
                    </span>
                    <span class="coordinate coordinate-compact">
                        {formatCoordinate(leg.endPoint.lat, true, false)}<br/>
                        {formatCoordinate(leg.endPoint.lng, false, false)}
                    </span>
                </div>
            </div>

            <LegDetail
                legStats={legStats}
                {leg}
                {color}
                {editable}
                on:speedUpdate={handleSpeedUpdate}
            />
        </div>
    {/if}
</div>

<style lang="less">
    .waypoint-row-container {
        width: 100%;
        container-type: inline-size;
    }

    .leg-detail-wrapper {
        border-left: 4px solid var(--route-color);
        border-bottom: 1px solid var(--route-color);

        .coordinate-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-end;
            padding: 12px 16px;
            background: rgba(var(--route-color-rgb), 0.08);

            .coord-item {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;

                label {
                    font-weight: 600;
                    color: #444 !important;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                    text-align: center;
                }

                .value, .coordinate {
                    color: #555 !important;
                    font-size: 12px;
                    font-weight: 600;
                    text-align: center;
                    line-height: 1.2;
                }

                .coordinate-compact {
                    display: none;
                }
            }
        }
    }

    .waypoint-row {
        height: 18px;
        background: rgba(var(--route-color-rgb), 0.8);
        display: flex;
        align-items: center;
        position: relative;
        border-bottom: none;
        cursor: grab;
        overflow: visble;
        border-top: 2px solid white;
        border-bottom: 2px solid white;
        width: 100%;
        max-width: 100%;

         &.expanded {
            background: rgba(var(--route-color-rgb), 0.9);
            border-bottom: none;
        }

        &.drop-ghost {
            opacity: 0.7;
         }

        .waypoint-content {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            position: relative;
            height: 100%;
            overflow: visible;
            padding-left: 12px; /* Space for waypoint number circle */
        }

        .waypoint-info {
            margin-left: 4px; /* Reduced since we have padding-left on parent */
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            flex: 1;
            gap: 8px;

            margin-right: 14px; // leave space for the expand chevron


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
        }
    }

     // Container query: hide distance, speed, duration when container < 100px
    @container (max-width: 110px) {
        .waypoint-info {
            .datetime-label {
                display: none;
            }
        }
    }

    // Container query: hide distance, speed, duration when container < 100px
    @container (max-width: 170px) {
        .waypoint-info {
            .leg-distance,
            .leg-speed,
            .leg-duration {
                display: none;
            }

            .leg-datetime {
                justify-content: center;
            }
        }

        .leg-placeholder {
            font-size: 10px;
            color: #666;
            font-style: italic;
        }

        /* Container query adjustments for narrow widths */
  
        .leg-detail-wrapper {
            .coordinate-row {
                gap: 4px;

                .coord-item {
                    label,
                    .coordinate,
                    .value {
                        font-size: 9px;
                        font-weight: 400;
                    }

                    .coordinate-full {
                        display: none;
                    }

                    .coordinate-compact {
                        display: inline;
                    }
                }
            }
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
        left: -10px;
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
    
</style>