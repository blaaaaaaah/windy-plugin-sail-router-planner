<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	// Drag state
	let isDragging = false;
	let dragStartIndex: number | null = null;
	let dragDropTargetIndex: number | null = null;
	let autoScrollTimer: number | null = null;
	let tableScrollContainer: HTMLElement | null = null;

	// Handle DOM drag events from DraggableWaypoint components
	function handleDragStart(event: DragEvent) {
		const target = event.target as HTMLElement;
		const waypointElement = target.closest('[data-waypoint-index]');

		if (!waypointElement) return;

		const index = parseInt(waypointElement.getAttribute('data-waypoint-index') || '', 10);
		if (isNaN(index)) return;

		isDragging = true;
		dragStartIndex = index;
		dragDropTargetIndex = null;

		// Find table scroll container
		tableScrollContainer = document.querySelector('.data-table');
	}

	function handleDragEnd(event: DragEvent) {
		isDragging = false;
		dragStartIndex = null;
		dragDropTargetIndex = null;

		// Clear auto-scroll timer
		if (autoScrollTimer) {
			clearInterval(autoScrollTimer);
			autoScrollTimer = null;
		}

		tableScrollContainer = null;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();

		if (!isDragging || dragStartIndex === null) return;

		const target = event.target as HTMLElement;
		const forecastItem = target.closest('.forecast-item');

		if (!forecastItem) return;

		const targetIndex = parseInt(forecastItem.getAttribute('data-index') || '', 10);
		if (isNaN(targetIndex)) return;

		// Only show drop target if it's a different position
		if (targetIndex !== dragStartIndex) {
			dragDropTargetIndex = targetIndex;

			// FUTURE: When datasource exists, dispatch continuous drag events
			// dispatch('waypointDrag', { fromIndex: dragStartIndex, toIndex: targetIndex });
		} else {
			dragDropTargetIndex = null;
		}

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

		if (dragStartIndex === null) return;

		const target = event.target as HTMLElement;
		const forecastItem = target.closest('.forecast-item');

		if (!forecastItem) return;

		const targetIndex = parseInt(forecastItem.getAttribute('data-index') || '', 10);
		if (isNaN(targetIndex) || targetIndex === dragStartIndex) return;

		// Dispatch waypoint index changed event
		dispatch('waypointIndexChanged', {
			fromIndex: dragStartIndex,
			toIndex: targetIndex
		});

		// FUTURE: When datasource exists, dispatch drag end for final data update
		// dispatch('waypointDragEnd', { fromIndex: dragStartIndex, toIndex: targetIndex });

		handleDragEnd(event);
	}
</script>

<!--
	FUTURE ARCHITECTURE WITH DATASOURCE (Phase 3):

	When ForecastTableDataSource is implemented, this component should handle
	ALL visual feedback internally without slot props:

	1. DROP TARGET GHOST:
	   - DraggableWaypointForecastTable dispatches 'waypointDrag' events
	   - ForecastTable updates datasource to insert { type: 'drag-target', index, timestamp }
	   - Datasource regenerates rows array with ghost row included
	   - Rendering loop handles drag-target type automatically
	   - No conditional {#if} blocks needed in template

	2. CLEAN EVENT FLOW:
	   waypointDrag → update datasource → re-render with ghost
	   waypointDragEnd → setDepartureTime + clean datasource → re-render without ghost

	3. REMOVE SLOT PROPS:
	   <slot /> // No drag state passed to parent

	This maintains clean separation: drag behavior vs data vs rendering
-->

<div
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
>
	<slot {isDragging} {dragStartIndex} {dragDropTargetIndex} />
</div>

<style>
	div {
		height: 100%;
	}
</style>