<script lang="ts">
	import { formatWindSpeed, formatRelativeDirection } from '../../utils/FormatUtils';
	import DirectionIcon from './DirectionIcon.svelte';

	export let windSpeed: number | null = null;
	export let relativeWindDirection: number | null = null;
	export let trueWindDirection: number | null = null;
	export let course: number = 0;
	export let apparent: boolean = false;

	$: windDirection = apparent ? relativeWindDirection : trueWindDirection;
	$: boatCourse = apparent ? 0 : course;

	$: tooltip = (() => {
		if (apparent) {
			if (relativeWindDirection === null || trueWindDirection === null) return 'N/A';
			return `AWA: ${formatRelativeDirection(relativeWindDirection)}\nTWD: ${trueWindDirection.toFixed(0)}°`;
		} else {
			if (relativeWindDirection === null || trueWindDirection === null) return 'N/A';
			return `TWA: ${formatRelativeDirection(relativeWindDirection)}\nTWD: ${trueWindDirection.toFixed(0)}°`;
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