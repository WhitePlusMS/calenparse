<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Bar, Pie } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from "chart.js";
import { useEvents } from "@/composables/useEvents";
import { useStatistics } from "@/composables/useStatistics";
import { useTheme } from "@/composables/useTheme";
import ErrorState from "./ErrorState.vue";
import dayjs from "dayjs";

/**
 * StatisticsView Component
 * Displays statistical analysis of calendar events
 * Implements requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

// Register Chart.js components
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

// Composables
const { events, loading, error, clearError, fetchEvents } = useEvents();
const { theme } = useTheme();

// Date range selection
const dateRange = ref<[Date, Date] | null>(null);
const granularity = ref<"day" | "week" | "month">("day");

// Compute start and end dates
const startDate = computed(() => (dateRange.value ? dateRange.value[0] : undefined));
const endDate = computed(() => (dateRange.value ? dateRange.value[1] : undefined));

// Statistics
const {
	totalEvents,
	timeDistributionByDay,
	timeDistributionByWeek,
	timeDistributionByMonth,
	locationDistribution,
	filteredEvents,
} = useStatistics(events.value, startDate.value, endDate.value);

// Watch for date range changes and update statistics
watch([dateRange, events], () => {
	// Statistics will automatically update due to computed properties
});

// Get time distribution based on granularity
const timeDistribution = computed(() => {
	switch (granularity.value) {
		case "week":
			return timeDistributionByWeek.value;
		case "month":
			return timeDistributionByMonth.value;
		default:
			return timeDistributionByDay.value;
	}
});

// Chart data for time distribution
const timeChartData = computed(() => {
	const primaryColor = theme.value.primaryColor;
	// Convert hex to rgba
	const hexToRgba = (hex: string, alpha: number) => {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	};

	return {
		labels: timeDistribution.value.map((d) => d.label),
		datasets: [
			{
				label: "事件数量",
				data: timeDistribution.value.map((d) => d.count),
				backgroundColor: hexToRgba(primaryColor, 0.6),
				borderColor: primaryColor,
				borderWidth: 2,
			},
		],
	};
});

// Chart options for time distribution
const timeChartOptions = computed(() => {
	// 依赖 theme.mode 以便主题切换时重新计算
	const isDark = theme.value.mode === "dark";
	const textColor = isDark ? "#e5e7eb" : "#1f2937";
	const secondaryTextColor = isDark ? "#9ca3af" : "#6b7280";
	const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";

	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: "top" as const,
				labels: {
					color: getComputedStyle(document.documentElement)
						.getPropertyValue("--text-primary")
						.trim(),
					font: {
						size: 13,
						weight: 600,
					},
					padding: 16,
					usePointStyle: true,
					pointStyle: "circle",
				},
			},
			title: {
				display: true,
				text: "时间段分布统计",
				color: getComputedStyle(document.documentElement)
					.getPropertyValue("--text-primary")
					.trim(),
				font: {
					size: 18,
					weight: 700,
				},
				padding: {
					top: 0,
					bottom: 24,
				},
			},
			tooltip: {
				backgroundColor: "rgba(0, 0, 0, 0.8)",
				titleFont: {
					size: 14,
					weight: 600,
				},
				bodyFont: {
					size: 13,
				},
				padding: 12,
				cornerRadius: 8,
				displayColors: true,
				callbacks: {
					label: function (context: any) {
						const label = context.dataset.label || "";
						const value = context.parsed.y || 0;
						return `${label}: ${value} 个事件`;
					},
				},
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				ticks: {
					color: secondaryTextColor,
					stepSize: 1,
					font: {
						size: 12,
					},
				},
				grid: {
					color: gridColor,
				},
			},
			x: {
				ticks: {
					color: secondaryTextColor,
					font: {
						size: 12,
					},
				},
				grid: {
					display: false,
				},
			},
		},
		interaction: {
			mode: "index" as const,
			intersect: false,
		},
	};
});

// Chart data for location distribution
const locationChartData = computed(() => {
	const colors = [
		"rgba(64, 158, 255, 0.8)",
		"rgba(103, 194, 58, 0.8)",
		"rgba(245, 108, 108, 0.8)",
		"rgba(230, 162, 60, 0.8)",
		"rgba(144, 147, 153, 0.8)",
		"rgba(103, 58, 183, 0.8)",
		"rgba(0, 188, 212, 0.8)",
		"rgba(255, 152, 0, 0.8)",
	];

	return {
		labels: locationDistribution.value.map((d) => d.location),
		datasets: [
			{
				label: "事件数量",
				data: locationDistribution.value.map((d) => d.count),
				backgroundColor: locationDistribution.value.map((_, i) => colors[i % colors.length]),
				borderWidth: 2,
				borderColor: "var(--bg-secondary)",
			},
		],
	};
});

// Chart options for location distribution
const locationChartOptions = computed(() => {
	// 依赖 theme.mode 以便主题切换时重新计算
	const isDark = theme.value.mode === "dark";
	const textColor = isDark ? "#e5e7eb" : "#1f2937";

	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: "right" as const,
				labels: {
					color: textColor,
					font: {
						size: 13,
						weight: 600,
					},
					padding: 12,
					usePointStyle: true,
					pointStyle: "circle",
					generateLabels: function (chart: any) {
						const data = chart.data;
						if (data.labels.length && data.datasets.length) {
							return data.labels.map((label: string, i: number) => {
								const percentage =
									locationDistribution.value[i]?.percentage || 0;
								return {
									text: `${label} (${percentage}%)`,
									fillStyle: data.datasets[0].backgroundColor[i],
									fontColor: textColor,
									hidden: false,
									index: i,
								};
							});
						}
						return [];
					},
				},
			},
			title: {
				display: true,
				text: "地点分布统计",
				color: textColor,
				font: {
					size: 18,
					weight: 700,
				},
				padding: {
					top: 0,
					bottom: 24,
				},
			},
			tooltip: {
				backgroundColor: "rgba(0, 0, 0, 0.8)",
				titleFont: {
					size: 14,
					weight: 600,
				},
				bodyFont: {
					size: 13,
				},
				padding: 12,
				cornerRadius: 8,
				displayColors: true,
				callbacks: {
					label: function (context: any) {
						const label = context.label || "";
						const value = context.parsed || 0;
						const percentage =
							locationDistribution.value[context.dataIndex]?.percentage || 0;
						return `${label}: ${value} 个事件 (${percentage}%)`;
					},
				},
			},
		},
		interaction: {
			mode: "point" as const,
			intersect: true,
		},
	};
});

// Shortcuts for date range picker
const shortcuts = [
	{
		text: "最近7天",
		value: () => {
			const end = new Date();
			const start = new Date();
			start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
			return [start, end];
		},
	},
	{
		text: "最近30天",
		value: () => {
			const end = new Date();
			const start = new Date();
			start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
			return [start, end];
		},
	},
	{
		text: "最近90天",
		value: () => {
			const end = new Date();
			const start = new Date();
			start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
			return [start, end];
		},
	},
	{
		text: "本月",
		value: () => {
			const start = dayjs().startOf("month").toDate();
			const end = dayjs().endOf("month").toDate();
			return [start, end];
		},
	},
	{
		text: "本年",
		value: () => {
			const start = dayjs().startOf("year").toDate();
			const end = dayjs().endOf("year").toDate();
			return [start, end];
		},
	},
];

// Clear date range filter
const clearDateRange = () => {
	dateRange.value = null;
};

/**
 * Handle retry after error
 * Requirement 13.3: Error state with retry button
 */
const handleRetry = async () => {
	clearError();
	await fetchEvents();
};
</script>

<template>
	<div class="statistics-view">
		<!-- Error State -->
		<!-- Requirement 13.3: Error state with retry button -->
		<ErrorState v-if="error && !loading" title="加载统计失败" :message="error" @retry="handleRetry" />

		<!-- Loading State -->
		<!-- Requirement 13.4: Progress indicator -->
		<div v-else-if="loading" class="loading-overlay">
			<div class="loading-spinner">
				<div class="spinner-ring"></div>
				<div class="spinner-ring"></div>
				<div class="spinner-ring"></div>
				<div class="loading-text">加载统计数据中...</div>
			</div>
		</div>

		<!-- Header with filters -->
		<div v-else class="statistics-header">
			<div class="statistics-summary">
				<div class="summary-card">
					<el-icon class="summary-icon" :size="32"><DataAnalysis /></el-icon>
					<div class="summary-content">
						<div class="summary-label">总事件数</div>
						<div class="summary-value">{{ totalEvents }}</div>
					</div>
				</div>
				<div class="summary-card">
					<el-icon class="summary-icon" :size="32"><Calendar /></el-icon>
					<div class="summary-content">
						<div class="summary-label">已筛选事件</div>
						<div class="summary-value">{{ filteredEvents.length }}</div>
					</div>
				</div>
			</div>

			<div class="statistics-filters">
				<div class="filter-group">
					<label class="filter-label">时间范围：</label>
					<el-date-picker
						v-model="dateRange"
						type="daterange"
						range-separator="至"
						start-placeholder="开始日期"
						end-placeholder="结束日期"
						:shortcuts="shortcuts"
						:clearable="true"
						@clear="clearDateRange"
						style="width: 320px" />
				</div>

				<div class="filter-group">
					<label class="filter-label">统计粒度：</label>
					<el-radio-group v-model="granularity">
						<el-radio-button label="day">按日</el-radio-button>
						<el-radio-button label="week">按周</el-radio-button>
						<el-radio-button label="month">按月</el-radio-button>
					</el-radio-group>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<!-- Requirement 13.2: Friendly empty state with illustration and guidance -->
		<div v-if="filteredEvents.length === 0" class="empty-state">
			<div class="empty-icon">
				<el-icon :size="64"><FolderOpened /></el-icon>
			</div>
			<p class="empty-text">暂无事件数据</p>
			<p class="empty-hint">{{ dateRange ? "请调整时间范围或清除筛选条件" : "请先创建一些事件" }}</p>
		</div>

		<!-- Charts -->
		<div v-else class="statistics-charts">
			<!-- Time Distribution Chart -->
			<div class="chart-container">
				<div class="chart-wrapper">
					<Bar :data="timeChartData" :options="timeChartOptions" />
				</div>
			</div>

			<!-- Location Distribution Chart -->
			<div class="chart-container">
				<div class="chart-wrapper chart-wrapper--pie">
					<Pie :data="locationChartData" :options="locationChartOptions" />
				</div>

				<!-- Location details table -->
				<div class="location-details">
					<h3 class="details-title">地点详情</h3>
					<div class="details-table">
						<div
							v-for="(item, index) in locationDistribution"
							:key="index"
							class="details-row">
							<div class="details-location">
								<span
									class="location-badge"
									:style="{
										backgroundColor:
											locationChartData.datasets[0]
												?.backgroundColor?.[
												index
											] || '#ccc',
									}"></span>
								<span class="location-name">{{ item.location }}</span>
							</div>
							<div class="details-stats">
								<span class="stats-count">{{ item.count }} 个</span>
								<span class="stats-percentage"
									>{{ item.percentage }}%</span
								>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.statistics-view {
	padding: 24px;
	background: var(--bg-secondary);
	border-radius: 12px;
	min-height: 600px;
}

/* Loading State */
.loading-overlay {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 400px;
	animation: fadeIn 0.3s ease-out;
}

.loading-spinner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
}

.spinner-ring {
	width: 60px;
	height: 60px;
	border: 4px solid var(--border-light);
	border-top-color: var(--primary-color);
	border-radius: 50%;
	animation: spin 1s linear infinite;
	position: absolute;
}

.spinner-ring:nth-child(2) {
	width: 50px;
	height: 50px;
	border-top-color: var(--primary-light);
	animation-delay: 0.1s;
}

.spinner-ring:nth-child(3) {
	width: 40px;
	height: 40px;
	border-top-color: var(--primary-dark);
	animation-delay: 0.2s;
}

.loading-text {
	margin-top: 80px;
	font-size: 14px;
	color: var(--text-secondary);
	font-weight: 500;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

/* Header */
.statistics-header {
	margin-bottom: 32px;
}

.statistics-summary {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 20px;
	margin-bottom: 32px;
}

.summary-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 32px 24px;
	background: var(--bg-color);
	border: 2px solid var(--border-light);
	border-radius: 16px;
	box-shadow: 0 2px 12px var(--shadow);
	transition: all 0.3s ease;
	position: relative;
	overflow: hidden;
}

.summary-card::before {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4px;
	background: linear-gradient(90deg, var(--primary-color) 0%, var(--primary-light) 100%);
}

.summary-card:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 24px var(--shadow);
	border-color: var(--primary-color);
}

.summary-icon {
	font-size: 56px;
	line-height: 1;
	margin-bottom: 16px;
	opacity: 0.9;
}

.summary-content {
	text-align: center;
	width: 100%;
}

/* Typography hierarchy - Requirement 12.1: Font sizes distinguish content */
.summary-label {
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: var(--text-secondary);
	margin-bottom: var(--spacing-sm);
	text-transform: uppercase;
	letter-spacing: 0.8px;
	line-height: var(--line-height-tight);
}

/* Primary metric - Requirement 12.2: Color contrast, 12.4: Visual weight */
.summary-value {
	font-size: var(--font-size-5xl);
	font-weight: var(--font-weight-bold);
	color: var(--primary-color);
	line-height: var(--line-height-tight);
	letter-spacing: -1px;
}

/* Filters */
.statistics-filters {
	display: flex;
	gap: 32px;
	flex-wrap: wrap;
	align-items: center;
	padding: 24px;
	background: var(--bg-color);
	border-radius: 12px;
	border: 2px solid var(--border-light);
	box-shadow: 0 2px 8px var(--shadow);
}

.filter-group {
	display: flex;
	align-items: center;
	gap: 14px;
}

/* Filter labels - Requirement 12.1: Clear typography */
.filter-label {
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	white-space: nowrap;
	letter-spacing: 0.3px;
	line-height: var(--line-height-normal);
}

/* Empty State - Requirement 12.1, 12.2, 12.3: Clear hierarchy */
.empty-state {
	text-align: center;
	padding: var(--spacing-2xl) var(--spacing-xl);
	background: var(--bg-color);
	border-radius: var(--radius-2xl);
	border: 2px dashed var(--border-light);
}

.empty-icon {
	font-size: 96px;
	margin-bottom: var(--spacing-xl);
	opacity: 0.6;
	animation: emptyFloat 3s ease-in-out infinite;
}

@keyframes emptyFloat {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-10px);
	}
}

/* Primary message - Requirement 12.1: Larger font, 12.4: Visual weight */
.empty-text {
	font-size: var(--font-size-2xl);
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	margin: 0 0 var(--spacing-md) 0;
	line-height: var(--line-height-tight);
}

/* Secondary message - Requirement 12.1: Smaller font */
.empty-hint {
	font-size: var(--font-size-base);
	color: var(--text-secondary);
	margin: 0;
	line-height: var(--line-height-relaxed);
}

/* Charts */
.statistics-charts {
	display: grid;
	grid-template-columns: 1fr;
	gap: 32px;
}

.chart-container {
	background: var(--bg-color);
	border-radius: 16px;
	padding: 32px;
	box-shadow: 0 2px 12px var(--shadow);
	border: 2px solid var(--border-light);
	transition: all 0.3s ease;
}

.chart-container:hover {
	box-shadow: 0 4px 20px var(--shadow);
	border-color: var(--primary-light);
}

.chart-wrapper {
	height: 420px;
	position: relative;
	margin-bottom: 8px;
}

.chart-wrapper--pie {
	height: 380px;
}

/* Location Details - Requirement 12.3: Whitespace separation */
.location-details {
	margin-top: var(--spacing-xl);
	padding-top: var(--spacing-xl);
	border-top: 2px solid var(--border-light);
}

/* Section title - Requirement 12.1: Font hierarchy */
.details-title {
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	margin: 0 0 var(--spacing-lg) 0;
	letter-spacing: -0.3px;
	line-height: var(--line-height-tight);
}

.details-table {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
}

/* Details row - Requirement 12.3: Adequate padding, 12.5: Limited density */
.details-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing-lg) var(--spacing-xl);
	background: var(--bg-secondary);
	border: 1px solid var(--border-light);
	border-radius: var(--radius-xl);
	transition: all 0.2s ease;
}

.details-row:hover {
	background: var(--bg-hover);
	border-color: var(--primary-light);
	transform: translateX(4px);
	box-shadow: 0 2px 8px var(--shadow);
}

.details-location {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
	flex: 1;
}

.location-badge {
	width: 20px;
	height: 20px;
	border-radius: var(--radius-md);
	flex-shrink: 0;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Location name - Requirement 12.1: Clear typography */
.location-name {
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	color: var(--text-primary);
	line-height: var(--line-height-normal);
}

.details-stats {
	display: flex;
	align-items: center;
	gap: var(--spacing-lg);
}

/* Secondary stat - Requirement 12.1: Smaller font */
.stats-count {
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-semibold);
	color: var(--text-secondary);
	line-height: var(--line-height-normal);
}

/* Primary stat - Requirement 12.2: Color contrast, 12.4: Visual weight */
.stats-percentage {
	font-size: var(--font-size-lg);
	font-weight: var(--font-weight-bold);
	color: var(--primary-color);
	min-width: 60px;
	text-align: right;
	line-height: var(--line-height-tight);
}

/* Responsive Design */
@media (max-width: 1200px) {
	.statistics-charts {
		grid-template-columns: 1fr;
	}

	.statistics-summary {
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}
}

@media (max-width: 768px) {
	.statistics-view {
		padding: 16px;
	}

	.statistics-summary {
		grid-template-columns: 1fr;
		gap: 16px;
	}

	.summary-card {
		padding: 24px 20px;
	}

	.summary-icon {
		font-size: 48px;
	}

	.summary-value {
		font-size: 40px;
	}

	.statistics-filters {
		flex-direction: column;
		align-items: stretch;
		gap: 20px;
		padding: 20px;
	}

	.filter-group {
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
	}

	.chart-wrapper {
		height: 320px;
	}

	.chart-wrapper--pie {
		height: 300px;
	}

	.chart-container {
		padding: 24px;
	}
}

@media (max-width: 480px) {
	.statistics-view {
		padding: 12px;
	}

	.summary-card {
		padding: 20px 16px;
	}

	.summary-icon {
		font-size: 40px;
		margin-bottom: 12px;
	}

	.summary-value {
		font-size: 36px;
	}

	.summary-label {
		font-size: 13px;
	}

	.chart-container {
		padding: 20px;
	}

	.chart-wrapper {
		height: 280px;
	}

	.chart-wrapper--pie {
		height: 260px;
	}

	.details-row {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
	}

	.details-stats {
		width: 100%;
		justify-content: space-between;
	}

	.location-details {
		margin-top: 24px;
		padding-top: 24px;
	}

	.empty-state {
		padding: 60px 20px;
	}

	.empty-icon {
		font-size: 72px;
	}
}
</style>
