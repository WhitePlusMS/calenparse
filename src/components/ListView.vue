<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import type { CalendarEvent } from "@/types";
import { useEvents } from "@/composables/useEvents";
import { useBatchSelection } from "@/composables/useBatchSelection";
import BatchOperationBar from "./BatchOperationBar.vue";
import BatchEditDialog from "./BatchEditDialog.vue";
import dayjs from "dayjs";

/**
 * ListView Component
 * Displays all calendar events in a flat list view
 * Implements requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * Implements requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7 (batch operations)
 * Implements requirements 23.4, 23.6, 23.7 (completion status)
 */

// Emits
const emit = defineEmits<{
	eventClick: [event: CalendarEvent];
}>();

// Composables
const { events, loading, error, clearError, fetchEvents, batchDeleteEvents, batchUpdateEvents, toggleEventCompletion } =
	useEvents();
const {
	isSelectionMode,
	selectedCount,
	toggleSelectionMode,
	disableSelectionMode,
	toggleSelection,
	isSelected,
	selectAll,
	clearSelection,
	isAllSelected,
	isSomeSelected,
	getSelectedIds,
	getSelectedEvents,
} = useBatchSelection();

// Import useSupabase for tags
import { useSupabase } from "@/composables/useSupabase";
import { onMounted } from "vue";
import type { Tag } from "@/types";
import ErrorState from "./ErrorState.vue";

const { getAllTags } = useSupabase();
const availableTags = ref<Tag[]>([]);

// Load tags on mount
onMounted(async () => {
	try {
		availableTags.value = await getAllTags();
	} catch (error) {
		console.error("Failed to load tags:", error);
	}
});

// Get tag by ID
const getTagById = (id: string): Tag | undefined => {
	return availableTags.value.find((tag) => tag.id === id);
};

// Batch edit dialog state
const showBatchEditDialog = ref(false);

/**
 * Sorted events by time order (from nearest to farthest)
 * Requirement 8.2: Display events in time order (from nearest to farthest)
 */
const sortedEvents = computed(() => {
	return [...events.value].sort((a, b) => {
		return a.startTime.getTime() - b.startTime.getTime();
	});
});

/**
 * Check if there are no events
 * Requirement 8.6: Display empty state prompt when no events exist
 */
const isEmpty = computed(() => {
	return !loading.value && events.value.length === 0;
});

/**
 * Handle event click
 * Requirement 8.4: Show complete event details when user clicks event
 * Requirement 12.1: In selection mode, toggle selection instead of opening details
 */
const handleEventClick = (event: CalendarEvent) => {
	if (isSelectionMode.value) {
		toggleSelection(event.id);
	} else {
		emit("eventClick", event);
	}
};

/**
 * Handle checkbox click
 * Requirement 12.1: Toggle selection for individual event
 */
const handleCheckboxClick = (event: CalendarEvent, e: Event) => {
	e.stopPropagation();
	toggleSelection(event.id);
};

/**
 * Handle select all checkbox
 * Requirement 12.1: Select/deselect all events
 */
const handleSelectAll = () => {
	if (isAllSelected(sortedEvents.value)) {
		clearSelection();
	} else {
		selectAll(sortedEvents.value);
	}
};

/**
 * Get checkbox state for select all
 */
const selectAllCheckboxState = computed(() => {
	if (isAllSelected(sortedEvents.value)) {
		return true;
	} else if (isSomeSelected(sortedEvents.value)) {
		return "indeterminate";
	}
	return false;
});

/**
 * Handle batch delete
 * Requirement 12.3: Batch delete with confirmation
 * Requirement 12.6: Sync update all views
 */
const handleBatchDelete = async () => {
	const selectedIds = getSelectedIds();
	if (selectedIds.length === 0) return;

	try {
		await ElMessageBox.confirm(
			`确定要删除选中的 ${selectedIds.length} 个事件吗？此操作不可撤销。`,
			"批量删除确认",
			{
				confirmButtonText: "确定删除",
				cancelButtonText: "取消",
				type: "warning",
				confirmButtonClass: "el-button--danger",
			}
		);

		// Perform batch delete
		await batchDeleteEvents(selectedIds);

		ElMessage.success(`成功删除 ${selectedIds.length} 个事件`);

		// Exit selection mode
		disableSelectionMode();
	} catch (error) {
		// User cancelled or error occurred
		if (error !== "cancel") {
			console.error("Batch delete failed:", error);
		}
	}
};

/**
 * Handle batch edit
 * Requirement 12.4: Show batch edit dialog
 */
const handleBatchEdit = () => {
	const selectedIds = getSelectedIds();
	if (selectedIds.length === 0) return;

	showBatchEditDialog.value = true;
};

/**
 * Handle batch edit save
 * Requirement 12.5: Batch modify common fields
 * Requirement 12.6: Sync update all views
 */
const handleBatchEditSave = async (updates: Partial<CalendarEvent>) => {
	const selectedIds = getSelectedIds();
	if (selectedIds.length === 0) return;

	try {
		await batchUpdateEvents(selectedIds, updates);

		ElMessage.success(`成功更新 ${selectedIds.length} 个事件`);

		// Exit selection mode
		disableSelectionMode();
	} catch (error) {
		console.error("Batch update failed:", error);
	}
};

/**
 * Handle cancel batch operation
 * Requirement 12.7: Cancel batch operation
 */
const handleBatchCancel = () => {
	disableSelectionMode();
};

/**
 * Get selected events for batch edit dialog
 */
const selectedEventsForEdit = computed(() => {
	return getSelectedEvents(events.value);
});

/**
 * Format time for display
 * Requirement 8.3: Display date, time, title, and location for each event
 */
const formatTime = (startTime: Date, endTime: Date, isAllDay: boolean): string => {
	if (isAllDay) {
		return "全天";
	}
	const start = dayjs(startTime).format("HH:mm");
	const end = dayjs(endTime).format("HH:mm");
	return `${start} - ${end}`;
};

/**
 * Format day of week
 */
const formatDayOfWeek = (date: Date): string => {
	const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
	const dayIndex = date.getDay();
	return days[dayIndex] || "周日";
};

/**
 * Check if event is today
 */
const isToday = (date: Date): boolean => {
	return dayjs(date).isSame(dayjs(), "day");
};

/**
 * Check if event is in the past
 */
const isPast = (date: Date): boolean => {
	return dayjs(date).isBefore(dayjs(), "day");
};

/**
 * Check if event is upcoming (within 7 days)
 */
const isUpcoming = (date: Date): boolean => {
	const now = dayjs();
	const eventDate = dayjs(date);
	return eventDate.isAfter(now, "day") && eventDate.diff(now, "day") <= 7;
};

/**
 * Handle completion status toggle
 * Requirement 23.6: Toggle completion status and update all views
 */
const handleToggleCompletion = async (event: CalendarEvent, e: Event) => {
	e.stopPropagation();

	// 二次确认
	const action = event.isCompleted ? "标记为未完成" : "标记为完成";
	try {
		await ElMessageBox.confirm(`确定要将"${event.title}"${action}吗？`, "确认操作", {
			confirmButtonText: "确定",
			cancelButtonText: "取消",
			type: "warning",
		});

		await toggleEventCompletion(event.id);
		ElMessage.success(event.isCompleted ? "已标记为未完成" : "已标记为完成");
	} catch (error) {
		if (error === "cancel") {
			// 用户取消操作
			return;
		}
		console.error("Toggle completion failed:", error);
		ElMessage.error("更新完成状态失败");
	}
};

/**
 * Handle retry after error
 * Requirement 13.3: Error state with retry button
 */
const handleRetry = async () => {
	clearError();
	await fetchEvents();
};
</script>

<template>
	<div class="list-view">
		<!-- Batch Selection Toolbar -->
		<!-- Requirement 12.1: Add batch operation mode toggle -->
		<div v-if="!loading && !isEmpty" class="batch-toolbar">
			<div class="batch-toolbar-left">
				<button
					class="batch-toggle-btn"
					:class="{ active: isSelectionMode }"
					@click="toggleSelectionMode">
					<span class="batch-icon">{{ isSelectionMode ? "✓" : "☐" }}</span>
					<span class="batch-text">{{ isSelectionMode ? "取消选择" : "批量操作" }}</span>
				</button>

				<!-- Select All Checkbox (only visible in selection mode) -->
				<!-- Requirement 12.1: Implement select all/deselect all functionality -->
				<div v-if="isSelectionMode" class="select-all-container">
					<label class="select-all-label">
						<input
							type="checkbox"
							class="select-all-checkbox"
							:checked="selectAllCheckboxState === true"
							:indeterminate="selectAllCheckboxState === 'indeterminate'"
							@change="handleSelectAll" />
						<span class="select-all-text">全选</span>
					</label>
				</div>
			</div>

			<!-- Selection Count -->
			<!-- Requirement 12.2: Display number of selected events -->
			<div v-if="isSelectionMode && selectedCount > 0" class="selection-count">
				已选择 <strong>{{ selectedCount }}</strong> 个事件
			</div>
		</div>

		<!-- Error State -->
		<!-- Requirement 13.3: Error state with retry button -->
		<ErrorState v-if="error && !loading" title="加载列表失败" :message="error" @retry="handleRetry" />

		<!-- Loading State -->
		<!-- Requirement 13.4: Progress indicator -->
		<div v-else-if="loading" class="loading-overlay">
			<div class="loading-spinner">
				<div class="spinner-ring"></div>
				<div class="spinner-ring"></div>
				<div class="spinner-ring"></div>
				<div class="loading-text">加载日程中...</div>
			</div>
		</div>

		<!-- Empty State -->
		<!-- Requirement 8.6: Display empty state prompt when no events exist -->
		<!-- Requirement 13.2: Friendly empty state with illustration and guidance -->
		<div v-else-if="isEmpty" class="empty-state">
			<div class="empty-icon">📋</div>
			<p class="empty-title">暂无日程事件</p>
			<p class="empty-hint">使用上方输入框解析通告文本来创建日程</p>
		</div>

		<!-- Event List -->
		<!-- Requirement 8.1: Display all events in a flat list -->
		<!-- Requirement 8.2: Display events in time order (from nearest to farthest) -->
		<div v-else class="event-list">
			<div
				v-for="event in sortedEvents"
				:key="event.id"
				class="event-item"
				:class="{
					'event-item--today': isToday(event.startTime),
					'event-item--past': isPast(event.startTime),
					'event-item--upcoming': isUpcoming(event.startTime),
					'event-item--selected': isSelectionMode && isSelected(event.id),
					'event-item--selectable': isSelectionMode,
					'event-item--completed': event.isCompleted,
				}"
				@click="handleEventClick(event)">
				<!-- Checkbox (only visible in selection mode) -->
				<!-- Requirement 12.1: Add checkboxes in list view -->
				<div v-if="isSelectionMode" class="event-checkbox-container">
					<input
						type="checkbox"
						class="event-checkbox"
						:checked="isSelected(event.id)"
						@click="handleCheckboxClick(event, $event)" />
				</div>

				<!-- Date Badge -->
				<div class="event-date-badge">
					<!-- Completion Toggle Button -->
					<button
						class="completion-toggle-btn"
						:class="{ 'completion-toggle-btn--completed': event.isCompleted }"
						:title="event.isCompleted ? '标记为未完成' : '标记为完成'"
						@click.stop="handleToggleCompletion(event, $event)">
						<span v-if="event.isCompleted" class="completion-icon">✓</span>
						<span v-else class="completion-icon">○</span>
					</button>

					<div class="event-date-badge__day">
						{{ dayjs(event.startTime).format("DD") }}
					</div>
					<div class="event-date-badge__month">
						{{ dayjs(event.startTime).format("MMM") }}
					</div>
					<div class="event-date-badge__weekday">
						{{ formatDayOfWeek(event.startTime) }}
					</div>
				</div>

				<!-- Event Details -->
				<!-- Requirement 8.3: Display date, time, title, and location for each event -->
				<div class="event-details">
					<div class="event-header">
						<h3 class="event-title">{{ event.title }}</h3>
						<div class="event-badges">
							<span v-if="event.isCompleted" class="badge badge--completed"
								>已完成</span
							>
							<span
								v-if="isToday(event.startTime) && !event.isCompleted"
								class="badge badge--today"
								>今天</span
							>
							<span
								v-if="isUpcoming(event.startTime) && !event.isCompleted"
								class="badge badge--upcoming"
								>即将到来</span
							>
							<span v-if="event.isAllDay" class="badge badge--allday"
								>全天</span
							>
						</div>
					</div>

					<div class="event-meta">
						<div class="event-meta-item">
							<span class="event-meta-icon">🕐</span>
							<span class="event-meta-text">
								{{
									formatTime(
										event.startTime,
										event.endTime,
										event.isAllDay
									)
								}}
							</span>
						</div>

						<div v-if="event.location" class="event-meta-item">
							<span class="event-meta-icon">📍</span>
							<span class="event-meta-text">{{ event.location }}</span>
						</div>
					</div>

					<div v-if="event.description" class="event-description">
						{{ event.description }}
					</div>

					<!-- Event Tags -->
					<div v-if="event.tagIds && event.tagIds.length > 0" class="event-tags">
						<span
							v-for="tagId in event.tagIds"
							:key="tagId"
							v-show="getTagById(tagId)"
							class="event-tag"
							:style="{
								backgroundColor: getTagById(tagId)?.color || '#409EFF',
							}">
							{{ getTagById(tagId)?.name }}
						</span>
					</div>
				</div>

				<!-- Arrow Icon -->
				<div class="event-arrow">
					<span class="arrow-icon">›</span>
				</div>
			</div>
		</div>

		<!-- Batch Operation Bar -->
		<!-- Requirement 12.3, 12.4, 12.7: Batch operations toolbar -->
		<BatchOperationBar
			v-if="isSelectionMode && selectedCount > 0"
			:selected-count="selectedCount"
			@delete="handleBatchDelete"
			@edit="handleBatchEdit"
			@cancel="handleBatchCancel" />

		<!-- Batch Edit Dialog -->
		<!-- Requirement 12.4, 12.5: Batch edit dialog -->
		<BatchEditDialog
			v-model:visible="showBatchEditDialog"
			:events="selectedEventsForEdit"
			@save="handleBatchEditSave" />
	</div>
</template>

<style scoped>
.list-view {
	position: relative;
	width: 100%;
	max-width: 1200px;
	margin: 0 auto;
	padding: 20px;
}

/* Batch Selection Toolbar */
.batch-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-md) var(--spacing-lg);
	margin-bottom: var(--spacing-lg);
	background: var(--bg-secondary);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-xl);
	gap: var(--spacing-lg);
	box-shadow: 0 2px 8px var(--shadow);
}

.batch-toolbar-left {
	display: flex;
	align-items: center;
	gap: 16px;
}

.batch-toggle-btn {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-lg);
	background: var(--bg-secondary);
	border: 2px solid var(--primary-color);
	border-radius: var(--radius-lg);
	color: var(--primary-color);
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-medium);
	cursor: pointer;
	transition: all 0.3s ease;
	box-shadow: 0 2px 4px var(--shadow);
}

.batch-toggle-btn:hover {
	background: var(--bg-hover);
	transform: translateY(-2px);
	box-shadow: 0 4px 8px var(--shadow);
}

.batch-toggle-btn.active {
	background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
	color: white;
	border-color: var(--primary-dark);
}

.batch-toggle-btn.active:hover {
	background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
}

.batch-icon {
	font-size: 16px;
	line-height: 1;
}

.batch-text {
	line-height: 1;
}

.select-all-container {
	display: flex;
	align-items: center;
}

.select-all-label {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	user-select: none;
}

.select-all-checkbox {
	width: 18px;
	height: 18px;
	cursor: pointer;
	accent-color: var(--primary-color);
}

.select-all-text {
	font-size: 14px;
	color: var(--text-secondary);
	font-weight: 500;
}

.selection-count {
	font-size: var(--font-size-base);
	color: var(--text-secondary);
	padding: var(--spacing-sm) var(--spacing-lg);
	background: linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-color) 100%);
	border-radius: var(--radius-lg);
	border: 1px solid var(--border-light);
	font-weight: var(--font-weight-medium);
	box-shadow: 0 2px 4px var(--shadow);
}

.selection-count strong {
	color: var(--primary-color);
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-lg);
}

/* Loading State */
.loading-overlay {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
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
	border: 4px solid var(--border-light);
	border-top-color: var(--primary-color);
	border-radius: 50%;
	animation: spin 1s linear infinite;
	position: absolute;
}

.spinner-ring:nth-child(2) {
	width: 50px;
	height: 50px;
	border-top-color: var(--primary-light);
	animation-delay: 0.1s;
}

.spinner-ring:nth-child(3) {
	width: 40px;
	height: 40px;
	border-top-color: var(--primary-dark);
	animation-delay: 0.2s;
}

.loading-text {
	margin-top: 80px;
	font-size: 14px;
	color: var(--text-secondary);
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

/* Empty State - Requirement 12.1, 12.2, 12.3: Clear hierarchy with spacing */
.empty-state {
	text-align: center;
	padding: var(--spacing-2xl) var(--spacing-lg);
	color: var(--text-tertiary);
	animation: fadeIn 0.5s ease-out;
	background: var(--bg-secondary);
	border-radius: var(--radius-xl);
	border: 2px dashed var(--border-color);
	margin: var(--spacing-lg) 0;
}

.empty-icon {
	font-size: 80px;
	margin-bottom: var(--spacing-xl);
	opacity: 0.6;
	filter: grayscale(0.3);
}

/* Primary message - Requirement 12.1: Larger, bolder */
.empty-title {
	font-size: var(--font-size-2xl);
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	margin-bottom: var(--spacing-md);
	line-height: var(--line-height-tight);
}

/* Secondary message - Requirement 12.1: Smaller, lighter */
.empty-hint {
	font-size: var(--font-size-base);
	margin-top: var(--spacing-sm);
	color: var(--text-secondary);
	line-height: var(--line-height-relaxed);
	max-width: 400px;
	margin-left: auto;
	margin-right: auto;
}

/* Event List */
.event-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
	animation: fadeIn 0.5s ease-out;
}

/* Event Item */
.event-item {
	display: flex;
	align-items: stretch;
	gap: var(--spacing-lg);
	padding: var(--spacing-lg);
	background: var(--bg-secondary);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-xl);
	cursor: pointer;
	transition: all 0.3s ease;
	animation: slideInUp 0.4s ease-out;
	position: relative;
	box-shadow: 0 2px 8px var(--shadow);
}

.event-item--selectable {
	padding-left: 12px;
}

.event-item--selected {
	border-color: var(--primary-color);
	background: var(--bg-hover);
}

.event-checkbox-container {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 24px;
	padding-right: 8px;
}

.event-checkbox {
	width: 18px;
	height: 18px;
	cursor: pointer;
	accent-color: var(--primary-color);
}

/* Completion Toggle Button */
/* Requirement 23.4: Display completion status indicator in list view */
.completion-toggle-btn {
	position: absolute;
	top: -12px;
	right: -12px;
	width: 32px;
	height: 32px;
	background: linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%);
	border: 2.5px solid #e4e7ed;
	border-radius: var(--radius-full);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	z-index: 2;
	padding: 0;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
}

.completion-toggle-btn:hover {
	transform: scale(1.15) rotate(5deg);
	border-color: #67c23a;
	background: linear-gradient(135deg, #f0f9ff 0%, #e6f4ff 100%);
	box-shadow: 0 6px 16px rgba(103, 194, 58, 0.2), 0 3px 6px rgba(103, 194, 58, 0.1);
}

.completion-toggle-btn:active {
	transform: scale(1.05);
}

.completion-toggle-btn--completed {
	background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
	border-color: #67c23a;
	box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3), 0 2px 4px rgba(103, 194, 58, 0.2);
}

.completion-toggle-btn--completed:hover {
	background: linear-gradient(135deg, #85ce61 0%, #95d475 100%);
	border-color: #85ce61;
	transform: scale(1.15) rotate(-5deg);
	box-shadow: 0 6px 20px rgba(103, 194, 58, 0.4), 0 3px 8px rgba(103, 194, 58, 0.3);
}

.completion-icon {
	font-size: 18px;
	font-weight: var(--font-weight-bold);
	line-height: 1;
	color: #c0c4cc;
	transition: all 0.3s ease;
}

.completion-toggle-btn:hover .completion-icon {
	color: #67c23a;
	transform: scale(1.1);
}

.completion-toggle-btn--completed .completion-icon {
	color: white;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.completion-toggle-btn--completed:hover .completion-icon {
	color: white;
	transform: scale(1.2);
}

/* Completed Event Styles */
/* Requirement 23.7: Use visual cues (strikethrough, semi-transparent) for completed events */
.event-item--completed {
	opacity: 0.6;
	background: #f5f7fa;
}

.event-item--completed:hover {
	opacity: 0.8;
}

.event-item--completed .event-title {
	text-decoration: line-through;
	color: #909399;
}

.event-item--completed .event-meta-text {
	text-decoration: line-through;
	color: #c0c4cc;
}

.event-item--completed .event-description {
	text-decoration: line-through;
	color: #c0c4cc;
}

.event-item--completed .event-date-badge {
	background: linear-gradient(135deg, #909399 0%, #c0c4cc 100%);
}

@keyframes slideInUp {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.event-item:hover {
	border-color: var(--primary-color);
	box-shadow: 0 8px 24px var(--shadow-lg);
	transform: translateY(-4px);
}

.event-item--today {
	border-color: var(--primary-light);
	background: var(--bg-secondary);
}

.event-item--today:hover {
	border-color: var(--primary-light);
	box-shadow: 0 4px 12px var(--shadow);
}

.event-item--past {
	opacity: 0.7;
}

.event-item--past:hover {
	opacity: 1;
}

.event-item--upcoming {
	border-color: var(--primary-dark);
}

.event-item--upcoming:hover {
	border-color: var(--primary-dark);
	box-shadow: 0 4px 12px var(--shadow);
}

/* Date Badge - Requirement 12.2: Color contrast, 12.4: Visual weight */
.event-date-badge {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 90px;
	height: 90px;
	background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
	border-radius: var(--radius-xl);
	color: white;
	text-align: center;
	box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	position: relative;
	overflow: visible;
	transition: all 0.3s ease;
}

.event-date-badge::before {
	content: "";
	position: absolute;
	top: -50%;
	left: -50%;
	width: 200%;
	height: 200%;
	background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
	opacity: 0;
	transition: opacity 0.3s ease;
}

.event-item:hover .event-date-badge::before {
	opacity: 1;
}

/* Color coding for different states - Requirement 12.2 */
.event-item--today .event-date-badge {
	background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
}

.event-item--upcoming .event-date-badge {
	background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%);
}

.event-item--past .event-date-badge {
	background: linear-gradient(135deg, var(--text-tertiary) 0%, var(--text-secondary) 100%);
}

/* Typography hierarchy within badge - Requirement 12.1 */
.event-date-badge__day {
	font-size: var(--font-size-4xl);
	font-weight: var(--font-weight-bold);
	line-height: var(--line-height-tight);
	margin-bottom: var(--spacing-xs);
}

.event-date-badge__month {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-bold);
	text-transform: uppercase;
	opacity: 0.95;
	margin-bottom: 2px;
	letter-spacing: 0.8px;
}

.event-date-badge__weekday {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-medium);
	opacity: 0.9;
}

/* Event Details - Requirement 12.3: Whitespace for content separation */
.event-details {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
	min-width: 0;
}

.event-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing-md);
}

/* Primary content - Requirement 12.1: Font hierarchy, 12.4: Visual weight */
.event-title {
	margin: 0;
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	line-height: var(--line-height-tight);
	word-break: break-word;
	letter-spacing: -0.3px;
}

.event-badges {
	display: flex;
	gap: var(--spacing-sm);
	flex-shrink: 0;
	flex-wrap: wrap;
}

/* Requirement 14.1: Rounded rectangles with soft background */
/* Requirement 14.2: Text color matches background */
.badge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing-xs) var(--spacing-sm);
	border-radius: var(--radius-lg);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	white-space: nowrap;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	border: 1px solid transparent;
	line-height: var(--line-height-tight);
	transition: all 0.2s ease;
}

.badge--completed {
	background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
	color: white;
	border: none;
	box-shadow: 0 2px 6px rgba(103, 194, 58, 0.3);
}

.badge--today {
	background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
	color: white;
	border: none;
	box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.badge--upcoming {
	background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%);
	color: white;
	border: none;
	box-shadow: 0 2px 6px rgba(76, 94, 212, 0.3);
}

.badge--allday {
	background: var(--bg-hover);
	color: var(--text-secondary);
	border: 1px solid var(--border-color);
}

/* Requirement 14.4: Hover effect for badges */
.badge:hover {
	transform: translateY(-1px);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Secondary content - Requirement 12.1: Smaller font, 12.2: Secondary color */
.event-meta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-lg);
}

.event-meta-item {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	font-size: var(--font-size-sm);
	color: var(--text-secondary);
	font-weight: var(--font-weight-medium);
	line-height: var(--line-height-normal);
}

.event-meta-icon {
	font-size: var(--font-size-lg);
	line-height: 1;
	flex-shrink: 0;
}

.event-meta-text {
	line-height: var(--line-height-normal);
}

/* Tertiary content - Requirement 12.1: Smallest font, 12.5: Limited density */
.event-description {
	font-size: var(--font-size-sm);
	color: var(--text-tertiary);
	line-height: var(--line-height-relaxed);
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	padding: var(--spacing-md);
	background: var(--bg-hover);
	border-radius: var(--radius-md);
	border-left: 3px solid var(--primary-color);
	margin-top: var(--spacing-xs);
}

/* Event Tags */
/* Requirement 14.1: Rounded rectangles with soft background */
/* Requirement 14.2: Text color matches background */
/* Requirement 14.3: Appropriate spacing for multiple tags */
/* Requirement 14.4: Hover effect */
.event-tags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-sm);
	margin-top: var(--spacing-xs);
	align-items: center;
}

.event-tag {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing-xs) var(--spacing-md);
	border-radius: var(--radius-lg);
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	color: white;
	white-space: nowrap;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	transition: all 0.2s ease;
	border: none;
	line-height: var(--line-height-tight);
}

.event-tag:hover {
	transform: translateY(-1px);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
	filter: brightness(1.1);
	cursor: pointer;
}

/* Arrow Icon */
.event-arrow {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	color: var(--text-tertiary);
	transition: all 0.3s ease;
}

.arrow-icon {
	font-size: 24px;
	font-weight: 300;
	line-height: 1;
}

.event-item:hover .event-arrow {
	color: var(--primary-color);
	transform: translateX(4px);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
	.list-view {
		padding: 12px;
	}

	.batch-toolbar {
		flex-direction: column;
		align-items: stretch;
		gap: 12px;
		padding: 10px 12px;
	}

	.batch-toolbar-left {
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
	}

	.batch-toggle-btn {
		justify-content: center;
		width: 100%;
	}

	.select-all-container {
		justify-content: center;
	}

	.selection-count {
		text-align: center;
	}

	.event-item {
		gap: 12px;
		padding: 12px;
	}

	.event-item--selectable {
		padding-left: 10px;
	}

	.event-date-badge {
		width: 70px;
		height: 70px;
		padding: var(--spacing-xs);
	}

	.event-date-badge__day {
		font-size: var(--font-size-3xl);
	}

	.event-date-badge__month {
		font-size: 11px;
	}

	.event-date-badge__weekday {
		font-size: 10px;
	}

	.completion-badge {
		width: 20px;
		height: 20px;
		font-size: 12px;
	}

	.event-title {
		font-size: 16px;
	}

	.event-meta {
		gap: 12px;
	}

	.event-meta-item {
		font-size: 13px;
	}

	.event-description {
		font-size: 13px;
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
	.list-view {
		padding: 8px;
	}

	.batch-toolbar {
		padding: 8px 10px;
		gap: 10px;
	}

	.batch-toggle-btn {
		padding: 6px 12px;
		font-size: 13px;
	}

	.select-all-text {
		font-size: 13px;
	}

	.selection-count {
		font-size: 13px;
		padding: 6px 12px;
	}

	.event-item {
		gap: 10px;
		padding: 10px;
	}

	.event-item--selectable {
		padding-left: 8px;
	}

	.event-checkbox-container {
		width: 20px;
		padding-right: 6px;
	}

	.event-checkbox {
		width: 16px;
		height: 16px;
	}

	.event-date-badge {
		width: 50px;
		padding: 8px 4px;
	}

	.event-date-badge__day {
		font-size: 20px;
	}

	.event-date-badge__month {
		font-size: 10px;
	}

	.event-date-badge__weekday {
		font-size: 9px;
	}

	.event-title {
		font-size: 15px;
	}

	.event-badges {
		flex-direction: column;
		gap: 4px;
	}

	.badge {
		font-size: 10px;
		padding: 2px 6px;
	}

	.event-meta {
		flex-direction: column;
		gap: 8px;
	}

	.event-meta-item {
		font-size: 12px;
	}

	.event-meta-icon {
		font-size: 14px;
	}

	.event-description {
		font-size: 12px;
		-webkit-line-clamp: 1;
	}

	.event-arrow {
		width: 20px;
	}

	.arrow-icon {
		font-size: 20px;
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
