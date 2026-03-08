import { WeatherForecastService } from '../../src/services/WeatherForecastService';
import { RouteDefinition, RouteLeg } from '../../src/types/RouteTypes';
import { PointForecast, WeatherData, WindyAPIResponse } from '../../src/types';

// Helper functions for creating test data
function createMockWeatherData(windSpeed: number, windDirection: number): WeatherData {
    return {
        windSpeed,
        windDirection,
        gustsSpeed: windSpeed + 5,
        gustsDirection: windDirection,
        currentSpeed: 0,
        currentDirection: 0,
        wavesHeight: 2,
        wavesPeriod: 8,
        wavesDirection: windDirection
    };
}

function createMockPointForecast(timestamp: number, leg: RouteLeg): PointForecast {
    return {
        point: { lat: 0, lng: 0 },
        timestamp,
        bearing: 90,
        leg,
        warnings: [],
        northUp: createMockWeatherData(10, 270),
        apparent: createMockWeatherData(12, 250),
        precipitations: 0,
        weather: 1
    };
}

function createMockPointForecastWithWind(windSpeed: number, windDirection: number): PointForecast {
    const leg: RouteLeg = {
        startPoint: new (global as any).L.LatLng(0, 0),
        endPoint: new (global as any).L.LatLng(1, 1),
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        distance: 50,
        course: 90,
        averageSpeed: 5
    };

    return {
        point: { lat: 0, lng: 0 },
        timestamp: Date.now(),
        bearing: 90,
        leg,
        warnings: [],
        northUp: createMockWeatherData(windSpeed, windDirection),
        apparent: createMockWeatherData(windSpeed, windDirection),
        precipitations: 0,
        weather: 1
    };
}

// Mock WindyAPI
class MockWindyAPI {
    private mockResponses: Map<string, WindyAPIResponse> = new Map();

    setMockResponse(key: string, response: WindyAPIResponse) {
        this.mockResponses.set(key, response);
    }

    async getRoutePlanner(startTime: number, endTime: number, waypoints: any[]): Promise<WindyAPIResponse> {
        // Create a key based on the parameters to return specific mock data
        const key = `${startTime}-${endTime}-${waypoints.length}`;

        const mockResponse = this.mockResponses.get(key);
        if (mockResponse) {
            return mockResponse;
        }

        // Default mock response with 23 data points
        return this.createDefaultMockResponse();
    }

    private createDefaultMockResponse(): WindyAPIResponse {
        const dataPoints = 23;
        const baseTime = Date.now();

        return {
            timestamps: Array.from({ length: dataPoints }, (_, i) => baseTime + (i * 60 * 60 * 1000)), // hourly
            distances: Array.from({ length: dataPoints }, (_, i) => i * 1000), // 1km intervals
            bearings: Array.from({ length: dataPoints }, () => 180), // due south
            data: {
                wind: Array.from({ length: dataPoints }, () => 10), // 10 knots
                windDir: Array.from({ length: dataPoints }, () => 270), // west wind
                gust: Array.from({ length: dataPoints }, () => 15), // 15 knots
                waves: Array.from({ length: dataPoints }, () => 2), // 2m waves
                wavesDir: Array.from({ length: dataPoints }, () => 270), // west waves
                wavesPeriod: Array.from({ length: dataPoints }, () => 8), // 8 second period
                precip: Array.from({ length: dataPoints }, () => 0), // no precipitation
                warn: Array.from({ length: dataPoints }, () => null), // no warnings
                icon: Array.from({ length: dataPoints }, () => 1) // clear weather
            }
        };
    }
}

describe('WeatherForecastService', () => {
    let service: WeatherForecastService;
    let mockWindyAPI: MockWindyAPI;

    beforeEach(() => {
        mockWindyAPI = new MockWindyAPI();
        service = new WeatherForecastService(mockWindyAPI as any);
    });

    describe('Leg Breaking Logic', () => {
        test('should not break short legs (<67 hours)', () => {
            const startPoint = new (global as any).L.LatLng(0, 0);
            const endPoint = new (global as any).L.LatLng(1, 1);
            const startTime = Date.now();
            const endTime = startTime + (24 * 60 * 60 * 1000); // 24 hours

            const leg: RouteLeg = {
                startPoint,
                endPoint,
                startTime,
                endTime,
                distance: 100,
                course: 45,
                averageSpeed: 5
            };

            // Use reflection to test private method
            const calculateLegParts = (service as any).calculateLegParts.bind(service);
            const result = calculateLegParts([leg]);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(leg);
        });

        test('should break long legs (>67 hours) into multiple parts', () => {
            const startPoint = new (global as any).L.LatLng(0, 0);
            const endPoint = new (global as any).L.LatLng(2, 2);
            const startTime = Date.now();
            const endTime = startTime + (150 * 60 * 60 * 1000); // 150 hours

            const leg: RouteLeg = {
                startPoint,
                endPoint,
                startTime,
                endTime,
                distance: 200,
                course: 45,
                averageSpeed: 5
            };

            const calculateLegParts = (service as any).calculateLegParts.bind(service);
            const result = calculateLegParts([leg]);

            // 150 hours / 67 = ~2.24, so should be split into 3 parts
            expect(result).toHaveLength(3);

            // Check that total time is preserved
            const totalTime = result.reduce((sum, part) => sum + (part.endTime - part.startTime), 0);
            expect(totalTime).toBe(leg.endTime - leg.startTime);

            // Check that parts are continuous
            for (let i = 1; i < result.length; i++) {
                expect(result[i].startTime).toBe(result[i - 1].endTime);
            }
        });

        test('should preserve total distance when breaking legs', () => {
            const startPoint = new (global as any).L.LatLng(0, 0);
            const endPoint = new (global as any).L.LatLng(3, 3);
            const startTime = Date.now();
            const endTime = startTime + (200 * 60 * 60 * 1000); // 200 hours

            const leg: RouteLeg = {
                startPoint,
                endPoint,
                startTime,
                endTime,
                distance: 300,
                course: 45,
                averageSpeed: 5
            };

            const calculateLegParts = (service as any).calculateLegParts.bind(service);
            const result = calculateLegParts([leg]);

            const totalDistance = result.reduce((sum, part) => sum + part.distance, 0);
            expect(totalDistance).toBeCloseTo(leg.distance, 1);
        });
    });

    describe('Data Consolidation', () => {
        test('should group forecasts by hour correctly', () => {
            const baseTime = Date.now();
            const leg: RouteLeg = {
                startPoint: new (global as any).L.LatLng(0, 0),
                endPoint: new (global as any).L.LatLng(1, 1),
                startTime: baseTime,
                endTime: baseTime + (60 * 60 * 1000),
                distance: 50,
                course: 90,
                averageSpeed: 5
            };

            const forecasts: PointForecast[] = [
                {
                    point: { lat: 0, lng: 0 },
                    timestamp: baseTime,
                    bearing: 90,
                    leg,
                    warnings: [],
                    northUp: createMockWeatherData(10, 270),
                    apparent: createMockWeatherData(12, 250),
                    precipitations: 0,
                    weather: 1
                },
                {
                    point: { lat: 0.1, lng: 0.1 },
                    timestamp: baseTime + (30 * 60 * 1000), // 30 minutes later - same hour
                    bearing: 90,
                    leg,
                    warnings: [],
                    northUp: createMockWeatherData(8, 280),
                    apparent: createMockWeatherData(10, 260),
                    precipitations: 0,
                    weather: 1
                },
                {
                    point: { lat: 0.2, lng: 0.2 },
                    timestamp: baseTime + (65 * 60 * 1000), // 1.08 hours later - next hour
                    bearing: 90,
                    leg,
                    warnings: [],
                    northUp: createMockWeatherData(12, 260),
                    apparent: createMockWeatherData(14, 240),
                    precipitations: 0,
                    weather: 1
                }
            ];

            const consolidateLegsForecasts = (service as any).consolidateLegsForecasts.bind(service);
            const result = consolidateLegsForecasts(forecasts);

            // Should have 2 forecasts (one per hour)
            expect(result).toHaveLength(2);
        });

        test('should preserve single forecasts per hour unchanged', () => {
            const baseTime = Date.now();
            const leg: RouteLeg = {
                startPoint: new (global as any).L.LatLng(0, 0),
                endPoint: new (global as any).L.LatLng(1, 1),
                startTime: baseTime,
                endTime: baseTime + (60 * 60 * 1000),
                distance: 50,
                course: 90,
                averageSpeed: 5
            };

            const forecast: PointForecast = {
                point: { lat: 0, lng: 0 },
                timestamp: baseTime,
                bearing: 90,
                leg,
                warnings: ['test warning'],
                northUp: createMockWeatherData(10, 270),
                apparent: createMockWeatherData(12, 250), // will be recalculated
                precipitations: 2.5,
                weather: 3
            };

            const consolidateLegsForecasts = (service as any).consolidateLegsForecasts.bind(service);
            const result = consolidateLegsForecasts([forecast]);

            expect(result).toHaveLength(1);
            expect(result[0].warnings).toEqual(['test warning']);
            expect(result[0].northUp.windSpeed).toBe(10);
            expect(result[0].precipitations).toBe(2.5);
            expect(result[0].weather).toBe(3);
            // apparent should be recalculated
            expect(result[0].apparent).toBeDefined();
        });

        test('should sort consolidated forecasts by timestamp', () => {
            const baseTime = Date.now();
            const leg: RouteLeg = {
                startPoint: new (global as any).L.LatLng(0, 0),
                endPoint: new (global as any).L.LatLng(1, 1),
                startTime: baseTime,
                endTime: baseTime + (60 * 60 * 1000),
                distance: 50,
                course: 90,
                averageSpeed: 5
            };

            // Create forecasts out of order
            const forecasts: PointForecast[] = [
                createMockPointForecast(baseTime + (3 * 60 * 60 * 1000), leg),
                createMockPointForecast(baseTime + (1 * 60 * 60 * 1000), leg),
                createMockPointForecast(baseTime + (2 * 60 * 60 * 1000), leg)
            ];

            const consolidateLegsForecasts = (service as any).consolidateLegsForecasts.bind(service);
            const result = consolidateLegsForecasts(forecasts);

            // Should be sorted by timestamp
            for (let i = 1; i < result.length; i++) {
                expect(result[i].timestamp).toBeGreaterThan(result[i - 1].timestamp);
            }
        });
    });

    describe('Averaging Functionality', () => {
        test('should correctly average wind speeds', () => {
            const forecasts = [
                createMockPointForecastWithWind(10, 270),
                createMockPointForecastWithWind(20, 270),
                createMockPointForecastWithWind(15, 270)
            ];

            const averagePointForecasts = (service as any).averagePointForecasts.bind(service);
            const result = averagePointForecasts(forecasts);

            expect(result.northUp.windSpeed).toBe(15); // (10 + 20 + 15) / 3
        });

        test('should correctly average wind directions using vector math', () => {
            const forecasts = [
                createMockPointForecastWithWind(10, 350), // 10° from north
                createMockPointForecastWithWind(10, 10)   // 10° from north (other side)
            ];

            const averagePointForecasts = (service as any).averagePointForecasts.bind(service);
            const result = averagePointForecasts(forecasts);

            // Should average to approximately 0° (north) or 360° (same direction)
            expect(result.northUp.windDirection % 360).toBeCloseTo(0, 1);
        });

        test('should handle opposite directions correctly', () => {
            const forecasts = [
                createMockPointForecastWithWind(10, 0),   // north
                createMockPointForecastWithWind(10, 180) // south
            ];

            const averagePointForecasts = (service as any).averagePointForecasts.bind(service);
            const result = averagePointForecasts(forecasts);

            // Result should be stable (not undefined/NaN)
            expect(result.northUp.windDirection).toBeGreaterThanOrEqual(0);
            expect(result.northUp.windDirection).toBeLessThan(360);
        });

        test('should average position coordinates', () => {
            const leg: RouteLeg = {
                startPoint: new (global as any).L.LatLng(0, 0),
                endPoint: new (global as any).L.LatLng(1, 1),
                startTime: Date.now(),
                endTime: Date.now() + 3600000,
                distance: 50,
                course: 90,
                averageSpeed: 5
            };

            const forecasts: PointForecast[] = [
                {
                    ...createMockPointForecast(Date.now(), leg),
                    point: { lat: 10, lng: 20 }
                },
                {
                    ...createMockPointForecast(Date.now(), leg),
                    point: { lat: 20, lng: 30 }
                },
                {
                    ...createMockPointForecast(Date.now(), leg),
                    point: { lat: 30, lng: 40 }
                }
            ];

            const averagePointForecasts = (service as any).averagePointForecasts.bind(service);
            const result = averagePointForecasts(forecasts);

            expect(result.point.lat).toBe(20); // (10 + 20 + 30) / 3
            expect(result.point.lng).toBe(30); // (20 + 30 + 40) / 3
        });

        test('should combine and deduplicate warnings', () => {
            const forecasts = [
                { ...createMockPointForecastWithWind(10, 270), warnings: ['warning1', 'warning2'] },
                { ...createMockPointForecastWithWind(10, 270), warnings: ['warning2', 'warning3'] },
                { ...createMockPointForecastWithWind(10, 270), warnings: ['warning1'] }
            ];

            const averagePointForecasts = (service as any).averagePointForecasts.bind(service);
            const result = averagePointForecasts(forecasts);

            expect(result.warnings).toHaveLength(3);
            expect(result.warnings).toContain('warning1');
            expect(result.warnings).toContain('warning2');
            expect(result.warnings).toContain('warning3');
        });
    });

    describe('Apparent Wind Calculations', () => {
        test('should calculate apparent wind with correct data types and ranges', () => {
            const northUp: WeatherData = {
                windSpeed: 15,
                windDirection: 40,
                gustsSpeed: 20,
                gustsDirection: 40,
                currentSpeed: 0,
                currentDirection: 0,
                wavesHeight: 2,
                wavesPeriod: 8,
                wavesDirection: 40
            };

            const boatSpeed = 7;
            const boatCourse = 0;

            const convertToApparent = (service as any).convertToApparent.bind(service);
            const result = convertToApparent(northUp, boatSpeed, boatCourse);

            // Validate that we get valid apparent wind data
            expect(typeof result.windSpeed).toBe('number');
            expect(result.windSpeed).toBeGreaterThan(0);
            expect(typeof result.windDirection).toBe('number');
            expect(result.windDirection).toBeGreaterThanOrEqual(-180);
            expect(result.windDirection).toBeLessThanOrEqual(180);
        });

        test('should calculate different apparent wind for different boat speeds', () => {
            const northUp: WeatherData = {
                windSpeed: 10,
                windDirection: 90, // beam wind
                gustsSpeed: 15,
                gustsDirection: 90,
                currentSpeed: 0,
                currentDirection: 0,
                wavesHeight: 2,
                wavesPeriod: 8,
                wavesDirection: 90
            };

            const boatCourse = 0;
            const convertToApparent = (service as any).convertToApparent.bind(service);

            const slow = convertToApparent(northUp, 3, boatCourse);
            const fast = convertToApparent(northUp, 10, boatCourse);

            // Different boat speeds should produce different apparent wind
            expect(slow.windSpeed).not.toBe(fast.windSpeed);
        });

        test('should handle zero wind correctly', () => {
            const northUp: WeatherData = {
                windSpeed: 0,
                windDirection: 0,
                gustsSpeed: 0,
                gustsDirection: 0,
                currentSpeed: 0,
                currentDirection: 0,
                wavesHeight: 0,
                wavesPeriod: 0,
                wavesDirection: 0
            };

            const boatSpeed = 5;
            const boatCourse = 0;

            const convertToApparent = (service as any).convertToApparent.bind(service);
            const result = convertToApparent(northUp, boatSpeed, boatCourse);

            // With zero true wind, apparent wind should be created by boat motion
            expect(result.windSpeed).toBeCloseTo(boatSpeed, 0.1);
        });

        test('should handle zero boat speed correctly', () => {
            const northUp: WeatherData = {
                windSpeed: 10,
                windDirection: 45,
                gustsSpeed: 15,
                gustsDirection: 45,
                currentSpeed: 0,
                currentDirection: 0,
                wavesHeight: 2,
                wavesPeriod: 8,
                wavesDirection: 45
            };

            const boatSpeed = 0;
            const boatCourse = 0;

            const convertToApparent = (service as any).convertToApparent.bind(service);
            const result = convertToApparent(northUp, boatSpeed, boatCourse);

            // With zero boat speed, apparent wind should equal true wind
            expect(result.windSpeed).toBe(northUp.windSpeed);
            expect(result.windDirection).toBeCloseTo(northUp.windDirection, 1);
        });

        test('should produce relative wind directions', () => {
            const northUp: WeatherData = {
                windSpeed: 10,
                windDirection: 270, // west wind
                gustsSpeed: 15,
                gustsDirection: 270,
                currentSpeed: 0,
                currentDirection: 0,
                wavesHeight: 2,
                wavesPeriod: 8,
                wavesDirection: 270
            };

            const boatSpeed = 5;
            const boatCourse = 0; // heading north

            const convertToApparent = (service as any).convertToApparent.bind(service);
            const result = convertToApparent(northUp, boatSpeed, boatCourse);

            // Wind direction should be relative to boat heading
            expect(result.windDirection).toBeGreaterThanOrEqual(-180);
            expect(result.windDirection).toBeLessThanOrEqual(180);
        });
    });

});

describe('WeatherForecastService Integration Tests', () => {
    let service: WeatherForecastService;
    let mockWindyAPI: MockWindyAPI;

    beforeEach(() => {
        mockWindyAPI = new MockWindyAPI();
        service = new WeatherForecastService(mockWindyAPI as any);
    });

    test('should handle full forecast flow correctly', async () => {
        // Create a test route
        const startPoint = new (global as any).L.LatLng(40.7128, -74.0060); // New York
        const departureTime = Date.now();
        const route = new RouteDefinition();
        route.addWaypoint(startPoint);
        route.setDepartureTime(departureTime);

        const endPoint = new (global as any).L.LatLng(51.5074, -0.1278); // London
        route.addWaypoint(endPoint);
        route.setLegSpeed(0, 10); // 10 knots average speed

        // Mock the API response
        const mockResponse: WindyAPIResponse = {
            timestamps: Array.from({ length: 67 }, (_, i) => departureTime + (i * 60 * 60 * 1000)),
            distances: Array.from({ length: 67 }, (_, i) => i * 1000),
            bearings: Array.from({ length: 67 }, () => 60),
            data: {
                wind: Array.from({ length: 67 }, () => 15),
                windDir: Array.from({ length: 67 }, () => 270),
                gust: Array.from({ length: 67 }, () => 20),
                waves: Array.from({ length: 67 }, () => 3),
                wavesDir: Array.from({ length: 67 }, () => 270),
                wavesPeriod: Array.from({ length: 67 }, () => 10),
                precip: Array.from({ length: 67 }, () => 0),
                warn: Array.from({ length: 67 }, () => null),
                icon: Array.from({ length: 67 }, () => 2)
            }
        };

        mockWindyAPI.setMockResponse(`${route.legs[0].startTime}-${route.legs[0].endTime}-2`, mockResponse);

        // Execute the forecast
        const result = await service.getRouteForecast(route);

        // Verify results
        expect(result.route).toBe(route);
        expect(result.pointForecasts).toBeDefined();
        expect(result.pointForecasts.length).toBeGreaterThan(0);

        // Each point forecast should have all required fields
        result.pointForecasts.forEach(forecast => {
            expect(forecast.point).toBeDefined();
            expect(forecast.timestamp).toBeDefined();
            expect(forecast.bearing).toBeDefined();
            expect(forecast.leg).toBeDefined();
            expect(forecast.northUp).toBeDefined();
            expect(forecast.apparent).toBeDefined();
            expect(typeof forecast.precipitations).toBe('number');
            expect(typeof forecast.weather).toBe('number');
            expect(Array.isArray(forecast.warnings)).toBe(true);
        });

        // Forecasts should be sorted by timestamp
        for (let i = 1; i < result.pointForecasts.length; i++) {
            expect(result.pointForecasts[i].timestamp).toBeGreaterThanOrEqual(result.pointForecasts[i - 1].timestamp);
        }
    });

    test('should handle multiple legs correctly', async () => {
        // Create a multi-leg route
        const startPoint = new (global as any).L.LatLng(40.7128, -74.0060); // New York
        const departureTime = Date.now();
        const route = new RouteDefinition();
        route.addWaypoint(startPoint);
        route.setDepartureTime(departureTime);

        const midPoint = new (global as any).L.LatLng(38.9072, -77.0369); // Washington DC
        const endPoint = new (global as any).L.LatLng(25.7617, -80.1918); // Miami

        route.addWaypoint(midPoint);
        route.addWaypoint(endPoint);
        route.setLegSpeed(0, 8); // 8 knots to DC
        route.setLegSpeed(1, 12); // 12 knots to Miami

        const legs = route.legs;

        // Mock responses for each leg
        legs.forEach((leg, index) => {
            const mockResponse: WindyAPIResponse = {
                timestamps: Array.from({ length: 23 }, (_, i) => leg.startTime + (i * 60 * 60 * 1000)),
                distances: Array.from({ length: 23 }, (_, i) => i * 1000),
                bearings: Array.from({ length: 23 }, () => 180),
                data: {
                    wind: Array.from({ length: 23 }, () => 10 + index * 5), // Different wind for each leg
                    windDir: Array.from({ length: 23 }, () => 270),
                    gust: Array.from({ length: 23 }, () => 15 + index * 5),
                    waves: Array.from({ length: 23 }, () => 2 + index),
                    wavesDir: Array.from({ length: 23 }, () => 270),
                    wavesPeriod: Array.from({ length: 23 }, () => 8),
                    precip: Array.from({ length: 23 }, () => 0),
                    warn: Array.from({ length: 23 }, () => null),
                    icon: Array.from({ length: 23 }, () => 1)
                }
            };

            mockWindyAPI.setMockResponse(`${leg.startTime}-${leg.endTime}-2`, mockResponse);
        });

        // Execute the forecast
        const result = await service.getRouteForecast(route);

        // Should have forecasts from all legs
        expect(result.pointForecasts.length).toBeGreaterThan(0);

        // Should maintain chronological order across legs
        for (let i = 1; i < result.pointForecasts.length; i++) {
            expect(result.pointForecasts[i].timestamp).toBeGreaterThanOrEqual(result.pointForecasts[i - 1].timestamp);
        }
    });
});