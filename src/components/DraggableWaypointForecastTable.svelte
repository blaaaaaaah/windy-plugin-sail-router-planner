<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	// Drag state
	let isDragging = false;
	let dragStartTimestamp: number | null = null;
	let dragDropTargetTimestamp: number | null = null;
	let autoScrollTimer: number | null = null;
	let tableScrollContainer: HTMLElement | null = null;

	// Handle DOM drag events from DraggableWaypoint components
	function handleDragStart(event: DragEvent) {
		const target = event.target as HTMLElement;

		// Set drag image to be invisible
		const dragImage = new Image();
		dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
		event.dataTransfer?.setDragImage(dragImage, 0, 0);

		const timestamp = getElementTimestamp(target);

		if (!timestamp) return;

		isDragging = true;
		dragStartTimestamp = timestamp;
		dragDropTargetTimestamp = null;

		// Find table scroll container
		tableScrollContainer = document.querySelector('.data-table');
	}

	function handleDragEnd(event: DragEvent) {
		isDragging = false;
		dragStartTimestamp = null;
		dragDropTargetTimestamp = null;

		// Clear auto-scroll timer
		if (autoScrollTimer) {
			clearInterval(autoScrollTimer);
			autoScrollTimer = null;
		}

		tableScrollContainer = null;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();

		if (!isDragging || dragStartTimestamp === null) return;

		const target = event.target as HTMLElement;
		const targetTimestamp = getElementTimestamp(target);

		if (targetTimestamp === dragDropTargetTimestamp || targetTimestamp === null) return; // No change in target

		setTimeout(() => {
			// Dispatch waypoint index changed event
			dispatch('waypointIndexChanged', {
				fromTimestamp: dragStartTimestamp,
				toTimestamp: targetTimestamp,
				isDragging: true
			});
		}, 100); // Debounce the event dispatching to give time to UI to redraw when adding rows whe ghost near the top or end
		

		dragDropTargetTimestamp = targetTimestamp;


		// Auto-scroll logic
		const rect = target.getBoundingClientRect();
		const container = tableScrollContainer;

		if (container) {
			const containerRect = container.getBoundingClientRect();
			const scrollThreshold = 50;

			// Clear existing timer
			if (autoScrollTimer) {
				clearInterval(autoScrollTimer);
			}

			// Check if we need to scroll up
			if (rect.top - containerRect.top < scrollThreshold) {
				autoScrollTimer = setInterval(() => {
					container.scrollTop -= 25;
				}, 16) as any;
			}
			// Check if we need to scroll down
			else if (containerRect.bottom - rect.bottom < scrollThreshold) {
				autoScrollTimer = setInterval(() => {
					container.scrollTop += 25;
				}, 16) as any;
			}
		}
	}

	function handleDragLeave() {
		// Clear auto-scroll when leaving drag area
		if (autoScrollTimer) {
			clearInterval(autoScrollTimer);
			autoScrollTimer = null;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();

		if (dragStartTimestamp === null) return;

		const target = event.target as HTMLElement;
		const targetTimestamp = getElementTimestamp(target);

		if (targetTimestamp === null) return;

		// Dispatch waypoint index changed event
		dispatch('waypointIndexChanged', {
			fromTimestamp: dragStartTimestamp,
			toTimestamp: targetTimestamp,
			isDragging: false
		});

		handleDragEnd(event);
	}

	function getElementTimestamp(target:HTMLElement) {
		const forecastItem = target.closest('[data-timestamp]');

		if (!forecastItem) return null;

		const targetTimestamp = parseInt(forecastItem.getAttribute('data-timestamp') || '', 10);
		if (isNaN(targetTimestamp)) return null;

		return targetTimestamp
	}
</script>


<div
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
>
	<slot />
</div>

<style>
	div {
		height: 100%;
	}
</style>