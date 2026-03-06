/**
 * Format date for API (YYYY/MM/DD/HH)
 */
export function toDateWithHour(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hour = String(date.getHours()).padStart(2, '0');

	return `${year}/${month}/${day}/${hour}`;
}