<script setup lang="ts">
import { computed } from "vue";

/**
 * Badge Component
 * Reusable badge component for status indicators
 * Implements requirements 14.1, 14.2, 14.3, 14.4
 */

interface Props {
	/** Badge text content */
	label: string;
	/** Badge variant/type */
	variant?: "primary" | "success" | "warning" | "error" | "info" | "neutral";
	/** Whether to show a dot indicator */
	dot?: boolean;
	/** Whether badge is a count badge */
	count?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	variant: "neutral",
	dot: false,
	count: false,
});

/**
 * Compute badge classes based on props
 */
const badgeClasses = computed(() => {
	const classes = ["badge"];

	// Variant
	classes.push(`badge--${props.variant}`);

	// Dot
	if (props.dot) {
		classes.push("badge--dot");
	}

	// Count
	if (props.count) {
		classes.push("badge--count");
	}

	return classes;
});
</script>

<template>
	<span :class="badgeClasses">
		<span v-if="dot" class="badge__dot"></span>
		<span>{{ label }}</span>
	</span>
</template>

<style scoped>
/* Badge styles are imported from src/utils/tags-badges.css */
</style>
