<script lang="ts">
	export let inRoute: boolean = false;
	export let color: string | null = null;
	export let waypointNumber: number | null = null;
</script>

<div style="--route-color: {color};"
	class="route-color-cell"
	class:in-route={inRoute}
>
	{#if waypointNumber !== null}
		<div class="waypoint-number">
			{waypointNumber}
		</div>
	{/if}
</div>

<style lang="less">
	.route-color-cell {
		width: 4px;
		min-width: 4px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-height: 50px;

		border-left: 4px solid transparent;
		//margin-left: 13px;
	}

	.in-route {
		border-left: 4px solid var(--route-color)
	}

	.waypoint-number {
		position: absolute;
		top: -20px;
		left: -13px; /* Position to overlap the color border */
		background-color: var(--route-color);
		color: white;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		font-size: 11px;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		border: 2px solid white;
		z-index: 10;
	}
</style>