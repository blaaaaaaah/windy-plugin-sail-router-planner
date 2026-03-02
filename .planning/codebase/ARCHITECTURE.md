# Architecture

**Analysis Date:** 2026-03-02

## Pattern Overview

**Overall:** Client-side Plugin Architecture with Real-time Data Integration

**Key Characteristics:**
- Browser-based Windy.com plugin with no server dependencies
- Event-driven weather data processing and sailing calculations
- Real-time GPS integration through local APIs
- Multi-route comparison with synchronized time scrubbing

## Layers

**Plugin Interface Layer:**
- Purpose: Integrates with Windy.com platform and plugin APIs
- Location: `src/plugin/` (planned)
- Contains: Plugin registration, Windy API interactions, platform bridge
- Depends on: Windy Plugin APIs, Leaflet 1.4.x
- Used by: All other layers

**Route Planning Layer:**
- Purpose: Manages route creation, editing, multi-route comparison
- Location: `src/routes/` (planned)
- Contains: Route geometry, leg configuration, speed settings, route storage
- Depends on: Plugin Interface Layer
- Used by: Forecast Layer, UI Components

**Sailing Calculations Layer:**
- Purpose: AWS/AWA calculations and sailing-specific weather analysis
- Location: `src/sailing/` (planned)
- Contains: Apparent wind calculations, safety warnings, course analysis
- Depends on: Weather data from Forecast Layer
- Used by: Forecast Layer, UI Components

**Forecast Layer:**
- Purpose: Weather data processing and timeline management
- Location: `src/forecast/` (planned)
- Contains: Weather data fetching, time interpolation, multi-route forecasting
- Depends on: Route Planning Layer, Windy Weather APIs, Sailing Calculations
- Used by: UI Components

**GPS Integration Layer:**
- Purpose: Real-time position data from external sources
- Location: `src/gps/` (planned)
- Contains: PredictWind DataHub, SignalK, TCP connection handlers
- Depends on: Local network APIs (no authentication required)
- Used by: Map visualization, position tracking

**UI Components Layer:**
- Purpose: Svelte components for forecast tables and controls
- Location: `src/components/` (planned)
- Contains: Forecast tables, time scrubbers, route editors, multi-route displays
- Depends on: Forecast Layer, Route Planning Layer, GPS Layer
- Used by: Plugin Interface Layer

## Data Flow

**Route Creation Flow:**

1. User clicks map points through Windy plugin interface
2. Route Planning Layer captures coordinates and creates route geometry
3. Forecast Layer requests weather data for route timeline
4. Sailing Calculations Layer computes AWS/AWA ranges and safety warnings
5. UI Components display forecast table with all calculations

**Time Scrubbing Flow:**

1. User interacts with forecast table time controls
2. UI Components emit time change events
3. All forecast tables synchronize to selected time
4. Plugin Interface Layer updates Windy layer display
5. Map updates all boat positions for scrubbed time across all routes

**Multi-Route Comparison:**

1. Multiple routes stored in Route Planning Layer
2. Each route maintains independent forecast timeline
3. Time scrubbing synchronizes across all routes
4. All predicted positions display simultaneously on map
5. Comparison enables optimal departure time selection

**Real-time GPS Integration:**

1. GPS Layer connects to local data sources
2. Current position streams to map visualization
3. Position comparison with predicted route progress
4. No historical tracking (future enhancement)

**State Management:**
- Local browser storage for route persistence
- Reactive state updates across all components
- No server-side state required

## Key Abstractions

**Route:**
- Purpose: Complete sailing route with legs, timing, and metadata
- Examples: `src/models/Route.ts` (planned)
- Pattern: Immutable data structures with transformation methods

**RouteLeg:**
- Purpose: Individual segment of route with specific speed settings
- Examples: `src/models/RouteLeg.ts` (planned)
- Pattern: Value objects with distance and time calculations

**ForecastPoint:**
- Purpose: Weather data at specific position and time with sailing calculations
- Examples: `src/models/ForecastPoint.ts` (planned)
- Pattern: Value objects with AWS/AWA calculation methods

**TimelineManager:**
- Purpose: Coordinates time scrubbing across multiple routes
- Examples: `src/services/TimelineManager.ts` (planned)
- Pattern: Observable state manager with event synchronization

**GPSStream:**
- Purpose: Real-time position data from external sources
- Examples: `src/services/GPSStream.ts` (planned)
- Pattern: Observable streams with connection management

## Entry Points

**Plugin Main:**
- Location: `src/index.ts` (planned)
- Triggers: Windy plugin loader activation
- Responsibilities: Plugin registration, dependency injection, component initialization

**Route Editor:**
- Location: `src/components/RouteEditor.svelte` (planned)
- Triggers: User map clicks, route modification gestures
- Responsibilities: Route creation, editing, leg configuration

**Forecast Table:**
- Location: `src/components/ForecastTable.svelte` (planned)
- Triggers: Route updates, time scrubbing, layer switching
- Responsibilities: Weather display, sailing calculations, user interaction

**Multi-Route Manager:**
- Location: `src/components/MultiRouteManager.svelte` (planned)
- Triggers: Multiple route creation, comparison mode
- Responsibilities: Route synchronization, comparison display

## Error Handling

**Strategy:** Graceful degradation with clear user feedback

**Patterns:**
- Weather data unavailable: Display "--" with explanatory message
- GPS connection lost: Continue with last known position, show status
- Windy API failures: Fallback to basic functionality, retry logic
- Calculation errors: Safe defaults for AWS/AWA ranges
- Network timeouts: Cache last successful data, offline indicators

## Cross-Cutting Concerns

**Logging:** Browser console for development, structured error reporting
**Validation:** Route geometry validation, speed setting bounds, time range checks
**Authentication:** None required - leverages Windy platform security model
**Performance:** Efficient calculations for 10-15 waypoints, 4-5 routes, 1-minute updates

---

*Architecture analysis: 2026-03-02*