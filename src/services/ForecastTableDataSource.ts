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
	forecastTimestamp?: number | null;

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
	timestamp: number;
	type: 'row' | 'waypoint';
	isCurrentHour: boolean;

	// If type === 'waypoint' (single-route mode only)
	waypointData?: LegWaypointData;

	// If type === 'row'
	cells?: ForecastCellData[];
}

export class ForecastTableDataSource {

	constructor(
		private routeForecasts: RouteForecast[]
	) {}

	/**
	 * Main method - converts RouteForecast to table rows
	 */
	getRowsData(offsets: { preDepartureOffset: number, postArrivalOffset: number }[], showApparent: boolean = false, ghostTimestamp: number | null = null): ForecastTableRowData[] {
		const isSingleRoute:boolean = this.routeForecasts.length === 1;

		// Generate unified timeline
		const timeline = this.generateTimeline(offsets, this.routeForecasts, ghostTimestamp);

		if (!timeline.length) {
			return [];
		}

		// Calculate waypoint positions for all routes
		const waypointDataList = this.routeForecasts.flatMap(routeForecast => 
			this.calculateWaypointPositions(timeline, routeForecast, ghostTimestamp)
		);

		// Generate rows - alternate between waypoint and data rows
		const rows: ForecastTableRowData[] = [];

		for (let i = 0; i < timeline.length; i++) {
			const timestamp = timeline[i];
			const isCurrentHour = this.isCurrentHour(timestamp);

			// only show waypoint rows if we're in single-route mode, to avoid confusion in multi-route scenarios (where waypoints from different routes could be interleaved)
			if ( isSingleRoute ) {
				// Check if there's a waypoint at this position
				const waypointData = waypointDataList.find(wp => wp.timestamp === timestamp);
				if (waypointData ) {
					// Add waypoint row
					rows.push({
						timestamp,
						type: 'waypoint',
						isCurrentHour,
						waypointData: waypointData.data
					});
				}
			}

			const waypointMap = new Map(
				waypointDataList.filter(wp => wp.timestamp === timestamp)
								.map(wp => [wp.route.id, wp.data])
			);

			rows.push({
				timestamp,
				type: 'row',
				isCurrentHour,
				cells: [
					//this.generateTimeCell(this.routeForecasts, timestamp),
					...
					this.routeForecasts.flatMap(routeForecast => 
						this.generateCellsForTimestamp(
							timeline, 
							routeForecast, 
							i, 
							showApparent, 
							waypointMap.get(routeForecast.route.id),
							isSingleRoute
						)
					)
				]
			});
		}

		console.log(`Generated ${rows.length} rows for forecast table (including ${waypointDataList.length} waypoints)`);

		return rows;
	}

	/**
	 * Generate unified timeline of hourly timestamps
	 */
	private generateTimeline(offsets: { preDepartureOffset: number, postArrivalOffset: number }[], routeForecasts: RouteForecast[], ghostTimestamp: number | null = null): number[] {
		const timeline: number[] = [];

		// Calculate global timeline bounds from all routes
		let globalStartTime = Number.MAX_VALUE;
		let globalEndTime = Number.MIN_VALUE;

		routeForecasts.forEach((routeForecast, index) => {
			if (routeForecast.pointForecasts) {
				const routeOffset = offsets[index] || { preDepartureOffset: 6, postArrivalOffset: 6 };
				const preDepartureMs = routeOffset.preDepartureOffset * 60 * 60 * 1000;
				const postArrivalMs = routeOffset.postArrivalOffset * 60 * 60 * 1000;

				const routeStartTime = routeForecast.route.departureTime - preDepartureMs;
				const routeEndTime = routeForecast.route.arrivalTime + postArrivalMs;

				globalStartTime = Math.min(globalStartTime, routeStartTime);
				globalEndTime = Math.max(globalEndTime, routeEndTime);
			}
		});

		// If no valid routes found, use defaults
		if (globalStartTime === Number.MAX_VALUE) {
			globalStartTime = Date.now() - (6 * 60 * 60 * 1000);
			globalEndTime = Date.now() + (24 * 60 * 60 * 1000);
		}

		// Generate hourly timestamps
		const startHour = Math.floor(globalStartTime / (60 * 60 * 1000)) * (60 * 60 * 1000);
		const endHour = Math.ceil(globalEndTime / (60 * 60 * 1000)) * (60 * 60 * 1000);

		for (let timestamp = startHour; timestamp <= endHour; timestamp += 60 * 60 * 1000) {
			timeline.push(timestamp);
		}

		return timeline;
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



	private generateTimeCell(routeForecasts: RouteForecast[], timestamp: number): ForecastCellData {
		// Time cell
		const forecastTimestamps = routeForecasts
								.map(routeForecast => this.findForecastPointForTimestamp(routeForecast, timestamp)?.forecastTimestamp)
								.filter(forecastTimestamp => forecastTimestamp != null);

		return {
			type: 'time',
			timestamp,
			// Math.max retourne -Infinity si l'array est vide, d'où le check
			forecastTimestamp: forecastTimestamps.length > 0 ? Math.max(...forecastTimestamps) : null
		};
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


		cells.push({
			type: 'time',
			timestamp,
			// Math.max retourne -Infinity si l'array est vide, d'où le check
			forecastTimestamp: forecastPoint?.forecastTimestamp
		});



		// Route color cell (no gradient background)
		const isInRoute = 
				routeForecast.route.departureTime <= timestamp && 
				timestamp < this.findClosestTimestamp(timeline, routeForecast.route.arrivalTime);

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
				course: forecastPoint?.leg?.course,
				apparent: showApparent,
				gradient: windGradient
			});

			cells.push({
				type: 'wind',
				windSpeed: weatherData?.gustsSpeed,
				relativeWindDirection: weatherData?.relativeWindDirection,
				trueWindDirection: weatherData?.trueWindDirection,
				course: forecastPoint?.leg?.course,
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
				course: forecastPoint?.leg?.course,
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