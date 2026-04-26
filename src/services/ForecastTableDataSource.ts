import type { RouteForecast, PointForecast, WeatherStats } from '../types/WeatherTypes';
import type { RouteDefinition, RouteLeg } from '../types/RouteTypes';
import { createGradientBackground, getWindColor, getSeaIndexColor } from '../utils/ColorUtils';

export interface LegWaypointData {
	leg: RouteLeg | null;
	isStart: boolean;
	isLast: boolean;
	number: number;
	stats: WeatherStats | null;
	color: string;
	departureTime: number;
	arrivalTime: number;
	dropGhost?: boolean;	// Indicates this is a "ghost" waypoint for drag-and-drop, not an actual route waypoint
	onDepartureTimeChange?: (newTime: number) => void;
}

export interface ForecastCellData {
	type: 'time' | 'wind' | 'wave' | 'weather' | 'route-color' | 'combined-wind';

	// Common properties
	apparent?: boolean;
	gradient?: string;

	// Time cell properties
	timestamp?: number;

	// Route color properties
	color?: string;
	inRoute?: boolean;
	waypointNumber?: number | null;

	// Wind cell properties
	windSpeed?: number | null;
	relativeWindDirection?: number | null;
	trueWindDirection?: number | null;
	course?: number;
	isGusts?: boolean;

	// Combined wind cell properties
	gustsSpeed?: number | null;
	windGradient?: string;
	gustsGradient?: string;
	wavesGradient?: string;

	// Wave cell properties
	wavesHeight?: number | null;
	wavesPeriod?: number | null;
	wavesDirection?: number | null;

	// Weather cell properties
	precipitations?: number | null;
	weather?: number | null;
	warnings?: any;
}

export interface ForecastTableRowData {
	// TODO : is this really useful ?
	cellsGroups: ForecastTableCellsGroup[];
}

export interface ForecastTableCellsGroup {
	timestamp: number;
	forecastTimestamp?: number | null;
	isCurrentHour: boolean;
	routeIndex: number;
	draggable: boolean;

	// If type === 'waypoint' (single-route mode only)
	waypointData?: LegWaypointData | null;

	// If type === 'row'
	cells: ForecastCellData[];
}

export class ForecastTableDataSource {

	constructor(
		private routeForecasts: RouteForecast[]
	) {}

	/**
	 * Main method - converts RouteForecast to table rows
	 */
	getRowsData(offsets: { preDepartureOffset: number, postArrivalOffset: number }[], showApparent: boolean = false, ghostTimestamp: number | null = null): ForecastTableRowData[] {
		const isSingleRoute: boolean = this.routeForecasts.length === 1;

		// Generate individual timelines for each route
		const timelines = this.generateTimelines(this.routeForecasts, offsets, ghostTimestamp);

		// All timelines should have the same length since they share the same endTime
		const timelineLength = timelines[0]?.length || 0;
		if (timelineLength === 0) {
			return [];
		}

		// Pre-compute waypoint positions for all routes
		const routeWaypointData = this.routeForecasts.map((routeForecast, routeIndex) =>
			this.calculateWaypointPositions(timelines[routeIndex], routeForecast, ghostTimestamp)
		);

		// Generate rows
		const rows: ForecastTableRowData[] = [];

		for (let rowIndex = 0; rowIndex < timelineLength; rowIndex++) {
			// Check if any route has waypoint data at this timestamp (single route mode only)
			/*if (isSingleRoute) {
				const waypointData = routeWaypointData[0].find(wp => wp.timestamp === timelines[0][rowIndex]);
				if (waypointData) {
					rows.push({
						type: 'waypoint',
						waypointData: waypointData.data
					});
				}
			}*/

			// Generate cellsGroups for all routes at this timestamp
			const cellsGroups: ForecastTableCellsGroup[] = [];

			for (let routeIndex = 0; routeIndex < this.routeForecasts.length; routeIndex++) {
				const routeForecast = this.routeForecasts[routeIndex];
				const timeline = timelines[routeIndex];
				const timestamp = timeline[rowIndex];
				const isCurrentHour = this.isCurrentHour(timestamp);

				// Find waypoint data for this route at this timestamp (already computed)
				const waypointData = routeWaypointData[routeIndex].find(wp => wp.timestamp === timestamp);
				
				// TODO do better
				const forecastPoint = this.findForecastPointForTimestamp(routeForecast, timestamp);

				// Generate cells for this route at this timestamp
				const cells = this.generateCellsForTimestamp(
					timeline,
					routeForecast,
					rowIndex,
					showApparent,
					waypointData?.data,
					isSingleRoute
				);

				cellsGroups.push({
					timestamp,
					forecastTimestamp:forecastPoint?.forecastTimestamp,
					isCurrentHour,
					routeIndex,
					waypointData: waypointData ? waypointData.data : null,
					draggable: !isSingleRoute,
					cells
				});
			}

			// Add data row
			rows.push({
				cellsGroups
			});
		}

		console.log(`Generated ${rows.length} rows for forecast table with ${this.routeForecasts.length} routes`);
		return rows;
	}

	/**
	 * Generate individual timelines for each route with shared end time
	 */
	private generateTimelines(routeForecasts: RouteForecast[], offsets: { preDepartureOffset: number, postArrivalOffset: number }[], ghostTimestamp: number | null = null): number[][] {
		const HOUR_MS = 60 * 60 * 1000;

		// Calculate the maximum duration and latest end time needed across all routes
		let maxDurationHours = 0;
		let globalEndTime = Number.MIN_VALUE;

		routeForecasts.forEach((routeForecast, index) => {
			const routeOffset = offsets[index] || { preDepartureOffset: 6, postArrivalOffset: 6 };
			const preDepartureMs = routeOffset.preDepartureOffset * HOUR_MS;
			const postArrivalMs = routeOffset.postArrivalOffset * HOUR_MS;

			const routeStartTime = routeForecast.route.departureTime - preDepartureMs;
			const routeEndTime = routeForecast.route.arrivalTime + postArrivalMs;

			// Calculate duration in hours for this route
			const routeDurationMs = routeEndTime - routeStartTime;
			const routeDurationHours = Math.ceil(routeDurationMs / HOUR_MS);

			maxDurationHours = Math.max(maxDurationHours, routeDurationHours);
			globalEndTime = Math.max(globalEndTime, routeEndTime);
		});

		// If no valid routes found, use default
		if (maxDurationHours === 0) {
			maxDurationHours = 30; // Default 30 hours
		}

		// Generate individual timelines for each route with the same number of hours
		const timelines: number[][] = routeForecasts.map((routeForecast, index) => {
			const routeOffset = offsets[index] || { preDepartureOffset: 6, postArrivalOffset: 6 };
			const preDepartureMs = routeOffset.preDepartureOffset * HOUR_MS;
			const routeStartTime = routeForecast.route.departureTime - preDepartureMs;

			// Generate timeline starting from this route's start time with maxDurationHours length
			const startHour = Math.floor(routeStartTime / HOUR_MS) * HOUR_MS;

			const timeline: number[] = [];
			for (let i = 0; i < maxDurationHours; i++) {
				timeline.push(startHour + (i * HOUR_MS));
			}

			return timeline;
		});

		return timelines;
	}

	/**
	 * Calculate waypoint positions and return LegWaypointData objects directly
	 */
	private calculateWaypointPositions(timeline: number[], routeForecast:RouteForecast, ghostTimestamp: number | null = null): Array<{
		timestamp: number;
		route: RouteDefinition;
		data: LegWaypointData;
	}> {
		if (!timeline.length) return [];
		if (!routeForecast.pointForecasts) return [];

		const waypointDataList: Array<{ timestamp: number; route: RouteDefinition; data: LegWaypointData }> = [];

		for ( let i = 0; i < routeForecast.route.legs.length; i++ ) {
			const currentLeg = routeForecast.route.legs[i];
			const closestTimestamp = this.findClosestTimestamp(timeline, currentLeg.startTime);

			if (closestTimestamp !== -1) {
				waypointDataList.push({
					timestamp: closestTimestamp,
					route: routeForecast.route,
					data: {
						leg: currentLeg,
						isStart: i == 0,
						isLast: false,
						number: i + 1,
						stats: routeForecast.legStats && i < routeForecast.legStats.length
							? routeForecast.legStats[i]
							: null,
						departureTime: routeForecast.route.departureTime,
						arrivalTime: routeForecast.route.arrivalTime,
						color: routeForecast.route.color,
						dropGhost: false
						// Note: onDepartureTimeChange will be connected in ForecastTable
					}
				});
			}
		}

		// Add last waypoints
		const lastWaypointTimestamp = this.findClosestTimestamp(timeline, routeForecast.route.arrivalTime);
		if ( lastWaypointTimestamp !== -1 ) {
			waypointDataList.push({
				timestamp: lastWaypointTimestamp,
				route: routeForecast.route,
				data: {
					leg: null,
					isStart: false,
					isLast: true,
					number: routeForecast.route.legs.length + 1,
					stats: null,
					departureTime: routeForecast.route.departureTime,
					arrivalTime: routeForecast.route.arrivalTime,
					color: routeForecast.route.color,
					dropGhost: false
					// Note: onDepartureTimeChange will be connected in ForecastTable
				}
			});				
		}

		if (ghostTimestamp !== null) {
			waypointDataList.push({
				timestamp: ghostTimestamp,
				route: routeForecast.route,
				data: {
					leg: routeForecast.route.legs[0], // Placeholder leg data for ghost waypoint
					isStart: false,
					isLast: false,
					number: 1,
					stats: null,
					departureTime: ghostTimestamp,
					arrivalTime: routeForecast.route.arrivalTime,
					color: routeForecast.route.color,
					dropGhost: true
				}
			});
		}

		waypointDataList.sort((a, b) => a.timestamp - b.timestamp); // Ensure waypoints are in timeline order

		return waypointDataList;
	}

	/**
	 * Find the timeline index closest to a target timestamp
	 */
	private findClosestTimestamp(timeline: number[], targetTime: number): number {
		if (timeline.length === 0) return -1;

		let bestIndex = 0;
		let minDiff = Math.abs(timeline[0] - targetTime);

		for (let i = 1; i < timeline.length; i++) {
			const diff = Math.abs(timeline[i] - targetTime);
			if (diff < minDiff) {
				minDiff = diff;
				bestIndex = i;
			}
		}

		return timeline[bestIndex];
	}



	/**
	 * Generate cells for a specific timestamp
	 * Cell order: time | route-color | wind | gust | waves | weather
	 */
	private generateCellsForTimestamp(
		timeline: number[],
		routeForecast: RouteForecast,
		index: number,
		showApparent: boolean,
		waypointData?: LegWaypointData,
		isSingleRoute: boolean = true
	): ForecastCellData[] {
		const cells: ForecastCellData[] = [];
		const timestamp = timeline[index];
		const forecastPoint = this.findForecastPointForTimestamp(routeForecast, timestamp);
		const prevForecastPoint = index > 0 ? this.findForecastPointForTimestamp(routeForecast, timeline[index - 1]) : null;
		const nextForecastPoint = index < timeline.length - 1 ? this.findForecastPointForTimestamp(routeForecast, timeline[index + 1]) : null;

		if ( ! timestamp ) {
			debugger;
		}

		/*cells.push({
			type: 'time',
			timestamp,
			// Math.max retourne -Infinity si l'array est vide, d'où le check
			forecastTimestamp: forecastPoint?.forecastTimestamp
		});*/



		// Route color cell (no gradient background)
		const isInRoute = !!(
				routeForecast.route.departureTime <= timestamp && 
				timestamp < this.findClosestTimestamp(timeline, routeForecast.route.arrivalTime) &&
				routeForecast.pointForecasts && routeForecast.pointForecasts.length > 0); // Only show in-route color if we have forecast data for this route (otherwise it can be misleading)

		cells.push({
			type: 'route-color',
			color: routeForecast.route.color,
			inRoute: isInRoute,
			waypointNumber: isSingleRoute ? null : waypointData?.number || null
		});

		if ( isSingleRoute ) {
			// Weather cell (no gradient background)
			cells.push({
				type: 'weather',
				precipitations: forecastPoint?.precipitations,
				weather: forecastPoint?.weather,
				warnings: forecastPoint?.warnings
			});
		}




		// Wind cell (with gradient background)
		const currentWindSpeed = this.getWindSpeed(forecastPoint, showApparent);
		const prevWindSpeed = prevForecastPoint ? this.getWindSpeed(prevForecastPoint, showApparent) : null;
		const nextWindSpeed = nextForecastPoint ? this.getWindSpeed(nextForecastPoint, showApparent) : null;
		const windGradient = createGradientBackground(currentWindSpeed, prevWindSpeed, nextWindSpeed, getWindColor);
		
		// Gusts cell (with gradient background)
		const currentGustSpeed = this.getGustSpeed(forecastPoint, showApparent);
		const prevGustSpeed = prevForecastPoint ? this.getGustSpeed(prevForecastPoint, showApparent) : null;
		const nextGustSpeed = nextForecastPoint ? this.getGustSpeed(nextForecastPoint, showApparent) : null;
		const gustsGradient = createGradientBackground(currentGustSpeed, prevGustSpeed, nextGustSpeed, getWindColor);

		const currentSeaIndex = forecastPoint?.northUp?.wavesIndex || 0;
		const prevSeaIndex = prevForecastPoint ? (prevForecastPoint.northUp?.wavesIndex || 0) : null;
		const nextSeaIndex = nextForecastPoint ? (nextForecastPoint.northUp?.wavesIndex || 0) : null;


		const wavesGradient = createGradientBackground(currentSeaIndex, prevSeaIndex, nextSeaIndex, getSeaIndexColor);

		const weatherData = showApparent ? forecastPoint?.apparent : forecastPoint?.northUp;

		//if ( isSingleRoute) {
			cells.push({
				type: 'wind',
				windSpeed: weatherData?.windSpeed,
				relativeWindDirection: weatherData?.relativeWindDirection,
				trueWindDirection: weatherData?.trueWindDirection,
					course: forecastPoint?.leg?.course || 0,
				apparent: showApparent,
				gradient: windGradient
			});

			cells.push({
				type: 'wind',
				windSpeed: weatherData?.gustsSpeed,
				relativeWindDirection: weatherData?.relativeWindDirection,
				trueWindDirection: weatherData?.trueWindDirection,
				course: forecastPoint?.leg?.course || 0,
				apparent: showApparent,
				gradient: gustsGradient,
				isGusts: true
			});
		/*} else {
			cells.push({
				type: 'combined-wind',
				windSpeed: weatherData?.windSpeed || null,
				gustsSpeed: weatherData?.gustsSpeed || null,
				relativeWindDirection: weatherData?.relativeWindDirection || null,
				trueWindDirection: weatherData?.trueWindDirection || null,
				wavesHeight: weatherData?.wavesHeight || null,
				wavesPeriod: weatherData?.wavesPeriod || null,
				wavesDirection: weatherData?.wavesDirection || null,
				precipitations: forecastPoint?.precipitations || null,
				weather: forecastPoint?.weather || null,
				course: forecastPoint?.leg?.course || 0,
				apparent: showApparent,
				windGradient: windGradient,
				gustsGradient: gustsGradient,
				wavesGradient: wavesGradient
			});
		}*/




		// Waves cell (with gradient background)
		//if ( isSingleRoute ) {
			
			cells.push({
				type: 'wave',
				wavesHeight: weatherData?.wavesHeight,
				wavesPeriod: weatherData?.wavesPeriod,
				wavesDirection: weatherData?.wavesDirection,
				course: forecastPoint?.leg?.course || 0,
				apparent: showApparent,
				gradient: wavesGradient
			});
		//}

		return cells;
	}


	/**
	 * Get wind speed from forecast data (replicating ForecastTable logic)
	 */
	private getWindSpeed(forecastPoint: PointForecast | null, showApparent: boolean): number {
		if (!forecastPoint) return 0;

		const weatherData = showApparent ? forecastPoint.apparent : forecastPoint.northUp;
		if (!weatherData) return 0;

		return weatherData.windSpeed;
	}

	/**
	 * Get gust speed from forecast data (replicating ForecastTable logic)
	 */
	private getGustSpeed(forecastPoint: PointForecast | null, showApparent: boolean): number {
		if (!forecastPoint) return 0;

		const weatherData = showApparent ? forecastPoint.apparent : forecastPoint.northUp;
		if (!weatherData) return 0;

		return weatherData.gustsSpeed;
	}


	/**
	 * Find forecast point that matches (or is closest to) the given timestamp
	 */
	private findForecastPointForTimestamp(routeForecast:RouteForecast, timestamp: number): PointForecast | null {
		if (!routeForecast.pointForecasts || routeForecast.pointForecasts.length === 0) {
			return null;
		}

		// Find the forecast point with timestamp closest to our target
		// (This handles the case where forecast timestamps don't exactly match hourly boundaries)
		let closestPoint: PointForecast | null = null;
		let minDiff = Infinity;

		for (const point of routeForecast.pointForecasts) {
			const diff = Math.abs(point.timestamp - timestamp);
			if (diff < minDiff) {
				minDiff = diff;
				closestPoint = point;
			}
		}

		// Only return if reasonably close (within 30 minutes)
		if (closestPoint && minDiff <= 30 * 60 * 1000) {
			return closestPoint;
		}

		return null;
	}

	/**
	 * Check if timestamp is in current hour (replicating ForecastTable logic)
	 */
	private isCurrentHour(timestamp: number): boolean {
		const now = Date.now();
		const currentHourStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
		const currentHourEnd = currentHourStart + (60 * 60 * 1000);

		return timestamp >= currentHourStart && timestamp < currentHourEnd;
	}
}