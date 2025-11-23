import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

// Configure dayjs
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.locale("zh-cn");

/**
 * Date utility functions for the calendar application
 * Implements requirements 5.1, 5.2, 5.3, 5.4
 */

/**
 * Format a date to a readable string
 * Requirement 5.1: Handle absolute dates like "2024年3月15日"
 *
 * @param date - The date to format
 * @param format - The format string (default: 'YYYY年MM月DD日')
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: string = "YYYY年MM月DD日"): string {
	return dayjs(date).format(format);
}

/**
 * Format a date with time
 * Requirement 5.3: Handle time ranges like "上午9点到11点"
 *
 * @param date - The date to format
 * @param format - The format string (default: 'YYYY年MM月DD日 HH:mm')
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date, format: string = "YYYY年MM月DD日 HH:mm"): string {
	return dayjs(date).format(format);
}

/**
 * Format a time only
 *
 * @param date - The date to extract time from
 * @param format - The format string (default: 'HH:mm')
 * @returns Formatted time string
 */
export function formatTime(date: Date, format: string = "HH:mm"): string {
	return dayjs(date).format(format);
}

/**
 * Format a date range
 * Requirement 5.3: Extract start time and end time from time ranges
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
	const start = dayjs(startDate);
	const end = dayjs(endDate);

	// If same day, show date once with time range
	if (start.isSame(end, "day")) {
		return `${start.format("YYYY年MM月DD日")} ${start.format("HH:mm")} - ${end.format("HH:mm")}`;
	}

	// Different days
	return `${start.format("YYYY年MM月DD日 HH:mm")} - ${end.format("YYYY年MM月DD日 HH:mm")}`;
}

/**
 * Parse a date string to Date object
 * Requirement 5.1: Parse absolute dates
 * Requirement 5.2: Parse relative dates and calculate absolute dates
 *
 * @param dateString - The date string to parse
 * @param referenceDate - Reference date for relative date calculations (default: now)
 * @returns Parsed Date object or null if invalid
 */
export function parseDate(dateString: string, referenceDate: Date = new Date()): Date | null {
	if (!dateString || dateString.trim() === "") {
		return null;
	}

	const trimmed = dateString.trim();
	const reference = dayjs(referenceDate);

	// Try parsing relative dates first (Requirement 5.2)
	const relativeDate = parseRelativeDate(trimmed, reference);
	if (relativeDate) {
		return relativeDate.toDate();
	}

	// Try parsing absolute dates (Requirement 5.1)
	const absoluteDate = parseAbsoluteDate(trimmed);
	if (absoluteDate) {
		return absoluteDate.toDate();
	}

	return null;
}

/**
 * Parse relative date expressions
 * Requirement 5.2: Calculate absolute dates from relative dates like "明天", "下周三"
 *
 * @param dateString - Relative date string
 * @param reference - Reference date for calculations
 * @returns Parsed dayjs object or null
 */
function parseRelativeDate(dateString: string, reference: dayjs.Dayjs): dayjs.Dayjs | null {
	const str = dateString.toLowerCase();

	// Today
	if (str.includes("今天") || str.includes("今日")) {
		return reference.startOf("day");
	}

	// Tomorrow
	if (str.includes("明天") || str.includes("明日")) {
		return reference.add(1, "day").startOf("day");
	}

	// Yesterday
	if (str.includes("昨天") || str.includes("昨日")) {
		return reference.subtract(1, "day").startOf("day");
	}

	// Day after tomorrow
	if (str.includes("后天")) {
		return reference.add(2, "day").startOf("day");
	}

	// Day before yesterday
	if (str.includes("前天")) {
		return reference.subtract(2, "day").startOf("day");
	}

	// This week's day (e.g., "本周三", "这周五")
	const thisWeekMatch = str.match(/(?:本周|这周)(一|二|三|四|五|六|日|天)/);
	if (thisWeekMatch && thisWeekMatch[1]) {
		const dayOfWeek = getDayOfWeekNumber(thisWeekMatch[1]);
		if (dayOfWeek !== null) {
			return reference.day(dayOfWeek).startOf("day");
		}
	}

	// Next week's day (e.g., "下周三", "下星期五")
	const nextWeekMatch = str.match(/(?:下周|下星期)(一|二|三|四|五|六|日|天)/);
	if (nextWeekMatch && nextWeekMatch[1]) {
		const dayOfWeek = getDayOfWeekNumber(nextWeekMatch[1]);
		if (dayOfWeek !== null) {
			return reference.add(1, "week").day(dayOfWeek).startOf("day");
		}
	}

	// Last week's day (e.g., "上周三", "上星期五")
	const lastWeekMatch = str.match(/(?:上周|上星期)(一|二|三|四|五|六|日|天)/);
	if (lastWeekMatch && lastWeekMatch[1]) {
		const dayOfWeek = getDayOfWeekNumber(lastWeekMatch[1]);
		if (dayOfWeek !== null) {
			return reference.subtract(1, "week").day(dayOfWeek).startOf("day");
		}
	}

	// N days later (e.g., "3天后", "5日后")
	const daysLaterMatch = str.match(/(\d+)(?:天|日)后/);
	if (daysLaterMatch && daysLaterMatch[1]) {
		const days = parseInt(daysLaterMatch[1], 10);
		return reference.add(days, "day").startOf("day");
	}

	// N days ago (e.g., "3天前", "5日前")
	const daysAgoMatch = str.match(/(\d+)(?:天|日)前/);
	if (daysAgoMatch && daysAgoMatch[1]) {
		const days = parseInt(daysAgoMatch[1], 10);
		return reference.subtract(days, "day").startOf("day");
	}

	// N weeks later
	const weeksLaterMatch = str.match(/(\d+)(?:周|星期)后/);
	if (weeksLaterMatch && weeksLaterMatch[1]) {
		const weeks = parseInt(weeksLaterMatch[1], 10);
		return reference.add(weeks, "week").startOf("day");
	}

	// N weeks ago
	const weeksAgoMatch = str.match(/(\d+)(?:周|星期)前/);
	if (weeksAgoMatch && weeksAgoMatch[1]) {
		const weeks = parseInt(weeksAgoMatch[1], 10);
		return reference.subtract(weeks, "week").startOf("day");
	}

	// N months later
	const monthsLaterMatch = str.match(/(\d+)(?:个)?月后/);
	if (monthsLaterMatch && monthsLaterMatch[1]) {
		const months = parseInt(monthsLaterMatch[1], 10);
		return reference.add(months, "month").startOf("day");
	}

	// N months ago
	const monthsAgoMatch = str.match(/(\d+)(?:个)?月前/);
	if (monthsAgoMatch && monthsAgoMatch[1]) {
		const months = parseInt(monthsAgoMatch[1], 10);
		return reference.subtract(months, "month").startOf("day");
	}

	return null;
}

/**
 * Parse absolute date expressions
 * Requirement 5.1: Parse absolute dates like "2024年3月15日"
 *
 * @param dateString - Absolute date string
 * @returns Parsed dayjs object or null
 */
function parseAbsoluteDate(dateString: string): dayjs.Dayjs | null {
	// Normalize Chinese date format by padding single digits
	let normalized = dateString;

	// Handle formats like "2024年3月15日" -> "2024年03月15日"
	normalized = normalized.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, (_match, year, month, day) => {
		return `${year}年${month.padStart(2, "0")}月${day.padStart(2, "0")}日`;
	});

	// Handle formats like "3月15日" -> "03月15日"
	normalized = normalized.replace(/^(\d{1,2})月(\d{1,2})日/, (_match, month, day) => {
		return `${month.padStart(2, "0")}月${day.padStart(2, "0")}日`;
	});

	// Common date formats to try
	const formats = ["YYYY年MM月DD日", "YYYY-MM-DD", "YYYY/MM/DD", "YYYY.MM.DD", "MM月DD日", "MM-DD", "MM/DD"];

	for (const format of formats) {
		const parsed = dayjs(normalized, format, true);
		if (parsed.isValid()) {
			// If year is missing, use current year
			if (!format.includes("YYYY")) {
				return parsed.year(dayjs().year());
			}
			return parsed;
		}
	}

	// Try ISO format
	const isoDate = dayjs(dateString);
	if (isoDate.isValid()) {
		return isoDate;
	}

	return null;
}

/**
 * Convert Chinese day of week to number (0 = Sunday, 1 = Monday, etc.)
 */
function getDayOfWeekNumber(dayStr: string): number | null {
	const dayMap: Record<string, number> = {
		日: 0,
		天: 0,
		一: 1,
		二: 2,
		三: 3,
		四: 4,
		五: 5,
		六: 6,
	};
	return dayMap[dayStr] ?? null;
}

/**
 * Validate if a date is valid
 * Requirement 5.4: Validate dates
 *
 * @param date - Date to validate
 * @returns true if valid, false otherwise
 */
export function isValidDate(date: any): date is Date {
	return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate if a date string can be parsed
 *
 * @param dateString - Date string to validate
 * @returns true if can be parsed, false otherwise
 */
export function isValidDateString(dateString: string): boolean {
	const parsed = parseDate(dateString);
	return parsed !== null && isValidDate(parsed);
}

/**
 * Check if a date is in the past
 *
 * @param date - Date to check
 * @returns true if in the past, false otherwise
 */
export function isPast(date: Date): boolean {
	return dayjs(date).isBefore(dayjs(), "day");
}

/**
 * Check if a date is in the future
 *
 * @param date - Date to check
 * @returns true if in the future, false otherwise
 */
export function isFuture(date: Date): boolean {
	return dayjs(date).isAfter(dayjs(), "day");
}

/**
 * Check if a date is today
 *
 * @param date - Date to check
 * @returns true if today, false otherwise
 */
export function isToday(date: Date): boolean {
	return dayjs(date).isSame(dayjs(), "day");
}

/**
 * Check if two dates are on the same day
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if same day, false otherwise
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return dayjs(date1).isSame(dayjs(date2), "day");
}

/**
 * Get the start of day for a date
 *
 * @param date - Date to process
 * @returns Date at start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
	return dayjs(date).startOf("day").toDate();
}

/**
 * Get the end of day for a date
 *
 * @param date - Date to process
 * @returns Date at end of day (23:59:59)
 */
export function endOfDay(date: Date): Date {
	return dayjs(date).endOf("day").toDate();
}

/**
 * Add days to a date
 *
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date
 */
export function addDays(date: Date, days: number): Date {
	return dayjs(date).add(days, "day").toDate();
}

/**
 * Add hours to a date
 *
 * @param date - Base date
 * @param hours - Number of hours to add (can be negative)
 * @returns New date
 */
export function addHours(date: Date, hours: number): Date {
	return dayjs(date).add(hours, "hour").toDate();
}

/**
 * Get the difference between two dates in days
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference
 */
export function diffInDays(date1: Date, date2: Date): number {
	return dayjs(date1).diff(dayjs(date2), "day");
}

/**
 * Create an all-day event date range
 * Requirement 5.4: Create all-day events when no specific time is provided
 *
 * @param date - The date for the all-day event
 * @returns Object with startTime and endTime for all-day event
 */
export function createAllDayEvent(date: Date): { startTime: Date; endTime: Date } {
	const start = startOfDay(date);
	const end = endOfDay(date);
	return { startTime: start, endTime: end };
}
