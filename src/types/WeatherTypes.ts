import type { LatLng } from './Coordinates';
import type { RouteLeg, RouteDefinition } from './RouteTypes';

export interface WeatherStats {
	minWindSpeed: number;
	avgWindSpeed: number;
	maxWindSpeed: number;
	minGust: number;
	avgGust: number;
	maxGust: number;
	minWaveHeight: number;
	avgWaveHeight: number;
	maxWaveHeight: number;
	minWavePeriod: number;
	avgWavePeriod: number;
	maxWavePeriod: number;
	percentUpwind: number;
	percentReaching: number;
	percentDownwind: number;
}

export interface WeatherData {
	windSpeed: number; // m/s (from Windy API), converted to knots for display
	relativeWindDirection: number; // degrees, relative to boat heading (-180 to 180, negative=port, positive=starboard)
	trueWindDirection: number; // degrees, true wind direction from north (0-359, meteorological convention)
	gustsSpeed: number; // m/s (from Windy API), converted to knots for display
	currentSpeed: number; // m/s (from Windy API), converted to knots for display
	currentDirection: number; // degrees, 0-359 for north up, -180-180 for apparent
	wavesHeight: number; // meters
	wavesPeriod: number; // seconds
	wavesDirection: number; // degrees, 0-359 for north up, -180-180 for apparent
}

export interface PointForecast {
	point: LatLng; // interpolated point at that time, using the "distances" API response
	timestamp: number; // calculated sailing time when boat will be at this position
	forecastTimestamp: number; // original API timestamp for this forecast data
	bearing: number; // from windyAPI bearings array, degrees 0-359
	leg: RouteLeg | null; // reference to the current Leg
	warnings: string[]; // from windy api
	northUp: WeatherData | null; // data from windy's API, null if no forecast data available
	apparent: WeatherData | null; // northUp data, but with computed AWS, AWA, relative wave direction to course, relative current direction to course
	precipitations: number; // millimeters
	weather: number; // mapping to "icon" API response, will switch to ENUM later (SUN, OVERCAST, RAIN, ...)
}

export interface RouteForecast {
	route: RouteDefinition; // reference to access legs, distances, times, etc
	pointForecasts: PointForecast[];
	legStats: (WeatherStats | null)[];
	routeStats: WeatherStats | null;
}

// Raw API response types
export interface WindyAPIResponse {
	data: {
		gust: number[];
		wind: number[];
		windDir: number[];
		temp: number[];
		precip: number[];
		vis: number[];
		convprecip: number[];
		rh: number[];
		waves: number[];
		wavesDir: number[];
		wavesPeriod: number[];
		warn: (string | null)[];
		icon: number[];
	}
	
	distances: number[];
	bearings: number[];
	timestamps: number[];
	firstClampedIndex: number | null;
}