<script lang="ts">
	import { formatPrecipitation } from '../../utils/FormatUtils';
	import type { PointForecast } from '../../types/WeatherTypes';

	export let forecast: PointForecast;

	function getWeatherIcon(weatherCode: number): string {
		// Map weather codes to icon paths
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
</script>

<div class="weather-container">
	{#if forecast.weather != null}
		<img
			src="/img/icons7/png_27@2x/{getWeatherIcon(forecast.weather)}"
			alt="Weather"
			class="weather-icon"
		/>
	{/if}
	<div class="rain-value">
		{forecast.precipitations != null ? formatPrecipitation(forecast.precipitations) : '--'}
	</div>
</div>

<style lang="less">
	.weather-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		text-align: center;
	}

	.weather-icon {
		width: 24px;
		height: 24px;
	}

	.rain-value {
		font-size: 10px;
		color: #4a90e2;
		font-weight: 500;
	}
</style>