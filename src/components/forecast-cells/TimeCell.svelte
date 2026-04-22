<script lang="ts">
	import { formatTime, formatWeekDayDate, formatCompactTime } from '../../utils/TimeUtils';

	export let timestamp: number;
	export let forecastTimestamp: number | null = null;

	$: freshness = getForecastFreshness(forecastTimestamp, timestamp);
	$: isMidnight = new Date(timestamp).getHours() === 0 && new Date(timestamp).getMinutes() === 0;

	function getForecastFreshness(forecastTimestamp: number | null, sailingHour: number): { level: string; color: string; tooltip: string } | null {
		if (!forecastTimestamp) {
			return null;
		}

		// Calculate the absolute time difference in minutes first
		const timeDiffMinutes = Math.abs(sailingHour - forecastTimestamp) / (1000 * 60);
		const hoursDiff = timeDiffMinutes / 60;

		const forecastTimeStr = new Date(forecastTimestamp).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: false
		});

		if (timeDiffMinutes < 90) { // Less than 1.5 hours
			return {
				level: 'fresh',
				color: '#22c55e', // green
				tooltip: `Fresh forecast from ${forecastTimeStr}`
			};
		} else if (hoursDiff < 6) {
			return {
				level: 'good',
				color: '#eab308', // yellow
				tooltip: `Forecast from ${forecastTimeStr} (${Math.round(hoursDiff)}h off)`
			};
		} else if (hoursDiff < 12) {
			return {
				level: 'stale',
				color: '#f97316', // orange
				tooltip: `Stale forecast from ${forecastTimeStr} (${Math.round(hoursDiff)}h off)`
			};
		} else {
			return {
				level: 'very-stale',
				color: '#ef4444', // red
				tooltip: `Very stale forecast from ${forecastTimeStr} (${Math.round(hoursDiff)}h off)`
			};
		}
	}
</script>

<div class="time-container">
	<div class="time-row">
		<div class="date" class:show-midnight={isMidnight}>{formatWeekDayDate(timestamp)}</div>
		<div class="time-line">
			<div class="time">
				<span class="normal-time">{formatTime(timestamp)}</span>
				<span class="compact-time">{formatCompactTime(timestamp)}</span>
			</div>
			{#if freshness && freshness.level !== 'fresh'}
				<div class="freshness-indicator" style="color: {freshness.color}" title={freshness.tooltip}>
					⚠
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="less">
	.time-container {
		container-type: inline-size;
		width: 100%;
		height: 100%;
	}

	.time-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4px 0;
		width: 100%;
		height: 100%;
	}

	.time-line {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.time {
		font-weight: 500;
		font-size: 12px;
		color: #333;
	}

	.normal-time {
		display: inline;
	}

	.compact-time {
		display: none;
		font-size: 10px;
	}

	.date {
		font-size: 10px;
		color: #666;
		margin-top: 2px;

		&.show-midnight {
			/* Always show when it's midnight in compact mode */
		}
	}

	.freshness-indicator {
		font-size: 10px;
		cursor: help;
	}

	/* Compact mode when width <= 30px */
	@container (max-width: 40px) {
		.time-row {
			padding: 2px 0;
			align-items: flex-end;
			justify-content: center;
			height: 100%;
		}

		.normal-time {
			display: none;
		}

		.compact-time {
			display: inline;
			writing-mode: vertical-rl;
			text-orientation: mixed;
			transform: rotate(180deg);
			color: #999;
		}

		.time-line {
			flex-direction: column;
			align-items: flex-end;
			justify-content: flex-end;
			height: 100%;
		}

		.date {
			font-size: 8px;
			margin-top: 0;
			margin-bottom: 1px;
			display: none;
			margin-left: 4px;
			text-align: left;
			color: #333;

			&.show-midnight {
				display: block;
			}
		}

		.freshness-indicator {
			font-size: 8px;
		}
	}

	/* Normal mode when width > 30px */
	@container (min-width: 41px) {
		.date {
			display: block;
		}
	}
</style>