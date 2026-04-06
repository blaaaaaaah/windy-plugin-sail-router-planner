/**
 * Formatting utilities using Windy's metrics system
 */

/**
 * Format distance using Windy's metric system
 */
export function formatDistance(meterValue: number): string {
    const W = (window as any).W;
    return W.metrics.distance.convertValue(meterValue);
}

/**
 * Format wind speed using Windy's metric system
 */
export function formatWindSpeed(msValue: number): string {
    const W = (window as any).W;
    return W.metrics.wind.convertValue(msValue);
}

/**
 * Format wave height using Windy's metric system
 */
export function formatWaveHeight(meterValue: number): string {
    const W = (window as any).W;
    return W.metrics.waves.convertValue(meterValue);
}

/**
 * Format precipitation using Windy's metric system
 */
export function formatPrecipitation(mmValue: number): string {
    const W = (window as any).W;
    return W.metrics.rain.convertValue(mmValue);
}

/**
 * Format relative wind direction with Port/Starboard notation
 */
export function formatRelativeDirection(relativeDir: number): string {
    if (relativeDir === 180 || relativeDir === -180) {
        return '180°';
    } else if (relativeDir > 0) {
        return `${relativeDir.toFixed(0)}S`;
    } else {
        return `${Math.abs(relativeDir).toFixed(0)}P`;
    }
}