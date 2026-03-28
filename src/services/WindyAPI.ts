import type { LatLng, WindyAPIResponse } from '../types';
import { toDateWithHour } from '../utils/TimeUtils';

export class WindyAPI {
	async get(url: string): Promise<any> {
		try {
			const W = (window as any).W;
			if (!W || !W.http) {
				throw new Error('Windy W.http not available');
			}

			const response = await W.http.get(url);

			// Extract data from response (API returns {data: {...}})
			if (!response.data) {
				throw new Error('Invalid API response structure');
			}

			return response.data;
		} catch (error) {
			console.error('WindyAPI error:', error);
			throw error;
		}
	}

	async getRoutePlanner(startTime: number, endTime: number, waypoints: LatLng[]): Promise<WindyAPIResponse> {
		const url = await this.buildRoutePlannerURL(startTime, endTime, waypoints);
		console.log('Calling Route Planner API with URL:', url);
		return await this.get(url);
	}

	async getForecastWindow(): Promise<{ start: number; end: number; premiumStart: number }> {
		const W = (window as any).W;
		if (!W || !W.products || !W.products.ecmwf) {
			throw new Error('W.products.ecmwf not available');
		}

		// Load ECMWF manifest and calendar
		const ecmwfMinifest = await W.products.ecmwf.loadMinifest();
		const ecmwfCalendar = await W.products.ecmwf.getCalendar();

		if (!ecmwfMinifest || !ecmwfCalendar) {
			throw new Error('Failed to load ECMWF manifest or calendar');
		}

		const start = new Date(ecmwfMinifest.ref).getTime();
		const end = ecmwfCalendar.end; // Full forecast window for leg calculations
		const premiumStart = ecmwfCalendar.premiumStart; // For API calls

		console.log(`Forecast window: ${new Date(start).toISOString()} to ${new Date(end).toISOString()}`);
		console.log(`Premium boundary: ${new Date(premiumStart).toISOString()}`);
		return { start, end, premiumStart };
	}

	private async buildRoutePlannerURL(startTime: number, endTime: number, waypoints: LatLng[]): Promise<string> {
		// Convert waypoints to coordinate string
		const coordsString = waypoints
			.map(point => `${point.lat},${point.lng}`)
			.join(';');

		// Build time parameters
		const timeParams = this.buildTimeParameters(startTime, endTime);

		// Generate minifest parameter dynamically
		const minifestParam = await this.buildMinifestParameter();

		const queryString = [
			...timeParams,
			`minifest=${minifestParam}`
		].join('&');

		return `/rplanner/v1/forecast/boat/${coordsString}?${queryString}`;
	}

	private buildTimeParameters(startTime: number, endTime: number): string[] {
		const timeParams: string[] = [];

		// dst = departure time
		const departureTime = new Date(startTime);
		timeParams.push(`dst=${toDateWithHour(departureTime)}`);

		// dst2 = end time
		const arrivalTime = new Date(endTime);
		timeParams.push(`dst2=${toDateWithHour(arrivalTime)}`);

		return timeParams;
	}

	private async buildMinifestParameter(): Promise<string> {
		console.log('Building minifest parameter...');

		const W = (window as any).W;
		if (!W || !W.products || !W.products.ecmwf) {
			throw new Error('W.products.ecmwf not available - cannot generate minifest parameter');
		}

		// Load ECMWF manifest and calendar
		const ecmwfMinifest = await W.products.ecmwf.loadMinifest();
		const ecmwfCalendar = await W.products.ecmwf.getCalendar();

		if (!ecmwfMinifest || !ecmwfCalendar) {
			throw new Error('Failed to load ECMWF manifest or calendar');
		}

		console.log('ECMWF manifest:', ecmwfMinifest);
		console.log('ECMWF calendar:', ecmwfCalendar);

		// Build minifest string according to reverse-engineered format
		const start = new Date(ecmwfMinifest.ref).getTime();
		const end = ecmwfCalendar.premiumStart; // Use premiumStart for API calls

		if (!end) {
			throw new Error('ECMWF calendar premiumStart not available');
		}

		const dstAsString = ecmwfMinifest.dst.map((e: any) => e.join(',')).join(';');

		const minifest = `${start};${end};${dstAsString}`;

		console.log('Generated minifest:', minifest);
		return minifest;
	}

	async getReverseName(point: LatLng): Promise<any> {
		try {
			const W = (window as any).W;
			if (!W || !W.reverseName || !W.reverseName.get) {
				throw new Error('Windy W.reverseName not available');
			}

			const result = await W.reverseName.get({ lat: point.lat, lon: point.lng }, 6);
			return result;
		} catch (error) {
			console.error('WindyAPI getReverseName error:', error);
			return null;
		}
	}
}