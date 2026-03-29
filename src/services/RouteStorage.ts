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
		const routes = this.listSerializedRoutes();

		// Check if this exact route already exists
		if (!routes.includes(serializedRoute)) {
			routes.push(serializedRoute);
			this.storage.setItem(RouteStorage.STORAGE_KEY, JSON.stringify(routes));
		}
	}

	listRoutes(): RouteDefinition[] {
		const serializedRoutes = this.listSerializedRoutes();
		const routes: RouteDefinition[] = [];

		for (const serialized of serializedRoutes) {
			const route = deserializeRoute(serialized);
			if (route) {
				routes.push(route);
			}
		}

		return routes;
	}

	deleteRoute(route: RouteDefinition): void {
		const serializedRoute = serializeRoute(route);
		const routes = this.listSerializedRoutes().filter(r => r !== serializedRoute);
		this.storage.setItem(RouteStorage.STORAGE_KEY, JSON.stringify(routes));
	}

	private listSerializedRoutes(): string[] {
		try {
			const stored = this.storage.getItem(RouteStorage.STORAGE_KEY);
			if (!stored) return [];

			const routes = JSON.parse(stored);
			return Array.isArray(routes) ? routes : [];
		} catch (error) {
			console.error('Error loading routes from storage:', error);
			return [];
		}
	}
}