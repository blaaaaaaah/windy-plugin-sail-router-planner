<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let scrollToTimestamp: number | null = null;

	const dispatch = createEventDispatcher();

	let scrollContainer: HTMLElement | null = null;
	let rowPositions: Array<{top: number, bottom: number, timestamp: number}> = [];
	let currentHoverTimestamp: number | null = null;

	// Dispatch row hover only when index changes
	function dispatchRowHover(timestamp: number) {
		if (currentHoverTimestamp !== timestamp) {
			currentHoverTimestamp = timestamp;
			dispatch('rowHover', { timestamp });
		}
	}

	// Cache row positions after DOM updates
	function cacheRowPositions() {
		if (!scrollContainer) return;

		rowPositions = [];
		const forecastItems = scrollContainer.querySelectorAll('.forecast-item');

		forecastItems.forEach((item, index) => {
			const rect = item.getBoundingClientRect();
			const containerRect = scrollContainer!.getBoundingClientRect();
			const timestamp = parseInt(item.getAttribute('data-timestamp') || '', 10);

			rowPositions.push({
				top: rect.top - containerRect.top + scrollContainer!.scrollTop,
				bottom: rect.bottom - containerRect.top + scrollContainer!.scrollTop,
				timestamp: timestamp
			});
		});
	}

	// Cache positions when container changes (for scroll event dispatch)
	$: if (scrollContainer) {
		setTimeout(() => cacheRowPositions(), 0);
	}

	// Scroll to specific row index
	function scrollToRowTimestamp(timestamp: number) {
		if (!scrollContainer || rowPositions.length === 0) return;

		const targetRow = rowPositions.find(row => row.timestamp === timestamp);
		if ( ! targetRow ) return;

		const offsetFromTop = 0; // Show target row at the very top
		const targetScrollTop = Math.max(0, targetRow.top - offsetFromTop);

		console.log(`Auto-scrolling to timestamp ${new Date(timestamp)}`);
		scrollContainer.scrollTo({
			top: targetScrollTop,
			behavior: 'smooth'
		});
	}

	// When scrollToTimestamp changes: cache positions then scroll
	$: if (scrollToTimestamp !== null) {
		setTimeout(() => {
			cacheRowPositions();
			scrollToRowTimestamp(scrollToTimestamp);
		}, 0);
	}

	function handleScroll() {
		if (!scrollContainer || rowPositions.length === 0) return;

		const scrollTop = scrollContainer.scrollTop;
		const containerHeight = scrollContainer.clientHeight;
		const centerY = scrollTop + (containerHeight / 2);

		// Find the row that contains the center Y position
		for (const row of rowPositions) {
			if (centerY >= row.top && centerY <= row.bottom) {
				dispatchRowHover(row.timestamp);
				break;
			}
		}
	}

	// Handle mouse events via event delegation
	function handleMouseOver(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const targetItem = target.closest('[data-timestamp]');

		if (targetItem) {
			const timestamp = parseInt(targetItem.getAttribute('data-timestamp') || '', 10);
			if (!isNaN(timestamp)) {
				dispatchRowHover(timestamp);
			}
		}
	}

</script>

<div class="data-table vertical-scroll"
	bind:this={scrollContainer}
	on:scroll={handleScroll}
	on:mouseover={handleMouseOver}

	>
	<slot></slot>
</div>

<style>
	.data-table {
		flex: 1;
		overflow-x: visible;
		overflow-y: auto;
		height: 100%;
		&.vertical-scroll {
			padding: 0;
		}
	}
</style>