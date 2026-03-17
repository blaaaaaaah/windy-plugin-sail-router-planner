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
 * Note: Wind speeds should be in the same units (m/s from Windy API, converted to knots in UI)
 */
export function calculateApparentWind(
	trueWindSpeed: number, // m/s from Windy API
	trueWindDirection: number, // degrees - Windy gives wind direction "FROM" (meteorological)
	boatSpeed: number, // m/s (converted from knots in calling code)
	boatCourse: number // degrees
): { speed: number; direction: number } {
	// Convert wind direction FROM meteorological (where it's coming from) to mathematical (where it's going to)
	const windDirectionTo = (trueWindDirection + 180) % 360;

	// Convert degrees to radians
	const twdRad = (windDirectionTo * Math.PI) / 180;
	const courseRad = (boatCourse * Math.PI) / 180;

	// Convert to velocity components (north/east) - now using "going TO" direction
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

	// Calculate relative to boat heading: boat course - apparent wind direction
	// This gives us: negative = port side, positive = starboard side
	let relativeWindAngle = boatCourse - apparentWindDirection;

	// Normalize to -179 to 180 range
	while (relativeWindAngle > 180) {
		relativeWindAngle -= 360;
	}
	while (relativeWindAngle <= -180) {
		relativeWindAngle += 360;
	}

	return {
		speed: apparentWindSpeed,
		direction: relativeWindAngle // Now returns relative angle (-179 to 180)
	};
}

/**
 * Calculate relative direction from course (for both wind and wave display)
 * Input: direction FROM (meteorological convention)
 * Output: direction relative to boat heading with front being "up" in display
 */
export function calculateRelativeDirection(directionFrom: number, boatCourse: number): number {
	// Convert direction FROM meteorological (where it's coming from) to mathematical (where it's going to)
	const directionTo = (directionFrom + 180) % 360;

	// Convert to relative to boat course: direction - boat course
	let relativeDirection = directionTo - boatCourse;

	// Normalize to 0-359 degrees
	if (relativeDirection < 0) {
		relativeDirection += 360;
	}

	return relativeDirection;
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