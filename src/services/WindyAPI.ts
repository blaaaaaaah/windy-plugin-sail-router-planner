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
}