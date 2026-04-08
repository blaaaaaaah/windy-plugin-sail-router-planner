# Route Hover Highlighting - Functional & Technical Specification

## Overview

Implement hover highlighting functionality for routes in both the map view and route list panel, allowing users to visually identify routes through mouse interactions while maintaining separate active and highlighted states.

## Functional Requirements

### 1. Visual States

#### 1.1 Route States
- **Active Route**: Currently selected route for editing (existing behavior)
- **Highlighted Route**: Route currently being hovered over
- **Active + Highlighted**: Same visual styling (no difference when hovering active route)
- **Maximum Highlighted Routes**: Up to 2 routes can be highlighted simultaneously:
  - The active route (always highlighted when exists)
  - One additional hovered route (if different from active)

#### 1.2 Visual Styling
- **Highlighted routes**: Use identical styling to current active route styling
- **Non-highlighted routes**: Use current inactive route styling
- **No visual difference**: Between active-only and active+highlighted states

### 2. Map Hover Behavior

#### 2.1 Hover Detection
- **Target Elements**: Route lines and waypoints of visible routes only
- **Trigger**: Immediate mouseover (no delay)
- **Hidden Routes**: Cannot be hovered directly on map (only via route list)

#### 2.2 Hover Actions
- **Mouse Over**: `highlightRoute(route)` - Route becomes highlighted immediately
- **Mouse Out**: `highlightRoute(null)` - Route loses highlighting (returns to inactive styling unless it's the active route)
- **Route Switching**: Moving mouse from one route to another calls `highlightRoute(null)` then `highlightRoute(newRoute)`

#### 2.3 Click Interaction
- **Hover + Click**: Clicking on a hovered route makes it the new active route
- **State Transition**: Hovered route becomes active (stays highlighted), previous active route loses highlighting
- **No Conflicts**: Hover and click detection work independently

### 3. Route List Hover Behavior

#### 3.1 List Item Hovering
- **Target Area**: Entire route item row (including all content)
- **Visual Feedback**: Standard hover background styling (existing behavior)
- **Bidirectional Sync**: List hover triggers map highlighting, map hover triggers list highlighting

#### 3.2 Hidden Route Behavior
- **Temporary Visibility**: Hidden routes become temporarily visible on map when hovered in list
- **Full Styling**: Temporarily visible routes use complete normal styling (all elements: line, waypoints, labels, markers)
- **API Calls**:
  - Mouse Over: `highlightRoute(hiddenRoute)` - makes route temporarily visible AND highlighted
  - Mouse Out: `highlightRoute(null)` - route becomes hidden again
- **No Persistent Change**: Route's `isVisible` property remains unchanged

### 4. Synchronization Requirements

#### 4.1 Map ↔ List Communication
- **Map Hover → List**: Route hovered on map gets hover background in list
- **List Hover → Map**: Route hovered in list gets highlighted on map
- **Identical Styling**: Both directions use same visual feedback

#### 4.2 State Consistency
- **Single Source of Truth**: RouteEditorController maintains highlighting state
- **Event Propagation**: All UI components receive highlighting updates via callbacks
- **Real-time Updates**: Immediate visual feedback with no delays

## Technical Requirements

### 1. Architecture Changes

#### 1.1 State Management
- **Single Highlighted Route**: Track one `_highlightedRoute: RouteDefinition | null`
- **Active Route Treatment**: Active route uses existing highlighting logic
- **Simple API**: `highlightRoute(route: RouteDefinition | null)` method

#### 1.2 Callback System
- **New Callback**: Add `onRouteHighlighted(route: RouteDefinition | null)` to RouteEditorController constructor
- **Event Communication**: UI components subscribe to highlighting changes
- **Parameter**: `null` indicates no route is currently hovered (only active route highlighted)

### 2. Event Handling

#### 2.1 Map Event Detection
- **Reuse Existing Layer**: Add mouseover/mouseout handlers to existing transparent clickable polylines
- **No New Layers**: Use same invisible thick polylines currently used for click detection
- **Waypoint Events**: Add hover handlers to waypoint markers as well

#### 2.2 Route List Event Handling
- **Target Element**: Entire route item row (`div.route-row`)
- **Event Types**: `mouseover` and `mouseout` events
- **API Calls**:
  - `mouseover`: `highlightRoute(route)`
  - `mouseout`: `highlightRoute(null)`

### 3. Visibility Management

#### 3.1 Temporary Visibility Logic
- **Implementation**: In `highlightRoute()` method, if route is hidden (`!route.isVisible`), temporarily show it
- **Mechanism**: Override visibility in display logic during highlight
- **Restoration**: When `highlightRoute(null)` is called, hide temporarily visible routes
- **No State Mutation**: Never modify route's `isVisible` property

#### 3.2 Display Logic Updates
- **Route Rendering**: Check both `isVisible` and whether route is currently highlighted (for temporary visibility)
- **Layer Management**: Add/remove route layers temporarily without changing route properties
- **Clean State**: Ensure no persistent changes to route objects

### 4. API Design

#### 4.1 RouteEditorController New Methods
```typescript
highlightRoute(route: RouteDefinition | null): void
getHighlightedRoute(): RouteDefinition | null
```

#### 4.2 Highlighting Logic
- **Set Highlight**: If `route` provided, highlight it (make visible if hidden)
- **Clear Highlight**: If `null` provided, remove highlighting (hide if was temporarily visible)
- **Active Route**: Always highlighted regardless of hover state
- **Callback**: Call `onRouteHighlighted(route)` to notify UI components

### 5. Implementation Steps

#### 5.1 Core State Management
1. Add `_highlightedRoute` property to RouteEditorController
2. Add `highlightRoute()` method with temporary visibility logic
3. Add `onRouteHighlighted` callback to constructor
4. Update route styling logic to handle highlighted state

#### 5.2 Map Hover Implementation
1. Add mouseover/mouseout handlers to clickable polylines
2. Add hover handlers to waypoint markers
3. Call `highlightRoute()` on hover events

#### 5.3 Route List Integration
1. Update RouteListPanel with hover event handlers
2. Call `highlightRoute()` on list item hover events
3. Subscribe to `onRouteHighlighted` callback for list highlighting

#### 5.4 Testing & Polish
1. Test all hover interactions (map ↔ list)
2. Verify temporary visibility behavior
3. Confirm no persistent state changes

## Edge Cases & Considerations

### 1. Multiple Overlapping Routes
- **Behavior**: Undefined which route gets highlighted
- **Implementation**: First detected route wins (no special handling needed)

### 2. Route Deletion During Hover
- **Cleanup**: Clear highlighted route if it's deleted
- **UI Update**: Call `highlightRoute(null)` and update displays

### 3. Active Route Changes
- **Highlighting Update**: New active route automatically highlighted
- **Previous Highlight**: If highlighted route != active route, maintain highlight

### 4. Rapid Hover Movements
- **No Throttling**: Immediate response to all `highlightRoute()` calls
- **State Consistency**: Method handles all state transitions cleanly

## Success Criteria

1. ✅ Routes highlight immediately on hover (map and list)
2. ✅ Hidden routes become temporarily visible when hovered in list
3. ✅ Bidirectional highlighting synchronization works correctly
4. ✅ No persistent state changes occur during hover operations
5. ✅ Simple `highlightRoute(route|null)` API handles all cases
6. ✅ Hover interactions do not interfere with existing click functionality
7. ✅ Performance remains smooth with multiple routes
8. ✅ All event listeners are properly cleaned up

---

*This specification provides a clean, simple API for hover highlighting that handles both map and list interactions through a single method call.*