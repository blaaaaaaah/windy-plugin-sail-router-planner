<script lang="ts">
	import { formatWaveHeight } from '../../utils/FormatUtils';
	import DirectionIcon from './DirectionIcon.svelte';

	export let wavesHeight: number | null = null;
	export let wavesPeriod: number | null = null;
	export let wavesDirection: number | null = null;
	export let course: number = 0;
	export let apparent: boolean = false;
	export let gradient: string = '';

	$: boatCourse = apparent ? 0 : course;

	$: tooltip = (() => {
		const periodText = typeof wavesPeriod == "number" ? `Period: ${Math.round(wavesPeriod)}s\n` : '';
		if (apparent) {
			// In apparent mode, use relative wave direction
			const dirText = typeof wavesDirection == "number" ? `Relative: ${wavesDirection.toFixed(0)}°` : 'Direction: N/A';
			return periodText + dirText;
		} else {
			// In true wind mode, use true wave direction
			const dirText = typeof wavesDirection == "number"? `Direction: ${wavesDirection.toFixed(0)}°` : 'Direction: N/A';
			return periodText + dirText;
		}
	})();
</script>

<div title={tooltip} class="cell" style:--gradient-color={gradient}>
	{#if wavesHeight != null}
		<div class="wave-text">
			<span class="wave-height">{formatWaveHeight(wavesHeight)}</span>
		</div>
		{#if wavesDirection !== null}
			<DirectionIcon
				windDirection={wavesDirection}
				boatCourse={boatCourse}
			/>
		{/if}
	{:else}
		<div class="wave-text">--</div>
	{/if}
</div>

<style lang="less">
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		min-height: 50px;	// TODO : shouldn't be here, why height: 100$ doesn't work ?
		background: var(--gradient-color);
		container-type: inline-size;
	}

	.wave-text {
		font-size: 12px;
		color: #999;
		margin-bottom: 4px;
	}

	.wave-height {
		color: #333;
		font-weight: 500;
	}

	/* Responsive font size for narrow columns */
	@container (max-width: 40px) {
		.wave-text {
			font-size: 9px;
		}
	}
</style>