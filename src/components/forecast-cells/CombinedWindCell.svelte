<script lang="ts">
	import { formatWindSpeed, formatRelativeDirection } from '../../utils/FormatUtils';
	import DirectionIcon from './DirectionIcon.svelte';

	export let windSpeed: number | null = null;
	export let gustsSpeed: number | null = null;
	export let relativeWindDirection: number | null = null;
	export let trueWindDirection: number | null = null;
	export let course: number = 0;
	export let apparent: boolean = false;
	export let windGradient: string = '';
	export let gustGradient: string = '';

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

<div title={tooltip} class="cell" style:--wind-gradient={windGradient} style:--gust-gradient={gustGradient}>
	<div class="gradient-container">
		<div class="gradient-half wind-half"></div>
		<div class="gradient-half gust-half"></div>
	</div>

	<div class="content">
		{#if windSpeed != null || gustsSpeed != null}
			<div class="speeds-row">
				<div class="wind-speed">
					{windSpeed != null ? formatWindSpeed(windSpeed) : '--'}
				</div>
				<!--div class="speeds-separator">|</div-->
				<div class="gust-speed">
					{gustsSpeed != null ? formatWindSpeed(gustsSpeed) : '--'}
				</div>
			</div>
			{#if windDirection !== undefined}
				<DirectionIcon
					windDirection={windDirection}
					boatCourse={boatCourse}
				/>
			{/if}
		{:else}
			<div class="wind-text">--</div>
		{/if}
	</div>
</div>

<style lang="less">
	.cell {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		min-height: 50px;
	}

	.gradient-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
	}

	.gradient-half {
		flex: 1;
		height: 100%;

		&.wind-half {
			background: var(--wind-gradient);
			//border-right: 1px solid rgba(0, 0, 0, 0.05);
		}

		&.gust-half {
			background: var(--gust-gradient);
		}
	}

	.content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.speeds-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		width: 100%;
	}

	.wind-speed,
	.gust-speed {
		font-weight: 500;
		font-size: 10px;
		color: #333;
		width: 50%;
	}

	.speeds-separator {
		font-size: 8px;
		color: rgba(0, 0, 0, 0.3);
		line-height: 1;
	}

	.wind-text {
		color: #999;
		font-size: 12px;
	}
</style>