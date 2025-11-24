<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Search, Close, Calendar, Location, Discount } from "@element-plus/icons-vue";
import { useSearch } from "@/composables/useSearch";
import { useEvents } from "@/composables/useEvents";
import { useSupabase } from "@/composables/useSupabase";
import type { Tag } from "@/types";

/**
 * SearchBar Component
 * Provides comprehensive search and filtering functionality for calendar events
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4
 */

// Composables
const {
	filters,
	applyFilters,
	getUniqueLocations,
	getUniqueTags,
	filterLocationsBySearch,
	clearFilters,
	clearFilter,
	applyDateRangePreset,
} = useSearch();
const { events } = useEvents();
const { getAllTags } = useSupabase();

// Emit filtered events to parent
const emit = defineEmits<{
	filtered: [events: any[]];
}>();

// Local state
const keyword = ref("");
const dateRange = ref<[Date, Date] | null>(null);
const selectedLocations = ref<string[]>([]);
const selectedTagIds = ref<string[]>([]);
const locationSearchTerm = ref("");
const allTags = ref<Tag[]>([]);

// Date range presets - Requirement 5.2
const dateRangePresets = [
	{ label: "今天", value: "today" },
	{ label: "本周", value: "thisWeek" },
	{ label: "本月", value: "thisMonth" },
];

// Computed properties
// Requirement 6.1: Get all unique locations
const availableLocations = computed(() => {
	const locations = getUniqueLocations(events.value);
	return filterLocationsBySearch(locations, locationSearchTerm.value);
});

// Requirement 7.1: Get all unique tags
const availableTags = computed(() => {
	const tagIds = getUniqueTags(events.value);
	return allTags.value.filter((tag) => tagIds.includes(tag.id));
});

// Apply filters and emit filtered events
const filteredEvents = computed(() => {
	const currentFilters = {
		keyword: keyword.value || undefined,
		dateRange: dateRange.value || undefined,
		locations: selectedLocations.value.length > 0 ? selectedLocations.value : undefined,
		tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
	};

	return applyFilters(events.value, currentFilters);
});

// Requirement 4.4, 5.4, 6.4, 7.4: Display filtered results count
const filteredCount = computed(() => filteredEvents.value.length);
const totalCount = computed(() => events.value.length);

// Check if any filters are active
const hasActiveFilters = computed(() => {
	return (
		keyword.value !== "" ||
		dateRange.value !== null ||
		selectedLocations.value.length > 0 ||
		selectedTagIds.value.length > 0
	);
});

// Count active filters for display
const activeFilterCount = computed(() => {
	let count = 0;
	if (keyword.value) count++;
	if (dateRange.value) count++;
	if (selectedLocations.value.length > 0) count++;
	if (selectedTagIds.value.length > 0) count++;
	return count;
});

// Requirement 4.1: Keyword search with debounce
const handleKeywordChange = () => {
	// Emit filtered events immediately (Element Plus input already has debounce)
	emitFilteredEvents();
};

// Requirement 5.1: Date range filtering
const handleDateRangeChange = () => {
	emitFilteredEvents();
};

// Requirement 5.2: Apply date range preset
const handlePresetClick = (preset: string) => {
	applyDateRangePreset(preset as "today" | "thisWeek" | "thisMonth");
	dateRange.value = filters.value.dateRange || null;
	emitFilteredEvents();
};

// Requirement 6.2: Location filtering
const handleLocationChange = () => {
	emitFilteredEvents();
};

// Requirement 7.2: Tag filtering
const handleTagChange = () => {
	emitFilteredEvents();
};

// Requirement 4.4, 5.4, 7.3: Clear all filters
const handleClearAll = () => {
	keyword.value = "";
	dateRange.value = null;
	selectedLocations.value = [];
	selectedTagIds.value = [];
	clearFilters();
	emitFilteredEvents();
};

// Clear individual filter
const handleClearKeyword = () => {
	keyword.value = "";
	clearFilter("keyword");
	emitFilteredEvents();
};

const handleClearDateRange = () => {
	dateRange.value = null;
	clearFilter("dateRange");
	emitFilteredEvents();
};

const handleClearLocation = (location: string) => {
	selectedLocations.value = selectedLocations.value.filter((l) => l !== location);
	if (selectedLocations.value.length === 0) {
		clearFilter("locations");
	}
	emitFilteredEvents();
};

const handleClearTag = (tagId: string) => {
	selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId);
	if (selectedTagIds.value.length === 0) {
		clearFilter("tagIds");
	}
	emitFilteredEvents();
};

// Emit filtered events to parent
const emitFilteredEvents = () => {
	emit("filtered", filteredEvents.value);
};

// Load tags on mount
const loadTags = async () => {
	try {
		allTags.value = await getAllTags();
	} catch (error) {
		console.error("Failed to load tags:", error);
	}
};

// Get tag by ID
const getTagById = (tagId: string): Tag | undefined => {
	return allTags.value.find((tag) => tag.id === tagId);
};

// Watch for events changes and emit initial filtered events
watch(
	() => events.value,
	() => {
		emitFilteredEvents();
	},
	{ immediate: true }
);

// Initialize
loadTags();
</script>

<template>
	<div class="search-bar">
		<!-- Main Search Row -->
		<div class="search-row">
			<!-- Requirement 4.1: Keyword search input -->
			<el-input
				v-model="keyword"
				placeholder="搜索标题、描述或地点..."
				:prefix-icon="Search"
				clearable
				@input="handleKeywordChange"
				@clear="handleClearKeyword"
				class="keyword-input" />

			<!-- Requirement 5.1, 5.2: Date range picker with presets -->
			<el-date-picker
				v-model="dateRange"
				type="daterange"
				range-separator="至"
				start-placeholder="开始日期"
				end-placeholder="结束日期"
				:prefix-icon="Calendar"
				clearable
				@change="handleDateRangeChange"
				@clear="handleClearDateRange"
				class="date-range-picker" />

			<!-- Requirement 6.1, 6.2, 6.3: Location filter dropdown (multi-select) -->
			<el-select
				v-model="selectedLocations"
				multiple
				collapse-tags
				collapse-tags-tooltip
				placeholder="筛选地点"
				:prefix-icon="Location"
				clearable
				filterable
				@change="handleLocationChange"
				@clear="
					() => {
						selectedLocations = [];
						handleLocationChange();
					}
				"
				class="location-select">
				<el-option
					v-for="location in availableLocations"
					:key="location"
					:label="location"
					:value="location" />
			</el-select>

			<!-- Requirement 7.1, 7.2: Tag filter dropdown (multi-select) -->
			<el-select
				v-model="selectedTagIds"
				multiple
				collapse-tags
				collapse-tags-tooltip
				placeholder="筛选标签"
				:prefix-icon="Discount"
				clearable
				@change="handleTagChange"
				@clear="
					() => {
						selectedTagIds = [];
						handleTagChange();
					}
				"
				class="tag-select">
				<el-option v-for="tag in availableTags" :key="tag.id" :label="tag.name" :value="tag.id">
					<el-tag :color="tag.color" size="small" style="color: white; border: none">
						{{ tag.name }}
					</el-tag>
				</el-option>
			</el-select>

			<!-- Clear all filters button -->
			<el-button
				v-if="hasActiveFilters"
				type="danger"
				:icon="Close"
				@click="handleClearAll"
				class="clear-all-btn">
				清除筛选
			</el-button>
		</div>

		<!-- Date Range Presets - Requirement 5.2 -->
		<div v-if="!dateRange" class="preset-row">
			<span class="preset-label">快速选择：</span>
			<el-button
				v-for="preset in dateRangePresets"
				:key="preset.value"
				size="small"
				text
				@click="handlePresetClick(preset.value)"
				class="preset-btn">
				{{ preset.label }}
			</el-button>
		</div>

		<!-- Active Filters Display - Requirement 5.3, 6.4, 7.4 -->
		<div v-if="hasActiveFilters" class="active-filters">
			<span class="filter-label">当前筛选条件：</span>

			<!-- Keyword filter tag -->
			<el-tag v-if="keyword" closable @close="handleClearKeyword" class="filter-tag">
				关键词: {{ keyword }}
			</el-tag>

			<!-- Date range filter tag -->
			<el-tag v-if="dateRange" closable @close="handleClearDateRange" class="filter-tag">
				日期: {{ dateRange[0].toLocaleDateString() }} - {{ dateRange[1].toLocaleDateString() }}
			</el-tag>

			<!-- Location filter tags -->
			<el-tag
				v-for="location in selectedLocations"
				:key="location"
				closable
				@close="handleClearLocation(location)"
				class="filter-tag">
				地点: {{ location }}
			</el-tag>

			<!-- Tag filter tags -->
			<el-tag
				v-for="tagId in selectedTagIds"
				:key="tagId"
				:color="getTagById(tagId)?.color"
				closable
				@close="handleClearTag(tagId)"
				class="filter-tag"
				style="color: white; border: none">
				{{ getTagById(tagId)?.name }}
			</el-tag>
		</div>

		<!-- Results Count Display - Requirement 4.4 -->
		<div class="results-info">
			<span v-if="hasActiveFilters" class="results-count">
				显示 <strong>{{ filteredCount }}</strong> / {{ totalCount }} 个事件
				<span v-if="activeFilterCount > 0" class="filter-count">
					({{ activeFilterCount }} 个筛选条件)
				</span>
			</span>
			<span v-else class="results-count">
				共 <strong>{{ totalCount }}</strong> 个事件
			</span>
		</div>
	</div>
</template>

<style scoped>
.search-bar {
	background: var(--bg-secondary);
	border-radius: var(--radius-lg);
	padding: var(--spacing-lg);
	box-shadow: 0 2px 8px var(--shadow);
	margin-bottom: var(--spacing-lg);
}

/* Main Search Row */
.search-row {
	display: flex;
	gap: var(--spacing-md);
	flex-wrap: wrap;
	align-items: center;
}

.keyword-input {
	flex: 1;
	min-width: 200px;
}

.date-range-picker {
	min-width: 280px;
}

.location-select,
.tag-select {
	min-width: 180px;
}

.clear-all-btn {
	white-space: nowrap;
}

/* Preset Row */
.preset-row {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	margin-top: var(--spacing-md);
	padding-top: var(--spacing-md);
	border-top: 1px solid var(--border-light);
}

.preset-label {
	font-size: 13px;
	color: var(--text-secondary);
	font-weight: 500;
}

.preset-btn {
	font-size: 13px;
	padding: 4px 12px;
}

/* Active Filters Display */
.active-filters {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	flex-wrap: wrap;
	margin-top: var(--spacing-md);
	padding-top: var(--spacing-md);
	border-top: 1px solid var(--border-light);
}

.filter-label {
	font-size: 13px;
	color: var(--text-secondary);
	font-weight: 500;
}

.filter-tag {
	font-size: 12px;
}

/* Results Info */
.results-info {
	margin-top: var(--spacing-md);
	padding-top: var(--spacing-md);
	border-top: 1px solid var(--border-light);
	text-align: center;
}

.results-count {
	font-size: 14px;
	color: var(--text-secondary);
}

.results-count strong {
	color: var(--primary-color);
	font-weight: 600;
}

.filter-count {
	color: var(--text-tertiary);
	font-size: 13px;
}

/* Responsive Design */
@media (max-width: 768px) {
	.search-row {
		flex-direction: column;
	}

	.keyword-input,
	.date-range-picker,
	.location-select,
	.tag-select {
		width: 100%;
		min-width: unset;
	}

	.clear-all-btn {
		width: 100%;
	}

	.preset-row {
		flex-wrap: wrap;
	}
}

@media (max-width: 480px) {
	.search-bar {
		padding: var(--spacing-md);
	}

	.active-filters {
		flex-direction: column;
		align-items: flex-start;
	}
}
</style>
