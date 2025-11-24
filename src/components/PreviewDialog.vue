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
	ElTag,
	ElMessage,
	ElSelect,
	ElOption,
} from "element-plus";
import type { ParsedEvent, Tag } from "@/types";
import { useSupabase } from "@/composables/useSupabase";

/**
 * PreviewDialog Component
 *
 * Displays parsed event results and allows user to edit before confirming
 *
 * Requirements:
 * - 2.9: Handle repeat end conditions (displayed in description)
 * - 2.11: Mark unrecognized fields clearly
 * - 2.14: Mark uncertain fields for user confirmation
 * - 4.1: Display preview interface after parsing
 * - 4.2: Allow editing of all standard fields
 * - 4.5: Create events on confirmation
 * - 4.6: Discard results on cancel
 */

interface Props {
	visible: boolean;
	events: ParsedEvent[];
	originalText?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	"update:visible": [value: boolean];
	confirm: [events: ParsedEvent[]];
	cancel: [];
}>();

const { getAllTags, createTag } = useSupabase();

// Local state for editing
const editableEvents = ref<ParsedEvent[]>([]);
const currentEventIndex = ref(0);

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

// Handle tag selection change
const handleTagChange = async (value: string[]) => {
	if (!value || value.length === 0) return;

	// Check if any new tag names were added (not IDs)
	const newTagNames = value.filter((item) => {
		return !availableTags.value.some((tag) => tag.id === item);
	});

	if (newTagNames.length > 0) {
		// Create new tags
		for (const tagName of newTagNames) {
			await handleCreateTag(tagName);
		}

		// Remove the tag names from the array (they've been converted to IDs)
		currentEvent.value.tags = currentEvent.value.tags?.filter((item) => !newTagNames.includes(item));
	}
};

// Handle creating new tag
const handleCreateTag = async (tagName: string) => {
	if (!tagName || !tagName.trim()) return;

	try {
		const normalizedName = tagName.trim().toLowerCase();
		const existingTag = availableTags.value.find((tag) => tag.name.toLowerCase() === normalizedName);

		if (existingTag) {
			if (!currentEvent.value.tags) {
				currentEvent.value.tags = [];
			}
			if (!currentEvent.value.tags.includes(existingTag.id)) {
				currentEvent.value.tags.push(existingTag.id);
			}
			return;
		}

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
		availableTags.value.push(newTag);

		if (!currentEvent.value.tags) {
			currentEvent.value.tags = [];
		}
		currentEvent.value.tags.push(newTag.id);

		ElMessage.success(`标签"${tagName}"创建成功`);
	} catch (error) {
		ElMessage.error(error instanceof Error ? error.message : "创建标签失败");
	}
};

onMounted(() => {
	loadTags();
});

// Initialize editable events when props change
watch(
	() => props.events,
	(newEvents) => {
		if (newEvents && newEvents.length > 0) {
			// Deep clone to avoid mutating props
			editableEvents.value = newEvents.map((event) => {
				const clonedEvent = { ...event };

				// Check if event spans multiple days
				if (clonedEvent.startTime && clonedEvent.endTime) {
					const startTime =
						clonedEvent.startTime instanceof Date
							? clonedEvent.startTime
							: new Date(clonedEvent.startTime);
					const endTime =
						clonedEvent.endTime instanceof Date
							? clonedEvent.endTime
							: new Date(clonedEvent.endTime);

					const isSameDayEvent =
						startTime.getFullYear() === endTime.getFullYear() &&
						startTime.getMonth() === endTime.getMonth() &&
						startTime.getDate() === endTime.getDate();

					// If event spans multiple days, force isAllDay to false
					if (!isSameDayEvent) {
						clonedEvent.isAllDay = false;
					}
				}

				return clonedEvent;
			});
			currentEventIndex.value = 0;
		}
	},
	{ immediate: true }
);

// Current event being edited
const currentEvent = computed(() => {
	return editableEvents.value[currentEventIndex.value] || {};
});

// Check if field is missing (unrecognized)
const isFieldMissing = (fieldName: keyof ParsedEvent): boolean => {
	const value = currentEvent.value[fieldName];
	return value === undefined || value === null || value === "";
};

// Navigation
const canGoPrevious = computed(() => currentEventIndex.value > 0);
const canGoNext = computed(() => currentEventIndex.value < editableEvents.value.length - 1);

const goToPrevious = () => {
	if (canGoPrevious.value) {
		currentEventIndex.value--;
	}
};

const goToNext = () => {
	if (canGoNext.value) {
		currentEventIndex.value++;
	}
};

// Delete current event
const handleDeleteEvent = () => {
	if (editableEvents.value.length === 1) {
		ElMessage.warning("至少需要保留一个事件");
		return;
	}

	editableEvents.value.splice(currentEventIndex.value, 1);

	// Adjust current index if needed
	if (currentEventIndex.value >= editableEvents.value.length) {
		currentEventIndex.value = editableEvents.value.length - 1;
	}

	ElMessage.success("事件已删除");
};

// Handle dialog close
const handleClose = () => {
	emit("update:visible", false);
	emit("cancel");
};

// Handle confirmation
const handleConfirm = () => {
	// Validate that at least title or start time exists for each event
	const invalidEvents = editableEvents.value.filter((event) => !event.title && !event.startTime);

	if (invalidEvents.length > 0) {
		ElMessage({
			message: "每个事件至少需要标题或开始时间",
			type: "warning",
			duration: 3000,
			showClose: true,
		});
		return;
	}

	// Validate time ranges
	for (let i = 0; i < editableEvents.value.length; i++) {
		const event = editableEvents.value[i];
		if (event && event.startTime && event.endTime && event.startTime >= event.endTime) {
			ElMessage({
				message: `事件 ${i + 1}: 结束时间必须晚于开始时间`,
				type: "warning",
				duration: 3000,
				showClose: true,
			});
			currentEventIndex.value = i;
			return;
		}
	}

	emit("confirm", editableEvents.value);
	emit("update:visible", false);
};

// Single date for all-day events
const singleDate = computed({
	get: () => {
		const event = currentEvent.value;
		if (event.startTime) {
			return event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
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

			currentEvent.value.startTime = startTime;
			currentEvent.value.endTime = endTime;
		}
	},
});

// Date range for regular events (combined start and end time)
const dateRange = computed({
	get: () => {
		const event = currentEvent.value;
		if (event.startTime && event.endTime) {
			// Ensure we have Date objects
			const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
			const end = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
			return [start, end];
		}
		return null;
	},
	set: (value: any) => {
		if (value && value.length === 2) {
			// Convert to Date objects if they're strings
			currentEvent.value.startTime = value[0] instanceof Date ? value[0] : new Date(value[0]);
			currentEvent.value.endTime = value[1] instanceof Date ? value[1] : new Date(value[1]);

			// 如果选择了跨天时间，自动取消全天事件
			if (!isSameDay(currentEvent.value.startTime, currentEvent.value.endTime)) {
				currentEvent.value.isAllDay = false;
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
	const event = currentEvent.value;
	if (!event.startTime || !event.endTime) {
		return false;
	}
	const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
	const end = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
	return !isSameDay(start, end);
});
</script>

<template>
	<el-dialog
		:model-value="visible"
		title="预览解析结果"
		width="600px"
		:before-close="handleClose"
		class="preview-dialog">
		<div class="preview-dialog__content">
			<!-- Event counter -->
			<div class="preview-dialog__header">
				<div class="preview-dialog__counter">
					<span class="preview-dialog__counter-text">
						事件 {{ currentEventIndex + 1 }} / {{ editableEvents.length }}
					</span>
				</div>

				<div class="preview-dialog__actions">
					<!-- Navigation buttons -->
					<div v-if="editableEvents.length > 1" class="preview-dialog__navigation">
						<el-button
							size="small"
							:disabled="!canGoPrevious"
							@click="goToPrevious">
							上一个
						</el-button>
						<el-button size="small" :disabled="!canGoNext" @click="goToNext">
							下一个
						</el-button>
					</div>

					<!-- Delete button -->
					<el-button
						v-if="editableEvents.length > 1"
						size="small"
						type="danger"
						plain
						@click="handleDeleteEvent">
						删除此事件
					</el-button>
				</div>
			</div>

			<!-- Edit form -->
			<el-form label-width="100px" class="preview-dialog__form">
				<!-- Title -->
				<el-form-item label="标题">
					<div class="preview-dialog__field">
						<el-input v-model="currentEvent.title" placeholder="请输入事件标题" />
						<el-tag
							v-if="isFieldMissing('title')"
							type="warning"
							size="small"
							class="preview-dialog__tag">
							未识别
						</el-tag>
					</div>
				</el-form-item>

				<!-- Date and Time Range -->
				<el-form-item label="时间">
					<div class="preview-dialog__field">
						<!-- All-day event: single date picker -->
						<el-date-picker
							v-if="currentEvent.isAllDay"
							v-model="singleDate"
							type="date"
							placeholder="选择日期"
							format="YYYY-MM-DD"
							style="width: 100%" />
						<!-- Regular event: datetime range picker -->
						<el-date-picker
							v-else
							v-model="dateRange"
							type="datetimerange"
							range-separator="至"
							start-placeholder="开始时间"
							end-placeholder="结束时间"
							format="YYYY-MM-DD HH:mm"
							style="width: 100%" />
						<el-tag
							v-if="isFieldMissing('startTime')"
							type="warning"
							size="small"
							class="preview-dialog__tag">
							未识别
						</el-tag>
					</div>
				</el-form-item>

				<!-- All-day event -->
				<el-form-item label="全天事件">
					<div class="all-day-control">
						<el-switch v-model="currentEvent.isAllDay" :disabled="isMultiDay" />
						<span class="all-day-hint">
							{{
								isMultiDay
									? "跨天事件不支持全天模式"
									: "适用于生日、节假日等不需要具体时间的事件"
							}}
						</span>
					</div>
				</el-form-item>

				<!-- Location -->
				<el-form-item label="地点">
					<div class="preview-dialog__field">
						<el-input v-model="currentEvent.location" placeholder="请输入地点" />
						<el-tag
							v-if="isFieldMissing('location')"
							type="warning"
							size="small"
							class="preview-dialog__tag">
							未识别
						</el-tag>
					</div>
				</el-form-item>

				<!-- Tags -->
				<el-form-item label="标签">
					<div class="preview-dialog__field">
						<el-select
							v-model="currentEvent.tags"
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
						<el-tag
							v-if="isFieldMissing('tags')"
							type="info"
							size="small"
							class="preview-dialog__tag">
							未识别
						</el-tag>
					</div>
				</el-form-item>

				<!-- Description -->
				<el-form-item label="描述">
					<div class="preview-dialog__field">
						<el-input
							v-model="currentEvent.description"
							type="textarea"
							:rows="4"
							placeholder="请输入描述或备注" />
						<el-tag
							v-if="isFieldMissing('description')"
							type="info"
							size="small"
							class="preview-dialog__tag">
							未识别
						</el-tag>
					</div>
				</el-form-item>
			</el-form>

			<!-- Original text reference -->
			<div v-if="originalText" class="preview-dialog__original">
				<div class="preview-dialog__original-title">原始通告文本：</div>
				<div class="preview-dialog__original-content">{{ originalText }}</div>
			</div>
		</div>

		<!-- Dialog footer -->
		<template #footer>
			<div class="preview-dialog__footer">
				<el-button @click="handleClose">取消</el-button>
				<el-button type="primary" @click="handleConfirm">
					确认创建 {{ editableEvents.length }} 个事件
				</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<style scoped>
.preview-dialog__content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.preview-dialog__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 16px;
	border-bottom: 1px solid var(--border-light);
}

.preview-dialog__counter {
	display: flex;
	align-items: center;
}

.preview-dialog__counter-text {
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
}

.preview-dialog__actions {
	display: flex;
	align-items: center;
	gap: 12px;
}

.preview-dialog__navigation {
	display: flex;
	gap: 8px;
}

.preview-dialog__form {
	margin-top: 16px;
}

.preview-dialog__field {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
}

.preview-dialog__tag {
	align-self: flex-start;
}

.preview-dialog__original {
	margin-top: 16px;
	padding: 12px;
	background-color: var(--bg-color);
	border-radius: 4px;
	border: 1px solid var(--border-light);
}

.preview-dialog__original-title {
	font-size: 12px;
	font-weight: 600;
	color: var(--text-secondary);
	margin-bottom: 8px;
}

.preview-dialog__original-content {
	font-size: 12px;
	color: var(--text-secondary);
	line-height: 1.6;
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 120px;
	overflow-y: auto;
}

.preview-dialog__footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}

/* Tag animations */
.preview-dialog__tag {
	animation: fadeInScale 0.3s ease-out;
}

@keyframes fadeInScale {
	from {
		opacity: 0;
		transform: scale(0.8);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
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

	.preview-dialog__header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.preview-dialog__actions {
		width: 100%;
		flex-direction: column;
		gap: 8px;
	}

	.preview-dialog__navigation {
		width: 100%;
	}

	.preview-dialog__navigation .el-button {
		flex: 1;
	}

	.preview-dialog__actions > .el-button {
		width: 100%;
	}

	.preview-dialog__counter-text {
		font-size: 14px;
	}

	.preview-dialog__original {
		max-height: 100px;
	}

	:deep(.el-form-item__label) {
		font-size: 13px;
	}

	:deep(.el-input__inner) {
		font-size: 13px;
	}
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

	.preview-dialog__content {
		gap: 16px;
	}

	.preview-dialog__counter-text {
		font-size: 13px;
	}

	.preview-dialog__footer {
		flex-direction: column;
		gap: 8px;
	}

	.preview-dialog__footer .el-button {
		width: 100%;
	}

	:deep(.el-form-item) {
		margin-bottom: 16px;
	}

	:deep(.el-form-item__label) {
		width: 80px !important;
		font-size: 12px;
	}

	.preview-dialog__original-content {
		font-size: 11px;
		max-height: 80px;
	}
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
</style>
