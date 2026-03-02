# Feature Landscape

**Domain:** Sailing Route Planning and Marine Navigation Tools
**Researched:** 2026-03-02

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Basic route plotting | Every marine navigation app has waypoint-to-waypoint routing | Low | Click-to-add waypoints with distance/bearing display |
| Weather forecast integration | Without weather data, route planning is meaningless for sailors | Medium | GFS/ECMWF data access, 16-day forecast standard |
| Wind data overlay | "Essential for sail planning decisions" - fundamental for sailing | Medium | Wind barbs/arrows overlaid on route with speed/direction |
| Apparent Wind Angle (AWA) calculation | "We sail in apparent wind" - critical for sail trim decisions | High | Complex vector calculations based on boat speed, course, wind |
| Apparent Wind Speed (AWS) calculation | Required for sail selection and performance optimization | High | Dynamic calculation as conditions change along route |
| GPS tracking and positioning | Must show boat position accurately (more accurate than Google Maps) | Low | Real-time position display on chart |
| Distance/bearing calculations | Basic navigation measurements expected | Low | Click to measure between any two points |
| Offline chart capability | Internet unreliable offshore, essential safety feature | Medium | Download charts for offline use |
| Route distance/time calculation | Users expect ETA and total distance for passage planning | Low | Standard great circle calculations with speed inputs |
| Tidal information | Critical for shallow water navigation and timing | Medium | Local tidal data integration, "indicative only" acceptable |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Individual leg speed settings | Real sailing varies by conditions - "half wind speed" rule varies | Medium | Per-leg speed input based on expected conditions |
| Hourly weather interpolation | Precise conditions at exact boat position/time along route | High | Weather evolution along route timeline vs per-leg averages |
| Multiple weather model comparison | Better forecast accuracy through model consensus | High | ECMWF, GFS, proprietary models side-by-side like PredictWind |
| Ensemble weather routing | Multiple route scenarios with different models/conditions | High | Shows range of possible outcomes for better decisions |
| Real-time instrument integration | Professional-grade onboard system connectivity | High | NMEA 0183/2000, AIS, radar integration like Expedition |
| Comfort criteria customization | Routes avoid conditions beyond crew limits | Medium | Max wind speed, wave height, sailing angle limits |
| Sailing angle analysis | Percentage time upwind/reaching/downwind per route | Medium | AWA-based categorization with performance insights |
| Motoring detection and tracking | Alert when boat speed below user-defined threshold | Low | Threshold-based detection with total motoring time |
| Polar performance integration | Optimize routes based on boat-specific performance curves | High | Custom polar diagrams, 160+ boat types like SailGrib |
| Departure time optimization | Find optimal launch windows based on weather evolution | High | Multi-dimensional optimization across time and routes |
| Advanced wave analysis | 3D hydrodynamic modeling for hull-specific wave interactions | High | PredictWind-style roll, acceleration, slamming predictions |
| Professional racing features | Laylines, start line tools, tactical displays | High | Expedition-level functionality for competitive sailing |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Fully automated routing | "Sailors want control over route decisions" - routing tools are advisors, not captains | Manual route plotting with weather guidance |
| Theoretical polar optimization | Real sailing conditions vary from polars, user experience beats theory | User speed input based on sailing experience |
| Complex instrument calibration | Too technical for typical users, can cause dangerous misconfiguration | Simple speed/course input interface |
| Automatic sail recommendations | Highly boat-specific and crew preference dependent | Display AWA/AWS data, let sailors choose sail configuration |
| Social media integration | Navigation safety focus incompatible with social features | Keep community features strictly local knowledge focused |
| Over-reliance on technology automation | "Trust the data, but sail with judgment" - tech failures at sea | Always provide manual overrides and backup options |
| Subscription feature gating | Marine safety tools shouldn't paywall critical navigation features | All-inclusive pricing or core features free |
| Complex multi-screen workflows | Marine environment requires simple, focused interfaces | Single-screen workflow with clear information hierarchy |
| Desktop-only interface | Modern sailors expect mobile-first accessibility | Mobile/tablet compatibility is primary consideration |

## Feature Dependencies

```
Weather data access → All wind calculations
Weather data access → Route weather evolution
Weather data access → Departure time optimization

Route plotting → Distance/time calculations
Route plotting → Apparent wind calculations
Route plotting → Sailing angle analysis

Individual leg speeds → Apparent wind calculations
Individual leg speeds → Motoring detection
Individual leg speeds → Realistic ETAs

GPS integration → Real-time position display
GPS integration → Route progress tracking
GPS integration → Course deviation alerts

Chart data → Route plotting
Chart data → Navigation safety
Chart data → Offline functionality

Apparent wind calculations → Sailing angle analysis
Apparent wind calculations → Performance optimization
Apparent wind calculations → Sail selection guidance

Weather model access → Model comparison
Weather model access → Ensemble routing
Weather model access → Forecast accuracy validation

Boat speed input → Apparent wind calculations (critical dependency)
Boat heading/course → Apparent wind calculations (critical dependency)
```

## MVP Recommendation

Prioritize:
1. **Basic route plotting** - Foundation for all other features (table stakes)
2. **Weather forecast integration** - Essential for any sailing route planning (table stakes)
3. **Apparent Wind Angle/Speed calculations** - Core differentiating value proposition
4. **Individual leg speed settings** - Enables realistic passage planning
5. **Wind data overlay** - Table stakes for marine apps

Defer:
- **Multiple weather model comparison**: Complex feature, validate core AWA/AWS calculations first
- **Tidal current integration**: High complexity, limited geographic applicability - Phase 2
- **Real-time GPS integration**: Important but can be added after core validation - Phase 2
- **Professional racing features**: Narrow use case, focus on cruising first - Phase 3
- **Advanced wave analysis**: Requires extensive validation - Phase 3

## Complexity Analysis Based on Industry Research

**High Complexity (6+ months):**
- Apparent wind calculations with real weather data (vector math + weather interpolation)
- Multiple weather model integration (data handling + UI complexity)
- Professional instrument integration (NMEA protocols + real-time data)
- Polar performance optimization (complex algorithms + extensive testing)
- Ensemble weather routing (computational intensive + multiple data sources)

**Medium Complexity (2-4 months):**
- Weather forecast integration (API integration + data visualization)
- Hourly weather interpolation (time-based calculations)
- Comfort criteria customization (constraint handling)
- Real-time GPS integration (data streaming + UI updates)
- Offline chart capability (data caching + sync)

**Low Complexity (< 1 month):**
- Basic route planning (standard mapping interactions)
- Distance/bearing calculations (basic navigation math)
- GPS positioning display (standard mapping feature)
- Motoring detection (threshold-based logic)
- Simple weather overlays (data visualization)

## Critical Pitfalls Identified

**Apparent Wind Calculation Complexity**: Research shows AWA/AWS calculations are fundamental but complex. "The instruments on the boat give you the exact apparent wind angle and speed because this is what it actually sees" - must validate calculations against real instrument data.

**Weather Model Limitations**: "Follow the rule of thirds for fuel management" - weather routing tools are advisors, not mandatory courses. Users must retain control and judgment.

**Over-Engineering Risk**: Expedition at $1,295 vs SailGrib delivering "nearly identical" routing results at fraction of cost. Focus on core functionality over feature bloat.

**Platform Fragmentation**: "Not one app delivers it all" - focus on specific sailing use case rather than trying to be everything to everyone.

## Phase Structure Implications

**Phase 1 (Core Validation - 3-4 months):**
- Route plotting with waypoints
- Basic weather data integration
- Individual leg speed inputs
- AWS/AWA calculations (critical validation)
- Distance/time estimates

**Phase 2 (Enhanced Planning - 4-6 months):**
- Sailing angle analysis
- Motoring detection
- Real-time GPS integration
- Weather evolution along route
- Comfort criteria settings

**Phase 3 (Advanced Analysis - 6+ months):**
- Multi-route comparison
- Departure time optimization
- Weather model comparison
- Professional racing features
- Performance optimization tools

## Sources

**HIGH Confidence:**
- Apparent wind importance analysis - SailNet, Yachting Monthly ("We sail in apparent wind")
- Professional navigation software comparison - Yachting World (Pip Hare tests)
- Weather routing software analysis - Practical Sailor, SAIL Magazine
- Marine navigation app features 2026 - Multiple platform reviews

**MEDIUM Confidence:**
- SailGrib vs PredictWind vs Expedition feature comparison
- Weather routing pitfalls and common mistakes research
- Sailing navigation best practices - Cruising World
- Marine weather routing principles - Bowditch Navigation

**LOW Confidence (flagged for validation):**
- General sailing forum discussions on routing preferences
- Marketing materials from various navigation software vendors
- Crowdsourced feature lists requiring verification