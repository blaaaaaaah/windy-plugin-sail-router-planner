# Weather Service Architecture

## Overview

This document describes the architecture and design decisions for the Weather Forecast Service foundation layer of the Windy Sailing Route Planner plugin.

**Created**: 2026-03-06
**Phase**: 1 - Technical Foundation
**Purpose**: Ground service foundation for accessing weather data

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Plugin UI     │───▶│ Weather Service │───▶│   Windy API     │
│  (plugin.svelte)│    │                 │    │  (W.http.get)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │ Navigation Utils │
                       │ (calculations)   │
                       └─────────────────┘
```

## File Structure

```
src/
├── types/
│   ├── Coordinates.ts          # Re-exports Leaflet's LatLng
│   ├── RouteTypes.ts          # RouteDefinition, RouteLeg
│   ├── WeatherTypes.ts        # WeatherData, PointForecast, RouteForecast
│   └── index.ts
├── services/
│   ├── WindyAPI.ts            # Wrapper for W.http.get()
│   ├── WeatherForecastService.ts  # Main forecast service
│   └── index.ts
├── utils/
│   ├── NavigationUtils.ts     # Distance, bearing, apparent wind calculations
│   ├── TimeUtils.ts           # Date formatting
│   └── index.ts
└── plugin.svelte              # Updated with test integration
```

## Design Decisions

### 1. Type System
- **Decision**: Use Leaflet's existing `LatLng` type via indirection in `Coordinates.ts`
- **Rationale**: Windy already provides Leaflet, no need for duplicate coordinate types
- **Alternative Rejected**: Creating custom `LatLon` interface (unnecessary duplication)

### 2. Course Direction Range
- **Decision**: Use 0-359° range for course calculations (not -180 to 180)
- **Rationale**: Standard nautical convention, easier to work with
- **Implementation**: All bearing calculations normalize to 0-359°

### 3. Distance Units
- **Decision**: Use nautical miles consistently throughout
- **Rationale**: Standard for sailing, easier calculations for sailors
- **Implementation**: `toNauticalMiles()` utility function converts from Leaflet's meter distances

### 4. Utility Function Organization
- **Decision**: Move all calculations to `utils/` directory
- **Rationale**: Better separation of concerns, reusable functions
- **Files**:
  - `NavigationUtils.ts`: Distance, bearing, apparent wind calculations
  - `TimeUtils.ts`: Date formatting for API

### 5. API Integration
- **Decision**: Use `W.http.get()` method (not `W.htt.get()`)
- **Rationale**: Correct Windy API method based on working plugin analysis
- **No Fallback**: Show error if rplanner API fails (user's clarification)

### 6. Route Design Pattern
- **Decision**: `RouteDefinition.addLeg()` prevents gaps by design
- **Rationale**: Each leg uses previous leg's endpoint as starting point
- **Benefit**: No validation needed - gaps are impossible by construction

### 7. Weather Data Flow
- **Flow**: Raw API → North-up WeatherData → Apparent WeatherData
- **Calculations**: True wind + boat motion → apparent wind using vector math
- **No @gml/truewind**: Library calculates opposite direction (true FROM apparent)

## API Integration Details

### URL Format
```
/rplanner/v1/forecast/boat/{waypoints}?dst={start}&dst2={leg2_start}&dst3={leg3_start}...&minifest={unknown}&pr=0&sc={unknown}&poc={unknown}
```

### Parameters
- **waypoints**: `lat,lon;lat,lon;...` format
- **dst, dst2, dst3...**: Leg start times in `YYYY/MM/DD/HH` format
- **Unknown params**: `minifest`, `pr`, `sc`, `poc` (require research)

### Response Format
```typescript
{
  gust: number[];
  wind: number[];
  windDir: number[];
  waves: number[];
  wavesDir: number[];
  wavesPeriod: number[];
  precip: number[];
  warn: (string | null)[];
  icon: number[];
  distances: number[];
  bearings: number[];
  timestamps: number[];
  // ... other fields
}
```

## Calculation Details

### Apparent Wind Formula
```typescript
// Convert to velocity components (north/east)
const trueWindNorth = trueWindSpeed * Math.cos(twdRad);
const trueWindEast = trueWindSpeed * Math.sin(twdRad);

// Boat velocity components
const boatVelocityNorth = boatSpeed * Math.cos(courseRad);
const boatVelocityEast = boatSpeed * Math.sin(courseRad);

// Apparent wind = True wind - Boat velocity
const apparentWindNorth = trueWindNorth - boatVelocityNorth;
const apparentWindEast = trueWindEast - boatVelocityEast;
```

### Course Calculation
- Uses spherical trigonometry for accurate bearing
- Normalizes to 0-359° range
- Handles longitude wraparound correctly

### Distance Calculation
- Uses Leaflet's built-in `distanceTo()` method (haversine formula)
- Converts meters to nautical miles with `toNauticalMiles()`

## Data Structures

### RouteDefinition
- **Constructor**: `(startPoint: LatLng, departureTime: timestamp)`
- **Method**: `addLeg(endPoint: LatLng, averageSpeedKnots: number)`
- **Automatic calculations**: distance, course, timing for each leg
- **Gap prevention**: Each leg starts where previous ended

### RouteLeg
```typescript
{
  startTime: number;     // timestamp
  startPoint: LatLng;    // start coordinates
  endPoint: LatLng;      // end coordinates
  course: number;        // 0-359°
  distance: number;      // nautical miles
  averageSpeed: number;  // knots
  endTime: number;       // calculated timestamp
}
```

### WeatherData
```typescript
{
  windSpeed: number;        // knots
  windDirection: number;    // 0-359° (north up) or -180-180° (apparent)
  gustsSpeed: number;       // knots
  gustsDirection: number;   // same ranges as wind
  currentSpeed: number;     // knots
  currentDirection: number; // same ranges
  wavesHeight: number;      // meters
  wavesPeriod: number;      // seconds
  wavesDirection: number;   // same ranges
}
```

## Testing Integration

### Test Button
- Added to plugin UI: "Test Weather Service"
- Creates sample route: Caribbean → Pacific passage
- Tests full service chain: RouteDefinition → API → Calculations
- Outputs detailed console logging for debugging

### Console Output
```
Point 0: {
  time: "2026-03-05T07:00:00.000Z",
  position: "2.8652, -84.7625",
  northUpWind: "2.1 knots @ 347°",
  apparentWind: "5.8 knots @ 156°",
  leg: "246° course"
}
```

## Future Considerations

### Phase 2+ Extensions
- **Current data**: API doesn't provide current, placeholder values used
- **Unknown parameters**: Research `minifest`, `pr`, `sc`, `poc` meanings
- **Error handling**: More sophisticated retry/fallback strategies
- **Performance**: Caching for repeated route calculations
- **UI Integration**: Move from console logging to actual forecast display

### Technical Debt
- Time formatting could move to utils (currently duplicated)
- Navigation utilities could be further modularized
- API parameter research needed for full functionality

---

*This document will be updated as the weather service evolves through subsequent phases.*