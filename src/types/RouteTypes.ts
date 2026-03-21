import type { LatLng } from './Coordinates';
import { toNauticalMiles, calculateCourse, calculateGreatCircleDistance, interpolateLatLng } from '../utils/NavigationUtils';

export interface RouteLeg {
	startTime: number; // timestamp
	startPoint: LatLng;
	endPoint: LatLng;
	course: number; // degrees, 0-359 range
	distance: number; // nautical miles
	averageSpeed: number; // knots
	endTime: number; // timestamp
	duration: number; // milliseconds (endTime - startTime)
}

export class RouteDefinition {
	readonly id: string;
	private _name: string;
	private _color: string;
	private _departureTime: number;
	private _defaultSpeed: number;
	private _waypoints: LatLng[] = [];
	private _legSpeeds: number[] = [];
	private _cachedLegs: RouteLeg[] | null = null;

	constructor(
		id: string = crypto.randomUUID(),
		name: string = `Route ${new Date().toLocaleTimeString()}`,
		color: string = '',
		departureTime: number = Math.floor(Date.now() / (1000 * 60 * 60)) * (1000 * 60 * 60),
		defaultSpeed: number = 5
	) {
		this.id = id;
		this._name = name;
		this._color = color || '#FF6B6B';
		this._departureTime = departureTime;
		this._defaultSpeed = defaultSpeed;
	}

	addWaypoint(position: LatLng): void {
		this._waypoints.push(position);
		this._legSpeeds.push(this._defaultSpeed);
		this._clearCache();
	}

	removeWaypoint(index: number): void {
		if (index < 0 || index >= this._waypoints.length) {
			throw new Error(`Invalid waypoint index: ${index}`);
		}
		this._waypoints.splice(index, 1);
		// Remove corresponding leg speed, but keep at least one if waypoints remain
		if (this._legSpeeds.length > this._waypoints.length) {
			this._legSpeeds.splice(index, 1);
		}
		this._clearCache();
	}

	updateWaypoint(index: number, position: LatLng): void {
		if (index < 0 || index >= this._waypoints.length) {
			throw new Error(`Invalid waypoint index: ${index}`);
		}
		this._waypoints[index] = position;
		this._clearCache();
	}

	setLegSpeed(legIndex: number, speed: number): void {
		const maxLegIndex = Math.max(0, this._waypoints.length - 2);
		if (legIndex < 0 || legIndex > maxLegIndex) {
			throw new Error(`Invalid leg index: ${legIndex}`);
		}
		// Ensure legSpeeds array is large enough
		while (this._legSpeeds.length <= legIndex) {
			this._legSpeeds.push(this._defaultSpeed);
		}
		this._legSpeeds[legIndex] = speed;
		this._clearCache();
	}

	setDepartureTime(departureTime: number): void {
		this._departureTime = departureTime;
		this._clearCache();
	}

	get name(): string {
		return this._name;
	}

	set name(name: string) {
		this._name = name;
	}

	get color(): string {
		return this._color;
	}

	set color(color: string) {
		this._color = color;
	}

	get legs(): RouteLeg[] {
		if (this._cachedLegs === null) {
			this._cachedLegs = this._calculateLegs();
		}
		return [...this._cachedLegs]; // Return copy to prevent mutation
	}

	get waypoints(): LatLng[] {
		return [...this._waypoints]; // Return copy to prevent mutation
	}

	get totalDistance(): number {
		return this.legs.reduce((total, leg) => total + leg.distance, 0);
	}

	get totalDuration(): number {
		return this.legs.reduce((total, leg) => total + (leg.endTime - leg.startTime), 0);
	}

	get departureTime(): number {
		return this._departureTime;
	}

	get arrivalTime(): number {
		return this._departureTime + this.totalDuration;
	}

	getPositionAtTime(timestamp: number): LatLng | null {
		const legs = this.legs;

		// Find which leg contains this timestamp
		for (const leg of legs) {
			if (timestamp >= leg.startTime && timestamp <= leg.endTime) {
				// Calculate progress within this leg (0 to 1)
				const legProgress = (timestamp - leg.startTime) / (leg.endTime - leg.startTime);

				// Interpolate position within the leg using great circle path
				return interpolateLatLng(leg.startPoint, leg.endPoint, legProgress);
			}
		}

		// If before start time, return start point
		if (timestamp < this._departureTime && this._waypoints.length > 0) {
			return this._waypoints[0];
		}

		// If after end time, return end point
		if (this._waypoints.length > 0) {
			return this._waypoints[this._waypoints.length - 1];
		}

		return null;
	}

	private _calculateLegs(): RouteLeg[] {
		const legs: RouteLeg[] = [];

		for (let i = 0; i < this._waypoints.length - 1; i++) {
			const startPoint = this._waypoints[i];
			const endPoint = this._waypoints[i + 1];
			const speed = this._legSpeeds[i];

			if (speed === undefined) {
				throw new Error(`Speed not defined for leg ${i}`);
			}

			// Calculate distance in nautical miles using great circle distance for accuracy
			const distance = toNauticalMiles(calculateGreatCircleDistance(startPoint, endPoint));

			// Calculate course (bearing) in degrees, 0-359 range
			const course = calculateCourse(startPoint, endPoint);

			// Calculate timing
			const durationHours = distance / speed;
			const durationMs = durationHours * 60 * 60 * 1000;

			const startTime = i === 0 ? this._departureTime : legs[i - 1].endTime;
			const endTime = startTime + durationMs;

			legs.push({
				startTime,
				startPoint,
				endPoint,
				course,
				distance,
				averageSpeed: speed,
				endTime,
				duration: durationMs
			});
		}

		return legs;
	}



	private _clearCache(): void {
		this._cachedLegs = null;
	}

}