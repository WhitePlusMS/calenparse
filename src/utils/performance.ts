/**
 * Performance monitoring utilities
 * Helps track and optimize application performance
 */

import dayjs from "dayjs";

// Constants
const BYTES_TO_MB = 1048576;
const DEFAULT_MAX_METRICS = 100;

interface PerformanceMetric {
	name: string;
	duration: number;
	timestamp: number;
}

interface PerformanceSummary {
	count: number;
	avg: number;
	min: number;
	max: number;
}

class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private timers: Map<string, number> = new Map();
	private maxMetrics: number = DEFAULT_MAX_METRICS;

	/**
	 * Start timing an operation
	 */
	startTimer(name: string): void {
		this.timers.set(name, performance.now());
	}

	/**
	 * End timing an operation and record the metric
	 */
	endTimer(name: string): number | null {
		const startTime = this.timers.get(name);
		if (!startTime) {
			console.warn(`Timer "${name}" was not started`);
			return null;
		}

		const duration = performance.now() - startTime;
		this.timers.delete(name);

		this.metrics.push({
			name,
			duration,
			timestamp: dayjs().valueOf(),
		});

		// Keep only last N metrics to prevent memory leak
		if (this.metrics.length > this.maxMetrics) {
			this.metrics.shift();
		}

		if (import.meta.env.DEV) {
			console.log(`[Timer] ${name}: ${duration.toFixed(2)}ms`);
		}

		return duration;
	}

	/**
	 * Measure an async operation
	 */
	async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
		this.startTimer(name);
		try {
			const result = await operation();
			return result;
		} catch (error) {
			throw error;
		} finally {
			this.endTimer(name);
		}
	}

	/**
	 * Set maximum number of metrics to keep in memory
	 */
	setMaxMetrics(max: number): void {
		this.maxMetrics = Math.max(1, max);
	}

	/**
	 * Get all recorded metrics
	 */
	getMetrics(): PerformanceMetric[] {
		return [...this.metrics];
	}

	/**
	 * Get average duration for a specific metric
	 */
	getAverageDuration(name: string): number | null {
		const relevantMetrics = this.metrics.filter((m) => m.name === name);
		if (relevantMetrics.length === 0) return null;

		const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
		return total / relevantMetrics.length;
	}

	/**
	 * Get performance summary
	 */
	getSummary(): Record<string, PerformanceSummary> {
		const summary: Record<string, PerformanceSummary> = {};

		for (const metric of this.metrics) {
			if (!summary[metric.name]) {
				summary[metric.name] = {
					count: 0,
					avg: 0,
					min: Infinity,
					max: -Infinity,
				};
			}

			const s = summary[metric.name];
			if (s) {
				s.count++;
				s.min = Math.min(s.min, metric.duration);
				s.max = Math.max(s.max, metric.duration);
			}
		}

		// Calculate averages
		for (const name in summary) {
			const relevantMetrics = this.metrics.filter((m) => m.name === name);
			const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
			const summaryItem = summary[name];
			if (summaryItem) {
				summaryItem.avg = total / relevantMetrics.length;
			}
		}

		return summary;
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics = [];
		this.timers.clear();
	}

	/**
	 * Log performance summary to console
	 */
	logSummary(): void {
		const summary = this.getSummary();
		console.table(summary);
	}
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring function execution time
 * Note: Only works with async functions
 */
export function measurePerformance(name?: string) {
	return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;
		const metricName = name || `${(target as any).constructor.name}.${propertyKey}`;

		descriptor.value = async function (this: unknown, ...args: unknown[]) {
			return performanceMonitor.measure(metricName, () => originalMethod.apply(this, args));
		};

		return descriptor;
	};
}

/**
 * Check if performance API is available
 */
export function isPerformanceSupported(): boolean {
	return typeof performance !== "undefined" && typeof performance.now === "function";
}

/**
 * Get page load metrics
 */
export function getPageLoadMetrics() {
	if (!isPerformanceSupported()) return null;

	const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
	if (!navigation) return null;

	return {
		// Time to first byte
		ttfb: navigation.responseStart - navigation.requestStart,
		// DOM content loaded
		domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
		// Full page load
		loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
		// Total time
		totalTime: navigation.loadEventEnd - navigation.fetchStart,
	};
}

/**
 * Monitor memory usage (if available)
 */
export function getMemoryUsage() {
	// @ts-expect-error - performance.memory is non-standard Chrome API
	if (performance.memory) {
		// @ts-expect-error
		const memory = performance.memory;
		return {
			usedJSHeapSize: (memory.usedJSHeapSize / BYTES_TO_MB).toFixed(2) + " MB",
			totalJSHeapSize: (memory.totalJSHeapSize / BYTES_TO_MB).toFixed(2) + " MB",
			jsHeapSizeLimit: (memory.jsHeapSizeLimit / BYTES_TO_MB).toFixed(2) + " MB",
		};
	}
	return null;
}

/**
 * Log performance info to console (dev only)
 */
export function logPerformanceInfo(): void {
	if (!import.meta.env.DEV) return;

	console.group("⚡ Performance Info");

	const pageLoad = getPageLoadMetrics();
	if (pageLoad) {
		console.log("Page Load Metrics:");
		console.table(pageLoad);
	}

	const memory = getMemoryUsage();
	if (memory) {
		console.log("Memory Usage:");
		console.table(memory);
	}

	performanceMonitor.logSummary();

	console.groupEnd();
}
