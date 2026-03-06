import type { LatLng } from '../types';

/**
 * Convert meters to nautical miles
 */
export function toNauticalMiles(meters: number): number {
	return meters / 1852;
}

/**
 * Calculate course (bearing) between two points
 */
export function calculateCourse(start: LatLng, end: LatLng): number {
	// Calculate bearing using spherical trigonometry
	const lat1 = start.lat * Math.PI / 180;
	const lat2 = end.lat * Math.PI / 180;
	const deltaLon = (end.lng - start.lng) * Math.PI / 180;

	const y = Math.sin(deltaLon) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

	let bearing = Math.atan2(y, x) * 180 / Math.PI;

	// Normalize to 0-359 range
	if (bearing < 0) {
		bearing += 360;
	}

	return bearing;
}

/**
 * Calculate apparent wind from true wind and boat motion
 */
export function calculateApparentWind(
	trueWindSpeed: number,
	trueWindDirection: number,
	boatSpeed: number,
	boatCourse: number
): { speed: number; direction: number } {
	// Convert degrees to radians
	const twdRad = (trueWindDirection * Math.PI) / 180;
	const courseRad = (boatCourse * Math.PI) / 180;

	// Convert to velocity components (north/east)
	const trueWindNorth = trueWindSpeed * Math.cos(twdRad);
	const trueWindEast = trueWindSpeed * Math.sin(twdRad);

	// Boat velocity components
	const boatVelocityNorth = boatSpeed * Math.cos(courseRad);
	const boatVelocityEast = boatSpeed * Math.sin(courseRad);

	// Apparent wind = True wind - Boat velocity
	const apparentWindNorth = trueWindNorth - boatVelocityNorth;
	const apparentWindEast = trueWindEast - boatVelocityEast;

	// Calculate apparent wind speed and direction
	const apparentWindSpeed = Math.sqrt(
		apparentWindNorth * apparentWindNorth + apparentWindEast * apparentWindEast
	);

	let apparentWindDirection = Math.atan2(apparentWindEast, apparentWindNorth) * 180 / Math.PI;

	// Normalize to 0-359 degrees
	if (apparentWindDirection < 0) {
		apparentWindDirection += 360;
	}

	return {
		speed: apparentWindSpeed,
		direction: apparentWindDirection
	};
}

/**
 * Calculate relative direction from course (for apparent wind display)
 */
export function calculateRelativeDirection(absoluteDirection: number, course: number): number {
	let relative = absoluteDirection - course;

	// Normalize to -180 to 180 range
	while (relative > 180) {
		relative -= 360;
	}
	while (relative < -180) {
		relative += 360;
	}

	return relative;
}

/**
 * Interpolate position between two points
 */
export function interpolateLatLng(start: LatLng, end: LatLng, progress: number): LatLng {
	const lat = start.lat + (end.lat - start.lat) * progress;
	const lng = start.lng + (end.lng - start.lng) * progress;

	// Create LatLng using Leaflet's constructor
	const L = (window as any).L;
	return new L.LatLng(lat, lng);
}