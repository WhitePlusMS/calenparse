<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Loading, VideoPlay } from "@element-plus/icons-vue";
import { useLLM } from "@/composables/useLLM";
import { useSupabase } from "@/composables/useSupabase";
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
const containerRef = ref<HTMLDivElement | null>(null);

const { parseText, isLoading } = useLLM();
const { getAllTags } = useSupabase();

// Emit events
const emit = defineEmits<{
	showPreview: [events: ParsedEvent[], originalText: string];
	quotaChanged: [];
}>();

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
		// 清除内联样式，让 CSS 接管
		if (inputRef.value) {
			inputRef.value.style.height = "";
		}
	}
};

/**
 * Handle click outside - collapse if expanded and empty
 */
const handleClickOutside = (e: MouseEvent) => {
	if (!isExpanded.value) return;

	const target = e.target as HTMLElement;
	const container = containerRef.value;

	// Check if click is outside the container
	if (container && !container.contains(target)) {
		// Collapse if empty
		if (!inputText.value.trim()) {
			isExpanded.value = false;
			// 清除内联样式
			if (inputRef.value) {
				inputRef.value.style.height = "";
			}
		}
	}
};

// Add click outside listener
onMounted(() => {
	document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside);
});

/**
 * Handle input - auto-resize textarea
 */
const handleInput = () => {
	const textarea = inputRef.value;
	if (textarea && isExpanded.value) {
		// 只在展开状态下自动调整高度
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
		// 清除内联样式
		if (inputRef.value) {
			inputRef.value.style.height = "";
			inputRef.value.blur();
		}
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
		// Get existing tags to help LLM suggest better tags
		const existingTags = await getAllTags();
		const existingTagNames = existingTags.map((tag) => tag.name);

		const events = await parseText(trimmedText, existingTagNames);
		emit("showPreview", events, trimmedText);
		emit("quotaChanged"); // 通知配额已变化
		ElMessage.success(`成功解析 ${events.length} 个日程事件`);
		// Clear input after successful parse
		inputText.value = "";
		isExpanded.value = false;
		// 清除内联样式，让 CSS 接管折叠状态的高度
		if (inputRef.value) {
			inputRef.value.style.height = "";
		}
	} catch (err) {
		if (err instanceof Error && err.message.includes("无法从文本中识别")) {
			ElMessage.warning(err.message);
		}
	}
};
</script>

<template>
	<div ref="containerRef" class="floating-input-container">
		<div :class="['input-box', { expanded: isExpanded, focused: isExpanded, loading: isLoading }]">
			<!-- Single textarea for both states -->
			<textarea
				ref="inputRef"
				v-model="inputText"
				:class="[
					'input-field',
					isExpanded ? 'input-field--expanded' : 'input-field--collapsed',
				]"
				:placeholder="
					isExpanded
						? '粘贴或输入官方通告文本...\n\n例如：\n关于举办学术讲座的通知\n时间：2024年3月15日 下午2:00-4:00\n地点：图书馆报告厅'
						: '粘贴或输入官方通告文本...'
				"
				:rows="isExpanded ? undefined : 1"
				@focus="handleFocus"
				@blur="handleBlur"
				@input="handleInput"
				@keydown="handleKeydown"></textarea>

			<!-- Footer with meta info and send button (expanded state) -->
			<div v-if="isExpanded" class="input-footer">
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
					<el-icon v-if="isLoading" class="loading-icon"><Loading /></el-icon>
					<el-icon v-else class="send-icon"><VideoPlay /></el-icon>
				</button>
			</div>

			<!-- Loading indicator (expanded state) -->
			<div v-if="isExpanded && isLoading" class="loading-indicator">
				<div class="loading-dots">
					<span class="loading-dot"></span>
					<span class="loading-dot"></span>
					<span class="loading-dot"></span>
				</div>
				<span class="loading-text">正在解析中...</span>
			</div>

			<!-- Send button for collapsed state -->
			<button
				v-if="!isExpanded"
				class="send-button send-button--collapsed"
				:disabled="!inputText.trim() || isLoading"
				@click="handleSend"
				title="解析日程">
				<el-icon v-if="isLoading" class="loading-icon"><Loading /></el-icon>
				<el-icon v-else class="send-icon"><VideoPlay /></el-icon>
			</button>
		</div>
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
	width: 44px;
	height: 44px;
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
		width: 44px;
		height: 44px;
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
