<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useLLM } from "@/composables/useLLM";
import { useEvents } from "@/composables/useEvents";
import { useSupabase } from "@/composables/useSupabase";
import PreviewDialog from "./PreviewDialog.vue";
import type { ParsedEvent } from "@/types";

/**
 * FloatingInput Component - ChatGPT Style
 *
 * Requirements:
 * - 需求 3.1: 固定在底部的输入框
 * - 需求 3.2: 收起和展开状态
 * - 需求 3.3: 自动扩展逻辑
 * - 需求 3.4: 发送按钮和快捷键支持
 * - 需求 3.5: 字符计数
 * - 需求 3.6: 加载状态
 */

// State
const inputText = ref("");
const isExpanded = ref(false);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const { parseText, isLoading, error } = useLLM();
const { createEvent } = useEvents();
const { getAllTags, createTag } = useSupabase();

// Preview dialog state
const showPreview = ref(false);
const parsedEvents = ref<ParsedEvent[]>([]);
const originalText = ref("");

// Character count with warning
const charCount = computed(() => inputText.value.length);
const hasWarning = computed(() => charCount.value > 10000);

/**
 * Handle input focus - expand the input box
 */
const handleFocus = () => {
	isExpanded.value = true;
};

/**
 * Handle input blur - collapse if empty
 */
const handleBlur = (e: FocusEvent) => {
	// Don't collapse if clicking the send button
	if ((e.relatedTarget as HTMLElement)?.classList.contains("send-button")) {
		return;
	}
	// Collapse if empty
	if (!inputText.value.trim()) {
		isExpanded.value = false;
	}
};

/**
 * Handle input - auto-resize textarea
 */
const handleInput = () => {
	const textarea = inputRef.value;
	if (textarea) {
		textarea.style.height = "auto";
		textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
	}
};

/**
 * Handle keydown - Ctrl+Enter to send, Esc to collapse
 */
const handleKeydown = (e: KeyboardEvent) => {
	// Ctrl+Enter or Cmd+Enter to send
	if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
		e.preventDefault();
		handleSend();
	}

	// Esc to collapse if empty
	if (e.key === "Escape" && !inputText.value.trim()) {
		isExpanded.value = false;
		inputRef.value?.blur();
	}
};

/**
 * Match or create tags from tag names
 */
const matchOrCreateTags = async (tagNames: string[]): Promise<string[]> => {
	if (!tagNames || tagNames.length === 0) return [];

	try {
		const existingTags = await getAllTags();
		const tagIds: string[] = [];
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
			const existingTag = existingTags.find((tag) => tag.name.toLowerCase() === normalizedName);

			if (existingTag) {
				tagIds.push(existingTag.id);
			} else {
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
 * Handle send button click
 */
const handleSend = async () => {
	const trimmedText = inputText.value.trim();

	if (!trimmedText) {
		ElMessage.warning("请输入通告文本");
		return;
	}

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
		const events = await parseText(trimmedText);
		parsedEvents.value = events;
		originalText.value = trimmedText;
		showPreview.value = true;
		ElMessage.success(`成功解析 ${events.length} 个日程事件`);
	} catch (err) {
		if (err instanceof Error && err.message.includes("无法从文本中识别")) {
			ElMessage.warning(err.message);
		}
	}
};

/**
 * Handle preview confirmation
 */
const handlePreviewConfirm = async (events: ParsedEvent[]) => {
	try {
		let successCount = 0;
		for (const event of events) {
			if (!event.title && !event.startTime) {
				continue;
			}

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

			let tagIds: string[] = [];
			if (event.tags && event.tags.length > 0) {
				tagIds = await matchOrCreateTags(event.tags);
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

		// Clear input and collapse
		inputText.value = "";
		parsedEvents.value = [];
		originalText.value = "";
		isExpanded.value = false;
	} catch (err) {
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
</script>

<template>
	<div class="floating-input-container">
		<div :class="['input-box', { expanded: isExpanded, focused: isExpanded, loading: isLoading }]">
			<!-- Collapsed state - single line -->
			<textarea
				v-if="!isExpanded"
				ref="inputRef"
				v-model="inputText"
				class="input-field input-field--collapsed"
				placeholder="粘贴或输入官方通告文本..."
				rows="1"
				@focus="handleFocus"
				@keydown="handleKeydown"></textarea>

			<!-- Expanded state - multi-line -->
			<template v-else>
				<textarea
					ref="inputRef"
					v-model="inputText"
					class="input-field input-field--expanded"
					placeholder="粘贴或输入官方通告文本...&#10;&#10;例如：&#10;关于举办学术讲座的通知&#10;时间：2024年3月15日 下午2:00-4:00&#10;地点：图书馆报告厅"
					@blur="handleBlur"
					@input="handleInput"
					@keydown="handleKeydown"></textarea>

				<!-- Footer with meta info and send button -->
				<div class="input-footer">
					<div class="input-meta">
						<span :class="['char-count', { warning: hasWarning }]">
							{{ charCount }} 字符
						</span>
						<span class="shortcut-hint">Ctrl+Enter 快速解析</span>
					</div>
					<button
						class="send-button"
						:disabled="!inputText.trim() || isLoading"
						@click="handleSend"
						title="解析日程">
						<span v-if="isLoading" class="loading-icon">⏳</span>
						<span v-else class="send-icon">🚀</span>
					</button>
				</div>

				<!-- Loading indicator -->
				<div v-if="isLoading" class="loading-indicator">
					<div class="loading-dots">
						<span class="loading-dot"></span>
						<span class="loading-dot"></span>
						<span class="loading-dot"></span>
					</div>
					<span class="loading-text">正在解析中...</span>
				</div>
			</template>

			<!-- Send button for collapsed state -->
			<button
				v-if="!isExpanded"
				class="send-button send-button--collapsed"
				:disabled="!inputText.trim() || isLoading"
				@click="handleSend"
				title="解析日程">
				<span v-if="isLoading" class="loading-icon">⏳</span>
				<span v-else class="send-icon">🚀</span>
			</button>
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
/* Container */
.floating-input-container {
	position: fixed;
	bottom: var(--spacing-lg);
	left: 50%;
	transform: translateX(-50%);
	z-index: 100;
	width: 90%;
	max-width: 700px;
	margin-left: 40px; /* Half of sidebar width (80px) */
}

/* Input Box */
.input-box {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	padding: var(--spacing-md) var(--spacing-lg);
	background: var(--bg-secondary);
	border: 1px solid var(--border-color);
	border-radius: var(--radius-3xl);
	box-shadow: 0 2px 12px var(--shadow);
	transition: all 0.3s ease;
}

.input-box:hover {
	box-shadow: 0 4px 16px var(--shadow);
	border-color: var(--primary-color);
}

.input-box.focused {
	border-color: var(--primary-color);
	box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
}

.input-box.expanded {
	flex-direction: column;
	align-items: stretch;
	padding: var(--spacing-lg);
	border-radius: var(--radius-2xl);
}

.input-box.loading {
	pointer-events: none;
	opacity: 0.7;
}

/* Input Field */
.input-field {
	flex: 1;
	border: none;
	outline: none;
	background: transparent;
	font-size: var(--font-size-md);
	color: var(--text-primary);
	resize: none;
	line-height: var(--line-height-relaxed);
	font-family: inherit;
}

.input-field::placeholder {
	color: var(--text-tertiary);
}

.input-field--collapsed {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.input-field--expanded {
	min-height: 120px;
	max-height: 200px;
	overflow-y: auto;
	margin-bottom: var(--spacing-md);
}

/* Input Footer */
.input-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: var(--spacing-md);
	border-top: 1px solid var(--border-light);
}

.input-meta {
	display: flex;
	gap: var(--spacing-lg);
	font-size: var(--font-size-xs);
	color: var(--text-tertiary);
}

.char-count {
	color: var(--text-secondary);
	font-weight: var(--font-weight-medium);
}

.char-count.warning {
	color: var(--warning-color);
	font-weight: var(--font-weight-semibold);
}

.shortcut-hint {
	color: var(--text-tertiary);
}

/* Send Button */
.send-button {
	width: 40px;
	height: 40px;
	border-radius: var(--radius-full);
	border: none;
	background: var(--primary-color);
	color: white;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s ease;
	flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
	background: var(--primary-light);
	transform: scale(1.05);
}

.send-button:active:not(:disabled) {
	transform: scale(0.95);
}

.send-button:disabled {
	background: var(--border-color);
	cursor: not-allowed;
	opacity: 0.5;
}

.send-button--collapsed {
	width: 36px;
	height: 36px;
}

.send-icon,
.loading-icon {
	font-size: 18px;
	line-height: 1;
}

/* Loading Indicator */
.loading-indicator {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) 0;
	color: var(--text-secondary);
	font-size: var(--font-size-sm);
}

.loading-dots {
	display: flex;
	gap: var(--spacing-xs);
}

.loading-dot {
	width: 6px;
	height: 6px;
	border-radius: var(--radius-full);
	background: var(--primary-color);
	animation: loadingDot 1.4s infinite;
}

.loading-dot:nth-child(1) {
	animation-delay: 0s;
}

.loading-dot:nth-child(2) {
	animation-delay: 0.2s;
}

.loading-dot:nth-child(3) {
	animation-delay: 0.4s;
}

@keyframes loadingDot {
	0%,
	20%,
	100% {
		opacity: 0.3;
		transform: scale(0.8);
	}
	50% {
		opacity: 1;
		transform: scale(1);
	}
}

/* Responsive Design - Tablet */
@media (max-width: 768px) {
	.floating-input-container {
		bottom: 72px; /* Avoid bottom navigation */
		margin-left: 0;
		width: calc(100% - 32px);
		max-width: none;
	}

	.input-box {
		padding: var(--spacing-sm) var(--spacing-md);
	}

	.input-field {
		font-size: 16px; /* Prevent iOS auto-zoom */
	}

	.send-button {
		width: 40px;
		height: 40px;
	}

	.input-box.expanded .input-field--expanded {
		min-height: 100px;
	}
}

/* Responsive Design - Mobile */
@media (max-width: 480px) {
	.floating-input-container {
		width: calc(100% - 24px);
	}

	.input-meta {
		flex-direction: column;
		gap: var(--spacing-xs);
	}
}

/* Large screens */
@media (min-width: 1400px) {
	.floating-input-container {
		max-width: 800px;
	}
}
</style>
