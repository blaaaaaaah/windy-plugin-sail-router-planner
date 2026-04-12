<script lang="ts">
	export let index: number;

	function handleDragStart(event: DragEvent) {
		event.dataTransfer?.setData('text/plain', index.toString());

		// Set drag image to be invisible
		const dragImage = new Image();
		dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
		event.dataTransfer?.setDragImage(dragImage, 0, 0);
	}

	function handleDragEnd() {
		// No custom event dispatching - let DOM events bubble naturally
	}
</script>

<div
	data-waypoint-index={index}
	draggable="true"
	on:dragstart={handleDragStart}
	on:dragend={handleDragEnd}
>
	<slot />
</div>

