# Feature Landscape: Sailing Route Planning

**Domain:** Browser-based sailing route planning tools
**Researched:** 2026-03-02

## Table Stakes Features

Users expect these features. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **Route plotting by clicking map** | Standard interaction in all navigation tools | Low | Click to add waypoints, drag to adjust |
| **Standard weather data display** | Core value - weather is why sailors use route planning | Medium | Wind, gusts, waves, current, rain (same as Measure&Plan) |
| **Distance and bearing calculations** | Basic navigation information expected | Low | Great circle distance between waypoints |
| **Time estimates for passage** | "When will we arrive?" - fundamental question | Low | Distance ÷ speed per leg |
| **Departure time control** | Timing is critical for sailing weather windows | Medium | Similar to Windy Measure&Plan time slider |
| **Wind speed and direction display** | Essential for any sailing weather tool | Low | True wind data from weather models |
| **Multiple speed settings** | Boat speed varies by conditions and point of sail | Low | Speed input per route leg |
| **GPS position display** | "Where am I now?" - basic safety feature | Low | White dot on map showing current position |

## Differentiating Features

Features that set the plugin apart from standard weather tools.

| Feature | Value Proposition | Complexity | Implementation Notes |
|---------|-------------------|------------|---------------------|
| **Basic Apparent Wind calculations** | Key sailing differentiator - helps with sail selection | Medium | Vector math: true wind + boat vector → AWS/AWA ranges |
| **Hourly weather along route** | More precise than per-leg averages | Medium | Use Windy's interpolation method (same as Measure&Plan) |
| **Multi-route comparison** | Compare different routing options | Medium | 4-5 routes max, synchronized time scrubbing |
| **Time scrubbing with boat positions** | See conditions at any point in passage timeline | Medium | Show predicted boat positions during scrub |
| **Safety warnings** | Alert to dangerous conditions | Low | Gust warnings, wave height, cape index thresholds |
| **Route persistence** | Save favorite routes | Low | Local storage, avoid losing work |
| **Weather layer synchronization** | Click table row to switch Windy weather layers | Low | Integration with Windy's layer system |

## Out of Scope Features

Explicitly excluded to maintain focus and simplicity.

| Feature | Why Excluded | What to Do Instead |
|---------|--------------|-------------------|
| **Automatic weather routing** | Sailors want control over route decisions | Manual route plotting with weather guidance |
| **Polar performance integration** | Complex, boat-specific, theoretical vs real conditions | User speed input based on sailing experience |
| **Advanced sailing calculations** | Leeway, VMG, true vs ground wind - unnecessary complexity | Basic AWS/AWA ranges sufficient for sail selection |
| **Real-time instrument integration** | Plugin scope - focus on planning, not real-time sailing | Simple GPS position only |
| **Tidal current integration** | Geographic limitations, added complexity | Focus on wind and waves (Windy's strength) |
| **Multiple timezone support** | Unnecessary complexity for passage planning | User's timezone only |
| **Historical weather analysis** | Planning tool, not analysis tool | Current forecast data only |
| **Social features** | Navigation safety focus incompatible with social | Keep focused on weather and routes |
| **Mobile-specific features** | Web-first, mobile compatibility via responsive design | Single codebase for all platforms |

## Feature Dependencies

```
Standard Windy Weather Data → All calculations and displays
Route Geometry → Distance/time calculations → Boat position predictions
Individual Leg Speeds → Apparent wind calculations → Time estimates
Departure Time → Weather timeline → Forecast table population
Map Integration → Route plotting → Position visualization
GPS Integration → Current position display (simple white dot)
Time Scrubbing → Synchronized boat positions → Weather layer sync

Critical Path:
Route Plotting → Weather Data → Basic AWS/AWA → Forecast Table → Time Scrubbing
```

## MVP Feature Priority

**Phase 1 - Core Validation:**
1. **Route plotting** - Foundation for all sailing features
2. **Standard weather data** - Wind, gusts, waves, current, rain (Measure&Plan equivalent)
3. **Basic AWS/AWA calculations** - Key sailing differentiator
4. **Individual leg speeds** - Enables realistic apparent wind calculations
5. **Basic forecast table** - Display weather + sailing data

**Phase 2 - Enhanced Planning:**
1. **Time scrubbing** - Navigate through forecast timeline
2. **Multi-route support** - Compare up to 4-5 routes
3. **GPS position display** - Simple white dot current position
4. **Safety warnings** - Basic threshold alerts
5. **Route persistence** - Save/load routes

**Phase 3 - Polish:**
1. **Weather layer integration** - Click table rows to switch layers
2. **Departure time optimization** - Find good weather windows
3. **Advanced warnings** - More sophisticated safety alerts
4. **Performance optimization** - Handle maximum route complexity

## Complexity Analysis

**Low Complexity (< 1 month):**
- Route plotting with waypoints
- Distance/bearing calculations
- GPS position display (white dot)
- Basic weather data display
- Simple time controls

**Medium Complexity (1-3 months):**
- Basic apparent wind calculations (vector math)
- Weather data interpolation along route
- Multi-route state management
- Time scrubbing with position updates
- Safety warning thresholds

**High Complexity (3+ months - defer to later):**
- Advanced sailing calculations (leeway, VMG)
- Performance polar integration
- Automatic weather routing
- Complex weather analysis
- Real-time instrument integration

## User Experience Patterns

### Familiar Patterns (leverage existing UX)
- **Route plotting**: Click map to add waypoints (like Windy Measure&Plan)
- **Time slider**: Departure time control (like Windy Measure&Plan)
- **Forecast table**: Hourly weather columns (like Windy Measure&Plan)
- **Weather layers**: Click to switch layers (existing Windy pattern)

### Sailing-Specific Patterns
- **AWS/AWA display**: Show as ranges (acknowledge uncertainty)
- **Speed per leg**: Individual inputs vs global speed
- **Multi-route comparison**: Synchronized time scrubbing
- **Boat position indicators**: Multiple boat icons during scrubbing

## Performance Considerations

**Realistic Limits:**
- **10-15 waypoints** per route (practical for sailing passages)
- **4-5 routes** maximum (sufficient for comparison)
- **1-minute GPS updates** (adequate for planning tool)
- **Hourly weather resolution** (matches forecast model granularity)

**Performance Optimizations:**
- Cache weather data to avoid repeated API calls
- Lazy calculation of AWS/AWA (only on route changes)
- Limit route complexity validation
- Use efficient map rendering for multiple routes

## Platform Integration

**Windy Integration Points:**
- Weather data access (same API as Measure&Plan)
- Map interaction patterns (familiar UX)
- Time controls (consistent with platform)
- Layer switching (seamless integration)

**Plugin-Specific Features:**
- Sailing calculations (AWS/AWA ranges)
- Multi-route management
- Route persistence
- GPS integration

## Success Metrics

**Core Functionality:**
- Route creation and editing works reliably
- Weather data displays accurately along routes
- AWS/AWA calculations provide useful sailing guidance
- Time scrubbing performs smoothly

**User Value:**
- Sailors can make informed sail selection decisions
- Route comparison enables better passage planning
- Departure timing optimization improves safety
- Familiar UX reduces learning curve

---
*Feature analysis for Windy sailing route planner plugin*