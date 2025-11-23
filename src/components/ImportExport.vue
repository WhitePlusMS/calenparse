<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useEvents } from "@/composables/useEvents";
import type { CalendarEvent } from "@/types";
import {
	exportToICalendar,
	exportToJSON,
	downloadFile,
	parseICalendar,
	parseJSON,
	createBackup,
	restoreBackup,
} from "@/utils/import-export";
import dayjs from "dayjs";

/**
 * Import/Export Component
 * Implements requirements 11.1-11.12
 * Task 23.1: Export functionality
 * Task 23.2: Import functionality
 * Task 23.3: Backup and restore
 */

const { events, createEvent } = useEvents();

// UI state
const activeTab = ref<"export" | "import">("export");
const exportFormat = ref<"ical" | "json">("ical");
const selectedEventIds = ref<Set<string>>(new Set());
const selectAll = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const conflictResolution = ref<"skip" | "overwrite" | "merge">("skip");

// Computed
const hasEvents = computed(() => events.value.length > 0);
const selectedCount = computed(() => selectedEventIds.value.size);
const allSelected = computed(() => {
	return hasEvents.value && selectedEventIds.value.size === events.value.length;
});

// Toggle select all
const toggleSelectAll = () => {
	if (allSelected.value) {
		selectedEventIds.value.clear();
		selectAll.value = false;
	} else {
		selectedEventIds.value = new Set(events.value.map((e) => e.id));
		selectAll.value = true;
	}
};

// Toggle individual event selection
const toggleEventSelection = (eventId: string) => {
	if (selectedEventIds.value.has(eventId)) {
		selectedEventIds.value.delete(eventId);
	} else {
		selectedEventIds.value.add(eventId);
	}
	selectAll.value = allSelected.value;
};

// Export functions
const handleExport = async () => {
	try {
		const eventsToExport =
			selectedCount.value > 0
				? events.value.filter((e) => selectedEventIds.value.has(e.id))
				: events.value;

		if (eventsToExport.length === 0) {
			ElMessage.warning("没有可导出的事件");
			return;
		}

		const timestamp = dayjs().format("YYYYMMDD_HHmmss");
		const isFullExport = selectedCount.value === 0 || selectedCount.value === events.value.length;

		if (exportFormat.value === "ical") {
			const content = exportToICalendar(eventsToExport);
			const filename = isFullExport
				? `calendar_backup_${timestamp}.ics`
				: `calendar_${timestamp}.ics`;
			downloadFile(content, filename, "text/calendar");
			ElMessage.success(`已导出 ${eventsToExport.length} 个事件到 iCal 格式`);
		} else {
			// JSON format - use backup format for full export
			const content = isFullExport
				? JSON.stringify(createBackup(eventsToExport), null, 2)
				: exportToJSON(eventsToExport);
			const filename = isFullExport
				? `calendar_backup_${timestamp}.json`
				: `calendar_${timestamp}.json`;
			downloadFile(content, filename, "application/json");
			ElMessage.success(
				`已导出 ${eventsToExport.length} 个事件到 JSON 格式${
					isFullExport ? "（完整备份）" : ""
				}`
			);
		}
	} catch (error) {
		console.error("Export error:", error);
		ElMessage.error(error instanceof Error ? error.message : "导出失败");
	}
};

// Import functions
const triggerImportFile = () => {
	importFileInput.value?.click();
};

const handleImportFile = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];

	if (!file) return;

	try {
		let parsedEvents: Partial<CalendarEvent>[] = [];
		let isBackupFile = false;

		if (file.name.endsWith(".ics")) {
			const content = await file.text();
			parsedEvents = parseICalendar(content);
		} else if (file.name.endsWith(".json")) {
			const content = await file.text();
			// Try to parse as backup first
			try {
				parsedEvents = await restoreBackup(file);
				isBackupFile = true;
			} catch {
				// If not a backup, try regular JSON
				parsedEvents = parseJSON(content);
			}
		} else {
			ElMessage.error("不支持的文件格式，请选择 .ics 或 .json 文件");
			return;
		}

		if (parsedEvents.length === 0) {
			ElMessage.warning("文件中没有找到有效的事件");
			return;
		}

		// Warn if importing backup with existing data
		if (isBackupFile && events.value.length > 0) {
			await ElMessageBox.confirm(
				`检测到备份文件，包含 ${parsedEvents.length} 个事件。当前已有 ${events.value.length} 个事件，导入可能产生重复。是否继续？`,
				"导入备份",
				{
					confirmButtonText: "继续导入",
					cancelButtonText: "取消",
					type: "warning",
				}
			);
		}

		// Import events
		await importEvents(parsedEvents);

		ElMessage.success(`成功导入 ${parsedEvents.length} 个事件${isBackupFile ? "（备份文件）" : ""}`);
	} catch (error) {
		if (error === "cancel") {
			return;
		}
		console.error("Import error:", error);
		ElMessage.error(error instanceof Error ? error.message : "导入失败");
	} finally {
		// Reset file input
		if (target) target.value = "";
	}
};

// Import events with conflict handling
const importEvents = async (parsedEvents: Partial<CalendarEvent>[]) => {
	let successCount = 0;
	let skipCount = 0;

	for (const event of parsedEvents) {
		try {
			// Check for conflicts (same title and similar time)
			const hasConflict = events.value.some((existing) => {
				return (
					existing.title === event.title &&
					event.startTime &&
					Math.abs(existing.startTime.getTime() - event.startTime.getTime()) < 3600000 // Within 1 hour
				);
			});

			if (hasConflict && conflictResolution.value === "skip") {
				skipCount++;
				continue;
			}

			// Create event
			await createEvent({
				title: event.title!,
				startTime: event.startTime!,
				endTime: event.endTime!,
				isAllDay: event.isAllDay || false,
				location: event.location,
				description: event.description,
				originalText: event.originalText,
				tagIds: event.tagIds,
			});

			successCount++;
		} catch (error) {
			console.error("Failed to import event:", error);
		}
	}

	if (skipCount > 0) {
		ElMessage.info(`跳过了 ${skipCount} 个冲突的事件`);
	}
};
</script>

<template>
	<div class="import-export">
		<!-- Tab Navigation -->
		<div class="tabs">
			<button
				:class="['tab-button', { active: activeTab === 'export' }]"
				@click="activeTab = 'export'">
				📤 导出
			</button>
			<button
				:class="['tab-button', { active: activeTab === 'import' }]"
				@click="activeTab = 'import'">
				📥 导入
			</button>
		</div>

		<!-- Export Tab -->
		<div v-if="activeTab === 'export'" class="tab-content">
			<h3 class="section-title">导出事件</h3>

			<!-- Format Selection -->
			<div class="form-group">
				<label class="form-label">导出格式</label>
				<div class="radio-group">
					<label class="radio-label">
						<input v-model="exportFormat" type="radio" value="ical" />
						<span>iCalendar (.ics)</span>
					</label>
					<label class="radio-label">
						<input v-model="exportFormat" type="radio" value="json" />
						<span>JSON (.json)</span>
					</label>
				</div>
			</div>

			<!-- Event Selection -->
			<div class="form-group">
				<div class="form-label-row">
					<label class="form-label">选择事件</label>
					<button class="link-button" @click="toggleSelectAll">
						{{ allSelected ? "取消全选" : "全选" }}
					</button>
				</div>

				<div v-if="hasEvents" class="event-list">
					<div
						v-for="event in events"
						:key="event.id"
						class="event-item"
						@click="toggleEventSelection(event.id)">
						<input
							type="checkbox"
							:checked="selectedEventIds.has(event.id)"
							@click.stop="toggleEventSelection(event.id)" />
						<div class="event-info">
							<div class="event-title">{{ event.title }}</div>
							<div class="event-time">
								{{ dayjs(event.startTime).format("YYYY-MM-DD HH:mm") }}
							</div>
						</div>
					</div>
				</div>
				<div v-else class="empty-state">暂无事件</div>

				<div v-if="selectedCount > 0" class="selection-info">
					已选择 {{ selectedCount }} 个事件
				</div>
			</div>

			<!-- Export Button -->
			<div class="form-actions">
				<button class="btn btn-primary" :disabled="!hasEvents" @click="handleExport">
					导出{{ selectedCount > 0 ? `选中的 ${selectedCount} 个` : "全部" }}事件
				</button>
				<p v-if="selectedCount === 0 || selectedCount === events.length" class="form-hint">
					💾 导出全部事件时，JSON 格式将自动包含备份元数据（版本号、备份时间等）
				</p>
			</div>
		</div>

		<!-- Import Tab -->
		<div v-if="activeTab === 'import'" class="tab-content">
			<h3 class="section-title">导入事件</h3>

			<div class="form-group">
				<label class="form-label">冲突处理</label>
				<div class="radio-group">
					<label class="radio-label">
						<input v-model="conflictResolution" type="radio" value="skip" />
						<span>跳过冲突事件</span>
					</label>
					<label class="radio-label">
						<input v-model="conflictResolution" type="radio" value="overwrite" />
						<span>覆盖现有事件</span>
					</label>
				</div>
				<p class="form-hint">冲突定义：标题相同且时间相差在 1 小时内的事件</p>
			</div>

			<div class="form-actions">
				<button class="btn btn-primary" @click="triggerImportFile">选择文件导入</button>
				<p class="form-hint">
					支持 .ics 和 .json 格式<br />
					💾 系统会自动识别备份文件并提示
				</p>
			</div>

			<input
				ref="importFileInput"
				type="file"
				accept=".ics,.json"
				style="display: none"
				@change="handleImportFile" />
		</div>
	</div>
</template>

<style scoped>
.import-export {
	background: var(--bg-secondary);
	border-radius: 8px;
	overflow: hidden;
}

/* Tabs */
.tabs {
	display: flex;
	border-bottom: 2px solid #e4e7ed;
	background: #f5f7fa;
}

.tab-button {
	flex: 1;
	padding: 16px 24px;
	border: none;
	background: transparent;
	font-size: 16px;
	font-weight: 500;
	color: #606266;
	cursor: pointer;
	transition: all 0.3s ease;
	border-bottom: 3px solid transparent;
}

.tab-button:hover {
	background: #ecf5ff;
	color: #409eff;
}

.tab-button.active {
	background: var(--bg-secondary);
	color: var(--primary-color);
	border-bottom-color: var(--primary-color);
}

/* Tab Content */
.tab-content {
	padding: 24px;
}

.section-title {
	margin: 0 0 24px 0;
	font-size: 20px;
	font-weight: 600;
	color: #303133;
}

.subsection-title {
	margin: 0 0 12px 0;
	font-size: 16px;
	font-weight: 600;
	color: #303133;
}

/* Form */
.form-group {
	margin-bottom: 24px;
}

.form-label {
	display: block;
	margin-bottom: 12px;
	font-size: 14px;
	font-weight: 600;
	color: #606266;
}

.form-label-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}

.form-hint {
	margin: 8px 0 0 0;
	font-size: 13px;
	color: #909399;
}

.form-hint.warning {
	color: #e6a23c;
	font-weight: 500;
}

.radio-group {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.radio-label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: #606266;
	cursor: pointer;
}

.radio-label input[type="radio"] {
	cursor: pointer;
}

/* Event List */
.event-list {
	max-height: 300px;
	overflow-y: auto;
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	padding: 8px;
}

.event-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
	border-radius: 4px;
	cursor: pointer;
	transition: background 0.2s ease;
}

.event-item:hover {
	background: #f5f7fa;
}

.event-item input[type="checkbox"] {
	cursor: pointer;
}

.event-info {
	flex: 1;
}

.event-title {
	font-size: 14px;
	font-weight: 500;
	color: #303133;
	margin-bottom: 4px;
}

.event-time {
	font-size: 12px;
	color: #909399;
}

.selection-info {
	margin-top: 12px;
	font-size: 13px;
	color: #409eff;
	font-weight: 500;
}

.empty-state {
	padding: 40px;
	text-align: center;
	color: #909399;
	font-size: 14px;
}

/* Buttons */
.form-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.btn {
	padding: 12px 24px;
	border: none;
	border-radius: 4px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
}

.btn-primary {
	background: #409eff;
	color: white;
}

.btn-primary:hover:not(:disabled) {
	background: #66b1ff;
}

.btn-primary:disabled {
	background: #a0cfff;
	cursor: not-allowed;
}

.btn-secondary {
	background: #909399;
	color: white;
}

.btn-secondary:hover {
	background: #a6a9ad;
}

.link-button {
	padding: 4px 8px;
	border: none;
	background: transparent;
	color: #409eff;
	font-size: 13px;
	cursor: pointer;
	transition: color 0.3s ease;
}

.link-button:hover {
	color: #66b1ff;
	text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
	.tab-content {
		padding: 16px;
	}

	.tab-button {
		padding: 12px 16px;
		font-size: 14px;
	}

	.event-list {
		max-height: 200px;
	}
}
</style>
