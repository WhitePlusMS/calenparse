<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useMonitoring } from "@/composables/useMonitoring";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

/**
 * 监控页面组件
 *
 * 实现需求:
 * - 7.1: 检查管理员权限
 * - 7.2: 非管理员显示提示
 * - 7.3: 显示访客会话列表
 * - 7.8: 提供刷新按钮
 */

const { isAdmin } = useAuth();
const { sessions, statistics, selectedSession, sessionEvents, loading, loadSessionEvents, refreshData } =
	useMonitoring();

// 展开的行（用于显示事件详情）
const expandedRows = ref<string[]>([]);

/**
 * 格式化指纹（部分显示）
 */
const formatFingerprint = (fingerprint: string): string => {
	if (fingerprint.length <= 12) {
		return fingerprint;
	}
	return `${fingerprint.slice(0, 8)}...${fingerprint.slice(-4)}`;
};

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr: string): string => {
	return dayjs(dateStr).format("YYYY-MM-DD HH:mm:ss");
};

/**
 * 格式化相对时间
 */
const formatRelativeTime = (dateStr: string): string => {
	return dayjs(dateStr).fromNow();
};

/**
 * 处理行展开
 */
const handleRowExpand = async (row: any, expandedRowsData: any[]) => {
	if (expandedRowsData.length > 0) {
		// 展开行
		try {
			await loadSessionEvents(row.fingerprint);
		} catch (err) {
			ElMessage.error("加载事件详情失败");
		}
	} else {
		// 折叠行
		selectedSession.value = null;
	}
};

/**
 * 刷新数据
 */
const handleRefresh = async () => {
	try {
		await refreshData();
		ElMessage.success("数据已刷新");
	} catch (err) {
		ElMessage.error("刷新数据失败");
	}
};

/**
 * 组件挂载时加载数据
 */
onMounted(async () => {
	if (isAdmin.value) {
		try {
			await refreshData();
		} catch (err) {
			ElMessage.error("加载监控数据失败");
		}
	}
});

/**
 * 监听管理员状态变化，登出时清空数据
 */
watch(isAdmin, (newIsAdmin) => {
	if (!newIsAdmin) {
		// 登出时清空监控数据
		sessions.value = [];
		statistics.value = {
			totalVisitors: 0,
			totalLLMCalls: 0,
			totalTokens: 0,
			totalEvents: 0,
			lastCleanupTime: null,
		};
		selectedSession.value = null;
		sessionEvents.value = [];
	}
});

/**
 * 格式化最后清理时间
 */
const formattedLastCleanup = computed(() => {
	if (!statistics.value.lastCleanupTime) {
		return "暂无数据";
	}
	return formatDateTime(statistics.value.lastCleanupTime);
});
</script>

<template>
	<div class="monitoring-page">
		<!-- 权限检查 -->
		<div v-if="!isAdmin" class="access-denied">
			<el-result icon="warning" title="权限不足" sub-title="此页面仅限管理员访问" />
		</div>

		<!-- 监控内容 -->
		<div v-else class="monitoring-content">
			<!-- 页面标题 -->
			<div class="page-header">
				<h2>访客监控</h2>
				<el-button
					type="primary"
					:icon="loading ? 'Loading' : 'Refresh'"
					:loading="loading"
					@click="handleRefresh">
					刷新数据
				</el-button>
			</div>

			<!-- 统计数据卡片 -->
			<div class="statistics-cards">
				<el-card shadow="hover">
					<div class="stat-item">
						<div class="stat-label">总访客数</div>
						<div class="stat-value">{{ statistics.totalVisitors }}</div>
					</div>
				</el-card>

				<el-card shadow="hover">
					<div class="stat-item">
						<div class="stat-label">总 LLM 调用</div>
						<div class="stat-value">{{ statistics.totalLLMCalls }}</div>
					</div>
				</el-card>

				<el-card shadow="hover">
					<div class="stat-item">
						<div class="stat-label">总 Token 消耗</div>
						<div class="stat-value">
							{{ statistics.totalTokens.toLocaleString() }}
						</div>
					</div>
				</el-card>

				<el-card shadow="hover">
					<div class="stat-item">
						<div class="stat-label">总事件数</div>
						<div class="stat-value">{{ statistics.totalEvents }}</div>
					</div>
				</el-card>
			</div>

			<!-- 最后清理时间 -->
			<el-alert
				v-if="statistics.lastCleanupTime"
				type="info"
				:closable="false"
				style="margin-bottom: 20px">
				<template #title> 最后清理时间: {{ formattedLastCleanup }} </template>
			</el-alert>

			<!-- 访客会话列表 -->
			<el-card shadow="never">
				<template #header>
					<div class="card-header">
						<span>访客会话列表</span>
						<span class="session-count">共 {{ sessions.length }} 个会话</span>
					</div>
				</template>

				<el-table
					:data="sessions"
					v-loading="loading"
					stripe
					style="width: 100%"
					@expand-change="handleRowExpand"
					:expand-row-keys="expandedRows"
					row-key="fingerprint">
					<!-- 展开列 -->
					<el-table-column type="expand">
						<template #default>
							<div class="event-details">
								<h4>访客事件详情</h4>
								<el-table
									v-if="sessionEvents.length > 0"
									:data="sessionEvents"
									size="small"
									stripe>
									<el-table-column
										prop="title"
										label="标题"
										min-width="150" />
									<el-table-column
										label="开始时间"
										min-width="180">
										<template #default="{ row }">
											{{
												formatDateTime(
													row.start_time
												)
											}}
										</template>
									</el-table-column>
									<el-table-column
										label="结束时间"
										min-width="180">
										<template #default="{ row }">
											{{
												formatDateTime(
													row.end_time
												)
											}}
										</template>
									</el-table-column>
									<el-table-column
										label="创建时间"
										min-width="180">
										<template #default="{ row }">
											{{
												formatDateTime(
													row.created_at
												)
											}}
										</template>
									</el-table-column>
									<el-table-column
										prop="location"
										label="地点"
										min-width="120" />
								</el-table>
								<el-empty
									v-else
									description="该访客暂无事件"
									:image-size="80" />
							</div>
						</template>
					</el-table-column>

					<!-- 指纹列 -->
					<el-table-column label="指纹" min-width="150">
						<template #default="{ row }">
							<el-tooltip :content="row.fingerprint" placement="top">
								<span class="fingerprint">{{
									formatFingerprint(row.fingerprint)
								}}</span>
							</el-tooltip>
						</template>
					</el-table-column>

					<!-- LLM 调用列 -->
					<el-table-column label="LLM 调用" width="100" align="center">
						<template #default="{ row }">
							<el-tag
								:type="row.llm_used_count > 0 ? 'success' : 'info'"
								size="small">
								{{ row.llm_used_count }}/1
							</el-tag>
						</template>
					</el-table-column>

					<!-- Token 消耗列 -->
					<el-table-column label="Token 消耗" width="120" align="right">
						<template #default="{ row }">
							{{ row.llm_token_used.toLocaleString() }}
						</template>
					</el-table-column>

					<!-- 事件数列 -->
					<el-table-column label="事件数" width="100" align="center">
						<template #default="{ row }">
							<el-tag
								:type="row.event_count >= 3 ? 'warning' : 'info'"
								size="small">
								{{ row.event_count }}/3
							</el-tag>
						</template>
					</el-table-column>

					<!-- 创建时间列 -->
					<el-table-column label="创建时间" min-width="180">
						<template #default="{ row }">
							<div>{{ formatDateTime(row.created_at) }}</div>
							<div class="relative-time">
								{{ formatRelativeTime(row.created_at) }}
							</div>
						</template>
					</el-table-column>

					<!-- 最后活跃列 -->
					<el-table-column label="最后活跃" min-width="180">
						<template #default="{ row }">
							<div>{{ formatDateTime(row.last_active_at) }}</div>
							<div class="relative-time">
								{{ formatRelativeTime(row.last_active_at) }}
							</div>
						</template>
					</el-table-column>
				</el-table>
			</el-card>
		</div>
	</div>
</template>

<style scoped>
.monitoring-page {
	padding: 20px;
	max-width: 1400px;
	margin: 0 auto;
}

.access-denied {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 400px;
}

.monitoring-content {
	width: 100%;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.page-header h2 {
	margin: 0;
	font-size: 24px;
	font-weight: 600;
}

.statistics-cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 16px;
	margin-bottom: 20px;
}

.stat-item {
	text-align: center;
	padding: 10px 0;
}

.stat-label {
	font-size: 14px;
	color: var(--el-text-color-secondary);
	margin-bottom: 8px;
}

.stat-value {
	font-size: 28px;
	font-weight: 600;
	color: var(--el-color-primary);
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.session-count {
	font-size: 14px;
	color: var(--el-text-color-secondary);
}

.fingerprint {
	font-family: monospace;
	font-size: 13px;
	cursor: help;
}

.relative-time {
	font-size: 12px;
	color: var(--el-text-color-secondary);
	margin-top: 4px;
}

.event-details {
	padding: 20px;
	background-color: var(--el-fill-color-light);
}

.event-details h4 {
	margin: 0 0 16px 0;
	font-size: 16px;
	font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
	.statistics-cards {
		grid-template-columns: repeat(2, 1fr);
	}

	.page-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}
}
</style>
