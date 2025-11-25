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
	quickCreateData?: { startTime: Date; endTime: Date; isAllDay: boolean };
}

const props = defineProps<Props>();

// Quick create mode detection
const isQuickCreateMode = computed(() => !props.event && !!props.quickCreateData);

// Title input ref for auto-focus
const titleInputRef = ref<InstanceType<typeof ElInput> | null>(null);

const emit = defineEmits<{
	"update:visible": [value: boolean];
	save: [event: CalendarEvent];
	delete: [id: string];
}>();

const { getAllTags, createTag } = useSupabase();

// Import useEvents for completion toggle
import { useEvents } from "@/composables/useEvents";
const { toggleEventCompletion } = useEvents();

// Import useAuth for visitor mode check
import { useAuth } from "@/composables/useAuth";
const { isAdmin } = useAuth();

// Import useTemplates for template functionality
import { useTemplates } from "@/composables/useTemplates";
const { createTemplateFromEvent, templates } = useTemplates();

// Share dialog state
const shareDialogVisible = ref(false);
const eventsToShare = computed(() => {
	return props.event ? [props.event] : [];
});

// Template dialog state (for saving as template)
const templateDialogVisible = ref(false);
const templateName = ref("");

// Template selection state (for creating from template)
const selectedTemplateId = ref<string>("");

// Edit mode state
const isEditMode = ref(false);

// Local editable copy of the event
const editableEvent = ref<Partial<CalendarEvent>>({});

// Form validation errors
const formErrors = ref<{
	title?: string;
	dateRange?: string;
}>({});

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

// Apply template to editable event
const applyTemplate = (templateId: string) => {
	const template = templates.value.find((t) => t.id === templateId);
	if (!template || !props.quickCreateData) return;

	// Calculate duration from template
	const duration = template.endTime.getTime() - template.startTime.getTime();
	const startTime = new Date(props.quickCreateData.startTime);
	const endTime = new Date(startTime.getTime() + duration);

	// Apply template data while keeping the selected time
	editableEvent.value = {
		title: template.title,
		startTime: startTime,
		endTime: endTime,
		isAllDay: template.isAllDay,
		location: template.location,
		description: template.description,
		tagIds: template.tagIds ? [...template.tagIds] : [],
		isCompleted: false,
	};

	ElMessage.success(`已应用模板"${template.templateName}"`);
};

// Watch for template selection change
watch(selectedTemplateId, (newTemplateId) => {
	if (newTemplateId && isQuickCreateMode.value) {
		applyTemplate(newTemplateId);
	}
});

// Initialize editable event when props change
watch(
	() => [props.event, props.quickCreateData] as const,
	([newEvent, quickData]) => {
		if (newEvent) {
			const startTime = new Date(newEvent.startTime);
			const endTime = new Date(newEvent.endTime);

			// Check if event spans multiple days
			const isSameDayEvent =
				startTime.getFullYear() === endTime.getFullYear() &&
				startTime.getMonth() === endTime.getMonth() &&
				startTime.getDate() === endTime.getDate();

			// Deep clone to avoid mutating props
			editableEvent.value = {
				id: newEvent.id,
				title: newEvent.title,
				startTime: startTime,
				endTime: endTime,
				// If event spans multiple days, force isAllDay to false
				isAllDay: isSameDayEvent ? newEvent.isAllDay : false,
				location: newEvent.location,
				description: newEvent.description,
				originalText: newEvent.originalText,
				tagIds: newEvent.tagIds ? [...newEvent.tagIds] : [],
				isCompleted: newEvent.isCompleted || false,
				createdAt: newEvent.createdAt,
				updatedAt: newEvent.updatedAt,
			};
			isEditMode.value = false;
			selectedTemplateId.value = ""; // Reset template selection
		} else if (quickData) {
			const startTime = new Date(quickData.startTime);
			const endTime = new Date(quickData.endTime);

			// Check if event spans multiple days
			const isSameDayEvent =
				startTime.getFullYear() === endTime.getFullYear() &&
				startTime.getMonth() === endTime.getMonth() &&
				startTime.getDate() === endTime.getDate();

			// Quick create mode - initialize with pre-filled data
			editableEvent.value = {
				title: "",
				startTime: startTime,
				endTime: endTime,
				// If event spans multiple days, force isAllDay to false
				isAllDay: isSameDayEvent ? quickData.isAllDay : false,
				location: "",
				description: "",
				tagIds: [],
				isCompleted: false,
			};
			isEditMode.value = true; // Always in edit mode for quick create
			selectedTemplateId.value = ""; // Reset template selection
		}
	},
	{ immediate: true }
);

// Watch for dialog visibility to auto-focus title input in quick create mode
// Requirement 3.3: Auto-focus title input box
watch(
	() => props.visible,
	(visible) => {
		if (visible && isQuickCreateMode.value) {
			// Use nextTick to ensure DOM is updated
			import("vue").then(({ nextTick }) => {
				nextTick(() => {
					titleInputRef.value?.focus();
				});
			});
		}
	}
);

onMounted(() => {
	loadTags();
});

// Reload tags when dialog becomes visible
watch(
	() => props.visible,
	(visible) => {
		if (visible) {
			loadTags();
		}
	}
);

// Single date for all-day events
const singleDate = computed({
	get: () => {
		if (editableEvent.value.startTime) {
			return editableEvent.value.startTime;
		}
		return null;
	},
	set: (value: Date | null) => {
		if (value) {
			// Set start time to beginning of day
			const startTime = new Date(value);
			startTime.setHours(0, 0, 0, 0);

			// Set end time to end of day
			const endTime = new Date(value);
			endTime.setHours(23, 59, 59, 999);

			editableEvent.value.startTime = startTime;
			editableEvent.value.endTime = endTime;
		}
	},
});

// Date range for regular events (combined start and end time)
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

			// 如果选择了跨天时间，自动取消全天事件
			if (!isSameDay(value[0], value[1])) {
				editableEvent.value.isAllDay = false;
			}
		}
	},
});

// Check if two dates are on the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
};

// Check if event spans multiple days
const isMultiDay = computed(() => {
	if (!editableEvent.value.startTime || !editableEvent.value.endTime) {
		return false;
	}
	return !isSameDay(editableEvent.value.startTime, editableEvent.value.endTime);
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
	// Clear validation errors
	formErrors.value = {};
	isEditMode.value = false;
};

// Validate form fields
const validateForm = (): boolean => {
	formErrors.value = {};
	let isValid = true;

	// Validate title
	if (!editableEvent.value.title || !editableEvent.value.title.trim()) {
		formErrors.value.title = "标题不能为空";
		isValid = false;
	}

	// Validate date range
	if (!editableEvent.value.startTime || !editableEvent.value.endTime) {
		formErrors.value.dateRange = "请选择开始和结束时间";
		isValid = false;
	} else if (editableEvent.value.startTime >= editableEvent.value.endTime) {
		formErrors.value.dateRange = "结束时间必须晚于开始时间";
		isValid = false;
	}

	return isValid;
};

// Save changes
const saveChanges = () => {
	// Validate form
	if (!validateForm()) {
		ElMessage({
			message: "请检查表单中的错误",
			type: "warning",
			duration: 3000,
			showClose: true,
		});
		return;
	}

	// Emit save event with updated data
	emit("save", editableEvent.value as CalendarEvent);
	formErrors.value = {};
	isEditMode.value = false;
};

// Handle Enter key press in quick create mode
// Requirement 3.4: Support Enter key for quick save
const handleTitleKeyPress = (event: KeyboardEvent) => {
	if (event.key === "Enter" && !event.shiftKey && isQuickCreateMode.value) {
		event.preventDefault();
		saveChanges();
	}
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

// Open template dialog
// Requirement 9.1: Provide "save as template" option
const handleSaveAsTemplate = () => {
	templateName.value = editableEvent.value.title || "";
	templateDialogVisible.value = true;
};

// Save event as template
// Requirement 9.2: Prompt for template name and save configuration
const confirmSaveAsTemplate = async () => {
	if (!templateName.value.trim()) {
		ElMessage.warning("请输入模板名称");
		return;
	}

	if (!editableEvent.value.id) {
		ElMessage.error("无法保存模板：事件ID不存在");
		return;
	}

	try {
		// Create a new template based on the event (don't modify the original event)
		await createTemplateFromEvent(editableEvent.value as CalendarEvent, templateName.value.trim());
		ElMessage.success(`模板"${templateName.value}"创建成功`);
		templateDialogVisible.value = false;
		templateName.value = "";
		// Close the dialog after saving template
		emit("update:visible", false);
	} catch (error) {
		console.error("Failed to create template:", error);
		ElMessage.error(error instanceof Error ? error.message : "创建模板失败");
	}
};

// Cancel template creation
const cancelSaveAsTemplate = () => {
	templateDialogVisible.value = false;
	templateName.value = "";
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

				<!-- Template Information (View Mode) -->
				<div v-if="editableEvent.isTemplate" class="event-dialog__section">
					<div class="event-dialog__label">模板信息</div>
					<div class="event-dialog__value event-dialog__value--template">
						<div class="template-badge">
							<el-icon class="template-icon"><Document /></el-icon>
							<span class="template-text">这是一个事件模板</span>
						</div>
						<div v-if="editableEvent.templateName" class="template-name">
							模板名称：{{ editableEvent.templateName }}
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
							v-show="getTagById(tagId)"
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
				<!-- Basic Information Section -->
				<div class="form-section">
					<div class="form-section__header">
						<el-icon class="form-section__icon"><Edit /></el-icon>
						<span class="form-section__title">基本信息</span>
					</div>
					<div class="form-section__divider"></div>

					<!-- Title -->
					<el-form-item label="标题" required :error="formErrors.title">
						<el-input
							ref="titleInputRef"
							v-model="editableEvent.title"
							placeholder="请输入事件标题"
							maxlength="200"
							show-word-limit
							@input="
								() => formErrors.title && (formErrors.title = undefined)
							"
							@keypress="handleTitleKeyPress" />
					</el-form-item>

					<!-- Date and Time Range -->
					<el-form-item label="时间" required :error="formErrors.dateRange">
						<!-- All-day event: single date picker -->
						<el-date-picker
							v-if="editableEvent.isAllDay"
							v-model="singleDate"
							type="date"
							placeholder="选择日期"
							format="YYYY-MM-DD"
							style="width: 100%"
							@change="
								() =>
									formErrors.dateRange &&
									(formErrors.dateRange = undefined)
							" />
						<!-- Regular event: datetime range picker -->
						<el-date-picker
							v-else
							v-model="dateRange"
							type="datetimerange"
							range-separator="至"
							start-placeholder="开始时间"
							end-placeholder="结束时间"
							format="YYYY-MM-DD HH:mm"
							style="width: 100%"
							@change="
								() =>
									formErrors.dateRange &&
									(formErrors.dateRange = undefined)
							" />
					</el-form-item>

					<!-- All-day event -->
					<el-form-item label="全天事件">
						<div class="all-day-control">
							<el-switch
								v-model="editableEvent.isAllDay"
								:disabled="isMultiDay" />
							<span class="all-day-hint">
								{{
									isMultiDay
										? "跨天事件不支持全天模式"
										: "适用于生日、节假日等不需要具体时间的事件"
								}}
							</span>
						</div>
					</el-form-item>

					<!-- Completion Status -->
					<el-form-item label="完成状态">
						<el-switch
							v-model="editableEvent.isCompleted"
							active-text="已完成"
							inactive-text="未完成" />
					</el-form-item>
				</div>

				<!-- Detailed Information Section -->
				<div class="form-section">
					<div class="form-section__header">
						<el-icon class="form-section__icon"><Document /></el-icon>
						<span class="form-section__title">详细信息</span>
					</div>
					<div class="form-section__divider"></div>

					<!-- Location -->
					<el-form-item label="地点">
						<template #label>
							<span class="form-label-with-icon">
								<el-icon class="form-label-icon"><Location /></el-icon>
								<span>地点</span>
							</span>
						</template>
						<el-input
							v-model="editableEvent.location"
							placeholder="请输入地点"
							maxlength="200"
							show-word-limit />
					</el-form-item>

					<!-- Tags -->
					<el-form-item label="标签">
						<template #label>
							<span class="form-label-with-icon">
								<el-icon class="form-label-icon"><PriceTag /></el-icon>
								<span>标签</span>
							</span>
						</template>
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
								<div
									style="
										display: flex;
										align-items: center;
										gap: 8px;
									">
									<div
										style="
											width: 12px;
											height: 12px;
											border-radius: 2px;
										"
										:style="{
											backgroundColor: tag.color,
										}"></div>
									<span>{{ tag.name }}</span>
								</div>
							</el-option>
						</el-select>
					</el-form-item>

					<!-- Description -->
					<el-form-item label="描述">
						<template #label>
							<span class="form-label-with-icon">
								<el-icon class="form-label-icon"><Document /></el-icon>
								<span>描述</span>
							</span>
						</template>
						<el-input
							v-model="editableEvent.description"
							type="textarea"
							:rows="4"
							placeholder="请输入描述或备注"
							maxlength="1000"
							show-word-limit />
					</el-form-item>

					<!-- Original Text -->
					<el-form-item label="原始通告">
						<template #label>
							<span class="form-label-with-icon">
								<el-icon class="form-label-icon"><Document /></el-icon>
								<span>原始通告</span>
							</span>
						</template>
						<el-input
							v-model="editableEvent.originalText"
							type="textarea"
							:rows="3"
							placeholder="原始通告文本（可选）"
							maxlength="2000"
							show-word-limit />
					</el-form-item>
				</div>

				<!-- Template Selection (Quick Create Mode Only) - Moved to bottom -->
				<div
					v-if="isQuickCreateMode && templates.length > 0"
					class="form-section template-section">
					<div class="form-section__header">
						<el-icon class="form-section__icon"><Document /></el-icon>
						<span class="form-section__title">从模板创建</span>
					</div>
					<div class="form-section__divider"></div>

					<el-form-item label="选择模板">
						<el-select
							v-model="selectedTemplateId"
							placeholder="选择一个模板快速填充（可选）"
							clearable
							style="width: 100%"
							@clear="selectedTemplateId = ''">
							<el-option
								v-for="template in templates"
								:key="template.id"
								:label="template.templateName"
								:value="template.id">
								<div
									style="
										display: flex;
										align-items: center;
										justify-content: space-between;
									">
									<span>{{ template.templateName }}</span>
									<span
										style="
											font-size: 12px;
											color: var(--text-tertiary);
											margin-left: 12px;
										">
										{{ template.title }}
									</span>
								</div>
							</el-option>
						</el-select>
					</el-form-item>
				</div>
			</el-form>
		</div>

		<!-- Dialog footer -->
		<template #footer>
			<div class="event-dialog__footer">
				<!-- View mode buttons -->
				<div v-if="!isEditMode" class="event-dialog__footer-actions">
					<div class="event-dialog__footer-left">
						<!-- 访客模式隐藏编辑/删除按钮 (需求 1.9, 3.5) -->
						<el-button v-if="isAdmin" type="danger" plain @click="handleDelete"
							>删除</el-button
						>
						<el-button type="success" plain @click="handleShare">分享</el-button>
						<el-button
							v-if="isAdmin && !editableEvent.isTemplate"
							type="warning"
							plain
							@click="handleSaveAsTemplate">
							保存为模板
						</el-button>
					</div>
					<div class="event-dialog__footer-right">
						<el-button @click="handleClose">关闭</el-button>
						<!-- 访客模式隐藏编辑按钮 (需求 1.9, 3.5) -->
						<el-button v-if="isAdmin" type="primary" @click="enterEditMode"
							>编辑</el-button
						>
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

	<!-- Template Name Dialog -->
	<el-dialog v-model="templateDialogVisible" title="保存为模板" width="400px" class="template-dialog">
		<div class="template-dialog__content">
			<p class="template-dialog__description">请为模板输入一个名称，以便日后快速创建相似的事件。</p>
			<el-form label-width="80px">
				<el-form-item label="模板名称" required>
					<el-input
						v-model="templateName"
						placeholder="例如：每周例会、项目汇报"
						maxlength="100"
						show-word-limit
						@keyup.enter="confirmSaveAsTemplate" />
				</el-form-item>
			</el-form>
		</div>
		<template #footer>
			<div class="template-dialog__footer">
				<el-button @click="cancelSaveAsTemplate">取消</el-button>
				<el-button type="primary" @click="confirmSaveAsTemplate">保存</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<style scoped>
/* Dialog Animation */
:deep(.el-dialog) {
	animation: dialogFadeIn 0.3s ease;
}

@keyframes dialogFadeIn {
	from {
		opacity: 0;
		transform: scale(0.95);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

:deep(.el-overlay) {
	animation: overlayFadeIn 0.3s ease;
}

@keyframes overlayFadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

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

.event-dialog__value--template {
	padding: 8px 12px;
	background-color: var(--bg-color);
	border-radius: 4px;
	border: 1px solid var(--border-light);
	color: var(--text-primary);
	font-weight: 500;
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

/* Form Section Styles */
.form-section {
	margin-bottom: 24px;
}

.form-section:last-child {
	margin-bottom: 0;
}

.form-section__header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 12px;
}

.form-section__icon {
	font-size: 18px;
	line-height: 1;
}

.form-section__title {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
}

.form-section__divider {
	height: 1px;
	background: var(--border-light);
	margin-bottom: 16px;
}

/* Form Label with Icon */
.form-label-with-icon {
	display: flex;
	align-items: center;
	gap: 6px;
}

.form-label-icon {
	font-size: 14px;
	line-height: 1;
}

/* Template Editor Wrapper */
.template-editor-wrapper {
	margin-top: 8px;
	padding: 12px;
	background-color: var(--bg-color);
	border-radius: 4px;
	border: 1px solid var(--border-light);
}

/* Template Selection Section - Moved to bottom */
.template-section {
	background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
	padding: var(--spacing-lg);
	border-radius: var(--radius-xl);
	margin-top: var(--spacing-xl);
	border: 2px dashed var(--primary-color);
}

.template-section .form-section__header {
	margin-bottom: var(--spacing-sm);
}

.template-section .form-section__divider {
	margin-bottom: var(--spacing-md);
}

.template-hint {
	margin-top: var(--spacing-md);
	padding: var(--spacing-md);
	background: var(--bg-color);
	border-radius: var(--radius-md);
	font-size: var(--font-size-sm);
	color: var(--text-secondary);
	line-height: var(--line-height-relaxed);
	border-left: 3px solid var(--primary-color);
}

/* Form Error Styles */
:deep(.el-form-item.is-error .el-input__wrapper) {
	box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

:deep(.el-form-item.is-error .el-textarea__inner) {
	box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

:deep(.el-form-item__error) {
	font-size: 12px;
	color: var(--el-color-danger);
	padding-top: 4px;
	animation: errorSlideIn 0.3s ease;
}

@keyframes errorSlideIn {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
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

/* All-day control styles */
.all-day-control {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
}

.all-day-hint {
	font-size: 12px;
	color: var(--text-tertiary);
	line-height: 1.4;
	flex: 1;
}

.all-day-control :deep(.el-switch.is-disabled) {
	opacity: 0.5;
}

.all-day-control :deep(.el-switch.is-disabled) + .all-day-hint {
	color: var(--warning-color);
	font-weight: 500;
}

.event-dialog__value :deep(.el-button:hover) {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.event-dialog__value :deep(.el-button:active) {
	transform: translateY(0);
}

/* Template Information Styles */
.event-dialog__value--template {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.template-badge {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 6px;
	color: white;
	font-weight: 500;
	width: fit-content;
}

.template-icon {
	font-size: 16px;
	line-height: 1;
}

.template-text {
	font-size: 14px;
}

.template-name {
	font-size: 14px;
	color: var(--text-secondary);
	padding: 4px 0;
}

/* Template Dialog Styles */
.template-dialog__content {
	padding: 8px 0;
}

.template-dialog__description {
	font-size: 14px;
	color: var(--text-secondary);
	line-height: 1.6;
	margin-bottom: 20px;
}

.template-dialog__footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
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
