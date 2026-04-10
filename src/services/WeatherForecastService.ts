import type { RouteDefinition, RouteLeg, RouteForecast, PointForecast, WeatherData, WindyAPIResponse, LatLng, WeatherStats } from '../types';
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

		// Get forecast window to optimize API calls
		const forecastWindow = await this.windyAPI.getForecastWindow();
		const now = Date.now();
		const startPoint = route.waypoints[0];
		const endPoint = route.waypoints[route.waypoints.length - 1];

		const allPointForecasts: PointForecast[] = [];

		
		// 1. PRE-DEPARTURE: Get forecast before route start
		const hourMs = 60 * 60 * 1000;
		const isCurrentDeparture = Math.abs(route.departureTime - now) < hourMs * 6; // If departure is within 6 hour of now

		let preDepartureStartTime: number;
		if (isCurrentDeparture) {
			// Departure is now (default) - get 6 hours of historical data
			preDepartureStartTime = route.departureTime - (6 * hourMs);
		} else {
			// Future departure - get forecast from next full hour until route start
			preDepartureStartTime = Math.ceil(now / hourMs) * hourMs;
		}

		if (isCurrentDeparture || route.departureTime > now) {
			console.log(`\n⏰ Getting pre-departure forecast: ${new Date(preDepartureStartTime).toISOString()} to ${new Date(route.departureTime).toISOString()}`);
			const preDepartureForecast = await this.getPointForecast(startPoint, preDepartureStartTime, route.departureTime);
			allPointForecasts.push(...preDepartureForecast);
		}

		// 2. ROUTE LEGS: Calculate all legs and break long ones into parts
		const allLegParts = this.calculateLegParts(legs, forecastWindow);

		// Get forecast for each leg part
		for (let i = 0; i < allLegParts.length; i++) {
			const legPart = allLegParts[i];
			console.log(`\n🚢 Processing leg part ${i+1}/${allLegParts.length}: ${new Date(legPart.startTime).toISOString()} to ${new Date(legPart.endTime).toISOString()}`);

			const legForecast = await this.getLegForecast(legPart);
			console.log(`📊 Leg part ${i+1} returned ${legForecast.length} forecasts`);

			if (legForecast.length > 0) {
				const firstForecast = legForecast[0];
				const lastForecast = legForecast[legForecast.length - 1];
				console.log(`📅 Forecast range: ${new Date(firstForecast.timestamp).toISOString()} to ${new Date(lastForecast.timestamp).toISOString()}`);
			}

			allPointForecasts.push(...legForecast);
		}

		// 3. POST-ARRIVAL: Get forecast after route end (limited to 6 hours)
		const postArrivalEndTime = Math.min(route.arrivalTime + (6 * hourMs), forecastWindow.end);
		if (route.arrivalTime < postArrivalEndTime) {
			console.log(`\n🏁 Getting post-arrival forecast: ${new Date(route.arrivalTime).toISOString()} to ${new Date(postArrivalEndTime).toISOString()}`);
			const postArrivalForecast = await this.getPointForecast(endPoint, route.arrivalTime, postArrivalEndTime);
			allPointForecasts.push(...postArrivalForecast);
		}

		// 4. ARTIFICIAL POST-ARRIVAL: If we don't have enough post-arrival data, create artificial points
		const postArrivalDataCount = allPointForecasts.filter(f => f.timestamp > route.arrivalTime).length;
		if (postArrivalDataCount < 6) {
			console.log(`\n🔧 Creating ${6 - postArrivalDataCount} artificial post-arrival points`);
			const artificialPoints = this.createArtificialPostArrivalPoints(
				allPointForecasts,
				endPoint,
				route.arrivalTime,
				6 - postArrivalDataCount
			);
			allPointForecasts.push(...artificialPoints);
		}

		// Consolidate all forecasts
		const consolidatedForecasts = this.consolidateLegsForecasts(allPointForecasts);

		// Calculate leg statistics
		const legStats = route.legs.map(leg => this.calculateLegWeatherStats(leg, consolidatedForecasts));

		// Calculate route statistics by averaging leg statistics
		const routeStats = this.calculateRouteWeatherStats(legStats);

		return {
			route,
			pointForecasts: consolidatedForecasts,
			legStats,
			routeStats,
			forecastWindow
		};
	}

	private calculateLegParts(legs: RouteLeg[], forecastWindow: { start: number; end: number }): RouteLeg[] {
		const legParts: RouteLeg[] = [];

		console.log(`Forecast window: ${new Date(forecastWindow.start).toISOString()} to ${new Date(forecastWindow.end).toISOString()}`);

		for (const leg of legs) {
			// Check if this leg is entirely beyond forecast window
			if (leg.startTime > forecastWindow.end) {
				console.log(`Leg starts ${new Date(leg.startTime).toISOString()} beyond forecast window - using as single part`);
				legParts.push(leg);
				continue;
			}

			// Check if this leg extends beyond forecast window
			const legEndTime = Math.min(leg.endTime, forecastWindow.end);
			const withinForecastDuration = (legEndTime - leg.startTime) / (1000 * 60 * 60);

			// Only break up the portion within the forecast window
			const requiredParts = Math.ceil(withinForecastDuration / WeatherForecastService.MAX_LEG_DURATION_HOURS);

			if (requiredParts === 1 || leg.startTime > forecastWindow.end) {
				// Leg is short enough or beyond forecast window, use as is
				legParts.push(leg);
			} else {
				console.log(`Breaking leg into ${requiredParts} parts within forecast window, plus remainder beyond`);

				// Break leg into multiple parts within forecast window
				const partDuration = (legEndTime - leg.startTime) / requiredParts;
				for (let i = 0; i < requiredParts; i++) {
					const startTime = leg.startTime + (i * partDuration);
					const endTime = leg.startTime + ((i + 1) * partDuration);

					// Calculate intermediate points
					const totalLegProgress = (startTime - leg.startTime) / (leg.endTime - leg.startTime);
					const nextTotalLegProgress = (endTime - leg.startTime) / (leg.endTime - leg.startTime);

					const startPoint = interpolateLatLng(leg.startPoint, leg.endPoint, totalLegProgress);
					const endPoint = interpolateLatLng(leg.startPoint, leg.endPoint, nextTotalLegProgress);

					// Calculate distance for this part
					const partDistance = leg.distance * (nextTotalLegProgress - totalLegProgress);

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

				// Add remainder beyond forecast window as single part if it exists
				if (leg.endTime > forecastWindow.end) {
					const remainderStart = forecastWindow.end;
					const totalLegProgressStart = (remainderStart - leg.startTime) / (leg.endTime - leg.startTime);
					const startPoint = interpolateLatLng(leg.startPoint, leg.endPoint, totalLegProgressStart);
					const remainderDistance = leg.distance * (1 - totalLegProgressStart);

					console.log(`Adding remainder beyond forecast window: ${new Date(remainderStart).toISOString()} to ${new Date(leg.endTime).toISOString()}`);

					legParts.push({
						startPoint: startPoint,
						endPoint: leg.endPoint,
						startTime: remainderStart,
						endTime: leg.endTime,
						distance: remainderDistance,
						course: leg.course,
						averageSpeed: leg.averageSpeed,
						duration: leg.endTime - remainderStart
					});
				}
			}
		}

		console.log(`Calculated ${legParts.length} leg parts from ${legs.length} original legs`);
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
			// If multiple forecasts for the same hour, average them
			// This happens when we cover a distance range that spans multiple API data points
			let consolidatedForecast: PointForecast;

			if (forecasts.length === 1) {
				consolidatedForecast = forecasts[0];
			} else {
				// Average multiple forecasts for this hour
				consolidatedForecast = this.averagePointForecasts(forecasts);
			}

			// Calculate apparent wind if we have valid north-up data
			if (consolidatedForecast.northUp && consolidatedForecast.leg) {
				// For moving legs, calculate apparent wind based on boat motion
				consolidatedForecast.apparent = this.convertToApparent(
					consolidatedForecast.northUp,
					consolidatedForecast.leg.averageSpeed,
					consolidatedForecast.leg.course
				);
			} else if (consolidatedForecast.northUp && !consolidatedForecast.leg) {
				// For stationary points (pre-departure, post-arrival), create apparent wind with boat at anchor
				consolidatedForecast.apparent = {
					windSpeed: consolidatedForecast.northUp.windSpeed, // Same speed as true wind
					relativeWindDirection: 0, // Always from bow (0°) for anchored boat
					trueWindDirection: consolidatedForecast.northUp.trueWindDirection, // Keep true direction
					gustsSpeed: consolidatedForecast.northUp.gustsSpeed, // Same speed as true gusts
					currentSpeed: consolidatedForecast.northUp.currentSpeed,
					currentDirection: 0, // Current relative to bow
					wavesHeight: consolidatedForecast.northUp.wavesHeight,
					wavesPeriod: consolidatedForecast.northUp.wavesPeriod,
					wavesDirection: 0 // Waves relative to bow
				};
			} else {
				consolidatedForecast.apparent = null;
			}

			consolidatedForecasts.push(consolidatedForecast);
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
			relativeWindDirection: this.averageDirections(validForecasts.map(f => f.northUp!.relativeWindDirection)),
			trueWindDirection: this.averageDirections(validForecasts.map(f => f.northUp!.trueWindDirection)),
			gustsSpeed: validForecasts.reduce((sum, f) => sum + f.northUp!.gustsSpeed, 0) / validForecasts.length,
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
			forecastTimestamp: template.forecastTimestamp, // Keep original API timestamp for staleness detection
			bearing: avgBearing,
			leg: template.leg,
			warnings: uniqueWarnings,
			northUp: avgWeather,
			apparent: null, // Will be recalculated in consolidateLegsForecasts
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



	private validateAPIResponseStructure(apiResponse: WindyAPIResponse): void {
		console.log('Validating API response structure...');

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

		console.log(`API response validation passed - ${arrayLength} data points`);
	}

	private parseLegForecastResponse(leg: RouteLeg, apiResponse: WindyAPIResponse): PointForecast[] {
		// Validate API response structure
		this.validateAPIResponseStructure(apiResponse);

		const arrayLength = apiResponse.timestamps.length;
		console.log(`Processing ${arrayLength} forecast points for leg (${((leg.endTime - leg.startTime) / (1000 * 60 * 60)).toFixed(1)}h)`);

		// Distance-based matching function for regular legs
		const distanceMatchingFn = (sailingTime: number, hourMs: number) => {
			const hourStartDistance = this.getDistanceFromTimeRelativeToLeg(leg, sailingTime);
			const hourEndDistance = this.getDistanceFromTimeRelativeToLeg(leg, Math.min(sailingTime + hourMs, leg.endTime));
			let matchingIndexes = this.getIndexesMatchingDistances(apiResponse.distances, hourStartDistance, hourEndDistance);

			// If no exact matches, find the closest by distance
			if (matchingIndexes.length === 0) {
				const midDistance = (hourStartDistance + hourEndDistance) / 2;
				let closestIndex = 0;
				let closestDiff = Math.abs(apiResponse.distances[0] - midDistance);

				for (let i = 1; i < apiResponse.distances.length; i++) {
					const diff = Math.abs(apiResponse.distances[i] - midDistance);
					if (diff < closestDiff) {
						closestDiff = diff;
						closestIndex = i;
					}
				}

				matchingIndexes = [closestIndex];
				//console.log(`Distance range: ${(hourStartDistance/1852).toFixed(1)}nm to ${(hourEndDistance/1852).toFixed(1)}nm`);
				//console.log(`No exact matches - using closest: index ${closestIndex} at ${(apiResponse.distances[closestIndex]/1852).toFixed(1)}nm (${(closestDiff/1852).toFixed(1)}nm off)`);
			}

			return matchingIndexes;
		};

		// Use shared hourly processing logic with distance matching
		return this.processHourlyForecastsFromAPI(leg, apiResponse, distanceMatchingFn);
	}

	/**
	 * Shared logic to process API response into hourly forecasts
	 * Used by both regular legs and point forecasts
	 */
	private processHourlyForecastsFromAPI(
		leg: RouteLeg,
		apiResponse: WindyAPIResponse,
		matchingFn: (sailingTime: number, hourMs: number) => number[]
	): PointForecast[] {
		const pointForecasts: PointForecast[] = [];

		// Generate hourly forecasts aligned to clock hours (XX:00), not leg boundaries
		const hourMs = 60 * 60 * 1000;
		console.log(`🕐 Leg time range: ${new Date(leg.startTime).toISOString()} to ${new Date(leg.endTime).toISOString()}`);

		// Start from the first full hour within or after leg start
		const firstHourInLeg = Math.ceil(leg.startTime / hourMs) * hourMs;
		// End at the last full hour within or before leg end
		const lastHourInLeg = Math.floor(leg.endTime / hourMs) * hourMs;

		console.log(`🕐 Aligned hourly range: ${new Date(firstHourInLeg).toISOString()} to ${new Date(lastHourInLeg).toISOString()}`);

		for (let sailingTime = firstHourInLeg; sailingTime <= lastHourInLeg; sailingTime += hourMs) {
			// Use the provided matching function to find relevant API data
			let matchingIndexes = matchingFn(sailingTime, hourMs);

			// Debug logging
			const sailingTimeStr = new Date(sailingTime).toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				hour12: false
			});
			//console.log(`\n=== Consolidation for ${sailingTimeStr} (${new Date(sailingTime).toISOString()}) ===`);
			//console.log(`Found ${matchingIndexes.length} matching API data points:`, matchingIndexes);

			/*
			if (matchingIndexes.length > 0) {
				const forecastTimes = matchingIndexes.map(i => {
					const time = new Date(apiResponse.timestamps[i]).toLocaleString('en-US', {
						month: 'short',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit',
						hour12: false
					});
					return `${i}: ${time} (${(apiResponse.distances[i]/1852).toFixed(1)}nm)`;
				});
				//console.log(`API forecasts selected:`, forecastTimes);
			}
			*/

			if (matchingIndexes.length === 0) {
				// No API data for this hour, create empty forecast
				console.log(`⚠️  NO FORECAST DATA for ${sailingTimeStr}`);

				const position = this.interpolateLegPositionByTime(leg, sailingTime);
				pointForecasts.push({
					point: position,
					timestamp: sailingTime, // Sailing hour timestamp (local time)
					forecastTimestamp: sailingTime, // No actual forecast data, use sailing time
					bearing: leg.course,
					leg,
					warnings: [],
					northUp: null,
					apparent: null,
					precipitations: 0,
					weather: 2 // default weather code
				});
				continue;
			}

			// Create a forecast for each matching API data point
			// These will be averaged later in consolidation if multiple exist for the same hour
			for (const i of matchingIndexes) {
				// Interpolate position based on sailing time (not API distance)
				const point = this.interpolateLegPositionByTime(leg, sailingTime);

				// Check if we have valid forecast data (invalid only if BOTH gusts and waves are null)
				const hasValidData = apiResponse.data.gust[i] !== null || apiResponse.data.waves[i] !== null;

				if (!hasValidData) {
					console.log(`⚠️  Index ${i} has null weather data: wind=${apiResponse.data.wind[i]}, gust=${apiResponse.data.gust[i]}, waves=${apiResponse.data.waves[i]}`);
				}

				const northUpWeather: WeatherData | null = hasValidData ? {
					windSpeed: apiResponse.data.wind[i], // m/s from Windy API
					relativeWindDirection: calculateRelativeDirection(apiResponse.data.windDir[i], leg.course),
					trueWindDirection: apiResponse.data.windDir[i], // True wind direction from API
					gustsSpeed: apiResponse.data.gust[i], // m/s from Windy API
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
					timestamp: sailingTime, // Sailing hour timestamp (local time)
					forecastTimestamp: apiResponse.timestamps[i], // API timestamp
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
		}

		return pointForecasts;
	}


	private getDistanceFromTimeRelativeToLeg(leg: RouteLeg, timestamp: number): number {
		// Calculate distance relative to leg start time (for API calls that start from leg beginning)
		const timeElapsedSinceLegStart = timestamp - leg.startTime;
		const timeElapsedHours = timeElapsedSinceLegStart / (1000 * 60 * 60);
		const distanceCovered = timeElapsedHours * leg.averageSpeed; // nautical miles
		return distanceCovered * 1852; // convert to meters to match API distances (starting from 0 for this leg)
	}

	private getIndexesMatchingDistances(apiDistances: number[], startDistance: number, endDistance: number): number[] {
		const indexes: number[] = [];
		for (let i = 0; i < apiDistances.length; i++) {
			const distance = apiDistances[i];
			if (distance >= startDistance && distance <= endDistance) {
				indexes.push(i);
			}
		}
		return indexes;
	}


	private interpolateLegPositionByTime(leg: RouteLeg, timestamp: number): LatLng {
		// Calculate progress through the leg based on time
		const timeElapsed = timestamp - leg.startTime;
		const totalTime = leg.endTime - leg.startTime;
		const progress = Math.min(1, Math.max(0, timeElapsed / totalTime));

		// Interpolate position based on progress
		return interpolateLatLng(leg.startPoint, leg.endPoint, progress);
	}



	private convertToApparent(northUp: WeatherData, boatSpeed: number, boatCourse: number): WeatherData {
		// Convert boat speed from knots to m/s for apparent wind calculations
		const boatSpeedMs = boatSpeed * 0.514444; // 1 knot = 0.514444 m/s

		// Calculate apparent wind
		const apparentWind = calculateApparentWind(
			northUp.windSpeed,
			northUp.trueWindDirection,
			boatSpeedMs,
			boatCourse
		);

		// Calculate apparent gusts (same calculation with gust speed using wind direction)
		const apparentGusts = calculateApparentWind(
			northUp.gustsSpeed,
			northUp.trueWindDirection, // Gusts use same direction as wind
			boatSpeedMs,
			boatCourse
		);

		return {
			windSpeed: apparentWind.speed,
			relativeWindDirection: apparentWind.direction, // Already boat-relative from calculateApparentWind
			trueWindDirection: northUp.trueWindDirection, // Keep true wind direction
			gustsSpeed: apparentGusts.speed,
			currentSpeed: northUp.currentSpeed,
			currentDirection: calculateRelativeDirection(northUp.currentDirection, boatCourse),
			wavesHeight: northUp.wavesHeight,
			wavesPeriod: northUp.wavesPeriod,
			wavesDirection: calculateRelativeDirection(northUp.wavesDirection, boatCourse)
		};
	}

	/**
	 * Get forecast for a single point (stationary) over a time period
	 * Creates a fake leg where start and end are the same point
	 */
	async getPointForecast(point: LatLng, startTime: number, endTime: number): Promise<PointForecast[]> {
		console.log(`🎯 Getting point forecast for ${point.lat},${point.lng} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

		try {
			// Create fake leg with slightly offset end point (Windy API doesn't like identical start/end)
			const L = (window as any).L;
			const startPoint = point;
			const endPoint = new L.LatLng(point.lat + 0.01, point.lng + 0.01);
			const waypoints = [startPoint, endPoint];

			// Call route planner API with dst and dst2 parameters
			const apiResponse = await this.windyAPI.getRoutePlanner(startTime, endTime, waypoints);

			// Validate API response structure
			this.validateAPIResponseStructure(apiResponse);

			// Convert API response to PointForecast array - aligned to hourly timestamps
			const pointForecasts: PointForecast[] = [];
			const hourMs = 60 * 60 * 1000;

			// Process hourly forecasts aligned to clock hours
			const firstHour = Math.floor(startTime / hourMs) * hourMs;
			const lastHour = Math.floor(endTime / hourMs) * hourMs;

			for (let sailingTime = firstHour; sailingTime < lastHour; sailingTime += hourMs) {
				// Find closest API timestamp to this hour
				let closestIndex = 0;
				let closestDiff = Math.abs(apiResponse.timestamps[0] - sailingTime);

				for (let i = 1; i < apiResponse.timestamps.length; i++) {
					const diff = Math.abs(apiResponse.timestamps[i] - sailingTime);
					if (diff < closestDiff) {
						closestDiff = diff;
						closestIndex = i;
					}
				}

				// Check if we have valid forecast data
				const hasValidData = apiResponse.data.gust[closestIndex] !== null || apiResponse.data.waves[closestIndex] !== null;

				const northUpWeather: WeatherData | null = hasValidData ? {
					windSpeed: apiResponse.data.wind[closestIndex],
					relativeWindDirection: 0, // For stationary points, wind direction is relative to north (no boat movement)
					trueWindDirection: apiResponse.data.windDir[closestIndex], // True wind direction from API
					gustsSpeed: apiResponse.data.gust[closestIndex],
					currentSpeed: 0, // Not typically available in route planner API
					currentDirection: 0,
					wavesHeight: apiResponse.data.waves[closestIndex],
					wavesPeriod: apiResponse.data.wavesPeriod[closestIndex],
					wavesDirection: apiResponse.data.wavesDir[closestIndex]
				} : null;

				const pointForecast: PointForecast = {
					point, // Always the same point for stationary forecast
					timestamp: sailingTime, // Use aligned hour timestamp
					forecastTimestamp: apiResponse.timestamps[closestIndex],
					bearing: 0, // No bearing for stationary points
					leg: null, // No leg reference for point forecasts
					warnings: apiResponse.data.warn[closestIndex] ? [apiResponse.data.warn[closestIndex] as string] : [],
					northUp: northUpWeather,
					apparent: null, // Will be calculated in consolidation
					precipitations: apiResponse.data.precip[closestIndex] || 0,
					weather: apiResponse.data.icon[closestIndex] || 0
				};

				pointForecasts.push(pointForecast);
			}

			console.log(`📍 Point forecast returned ${pointForecasts.length} hourly forecasts`);
			return pointForecasts;

		} catch (error) {
			console.error('Point forecast error:', error);
			throw error;
		}
	}

	/**
	 * Create artificial post-arrival forecast points using the last available forecast data
	 */
	private createArtificialPostArrivalPoints(
		allForecasts: PointForecast[],
		endPoint: LatLng,
		arrivalTime: number,
		count: number
	): PointForecast[] {
		// Find the last forecast point with actual weather data
		const lastForecastWithData = allForecasts
			.filter(f => f.northUp !== null)
			.sort((a, b) => a.timestamp - b.timestamp)
			.pop();

		if (!lastForecastWithData) {
			console.warn('No forecast data available to create artificial points');
			return [];
		}

		console.log(`Creating ${count} artificial points using last forecast data from ${new Date(lastForecastWithData.timestamp).toISOString()}`);

		const artificialPoints: PointForecast[] = [];
		const hourMs = 60 * 60 * 1000;

		for (let i = 1; i <= count; i++) {
			const timestamp = arrivalTime + (i * hourMs);

			const artificialPoint: PointForecast = {
				point: endPoint, // At the destination
				timestamp,
				forecastTimestamp: lastForecastWithData.forecastTimestamp, // Use same forecast timestamp
				bearing: 0, // No bearing for stationary points
				leg: null, // No leg reference
				warnings: [], // No warnings for artificial points
				northUp: { ...lastForecastWithData.northUp! }, // Copy the weather data
				apparent: null, // No apparent wind for stationary points
				precipitations: lastForecastWithData.precipitations,
				weather: lastForecastWithData.weather
			};

			artificialPoints.push(artificialPoint);
		}

		return artificialPoints;
	}

	/**
	 * Calculate weather statistics for a leg from forecast data
	 */
	calculateLegWeatherStats(leg: RouteLeg, forecastPoints: PointForecast[]): WeatherStats | null {
		// Filter forecast points that fall within this leg's timeframe
		const legForecasts = forecastPoints.filter(point =>
			point.timestamp >= leg.startTime &&
			point.timestamp <= leg.endTime &&
			point.northUp !== null
		);

		if (legForecasts.length === 0) {
			// No forecast data for this leg, return null
			return null;
		}

		// Extract wind speeds
		const windSpeeds = legForecasts.map(f => f.northUp!.windSpeed);
		const gustSpeeds = legForecasts.map(f => f.northUp!.gustsSpeed);

		// Extract wave data (heights in meters, periods in seconds)
		const waveHeights = legForecasts.map(f => f.northUp!.wavesHeight);
		const wavePeriods = legForecasts.map(f => f.northUp!.wavesPeriod);

		// Calculate wind angle statistics
		const windAngles = legForecasts.map(f => {
			// Calculate the angle between wind direction and boat course
			const windDirection = f.northUp!.trueWindDirection;
			const boatCourse = leg.course;

			// Calculate relative wind angle (0-180 degrees)
			let relativeAngle = Math.abs(windDirection - boatCourse);
			if (relativeAngle > 180) {
				relativeAngle = 360 - relativeAngle;
			}

			return relativeAngle;
		});

		// Classify each forecast point
		let upwindCount = 0;
		let reachingCount = 0;
		let downwindCount = 0;

		windAngles.forEach(angle => {
			if (angle < 60) {
				upwindCount++;
			} else if (angle <= 120) {
				reachingCount++;
			} else {
				downwindCount++;
			}
		});

		const totalCount = windAngles.length;
		const percentUpwind = (upwindCount / totalCount) * 100;
		const percentReaching = (reachingCount / totalCount) * 100;
		const percentDownwind = (downwindCount / totalCount) * 100;

		return {
			minWindSpeed: Math.min(...windSpeeds),
			avgWindSpeed: windSpeeds.reduce((sum, speed) => sum + speed, 0) / windSpeeds.length,
			maxWindSpeed: Math.max(...windSpeeds),
			minGust: Math.min(...gustSpeeds),
			avgGust: gustSpeeds.reduce((sum, speed) => sum + speed, 0) / gustSpeeds.length,
			maxGust: Math.max(...gustSpeeds),
			minWaveHeight: Math.min(...waveHeights),
			avgWaveHeight: waveHeights.reduce((sum, height) => sum + height, 0) / waveHeights.length,
			maxWaveHeight: Math.max(...waveHeights),
			minWavePeriod: Math.min(...wavePeriods),
			avgWavePeriod: wavePeriods.reduce((sum, period) => sum + period, 0) / wavePeriods.length,
			maxWavePeriod: Math.max(...wavePeriods),
			percentUpwind,
			percentReaching,
			percentDownwind
		};
	}

	/**
	 * Calculate route weather statistics by averaging all leg statistics
	 */
	calculateRouteWeatherStats(legStats: (WeatherStats | null)[]): WeatherStats | null {
		// Filter out null leg stats
		const validLegStats = legStats.filter((stats): stats is WeatherStats => stats !== null);

		if (validLegStats.length === 0) {
			return null;
		}

		// Calculate averages for each metric
		const count = validLegStats.length;

		return {
			minWindSpeed: validLegStats.reduce((sum, stats) => sum + stats.minWindSpeed, 0) / count,
			avgWindSpeed: validLegStats.reduce((sum, stats) => sum + stats.avgWindSpeed, 0) / count,
			maxWindSpeed: validLegStats.reduce((sum, stats) => sum + stats.maxWindSpeed, 0) / count,
			minGust: validLegStats.reduce((sum, stats) => sum + stats.minGust, 0) / count,
			avgGust: validLegStats.reduce((sum, stats) => sum + stats.avgGust, 0) / count,
			maxGust: validLegStats.reduce((sum, stats) => sum + stats.maxGust, 0) / count,
			minWaveHeight: validLegStats.reduce((sum, stats) => sum + stats.minWaveHeight, 0) / count,
			avgWaveHeight: validLegStats.reduce((sum, stats) => sum + stats.avgWaveHeight, 0) / count,
			maxWaveHeight: validLegStats.reduce((sum, stats) => sum + stats.maxWaveHeight, 0) / count,
			minWavePeriod: validLegStats.reduce((sum, stats) => sum + stats.minWavePeriod, 0) / count,
			avgWavePeriod: validLegStats.reduce((sum, stats) => sum + stats.avgWavePeriod, 0) / count,
			maxWavePeriod: validLegStats.reduce((sum, stats) => sum + stats.maxWavePeriod, 0) / count,
			percentUpwind: validLegStats.reduce((sum, stats) => sum + stats.percentUpwind, 0) / count,
			percentReaching: validLegStats.reduce((sum, stats) => sum + stats.percentReaching, 0) / count,
			percentDownwind: validLegStats.reduce((sum, stats) => sum + stats.percentDownwind, 0) / count
		};
	}

	async getRouteName(route: RouteDefinition): Promise<string | null> {
		if (!route.waypoints || route.waypoints.length < 2) {
			return null;
		}

		try {
			const firstPoint = route.waypoints[0];
			const lastPoint = route.waypoints[route.waypoints.length - 1];

			// Get reverse names for both points in parallel
			const [departureResult, arrivalResult] = await Promise.all([
				this.windyAPI.getReverseName(firstPoint),
				this.windyAPI.getReverseName(lastPoint)
			]);

			// Extract names, fallback to '...' if not available
			const departureName = departureResult?.name || departureResult?.region || '...';
			const arrivalName = arrivalResult?.name || arrivalResult?.region || '...';

			return `${departureName} → ${arrivalName}`;
		} catch (error) {
			console.error('Error getting route name:', error);
			return null;
		}
	}
}