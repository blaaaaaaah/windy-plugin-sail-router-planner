# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**
- Components: PascalCase.svelte (`ForecastTable.svelte`, `MultiRoutePanel.svelte`)
- Services: PascalCase with Service suffix (`WeatherService.ts`, `GPSService.ts`)
- Models: PascalCase (`Route.ts`, `ForecastPoint.ts`, `SailingTypes.ts`)
- Utils: camelCase (`sailingMath.ts`, `timeUtils.ts`, `geoUtils.ts`)

**Functions:**
- camelCase for all functions (`calculateApparentWind`, `formatTime`, `convertKnots`)
- Sailing-specific prefixes: `calculate`, `format`, `convert`, `validate`, `interpolate`
- Boolean functions with `is` or `has` prefix (`isUpwind`, `hasValidGPS`)

**Variables:**
- camelCase for local variables (`windSpeed`, `routeDistance`, `forecastPoint`)
- UPPER_CASE for constants (`DEFAULT_SPEED_KNOTS = 5`, `MAX_ROUTE_LEGS = 15`)
- Sailing terminology: `aws`, `awa`, `tws`, `twd`, `cog`, `sog`, `vmg`

**Types:**
- PascalCase interfaces (`RoutePoint`, `ForecastData`, `SailingCalculation`)
- Domain-specific types: `WindData`, `GPSPosition`, `RouteSegment`, `SafetyWarning`

## Code Style

**Formatting:**
- **CRITICAL**: Use tab indentation (not spaces - this is a project requirement)
- Line length: 100 characters maximum
- Semicolons: Required for all statements
- Quotes: Single quotes for TypeScript strings, double quotes for HTML attributes

**Linting:**
- ESLint with TypeScript support and tab indentation configuration
- Prettier configured for tabs (not spaces)
- Svelte-specific linting rules for component development

**Tab Indentation Standard:**
```typescript
export class RouteCalculator {
	private readonly defaultSpeed = 5; // Tab indentation

	calculateLegTime(distance: number, speed: number): number {
		if (speed <= 0) {
			throw new Error('Speed must be positive');
		}
		return distance / speed; // Tab indentation for all levels
	}

	calculateApparentWind(tws: number, twd: number, boatSpeed: number, cog: number): ApparentWind {
		// Complex sailing calculations with proper tab indentation
		const relativeWindAngle = twd - cog;
		const awsSquared = Math.pow(tws, 2) + Math.pow(boatSpeed, 2) -
			2 * tws * boatSpeed * Math.cos(relativeWindAngle * Math.PI / 180);

		return {
			speed: Math.sqrt(awsSquared),
			angle: this.calculateApparentWindAngle(tws, twd, boatSpeed, cog)
		};
	}
}
```

## Import Organization

**Order:**
1. External libraries (`import L from 'leaflet'`, `import { writable } from 'svelte/store'`)
2. Windy plugin APIs (`import { map, store } from '@windy/interfaces'`)
3. Internal services (`import { WeatherService } from '@services/WeatherService'`)
4. Internal models (`import type { Route } from '@models/Route'`)
5. Utils and helpers (`import { convertKnots, calculateDistance } from '@utils/sailingMath'`)

**Path Aliases:**
- `@/` maps to `src/`
- `@components/` maps to `src/components/`
- `@services/` maps to `src/services/`
- `@models/` maps to `src/models/`
- `@utils/` maps to `src/utils/`
- `@sailing/` maps to `src/sailing/`

**Import Style Example:**
```typescript
// External dependencies
import L from 'leaflet';
import { writable, derived } from 'svelte/store';

// Windy APIs
import { map, store } from '@windy/interfaces';
import { WeatherAPI } from '@windy/weather';

// Internal services
import { WeatherService } from '@services/WeatherService';
import { GPSService } from '@services/GPSService';
import { RouteCalculator } from '@services/RouteCalculator';

// Models and types
import type { Route, RoutePoint } from '@models/Route';
import type { ForecastPoint, WeatherData } from '@models/ForecastPoint';
import type { ApparentWind, SailingMetrics } from '@models/SailingTypes';

// Utils
import { calculateApparentWind, convertKnots } from '@utils/sailingMath';
import { formatTime, parseUserTime } from '@utils/timeUtils';
```

## Error Handling

**Patterns:**
- Try-catch for async operations with graceful fallbacks
- Explicit error types for different failure modes
- User-friendly error messages with technical details in console
- Never crash the plugin - always provide fallback behavior

**Weather Data Errors:**
```typescript
async fetchWeatherData(point: RoutePoint, time: Date): Promise<ForecastPoint> {
	try {
		const forecast = await weatherService.getForecast(point, time);
		return forecast;
	} catch (error) {
		console.warn('Weather data unavailable for point:', point, error);
		return {
			...point,
			time,
			windSpeed: null,
			windDirection: null,
			displayText: '--'
		};
	}
}
```

**GPS Connection Errors:**
```typescript
class GPSService {
	private handleConnectionError(error: Error): void {
		console.warn('GPS connection lost:', error.message);
		this.fallbackToLastKnownPosition();
		this.notifyUI({
			type: 'warning',
			message: 'GPS data unavailable - using last known position'
		});
	}
}
```

## Logging

**Framework:** Browser console with structured logging

**Patterns:**
- `console.error()` for actual errors requiring attention
- `console.warn()` for degraded functionality or fallbacks
- `console.info()` for significant state changes and user actions
- `console.debug()` for detailed debugging (development only)

**Sailing-Specific Logging:**
```typescript
// Route planning operations
console.info('Route calculated:', {
	totalDistance: route.totalDistance,
	estimatedTime: route.estimatedDuration,
	legs: route.legs.length,
	departureTime: route.departureTime.toISOString()
});

// Sailing calculations
console.debug('Apparent wind calculation:', {
	input: { tws: trueWindSpeed, twd: trueWindDirection, boatSpeed, course },
	output: { aws: apparentWindSpeed, awa: apparentWindAngle },
	timestamp: new Date().toISOString()
});

// GPS updates
console.debug('GPS position update:', {
	position: { lat, lon },
	accuracy: gpsAccuracy,
	source: dataSource
});
```

## Comments

**When to Comment:**
- Complex sailing calculations with mathematical formulas
- Windy API usage patterns and platform-specific limitations
- GPS integration quirks and connection handling
- Performance-critical sections with optimization notes
- Sailing domain knowledge for non-sailors

**Sailing Calculations Documentation:**
```typescript
/**
 * Calculate apparent wind from true wind and boat motion using vector addition
 *
 * Apparent wind is what the boat experiences - combination of true wind and wind
 * created by boat's motion through water. Critical for sail trim and course planning.
 *
 * Formula: AWS = sqrt(TWS² + BS² - 2*TWS*BS*cos(relative_wind_angle))
 *
 * @param trueWindSpeed - True wind speed in knots (speed over ground)
 * @param trueWindDirection - True wind direction in degrees (0-360, 0=North)
 * @param boatSpeed - Boat speed through water in knots
 * @param courseOverGround - Boat course in degrees (0-360, 0=North)
 * @returns Object containing apparent wind speed (knots) and angle (degrees relative to bow)
 */
function calculateApparentWind(
	trueWindSpeed: number,
	trueWindDirection: number,
	boatSpeed: number,
	courseOverGround: number
): ApparentWind {
	// Convert to vectors for calculation
	// Implementation...
}
```

**JSDoc/TSDoc Standards:**
- Required for all public APIs and complex calculations
- Include parameter units (knots, degrees, meters, minutes)
- Sailing terminology explanations for non-sailors
- Examples for complex sailing concepts

## Function Design

**Size Guidelines:**
- Maximum 50 lines per function
- Complex sailing calculations broken into smaller, testable helper functions
- Single responsibility principle - each function has one clear purpose

**Parameters:**
- Maximum 4 parameters per function
- Use options objects for complex parameter sets
- Always include units in parameter names (`speedKnots`, `distanceNauticalMiles`, `bearingDegrees`)
- Use TypeScript types to enforce valid ranges where possible

**Return Values:**
- Explicit return types for all functions
- Use Result<T, Error> pattern for operations that can fail
- Sailing calculations return objects with named properties and units

**Sailing-Specific Patterns:**
```typescript
interface RouteCalculationOptions {
	speedKnots: number;
	departureTime: Date;
	safetyMargins: {
		gustThresholdKnots: number;
		waveHeightMeters: number;
		capeIndexThreshold: number;
	};
	updateIntervalMinutes: number;
}

function calculateRouteTimeline(
	route: Route,
	options: RouteCalculationOptions
): Result<ForecastPoint[], RouteError> {
	// Validate inputs
	if (route.legs.length === 0) {
		return { error: new RouteError('Route must have at least one leg') };
	}

	// Implementation with clear sailing terminology and error handling
	return { value: forecastPoints };
}
```

## Module Design

**Exports:**
- Named exports preferred over default exports for better IDE support
- Export interfaces and types alongside implementations
- Group related exports in barrel files for cleaner imports

**Barrel Files Structure:**
```typescript
// src/models/index.ts
export type { Route, RoutePoint, RouteSegment } from './Route';
export type { ForecastPoint, WeatherData, SafetyWarning } from './ForecastPoint';
export type { GPSPosition, GPSSource, ConnectionStatus } from './GPSPosition';
export type { ApparentWind, SailingMetrics, WindAngle } from './SailingTypes';

// src/services/index.ts
export { WeatherService } from './WeatherService';
export { GPSService } from './GPSService';
export { RouteCalculator } from './RouteCalculator';
export { TimelineManager } from './TimelineManager';
```

**Service Pattern:**
```typescript
export class WeatherService {
	private readonly windyAPI: WindyAPI;
	private readonly cache: Map<string, ForecastPoint> = new Map();

	constructor(windyAPI: WindyAPI) {
		this.windyAPI = windyAPI;
	}

	async getForecastForRoute(route: Route): Promise<ForecastPoint[]> {
		// Implementation with error handling and caching
	}

	private generateCacheKey(point: RoutePoint, time: Date): string {
		return `${point.lat},${point.lon}-${time.getTime()}`;
	}
}
```

## Sailing Domain Language

**Consistent Terminology:**
- AWS/AWA: Apparent Wind Speed/Angle (what boat experiences)
- TWS/TWD: True Wind Speed/Direction (actual wind conditions)
- COG/SOG: Course Over Ground/Speed Over Ground (GPS-based)
- COW/SOW: Course Over Water/Speed Over Water (relative to water)
- VMG: Velocity Made Good (speed toward destination)
- Legs: Route segments between waypoints
- Tacks: Port/starboard sailing angles

**Unit Standards:**
- Speeds: knots (nautical miles per hour) - maritime standard
- Distances: nautical miles (1852 meters)
- Angles: degrees (0-360, 0=North, clockwise)
- Wind angles: degrees relative to bow (0=head-on, 90=beam, 180=following)
- Time: UTC timestamps with explicit timezone handling

**Calculation Precision:**
- Wind speeds: 1 decimal place (0.1 knot precision)
- Wind angles: nearest degree (sufficient for sailing decisions)
- Distances: 2 decimal places (0.01 nautical mile ≈ 18 meters)
- Time: minute precision for route planning, second precision for real-time GPS

**Safety and Performance Metrics:**
```typescript
interface SafetyThresholds {
	maxGustKnots: number;        // Dangerous gust threshold
	maxWaveHeightMeters: number; // Uncomfortable wave height
	minWindSpeedKnots: number;   // Below this requires motoring
	capeIndexThreshold: number;  // Heavy weather warning threshold
}

interface SailingPerformance {
	vmgKnots: number;           // Velocity made good toward destination
	tackAngleDegrees: number;   // Optimal upwind sailing angle
	reachingSpeedKnots: number; // Expected speed reaching/beam reach
	motoringRequired: boolean;  // When wind too light for sailing
}
```

---

*Convention analysis: 2026-03-02*