# Codebase Structure

**Analysis Date:** 2026-03-02

## Directory Layout

```
windy-sailing-plugin/
├── src/                    # Main plugin source code
│   ├── plugin/             # Windy plugin integration
│   ├── components/         # Svelte UI components
│   ├── routes/             # Route planning logic
│   ├── sailing/            # Sailing calculations
│   ├── forecast/           # Weather data processing
│   ├── gps/                # GPS integration
│   ├── models/             # Data models and types
│   ├── utils/              # Helper utilities
│   └── index.ts            # Plugin entry point
├── assets/                 # Static assets and documentation
│   └── requirements/       # Requirement reference images
├── tests/                  # Test files (planned)
├── dist/                   # Built plugin files (generated)
├── .planning/              # Project planning documents
│   ├── codebase/          # Technical documentation
│   └── research/          # Requirements analysis
└── config/                 # Build and development config
```

## Directory Purposes

**src/plugin/:**
- Purpose: Windy platform integration and plugin registration
- Contains: Plugin manifest, API bridges, platform initialization
- Key files: `WindyIntegration.ts`, `PluginManifest.ts`

**src/components/:**
- Purpose: Svelte UI components for sailing interface
- Contains: Forecast table, route editor, time controls, multi-route display
- Key files: `ForecastTable.svelte`, `RouteEditor.svelte`, `TimeSlider.svelte`, `MultiRoutePanel.svelte`

**src/routes/:**
- Purpose: Route planning and management logic
- Contains: Route creation, editing, storage, multi-route comparison
- Key files: `RouteManager.ts`, `RouteLeg.ts`, `RouteStorage.ts`

**src/sailing/:**
- Purpose: Sailing-specific calculations and analysis
- Contains: AWS/AWA calculations, safety warnings, course analysis
- Key files: `ApparentWindCalculator.ts`, `SafetyAnalyzer.ts`, `SailingPerformance.ts`

**src/forecast/:**
- Purpose: Weather data processing and timeline management
- Contains: Weather fetching, time interpolation, forecast synchronization
- Key files: `WeatherService.ts`, `TimelineManager.ts`, `ForecastCalculator.ts`

**src/gps/:**
- Purpose: Real-time GPS position integration
- Contains: PredictWind DataHub, SignalK, TCP connection handlers
- Key files: `GPSService.ts`, `PredictWindConnector.ts`, `SignalKConnector.ts`

**src/models/:**
- Purpose: TypeScript interfaces and data structures
- Contains: Route definitions, weather data types, GPS models, sailing types
- Key files: `Route.ts`, `ForecastPoint.ts`, `GPSPosition.ts`, `SailingTypes.ts`

**src/utils/:**
- Purpose: Shared utility functions
- Contains: Math helpers, time formatting, unit conversions, coordinate calculations
- Key files: `SailingMath.ts`, `TimeUtils.ts`, `GeoUtils.ts`, `UnitConverter.ts`

**tests/:**
- Purpose: Test files matching source structure
- Contains: Unit tests for sailing calculations, integration tests for components
- Key files: Mirrors of source directory structure

## Key File Locations

**Entry Points:**
- `src/index.ts`: Plugin registration and dependency injection
- `src/plugin/PluginBootstrap.ts`: Windy platform initialization
- `src/components/SailingPlannerMain.svelte`: Root UI component

**Configuration:**
- `plugin.json`: Windy plugin manifest with capabilities declaration
- `tsconfig.json`: TypeScript configuration with tab indentation
- `package.json`: Dependencies and build scripts
- `webpack.config.js` or `vite.config.js`: Build configuration

**Core Logic:**
- `src/plugin/WindyWeatherAPI.ts`: Windy weather data access
- `src/routes/RouteCalculator.ts`: Route timing and position calculations
- `src/sailing/ApparentWindCalculator.ts`: AWS/AWA range calculations
- `src/forecast/TimelineManager.ts`: Multi-route time synchronization

**Testing:**
- `tests/sailing/`: Sailing calculation tests (critical for accuracy)
- `tests/routes/`: Route planning logic tests
- `tests/components/`: UI component tests

## Naming Conventions

**Files:**
- PascalCase for classes/components: `ForecastTable.svelte`, `RouteCalculator.ts`
- camelCase for utilities: `sailingMath.ts`, `timeUtils.ts`
- kebab-case for build artifacts: `plugin-manifest.json`

**Directories:**
- lowercase with purpose clarity: `components`, `sailing`, `forecast`, `gps`

**Components:**
- PascalCase with descriptive names: `MultiRouteForecastTable.svelte`
- Clear purpose indication: `TimeSlider.svelte`, `RouteEditor.svelte`

**Services:**
- PascalCase with Service/Manager suffix: `WeatherService.ts`, `TimelineManager.ts`

**Models:**
- PascalCase interfaces: `Route.ts`, `ForecastPoint.ts`, `SailingData.ts`

## Where to Add New Code

**New Sailing Feature:**
- Business logic: `src/sailing/` for calculations
- Route integration: `src/routes/` for route-specific features
- UI component: `src/components/`
- Tests: `tests/sailing/`, `tests/components/`

**New Weather Data Source:**
- Service layer: `src/forecast/WeatherService.ts` (extend existing)
- Models: `src/models/WeatherTypes.ts` (extend interfaces)
- API integration: `src/plugin/` for Windy-specific access

**New GPS Data Source:**
- Connector: `src/gps/{SourceName}Connector.ts`
- Service extension: `src/gps/GPSService.ts`
- Position models: `src/models/GPSPosition.ts`

**New UI Component:**
- Implementation: `src/components/{FeatureName}.svelte`
- Styling: Component-scoped CSS within `.svelte` file
- Tests: `tests/components/{FeatureName}.test.ts`

**New Route Feature:**
- Route logic: `src/routes/`
- Calculation utilities: `src/utils/` for reusable math
- Model extensions: `src/models/Route.ts`

**Performance Optimization:**
- Calculation caching: `src/utils/CacheManager.ts`
- Data streaming: `src/utils/DataStreams.ts`
- Memory management: `src/utils/ResourceManager.ts`

## Special Directories

**.planning/codebase/:**
- Purpose: Technical documentation for development
- Generated: Yes (by GSD system)
- Committed: Yes

**assets/requirements/:**
- Purpose: Reference images and requirement documentation
- Generated: No
- Committed: Yes

**dist/:**
- Purpose: Built plugin files for Windy platform
- Generated: Yes (by build process)
- Committed: No

**.claude/:**
- Purpose: AI development tools and agents
- Generated: Yes
- Committed: Yes

**config/:**
- Purpose: Build tools, linting, and development configuration
- Generated: Mixed
- Committed: Yes

## File Organization Principles

**Layer-based grouping:** Code organized by architectural layer (plugin, routes, sailing, etc.)
**Feature cohesion:** Related functionality grouped together within layers
**Clear dependencies:** Import paths reflect architectural dependencies
**Test mirroring:** Test structure exactly matches source structure
**Windy compliance:** Follows Windy plugin development conventions
**Performance-aware:** Structure supports efficient loading and caching

---

*Structure analysis: 2026-03-02*