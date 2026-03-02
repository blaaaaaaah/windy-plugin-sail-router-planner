# Technology Stack

**Analysis Date:** 2026-03-02

## Languages

**Primary:**
- TypeScript 4.x+ - Plugin development, type-safe sailing calculations
- JavaScript ES2020+ - Windy plugin framework integration

**Secondary:**
- HTML5 - Plugin UI structure
- CSS3 - Styling and animations

## Runtime

**Environment:**
- Browser environment (Chrome, Firefox, Safari, Edge)
- Windy.com platform integration

**Package Manager:**
- npm or yarn (TBD during setup)
- No lockfile present yet

## Frameworks

**Core:**
- Svelte 3.x - Windy plugin framework requirement
- Windy Plugin API - Core platform integration
- Leaflet 1.4.x - Map visualization and interaction

**Testing:**
- Jest or Vitest (TBD) - Unit testing for sailing calculations
- Browser DevTools - Integration testing in Windy environment

**Build/Dev:**
- Webpack or Vite (TBD) - Module bundling for plugin
- TypeScript Compiler - Type checking and compilation
- Svelte Compiler - Component compilation

## Key Dependencies

**Critical:**
- Windy Plugin API - Core platform integration for weather data access
- Leaflet 1.4.x - Map interaction, route visualization, position markers

**Infrastructure:**
- Date-fns or similar - Time zone handling, date calculations
- RxJS or similar - Reactive data streams for real-time GPS updates

## Configuration

**Environment:**
- Plugin manifest file - Windy plugin registration
- TypeScript config - Compilation settings with tab indentation
- Build configuration - Asset bundling and optimization

**Build:**
- Entry point configuration for plugin
- Asset optimization for web delivery

## Platform Requirements

**Development:**
- Node.js 16+ for build tools
- Modern browser for testing
- Access to Windy.com for plugin development/testing

**Production:**
- Deployed as Windy plugin - hosted within Windy platform
- No separate hosting required

---

*Stack analysis: 2026-03-02*