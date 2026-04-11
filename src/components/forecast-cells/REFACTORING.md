# ForecastTable Refactoring Requirements

## Overview

Refactoring the large `ForecastTable.svelte` component by extracting individual cell components to improve maintainability and reduce complexity. This refactoring will be done incrementally with immediate testing after each component extraction.

## Current State

The ForecastTable component (1294 lines) contains:
- Complex cell rendering logic for Time, Weather, Wind, Gusts, and Waves
- Shared utilities for colors, gradients, and direction calculations
- Drag & drop functionality for departure time changes
- Event handling for hover and metric clicks

## Components to Extract

### 1. DirectionIcon.svelte
**Purpose**: Shared SVG component for wind/wave arrows and boat icon

**Props**:
```svelte
<DirectionIcon windDirection={45} boatCourse={120} />
```

**Details**:
- Single reusable component for both wind arrows and wave arrows
- Contains wind arrow SVG and boat icon SVG
- Parent handles apparent/true wind conversion - component receives final directions
- CSS sizing handled by parent component
- No events emitted

### 2. TimeCell.svelte
**Purpose**: Display time, date, and forecast freshness

**Props**:
```svelte
<TimeCell timestamp={1234567890} forecastData={data.forecast} />
```

**Details**:
- Shows formatted time and weekday date
- Handles forecast freshness calculation and display (⚠ indicator)
- Uses `formatTime`, `formatWeekDayDate` from utils
- Implements `getForecastFreshness()` logic internally
- Shows "--" for null/invalid data
- No events emitted

### 3. WeatherCell.svelte
**Purpose**: Display weather icon and precipitation

**Props**:
```svelte
<WeatherCell weatherCode={2} precipitation={0.5} />
```

**Details**:
- Weather icon from `/img/icons7/png_27@2x/{icon}.png`
- Precipitation formatting using `formatPrecipitation` from utils
- Shows "--" for null precipitation
- No events emitted

### 4. WindCell.svelte
**Purpose**: Display wind speed with direction (handles both wind and gusts)

**Props**:
```svelte
<WindCell speed={15.2} direction={45} boatCourse={120} />
```

**Details**:
- Uses `formatWindSpeed` from utils internally
- Includes DirectionIcon for wind direction and boat orientation
- Same component used for both wind column and gust column
- For gust column: pass gust speed/direction as speed/direction props
- Shows "--" for null/invalid speed
- No events emitted

### 5. WaveCell.svelte
**Purpose**: Display wave height/period with direction

**Props**:
```svelte
<WaveCell height={2.1} period={8} direction={180} boatCourse={120} />
```

**Details**:
- Uses `formatWaveHeight` from utils internally
- Shows period in seconds (rounded)
- Includes DirectionIcon for wave direction and boat orientation
- Shows "--" for null/invalid data
- No events emitted

## Shared Utilities

### ColorUtils.ts
**Location**: `src/utils/ColorUtils.ts`

**Functions**:
- `getWindColor(windSpeedMs: number): string` - Windy windDetail palette
- `getSeaIndexColor(seaIndex: number): string` - Sea condition colors
- `interpolateColors(color1: string, color2: string, factor: number): string`
- `createGradientBackground(currentValue, prevValue, nextValue, colorFunc): string`
- `hexToRgb(hex: string): string` - For CSS custom properties

## Component Architecture Decisions

### Responsibility Split
- **ForecastTable**: Layout, styling, gradient backgrounds, event coordination, data preparation
- **Cell Components**: Content rendering only, format their own data, handle null states

### Data Flow
- ForecastTable calculates all data needed by cells (wind speed, directions, etc.)
- ForecastTable handles true/apparent wind conversion before passing to cells
- ForecastTable calculates gradient backgrounds and applies to cell containers
- Cell components receive processed, final data ready for display

### Styling Strategy
- ForecastTable keeps all `.forecast-item .column-name` styles (box model, padding, backgrounds)
- Cell components only style their internal content
- No background colors passed as props - handled by ForecastTable CSS
- DirectionIcon sized by parent CSS

### Event Handling
- No events emitted by cell components
- `timeHover` remains at forecast-item level (ForecastTable)
- `metricClick` only in table header (ForecastTable)
- Drag & drop stays in ForecastTable

### File Structure
```
src/components/forecast-cells/
├── REFACTORING.md          # This file
├── DirectionIcon.svelte
├── TimeCell.svelte
├── WeatherCell.svelte
├── WindCell.svelte
└── WaveCell.svelte
```

### Error Handling
- All components handle null/undefined props gracefully
- Display "--" for missing numeric data
- No error states or loading indicators (handled by ForecastTable)

## Incremental Migration Plan

**IMPORTANT**: After each component creation, immediately update ForecastTable and test functionality to catch regressions early.

1. **Create ColorUtils.ts**
   - Extract color functions from ForecastTable
   - Update ForecastTable imports
   - **TEST: Colors and gradients work correctly**

2. **Create forecast-cells directory**

3. **Create WeatherCell.svelte** (simplest component)
   - Implement weather icon and precipitation display
   - Update ForecastTable to use WeatherCell
   - Remove old weather cell code from ForecastTable
   - **TEST: Weather column displays correctly**

4. **Create DirectionIcon.svelte**
   - Extract SVG arrow and boat icons
   - Update ForecastTable to use DirectionIcon in existing wind/wave cells
   - **TEST: Direction arrows and boat icons display correctly**

5. **Create WindCell.svelte**
   - Implement wind speed display with DirectionIcon
   - Update ForecastTable to use WindCell for both wind and gust columns
   - Remove old wind/gust cell code from ForecastTable
   - **TEST: Wind and gust columns display correctly**

6. **Create WaveCell.svelte**
   - Implement wave height/period display with DirectionIcon
   - Update ForecastTable to use WaveCell
   - Remove old wave cell code from ForecastTable
   - **TEST: Wave column displays correctly**

7. **Create TimeCell.svelte**
   - Implement time/date display with freshness indicator
   - Update ForecastTable to use TimeCell
   - Remove old time cell code from ForecastTable
   - **TEST: Time column displays correctly**

8. **Final verification**
   - **TEST: All functionality matches original behavior**
   - **TEST: No performance degradation**

## Technical Notes

### DirectionIcon Implementation
- Calculate boat rotation internally based on `boatCourse` prop
- Always show both wind arrow and boat icon
- Arrow rotated by `windDirection + 180` degrees (pointing toward wind)
- Boat rotated by `boatCourse` degrees
- Use existing SVG paths from ForecastTable

### Data Extraction Examples

From ForecastTable, cells receive:
```javascript
// WindCell props
const windProps = {
  speed: getWindSpeed(data.forecast),      // Handles true/apparent logic
  direction: getWindDirection(data.forecast), // Already converted for display
  boatCourse: forecast?.route?.legs?.[0]?.course || 0
};

// WaveCell props
const waveProps = {
  height: data.forecast?.northUp?.wavesHeight,
  period: data.forecast?.northUp?.wavesPeriod,
  direction: getWaveDirection(data.forecast),  // Already converted for display
  boatCourse: forecast?.route?.legs?.[0]?.course || 0
};
```

### Tooltip Handling
- Each cell implements its own tooltip logic
- WindCell: `getWindDirectionForTooltip()` equivalent
- WaveCell: `getWaveDirectionForTooltip()` equivalent
- TimeCell: Forecast freshness tooltip
- WeatherCell: No tooltips needed

## Success Criteria

- [ ] ForecastTable.svelte significantly reduced in size
- [ ] All cell components are reusable and focused
- [ ] Original functionality preserved exactly
- [ ] No performance degradation
- [ ] Clean separation of concerns
- [ ] Maintainable component architecture
- [ ] Each step tested and verified before proceeding

## Future Enhancements

After refactoring:
- Components could be used in other parts of the application
- Individual cell testing becomes easier
- Cell-specific features easier to add
- Better TypeScript support for cell props