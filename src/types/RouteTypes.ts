import type { LatLng } from './Coordinates';
import { toNauticalMiles, calculateCourse } from '../utils/NavigationUtils';

export interface RouteLeg {
	startTime: number; // timestamp
	startPoint: LatLng;
	endPoint: LatLng;
	course: number; // degrees, 0-359 range
	distance: number; // nautical miles
	averageSpeed: number; // knots
	endTime: number; // timestamp
}

export class RouteDefinition {
	private startPoint: LatLng;
	private departureTime: number;
	private legs: RouteLeg[] = [];

	constructor(startPoint: LatLng, departureTime: number) {
		this.startPoint = startPoint;
		this.departureTime = departureTime;
	}

	addLeg(endPoint: LatLng, averageSpeedKnots: number): void {
		const lastLeg = this.legs[this.legs.length - 1];
		const legStartPoint = lastLeg ? lastLeg.endPoint : this.startPoint;
		const legStartTime = lastLeg ? lastLeg.endTime : this.departureTime;

		// Calculate distance in nautical miles
		const distance = toNauticalMiles(legStartPoint.distanceTo(endPoint));

		// Calculate course (bearing) in degrees, 0-359 range
		const course = calculateCourse(legStartPoint, endPoint);

		// Calculate duration and end time
		const durationHours = distance / averageSpeedKnots;
		const durationMs = durationHours * 60 * 60 * 1000;
		const endTime = legStartTime + durationMs;

		const newLeg: RouteLeg = {
			startTime: legStartTime,
			startPoint: legStartPoint,
			endPoint,
			course,
			distance,
			averageSpeed: averageSpeedKnots,
			endTime
		};

		this.legs.push(newLeg);
	}

	getLegs(): RouteLeg[] {
		return [...this.legs]; // Return copy to prevent mutation
	}

	getStartPoint(): LatLng {
		return this.startPoint;
	}

	getDepartureTime(): number {
		return this.departureTime;
	}

}