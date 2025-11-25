<script setup lang="ts">
/**
 * ErrorState Component
 * Displays error messages with retry functionality
 * Implements requirement 13.3: Error states and retry buttons
 */

interface Props {
	title?: string;
	message?: string;
	showRetry?: boolean;
}

withDefaults(defineProps<Props>(), {
	title: "加载失败",
	message: "抱歉，数据加载失败，请稍后重试",
	showRetry: true,
});

const emit = defineEmits<{
	retry: [];
}>();

const handleRetry = () => {
	emit("retry");
};
</script>

<template>
	<div class="error-state">
		<div class="error-icon">⚠️</div>
		<h3 class="error-title">{{ title }}</h3>
		<p class="error-message">{{ message }}</p>
		<button v-if="showRetry" class="retry-button" @click="handleRetry">
			<el-icon class="retry-icon"><Refresh /></el-icon>
			<span class="retry-text">重试</span>
		</button>
	</div>
</template>

<style scoped>
.error-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-2xl) var(--spacing-xl);
	text-align: center;
	background: var(--bg-secondary);
	border-radius: var(--radius-2xl);
	border: 2px solid var(--border-color);
	min-height: 300px;
	animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.error-icon {
	font-size: 80px;
	margin-bottom: var(--spacing-xl);
	opacity: 0.8;
	animation: shake 0.5s ease-in-out;
}

@keyframes shake {
	0%,
	100% {
		transform: translateX(0);
	}
	25% {
		transform: translateX(-10px);
	}
	75% {
		transform: translateX(10px);
	}
}

/* Primary error message - Requirement 12.1: Font hierarchy */
.error-title {
	font-size: var(--font-size-2xl);
	font-weight: var(--font-weight-bold);
	color: var(--danger-color);
	margin: 0 0 var(--spacing-md) 0;
	line-height: var(--line-height-tight);
}

/* Secondary message - Requirement 12.1: Smaller font */
.error-message {
	font-size: var(--font-size-base);
	color: var(--text-secondary);
	margin: 0 0 var(--spacing-xl) 0;
	line-height: var(--line-height-relaxed);
	max-width: 400px;
}

/* Retry Button - Requirement 9.1, 9.2: Primary button style */
.retry-button {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-md) var(--spacing-xl);
	background: var(--primary-color);
	color: white;
	border: 2px solid var(--primary-color);
	border-radius: var(--radius-lg);
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	cursor: pointer;
	transition: all 0.3s ease;
	box-shadow: 0 2px 8px var(--shadow);
}

/* Requirement 9.4: Hover effect */
.retry-button:hover {
	background: var(--primary-light);
	border-color: var(--primary-light);
	transform: translateY(-2px);
	box-shadow: 0 4px 12px var(--shadow);
}

/* Requirement 9.5: Active/pressed effect */
.retry-button:active {
	transform: translateY(0);
	box-shadow: 0 2px 4px var(--shadow);
}

.retry-icon {
	font-size: 18px;
	line-height: 1;
	animation: rotate 2s linear infinite;
}

@keyframes rotate {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.retry-button:hover .retry-icon {
	animation-duration: 0.5s;
}

.retry-text {
	line-height: 1;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
	.error-state {
		padding: var(--spacing-xl) var(--spacing-lg);
		min-height: 250px;
	}

	.error-icon {
		font-size: 64px;
	}

	.error-title {
		font-size: var(--font-size-xl);
	}

	.error-message {
		font-size: var(--font-size-sm);
	}

	.retry-button {
		padding: var(--spacing-sm) var(--spacing-lg);
		font-size: var(--font-size-sm);
	}
}

@media (max-width: 480px) {
	.error-state {
		padding: var(--spacing-lg) var(--spacing-md);
		min-height: 200px;
	}

	.error-icon {
		font-size: 56px;
		margin-bottom: var(--spacing-lg);
	}

	.error-title {
		font-size: var(--font-size-lg);
	}

	.error-message {
		font-size: var(--font-size-xs);
	}
}
</style>
