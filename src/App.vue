<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { WarningFilled } from "@element-plus/icons-vue";
import CalendarView from "./components/CalendarView.vue";
import ListView from "./components/ListView.vue";
import StatisticsView from "./components/StatisticsView.vue";
import EventDialog from "./components/EventDialog.vue";
import ImportExport from "./components/ImportExport.vue";
import ThemeSettings from "./components/ThemeSettings.vue";
import ShareDialog from "./components/ShareDialog.vue";
import TagManager from "./components/TagManager.vue";
import TemplateManager from "./components/TemplateManager.vue";
import FloatingInput from "./components/FloatingInput.vue";
import PreviewDialog from "./components/PreviewDialog.vue";
import VisitorBanner from "./components/VisitorBanner.vue";
import AdminLoginDialog from "./components/AdminLoginDialog.vue";
import MonitoringPage from "./components/MonitoringPage.vue";
import { useEvents } from "@/composables/useEvents";
import { useTheme } from "@/composables/useTheme";
import { useSupabase } from "@/composables/useSupabase";
import { useAuth } from "@/composables/useAuth";
import type { CalendarEvent, ParsedEvent, VisitorQuota } from "@/types";

// Initialize theme on app startup
const { toggleMode, theme } = useTheme();

// Initialize auth (身份检查)
const { isAuthChecking, mode, isAdmin, getVisitorQuota, logout } = useAuth();

// 访客配额状态
const visitorQuota = ref<VisitorQuota>({
	llmRemaining: 1,
	eventsUsed: 0,
	eventsRemaining: 3,
});

// 管理员登录对话框
const adminLoginDialogVisible = ref(false);

/**
 * Main Application Layout - Minimal Sidebar Design
 *
 * Requirements:
 * - 需求 1.1, 1.2, 1.3: 极简侧边栏布局，导航和主内容区域分离
 * - 需求 1.4: 移动端响应式适配
 * - 需求 1.5: 平滑过渡动画
 */

// Composables
const {
	events,
	updateEvent,
	deleteEvent,
	createEvent,
	fetchEvents,
	ensureInitialized,
	error: eventsError,
	refreshEvents,
} = useEvents();
const { getAllTags } = useSupabase();

// View mode: 'calendar', 'list', 'statistics', 'monitoring'
const currentViewMode = ref<"calendar" | "list" | "statistics" | "monitoring">("calendar");

// Tools section collapsed state
const toolsCollapsed = ref(false);

// Handle event click from CalendarView or ListView
const selectedEvent = ref<CalendarEvent | null>(null);
const eventDialogVisible = ref(false);

// Quick create state
const quickCreateData = ref<{ startTime: Date; endTime: Date; isAllDay: boolean } | undefined>(undefined);

// Import/Export dialog
const importExportDialogVisible = ref(false);

// Theme settings dialog
const themeSettingsDialogVisible = ref(false);

// Share dialog
const shareDialogVisible = ref(false);
const eventsToShare = ref<CalendarEvent[]>([]);

// Tag manager dialog
const tagManagerDialogVisible = ref(false);

// Template manager dialog
const templateManagerDialogVisible = ref(false);

// Preview dialog state
const previewDialogVisible = ref(false);
const parsedEvents = ref<ParsedEvent[]>([]);
const originalText = ref("");

// Filtered events state - Requirement 4.1, 4.4, 5.4, 6.4, 7.3
const filteredEvents = ref<CalendarEvent[]>([]);

// Handle filtered events from SearchBar
const handleFilteredEvents = (events: CalendarEvent[]) => {
	filteredEvents.value = events;
};

const handleEventClick = (event: CalendarEvent) => {
	selectedEvent.value = event;
	quickCreateData.value = undefined;
	eventDialogVisible.value = true;
};

// Handle quick create from CalendarView double-click
// Requirement 3.1, 3.2: Open dialog with pre-filled date/time
const handleQuickCreate = (data: { startTime: Date; endTime: Date; isAllDay: boolean }) => {
	selectedEvent.value = null;
	quickCreateData.value = data;
	eventDialogVisible.value = true;
};

// Handle event save from EventDialog
const handleEventSave = async (event: CalendarEvent) => {
	try {
		if (event.id) {
			// Update existing event
			await updateEvent(event.id, {
				title: event.title,
				startTime: event.startTime,
				endTime: event.endTime,
				isAllDay: event.isAllDay,
				location: event.location,
				description: event.description,
				originalText: event.originalText,
				tagIds: event.tagIds,
			});
			ElMessage.success("事件已更新");
		} else {
			// Create new event (quick create mode)
			await createEvent({
				title: event.title,
				startTime: event.startTime,
				endTime: event.endTime,
				isAllDay: event.isAllDay,
				location: event.location,
				description: event.description,
				originalText: event.originalText,
				tagIds: event.tagIds,
			});
			ElMessage.success("事件已创建");
		}
		eventDialogVisible.value = false;
		quickCreateData.value = undefined;
	} catch (error) {
		console.error("Failed to save event:", error);
		// 配额错误已经在 useVisitorEvents 中显示了友好提示，这里不重复显示
		if (error instanceof Error && error.message === "事件配额已满") {
			// 配额错误，不显示通用错误提示
		} else {
			ElMessage.error("保存事件失败");
		}
	} finally {
		// 无论成功还是失败，都刷新配额显示
		await loadVisitorQuota();
	}
};

// Handle event delete from EventDialog
const handleEventDelete = async (id: string) => {
	try {
		await deleteEvent(id);
		eventDialogVisible.value = false;
		selectedEvent.value = null;
		quickCreateData.value = undefined;
		ElMessage.success("事件已删除");
	} catch (error) {
		console.error("Failed to delete event:", error);
	}
};

// Switch view mode
const switchViewMode = (mode: "calendar" | "list" | "statistics" | "monitoring") => {
	currentViewMode.value = mode;
};

// Open share dialog (from toolbar - let user select events)
const handleShareAllEvents = () => {
	if (events.value.length === 0) {
		ElMessage.warning("暂无事件可分享");
		return;
	}
	// Don't pre-select any events, let user choose in the dialog
	eventsToShare.value = [];
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
	let successCount = 0;
	try {
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

			try {
				await createEvent(eventData);
				successCount++;
			} catch (err) {
				// 如果是配额错误，停止创建更多事件
				if (err instanceof Error && err.message === "事件配额已满") {
					break;
				}
				// 其他错误继续尝试创建下一个事件
				console.warn("创建事件失败:", err);
			}
		}

		if (successCount > 0) {
			ElMessage.success(`成功创建 ${successCount} 个日程事件`);
		}
		previewDialogVisible.value = false;
		parsedEvents.value = [];
		originalText.value = "";
	} catch (err) {
		console.error("Failed to create events:", err);
		if (!(err instanceof Error && err.message === "事件配额已满")) {
			ElMessage.error("创建事件失败");
		}
	} finally {
		// 无论成功还是失败，都刷新配额显示
		await loadVisitorQuota();
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

// Handle edit template
const handleEditTemplate = (template: CalendarEvent) => {
	selectedEvent.value = template;
	quickCreateData.value = undefined;
	eventDialogVisible.value = true;
	templateManagerDialogVisible.value = false;
};

// 加载访客配额
const loadVisitorQuota = async () => {
	if (mode.value === "visitor") {
		try {
			visitorQuota.value = await getVisitorQuota();
		} catch (error) {
			console.error("Failed to load visitor quota:", error);
		}
	}
};

// 处理登录成功
const handleLoginSuccess = async () => {
	adminLoginDialogVisible.value = false;
	ElMessage.success("欢迎回来，管理员");
	// 刷新事件列表
	await fetchEvents();
};

// 处理登录/登出按钮点击
const handleAuthButtonClick = async () => {
	if (isAdmin.value) {
		// 管理员模式 - 显示登出确认
		try {
			await ElMessageBox.confirm("确定要退出管理员模式吗？退出后将切换到访客模式。", "确认登出", {
				confirmButtonText: "登出",
				cancelButtonText: "取消",
				type: "warning",
			});

			// 用户确认登出
			await logout();
			ElMessage.success("已退出管理员模式");

			// 刷新访客配额
			await loadVisitorQuota();

			// 刷新事件列表（切换到访客事件）
			await fetchEvents();

			// 如果当前在监控页面，切换到日历视图
			if (currentViewMode.value === "monitoring") {
				currentViewMode.value = "calendar";
			}
		} catch (error) {
			// 用户取消或登出失败
			if (error !== "cancel") {
				console.error("Logout failed:", error);
			}
		}
	} else {
		// 访客模式 - 打开登录对话框
		adminLoginDialogVisible.value = true;
	}
};

// 监听身份检查完成，初始化事件和配额
import { watch } from "vue";
watch(
	isAuthChecking,
	async (checking) => {
		if (!checking) {
			// 身份检查完成，初始化事件
			await ensureInitialized();
			// 注意：不需要 try-catch，错误已在 useEvents 中处理
			// eventsError.value 会自动更新，UI 会显示错误状态

			// 如果是访客模式，加载配额
			if (mode.value === "visitor") {
				await loadVisitorQuota();
			}
		}
	},
	{ immediate: true }
);

// 处理事件加载重试
const handleEventsRetry = async () => {
	await refreshEvents();
	// 如果是访客模式，同时刷新配额
	if (mode.value === "visitor") {
		await loadVisitorQuota();
	}
};
</script>

<template>
	<!-- 全屏 Loading - 身份检查中 -->
	<div v-if="isAuthChecking" class="auth-loading-overlay">
		<el-icon class="is-loading" :size="40">
			<Refresh />
		</el-icon>
		<p class="loading-text">正在加载...</p>
	</div>

	<!-- 主应用内容 - 身份确定后显示 -->
	<div v-else class="app-layout">
		<!-- 全局错误提示 - 事件加载失败 -->
		<div v-if="eventsError" class="global-error-banner">
			<el-icon class="error-icon"><WarningFilled /></el-icon>
			<span class="error-message">{{ eventsError }}</span>
			<button class="retry-button-small" @click="handleEventsRetry">重试</button>
		</div>

		<!-- Minimal Sidebar -->
		<aside class="sidebar">
			<!-- Main Navigation -->
			<nav class="sidebar-nav">
				<!-- View Navigation -->
				<div
					:class="['sidebar-item', { active: currentViewMode === 'calendar' }]"
					@click="switchViewMode('calendar')"
					title="日历视图">
					<el-icon class="sidebar-item-icon"><Calendar /></el-icon>
					<span class="sidebar-item-label">日历</span>
				</div>

				<div
					:class="['sidebar-item', { active: currentViewMode === 'list' }]"
					@click="switchViewMode('list')"
					title="列表视图">
					<el-icon class="sidebar-item-icon"><List /></el-icon>
					<span class="sidebar-item-label">列表</span>
				</div>

				<div
					:class="['sidebar-item', { active: currentViewMode === 'statistics' }]"
					@click="switchViewMode('statistics')"
					title="统计分析">
					<el-icon class="sidebar-item-icon"><DataAnalysis /></el-icon>
					<span class="sidebar-item-label">统计</span>
				</div>

				<!-- 监控页面（仅管理员可见） -->
				<div
					v-if="isAdmin"
					:class="['sidebar-item', { active: currentViewMode === 'monitoring' }]"
					@click="switchViewMode('monitoring')"
					title="访客监控">
					<el-icon class="sidebar-item-icon"><User /></el-icon>
					<span class="sidebar-item-label">监控</span>
				</div>

				<div class="sidebar-divider"></div>

				<!-- Tools Section -->
				<div class="sidebar-section">
					<div
						class="sidebar-item sidebar-section-header"
						@click="toolsCollapsed = !toolsCollapsed"
						title="工具">
						<el-icon class="sidebar-item-icon"><SetUp /></el-icon>
						<span class="sidebar-item-label">工具</span>
						<span class="sidebar-collapse-icon">{{
							toolsCollapsed ? "▶" : "▼"
						}}</span>
					</div>

					<div v-show="!toolsCollapsed" class="sidebar-section-content">
						<div
							class="sidebar-item sidebar-sub-item"
							@click="templateManagerDialogVisible = true"
							title="模板管理">
							<el-icon class="sidebar-item-icon"><Document /></el-icon>
							<span class="sidebar-item-label">模板</span>
						</div>

						<div
							class="sidebar-item sidebar-sub-item"
							@click="tagManagerDialogVisible = true"
							title="标签管理">
							<el-icon class="sidebar-item-icon"><PriceTag /></el-icon>
							<span class="sidebar-item-label">标签</span>
						</div>

						<div
							class="sidebar-item sidebar-sub-item"
							@click="handleShareAllEvents"
							title="分享">
							<el-icon class="sidebar-item-icon"><Share /></el-icon>
							<span class="sidebar-item-label">分享</span>
						</div>

						<div
							class="sidebar-item sidebar-sub-item"
							@click="importExportDialogVisible = true"
							title="导入/导出">
							<el-icon class="sidebar-item-icon"><Box /></el-icon>
							<span class="sidebar-item-label">导入导出</span>
						</div>
					</div>
				</div>
			</nav>

			<!-- Footer Actions -->
			<div class="sidebar-footer">
				<div
					class="sidebar-item"
					@click="toggleMode"
					:title="`切换到${theme.mode === 'light' ? '深色' : '浅色'}模式`">
					<el-icon class="sidebar-item-icon">
						<Moon v-if="theme.mode === 'light'" />
						<Sunny v-else />
					</el-icon>
					<span class="sidebar-item-label">{{
						theme.mode === "light" ? "Dark" : "Light"
					}}</span>
				</div>

				<div class="sidebar-item" @click="themeSettingsDialogVisible = true" title="设置">
					<el-icon class="sidebar-item-icon"><Setting /></el-icon>
					<span class="sidebar-item-label">设置</span>
				</div>

				<!-- 登录/登出按钮 -->
				<div
					class="sidebar-item"
					@click="handleAuthButtonClick"
					:title="isAdmin ? '管理员登出' : '管理员登录'">
					<el-icon class="sidebar-item-icon">
						<UserFilled v-if="isAdmin" />
						<Lock v-else />
					</el-icon>
					<span class="sidebar-item-label">{{ isAdmin ? "登出" : "登录" }}</span>
				</div>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main class="main-content">
			<div class="content-container">
				<!-- 访客模式横幅 -->
				<VisitorBanner v-if="mode === 'visitor'" :quota="visitorQuota" />

				<!-- View Content -->
				<div class="view-wrapper">
					<CalendarView
						v-if="currentViewMode === 'calendar'"
						:filtered-events="filteredEvents"
						@event-click="handleEventClick"
						@quick-create="handleQuickCreate"
						@filtered="handleFilteredEvents" />
					<ListView
						v-else-if="currentViewMode === 'list'"
						:filtered-events="filteredEvents"
						@event-click="handleEventClick"
						@filtered="handleFilteredEvents" />
					<StatisticsView v-else-if="currentViewMode === 'statistics'" />
					<MonitoringPage v-else-if="currentViewMode === 'monitoring'" />
				</div>
			</div>
		</main>

		<!-- Event Details Dialog -->
		<EventDialog
			v-model:visible="eventDialogVisible"
			:event="selectedEvent"
			:quick-create-data="quickCreateData"
			@save="handleEventSave"
			@delete="handleEventDelete" />

		<!-- Import/Export Dialog -->
		<el-dialog v-model="importExportDialogVisible" title="导入/导出" width="600px">
			<ImportExport />
		</el-dialog>

		<!-- Theme Settings Dialog -->
		<el-dialog v-model="themeSettingsDialogVisible" title="主题设置" width="700px">
			<ThemeSettings />
		</el-dialog>

		<!-- Share Dialog -->
		<ShareDialog v-model:visible="shareDialogVisible" :events="eventsToShare" />

		<!-- Tag Manager Dialog -->
		<el-dialog v-model="tagManagerDialogVisible" title="标签管理" width="800px">
			<TagManager @tags-changed="handleTagsChanged" />
		</el-dialog>

		<!-- Template Manager Dialog -->
		<el-dialog v-model="templateManagerDialogVisible" title="模板管理" width="1000px">
			<TemplateManager @edit-template="handleEditTemplate" />
		</el-dialog>

		<!-- Floating Input - ChatGPT Style -->
		<!-- Only show in calendar and list views -->
		<FloatingInput
			v-if="currentViewMode === 'calendar' || currentViewMode === 'list'"
			@show-preview="handleShowPreview"
			@quota-changed="loadVisitorQuota" />

		<!-- Preview Dialog - Independent floating window -->
		<PreviewDialog
			v-model:visible="previewDialogVisible"
			:events="parsedEvents"
			:original-text="originalText"
			@confirm="handlePreviewConfirm"
			@cancel="handlePreviewCancel" />

		<!-- Admin Login Dialog -->
		<AdminLoginDialog v-model:visible="adminLoginDialogVisible" @success="handleLoginSuccess" />
	</div>
</template>

<style scoped>
/* Auth Loading Overlay - 防止竞态条件闪烁 */
.auth-loading-overlay {
	position: fixed;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: var(--bg-color);
	z-index: 9999;
	gap: var(--spacing-md);
}

.loading-text {
	color: var(--text-secondary);
	font-size: 14px;
	margin: 0;
}

/* Global Error Banner - 事件加载失败提示 */
.global-error-banner {
	position: fixed;
	top: 0;
	left: 80px;
	right: 0;
	background: var(--danger-color);
	color: white;
	padding: var(--spacing-sm) var(--spacing-lg);
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	z-index: 100;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
	from {
		transform: translateY(-100%);
	}
	to {
		transform: translateY(0);
	}
}

.global-error-banner .error-icon {
	font-size: 20px;
}

.global-error-banner .error-message {
	flex: 1;
	font-size: 14px;
	font-weight: 500;
}

.global-error-banner .retry-button-small {
	padding: var(--spacing-xs) var(--spacing-md);
	background: white;
	color: var(--danger-color);
	border: none;
	border-radius: var(--radius-md);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
}

.global-error-banner .retry-button-small:hover {
	background: rgba(255, 255, 255, 0.9);
	transform: translateY(-1px);
}

.global-error-banner .retry-button-small:active {
	transform: translateY(0);
}

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

/* el-icon 作为图标容器时的样式 */
.sidebar-item .el-icon.sidebar-item-icon {
	font-size: 22px;
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

/* Sidebar Section (Collapsible) */
.sidebar-section {
	width: 100%;
}

.sidebar-section-header {
	position: relative;
}

.sidebar-collapse-icon {
	position: absolute;
	top: 4px;
	right: 4px;
	font-size: 8px;
	color: var(--text-secondary);
	transition: transform 0.2s ease;
}

.sidebar-section-content {
	animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-8px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.sidebar-sub-item {
	opacity: 0.85;
}

.sidebar-sub-item:hover {
	opacity: 1;
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

/* Content container - 增加最大宽度以减少留白 */
.content-container {
	width: 100%;
	max-width: 2000px;
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
	.global-error-banner {
		left: 0;
		bottom: 56px;
		top: auto;
		font-size: 13px;
	}

	.sidebar {
		width: 100%;
		height: 56px;
		bottom: 0;
		top: auto;
		border-right: none;
		border-top: 1px solid var(--border-light);
		flex-direction: row;
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
