<script lang="ts">
	import { formatTime, formatWeekDayDate } from '../../utils/TimeUtils';
	import type { PointForecast } from '../../types/WeatherTypes';

	export let forecast: PointForecast | null;
	export let timestamp: number;

	function getForecastFreshness(forecastData: any, sailingHour: number): { level: string; color: string; tooltip: string } | null {
		if (!forecastData?.forecastTimestamp) {
			return null;
		}

		// Calculate the absolute time difference in minutes first
		const timeDiffMinutes = Math.abs(sailingHour - forecastData.forecastTimestamp) / (1000 * 60);
		const hoursDiff = timeDiffMinutes / 60;

		const forecastTimeStr = new Date(forecastData.forecastTimestamp).toLocaleString('en-US', {
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

<div class="time-row">
	<div class="time-line">
		<div class="time">{formatTime(timestamp)}</div>
		{#if forecast && getForecastFreshness(forecast, timestamp)}
			{@const freshness = getForecastFreshness(forecast, timestamp)}
			{#if freshness.level !== 'fresh'}
				<div class="freshness-indicator" style="color: {freshness.color}" title={freshness.tooltip}>
					⚠
				</div>
			{/if}
		{/if}
	</div>
	<div class="date">{formatWeekDayDate(timestamp)}</div>
</div>

<style lang="less">
	.time-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 4px 0;
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

	.date {
		font-size: 10px;
		color: #666;
		margin-top: 2px;
	}

	.freshness-indicator {
		font-size: 10px;
		cursor: help;
	}
</style>