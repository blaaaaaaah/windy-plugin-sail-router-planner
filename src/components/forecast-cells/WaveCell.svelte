<script lang="ts">
	import { formatWaveHeight } from '../../utils/FormatUtils';
	import DirectionIcon from './DirectionIcon.svelte';
	import type { PointForecast } from '../../types/WeatherTypes';

	export let forecast: PointForecast | null;
	export let apparent: boolean;

	$: waveHeight = forecast?.northUp?.wavesHeight;
	$: wavePeriod = forecast?.northUp?.wavesPeriod;

	$: waveDirection = (() => {
		if (apparent) {
			// For apparent wind mode, waves use relative direction
			return forecast?.apparent?.wavesDirection;
		} else {
			// For true wind mode, waves use true direction
			return forecast?.northUp?.wavesDirection;
		}
	})();

	$: boatCourse = apparent ? 0 : forecast?.bearing;

	$: tooltip = (() => {
		const periodText = wavePeriod !== undefined ? `Period: ${Math.round(wavePeriod)}s\n` : '';
		if (apparent) {
			// In apparent mode, use relative wave direction
			const relativeDir = forecast?.apparent?.wavesDirection;
			const dirText = relativeDir !== undefined ? `Relative: ${relativeDir.toFixed(0)}°` : 'Direction: N/A';
			return periodText + dirText;
		} else {
			// In true wind mode, use true wave direction
			const dir = forecast?.northUp?.wavesDirection;
			const dirText = dir !== undefined ? `Direction: ${dir.toFixed(0)}°` : 'Direction: N/A';
			return periodText + dirText;
		}
	})();
</script>

<div title={tooltip}>
	{#if waveHeight != null}
		<div class="wave-text">
			<span class="wave-height">{formatWaveHeight(waveHeight)}</span>
		</div>
		{#if waveDirection !== undefined}
			<DirectionIcon
				windDirection={waveDirection}
				boatCourse={boatCourse}
			/>
		{/if}
	{:else}
		<div class="wave-text">--</div>
	{/if}
</div>

<style lang="less">
	.wave-text {
		font-size: 12px;
		color: #999;
	}

	.wave-height {
		color: #333;
		font-weight: 500;
	}
</style>