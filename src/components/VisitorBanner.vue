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

/* 暗色模式下增强 el-alert 的对比度 */
:deep(.el-alert) {
	background-color: var(--bg-secondary) !important;
	border-color: var(--border-color) !important;
}

:deep(.el-alert__icon) {
	color: var(--info-color) !important;
}

:deep(.el-alert__title) {
	color: var(--text-primary) !important;
}

.banner-content {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	flex-wrap: wrap;
}

.banner-title {
	font-weight: 600;
	color: var(--text-primary) !important;
}

.banner-quota {
	color: var(--text-primary) !important;
	font-size: 14px;
}

.banner-quota strong {
	color: var(--primary-color) !important;
	font-weight: 700;
}

.banner-refresh-hint {
	color: var(--text-secondary) !important;
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
