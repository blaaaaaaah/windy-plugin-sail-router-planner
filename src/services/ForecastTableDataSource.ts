import type { RouteForecast, PointForecast, WeatherStats } from '../types/WeatherTypes';
import type { RouteLeg } from '../types/RouteTypes';
import { createGradientBackground, getWindColor, getSeaIndexColor } from '../utils/ColorUtils';

export interface LegWaypointData {
	leg: RouteLeg;
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
	type: 'time' | 'wind' | 'wave' | 'weather' | 'route-color';

	// Common properties
	backgroundColor?: string;
	apparent?: boolean;

	// Time cell properties
	timestamp?: number;
	forecastTimestamp?: number | null;

	// Route color properties
	color?: string | null;
	waypointNumber?: number | null;

	// Wind cell properties
	windSpeed?: number | null;
	relativeWindDirection?: number | null;
	trueWindDirection?: number | null;
	course?: number;
	isGusts?: boolean;

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
	index: number;	// position in the timeline
	timestamp: number;
	type: 'row' | 'waypoint';
	isCurrentHour: boolean;

	// If type === 'waypoint' (single-route mode only)
	waypointData?: LegWaypointData;

	// If type === 'row'
	cells?: ForecastCellData[];
}

export class ForecastTableDataSource {

	private startTime: number = Date.now();

	constructor(
		private routeForecast: RouteForecast
	) {}

	/**
	 * Main method - converts RouteForecast to table rows
	 */
	getRowsData(showApparent: boolean = false, ghostTimestamp: number | null = null): ForecastTableRowData[] {
		// Generate unified timeline
		const timeline = this.generateTimeline(ghostTimestamp);

		if (!timeline.length) {
			return [];
		}

		// Map timeline to forecast points for easier lookup
		const timelineData = timeline.map(timestamp => ({
			timestamp,
			forecastPoint: this.findForecastPointForTimestamp(timestamp)
		}));

		// Calculate waypoint positions only if forecasts
		const waypointDataList = this.routeForecast.pointForecasts ? this.calculateWaypointPositions(timeline, ghostTimestamp) : [];

		// Generate rows - alternate between waypoint and data rows
		const rows: ForecastTableRowData[] = [];

		for (let i = 0; i < timelineData.length; i++) {
			const { timestamp, forecastPoint } = timelineData[i];

			// Check if there's a waypoint at this position
			const waypointData = waypointDataList.find(wp => wp.timestamp === timestamp);

			const isCurrentHour = this.isCurrentHour(timestamp);

			if (waypointData) {
				// Add waypoint row
				rows.push({
					index: i,
					timestamp,
					type: 'waypoint',
					isCurrentHour,
					waypointData: waypointData.data
				});
			}

			// Add data row
			rows.push({
				index: i,
				timestamp,
				type: 'row',
				isCurrentHour,
				cells: this.generateCellsForTimestamp(timestamp, forecastPoint, i, timelineData, showApparent, waypointData?.data)
			});
		}

		console.log(`Generated ${rows.length} rows for forecast table (including ${waypointDataList.length} waypoints)`);

		return rows;
	}

	/**
	 * Generate unified timeline of hourly timestamps
	 */
	private generateTimeline(ghostTimestamp: number | null = null): number[] {
		const timeline: number[] = [];

		if ( ! this.routeForecast.pointForecasts ) {
			// Placeholder timeline: just a few hours from now
			// this.startTime is Date.now() by default
			const nextHour = Math.ceil(this.startTime / (60 * 60 * 1000)) * (60 * 60 * 1000);

			for (let i = 0; i < 24; i++) {
				timeline.push(nextHour + (i * 60 * 60 * 1000));
			}
		} else {
			// we have forecasts

			// Full timeline: departure-6h to arrival+6h
			const sixHours = 6 * 60 * 60 * 1000;
			const twoHours = 2 * 60 * 60 * 1000;

			// if we have a ghost timestamp (during drag) and going near the start of the route, shift the timeline to keep the ghost timestamp visible and centered
			if ( ghostTimestamp !== null ) {
				if ( ghostTimestamp < this.startTime + twoHours ) {
					console.warn('Shifting timeline earlier to keep ghost waypoint visible ', new Date(ghostTimestamp));
					this.startTime = Math.min(this.startTime, ghostTimestamp - twoHours);	// Shift timeline earlier to create more rows to scroll
				}
			} else {
				this.startTime = this.routeForecast.route.departureTime - sixHours;
			}

			const endTime = this.routeForecast.route.arrivalTime + sixHours;

			// Generate hourly timestamps
			const startHour = Math.floor(this.startTime / (60 * 60 * 1000)) * (60 * 60 * 1000);
			const endHour = Math.ceil(endTime / (60 * 60 * 1000)) * (60 * 60 * 1000);

			for (let timestamp = startHour; timestamp <= endHour; timestamp += 60 * 60 * 1000) {
				timeline.push(timestamp);
			}
		}

		return timeline;
	}

	/**
	 * Calculate waypoint positions and return LegWaypointData objects directly
	 */
	private calculateWaypointPositions(timeline: number[], ghostTimestamp: number | null = null): Array<{
		timestamp: number;
		data: LegWaypointData;
	}> {
		if (!timeline.length) return [];

		const waypointDataList: Array<{ timestamp: number; data: LegWaypointData }> = [];

		for ( let i = 0; i < this.routeForecast.route.legs.length; i++ ) {
			const currentLeg = this.routeForecast.route.legs[i];
			const closestTimestamp = this.findClosestTimestamp(timeline, currentLeg.startTime);

			if (closestTimestamp !== -1) {
				waypointDataList.push({
					timestamp: closestTimestamp,
					data: {
						leg: currentLeg,
						isStart: i == 0,
						isLast: false,
						number: i + 1,
						stats: this.routeForecast.legStats && i < this.routeForecast.legStats.length
							? this.routeForecast.legStats[i]
							: null,
						departureTime: this.routeForecast.route.departureTime,
						arrivalTime: this.routeForecast.route.arrivalTime,
						color: this.routeForecast.route.color,
						dropGhost: false
						// Note: onDepartureTimeChange will be connected in ForecastTable
					}
				});
			}
		}

		// Add last waypoints
		const lastWaypointTimestamp = this.findClosestTimestamp(timeline, this.routeForecast.route.arrivalTime);
		if ( lastWaypointTimestamp !== -1 ) {
			waypointDataList.push({
				timestamp: lastWaypointTimestamp,
				data: {
					leg: null,
					isStart: false,
					isLast: true,
					number: this.routeForecast.route.legs.length + 1,
					stats: null,
					departureTime: this.routeForecast.route.departureTime,
					arrivalTime: this.routeForecast.route.arrivalTime,
					color: this.routeForecast.route.color,
					dropGhost: false
					// Note: onDepartureTimeChange will be connected in ForecastTable
				}
			});				
		}

		if (ghostTimestamp !== null) {
			waypointDataList.push({
				timestamp: ghostTimestamp,
				data: {
					leg: this.routeForecast.route.legs[0], // Placeholder leg data for ghost waypoint
					isStart: false,
					isLast: false,
					number: 1,
					stats: null,
					departureTime: ghostTimestamp,
					arrivalTime: this.routeForecast.route.arrivalTime,
					color: this.routeForecast.route.color,
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
		timestamp: number,
		forecastPoint: PointForecast | null,
		index: number,
		timelineData: Array<{ timestamp: number; forecastPoint: PointForecast | null }>,
		showApparent: boolean,
		waypointData?: LegWaypointData
	): ForecastCellData[] {
		const cells: ForecastCellData[] = [];

		// Time cell (no gradient background)
		cells.push({
			type: 'time',
			timestamp,
			forecastTimestamp: forecastPoint?.forecastTimestamp || null
		});

		// Route color cell (no gradient background)
		const isInRoute = !!forecastPoint && 
				this.routeForecast.route.departureTime <= timestamp && 
				timestamp < Math.floor(this.routeForecast.route.arrivalTime / (60 * 60 * 1000)) * (60 * 60 * 1000);

		cells.push({
			type: 'route-color',
			color: isInRoute ? this.routeForecast.route.color : null,
			waypointNumber: null //waypointData?.number || null	// will come in multiple-route version
		});

		// Weather cell (no gradient background)
		cells.push({
			type: 'weather',
			precipitations: forecastPoint?.precipitations,
			weather: forecastPoint?.weather,
			warnings: forecastPoint?.warnings
		});

		// Wind cell (with gradient background)
		const currentWindSpeed = this.getWindSpeed(forecastPoint, showApparent);
		const prevWindSpeed = index > 0 ? this.getWindSpeed(timelineData[index - 1].forecastPoint, showApparent) : null;
		const nextWindSpeed = index < timelineData.length - 1 ? this.getWindSpeed(timelineData[index + 1].forecastPoint, showApparent) : null;
		const windBackground = createGradientBackground(currentWindSpeed, prevWindSpeed, nextWindSpeed, getWindColor);

		const weatherData = showApparent ? forecastPoint?.apparent : forecastPoint?.northUp;
		cells.push({
			type: 'wind',
			windSpeed: weatherData?.windSpeed || null,
			relativeWindDirection: weatherData?.relativeWindDirection || null,
			trueWindDirection: weatherData?.trueWindDirection || null,
			course: forecastPoint?.leg?.course || 0,
			apparent: showApparent,
			backgroundColor: windBackground
		});

		// Gusts cell (with gradient background)
		const currentGustSpeed = this.getGustSpeed(forecastPoint, showApparent);
		const prevGustSpeed = index > 0 ? this.getGustSpeed(timelineData[index - 1].forecastPoint, showApparent) : null;
		const nextGustSpeed = index < timelineData.length - 1 ? this.getGustSpeed(timelineData[index + 1].forecastPoint, showApparent) : null;
		const gustsBackground = createGradientBackground(currentGustSpeed, prevGustSpeed, nextGustSpeed, getWindColor);

		cells.push({
			type: 'wind',
			windSpeed: weatherData?.gustsSpeed || null,
			relativeWindDirection: weatherData?.relativeWindDirection || null,
			trueWindDirection: weatherData?.trueWindDirection || null,
			course: forecastPoint?.leg?.course || 0,
			apparent: showApparent,
			backgroundColor: gustsBackground,
			isGusts: true
		});

		// Waves cell (with gradient background)
		const currentSeaIndex = forecastPoint?.northUp?.wavesIndex || 0;
		const prevSeaIndex = index > 0 ? (timelineData[index - 1].forecastPoint?.northUp?.wavesIndex || 0) : null;
		const nextSeaIndex = index < timelineData.length - 1 ? (timelineData[index + 1].forecastPoint?.northUp?.wavesIndex || 0) : null;


		const wavesBackground = createGradientBackground(currentSeaIndex, prevSeaIndex, nextSeaIndex, getSeaIndexColor);

		const waveWeatherData = showApparent ? forecastPoint?.apparent : forecastPoint?.northUp;
		cells.push({
			type: 'wave',
			wavesHeight: waveWeatherData?.wavesHeight || null,
			wavesPeriod: waveWeatherData?.wavesPeriod || null,
			wavesDirection: waveWeatherData?.wavesDirection || null,
			course: forecastPoint?.leg?.course || 0,
			apparent: showApparent,
			backgroundColor: wavesBackground
		});

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
	private findForecastPointForTimestamp(timestamp: number): PointForecast | null {
		if (!this.routeForecast.pointForecasts || this.routeForecast.pointForecasts.length === 0) {
			return null;
		}

		// Find the forecast point with timestamp closest to our target
		// (This handles the case where forecast timestamps don't exactly match hourly boundaries)
		let closestPoint: PointForecast | null = null;
		let minDiff = Infinity;

		for (const point of this.routeForecast.pointForecasts) {
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