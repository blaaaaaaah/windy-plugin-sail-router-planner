# Windy Sailing Route Planner Plugin

## What This Is

A Windy.com plugin that provides sailing route planning with apparent wind calculations and sailing-specific analysis. Extends Windy's existing Measure&Plan functionality with real-time GPS integration, multi-route comparison, and sailing-optimized weather forecasting for passage planning from short Caribbean island hops to major ocean crossings.

## Core Value

Sailors can see accurate apparent wind angles and speeds along their planned routes, enabling proper sail selection and departure timing decisions based on sailing-specific weather analysis.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Create basic routing tool extending Windy's Measure&Plan interface
- [ ] Calculate and display apparent wind angle (AWA) ranges for each route hour
- [ ] Calculate and display apparent wind speed (AWS) ranges for each route hour
- [ ] Implement forecast table with hourly weather at predicted boat position
- [ ] Add sailing-specific safety warnings (cape index, gusts, wave conditions)
- [ ] Support individual speed settings per route leg (default 5 knots)
- [ ] Implement time scrubbing with boat position updates on map
- [ ] Integrate departure time control with user timezone
- [ ] Enable weather layer switching via forecast table row clicks
- [ ] Support multiple routes and departure times simultaneously
- [ ] Show real-time GPS position (white dot) from PredictWind/SignalK/TCP sources
- [ ] Display predicted boat positions (boat icons) for all routes during time scrub
- [ ] Implement route persistence (favorites) via local storage
- [ ] Add settings panel for default speeds and GPS source configuration

### Out of Scope

- Automatic weather routing optimization — manual route plotting preferred for control
- Boat polar integration — user speed input more practical than theoretical polars
- Multiple timezone support — user timezone only, defer to V2
- Historical GPS tracks — requires server-side work, defer to future
- OAuth authentication — local APIs only, no auth storage
- Mobile-specific features — web-first implementation
- Complex DST/leap second handling — pragmatic time approach sufficient

## Context

**Sailing Background:**
- Used for passage planning on liveaboard sailing vessel
- Routes range from short Caribbean island hops (few hours) to major ocean passages (weeks)
- Current workflow uses Windy's Measure&Plan plus manual AWA estimation
- AWS/AWA calculations are accurate but complex (dependent on sea state, current, sails, heel)
- Performance realistic for 10-15 waypoints per route, 4-5 simultaneous routes maximum

**Technical Environment:**
- Windy.com plugin system using Svelte + TypeScript
- Leaflet 1.4.x mapping library with full weather data API access
- Client-side execution using user's Windy account/subscription
- Access to weather models based on user's subscription level (GFS free, ECMWF premium)
- Real-time boat position integration via local APIs (no authentication required)
- Time-based weather interpolation along route with hourly precision

**User Experience:**
- Boat speed estimates: downwind 7-8 knots, upwind motoring 4 knots, default 5 knots
- AWA/AWS critical for sail selection decisions along each leg
- Need weather evolution hourly along route with 6h before/after departure coverage
- Time scrubbing shows boat position and weather layer sync across all routes
- Update frequency: 1 minute sufficient for real-time position

## Constraints

- **Tech Stack**: Must use Windy's Svelte + TypeScript plugin framework
- **Code Style**: Tab indentation (not 2-space), established conventions
- **Data Access**: Limited to user's Windy subscription level and available weather layers
- **Performance**: Complex calculations must run efficiently in browser
- **API Usage**: Windy plugin APIs only, no direct server calls
- **Real-time Data**: Local APIs only (PredictWind DataHub, SignalK, TCP) - no auth
- **UI Layout**: Decision pending between right pane vs bottom panel for forecast table
- **Route Limits**: Realistic performance for 10-15 waypoints, 4-5 routes maximum
- **Time Handling**: User timezone only, pragmatic approach to DST/transitions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Accurate AWS/AWA calculation | Complex sailing physics possible, provide ranges for uncertainty | — Pending |
| No authentication storage | Local APIs sufficient, plugin runs in Windy environment | — Pending |
| Tab indentation | Established code style requirement | — Pending |
| Performance limits | Realistic sailing usage (4-5 routes, 10-15 waypoints) | — Pending |
| User timezone only | Multi-timezone complexity unnecessary for sailing | — Pending |
| Local storage persistence | Simple route favorites without server complexity | — Pending |
| 1-minute GPS updates | Sufficient frequency for sailing navigation | — Pending |

---
*Last updated: 2026-03-02 after initialization*