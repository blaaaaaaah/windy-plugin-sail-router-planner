# Technology Stack

**Project:** Windy Sailing Route Planner Plugin
**Researched:** 2026-03-01

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Windy Plugin API | Latest | Plugin development framework | Official API with Leaflet 1.4.x integration, access to weather data layers |
| Svelte | 5.x | UI framework | Required by Windy plugin system, reactive components with TypeScript support |
| TypeScript | 5.x | Type safety | Built-in Windy plugin support, prevents runtime errors in calculations |
| Leaflet | 1.4.x | Map library | **VERIFIED: Windy uses Leaflet 1.4.x, not 1.9.4** |

### Sailing Calculations
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| geolib | 3.3.4+ | Geographic calculations | **VERIFIED: 300k+ monthly downloads, zero dependencies, battle-tested** |
| Custom AWS/AWA | N/A | Apparent wind calculations | Mathematical formulas: AWA=arctan(sin(TWA)*TWS/(BS+cos(TWA)*TWS)) |

### GPS & Marine Data Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| GPS.js | Latest | NMEA parsing | **VERIFIED: Actively maintained 2025, high-level normalized output** |
| SignalK Node.js | Latest | Marine data hub | **VERIFIED: Modern JSON-based marine data format, growing ecosystem** |
| WebSocket | Native | Real-time data streams | Browser-native, handles NMEA/SignalK data without blocking UI |

### Weather & Time Interpolation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Windy Weather API | Latest | Weather data access | Native integration with plugin system, all weather layers included |
| Everpolate | Latest | Time interpolation | **VERIFIED: Common algorithms (linear, polynomial), browser + Node.js** |
| Date-fns | 3.x | Time calculations | Lightweight, immutable, modular time utilities |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @coremarine/nmea-parser | 2.2.1+ | Alternative NMEA parsing | If GPS.js lacks specific sentence support |
| akima-interpolator | Latest | Spline interpolation | For smooth weather data interpolation curves |
| turf | 6.x+ | Advanced geospatial | Complex polygon/routing calculations beyond geolib |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| NMEA Parsing | GPS.js | nmea-simple | **GPS.js more actively maintained in 2025, higher-level API** |
| Weather API | Windy Native | PredictWind API | **VERIFIED: PredictWind has no public API (2025)** |
| Interpolation | Everpolate | Smooth.js | Everpolate more comprehensive algorithm support |
| Marine Data | SignalK | Direct NMEA TCP | SignalK provides standardized JSON format, plugin ecosystem |
| Geo Calculations | geolib | @gml/truewind | **@gml/truewind not found in current NPM ecosystem (2025)** |
| Mapping Version | Leaflet 1.4.x | Leaflet 1.9.4/2.0 | **Windy platform constraint: locked to 1.4.x** |

## Installation

```bash
# Core Windy plugin dependencies (provided by platform)
# Svelte, TypeScript, Leaflet 1.4.x are pre-configured

# Sailing calculations
npm install geolib

# GPS/Marine data integration
npm install gps
# SignalK client will be WebSocket connection, no npm package needed

# Weather interpolation
npm install everpolate date-fns

# Optional advanced features
npm install @coremarine/nmea-parser turf akima-interpolator
```

## API Integration Patterns

### Windy Module Imports
```typescript
// Weather data access
import { store } from '@windy/store';
import { map } from '@windy/map';

// Type definitions
import type { LatLon, ExternalPluginConfig } from '@windy/interfaces';
```

### Sailing Calculation Integration
```typescript
// Geographic utilities (VERIFIED)
import { getDistance, getRhumbLineBearing } from 'geolib';

// NMEA parsing (VERIFIED)
import GPS from 'gps';

// Time interpolation (VERIFIED)
import { linear, polynomial } from 'everpolate';

// Custom apparent wind calculations
function calculateApparentWind(tws: number, twa: number, boatSpeed: number) {
  const twaRad = twa * Math.PI / 180;
  const aws = Math.sqrt(Math.pow(tws * Math.sin(twaRad), 2) + Math.pow(boatSpeed + tws * Math.cos(twaRad), 2));
  const awaRad = Math.atan2(tws * Math.sin(twaRad), boatSpeed + tws * Math.cos(twaRad));
  return { aws, awa: awaRad * 180 / Math.PI };
}
```

## Technical Constraints

### Windy Platform Limitations
- **VERIFIED: Must use Svelte + TypeScript** (no React/Vue alternatives)
- **VERIFIED: Leaflet 1.4.x locked version** (not 1.9.4 as previously assumed)
- Client-side only execution (no server-side processing)
- Weather data limited by user's subscription level

### Performance Considerations
- GPS.js processes NMEA in real-time without blocking UI
- Interpolation calculations must run efficiently for route legs up to weeks long
- Weather data caching required to avoid API rate limits during route scrubbing

### Integration Patterns
- WebSocket connections for real-time GPS data (NMEA/SignalK)
- **PredictWind integration NOT available** (no public API confirmed 2025)
- Time-based weather lookups using Windy's temporal API

## Major Updates from Previous Research

### Corrections Made
1. **Leaflet Version**: Windy uses 1.4.x, not 1.9.4 (platform constraint)
2. **@gml/truewind**: Library not found in 2025 NPM ecosystem - use custom calculations
3. **PredictWind API**: Confirmed no public API available (official documentation)
4. **GPS Integration**: GPS.js is the current standard, actively maintained

### New Additions
1. **SignalK Support**: Modern marine data standard for GPS integration
2. **Everpolate**: Verified interpolation library for time-based weather data
3. **WebSocket Patterns**: Real-time data streaming approach
4. **NMEA Parser Options**: Multiple verified libraries available

## Confidence Assessment

| Technology | Confidence | Rationale |
|------------|------------|-----------|
| Windy Plugin API | HIGH | Official documentation verified, active community |
| GPS.js | HIGH | **VERIFIED: Current 2025 maintenance, extensive NMEA support** |
| geolib | HIGH | **VERIFIED: 300k+ downloads/month, zero dependencies, proven** |
| SignalK | MEDIUM | Growing ecosystem but newer standard than NMEA |
| Weather Interpolation | MEDIUM | **Everpolate verified, multiple viable options available** |
| PredictWind Integration | HIGH | **VERIFIED: No public API exists (official confirmation)** |

## Sources

- [Windy Plugin Documentation](https://docs.windy-plugins.com/) - HIGH confidence
- [GPS.js GitHub Repository](https://github.com/infusion/GPS.js/) - HIGH confidence
- [geolib NPM Package](https://www.npmjs.com/package/geolib) - HIGH confidence
- [SignalK Specification](https://github.com/signalk/specification) - MEDIUM confidence
- [PredictWind API Status](https://help.predictwind.com/en/articles/9749094-faq-api) - HIGH confidence (confirmed no API)
- [Everpolate NPM Package](https://www.npmjs.com/package/everpolate) - MEDIUM confidence
- [Windy API GitHub](https://github.com/windycom/API) - HIGH confidence