<script setup lang="ts">
import { computed } from "vue";

/**
 * Tag Component
 * Reusable tag component with various styles and sizes
 * Implements requirements 14.1, 14.2, 14.3, 14.4
 */

interface Props {
	/** Tag text content */
	label: string;
	/** Tag color (hex or CSS color) */
	color?: string;
	/** Tag size */
	size?: "xs" | "sm" | "md" | "lg";
	/** Tag variant */
	variant?: "light" | "solid" | "colored";
	/** Whether tag is clickable */
	clickable?: boolean;
	/** Whether tag is selected (for filter tags) */
	selected?: boolean;
	/** Whether to show close button */
	closable?: boolean;
	/** Icon to display before text */
	icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
	color: "#667eea",
	size: "md",
	variant: "solid",
	clickable: false,
	selected: false,
	closable: false,
	icon: undefined,
});

const emit = defineEmits<{
	click: [];
	close: [];
}>();

/**
 * Compute tag classes based on props
 */
const tagClasses = computed(() => {
	const classes = ["tag"];

	// Size
	classes.push(`tag--${props.size}`);

	// Variant
	if (props.variant === "colored") {
		classes.push("tag--colored");
		// Check if background is light
		if (isLightColor(props.color)) {
			classes.push("tag--light-bg");
		}
	} else {
		classes.push(`tag--${props.variant}`);
	}

	// Clickable
	if (props.clickable) {
		classes.push("tag--clickable");
	}

	// Selected
	if (props.selected) {
		classes.push("tag--selected");
	}

	return classes;
});

/**
 * Compute tag styles
 */
const tagStyles = computed(() => {
	if (props.variant === "colored") {
		return {
			backgroundColor: props.color,
			borderColor: props.color,
		};
	} else if (props.variant === "light") {
		return {
			backgroundColor: `${props.color}1a`, // 10% opacity
			color: props.color,
			borderColor: `${props.color}33`, // 20% opacity
		};
	}
	return {};
});

/**
 * Check if a color is light (for text contrast)
 */
function isLightColor(color: string): boolean {
	// Convert hex to RGB
	const hex = color.replace("#", "");
	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);

	// Calculate relative luminance
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	return luminance > 0.6;
}

/**
 * Handle tag click
 */
function handleClick() {
	if (props.clickable) {
		emit("click");
	}
}

/**
 * Handle close button click
 */
function handleClose(e: Event) {
	e.stopPropagation();
	emit("close");
}
</script>

<template>
	<span :class="tagClasses" :style="tagStyles" @click="handleClick">
		<span v-if="icon" class="tag__icon">{{ icon }}</span>
		<span class="tag__text">{{ label }}</span>
		<span v-if="closable" class="tag__close" @click="handleClose">×</span>
	</span>
</template>

<style scoped>
/* Tag styles are imported from src/utils/tags-badges.css */
</style>
