/**
 * Format date for API (YYYY/MM/DD/HH)
 */
export function toDateWithHour(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const hour = String(date.getUTCHours()).padStart(2, '0');

	return `${year}/${month}/${day}/${hour}`;
}

/**
 * Format date as "Month Day" (e.g., "Mar 15")
 */
export function formatDayDate(timestamp: number): string {
    const date = new Date(timestamp);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}

/**
 * Format time as "HH:MM" (e.g., "14:30")
 */
export function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Format duration from milliseconds to human readable format
 * Examples: "2h 30m", "1d 4h", "45m"
 */
export function formatDuration(durationMs: number): string {
    const totalMinutes = Math.floor(durationMs / (1000 * 60));
    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (totalHours >= 24) {
        const days = Math.floor(totalHours / 24);
        const remainingHours = totalHours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    } else if (totalHours > 0) {
        return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
    } else {
        return `${minutes}m`;
    }
}