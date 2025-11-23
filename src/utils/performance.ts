/**
 * Performance monitoring utilities
 * Helps track and optimize application performance
 */

interface PerformanceMetric {
	name: string;
	duration: number;
	timestamp: number;
}

class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private timers: Map<string, number> = new Map();

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
			timestamp: Date.now(),
		});

		// Keep only last 100 metrics to prevent memory leak
		if (this.metrics.length > 100) {
			this.metrics.shift();
		}

		if (import.meta.env.DEV) {
			console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
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
			this.endTimer(name);
			return result;
		} catch (error) {
			this.endTimer(name);
			throw error;
		}
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
	getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
		const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};

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
 */
export function measurePerformance(name?: string) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;
		const metricName = name || `${target.constructor.name}.${propertyKey}`;

		descriptor.value = async function (...args: any[]) {
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
	// @ts-ignore - performance.memory is not standard
	if (performance.memory) {
		// @ts-ignore
		const memory = performance.memory;
		return {
			usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + " MB",
			totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + " MB",
			jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + " MB",
		};
	}
	return null;
}

/**
 * Log performance info to console (dev only)
 */
export function logPerformanceInfo(): void {
	if (!import.meta.env.DEV) return;

	console.group("📊 Performance Info");

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
