<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import CalendarView from "./components/CalendarView.vue";
import ListView from "./components/ListView.vue";
import StatisticsView from "./components/StatisticsView.vue";
import EventDialog from "./components/EventDialog.vue";
import ImportExport from "./components/ImportExport.vue";
import ThemeSettings from "./components/ThemeSettings.vue";
import ShareDialog from "./components/ShareDialog.vue";
import TagManager from "./components/TagManager.vue";
import FloatingInput from "./components/FloatingInput.vue";
import PreviewDialog from "./components/PreviewDialog.vue";
import { useEvents } from "@/composables/useEvents";
import { useTheme } from "@/composables/useTheme";
import { useSupabase } from "@/composables/useSupabase";
import type { CalendarEvent, ParsedEvent } from "@/types";

// Initialize theme on app startup
const { toggleMode, theme } = useTheme();

/**
 * Main Application Layout - Minimal Sidebar Design
 *
 * Requirements:
 * - 需求 1.1, 1.2, 1.3: 极简侧边栏布局，导航和主内容区域分离
 * - 需求 1.4: 移动端响应式适配
 * - 需求 1.5: 平滑过渡动画
 */

// Composables
const { events, updateEvent, deleteEvent, createEvent, fetchEvents } = useEvents();
const { getAllTags, createTag } = useSupabase();

// View mode: 'calendar', 'list', 'statistics'
const currentViewMode = ref<"calendar" | "list" | "statistics">("calendar");

// Handle event click from CalendarView or ListView
const selectedEvent = ref<CalendarEvent | null>(null);
const eventDialogVisible = ref(false);

// Import/Export dialog
const importExportDialogVisible = ref(false);

// Theme settings dialog
const themeSettingsDialogVisible = ref(false);

// Share dialog
const shareDialogVisible = ref(false);

// Tag manager dialog
const tagManagerDialogVisible = ref(false);

// Preview dialog state
const previewDialogVisible = ref(false);
const parsedEvents = ref<ParsedEvent[]>([]);
const originalText = ref("");

const handleEventClick = (event: CalendarEvent) => {
	selectedEvent.value = event;
	eventDialogVisible.value = true;
};

// Handle event save from EventDialog
const handleEventSave = async (event: CalendarEvent) => {
	try {
		await updateEvent(event.id, {
			title: event.title,
			startTime: event.startTime,
			endTime: event.endTime,
			isAllDay: event.isAllDay,
			location: event.location,
			description: event.description,
			tagIds: event.tagIds,
		});
		eventDialogVisible.value = false;
		ElMessage.success("事件已更新");
	} catch (error) {
		console.error("Failed to update event:", error);
	}
};

// Handle event delete from EventDialog
const handleEventDelete = async (id: string) => {
	try {
		await deleteEvent(id);
		eventDialogVisible.value = false;
		selectedEvent.value = null;
		ElMessage.success("事件已删除");
	} catch (error) {
		console.error("Failed to delete event:", error);
	}
};

// Switch view mode
const switchViewMode = (mode: "calendar" | "list" | "statistics") => {
	currentViewMode.value = mode;
};

// Open share dialog with all events
const handleShareAllEvents = () => {
	if (events.value.length === 0) {
		ElMessage.warning("暂无事件可分享");
		return;
	}
	shareDialogVisible.value = true;
};

// Handle preview from FloatingInput
const handleShowPreview = (events: ParsedEvent[], text: string) => {
	parsedEvents.value = events;
	originalText.value = text;
	previewDialogVisible.value = true;
};

// Match tags from tag names (only match existing tags, don't create new ones)
const matchTags = async (tagNames: string[]): Promise<string[]> => {
	if (!tagNames || tagNames.length === 0) return [];

	try {
		const existingTags = await getAllTags();
		const tagIds: string[] = [];

		for (const tagName of tagNames) {
			const normalizedName = tagName.trim().toLowerCase();
			const existingTag = existingTags.find((tag) => tag.name.toLowerCase() === normalizedName);

			if (existingTag) {
				tagIds.push(existingTag.id);
			}
			// Don't create new tags automatically - user can create them manually in PreviewDialog
		}

		return tagIds;
	} catch (error) {
		console.error("Failed to match tags:", error);
		return [];
	}
};

// Handle preview confirmation
const handlePreviewConfirm = async (events: ParsedEvent[]) => {
	try {
		let successCount = 0;
		for (const event of events) {
			if (!event.title && !event.startTime) {
				continue;
			}

			let startTime =
				event.startTime instanceof Date
					? event.startTime
					: event.startTime
					? new Date(event.startTime)
					: new Date();

			let endTime =
				event.endTime instanceof Date
					? event.endTime
					: event.endTime
					? new Date(event.endTime)
					: startTime;

			// Ensure end time is after start time
			if (endTime.getTime() <= startTime.getTime()) {
				if (event.isAllDay) {
					// For all-day events, set end time to end of day
					endTime = new Date(startTime);
					endTime.setHours(23, 59, 59, 999);
				} else {
					// For regular events, add 1 hour
					endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
				}
			}

			let tagIds: string[] = [];
			if (event.tags && event.tags.length > 0) {
				tagIds = await matchTags(event.tags);
			}

			const eventData = {
				title: event.title || "未命名事件",
				startTime,
				endTime,
				isAllDay: event.isAllDay || false,
				location: event.location,
				description: event.description,
				originalText: originalText.value,
				tagIds: tagIds.length > 0 ? tagIds : undefined,
			};

			await createEvent(eventData);
			successCount++;
		}

		ElMessage.success(`成功创建 ${successCount} 个日程事件`);
		previewDialogVisible.value = false;
		parsedEvents.value = [];
		originalText.value = "";
	} catch (err) {
		console.error("Failed to create events:", err);
		ElMessage.error("创建事件失败");
	}
};

// Handle preview cancellation
const handlePreviewCancel = () => {
	previewDialogVisible.value = false;
	parsedEvents.value = [];
	originalText.value = "";
};

// Handle tags changed (refresh all views)
const handleTagsChanged = async () => {
	try {
		await fetchEvents();
	} catch (error) {
		console.error("Failed to refresh events after tag change:", error);
	}
};
</script>

<template>
	<div class="app-layout">
		<!-- Minimal Sidebar -->
		<aside class="sidebar">
			<!-- Logo / Home -->
			<div class="sidebar-header">
				<div class="sidebar-item" title="CalenParse">
					<span class="sidebar-item-icon">📅</span>
					<span class="sidebar-item-label">日历</span>
				</div>
			</div>

			<!-- Main Navigation -->
			<nav class="sidebar-nav">
				<div class="sidebar-divider"></div>

				<!-- View Navigation -->
				<div
					:class="['sidebar-item', { active: currentViewMode === 'calendar' }]"
					@click="switchViewMode('calendar')"
					title="日历视图">
					<span class="sidebar-item-icon">📅</span>
					<span class="sidebar-item-label">日历</span>
				</div>

				<div
					:class="['sidebar-item', { active: currentViewMode === 'list' }]"
					@click="switchViewMode('list')"
					title="列表视图">
					<span class="sidebar-item-icon">📋</span>
					<span class="sidebar-item-label">列表</span>
				</div>

				<div
					:class="['sidebar-item', { active: currentViewMode === 'statistics' }]"
					@click="switchViewMode('statistics')"
					title="统计分析">
					<span class="sidebar-item-icon">📊</span>
					<span class="sidebar-item-label">统计</span>
				</div>

				<div class="sidebar-divider"></div>

				<!-- Tools -->
				<div class="sidebar-item" @click="tagManagerDialogVisible = true" title="标签管理">
					<span class="sidebar-item-icon">🏷️</span>
					<span class="sidebar-item-label">标签</span>
				</div>

				<div class="sidebar-item" @click="handleShareAllEvents" title="分享">
					<span class="sidebar-item-icon">📤</span>
					<span class="sidebar-item-label">分享</span>
				</div>

				<div class="sidebar-item" @click="importExportDialogVisible = true" title="导入/导出">
					<span class="sidebar-item-icon">📦</span>
					<span class="sidebar-item-label">导入导出</span>
				</div>
			</nav>

			<!-- Footer Actions -->
			<div class="sidebar-footer">
				<div class="sidebar-divider"></div>

				<div
					class="sidebar-item"
					@click="toggleMode"
					:title="`切换到${theme.mode === 'light' ? '深色' : '浅色'}模式`">
					<span class="sidebar-item-icon">{{
						theme.mode === "light" ? "🌙" : "☀️"
					}}</span>
					<span class="sidebar-item-label">{{
						theme.mode === "light" ? "Dark" : "Light"
					}}</span>
				</div>

				<div class="sidebar-item" @click="themeSettingsDialogVisible = true" title="设置">
					<span class="sidebar-item-icon">⚙️</span>
					<span class="sidebar-item-label">设置</span>
				</div>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main class="main-content">
			<div class="content-container">
				<!-- View Content -->
				<div class="view-wrapper">
					<CalendarView
						v-if="currentViewMode === 'calendar'"
						@event-click="handleEventClick" />
					<ListView
						v-else-if="currentViewMode === 'list'"
						@event-click="handleEventClick" />
					<StatisticsView v-else-if="currentViewMode === 'statistics'" />
				</div>
			</div>
		</main>

		<!-- Event Details Dialog -->
		<EventDialog
			v-model:visible="eventDialogVisible"
			:event="selectedEvent"
			@save="handleEventSave"
			@delete="handleEventDelete" />

		<!-- Import/Export Dialog -->
		<el-dialog
			v-model="importExportDialogVisible"
			title="导入/导出"
			width="600px"
			:close-on-click-modal="false">
			<ImportExport />
		</el-dialog>

		<!-- Theme Settings Dialog -->
		<el-dialog
			v-model="themeSettingsDialogVisible"
			title="主题设置"
			width="700px"
			:close-on-click-modal="false">
			<ThemeSettings />
		</el-dialog>

		<!-- Share Dialog -->
		<ShareDialog v-model:visible="shareDialogVisible" :events="events" />

		<!-- Tag Manager Dialog -->
		<el-dialog
			v-model="tagManagerDialogVisible"
			title="标签管理"
			width="800px"
			:close-on-click-modal="false">
			<TagManager @tags-changed="handleTagsChanged" />
		</el-dialog>

		<!-- Floating Input - ChatGPT Style -->
		<!-- Only show in calendar and list views -->
		<FloatingInput
			v-if="currentViewMode === 'calendar' || currentViewMode === 'list'"
			@show-preview="handleShowPreview" />

		<!-- Preview Dialog - Independent floating window -->
		<PreviewDialog
			v-model:visible="previewDialogVisible"
			:events="parsedEvents"
			:original-text="originalText"
			@confirm="handlePreviewConfirm"
			@cancel="handlePreviewCancel" />
	</div>
</template>

<style scoped>
/* Main Layout Container */
.app-layout {
	display: flex;
	min-height: 100vh;
	background-color: var(--bg-color);
}

/* Minimal Sidebar - 80px width with text labels */
.sidebar {
	width: 80px;
	height: 100vh;
	background: var(--bg-secondary);
	border-right: 1px solid var(--border-light);
	display: flex;
	flex-direction: column;
	position: fixed;
	left: 0;
	top: 0;
	z-index: 50;
	transition: all 0.3s ease;
	box-shadow: 2px 0 8px var(--shadow);
}

.sidebar-header {
	padding: var(--spacing-md) 0;
	display: flex;
	justify-content: center;
	border-bottom: 1px solid var(--border-light);
}

.sidebar-nav {
	flex: 1;
	padding: var(--spacing-sm) 0;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.sidebar-footer {
	padding: var(--spacing-sm) 0;
	border-top: 1px solid var(--border-light);
}

/* Sidebar Item */
.sidebar-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 72px;
	min-height: 64px;
	margin: 0 auto;
	padding: var(--spacing-xs);
	color: var(--text-secondary);
	cursor: pointer;
	transition: all 0.2s ease;
	border-radius: var(--radius-lg);
	position: relative;
	gap: 2px;
}

.sidebar-item:hover {
	background: var(--bg-hover);
	color: var(--text-primary);
}

.sidebar-item.active {
	background: var(--primary-color);
	color: white;
}

.sidebar-item-icon {
	font-size: 22px;
	line-height: 1;
}

.sidebar-item-label {
	font-size: 10px;
	font-weight: 500;
	text-align: center;
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

/* Divider */
.sidebar-divider {
	width: 32px;
	height: 1px;
	background: var(--border-light);
	margin: var(--spacing-sm) auto;
}

/* Main Content Area */
.main-content {
	margin-left: 80px;
	min-height: 100vh;
	flex: 1;
	display: flex;
	justify-content: center;
	transition: margin-left 0.3s ease;
	background: var(--bg-color);
}

/* Content container - Requirement 12.3: Whitespace for breathing room */
.content-container {
	width: 100%;
	max-width: 1200px;
	padding: var(--spacing-xl);
	animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* View wrapper - Requirement 12.3, 12.5: Adequate spacing, limited density */
.view-wrapper {
	background: var(--bg-secondary);
	border-radius: var(--radius-xl);
	box-shadow: 0 2px 12px var(--shadow);
	padding: var(--spacing-xl);
	min-height: 600px;
}

/* Responsive Design - Tablet */
@media (max-width: 768px) {
	.sidebar {
		width: 100%;
		height: 56px;
		bottom: 0;
		top: auto;
		border-right: none;
		border-top: 1px solid var(--border-light);
		flex-direction: row;
	}

	.sidebar-header {
		display: none;
	}

	.sidebar-nav {
		flex-direction: row;
		justify-content: space-around;
		padding: 0;
		flex: 1;
		overflow-x: auto;
		overflow-y: hidden;
	}

	.sidebar-footer {
		display: flex;
		flex-direction: row;
		border-top: none;
		border-left: 1px solid var(--border-light);
		padding: 0 var(--spacing-sm);
	}

	.sidebar-item {
		width: 64px;
		min-height: 56px;
	}

	.sidebar-item-label {
		font-size: 9px;
	}

	.sidebar-divider {
		display: none;
	}

	.main-content {
		margin-left: 0;
		margin-bottom: 56px;
	}

	.content-container {
		padding: var(--spacing-md);
	}

	.view-wrapper {
		padding: var(--spacing-md);
	}
}

/* Responsive Design - Mobile */
@media (max-width: 480px) {
	.content-container {
		padding: var(--spacing-sm);
	}

	.view-wrapper {
		padding: var(--spacing-sm);
		border-radius: var(--radius-lg);
	}
}

/* Large screens - add more breathing room - Requirement 12.3 */
@media (min-width: 1400px) {
	.content-container {
		padding: var(--spacing-2xl) var(--spacing-2xl);
	}

	.view-wrapper {
		padding: var(--spacing-2xl);
	}
}
</style>
