# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**Weather Data Platform:**
- Windy.com Plugin APIs - Complete weather data and map integration
  - SDK/Client: Windy's official plugin framework (@windy/interfaces)
  - Auth: None (plugin executes in authenticated Windy environment)
  - Capabilities: Weather forecasts, layer control, map interactions, time scrubbing

**Real-time GPS Data:**
- PredictWind DataHub - Professional marine weather routing platform
  - SDK/Client: HTTP REST API and WebSocket streaming
  - Auth: None (local network access to boat's DataHub device)
  - Data: Real-time GPS position, boat speed, course over ground

- SignalK - Open-source marine data protocol
  - SDK/Client: WebSocket API with JSON messaging
  - Auth: None (local boat network, no security typically configured)
  - Data: GPS position, wind instruments, boat performance data

- TCP GPS Streams - Direct NMEA data feeds
  - SDK/Client: WebSocket bridge or TCP-over-HTTP proxy
  - Auth: None (direct protocol access on boat network)
  - Data: Raw NMEA sentences from GPS devices and chartplotters

**Map and Visualization:**
- Leaflet 1.4.x - Map library (provided by Windy platform)
  - SDK/Client: Windy's integrated Leaflet instance
  - Auth: None (embedded in platform)
  - Capabilities: Route drawing, position markers, map overlays

## Data Storage

**Routes and User Preferences:**
- Browser Local Storage
  - Connection: Web Storage API (localStorage/sessionStorage)
  - Client: Native browser APIs
  - Data: Route definitions, departure times, speed settings, user preferences

**Weather Data Caching:**
- Browser Cache and IndexedDB
  - Connection: Browser storage APIs
  - Client: Cache API for forecast data
  - Data: Temporary weather forecast caching to reduce Windy API calls

**File Storage:**
- Local filesystem only (no cloud storage)
- Route export/import via browser download/upload

**Caching Strategy:**
- Weather forecasts: 15-minute cache lifetime
- Route calculations: Session-based caching
- GPS positions: No caching (real-time only)

## Authentication & Identity

**Auth Provider:**
- None required - Zero-authentication architecture

**Security Model:**
- Plugin security: Managed by Windy.com platform (user's existing Windy login)
- GPS data: Local network access without credentials (typical boat network setup)
- Weather data: Accessed through user's Windy subscription level
- Route data: Local browser storage only

**Permission Model:**
- Windy platform permissions: Declared in plugin manifest
- Local network access: User grants permissions for GPS data sources
- No server-side authentication or token management required

## Monitoring & Observability

**Error Tracking:**
- Browser console logging (development and user debugging)
- No external error tracking service (Sentry, etc.)
- User-visible error messages for connectivity issues

**Logs:**
- Client-side structured logging to browser console
- GPS connection status monitoring
- Weather data availability tracking
- Route calculation performance metrics

**Debugging:**
- Windy platform development tools
- Browser DevTools integration
- GPS data connection diagnostics

## CI/CD & Deployment

**Hosting Platform:**
- Windy.com Plugin Marketplace
- Client-side execution in user's web browser
- No dedicated hosting infrastructure required

**Distribution:**
- Windy plugin package format
- Direct installation through Windy interface
- No separate app store or distribution platform

**Build Pipeline:**
- Local development build tools (Webpack/Vite)
- Plugin packaging for Windy platform requirements
- Asset optimization and bundling

## Environment Configuration

**Required Configuration:**
- None - plugin operates within Windy platform environment

**GPS Data Source Setup:**
- PredictWind DataHub: IP address and port (user configurable in settings)
- SignalK Server: WebSocket endpoint URL (user configurable)
- TCP GPS: Connection parameters (host, port, protocol)

**User Settings:**
```typescript
interface GPSConfiguration {
  predictWindDataHub?: {
    host: string;
    port: number;
    enabled: boolean;
  };
  signalK?: {
    wsEndpoint: string;
    enabled: boolean;
  };
  tcpGPS?: {
    host: string;
    port: number;
    protocol: 'nmea' | 'custom';
    enabled: boolean;
  };
}
```

**Secrets Management:**
- No secrets required
- All integrations use public local APIs or platform-provided authentication
- Zero credential storage or management

## Webhooks & Callbacks

**Incoming Data Streams:**
- Windy plugin lifecycle: `onActivate`, `onDeactivate`, `onDataUpdate`
- GPS position updates: Real-time streaming callbacks
- Weather data updates: Windy platform event system
- User interactions: Map clicks, route modifications, time scrubbing

**Outgoing Events:**
- None - plugin operates in read-only mode for external systems
- No data transmission outside of browser environment
- Local storage updates only

**Event Architecture:**
```typescript
// GPS data streaming
interface GPSStreamEvents {
  onPositionUpdate(position: GPSPosition): void;
  onConnectionLost(): void;
  onConnectionRestored(): void;
}

// Windy platform integration
interface WindyPluginEvents {
  onWeatherDataUpdate(layerData: WeatherLayer): void;
  onTimeChange(timestamp: Date): void;
  onMapViewChange(bounds: LatLngBounds): void;
}
```

## Integration Architecture Principles

**Client-Side Only:**
- All processing occurs in user's browser
- No server-side components or dependencies
- Minimal infrastructure footprint

**Local Network GPS Access:**
- GPS data accessed through boat's local network
- No internet connectivity required for position features
- Supports offline sailing scenarios

**Platform Integration:**
- Deep integration with Windy.com platform capabilities
- Leverages existing user authentication and subscription
- Follows Windy plugin development guidelines

**Zero External Authentication:**
- No API keys, tokens, or credentials stored
- Reduces security surface area
- Simplifies deployment and user setup

**Real-time Performance:**
- GPS position updates: Target 1Hz (1-second intervals)
- Weather forecast updates: 1-minute intervals
- Route calculations: Sub-second response times
- Multi-route comparison: Real-time synchronized updates

## Data Privacy & Compliance

**User Data Handling:**
- Routes and preferences: Local browser storage only
- GPS positions: Local network only, never transmitted externally
- Weather queries: Proxied through Windy platform (user's existing relationship)

**Network Communications:**
- Local GPS sources: Local network traffic only
- Windy platform: Standard plugin API calls
- No external service calls or data transmission

**Data Retention:**
- Routes: Persisted locally until user deletes
- GPS positions: Real-time only, no historical storage
- Weather cache: Automatic expiration based on forecast age

---

*Integration audit: 2026-03-02*