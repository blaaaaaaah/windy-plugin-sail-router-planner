<script lang="ts">
	export let windDirection: number | null | undefined;
	export let boatCourse: number;
</script>

<div class="direction-container">
	{#if windDirection != null}
		<svg
			class="wind-dir"
			width="16"
			height="20"
			viewBox="0 0 20 27"
			style="transform: translate(-50%, -50%) rotate({windDirection + 180}deg)"
		>
			<!-- Arrow shaft -->
			<line x1="10" y1="22.5" x2="10" y2="4.5" stroke="#007cba" stroke-width="1"/>
			<!-- Arrow head -->
			<polygon points="10,1.8 7,7.2 13,7.2" fill="#007cba"/>
		</svg>
	{/if}
	<svg
		class="boat-icon"
		width="16"
		height="16"
		viewBox="0 0 100 200"
		style="transform: translate(-50%, -50%) rotate({boatCourse}deg)"
	>
		<path d="
			M35 150
			L65 150
			Q70 100 50 50
			Q30 100 35 150
			Z"
			fill="white"
			stroke="gray"
			stroke-width="4"/>
	</svg>
</div>

<style lang="less">
	.direction-container {
		margin-top: -2px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		width: 20px;
		height: 20px;
	}

	.wind-dir,
	.boat-icon {
		position: absolute;
		top: 50%;
		left: 50%;
		transform-origin: center;
		transition: transform 0.3s ease;
	}

	.wind-dir {
		z-index: 2;
	}

	.boat-icon {
		z-index: 1;
	}
</style>