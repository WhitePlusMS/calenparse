<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { Search } from "@element-plus/icons-vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import multiMonthPlugin from "@fullcalendar/multimonth";
import type { CalendarOptions, EventClickArg } from "@fullcalendar/core";
import type { CalendarEvent, Tag } from "@/types";
import { useEvents } from "@/composables/useEvents";
import { useSupabase } from "@/composables/useSupabase";
import { useSearch } from "@/composables/useSearch";
import ErrorState from "./ErrorState.vue";
import dayjs from "dayjs";

/**
 * CalendarView Component
 * Displays calendar events in multiple views using FullCalendar
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */

// View type definition
type ViewType = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "multiMonthYear";

// Props - Accept filtered events from parent
const props = defineProps<{
	filteredEvents?: CalendarEvent[];
}>();

// Emits
const emit = defineEmits<{
	eventClick: [event: CalendarEvent];
	quickCreate: [data: { startTime: Date; endTime: Date; isAllDay: boolean }];
	filtered: [events: CalendarEvent[]];
}>();

// Composables
const { events: allEvents, fetchEvents, loading, error, clearError } = useEvents();
const { getAllTags } = useSupabase();
const { getUniqueLocations } = useSearch();

// State
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null);
const currentView = ref<ViewType>("dayGridMonth");
const currentDate = ref<Date>(new Date());
const isCalendarMounted = ref(false);

// Integrated filter panel state
const showFilterPanel = ref(false);
const searchKeyword = ref("");
const dateRange = ref<[Date, Date] | null>(null);
const selectedLocations = ref<string[]>([]);
const selectedTagIds = ref<string[]>([]);

// Tag data
const availableTags = ref<Tag[]>([]);

// Get tag by ID
const getTagById = (id: string): Tag | undefined => {
	return availableTags.value.find((tag) => tag.id === id);
};

// Load tags
const loadTags = async () => {
	try {
		availableTags.value = await getAllTags();
	} catch (error) {
		console.error("Failed to load tags:", error);
	}
};

// Computed - Available locations from all events
const availableLocations = computed(() => {
	return getUniqueLocations(allEvents.value);
});

// Apply all filters to get filtered events
const filteredEvents = computed(() => {
	let result = allEvents.value;

	// Apply keyword search
	if (searchKeyword.value) {
		const keyword = searchKeyword.value.toLowerCase();
		result = result.filter(
			(event) =>
				event.title.toLowerCase().includes(keyword) ||
				event.description?.toLowerCase().includes(keyword) ||
				event.location?.toLowerCase().includes(keyword)
		);
	}

	// Apply date range filter
	if (dateRange.value) {
		const [start, end] = dateRange.value;
		result = result.filter((event) => {
			const eventStart = new Date(event.startTime);
			return eventStart >= start && eventStart <= end;
		});
	}

	// Apply location filter
	if (selectedLocations.value.length > 0) {
		result = result.filter((event) => event.location && selectedLocations.value.includes(event.location));
	}

	// Apply tag filter
	if (selectedTagIds.value.length > 0) {
		result = result.filter(
			(event) => event.tagIds && event.tagIds.some((tagId) => selectedTagIds.value.includes(tagId))
		);
	}

	return result;
});

// Use filtered events if provided from props, otherwise use local filtered events
const events = computed(() => props.filteredEvents ?? filteredEvents.value);

// Filter statistics
const totalEventsCount = computed(() => allEvents.value.length);
const filteredEventsCount = computed(() => filteredEvents.value.length);
const hasActiveFilters = computed(() => {
	return (
		searchKeyword.value !== "" ||
		dateRange.value !== null ||
		selectedLocations.value.length > 0 ||
		selectedTagIds.value.length > 0
	);
});
const activeFilterCount = computed(() => {
	let count = 0;
	if (searchKeyword.value) count++;
	if (dateRange.value) count++;
	if (selectedLocations.value.length > 0) count += selectedLocations.value.length;
	if (selectedTagIds.value.length > 0) count += selectedTagIds.value.length;
	return count;
});

// Filter handlers
const handleSearchChange = () => {
	emit("filtered", filteredEvents.value);
};

const handleDateRangeChange = () => {
	emit("filtered", filteredEvents.value);
};

const handleLocationChange = () => {
	emit("filtered", filteredEvents.value);
};

const toggleTagFilter = (tagId: string) => {
	const index = selectedTagIds.value.indexOf(tagId);
	if (index > -1) {
		selectedTagIds.value.splice(index, 1);
	} else {
		selectedTagIds.value.push(tagId);
	}
	emit("filtered", filteredEvents.value);
};

const removeLocation = (location: string) => {
	selectedLocations.value = selectedLocations.value.filter((l) => l !== location);
	emit("filtered", filteredEvents.value);
};

const removeTag = (tagId: string) => {
	selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId);
	emit("filtered", filteredEvents.value);
};

const clearAllFilters = () => {
	searchKeyword.value = "";
	dateRange.value = null;
	selectedLocations.value = [];
	selectedTagIds.value = [];
	emit("filtered", filteredEvents.value);
};

const applyDatePreset = (preset: "today" | "thisWeek" | "thisMonth") => {
	const today = dayjs();
	switch (preset) {
		case "today":
			dateRange.value = [today.startOf("day").toDate(), today.endOf("day").toDate()];
			break;
		case "thisWeek":
			dateRange.value = [today.startOf("week").toDate(), today.endOf("week").toDate()];
			break;
		case "thisMonth":
			dateRange.value = [today.startOf("month").toDate(), today.endOf("month").toDate()];
			break;
	}
	handleDateRangeChange();
};

const formatDateRange = (range: [Date, Date]) => {
	return `${dayjs(range[0]).format("YYYY-MM-DD")} ~ ${dayjs(range[1]).format("YYYY-MM-DD")}`;
};

// Watch for filtered events changes
watch(
	filteredEvents,
	(newFiltered) => {
		emit("filtered", newFiltered);
	},
	{ immediate: true }
);

// Load events and tags on mount
onMounted(async () => {
	await Promise.all([fetchEvents(), loadTags()]);
	// Load saved view preference
	loadViewPreference();
	// Mark calendar as mounted
	isCalendarMounted.value = true;
	// Setup double-click listener after calendar is mounted
	setupDoubleClickListener();
});

// Re-setup listener when events change (calendar re-renders)
watch(
	events,
	() => {
		// Re-attach listener after calendar updates
		setupDoubleClickListener();
	},
	{ flush: "post" }
);

// Track if listener is already attached
let isListenerAttached = false;

/**
 * Setup native double-click listener on calendar
 * This is more reliable than FullCalendar's dateClick for double-click detection
 */
function setupDoubleClickListener() {
	// Wait for calendar to be fully rendered
	setTimeout(() => {
		const calendarEl = calendarRef.value?.$el as HTMLElement;
		if (!calendarEl) return;

		// Remove old listener if exists to avoid duplicates
		if (isListenerAttached) {
			calendarEl.removeEventListener("dblclick", handleNativeDoubleClick);
		}

		// Add double-click listener to calendar
		calendarEl.addEventListener("dblclick", handleNativeDoubleClick);
		isListenerAttached = true;
	}, 500);
}

/**
 * Save view preference to localStorage
 * Requirement 3.9: Maintain current selected date when switching views
 */
function saveViewPreference() {
	try {
		localStorage.setItem("calendar-view", currentView.value);
		localStorage.setItem("calendar-date", currentDate.value.toISOString());
	} catch (e) {
		console.warn("Failed to save view preference:", e);
	}
}

/**
 * Load view preference from localStorage
 * Requirement 3.9: Maintain current selected date when switching views
 */
function loadViewPreference() {
	try {
		const savedView = localStorage.getItem("calendar-view") as ViewType | null;
		const savedDate = localStorage.getItem("calendar-date");

		if (
			savedView &&
			["dayGridMonth", "timeGridWeek", "timeGridDay", "multiMonthYear"].includes(savedView)
		) {
			currentView.value = savedView;
		}

		if (savedDate) {
			currentDate.value = new Date(savedDate);
		}
	} catch (e) {
		console.warn("Failed to load view preference:", e);
	}
}

/**
 * Switch calendar view
 * Requirement 3.9: Maintain current selected date when switching views
 * Requirement 3.10: Allow quick switch to day view from any view
 */
function switchView(view: ViewType) {
	if (!isCalendarMounted.value) return;
	const calendarApi = calendarRef.value?.getApi();
	if (calendarApi) {
		currentView.value = view;
		calendarApi.changeView(view);
		// Maintain the current date when switching views
		calendarApi.gotoDate(currentDate.value);
		saveViewPreference();
	}
}

/**
 * Watch for date changes in the calendar
 * Requirement 3.9: Save current date for view switching
 */
watch(
	() => {
		if (!isCalendarMounted.value) return null;
		try {
			return calendarRef.value?.getApi()?.getDate();
		} catch {
			return null;
		}
	},
	(newDate) => {
		if (newDate) {
			currentDate.value = newDate;
			saveViewPreference();
		}
	}
);

/**
 * Transform CalendarEvent to FullCalendar event format
 * Requirement 3.2: Display title, time, and location on event cards
 * Requirement 3.4: Display multiple events on same day in time order
 * Requirement 18.4: Display event tags and colors in calendar view
 * Requirement 18.5: Filter events by clicking tags
 */
const calendarEvents = computed(() => {
	// Filter events by selected tags
	let filteredEvents = events.value;
	if (selectedTagIds.value.length > 0) {
		filteredEvents = events.value.filter((event) => {
			if (!event.tagIds || event.tagIds.length === 0) return false;
			return event.tagIds.some((tagId) => selectedTagIds.value.includes(tagId));
		});
	}

	return filteredEvents.map((event) => ({
		id: event.id,
		title: event.title,
		start: event.startTime,
		end: event.endTime,
		allDay: event.isAllDay,
		extendedProps: {
			location: event.location,
			description: event.description,
			originalText: event.originalText,
			tagIds: event.tagIds,
			isCompleted: event.isCompleted,
			createdAt: event.createdAt,
			updatedAt: event.updatedAt,
		},
		// Display location in the event if available
		display: "block",
		// Add CSS class for completed events
		// Requirement 23.3: Use different visual style for completed events
		classNames: event.isCompleted ? ["event-completed"] : [],
	}));
});

/**
 * FullCalendar configuration
 * Requirement 3.5: Day view with hourly time slots
 * Requirement 3.6: Week view showing 7 days
 * Requirement 3.7: Month view
 * Requirement 3.8: Year view showing schedule density
 */
const calendarOptions = computed<CalendarOptions>(() => {
	// Only return full options after calendar is mounted to avoid watcher issues
	if (!isCalendarMounted.value) {
		return {
			plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin],
			initialView: currentView.value,
			initialDate: currentDate.value,
			headerToolbar: {
				left: "prev,next today",
				center: "title",
				right: "",
			},
			events: [],
			height: "auto",
			locale: "zh-cn",
		};
	}

	return {
		plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin],
		initialView: currentView.value,
		initialDate: currentDate.value,
		headerToolbar: {
			left: "prev,next today",
			center: "title",
			right: "",
		},
		events: calendarEvents.value,
		eventClick: handleEventClick,
		height: "auto",
		locale: "zh-cn",
		buttonText: {
			today: "今天",
		},
		// Requirement 3.4: Display events in time order
		eventOrder: "start,-duration,allDay,title",
		// Event display customization
		eventContent: renderEventContent,
		// Time grid settings for day and week views
		slotMinTime: "06:00:00",
		slotMaxTime: "24:00:00",
		slotDuration: "01:00:00",
		allDaySlot: true,
		nowIndicator: true,
		// Multi-month year view settings
		multiMonthMaxColumns: 3,
		// Track date changes
		datesSet: handleDatesSet,
		// Requirement 3.1, 3.2: Double-click to create events (handled by native dblclick listener)
		selectable: false,
	};
});

/**
 * Handle event click
 * Requirement 3.3: Show complete event details when user clicks event
 */
function handleEventClick(clickInfo: EventClickArg) {
	const eventId = clickInfo.event.id;
	const event = events.value.find((e) => e.id === eventId);
	if (event) {
		emit("eventClick", event);
	}
}

/**
 * Custom event rendering
 * Requirement 3.2: Display title, time, and location on event cards
 * Requirement 18.4: Display event tags and colors in calendar view
 */
function renderEventContent(eventInfo: any) {
	const { event } = eventInfo;
	const location = event.extendedProps.location;
	const tagIds = event.extendedProps.tagIds || [];

	// Create custom HTML for event display
	let timeText = "全天";

	if (!event.allDay) {
		const startDate = event.start;
		const endDate = event.end || event.start;

		// Check if event spans multiple days
		const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
		const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
		const isSameDay = startDay.getTime() === endDay.getTime();

		if (isSameDay) {
			// Same day: show only start time
			timeText = startDate.toLocaleTimeString("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
			});
		} else {
			// Different days: show start date + time
			timeText = `${startDate.toLocaleDateString("zh-CN", {
				month: "2-digit",
				day: "2-digit",
			})} ${startDate.toLocaleTimeString("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
			})}`;
		}
	}

	// Generate tags HTML
	const tagsHtml =
		tagIds.length > 0
			? `<div class="fc-event-tags">
				${tagIds
					.map((tagId: string) => {
						const tag = getTagById(tagId);
						if (!tag) return "";
						return `<span class="fc-event-tag" style="background-color: ${tag.color};">${tag.name}</span>`;
					})
					.join("")}
			</div>`
			: "";

	return {
		html: `
			<div class="fc-event-main-frame">
				<div class="fc-event-time">${timeText}</div>
				<div class="fc-event-title-container">
					<div class="fc-event-title">${event.title}</div>
					${location ? `<div class="fc-event-location">📍 ${location}</div>` : ""}
					${tagsHtml}
				</div>
			</div>
		`,
	};
}

/**
 * Handle native double-click event
 * Handles double-click on calendar dates and time slots
 */
function handleNativeDoubleClick(event: MouseEvent) {
	const target = event.target as HTMLElement;

	// Check if clicked on a date cell or time slot
	const dateCell = target.closest(".fc-daygrid-day, .fc-timegrid-slot");
	if (!dateCell) return;

	// Get the calendar API
	const calendarApi = calendarRef.value?.getApi();
	if (!calendarApi) return;

	// Determine the date based on the clicked element
	let clickedDate: Date | null = null;

	// For day grid (month view)
	if (dateCell.classList.contains("fc-daygrid-day")) {
		const dateStr = dateCell.getAttribute("data-date");
		if (dateStr) {
			clickedDate = new Date(dateStr);
			// Set to noon to avoid timezone issues
			clickedDate.setHours(12, 0, 0, 0);

			if (import.meta.env.DEV) {
				console.log("Day grid cell clicked, date:", clickedDate);
			}

			handleDateCellDblClick(clickedDate);
		}
	}
	// For time grid (day/week view)
	else if (dateCell.classList.contains("fc-timegrid-slot")) {
		const timeStr = dateCell.getAttribute("data-time");
		if (timeStr) {
			// Get current date from calendar view
			const currentViewDate = calendarApi.getDate();
			const timeParts = timeStr.split(":").map(Number);
			const hours = timeParts[0] || 0;
			const minutes = timeParts[1] || 0;

			clickedDate = new Date(currentViewDate);
			clickedDate.setHours(hours, minutes, 0, 0);
			handleTimeSlotDblClick(clickedDate);
		}
	}
}

/**
 * Handle date cell double-click (month view)
 * Requirement 3.1: Open event dialog with pre-filled date for all-day event
 */
function handleDateCellDblClick(date: Date) {
	const startTime = new Date(date);
	startTime.setHours(0, 0, 0, 0);

	const endTime = new Date(date);
	endTime.setHours(23, 59, 59, 999);

	emit("quickCreate", {
		startTime,
		endTime,
		isAllDay: true,
	});
}

/**
 * Handle time slot double-click (day/week view)
 * Requirement 3.2: Open event dialog with pre-filled date and time
 */
function handleTimeSlotDblClick(dateTime: Date) {
	const startTime = new Date(dateTime);

	// Default duration: 1 hour
	const endTime = new Date(dateTime.getTime() + 60 * 60 * 1000);

	emit("quickCreate", {
		startTime,
		endTime,
		isAllDay: false,
	});
}

/**
 * Handle dates set (when calendar view changes)
 * Track current date for view switching
 */
function handleDatesSet(dateInfo: any) {
	if (dateInfo.view.currentStart) {
		currentDate.value = dateInfo.view.currentStart;
		saveViewPreference();
	}
}

/**
 * Navigate to today
 */
function goToToday() {
	if (!isCalendarMounted.value) return;
	const calendarApi = calendarRef.value?.getApi();
	if (calendarApi) {
		calendarApi.today();
		currentDate.value = new Date();
		saveViewPreference();
	}
}

/**
 * Navigate to previous period
 */
function goPrev() {
	if (!isCalendarMounted.value) return;
	const calendarApi = calendarRef.value?.getApi();
	if (calendarApi) {
		calendarApi.prev();
	}
}

/**
 * Navigate to next period
 */
function goNext() {
	if (!isCalendarMounted.value) return;
	const calendarApi = calendarRef.value?.getApi();
	if (calendarApi) {
		calendarApi.next();
	}
}

/**
 * Handle retry after error
 * Requirement 13.3: Error state with retry button
 */
const handleRetry = async () => {
	clearError();
	await fetchEvents();
	await loadTags();
};

// Expose methods for parent component
defineExpose({
	goToToday,
	goPrev,
	goNext,
	switchView,
	currentView,
});
</script>

<template>
	<div class="calendar-view">
		<!-- View Switcher -->
		<!-- Requirement 3.5, 3.6, 3.7, 3.8: Multiple view support -->
		<div class="view-switcher">
			<button
				:class="['view-button', { active: currentView === 'timeGridDay' }]"
				@click="switchView('timeGridDay')"
				title="日视图 - 显示单日详细日程">
				<span class="view-icon">📅</span>
				<span class="view-label">日</span>
			</button>
			<button
				:class="['view-button', { active: currentView === 'timeGridWeek' }]"
				@click="switchView('timeGridWeek')"
				title="周视图 - 显示一周七天概览">
				<span class="view-icon">📆</span>
				<span class="view-label">周</span>
			</button>
			<button
				:class="['view-button', { active: currentView === 'dayGridMonth' }]"
				@click="switchView('dayGridMonth')"
				title="月视图 - 显示整月日程分布">
				<span class="view-icon">🗓️</span>
				<span class="view-label">月</span>
			</button>
			<button
				:class="['view-button', { active: currentView === 'multiMonthYear' }]"
				@click="switchView('multiMonthYear')"
				title="年视图 - 显示全年日程密度">
				<span class="view-icon">📊</span>
				<span class="view-label">年</span>
			</button>
		</div>

		<!-- Error State -->
		<!-- Requirement 13.3: Error state with retry button -->
		<ErrorState v-if="error && !loading" title="加载日历失败" :message="error" @retry="handleRetry" />

		<!-- Skeleton Loading State -->
		<!-- Requirement 13.1: Skeleton screen loading animation -->
		<div v-else-if="loading" class="skeleton-loader">
			<div class="skeleton-header">
				<div class="skeleton-bar skeleton-bar--title"></div>
				<div class="skeleton-buttons">
					<div class="skeleton-bar skeleton-bar--button"></div>
					<div class="skeleton-bar skeleton-bar--button"></div>
					<div class="skeleton-bar skeleton-bar--button"></div>
				</div>
			</div>
			<div class="skeleton-calendar">
				<div class="skeleton-week-header">
					<div v-for="i in 7" :key="i" class="skeleton-day-name"></div>
				</div>
				<div class="skeleton-days">
					<div v-for="i in 35" :key="i" class="skeleton-day">
						<div class="skeleton-day-number"></div>
						<div v-if="i % 3 === 0" class="skeleton-event"></div>
						<div v-if="i % 5 === 0" class="skeleton-event"></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Calendar Content -->
		<template v-else>
			<!-- Requirement 3.1: Display newly created events in calendar view -->
			<!-- Requirement 3.5: Day view with hourly time slots -->
			<!-- Requirement 3.6: Week view showing 7 days -->
			<!-- Requirement 3.7: Month view display -->
			<!-- Requirement 3.8: Year view showing schedule density -->
			<FullCalendar ref="calendarRef" :options="calendarOptions" />

			<!-- Integrated Search and Filter Panel - Below Calendar -->
			<div class="search-filter-panel">
				<!-- Search and Filter Toggle Button -->
				<button class="filter-toggle-btn" @click="showFilterPanel = !showFilterPanel">
					<span class="filter-icon">🔍</span>
					<span class="filter-label">搜索与筛选</span>
					<span v-if="activeFilterCount > 0" class="filter-count">{{
						activeFilterCount
					}}</span>
					<span class="filter-arrow" :class="{ expanded: showFilterPanel }">▼</span>
				</button>

				<!-- Expandable Filter Panel -->
				<div v-show="showFilterPanel" class="filter-panel-content">
					<!-- Search Input -->
					<div class="filter-section">
						<div class="section-header">
							<span class="section-icon">🔍</span>
							<span class="section-title">关键词搜索</span>
						</div>
						<el-input
							v-model="searchKeyword"
							placeholder="搜索标题、描述或地点..."
							clearable
							@input="handleSearchChange"
							class="search-input">
							<template #prefix>
								<el-icon><Search /></el-icon>
							</template>
						</el-input>
					</div>

					<!-- Date Range Filter -->
					<div class="filter-section">
						<div class="section-header">
							<span class="section-icon">📅</span>
							<span class="section-title">日期范围</span>
						</div>
						<div class="date-filter-content">
							<el-date-picker
								v-model="dateRange"
								type="daterange"
								range-separator="至"
								start-placeholder="开始日期"
								end-placeholder="结束日期"
								clearable
								@change="handleDateRangeChange"
								class="date-range-picker" />
							<div class="date-presets">
								<el-button
									size="small"
									text
									@click="applyDatePreset('today')"
									>今天</el-button
								>
								<el-button
									size="small"
									text
									@click="applyDatePreset('thisWeek')"
									>本周</el-button
								>
								<el-button
									size="small"
									text
									@click="applyDatePreset('thisMonth')"
									>本月</el-button
								>
							</div>
						</div>
					</div>

					<!-- Location Filter -->
					<div class="filter-section" v-if="availableLocations.length > 0">
						<div class="section-header">
							<span class="section-icon">📍</span>
							<span class="section-title">地点筛选</span>
							<span v-if="selectedLocations.length > 0" class="selected-count"
								>({{ selectedLocations.length }})</span
							>
						</div>
						<el-select
							v-model="selectedLocations"
							multiple
							collapse-tags
							collapse-tags-tooltip
							placeholder="选择地点"
							clearable
							filterable
							@change="handleLocationChange"
							class="location-select">
							<el-option
								v-for="location in availableLocations"
								:key="location"
								:label="location"
								:value="location" />
						</el-select>
					</div>

					<!-- Tag Filter -->
					<div class="filter-section" v-if="availableTags.length > 0">
						<div class="section-header">
							<span class="section-icon">🏷️</span>
							<span class="section-title">标签筛选</span>
							<span v-if="selectedTagIds.length > 0" class="selected-count"
								>({{ selectedTagIds.length }})</span
							>
						</div>
						<div class="tag-filter-list">
							<button
								v-for="tag in availableTags"
								:key="tag.id"
								:class="[
									'tag-filter-item',
									{ active: selectedTagIds.includes(tag.id) },
								]"
								:style="{
									backgroundColor: selectedTagIds.includes(tag.id)
										? tag.color
										: 'white',
									color: selectedTagIds.includes(tag.id)
										? 'white'
										: '#606266',
									borderColor: tag.color,
								}"
								@click="toggleTagFilter(tag.id)">
								<span
									class="tag-color-dot"
									:style="{ backgroundColor: tag.color }"></span>
								<span class="tag-name">{{ tag.name }}</span>
								<span
									v-if="selectedTagIds.includes(tag.id)"
									class="tag-check"
									>✓</span
								>
							</button>
						</div>
					</div>

					<!-- Active Filters Summary -->
					<div v-if="hasActiveFilters" class="active-filters-section">
						<div class="section-header">
							<span class="section-icon">✨</span>
							<span class="section-title">当前筛选</span>
							<el-button
								size="small"
								text
								type="danger"
								@click="clearAllFilters"
								>清除全部</el-button
							>
						</div>
						<div class="active-filters-list">
							<el-tag
								v-if="searchKeyword"
								closable
								@close="
									searchKeyword = '';
									handleSearchChange();
								"
								size="small">
								关键词: {{ searchKeyword }}
							</el-tag>
							<el-tag
								v-if="dateRange"
								closable
								@close="
									dateRange = null;
									handleDateRangeChange();
								"
								size="small">
								日期: {{ formatDateRange(dateRange) }}
							</el-tag>
							<el-tag
								v-for="location in selectedLocations"
								:key="location"
								closable
								@close="removeLocation(location)"
								size="small">
								📍 {{ location }}
							</el-tag>
							<el-tag
								v-for="tagId in selectedTagIds"
								:key="tagId"
								:color="getTagById(tagId)?.color"
								closable
								@close="removeTag(tagId)"
								size="small"
								style="color: white; border: none">
								{{ getTagById(tagId)?.name }}
							</el-tag>
						</div>
					</div>

					<!-- Results Count -->
					<div class="results-summary">
						<span v-if="hasActiveFilters" class="results-text">
							显示 <strong>{{ filteredEventsCount }}</strong> /
							{{ totalEventsCount }} 个事件
						</span>
						<span v-else class="results-text">
							共 <strong>{{ totalEventsCount }}</strong> 个事件
						</span>
					</div>
				</div>
			</div>

			<!-- Empty State -->
			<!-- Requirement 13.2: Friendly empty state with illustration and guidance -->
			<div v-if="events.length === 0" class="empty-state">
				<div class="empty-icon">📅</div>
				<p class="empty-title">暂无日程事件</p>
				<p class="empty-hint">使用上方输入框解析通告文本来创建日程</p>
			</div>
		</template>
	</div>
</template>

<style scoped>
.calendar-view {
	position: relative;
	width: 100%;
	max-width: 1200px;
	margin: 0 auto;
	padding: 20px;
}

/* Integrated Search and Filter Panel */
.search-filter-panel {
	margin-top: var(--spacing-xl);
}

.filter-toggle-btn {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	padding: var(--spacing-md) var(--spacing-lg);
	background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-hover) 100%);
	border: 2px solid var(--border-color);
	border-radius: var(--radius-xl);
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	color: var(--text-primary);
	width: 100%;
	justify-content: space-between;
	box-shadow: 0 2px 8px var(--shadow);
}

.filter-toggle-btn:hover {
	border-color: var(--primary-color);
	background: linear-gradient(135deg, var(--bg-hover) 0%, var(--primary-light) 10%);
	transform: translateY(-2px);
	box-shadow: 0 4px 12px var(--shadow-md);
}

.filter-icon {
	font-size: 20px;
}

.filter-label {
	flex: 1;
	text-align: left;
	font-size: var(--font-size-base);
}

.filter-count {
	background: var(--primary-color);
	color: white;
	padding: 4px 10px;
	border-radius: var(--radius-full);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-bold);
	min-width: 24px;
	text-align: center;
}

.filter-arrow {
	font-size: 14px;
	transition: transform 0.3s ease;
	color: var(--text-secondary);
}

.filter-arrow.expanded {
	transform: rotate(180deg);
}

.filter-panel-content {
	margin-top: var(--spacing-md);
	padding: var(--spacing-xl);
	background: var(--bg-secondary);
	border: 2px solid var(--border-light);
	border-radius: var(--radius-xl);
	animation: slideDown 0.3s ease-out;
	box-shadow: 0 4px 16px var(--shadow);
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.filter-section {
	margin-bottom: var(--spacing-xl);
}

.filter-section:last-child {
	margin-bottom: 0;
}

.section-header {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	margin-bottom: var(--spacing-md);
	padding-bottom: var(--spacing-sm);
	border-bottom: 2px solid var(--border-light);
}

.section-icon {
	font-size: 18px;
}

.section-title {
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	color: var(--text-primary);
	flex: 1;
}

.selected-count {
	font-size: var(--font-size-sm);
	color: var(--primary-color);
	font-weight: var(--font-weight-bold);
}

.search-input {
	width: 100%;
}

.date-filter-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
}

.date-range-picker {
	width: 100%;
}

.date-presets {
	display: flex;
	gap: var(--spacing-sm);
	flex-wrap: wrap;
}

.location-select {
	width: 100%;
}

.tag-filter-list {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-md);
}

.tag-filter-item {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-md);
	border: 2px solid;
	border-radius: var(--radius-lg);
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	background-color: var(--bg-secondary);
}

.tag-filter-item:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	filter: brightness(1.05);
}

.tag-filter-item.active {
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	transform: translateY(-1px);
}

.tag-color-dot {
	width: 12px;
	height: 12px;
	border-radius: var(--radius-full);
	flex-shrink: 0;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	transition: all 0.2s ease;
}

.tag-filter-item.active .tag-color-dot {
	background-color: white !important;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.tag-name {
	flex: 1;
	line-height: var(--line-height-tight);
}

.tag-check {
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-bold);
	line-height: 1;
}

.active-filters-section {
	padding-top: var(--spacing-lg);
	border-top: 2px solid var(--border-light);
}

.active-filters-list {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-sm);
}

.results-summary {
	margin-top: var(--spacing-lg);
	padding-top: var(--spacing-lg);
	border-top: 2px solid var(--border-light);
	text-align: center;
}

.results-text {
	font-size: var(--font-size-base);
	color: var(--text-secondary);
}

.results-text strong {
	color: var(--primary-color);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-lg);
}

/* View Switcher Styles */
.view-switcher {
	display: flex;
	gap: 8px;
	margin-bottom: 16px;
	padding: 8px;
	background: var(--bg-hover);
	border-radius: 8px;
	justify-content: center;
	flex-wrap: wrap;
}

.view-button {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 16px;
	border: 2px solid transparent;
	background: var(--bg-secondary);
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
	box-shadow: 0 1px 3px var(--shadow);
}

.view-button:hover {
	background: var(--bg-hover);
	color: var(--primary-color);
	border-color: var(--primary-light);
	transform: translateY(-1px);
	box-shadow: 0 2px 6px var(--shadow);
}

.view-button.active {
	background: var(--primary-color);
	color: white;
	border-color: var(--primary-color);
	box-shadow: 0 2px 8px var(--shadow);
}

.view-button.active:hover {
	background: var(--primary-light);
	border-color: var(--primary-light);
}

.view-icon {
	font-size: 18px;
	line-height: 1;
}

.view-label {
	font-size: 14px;
	font-weight: 600;
}

/* Skeleton Loader Styles */
.skeleton-loader {
	animation: fadeIn 0.3s ease-out;
}

.skeleton-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing-lg);
	padding: var(--spacing-md);
	background: var(--bg-secondary);
	border-radius: var(--radius-lg);
}

.skeleton-buttons {
	display: flex;
	gap: var(--spacing-sm);
}

.skeleton-bar {
	background: linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-color) 50%, var(--bg-hover) 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: var(--radius-md);
}

.skeleton-bar--title {
	width: 200px;
	height: 32px;
}

.skeleton-bar--button {
	width: 80px;
	height: 36px;
}

.skeleton-calendar {
	background: var(--bg-secondary);
	border-radius: var(--radius-lg);
	padding: var(--spacing-md);
}

.skeleton-week-header {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: var(--spacing-sm);
	margin-bottom: var(--spacing-md);
}

.skeleton-day-name {
	height: 24px;
	background: linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-color) 50%, var(--bg-hover) 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: var(--radius-sm);
}

.skeleton-days {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: var(--spacing-sm);
}

.skeleton-day {
	min-height: 100px;
	padding: var(--spacing-sm);
	background: var(--bg-hover);
	border-radius: var(--radius-md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.skeleton-day-number {
	width: 24px;
	height: 24px;
	background: linear-gradient(90deg, var(--bg-color) 25%, var(--border-light) 50%, var(--bg-color) 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: var(--radius-full);
}

.skeleton-event {
	height: 40px;
	background: linear-gradient(90deg, var(--bg-color) 25%, var(--border-light) 50%, var(--bg-color) 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: var(--radius-md);
	margin-top: var(--spacing-xs);
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.empty-state {
	text-align: center;
	padding: 60px 20px;
	color: var(--text-tertiary);
	animation: fadeIn 0.5s ease-out;
}

.empty-icon {
	font-size: 64px;
	margin-bottom: 16px;
	opacity: 0.5;
}

.empty-title {
	font-size: 18px;
	font-weight: 500;
	color: var(--text-secondary);
	margin-bottom: 8px;
}

.empty-hint {
	font-size: 14px;
	margin-top: 10px;
	color: var(--text-tertiary);
}

/* FullCalendar custom styles */
:deep(.fc) {
	font-family: inherit;
	background: var(--bg-secondary);
	border-radius: var(--radius-xl);
	padding: var(--spacing-md);
}

/* FullCalendar dark mode support */
:deep(.fc .fc-scrollgrid) {
	border-color: var(--border-light);
}

:deep(.fc .fc-scrollgrid td),
:deep(.fc .fc-scrollgrid th) {
	border-color: var(--border-light);
}

:deep(.fc .fc-col-header-cell) {
	background: var(--bg-hover);
	color: var(--text-primary);
	font-weight: var(--font-weight-semibold);
}

:deep(.fc .fc-daygrid-day) {
	background: var(--bg-secondary);
}

:deep(.fc .fc-daygrid-day.fc-day-other) {
	background: var(--bg-color);
	opacity: 0.4;
}

:deep(.fc .fc-daygrid-day.fc-day-other .fc-daygrid-day-number) {
	color: var(--text-disabled);
}

:deep(.fc .fc-timegrid-slot) {
	border-color: var(--border-light);
}

:deep(.fc .fc-timegrid-axis) {
	background: var(--bg-hover);
}

:deep(.fc .fc-timegrid-slot-label) {
	color: var(--text-secondary);
}

:deep(.fc .fc-timegrid-divider) {
	border-color: var(--border-light);
}

/* Improve contrast for day numbers */
:deep(.fc .fc-daygrid-day-top) {
	justify-content: center;
}

:deep(.fc .fc-daygrid-day-number) {
	color: var(--text-primary);
	font-weight: var(--font-weight-medium);
}

/* Typography Hierarchy - Requirement 12.1 */
:deep(.fc-toolbar-title) {
	font-size: var(--font-size-3xl);
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	letter-spacing: -0.5px;
	line-height: var(--line-height-tight);
}

:deep(.fc-button) {
	background: var(--primary-color);
	border-color: var(--primary-color);
	text-transform: none;
	padding: var(--spacing-sm) var(--spacing-md);
	border-radius: var(--radius-md);
	font-weight: var(--font-weight-medium);
	transition: all 0.2s ease;
	box-shadow: 0 2px 4px var(--shadow);
}

:deep(.fc-button:hover) {
	background: var(--primary-light);
	border-color: var(--primary-light);
	transform: translateY(-1px);
	box-shadow: 0 4px 8px var(--shadow);
}

:deep(.fc-button:disabled) {
	background: var(--border-color);
	border-color: var(--border-color);
	opacity: 0.6;
	cursor: not-allowed;
}

:deep(.fc-event) {
	cursor: pointer;
	border-radius: var(--radius-lg);
	padding: var(--spacing-xs) var(--spacing-sm);
	margin-bottom: var(--spacing-xs);
	border: none;
	background: var(--bg-hover);
	border: 1px solid var(--border-light);
	box-shadow: 0 2px 4px var(--shadow);
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

:deep(.fc-event::before) {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 4px;
	background: var(--primary-color);
	border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

:deep(.fc-event:hover) {
	background: var(--bg-secondary);
	border-color: var(--primary-color);
	box-shadow: 0 4px 12px var(--shadow-md);
	transform: translateY(-2px);
}

/* Completed Event Styles */
/* Requirement 23.3: Use different visual style for completed events in calendar view */
/* Requirement 23.7: Use visual cues (strikethrough, semi-transparent, special color) for completed events */
:deep(.fc-event.event-completed) {
	opacity: 0.6;
	background-color: var(--bg-hover);
	border-color: var(--text-tertiary);
}

:deep(.fc-event.event-completed:hover) {
	opacity: 0.8;
	background-color: var(--bg-color);
}

:deep(.fc-event.event-completed .fc-event-title) {
	text-decoration: line-through;
	color: var(--text-tertiary);
}

:deep(.fc-event.event-completed .fc-event-time) {
	color: var(--text-tertiary);
}

:deep(.fc-event.event-completed .fc-event-location) {
	color: var(--text-disabled);
	text-decoration: line-through;
}

:deep(.fc-event-main-frame) {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	padding-left: var(--spacing-sm);
}

/* Event Content Typography - Requirement 12.1: Font size hierarchy */
:deep(.fc-event-time) {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-bold);
	color: var(--primary-color);
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	line-height: var(--line-height-tight);
}

:deep(.fc-event-time::before) {
	content: "🕐";
	font-size: 12px;
}

/* Primary content - larger, bolder - Requirement 12.1 */
:deep(.fc-event-title) {
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: var(--text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height-normal);
}

/* Secondary content - smaller, lighter - Requirement 12.1 */
:deep(.fc-event-location) {
	font-size: var(--font-size-xs);
	color: var(--text-secondary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	display: flex;
	align-items: center;
	gap: 2px;
	line-height: var(--line-height-normal);
}

:deep(.fc-event-tags) {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-xs);
	margin-top: var(--spacing-xs);
}

/* Requirement 14.1, 14.2: Rounded rectangles with matching text colors */
:deep(.fc-event-tag) {
	display: inline-flex;
	align-items: center;
	padding: 2px var(--spacing-sm);
	border-radius: var(--radius-md);
	font-size: 10px;
	font-weight: var(--font-weight-semibold);
	color: white;
	white-space: nowrap;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	transition: all 0.2s ease;
	border: none;
}

/* Requirement 14.4: Hover effect for tags */
:deep(.fc-event-tag:hover) {
	transform: translateY(-1px);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
	filter: brightness(1.1);
}

/* Day numbers - Requirement 12.1: Clear typography */
:deep(.fc-daygrid-day-number) {
	padding: var(--spacing-sm);
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	color: var(--text-secondary);
	line-height: var(--line-height-tight);
}

/* Enhanced today's date styling - Requirement 12.2: Color contrast for important info */
:deep(.fc-day-today) {
	background: rgba(102, 126, 234, 0.08) !important;
	position: relative;
}

/* Today's date - high visual weight - Requirement 12.4 */
:deep(.fc-day-today .fc-daygrid-day-number) {
	background: var(--primary-color);
	color: white;
	border-radius: var(--radius-full);
	min-width: 32px;
	min-height: 32px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-base);
	box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
	margin: 4px;
}

:deep(.fc-day-today::after) {
	content: "";
	position: absolute;
	inset: 0;
	border: 2px solid var(--primary-color);
	border-radius: var(--radius-md);
	pointer-events: none;
}

/* Day frame - Requirement 12.3: Whitespace for separation */
:deep(.fc-daygrid-day-frame) {
	min-height: 100px;
	padding: var(--spacing-sm);
	transition: background-color 0.2s ease;
}

:deep(.fc-daygrid-day-frame:hover) {
	background-color: var(--bg-hover);
}

/* Time Grid View Styles */
:deep(.fc-timegrid-slot) {
	height: 3em;
}

:deep(.fc-timegrid-slot-label) {
	font-size: 12px;
	color: var(--text-secondary);
}

:deep(.fc-timegrid-event) {
	border-radius: 4px;
	border-left: 3px solid #409eff;
}

:deep(.fc-timegrid-event:hover) {
	box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

:deep(.fc-timegrid-now-indicator-line) {
	border-color: var(--error-color);
	border-width: 2px;
}

:deep(.fc-timegrid-now-indicator-arrow) {
	border-color: var(--error-color);
}

/* Multi-month Year View Styles */
:deep(.fc-multimonth) {
	border: 1px solid var(--border-light);
	border-radius: 4px;
}

:deep(.fc-multimonth-title) {
	background: var(--bg-hover);
	font-weight: 600;
	padding: 8px;
	border-bottom: 1px solid var(--border-light);
}

:deep(.fc-multimonth-daygrid) {
	font-size: 12px;
}

:deep(.fc-multimonth .fc-daygrid-day-number) {
	font-size: 11px;
	padding: 4px;
}

:deep(.fc-multimonth .fc-daygrid-day-events) {
	margin-top: 2px;
}

:deep(.fc-multimonth .fc-daygrid-event-dot) {
	border-color: var(--primary-color);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
	.calendar-view {
		padding: 12px;
	}

	.view-switcher {
		gap: 6px;
		padding: 6px;
		margin-bottom: 12px;
	}

	.view-button {
		padding: 6px 12px;
		font-size: 13px;
	}

	.view-icon {
		font-size: 16px;
	}

	.view-label {
		font-size: 13px;
	}

	:deep(.fc-toolbar-title) {
		font-size: 1.2em;
	}

	:deep(.fc-button) {
		padding: 4px 8px;
		font-size: 13px;
	}

	:deep(.fc-daygrid-day-frame) {
		min-height: 80px;
	}

	:deep(.fc-event-title) {
		font-size: 12px;
	}

	:deep(.fc-event-location) {
		font-size: 10px;
	}

	.empty-icon {
		font-size: 48px;
	}

	.empty-title {
		font-size: 16px;
	}

	.empty-hint {
		font-size: 13px;
	}
}

@media (max-width: 480px) {
	.calendar-view {
		padding: 8px;
	}

	.view-switcher {
		gap: 4px;
		padding: 4px;
		margin-bottom: 8px;
	}

	.view-button {
		padding: 6px 10px;
		font-size: 12px;
		gap: 4px;
	}

	.view-icon {
		font-size: 14px;
	}

	.view-label {
		font-size: 12px;
	}

	:deep(.fc-toolbar) {
		flex-direction: column;
		gap: 8px;
	}

	:deep(.fc-toolbar-title) {
		font-size: 1.1em;
	}

	:deep(.fc-button) {
		padding: 3px 6px;
		font-size: 12px;
	}

	:deep(.fc-daygrid-day-frame) {
		min-height: 60px;
	}

	:deep(.fc-daygrid-day-number) {
		padding: 4px;
		font-size: 12px;
	}

	:deep(.fc-event) {
		padding: 1px 2px;
		font-size: 11px;
	}

	:deep(.fc-event-time) {
		font-size: 10px;
	}

	:deep(.fc-event-title) {
		font-size: 11px;
	}

	:deep(.fc-event-location) {
		display: none; /* Hide location on very small screens */
	}

	.skeleton-header {
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.skeleton-bar--title {
		width: 150px;
		height: 28px;
	}

	.skeleton-bar--button {
		width: 60px;
		height: 32px;
	}

	.skeleton-day {
		min-height: 60px;
	}

	.skeleton-event {
		height: 30px;
	}
}
</style>
