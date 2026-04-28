<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    import type { RouteLeg } from '../types/RouteTypes';
    import type { WeatherStats } from '../types/WeatherTypes';
    import { formatDuration } from '../utils/TimeUtils';
    import { formatWindSpeed, formatWaveHeight, formatDistance} from '../utils/FormatUtils';

    export let legStats: WeatherStats | null; // Leg statistics data
    export let leg: RouteLeg; // Leg data for distance, duration, speed
    export let color: string = '#3498db';
    export let editable: boolean = true;

    const dispatch = createEventDispatcher();

    function handleSpeedUpdate(event: Event) {
        const target = event.target as HTMLInputElement;
        const newSpeed = parseFloat(target.value);
        if (!isNaN(newSpeed) && newSpeed > 0) {
            dispatch('speedUpdate', { newSpeed });
        }
    }
</script>

{#if leg}
    <div class="waypoint-expanded" style="--route-color: {color}; --route-color-rgb: {color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '52, 152, 219'}">
        <div class="expanded-content">
            <!-- Row 1: Speed, Distance, Time -->
            <div class="leg-row">
                {#if editable}
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
                        /> <span class="unit">kt</span>
                    </div>
                </div>
                {:else}
                <div class="leg-item">
                    <label>AVG SPEED</label>
                    <span class="value">{leg.averageSpeed.toFixed(1)}kt</span>
                </div>
                {/if}
                <div class="leg-item">
                    <label class="distance">DISTANCE</label>
                    <span class="value">{formatDistance(leg.distance)}</span>
                </div>
                <div class="leg-item">
                    <label>LEG TIME</label>
                    <span class="value">{formatDuration(leg.duration)}</span>
                </div>
            </div>

            <!-- Row 2: Wind Statistics -->
            <div class="leg-row wind-row">
                <div class="leg-item wind-combined">
                    <label>WIND</label>
                    <span class="value">
                        {legStats ? `${formatWindSpeed(legStats.minWindSpeed)} / ${formatWindSpeed(legStats.avgWindSpeed)} / ${formatWindSpeed(legStats.maxWindSpeed)}` : '--'}
                    </span>
                </div>
                <div class="leg-item wind-separate">
                    <label>MIN WIND</label>
                    <span class="value">{legStats ? formatWindSpeed(legStats.minWindSpeed) : '--'}</span>
                </div>
                <div class="leg-item wind-separate">
                    <label>AVG WIND</label>
                    <span class="value">{legStats ? formatWindSpeed(legStats.avgWindSpeed) : '--'}</span>
                </div>
                <div class="leg-item wind-separate">
                    <label>MAX WIND</label>
                    <span class="value">{legStats ? formatWindSpeed(legStats.maxWindSpeed) : '--'}</span>
                </div>
            </div>

            <!-- Row 3: Gust Statistics -->
            <div class="leg-row gust-row">
                <div class="leg-item gust-combined">
                    <label>GUST</label>
                    <span class="value">
                        {legStats ? `${formatWindSpeed(legStats.minGust)} / ${formatWindSpeed(legStats.avgGust)} / ${formatWindSpeed(legStats.maxGust)}` : '--'}
                    </span>
                </div>
                <div class="leg-item gust-separate">
                    <label>MIN GUST</label>
                    <span class="value">{legStats ? formatWindSpeed(legStats.minGust) : '--'}</span>
                </div>
                <div class="leg-item gust-separate">
                    <label>AVG GUST</label>
                    <span class="value">{legStats ? formatWindSpeed(legStats.avgGust) : '--'}</span>
                </div>
                <div class="leg-item gust-separate">
                    <label>MAX GUST</label>
                    <span class="value">{legStats ? formatWindSpeed(legStats.maxGust) : '--'}</span>
                </div>
            </div>

            <!-- Row 4: Wave Height Statistics -->
            <div class="leg-row wave-row">
                <div class="leg-item wave-combined">
                    <label>WAVE</label>
                    <span class="value">
                        {legStats ? `${formatWaveHeight(legStats.minWaveHeight)} / ${formatWaveHeight(legStats.avgWaveHeight)} / ${formatWaveHeight(legStats.maxWaveHeight)}` : '--'}
                    </span>
                </div>
                <div class="leg-item wave-separate">
                    <label>MIN WAVE</label>
                    <span class="value">{legStats ? formatWaveHeight(legStats.minWaveHeight) : '--'}</span>
                </div>
                <div class="leg-item wave-separate">
                    <label>AVG WAVE</label>
                    <span class="value">{legStats ? formatWaveHeight(legStats.avgWaveHeight) : '--'}</span>
                </div>
                <div class="leg-item wave-separate">
                    <label>MAX WAVE</label>
                    <span class="value">{legStats ? formatWaveHeight(legStats.maxWaveHeight) : '--'}</span>
                </div>
            </div>

            <!-- Row 5: Wave Period Statistics -->
            <div class="leg-row period-row">
                <div class="leg-item period-combined">
                    <label>PERIOD</label>
                    <span class="value">
                        {legStats ? `${legStats.minWavePeriod.toFixed(1)}s / ${legStats.avgWavePeriod.toFixed(1)}s / ${legStats.maxWavePeriod.toFixed(1)}s` : '--'}
                    </span>
                </div>
                <div class="leg-item period-separate">
                    <label>MIN PERIOD</label>
                    <span class="value">{legStats ? `${legStats.minWavePeriod.toFixed(1)}s` : '--'}</span>
                </div>
                <div class="leg-item period-separate">
                    <label>AVG PERIOD</label>
                    <span class="value">{legStats ? `${legStats.avgWavePeriod.toFixed(1)}s` : '--'}</span>
                </div>
                <div class="leg-item period-separate">
                    <label>MAX PERIOD</label>
                    <span class="value">{legStats ? `${legStats.maxWavePeriod.toFixed(1)}s` : '--'}</span>
                </div>
            </div>

            <!-- Row 6: Wind Direction Distribution -->
            <div class="leg-row">
                <div class="leg-item">
                    <label>UP&shy;WIND</label>
                    <span class="value">{legStats ? `${legStats.percentUpwind.toFixed(0)}%` : '--'}</span>
                </div>
                <div class="leg-item">
                    <label>REACH&shy;ING</label>
                    <span class="value">{legStats ? `${legStats.percentReaching.toFixed(0)}%` : '--'}</span>
                </div>
                <div class="leg-item">
                    <label>DOWN&shy;WIND</label>
                    <span class="value">{legStats ? `${legStats.percentDownwind.toFixed(0)}%` : '--'}</span>
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
        container-type: inline-size;

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

        /* Hide combined displays by default */
        .leg-item.wind-combined,
        .leg-item.gust-combined,
        .leg-item.wave-combined,
        .leg-item.period-combined {
            display: none;
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
                font-size: 12px;
                color: #666 !important;
                font-weight: 600;
            }
        }
    }


    /* Container query adjustments for narrow widths */
    @container (max-width: 159px) {
        /* Hide combined displays by default */
        .wind-combined,
        .gust-combined,
        .wave-combined,
        .period-combined {
            display: none !important;
        }

        .waypoint-expanded {
            padding: 2px 6px;

            .leg-row {
                gap: 4px;

                label,
                .unit,
                .value {
                    font-size: 9px;
                    font-weight: 400;
                }

                .distance::after {
                    content: "\00a0";
                    display: block;
                }

                .leg-item.speed-input {
                    input {
                        width: 20px;
                        font-size: 9px;
                    }

                    input::-webkit-outer-spin-button,
                    input::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }

                    .unit {
                        font-size: 9px;
                        font-weight: 400;

                    }
                }

            }
        }
    }

    /* Very narrow widths: stack all items vertically */
    @container (max-width: 109px) {
        .waypoint-expanded {
            .expanded-content {
                gap: 2px;
            }

            .leg-row {
                flex-direction: column;
                gap: 2px;
                margin-bottom: 12px;

                .distance::after {
                    content: "";
                }

                .leg-item {
                    flex: none;
                    width: 100%;
                    margin-bottom: 6px;

                    label,
                    .unit,
                    .value {
                        font-size: 8px;
                    }
                }

            }

            /* Show combined displays, hide separate items */
            .wind-combined,
            .gust-combined,
            .wave-combined,
            .period-combined {
                display: flex !important;
            }

            .wind-separate,
            .gust-separate,
            .wave-separate,
            .period-separate {
                display: none;
            }
        }
    }
</style>