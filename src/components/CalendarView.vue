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

/**
 * CalendarView Component
 * Displays calendar events in multiple views using FullCalendar
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10
 */

// View type definition
type ViewType = "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "multiMonthYear";

// Emits
const emit = defineEmits<{
	eventClick: [event: CalendarEvent];
}>();

// Composables
const { events, fetchEvents, loading } = useEvents();
const { getAllTags } = useSupabase();

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
});

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
	() => calendarRef.value?.getApi()?.getDate(),
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
	// Date click handler for quick navigation
	dateClick: handleDateClick,
	// Track date changes
	datesSet: handleDatesSet,
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
 * Handle date click
 * Requirement 3.10: Quick switch to day view when clicking a date
 */
function handleDateClick(dateClickInfo: any) {
	if (currentView.value !== "timeGridDay") {
		currentDate.value = dateClickInfo.date;
		switchView("timeGridDay");
	}
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
		<!-- Tag Filter -->
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
							color: selectedTagIds.includes(tag.id) ? 'white' : '#606266',
							borderColor: tag.color,
						}"
						@click="toggleTagFilter(tag.id)">
						<span
							class="tag-color-dot"
							:style="{ backgroundColor: tag.color }"></span>
						<span class="tag-name">{{ tag.name }}</span>
						<span v-if="selectedTagIds.includes(tag.id)" class="tag-check">✓</span>
					</button>
				</div>
			</div>
		</div>

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

		<div v-if="loading" class="loading-overlay">
			<div class="loading-spinner">
				<div class="spinner-ring"></div>
				<div class="spinner-ring"></div>
				<div class="spinner-ring"></div>
				<div class="loading-text">加载日程中...</div>
			</div>
		</div>

		<!-- Requirement 3.1: Display newly created events in calendar view -->
		<!-- Requirement 3.5: Day view with hourly time slots -->
		<!-- Requirement 3.6: Week view showing 7 days -->
		<!-- Requirement 3.7: Month view display -->
		<!-- Requirement 3.8: Year view showing schedule density -->
		<FullCalendar ref="calendarRef" :options="calendarOptions" />

		<div v-if="!loading && events.length === 0" class="empty-state">
			<div class="empty-icon">📅</div>
			<p class="empty-title">暂无日程事件</p>
			<p class="empty-hint">使用上方输入框解析通告文本来创建日程</p>
		</div>
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
	margin-bottom: 16px;
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

.tag-filter-item {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border: 2px solid;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: 13px;
	font-weight: 500;
}

.tag-filter-item:hover {
	transform: translateY(-1px);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.tag-filter-item.active {
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tag-color-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	flex-shrink: 0;
}

.tag-filter-item.active .tag-color-dot {
	background-color: white !important;
}

.tag-name {
	flex: 1;
}

.tag-check {
	font-size: 14px;
	font-weight: 600;
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

.loading-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--bg-secondary);
	opacity: 0.95;
	backdrop-filter: blur(4px);
	z-index: 10;
	animation: fadeIn 0.3s ease-out;
}

.loading-spinner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
}

.spinner-ring {
	width: 60px;
	height: 60px;
	border: 4px solid #e4e7ed;
	border-top-color: #409eff;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	position: absolute;
}

.spinner-ring:nth-child(2) {
	width: 50px;
	height: 50px;
	border-top-color: #67c23a;
	animation-delay: 0.1s;
}

.spinner-ring:nth-child(3) {
	width: 40px;
	height: 40px;
	border-top-color: #e6a23c;
	animation-delay: 0.2s;
}

.loading-text {
	margin-top: 80px;
	font-size: 14px;
	color: #606266;
	font-weight: 500;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
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
}

:deep(.fc-toolbar-title) {
	font-size: 1.5em;
	font-weight: 600;
}

:deep(.fc-button) {
	background-color: #409eff;
	border-color: #409eff;
	text-transform: none;
	padding: 6px 12px;
}

:deep(.fc-button:hover) {
	background-color: #66b1ff;
	border-color: #66b1ff;
}

:deep(.fc-button:disabled) {
	background-color: #a0cfff;
	border-color: #a0cfff;
}

:deep(.fc-event) {
	cursor: pointer;
	border-radius: 4px;
	padding: 2px 4px;
	margin-bottom: 2px;
	border-left: 3px solid #409eff;
	background-color: #ecf5ff;
	border-color: #409eff;
}

:deep(.fc-event:hover) {
	background-color: #d9ecff;
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
	gap: 2px;
}

:deep(.fc-event-time) {
	font-size: 11px;
	font-weight: 600;
	color: #409eff;
}

:deep(.fc-event-title) {
	font-size: 13px;
	font-weight: 500;
	color: #303133;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

:deep(.fc-event-location) {
	font-size: 11px;
	color: #606266;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

:deep(.fc-event-tags) {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 4px;
}

:deep(.fc-event-tag) {
	display: inline-block;
	padding: 2px 6px;
	border-radius: 3px;
	font-size: 10px;
	font-weight: 500;
	color: white;
	white-space: nowrap;
}

:deep(.fc-daygrid-day-number) {
	padding: 8px;
	font-size: 14px;
}

:deep(.fc-day-today) {
	background-color: #f0f9ff !important;
}

:deep(.fc-daygrid-day-frame) {
	min-height: 100px;
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

	.spinner-ring {
		width: 50px;
		height: 50px;
	}

	.spinner-ring:nth-child(2) {
		width: 40px;
		height: 40px;
	}

	.spinner-ring:nth-child(3) {
		width: 30px;
		height: 30px;
	}

	.loading-text {
		margin-top: 70px;
		font-size: 13px;
	}
}
</style>
