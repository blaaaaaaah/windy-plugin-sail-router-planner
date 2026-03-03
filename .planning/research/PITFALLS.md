# Development Pitfalls: Sailing Route Planning

**Domain:** Browser-based sailing route planning software
**Researched:** 2026-03-02
**Focus:** Windy plugin development pitfalls and prevention

## Plugin Development Specific Pitfalls

### Pitfall 1: Over-Engineering GPS Integration
**What goes wrong:** Complex GPS streaming causing performance issues and bugs
**Why it happens:** Treating GPS as core feature instead of simple position display
**Prevention:**
- Simple polling every 1 minute for position dot
- GPS is just a white dot - keep it simple
- Graceful degradation when GPS unavailable
- Focus on route planning, not real-time navigation
**Detection:** GPS code taking more lines than route planning code

### Pitfall 2: Incorrect AWS/AWA Vector Math
**What goes wrong:** Wrong apparent wind calculations leading to poor sail selection guidance
**Why it happens:** Mixing radians/degrees, incorrect vector math, edge case handling
**Prevention:**
- Use well-tested sailing physics formulas
- Test with extreme wind angles (0°, 90°, 180°)
- Show ranges instead of false precision
- Validate against known wind scenarios
**Detection:** AWS >150% of true wind, AWA >180°, calculations failing at wind boundaries

### Pitfall 3: Performance Degradation with Route Complexity
**What goes wrong:** UI becomes unresponsive with multiple routes or many waypoints
**Why it happens:** Real-time calculations without throttling, no complexity limits
**Prevention:**
- Implement realistic limits (10-15 waypoints, 4-5 routes)
- Lazy calculation - only compute when route changes
- Cache calculations aggressively
- Clean up deleted routes from state
**Detection:** Browser lag during route manipulation, memory usage growing

### Pitfall 4: Fighting Windy's Plugin Framework
**What goes wrong:** Complex workarounds instead of working with Windy's systems
**Why it happens:** Not understanding Windy's existing patterns and APIs
**Prevention:**
- Follow Windy plugin documentation closely
- Use Windy's existing stores and APIs
- Replicate familiar UI patterns (Measure&Plan)
- Accept framework constraints (Leaflet 1.4.x)
**Detection:** Complex workarounds, plugin breaking with Windy updates

### Pitfall 5: Weather Data API Misuse
**What goes wrong:** Inefficient weather API usage causing poor performance
**Why it happens:** Not using Windy's existing interpolation, excessive API calls
**Prevention:**
- Study how Windy's Measure&Plan handles weather data
- Use existing Windy interpolation methods
- Cache aggressively, fetch minimally
- Batch weather data requests
**Detection:** Network requests on every user interaction, slow time scrubbing

### Pitfall 6: Time Handling Complexity
**What goes wrong:** Incorrect time calculations leading to wrong departure timing
**Why it happens:** Mixing UTC and local time, over-engineering DST handling
**Prevention:**
- Use user's current timezone only
- Store departure times as absolute timestamps
- Don't over-engineer DST - hour variance acceptable
- Use proven date libraries (date-fns)
**Detection:** Departure times shifting unexpectedly, weather data at wrong times

## General Sailing Software Pitfalls

### Pitfall 1: Dangerous Over-reliance on Automated Routing
**What goes wrong:** Software suggests routes through dangerous shallows, lee shores, or hazardous areas
**Why it happens:** Routing algorithms are too ambitious in extrapolating from GRIB files; programming sophistication has outstripped seamanship knowledge
**Consequences:** Grounding, collision with hazards, putting crew in extreme danger
**Prevention:**
- Always verify routes manually against charts
- Apply local knowledge and seamanship judgment
- Use routing as advisor, not captain
- Build in safety margins for depth, clearance from hazards
**Detection:** Routes that pass within meters of hazards, cut through shallow areas, or suggest improbable direct lines

### Pitfall 2: Apparent Wind Calculation Errors
**What goes wrong:** Incorrect AWS/AWA calculations lead to poor sail selection and routing decisions
**Why it happens:**
- Failure to account for current setting boat off course (COG ≠ heading)
- Heel angle corrections ignored
- Wind shear between water surface and masthead not considered
- Upwash from sails distorting airflow around instruments
**Consequences:** Suboptimal performance, dangerous sail configurations, routing inefficiency
**Prevention:**
- Use Course Over Ground (COG) not heading for calculations when current present
- Implement proper vector mathematics with trigonometric corrections
- Calibrate wind instruments regularly
- Account for heel angle in calculations
**Detection:** Unexplained routing errors attributed to "tide", AWS/AWA readings that don't match observed conditions

### Pitfall 3: Weather Data Interpolation Failures
**What goes wrong:** Linear interpolation creates artificial weather artifacts; temporal/spatial smoothing removes critical weather features
**Why it happens:**
- GRIB data has limited spatial/temporal resolution
- Linear interpolation between grid points is inappropriate for weather systems
- Weather fronts and discontinuities get smoothed out
**Consequences:** Missing dangerous weather conditions, poor route optimization, safety risks
**Prevention:**
- Use highest resolution GRIB data available
- Understand data source resolution and limitations
- Cross-reference with human-interpreted forecasts
- Never rely solely on interpolated data for critical decisions
**Detection:** Weather displays that show unrealistic smooth gradients across weather fronts

## Moderate Pitfalls

### Pitfall 4: GPS Accuracy Overconfidence
**What goes wrong:** Assuming GPS is always accurate to advertised precision
**Why it happens:** Not accounting for multipath errors, satellite geometry, atmospheric conditions, timing synchronization
**Prevention:**
- Expect 3-5m accuracy in real conditions, not laboratory specs
- Account for multipath interference near structures/cliffs
- Use WAAS correction when available
- Cross-reference with other positioning methods
**Detection:** Position jumps, inconsistent track records, positions on land/obstacles

### Pitfall 5: Performance Problems from Complex Calculations
**What goes wrong:** Route planning becomes too slow to be practical, especially for longer passages
**Why it happens:**
- Inefficient algorithms for weather routing optimization
- Too high resolution without user control
- Poor caching of weather data
- Excessive real-time recalculation
**Prevention:**
- Implement progressive detail levels
- Cache and reuse weather data appropriately
- Provide user control over calculation complexity
- Use background processing for long calculations
**Detection:** App becomes unresponsive during route calculation, excessive battery drain

### Pitfall 6: Tidal Data Integration Failures
**What goes wrong:** Routing ignores tidal effects or uses inaccurate tidal predictions
**Why it happens:**
- Tidal data treated as optional add-on
- Using historical averages instead of real-time predictions
- Hidden costs make users avoid tidal features
**Prevention:**
- Integrate tidal data as core routing parameter
- Use official tidal predictions, not approximations
- Make tidal considerations transparent in UI
**Detection:** Routes that fight tide unnecessarily, arrival times that don't account for tidal delays

## Minor Pitfalls

### Pitfall 7: Chart Display Auto-Detail Issues
**What goes wrong:** Critical navigation information disappears at inappropriate zoom levels
**Why it happens:** Aggressive simplification algorithms remove essential data too early
**Prevention:** Conservative approach to detail removal, user control over information density
**Detection:** Depth soundings disappear when planning 2-3 miles ahead

### Pitfall 8: Inconsistent Wind Instrument Integration
**What goes wrong:** Multiple sources of wind data create confusion and calculation errors
**Why it happens:** Different instruments use different reference frames and calibrations
**Prevention:** Clear data source hierarchy, consistent calibration procedures
**Detection:** Wind data that jumps between readings, conflicting apparent vs true wind

### Pitfall 9: Poor Offline Chart Management
**What goes wrong:** Critical charts unavailable when needed due to licensing or storage issues
**Why it happens:** Complex licensing restrictions, unclear download policies
**Prevention:** Clear offline capability communication, redundant chart sources
**Detection:** Charts fail to load in areas with poor connectivity

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Wind calculations | Apparent wind math errors | Implement thorough testing with known conditions |
| Weather integration | GRIB interpolation artifacts | Research proper meteorological interpolation methods |
| Route optimization | Performance vs accuracy tradeoffs | Profile algorithms with realistic datasets |
| GPS integration | Overconfidence in accuracy | Plan for 3-5m real-world accuracy |
| UI design | Too much information at once | Focus on essential info for sailing conditions |
| Chart management | Licensing and offline issues | Research chart data licensing early |

## Domain-Specific Safety Considerations

### Navigation Safety
- **Never present uncertain positions as authoritative**
- **Always maintain paper chart backup capability**
- **Provide clear indication of data age and reliability**
- **Include prominent disclaimers about routing suggestions**

### Weather Safety
- **Conservative bias in weather interpretation**
- **Clear indication when forecasts are interpolated vs actual**
- **Proper handling of forecast uncertainty/confidence**
- **Integration with official weather warnings**

### Performance vs Safety Tradeoffs
- **Route optimization should prioritize safety over speed**
- **Clear user control over risk tolerance**
- **Conservative defaults with expert override options**

## Sources

**High Confidence:**
- Yachting World sailing app reviews (2025)
- Practical Sailor route planning software analysis
- Sailing forums with extensive user feedback
- Marine electronics manufacturer documentation

**Medium Confidence:**
- Raymarine wind calculation technical docs
- NOAA GRIB file documentation
- Marine pilot GPS error analysis

**Verification needed:**
- Specific interpolation algorithms used by popular apps
- Exact accuracy specifications for consumer marine GPS
- Current licensing restrictions for chart data