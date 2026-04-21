<script lang="ts">
	import { formatWindSpeed, formatRelativeDirection, formatWaveHeight, formatPrecipitation, formatWindSpeedNumber } from '../../utils/FormatUtils';
	import DirectionIcon from './DirectionIcon.svelte';

	export let windSpeed: number | null = null;
	export let gustsSpeed: number | null = null;
	export let wavesHeight: number | null = null;
	export let wavesPeriod: number | null = null;
	export let relativeWindDirection: number | null = null;
	export let trueWindDirection: number | null = null;
	export let wavesDirection: number | null = null;
	export let precipitations: number | null = null;
	export let weather: number | null = null;
	export let course: number = 0;
	export let apparent: boolean = false;
	export let windGradient: string = '';
	export let gustsGradient: string = '';
	export let wavesGradient: string = '';
	export let weatherGradient: string = '';

	$: windDirection = apparent ? relativeWindDirection : trueWindDirection;
	$: boatCourse = apparent ? 0 : course;

	$: tooltip = (() => {
		const windText = apparent
			? (relativeWindDirection !== null && trueWindDirection !== null ? `AWA: ${formatRelativeDirection(relativeWindDirection)}\nTWD: ${trueWindDirection.toFixed(0)}°` : 'Wind: N/A')
			: (relativeWindDirection !== null && trueWindDirection !== null ? `TWA: ${formatRelativeDirection(relativeWindDirection)}\nTWD: ${trueWindDirection.toFixed(0)}°` : 'Wind: N/A');

		const waveText = wavesPeriod !== null ? `\nWave period: ${Math.round(wavesPeriod)}s` : '';
		const precipText = precipitations !== null ? `\nPrecipitation: ${formatPrecipitation(precipitations)}` : '';

		return windText + waveText + precipText;
	})();

	function getWeatherIcon(weatherCode: number): string {
		const iconMap: Record<number, string> = {
			1: '1.png', // sunny
			2: '2.png', // partly cloudy
			3: '3.png', // cloudy
			18: '18.png', // light rain
			19: '19.png', // rain
			21: '21.png' // thunderstorm
		};
		return iconMap[weatherCode] || '2.png';
	}

	function isThunderstorm(weatherCode: number): boolean {
		// Focus on thunderstorm/lightning detection for sailing safety
		return weatherCode === 21 || weatherCode === 22 || weatherCode === 23;
	}

	function getThunderstormIcon(): string {
		return '⚡'; // Lightning emoji for compact display
	}
</script>

<div title={tooltip} class="cell" style:--wind-gradient={windGradient} style:--gust-gradient={gustsGradient} style:--waves-gradient={wavesGradient}>
	<div class="gradient-container">
		<div class="weather-column"></div>
		<div class="gradient-column wind-gust-column">
			<div class="wind-gradient-half" style="background: {windGradient}"></div>
			<div class="gust-gradient-half" style="background: {gustsGradient}"></div>
		</div>
		<div class="gradient-column wave-column"></div>
	</div>

	<div class="content">
		{#if windSpeed != null || gustsSpeed != null || wavesHeight != null}
			<!-- Compact 3-column layout -->
			<div class="data-row">
				<!-- Weather column -->
				<div class="data-column weather-data">
					<div class="weather-container">
						{#if weather != null && isThunderstorm(weather)}
							<span class="thunderstorm-icon" title="Thunderstorm Warning!">{getThunderstormIcon()}</span>
						{:else if weather != null}
							<img src="/img/icons7/png_27@2x/{getWeatherIcon(weather)}" alt="Weather" class="weather-icon" />
						{/if}
						<span class="precip-text" title="Precipitation: {precipitations !== null ? formatPrecipitation(precipitations) : '0mm'}">
							{precipitations !== null ? formatPrecipitation(precipitations) : '0'}
						</span>
					</div>
				</div>

				<!-- Combined Wind/Gust column -->
				<div class="data-column wind-gust-data">
					<div class="wind-gust-split-container">
						<div class="wind-half">
							<span class="wind-value-right">{windSpeed != null ? formatWindSpeedNumber(windSpeed) : '--'}&nbsp;</span>
						</div>
						<div class="separator">/</div>
						<div class="gust-half">
							<span class="gust-value-left">&nbsp;{gustsSpeed != null ? formatWindSpeed(gustsSpeed) : '--'}</span>
						</div>
					</div>
				</div>

				<!-- Wave column -->
				<div class="data-column wave-data">
					<span class="value">{wavesHeight != null ? formatWaveHeight(wavesHeight) : '--'}</span>
				</div>
			</div>

			<!-- Direction indicators row -->
			<div class="directions-row">
				<!-- Empty space for weather column -->
				<div class="direction-column weather-col"></div>

				<!-- Wind direction in wind/gust column -->
				<div class="direction-column wind-gust-col">
					{#if windDirection !== null}
						<div class="wind-direction">
							<DirectionIcon
								windDirection={windDirection}
								boatCourse={boatCourse}
							/>
						</div>
					{/if}
				</div>

				<!-- Wave direction in wave column -->
				<div class="direction-column wave-col">
					{#if wavesDirection !== null}
						<div class="wave-direction">
							<DirectionIcon
								windDirection={wavesDirection}
								boatCourse={boatCourse}
							/>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="no-data">--</div>
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
		border-right: 1px solid #e0e0e0;
//		margin-right: 12px;
	}

	.gradient-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
	}

	.gradient-column {
		flex: 1;
		height: 100%;

		&.wave-column {
			flex: 0.6;
		}

		&.wind-gust-column {
			display: flex;
		}

		&.wave-column {
			background: var(--waves-gradient);
		}
	}

	.weather-column {
		width: 20px;
		height: 100%;
		background: white;
		flex-shrink: 0;
		display: none;
	}

	.wind-gradient-half,
	.gust-gradient-half {
		flex: 1;
		height: 100%;
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
		padding: 1px;
		max-height: 50px;
		overflow: hidden;
	}

	.data-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		width: 100%;
	}

	.data-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;

		&.weather-data {
			width: 20px;
			flex: none;
			display: none;
		}

		&.wave-data {
			flex: 0.6;
		}
	}

	.value {
		font-weight: 500;
		font-size: 9px;
		color: #333;
		line-height: 1;
	}

	.wind-gust-split-container {
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
		position: relative;
	}

	.wind-half,
	.gust-half {
		flex: 1;
		display: flex;
		align-items: center;
		height: 100%;
	}

	.wind-half {
		justify-content: flex-end;
		padding-right: 2px;
	}

	.gust-half {
		justify-content: flex-start;
		padding-left: 2px;
	}

	.separator {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		font-weight: 500;
		font-size: 9px;
		color: #666;
		z-index: 20;
		padding: 0 1px;
	}

	.wind-value-right,
	.gust-value-left {
		font-weight: 500;
		font-size: 9px;
		color: #333;
		line-height: 1;
		white-space: nowrap;
	}

	.directions-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-top: 2px;
		height: 24px;
	}

	.direction-column {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;

		&.weather-col {
			width: 20px;
			flex: none;
			display: none;
		}

		&.wave-col {
			flex: 0.6;
		}
	}

	.weather-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		width: 100%;
		height: 100%;
	}

	.weather-icon {
		width: 12px;
		height: 12px;
	}

	.thunderstorm-icon {
		font-size: 8px;
		color: #ff4444;
		animation: pulse 1s ease-in-out infinite alternate;
	}

	.precip-text {
		font-size: 6px;
		font-weight: 500;
		color: #4a90e2;
		line-height: 1;
	}

	@keyframes pulse {
		from { opacity: 0.7; }
		to { opacity: 1; }
	}

	.wind-direction,
	.wave-direction {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.no-data {
		color: #999;
		font-size: 10px;
	}
</style>