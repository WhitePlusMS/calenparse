<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import InputPanel from "./components/InputPanel.vue";
import CalendarView from "./components/CalendarView.vue";
import ListView from "./components/ListView.vue";
import StatisticsView from "./components/StatisticsView.vue";
import EventDialog from "./components/EventDialog.vue";
import ImportExport from "./components/ImportExport.vue";
import ThemeSettings from "./components/ThemeSettings.vue";
import ShareDialog from "./components/ShareDialog.vue";
import TagManager from "./components/TagManager.vue";
import { useEvents } from "@/composables/useEvents";
import { useTheme } from "@/composables/useTheme";
import type { CalendarEvent } from "@/types";

// Initialize theme on app startup
useTheme();

/**
 * Main Application Layout
 *
 * Requirements:
 * - Task 11.1: Create App.vue main layout
 * - Task 11.2: Integrate input panel
 * - Task 11.3: Integrate calendar view
 * - Task 11.4: Implement responsive layout
 * - Task 19: Integrate list view
 * - Task 20: Integrate timeline view
 */

// Composables
const { events, updateEvent, deleteEvent } = useEvents();

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
		// Error is already handled by useEvents composable
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
		// Error is already handled by useEvents composable
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
</script>

<template>
	<!-- Main Application Layout -->
	<div class="app-container">
		<!-- Header -->
		<header class="app-header">
			<div class="app-header__content">
				<h1 class="app-header__title">
					<span class="app-header__icon">📅</span>
					CalenParse
				</h1>
				<p class="app-header__subtitle">智能日历解析器</p>
			</div>
		</header>

		<!-- Main Content -->
		<main class="app-main">
			<div class="app-main__container">
				<!-- Input Panel Section -->
				<section class="app-section app-section--input">
					<InputPanel />
				</section>

				<!-- View Section (Calendar or List) -->
				<section class="app-section app-section--view">
					<div class="app-section__header">
						<h2 class="app-section__title">
							{{
								currentViewMode === "calendar"
									? "日历视图"
									: currentViewMode === "list"
									? "列表视图"
									: "统计分析"
							}}
						</h2>
						<div class="header-actions">
							<button
								class="action-button"
								@click="tagManagerDialogVisible = true"
								title="标签管理">
								<span class="button-icon">🏷️</span>
								<span class="button-label">标签</span>
							</button>
							<button
								class="action-button"
								@click="handleShareAllEvents"
								title="分享所有事件">
								<span class="button-icon">📤</span>
								<span class="button-label">分享</span>
							</button>
							<button
								class="action-button"
								@click="themeSettingsDialogVisible = true"
								title="主题设置">
								<span class="button-icon">🎨</span>
								<span class="button-label">主题</span>
							</button>
							<button
								class="action-button"
								@click="importExportDialogVisible = true"
								title="导入/导出">
								<span class="button-icon">📦</span>
								<span class="button-label">导入/导出</span>
							</button>
							<div class="view-mode-switcher">
								<button
									:class="[
										'view-mode-button',
										{
											active:
												currentViewMode ===
												'calendar',
										},
									]"
									@click="switchViewMode('calendar')"
									title="日历视图">
									<span class="view-mode-icon">📅</span>
									<span class="view-mode-label">日历</span>
								</button>
								<button
									:class="[
										'view-mode-button',
										{ active: currentViewMode === 'list' },
									]"
									@click="switchViewMode('list')"
									title="列表视图">
									<span class="view-mode-icon">📋</span>
									<span class="view-mode-label">列表</span>
								</button>
								<button
									:class="[
										'view-mode-button',
										{
											active:
												currentViewMode ===
												'statistics',
										},
									]"
									@click="switchViewMode('statistics')"
									title="统计分析">
									<span class="view-mode-icon">📊</span>
									<span class="view-mode-label">统计</span>
								</button>
							</div>
						</div>
					</div>
					<div class="app-section__content">
						<CalendarView
							v-if="currentViewMode === 'calendar'"
							@event-click="handleEventClick" />
						<ListView
							v-else-if="currentViewMode === 'list'"
							@event-click="handleEventClick" />
						<StatisticsView v-else-if="currentViewMode === 'statistics'" />
					</div>
				</section>
			</div>
		</main>

		<!-- Footer -->
		<footer class="app-footer">
			<p class="app-footer__text">CalenParse - 让日程管理更智能</p>
		</footer>

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
			<TagManager />
		</el-dialog>
	</div>
</template>

<style scoped>
/* Main Container */
.app-container {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: var(--bg-color);
}

/* Header */
.app-header {
	background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
	color: white;
	padding: 32px 24px;
	box-shadow: 0 2px 12px var(--shadow);
}

.app-header__content {
	max-width: 1400px;
	margin: 0 auto;
	text-align: center;
}

.app-header__title {
	margin: 0;
	font-size: 2.5em;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
}

.app-header__icon {
	font-size: 1.2em;
}

.app-header__subtitle {
	margin: 8px 0 0 0;
	font-size: 1.1em;
	font-weight: 400;
	opacity: 0.95;
}

/* Main Content */
.app-main {
	flex: 1;
	padding: 24px;
}

.app-main__container {
	max-width: 1400px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

/* Section Styles */
.app-section {
	background: var(--bg-secondary);
	border-radius: 12px;
	box-shadow: 0 2px 12px var(--shadow);
	overflow: hidden;
	transition: all 0.3s ease;
	animation: fadeInUp 0.5s ease-out;
}

.app-section:hover {
	box-shadow: 0 4px 16px var(--shadow);
	transform: translateY(-2px);
}

@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.app-section--input {
	padding: 0;
}

.app-section--view {
	padding: 24px;
}

.app-section__header {
	margin-bottom: 20px;
	padding-bottom: 16px;
	border-bottom: 2px solid var(--border-light);
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 16px;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 16px;
	flex-wrap: wrap;
}

.app-section__title {
	margin: 0;
	font-size: 1.5em;
	font-weight: 600;
	color: var(--text-primary);
	display: flex;
	align-items: center;
	gap: 8px;
}

/* Action Buttons */
.action-button {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 16px;
	border: 2px solid var(--primary-color);
	background: var(--bg-secondary);
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: 14px;
	font-weight: 500;
	color: var(--primary-color);
	box-shadow: 0 1px 3px var(--shadow);
}

.action-button:hover {
	background: var(--primary-color);
	color: white;
	border-color: var(--primary-dark);
	transform: translateY(-1px);
	box-shadow: 0 2px 6px var(--shadow);
}

.button-icon {
	font-size: 18px;
	line-height: 1;
}

.button-label {
	font-size: 14px;
	font-weight: 600;
}

/* View Mode Switcher */
.view-mode-switcher {
	display: flex;
	gap: 8px;
	padding: 4px;
	background: var(--bg-color);
	border-radius: 8px;
}

.view-mode-button {
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

.view-mode-button:hover {
	background: var(--primary-color);
	color: white;
	border-color: var(--primary-light);
	transform: translateY(-1px);
	box-shadow: 0 2px 6px var(--shadow);
}

.view-mode-button.active {
	background: var(--primary-color);
	color: white;
	border-color: var(--primary-color);
	box-shadow: 0 2px 8px var(--shadow);
}

.view-mode-button.active:hover {
	background: var(--primary-light);
	border-color: var(--primary-light);
}

.view-mode-icon {
	font-size: 18px;
	line-height: 1;
}

.view-mode-label {
	font-size: 14px;
	font-weight: 600;
}

.app-section__content {
	/* Calendar content wrapper */
}

/* Footer */
.app-footer {
	background: var(--bg-secondary);
	border-top: 1px solid var(--border-light);
	padding: 20px 24px;
	text-align: center;
}

.app-footer__text {
	margin: 0;
	font-size: 14px;
	color: var(--text-tertiary);
}

/* Responsive Design */
@media (max-width: 1200px) {
	.app-main__container {
		max-width: 100%;
	}
}

@media (max-width: 768px) {
	.app-header {
		padding: 24px 16px;
	}

	.app-header__title {
		font-size: 1.8em;
	}

	.app-header__subtitle {
		font-size: 1em;
	}

	.app-main {
		padding: 16px;
	}

	.app-main__container {
		gap: 16px;
	}

	.app-section--view {
		padding: 16px;
	}

	.app-section__header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.app-section__title {
		font-size: 1.3em;
	}

	.header-actions {
		width: 100%;
		flex-direction: column;
	}

	.action-button {
		width: 100%;
		justify-content: center;
	}

	.view-mode-switcher {
		width: 100%;
		justify-content: center;
	}
}

@media (max-width: 480px) {
	.app-header {
		padding: 20px 12px;
	}

	.app-header__title {
		font-size: 1.5em;
		flex-direction: column;
		gap: 8px;
	}

	.app-header__subtitle {
		font-size: 0.9em;
	}

	.app-main {
		padding: 12px;
	}

	.app-section--view {
		padding: 12px;
	}

	.app-section__title {
		font-size: 1.2em;
	}

	.view-mode-button {
		padding: 6px 12px;
		font-size: 13px;
	}

	.view-mode-icon {
		font-size: 16px;
	}

	.view-mode-label {
		font-size: 13px;
	}

	.app-footer {
		padding: 16px 12px;
	}

	.app-footer__text {
		font-size: 12px;
	}
}
</style>
