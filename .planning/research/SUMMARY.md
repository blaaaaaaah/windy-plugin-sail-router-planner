# Research Summary: Windy Sailing Route Planning Plugin

**Project:** Windy plugin for sailing route planning with apparent wind calculations
**Research Completed:** 2026-03-02

## Executive Summary

The research reveals that successful sailing route planning tools follow a well-established pattern: replicate familiar weather interfaces (like Windy's Measure&Plan) while adding sailing-specific calculations. The recommended approach is to build within Windy's plugin framework using Svelte 5, leveraging Windy's existing weather data APIs and map infrastructure, while adding enhanced forecast tables with apparent wind calculations.

The key technical insight is that apparent wind calculations (AWS/AWA) represent the primary sailing differentiator - this is what transforms a generic weather tool into valuable sailing guidance for sail selection and course planning. However, these calculations require reliable weather data and route geometry as prerequisites, making weather data access and basic routing the critical foundation.

Critical risk mitigation centers on avoiding over-engineering GPS integration and apparent wind calculations. The most successful sailing apps keep GPS simple (position display only) and use proven sailing physics libraries rather than custom vector math. Weather data should leverage Windy's existing interpolation methods rather than rebuilding from scratch.

## Key Findings

### From STACK.md (Technology)
- **Svelte 5 + TypeScript**: Required by Windy plugin framework, provides superior state management with Runes
- **@gml/truewind library**: Battle-tested sailing calculations, handles AWS/AWA edge cases with TypeScript support
- **Windy's existing APIs**: Weather interpolation, store management, map integration already available
- **Turf.js for geospatial math**: Great circle distance, bearing calculations for route planning
- **Critical version constraints**: Leaflet 1.4.x (not latest), must work within Windy's sandbox

### From FEATURES.md (Product Requirements)
- **Table stakes**: Route plotting, standard weather data (wind/gusts/waves/current/rain), distance/time calculations, departure time control
- **Differentiators**: Basic AWS/AWA calculations, hourly weather along route, multi-route comparison, time scrubbing with boat positions
- **Explicit exclusions**: Automatic routing, polar performance, complex sailing calculations, real-time instrument integration
- **MVP Priority**: Route plotting → Weather data → AWS/AWA calculations → Enhanced forecast table → Time scrubbing

### From ARCHITECTURE.md (Implementation)
- **Plugin Extension Pattern**: Build sailing interface similar to Measure&Plan within Windy framework
- **Enhanced Forecast Table**: All standard Measure&Plan data PLUS sailing-specific AWS/AWA columns
- **Time-Based Weather Interpolation**: Use Windy's existing method (research needed on exact API)
- **Multi-Route State Management**: 4-5 routes maximum with synchronized time scrubbing
- **Performance Constraints**: 10-15 waypoints per route, browser-based calculations only

### From PITFALLS.md (Risk Prevention)
- **Critical pitfalls**: Over-engineering GPS (keep simple), incorrect AWS/AWA vector math (use proven libraries), performance degradation (implement limits), fighting Windy's framework (follow patterns)
- **Weather data risks**: Inefficient API usage, interpolation artifacts, missing dangerous conditions
- **Safety considerations**: Never present uncertain positions as authoritative, conservative bias in weather interpretation
- **Domain-specific warnings**: Apparent wind calculation errors lead to poor sail selection, weather interpolation failures can miss critical conditions

## Implications for Roadmap

Based on the corrected technical priorities, the research supports this phase structure:

### Phase 1: Technical Foundation Validation (2-3 months)
**Rationale**: Must prove core technical feasibility before building user features

**Deliverables**:
- Weather data access from Windy APIs (replicate Measure&Plan's data sources)
- ForecastTable population with ALL standard Measure&Plan data (wind, gusts, waves, current, rain)
- Basic AWS/AWA calculations using @gml/truewind library
- Enhanced table display showing both standard and sailing-specific columns

**Critical Validation**: Can we reliably get weather data and perform sailing calculations within Windy's framework?

**Features from FEATURES.md**: Standard weather data display, basic AWS/AWA calculations, distance/bearing calculations

**Pitfalls to Avoid**: Weather data API misuse, incorrect AWS/AWA vector math, fighting Windy's plugin framework

### Phase 2: Route Planning Interface (1-2 months)
**Rationale**: Build familiar route creation interface after proving weather integration works

**Deliverables**:
- Route plotting by clicking map (similar to Measure&Plan UX)
- Individual leg speeds configuration
- Departure time control
- Route persistence (local storage)
- Basic route validation (waypoint limits)

**Features from FEATURES.md**: Route plotting, departure time control, multiple speed settings, route persistence

**Pitfalls to Avoid**: Performance degradation with route complexity, over-engineering route editing

### Phase 3: Enhanced Planning Features (2-3 months)
**Rationale**: Add value-add features after core functionality proven

**Deliverables**:
- Time scrubbing with boat position updates
- Multi-route comparison (4-5 routes maximum)
- GPS position display (simple white dot)
- Safety warnings (thresholds for gusts, waves, cape index)
- Weather layer synchronization (click table rows to switch layers)

**Features from FEATURES.md**: Time scrubbing, multi-route comparison, GPS position display, safety warnings, weather layer synchronization

**Pitfalls to Avoid**: Over-engineering GPS integration, performance problems with multiple routes

### Phase 4: Polish & Optimization (1 month)
**Rationale**: Performance optimization and user experience refinement

**Deliverables**:
- Performance optimization for maximum route complexity
- Advanced safety warnings
- UI/UX refinements based on testing feedback
- Documentation and deployment preparation

**Features from FEATURES.md**: Performance optimization items from complexity analysis

## Research Flags

**Phases Needing Deep Research**:
- **Phase 1**: How exactly does Windy's Measure&Plan access weather data? Need to study the API/method for hourly interpolated data
- **Phase 3**: GPS integration patterns - research SignalK/PredictWind local API connection methods

**Phases with Well-Documented Patterns**:
- **Phase 2**: Route plotting follows standard Leaflet patterns, well-documented in sailing apps
- **Phase 4**: Standard optimization and polish work, no domain-specific research needed

**Critical Research Gaps to Address**:
1. **Windy's weather API specifics**: How does Measure&Plan get hourly weather data? (High priority for Phase 1)
2. **Exact store integration patterns**: How to properly integrate with Windy's existing state management? (Medium priority)
3. **Plugin performance limits**: What are realistic calculation limits within browser environment? (Medium priority)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Well-researched libraries and framework requirements |
| Features | HIGH | Clear differentiation between table stakes and value-adds |
| Architecture | MEDIUM | Core patterns identified, some Windy API specifics need research |
| Pitfalls | HIGH | Extensive domain knowledge from sailing software analysis |

**Overall Confidence**: MEDIUM-HIGH

**Remaining Gaps**:
- Windy's exact weather data API for plugins
- Performance characteristics of browser-based sailing calculations
- Optimal state management patterns for Windy plugin integration

## Sources

**High Confidence Sources**:
- Windy Plugin Documentation and API references
- @gml/truewind and Turf.js official documentation
- Svelte 5 Runes state management patterns
- Sailing software user feedback and reviews (2025)
- Marine electronics wind calculation specifications

**Medium Confidence Sources**:
- Windy's internal Measure&Plan implementation details
- Plugin framework performance characteristics
- Sailing app architecture patterns

**Research Required**:
- Exact Windy weather data access methods for plugins
- Windy store integration patterns for plugins
- Performance limits for browser-based sailing calculations

---

**Ready for Requirements**: Research synthesis complete. Roadmapper can proceed with requirements definition based on Phase 1 technical foundation priorities.