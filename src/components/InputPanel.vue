<script setup lang="ts">
import { ref } from "vue";
import { ElInput, ElButton, ElMessage, ElMessageBox, ElAlert } from "element-plus";
import { useLLM } from "@/composables/useLLM";
import { useEvents } from "@/composables/useEvents";
import { useSupabase } from "@/composables/useSupabase";
import PreviewDialog from "./PreviewDialog.vue";
import type { ParsedEvent } from "@/types";

/**
 * InputPanel Component
 *
 * Allows users to input announcement text and parse it using LLM
 *
 * Requirements:
 * - 1.1: Accept and store announcement text input
 * - 1.2: Trigger LLM parsing on submit
 * - 1.3: Prevent empty input submission with validation
 */

// State
const inputText = ref("");
const { parseText, isLoading, error } = useLLM();
const { createEvent } = useEvents();
const { getAllTags, createTag } = useSupabase();

// Preview dialog state
const showPreview = ref(false);
const parsedEvents = ref<ParsedEvent[]>([]);
const originalText = ref("");

/**
 * Handle parse button click
 * Validates input and triggers LLM parsing
 */
const handleParse = async () => {
	// Requirement 1.3: Validate empty input
	const trimmedText = inputText.value.trim();

	if (!trimmedText) {
		ElMessage.warning("请输入通告文本");
		return;
	}

	// Requirement 1.4: Warn for very long text
	if (trimmedText.length > 10000) {
		const confirmed = await ElMessageBox.confirm(
			"输入文本超过 10000 字符，可能影响解析性能。是否继续？",
			"警告",
			{
				confirmButtonText: "继续",
				cancelButtonText: "取消",
				type: "warning",
			}
		).catch(() => false);

		if (!confirmed) {
			return;
		}
	}

	try {
		// Requirement 1.2: Trigger LLM parsing
		const events = await parseText(trimmedText);

		console.log("Parsed events:", events);

		// Store parsed events and show preview dialog
		parsedEvents.value = events;
		originalText.value = trimmedText;
		showPreview.value = true;

		// Show success message
		ElMessage.success(`成功解析 ${events.length} 个日程事件`);
	} catch (err) {
		// Error is already handled by useLLM composable with notification
		// Only show message for validation errors
		if (err instanceof Error && err.message.includes("无法从文本中识别")) {
			ElMessage.warning(err.message);
		}
	}
};

/**
 * Match or create tags from tag names
 * Requirement 18.7: Match suggested tags with existing tags or create new ones
 */
const matchOrCreateTags = async (tagNames: string[]): Promise<string[]> => {
	if (!tagNames || tagNames.length === 0) return [];

	try {
		// Get all existing tags
		const existingTags = await getAllTags();
		const tagIds: string[] = [];

		// Predefined colors for new tags
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

		for (const tagName of tagNames) {
			const normalizedName = tagName.trim().toLowerCase();

			// Try to find existing tag (case-insensitive)
			const existingTag = existingTags.find((tag) => tag.name.toLowerCase() === normalizedName);

			if (existingTag) {
				tagIds.push(existingTag.id);
			} else {
				// Create new tag with a random color
				const color = colors[Math.floor(Math.random() * colors.length)] || "#409EFF";
				const newTag = await createTag(tagName.trim(), color);
				tagIds.push(newTag.id);
			}
		}

		return tagIds;
	} catch (error) {
		console.error("Failed to match or create tags:", error);
		return [];
	}
};

/**
 * Handle preview confirmation
 * Creates events in database
 */
const handlePreviewConfirm = async (events: ParsedEvent[]) => {
	try {
		// Create all events
		let successCount = 0;
		for (const event of events) {
			// Ensure required fields are present
			if (!event.title && !event.startTime) {
				continue;
			}

			// Ensure dates are Date objects
			const startTime =
				event.startTime instanceof Date
					? event.startTime
					: event.startTime
					? new Date(event.startTime)
					: new Date();

			const endTime =
				event.endTime instanceof Date
					? event.endTime
					: event.endTime
					? new Date(event.endTime)
					: startTime;

			// Match or create tags from tag names
			let tagIds: string[] = [];
			if (event.tags && event.tags.length > 0) {
				tagIds = await matchOrCreateTags(event.tags);
			}

			// Set default values for required fields
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

			console.log("Creating event with data:", eventData);
			await createEvent(eventData);
			successCount++;
		}

		ElMessage.success(`成功创建 ${successCount} 个日程事件`);

		// Clear input after successful creation
		inputText.value = "";
		parsedEvents.value = [];
		originalText.value = "";
	} catch (err) {
		// Error is already handled by useEvents composable
		console.error("Failed to create events:", err);
	}
};

/**
 * Handle preview cancellation
 */
const handlePreviewCancel = () => {
	parsedEvents.value = [];
	originalText.value = "";
};

/**
 * Handle Enter key press in textarea
 */
const handleKeydown = (event: Event | KeyboardEvent) => {
	// Type guard to ensure we have a KeyboardEvent
	if (!(event instanceof KeyboardEvent)) return;

	// Ctrl+Enter or Cmd+Enter to submit
	if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
		event.preventDefault();
		handleParse();
	}
};
</script>

<template>
	<div class="input-panel">
		<div class="input-panel__header">
			<h2>输入通告文本</h2>
			<p class="input-panel__hint">粘贴或输入官方通告，系统将自动识别其中的日程信息</p>
		</div>

		<div class="input-panel__content">
			<!-- Requirement 1.1: Text input area -->
			<el-input
				v-model="inputText"
				type="textarea"
				:rows="8"
				placeholder="请输入或粘贴通告文本...&#10;&#10;例如：&#10;关于举办学术讲座的通知&#10;时间：2024年3月15日 下午2:00-4:00&#10;地点：图书馆报告厅&#10;主讲人：张教授"
				:disabled="isLoading"
				@keydown="handleKeydown"
				class="input-panel__textarea" />

			<!-- Character count -->
			<div class="input-panel__meta">
				<span class="input-panel__count">
					{{ inputText.length }} 字符
					<span v-if="inputText.length > 10000" class="input-panel__count--warning">
						（超过建议长度）
					</span>
				</span>
				<span class="input-panel__shortcut"> 提示: Ctrl+Enter 快速解析 </span>
			</div>

			<!-- Parse button with loading state -->
			<div class="input-panel__actions">
				<el-button
					type="primary"
					size="large"
					:loading="isLoading"
					:disabled="!inputText.trim() || isLoading"
					@click="handleParse"
					class="input-panel__button">
					<template v-if="isLoading">
						<span class="input-panel__loading-text">
							<span class="input-panel__loading-dot">.</span>
							<span class="input-panel__loading-dot">.</span>
							<span class="input-panel__loading-dot">.</span>
							解析中
						</span>
					</template>
					<template v-else>
						<el-icon class="input-panel__button-icon"><VideoPlay /></el-icon>
						解析日程
					</template>
				</el-button>
			</div>

			<!-- Error display -->
			<div v-if="error && !isLoading" class="input-panel__error">
				<el-alert :title="error" type="error" :closable="false" show-icon />
			</div>
		</div>

		<!-- Preview Dialog -->
		<PreviewDialog
			v-model:visible="showPreview"
			:events="parsedEvents"
			:original-text="originalText"
			@confirm="handlePreviewConfirm"
			@cancel="handlePreviewCancel" />
	</div>
</template>

<style scoped>
.input-panel {
	background: var(--bg-secondary);
	border-radius: 8px;
	padding: 24px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.input-panel__header {
	margin-bottom: 20px;
}

.input-panel__header h2 {
	margin: 0 0 8px 0;
	font-size: 20px;
	font-weight: 600;
	color: var(--text-primary);
}

.input-panel__hint {
	margin: 0;
	font-size: 14px;
	color: var(--text-tertiary);
}

.input-panel__content {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.input-panel__textarea {
	width: 100%;
}

.input-panel__textarea :deep(.el-textarea__inner) {
	font-family: inherit;
	font-size: 14px;
	line-height: 1.6;
}

.input-panel__meta {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 12px;
	color: var(--text-tertiary);
}

.input-panel__count {
	color: var(--text-secondary);
}

.input-panel__count--warning {
	color: var(--warning-color);
	font-weight: 500;
}

.input-panel__shortcut {
	color: var(--text-tertiary);
}

.input-panel__actions {
	display: flex;
	justify-content: center;
	margin-top: 8px;
}

.input-panel__button {
	min-width: 160px;
}

.input-panel__error {
	margin-top: 8px;
	animation: slideDown 0.3s ease-out;
}

.input-panel__button-icon {
	margin-right: 4px;
}

.input-panel__loading-text {
	display: inline-flex;
	align-items: center;
	gap: 2px;
}

.input-panel__loading-dot {
	animation: loadingDot 1.4s infinite;
	opacity: 0;
}

.input-panel__loading-dot:nth-child(1) {
	animation-delay: 0s;
}

.input-panel__loading-dot:nth-child(2) {
	animation-delay: 0.2s;
}

.input-panel__loading-dot:nth-child(3) {
	animation-delay: 0.4s;
}

@keyframes loadingDot {
	0%,
	20% {
		opacity: 0;
	}
	50% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
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

/* Mobile responsiveness */
@media (max-width: 768px) {
	.input-panel {
		padding: 20px;
	}

	.input-panel__header h2 {
		font-size: 18px;
	}

	.input-panel__hint {
		font-size: 13px;
	}

	.input-panel__textarea :deep(.el-textarea__inner) {
		font-size: 13px;
	}

	.input-panel__button {
		min-width: 140px;
		font-size: 14px;
	}
}

@media (max-width: 480px) {
	.input-panel {
		padding: 16px;
	}

	.input-panel__header h2 {
		font-size: 16px;
	}

	.input-panel__hint {
		font-size: 12px;
	}

	.input-panel__meta {
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
	}

	.input-panel__button {
		width: 100%;
		min-width: auto;
	}
}
</style>
