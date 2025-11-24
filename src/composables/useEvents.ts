import { ref, computed, shallowRef } from "vue";
import { useSupabase } from "./useSupabase";
import type { CalendarEvent } from "@/types";
import { handleError } from "@/utils/errorHandler";

/**
 * Events management composable
 * Provides centralized state management and CRUD operations for calendar events
 * Implements requirements 6.1, 6.2, 6.3, 7.2
 *
 * Note: This composable uses a singleton pattern to ensure state is shared
 * across all components that use it.
 * Performance: Uses shallowRef for large arrays to reduce reactivity overhead
 */

// Shared state (singleton pattern)
// Performance: Use shallowRef for large arrays
const events = shallowRef<CalendarEvent[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
let isInitialized = false;

export function useEvents() {
	const {
		getAllEvents,
		createEvent: createEventDb,
		updateEvent: updateEventDb,
		deleteEvent: deleteEventDb,
	} = useSupabase();

	// Computed
	const eventCount = computed(() => events.value.length);
	const hasEvents = computed(() => events.value.length > 0);

	/**
	 * Fetch all events from database and update state
	 * Requirement 7.2: Load all saved events when user reopens the app
	 * Performance: Replaces entire array reference for shallowRef efficiency
	 */
	const fetchEvents = async (): Promise<void> => {
		loading.value = true;
		error.value = null;

		try {
			const fetchedEvents = await getAllEvents();
			// Performance: Replace entire array for shallowRef
			events.value = fetchedEvents;
			isInitialized = true;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : "获取事件列表失败";
			error.value = errorMessage;
			handleError(e, "获取事件列表");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Initialize events if not already loaded
	 * Auto-fetches on first use
	 */
	const ensureInitialized = async (): Promise<void> => {
		if (!isInitialized && !loading.value) {
			await fetchEvents();
		}
	};

	// Auto-initialize on first use
	if (!isInitialized && !loading.value) {
		ensureInitialized();
	}

	/**
	 * Create a new event and add it to state
	 * Requirement 6.1: Provide editing options for calendar events
	 * Requirements 1.2, 1.3, 1.4, 1.5: Handle recurring events
	 * Performance: Creates new array reference for shallowRef reactivity
	 */
	const createEvent = async (
		event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
	): Promise<CalendarEvent> => {
		loading.value = true;
		error.value = null;

		try {
			const newEvent = await createEventDb(event);
			const newEvents = [...events.value, newEvent];
			newEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
			events.value = newEvents;
			return newEvent;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : "创建事件失败";
			error.value = errorMessage;
			handleError(e, "创建事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Update an existing event and reflect changes in state
	 * Requirement 6.2: Update event information and reflect changes in calendar view
	 * Requirement 2.2, 2.3: Handle recurring event updates
	 * Performance: Creates new array reference for shallowRef reactivity
	 */
	const updateEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> => {
		loading.value = true;
		error.value = null;

		try {
			const updatedEvent = await updateEventDb(id, updates);
			let newEvents = events.value.map((e) => (e.id === id ? updatedEvent : e));
			// Re-sort if start time was updated
			if (updates.startTime) {
				newEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
			}
			events.value = newEvents;
			return updatedEvent;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : "更新事件失败";
			error.value = errorMessage;
			handleError(e, "更新事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Delete an event and remove it from state
	 * Requirement 6.3: Remove event from calendar
	 */
	const deleteEvent = async (id: string): Promise<void> => {
		loading.value = true;
		error.value = null;

		try {
			await deleteEventDb(id);
			events.value = events.value.filter((e) => e.id !== id);
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : "删除事件失败";
			error.value = errorMessage;
			handleError(e, "删除事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Refresh events from database
	 * Useful for ensuring data consistency
	 */
	const refreshEvents = async (): Promise<void> => {
		await fetchEvents();
	};

	/**
	 * Get a single event by ID
	 */
	const getEventById = (id: string): CalendarEvent | undefined => {
		return events.value.find((e) => e.id === id);
	};

	/**
	 * Get events for a specific date range
	 */
	const getEventsByDateRange = (startDate: Date, endDate: Date): CalendarEvent[] => {
		return events.value.filter((event) => {
			return event.startTime >= startDate && event.startTime <= endDate;
		});
	};

	/**
	 * Clear error state
	 */
	const clearError = (): void => {
		error.value = null;
	};

	/**
	 * Toggle event completion status
	 * Requirement 23.2: Save completion status immediately to database
	 * Requirement 23.6: Toggle completion status and update all views
	 */
	const toggleEventCompletion = async (id: string): Promise<CalendarEvent> => {
		const event = getEventById(id);
		if (!event) {
			throw new Error("事件不存在");
		}

		const newCompletionStatus = !event.isCompleted;
		return await updateEvent(id, { isCompleted: newCompletionStatus });
	};

	/**
	 * Batch delete events
	 * Requirement 12.3: Implement batch delete
	 * Requirement 12.5: Ensure atomicity (all succeed or all fail)
	 * Supports recurring events - expands to include all instances in recurrence groups
	 */
	const batchDeleteEvents = async (ids: string[]): Promise<void> => {
		if (ids.length === 0) return;

		loading.value = true;
		error.value = null;

		try {
			// Delete all events - if any fails, the whole operation fails
			await Promise.all(ids.map((id) => deleteEventDb(id)));

			// Only update state if all deletions succeeded
			events.value = events.value.filter((e) => !ids.includes(e.id));
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : "批量删除事件失败";
			error.value = errorMessage;
			handleError(e, "批量删除事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Batch update events
	 * Requirement 12.4: Implement batch edit
	 * Requirement 12.5: Ensure atomicity (all succeed or all fail)
	 */
	const batchUpdateEvents = async (ids: string[], updates: Partial<CalendarEvent>): Promise<CalendarEvent[]> => {
		if (ids.length === 0) return [];

		loading.value = true;
		error.value = null;

		try {
			// Update all events - if any fails, the whole operation fails
			const updatedEvents = await Promise.all(ids.map((id) => updateEventDb(id, updates)));

			// Only update state if all updates succeeded
			const updatedIds = new Set(ids);
			let newEvents = events.value.map((e) => {
				if (updatedIds.has(e.id)) {
					return updatedEvents.find((ue) => ue.id === e.id) || e;
				}
				return e;
			});

			// Re-sort if start time was updated
			if (updates.startTime) {
				newEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
			}

			events.value = newEvents;
			return updatedEvents;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : "批量更新事件失败";
			error.value = errorMessage;
			handleError(e, "批量更新事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	return {
		// State
		events,
		loading,
		error,

		// Computed
		eventCount,
		hasEvents,

		// Methods
		fetchEvents,
		ensureInitialized,
		createEvent,
		updateEvent,
		deleteEvent,
		refreshEvents,
		getEventById,
		getEventsByDateRange,
		clearError,
		batchDeleteEvents,
		batchUpdateEvents,
		toggleEventCompletion,
	};
}
