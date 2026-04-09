import type { RouteDefinition } from '../types/RouteTypes';
import { serializeRoute, deserializeRoute } from '../utils/RouteSerializer';

interface StorageInterface {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export class RouteStorage {
	private static readonly STORAGE_KEY = 'windy-sail-routes';
	private storage: StorageInterface;

	constructor(storage: StorageInterface) {
		this.storage = storage;
	}

	saveRoute(route: RouteDefinition): void {
		const serializedRoute = serializeRoute(route);
		const routes = this.getRouteMap();

		// Save/update route by ID
		routes[route.id] = serializedRoute;
		this.storage.setItem(RouteStorage.STORAGE_KEY, JSON.stringify(routes));

		// Mark route as saved
		route.isSaved = true;
	}

	listRoutes(): RouteDefinition[] {
		const routeMap = this.getRouteMap();
		const routes: RouteDefinition[] = [];

		for (const serialized of Object.values(routeMap)) {
			const route = deserializeRoute(serialized);
			if (route) {
				// Mark route as saved since it was loaded from storage
				route.isSaved = true;
				routes.push(route);
			}
		}

		return routes;
	}

	listVisibleRoutes(): RouteDefinition[] {
		return this.listRoutes().filter(route => route.isVisible);
	}

	deleteRoute(route: RouteDefinition): void {
		const routes = this.getRouteMap();
		delete routes[route.id];
		this.storage.setItem(RouteStorage.STORAGE_KEY, JSON.stringify(routes));
	}

	private getRouteMap(): Record<string, string> {
		try {
			const stored = this.storage.getItem(RouteStorage.STORAGE_KEY);
			if (!stored) return {};

			const routes = JSON.parse(stored);
			return typeof routes === 'object' && !Array.isArray(routes) ? routes : {};
		} catch (error) {
			console.error('Error loading routes from storage:', error);
			return {};
		}
	}
}