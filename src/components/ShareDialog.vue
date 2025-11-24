<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { ElDialog, ElButton, ElRadioGroup, ElRadioButton, ElMessage, ElLoading } from "element-plus";
import type { CalendarEvent, Tag } from "@/types";
import { generateShareText, copyToClipboard, generateShareImage, downloadBlob } from "@/utils/share";
import { useSupabase } from "@/composables/useSupabase";
import { useEvents } from "@/composables/useEvents";
import dayjs from "dayjs";

/**
 * ShareDialog Component
 *
 * Allows users to share calendar events in text or image format
 *
 * Requirements:
 * - 19.1: Generate text content with event details
 * - 19.2: Include title, time, location, and description
 * - 19.3: Copy content to clipboard
 * - 19.4: Support single and multiple events
 * - 19.5: Handle recurring events explanation
 * - 19.6: Generate visual image for sharing
 */

interface Props {
	visible: boolean;
	events: CalendarEvent[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
	"update:visible": [value: boolean];
}>();

const { getAllTags } = useSupabase();
const { events: allEvents } = useEvents();

// Share format: 'text' or 'image'
const shareFormat = ref<"text" | "image">("text");

// Selected events for sharing
const selectedEventIds = ref<string[]>([]);

// Reference to the preview element for image generation
const previewRef = ref<HTMLElement | null>(null);

// Flag to control full content display for image generation
const isGeneratingImage = ref(false);

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

// Get tags for an event
const getEventTags = (event: CalendarEvent): Tag[] => {
	if (!event.tagIds || event.tagIds.length === 0) return [];
	return event.tagIds.map((tagId) => getTagById(tagId)).filter((tag): tag is Tag => tag !== undefined);
};

// Get selected events
const selectedEvents = computed(() => {
	if (selectedEventIds.value.length === 0) {
		return [];
	}
	return allEvents.value.filter((event) => selectedEventIds.value.includes(event.id));
});

// Computed share text
const shareText = computed(() => {
	return generateShareText(selectedEvents.value, availableTags.value);
});

// Initialize selected events when dialog opens
const initializeSelection = () => {
	// If events prop is provided and not empty, use it as initial selection
	if (props.events && props.events.length > 0) {
		selectedEventIds.value = props.events.map((e) => e.id);
	} else {
		// Otherwise, select all events by default
		selectedEventIds.value = allEvents.value.map((e) => e.id);
	}
};

// Watch for dialog visibility changes
watch(
	() => props.visible,
	(newVal) => {
		if (newVal) {
			initializeSelection();
		}
	}
);

// Load tags on mount
onMounted(() => {
	loadTags();
});

// Handle dialog close
const handleClose = () => {
	emit("update:visible", false);
	shareFormat.value = "text"; // Reset to default
	selectedEventIds.value = [];
};

// Handle select all
const handleSelectAll = () => {
	selectedEventIds.value = allEvents.value.map((e) => e.id);
};

// Handle deselect all
const handleDeselectAll = () => {
	selectedEventIds.value = [];
};

// Copy text to clipboard (Requirement 19.3)
const handleCopyText = async () => {
	if (selectedEvents.value.length === 0) {
		ElMessage.warning("请至少选择一个事件");
		return;
	}
	try {
		await copyToClipboard(shareText.value);
		ElMessage.success("已复制到剪贴板");
	} catch (error) {
		ElMessage.error(error instanceof Error ? error.message : "复制失败");
	}
};

// Generate and download image (Requirement 19.6)
const handleDownloadImage = async () => {
	if (selectedEvents.value.length === 0) {
		ElMessage.warning("请至少选择一个事件");
		return;
	}

	if (!previewRef.value) {
		ElMessage.error("预览元素未找到");
		return;
	}

	const loading = ElLoading.service({
		lock: true,
		text: "正在生成图片...",
		background: "rgba(0, 0, 0, 0.7)",
	});

	try {
		// Enable full content display mode
		isGeneratingImage.value = true;

		// Wait for DOM to update
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Generate image with full content
		const blob = await generateShareImage(previewRef.value);

		const filename = `日程分享_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.png`;
		downloadBlob(blob, filename);
		ElMessage.success("图片已下载");
	} catch (error) {
		ElMessage.error(error instanceof Error ? error.message : "生成图片失败");
	} finally {
		// Restore preview mode
		isGeneratingImage.value = false;
		loading.close();
	}
};

// Format date for display
const formatDate = (date: Date, isAllDay: boolean): string => {
	if (isAllDay) {
		return dayjs(date).format("YYYY年MM月DD日 (全天)");
	}
	return dayjs(date).format("YYYY年MM月DD日 HH:mm");
};
</script>

<template>
	<el-dialog
		:model-value="visible"
		title="分享事件"
		width="700px"
		:before-close="handleClose"
		class="share-dialog">
		<div class="share-dialog__content">
			<!-- Event selector -->
			<div class="share-dialog__selector">
				<div class="share-dialog__selector-header">
					<span class="share-dialog__selector-label"
						>选择事件 ({{ selectedEventIds.length }}/{{ allEvents.length }})</span
					>
					<div class="share-dialog__selector-actions">
						<el-button size="small" text @click="handleSelectAll">全选</el-button>
						<el-button size="small" text @click="handleDeselectAll">清空</el-button>
					</div>
				</div>
				<div class="share-dialog__event-list">
					<div
						v-for="event in allEvents"
						:key="event.id"
						:class="[
							'share-dialog__event-item',
							{ selected: selectedEventIds.includes(event.id) },
						]"
						@click="
							() => {
								const index = selectedEventIds.indexOf(event.id);
								if (index > -1) {
									selectedEventIds.splice(index, 1);
								} else {
									selectedEventIds.push(event.id);
								}
							}
						">
						<div class="share-dialog__event-checkbox">
							<span v-if="selectedEventIds.includes(event.id)">✓</span>
						</div>
						<div class="share-dialog__event-info">
							<div class="share-dialog__event-title">{{ event.title }}</div>
							<div class="share-dialog__event-time">
								{{ formatDate(event.startTime, event.isAllDay) }}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Format selector -->
			<div class="share-dialog__format">
				<span class="share-dialog__format-label">分享格式：</span>
				<el-radio-group v-model="shareFormat" size="default">
					<el-radio-button value="text">文本</el-radio-button>
					<el-radio-button value="image">图片</el-radio-button>
				</el-radio-group>
			</div>

			<!-- Text format preview -->
			<div v-if="shareFormat === 'text'" class="share-dialog__preview">
				<div class="share-dialog__preview-label">预览：</div>
				<div class="share-dialog__text-preview">
					{{ shareText }}
				</div>
			</div>

			<!-- Image format preview -->
			<div v-else class="share-dialog__preview">
				<div class="share-dialog__preview-label">预览：</div>
				<div
					ref="previewRef"
					:class="[
						'share-dialog__image-preview',
						{ 'share-dialog__image-preview--full': isGeneratingImage },
					]">
					<!-- Header -->
					<div class="share-preview__header">
						<div class="share-preview__title">📅 日程分享</div>
						<div class="share-preview__count">
							{{
								selectedEvents.length === 1
									? "1 个事件"
									: `${selectedEvents.length} 个事件`
							}}
						</div>
					</div>

					<!-- Events list -->
					<div class="share-preview__events">
						<div
							v-for="(event, index) in selectedEvents"
							:key="event.id"
							class="share-preview__event">
							<!-- Event number for multiple events -->
							<div
								v-if="selectedEvents.length > 1"
								class="share-preview__event-number">
								事件 {{ index + 1 }}
							</div>

							<!-- Event title -->
							<div class="share-preview__event-title">{{ event.title }}</div>

							<!-- Event time -->
							<div class="share-preview__event-info">
								<span class="share-preview__icon">⏰</span>
								<span>{{
									formatDate(event.startTime, event.isAllDay)
								}}</span>
							</div>
							<div v-if="!event.isAllDay" class="share-preview__event-info">
								<span class="share-preview__icon">　</span>
								<span>至 {{ formatDate(event.endTime, false) }}</span>
							</div>

							<!-- Event location -->
							<div v-if="event.location" class="share-preview__event-info">
								<span class="share-preview__icon">📍</span>
								<span>{{ event.location }}</span>
							</div>

							<!-- Event tags -->
							<div
								v-if="event.tagIds && event.tagIds.length > 0"
								class="share-preview__event-tags">
								<span class="share-preview__icon">🏷️</span>
								<div class="share-preview__tags-list">
									<span
										v-for="tag in getEventTags(event)"
										:key="tag.id"
										class="share-preview__tag"
										:style="{ backgroundColor: tag.color }">
										{{ tag.name }}
									</span>
								</div>
							</div>

							<!-- Event description -->
							<div
								v-if="event.description"
								class="share-preview__event-section">
								<div class="share-preview__section-label">📝 描述</div>
								<div class="share-preview__section-text">
									{{ event.description }}
								</div>
							</div>

							<!-- Original text -->
							<div
								v-if="event.originalText"
								class="share-preview__event-section">
								<div class="share-preview__section-label">
									📄 原始通告
								</div>
								<div class="share-preview__section-text">
									{{ event.originalText }}
								</div>
							</div>

							<!-- Metadata -->
							<div class="share-preview__event-metadata">
								<div class="share-preview__metadata-item">
									🕐 创建：{{
										dayjs(event.createdAt).format(
											"YYYY-MM-DD HH:mm"
										)
									}}
								</div>
								<div class="share-preview__metadata-item">
									🔄 更新：{{
										dayjs(event.updatedAt).format(
											"YYYY-MM-DD HH:mm"
										)
									}}
								</div>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div class="share-preview__footer">
						由 CalenParse 生成 · {{ dayjs().format("YYYY-MM-DD HH:mm") }}
					</div>
				</div>
			</div>
		</div>

		<!-- Dialog footer -->
		<template #footer>
			<div class="share-dialog__footer">
				<el-button @click="handleClose">取消</el-button>
				<el-button v-if="shareFormat === 'text'" type="primary" @click="handleCopyText">
					复制到剪贴板
				</el-button>
				<el-button v-else type="primary" @click="handleDownloadImage"> 下载图片 </el-button>
			</div>
		</template>
	</el-dialog>
</template>

<style scoped>
.share-dialog__content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

/* Event selector */
.share-dialog__selector {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.share-dialog__selector-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.share-dialog__selector-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary);
}

.share-dialog__selector-actions {
	display: flex;
	gap: 8px;
}

.share-dialog__event-list {
	max-height: 200px;
	overflow-y: auto;
	border: 1px solid var(--border-light);
	border-radius: 8px;
	padding: 8px;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.share-dialog__event-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
	border: 1px solid transparent;
}

.share-dialog__event-item:hover {
	background-color: var(--bg-hover);
}

.share-dialog__event-item.selected {
	background-color: var(--primary-color-light, rgba(64, 158, 255, 0.1));
	border-color: var(--primary-color);
}

.share-dialog__event-checkbox {
	width: 18px;
	height: 18px;
	border: 2px solid var(--border-color);
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: all 0.2s ease;
	font-size: 12px;
	color: white;
}

.share-dialog__event-item.selected .share-dialog__event-checkbox {
	background-color: var(--primary-color);
	border-color: var(--primary-color);
}

.share-dialog__event-info {
	flex: 1;
	min-width: 0;
}

.share-dialog__event-title {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.share-dialog__event-time {
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 2px;
}

.share-dialog__format {
	display: flex;
	align-items: center;
	gap: 12px;
}

.share-dialog__format-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary);
}

.share-dialog__preview {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.share-dialog__preview-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary);
}

/* Text preview */
.share-dialog__text-preview {
	padding: 16px;
	background-color: var(--bg-color);
	border: 1px solid var(--border-light);
	border-radius: 8px;
	font-size: 14px;
	color: var(--text-primary);
	line-height: 1.8;
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 400px;
	overflow-y: auto;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Image preview */
.share-dialog__image-preview {
	padding: 24px;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 12px;
	color: white;
	max-height: 500px;
	overflow-y: auto;
}

/* Full content mode for image generation */
.share-dialog__image-preview--full {
	max-height: none !important;
	overflow: visible !important;
}

.share-dialog__image-preview--full .share-preview__section-text {
	max-height: none !important;
	overflow: visible !important;
}

.share-preview__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
	padding-bottom: 16px;
	border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.share-preview__title {
	font-size: 24px;
	font-weight: 700;
}

.share-preview__count {
	font-size: 14px;
	opacity: 0.9;
}

.share-preview__events {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.share-preview__event {
	padding: 16px;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 8px;
	backdrop-filter: blur(10px);
}

.share-preview__event-number {
	font-size: 12px;
	font-weight: 600;
	opacity: 0.8;
	margin-bottom: 8px;
	text-transform: uppercase;
}

.share-preview__event-title {
	font-size: 18px;
	font-weight: 600;
	margin-bottom: 12px;
}

.share-preview__event-info {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	margin-bottom: 6px;
	opacity: 0.95;
}

.share-preview__icon {
	width: 20px;
	flex-shrink: 0;
}

.share-preview__event-tags {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin-bottom: 6px;
}

.share-preview__tags-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	flex: 1;
}

.share-preview__tag {
	padding: 2px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 500;
	color: white;
	white-space: nowrap;
}

.share-preview__event-section {
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.share-preview__section-label {
	font-size: 13px;
	font-weight: 600;
	margin-bottom: 6px;
	opacity: 0.9;
}

.share-preview__section-text {
	font-size: 13px;
	line-height: 1.6;
	opacity: 0.9;
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 150px;
	overflow-y: auto;
}

.share-preview__event-metadata {
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid rgba(255, 255, 255, 0.2);
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.share-preview__metadata-item {
	font-size: 11px;
	opacity: 0.7;
}

.share-preview__footer {
	margin-top: 20px;
	padding-top: 16px;
	border-top: 2px solid rgba(255, 255, 255, 0.3);
	text-align: center;
	font-size: 12px;
	opacity: 0.7;
}

.share-dialog__footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}

/* Scrollbar styling */
.share-dialog__text-preview::-webkit-scrollbar,
.share-dialog__image-preview::-webkit-scrollbar {
	width: 6px;
}

.share-dialog__text-preview::-webkit-scrollbar-track {
	background: var(--bg-color);
	border-radius: 3px;
}

.share-dialog__text-preview::-webkit-scrollbar-thumb {
	background: var(--border-color);
	border-radius: 3px;
}

.share-dialog__text-preview::-webkit-scrollbar-thumb:hover {
	background: var(--text-tertiary);
}

.share-dialog__image-preview::-webkit-scrollbar-track {
	background: rgba(255, 255, 255, 0.1);
	border-radius: 3px;
}

.share-dialog__image-preview::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.3);
	border-radius: 3px;
}

.share-dialog__image-preview::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.5);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
	:deep(.el-dialog) {
		width: 90% !important;
	}

	.share-dialog__image-preview {
		padding: 16px;
		max-height: 400px;
	}

	.share-preview__title {
		font-size: 20px;
	}

	.share-preview__event-title {
		font-size: 16px;
	}

	.share-dialog__text-preview {
		max-height: 300px;
		font-size: 13px;
	}
}

@media (max-width: 480px) {
	:deep(.el-dialog) {
		width: 95% !important;
	}

	.share-dialog__format {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.share-dialog__image-preview {
		padding: 12px;
		max-height: 350px;
	}

	.share-preview__header {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.share-preview__title {
		font-size: 18px;
	}

	.share-preview__event-title {
		font-size: 15px;
	}

	.share-preview__event-info {
		font-size: 13px;
	}

	.share-dialog__footer {
		flex-direction: column;
	}

	:deep(.el-button) {
		width: 100%;
	}
}
</style>
