# ForecastTable Refactor - Multi-Route Comparison Implementation

**Created**: 2026-04-11
**Status**: In Progress
**Goal**: Refactor ForecastTable to support multi-route comparison with synced timeline

## Overview

This refactor enables comparing multiple sailing routes side-by-side with synchronized time navigation. The final UI will show multiple routes in columns with shared timeline navigation.

## Final Target UI Structure

```
| Time | Route 1 Color | Route 1 Wind | Route 1 Waves | Route 2 Color | Route 2 Wind | Route 2 Waves |
|------|---------------|--------------|---------------|---------------|--------------|---------------|
| 14:00| [blue border] | 12kt N       | 2.5m 8s       | [red border]  | 15kt NE     | 3.0m 9s       |
| 15:00| [waypoint 2]  | 13kt N       | 2.8m 8s       | [empty]       | 16kt NE     | 3.2m 9s       |
| 16:00| [blue border] | 14kt N       | 3.0m 9s       | [waypoint 1]  | 17kt E      | 3.5m 10s      |
```

## Key Features

### Timeline Synchronization
- **Unified Timeline**: All routes use same hourly timeline (earliest departure to latest arrival)
- **Empty Cells**: Routes show empty cells before departure/after arrival
- **Pre/Post Data**: Use pre-departure and post-arrival forecast data when available
- **Time Scrubbing**: Single timeline controls all routes simultaneously

### Waypoint Handling
- **Single Route Mode**: Show full `LegWaypoint` components (draggable)
- **Multi-Route Mode**: Show waypoint numbers in route color cells (not draggable)
- **Mixed Alignment**: Different routes have waypoints at different times

## Technical Architecture

### Component Hierarchy

```
ForecastTable.svelte (top level)
└── ForecastTableDataSource (TypeScript service class)
└── ScrollableForecastTable.svelte (scroll container + auto-scroll logic)
    ├── LegWaypoint.svelte (when type === 'waypoint' in single-route mode)
    └── ForecastTableRow.svelte (when type === 'row')
        ├── TimeCell.svelte
        ├── RouteColorCell.svelte (new - border + waypoint number)
        ├── WindCell.svelte
        ├── WaveCell.svelte
        └── WeatherCell.svelte
```

### Data Structures

#### Core Interfaces

```typescript
interface RouteForecast {
  route: RouteDefinition;
  pointForecasts: PointForecast[];
  legStats: (WeatherStats | null)[];
  routeStats: WeatherStats | null;
  forecastWindow: RouteForecastWindow | null;
  // NOTE: Loading state inferred from forecast === null (NOT empty pointForecasts)
}

interface LegWaypointData {
  // Contains data for LegWaypoint component props
  waypoint: RouteLeg;
  isFirst: boolean;
  isLast: boolean;
  onDepartureTimeChange?: (newTime: number) => void;
  // ... other LegWaypoint props
}

interface ForecastCellData {
  type: 'time' | 'wind' | 'wave' | 'weather' | 'route-color';
  data: {
    // Cell-specific data including formatting properties
    // For wind: { windData, apparent: boolean, backgroundColor: string }
    // For route-color: { color: string, waypointNumber?: number, backgroundColor?: string }
    // For time: { timestamp: number, backgroundColor?: string }
    [key: string]: any;
  } | null;
}

interface ForecastTableRowData {
  timestamp: number;
  type: 'row' | 'waypoint';

  // If type === 'waypoint' (single-route mode only)
  waypointData?: LegWaypointData;

  // If type === 'row'
  cells?: ForecastCellData[];
}
```

#### Cell Data Examples

```typescript
// Wind data - multiple cells for wind + gusts
cells: [
  {
    type: 'time',
    data: {
      timestamp: 1704909600000,
      backgroundColor: '#f0f8ff'
    }
  },
  {
    type: 'route-color',
    data: {
      color: '#3498db',
      waypointNumber: 2,
      backgroundColor: '#f0f8ff'
    }
  },
  {
    type: 'wind',
    data: {
      windData: windForecast,
      apparent: false,
      backgroundColor: '#f0f8ff'
    }
  },
  {
    type: 'wind',
    data: {
      windData: gustForecast,
      apparent: false,
      backgroundColor: '#f0f8ff'
    }
  }, // separate gust cell
  {
    type: 'wave',
    data: {
      waveData: waveForecast,
      apparent: false,
      backgroundColor: '#f0f8ff'
    }
  },
  {
    type: 'weather',
    data: {
      weatherData: weatherForecast,
      backgroundColor: '#f0f8ff'
    }
  }
]

// Route color cell variations
{ type: 'route-color', data: { color: '#e74c3c' } } // no waypoint
{ type: 'route-color', data: { color: '#e74c3c', waypointNumber: 3 } } // with waypoint
// NO empty cells - if no data, don't add to cells array
```

### Service Classes

#### ForecastTableDataSource

```typescript
class ForecastTableDataSource {
  constructor(private routeForecast: RouteForecast | null) {}

  // Main method - converts RouteForecast to table rows
  getRowData(): ForecastTableRowData[] {
    // 1. Generate unified timeline from forecast data
    // 2. Create waypoint rows (type: 'waypoint') for single-route mode
    // 3. Create data rows (type: 'row') with cells array
    // 4. Only include cells with valid data (no null entries)
    // 5. Compute background gradients for visual transitions
  }

  // Future: Support multiple routes
  // constructor(private routeForecasts: RouteForecast[])
}
```

## Implementation Plan

### Phase 1: RouteForecast Prop Refactor ✅ CURRENT

**Goal**: Simplify ForecastTable props to single RouteForecast object

#### Current State:
```typescript
// plugin.svelte
<ForecastTable
    forecast={currentForecast}       // RouteForecast | null
    isLoading={isLoadingForecast}    // boolean - REMOVE
    route={activeRoute}              // RouteDefinition | null - REMOVE
/>
```

#### Target State:
```typescript
// plugin.svelte
<ForecastTable
    forecast={routeForecastObject}   // RouteForecast | null (contains route + loading state)
/>

// Where loading is inferred from:
// - forecast === null (loading)
// - forecast !== null (loaded - even if pointForecasts is empty)
```

#### Implementation Steps:

1. **Update ForecastTable.svelte props**
   - Remove `isLoading: boolean` prop
   - Remove `route: RouteDefinition` prop
   - Keep `forecast: RouteForecast | null` prop
   - Update internal logic to derive route from `forecast.route`
   - Update loading detection to check `forecast === null` ONLY

2. **Update plugin.svelte data flow**
   - Remove `isLoadingForecast` boolean state
   - Remove separate `activeRoute` passing to ForecastTable
   - Create helper function to build RouteForecast object with loading state
   - Emit new RouteForecast object when loading state changes

3. **Test compatibility**
   - Verify UI renders exactly the same
   - Test auto-scroll, hover, dragging functionality unchanged
   - Check loading states display correctly

### Phase 2: ScrollableForecastTable Component

**Goal**: Extract scroll logic to dedicated component

#### Implementation:
1. **Create ScrollableForecastTable.svelte**
   - Extract auto-scroll logic from ForecastTable.svelte (lines ~250-280)
   - Handle scroll container for table content (not headers)
   - Preserve smooth scrolling animation timing
   - Manage auto-scroll to departure timestamp

2. **Props Interface**:
```typescript
interface ScrollableForecastTableProps {
  children: any; // Table content (rows)
  autoScrollToTimestamp?: number; // Departure time for auto-scroll
}
```

3. **Update ForecastTable.svelte**
   - Wrap scrollable content in ScrollableForecastTable
   - Move auto-scroll logic to new component
   - Keep all existing rendering logic intact

### Phase 3: ForecastTableDataSource Service

**Goal**: Abstract data preparation logic

#### Implementation:
1. **Create ForecastTableDataSource.ts**
   - Service class to convert RouteForecast to ForecastTableRowData[]
   - Handle timeline generation from forecast data
   - Create waypoint and data row structures
   - Compute cell background gradients

2. **Integration**
   - Import service in ForecastTable.svelte
   - Replace existing data preparation with service calls
   - Maintain same output format initially

### Phase 4: ForecastTableRow Component

**Goal**: Modular row rendering

#### Implementation:
1. **Create ForecastTableRow.svelte**
   - Handle both waypoint and data row types
   - Render cells based on ForecastCellData array
   - Support existing cell components (TimeCell, WindCell, etc.)

2. **Create RouteColorCell.svelte**
   - New cell type for route color border
   - Support optional waypoint number display
   - Thin colored border/bar styling

3. **Update rendering flow**
   - Use ForecastTableRow for all row rendering
   - Keep LegWaypoint integration for single-route dragging

### Phase 5: Multi-Route Support

**Goal**: Enable multiple route comparison

#### Implementation:
1. **Update data structures**
   - Change ForecastTable prop to `forecasts: RouteForecast[]`
   - Update ForecastTableDataSource for multiple routes
   - Generate unified timeline across all routes

2. **UI Updates**
   - Render multiple route columns
   - Handle empty cells for inactive routes
   - Disable dragging in multi-route mode

## Technical Decisions

### Data Flow
- **Loading State**: Inferred ONLY from `forecast === null`
- **Empty PointForecasts**: Valid state (route exists but no forecast data)
- **Route Reference**: Always from `forecast.route` (no separate route prop)
- **Event Handling**: ForecastTableRow handles hover, ScrollableForecastTable handles scroll

### Cell Structure
- **Wind Data**: Separate cells for wind and gusts with same type
- **Data Properties**: apparent, backgroundColor included in data object
- **No Empty Cells**: Only include cells with valid data (no null entries in array)
- **Route Colors**: Thin border with optional waypoint number circle

### Component Responsibilities
- **ForecastTable**: Top-level orchestration, props management
- **ScrollableForecastTable**: Scroll behavior, auto-scroll logic only
- **ForecastTableDataSource**: Data transformation, timeline generation
- **ForecastTableRow**: Row rendering, cell creation
- **Cell Components**: Individual cell formatting and interactions

### Backward Compatibility
- **Phase 1-4**: Single route behavior unchanged
- **Existing Features**: Auto-scroll, hover, dragging preserved
- **Visual Design**: No UI changes until Phase 5
- **API Compatibility**: Internal refactor only

## Testing Strategy

### After Each Phase:
1. **Visual Verification**: UI appears identical
2. **Functional Testing**: All interactions work (scroll, hover, drag)
3. **Loading States**: Proper loading indication
4. **Console Logs**: No new errors
5. **Commit**: Working state after each phase

### Edge Cases to Test:
- Very long routes (multiple days)
- Missing forecast data
- Routes with different departure times
- Empty/null forecasts
- Rapid route changes

## Migration Notes

### Breaking Changes:
- **Phase 1**: ForecastTable props change (internal only)
- **Phase 5**: Multi-route mode requires forecasts array

### Preserved Features:
- Auto-scroll to departure time
- Timestamp hover with map updates
- Departure time dragging (single-route mode)
- All existing cell formatting
- Loading animations and states

## Future Extensions

### Beyond Multi-Route:
- Drag-to-reorder route columns
- Route visibility toggles
- Departure time synchronization across routes
- Performance optimizations for many routes

---

**Implementation Status**: Phase 1 In Progress
**Next Step**: Update ForecastTable.svelte props and internal logic