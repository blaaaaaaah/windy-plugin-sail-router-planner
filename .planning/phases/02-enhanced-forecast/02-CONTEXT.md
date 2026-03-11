# Phase 2: Enhanced Forecast & Interaction - Context

## Phase Goal
Transform the basic forecast table into a comprehensive sailing planning tool with timeline interaction and detailed sailing metrics.

## User Story
As a sailor planning a route, I want to:
- Scrub through time to see how conditions change along my route
- Edit departure time and leg speeds to optimize my passage
- See comprehensive sailing data (passage time, wind statistics)
- Toggle between true and apparent wind data
- Understand wave conditions including period data
- Visualize my progress along the route during time scrubbing

## Current State Analysis
**What works well:**
- ✅ Basic route creation and editing
- ✅ Weather data retrieval from Windy API
- ✅ Forecast table with basic weather display
- ✅ Apparent wind calculations
- ✅ Color-coded weather visualization

**What needs enhancement:**
- ⚠️ Static forecast table (no time scrubbing)
- ⚠️ Fixed departure time and leg speeds
- ⚠️ Limited sailing-specific metrics
- ⚠️ Missing wave period data
- ⚠️ No route progress visualization
- ⚠️ Only true wind displayed

## Key Features to Implement
Based on user requirements and PredictWind analysis:

**Timeline Interaction:**
1. **Timeline scrubber** - Left-side slider for forecast table navigation
2. **Route progress indicator** - Show boat position during time scrub
3. **Editable departure time** - Inline editing with immediate forecast updates
4. **Editable leg speeds** - Per-leg speed adjustment with forecast recalculation

**Enhanced Forecast Data:**
5. **Wave period** - Add to existing wave height data
6. **Wind statistics** - Min/Max/Average wind speeds per leg
7. **True/apparent wind toggle** - Switch data display mode
8. **Passage time calculations** - Total time per leg and route

**OUT OF SCOPE (for later phases):**
- Motoring time calculations (requires boat polar data)
- Multiple departure times comparison (Phase 3: Multi-Route)
- Weather model averaging (not needed)
- Sailing performance calculations (requires boat polar data)

## Technical Considerations
**Timeline Implementation:**
- Left-side timeline slider for forecast table
- Synchronized with route progress visualization
- Smooth scrubbing performance

**Data Enhancement:**
- Wave period integration (extend WeatherTypes)
- Wind statistics aggregation across forecast periods
- True/apparent calculations for all wind data

**UI/UX Priorities:**
- Editable fields with immediate updates
- True/apparent wind toggle affecting all data display
- Mobile-responsive design for timeline interaction

## Dependencies
- **Weather Data**: Extend WeatherTypes to include wave period
- **Navigation Utils**: Add wind statistics calculation functions
- **Timeline Component**: New interactive component for time scrubbing
- **Route Progress**: Visual indicator showing boat position during scrub

## Success Metrics
1. User can scrub through 24-48 hours of forecast data smoothly
2. Departure time changes update forecast in <2 seconds
3. True/apparent toggle shows meaningful differences
4. Route progress visualization is intuitive and accurate
5. Wave period data is displayed alongside wave height

---
*Phase 2 Context - Focused scope for immediate value*