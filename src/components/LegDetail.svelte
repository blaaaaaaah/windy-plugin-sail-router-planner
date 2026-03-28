<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    import type { RouteLeg } from '../types/RouteTypes';
    import { formatDuration } from '../utils/TimeUtils';

    export let legStats: any; // Leg statistics data
    export let leg: RouteLeg; // Leg data for distance, duration, speed
    export let isVisible: boolean = false;
    export let routeColor: string = '#3498db';

    const dispatch = createEventDispatcher();

    function formatWindSpeed(msValue: number): string {
        const W = (window as any).W;
        return W.metrics.wind.convertValue(msValue);
    }

    function formatWaveHeight(meterValue: number): string {
        const W = (window as any).W;
        return W.metrics.waves.convertValue(meterValue);
    }

    function formatDistance(meterValue: number): string {
        const W = (window as any).W;
        return W.metrics.distance.convertValue(meterValue);
    }

    function handleSpeedUpdate(event: Event) {
        const target = event.target as HTMLInputElement;
        const newSpeed = parseFloat(target.value);
        if (!isNaN(newSpeed) && newSpeed > 0) {
            dispatch('speedUpdate', { newSpeed });
        }
    }
</script>

{#if isVisible && legStats}
    <div class="waypoint-expanded" style="--route-color: {routeColor}; --route-color-rgb: {routeColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '52, 152, 219'}">
        <div class="expanded-content">
            <!-- Row 1: Speed, Distance, Time -->
            <div class="leg-row">
                <div class="leg-item speed-input">
                    <label>AVG SPEED</label>
                    <div class="input-group">
                        <input
                            type="number"
                            class="compact-input"
                            value={leg.averageSpeed}
                            min="0.5"
                            max="50"
                            step="0.5"
                            on:change={handleSpeedUpdate}
                        />
                        <span class="unit">knts</span>
                    </div>
                </div>
                <div class="leg-item">
                    <label>DISTANCE</label>
                    <span class="value">{formatDistance(leg.distance)}</span>
                </div>
                <div class="leg-item">
                    <label>LEG TIME</label>
                    <span class="value">{formatDuration(leg.duration)}</span>
                </div>
            </div>

            <!-- Row 2: Wind Statistics -->
            <div class="leg-row">
                <div class="leg-item">
                    <label>MIN WIND</label>
                    <span class="value">{formatWindSpeed(legStats.minWindSpeed)}</span>
                </div>
                <div class="leg-item">
                    <label>AVG WIND</label>
                    <span class="value">{formatWindSpeed(legStats.avgWindSpeed)}</span>
                </div>
                <div class="leg-item">
                    <label>MAX WIND</label>
                    <span class="value">{formatWindSpeed(legStats.maxWindSpeed)}</span>
                </div>
            </div>

            <!-- Row 3: Gust Statistics -->
            <div class="leg-row">
                <div class="leg-item">
                    <label>MIN GUST</label>
                    <span class="value">{formatWindSpeed(legStats.minGust)}</span>
                </div>
                <div class="leg-item">
                    <label>AVG GUST</label>
                    <span class="value">{formatWindSpeed(legStats.avgGust)}</span>
                </div>
                <div class="leg-item">
                    <label>MAX GUST</label>
                    <span class="value">{formatWindSpeed(legStats.maxGust)}</span>
                </div>
            </div>

            <!-- Row 4: Wave Height Statistics -->
            <div class="leg-row">
                <div class="leg-item">
                    <label>MIN WAVE</label>
                    <span class="value">{formatWaveHeight(legStats.minWaveHeight)}</span>
                </div>
                <div class="leg-item">
                    <label>AVG WAVE</label>
                    <span class="value">{formatWaveHeight(legStats.avgWaveHeight)}</span>
                </div>
                <div class="leg-item">
                    <label>MAX WAVE</label>
                    <span class="value">{formatWaveHeight(legStats.maxWaveHeight)}</span>
                </div>
            </div>

            <!-- Row 5: Wave Period Statistics -->
            <div class="leg-row">
                <div class="leg-item">
                    <label>MIN PERIOD</label>
                    <span class="value">{legStats.minWavePeriod.toFixed(1)}s</span>
                </div>
                <div class="leg-item">
                    <label>AVG PERIOD</label>
                    <span class="value">{legStats.avgWavePeriod.toFixed(1)}s</span>
                </div>
                <div class="leg-item">
                    <label>MAX PERIOD</label>
                    <span class="value">{legStats.maxWavePeriod.toFixed(1)}s</span>
                </div>
            </div>

            <!-- Row 6: Wind Direction Distribution -->
            <div class="leg-row">
                <div class="leg-item">
                    <label>UPWIND</label>
                    <span class="value">{legStats.percentUpwind.toFixed(0)}%</span>
                </div>
                <div class="leg-item">
                    <label>REACHING</label>
                    <span class="value">{legStats.percentReaching.toFixed(0)}%</span>
                </div>
                <div class="leg-item">
                    <label>DOWNWIND</label>
                    <span class="value">{legStats.percentDownwind.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="less">
    .waypoint-expanded {
        background: rgba(var(--route-color-rgb), 0.08);
        padding: 12px 16px;
        margin: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out, padding 0.3s ease-out;

        .expanded-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .leg-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-end;
            margin-bottom: 12px;

            &:last-child {
                margin-bottom: 0;
            }
        }

        .leg-item {
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

            .value {
                color: #555 !important;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
            }
        }

        .leg-item.speed-input {
            .input-group {
                display: flex;
                align-items: center;
                gap: 4px;
                height: 12px;
            }

            .compact-input {
                width: 40px;
                padding: 0 4px;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 600;
                text-align: center;
                background: white;
                color: #333 !important;
                height: 14px;
                line-height: 16px;

                &:focus {
                    outline: none;
                    border-color: var(--route-color);
                    box-shadow: 0 0 0 2px rgba(var(--route-color-rgb), 0.2);
                }
            }

            .unit {
                font-size: 10px;
                color: #666 !important;
                font-weight: 500;
            }
        }
    }
</style>