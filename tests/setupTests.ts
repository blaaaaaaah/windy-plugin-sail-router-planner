// Global test setup for WeatherForecastService tests

// Mock Leaflet LatLng for testing
(global as any).window = global;
global.L = {
    LatLng: class MockLatLng {
        public lat: number;
        public lng: number;

        constructor(lat: number, lng: number) {
            this.lat = lat;
            this.lng = lng;
        }

        distanceTo(other: any): number {
            // Simple haversine distance calculation for testing
            const R = 6371000; // Earth radius in meters
            const dLat = this.toRad(other.lat - this.lat);
            const dLng = this.toRad(other.lng - this.lng);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRad(this.lat)) * Math.cos(this.toRad(other.lat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }

        private toRad(value: number): number {
            return value * Math.PI / 180;
        }
    }
};

// Mock console.log to reduce test noise (optional)
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};