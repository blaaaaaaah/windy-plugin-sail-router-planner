# Technology Stack

**Project:** Windy Plugin - Sailing Route Planning
**Researched:** 2026-03-02

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Svelte | 5.x | UI Components | Required by Windy plugin architecture. Runes provide superior state management for complex routing data |
| TypeScript | 5.6+ | Type Safety | Windy plugin template requires TypeScript. Essential for complex sailing calculations |
| Leaflet | 1.4.x+ | Map Integration | Already available in Windy environment. No import needed, accessed via global L object |

### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Svelte 5 Runes | Built-in | Route State | $state() for complex multi-route data. Universal reactivity for shared state modules |
| Windy Store | Built-in | Map State | store.set() for overlay/particle integration. Required for Windy API compliance |
| Context API | Built-in | Component Tree State | For scoped state sharing. Prevents prop drilling in route hierarchy |

### Sailing Calculations
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @gml/truewind | 2.0.1+ | AWS/AWA/TWS/TWD | Modern ES6+ TypeScript library. Handles pitch/roll corrections, leeway calculations |
| Turf.js | 7.3.4+ | Geospatial Math | Distance, bearing, course calculations. Modular design, WGS84 standard |

### Weather & Time Series
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Windy Forecast API | Built-in | Weather Data | Direct access to Windy's GFS/ECMWF data. No additional API calls needed |
| Windy interpolateLatLon | Built-in | Weather Interpolation | Native weather value interpolation at specific lat/lon coordinates |
| Custom Time State | - | Time Scrubbing | No existing solution. Must build time-based state for multi-route forecasts |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @coremarine/nmea-parser | 1.0+ | GPS Integration | Only if real GPS tracking needed. Optional for MVP |
| date-fns | 3.x+ | Time Manipulation | Forecast time calculations, departure scheduling |
| wind2obj | Built-in | Wind Data Conversion | Windy utility for converting interpolated wind values |
| metrics.wind | Built-in | Unit Conversion | Windy utility for wind unit conversions |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Wind Calculations | @gml/truewind | Custom Math | @gml/truewind battle-tested, handles edge cases, TypeScript support |
| State Management | Svelte 5 Runes | Stores/RxJS | Runes provide universal reactivity. RxJS overkill for simple GPS dots |
| Geo Calculations | Turf.js | Custom Math | Turf.js battle-tested, modular, handles edge cases |
| Chart Library | i-Boating SDK | Navionics Web API | i-Boating has better Leaflet integration examples |

## Installation

```bash
# Core Windy Plugin Template (already includes Svelte 5 + TypeScript)
git clone https://github.com/windycom/windy-plugin-template.git
cd windy-plugin-template && npm install

# Sailing calculations
npm install @gml/truewind

# Geospatial calculations
npm install @turf/turf

# Optional: GPS parsing (if real tracking needed)
npm install @coremarine/nmea-parser

# Time utilities
npm install date-fns

# Development
npm install -D @types/leaflet
```

## Windy Weather Interpolation Integration

### Accessing Weather Data
```typescript
// Windy provides interpolateLatLon function for weather values at coordinates
const weatherData = interpolateLatLon({ lat: 45.5, lon: -125.3 });
if (weatherData) {
  // Convert raw meteorological values
  const windData = wind2obj(weatherData);
  const windSpeed = metrics.wind.convertValue(windData.speed);
  const windDirection = windData.direction;
}
```

### Weather Data Processing
```typescript
interface WeatherPoint {
  lat: number;
  lon: number;
  wind: {
    speed: number; // m/s
    direction: number; // degrees true
  };
  time: Date;
}

function getWeatherAlongRoute(route: LatLng[], timeSteps: Date[]): WeatherPoint[] {
  return route.flatMap(point =>
    timeSteps.map(time => {
      // Set time in Windy's timeline
      store.set('timestamp', time.getTime());

      // Get interpolated weather data
      const weather = interpolateLatLon(point);
      const wind = weather ? wind2obj(weather) : null;

      return {
        lat: point.lat,
        lon: point.lng,
        wind: wind ? {
          speed: metrics.wind.convertValue(wind.speed),
          direction: wind.direction
        } : null,
        time
      };
    })
  );
}
```

## Architecture Notes

### Svelte 5 State Structure
```typescript
// .svelte.js file for universal reactivity (2025 pattern)
import { TrueWindInput, TrueWindResult } from '@gml/truewind';

export const routeState = $state({
  routes: new Map<string, Route>(),
  activeRoute: null as Route | null,
  currentTime: new Date(),
  weatherForecast: new Map<string, WeatherData[]>()
});

export const windState = $state({
  apparent: {
    speed: 0, // AWS in m/s
    angle: 0  // AWA in degrees
  },
  true: {
    speed: 0, // TWS in m/s
    direction: 0 // TWD in degrees true
  },
  boat: {
    speed: 2.5, // m/s
    heading: 0, // degrees magnetic
    leeway: 0   // degrees
  }
});
```

### Wind Calculation Integration
```typescript
import TrueWind from '@gml/truewind';

function updateWindCalculations() {
  const input: TrueWindInput = {
    aws: windState.apparent.speed,
    awa: windState.apparent.angle,
    bspd: windState.boat.speed,
    sog: gpsState.speedOverGround,
    cog: gpsState.courseOverGround,
    heading: windState.boat.heading,
    variation: magneticVariation
  };

  const result: TrueWindResult = TrueWind.getTrue(input);

  windState.true.speed = result.tws;
  windState.true.direction = result.twd;
  windState.boat.leeway = result.leeway;
}
```

### Windy Plugin Configuration
```typescript
const config: ExternalPluginConfig = {
  name: 'windy-plugin-sailing-routes',
  version: '1.0.0',
  desktopUI: 'rhpane',
  mobileUI: 'fullscreen',
  desktopWidth: 400,
  mobileHeight: '100%'
};
```

## Performance Considerations

- **Modular Turf.js**: Only import needed functions to minimize bundle size
- **Efficient State**: Use $derived() for calculated values, avoid unnecessary reactivity
- **Weather Data Caching**: Cache interpolated weather data, don't refetch on every time scrub
- **Wind Calculations**: Use @gml/truewind's optimized calculations vs custom math
- **Route Calculations**: Batch waypoint calculations, use Web Workers for complex routing

## 2025-Specific Enhancements

### Svelte 5 Universal Reactivity
```typescript
// shared-state.svelte.ts - Universal reactive state (2025 pattern)
export const appState = $state({
  routes: new Map(),
  weather: new Map(),
  performance: {
    calculator: new PerformanceCalculator(),
    polar: null as PolarData | null
  }
});

// Derived calculations with memoization
export const routeWeather = $derived(() => {
  if (!appState.routes.size) return [];
  return calculateWeatherAlongRoutes(appState.routes, appState.weather);
});
```

### Modern Wind Library Integration
```typescript
// Wind calculations with @gml/truewind (latest 2025 features)
export async function calculateApparentWind(
  trueWind: { speed: number; direction: number },
  boat: { speed: number; course: number }
): Promise<{ speed: number; angle: number }> {

  // Use @gml/truewind for reverse calculation (true -> apparent)
  const result = TrueWind.getApparent({
    tws: trueWind.speed,
    twd: trueWind.direction,
    bspd: boat.speed,
    heading: boat.course
  });

  return {
    speed: result.aws,
    angle: result.awa
  };
}
```

## Development Workflow

1. **Plugin Development**: `npm start` serves at https://localhost:9999/plugin.js
2. **Windy Integration**: Plugin loads directly into Windy.com environment
3. **Weather Testing**: Use Windy's built-in developer tools for weather data debugging
4. **Wind Calculation Testing**: Unit tests with @gml/truewind for various conditions
5. **Deployment**: Publish as npm package for Windy marketplace

## Sources

- [Windy Plugin Documentation](https://docs.windy-plugins.com/) - MEDIUM confidence
- [Svelte 5 Runes Guide](https://svelte.dev/blog/runes) - HIGH confidence
- [Turf.js Official](https://turfjs.org/) - HIGH confidence
- [@gml/truewind Package](https://www.npmjs.com/package/@gml/truewind) - HIGH confidence
- [Windy API interpolateLatLon](https://api.windy.com/) - MEDIUM confidence
- [Svelte 5 Universal Reactivity 2025](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/) - HIGH confidence