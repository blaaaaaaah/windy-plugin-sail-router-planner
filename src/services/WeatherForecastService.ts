import type { RouteDefinition, RouteLeg, RouteForecast, PointForecast, WeatherData, WindyAPIResponse, LatLng } from '../types';
import { WindyAPI } from './WindyAPI';
import { calculateApparentWind, calculateRelativeDirection, interpolateLatLng } from '../utils/NavigationUtils';

export class WeatherForecastService {
	private static readonly MAX_LEG_DURATION_HOURS = 67; // Maximum hours per API call
	private windyAPI: WindyAPI;

	constructor(windyAPI: WindyAPI) {
		this.windyAPI = windyAPI;
	}

	async getRouteForecast(route: RouteDefinition): Promise<RouteForecast> {
		const legs = route.legs;
		if (legs.length === 0) {
			throw new Error('Route must have at least one leg');
		}

		// Calculate all legs and break long ones into parts
		const allLegParts = this.calculateLegParts(legs);

		// Get forecast for each leg part
		const allPointForecasts: PointForecast[] = [];
		for (const legPart of allLegParts) {
			const legForecast = await this.getLegForecast(legPart);
			allPointForecasts.push(...legForecast);
		}

		// Consolidate all forecasts
		const consolidatedForecasts = this.consolidateLegsForecasts(allPointForecasts);

		return {
			route,
			pointForecasts: consolidatedForecasts
		};
	}

	private calculateLegParts(legs: RouteLeg[]): RouteLeg[] {
		const legParts: RouteLeg[] = [];

		for (const leg of legs) {
			const legDurationHours = (leg.endTime - leg.startTime) / (1000 * 60 * 60);
			const requiredParts = Math.ceil(legDurationHours / WeatherForecastService.MAX_LEG_DURATION_HOURS);

			if (requiredParts === 1) {
				// Leg is short enough, use as is
				legParts.push(leg);
			} else {
				// Break leg into multiple parts
				const partDuration = (leg.endTime - leg.startTime) / requiredParts;
				for (let i = 0; i < requiredParts; i++) {
					const startTime = leg.startTime + (i * partDuration);
					const endTime = leg.startTime + ((i + 1) * partDuration);

					// Calculate intermediate points
					const progress = i / requiredParts;
					const nextProgress = (i + 1) / requiredParts;

					const startPoint = interpolateLatLng(leg.startPoint, leg.endPoint, progress);
					const endPoint = interpolateLatLng(leg.startPoint, leg.endPoint, nextProgress);

					// Calculate distance and course for this part
					const partDistance = leg.distance / requiredParts;

					legParts.push({
						startPoint,
						endPoint,
						startTime,
						endTime,
						distance: partDistance,
						course: leg.course,
						averageSpeed: leg.averageSpeed,
						duration: endTime - startTime
					});
				}
			}
		}

		return legParts;
	}

	private async getLegForecast(leg: RouteLeg): Promise<PointForecast[]> {
		// Call Windy API for this specific leg
		const waypoints = [leg.startPoint, leg.endPoint];
		const apiResponse: WindyAPIResponse = await this.windyAPI.getRoutePlanner(
			leg.startTime,
			leg.endTime,
			waypoints
		);

		// Parse response for this leg (without apparent/relative calculations)
		return this.parseLegForecastResponse(leg, apiResponse);
	}

	private consolidateLegsForecasts(allPointForecasts: PointForecast[]): PointForecast[] {
		console.log(`Consolidating ${allPointForecasts.length} forecasts from all legs`);

		// Group forecasts by hour
		const hourlyGroups = new Map<number, PointForecast[]>();

		for (const forecast of allPointForecasts) {
			const hour = Math.floor(forecast.timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);

			if (!hourlyGroups.has(hour)) {
				hourlyGroups.set(hour, []);
			}
			hourlyGroups.get(hour)!.push(forecast);
		}

		// Consolidate each hour's forecasts
		const consolidatedForecasts: PointForecast[] = [];
		for (const [hour, forecasts] of hourlyGroups) {
			const averaged = this.averagePointForecasts(forecasts);
			averaged.apparent = averaged.northUp ? this.convertToApparent(
				averaged.northUp,
				averaged.leg.averageSpeed,
				averaged.leg.course
			) : null;
			consolidatedForecasts.push(averaged);
		}

		// Sort by timestamp
		const result = consolidatedForecasts.sort((a, b) => a.timestamp - b.timestamp);
		console.log(`Consolidated to ${result.length} hourly forecasts`);
		return result;
	}

	private averagePointForecasts(forecasts: PointForecast[]): PointForecast {
		if (forecasts.length === 0) {
			throw new Error('Cannot average empty forecasts array');
		}

		if (forecasts.length === 1) {
			return forecasts[0];
		}

		// Use the first forecast as template
		const template = forecasts[0];

		// Filter out forecasts with null northUp data
		const validForecasts = forecasts.filter(f => f.northUp !== null);

		// If no valid forecasts, return template with null northUp
		if (validForecasts.length === 0) {
			return {
				...template,
				northUp: null,
				apparent: null
			};
		}

		// Average weather data from valid forecasts only
		const avgWeather: WeatherData = {
			windSpeed: validForecasts.reduce((sum, f) => sum + f.northUp!.windSpeed, 0) / validForecasts.length,
			windDirection: this.averageDirections(validForecasts.map(f => f.northUp!.windDirection)),
			gustsSpeed: validForecasts.reduce((sum, f) => sum + f.northUp!.gustsSpeed, 0) / validForecasts.length,
			gustsDirection: this.averageDirections(validForecasts.map(f => f.northUp!.gustsDirection)),
			currentSpeed: validForecasts.reduce((sum, f) => sum + f.northUp!.currentSpeed, 0) / validForecasts.length,
			currentDirection: this.averageDirections(validForecasts.map(f => f.northUp!.currentDirection)),
			wavesHeight: validForecasts.reduce((sum, f) => sum + f.northUp!.wavesHeight, 0) / validForecasts.length,
			wavesPeriod: validForecasts.reduce((sum, f) => sum + f.northUp!.wavesPeriod, 0) / validForecasts.length,
			wavesDirection: this.averageDirections(validForecasts.map(f => f.northUp!.wavesDirection))
		};

		// Average position
		const avgLat = forecasts.reduce((sum, f) => sum + f.point.lat, 0) / forecasts.length;
		const avgLng = forecasts.reduce((sum, f) => sum + f.point.lng, 0) / forecasts.length;

		// Average bearing
		const avgBearing = this.averageDirections(forecasts.map(f => f.bearing));

		// Average precipitations and weather
		const avgPrecip = forecasts.reduce((sum, f) => sum + f.precipitations, 0) / forecasts.length;
		const avgWeatherCode = Math.round(forecasts.reduce((sum, f) => sum + f.weather, 0) / forecasts.length);

		// Combine warnings
		const allWarnings = forecasts.flatMap(f => f.warnings);
		const uniqueWarnings = Array.from(new Set(allWarnings));

		return {
			point: { lat: avgLat, lng: avgLng },
			timestamp: template.timestamp,
			bearing: avgBearing,
			leg: template.leg,
			warnings: uniqueWarnings,
			northUp: avgWeather,
			apparent: avgWeather, // Will be recalculated in consolidateLegsForecasts TODO : change
			precipitations: avgPrecip,
			weather: avgWeatherCode
		};
	}

	private averageDirections(directions: number[]): number {
		if (directions.length === 0) return 0;
		if (directions.length === 1) return directions[0];

		// Convert to unit vectors, average, then convert back
		const vectors = directions.map(dir => ({
			x: Math.cos(dir * Math.PI / 180),
			y: Math.sin(dir * Math.PI / 180)
		}));

		const avgX = vectors.reduce((sum, v) => sum + v.x, 0) / vectors.length;
		const avgY = vectors.reduce((sum, v) => sum + v.y, 0) / vectors.length;

		let avgDirection = Math.atan2(avgY, avgX) * 180 / Math.PI;
		if (avgDirection < 0) avgDirection += 360;

		return avgDirection;
	}



	private parseLegForecastResponse(leg: RouteLeg, apiResponse: WindyAPIResponse): PointForecast[] {
		const pointForecasts: PointForecast[] = [];

		console.log('Parsing leg API response, checking required fields...');

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

		console.log(`Processing ${arrayLength} forecast points for leg (${(leg.endTime - leg.startTime) / (1000 * 60 * 60).toFixed(1)}h)`);

		// Process each data point in the API response
		// Filter to only include timestamps within the actual leg duration
		for (let i = 0; i < apiResponse.timestamps.length; i++) {
			const timestamp = apiResponse.timestamps[i];

			// Skip forecasts outside the leg time range
			if (timestamp < leg.startTime || timestamp > leg.endTime) {
				continue;
			}
	
			// Interpolate position using distances and leg bounds
			const point = this.interpolateLegPosition(leg, apiResponse.distances[i]);

			// Extract weather data from API response (with null checks)
			// Note: Windy API returns wind/gust speeds in m/s, these are converted to knots in the UI

			// Check if we have valid forecast data for this timestamp
			// If key weather data is null, we have no forecast for this time
			const hasValidData = apiResponse.data.gust[i] !== null && apiResponse.data.waves[i] !== null;

			const northUpWeather: WeatherData | null = hasValidData ? {
				windSpeed: apiResponse.data.wind[i], // m/s from Windy API
				windDirection: apiResponse.data.windDir[i],
				gustsSpeed: apiResponse.data.gust[i], // m/s from Windy API
				gustsDirection: apiResponse.data.windDir[i], // Assume same direction as wind
				currentSpeed: 0, // TODO: API doesn't seem to have current data
				currentDirection: 0,
				wavesHeight: apiResponse.data.waves[i],
				wavesPeriod: apiResponse.data.wavesPeriod[i],
				wavesDirection: apiResponse.data.wavesDir[i]
			} : null;

			// Parse warnings
			const warnings = apiResponse.data.warn[i] ? [apiResponse.data.warn[i] as string] : [];

			const pointForecast: PointForecast = {
				point,
				timestamp,
				bearing: apiResponse.bearings[i],
				leg,
				warnings,
				northUp: northUpWeather,
				apparent: null, // Will be calculated later in consolidation if northUp has data
				precipitations: apiResponse.data.precip[i] || 0,
				weather: apiResponse.data.icon[i] || 0
			};

			pointForecasts.push(pointForecast);
		}

		return pointForecasts;
	}

	private interpolateLegPosition(leg: RouteLeg, distance: number): LatLng {
		// Convert distance from meters to nautical miles to match leg distances
		const distanceNM = distance / 1852;

		// Calculate progress within this leg (0 to 1)
		const legProgress = Math.min(1, Math.max(0, distanceNM / leg.distance));

		// Interpolate position within the leg
		return interpolateLatLng(leg.startPoint, leg.endPoint, legProgress);
	}


	private convertToApparent(northUp: WeatherData, boatSpeed: number, boatCourse: number): WeatherData {
		// Convert boat speed from knots to m/s for apparent wind calculations
		const boatSpeedMs = boatSpeed * 0.514444; // 1 knot = 0.514444 m/s

		// Calculate apparent wind
		const apparentWind = calculateApparentWind(
			northUp.windSpeed,
			northUp.windDirection,
			boatSpeedMs,
			boatCourse
		);

		// Calculate apparent gusts (same calculation with gust speed/direction)
		const apparentGusts = calculateApparentWind(
			northUp.gustsSpeed,
			northUp.gustsDirection,
			boatSpeedMs,
			boatCourse
		);

		return {
			windSpeed: apparentWind.speed,
			windDirection: apparentWind.direction, // Already boat-relative from calculateApparentWind
			gustsSpeed: apparentGusts.speed,
			gustsDirection: apparentGusts.direction, // Already boat-relative from calculateApparentWind
			currentSpeed: northUp.currentSpeed,
			currentDirection: calculateRelativeDirection(northUp.currentDirection, boatCourse),
			wavesHeight: northUp.wavesHeight,
			wavesPeriod: northUp.wavesPeriod,
			wavesDirection: calculateRelativeDirection(northUp.wavesDirection, boatCourse)
		};
	}
}