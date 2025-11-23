import { ref, computed } from "vue";
import type { CalendarEvent } from "@/types";

/**
 * Batch selection composable
 * Manages selection state for batch operations
 * Implements requirements 12.1, 12.2
 *
 * Note: This composable uses a singleton pattern to ensure selection state
 * is consistent across all views (calendar, list, timeline, etc.)
 */

// Shared state (singleton pattern)
const isSelectionMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());

export function useBatchSelection() {
	// Computed
	const selectedCount = computed(() => selectedIds.value.size);
	const hasSelection = computed(() => selectedIds.value.size > 0);

	/**
	 * Toggle selection mode
	 * Requirement 12.1: Allow user to enter batch operation mode
	 */
	const toggleSelectionMode = (): void => {
		isSelectionMode.value = !isSelectionMode.value;
		// Clear selection when exiting selection mode
		if (!isSelectionMode.value) {
			clearSelection();
		}
	};

	/**
	 * Enable selection mode
	 */
	const enableSelectionMode = (): void => {
		isSelectionMode.value = true;
	};

	/**
	 * Disable selection mode and clear selection
	 */
	const disableSelectionMode = (): void => {
		isSelectionMode.value = false;
		clearSelection();
	};

	/**
	 * Toggle selection for a single event
	 * Requirement 12.1: Allow user to select multiple events
	 */
	const toggleSelection = (id: string): void => {
		const newSelectedIds = new Set(selectedIds.value);
		if (newSelectedIds.has(id)) {
			newSelectedIds.delete(id);
		} else {
			newSelectedIds.add(id);
		}
		selectedIds.value = newSelectedIds;
	};

	/**
	 * Check if an event is selected
	 */
	const isSelected = (id: string): boolean => {
		return selectedIds.value.has(id);
	};

	/**
	 * Select a single event
	 */
	const selectEvent = (id: string): void => {
		const newSelectedIds = new Set(selectedIds.value);
		newSelectedIds.add(id);
		selectedIds.value = newSelectedIds;
	};

	/**
	 * Deselect a single event
	 */
	const deselectEvent = (id: string): void => {
		const newSelectedIds = new Set(selectedIds.value);
		newSelectedIds.delete(id);
		selectedIds.value = newSelectedIds;
	};

	/**
	 * Select all events
	 * Requirement 12.1: Implement select all functionality
	 */
	const selectAll = (events: CalendarEvent[]): void => {
		const newSelectedIds = new Set<string>();
		events.forEach((event) => {
			newSelectedIds.add(event.id);
		});
		selectedIds.value = newSelectedIds;
	};

	/**
	 * Clear all selections
	 * Requirement 12.1: Implement deselect all functionality
	 */
	const clearSelection = (): void => {
		selectedIds.value = new Set();
	};

	/**
	 * Get array of selected event IDs
	 */
	const getSelectedIds = (): string[] => {
		return Array.from(selectedIds.value);
	};

	/**
	 * Get selected events from a list of events
	 */
	const getSelectedEvents = (events: CalendarEvent[]): CalendarEvent[] => {
		return events.filter((event) => selectedIds.value.has(event.id));
	};

	/**
	 * Check if all events are selected
	 */
	const isAllSelected = (events: CalendarEvent[]): boolean => {
		if (events.length === 0) return false;
		return events.every((event) => selectedIds.value.has(event.id));
	};

	/**
	 * Check if some (but not all) events are selected
	 */
	const isSomeSelected = (events: CalendarEvent[]): boolean => {
		if (events.length === 0) return false;
		const selectedInList = events.filter((event) => selectedIds.value.has(event.id));
		return selectedInList.length > 0 && selectedInList.length < events.length;
	};

	return {
		// State
		isSelectionMode,
		selectedIds,

		// Computed
		selectedCount,
		hasSelection,

		// Methods
		toggleSelectionMode,
		enableSelectionMode,
		disableSelectionMode,
		toggleSelection,
		isSelected,
		selectEvent,
		deselectEvent,
		selectAll,
		clearSelection,
		getSelectedIds,
		getSelectedEvents,
		isAllSelected,
		isSomeSelected,
	};
}
