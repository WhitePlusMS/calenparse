import { ref, computed } from "vue";
import type { CalendarEvent, SearchFilters } from "@/types";

/**
 * Search and filtering composable
 * Provides search and filtering functionality for calendar events
 * Implements requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4
 */

export function useSearch() {
	// Reactive filters state
	const filters = ref<SearchFilters>({});

	/**
	 * Apply all active filters to an array of events
	 * Requirements 4.1, 5.1, 6.2, 7.2: Apply keyword, date range, location, and tag filters
	 *
	 * @param events - Array of calendar events to filter
	 * @param searchFilters - Filter criteria to apply
	 * @returns Filtered array of events
	 */
	const applyFilters = (events: CalendarEvent[], searchFilters: SearchFilters): CalendarEvent[] => {
		let filtered = [...events];

		// Requirement 4.1: Keyword search in title, description, and location
		if (searchFilters.keyword && searchFilters.keyword.trim()) {
			const keyword = searchFilters.keyword.toLowerCase().trim();
			filtered = filtered.filter((event) => {
				const titleMatch = event.title?.toLowerCase().includes(keyword);
				const descriptionMatch = event.description?.toLowerCase().includes(keyword);
				const locationMatch = event.location?.toLowerCase().includes(keyword);
				return titleMatch || descriptionMatch || locationMatch;
			});
		}

		// Requirement 5.1: Date range filtering
		if (searchFilters.dateRange && searchFilters.dateRange.length === 2) {
			const [startDate, endDate] = searchFilters.dateRange;
			filtered = filtered.filter((event) => {
				return event.startTime >= startDate && event.startTime <= endDate;
			});
		}

		// Requirement 6.2: Location filtering (OR logic for multiple locations)
		if (searchFilters.locations && searchFilters.locations.length > 0) {
			filtered = filtered.filter((event) => {
				return event.location && searchFilters.locations!.includes(event.location);
			});
		}

		// Requirement 7.2: Tag filtering (OR logic - event must have at least one selected tag)
		if (searchFilters.tagIds && searchFilters.tagIds.length > 0) {
			filtered = filtered.filter((event) => {
				return event.tagIds?.some((tagId) => searchFilters.tagIds!.includes(tagId));
			});
		}

		return filtered;
	};

	/**
	 * Get all unique locations from an array of events
	 * Requirement 6.1: Display all unique locations for filtering
	 *
	 * @param events - Array of calendar events
	 * @returns Sorted array of unique location strings
	 */
	const getUniqueLocations = (events: CalendarEvent[]): string[] => {
		const locations = events
			.map((e) => e.location)
			.filter((loc): loc is string => !!loc && loc.trim() !== "");

		// Remove duplicates and sort alphabetically
		return [...new Set(locations)].sort();
	};

	/**
	 * Get all unique tag IDs from an array of events
	 * Requirement 7.1: Display all unique tags for filtering
	 *
	 * @param events - Array of calendar events
	 * @returns Array of unique tag ID strings
	 */
	const getUniqueTags = (events: CalendarEvent[]): string[] => {
		const tagIds = events.flatMap((e) => e.tagIds || []).filter((tagId): tagId is string => !!tagId);

		// Remove duplicates
		return [...new Set(tagIds)];
	};

	/**
	 * Filter locations by search term
	 * Requirement 6.3: Filter location list by search input
	 *
	 * @param locations - Array of location strings
	 * @param searchTerm - Search term to filter by
	 * @returns Filtered array of locations
	 */
	const filterLocationsBySearch = (locations: string[], searchTerm: string): string[] => {
		if (!searchTerm || !searchTerm.trim()) {
			return locations;
		}

		const term = searchTerm.toLowerCase().trim();
		return locations.filter((location) => location.toLowerCase().includes(term));
	};

	/**
	 * Clear all active filters
	 * Requirements 4.4, 5.4, 7.3: Clear filters to show all events
	 */
	const clearFilters = (): void => {
		filters.value = {};
	};

	/**
	 * Clear a specific filter
	 * Requirement 6.4, 7.4: Clear individual filter criteria
	 *
	 * @param filterKey - The filter key to clear
	 */
	const clearFilter = (filterKey: keyof SearchFilters): void => {
		if (filterKey in filters.value) {
			delete filters.value[filterKey];
		}
	};

	/**
	 * Check if any filters are active
	 * Used for UI display of filter status
	 */
	const hasActiveFilters = computed(() => {
		return (
			!!filters.value.keyword ||
			!!filters.value.dateRange ||
			(!!filters.value.locations && filters.value.locations.length > 0) ||
			(!!filters.value.tagIds && filters.value.tagIds.length > 0)
		);
	});

	/**
	 * Get count of active filters
	 * Used for UI display
	 */
	const activeFilterCount = computed(() => {
		let count = 0;
		if (filters.value.keyword) count++;
		if (filters.value.dateRange) count++;
		if (filters.value.locations && filters.value.locations.length > 0) count++;
		if (filters.value.tagIds && filters.value.tagIds.length > 0) count++;
		return count;
	});

	/**
	 * Apply date range preset
	 * Requirement 5.2: Support preset date ranges (today, this week, this month)
	 *
	 * @param preset - Preset type ('today', 'thisWeek', 'thisMonth')
	 */
	const applyDateRangePreset = (preset: "today" | "thisWeek" | "thisMonth"): void => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		switch (preset) {
			case "today": {
				const endOfDay = new Date(today);
				endOfDay.setHours(23, 59, 59, 999);
				filters.value.dateRange = [today, endOfDay];
				break;
			}
			case "thisWeek": {
				// Get start of week (Sunday)
				const startOfWeek = new Date(today);
				const dayOfWeek = startOfWeek.getDay();
				startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

				// Get end of week (Saturday)
				const endOfWeek = new Date(startOfWeek);
				endOfWeek.setDate(endOfWeek.getDate() + 6);
				endOfWeek.setHours(23, 59, 59, 999);

				filters.value.dateRange = [startOfWeek, endOfWeek];
				break;
			}
			case "thisMonth": {
				// Get start of month
				const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

				// Get end of month
				const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
				endOfMonth.setHours(23, 59, 59, 999);

				filters.value.dateRange = [startOfMonth, endOfMonth];
				break;
			}
		}
	};

	return {
		// State
		filters,

		// Computed
		hasActiveFilters,
		activeFilterCount,

		// Methods
		applyFilters,
		getUniqueLocations,
		getUniqueTags,
		filterLocationsBySearch,
		clearFilters,
		clearFilter,
		applyDateRangePreset,
	};
}
