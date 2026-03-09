# Windy Sailing Route Planner Plugin 🏁

A comprehensive sailing route planner plugin for Windy that provides advanced weather routing capabilities with sailing-specific features.

## 🚀 Current Status

**✅ FULLY FUNCTIONAL** - Complete sailing route planner with weather integration

- 🌐 **Live Development Server**: Running at `https://0.0.0.0:9999`
- 🔄 **Hot Reload**: Real-time building with Rollup
- ⚡ **Ready to Use**: All core features implemented and working

## ✨ Features

### 🗺️ Route Planning
- **Interactive Route Creation**: Click on the map to create sailing routes with multiple waypoints
- **URL Import**: Import routes from Windy's route planner URLs for instant analysis
- **Visual Route Editor**: Drag waypoints to modify routes with real-time visual feedback
- **Multi-Color Routes**: Different colored routes for easy identification
- **Waypoint Management**: Add, move, and delete waypoints with hover controls

### 🌤️ Weather Integration
- **Advanced Weather Forecasting**: Get detailed weather forecasts for entire sailing routes
- **Apparent Wind Calculations**: Automatic conversion from true wind to apparent wind based on boat speed and heading
- **Per-Leg Processing**: Individual weather analysis for each route segment with accurate timing
- **Long Passage Support**: Automatic handling of multi-day passages (routes >67 hours split automatically)
- **Hourly Consolidation**: Multiple forecasts averaged into hourly data for optimal sailing decisions

### 🧭 Sailing-Specific Features
- **True-to-Apparent Wind Conversion**: Vector-based calculations for accurate apparent wind
- **Relative Wind Directions**: Wind angles relative to boat heading for sail trim decisions
- **Course Calculations**: Proper bearing calculations with 0-359° nautical convention
- **Distance in Nautical Miles**: All distances converted to standard sailing units
- **Route Timing**: Precise timing calculations based on individual leg speeds

## 🎯 Quick Start

### 1. Start Development Server
```bash
npm start
# Server starts at https://0.0.0.0:9999
```

### 2. Create a Route (Interactive)
1. Click **"Start New Route"** button
2. Click on the map to add waypoints
3. See route visualization in real-time
4. Drag waypoints to modify the route
5. Hover over waypoints to delete them

### 3. Import Existing Route (URL-Based)
1. Paste a Windy route planner URL in the input field
2. Click **"Parse Route"** to extract waypoints
3. Click **"Get Forecast"** for complete weather analysis
4. View results in console and summary display

### 4. View Weather Results
- **Summary**: Check "Last Result" section for forecast overview
- **Detailed Data**: Open browser console for complete weather data
- **Apparent Wind**: All forecasts include apparent wind calculations

## 📋 Example Test Route

Pre-loaded in the plugin for testing:
```
https://www.windy.com/route-planner/boat/2.8726,-84.8206;-0.2539,-86.6167;-0.1687,-88.8618;-0.7887,-90.2270;1.0536,-89.9273;2.8996,-91.9098;0.6286,-94.1834?-1.115,-90.163,6,p:cities
```

**Route Details**: 7-waypoint passage with complex navigation - perfect for testing all features.

## 🔧 Technical Architecture

### 📁 File Structure
```
src/
├── plugin.svelte                 # Main UI with route parsing and forecasting
├── pluginConfig.ts               # Plugin metadata and settings
├── controllers/
│   └── RouteEditorController.ts  # Interactive map route management
├── services/
│   ├── WindyAPI.ts              # Complete Windy API integration
│   └── WeatherForecastService.ts # Advanced forecast service
├── types/
│   ├── RouteTypes.ts            # Route definitions with navigation
│   ├── WeatherTypes.ts          # Weather data structures
│   └── Coordinates.ts           # Leaflet coordinate integration
└── utils/
    ├── NavigationUtils.ts       # Sailing calculations (apparent wind, etc.)
    └── TimeUtils.ts             # Date formatting utilities
```

### 🏗️ Architecture Flow
```
UI Interaction → Route Controller → Weather Service → Windy API
     ↓                ↓                 ↓
Route Editing → Waypoint Management → Per-Leg Forecasts
     ↓                ↓                 ↓
Visual Updates → Real-time Feedback → Apparent Wind Calculations
```

## 🧪 Development Features

### Hot Reload Development
- **Real-time Building**: Changes automatically compiled and served
- **Browser Integration**: Connect to Windy development environment
- **Console Debugging**: Detailed logging for development and testing

### Code Quality
- **TypeScript**: Full type safety throughout the codebase
- **Modular Design**: Clear separation of concerns between layers
- **Error Handling**: Comprehensive error checking and user feedback

## 📊 Weather Data Output Example

```javascript
Point 0: {
  time: "2026-03-08T11:40:59.000Z",
  position: "2.8726, -84.8206",
  bearing: "245°",
  northUpWind: "12.3 knots @ 078°",      // True wind (north up)
  apparentWind: "15.7 knots @ 156°",     // Apparent wind for sailing
  leg: "245° course"                     // Current leg information
}
```

## 🔮 Future Enhancements

### Phase 2+ Planned Features
- **Visual Forecast Display**: Graphical weather visualization on map
- **Route Optimization**: AI-powered routing suggestions based on weather
- **Export Capabilities**: Save routes and forecasts in standard formats
- **Multi-Model Weather**: Integration with additional weather models
- **Performance Optimization**: Caching and optimized API calls

### Technical Improvements
- **Current Data Integration**: When API provides ocean current data
- **Advanced Weather Parameters**: Additional weather parameters as available
- **UI Enhancements**: More sophisticated forecast visualization
- **Mobile Optimization**: Enhanced mobile user experience

## 🛠️ Development Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Windy plugin development environment access

### Key Commands
```bash
npm start          # Start development server
npm run build      # Production build
npm run lint       # Code linting (if configured)
```

### Loading in Windy
1. Start the development server: `npm start`
2. Navigate to [Windy Developer Mode](https://www.windy.com/developer-mode)
3. Load plugin from: `https://localhost:9999/plugin.js`
4. Plugin appears in right panel as "Sail Router Planner"

## 📈 Implementation Progress

### ✅ Phase 1: Technical Foundation - COMPLETE
- [x] Weather Service Architecture
- [x] Windy API Integration
- [x] Navigation Calculations
- [x] Route Management System
- [x] Interactive Map Integration
- [x] Apparent Wind Calculations

### 🚧 Phase 2: UI Enhancement - IN PLANNING
- [ ] Visual Forecast Display
- [ ] Enhanced Route Visualization
- [ ] Export/Import Capabilities
- [ ] Mobile UI Optimization

---

**🏁 Ready for sailing route planning with advanced weather integration!**

*This plugin demonstrates state-of-the-art integration with Windy's APIs to provide professional-grade sailing weather routing capabilities.*