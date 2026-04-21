# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Reading

Before starting, read these key files in order:
1. `.planning/PROJECT.md` - Project overview and requirements
2. `docs/REQUIREMENTS.md` - Detailed V1 requirements
3. `docs/WEATHER_SERVICE_ARCHITECTURE.md` - Technical architecture
4. `README.md` - Current status and features
5. Source code in `src/*` - Understand utils functions and types

## Development Commands

```bash
# Development server (runs on https://0.0.0.0:9999)
npm start

# Production build
npm run build
npm run build:win  # Windows version

# Testing
npm test
npm run test:watch
npm run test:coverage

# Load in Windy
# Visit https://www.windy.com/developer-mode
# Load plugin: https://localhost:9999/plugin.js
```

## Architecture Overview

This is a Windy.com plugin for sailing route planning with weather forecasting, built with:

- **Frontend**: Svelte + TypeScript (Windy plugin framework)
- **Mapping**: Leaflet 1.4.x integration via Windy
- **Weather**: Windy API route planner integration
- **Style**: Tab indentation (not 2-space), follow established conventions

### Core Data Flow
```
User Interaction → RouteEditorController → WeatherForecastService → ForecastTable
Map Clicks → Route Visualization → Windy API → Weather Display
```

### File Structure
```
src/
├── plugin.svelte                     # Main UI component
├── components/
│   ├── ForecastTable.svelte         # Weather forecast display
│   ├── RouteListPanel.svelte        # Route management
│   ├── DraggableWaypointForecastTable.svelte
│   └── forecast-cells/              # Individual data cells
├── controllers/
│   └── RouteEditorController.ts     # Interactive route editing
├── services/
│   ├── WindyAPI.ts                  # Windy API wrapper
│   ├── WeatherForecastService.ts    # Forecast processing
│   ├── RouteStorage.ts              # Route persistence
│   └── ForecastTableDataSource.ts   # Table data management
├── types/
│   ├── Coordinates.ts               # Re-exports Leaflet LatLng
│   ├── RouteTypes.ts                # RouteDefinition, RouteLeg
│   └── WeatherTypes.ts              # Weather data structures
└── utils/
    ├── NavigationUtils.ts           # Sailing calculations
    ├── TimeUtils.ts                 # Date/time formatting
    ├── FormatUtils.ts               # Display formatting
    ├── ColorUtils.ts                # Route color management
    └── RouteSerializer.ts           # URL encoding/decoding
```

## Key Technical Concepts

### Sailing-Specific Features
- **Apparent Wind Calculations**: True wind + boat motion → apparent wind using vector math
- **Great Circle Navigation**: Earth-curvature-aware routing for accuracy
- **Per-Leg Weather Statistics**: Min/avg/max analysis for wind, waves, sailing angles
- **Multi-Route Support**: Compare different routes and departure times

### Weather API Integration
- Uses Windy's `/rplanner/v1/forecast/boat/` endpoint
- Always returns 67 forecast points across time window
- Per-leg API calls with individual speeds for accuracy
- Hourly consolidation of multiple forecasts

### Coordinate System
- Uses Leaflet's `LatLng` type via `Coordinates.ts`
- Course directions: 0-359° (not -180 to 180)
- Distances: Nautical miles throughout
- Wind directions: North-up for true wind, relative for apparent

## Development Guidelines

### Code Style
- **Indentation**: Tabs (not spaces)
- **TypeScript**: Strict mode, proper typing throughout
- **Utils**: Add new utilities to appropriate files in `utils/`
- **Types**: Export all types through `types/index.ts`

### Adding Utilities
When adding new utility functions:
1. Determine correct file in `utils/` directory
2. Add to appropriate existing file or create new one
3. Export through `utils/index.ts`
4. Add TypeScript types as needed

### Component Development
- Follow existing Svelte patterns in `components/`
- Use existing types from `types/` directory
- Integrate with RouteEditorController for map interactions
- Follow established naming conventions

### Weather Service Integration
- All Windy API calls go through `WindyAPI.ts`
- Weather processing in `WeatherForecastService.ts`
- Use per-leg forecasts for accuracy
- Handle 67-point API limitation with consolidation

## Testing

- Test files: `tests/` directory or `__tests__/` in `src/`
- Jest with TypeScript preset
- Coverage collection from `src/**/*.ts`
- Setup file: `tests/setupTests.ts`

## Important Notes

- **Plugin Framework**: Must use Windy's Svelte + TypeScript system
- **API Constraints**: Limited to user's Windy subscription level
- **Performance**: Browser-based calculations must be efficient
- **Navigation**: All bearing calculations normalize to 0-359°
- **Real-time Updates**: 1-minute GPS update frequency sufficient
- **Route Limits**: 10-15 waypoints, 4-5 routes maximum for performance

## Common Tasks

### Running Development Server
The server should already be running. If not:
```bash
npm start
# Access at https://0.0.0.0:9999
# Load in Windy at https://www.windy.com/developer-mode
```

### Adding New Weather Calculations
1. Add calculation logic to `NavigationUtils.ts`
2. Update weather types in `WeatherTypes.ts`
3. Integrate in `WeatherForecastService.ts`
4. Display in appropriate forecast cell component

### Route Management
- Routes created via `RouteEditorController.ts`
- Persistence handled by `RouteStorage.ts`
- URL serialization via `RouteSerializer.ts`
- Visual management in `RouteListPanel.svelte`

Don't tell me I'm right - focus on implementation and problem-solving.