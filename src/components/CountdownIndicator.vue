<script setup lang="ts">
import { computed } from "vue";
import type { CalendarEvent, TimeUnit } from "@/types";
import { useCountdown } from "@/composables/useCountdown";
import { VideoPlay, Timer, Warning } from "@element-plus/icons-vue";

/**
 * CountdownIndicator Component
 * Displays countdown information for calendar events
 * Implements requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */

interface Props {
	event: CalendarEvent;
	unit?: TimeUnit;
}

const props = withDefaults(defineProps<Props>(), {
	unit: "day",
});

// Use countdown composable
const { getCountdown } = useCountdown();

// Get countdown information
const countdownInfo = computed(() => {
	return getCountdown(props.event, props.unit);
});

// Check if countdown should be displayed
const shouldDisplay = computed(() => {
	return countdownInfo.value.type !== "none";
});

// Get CSS class based on countdown type
const countdownClass = computed(() => {
	if (countdownInfo.value.type === "start") {
		return "countdown-indicator--start";
	} else if (countdownInfo.value.type === "end") {
		return "countdown-indicator--end";
	} else if (countdownInfo.value.type === "overdue") {
		return "countdown-indicator--overdue";
	}
	return "";
});

// Get icon component based on countdown type
const countdownIconComponent = computed(() => {
	if (countdownInfo.value.type === "start") {
		return VideoPlay; // Start icon
	} else if (countdownInfo.value.type === "end") {
		return Timer; // End icon
	} else if (countdownInfo.value.type === "overdue") {
		return Warning; // Overdue warning icon
	}
	return null;
});
</script>

<template>
	<div
		v-if="shouldDisplay && countdownInfo.type !== 'none'"
		class="countdown-indicator"
		:class="countdownClass"
		role="status"
		:aria-label="
			countdownInfo.type === 'start'
				? `距离日程开始: ${countdownInfo.text}`
				: countdownInfo.type === 'end'
				? `距离日程结束: ${countdownInfo.text}`
				: `日程已过期: ${countdownInfo.text}`
		"
		:aria-live="'polite'"
		tabindex="0">
		<el-icon class="countdown-icon" aria-hidden="true">
			<component :is="countdownIconComponent" />
		</el-icon>
		<span class="countdown-text">{{ countdownInfo.text }}</span>
	</div>
</template>

<style scoped>
/**
 * Base countdown indicator styles
 * Requirement 2.5: Use visually distinct style to draw attention
 * Requirement 3.5: Use different visual styles for start and end countdowns
 */
.countdown-indicator {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 12px;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	transition: all 0.2s ease;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	border: 1px solid transparent;
	line-height: 1.4;
	cursor: default;
	user-select: none;
	margin: 0 4px;
}

/* Focus styles for keyboard navigation */
.countdown-indicator:focus {
	outline: 2px solid currentColor;
	outline-offset: 2px;
}

.countdown-indicator:focus:not(:focus-visible) {
	outline: none;
}

.countdown-indicator:focus-visible {
	outline: 2px solid currentColor;
	outline-offset: 2px;
}

/**
 * Start countdown style
 * Requirement 2.5: Visually distinct style
 * Uses blue gradient to indicate upcoming start
 */
.countdown-indicator--start {
	background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
	color: #ffffff;
	border: none;
	box-shadow: 0 2px 8px rgba(64, 158, 255, 0.35);
}

.countdown-indicator--start:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(64, 158, 255, 0.45);
}

.countdown-indicator--start:focus-visible {
	outline-color: #409eff;
	box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.3);
}

/**
 * End countdown style
 * Requirement 3.5: Different visual style from start countdown
 * Uses orange gradient to indicate approaching end
 */
.countdown-indicator--end {
	background: linear-gradient(135deg, #e6a23c 0%, #f0b86e 100%);
	color: #ffffff;
	border: none;
	box-shadow: 0 2px 8px rgba(230, 162, 60, 0.35);
}

.countdown-indicator--end:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(230, 162, 60, 0.45);
}

.countdown-indicator--end:focus-visible {
	outline-color: #e6a23c;
	box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.3);
}

/**
 * Overdue countdown style
 * Uses red gradient to indicate overdue/urgent status
 */
.countdown-indicator--overdue {
	background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
	color: #ffffff;
	border: none;
	box-shadow: 0 2px 8px rgba(245, 108, 108, 0.35);
	animation: pulse-warning 2s ease-in-out infinite;
}

.countdown-indicator--overdue:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(245, 108, 108, 0.45);
}

.countdown-indicator--overdue:focus-visible {
	outline-color: #f56c6c;
	box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.3);
}

@keyframes pulse-warning {
	0%,
	100% {
		box-shadow: 0 2px 8px rgba(245, 108, 108, 0.35);
	}
	50% {
		box-shadow: 0 2px 12px rgba(245, 108, 108, 0.55);
	}
}

/**
 * Icon styles
 */
.countdown-icon {
	font-size: 16px;
	line-height: 1;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

/**
 * Text styles
 */
.countdown-text {
	line-height: 1.4;
	font-weight: 700;
	letter-spacing: 0.01em;
}

/**
 * Dark mode support
 * Ensures readability in dark mode with proper contrast
 * WCAG AA compliant contrast ratios
 */
@media (prefers-color-scheme: dark) {
	.countdown-indicator {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.countdown-indicator--start {
		background: linear-gradient(135deg, #3a8ee6 0%, #5ca3f0 100%);
		color: #ffffff;
		box-shadow: 0 2px 8px rgba(58, 142, 230, 0.4);
	}

	.countdown-indicator--start:hover {
		box-shadow: 0 4px 12px rgba(58, 142, 230, 0.5);
	}

	.countdown-indicator--start:focus-visible {
		outline-color: #5ca3f0;
		box-shadow: 0 0 0 3px rgba(58, 142, 230, 0.4);
	}

	.countdown-indicator--end {
		background: linear-gradient(135deg, #d4941f 0%, #e6a842 100%);
		color: #ffffff;
		box-shadow: 0 2px 8px rgba(212, 148, 31, 0.4);
	}

	.countdown-indicator--end:hover {
		box-shadow: 0 4px 12px rgba(212, 148, 31, 0.5);
	}

	.countdown-indicator--end:focus-visible {
		outline-color: #e6a842;
		box-shadow: 0 0 0 3px rgba(212, 148, 31, 0.4);
	}

	.countdown-indicator--overdue {
		background: linear-gradient(135deg, #e04545 0%, #f07878 100%);
		color: #ffffff;
		box-shadow: 0 2px 8px rgba(224, 69, 69, 0.4);
	}

	.countdown-indicator--overdue:hover {
		box-shadow: 0 4px 12px rgba(224, 69, 69, 0.5);
	}

	.countdown-indicator--overdue:focus-visible {
		outline-color: #f07878;
		box-shadow: 0 0 0 3px rgba(224, 69, 69, 0.4);
	}
}

/**
 * High contrast mode support for accessibility
 */
@media (prefers-contrast: high) {
	.countdown-indicator {
		border: 2px solid currentColor;
		font-weight: 700;
	}

	.countdown-indicator--start {
		background: #0066cc;
		color: #ffffff;
	}

	.countdown-indicator--end {
		background: #cc6600;
		color: #ffffff;
	}

	.countdown-indicator--overdue {
		background: #cc0000;
		color: #ffffff;
	}
}

/**
 * Reduced motion support for accessibility
 */
@media (prefers-reduced-motion: reduce) {
	.countdown-indicator {
		transition: none;
	}

	.countdown-indicator:hover {
		transform: none;
	}

	.countdown-indicator--overdue {
		animation: none;
	}
}

/**
 * Mobile responsiveness
 */
@media (max-width: 768px) {
	.countdown-indicator {
		font-size: 12px;
		padding: 5px 10px;
		gap: 5px;
		margin: 0 2px;
	}

	.countdown-icon {
		font-size: 14px;
	}
}

/**
 * Print styles - ensure visibility when printed
 */
@media print {
	.countdown-indicator {
		border: 1px solid #000;
		box-shadow: none;
		background: none !important;
	}

	.countdown-indicator--start {
		color: #0066cc;
	}

	.countdown-indicator--end {
		color: #cc6600;
	}

	.countdown-indicator--overdue {
		color: #cc0000;
	}
}
</style>
