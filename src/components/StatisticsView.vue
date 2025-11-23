<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Bar, Pie } from "vue-chartjs";
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from "chart.js";
import { useEvents } from "@/composables/useEvents";
import { useStatistics } from "@/composables/useStatistics";
import { useTheme } from "@/composables/useTheme";
import dayjs from "dayjs";

/**
 * StatisticsView Component
 * Displays statistical analysis of calendar events
 * Implements requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

// Register Chart.js components
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

// Composables
const { events } = useEvents();
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
const timeChartOptions = {
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: {
			display: true,
			position: "top" as const,
		},
		title: {
			display: true,
			text: "时间段分布统计",
			font: {
				size: 16,
				weight: "bold" as const,
			},
		},
	},
	scales: {
		y: {
			beginAtZero: true,
			ticks: {
				stepSize: 1,
			},
		},
	},
};

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
const locationChartOptions = {
	responsive: true,
	maintainAspectRatio: false,
	plugins: {
		legend: {
			display: true,
			position: "right" as const,
		},
		title: {
			display: true,
			text: "地点分布统计",
			font: {
				size: 16,
				weight: "bold" as const,
			},
		},
		tooltip: {
			callbacks: {
				label: function (context: any) {
					const label = context.label || "";
					const value = context.parsed || 0;
					const percentage =
						locationDistribution.value[context.dataIndex]?.percentage || 0;
					return `${label}: ${value} (${percentage}%)`;
				},
			},
		},
	},
};

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
</script>

<template>
	<div class="statistics-view">
		<!-- Header with filters -->
		<div class="statistics-header">
			<div class="statistics-summary">
				<div class="summary-card">
					<div class="summary-icon">📊</div>
					<div class="summary-content">
						<div class="summary-label">总事件数</div>
						<div class="summary-value">{{ totalEvents }}</div>
					</div>
				</div>
				<div class="summary-card">
					<div class="summary-icon">📅</div>
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
		<div v-if="filteredEvents.length === 0" class="empty-state">
			<div class="empty-icon">📭</div>
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

/* Header */
.statistics-header {
	margin-bottom: 32px;
}

.statistics-summary {
	display: flex;
	gap: 16px;
	margin-bottom: 24px;
	flex-wrap: wrap;
}

.summary-card {
	flex: 1;
	min-width: 200px;
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 20px;
	background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
	border-radius: 12px;
	box-shadow: 0 2px 8px var(--shadow);
	color: white;
	transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.summary-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px var(--shadow);
}

.summary-icon {
	font-size: 48px;
	line-height: 1;
}

.summary-content {
	flex: 1;
}

.summary-label {
	font-size: 14px;
	opacity: 0.9;
	margin-bottom: 4px;
}

.summary-value {
	font-size: 32px;
	font-weight: 700;
}

/* Filters */
.statistics-filters {
	display: flex;
	gap: 24px;
	flex-wrap: wrap;
	align-items: center;
	padding: 20px;
	background: var(--bg-color);
	border-radius: 8px;
	border: 2px solid var(--border-light);
}

.filter-group {
	display: flex;
	align-items: center;
	gap: 12px;
}

.filter-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	white-space: nowrap;
}

/* Empty State */
.empty-state {
	text-align: center;
	padding: 80px 20px;
}

.empty-icon {
	font-size: 80px;
	margin-bottom: 16px;
	opacity: 0.5;
}

.empty-text {
	font-size: 18px;
	font-weight: 600;
	color: var(--text-secondary);
	margin: 0 0 8px 0;
}

.empty-hint {
	font-size: 14px;
	color: var(--text-tertiary);
	margin: 0;
}

/* Charts */
.statistics-charts {
	display: grid;
	grid-template-columns: 1fr;
	gap: 32px;
}

.chart-container {
	background: var(--bg-color);
	border-radius: 12px;
	padding: 24px;
	box-shadow: 0 2px 8px var(--shadow);
	border: 2px solid var(--border-light);
}

.chart-wrapper {
	height: 400px;
	position: relative;
}

.chart-wrapper--pie {
	height: 350px;
}

/* Location Details */
.location-details {
	margin-top: 24px;
	padding-top: 24px;
	border-top: 2px solid var(--border-light);
}

.details-title {
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
	margin: 0 0 16px 0;
}

.details-table {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.details-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	background: var(--bg-secondary);
	border-radius: 8px;
	transition: background 0.2s ease;
}

.details-row:hover {
	background: var(--bg-hover);
}

.details-location {
	display: flex;
	align-items: center;
	gap: 12px;
	flex: 1;
}

.location-badge {
	width: 16px;
	height: 16px;
	border-radius: 4px;
	flex-shrink: 0;
}

.location-name {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
}

.details-stats {
	display: flex;
	align-items: center;
	gap: 16px;
}

.stats-count {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
}

.stats-percentage {
	font-size: 14px;
	font-weight: 600;
	color: var(--primary-color);
	min-width: 50px;
	text-align: right;
}

/* Responsive Design */
@media (max-width: 1200px) {
	.statistics-charts {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 768px) {
	.statistics-view {
		padding: 16px;
	}

	.statistics-summary {
		flex-direction: column;
	}

	.summary-card {
		min-width: 100%;
	}

	.statistics-filters {
		flex-direction: column;
		align-items: stretch;
	}

	.filter-group {
		flex-direction: column;
		align-items: stretch;
	}

	.chart-wrapper {
		height: 300px;
	}

	.chart-wrapper--pie {
		height: 280px;
	}
}

@media (max-width: 480px) {
	.statistics-view {
		padding: 12px;
	}

	.summary-icon {
		font-size: 36px;
	}

	.summary-value {
		font-size: 24px;
	}

	.chart-container {
		padding: 16px;
	}

	.details-row {
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.details-stats {
		width: 100%;
		justify-content: space-between;
	}
}
</style>
