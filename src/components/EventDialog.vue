<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
	ElDialog,
	ElForm,
	ElFormItem,
	ElInput,
	ElDatePicker,
	ElSwitch,
	ElButton,
	ElMessage,
	ElMessageBox,
	ElSelect,
	ElOption,
	ElTag,
} from "element-plus";
import dayjs from "dayjs";
import type { CalendarEvent, Tag } from "@/types";
import { useSupabase } from "@/composables/useSupabase";
import ShareDialog from "./ShareDialog.vue";

/**
 * EventDialog Component
 *
 * Displays full event details with view and edit modes
 * Supports saving changes and deleting events with confirmation
 *
 * Requirements:
 * - 3.3: Display complete event details including original announcement text
 * - 6.1: Provide editing options for calendar events
 * - 6.2: Update event information and reflect changes in calendar view
 * - 6.3: Remove event from calendar
 * - 6.4: Request user confirmation for delete operation
 */

interface Props {
	visible: boolean;
	event: CalendarEvent | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	"update:visible": [value: boolean];
	save: [event: CalendarEvent];
	delete: [id: string];
}>();

const { getAllTags, createTag } = useSupabase();

// Import useEvents for completion toggle
import { useEvents } from "@/composables/useEvents";
const { toggleEventCompletion } = useEvents();

// Share dialog state
const shareDialogVisible = ref(false);
const eventsToShare = computed(() => {
	return props.event ? [props.event] : [];
});

// Edit mode state
const isEditMode = ref(false);

// Local editable copy of the event
const editableEvent = ref<Partial<CalendarEvent>>({});

// Available tags
const availableTags = ref<Tag[]>([]);

// Load tags
const loadTags = async () => {
	try {
		availableTags.value = await getAllTags();
	} catch (error) {
		console.error("Failed to load tags:", error);
	}
};

// Get tag by ID
const getTagById = (id: string): Tag | undefined => {
	return availableTags.value.find((tag) => tag.id === id);
};

// Handle tag selection change
const handleTagChange = async (value: string[]) => {
	if (!value || value.length === 0) return;

	// Check if any new tag names were added (not IDs)
	const newTagNames = value.filter((item) => {
		// If it's not a valid UUID, it's a new tag name
		return !availableTags.value.some((tag) => tag.id === item);
	});

	if (newTagNames.length > 0) {
		// Create new tags
		for (const tagName of newTagNames) {
			await handleCreateTag(tagName);
		}

		// Remove the tag names from the array (they've been converted to IDs)
		editableEvent.value.tagIds = editableEvent.value.tagIds?.filter((item) => !newTagNames.includes(item));
	}
};

// Handle creating new tag when user types a new value
const handleCreateTag = async (tagName: string) => {
	if (!tagName || !tagName.trim()) return;

	try {
		// Check if tag already exists (case-insensitive)
		const normalizedName = tagName.trim().toLowerCase();
		const existingTag = availableTags.value.find((tag) => tag.name.toLowerCase() === normalizedName);

		if (existingTag) {
			// Tag already exists, just add its ID
			if (!editableEvent.value.tagIds) {
				editableEvent.value.tagIds = [];
			}
			if (!editableEvent.value.tagIds.includes(existingTag.id)) {
				editableEvent.value.tagIds.push(existingTag.id);
			}
			return;
		}

		// Create new tag with a random color
		const colors = [
			"#409EFF",
			"#67C23A",
			"#E6A23C",
			"#F56C6C",
			"#909399",
			"#B37FEB",
			"#FF85C0",
			"#13C2C2",
			"#52C41A",
			"#FA8C16",
		];
		const color = colors[Math.floor(Math.random() * colors.length)] || "#409EFF";

		const newTag = await createTag(tagName.trim(), color);

		// Add to available tags
		availableTags.value.push(newTag);

		// Add to event's tagIds
		if (!editableEvent.value.tagIds) {
			editableEvent.value.tagIds = [];
		}
		editableEvent.value.tagIds.push(newTag.id);

		ElMessage.success(`标签"${tagName}"创建成功`);
	} catch (error) {
		ElMessage.error(error instanceof Error ? error.message : "创建标签失败");
	}
};

// Initialize editable event when props change
watch(
	() => props.event,
	(newEvent) => {
		if (newEvent) {
			// Deep clone to avoid mutating props
			editableEvent.value = {
				id: newEvent.id,
				title: newEvent.title,
				startTime: new Date(newEvent.startTime),
				endTime: new Date(newEvent.endTime),
				isAllDay: newEvent.isAllDay,
				location: newEvent.location,
				description: newEvent.description,
				originalText: newEvent.originalText,
				tagIds: newEvent.tagIds ? [...newEvent.tagIds] : [],
				isCompleted: newEvent.isCompleted || false,
				createdAt: newEvent.createdAt,
				updatedAt: newEvent.updatedAt,
			};
			isEditMode.value = false;
		}
	},
	{ immediate: true }
);

onMounted(() => {
	loadTags();
});

// Date range for picker (combined start and end time)
const dateRange = computed({
	get: () => {
		if (editableEvent.value.startTime && editableEvent.value.endTime) {
			return [editableEvent.value.startTime, editableEvent.value.endTime];
		}
		return null;
	},
	set: (value: [Date, Date] | null) => {
		if (value && value.length === 2) {
			editableEvent.value.startTime = value[0];
			editableEvent.value.endTime = value[1];
		}
	},
});

// Format date for display
const formatDate = (date: Date | undefined): string => {
	if (!date) return "";
	return dayjs(date).format("YYYY-MM-DD HH:mm");
};

// Format date for display (short version)
const formatDateShort = (date: Date | undefined): string => {
	if (!date) return "";
	return dayjs(date).format("YYYY-MM-DD");
};

// Handle dialog close
const handleClose = () => {
	emit("update:visible", false);
	isEditMode.value = false;
};

// Enter edit mode
const enterEditMode = () => {
	isEditMode.value = true;
};

// Cancel editing
const cancelEdit = () => {
	// Restore original values
	if (props.event) {
		editableEvent.value = {
			id: props.event.id,
			title: props.event.title,
			startTime: new Date(props.event.startTime),
			endTime: new Date(props.event.endTime),
			isAllDay: props.event.isAllDay,
			location: props.event.location,
			description: props.event.description,
			originalText: props.event.originalText,
			tagIds: props.event.tagIds ? [...props.event.tagIds] : [],
			isCompleted: props.event.isCompleted || false,
			createdAt: props.event.createdAt,
			updatedAt: props.event.updatedAt,
		};
	}
	isEditMode.value = false;
};

// Save changes
const saveChanges = () => {
	// Validate required fields
	if (!editableEvent.value.title || !editableEvent.value.title.trim()) {
		ElMessage({
			message: "标题不能为空",
			type: "warning",
			duration: 3000,
			showClose: true,
		});
		return;
	}

	if (!editableEvent.value.startTime || !editableEvent.value.endTime) {
		ElMessage({
			message: "请选择开始和结束时间",
			type: "warning",
			duration: 3000,
			showClose: true,
		});
		return;
	}

	// Validate time range
	if (editableEvent.value.startTime >= editableEvent.value.endTime) {
		ElMessage({
			message: "结束时间必须晚于开始时间",
			type: "warning",
			duration: 3000,
			showClose: true,
		});
		return;
	}

	// Emit save event with updated data
	emit("save", editableEvent.value as CalendarEvent);
	isEditMode.value = false;
};

// Delete event with confirmation
const handleDelete = async () => {
	try {
		// Requirement 6.4: Request user confirmation for delete operation
		await ElMessageBox.confirm("确定要删除这个事件吗？此操作无法撤销。", "确认删除", {
			confirmButtonText: "删除",
			cancelButtonText: "取消",
			type: "warning",
			confirmButtonClass: "el-button--danger",
		});

		// User confirmed, emit delete event
		if (editableEvent.value.id) {
			emit("delete", editableEvent.value.id);
			emit("update:visible", false);
		}
	} catch {
		// User cancelled, do nothing
	}
};

// Open share dialog
const handleShare = () => {
	shareDialogVisible.value = true;
};

// Toggle completion status in view mode
// Requirement 23.6: Toggle completion status and update all views
const handleToggleCompletion = async () => {
	if (!editableEvent.value.id) return;

	try {
		const updatedEvent = await toggleEventCompletion(editableEvent.value.id);
		// Update local state to reflect the change
		editableEvent.value.isCompleted = updatedEvent.isCompleted;
		ElMessage.success(updatedEvent.isCompleted ? "已标记为完成" : "已标记为未完成");
	} catch (error) {
		console.error("Toggle completion failed:", error);
		ElMessage.error("更新完成状态失败");
	}
};
</script>

<template>
	<el-dialog
		:model-value="visible"
		:title="isEditMode ? '编辑事件' : '事件详情'"
		width="600px"
		:before-close="handleClose"
		class="event-dialog">
		<div v-if="editableEvent" class="event-dialog__content">
			<!-- View Mode -->
			<div v-if="!isEditMode" class="event-dialog__view">
				<!-- Title -->
				<div class="event-dialog__section">
					<div class="event-dialog__label">标题</div>
					<div class="event-dialog__value event-dialog__value--title">
						{{ editableEvent.title }}
					</div>
				</div>

				<!-- Time -->
				<div class="event-dialog__section">
					<div class="event-dialog__label">时间</div>
					<div class="event-dialog__value">
						<div v-if="editableEvent.isAllDay">
							{{ formatDateShort(editableEvent.startTime) }} (全天)
						</div>
						<div v-else>
							<div>开始：{{ formatDate(editableEvent.startTime) }}</div>
							<div>结束：{{ formatDate(editableEvent.endTime) }}</div>
						</div>
					</div>
				</div>

				<!-- Completion Status -->
				<div class="event-dialog__section">
					<div class="event-dialog__label">完成状态</div>
					<div class="event-dialog__value">
						<el-button
							:type="editableEvent.isCompleted ? 'success' : 'info'"
							size="small"
							@click="handleToggleCompletion">
							<span class="completion-icon">
								{{ editableEvent.isCompleted ? "✓" : "○" }}
							</span>
							<span class="completion-text">
								{{ editableEvent.isCompleted ? "已完成" : "未完成" }}
							</span>
						</el-button>
					</div>
				</div>

				<!-- Location -->
				<div v-if="editableEvent.location" class="event-dialog__section">
					<div class="event-dialog__label">地点</div>
					<div class="event-dialog__value">{{ editableEvent.location }}</div>
				</div>

				<!-- Tags -->
				<div
					v-if="editableEvent.tagIds && editableEvent.tagIds.length > 0"
					class="event-dialog__section">
					<div class="event-dialog__label">标签</div>
					<div class="event-dialog__tags">
						<el-tag
							v-for="tagId in editableEvent.tagIds"
							:key="tagId"
							:color="getTagById(tagId)?.color"
							style="color: white; border: none; margin-right: 8px">
							{{ getTagById(tagId)?.name }}
						</el-tag>
					</div>
				</div>

				<!-- Description -->
				<div v-if="editableEvent.description" class="event-dialog__section">
					<div class="event-dialog__label">描述</div>
					<div class="event-dialog__value event-dialog__value--description">
						{{ editableEvent.description }}
					</div>
				</div>

				<!-- Original Text (Requirement 3.3) -->
				<div v-if="editableEvent.originalText" class="event-dialog__section">
					<div class="event-dialog__label">原始通告文本</div>
					<div class="event-dialog__original">
						{{ editableEvent.originalText }}
					</div>
				</div>

				<!-- Metadata -->
				<div class="event-dialog__metadata">
					<div class="event-dialog__metadata-item">
						创建时间：{{ formatDate(editableEvent.createdAt) }}
					</div>
					<div class="event-dialog__metadata-item">
						更新时间：{{ formatDate(editableEvent.updatedAt) }}
					</div>
				</div>
			</div>

			<!-- Edit Mode -->
			<el-form v-else label-width="100px" class="event-dialog__form">
				<!-- Title -->
				<el-form-item label="标题" required>
					<el-input
						v-model="editableEvent.title"
						placeholder="请输入事件标题"
						maxlength="200"
						show-word-limit />
				</el-form-item>

				<!-- Date and Time Range -->
				<el-form-item label="时间" required>
					<el-date-picker
						v-model="dateRange"
						type="datetimerange"
						range-separator="至"
						start-placeholder="开始时间"
						end-placeholder="结束时间"
						format="YYYY-MM-DD HH:mm"
						style="width: 100%" />
				</el-form-item>

				<!-- All-day event -->
				<el-form-item label="全天事件">
					<el-switch v-model="editableEvent.isAllDay" />
				</el-form-item>

				<!-- Completion Status -->
				<el-form-item label="完成状态">
					<el-switch
						v-model="editableEvent.isCompleted"
						active-text="已完成"
						inactive-text="未完成" />
				</el-form-item>

				<!-- Location -->
				<el-form-item label="地点">
					<el-input
						v-model="editableEvent.location"
						placeholder="请输入地点"
						maxlength="200"
						show-word-limit />
				</el-form-item>

				<!-- Tags -->
				<el-form-item label="标签">
					<el-select
						v-model="editableEvent.tagIds"
						multiple
						filterable
						allow-create
						default-first-option
						placeholder="选择或创建标签"
						no-data-text="暂无标签，输入名称创建新标签"
						style="width: 100%"
						@change="handleTagChange">
						<el-option
							v-for="tag in availableTags"
							:key="tag.id"
							:label="tag.name"
							:value="tag.id">
							<div style="display: flex; align-items: center; gap: 8px">
								<div
									style="
										width: 12px;
										height: 12px;
										border-radius: 2px;
									"
									:style="{ backgroundColor: tag.color }"></div>
								<span>{{ tag.name }}</span>
							</div>
						</el-option>
					</el-select>
				</el-form-item>

				<!-- Description -->
				<el-form-item label="描述">
					<el-input
						v-model="editableEvent.description"
						type="textarea"
						:rows="4"
						placeholder="请输入描述或备注"
						maxlength="1000"
						show-word-limit />
				</el-form-item>
			</el-form>
		</div>

		<!-- Dialog footer -->
		<template #footer>
			<div class="event-dialog__footer">
				<!-- View mode buttons -->
				<div v-if="!isEditMode" class="event-dialog__footer-actions">
					<div class="event-dialog__footer-left">
						<el-button type="danger" plain @click="handleDelete">删除</el-button>
						<el-button type="success" plain @click="handleShare">分享</el-button>
					</div>
					<div class="event-dialog__footer-right">
						<el-button @click="handleClose">关闭</el-button>
						<el-button type="primary" @click="enterEditMode">编辑</el-button>
					</div>
				</div>

				<!-- Edit mode buttons -->
				<div v-else class="event-dialog__footer-actions">
					<el-button @click="cancelEdit">取消</el-button>
					<el-button type="primary" @click="saveChanges">保存</el-button>
				</div>
			</div>
		</template>
	</el-dialog>

	<!-- Share Dialog -->
	<share-dialog v-model:visible="shareDialogVisible" :events="eventsToShare" />
</template>

<style scoped>
.event-dialog__content {
	padding: 8px 0;
}

/* View Mode Styles */
.event-dialog__view {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.event-dialog__section {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.event-dialog__label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary);
}

.event-dialog__value {
	font-size: 14px;
	color: var(--text-primary);
	line-height: 1.6;
}

.event-dialog__value--title {
	font-size: 18px;
	font-weight: 600;
	color: var(--text-primary);
}

.event-dialog__value--description {
	white-space: pre-wrap;
	word-break: break-word;
}

.event-dialog__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.event-dialog__original {
	padding: 12px;
	background-color: var(--bg-color);
	border-radius: 4px;
	border: 1px solid var(--border-light);
	font-size: 13px;
	color: var(--text-secondary);
	line-height: 1.6;
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 200px;
	overflow-y: auto;
}

.event-dialog__metadata {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding-top: 12px;
	border-top: 1px solid var(--border-light);
}

.event-dialog__metadata-item {
	font-size: 12px;
	color: var(--text-tertiary);
}

/* Edit Mode Styles */
.event-dialog__form {
	margin-top: 8px;
}

/* Footer Styles */
.event-dialog__footer {
	display: flex;
	justify-content: flex-end;
}

.event-dialog__footer-actions {
	display: flex;
	justify-content: space-between;
	width: 100%;
	gap: 12px;
}

.event-dialog__footer-left {
	display: flex;
	gap: 12px;
}

.event-dialog__footer-right {
	display: flex;
	gap: 12px;
}

/* Button hover effects */
:deep(.el-button) {
	transition: all 0.3s ease;
}

:deep(.el-button:hover) {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

:deep(.el-button:active) {
	transform: translateY(0);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
	:deep(.el-dialog) {
		width: 90% !important;
		margin: 20px auto;
	}

	.event-dialog__value--title {
		font-size: 16px;
	}

	.event-dialog__label {
		font-size: 13px;
	}

	.event-dialog__value {
		font-size: 13px;
	}

	.event-dialog__original {
		font-size: 12px;
		max-height: 150px;
	}

	.event-dialog__metadata-item {
		font-size: 11px;
	}

	:deep(.el-form-item__label) {
		font-size: 13px;
	}

	:deep(.el-input__inner) {
		font-size: 13px;
	}
}

/* Completion Status Button Styles */
.completion-icon {
	font-size: 16px;
	margin-right: 6px;
	font-weight: bold;
}

.completion-text {
	font-weight: 500;
}

.event-dialog__value :deep(.el-button) {
	transition: all 0.3s ease;
	padding: 8px 16px;
	font-size: 14px;
}

.event-dialog__value :deep(.el-button:hover) {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.event-dialog__value :deep(.el-button:active) {
	transform: translateY(0);
}

@media (max-width: 480px) {
	:deep(.el-dialog) {
		width: 95% !important;
		margin: 10px auto;
	}

	:deep(.el-dialog__header) {
		padding: 16px;
	}

	:deep(.el-dialog__body) {
		padding: 16px;
	}

	:deep(.el-dialog__footer) {
		padding: 12px 16px;
	}

	.event-dialog__section {
		gap: 6px;
	}

	.event-dialog__value--title {
		font-size: 15px;
	}

	.event-dialog__footer-actions {
		flex-direction: column;
		gap: 8px;
	}

	.event-dialog__footer-right {
		width: 100%;
		flex-direction: column;
		gap: 8px;
	}

	:deep(.el-button) {
		width: 100%;
	}

	:deep(.el-form-item) {
		margin-bottom: 16px;
	}

	:deep(.el-form-item__label) {
		width: 80px !important;
		font-size: 12px;
	}
}
</style>
