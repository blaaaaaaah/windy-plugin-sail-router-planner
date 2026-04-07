# Multi-Route Functionality - Feature Specification

## Overview

This document outlines the comprehensive implementation of multi-route functionality for the Windy Sailing Route Planner plugin. The feature introduces a sliding panel interface that allows users to manage multiple routes, view detailed forecasts, and switch between route list and route detail views.

## Core Concepts

### Route Management Philosophy
- **Single Active Route**: Only one route can be "active" for editing at any time
- **Multiple Visible Routes**: Multiple routes can be displayed on the map simultaneously
- **No Viewing Mode**: There is no separate "viewing" mode - routes are either active (editable) or inactive (visible but not editable)
- **Route Persistence**: Routes can be saved to localStorage with visibility state

### UI State Model
The interface operates in two primary states:
1. **Route List Panel**: Shows all available routes, no active route selected
2. **Forecast Panel**: Shows detailed forecast for the active route

## User Interface Design

### Panel Architecture

```
plugin.svelte
├── RouteListPanel.svelte (when no active route)
│   ├── Route list with preview info
│   ├── Route management actions (show/hide, save, delete)
│   └── "No routes created" state
└── ForecastContainer.svelte (when active route exists)
    ├── Forecast table
    └── Route editing controls
```

### Sliding Animation
- **Style**: iOS list/detail pattern
- **Direction**: Forecast panel slides in from right, pushing route list to the left
- **Implementation**: CSS transforms or Svelte transitions (no external animation library)
- **Trigger**: Route selection from list or map

### Title Behavior

```svelte
{#if routeEditorController.activeRoute == null}
<div>
  <div class="title-section">Sail Router Planner</div>
  <RouteListPanel />
</div>
{:else}
<div>
  <div class="title-section">< Routes [True/Apparent toggle]</div>
  <ForecastContainer />
</div>
{/if}
```

- **Route List State**: "Sail Router Planner"
- **Forecast State**: "< Routes" (clickable back button) + True/Apparent wind toggle
- **Title Animation**: Entire title section slides with panel content

### Route List Display

Each route entry shows:

```
🗺️ Panama → Colombia                    👁️ 💾 🗑️
   📏 245 nm • ⏱️ 2d 8h • 🛫 Mar 8, 14:00

⚡ Current Route (italic)                📈 🗑️
   📏 89 nm • ⏱️ 18h • 🛫 Now
```

**Elements:**
- **Route Name**: Auto-generated from start/end locations or user-defined
- **Distance**: Total route distance in nautical miles
- **Duration**: Estimated passage time (e.g., "2d 8h", "18h 30m")
- **Departure**: Departure time in user-friendly format
- **Unsaved Indicator**: Italic text for unsaved routes

**Action Icons:**
- **👁️**: Show/hide toggle (eye/eye-slash icon)
- **💾**: Save to localStorage (only shown for unsaved routes)
- **🗑️**: Delete route (from storage if saved, from memory if unsaved)

**Deletion Constraint**: Route deletion is only possible from the route list panel, not when viewing forecasts.

## Data Architecture

### RouteDefinition Enhancements

```typescript
export class RouteDefinition {
  readonly id: string;
  private _name: string;
  private _color: string;
  private _departureTime: number;
  private _defaultSpeed: number;
  private _waypoints: LatLng[] = [];
  private _legSpeeds: number[] = [];
  private _isVisible: boolean = true; // NEW

  // Existing methods...

  // NEW: Visibility management
  get isVisible(): boolean {
    return this._isVisible;
  }

  set isVisible(visible: boolean) {
    this._isVisible = visible;
  }
}
```

### Forecast Caching

```typescript
// In plugin.svelte
let cachedForecasts: Map<string, RouteForecast> = new Map();
```

**Caching Strategy:**
- **Storage**: In-memory only (lost on page refresh)
- **Invalidation**: None (user reloads page to refresh)
- **Limits**: No maximum cache size for now
- **Key**: Route ID

### Route Storage Integration

**RouteStorage Enhancements:**
- Use RouteSerializer for persistence (not route.id as key)
- Handle `isVisible` property through RouteSerializer
- Load only visible routes on plugin startup
- Auto-save routes when user actions occur (speed changes, waypoint drags, visibility changes)

**Note**: Need to investigate how RouteSerializer can handle the visible flag since route.id is randomly generated on each load.

## User Interaction Flows

### Startup Sequence
1. Load all saved routes from RouteStorage
2. Filter for routes with `isVisible: true`
3. Add visible routes to RouteEditorController
4. Display routes on map
5. Show Route List Panel (no active route)
6. If no routes exist, show "no routes created" message

### Route Creation Flow
```
Route List Panel → User clicks map → Creates new route → Sets as active → Shows Forecast Panel
```

1. User is in Route List Panel (no active route)
2. User clicks on map
3. RouteEditorController creates new route with first waypoint
4. Route becomes active
5. Second map click adds second waypoint
6. Route forecast is generated and displayed
7. Interface slides to Forecast Panel

### Route Selection Flow
```
Route List Panel → User clicks route → Sets as active → Shows Forecast Panel
```

1. User clicks route in RouteListPanel
2. RouteEditorController sets clicked route as active
3. Check if forecast is cached
   - If cached: Use cached forecast
   - If not cached: Generate new forecast
4. Interface slides to Forecast Panel

### Navigation Flow
```
Forecast Panel → User clicks "< Routes" → Clears active route → Shows Route List Panel
```

1. User clicks "< Routes" in title
2. RouteEditorController clears active route (sets to null)
3. Interface slides back to Route List Panel
4. All routes remain visible on map

### Map Interaction Behaviors

#### When Route List Panel is Active (no active route)
- **Map click**: Creates new route, sets as active, shows Forecast Panel

#### When Forecast Panel is Active (active route exists)
- **Click on active route line**: Add waypoint at click location (current behavior)
- **Click on different route line**: Switch to that route as active, show its cached forecast
- **Click on waypoint of different route**: Switch to that route as active
- **Click on empty map area**: Add waypoint to active route

## Technical Implementation Details

### Component Structure

#### RouteListPanel.svelte
```svelte
<script lang="ts">
  export let routes: RouteDefinition[];
  export let cachedForecasts: Map<string, RouteForecast>;

  // Event dispatchers
  let dispatch = createEventDispatcher();

  function selectRoute(route: RouteDefinition) {
    dispatch('routeSelected', { route });
  }

  function toggleVisibility(route: RouteDefinition) {
    dispatch('toggleVisibility', { route });
  }

  function saveRoute(route: RouteDefinition) {
    dispatch('saveRoute', { route });
  }

  function deleteRoute(route: RouteDefinition) {
    dispatch('deleteRoute', { route });
  }
</script>
```

#### Plugin State Management

```typescript
// In plugin.svelte
let cachedForecasts: Map<string, RouteForecast> = new Map();

// Handle route selection from list
function handleRouteSelected(event: any) {
  const { route } = event.detail;
  routeEditor!.setActiveRoute(route);

  // Check cache first
  if (cachedForecasts.has(route.id)) {
    currentForecast = cachedForecasts.get(route.id)!;
  } else {
    generateForecastFromRoute(route);
  }
}

// Handle forecast generation with caching
async function generateForecastFromRoute(route: RouteDefinition) {
  // ... existing forecast generation logic ...

  // Cache the result
  cachedForecasts.set(route.id, forecast);
  currentForecast = forecast;
}
```

### RouteEditorController Enhancements

#### Route Selection Methods
```typescript
export class RouteEditorController {
  // NEW: Set active route without creating
  setActiveRoute(route: RouteDefinition): void {
    this._activeRoute = route;
    this._updateMapHighlight();
    this._onRouteUpdated(route);
  }

  // NEW: Clear active route
  clearActiveRoute(): void {
    this._activeRoute = null;
    this._updateMapHighlight();
  }

  // NEW: Get all routes including inactive ones
  getAllRoutes(): RouteDefinition[] {
    return [...this._routes];
  }

  // NEW: Route visibility management - CORRECTED
  setRouteVisibility(route: RouteDefinition, visible: boolean): void {
    route.isVisible = visible;
    if (visible) {
      // Add route back to the routes array and display on map
      if (!this._routes.includes(route)) {
        this._routes.push(route);
      }
      this._updateRouteDisplay(route);
    } else {
      // Remove route from routes array (splice from list)
      const index = this._routes.findIndex(r => r.id === route.id);
      if (index >= 0) {
        this._routes.splice(index, 1);
      }
      this._removeRouteFromMap(route);
    }
  }
}
```

#### Map Click Handling Enhancement
```typescript
private _handleMapClick(e: L.LeafletMouseEvent): void {
  // Check if click is on existing route line
  const clickedRoute = this._getRouteAtPosition(e.latlng);

  if (clickedRoute && clickedRoute !== this._activeRoute) {
    // Switch to different route
    this.setActiveRoute(clickedRoute);
    return;
  }

  // Continue with existing waypoint addition logic
  this.onMapClick(e.latlng);
}
```

### RouteStorage Enhancements

```typescript
export class RouteStorage {
  // Use RouteSerializer for persistence instead of route.id
  saveRoute(route: RouteDefinition): void {
    // Implementation TBD - need to check how RouteSerializer can handle isVisible flag
    // Since route.id is randomly generated each time route is loaded
  }

  loadVisibleRoutes(): RouteDefinition[] {
    // Implementation TBD - need to investigate RouteSerializer approach
    // for handling visibility persistence
  }
}
```

**TODO**: Investigate RouteSerializer implementation to determine how to persist `isVisible` flag without relying on unstable route.id.

## State Transitions

### Panel State Logic
```typescript
// In plugin.svelte
$: currentPanel = activeRoute ? 'forecast' : 'list';
```

No explicit panel state needed - derived from active route existence.

### Route Active State Management
- **Single Source of Truth**: RouteEditorController.activeRoute
- **State Changes**: Only through RouteEditorController methods
- **Event Propagation**: onRouteUpdated callback triggers UI updates

## Animation Specifications

### Sliding Transitions
```css
.panel-container {
  display: flex;
  width: 200%; /* To accommodate both panels */
  transform: translateX(0); /* Route list visible */
  transition: transform 300ms ease-in-out;
}

.panel-container.forecast-active {
  transform: translateX(-50%); /* Forecast panel visible */
}

.route-list-panel,
.forecast-panel {
  width: 50%;
  flex-shrink: 0;
}
```

### Title Animation
```css
.title-section {
  transition: all 300ms ease-in-out;
}
```

## Error Handling & Edge Cases

### Route Loading Failures
- Invalid route data in localStorage → Skip route, log warning
- Missing waypoints → Skip route, log warning
- Corrupt forecast cache → Clear cache, regenerate on demand

### Network Issues
- API failures during forecast generation → Show error state
- Slow forecast loading → Show loading spinner
- Route name fetching failures → Use fallback names

### User Interaction Edge Cases
- Rapid route switching → No specific handling yet
- Deleting active route → **Not possible** - deletion only available in route list panel

## Performance Considerations

### Forecast Caching
- Cache keyed by route ID
- No automatic cache invalidation (user refresh required)
- Memory usage grows with route count (acceptable for sailing use cases)

### Map Rendering
- Only visible routes displayed on map
- Route hide/show operations remove routes from controller's routes array
- Day markers and distance labels update with visibility

### Animation Performance
- Use CSS transforms (GPU accelerated)
- Limit to transform and opacity changes
- 300ms duration for smooth feel without sluggishness

## Future Enhancements (Out of Scope)

### Phase 2 Features
- **Forecast Persistence**: Save forecasts to localStorage with timestamps
- **Cache Invalidation**: Time-based cache expiration (e.g., 1 hour)
- **Route Comparison**: Side-by-side forecast comparison
- **Route Templates**: Save route patterns for reuse

### Phase 3 Features
- **Route Import/Export**: Share routes via URLs or files
- **Route Optimization**: Suggest route improvements
- **Weather Routing**: Automatic route optimization for conditions

## Implementation Progress

### ✅ Completed (Phase 1)
- [x] **Add `isVisible` property to RouteDefinition** - Routes can be hidden/shown with splice behavior
- [x] **Add `isSaved` property to RouteDefinition** - Tracks saved/unsaved state with modification detection
- [x] **Merged name system** - Combined `name` and `routeName` into single system with geo caching
- [x] **RouteSerializer visibility support** - Persists `isVisible` flag via `v:false` parameter
- [x] **Updated plugin.svelte geo name logic** - Only fetches geo names when `route.name === null`
- [x] **formatDateTime utility** - Created and updated LegWaypoint.svelte to use it

### 🔄 In Progress
- [ ] **Create RouteListPanel.svelte component** - Basic structure defined, needs completion

### ⏳ Pending (Phase 2)
- [ ] Update plugin.svelte with sliding panel logic
- [ ] Enhance RouteEditorController for route selection and splice behavior
- [ ] Implement forecast caching in plugin.svelte
- [ ] Add route loading on plugin startup
- [ ] Implement sliding animations
- [ ] Add route management actions (save/delete)
- [ ] Update title behavior with back navigation
- [ ] Handle map click route switching
- [ ] Add preview info display in route list

## Technical Achievements

### Data Architecture ✅
```typescript
// RouteDefinition enhancements completed
private _isVisible: boolean = true;     // Hide/show routes on map
private _isSaved: boolean = false;      // Track save state
private _name: string | null;           // User-defined name
private _cachedGeoName: string | null;  // API-fetched geo name

// Smart name getter
get name(): string | null {
    return this._name || this._cachedGeoName; // User name takes priority
}
```

### Route State Management ✅
- **Modification tracking** - All route changes set `isSaved = false`
- **Geo name caching** - Auto-updates when endpoints change, respects user names
- **Visibility persistence** - Serialized with `v:false` parameter
- **Smart API calls** - Only fetches geo names when `route.name === null`

### Utility Functions ✅
- **formatDateTime()** - Combines day/date and time formatting
- **RouteStorage.listVisibleRoutes()** - Filters routes by visibility
- **Route serialization** - Handles visibility and will handle names (TODO added)

## Outstanding TODOs
- **Route name serialization** - Add name persistence to RouteSerializer (marked in code)

## Testing Scenarios

### Core Functionality
1. Create multiple routes, verify all appear in route list
2. Select route from list, verify forecast panel slides in
3. Click "< Routes", verify return to route list
4. Toggle route visibility, verify route is spliced from controller array
5. Save/delete routes, verify localStorage persistence

### Map Interactions
1. Click different route on map, verify active route switches
2. Click active route, verify waypoint addition
3. Drag waypoints on active route, verify forecast updates
4. Create new route from route list panel

### Edge Cases
1. Hide active route, verify continued editability
2. Rapid route switching, verify smooth transitions
3. Network failures during forecast loading
4. Attempt to delete route from forecast panel (should not be possible)

## Dependencies

### Required Updates
- RouteTypes.ts: Add isVisible property
- RouteEditorController.ts: Add route selection methods with splice behavior
- RouteStorage.ts: Research visibility persistence approach
- plugin.svelte: Add panel management and caching

### New Components
- RouteListPanel.svelte: Route list display and management

### Styling Requirements
- Sliding panel animations
- Route list item styling
- Action button styling
- Title transition styling

## Open Questions

1. **RouteSerializer Visibility**: How can we persist the `isVisible` flag through RouteSerializer when route.id changes on each load?
2. **Route Identification**: What stable identifier can we use for route persistence if not route.id?
3. **Hidden Route Active State**: If a route is active and then hidden, should it remain active for editing while being invisible on the map?

---

*This specification serves as the complete reference for implementing multi-route functionality. All implementation decisions, user flows, and technical details are captured to ensure consistent development across multiple contexts.*