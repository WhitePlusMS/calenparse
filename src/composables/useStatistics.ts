import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { CalendarEvent } from "@/types";
import dayjs from "dayjs";

/**
 * Statistics composable
 * Provides statistical analysis of calendar events
 * Implements requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

export interface TimeDistribution {
	period: string;
	count: number;
	label: string;
}

export interface LocationDistribution {
	location: string;
	count: number;
	percentage: number;
}

export interface Statistics {
	totalEvents: number;
	timeDistribution: TimeDistribution[];
	locationDistribution: LocationDistribution[];
}

const UNSPECIFIED_LOCATION = "未指定地点";

/**
 * Extract district-level location from detailed address
 *
 * Extracts the most specific administrative division (district/county level)
 * from a Chinese address string, following the hierarchy: 省 > 市 > 区/县
 *
 * @param location - Full address string
 * @returns District-level location or original string if no pattern matches
 *
 * @example
 * extractDistrictLocation("北京市朝阳区酒仙桥路") // => "朝阳区"
 * extractDistrictLocation("上海市浦东新区陆家嘴") // => "浦东新区"
 * extractDistrictLocation("朝阳区") // => "朝阳区"
 * extractDistrictLocation("会议室A") // => "会议室A"
 */
function extractDistrictLocation(location: string): string {
	if (!location?.trim()) {
		return UNSPECIFIED_LOCATION;
	}

	const trimmed = location.trim();

	// Define district-level patterns in order of specificity
	const patterns = [
		// Pattern 1: "新区" (special economic zones like 浦东新区, 滨海新区)
		// Must check first as it's more specific than generic 区
		/([^\s省市区县]+新区)/,

		// Pattern 2: Standard district after city "XX市XX区/县"
		// Captures the district part after the last 市
		/[市]([^市区县]+[区县])/,

		// Pattern 3: Standalone district "XX区/县" (without city prefix)
		/^([^省市]+[区县])/,

		// Pattern 4: District in full address "XX省XX市XX区"
		// Captures the last district-level division
		/[省市]([^省市区县]+[区县])/,
	];

	for (const pattern of patterns) {
		const match = trimmed.match(pattern);
		if (match?.[1]) {
			return match[1];
		}
	}

	// No district pattern found, return original location
	// This handles cases like "会议室A", "办公楼B座" etc.
	return trimmed;
}

/**
 * Generic time distribution calculator
 * Reduces code duplication across day/week/month distributions
 */
function calculateTimeDistribution(
	events: CalendarEvent[],
	formatKey: (date: dayjs.Dayjs) => string,
	formatLabel: (date: dayjs.Dayjs) => string
): TimeDistribution[] {
	const distribution = new Map<string, number>();

	events.forEach((event) => {
		const key = formatKey(dayjs(event.startTime));
		distribution.set(key, (distribution.get(key) || 0) + 1);
	});

	return Array.from(distribution.entries())
		.map(([period, count]) => ({
			period,
			count,
			label: formatLabel(dayjs(period)),
		}))
		.sort((a, b) => a.period.localeCompare(b.period));
}

export function useStatistics(
	eventsRef: MaybeRefOrGetter<CalendarEvent[]>,
	startDate?: MaybeRefOrGetter<Date | undefined>,
	endDate?: MaybeRefOrGetter<Date | undefined>
) {
	/**
	 * Filter events by date range if provided
	 * Requirement 9.4: Support custom time range selection
	 */
	const filteredEvents = computed(() => {
		const events = toValue(eventsRef);
		const start = toValue(startDate);
		const end = toValue(endDate);

		if (!start || !end) {
			return events;
		}

		const startDay = dayjs(start).startOf("day");
		const endDay = dayjs(end).endOf("day");

		return events.filter((event) => {
			const eventDate = dayjs(event.startTime);
			return eventDate.isAfter(startDay) && eventDate.isBefore(endDay);
		});
	});

	/**
	 * Total number of events
	 * Requirement 9.1: Display all event statistics
	 */
	const totalEvents = computed(() => filteredEvents.value.length);

	/**
	 * Calculate time distribution by day
	 * Requirement 9.2: Show event count distribution by time period
	 */
	const timeDistributionByDay = computed(() =>
		calculateTimeDistribution(
			filteredEvents.value,
			(d) => d.format("YYYY-MM-DD"),
			(d) => d.format("MM/DD")
		)
	);

	/**
	 * Calculate time distribution by week
	 * Requirement 9.2: Show event count distribution by time period
	 */
	const timeDistributionByWeek = computed(() =>
		calculateTimeDistribution(
			filteredEvents.value,
			(d) => d.startOf("week").format("YYYY-MM-DD"),
			(d) => d.format("MM/DD")
		)
	);

	/**
	 * Calculate time distribution by month
	 * Requirement 9.2: Show event count distribution by time period
	 */
	const timeDistributionByMonth = computed(() =>
		calculateTimeDistribution(
			filteredEvents.value,
			(d) => d.format("YYYY-MM"),
			(d) => d.format("YYYY年MM月")
		)
	);

	/**
	 * Calculate location distribution
	 * Requirement 9.3: Show event count distribution by location
	 * Requirement 9.5: Categorize events without location as "未指定地点"
	 *
	 * Extracts district-level location from detailed addresses for better aggregation
	 */
	const locationDistribution = computed((): LocationDistribution[] => {
		const distribution = new Map<string, number>();

		filteredEvents.value.forEach((event) => {
			const rawLocation = event.location?.trim() || "";
			const districtLocation = extractDistrictLocation(rawLocation);
			distribution.set(districtLocation, (distribution.get(districtLocation) || 0) + 1);
		});

		const total = filteredEvents.value.length;

		return Array.from(distribution.entries())
			.map(([location, count]) => ({
				location,
				count,
				percentage: total > 0 ? Math.round((count / total) * 100) : 0,
			}))
			.sort((a, b) => b.count - a.count);
	});

	/**
	 * Get statistics summary
	 * Requirement 9.6: Display statistics using charts or visualizations
	 */
	const statistics = computed(
		(): Statistics => ({
			totalEvents: totalEvents.value,
			timeDistribution: timeDistributionByDay.value,
			locationDistribution: locationDistribution.value,
		})
	);

	return {
		// Computed
		totalEvents,
		timeDistributionByDay,
		timeDistributionByWeek,
		timeDistributionByMonth,
		locationDistribution,
		statistics,
		filteredEvents,
	};
}
