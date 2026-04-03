import type { LatLng } from '../types/Coordinates';
import { RouteDefinition } from '../types/RouteTypes';
import { markers } from '@windy/map';
import { metrics } from '@windy/metrics';

import { calculateGreatCircleDistance, interpolateGreatCircle, interpolateLatLng } from '../utils/NavigationUtils';

export class RouteEditorController {
	private _routes: RouteDefinition[] = [];
	private _activeRoute: RouteDefinition | null = null;
	private _map: L.Map;
	private _onRouteUpdated: (route: RouteDefinition) => void;
	private _isDragging: boolean = false;


	// Map layer management
	private _routeLayers = new Map<string, L.Polyline>();
	private _waypointMarkers = new Map<string, L.Marker[]>();
	private _progressMarkers = new Map<string, L.Marker>();
	private _distanceLabels = new Map<string, L.Marker[]>();
	private _dayMarkers = new Map<string, L.Marker[]>();
	private _currentTimestamp: number | null = null;

	// Day marker configuration
	private _dailyDistanceNM = 150; // Default nautical miles per day

	// Color cycling
	private _colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FF8C94', '#A8E6CF', '#C7CEEA'];
	private _currentColorIndex = 0;

	constructor(
		map: L.Map,
		onRouteUpdated: (route: RouteDefinition) => void
	) {
		this._map = map;
		this._onRouteUpdated = onRouteUpdated;

		// Listen for zoom changes to update distance label sizes
		this._map.on('zoomend', this._onZoomChange.bind(this));
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

	setTimestamp(timestamp: number): void {
		this._currentTimestamp = timestamp;

		// Update progress markers for all routes immediately
		for (const route of this._routes) {
			const position = route.getPositionAtTime(timestamp);
			if (position) {
				this._updateProgressMarker(route, position);
			} else {
				this._hideProgressMarker(route);
			}
		}
	}

	setRouteProgress(route: RouteDefinition, timestamp: number): void {
		// For backward compatibility - delegate to setTimestamp
		this.setTimestamp(timestamp);
	}

	clearAllProgress(): void {
		this._progressMarkers.forEach(marker => this._map.removeLayer(marker));
		this._progressMarkers.clear();
		// Keep _currentTimestamp - user might want to see progress again
	}

	/**
	 * Update route display without triggering the onRouteUpdated callback
	 * Use this when route properties change externally (e.g., leg speeds)
	 */
	refreshRouteDisplay(route: RouteDefinition): void {
		this._updateRouteDisplay(route);
	}


	destroy(): void {
		// Remove zoom event listener
		this._map.off('zoomend', this._onZoomChange.bind(this));

		// Remove all routes from map
		this._routes.forEach(route => this._removeRouteFromMap(route));

		// Clear all data structures
		this._routes = [];
		this._activeRoute = null;
		this._routeLayers.clear();
		this._waypointMarkers.clear();
		this._progressMarkers.clear();
		this._distanceLabels.clear();
		this._dayMarkers.clear();
		this._currentTimestamp = null;

		console.log('RouteEditorController destroyed and cleaned up');
	}


	loadRoute(route: RouteDefinition): void {
		// Assign a color if not already set
		if (!route.color) {
			route.color = this._colors[this._currentColorIndex];
			this._currentColorIndex = (this._currentColorIndex + 1) % this._colors.length;
		}

		// Add to routes collection
		this._routes.push(route);
		this._activeRoute = route;

		// Update map display
		this._updateRouteDisplay(route);

		// Update progress marker if we have a current timestamp
		if (this._currentTimestamp !== null) {
			this.setTimestamp(this._currentTimestamp);
		}

		// Notify callback handler
		this._onRouteUpdated(route);

		console.log('Route loaded with', route.waypoints.length, 'waypoints');
	}


	onMapClick(position: LatLng): void {
		// Ignore map clicks during or immediately after drag operations
		if (this._isDragging) {
			return;
		}

		if (!this._activeRoute) {
			// Create new route with next color
			const color = this._colors[this._currentColorIndex];
			this._currentColorIndex = (this._currentColorIndex + 1) % this._colors.length;

			this._activeRoute = new RouteDefinition(undefined, undefined, color);
			this._routes.push(this._activeRoute);
		}

		// Find insertion index (returns -1 if no segments or not near any segment)
		const insertionIndex = this._findInsertionIndex(this._activeRoute, position);
		this._activeRoute.addWaypoint(position, insertionIndex);

		// Update map display
		this._updateRouteDisplay(this._activeRoute);

		// Update progress marker if we have a current timestamp
		if (this._currentTimestamp !== null) {
			this.setTimestamp(this._currentTimestamp);
		}

		// Notify callback handler
		this._onRouteUpdated(this._activeRoute);
	}

	private _updateRouteDisplay(route: RouteDefinition): void {
		this._updateRouteLine(route);
		this._updateWaypointMarkers(route);
		this._updateDistanceLabels(route);
		this._updateDayMarkers(route);
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
			// Generate path points that follow great circle routes for long legs
			const pathPoints = this._generateGreatCirclePath(waypoints);

			const polyline = L.polyline(pathPoints, {
				color: route.color,
				weight: this._activeRoute?.id === route.id ? 4 : 2,
				opacity: 0.8
			});

			polyline.addTo(this._map);
			this._routeLayers.set(route.id, polyline);
		}
	}

	private _generateGreatCirclePath(waypoints: LatLng[]): LatLng[] {
		const pathPoints: LatLng[] = [];

		for (let i = 0; i < waypoints.length - 1; i++) {
			const start = waypoints[i];
			const end = waypoints[i + 1];

			// Always add the start point
			pathPoints.push(start);

			// Calculate the distance between waypoints
			const distance = calculateGreatCircleDistance(start, end) / 1852; // convert to nautical miles

			// For legs longer than 500nm, create intermediate points along the great circle
			if (distance > 500) {
				// Calculate how many intermediate points we need (roughly every 100nm)
				const numSegments = Math.ceil(distance / 100);

				// Generate intermediate points along the great circle
				for (let j = 1; j < numSegments; j++) {
					const progress = j / numSegments;
					const intermediatePoint = interpolateGreatCircle(start, end, progress);
					pathPoints.push(intermediatePoint);
				}
			}
		}

		// Always add the final waypoint
		if (waypoints.length > 0) {
			pathPoints.push(waypoints[waypoints.length - 1]);
		}

		return pathPoints;
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

	private _updateDistanceLabels(route: RouteDefinition): void {
		const waypoints = route.waypoints;

		// Remove existing distance labels
		const existingLabels = this._distanceLabels.get(route.id) || [];
		existingLabels.forEach(label => this._map.removeLayer(label));

		// Create new distance labels if we have at least 2 waypoints
		if (waypoints.length >= 2) {
			const labels: L.Marker[] = [];
			const legs = route.legs;

			legs.forEach((leg, index) => {
				// Calculate midpoint of the leg
				const midpoint = {
					lat: (leg.startPoint.lat + leg.endPoint.lat) / 2,
					lng: (leg.startPoint.lng + leg.endPoint.lng) / 2
				};

				// Format distance using Windy metrics system (leg.distance is already in meters)
				const distanceText = W.metrics.distance.convertValue(leg.distance);

				// Create distance label marker positioned at midpoint with CSS offset
				const label = this._createDistanceLabel(midpoint, distanceText, route.color, leg.startPoint, leg.endPoint);
				if (label) {
					label.addTo(this._map);
					labels.push(label);
				}
			});

			this._distanceLabels.set(route.id, labels);
		} else {
			this._distanceLabels.set(route.id, []);
		}
	}

	private _updateDayMarkers(route: RouteDefinition): void {
		const waypoints = route.waypoints;

		// Remove existing day markers
		const existingMarkers = this._dayMarkers.get(route.id) || [];
		existingMarkers.forEach(marker => this._map.removeLayer(marker));

		// Create new day markers if we have at least 2 waypoints
		if (waypoints.length >= 2) {
			const markers: L.Marker[] = [];
			const legs = route.legs;

			// Calculate cumulative time along route
			let cumulativeTime = 0; // in hours
			let currentDay = 1;
			let nextDayTime = 24; // 24 hours per day

			for (const leg of legs) {
				const legDurationHours = leg.duration / (1000 * 60 * 60); // Convert milliseconds to hours
				const legStartTime = cumulativeTime;
				const legEndTime = cumulativeTime + legDurationHours;

				// Check if any day markers fall within this leg
				while (nextDayTime <= legEndTime && nextDayTime > legStartTime) {
					// Calculate position along this leg where the day marker should be
					const timeIntoLeg = nextDayTime - legStartTime;
					const progressInLeg = timeIntoLeg / legDurationHours;

					// Interpolate position using great circle interpolation for long passages
					const markerPosition = interpolateLatLng(leg.startPoint, leg.endPoint, progressInLeg);

					// Create day marker text label
					const dayText = `${currentDay}d`;
					const textMarker = this._createDayMarker(markerPosition, dayText, route.color, leg.startPoint, leg.endPoint);
					if (textMarker) {
						textMarker.addTo(this._map);
						markers.push(textMarker);
					}

					// Create small dot on the line
					const dotMarker = this._createDayDot(markerPosition, route.color);
					if (dotMarker) {
						dotMarker.addTo(this._map);
						markers.push(dotMarker);
					}

					// Move to next day
					currentDay++;
					nextDayTime = currentDay * 24;
				}

				cumulativeTime = legEndTime;
			}

			this._dayMarkers.set(route.id, markers);
		} else {
			this._dayMarkers.set(route.id, []);
		}
	}

	private _createWaypointMarker(position: LatLng, route: RouteDefinition, index: number): L.Marker {
		const waypointNumber = index + 1; // Start from 1 like Windy

		const marker = L.marker(position, {
			draggable: true,
			icon: this._createWindyStyleIcon(waypointNumber, route.color)
		});

		// Handle drag events
		marker.on('dragstart', () => {
			this._isDragging = true;
			// Change cursor to grabbing when dragging
			document.body.style.cursor = 'grabbing';
		});

		marker.on('drag', (e) => {
			// Update route line, distance labels, and day markers in real-time during drag
			const newPosition = (e.target as L.Marker).getLatLng();
			route.updateWaypoint(index, newPosition);
			this._updateRouteLine(route);
			this._updateDistanceLabels(route);
			this._updateDayMarkers(route);
		});

		marker.on('dragend', (e) => {
			const newPosition = (e.target as L.Marker).getLatLng();
			route.updateWaypoint(index, newPosition);
			this._updateRouteLine(route);
			this._updateDistanceLabels(route);
			this._updateDayMarkers(route);

			// Update progress marker if we have a current timestamp
			if (this._currentTimestamp !== null) {
				this.setTimestamp(this._currentTimestamp);
			}

			this._onRouteUpdated(route);
			document.body.style.cursor = '';

			// Reset dragging flag after a short delay to prevent race condition with map click
			setTimeout(() => {
				this._isDragging = false;
			}, 100);
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

	private _createDistanceLabel(position: LatLng, distanceText: string, routeColor: string, startPoint: LatLng, endPoint: LatLng): L.Marker | null {
		// Calculate zoom-dependent font size with more aggressive scaling
		const currentZoom = this._map.getZoom();
		const baseFontSize = 12; // Base font size
		const baseZoom = 8;
		const minFontSize = 6;
		const maxFontSize = 12;
		const fontSize = Math.max(minFontSize, Math.min(maxFontSize, baseFontSize + (currentZoom - baseZoom) * 1.5));

		// Calculate route segment length in pixels to determine if label fits
		const startPixel = this._map.latLngToContainerPoint(startPoint);
		const endPixel = this._map.latLngToContainerPoint(endPoint);
		const segmentLengthPixels = startPixel.distanceTo(endPixel);

		// Estimate required space for text
		const estimatedTextWidth = distanceText.length * (fontSize * 0.6);

		// Hide label only if there's not enough space to fit the text
		if (segmentLengthPixels < 50 || estimatedTextWidth > segmentLengthPixels * 0.5) {
			return null; // Don't create label
		}
		// Calculate the bearing/angle of the line for proper geographic rotation
		const lat1 = startPoint.lat * Math.PI / 180;
		const lat2 = endPoint.lat * Math.PI / 180;
		const deltaLng = (endPoint.lng - startPoint.lng) * Math.PI / 180;

		const y = Math.sin(deltaLng) * Math.cos(lat2);
		const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
		let angle = Math.atan2(y, x) * 180 / Math.PI;

		// Subtract 90 degrees to make text parallel to line instead of perpendicular
		angle -= 90;

		// Ensure text is always readable (not upside down)
		if (angle > 90 || angle < -90) {
			angle += 180;
		}

		// Position text consistently "under" or "to the right" of the line
		// Use positive offset to ensure consistent side placement
		const offsetX = 0; // Keep centered horizontally on the leg
		const offsetY = 12; // Smaller offset, positive to place on consistent side

		const labelHtml = `
			<div class="route-distance-label" style="transform: rotate(${angle}deg) translate(${offsetX}px, ${offsetY}px);">
				<span class="distance-text" style="font-size: ${fontSize}px;">${distanceText}</span>
			</div>
		`;

		// Estimate text width for better centering based on font size
		const estimatedWidth = distanceText.length * (fontSize * 0.6);

		return L.marker(position, {
			icon: L.divIcon({
				html: labelHtml,
				className: 'custom-distance-label',
				iconSize: [estimatedWidth, 20],
				iconAnchor: [estimatedWidth / 2, 10]
			}),
			interactive: false
		});
	}

	private _createDayMarker(position: LatLng, dayText: string, routeColor: string, startPoint: LatLng, endPoint: LatLng): L.Marker | null {
		// Use a small font size for subtle day markers
		const fontSize = 10;

		// Calculate current zoom for visibility decisions
		const currentZoom = this._map.getZoom();

		// Hide day markers at very low zoom levels
		if (currentZoom < 4) {
			return null;
		}

		// Calculate line direction to determine text placement
		const deltaLat = endPoint.lat - startPoint.lat;
		const deltaLng = endPoint.lng - startPoint.lng;
		const lineAngle = Math.atan2(deltaLat, deltaLng) * 180 / Math.PI;

		// If line is roughly vertical (-120° to -60° or 60° to 120°), place text to the right
		const isVerticalish = (lineAngle > 60 && lineAngle < 120) || (lineAngle > -120 && lineAngle < -60);

		const offsetX = isVerticalish ? 12 : 0; // Place to the right if vertical (closer to line)
		const offsetY = isVerticalish ? 0 : -18; // Place above if horizontal

		const labelHtml = `
			<div class="route-day-marker" style="transform: translate(${offsetX}px, ${offsetY}px);">
				<span class="day-text" style="font-size: ${fontSize}px;">${dayText}</span>
			</div>
		`;

		// Estimate text width for centering
		const estimatedWidth = dayText.length * (fontSize * 0.6);

		return L.marker(position, {
			icon: L.divIcon({
				html: labelHtml,
				className: 'custom-day-marker',
				iconSize: [estimatedWidth, fontSize + 2],
				iconAnchor: [estimatedWidth / 2, (fontSize + 2) / 2]
			}),
			interactive: false
		});
	}

	private _createDayDot(position: LatLng, routeColor: string): L.Marker | null {
		// Calculate current zoom for visibility decisions
		const currentZoom = this._map.getZoom();

		// Hide day dots at very low zoom levels
		if (currentZoom < 4) {
			return null;
		}

		const dotHtml = `
			<div class="route-day-dot" style="background-color: ${routeColor};"></div>
		`;

		return L.marker(position, {
			icon: L.divIcon({
				html: dotHtml,
				className: 'custom-day-dot',
				iconSize: [8, 8],
				iconAnchor: [4, 3]
			}),
			interactive: false
		});
	}

	private _calculateBearing(startPoint: LatLng, endPoint: LatLng): number {
		const lat1 = startPoint.lat * Math.PI / 180;
		const lat2 = endPoint.lat * Math.PI / 180;
		const deltaLng = (endPoint.lng - startPoint.lng) * Math.PI / 180;

		const y = Math.sin(deltaLng) * Math.cos(lat2);
		const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
		return Math.atan2(y, x) * 180 / Math.PI;
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
				// Update progress marker if we have a current timestamp
				if (this._currentTimestamp !== null) {
					this.setTimestamp(this._currentTimestamp);
				}
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

		// Remove distance labels
		const labels = this._distanceLabels.get(route.id) || [];
		labels.forEach(label => this._map.removeLayer(label));
		this._distanceLabels.delete(route.id);

		// Remove day markers
		const dayMarkers = this._dayMarkers.get(route.id) || [];
		dayMarkers.forEach(marker => this._map.removeLayer(marker));
		this._dayMarkers.delete(route.id);

		// Remove progress marker
		this._hideProgressMarker(route);
	}

	private _updateMapHighlight(): void {
		// Update all route lines to show which is active
		this._routes.forEach(route => {
			this._updateRouteLine(route);
		});
	}

	private _updateProgressMarker(route: RouteDefinition, position: LatLng): void {
		// Get existing progress marker for this route
		const existingMarker = this._progressMarkers.get(route.id);

		if (existingMarker) {
			// Smooth animation: update position of existing marker
			existingMarker.setLatLng(position);
		} else {
			// Create new pulsating marker at calculated position with high z-index
			const progressMarker = new L.Marker(position, {
				icon: markers.pulsatingIcon,
				zIndexOffset: 1000  // Ensure it appears above waypoint markers
			}).addTo(this._map);

			this._progressMarkers.set(route.id, progressMarker);
		}
	}

	private _hideProgressMarker(route: RouteDefinition): void {
		const existingMarker = this._progressMarkers.get(route.id);
		if (existingMarker) {
			this._map.removeLayer(existingMarker);
			this._progressMarkers.delete(route.id);
		}
	}

	/**
	 * Find the best insertion index for a new waypoint based on proximity to route segments
	 * Returns -1 if click is not near any route segment (should append to end)
	 */
	private _findInsertionIndex(route: RouteDefinition, clickPosition: LatLng): number {
		const waypoints = route.waypoints;
		if (waypoints.length < 2) return -1;

		const clickThresholdPixels = 10; // 10px threshold for considering a click "on" a line segment
		let bestSegmentIndex = -1;
		let shortestDistance = Infinity;

		// Check each line segment
		for (let i = 0; i < waypoints.length - 1; i++) {
			const segmentStart = waypoints[i];
			const segmentEnd = waypoints[i + 1];

			const distance = this._pixelDistanceFromPointToLineSegment(
				clickPosition,
				segmentStart,
				segmentEnd
			);

			if (distance < shortestDistance && distance <= clickThresholdPixels) {
				shortestDistance = distance;
				bestSegmentIndex = i;
			}
		}

		// Return insertion index (after the best segment's start point)
		return bestSegmentIndex === -1 ? -1 : bestSegmentIndex + 1;
	}

	/**
	 * Calculate the shortest pixel distance from a point to a line segment on the map
	 * Returns distance in pixels
	 */
	private _pixelDistanceFromPointToLineSegment(point: LatLng, lineStart: LatLng, lineEnd: LatLng): number {
		// Convert geographic coordinates to map pixel coordinates
		const pointPixel = this._map.latLngToContainerPoint(point);
		const startPixel = this._map.latLngToContainerPoint(lineStart);
		const endPixel = this._map.latLngToContainerPoint(lineEnd);

		// Vector from start to end
		const ABx = endPixel.x - startPixel.x;
		const ABy = endPixel.y - startPixel.y;

		// Vector from start to point
		const APx = pointPixel.x - startPixel.x;
		const APy = pointPixel.y - startPixel.y;

		// Calculate the projection of AP onto AB
		const ABdotAB = ABx * ABx + ABy * ABy;
		const APdotAB = APx * ABx + APy * ABy;

		if (ABdotAB === 0) {
			// Line segment is actually a point
			const dx = pointPixel.x - startPixel.x;
			const dy = pointPixel.y - startPixel.y;
			return Math.sqrt(dx * dx + dy * dy);
		}

		// Calculate parameter t for the projection (0 = at start, 1 = at end)
		const t = Math.max(0, Math.min(1, APdotAB / ABdotAB));

		// Calculate the closest point on the line segment
		const closestX = startPixel.x + t * ABx;
		const closestY = startPixel.y + t * ABy;

		// Return the pixel distance between the point and closest point on segment
		const dx = pointPixel.x - closestX;
		const dy = pointPixel.y - closestY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	private _onZoomChange(): void {
		// Update all distance labels and day markers with new font sizes/visibility
		this._routes.forEach(route => {
			this._updateDistanceLabels(route);
			this._updateDayMarkers(route);
		});
	}
}