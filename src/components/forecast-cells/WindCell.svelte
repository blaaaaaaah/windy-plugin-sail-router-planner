<script lang="ts">
	import { formatWindSpeed, formatRelativeDirection } from '../../utils/FormatUtils';
	import DirectionIcon from './DirectionIcon.svelte';
	import type { PointForecast } from '../../types/WeatherTypes';

	export let forecast: PointForecast | null;
	export let apparent: boolean;
	export let isGust: boolean = false;

	$: weatherData = apparent ? forecast?.apparent : forecast?.northUp;
	$: windSpeed = isGust ? weatherData?.gustsSpeed : weatherData?.windSpeed;
	$: windDirection = apparent ? weatherData?.relativeWindDirection : weatherData?.trueWindDirection;
	$: boatCourse = apparent ? 0 : forecast?.bearing;

	$: tooltip = (() => {
		if (apparent) {
			const relativeDir = forecast?.apparent?.relativeWindDirection;
			const trueDir = forecast?.northUp?.trueWindDirection;
			if (relativeDir === undefined || trueDir === undefined) return 'N/A';
			return `AWA: ${formatRelativeDirection(relativeDir)}\nTWD: ${trueDir.toFixed(0)}°`;
		} else {
			const relativeDir = forecast?.northUp?.relativeWindDirection;
			const trueDir = forecast?.northUp?.trueWindDirection;
			if (relativeDir === undefined || trueDir === undefined) return 'N/A';
			return `TWA: ${formatRelativeDirection(relativeDir)}\nTWD: ${trueDir.toFixed(0)}°`;
		}
	})();
</script>

<div title={tooltip}>
	{#if windSpeed != null}
		<div class="wind-speed">
			{formatWindSpeed(windSpeed)}
		</div>
		{#if windDirection !== undefined}
			<!-- TODO: Check if forecast.bearing and leg.course are equivalent -->
			<DirectionIcon
				windDirection={windDirection}
				boatCourse={boatCourse}
			/>
		{/if}
	{:else}
		<div class="wind-text">--</div>
	{/if}
</div>

<style lang="less">
	.wind-speed {
		font-weight: 500;
		font-size: 12px;
		color: #333;
	}

	.wind-text {
		color: #999;
		font-size: 12px;
	}
</style>