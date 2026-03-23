# Windy Sailing Weather Forecast Plugin ⛵

A comprehensive sailing weather forecast plugin for Windy that provides advanced route planning with detailed weather analysis and sailing-specific features.

## 🚀 Current Status

**✅ FULLY FUNCTIONAL** - Production-ready sailing weather forecast system

- 🌐 **Live Development Server**: Running at `https://0.0.0.0:9999`
- 🔄 **Hot Reload**: Real-time building with Rollup
- ⚡ **Ready for Production**: All core features implemented and polished

## ✨ Key Features

### 🗺️ Interactive Route Planning
- **Click-to-Create Routes**: Click on map to add waypoints with real-time visualization
- **Great Circle Navigation**: Accurate long-distance routing using Earth's curvature
- **Visual Route Editor**: Drag waypoints to modify routes with live feedback
- **Distance Labels**: Automatic nautical mile distance display on route segments
- **Day Markers**: Visual 24-hour interval markers (1d, 2d, 3d) along multi-day routes

### 🌤️ Comprehensive Weather Forecasting
- **Detailed Forecast Table**: Hour-by-hour weather analysis for entire passage
- **True & Apparent Wind**: Toggle between true wind and apparent wind relative to boat
- **Multi-Day Support**: Handles passages of any length with proper time management
- **Pre/Post Departure**: Shows weather 4 hours before and after passage
- **Real-Time Weather Stats**: Complete leg analysis with min/max/avg values

### 📊 Sailing-Specific Analytics
- **Leg Weather Statistics**: Comprehensive analysis per route segment
  - Wind speeds (min/avg/max) and gusts
  - Wave heights and periods
  - Wind angle distribution (% upwind/reaching/downwind)
- **Passage Timing**: Multi-day leg durations (e.g., "2d 6h", "8h 30m")
- **Speed Management**: Customizable speed per leg with real-time recalculation
- **Departure Time Control**: Adjustable departure with forecast regeneration

### 🎨 Professional User Interface
- **Responsive Layout**: Optimized for both desktop and mobile
- **Loading States**: Professional loading animations with progress feedback
- **Date Formatting**: Intuitive "Wed 25" format using browser locale
- **Auto-Scroll**: Smart positioning to show departure time prominently
- **Visual Freshness**: Color-coded forecast freshness indicators

## 🎯 Quick Start

### 🚀 Install Plugin (Direct Use)
**Plugin URL**: `https://windy-plugins.com/13935398/windy-plugin-sail-router-planner/0.1.0/plugin.min.js`

1. Open [Windy.com](https://www.windy.com)
2. Click the **Menu** (hamburger icon)
3. Select **"Install Windy plugin"**
4. Choose **"Load plugin directly from URL"**
5. Paste the plugin URL above
6. Access via Plugins menu → **"Sail Router Planner"**

### 🛠️ Development Setup
```bash
npm start
# Development server: https://0.0.0.0:9999
# Load in Windy: https://www.windy.com/developer-mode
```

### 2. Create Your Route
1. Click on the map to add waypoints
2. Watch route visualization appear in real-time
3. Drag waypoints to adjust course
4. Set individual leg speeds as needed
5. Adjust departure time if required

### 3. Analyze Weather Forecast
- **Hourly Timeline**: Scroll through hour-by-hour forecasts
- **True/Apparent Toggle**: Switch wind perspective as needed
- **Leg Statistics**: Expand waypoints for detailed analytics
- **Map Integration**: Hover forecast rows to see position on map
- **Layer Control**: Click wind/wave icons to change map overlay

## 🧭 Advanced Features

### Route Management
- **Multi-Color Routes**: Visual distinction for multiple routes
- **Waypoint Controls**: Hover to delete, drag to reposition
- **Route Persistence**: URL-based route saving and sharing
- **Real-Time Updates**: Instant recalculation on any change

### Weather Integration
- **Windy API**: Direct integration with Windy's forecast models
- **Data Validation**: Robust handling of missing or incomplete data
- **Time Alignment**: Forecasts aligned to clock hours (XX:00)
- **Forecast Consolidation**: Smart averaging for optimal accuracy

### Sailing Calculations
- **Apparent Wind Vector**: Proper vector addition for apparent wind
- **Course Calculations**: True bearings with 0-359° convention
- **Wind Angles**: Relative angles for sail trim decisions
- **Distance Accuracy**: Great circle distances in nautical miles

## 📋 Forecast Table Features

### Weather Data Display
- **Wind Speed & Direction**: True and apparent wind with visual indicators
- **Wave Information**: Height, period, and direction relative to course
- **Weather Conditions**: Icons and precipitation data
- **Visibility & Conditions**: Complete weather picture for sailing

### Navigation Information
- **Time & Position**: Precise timing and coordinates for each forecast point
- **Course & Speed**: Bearing and boat speed for each leg segment
- **Progress Tracking**: Visual progress through passage timeline

### Interactive Controls
- **Hover Preview**: Mouse over forecast rows for map preview
- **Time Scrubbing**: Navigate through forecast timeline
- **Speed Adjustment**: Modify leg speeds with instant recalculation
- **Departure Control**: Change start time with forecast regeneration

## 🔧 Technical Architecture

### Core Components
```
src/
├── plugin.svelte                    # Main UI component
├── components/
│   └── ForecastTable.svelte        # Detailed weather forecast display
├── controllers/
│   └── RouteEditorController.ts    # Interactive route management
├── services/
│   ├── WindyAPI.ts                 # Windy API integration
│   └── WeatherForecastService.ts   # Forecast processing & statistics
├── types/
│   ├── RouteTypes.ts               # Route and navigation types
│   ├── WeatherTypes.ts             # Weather data structures
│   └── Coordinates.ts              # Geographic coordinate types
└── utils/
    ├── NavigationUtils.ts          # Sailing calculations
    └── RouteSerializer.ts          # Route URL encoding/decoding
```

### Data Flow
```
User Interaction → Route Controller → Weather Service → Forecast Table
      ↓                   ↓                ↓             ↓
  Map Clicks    → Route Visualization → API Calls → Weather Display
      ↓                   ↓                ↓             ↓
  Waypoints     → Distance Labels   → Leg Stats → Interactive UI
```

## 📈 Weather Statistics

### Per-Leg Analysis
- **Wind Statistics**: Min/avg/max speeds and gusts
- **Wave Analysis**: Height and period ranges
- **Wind Angles**: Sailing point percentages
  - Upwind: <60° relative to wind
  - Reaching: 60-120° relative to wind
  - Downwind: 120°+ relative to wind

### Forecast Quality
- **Freshness Indicators**: Color-coded forecast age
- **Data Validation**: Robust handling of missing data
- **Time Accuracy**: Hour-aligned forecasts for consistency

## 🌊 Example Use Cases

### Ocean Passages
- Plan multi-day Atlantic or Pacific crossings
- Analyze weather windows for optimal departure
- Monitor wind patterns and wave conditions
- Track progress with day markers along route

### Coastal Cruising
- Day sailing with precise timing
- Harbor-to-harbor passage planning
- Weather analysis for safe arrival windows
- Fuel/food planning with accurate timing

### Racing & Performance
- Optimize routing for weather advantages
- Analyze apparent wind for sail selection
- Compare different departure times
- Study wind angle distribution for strategy

## 🔮 Technical Highlights

### Advanced Algorithms
- **Great Circle Navigation**: Earth-curvature-aware routing
- **Vector Wind Calculations**: Proper apparent wind computation
- **Statistical Analysis**: Comprehensive leg weather statistics
- **Time Management**: Precise passage timing calculations

### User Experience
- **Responsive Design**: Seamless desktop and mobile experience
- **Real-Time Feedback**: Instant visual updates on changes
- **Professional Polish**: Loading states, animations, error handling
- **Intuitive Controls**: Natural sailing workflow integration

### Integration Quality
- **Windy API Expertise**: Deep integration with Windy's systems
- **Plugin Standards**: Follows Windy plugin development best practices
- **Performance Optimized**: Efficient API usage and data processing
- **Error Resilience**: Graceful handling of edge cases and API limitations

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Windy plugin development access
- Basic sailing/navigation knowledge helpful

### Commands
```bash
npm start          # Development server
npm run build      # Production build
git status         # Check changes
git commit         # Commit improvements
```

### Plugin Loading
1. Start development: `npm start`
2. Open Windy: `https://www.windy.com/developer-mode`
3. Load plugin: `https://localhost:9999/plugin.js`
4. Access via: Plugins menu → "Sail Router Planner"

## 🏆 Project Status

### ✅ Completed Features (Production Ready)
- [x] Interactive route creation and editing
- [x] Comprehensive weather forecast table
- [x] True/apparent wind calculations and toggle
- [x] Multi-day passage support with day markers
- [x] Detailed per-leg weather statistics
- [x] Professional UI with loading states
- [x] Great circle navigation accuracy
- [x] Browser locale date formatting
- [x] Responsive layout optimization
- [x] Route URL persistence and sharing

### 🎯 Quality Achievements
- [x] Production-grade error handling
- [x] Comprehensive TypeScript typing
- [x] Professional visual polish
- [x] Sailing-specific feature set
- [x] Performance optimization
- [x] Mobile responsiveness

---

**🌊 Professional sailing weather routing at your fingertips!**

*This plugin represents a complete sailing weather forecast solution, built with deep Windy API integration and professional sailing workflow understanding.*