<script setup lang="ts">
import { ref } from "vue";
import Tag from "./Tag.vue";
import Badge from "./Badge.vue";

/**
 * TagBadgeShowcase Component
 * Demonstrates all tag and badge styles
 * Used for testing and documentation
 */

const selectedTags = ref<Set<string>>(new Set());

function toggleTag(id: string) {
	if (selectedTags.value.has(id)) {
		selectedTags.value.delete(id);
	} else {
		selectedTags.value.add(id);
	}
}

function handleTagClose(id: string) {
	console.log("Tag closed:", id);
}
</script>

<template>
	<div class="showcase">
		<div class="showcase-section">
			<h2 class="showcase-title">Tags - Solid Variant</h2>
			<div class="tag-group">
				<Tag label="学术" color="#667eea" variant="solid" />
				<Tag label="讲座" color="#67C23A" variant="solid" />
				<Tag label="会议" color="#E6A23C" variant="solid" />
				<Tag label="活动" color="#F56C6C" variant="solid" />
				<Tag label="通知" color="#909399" variant="solid" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Tags - Light Variant</h2>
			<div class="tag-group">
				<Tag label="学术" color="#667eea" variant="light" />
				<Tag label="讲座" color="#67C23A" variant="light" />
				<Tag label="会议" color="#E6A23C" variant="light" />
				<Tag label="活动" color="#F56C6C" variant="light" />
				<Tag label="通知" color="#909399" variant="light" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Tags - Colored Variant</h2>
			<div class="tag-group">
				<Tag label="学术" color="#667eea" variant="colored" />
				<Tag label="讲座" color="#67C23A" variant="colored" />
				<Tag label="会议" color="#E6A23C" variant="colored" />
				<Tag label="活动" color="#F56C6C" variant="colored" />
				<Tag label="通知" color="#909399" variant="colored" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Tags - Different Sizes</h2>
			<div class="tag-group">
				<Tag label="Extra Small" size="xs" />
				<Tag label="Small" size="sm" />
				<Tag label="Medium" size="md" />
				<Tag label="Large" size="lg" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Tags - With Icons</h2>
			<div class="tag-group">
				<Tag label="学术" icon="📚" />
				<Tag label="讲座" icon="🎤" />
				<Tag label="会议" icon="💼" />
				<Tag label="活动" icon="🎉" />
				<Tag label="通知" icon="📢" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Tags - Clickable</h2>
			<div class="tag-group">
				<Tag
					label="学术"
					clickable
					:selected="selectedTags.has('academic')"
					@click="toggleTag('academic')" />
				<Tag
					label="讲座"
					clickable
					:selected="selectedTags.has('lecture')"
					@click="toggleTag('lecture')" />
				<Tag
					label="会议"
					clickable
					:selected="selectedTags.has('meeting')"
					@click="toggleTag('meeting')" />
				<Tag
					label="活动"
					clickable
					:selected="selectedTags.has('event')"
					@click="toggleTag('event')" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Tags - Closable</h2>
			<div class="tag-group">
				<Tag label="学术" closable @close="handleTagClose('academic')" />
				<Tag label="讲座" closable @close="handleTagClose('lecture')" />
				<Tag label="会议" closable @close="handleTagClose('meeting')" />
				<Tag label="活动" closable @close="handleTagClose('event')" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Tags - Multiple with Spacing</h2>
			<div class="tag-group">
				<Tag label="学术" />
				<Tag label="讲座" />
				<Tag label="会议" />
				<Tag label="活动" />
				<Tag label="通知" />
				<Tag label="重要" />
				<Tag label="紧急" />
				<Tag label="可选" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Badges - All Variants</h2>
			<div class="tag-group">
				<Badge label="Primary" variant="primary" />
				<Badge label="Success" variant="success" />
				<Badge label="Warning" variant="warning" />
				<Badge label="Error" variant="error" />
				<Badge label="Info" variant="info" />
				<Badge label="Neutral" variant="neutral" />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Badges - With Dots</h2>
			<div class="tag-group">
				<Badge label="Primary" variant="primary" dot />
				<Badge label="Success" variant="success" dot />
				<Badge label="Warning" variant="warning" dot />
				<Badge label="Error" variant="error" dot />
				<Badge label="Info" variant="info" dot />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Badges - Count Badges</h2>
			<div class="tag-group">
				<Badge label="5" variant="primary" count />
				<Badge label="12" variant="success" count />
				<Badge label="99+" variant="error" count />
				<Badge label="3" variant="warning" count />
			</div>
		</div>

		<div class="showcase-section">
			<h2 class="showcase-title">Status Badges (Real Use Cases)</h2>
			<div class="tag-group">
				<Badge label="今天" variant="primary" />
				<Badge label="即将到来" variant="info" />
				<Badge label="全天" variant="neutral" />
				<Badge label="已完成" variant="success" dot />
				<Badge label="已过期" variant="error" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.showcase {
	padding: var(--spacing-2xl);
	max-width: 1200px;
	margin: 0 auto;
	background: var(--bg-color);
}

.showcase-section {
	margin-bottom: var(--spacing-2xl);
	padding: var(--spacing-xl);
	background: var(--bg-secondary);
	border-radius: var(--radius-xl);
	box-shadow: 0 2px 8px var(--shadow);
}

.showcase-title {
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-semibold);
	color: var(--text-primary);
	margin-bottom: var(--spacing-lg);
	padding-bottom: var(--spacing-md);
	border-bottom: 2px solid var(--border-light);
}

.tag-group {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-md);
	align-items: center;
}

@media (max-width: 768px) {
	.showcase {
		padding: var(--spacing-lg);
	}

	.showcase-section {
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-lg);
	}

	.showcase-title {
		font-size: var(--font-size-lg);
	}

	.tag-group {
		gap: var(--spacing-sm);
	}
}
</style>
