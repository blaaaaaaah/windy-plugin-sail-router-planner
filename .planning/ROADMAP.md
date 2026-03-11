# Windy Sailing Route Planner Plugin - Roadmap

**Project**: Windy.com plugin for sailing route planning with apparent wind calculations
**Created**: 2026-03-02
**Depth**: Quick (4 phases)
**Coverage**: 14/14 v1 requirements mapped ✓

## Phases

- [✓] **Phase 1: Technical Foundation** - Validate weather data access and sailing calculations (COMPLETE)
- [ ] **Phase 2: Route Planning Interface** - Build familiar route creation and editing UX
- [ ] **Phase 3: Enhanced Features** - Add multi-route comparison, time scrubbing, and GPS integration
- [ ] **Phase 4: Polish & Settings** - Persistence, configuration, and optimization

## Phase Details

### Phase 1: Technical Foundation
**Goal**: Validate that weather data access and sailing calculations work reliably within Windy's plugin framework
**Depends on**: Nothing (first phase)
**Requirements**: WEATHER-01, WEATHER-02, CALC-01, CALC-02, CALC-03, ROUTE-01, ROUTE-02, ROUTE-03
**Success Criteria** (what must be TRUE):
  1. ✓ User can see standard Measure&Plan weather data (wind, gusts, waves, current, rain) in forecast table
  2. ✓ User can see AWS/AWA range calculations for any route hour with realistic sailing values
  3. ✓ Weather data interpolation works correctly along route geometry with hourly precision
  4. ✓ All calculations perform efficiently in browser without lag or blocking
**Plans**: 2 plans
- [x] 01-01-PLAN.md — Technical foundation with comprehensive sailing calculations and weather service
- [x] 01-02-PLAN.md — Interactive route editor, per-leg weather calls, and comprehensive UI implementation

### Phase 2: Enhanced Forecast & Interaction
**Goal**: Users get comprehensive sailing data with timeline interaction and detailed forecast metrics
**Depends on**: Phase 1
**Requirements**: TIME-01, TIME-02, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. User can scrub through time using timeline slider on left side of forecast table
  2. User can edit departure time and leg speeds inline with immediate forecast updates
  3. User sees route progress visualization showing current boat position during time scrub
  4. Forecast table shows comprehensive sailing data like PredictWind (passage time, motoring time, wind stats, sailing percentages)
  5. User can toggle between true wind/apparent wind data display
  6. Wave period data is included alongside wave height in forecast
**Plans**: TBD

### Phase 3: Multi-Route & GPS Integration
**Goal**: Users can compare multiple routes with GPS tracking and safety features
**Depends on**: Phase 2
**Requirements**: MULTI-01, MULTI-02, GPS-01, SAFETY-01
**Success Criteria** (what must be TRUE):
  1. User can create up to 4-5 routes simultaneously with clear visual differentiation
  2. User can compare routes side-by-side with synchronized timeline scrubbing
  3. User can see real-time GPS position as white dot when GPS source available
  4. User receives clear safety warnings for dangerous conditions (high gusts, unfavorable waves)
  5. Route comparison shows relative performance metrics (passage time, comfort, etc.)
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
| 1. Technical Foundation | 2/2 | ✓ Complete | Plan 01: 2026-03-06, Plan 02: 2026-03-11 |
| 2. Enhanced Forecast | 0/? | Ready to start | - |
| 3. Multi-Route & GPS | 0/? | Not started | - |
| 4. Polish & Settings | 0/? | Not started | - |

## Requirement Mapping

| Requirement | Phase | Description |
|-------------|-------|-------------|
| WEATHER-01 | Phase 1 | Forecast table with hourly weather at predicted boat position |
| WEATHER-02 | Phase 1 | Standard weather data (wind, gusts, waves, current, rain) |
| CALC-01 | Phase 1 | Calculate and display apparent wind angle (AWA) ranges |
| CALC-02 | Phase 1 | Calculate and display apparent wind speed (AWS) ranges |
| CALC-03 | Phase 1 | Distance/bearing calculations for route geometry |
| ROUTE-01 | Phase 1 | Create basic routing tool extending Windy's Measure&Plan interface |
| ROUTE-02 | Phase 1 | Support individual speed settings per route leg |
| ROUTE-03 | Phase 1 | Route editing and waypoint management |
| TIME-01 | Phase 2 | Editable departure time and leg speeds with instant forecast updates |
| TIME-02 | Phase 2 | Timeline slider for scrubbing through forecast with route progress visualization |
| UI-01 | Phase 2 | Enhanced forecast table with PredictWind-style comprehensive sailing data |
| UI-02 | Phase 2 | Wave period data integration in forecast table |
| UI-03 | Phase 2 | True/apparent wind toggle with data display switching |
| UI-04 | Phase 2 | Route progress indicator showing boat position during time scrub |
| UI-05 | Phase 2 | Sailing performance metrics (passage time, motoring time, wind percentages) |
| UI-06 | Phase 2 | Enhanced leg data display with sailing-specific statistics |
| MULTI-01 | Phase 3 | Support multiple routes and departure times simultaneously |
| MULTI-02 | Phase 3 | Side-by-side route comparison with synchronized timeline |
| GPS-01 | Phase 3 | Show real-time GPS position from PredictWind/SignalK/TCP sources |
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