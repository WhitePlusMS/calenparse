<script setup lang="ts">
import type { VisitorQuota } from "@/types";

/**
 * 访客模式横幅组件
 *
 * 实现需求:
 * - 1.5: 显示剩余 LLM 次数和事件配额
 * - 4.10: 配额信息展示
 */

// Props
interface Props {
	quota: VisitorQuota;
}
const props = defineProps<Props>();
</script>

<template>
	<div class="visitor-banner">
		<el-alert type="info" :closable="false" show-icon>
			<template #title>
				<div class="banner-content">
					<span class="banner-title">试用模式</span>
					<span class="banner-quota">
						剩余 <strong>{{ props.quota.llmRemaining }}</strong> 次 LLM 调用，
						<strong>{{ props.quota.eventsRemaining }}/3</strong> 条事件配额
					</span>
					<span class="banner-refresh-hint">（每日刷新）</span>
				</div>
			</template>
		</el-alert>
	</div>
</template>

<style scoped>
.visitor-banner {
	margin-bottom: var(--spacing-md);
}

.banner-content {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	flex-wrap: wrap;
}

.banner-title {
	font-weight: 600;
	color: var(--text-primary);
}

.banner-quota {
	color: var(--text-secondary);
	font-size: 14px;
}

.banner-quota strong {
	color: var(--primary-color);
	font-weight: 600;
}

.banner-refresh-hint {
	color: var(--text-tertiary);
	font-size: 13px;
	font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
	.banner-content {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing-xs);
	}
}
</style>
