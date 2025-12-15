<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import type { CalendarEvent, Tag } from "@/types";
import { useEvents } from "@/composables/useEvents";
import { useBatchSelection } from "@/composables/useBatchSelection";
import { useSupabase } from "@/composables/useSupabase";
import { useSearch } from "@/composables/useSearch";
import { useSearchPersistence } from "@/composables/useSearchPersistence";
import { useCountdownSettings } from "@/composables/useCountdownSettings";
import { useCountdown } from "@/composables/useCountdown";
import BatchOperationBar from "./BatchOperationBar.vue";
import BatchEditDialog from "./BatchEditDialog.vue";
import ErrorState from "./ErrorState.vue";
import CountdownIndicator from "./CountdownIndicator.vue";
import dayjs from "dayjs";

/**
 * ListView Component
 * Displays all calendar events in a flat list view
 * Implements requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * Implements requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7 (batch operations)
 * Implements requirements 23.4, 23.6, 23.7 (completion status)
 */

// Props - Accept filtered events from parent
const props = defineProps<{
	filteredEvents?: CalendarEvent[];
}>();

// Emits
const emit = defineEmits<{
	eventClick: [event: CalendarEvent];
	filtered: [events: CalendarEvent[]];
}>();

// Composables
const {
	events: allEvents,
	loading,
	error,
	clearError,
	fetchEvents,
	batchDeleteEvents,
	batchUpdateEvents,
	toggleEventCompletion,
} = useEvents();

// 使用持久化的搜索参数
const {
	filters: persistedFilters,
	completionStatus: persistedCompletionStatus,
	clearAllFilters: clearPersistedFilters,
} = useSearchPersistence("list");

// Integrated filter panel state
const showFilterPanel = ref(false);

// 从 filters 对象中提取搜索参数
const searchKeyword = computed({
	get: () => persistedFilters.value.keyword || "",
	set: (val) => {
		persistedFilters.value.keyword = val || undefined;
	},
});
const dateRange = computed({
	get: () => persistedFilters.value.dateRange || null,
	set: (val) => {
		persistedFilters.value.dateRange = val || undefined;
	},
});
const selectedLocations = computed({
	get: () => persistedFilters.value.locations || [],
	set: (val) => {
		persistedFilters.value.locations = val.length > 0 ? val : undefined;
	},
});
const selectedTagIds = computed({
	get: () => persistedFilters.value.tagIds || [],
	set: (val) => {
		persistedFilters.value.tagIds = val.length > 0 ? val : undefined;
	},
});
// 使用持久化的 completionStatus
const completionStatus = persistedCompletionStatus;

// Composables for filtering
const { getUniqueLocations } = useSearch();
const { getAllTags } = useSupabase();
const availableTags = ref<Tag[]>([]);

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

	// Apply completion status filter
	if (completionStatus.value === "completed") {
		result = result.filter((event) => event.isCompleted === true);
	} else if (completionStatus.value === "uncompleted") {
		result = result.filter((event) => event.isCompleted !== true);
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
		selectedTagIds.value.length > 0 ||
		completionStatus.value !== "all"
	);
});
const activeFilterCount = computed(() => {
	let count = 0;
	if (searchKeyword.value) count++;
	if (dateRange.value) count++;
	if (selectedLocations.value.length > 0) count += selectedLocations.value.length;
	if (selectedTagIds.value.length > 0) count += selectedTagIds.value.length;
	if (completionStatus.value !== "all") count++;
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
	const newTags = [...selectedTagIds.value];
	const index = newTags.indexOf(tagId);
	if (index > -1) {
		newTags.splice(index, 1);
	} else {
		newTags.push(tagId);
	}
	selectedTagIds.value = newTags;
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
	clearPersistedFilters();
	emit("filtered", filteredEvents.value);
};

const handleCompletionStatusChange = () => {
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

// Batch selection composable
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

// Countdown settings and auto-update
const { settings: countdownSettings } = useCountdownSettings();
const { startAutoUpdate, stopAutoUpdate } = useCountdown();

// Load tags on mount and start countdown auto-update
// Requirement 5.4, 5.5, 5.6, 5.7: Auto-update countdown
onMounted(async () => {
	try {
		availableTags.value = await getAllTags();
	} catch (error) {
		console.error("Failed to load tags:", error);
	}

	// Start countdown auto-update
	startAutoUpdate();
});

// Stop countdown auto-update on unmount
onUnmounted(() => {
	stopAutoUpdate();
});

// Get tag by ID
const getTagById = (id: string): Tag | undefined => {
	return availableTags.value.find((tag) => tag.id === id);
};

// Batch edit dialog state
const showBatchEditDialog = ref(false);

/**
 * Sorted events by completion status and time order
 * Requirement 8.2: Display events in time order (from nearest to farthest)
 * Requirement 1.1: Uncompleted events before completed events
 * Requirement 1.2: Within uncompleted events, sort by start time ascending
 * Requirement 1.3: Within completed events, sort by start time ascending
 */
const sortedEvents = computed(() => {
	return [...filteredEvents.value].sort((a, b) => {
		// First sort by completion status: uncompleted before completed
		if (a.isCompleted !== b.isCompleted) {
			return a.isCompleted ? 1 : -1;
		}
		// Then sort by start time: earlier events first
		return a.startTime.getTime() - b.startTime.getTime();
	});
});

/**
 * Group events by month
 * 按月份分组事件
 */
interface MonthGroup {
	month: string; // YYYY-MM format
	displayMonth: string; // 显示格式：2024年11月
	events: CalendarEvent[];
	isExpanded: boolean;
}

const collapsedMonths = ref<Set<string>>(new Set());

const groupedEvents = computed(() => {
	const groups = new Map<string, MonthGroup>();

	sortedEvents.value.forEach((event) => {
		const monthKey = dayjs(event.startTime).format("YYYY-MM");

		if (!groups.has(monthKey)) {
			const date = dayjs(event.startTime);
			groups.set(monthKey, {
				month: monthKey,
				displayMonth: date.format("YYYY年MM月"),
				events: [],
				isExpanded: !collapsedMonths.value.has(monthKey),
			});
		}

		groups.get(monthKey)!.events.push(event);
	});

	// 转换为数组并按月份排序
	return Array.from(groups.values()).sort((a, b) => {
		return dayjs(a.month).valueOf() - dayjs(b.month).valueOf();
	});
});

const toggleMonthGroup = (monthKey: string) => {
	if (collapsedMonths.value.has(monthKey)) {
		collapsedMonths.value.delete(monthKey);
	} else {
		collapsedMonths.value.add(monthKey);
	}
};

/**
 * Check if there are no events
 * Requirement 8.6: Display empty state prompt when no events exist
 */
const isEmpty = computed(() => {
	return !loading.value && filteredEvents.value.length === 0;
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

	const startDay = dayjs(startTime);
	const endDay = dayjs(endTime);

	// Check if event spans multiple days
	const isSameDay = startDay.format("YYYY-MM-DD") === endDay.format("YYYY-MM-DD");

	if (isSameDay) {
		// Same day: show only time
		const start = startDay.format("HH:mm");
		const end = endDay.format("HH:mm");
		return `${start} - ${end}`;
	} else {
		// Different days: show date + time
		const start = startDay.format("MM-DD HH:mm");
		const end = endDay.format("MM-DD HH:mm");
		return `${start} - ${end}`;
	}
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
 * Check if event is in the past (已结束)
 * 只有当结束时间已过时才算过去，正在进行中的日程不算
 */
const isPast = (event: CalendarEvent): boolean => {
	return dayjs(event.endTime).isBefore(dayjs());
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
		<!-- 顶部工具栏：搜索筛选 + 批量操作 合并到一行 -->
		<div class="top-toolbar">
			<!-- 搜索筛选按钮 -->
			<button class="filter-toggle-btn" @click="showFilterPanel = !showFilterPanel">
				<el-icon class="filter-icon"><Search /></el-icon>
				<span class="filter-label">搜索与筛选</span>
				<span v-if="activeFilterCount > 0" class="filter-count">{{ activeFilterCount }}</span>
				<span class="filter-arrow" :class="{ expanded: showFilterPanel }">▼</span>
			</button>

			<!-- 批量操作按钮 -->
			<button
				v-if="!loading && !isEmpty"
				class="batch-toggle-btn"
				:class="{ active: isSelectionMode }"
				@click="toggleSelectionMode">
				<el-icon class="batch-icon">
					<Select v-if="isSelectionMode" />
					<span v-else>☐</span>
				</el-icon>
				<span class="batch-text">{{ isSelectionMode ? "取消选择" : "批量操作" }}</span>
			</button>
		</div>

		<!-- Expandable Filter Panel -->
		<div class="search-filter-panel">
			<div v-show="showFilterPanel" class="filter-panel-content">
				<!-- Search Input -->
				<div class="filter-section">
					<div class="section-header">
						<el-icon class="section-icon"><Search /></el-icon>
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
						<el-icon class="section-icon"><Calendar /></el-icon>
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
							<el-button size="small" text @click="applyDatePreset('today')"
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
						<el-icon class="section-icon"><Location /></el-icon>
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
						<el-icon class="section-icon"><PriceTag /></el-icon>
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
							<span v-if="selectedTagIds.includes(tag.id)" class="tag-check"
								>✓</span
							>
						</button>
					</div>
				</div>

				<!-- Completion Status Filter -->
				<div class="filter-section">
					<div class="section-header">
						<el-icon class="section-icon"><Select /></el-icon>
						<span class="section-title">完成状态</span>
					</div>
					<el-radio-group
						v-model="completionStatus"
						@change="handleCompletionStatusChange"
						class="completion-status-group">
						<el-radio-button label="all">全部</el-radio-button>
						<el-radio-button label="uncompleted">未完成</el-radio-button>
						<el-radio-button label="completed">已完成</el-radio-button>
					</el-radio-group>
				</div>

				<!-- Active Filters Summary -->
				<div v-if="hasActiveFilters" class="active-filters-section">
					<div class="section-header">
						<el-icon class="section-icon"><Filter /></el-icon>
						<span class="section-title">当前筛选</span>
						<el-button size="small" text type="danger" @click="clearAllFilters"
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
							v-if="completionStatus !== 'all'"
							closable
							@close="
								completionStatus = 'all';
								handleCompletionStatusChange();
							"
							size="small">
							状态:
							{{ completionStatus === "completed" ? "已完成" : "未完成" }}
						</el-tag>
						<el-tag
							v-for="location in selectedLocations"
							:key="location"
							closable
							@close="removeLocation(location)"
							size="small">
							<el-icon><Location /></el-icon> {{ location }}
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

		<!-- Select All Checkbox (only visible in selection mode) -->
		<div v-if="isSelectionMode && !loading && !isEmpty" class="select-all-toolbar">
			<label class="select-all-label">
				<input
					type="checkbox"
					class="select-all-checkbox"
					:checked="selectAllCheckboxState === true"
					:indeterminate="selectAllCheckboxState === 'indeterminate'"
					@change="handleSelectAll" />
				<span class="select-all-text">全选</span>
			</label>

			<!-- Selection Count -->
			<div v-if="selectedCount > 0" class="selection-count">
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
			<div class="empty-icon">
				<el-icon :size="64"><Document /></el-icon>
			</div>
			<p class="empty-title">暂无日程事件</p>
			<p class="empty-hint">使用上方输入框解析通告文本来创建日程</p>
		</div>

		<!-- Event List with Date Grouping -->
		<!-- Requirement 8.1: Display all events grouped by date -->
		<!-- Requirement 8.2: Display events in time order (from nearest to farthest) -->
		<div v-else class="event-list">
			<!-- Month Group -->
			<div v-for="group in groupedEvents" :key="group.month" class="month-group">
				<!-- Month Group Header -->
				<div class="month-group-header" @click="toggleMonthGroup(group.month)">
					<div class="month-group-info">
						<el-icon class="month-group-icon"><Calendar /></el-icon>
						<span class="month-group-title">{{ group.displayMonth }}</span>
						<span class="month-group-count">{{ group.events.length }}</span>
					</div>
					<span class="month-group-arrow" :class="{ collapsed: !group.isExpanded }"
						>▼</span
					>
				</div>

				<!-- Events in this month group -->
				<div v-show="group.isExpanded" class="month-group-events">
					<div
						v-for="event in group.events"
						:key="event.id"
						class="event-item"
						:class="{
							'event-item--today': isToday(event.startTime),
							'event-item--past': isPast(event),
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
								:class="{
									'completion-toggle-btn--completed':
										event.isCompleted,
								}"
								:title="
									event.isCompleted
										? '标记为未完成'
										: '标记为完成'
								"
								@click.stop="handleToggleCompletion(event, $event)">
								<span v-if="event.isCompleted" class="completion-icon"
									>✓</span
								>
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
							<!-- 标题行：标题 + 标签 + 徽章 -->
							<div class="event-header">
								<h3 class="event-title">{{ event.title }}</h3>

								<!-- Event Tags - 移到标题后面 -->
								<div
									v-if="event.tagIds && event.tagIds.length > 0"
									class="event-tags-inline">
									<span
										v-for="tagId in event.tagIds"
										:key="tagId"
										v-show="getTagById(tagId)"
										class="event-tag"
										:style="{
											backgroundColor:
												getTagById(tagId)
													?.color ||
												'#409EFF',
										}">
										{{ getTagById(tagId)?.name }}
									</span>
								</div>

								<div class="event-badges">
									<!-- Countdown Indicator -->
									<CountdownIndicator
										v-if="countdownSettings.enabled"
										:event="event"
										:unit="countdownSettings.unit" />
									<span
										v-if="event.isCompleted"
										class="badge badge--completed"
										>已完成</span
									>
									<span
										v-if="
											isToday(event.startTime) &&
											!event.isCompleted
										"
										class="badge badge--today"
										>今天</span
									>
									<span
										v-if="
											isUpcoming(event.startTime) &&
											!event.isCompleted
										"
										class="badge badge--upcoming"
										>即将到来</span
									>
									<span
										v-if="event.isAllDay"
										class="badge badge--allday"
										>全天</span
									>
								</div>
							</div>

							<div class="event-meta">
								<div class="event-meta-item">
									<el-icon class="event-meta-icon"
										><Clock
									/></el-icon>
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
									<el-icon class="event-meta-icon"
										><Location
									/></el-icon>
									<span class="event-meta-text">{{
										event.location
									}}</span>
								</div>
							</div>

							<div v-if="event.description" class="event-description">
								{{ event.description }}
							</div>
						</div>

						<!-- Arrow Icon -->
						<div class="event-arrow">
							<span class="arrow-icon">›</span>
						</div>
					</div>
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
	margin: 0 auto;
	padding: 20px;
}

/* 旧的batch-toolbar样式已移除，使用新的top-toolbar */

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
	gap: 16px;
	animation: fadeIn 0.5s ease-out;
}

/* Month Group Styles */
.month-group {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.month-group-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 20px;
	background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
	border: 2px solid var(--primary-color);
	border-radius: var(--radius-xl);
	cursor: pointer;
	transition: all 0.3s ease;
	user-select: none;
	box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.month-group-header:hover {
	background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
	transform: translateY(-2px);
	box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.month-group-info {
	display: flex;
	align-items: center;
	gap: 12px;
}

.month-group-icon {
	font-size: 24px;
	line-height: 1;
	filter: brightness(0) invert(1);
}

.month-group-title {
	font-size: 18px;
	font-weight: var(--font-weight-bold);
	color: white;
	letter-spacing: -0.3px;
}

.month-group-count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 28px;
	height: 28px;
	padding: 0 10px;
	background: rgba(255, 255, 255, 0.25);
	color: white;
	border-radius: var(--radius-full);
	font-size: 13px;
	font-weight: var(--font-weight-bold);
	border: 2px solid rgba(255, 255, 255, 0.4);
}

.month-group-arrow {
	font-size: 16px;
	color: white;
	transition: transform 0.3s ease;
	font-weight: bold;
}

.month-group-arrow.collapsed {
	transform: rotate(-90deg);
}

.month-group-events {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding-left: 12px;
	animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
	from {
		opacity: 0;
		max-height: 0;
	}
	to {
		opacity: 1;
		max-height: 2000px;
	}
}

/* Event Item - 方案A优化：减小内边距和间距 */
.event-item {
	display: flex;
	align-items: stretch;
	gap: var(--spacing-md);
	padding: 16px;
	background: var(--bg-secondary);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-lg);
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
	background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-hover) 100%);
	border: 2.5px solid var(--border-light);
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
	border-color: var(--success-color);
	background: linear-gradient(135deg, var(--bg-hover) 0%, var(--bg-color) 100%);
	box-shadow: 0 6px 16px rgba(103, 194, 58, 0.2), 0 3px 6px rgba(103, 194, 58, 0.1);
}

.completion-toggle-btn:active {
	transform: scale(1.05);
}

.completion-toggle-btn--completed {
	background: linear-gradient(135deg, var(--success-color) 0%, #85ce61 100%);
	border-color: var(--success-color);
	box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3), 0 2px 4px rgba(103, 194, 58, 0.2);
}

.completion-toggle-btn--completed:hover {
	background: linear-gradient(135deg, #85ce61 0%, #95d475 100%);
	border-color: var(--success-color);
	transform: scale(1.15) rotate(-5deg);
	box-shadow: 0 6px 20px rgba(103, 194, 58, 0.4), 0 3px 8px rgba(103, 194, 58, 0.3);
}

.completion-icon {
	font-size: 18px;
	font-weight: var(--font-weight-bold);
	line-height: 1;
	color: var(--text-disabled);
	transition: all 0.3s ease;
}

.completion-toggle-btn:hover .completion-icon {
	color: var(--success-color);
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
	background: var(--bg-hover);
}

.event-item--completed:hover {
	opacity: 0.8;
}

.event-item--completed .event-title {
	text-decoration: line-through;
	color: var(--text-tertiary);
}

.event-item--completed .event-meta-text {
	text-decoration: line-through;
	color: var(--text-disabled);
}

.event-item--completed .event-description {
	text-decoration: line-through;
	color: var(--text-disabled);
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

/* Date Badge - 方案A优化：从90px缩小到70px */
.event-date-badge {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 70px;
	height: 70px;
	background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
	border-radius: var(--radius-lg);
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

/* Completed event date badge - 已完成事件的日期卡片应该是灰色 */
.event-item--completed .event-date-badge {
	background: linear-gradient(135deg, #909399 0%, #a8abb2 100%) !important;
	box-shadow: 0 4px 12px rgba(144, 147, 153, 0.3);
}

/* Typography hierarchy within badge - 方案A优化：字体缩小 */
.event-date-badge__day {
	font-size: 28px;
	font-weight: var(--font-weight-bold);
	line-height: var(--line-height-tight);
	margin-bottom: 2px;
}

.event-date-badge__month {
	font-size: 11px;
	font-weight: var(--font-weight-bold);
	text-transform: uppercase;
	opacity: 0.95;
	margin-bottom: 1px;
	letter-spacing: 0.8px;
}

.event-date-badge__weekday {
	font-size: 10px;
	font-weight: var(--font-weight-medium);
	opacity: 0.9;
}

/* Event Details - 方案A优化：减小间距 */
.event-details {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}

/* 标题行：标题 + 标签 + 徽章 一行显示 */
.event-header {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

/* Primary content - 方案A优化：字体从20px缩小到18px */
.event-title {
	margin: 0;
	font-size: 18px;
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	line-height: var(--line-height-tight);
	word-break: break-word;
	letter-spacing: -0.3px;
	flex-shrink: 0;
}

/* 标签放在标题后面 */
.event-tags-inline {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
}

.event-badges {
	display: flex;
	gap: var(--spacing-sm);
	flex-shrink: 0;
	flex-wrap: wrap;
	margin-left: auto;
}

/* 方案A优化：徽章尺寸缩小 */
.badge {
	display: inline-flex;
	align-items: center;
	padding: 4px 10px;
	border-radius: var(--radius-md);
	font-size: 11px;
	font-weight: var(--font-weight-semibold);
	white-space: nowrap;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	border: 1px solid transparent;
	line-height: var(--line-height-tight);
	transition: all 0.2s ease;
}

.badge--completed {
	background: linear-gradient(135deg, var(--success-color) 0%, #85ce61 100%);
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

/* 方案A优化：元信息字体和间距缩小 */
.event-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.event-meta-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	color: var(--text-secondary);
	font-weight: var(--font-weight-medium);
	line-height: var(--line-height-normal);
}

.event-meta-icon {
	font-size: 16px;
	line-height: 1;
	flex-shrink: 0;
}

.event-meta-text {
	line-height: var(--line-height-normal);
}

/* 方案A优化：描述字体缩小 */
.event-description {
	font-size: 13px;
	color: var(--text-tertiary);
	line-height: 1.5;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	padding: 10px 12px;
	background: var(--bg-hover);
	border-radius: var(--radius-md);
	border-left: 3px solid var(--primary-color);
	margin-top: 4px;
}

/* 方案A优化：标签尺寸和间距缩小 */
.event-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 4px;
	align-items: center;
}

.event-tag {
	display: inline-flex;
	align-items: center;
	padding: 4px 10px;
	border-radius: var(--radius-md);
	font-size: 11px;
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

/* 顶部工具栏：搜索筛选 + 批量操作 一行显示 */
.top-toolbar {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: var(--spacing-lg);
}

/* 搜索筛选面板 */
.search-filter-panel {
	margin-bottom: var(--spacing-lg);
}

/* 全选工具栏 */
.select-all-toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	margin-bottom: var(--spacing-lg);
	background: var(--bg-secondary);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-lg);
	box-shadow: 0 2px 8px var(--shadow);
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
	padding: 13px;
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

.filter-toggle-btn {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	padding: var(--spacing-md) var(--spacing-lg);
	background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-hover) 100%);
	border: 2px solid var(--border-color);
	border-radius: var(--radius-lg);
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	color: var(--text-primary);
	flex: 1;
	justify-content: space-between;
	box-shadow: 0 2px 8px var(--shadow);
}

.batch-toggle-btn {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-md) var(--spacing-lg);
	background: var(--bg-secondary);
	border: 2px solid var(--primary-color);
	border-radius: var(--radius-lg);
	color: var(--primary-color);
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	cursor: pointer;
	transition: all 0.3s ease;
	box-shadow: 0 2px 4px var(--shadow);
	white-space: nowrap;
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
	background-color: white;
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

/* Completion Status Filter */
.completion-status-group {
	width: 100%;
	display: flex;
}

.completion-status-group :deep(.el-radio-button) {
	flex: 1;
}

.completion-status-group :deep(.el-radio-button__inner) {
	width: 100%;
	border-radius: var(--radius-md);
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

/* Mobile Responsiveness */
@media (max-width: 768px) {
	.list-view {
		padding: 8px;
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
		padding: 10px 16px;
		font-size: 14px;
	}

	.select-all-container {
		justify-content: center;
	}

	.selection-count {
		text-align: center;
	}

	/* 手机端事件卡片：增加宽度，纵向布局 */
	.event-item {
		gap: 10px;
		padding: 14px 10px;
		flex-direction: column;
		align-items: flex-start;
	}

	.event-item--selectable {
		padding-left: 10px;
	}

	/* 手机端：日期徽章和复选框放在同一行 */
	.event-checkbox-container {
		position: absolute;
		top: 12px;
		left: 12px;
		width: 20px;
		padding: 0;
	}

	.event-checkbox {
		width: 18px;
		height: 18px;
	}

	/* 手机端：日期徽章缩小 */
	.event-date-badge {
		width: 60px;
		height: 60px;
		padding: 6px;
		align-self: flex-start;
	}

	.event-date-badge__day {
		font-size: 24px;
	}

	.event-date-badge__month {
		font-size: 10px;
	}

	.event-date-badge__weekday {
		font-size: 9px;
	}

	/* 手机端：完成按钮移到卡片外面左上角 */
	.completion-toggle-btn {
		width: 28px;
		height: 28px;
		top: 8px;
		left: 8px;
		right: auto;
		border-width: 2px;
	}

	.completion-icon {
		font-size: 15px;
	}

	/* 手机端：事件详情占满宽度 */
	.event-details {
		width: 100%;
		gap: 10px;
	}

	/* 手机端：标题行改为纵向布局 */
	.event-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.event-title {
		font-size: 16px;
		width: 100%;
	}

	/* 手机端：标签独立一行 */
	.event-tags-inline {
		width: 100%;
		gap: 6px;
	}

	.event-tag {
		font-size: 11px;
		padding: 3px 8px;
	}

	/* 手机端：徽章独立一行 */
	.event-badges {
		width: 100%;
		margin-left: 0;
		gap: 6px;
	}

	.badge {
		font-size: 11px;
		padding: 3px 8px;
	}

	/* 手机端：元信息纵向排列 */
	.event-meta {
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

	.event-meta-item {
		font-size: 13px;
	}

	.event-meta-icon {
		font-size: 15px;
	}

	/* 手机端：描述文字缩小 */
	.event-description {
		font-size: 12px;
		-webkit-line-clamp: 2;
		padding: 8px 10px;
	}

	/* 手机端：隐藏箭头 */
	.event-arrow {
		display: none;
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

	/* 手机端：月份分组头部 */
	.month-group-header {
		padding: 12px 14px;
	}

	.month-group-title {
		font-size: 16px;
	}

	.month-group-count {
		min-width: 24px;
		height: 24px;
		padding: 0 8px;
		font-size: 12px;
	}
}

@media (max-width: 480px) {
	.list-view {
		padding: 6px;
	}

	.batch-toolbar {
		padding: 8px 10px;
		gap: 10px;
	}

	.batch-toggle-btn {
		padding: 8px 14px;
		font-size: 13px;
	}

	.select-all-text {
		font-size: 13px;
	}

	.selection-count {
		font-size: 13px;
		padding: 6px 12px;
	}

	/* 超小屏幕：进一步优化布局 */
	.event-item {
		gap: 8px;
		padding: 12px 8px;
	}

	.event-item--selectable {
		padding-left: 8px;
	}

	.event-checkbox-container {
		top: 10px;
		left: 10px;
	}

	.event-checkbox {
		width: 16px;
		height: 16px;
	}

	/* 超小屏幕：日期徽章再缩小 */
	.event-date-badge {
		width: 55px;
		height: 55px;
		padding: 4px;
	}

	.event-date-badge__day {
		font-size: 22px;
	}

	.event-date-badge__month {
		font-size: 9px;
	}

	.event-date-badge__weekday {
		font-size: 8px;
	}

	/* 超小屏幕：完成按钮保持在卡片外左上角 */
	.completion-toggle-btn {
		width: 26px;
		height: 26px;
		top: 6px;
		left: 6px;
		right: auto;
	}

	.completion-icon {
		font-size: 14px;
	}

	.event-title {
		font-size: 15px;
	}

	.event-tag {
		font-size: 10px;
		padding: 2px 6px;
	}

	.badge {
		font-size: 10px;
		padding: 2px 6px;
	}

	.event-meta-item {
		font-size: 12px;
	}

	.event-meta-icon {
		font-size: 14px;
	}

	.event-description {
		font-size: 11px;
		-webkit-line-clamp: 1;
		padding: 6px 8px;
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

	/* 超小屏幕：月份分组 */
	.month-group-header {
		padding: 10px 12px;
	}

	.month-group-title {
		font-size: 15px;
	}

	.month-group-count {
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		font-size: 11px;
	}

	.month-group-icon {
		font-size: 20px;
	}
}
</style>
