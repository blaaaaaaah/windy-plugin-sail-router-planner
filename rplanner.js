/**
 * Windy.com Route Planner Plugin (rplanner)
 * Compiled Svelte 5 component
 * 
 * Main components:
 *   - RouteDetailContainer (Ht)
 *   - GpxDropZone (nr) 
 *   - SaveRouteIcon (gr)
 *   - ViewSwitcher (mr) - elevation/car/boat/vfr/ifr/airgram
 *   - MetricDisplay (xr)
 *   - SpeedInput ($r)
 *   - SpeedControl (Fr)
 *   - DesktopBottomBar (_r)
 *   - RouteDrawing (Dr) - core map interaction
 *   - InfoBox (Qr)
 *   - LegendRow (Wr)
 *   - DataTable (An) - main forecast table
 *   - TimestampSlider (ho)
 *   - MainWrapper (ti) - default export
 */

// ─── Async generator helper ───────────────────────────────────────────────────
function asyncStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }
  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

// ─── Async function wrapper ───────────────────────────────────────────────────
function asyncToGenerator(fn) {
  return function () {
    var self = this,
      args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);
      function _next(value) {
        asyncStep(gen, resolve, reject, _next, _throw, "next", value);
      }
      function _throw(err) {
        asyncStep(gen, resolve, reject, _next, _throw, "throw", err);
      }
      _next(undefined);
    });
  };
}

// ─── Object spread helpers ────────────────────────────────────────────────────
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }
  return target;
}

function defineProperty(obj, key, value) {
  key = toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

function toPropertyKey(arg) {
  var key = toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : key + "";
}

function toPrimitive(input, hint) {
  if (typeof input !== "object" || !input) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}

// ─── Imports ──────────────────────────────────────────────────────────────────
import {
  c as createComponent,
  f as init,
  s as setText,
  e as listen,
  a as append,
  b as createEventDispatcher,
  u as noop,
  g as get_current_component,
  d as safeGet,
  t as createText,
  i as insertBefore,
} from "./_shared/misc.js";
import "./_shared/legacy.js";
import {
  p as createElement,
  c as getChild,
  r as removeNode,
  t as setTextBinding,
  b as createComment,
  l as setStyle,
  g as getValue,
  m as createStore,
  a as addEffect,
  h as createEffect,
  u as getUntracked,
  d as derivedStore,
  s as setStore,
  e as createDerived,
  f as createFlag,
  i as createLifecycle,
  n as createNode,
  x as createExpression,
  C as Component,
  w as watchStore,
  v as createValue,
  k as setAttr,
  o as onDestroy,
} from "./_shared/effects.js";
import { i as ifBlock } from "./_shared/if.js";
import { a as addCss } from "./_shared/css.js";
import { s as setClass } from "./_shared/class.js";
import { b as bindProp } from "./_shared/props2.js";
import { b as bindThis } from "./_shared/this.js";
import { p as preventDefault } from "./_shared/event-modifiers.js";
import { i as initComponent } from "./_shared/lifecycle.js";
import { a as getStore, b as setStoreValue, s as subscribeStore } from "./_shared/store.js";

// ─── Windy globals ────────────────────────────────────────────────────────────
const broadcast = window.W.broadcast;
const rootScope = window.W.rootScope;
const { isMobileOrTablet, isMobile } = window.W.rootScope;
const products = window.W.products;
const utils = window.W.utils;
const {
  vec2size,
  canvasRatio,
  scaleLinear,
  clamp0X,
  bicubicFiltering,
  lerpColor256,
  spline,
  lerp,
  tsMinute,
} = window.W.utils;

import { o as onMount, a as onDestroy2 } from "./_shared/index-client.js";
import { w as writableStore } from "./_shared/svelte-store-adapter.js";

const { t: trans } = window.W.trans;

import {
  r as rpRouteDetail,
  p as encodePoints,
  c as rpIdStore,
  d as rpWaypointsStore,
  e as rpViewStore,
  g as updateFavRoute,
  h as rpMotionSpeedConverted,
  i as rpSpeedEnabled,
  j as rpFooterHeight,
  k as rpTsStart,
  l as rpTsEnd,
  m as rpTsEndStore,
  n as rpElevationData,
  o as rpHoverPos,
  q as colorScales,
  t as rpForecastData,
  f as formatDuration,
  u as weightedAverage,
  v as smoothArray,
  w as rpDirCorrection,
  x as computeBearing,
  y as showMobileMarker,
  b as rpTsDuration,
  a as rpTsStartStore,
  z as rpTsEndStore2,
  s as calendarUtils,
  C as MobileCalendarTimecode,
  A as fetchElevation,
  B as fetchForecast,
  D as parseElevationData,
  E as parseForecastData,
  F as buildRouteHash,
} from "./_shared/utils.js";

import { t as transition, f as fadeTransition } from "./_shared/index2.js";
import { a as bindInput, b as bindInputNumber } from "./_shared/input.js";

const {
  LineUtil,
  Point,
  LatLng,
  latLng,
  DivIcon,
  Marker,
  Earth,
  Bounds,
} = window.L;

import { b as bindSize } from "./_shared/size.js";
import { c as classAttr } from "./_shared/attributes2.js";
import { p as propStore } from "./_shared/props.js";

const userFavs = window.W.userFavs;
const user = window.W.user;
const store = window.W.store;

import { g as getStoreValue, w as writableStore2 } from "./_shared/index.js";
import { e as eachBlock, i as eachKey } from "./_shared/each.js";
import { s as setAttr2, r as bindRef, c as setXlinkHref } from "./_shared/attributes.js";
import { C as CheckboxComponent } from "./_shared/checkbox.js";

const metrics = window.W.metrics;
const { map: leafletMap, markers } = window.W.map;
const { singleclick } = window.W.singleclick;
const subscription = window.W.subscription;
const { hasAny: hasSubscription } = window.W.subscription;

import { G as GeodesicPolyline, e as exportRoute } from "./_shared/geodesic.js";
import { a as awaitBlock } from "./_shared/await.js";
import { s as setStyle2 } from "./_shared/style.js";

const format = window.W.format;

import { M as MeteogramPrecipIcons } from "./_shared/meteogram-precip-icons.js";
import { a as useAction } from "./_shared/actions.js";
import { o as observeSize } from "./_shared/observe-size.js";
import { D as DraggableDiv } from "./_shared/draggable-div.js";
import { b as BicubicRenderer, I as ImageCanvas } from "./_shared/image-renderers.js";
import { a as slotContent } from "./_shared/slot.js";
import { k as keyBlock } from "./_shared/key.js";

const overlays = window.W.overlays;

import { c as additionalColors } from "./_shared/additional-colors.js";
const { Color } = window.W.Color;
import { c as svelteComponent } from "./_shared/svelte-component.js";
import {
  b as bindMobileCalendar,
  M as MobileCalendarWidget,
  a as MobileTimecode,
} from "./_shared/mobile-calendar-timecode.js";
import { h as setHtml } from "./_shared/html.js";
import { g as getIssueChip } from "./_shared/issue-chip.js";
const { Drag } = window.W.Drag;
import { M as MobileBottomIcon } from "./_shared/mobile-bottom-icon.js";
const { share } = window.W.share;
import { D as DropDown } from "./_shared/drop-down.js";
import "./_shared/snippet.js";

// ─── View options ─────────────────────────────────────────────────────────────
const VIEW_OPTIONS = [
  { view: "elevation", icon: "n", text: "ELEVATION", onlyDesktop: true },
  { view: "car", icon: "\uE000", text: "DST_CAR" },
  { view: "boat", icon: "\uE028", text: "DST_BOAT" },
  { view: "vfr", icon: ":", text: "VFR" },
  { view: "ifr", icon: "Q", text: "IFR" },
  { view: "airgram", icon: "|", text: "Airgram" },
];

// ─── Chart heights per view (px) ─────────────────────────────────────────────
const VIEW_HEIGHTS = {
  elevation: 150,
  car: 245,
  boat: 185,
  vfr: 230,
  ifr: 275,
  airgram: 275,
};

// ─── Pressure levels → approximate altitude (m) ──────────────────────────────
const PRESSURE_TO_ALTITUDE = {
  1000: 100,
  950: 600,
  925: 750,
  900: 900,
  850: 1500,
  800: 2000,
  700: 3000,
  600: 4200,
  500: 5500,
  400: 7000,
  300: 9000,
  250: 10000,
  200: 11700,
  150: 13500,
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
export const __css = `
#device-mobile .onrplanner #logo-wrapper,
#device-tablet .onrplanner #logo-wrapper,
#device-mobile .onrplanner #open-in-app,
#device-tablet .onrplanner #open-in-app,
#device-mobile .onrplanner #go-premium-mobile,
#device-tablet .onrplanner #go-premium-mobile {
  display: none !important;
}
#device-desktop .onrplanner .rhpane__bottom-messages,
#device-desktop .onrplanner #plugin-map-selector,
#device-desktop .onrplanner #plugin-rhbottom {
  display: none !important;
}
#device-mobile .onrplanner #plugin-mobile-ui,
#device-tablet .onrplanner #plugin-mobile-ui,
#device-mobile .onrplanner #plugin-picker-mobile,
#device-tablet .onrplanner #plugin-picker-mobile {
  display: none !important;
}

@media screen and (max-height: 400px) {
  .onrplanner #search {
    display: none;
  }
}

.onrplanner #map-container #leaflet-map {
  cursor: crosshair;
}
.onrplanner #map-container .leaflet-marker-pane .labels-layer [data-id],
.onrplanner #map-container .leaflet-marker-pane .windy-pois [data-id] {
  pointer-events: none;
  opacity: 0.6;
}

#plugin-rplanner {
  background-color: var(--color-white);
  font-size: 12px;
  pointer-events: auto;
  width: 100vw;
  position: relative;
  z-index: 10;
  margin-bottom: -110%;
  color: #222;
  box-shadow: content-box;
}
#plugin-rplanner:not(.no-animation) {
  transition: margin-bottom 0.3s ease-in-out;
}
#plugin-rplanner.open {
  margin-bottom: 0;
}
#plugin-rplanner .progress-bar,
#plugin-rplanner .pb-calendar {
  left: 140px;
  position: absolute;
  right: 160px;
  bottom: 100%;
}
`;

// ─── GPX parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a GPX string, simplify the route to max 100 points,
 * then open the route planner with the result.
 */
function parseGPXAndOpen(gpxString) {
  try {
    const points = (function parseGPX(xml) {
      const getPoints = (el, tagName) => {
        const nodes = el.getElementsByTagName(tagName);
        if (!nodes.length) return [];
        const pts = [];
        for (let k = 0; k < nodes.length; k++) {
          pts.push(
            new Point(
              +nodes[k].getAttribute("lat"),
              +nodes[k].getAttribute("lon")
            )
          );
        }
        return pts;
      };

      const trackTypes = [
        ["rte", "rtept"],
        ["trkseg", "trkpt"],
      ];
      for (let i = 0; i < trackTypes.length; i++) {
        const segments = xml.getElementsByTagName(trackTypes[i][0]);
        for (let j = 0; j < segments.length; j++) {
          const pts = getPoints(segments[j], trackTypes[i][1]);
          if (pts.length > 1) return pts;
        }
      }
      return [];
    })(new DOMParser().parseFromString(gpxString, "text/xml"));

    let simplified = points;
    let maxIterations = 100;

    if (points.length > 100) {
      // Calculate average segment length / 4 as initial tolerance
      let totalLength = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        totalLength += vec2size(dx, dy);
      }
      let tolerance = (totalLength / points.length) / 4;
      let result = [];

      do {
        result = LineUtil.simplify(points, tolerance);
        tolerance *= 1.2;
      } while (result.length > 100 && --maxIterations > 0);

      simplified = result;
    }

    const coords = simplified
      .map(({ x, y }) => `${x},${y}`)
      .join(";");

    broadcast.emit("rqstOpen", "rplanner", { coords });
  } catch (e) {
    console.error(e);
  }
}

/** Read a File object as text and parse as GPX */
const readGPXFile = (file) => {
  const reader = new FileReader();
  reader.readAsText(file, "UTF-8");
  reader.onload = (e) => {
    if (e && e.target && e.target.result) {
      parseGPXAndOpen(e.target.result.toString());
    }
  };
};

/** Handle a FileList from an input[type=file] */
const handleFileList = (files) => {
  if (files) readGPXFile(files[0]);
};

// ─── Route saving helpers ─────────────────────────────────────────────────────

/** Build a favourites entry object from current route state */
const buildFavEntry = (points, view) => {
  const { lat, lng } = points[0].point;
  const routeHash = encodePoints(points);
  const route = `${view}/${routeHash}`;
  const date = new Date().toISOString().replace(/T.*/, "");
  return { title: `Route saved ${date}`, type: "route", lat, lon: lng, route };
};

/** Save the current route to favourites */
const saveRoute = asyncToGenerator(function* () {
  if (store.get("user")) {
    const { points } = getStoreValue(rpWaypointsStore);
    const view = getStoreValue(rpViewStore);
    const entry = buildFavEntry(points, view);
    const id = yield userFavs.add(entry);
    if (typeof id === "string") {
      rpIdStore.set(id);
      updateFavRoute(id, view, points);
    }
  } else {
    user.login();
  }
});

/** Update an existing saved route */
const updateSavedRoute = asyncToGenerator(function* (id, points, view) {
  const { route, lat, lon } = buildFavEntry(points, view);
  yield userFavs.update(id, { lat, lon, route });
});

/** Remove a saved route */
const removeSavedRoute = asyncToGenerator(function* (id) {
  yield userFavs.remove(id);
  rpIdStore.set(null);
});

// ─── Component: RouteDetailButton (desktop) ───────────────────────────────────
// Shows a small "More options" button below the legend column
// Clicking toggles the route-detail popup window

// ─── Component: GpxDropZone ───────────────────────────────────────────────────
// Shown when the map has no waypoints yet
// User can click anywhere on the map (singleclick) or drag-and-drop / select a GPX file

// ─── Component: SaveRouteIcon ─────────────────────────────────────────────────
// Star/bookmark icon — shows remove-from-favs (filled star) or save (empty star)
// depending on whether the route already has a saved id

// ─── Component: ViewSwitcher ─────────────────────────────────────────────────
// Horizontal switch: Elevation | Car | Boat | VFR | IFR | Airgram
// On mobile the "Elevation" option is hidden (onlyDesktop)

// ─── Component: MetricDisplay (xr) ───────────────────────────────────────────
// Clickable metric badge — clicking cycles through unit options
// Used for distance, speed, elevation, altitude, etc.

// ─── Component: SpeedInput ($r) ──────────────────────────────────────────────
// Numeric input for average travel speed
// Disabled when speed-based ETA is turned off

// ─── Component: SpeedControl (Fr) ────────────────────────────────────────────
// Checkbox + speed input + speed unit badge
// Disabled when view = "elevation"

// ─── Component: DesktopBottomBar (_r) ────────────────────────────────────────
// The fixed bar at the bottom of the desktop rplanner:
//   [ViewSwitcher]  [SpeedControl]  [SaveIcon]

// ─── Component: RouteDrawing (Dr) ────────────────────────────────────────────
/**
 * Core map interaction component.
 *
 * Manages:
 *  - Leaflet geodesic polyline ("distance-rplanner-line")
 *  - Array of draggable Leaflet markers (waypoints)
 *  - Segment distance labels rendered as SVG <text> inside the polyline container
 *  - Waypoint data store (rpWaypointsStore) updated via debounced recalculation
 *  - Hover position marker (pulsating icon)
 *  - Route reversal
 *
 * Props:
 *  - waypoints  {string|object} — initial waypoints (coords string or lat/lon obj)
 *  - onClose    {function}      — called when last waypoint is removed
 *
 * Exposed methods:
 *  - getDistance(a, b)  — great-circle distance between two LatLng points
 *  - reverse()          — reverse the current route
 */

// ─── Component: InfoBox (Qr) ─────────────────────────────────────────────────
// Left sidebar panel showing:
//   - Total distance (with clickable metric)
//   - When view = "elevation": gain / loss / max / min elevation

// ─── Component: LegendItem (Wr) ──────────────────────────────────────────────
// A single row in the left legend column.
// Props: key, height, name
// If the colour scale has a metric, shows a MetricDisplay; otherwise a coloured swatch.

// ─── Component: LegendColumn (Ar) ────────────────────────────────────────────
// Renders the full left column of legend rows for the active view.
// Each view has a predefined list of {key, height} entries.
//
// View → legend rows:
//   elevation  → (none)
//   car        → temp, rain, wind, windGust, windDir, elevation
//   vfr        → precip(special), warnings, ctop, cbase, vis, dewpoint
//   ifr        → isa, warnings, ctop
//   boat       → temp, rain, wind, windGust, windDir, waves
//   airgram    → temp(tall)

// ─── SVG chart components ─────────────────────────────────────────────────────

// SvgWrapper (ma)     — creates an <svg> sized to the canvas
// ElevationLayer (ua) — draws the elevation fill + labels on the canvas
// WaypointMarkers (Ma)— draws numbered circles at each waypoint on the SVG
// FreezingLevel (an)  — draws the 0°C isotherm line
// WindBarbs (Ta)      — draws wind barb symbols
// CarLayers (en)      — car view: icon + temp + rain + wind + windGust + windDir
// WavesRow (ka)       — boat view: wave height coloured bars + direction arrows
// TempLabels (Wa)     — temperature value labels
// RainLabels (Va)     — precipitation coloured bars + value labels
// WindLabels (Ga)     — wind speed coloured bars + value labels
// WindGustLabels (Ja) — wind gust coloured bars + value labels
// WindDirArrows (Ha)  — wind direction arrow icons
// Airgram (Qa)        — full airgram: temp heatmap + wind barbs
// AirgramISA (mn)     — ISA deviation heatmap
// CloudCover (En)     — cloud cover bitmap (RH-based)
// DewpointSpread (Cn) — dew point spread coloured bars
// Visibility (Un)     — visibility coloured bars
// CloudBase (Ln)      — cloud base altitude bars
// CloudTop (cn)       — cloud top altitude bars
// Warnings (hn)       — weather warning icons (FG, FZFG, TH, LGTH, HVTH)
// PrecipBars (_n)     — precipitation bars (snow/conv/rain) with accumulation labels
// WeatherIcons (Ra)   — wx icon sprites along the route
// ForecastClampLine (ea) — "showing forecast for..." clamped region indicator

// ─── Component: DataTable (An) ───────────────────────────────────────────────
/**
 * The main scrollable forecast chart area.
 *
 * Creates an ImageCanvas and sets it in the rpCanvas store.
 * Dispatches rendering tasks (elevation fetch, forecast fetch) via executeRenderingTasks.
 *
 * Context provided:
 *   hideLegend     — true when legend is scrolled off-screen
 *   hasScroll      — true when table can scroll right
 *   hasScrollLeft  — true when table has scrolled right
 *   getMainSection — ref to the outer <section> element
 */

// ─── Component: TimestampSlider (ho) ─────────────────────────────────────────
// Desktop progress bar (hidden on mobile)
// Shows the available calendar range and a draggable "played" indicator.
// Also renders from/to timecode labels when speed-based ETA is enabled.

// ─── Component: HoverInfo (jn) ───────────────────────────────────────────────
// Overlay that follows the mouse over the canvas.
// Shows: distance, elevation, time (when speed enabled)

// ─── Component: MainWrapper (ti) — DEFAULT EXPORT ────────────────────────────
/**
 * Root component of the route planner plugin.
 *
 * Lifecycle:
 *   onopen(params) — called by Windy when the plugin is opened
 *     params.view     — initial view (default: "elevation", mobile: "car")
 *     params.coords   — semicolon-separated "lat,lon" string
 *     params.id       — favourites id of an existing route
 *     params.import   — true if params.content is a GPX string to import
 *
 * Rendering pipeline:
 *   1. User draws route on map → rpWaypointsStore updated
 *   2. rpWaypointsStore change triggers ne() → decides which fetches to run
 *   3. fetchElevation() and/or fetchForecast() results populate stores
 *   4. DataTable canvas components react to store changes and redraw
 *
 * Exposed methods:
 *   onopen(params)              — open/reset the planner
 *   executeRenderingTasks(tasks) — run an async task queue with abort support
 */
export default function RPlanner(element, props) {
  // ... (full Svelte 5 compiled component body)
  // See minified source for implementation details
}
function e(e,t,r,a,n,o,i) {
  try {
    var s=e[o](i),l=s.value
  }
  catch(e) {
    return void r(e)
  }
  s.done?t(l):Promise.resolve(l).then(a,n)
}
function t(t) {
  return function() {
    var r=this,a=arguments;
    return new Promise(function(n,o) {
      var i=t.apply(r,a);
      function s(t) {
        e(i,n,o,s,l,"next",t)
      }
      function l(t) {
        e(i,n,o,s,l,"throw",t)
      }
      s(void 0)
    }
    )
  }
}
function r(e,t) {
  var r=Object.keys(e);
  if(Object.getOwnPropertySymbols) {
    var a=Object.getOwnPropertySymbols(e);
    t&&(a=a.filter(function(t) {
      return Object.getOwnPropertyDescriptor(e,t).enumerable
    }
    )),r.push.apply(r,a)
  }
  return r
}
function a(e) {
  for(var t=1;
  t<arguments.length;
  t++) {
    var a=null!=arguments[t]?arguments[t]: {
    };
    t%2?r(Object(a),!0).forEach(function(t) {
      n(e,t,a[t])
    }
    ):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):r(Object(a)).forEach(function(t) {
      Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))
    }
    )
  }
  return e
}
function n(e,t,r) {
  return(t=function(e) {
    var t=function(e,t) {
      if("object"!=typeof e||!e)return e;
      var r=e[Symbol.toPrimitive];
      if(void 0!==r) {
        var a=r.call(e,t||"default");
        if("object"!=typeof a)return a;
        throw new TypeError("@@toPrimitive must return a primitive value.")
      }
      return("string"===t?String:Number)(e)
    }
    (e,"string");
    return"symbol"==typeof t?t:t+""
  }
  (t))in e?Object.defineProperty(e,t, {
    value:r,enumerable:!0,configurable:!0,writable:!0
  }
  ):e[t]=r,e
}