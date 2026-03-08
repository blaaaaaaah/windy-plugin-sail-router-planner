import type { LatLng } from '../types/Coordinates';
import { RouteDefinition } from '../types/RouteTypes';

export class RouteEditorController {
	private _routes: RouteDefinition[] = [];
	private _activeRoute: RouteDefinition | null = null;
	private _map: L.Map;
	private _onRouteUpdated: (route: RouteDefinition) => void;

	// Map layer management
	private _routeLayers = new Map<string, L.Polyline>();
	private _waypointMarkers = new Map<string, L.Marker[]>();

	// Color cycling
	private _colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF8C94', '#A8E6CF', '#C7CEEA'];
	private _currentColorIndex = 0;

	constructor(
		map: L.Map,
		onRouteUpdated: (route: RouteDefinition) => void
	) {
		this._map = map;
		this._onRouteUpdated = onRouteUpdated;
	}

	// Public API
	getRoutes(): RouteDefinition[] {
		return [...this._routes];
	}

	getActiveRoute(): RouteDefinition | null {
		return this._activeRoute;
	}

	clearActiveRoute(): void {
		this._activeRoute = null;
		this._updateMapHighlight();
	}

	setRouteProgress(route: RouteDefinition, timestamp: number): void {
		const position = route.getPositionAtTime(timestamp);
		if (position) {
			this._showProgressMarker(route, position);
		}
	}


	onMapClick(position: LatLng): void {
		if (!this._activeRoute) {
			// Create new route with next color
			const color = this._colors[this._currentColorIndex];
			this._currentColorIndex = (this._currentColorIndex + 1) % this._colors.length;

			this._activeRoute = new RouteDefinition(undefined, undefined, color);
			this._routes.push(this._activeRoute);
		}

		// Add waypoint to active route
		this._activeRoute.addWaypoint(position);

		// Update map display
		this._updateRouteDisplay(this._activeRoute);

		// Notify callback handler
		this._onRouteUpdated(this._activeRoute);
	}

	private _updateRouteDisplay(route: RouteDefinition): void {
		this._updateRouteLine(route);
		this._updateWaypointMarkers(route);
	}

	private _updateRouteLine(route: RouteDefinition): void {
		const waypoints = route.waypoints;

		// Remove existing line if it exists
		const existingLine = this._routeLayers.get(route.id);
		if (existingLine) {
			this._map.removeLayer(existingLine);
		}

		// Create new line if we have at least 2 waypoints
		if (waypoints.length >= 2) {
			const polyline = L.polyline(waypoints, {
				color: route.color,
				weight: this._activeRoute?.id === route.id ? 4 : 2,
				opacity: 0.8
			});

			polyline.addTo(this._map);
			this._routeLayers.set(route.id, polyline);
		}
	}

	private _updateWaypointMarkers(route: RouteDefinition): void {
		const waypoints = route.waypoints;

		// Remove existing markers
		const existingMarkers = this._waypointMarkers.get(route.id) || [];
		existingMarkers.forEach(marker => this._map.removeLayer(marker));

		// Create new markers
		const markers: L.Marker[] = [];
		waypoints.forEach((waypoint, index) => {
			const marker = this._createWaypointMarker(waypoint, route, index);
			marker.addTo(this._map);
			markers.push(marker);
		});

		this._waypointMarkers.set(route.id, markers);
	}

	private _createWaypointMarker(position: LatLng, route: RouteDefinition, index: number): L.Marker {
		const waypointNumber = index + 1; // Start from 1 like Windy

		const marker = L.marker(position, {
			draggable: true,
			icon: this._createWindyStyleIcon(waypointNumber, route.color)
		});

		// Handle drag events
		marker.on('dragstart', () => {
			// Change cursor to grabbing when dragging
			document.body.style.cursor = 'grabbing';
		});

		marker.on('drag', (e) => {
			// Update route line in real-time during drag
			const newPosition = (e.target as L.Marker).getLatLng();
			route.updateWaypoint(index, newPosition);
			this._updateRouteLine(route);
		});

		marker.on('dragend', (e) => {
			const newPosition = (e.target as L.Marker).getLatLng();
			route.updateWaypoint(index, newPosition);
			this._updateRouteLine(route);
			this._onRouteUpdated(route);
			document.body.style.cursor = '';
		});

		// Handle delete click
		marker.on('click', (e) => {
			const target = e.originalEvent.target as HTMLElement;
			if (target.classList.contains('waypoint-delete')) {
				e.originalEvent.stopPropagation();
				this._deleteWaypoint(route, index);
			}
		});

		return marker;
	}

	private _createWindyStyleIcon(waypointNumber: number, color: string): L.DivIcon {
		const iconHtml = `
			<div class="windy-waypoint-marker" data-waypoint="${waypointNumber}">
				<div class="waypoint-circle" style="background-color: ${color};">
					<span class="waypoint-number">${waypointNumber}</span>
				</div>
				<div class="waypoint-delete-pill">
					<span class="waypoint-delete">×</span>
				</div>
			</div>
		`;

		return L.divIcon({
			html: iconHtml,
			className: 'custom-waypoint-icon',
			iconSize: [24, 24],
			iconAnchor: [12, 12]
		});
	}

	private _deleteWaypoint(route: RouteDefinition, index: number): void {
		try {
			route.removeWaypoint(index);
			this._updateRouteDisplay(route);

			// If route is empty, remove it
			if (route.waypoints.length === 0) {
				this._deleteRoute(route);
			} else {
				this._onRouteUpdated(route);
			}
		} catch (error) {
			console.error('Error deleting waypoint:', error);
		}
	}

	private _deleteRoute(route: RouteDefinition): void {
		// Remove from routes array
		const index = this._routes.findIndex(r => r.id === route.id);
		if (index >= 0) {
			this._routes.splice(index, 1);
		}

		// Remove from map
		this._removeRouteFromMap(route);

		// Clear active route if it was this one
		if (this._activeRoute?.id === route.id) {
			this._activeRoute = null;
		}
	}

	private _removeRouteFromMap(route: RouteDefinition): void {
		// Remove route line
		const routeLine = this._routeLayers.get(route.id);
		if (routeLine) {
			this._map.removeLayer(routeLine);
			this._routeLayers.delete(route.id);
		}

		// Remove waypoint markers
		const markers = this._waypointMarkers.get(route.id) || [];
		markers.forEach(marker => this._map.removeLayer(marker));
		this._waypointMarkers.delete(route.id);
	}

	private _updateMapHighlight(): void {
		// Update all route lines to show which is active
		this._routes.forEach(route => {
			this._updateRouteLine(route);
		});
	}

	private _showProgressMarker(route: RouteDefinition, position: LatLng): void {
		// TODO: Implement progress marker that shows current position during forecast scrubbing
		// This would show a different marker (like a boat icon) at the calculated position
		console.log(`Showing progress for route ${route.id} at`, position);
	}
}