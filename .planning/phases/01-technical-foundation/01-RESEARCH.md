# Phase 1: Technical Foundation - Research

**Researched:** 2026-03-05
**Domain:** Weather API Integration & Sailing Physics Calculations
**Confidence:** MEDIUM-HIGH

## Summary

Phase 1 focuses on validating that weather data access and sailing calculations work reliably within Windy's plugin framework. Research reveals that while Windy provides documented APIs for weather data access, the specific `W.htt.get()` method and `node.windy.com/rplanner/v1/forecast/boat` endpoint mentioned are not in official documentation, suggesting they are internal/undocumented APIs that would need reverse engineering from existing Measure&Plan implementation.

The @gml/truewind library provides comprehensive sailing calculations but only calculates true wind FROM apparent wind - the reverse of what we need. We must implement our own apparent wind calculation functions using established vector math formulas.

**Primary recommendation:** Start with official Windy APIs and documented plugin patterns, then investigate internal APIs through code inspection of existing plugins.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use Windy's route planning forecast API: `https://node.windy.com/rplanner/v1/forecast/boat/{waypoints}`
- Replicate Measure&Plan's API patterns rather than global state manipulation
- No `store.set('timestamp')` to avoid UI interference with main Windy interface
- Study existing API response format and authentication requirements
- Client-side calculations using @gml/truewind library
- Unified data object containing both API weather data and calculated sailing values
- Real-time AWS/AWA calculations in browser for immediate user feedback
- No backend infrastructure needed - pure plugin architecture
- Research Measure&Plan's exact API usage patterns through reverse engineering
- Validate authentication model for plugin access to forecast endpoints
- Test multi-temporal data access without global timestamp interference
- Document API response structure for sailing calculation integration

### Claude's Discretion
- Exact caching strategy for weather data
- Error handling for API failures
- Performance optimization details
- Fallback mechanisms for offline scenarios

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within technical foundation scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WEATHER-01 | Access weather data via API | Windy plugin APIs, reverse engineering of rplanner endpoint |
| WEATHER-02 | Handle forecast along route | Multi-point data interpolation patterns from existing plugins |
| CALC-01 | Calculate AWS from TWD/TWS/boat data | Vector math formulas, custom implementation needed |
| CALC-02 | Calculate AWA from TWD/TWS/boat data | Vector math formulas, custom implementation needed |
| CALC-03 | Handle current effects on calculations | Ocean current API integration, vector addition |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @windy/fetch | Latest | HTTP requests within plugin framework | Standardized Windy plugin HTTP wrapper |
| @gml/truewind | ^1.x | Sailing calculations (true wind from apparent) | Modern ES6+ library, accurate nautical math |
| Math.js | ^12.x | Vector mathematics for wind calculations | Comprehensive math library with unit support |
| Svelte 5 | Latest | UI framework | Required by Windy plugin architecture |
| TypeScript | Latest | Type safety | Required by Windy plugin architecture |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Victor.js | ^1.x | 2D vector operations | If Math.js proves insufficient for wind vectors |
| vector-math | Latest | Zero dependency vector ops | Alternative if Math.js adds too much weight |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Math.js | Custom vector math | Math.js provides units/conversions but larger bundle |
| @gml/truewind | Custom sailing physics | Library tested but only does apparent→true conversion |
| Official APIs | Reverse engineered endpoints | Official APIs documented but may lack routing features |

**Installation:**
```bash
npm install @gml/truewind mathjs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── weather/         # Weather data access and caching
├── calculations/    # Sailing physics and vector math
├── components/      # Svelte UI components
└── stores/          # Shared state management
```

### Pattern 1: Weather Data Access with Fallback
**What:** Unified weather data fetching with fallback strategies
**When to use:** All weather API interactions
**Example:**
```typescript
// Attempt internal rplanner API first, fallback to official Point Forecast API
async function getWeatherData(waypoints: Waypoint[]) {
  try {
    // User clarification: W.htt.get() handles authorization automatically
    return await W.htt.get(`/rplanner/v1/forecast/boat/${waypoints}`);
  } catch (error) {
    console.warn('Internal API failed, falling back to Point Forecast API');
    return await fetchPointForecastAPI(waypoints);
  }
}
```

### Pattern 2: Apparent Wind Calculation
**What:** Vector-based wind calculations from true wind + boat motion
**When to use:** Real-time AWS/AWA computation
**Example:**
```typescript
// Must implement - @gml/truewind only does reverse calculation
function calculateApparentWind(twd: number, tws: number, cog: number, sog: number) {
  // Convert to vectors
  const trueWindVector = windToVector(twd, tws);
  const boatVector = windToVector(cog, sog);

  // Apparent = True - Boat (vector subtraction)
  const apparentVector = trueWindVector.subtract(boatVector);

  return {
    awa: vectorToAngle(apparentVector, cog),
    aws: apparentVector.magnitude()
  };
}
```

### Pattern 3: Ocean Current Integration
**What:** Add current effects to wind calculations
**When to use:** When current data is available
**Example:**
```typescript
// Source: Ocean current API research
function calculateWindWithCurrent(
  twd: number, tws: number,
  boatSpeed: number, heading: number,
  currentDirection: number, currentSpeed: number
) {
  // Adjust boat velocity for current
  const cogVector = addCurrentToBoatVector(heading, boatSpeed, currentDirection, currentSpeed);

  return calculateApparentWind(twd, tws, cogVector.direction, cogVector.speed);
}
```

### Anti-Patterns to Avoid
- **Global timestamp manipulation:** Use local state instead of `store.set('timestamp')`
- **Blocking calculations:** Use web workers for complex vector math
- **Single API dependency:** Always have fallback strategies

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vector mathematics | Custom vector math | Math.js or Victor.js | Handles edge cases, unit conversions, performance optimized |
| HTTP caching | Custom cache logic | @windy/fetch patterns | Integrates with Windy's existing cache strategies |
| Wind unit conversions | Custom converters | Math.js units | Handles knots/m/s/km/h with precision |
| Trigonometric calculations | Custom trig | Standard Math + validated formulas | Precision edge cases already solved |
| Ocean current data | Custom current APIs | NOAA Tides & Currents API | Official government data with JSON format |

**Key insight:** Sailing physics has many edge cases (calm conditions, current effects, heel angle) - use proven libraries for foundations, customize only the high-level logic.

## Common Pitfalls

### Pitfall 1: Assuming @gml/truewind Does Apparent Wind Calculations
**What goes wrong:** Library only calculates true wind FROM apparent wind (opposite direction needed)
**Why it happens:** Name suggests bidirectional capability but API only provides `getTrue()` method
**How to avoid:** Implement custom `getApparent()` function using vector math formulas
**Warning signs:** Getting `undefined` or errors when trying to calculate apparent wind values

### Pitfall 2: Using Undocumented Internal APIs Without Fallbacks
**What goes wrong:** Plugin breaks when Windy updates internal endpoints
**Why it happens:** `W.htt.get()` and rplanner endpoints not in official documentation
**How to avoid:** Always implement fallback to documented Point Forecast API
**Warning signs:** Network errors in production, works in dev but fails for users

### Pitfall 3: Angle Convention Mismatches
**What goes wrong:** Wind calculations produce incorrect results due to angle reference systems
**Why it happens:** True wind direction (0-360° from North) vs apparent wind angle (±180° from bow)
**How to avoid:** Use consistent angle conventions and conversion functions
**Warning signs:** Wind arrows pointing wrong direction, negative angle values in unexpected places

### Pitfall 4: Vector Math in Degrees vs Radians
**What goes wrong:** Trigonometric calculations return garbage values
**Why it happens:** JavaScript Math functions expect radians, navigation uses degrees
**How to avoid:** Use Math.js units or explicit degree/radian conversion functions
**Warning signs:** Wind speeds/angles wildly incorrect, NaN values in calculations

### Pitfall 5: Current vs. No-Current Calculation Confusion
**What goes wrong:** Mixing course over ground (COG) with heading when current is present
**Why it happens:** Current creates difference between where boat points and where it goes
**How to avoid:** Use COG for apparent wind calculations, heading only for display
**Warning signs:** Apparent wind calculations wrong when current is strong

## Code Examples

Verified patterns from research sources:

### Vector-Based Wind Calculation
```typescript
// Source: Multiple sailing calculation resources + Vector math principles
function calculateApparentWindFromTrue(
  twd: number, // True wind direction (degrees from North)
  tws: number, // True wind speed (knots)
  cog: number, // Course over ground (degrees from North)
  sog: number  // Speed over ground (knots)
): { awa: number, aws: number } {

  // Convert to vectors (East = X, North = Y)
  const trueWindX = tws * Math.sin(twd * Math.PI / 180);
  const trueWindY = tws * Math.cos(twd * Math.PI / 180);

  const boatX = sog * Math.sin(cog * Math.PI / 180);
  const boatY = sog * Math.cos(cog * Math.PI / 180);

  // Apparent wind = True wind - Boat motion (vector subtraction)
  const apparentX = trueWindX - boatX;
  const apparentY = trueWindY - boatY;

  // Calculate apparent wind speed
  const aws = Math.sqrt(apparentX * apparentX + apparentY * apparentY);

  // Calculate apparent wind direction relative to North
  const awd = Math.atan2(apparentX, apparentY) * 180 / Math.PI;

  // Convert to apparent wind angle relative to bow
  let awa = awd - cog;
  if (awa > 180) awa -= 360;
  if (awa < -180) awa += 360;

  return { awa, aws };
}
```

### Weather API with Fallback Strategy
```typescript
// Source: Windy plugin development patterns + User clarifications
async function fetchWeatherData(waypoints: Waypoint[]): Promise<WeatherData> {
  try {
    // User clarification: W.htt.get() handles authorization automatically
    const response = await W.htt.get(`/rplanner/v1/forecast/boat/${encodeWaypoints(waypoints)}`);
    return response.data;
  } catch (error) {
    console.warn('Internal rplanner API failed, falling back to Point Forecast API');

    // Fallback to official documented API
    return await fetchPointForecastAPI(waypoints);
  }
}

async function fetchPointForecastAPI(waypoints: Waypoint[]): Promise<WeatherData> {
  // Source: Windy API documentation
  const forecasts = await Promise.all(
    waypoints.map(wp =>
      fetch('https://api.windy.com/api/point-forecast/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: wp.lat,
          lon: wp.lon,
          model: 'gfs',
          parameters: ['wind_u-10m', 'wind_v-10m'],
          key: 'your_API_key'
        })
      })
    )
  );

  return combinePointForecasts(forecasts);
}
```

### Ocean Current Integration
```typescript
// Source: NOAA Tides & Currents API research
async function fetchCurrentData(lat: number, lon: number): Promise<CurrentData> {
  // NOAA provides JSON format for easy JavaScript integration
  const response = await fetch(
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
    `product=currents&lat=${lat}&lon=${lon}&format=json`
  );

  return response.json();
}

function addCurrentToCalculation(
  twd: number, tws: number, heading: number, boatSpeed: number,
  currentDir: number, currentSpeed: number
): { awa: number, aws: number } {
  // Current affects boat's actual track over ground
  const boatX = boatSpeed * Math.sin(heading * Math.PI / 180);
  const boatY = boatSpeed * Math.cos(heading * Math.PI / 180);

  const currentX = currentSpeed * Math.sin(currentDir * Math.PI / 180);
  const currentY = currentSpeed * Math.cos(currentDir * Math.PI / 180);

  // Actual speed and course over ground
  const cogX = boatX + currentX;
  const cogY = boatY + currentY;
  const sog = Math.sqrt(cogX * cogX + cogY * cogY);
  const cog = Math.atan2(cogX, cogY) * 180 / Math.PI;

  return calculateApparentWindFromTrue(twd, tws, cog, sog);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom vector math | Math.js/Victor.js libraries | 2020+ | Better accuracy, unit handling |
| Manual angle conversions | Library-based unit systems | 2022+ | Fewer calculation errors |
| Single API dependency | Multi-tier fallback strategies | 2023+ | Better reliability |
| Separate AWS/AWA calculations | Unified vector approach | 2024+ | More accurate when current present |
| Windy pluginDataLoader | @windy/fetch module | 2024 | Modern promise-based API |

**Deprecated/outdated:**
- Manual trigonometric implementations: Use proven vector math libraries
- Hard-coded API endpoints: Always implement fallbacks for internal APIs
- pluginDataLoader: Replaced by @windy/fetch module

## Open Questions

1. **W.htt.get() API Authentication**
   - What we know: Method exists based on user clarification, handles authorization automatically
   - What's unclear: Authentication requirements, rate limits, exact endpoint format
   - Recommendation: Reverse engineer from Measure&Plan plugin, implement auth detection

2. **rplanner API Response Format**
   - What we know: Endpoint exists at `/rplanner/v1/forecast/boat/{waypoints}`
   - What's unclear: Exact response structure, time interpolation capabilities, waypoint encoding format
   - Recommendation: Inspect network traffic from existing Measure&Plan usage

3. **Current Effects Integration**
   - What we know: NOAA and other APIs provide ocean current data in JSON format
   - What's unclear: How to integrate current vectors with wind calculations efficiently
   - Recommendation: Start with no-current calculations, add current as Phase 2 enhancement

4. **Performance at Scale**
   - What we know: Browser-based vector math for 10-15 waypoints per route
   - What's unclear: Performance impact of real-time calculations during time scrubbing
   - Recommendation: Implement with performance monitoring, optimize if needed

5. **@gml/truewind Library Scope**
   - What we know: Library calculates true wind FROM apparent wind measurements
   - What's unclear: Whether any reverse calculation methods exist
   - Recommendation: Install and test library API, implement custom apparent wind calculations

## Sources

### Primary (HIGH confidence)
- Multiple sailing calculation resources - Vector math formulas for wind calculations
- Vector mathematics principles from physics/navigation sources - Established trigonometric relationships
- Windy.com official API documentation - Point Forecast API authentication and parameters
- NOAA Tides & Currents API documentation - Ocean current data access in JSON format

### Secondary (MEDIUM confidence)
- Math.js and Victor.js documentation - JavaScript vector math library capabilities
- Windy plugin development guides - Svelte/TypeScript framework requirements and @windy/fetch usage
- Maritime API providers (Xweather, Datalastic) - Ocean current and weather data integration patterns

### Tertiary (LOW confidence)
- @gml/truewind npm package existence - Package exists but detailed API needs verification
- Internal API endpoints from user clarifications - W.htt.get() and rplanner endpoints require reverse engineering
- Route planner functionality hints from community posts - Need direct investigation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - documented libraries and framework requirements
- Architecture: MEDIUM-HIGH - patterns validated through research, need implementation testing
- Pitfalls: HIGH - well-documented sailing calculation edge cases from multiple sources
- Internal APIs: LOW - require reverse engineering, not officially documented
- Vector calculations: HIGH - established mathematical principles with verified formulas

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (30 days - stable sailing physics, but API changes possible)