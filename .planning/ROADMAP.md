# Windy Sailing Route Planner Plugin - Roadmap

**Project**: Windy.com plugin for sailing route planning with apparent wind calculations
**Created**: 2026-03-02
**Depth**: Quick (4 phases)
**Coverage**: 14/14 v1 requirements mapped ✓

## Phases

- [⚡] **Phase 1: Technical Foundation** - Validate weather data access and sailing calculations (1/2 complete)
- [ ] **Phase 2: Route Planning Interface** - Build familiar route creation and editing UX
- [ ] **Phase 3: Enhanced Features** - Add multi-route comparison, time scrubbing, and GPS integration
- [ ] **Phase 4: Polish & Settings** - Persistence, configuration, and optimization

## Phase Details

### Phase 1: Technical Foundation
**Goal**: Validate that weather data access and sailing calculations work reliably within Windy's plugin framework
**Depends on**: Nothing (first phase)
**Requirements**: WEATHER-01, WEATHER-02, CALC-01, CALC-02, CALC-03
**Success Criteria** (what must be TRUE):
  1. User can see standard Measure&Plan weather data (wind, gusts, waves, current, rain) in forecast table
  2. User can see AWS/AWA range calculations for any route hour with realistic sailing values
  3. Weather data interpolation works correctly along route geometry with hourly precision
  4. All calculations perform efficiently in browser without lag or blocking
**Plans**: 2 plans
- [x] 01-01-PLAN.md — Technical foundation with comprehensive sailing calculations and weather service
- [ ] 01-02-PLAN.md — Gap closure: correct documentation and add test coverage

### Phase 2: Route Planning Interface
**Goal**: Users can create and edit sailing routes using familiar map-based interface
**Depends on**: Phase 1
**Requirements**: ROUTE-01, ROUTE-02, ROUTE-03, TIME-01
**Success Criteria** (what must be TRUE):
  1. User can create route by clicking waypoints on map (minimum 2, maximum 15 points)
  2. User can set individual speed for each route leg with reasonable defaults
  3. User can adjust departure time and see forecast table update automatically
  4. Route creation feels familiar and responsive, similar to Windy's Measure&Plan
**Plans**: TBD

### Phase 3: Enhanced Features
**Goal**: Users can compare multiple routes, scrub through time, and see real-time position
**Depends on**: Phase 2
**Requirements**: TIME-02, MULTI-01, MULTI-02, GPS-01, UI-01, SAFETY-01
**Success Criteria** (what must be TRUE):
  1. User can create up to 4-5 routes simultaneously with clear visual differentiation
  2. User can scrub through time and see boat positions update on all routes synchronously
  3. User can see real-time GPS position as white dot when GPS source available
  4. User can click forecast table rows to switch Windy weather layers automatically
  5. User receives clear safety warnings for dangerous conditions (high gusts, unfavorable waves)
**Plans**: TBD

### Phase 4: Polish & Settings
**Goal**: Application feels complete with proper persistence, configuration, and optimization
**Depends on**: Phase 3
**Requirements**: PERSIST-01, CONFIG-01
**Success Criteria** (what must be TRUE):
  1. User can save and restore favorite routes across browser sessions
  2. User can configure default speeds and GPS source preferences
  3. All features perform smoothly even with maximum complexity (5 routes, 15 waypoints each)
  4. Application handles edge cases gracefully with appropriate user feedback
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Technical Foundation | 1/2 | In Progress | Plan 01: 2026-03-06 |
| 2. Route Planning | 0/? | Not started | - |
| 3. Enhanced Features | 0/? | Not started | - |
| 4. Polish & Settings | 0/? | Not started | - |

## Requirement Mapping

| Requirement | Phase | Description |
|-------------|-------|-------------|
| WEATHER-01 | Phase 1 | Forecast table with hourly weather at predicted boat position |
| WEATHER-02 | Phase 1 | Standard weather data (wind, gusts, waves, current, rain) |
| CALC-01 | Phase 1 | Calculate and display apparent wind angle (AWA) ranges |
| CALC-02 | Phase 1 | Calculate and display apparent wind speed (AWS) ranges |
| CALC-03 | Phase 1 | Distance/bearing calculations for route geometry |
| ROUTE-01 | Phase 2 | Create basic routing tool extending Windy's Measure&Plan interface |
| ROUTE-02 | Phase 2 | Support individual speed settings per route leg |
| ROUTE-03 | Phase 2 | Route editing and waypoint management |
| TIME-01 | Phase 2 | Integrate departure time control with user timezone |
| TIME-02 | Phase 3 | Implement time scrubbing with boat position updates on map |
| MULTI-01 | Phase 3 | Support multiple routes and departure times simultaneously |
| MULTI-02 | Phase 3 | Display predicted boat positions for all routes during time scrub |
| GPS-01 | Phase 3 | Show real-time GPS position from PredictWind/SignalK/TCP sources |
| UI-01 | Phase 3 | Enable weather layer switching via forecast table row clicks |
| SAFETY-01 | Phase 3 | Add sailing-specific safety warnings |
| PERSIST-01 | Phase 4 | Implement route persistence (favorites) via local storage |
| CONFIG-01 | Phase 4 | Add settings panel for default speeds and GPS source configuration |

## Dependencies

```
Phase 1: Technical Foundation
    ↓
Phase 2: Route Planning Interface
    ↓
Phase 3: Enhanced Features
    ↓
Phase 4: Polish & Settings
```

## Research Insights

**Critical Path**: Phase 1 must validate technical feasibility before building user features. Research identified that weather data access and AWS/AWA calculations represent the highest technical risk.

**Key Decisions**:
- ✅ Built custom navigation utilities with precise spherical trigonometry (replaced @gml/truewind)
- ✅ Successfully reverse-engineered Windy's route planner API with dynamic manifest generation
- ✅ Used Leaflet's existing LatLng type for coordinate system integration
- ✅ Separated weather data into northUp (API) and apparent (calculated) for sailing displays
- Limit complexity: 4-5 routes maximum, 10-15 waypoints per route
- Keep GPS integration simple (position display only, no complex tracking)

**Research Flags**:
- ✅ Phase 1 deep research complete - Windy's route planner API successfully integrated
- Phase 3 needs investigation of GPS integration methods (SignalK/PredictWind)

---
*Roadmap v1.0 - Ready for phase planning*