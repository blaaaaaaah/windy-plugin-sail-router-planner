# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:**
- Vitest (recommended for Svelte/TypeScript projects)
- Jest (alternative if Windy plugin requires specific setup)
- Config: `vitest.config.ts` or `jest.config.js`

**Assertion Library:**
- Vitest built-in assertions (expect API)
- @testing-library/svelte for component testing

**Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:ui       # Vitest UI mode
```

## Test File Organization

**Location:**
- **SEPARATE directories**: Test files in dedicated `tests/` directory structure
- **Mirror structure**: `tests/` directory exactly matches `src/` directory layout
- **NOT co-located**: Test files are never placed alongside source files

**Naming:**
- `*.test.ts` for unit tests
- `*.integration.test.ts` for integration tests
- `*.spec.ts` for component specifications

**Structure (Separate Test Directories):**
```
src/
├── services/
│   ├── WeatherService.ts
│   ├── RouteCalculator.ts
│   └── GPSService.ts
├── components/
│   ├── ForecastTable.svelte
│   ├── RouteEditor.svelte
│   └── TimeSlider.svelte
├── utils/
│   ├── sailingMath.ts
│   ├── timeUtils.ts
│   └── geoUtils.ts
└── models/
    ├── Route.ts
    └── ForecastPoint.ts

tests/
├── services/
│   ├── WeatherService.test.ts
│   ├── RouteCalculator.test.ts
│   └── GPSService.test.ts
├── components/
│   ├── ForecastTable.test.ts
│   ├── RouteEditor.test.ts
│   └── TimeSlider.test.ts
├── utils/
│   ├── sailingMath.test.ts
│   ├── timeUtils.test.ts
│   └── geoUtils.test.ts
├── models/
│   ├── Route.test.ts
│   └── ForecastPoint.test.ts
├── integration/
│   ├── route-planning.integration.test.ts
│   ├── gps-integration.integration.test.ts
│   └── weather-forecast.integration.test.ts
├── fixtures/
│   ├── sailing.ts
│   ├── routes.ts
│   └── weather.ts
└── helpers/
    ├── test-utils.ts
    ├── mocks.ts
    └── factories.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeatherService } from '../../src/services/WeatherService';
import type { Route } from '../../src/models/Route';

describe('WeatherService', () => {
	let weatherService: WeatherService;
	let mockWindyAPI: any;

	beforeEach(() => {
		mockWindyAPI = createMockWindyAPI();
		weatherService = new WeatherService(mockWindyAPI);
	});

	describe('getForecastForRoute', () => {
		it('should calculate forecast points for complete route', async () => {
			// Test implementation
		});

		it('should handle missing weather data gracefully', async () => {
			// Test error handling
		});
	});
});
```

**Patterns:**
- Setup: `beforeEach` for test isolation
- Teardown: `afterEach` for cleanup if needed
- Assertions: Specific to sailing calculations and domain logic
- Path imports: Relative imports from `tests/` to `src/` directory

## Mocking

**Framework:** Vitest vi.mock() or Jest jest.mock()

**Mock Organization:**
```typescript
// tests/helpers/mocks.ts
export const mockWindyAPI = {
	getWeatherData: vi.fn(),
	setMapPosition: vi.fn(),
	switchLayer: vi.fn()
};

export const mockGPSService = {
	getCurrentPosition: vi.fn(),
	subscribe: vi.fn(),
	unsubscribe: vi.fn()
};

// tests/fixtures/weather.ts
export const mockWeatherData = {
	windSpeed: 15,
	windDirection: 270,
	gustSpeed: 20,
	waveHeight: 1.5,
	current: { speed: 1, direction: 90 }
};

// tests/fixtures/routes.ts
export const mockRoute = {
	points: [
		{ lat: 50.0, lng: -5.0 },
		{ lat: 50.1, lng: -4.9 }
	],
	legs: [
		{ distance: 5.2, speedKnots: 6 }
	]
};
```

**What to Mock:**
- External APIs (Windy weather data, GPS sources)
- Browser APIs (localStorage, geolocation)
- Time-dependent functions (Date.now, timers)
- Network requests

**What NOT to Mock:**
- Sailing calculation functions (test real math)
- Pure utility functions
- Domain models and data structures
- Simple data transformations

## Fixtures and Factories

**Test Data Location:**
- `tests/fixtures/sailing.ts` - Core sailing test data
- `tests/fixtures/routes.ts` - Route definitions and examples
- `tests/fixtures/weather.ts` - Weather conditions and forecasts
- `tests/helpers/factories.ts` - Factory functions for data generation

**Test Data:**
```typescript
// tests/fixtures/sailing.ts
export const testRoutes = {
	shortCoastal: {
		points: [
			{ lat: 50.7753, lng: -1.0778 }, // Portsmouth
			{ lat: 50.7048, lng: -1.2879 }  // Cowes
		],
		distance: 8.5,
		estimatedTime: 1.5
	},

	longOffshore: {
		points: [
			{ lat: 50.7753, lng: -1.0778 }, // Portsmouth
			{ lat: 49.1734, lng: -2.3686 }  // Guernsey
		],
		distance: 87,
		estimatedTime: 16
	}
};

export const testWeatherConditions = {
	lightWind: {
		trueWindSpeed: 8,
		direction: 180,
		gustSpeed: 12
	},

	strongWind: {
		trueWindSpeed: 25,
		direction: 270,
		gustSpeed: 35
	},

	calmConditions: {
		trueWindSpeed: 3,
		direction: 90,
		gustSpeed: 5
	}
};

// tests/helpers/factories.ts
export function createTestRoute(overrides?: Partial<Route>): Route {
	return {
		id: 'test-route-1',
		name: 'Test Route',
		points: testRoutes.shortCoastal.points,
		legs: [{ speedKnots: 5, distance: 8.5 }],
		createdAt: new Date('2026-03-02T10:00:00Z'),
		...overrides
	};
}
```

## Coverage

**Requirements:** 80% minimum coverage for critical sailing calculations

**View Coverage:**
```bash
npm run test:coverage
open coverage/index.html
```

**Critical Areas (100% coverage required):**
- `src/utils/sailingMath.ts` - Apparent wind calculations
- `src/services/RouteCalculator.ts` - Route timing logic
- `src/models/Route.ts` - Route validation

## Test Types

**Unit Tests:**
- Individual functions and classes in isolation
- Sailing mathematics and calculations
- Data model validation and transformations
- Service layer business logic

**Integration Tests:**
- Component interaction with services
- GPS data processing pipeline
- Weather data fetching and processing
- Route calculation end-to-end flows

**Component Tests:**
```typescript
// tests/components/ForecastTable.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import ForecastTable from '../../src/components/ForecastTable.svelte';
import { createTestRoute } from '../helpers/factories';

describe('ForecastTable', () => {
	it('displays forecast data for route', () => {
		const route = createTestRoute();
		const { getByText } = render(ForecastTable, {
			props: { route, forecastData: mockForecastPoints }
		});

		expect(getByText('Wind Speed')).toBeInTheDocument();
		expect(getByText('15 kts')).toBeInTheDocument();
	});

	it('handles time scrubbing interaction', async () => {
		const route = createTestRoute();
		const onTimeChange = vi.fn();

		const { container } = render(ForecastTable, {
			props: { route, onTimeChange }
		});

		const timeSlider = container.querySelector('.time-slider');
		await fireEvent.input(timeSlider, { target: { value: '12' } });

		expect(onTimeChange).toHaveBeenCalledWith(12);
	});
});
```

**E2E Tests:**
- Deferred to future version
- Would test complete user workflows in browser

## Common Patterns

**Async Testing:**
```typescript
// tests/services/WeatherService.test.ts
import { WeatherService } from '../../src/services/WeatherService';

describe('Weather data fetching', () => {
	it('should fetch forecast for route timeline', async () => {
		const route = createTestRoute();
		mockWindyAPI.getWeatherData.mockResolvedValue(mockWeatherData);

		const forecast = await weatherService.getForecastForRoute(route);

		expect(forecast).toHaveLength(route.estimatedDuration);
		expect(mockWindyAPI.getWeatherData).toHaveBeenCalledTimes(route.legs.length);
	});
});
```

**Error Testing:**
```typescript
// tests/services/GPSService.test.ts
describe('Error handling', () => {
	it('should handle GPS connection failure gracefully', async () => {
		mockGPSService.getCurrentPosition.mockRejectedValue(new Error('GPS unavailable'));

		const position = await gpsService.getPosition();

		expect(position).toEqual(gpsService.getLastKnownPosition());
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('GPS connection lost'));
	});
});
```

**Sailing Calculation Testing:**
```typescript
// tests/utils/sailingMath.test.ts
import { calculateApparentWind } from '../../src/utils/sailingMath';

describe('Apparent wind calculations', () => {
	it('should calculate correct AWS for upwind sailing', () => {
		const result = calculateApparentWind({
			trueWindSpeed: 20,
			trueWindDirection: 270,
			boatSpeed: 6,
			courseOverGround: 315 // 45° off wind
		});

		expect(result.speed).toBeCloseTo(22.8, 1);
		expect(result.angle).toBeCloseTo(38, 0);
	});

	it('should handle zero wind conditions', () => {
		const result = calculateApparentWind({
			trueWindSpeed: 0,
			trueWindDirection: 0,
			boatSpeed: 5,
			courseOverGround: 90
		});

		expect(result.speed).toBe(5); // AWS equals boat speed in zero wind
		expect(result.angle).toBe(0); // Wind on the nose when motoring
	});
});
```

## Performance Testing

**Load Testing:**
```typescript
// tests/integration/performance.test.ts
describe('Performance tests', () => {
	it('should calculate 100-point route in under 100ms', async () => {
		const longRoute = createLongRoute(100); // 100 waypoints
		const startTime = performance.now();

		const forecast = await routeCalculator.calculate(longRoute);

		const duration = performance.now() - startTime;
		expect(duration).toBeLessThan(100);
		expect(forecast).toHaveLength(100);
	});
});
```

## Test Import Path Management

**Relative Imports from Tests:**
```typescript
// From tests/services/ to src/services/
import { WeatherService } from '../../src/services/WeatherService';

// From tests/components/ to src/components/
import ForecastTable from '../../src/components/ForecastTable.svelte';

// From tests/utils/ to src/utils/
import { calculateApparentWind } from '../../src/utils/sailingMath';

// Test helpers and fixtures (same level)
import { createTestRoute } from '../helpers/factories';
import { testRoutes } from '../fixtures/sailing';
```

**TypeScript Path Aliases in Tests:**
```typescript
// If using path aliases, update tsconfig.json test paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@test/*": ["tests/*"]
    }
  }
}
```

## Mock Data Principles

**Realistic Sailing Data:**
- Use actual geographic coordinates from known sailing areas
- Include realistic wind patterns and seasonal variations
- Model actual boat speeds for different wind conditions

**Edge Cases:**
- Calm conditions (wind < 5 knots)
- Strong weather (wind > 30 knots, high waves)
- GPS data gaps and connection issues
- Route planning across date boundaries

## Verification Strategy

**Testing the Separate Directory Structure:**
1. No test files should exist in `src/` directories
2. All tests should be in corresponding `tests/` subdirectories
3. Import paths should use relative references to `src/`
4. Test coverage should map correctly to source files
5. Build scripts should only include `src/` in production bundles

---

*Testing analysis: 2026-03-02*