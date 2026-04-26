<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	// Drag state
	let isDragging = false;
	let dragStartTimestamp: number | null = null;
	let dragDropTargetTimestamp: number | null = null;
	let dragStartRouteIndex: number = 0;
	let dragElementType: string | null = null;
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
		dragStartRouteIndex = getElementRouteIndex(target);
		dragElementType = getElementDragType(target);

		// Find table scroll container
		tableScrollContainer = document.querySelector('.data-table');
	}

	function handleDragEnd(event: DragEvent) {
		isDragging = false;
		dragStartTimestamp = null;
		dragDropTargetTimestamp = null;
		dragElementType = null;

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


		const theDragStartTimestamp = dragStartTimestamp;
		const theDragStartRouteIndex = dragStartRouteIndex;
		const theDragElementType = dragElementType;

		requestAnimationFrame(() => {
			// Dispatch waypoint index changed event
			dispatch('elementIndexChanged', {
				fromTimestamp: theDragStartTimestamp,
				toTimestamp: targetTimestamp,
				isDragging: true,
				routeIndex: theDragStartRouteIndex,
				elementType: theDragElementType
			});
		}); // Use requestAnimationFrame to sync with browser repaint cycle
		

		dragDropTargetTimestamp = targetTimestamp;


		// Auto-scroll logic
		const rect = target.getBoundingClientRect();
		const container = tableScrollContainer;

		if (container) {
			const containerRect = container.getBoundingClientRect();
			const scrollThreshold = 75;
			const scrollOffset = 25;

			// Clear existing timer
			if (autoScrollTimer) {
				clearInterval(autoScrollTimer);
			}

			// Check if we need to scroll up
			if (rect.top - containerRect.top < scrollThreshold) {
				autoScrollTimer = setInterval(() => {
					container.scrollTop -= scrollOffset;
				}, 16) as any;
			}
			// Check if we need to scroll down
			else if (containerRect.bottom - rect.bottom < scrollThreshold) {
				autoScrollTimer = setInterval(() => {
					container.scrollTop += scrollOffset;
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
		dispatch('elementIndexChanged', {
			fromTimestamp: dragStartTimestamp,
			toTimestamp: targetTimestamp,
			isDragging: false,
			routeIndex: dragStartRouteIndex,
			elementType: dragElementType
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

	function getElementRouteIndex(target:HTMLElement) {
		const routeItem = target.closest('[data-route-index]');

		if (!routeItem) return 0; // Default to first route

		const routeIndex = parseInt(routeItem.getAttribute('data-route-index') || '0', 10);
		if (isNaN(routeIndex)) return 0;

		return routeIndex
	}

	function getElementDragType(target:HTMLElement) {
		const routeItem = target.closest('[data-drag-type]');
		if (!routeItem) return '';

		const dragType = routeItem.getAttribute('data-drag-type');
		if (!dragType) return '';

		return dragType
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