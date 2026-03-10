import { RouteDefinition } from '../types/RouteTypes';

/**
 * Serializes a route to a URL-safe string
 */
export function serializeRoute(route: RouteDefinition): string {
    if (!route.waypoints || route.waypoints.length === 0) {
        return '';
    }

    const parts: string[] = [];

    // Waypoints: lat,lng;lat,lng;...
    const waypoints = route.waypoints.map(wp => `${wp.lat.toFixed(6)},${wp.lng.toFixed(6)}`);
    parts.push(`w=${waypoints.join(';')}`);

    // Departure time
    if (route.departureTime) {
        parts.push(`d=${route.departureTime}`);
    }

    // Leg speeds
    if (route.legs && route.legs.length > 0) {
        const speeds = route.legs.map(leg => leg.speed?.toString() || '5');
        parts.push(`s=${speeds.join(',')}`);
    }

    return parts.join('&');
}

/**
 * Deserializes a URL string to a RouteDefinition
 */
export function deserializeRoute(routeString: string): RouteDefinition | null {
    if (!routeString) {
        return null;
    }

    try {
        const params = new URLSearchParams(routeString);

        const waypointsParam = params.get('w');
        const departureParam = params.get('d');
        const speedsParam = params.get('s');

        if (!waypointsParam) {
            return null;
        }

        // Parse waypoints
        const waypointCoords = waypointsParam.split(';').map(coord => {
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
        if (speedsParam && route.legs) {
            const speeds = speedsParam.split(',').map(Number);
            speeds.forEach((speed, index) => {
                if (route.legs[index] && !isNaN(speed)) {
                    route.legs[index].speed = speed;
                }
            });
        }

        console.log('Deserialized route:', waypointCoords.length, 'waypoints');
        return route;

    } catch (error) {
        console.warn('Failed to deserialize route:', error);
        return null;
    }
}