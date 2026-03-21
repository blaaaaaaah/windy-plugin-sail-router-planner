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