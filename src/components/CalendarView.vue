<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import multiMonthPlugin from "@fullcalendar/multimonth";
import type { CalendarOptions, EventClickArg } from "@fullcalendar/core";
import type { CalendarEvent, Tag } from "@/types";
import { useEvents } from "@/composables/useEvents";
import { useSupabase } from "@/composables/useSupabase";
import ErrorState from "./ErrorState.vue";

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
}>();

// Composables
const { events: allEvents, fetchEvents, loading, error, clearError } = useEvents();
const { getAllTags } = useSupabase();

// Use filtered events if provided, otherwise use all events
const events = computed(() => props.filteredEvents ?? allEvents.value);

// State
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null);
const currentView = ref<ViewType>("dayGridMonth");
const currentDate = ref<Date>(new Date());

// Tag filtering state
const availableTags = ref<Tag[]>([]);
const selectedTagIds = ref<string[]>([]);
const showTagFilter = ref(false);

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

// Toggle tag filter
const toggleTagFilter = (tagId: string) => {
	const index = selectedTagIds.value.indexOf(tagId);
	if (index > -1) {
		selectedTagIds.value.splice(index, 1);
	} else {
		selectedTagIds.value.push(tagId);
	}
};

// Clear all tag filters
const clearTagFilters = () => {
	selectedTagIds.value = [];
};

// Load events and tags on mount
onMounted(async () => {
	await Promise.all([fetchEvents(), loadTags()]);
	// Load saved view preference
	loadViewPreference();
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
const calendarOptions = computed<CalendarOptions>(() => ({
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
}));

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
	const timeText = event.allDay
		? "全天"
		: `${event.start.toLocaleTimeString("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
		  })}`;

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
	const calendarApi = calendarRef.value?.getApi();
	if (calendarApi) {
		calendarApi.prev();
	}
}

/**
 * Navigate to next period
 */
function goNext() {
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

			<!-- Tag Filter - Below Calendar -->
			<!-- Requirement 18.5: Filter events by clicking tags -->
			<div v-if="availableTags.length > 0" class="tag-filter-container">
				<button class="tag-filter-toggle" @click="showTagFilter = !showTagFilter">
					<span class="filter-icon">🏷️</span>
					<span class="filter-label">标签筛选</span>
					<span v-if="selectedTagIds.length > 0" class="filter-count">{{
						selectedTagIds.length
					}}</span>
					<span class="filter-arrow" :class="{ expanded: showTagFilter }">▼</span>
				</button>

				<div v-show="showTagFilter" class="tag-filter-panel">
					<div class="tag-filter-header">
						<span class="tag-filter-title">选择标签筛选</span>
						<button
							v-if="selectedTagIds.length > 0"
							class="clear-filters-btn"
							@click="clearTagFilters">
							清除筛选
						</button>
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
								'--tag-color': tag.color,
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
							<span v-if="selectedTagIds.includes(tag.id)" class="tag-check"
								>✓</span
							>
						</button>
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

/* Tag Filter Styles */
.tag-filter-container {
	margin-top: 20px;
}

.tag-filter-toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	background: var(--bg-secondary);
	border: 2px solid var(--border-color);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
	width: 100%;
	justify-content: space-between;
}

.tag-filter-toggle:hover {
	border-color: var(--primary-color);
	background: var(--bg-hover);
}

.filter-icon {
	font-size: 18px;
}

.filter-label {
	flex: 1;
	text-align: left;
}

.filter-count {
	background: var(--primary-color);
	color: white;
	padding: 2px 8px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 600;
}

.filter-arrow {
	font-size: 12px;
	transition: transform 0.3s ease;
}

.filter-arrow.expanded {
	transform: rotate(180deg);
}

.tag-filter-panel {
	margin-top: 8px;
	padding: 12px;
	background: var(--bg-secondary);
	border: 2px solid var(--border-color);
	border-radius: 8px;
	animation: slideDown 0.3s ease-out;
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

.tag-filter-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid #ebeef5;
}

.tag-filter-title {
	font-size: 13px;
	font-weight: 600;
	color: #303133;
}

.clear-filters-btn {
	padding: 4px 12px;
	background: #f5f7fa;
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
	color: #606266;
	transition: all 0.2s ease;
}

.clear-filters-btn:hover {
	background: #e4e7ed;
	color: #303133;
}

.tag-filter-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

/* Requirement 14.1: Rounded rectangles with soft background */
/* Requirement 14.2: Text color matches background */
/* Requirement 14.3: Appropriate spacing */
/* Requirement 14.4: Hover effect */
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
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-bold);
	line-height: 1;
}

/* View Switcher Styles */
.view-switcher {
	display: flex;
	gap: 8px;
	margin-bottom: 16px;
	padding: 8px;
	background: #f5f7fa;
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
	color: #909399;
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
	color: #606266;
	margin-bottom: 8px;
}

.empty-hint {
	font-size: 14px;
	margin-top: 10px;
	color: #909399;
}

/* FullCalendar custom styles */
:deep(.fc) {
	font-family: inherit;
	background: var(--bg-secondary);
	border-radius: var(--radius-xl);
	padding: var(--spacing-md);
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
	background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
	box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
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
	background: linear-gradient(135deg, #d9ecff 0%, #c6e2ff 100%);
	box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
	transform: translateY(-2px);
}

/* Completed Event Styles */
/* Requirement 23.3: Use different visual style for completed events in calendar view */
/* Requirement 23.7: Use visual cues (strikethrough, semi-transparent, special color) for completed events */
:deep(.fc-event.event-completed) {
	opacity: 0.6;
	background-color: #f0f0f0;
	border-color: #909399;
}

:deep(.fc-event.event-completed:hover) {
	opacity: 0.8;
	background-color: #e0e0e0;
}

:deep(.fc-event.event-completed .fc-event-title) {
	text-decoration: line-through;
	color: #909399;
}

:deep(.fc-event.event-completed .fc-event-time) {
	color: #909399;
}

:deep(.fc-event.event-completed .fc-event-location) {
	color: #c0c4cc;
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
	background: linear-gradient(135deg, #f0f9ff 0%, #e6f4ff 100%) !important;
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
	color: #606266;
}

:deep(.fc-timegrid-event) {
	border-radius: 4px;
	border-left: 3px solid #409eff;
}

:deep(.fc-timegrid-event:hover) {
	box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

:deep(.fc-timegrid-now-indicator-line) {
	border-color: #f56c6c;
	border-width: 2px;
}

:deep(.fc-timegrid-now-indicator-arrow) {
	border-color: #f56c6c;
}

/* Multi-month Year View Styles */
:deep(.fc-multimonth) {
	border: 1px solid #dcdfe6;
	border-radius: 4px;
}

:deep(.fc-multimonth-title) {
	background: #f5f7fa;
	font-weight: 600;
	padding: 8px;
	border-bottom: 1px solid #dcdfe6;
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
	border-color: #409eff;
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
