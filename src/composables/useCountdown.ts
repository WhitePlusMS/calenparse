import { ref, watch, onScopeDispose } from "vue";
import type { CalendarEvent, CountdownInfo } from "@/types";
import { useCountdownSettings } from "./useCountdownSettings";

export function useCountdown() {
	const updateTrigger = ref(0);
	let updateInterval: number | null = null;
	let midnightTimeout: number | null = null;

	// Watch for settings changes and trigger update
	const { settings } = useCountdownSettings();
	const stopWatch = watch(settings, () => {
		forceUpdate();
	});

	// Clean up watcher when scope is disposed
	onScopeDispose(() => {
		stopWatch();
	});

	/**
	 * 计算两个日期之间的时间差
	 */
	function calculateDiff(from: Date, to: Date, unit: "day" | "hour" | "minute"): number {
		const msPerUnit = {
			day: 24 * 60 * 60 * 1000,
			hour: 60 * 60 * 1000,
			minute: 60 * 1000,
		};

		const diffMs = to.getTime() - from.getTime();
		return Math.floor(diffMs / msPerUnit[unit]);
	}

	/**
	 * 格式化开始倒计时文本
	 */
	function formatStartCountdown(value: number, unit: "day" | "hour" | "minute"): string {
		const unitText = {
			day: "天",
			hour: "小时",
			minute: "分钟",
		};

		if (value === 0) {
			return unit === "day" ? "今天开始" : "即将开始";
		}
		if (value === 1 && unit === "day") {
			return "明天开始";
		}
		return `还有 ${value} ${unitText[unit]}开始`;
	}

	/**
	 * 格式化结束倒计时文本
	 */
	function formatEndCountdown(value: number, unit: "day" | "hour" | "minute"): string {
		const unitText = {
			day: "天",
			hour: "小时",
			minute: "分钟",
		};

		if (value === 0) {
			return unit === "day" ? "今天结束" : "即将结束";
		}
		if (value === 1 && unit === "day") {
			return "明天结束";
		}
		return `还有 ${value} ${unitText[unit]}结束`;
	}

	/**
	 * 格式化已过期倒计时文本
	 */
	function formatOverdueCountdown(value: number, unit: "day" | "hour" | "minute"): string {
		const unitText = {
			day: "天",
			hour: "小时",
			minute: "分钟",
		};

		if (value === 0) {
			return unit === "day" ? "今天过期" : "刚刚过期";
		}
		if (value === 1 && unit === "day") {
			return "过期 1 天";
		}
		return `已过期 ${value} ${unitText[unit]}`;
	}

	/**
	 * 获取日程的倒计时信息
	 */
	function getCountdown(event: CalendarEvent, unit: "day" | "hour" | "minute" = "day"): CountdownInfo {
		// 访问 updateTrigger 以建立响应式依赖追踪
		void updateTrigger.value;

		const now = new Date();

		// 已完成不显示倒计时
		if (event.isCompleted) {
			return { type: "none" };
		}

		// 已过期但未完成：显示过期倒计时（红色警告）
		if (event.endTime < now) {
			const diff = calculateDiff(event.endTime, now, unit);
			const text = formatOverdueCountdown(diff, unit);
			return { type: "overdue", value: diff, unit, text };
		}

		// 未开始：显示开始倒计时
		if (event.startTime > now) {
			const diff = calculateDiff(now, event.startTime, unit);
			const text = formatStartCountdown(diff, unit);
			return { type: "start", value: diff, unit, text };
		}

		// 进行中：显示结束倒计时
		if (event.startTime <= now && event.endTime > now) {
			const diff = calculateDiff(now, event.endTime, unit);
			const text = formatEndCountdown(diff, unit);
			return { type: "end", value: diff, unit, text };
		}

		return { type: "none" };
	}

	/**
	 * 强制更新倒计时
	 */
	function forceUpdate() {
		updateTrigger.value++;
	}

	/**
	 * 设置午夜自动刷新
	 */
	function scheduleMidnightRefresh() {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		const msUntilMidnight = tomorrow.getTime() - now.getTime();

		midnightTimeout = window.setTimeout(() => {
			forceUpdate();
			scheduleMidnightRefresh(); // 递归设置下一个午夜
		}, msUntilMidnight);
	}

	/**
	 * 处理页面可见性变化
	 */
	function handleVisibilityChange() {
		if (document.hidden) {
			stopAutoUpdate();
		} else {
			forceUpdate();
			startAutoUpdate();
		}
	}

	/**
	 * 处理页面焦点
	 */
	function handleFocus() {
		forceUpdate();
	}

	/**
	 * 启动自动更新
	 */
	function startAutoUpdate() {
		// 每分钟更新一次
		updateInterval = window.setInterval(() => {
			forceUpdate();
		}, 60000);

		// 监听页面可见性
		document.addEventListener("visibilitychange", handleVisibilityChange);

		// 监听页面焦点
		window.addEventListener("focus", handleFocus);

		// 设置午夜刷新
		scheduleMidnightRefresh();
	}

	/**
	 * 停止自动更新
	 */
	function stopAutoUpdate() {
		if (updateInterval !== null) {
			clearInterval(updateInterval);
			updateInterval = null;
		}

		if (midnightTimeout !== null) {
			clearTimeout(midnightTimeout);
			midnightTimeout = null;
		}

		document.removeEventListener("visibilitychange", handleVisibilityChange);
		window.removeEventListener("focus", handleFocus);
	}

	return {
		getCountdown,
		startAutoUpdate,
		stopAutoUpdate,
		forceUpdate,
	};
}
