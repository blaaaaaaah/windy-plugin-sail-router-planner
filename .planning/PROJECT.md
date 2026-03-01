# Windy Sailing Route Planner Plugin

## What This Is

A Windy.com plugin that provides sailing route planning with apparent wind calculations and sailing-specific analysis. Built for sailors doing passage planning from short Caribbean island hops to major ocean crossings, displayed in a right-pane interface. Focuses on validating core sailing calculations before building advanced analysis features.

## Core Value

Sailors can see apparent wind angles and speeds along their planned routes, enabling proper sail selection and departure timing decisions based on accurate sailing-specific weather data.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Validate AWS/AWA calculations work correctly with real weather data
- [ ] Validate weather data access for given route/time combinations
- [ ] Create basic routing tool (similar to Windy's current measure&plan interface)
- [ ] Calculate and display apparent wind angle (AWA) for each route leg
- [ ] Calculate and display apparent wind speed (AWS) for each route leg
- [ ] Allow individual speed settings for each route leg instead of global average
- [ ] Integrate weather layer switching (Wind, Gusts, Waves, Current, Thunderstorm)

### Out of Scope

- Automatic weather routing optimization — manual route plotting preferred for control
- Boat polar integration — user speed input more practical than theoretical polars
- Tidal data integration — focus on wind and wave data available in Windy
- Integration with existing Windy route planner — build standalone interface instead

## v2 Requirements

Deferred to future release after v1 validation complete.

### Analysis Features

- **ANAL-01**: Display sailing angle percentages (upwind/reaching/downwind time) per route
- **ANAL-02**: Add "motoring" detection when boat speed forecasted below user-defined threshold
- **ANAL-03**: Track total forecasted motoring time across entire route
- **ANAL-04**: Enable comparison of multiple routes and/or departure times
- **ANAL-05**: Support route optimization suggestions based on departure timing

## Context

**Sailing Background:**
- Used for passage planning on a liveaboard sailing vessel
- Routes range from short Caribbean island hops (few hours) to major ocean passages (weeks)
- Current workflow uses Windy's measure&plan tool plus manual AWA estimation
- Need to validate core apparent wind calculations before building complex features

**Technical Environment:**
- Windy.com plugin system using Svelte + TypeScript
- Leaflet 1.4.x mapping library with full weather data API access
- Client-side execution using user's Windy account/subscription
- Access to all weather models based on user's subscription level (GFS free, ECMWF with premium)

**User Experience:**
- Boat typically does "half wind speed" as rule of thumb
- Downwind legs: 7-8 knots, upwind motoring: 4 knots
- Speed estimates based on sailor experience and forecasted conditions
- AWA/AWS critical for sail selection decisions along each leg

## Constraints

- **Tech Stack**: Must use Windy's Svelte + TypeScript plugin framework
- **UI Layout**: Right pane interface with vertical scrolling design
- **Data Access**: Limited to user's Windy subscription level and available weather layers
- **Performance**: Complex calculations must run efficiently in browser
- **Platform**: Web-first implementation (mobile compatibility via same codebase)
- **Validation First**: Prove core calculations work before building advanced UI features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Validation-first approach | Prove AWS/AWA calculations and data access before building complex features | — Pending |
| Custom route planner interface | Full control over sailing-specific features vs integration complexity | — Pending |
| Manual speed input per leg | User experience beats theoretical polars for real-world sailing | — Pending |
| Right pane with vertical scrolling | Better for detailed route data than bottom timeline | — Pending |

---
*Last updated: 2026-03-01 after initialization*