/**
 * Color utilities for forecast table cells
 * Extracted from ForecastTable.svelte for better organization
 */

// Global color instances (initialized once)
let windDetailColor: any = null;
let seaIndexColor: any = null;

/**
 * Get wind speed color using Windy's windDetail palette
 */
export function getWindColor(windSpeedMs: number): string {
	if (!windDetailColor) {
		try {
			windDetailColor = new (window as any).W.Color.Color({
				ident: "windDetail",
				default: [
					[0, "rgb(243,243,243)"],
					[3, "rgb(243,243,243)"],
					[4, "rgb(0,200,254)"],
					[6, "rgb(0,230,0)"],
					[10, "rgb(254,174,0)"],
					[19, "rgb(254,0,150)"],
					[100, "rgb(151,50,222)"]
				]
			});
			console.log('windDetailColor created successfully');
		} catch (error) {
			console.error('Failed to create windDetail color:', error);
		}
	}
	if (windDetailColor && typeof windSpeedMs === 'number' && !isNaN(windSpeedMs)) {
		try {
			return windDetailColor.getColor().color(windSpeedMs);
		} catch (error) {
			console.warn('WindDetail color failed:', error);
		}
	}
	return 'rgba(0, 119, 190, 0.1)'; // fallback
}

/**
 * Get sea index color for wave conditions
 */
export function getSeaIndexColor(seaIndex: number): string {
	if (!seaIndexColor) {
		try {
			seaIndexColor = new (window as any).W.Color.Color({
				ident: "seaIndex",
				default: [
					[0, "rgb(243,243,243)"],      // Blue - very comfortable (< 0.6)
					[0.6, "rgb(34,197,94)"],    // Green - comfortable
					[0.9, "rgb(132,204,22)"],   // Light green - comfortable
					[1.2, "rgb(251,191,36)"],   // Yellow - moderate
					[1.6, "rgb(249,115,22)"],   // Orange - rough
					[2.0, "rgb(239,68,68)"],    // Red - hard
					[3.0, "rgb(153,27,27)"]     // Dark red - very hard
				]
			});
			console.log('seaIndexColor created successfully');
		} catch (error) {
			console.error('Failed to create seaIndex color:', error);
		}
	}
	if (seaIndexColor && typeof seaIndex === 'number' && !isNaN(seaIndex)) {
		try {
			return seaIndexColor.getColor().color(seaIndex);
		} catch (error) {
			console.warn('SeaIndex color failed:', error);
		}
	}
	return 'rgba(40, 146, 199, 0.1)'; // fallback
}

/**
 * Helper function to interpolate between two RGB colors
 */
export function interpolateColors(color1: string, color2: string, factor: number = 0.5): string {
	const rgb1 = color1.match(/\d+/g)!.map(Number);
	const rgb2 = color2.match(/\d+/g)!.map(Number);

	const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * factor);
	const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * factor);
	const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * factor);

	return `rgb(${r},${g},${b})`;
}

/**
 * Create a gradient background for smooth color transitions between adjacent cells
 */
export function createGradientBackground(
	currentValue: number,
	prevValue: number | null,
	nextValue: number | null,
	colorFunc: (value: number) => string
): string {
	const currentColor = colorFunc(currentValue);

	if (prevValue === null && nextValue === null) {
		// Single cell, use solid color
		return currentColor;
	}

	const prevColor = prevValue !== null ? colorFunc(prevValue) : currentColor;
	const nextColor = nextValue !== null ? colorFunc(nextValue) : currentColor;

	// Calculate blended colors at borders
	const topBlendColor = interpolateColors(prevColor, currentColor);  // Half between prev and current
	const bottomBlendColor = interpolateColors(currentColor, nextColor); // Half between current and next

	// Create gradient: top blend -> current color -> bottom blend
	return `linear-gradient(to bottom, ${topBlendColor} 0%, ${currentColor} 50%, ${bottomBlendColor} 100%)`;
}

/**
 * Convert hex color to RGB string for CSS custom properties
 */
export function hexToRgb(hex: string): string {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (result) {
		const r = parseInt(result[1], 16);
		const g = parseInt(result[2], 16);
		const b = parseInt(result[3], 16);
		return `${r}, ${g}, ${b}`;
	}
	return '52, 152, 219'; // fallback to default blue
}