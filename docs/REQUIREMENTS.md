# Windy Sailing Route Planner Plugin - Detailed Requirements

## Overview

A Windy.com plugin that provides sailing route planning with apparent wind calculations and sailing-specific analysis. The plugin extends Windy's existing Measure&Plan functionality with sailing-specific features and real-time GPS integration.

## V1 Requirements

### Weather Data & Calculations (WEATHER)
- **WEATHER-01**: Implement forecast table with hourly weather at predicted boat position
- **WEATHER-02**: Display standard Measure&Plan data (wind, gusts, waves, current, rain)

### Sailing Calculations (CALC)
- **CALC-01**: Calculate and display apparent wind angle (AWA) ranges for each route hour
- **CALC-02**: Calculate and display apparent wind speed (AWS) ranges for each route hour
- **CALC-03**: Calculate distance/bearing for route geometry and timing

### Route Management (ROUTE)
- **ROUTE-01**: Create basic routing tool extending Windy's Measure&Plan interface
- **ROUTE-02**: Support individual speed settings per route leg (default 5 knots)
- **ROUTE-03**: Enable route editing with waypoint management (2-15 points)

### Time Controls (TIME)
- **TIME-01**: Integrate departure time control with user timezone
- **TIME-02**: Implement time scrubbing with boat position updates on map

### Multi-Route Support (MULTI)
- **MULTI-01**: Support multiple routes and departure times simultaneously (4-5 maximum)
- **MULTI-02**: Display predicted boat positions (boat icons) for all routes during time scrub

### GPS Integration (GPS)
- **GPS-01**: Show real-time GPS position (white dot) from PredictWind/SignalK/TCP sources

### User Interface (UI)
- **UI-01**: Enable weather layer switching via forecast table row clicks

### Safety Features (SAFETY)
- **SAFETY-01**: Add sailing-specific safety warnings (cape index, gusts, wave conditions)

### Persistence & Configuration (PERSIST/CONFIG)
- **PERSIST-01**: Implement route persistence (favorites) via local storage
- **CONFIG-01**: Add settings panel for default speeds and GPS source configuration

## User Workflow

### Initial State
- User starts on any regular Windy layer (Wind, Gusts, Current, Waves, etc.)
- Plugin activation enables route creation mode

### Route Creation
- User creates route by clicking points on the map
- When 2+ points are defined, the Forecast Table populates automatically
- Similar behavior to Windy's existing Measure&Plan feature

![Current Windy Measure&Plan Interface](assets/requirements/windy%20forecast%20table%20-%20route%20-%20start-finish%20times.png)
*Current Windy Measure&Plan showing route with forecast table - our plugin will extend this concept with sailing-specific features*

## Forecast Table

### Data Display
The forecast table shows weather data at the predicted boat position for each hour, computed using:
- Route geometry
- Speed settings per leg
- Departure time

### Weather Data Columns
Standard Windy Measure&Plan data:
- Wind speed
- Gusts speed
- Waves direction
- Current direction
- Rain precipitations

### Sailing-Specific Additions
- **AWS Range**: Apparent Wind Speed range (calculated estimate)
- **AWA Range**: Apparent Wind Angle range (calculated estimate)
- **Safety Warnings**:
  - Cape index > XXX (threshold TBD)
  - Gusts > XXX (threshold TBD)
  - Wave height > XXX with unfavorable wave direction relative to course

*Note: Accurate AWS/AWA calculation not possible, so ranges provided instead*

### Time Coverage
- **Before departure**: 6 hours of forecast data
- **Passage duration**: Full route timeline
- **After arrival**: 6 hours of forecast data
- **Total duration display**: Prominently shown
- **Visual duration bar**: Graphical representation across forecast table

### Data Availability
- When historical data unavailable (too far in past): Display "--" or appropriate UI feedback
- When forecast data unavailable (too far in future): Display "--" with explanation
- Clear messaging about why data is unavailable

## Time Controls

### Departure Time Settings
- **Default**: Current user time (in user's timezone), rounded to next hour
- **Interface**: Slider above forecast table (similar to Windy's Measure&Plan)
- **Range**: User can choose any time window - no artificial constraints
- **Data availability**: If no weather data available for chosen time, display accordingly but don't restrict user choice

### Time Scrubbing
- **Method**: Hover or click interaction over forecast table
- **Time Display**: Clear indication of currently selected date/hour
- **Map Integration**: Boat position updates on map to reflect scrubbed time
- **Layer Sync**: Windy's active layer shows weather for scrubbed time

## Speed Configuration

### Default Settings
- **Global default**: 5 knots
- **Per-leg customization**: Each route leg can have specific average speed

### User Interface
- Settings accessible per leg in forecast table or route interface

## Interactive Features

### Layer Control Integration
- Clicking weather data rows switches Windy layers:
  - Wind row → Wind layer
  - Gusts row → Gusts layer
  - Current row → Current layer
  - Waves row → Waves layer
  - Rain row → Rain/Thunder layer

### Map Integration
- **Real-time GPS position**: White dot shows actual current boat position (from GPS sources)
- **Predicted position indicator**: Boat icon shows calculated position on route based on:
  - Route geometry
  - Speed settings
  - Departure time
  - Currently scrubbed time
- **Multiple routes**: When multiple routes or departure times exist, show all routes and all corresponding boat icons
- Route visualization with leg information

## Multi-Route Support

### Multiple Forecast Tables
- Support for multiple routes simultaneously
- Support for same route with different departure times
- Each route gets its own forecast table

### Time Synchronization
- All forecast tables sync when scrubbing through time
- Enables comparison of different routing options
- Windy layer displays weather for scrubbed time across all routes

### Visual Display
- **All routes visible**: Multiple route lines displayed on map
- **All boat icons visible**: Each route/departure time combination shows its predicted boat position
- **Differentiation**: Routes and boat icons clearly distinguishable (colors, labels, etc.)

![Multiple Route Planning](assets/requirements/predictwind%20multi%20route.png)
*Example of multiple route visualization (PredictWind) - our plugin should support similar multi-route comparison*

## GPS Integration

### Real-time Position
- **Data Sources**: PredictWind DataHub, TCP, SignalK, etc.
- **Display**: Current boat position on map (white dot)
- **API Integration**: Use Windy's plugin API for position display

### Future Features (Out of Scope)
- Historical GPS tracks require server-side work
- Deferred to future versions

## Technical Requirements

### API Usage
- **Primary**: Windy plugin APIs only
- **Prohibited**: Direct calls to Windy servers or external APIs
- **Client-side**: All processing in browser

### Required API Identification
Need to identify Windy plugin APIs for:
1. **Weather Data**: Get forecast for specific position/time
2. **Layer Control**: Show specific layer at specific time
3. **Position Display**: Set current position marker

## Data Persistence

### Route Favorites
- Save routes to avoid recreation after browser close
- Local storage or user account integration (TBD)

## User Interface Design

### Layout Options
Two potential approaches (decision pending):
1. **Bottom Panel**: Horizontally scrolling forecast table
2. **Right Panel**: Vertically scrolling forecast table

### Current Windy Issues to Avoid
- Horizontal scroll difficulties in Measure&Plan
- Hard-to-use departure time slider
- Poor end-of-trip visibility

## Settings Panel

### Configuration Options
- **Default leg speed**: Global speed setting
- **GPS source configuration**: External position data setup (details TBD)

## V2 Features (Future)

### Passage Analysis
Following PredictWind's passage planning model:
- **Sailing angles**: % time upwind, reaching, downwind
- **Wave conditions**: % time with downwind waves
- **Wind statistics**: Max gust, average wind, lowest wind
- **Motoring time**: Track when sailing speed insufficient

![Passage Analysis Table](assets/requirements/predictwind%20overview%20table.png)
*PredictWind's passage analysis showing departure time comparison with sailing statistics - target for V2 features*

### Motoring Detection
- Checkbox per leg to mark as "motoring"
- Automatic detection based on speed thresholds

## Technical Constraints

- **Framework**: Windy's Svelte + TypeScript plugin system
- **Map Library**: Leaflet 1.4.x
- **Performance**: Browser-based calculations must be efficient
- **Data Access**: Limited to user's Windy subscription level

## Success Criteria

1. **Core functionality**: Route creation and weather forecasting work reliably
2. **Sailing calculations**: AWS/AWA ranges provide useful estimates
3. **Time scrubbing**: Smooth, responsive time navigation
4. **GPS integration**: Real-time position display functional
5. **UI responsiveness**: No lag during route manipulation or time scrubbing
6. **Multi-route support**: Clear visualization of multiple routes and predicted positions

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WEATHER-01 | Phase 1 | Complete (01-01) |
| WEATHER-02 | Phase 1 | Complete (01-01) |
| CALC-01 | Phase 1 | Pending |
| CALC-02 | Phase 1 | Pending |
| CALC-03 | Phase 1 | Pending |
| ROUTE-01 | Phase 2 | Pending |
| ROUTE-02 | Phase 2 | Pending |
| ROUTE-03 | Phase 2 | Pending |
| TIME-01 | Phase 2 | Pending |
| TIME-02 | Phase 3 | Pending |
| MULTI-01 | Phase 3 | Pending |
| MULTI-02 | Phase 3 | Pending |
| GPS-01 | Phase 3 | Pending |
| UI-01 | Phase 3 | Pending |
| SAFETY-01 | Phase 3 | Pending |
| PERSIST-01 | Phase 4 | Pending |
| CONFIG-01 | Phase 4 | Pending |

---

*Requirements document v1.1 - Updated: 2026-03-02 with structured requirements and phase mapping*