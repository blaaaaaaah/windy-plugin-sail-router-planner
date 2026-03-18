import { RouteDefinition } from '../types/RouteTypes';

/**
 * Serializes a route to a URL-safe string with wind mode
 */
export function serializeRoute(route: RouteDefinition, windMode?: boolean): string {
    if (!route.waypoints || route.waypoints.length === 0) {
        return '';
    }

    const parts: string[] = [];

    // Wind mode as first parameter (if provided)
    if (windMode !== undefined) {
        parts.push(`wind:${windMode ? 'true' : 'apparent'}`);
    }

    // Waypoints: lat,lng|lat,lng|...
    const waypoints = route.waypoints.map(wp => `${wp.lat.toFixed(6)},${wp.lng.toFixed(6)}`);
    parts.push(`w:${waypoints.join('|')}`);

    // Departure time
    if (route.departureTime) {
        parts.push(`d:${route.departureTime}`);
    }

    // Leg speeds
    if (route.legs && route.legs.length > 0) {
        const speeds = route.legs.map(leg => leg.averageSpeed?.toString() || '5');
        parts.push(`s:${speeds.join(',')}`);
    }

    return parts.join(';');
}

/**
 * Deserializes a URL string to a RouteDefinition and wind mode
 */
export function deserializeRoute(routeString: string): { route: RouteDefinition; windMode: boolean } | null {
    if (!routeString) {
        return null;
    }

    try {
        // Parse Windy-style parameters (key:value;key:value)
        const params: Record<string, string> = {};
        routeString.split(';').forEach(part => {
            const [key, value] = part.split(':');
            if (key && value) {
                params[key] = value;
            }
        });

        const windParam = params['wind'];
        const waypointsParam = params['w'];
        const departureParam = params['d'];
        const speedsParam = params['s'];

        if (!waypointsParam) {
            return null;
        }

        // Parse wind mode (default to true)
        const windMode: boolean = windParam ? windParam === 'true' : true;

        // Parse waypoints
        const waypointCoords = waypointsParam.split('|').map(coord => {
            const [lat, lng] = coord.split(',').map(Number);
            if (isNaN(lat) || isNaN(lng)) {
                throw new Error('Invalid waypoint coordinates');
            }
            return new (window as any).L.LatLng(lat, lng);
        });

        if (waypointCoords.length < 2) {
            throw new Error('Need at least 2 waypoints');
        }

        // Create route
        const route = new RouteDefinition();

        // Set departure time
        if (departureParam) {
            const departureTime = parseInt(departureParam);
            if (!isNaN(departureTime)) {
                route.setDepartureTime(departureTime);
            }
        } else {
            route.setDepartureTime(Date.now());
        }

        // Add waypoints
        waypointCoords.forEach(coord => {
            route.addWaypoint(coord);
        });

        // Set leg speeds if available
        if (speedsParam) {
            const speeds = speedsParam.split(',').map(Number);
            speeds.forEach((speed, index) => {
                if (!isNaN(speed)) {
                    route.setLegSpeed(index, speed);
                }
            });
        }

        console.log('Deserialized route:', waypointCoords.length, 'waypoints', 'windMode:', windMode);
        return { route, windMode };

    } catch (error) {
        console.warn('Failed to deserialize route:', error);
        return null;
    }
}