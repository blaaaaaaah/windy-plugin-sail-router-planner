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

export function formatWeekDayDate(timestamp: number): string { 
    return new Date(timestamp).toLocaleString(undefined, {
            day: 'numeric',
            weekday: 'short'
    });
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

/**
 * Format complete date and time combining day/date and time
 * Examples: "Mar 15 14:30", "Dec 25 09:00"
 */
export function formatDateTime(timestamp: number): string {
    return `${formatDayDate(timestamp)} ${formatTime(timestamp)}`;
}

/**
 * Format time ago relative to now
 * Examples: "2 minutes ago", "1 hour ago", "3 days ago"
 */
export function formatTimeAgo(timestamp: number): string {
    console.log('Formatting time ago for timestamp:', new Date(timestamp));
    const now = Date.now();
    const diffMs = now - timestamp;

    if (diffMs < 0) {
        return "just now";
    }

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return days === 1 ? "1 day ago" : `${days} days ago`;
    } else if (hours > 0) {
        return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    } else if (minutes > 0) {
        return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    } else {
        return "just now";
    }
}

/**
 * Format compact time for narrow display
 * Examples: "12h", "13h", "1pm" (depending on locale)
 */
export function formatCompactTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours();

    // Use 12-hour format if user's locale prefers it
    const locale = navigator.language;
    const use12Hour = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;

    if (use12Hour) {
        return date.toLocaleString(locale, {
            hour: 'numeric',
            hour12: true
        }).toLowerCase().replace(' ', '');
    } else {
        return `${hours}h`;
    }
}

/**
 * Check if timestamp is on a different day than previous timestamp
 */
export function isNewDay(timestamp: number, previousTimestamp: number | null): boolean {
    if (!previousTimestamp) return true;

    const date = new Date(timestamp);
    const prevDate = new Date(previousTimestamp);

    return date.getDate() !== prevDate.getDate() ||
           date.getMonth() !== prevDate.getMonth() ||
           date.getFullYear() !== prevDate.getFullYear();
}