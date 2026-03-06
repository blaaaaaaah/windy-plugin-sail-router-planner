import type { RouteDefinition, RouteLeg, RouteForecast, PointForecast, WeatherData, WindyAPIResponse, LatLng } from '../types';
import { WindyAPI } from './WindyAPI';
import { calculateApparentWind, calculateRelativeDirection, interpolateLatLng } from '../utils/NavigationUtils';
import { toDateWithHour } from '../utils/TimeUtils';

export class WeatherForecastService {
	private windyAPI: WindyAPI;

	constructor(windyAPI: WindyAPI) {
		this.windyAPI = windyAPI;
	}

	async getRouteForecast(route: RouteDefinition): Promise<RouteForecast> {
		const legs = route.getLegs();
		if (legs.length === 0) {
			throw new Error('Route must have at least one leg');
		}

		// Build API URL
		const url = this.buildAPIUrl(route);
		console.log('Calling API with URL:', url);

		// Call API
		const apiResponse:WindyAPIResponse = await this.windyAPI.get(url);
		console.log('Raw API response structure:', apiResponse);
		console.log('API response keys:', Object.keys(apiResponse));

		// Parse response
		const routeForecast = this.parseRouteForecastResponse(route, apiResponse);

		return routeForecast;
	}

	private buildAPIUrl(route: RouteDefinition): string {
		const legs = route.getLegs();

		// Extract waypoints (start point + each leg's end point)
		const waypoints = [route.getStartPoint()];
		legs.forEach(leg => waypoints.push(leg.endPoint));

		// Convert to coordinate string
		const coordsString = waypoints
			.map(point => `${point.lat},${point.lng}`)
			.join(';');

		// Build time parameters (dst, dst2, dst3, ...)
		const timeParams = this.buildTimeParameters(route);

		// Generate minifest parameter dynamically
		const minifestParam = await this.buildMinifestParameter();

		const unknownParams = {
			pr: '0',
			sc: '124',
			poc: '60'
		};

		const queryString = [
			...timeParams,
			`minifest=${minifestParam}`,
			`pr=${unknownParams.pr}`,
			`sc=${unknownParams.sc}`,
			`poc=${unknownParams.poc}`
		].join('&');

		return `/rplanner/v1/forecast/boat/${coordsString}?${queryString}`;
	}

	private async buildMinifestParameter(): Promise<string> {
		console.log('Building minifest parameter...');

		const W = (window as any).W;
		if (!W || !W.products || !W.products.ecmwf) {
			throw new Error('W.products.ecmwf not available - cannot generate minifest parameter');
		}

		// Load ECMWF manifest and calendar
		const ecmwfMinifest = await W.products.ecmwf.loadMinifest();
		const ecmwfCalendar = await W.products.ecmwf.getCalendar();

		if (!ecmwfMinifest || !ecmwfCalendar) {
			throw new Error('Failed to load ECMWF manifest or calendar');
		}

		console.log('ECMWF manifest:', ecmwfMinifest);
		console.log('ECMWF calendar:', ecmwfCalendar);

		// Build minifest string according to reverse-engineered format
		const start = new Date(ecmwfMinifest.ref).getTime();
		const end = ecmwfCalendar.premiumStart;

		if (!end) {
			throw new Error('ECMWF calendar premiumStart not available');
		}

		const dstAsString = ecmwfMinifest.dst.map((e: any) => e.join(',')).join(';');

		const minifest = `${start};${end};${dstAsString}`;

		console.log('Generated minifest:', minifest);
		return minifest;
	}

	private buildTimeParameters(route: RouteDefinition): string[] {
		const legs = route.getLegs();
		const timeParams: string[] = [];

		// First time parameter is departure time
		const departureTime = new Date(route.getDepartureTime());
		timeParams.push(`dst=${toDateWithHour(departureTime)}`);

		// Additional time parameters for each leg start time
		legs.forEach((leg, index) => {
			if (index > 0) { // Skip first leg as it's the departure time
				const legStartTime = new Date(leg.startTime);
				timeParams.push(`dst${index + 1}=${toDateWithHour(legStartTime)}`);
			}
		});

		return timeParams;
	}


	private parseRouteForecastResponse(route: RouteDefinition, apiResponse: WindyAPIResponse): RouteForecast {
		const legs = route.getLegs();
		const pointForecasts: PointForecast[] = [];

		console.log('Parsing API response, checking required fields...');

		// Safety checks for top-level fields
		const topLevelFields = ['timestamps', 'distances', 'bearings', 'data'];
		const missingTopLevel = topLevelFields.filter(field => !apiResponse[field as keyof WindyAPIResponse]);

		if (missingTopLevel.length > 0) {
			console.error('Missing top-level API response fields:', missingTopLevel);
			console.error('Available top-level fields:', Object.keys(apiResponse));
			throw new Error(`Invalid API response: missing top-level fields: ${missingTopLevel.join(', ')}`);
		}

		// Safety checks for data fields
		const dataFields = [
			'wind', 'windDir', 'gust', 'waves', 'wavesDir',
			'wavesPeriod', 'precip', 'warn', 'icon'
		];
		const missingDataFields = dataFields.filter(field => !apiResponse.data[field as keyof typeof apiResponse.data]);

		if (missingDataFields.length > 0) {
			console.error('Missing data fields:', missingDataFields);
			console.error('Available data fields:', Object.keys(apiResponse.data));
			throw new Error(`Invalid API response: missing data fields: ${missingDataFields.join(', ')}`);
		}

		// Check array lengths match
		const arrayLength = apiResponse.timestamps.length;

		// Check top-level arrays
		const topArrays = [
			{ field: 'timestamps', length: apiResponse.timestamps.length },
			{ field: 'distances', length: apiResponse.distances.length },
			{ field: 'bearings', length: apiResponse.bearings.length }
		];

		// Check data arrays
		const dataArrays = dataFields.map(field => ({
			field,
			length: Array.isArray(apiResponse.data[field as keyof typeof apiResponse.data])
				? (apiResponse.data[field as keyof typeof apiResponse.data] as any[]).length
				: 0
		}));

		const allArrays = [...topArrays, ...dataArrays];
		const mismatchedLengths = allArrays.filter(item => item.length !== arrayLength);

		if (mismatchedLengths.length > 0) {
			console.error('Array length mismatches:', mismatchedLengths);
			throw new Error(`API response array length mismatch. Expected ${arrayLength}, got: ${mismatchedLengths.map(f => `${f.field}:${f.length}`).join(', ')}`);
		}

		console.log(`Processing ${arrayLength} forecast points...`);

		// Process each hour in the API response
		for (let i = 0; i < apiResponse.timestamps.length; i++) {

			// Find which leg this timestamp belongs to
			const timestamp = apiResponse.timestamps[i];
			const currentLeg = this.findLegForTimestamp(legs, timestamp);

			if (!currentLeg) {
				console.warn('Could not find leg for timestamp:', timestamp);
				continue;
			}

			// Interpolate position using distances
			const point = this.interpolatePosition(route, apiResponse.distances[i]);

			// Extract weather data from API response (with null checks)
			const northUpWeather: WeatherData = {
				windSpeed: apiResponse.data.wind[i] || 0,
				windDirection: apiResponse.data.windDir[i] || 0,
				gustsSpeed: apiResponse.data.gust[i] || 0,
				gustsDirection: apiResponse.data.windDir[i] || 0, // Assume same direction as wind
				currentSpeed: 0, // TODO: API doesn't seem to have current data
				currentDirection: 0,
				wavesHeight: apiResponse.data.waves[i] || 0,
				wavesPeriod: apiResponse.data.wavesPeriod[i] || 0,
				wavesDirection: apiResponse.data.wavesDir[i] || 0
			};

			// Calculate apparent wind and relative directions
			const apparentWeather = this.convertToApparent(northUpWeather, currentLeg.averageSpeed, currentLeg.course);

			// Parse warnings
			const warnings = apiResponse.data.warn[i] ? [apiResponse.data.warn[i] as string] : [];

			const pointForecast: PointForecast = {
				point,
				timestamp,
				bearing: apiResponse.bearings[i],
				leg: currentLeg,
				warnings,
				northUp: northUpWeather,
				apparent: apparentWeather,
				precipitations: apiResponse.data.precip[i] || 0,
				weather: apiResponse.data.icon[i] || 0
			};

			pointForecasts.push(pointForecast);
		}

		return {
			route,
			pointForecasts
		};
	}

	private findLegForTimestamp(legs: RouteLeg[], timestamp: number): RouteLeg | null {
		for (const leg of legs) {
			if (timestamp >= leg.startTime && timestamp <= leg.endTime) {
				return leg;
			}
		}
		// If not found in any leg, return the last leg (might be slightly beyond end time)
		return legs[legs.length - 1] || null;
	}

	private interpolatePosition(route: RouteDefinition, distance: number): LatLng {
		const legs = route.getLegs();
		let cumulativeDistance = 0;

		// Convert distance from meters to nautical miles to match leg distances
		const distanceNM = distance / 1852;

		// Find which leg contains this distance
		for (const leg of legs) {
			if (cumulativeDistance + leg.distance >= distanceNM) {
				// Interpolate within this leg
				const legProgress = (distanceNM - cumulativeDistance) / leg.distance;
				return interpolateLatLng(leg.startPoint, leg.endPoint, legProgress);
			}
			cumulativeDistance += leg.distance;
		}

		// If beyond all legs, return the end point of the last leg
		const lastLeg = legs[legs.length - 1];
		return lastLeg ? lastLeg.endPoint : route.getStartPoint();
	}


	private convertToApparent(northUp: WeatherData, boatSpeed: number, boatCourse: number): WeatherData {
		// Calculate apparent wind
		const apparentWind = calculateApparentWind(
			northUp.windSpeed,
			northUp.windDirection,
			boatSpeed,
			boatCourse
		);

		// Calculate apparent gusts (same calculation with gust speed/direction)
		const apparentGusts = calculateApparentWind(
			northUp.gustsSpeed,
			northUp.gustsDirection,
			boatSpeed,
			boatCourse
		);

		return {
			windSpeed: apparentWind.speed,
			windDirection: calculateRelativeDirection(apparentWind.direction, boatCourse),
			gustsSpeed: apparentGusts.speed,
			gustsDirection: calculateRelativeDirection(apparentGusts.direction, boatCourse),
			currentSpeed: northUp.currentSpeed,
			currentDirection: calculateRelativeDirection(northUp.currentDirection, boatCourse),
			wavesHeight: northUp.wavesHeight,
			wavesPeriod: northUp.wavesPeriod,
			wavesDirection: calculateRelativeDirection(northUp.wavesDirection, boatCourse)
		};
	}
}