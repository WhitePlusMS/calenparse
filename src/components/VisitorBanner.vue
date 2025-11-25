<script setup lang="ts">
import { View, InfoFilled } from "@element-plus/icons-vue";
import type { VisitorQuota } from "@/types";

/**
 * 访客模式横幅组件
 *
 * 实现需求:
 * - 1.5: 显示剩余 LLM 次数和事件配额
 * - 4.10: 配额信息展示
 * - 优化后：添加试用提示和本地部署引导
 */

// Props
interface Props {
	quota: VisitorQuota;
}
const props = defineProps<Props>();
</script>

<template>
	<div class="visitor-banner">
		<el-alert type="info" :closable="false">
			<template #title>
				<div class="banner-content">
					<span class="banner-title">
						<el-icon class="title-icon"><View /></el-icon>
						试用模式
					</span>
					<span class="banner-quota">
						剩余 <strong>{{ props.quota.llmRemaining }}</strong> 次 LLM 调用，
						<strong>{{ props.quota.eventsRemaining }}/3</strong> 条事件配额
						<span class="refresh-hint">（每日刷新）</span>
					</span>
					<span class="banner-divider">|</span>
					<span class="banner-notice">
						<el-icon class="notice-icon"><InfoFilled /></el-icon>
						页面仅供参考试用，如需完整体验请
						<a
							href="https://github.com/WhitePlusMS/calenparse"
							target="_blank"
							rel="noopener noreferrer"
							class="deploy-link"
							>本地部署</a
						>
					</span>
				</div>
			</template>
		</el-alert>
	</div>
</template>

<style scoped>
.visitor-banner {
	margin-bottom: var(--spacing-md);
}

/* 增强 el-alert 样式 */
:deep(.el-alert) {
	background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(64, 158, 255, 0.04) 100%) !important;
	border: 1px solid rgba(64, 158, 255, 0.2) !important;
	border-radius: var(--radius-lg);
	padding: var(--spacing-md) var(--spacing-lg);
}

:deep(.el-alert__icon) {
	color: var(--info-color) !important;
	font-size: 20px;
}

:deep(.el-alert__title) {
	color: var(--text-primary) !important;
	width: 100%;
}

/* 横幅内容布局 - 单行显示 */
.banner-content {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	flex-wrap: wrap;
	width: 100%;
}

.banner-title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-xs);
	font-weight: 600;
	font-size: 15px;
	color: var(--text-primary) !important;
	padding: 4px 12px;
	background: rgba(64, 158, 255, 0.12);
	border-radius: var(--radius-md);
}

.title-icon {
	font-size: 16px;
	color: var(--info-color);
}

.banner-quota {
	color: var(--text-primary) !important;
	font-size: 14px;
	line-height: 1.5;
}

.banner-quota strong {
	color: var(--primary-color) !important;
	font-weight: 700;
	font-size: 15px;
	padding: 0 2px;
}

.refresh-hint {
	color: var(--text-secondary) !important;
	font-size: 13px;
	margin-left: 4px;
}

/* 分隔符 */
.banner-divider {
	color: var(--border-color);
	font-weight: 300;
	margin: 0 var(--spacing-xs);
}

/* 提示信息 */
.banner-notice {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-xs);
	color: var(--text-secondary) !important;
	font-size: 13px;
}

.notice-icon {
	font-size: 14px;
	color: var(--warning-color);
	flex-shrink: 0;
	margin-right: 2px;
}

.deploy-link {
	color: var(--primary-color) !important;
	font-weight: 600;
	text-decoration: none;
	border-bottom: 1px dashed var(--primary-color);
	transition: all 0.2s ease;
}

.deploy-link:hover {
	color: var(--primary-hover-color) !important;
	border-bottom-style: solid;
}

/* 响应式设计 */
@media (max-width: 768px) {
	:deep(.el-alert) {
		padding: var(--spacing-sm) var(--spacing-md);
	}

	.banner-content {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing-xs);
	}

	.banner-title {
		font-size: 14px;
	}

	.banner-quota {
		font-size: 13px;
	}

	.banner-divider {
		display: none;
	}

	.banner-notice {
		font-size: 12px;
	}
}
</style>
