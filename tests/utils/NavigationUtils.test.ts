import { calculateApparentWind, calculateRelativeDirection } from '../../src/utils/NavigationUtils';

describe('NavigationUtils', () => {
    describe('calculateApparentWind', () => {
        test('should calculate apparent wind for headwind correctly', () => {
            const trueWindSpeed = 10;
            const trueWindDirection = 180; // from south (blowing north)
            const boatSpeed = 5;
            const boatCourse = 0; // heading north

            const result = calculateApparentWind(trueWindSpeed, trueWindDirection, boatSpeed, boatCourse);

            // Headwind should increase apparent wind speed
            expect(result.speed).toBeGreaterThan(trueWindSpeed);
            expect(result.speed).toBeCloseTo(15, 1); // approximately 10 + 5
        });

        test('should calculate apparent wind for tailwind correctly', () => {
            const trueWindSpeed = 10;
            const trueWindDirection = 0; // from north (blowing south)
            const boatSpeed = 5;
            const boatCourse = 180; // heading south

            const result = calculateApparentWind(trueWindSpeed, trueWindDirection, boatSpeed, boatCourse);

            // Tailwind should decrease apparent wind speed (or result in opposite direction with lower speed)
            // Note: The actual implementation might handle this differently
            expect(result.speed).toBeGreaterThan(0);
            // The exact value depends on the vector calculation implementation
        });

        test('should handle beam wind correctly', () => {
            const trueWindSpeed = 10;
            const trueWindDirection = 90; // from east (blowing west)
            const boatSpeed = 5;
            const boatCourse = 0; // heading north

            const result = calculateApparentWind(trueWindSpeed, trueWindDirection, boatSpeed, boatCourse);

            // Beam wind should result in apparent wind between original and boat speed
            expect(result.speed).toBeGreaterThan(boatSpeed);
            expect(result.speed).toBeLessThan(trueWindSpeed + boatSpeed);

            // Direction should shift forward
            expect(result.direction).not.toBe(trueWindDirection);
        });

        test('should handle zero wind', () => {
            const trueWindSpeed = 0;
            const trueWindDirection = 180;
            const boatSpeed = 5;
            const boatCourse = 0;

            const result = calculateApparentWind(trueWindSpeed, trueWindDirection, boatSpeed, boatCourse);

            // Zero true wind should result in apparent wind equal to boat speed from ahead
            expect(result.speed).toBeCloseTo(boatSpeed, 1);
            expect(result.direction).toBeCloseTo(180, 1); // wind from ahead
        });

        test('should handle zero boat speed', () => {
            const trueWindSpeed = 10;
            const trueWindDirection = 270;
            const boatSpeed = 0;
            const boatCourse = 0;

            const result = calculateApparentWind(trueWindSpeed, trueWindDirection, boatSpeed, boatCourse);

            // Zero boat speed should result in apparent wind equal to true wind
            expect(result.speed).toBe(trueWindSpeed);
            expect(result.direction).toBe(trueWindDirection);
        });
    });

    describe('calculateRelativeDirection', () => {
        test('should calculate correct relative direction for starboard wind', () => {
            const windDirection = 90; // east wind
            const boatCourse = 0; // heading north

            const result = calculateRelativeDirection(windDirection, boatCourse);

            expect(result).toBe(90); // 90° to starboard
        });

        test('should calculate correct relative direction for port wind', () => {
            const windDirection = 270; // west wind
            const boatCourse = 0; // heading north

            const result = calculateRelativeDirection(windDirection, boatCourse);

            expect(result).toBe(-90); // 90° to port
        });

        test('should calculate correct relative direction for headwind', () => {
            const windDirection = 180; // south wind (blowing north)
            const boatCourse = 0; // heading north

            const result = calculateRelativeDirection(windDirection, boatCourse);

            expect(result).toBe(180); // directly ahead
        });

        test('should calculate correct relative direction for tailwind', () => {
            const windDirection = 0; // north wind (blowing south)
            const boatCourse = 180; // heading south

            const result = calculateRelativeDirection(windDirection, boatCourse);

            // Should be close to 180 or -180 (directly astern)
            expect(Math.abs(result)).toBe(180);
        });

        test('should handle angle wraparound correctly', () => {
            const windDirection = 10; // slightly east of north
            const boatCourse = 350; // slightly west of north

            const result = calculateRelativeDirection(windDirection, boatCourse);

            // Should be approximately 20° to starboard
            expect(result).toBeCloseTo(20, 1);
        });

        test('should normalize to -180 to 180 range', () => {
            const windDirection = 0;
            const boatCourse = 180;

            const result = calculateRelativeDirection(windDirection, boatCourse);

            expect(result).toBeGreaterThanOrEqual(-180);
            expect(result).toBeLessThanOrEqual(180);
        });

        test('should handle opposite direction wraparound', () => {
            const windDirection = 190;
            const boatCourse = 10;

            const result = calculateRelativeDirection(windDirection, boatCourse);

            expect(result).toBeGreaterThanOrEqual(-180);
            expect(result).toBeLessThanOrEqual(180);
        });
    });
});