# Architecture Patterns: Sailing Route Planning

**Domain:** Browser-based sailing route planning plugins
**Researched:** 2026-03-02

## Core Architecture Patterns

### Pattern 1: Plugin Extension Architecture
**What:** Build sailing-specific interface within Windy plugin framework
**Why:** Leverage Windy's weather data, map infrastructure, and user base
**How:**
```
Windy Core Platform
├── Weather Data Access
├── Leaflet 1.4.x Map
├── User Account/Subscription
└── Plugin Framework
    └── Sailing Route Planner Plugin
        ├── Route Planning UI (similar to Measure&Plan)
        ├── Enhanced Forecast Table
        ├── Sailing Calculations
        └── Time Scrubbing
```

### Pattern 2: Time-Based Weather Interpolation
**What:** Use Windy's existing weather interpolation for hourly precision
**Why:** Don't reinvent - leverage Windy Measure&Plan's proven approach
**Research Needed:** Determine how Windy's Measure&Plan gets hourly weather data
**Options:**
- Windy may already interpolate 3-hour model data to hourly
- Windy may provide API for hourly interpolated data
- Plugin may need to use same interpolation method Windy uses internally

**Implementation Strategy:**
1. **First:** Research Windy's Measure&Plan weather data API
2. **Replicate:** Use identical interpolation approach as Measure&Plan
3. **Extend:** Add sailing-specific calculations on top

### Pattern 3: Enhanced Forecast Table Architecture
**What:** Build forecast table showing both standard and sailing-specific data
**Standard Measure&Plan Data (required):**
- Wind speed
- Gusts speed
- Waves direction
- Current direction
- Rain precipitations
- Distance/bearing per leg
- Total route distance/time

**Sailing-Specific Additions:**
- AWS Range (Apparent Wind Speed)
- AWA Range (Apparent Wind Angle)
- Safety warnings (cape index, gusts, waves)
- Individual leg speeds
- Motoring indicators

**Table Structure:**
```
Hour | Wind | Gusts | Waves | Current | Rain | AWS | AWA | Warnings
-----|------|-------|-------|---------|------|-----|-----|----------
14:00| 15kt | 18kt  | 2m N  | 1kt E   | 0mm  |12-16|110°±|   ⚠️
15:00| 16kt | 20kt  | 2.5m N| 1kt E   | 0mm  |13-17|115°±|
```

### Pattern 4: Multi-Route State Management
**What:** Manage 4-5 simultaneous routes with independent configurations
**Component Structure:**
```
RouteManager
├── Route[] (max 5)
│   ├── waypoints: LatLon[]
│   ├── speeds: number[] (per leg)
│   ├── departureTime: Date
│   └── forecastData: WeatherPoint[]
├── currentTime: Date (scrubbing)
└── activeRoute: number
```

### Pattern 5: Apparent Wind Calculation Pipeline
**What:** Real-time AWS/AWA calculation as conditions change
**Data Flow:**
```
True Wind (from Windy) → Boat Speed (user input) → Vector Math → AWS/AWA Range
       ↑                        ↑                      ↓
Weather Interpolation    Route Leg Speed        Display in Forecast Table
```

**Calculation Pattern:**
```typescript
interface ApparentWind {
  aws: { min: number; max: number };  // Range due to uncertainty
  awa: { min: number; max: number };  // Relative to boat heading
}

function calculateApparentWind(
  trueWind: { speed: number; direction: number },
  boatVector: { speed: number; heading: number }
): ApparentWind
```

## Component Architecture

### Core Components

#### RouteManager Component
**Responsibility:** Overall route state and coordination
- Manages multiple routes simultaneously
- Handles route CRUD operations
- Coordinates time scrubbing across all routes
- Persists routes to local storage

#### ForecastTable Component
**Responsibility:** Weather data display and interaction
- Shows all standard Measure&Plan data columns
- Adds sailing-specific columns (AWS/AWA)
- Handles row-click layer switching
- Displays safety warnings (gusts, waves, cape index)
- Shows 6h before departure + route duration + 6h after

#### RouteMap Component
**Responsibility:** Map visualization and interaction
- Route drawing and editing (similar to Measure&Plan)
- Boat position markers (GPS white dot + predicted positions)
- Weather layer display
- Time scrubbing visual feedback
- Multiple route visualization

#### TimeControl Component
**Responsibility:** Departure time and scrubbing
- Departure time slider (similar to Measure&Plan)
- Time scrubbing controls
- Synchronizes time across all routes
- Shows current scrubbed time clearly

### Data Flow Architecture

```
User Input (Route Drawing - similar to Measure&Plan)
    ↓
Route Waypoints Stored
    ↓
Weather Data Request (via Windy API - same as Measure&Plan)
    ↓
Hourly Weather Interpolation (Windy's method)
    ↓
Standard Weather Display (Wind, Gusts, Waves, Current, Rain)
    ↓
Apparent Wind Calculation (sailing addition)
    ↓
Enhanced Forecast Table Update
    ↓
Map Visualization Update
```

## State Management Patterns

### Svelte Store Pattern
**Research Finding:** Use Svelte's built-in stores for route state
**Why:** Aligns with Svelte best practices, reactive updates
**Structure:**
```typescript
// Route store
export const routes = writable<Route[]>([]);
export const activeRouteIndex = writable<number>(0);
export const currentScrubTime = writable<Date>(new Date());

// Weather store (includes standard + sailing data)
export const weatherCache = writable<Map<string, EnhancedWeatherData>>(new Map());

// GPS store (simple)
export const gpsPosition = writable<LatLon | null>(null);
```

### Windy Integration Pattern
**Research Needed:** How to integrate with Windy's existing stores
**Likely Pattern:** Subscribe to Windy's weather/time stores
```typescript
import { store } from '@windy/store';

// Subscribe to Windy's current time
store.subscribe('timestamp', (timestamp) => {
  // Update route calculations when Windy time changes
});
```

## Performance Architecture

### Calculation Optimization
**Pattern:** Lazy calculation with caching
```typescript
const weatherCache = new Map<string, EnhancedWeatherData>();
const calculationCache = new Map<string, ApparentWind>();

function getCachedApparentWind(
  position: LatLon,
  time: Date,
  boatSpeed: number
): ApparentWind {
  const key = `${position.lat},${position.lon},${time.getTime()},${boatSpeed}`;
  if (calculationCache.has(key)) {
    return calculationCache.get(key);
  }
  // Calculate and cache...
}
```

### Route Limits Architecture
**Constraint:** 10-15 waypoints per route, 4-5 routes maximum
**Why:** Maintains responsive UI and reasonable calculation complexity
**Implementation:**
- Validate waypoint count on route creation
- Limit total active routes
- Show performance warnings if approaching limits

## Integration Patterns

### Windy Plugin Integration
**Research Required:** Exact Windy plugin API patterns
**Expected Structure:**
```typescript
import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
  name: 'sailing-route-planner',
  version: '1.0.0',
  title: 'Sailing Route Planner',
  // Integration points with Windy's systems
};
```

### GPS Integration Pattern
**Simple Pattern:** Periodic position updates
```typescript
let gpsPosition: LatLon | null = null;

// Simple polling - no complex streams needed
setInterval(async () => {
  try {
    const position = await getGPSPosition(); // From SignalK/PredictWind
    gpsPosition = position;
    updateMapMarker(position); // White dot on map
  } catch (error) {
    console.warn('GPS update failed:', error);
  }
}, 60000); // 1 minute updates
```

## Critical Architecture Decisions

### Decision: Build Similar Interface vs Extend
**Chosen:** Build sailing-specific interface similar to Windy's Measure&Plan
**Rationale:**
- Cannot directly extend Measure&Plan (plugin limitations)
- Need sailing-specific features (AWS/AWA, multi-route, etc.)
- Familiar UX pattern that users already understand
- Must include all standard Measure&Plan data PLUS sailing additions
**Trade-off:** More development work, but full control over sailing features

**Implementation:**
- Replicate familiar Measure&Plan interaction patterns
- Add route plotting via map clicks (similar UX)
- Create enhanced forecast table with all standard + sailing columns
- Use similar time controls but with sailing enhancements

### Decision: Client-Side Only
**Chosen:** Pure browser-based calculation
**Rationale:** No server infrastructure required
**Trade-off:** Limited by browser performance for complex routes

### Decision: Use Windy's Weather Interpolation
**Chosen:** Replicate Windy Measure&Plan's weather data approach
**Rationale:** Proven accuracy, consistent with user expectations
**Research Needed:** Exact API/method Windy uses for standard Measure&Plan data

### Decision: Simple GPS Integration
**Chosen:** Basic position display (white dot)
**Rationale:** GPS is minor feature, focus on route planning
**Implementation:** Periodic polling, not real-time streaming

## Technical Constraints

### Windy Platform Constraints
- Svelte + TypeScript required
- Leaflet 1.4.x (not latest version)
- Client-side execution only
- Weather data limited by user subscription

### Performance Constraints
- Browser-based calculations must be responsive
- Weather data caching required
- Route complexity limits (10-15 waypoints)
- Maximum 4-5 simultaneous routes

### Integration Constraints
- Must use Windy plugin APIs (no direct server calls)
- Local APIs only for GPS (no authentication)
- Plugin sandboxing limitations

## Research Gaps

**High Priority:**
1. **Windy Measure&Plan API:** How does it get hourly weather data?
2. **Standard Weather Data:** Exact format/structure of Wind/Gusts/Waves/Current/Rain
3. **Windy Plugin Integration:** Exact store integration patterns

**Medium Priority:**
1. **Svelte 5.x Patterns:** Latest state management recommendations
2. **Plugin Performance:** Calculation limits and optimization patterns
3. **GPS API Integration:** SignalK/PredictWind local connection methods

---
*Architecture patterns researched for sailing route planning plugin development*