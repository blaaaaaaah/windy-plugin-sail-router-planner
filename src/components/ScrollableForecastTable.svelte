<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let scrollToIndex: number | null = null;

	const dispatch = createEventDispatcher();

	let scrollContainer: HTMLElement | null = null;
	let rowPositions: Array<{top: number, bottom: number, index: number}> = [];
	let currentHoverIndex: number | null = null;

	// Dispatch row hover only when index changes
	function dispatchRowHover(index: number) {
		if (currentHoverIndex !== index) {
			currentHoverIndex = index;
			dispatch('rowHover', { index });
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
			rowPositions.push({
				top: rect.top - containerRect.top + scrollContainer!.scrollTop,
				bottom: rect.bottom - containerRect.top + scrollContainer!.scrollTop,
				index: index
			});
		});
	}

	// Cache positions when container changes (for scroll event dispatch)
	$: if (scrollContainer) {
		setTimeout(() => cacheRowPositions(), 0);
	}

	// Scroll to specific row index
	function scrollToRowIndex(index: number) {
		if (!scrollContainer || rowPositions.length === 0 || index < 0 || index >= rowPositions.length) return;

		const targetRow = rowPositions[index];
		const offsetFromTop = 0; // Show target row at the very top
		const targetScrollTop = Math.max(0, targetRow.top - offsetFromTop);

		console.log(`Auto-scrolling to row index ${index}`);
		scrollContainer.scrollTo({
			top: targetScrollTop,
			behavior: 'smooth'
		});
	}

	// When scrollToIndex changes: cache positions then scroll
	$: if (scrollToIndex !== null) {
		setTimeout(() => {
			cacheRowPositions();
			scrollToRowIndex(scrollToIndex);
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
				dispatchRowHover(row.index);
				break;
			}
		}
	}

	// Handle mouse events via event delegation
	function handleMouseOver(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const forecastItem = target.closest('.forecast-item');

		if (forecastItem) {
			const index = parseInt(forecastItem.getAttribute('data-index') || '', 10);
			if (!isNaN(index)) {
				dispatchRowHover(index);
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
			padding-left: 12px;
		}
	}
</style>