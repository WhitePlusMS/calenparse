import { ElMessage, ElNotification } from "element-plus";

/**
 * Error Handler Utility
 *
 * Provides centralized error handling with user-friendly messages
 *
 * Requirements:
 * - 2.13: Return error information when LLM cannot recognize valid schedule info
 * - 10.3: Display clear error messages when API configuration is invalid or calls fail
 */

export const ErrorType = {
	NETWORK: "NETWORK",
	API: "API",
	VALIDATION: "VALIDATION",
	DATABASE: "DATABASE",
	UNKNOWN: "UNKNOWN",
} as const;

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

export interface AppError {
	type: ErrorType;
	message: string;
	originalError?: Error;
	details?: string;
}

/**
 * Classify error type based on error object
 */
export function classifyError(error: unknown): ErrorType {
	if (error instanceof TypeError && error.message.includes("fetch")) {
		return ErrorType.NETWORK;
	}

	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		if (
			message.includes("network") ||
			message.includes("连接") ||
			message.includes("timeout") ||
			message.includes("超时")
		) {
			return ErrorType.NETWORK;
		}

		if (
			message.includes("api") ||
			message.includes("401") ||
			message.includes("403") ||
			message.includes("429") ||
			message.includes("500") ||
			message.includes("502") ||
			message.includes("503") ||
			message.includes("unauthorized") ||
			message.includes("认证")
		) {
			return ErrorType.API;
		}

		if (
			message.includes("validation") ||
			message.includes("验证") ||
			message.includes("invalid") ||
			message.includes("无效") ||
			message.includes("不能为空") ||
			message.includes("必须")
		) {
			return ErrorType.VALIDATION;
		}

		if (
			message.includes("database") ||
			message.includes("数据库") ||
			message.includes("supabase") ||
			message.includes("failed to fetch events") ||
			message.includes("failed to create event") ||
			message.includes("failed to update event") ||
			message.includes("failed to delete event") ||
			message.includes("获取事件") ||
			message.includes("创建事件") ||
			message.includes("更新事件") ||
			message.includes("删除事件")
		) {
			return ErrorType.DATABASE;
		}
	}

	return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(error: unknown): string {
	const errorType = classifyError(error);
	const originalMessage = error instanceof Error ? error.message : String(error);

	switch (errorType) {
		case ErrorType.NETWORK:
			return "网络连接失败，请检查您的网络连接后重试";

		case ErrorType.API:
			if (originalMessage.includes("配置") || originalMessage.includes("config")) {
				return "API 配置错误，请检查环境变量设置";
			}
			if (originalMessage.includes("401") || originalMessage.includes("403")) {
				return "API 认证失败，请检查 API 密钥是否正确";
			}
			if (originalMessage.includes("429")) {
				return "API 调用次数超限，请稍后再试";
			}
			if (originalMessage.includes("500") || originalMessage.includes("502")) {
				return "API 服务暂时不可用，请稍后再试";
			}
			if (originalMessage.includes("响应格式无效")) {
				return originalMessage; // Return the detailed message with response preview
			}
			if (originalMessage.includes("无法解析")) {
				return originalMessage; // Return the detailed message with content preview
			}
			return `API 调用失败：${originalMessage}`;

		case ErrorType.VALIDATION:
			return originalMessage;

		case ErrorType.DATABASE:
			if (originalMessage.includes("Missing") || originalMessage.includes("缺失")) {
				return "数据库配置错误，请检查 Supabase 环境变量";
			}
			return `数据库操作失败：${originalMessage}`;

		case ErrorType.UNKNOWN:
		default:
			return originalMessage || "发生未知错误，请重试";
	}
}

/**
 * Handle error with appropriate UI feedback
 */
export function handleError(error: unknown, context?: string): void {
	const errorType = classifyError(error);
	const message = getUserFriendlyMessage(error);

	console.error(`[${errorType}] ${context || "Error"}:`, error);

	// Use notification for critical errors, message for others
	if (errorType === ErrorType.API || errorType === ErrorType.DATABASE) {
		ElNotification({
			title: "错误",
			message: message,
			type: "error",
			duration: 5000,
			position: "top-right",
		});
	} else {
		ElMessage({
			message: message,
			type: "error",
			duration: 4000,
			showClose: true,
		});
	}
}

/**
 * Handle network errors specifically
 */
export function handleNetworkError(error: unknown): void {
	console.error("[NETWORK ERROR]:", error);

	ElNotification({
		title: "网络错误",
		message: "无法连接到服务器，请检查您的网络连接",
		type: "error",
		duration: 5000,
		position: "top-right",
	});
}

/**
 * Handle API errors specifically
 */
export function handleApiError(error: unknown, apiName: string = "API"): void {
	const message = getUserFriendlyMessage(error);

	console.error(`[${apiName} ERROR]:`, error);

	ElNotification({
		title: `${apiName} 错误`,
		message: message,
		type: "error",
		duration: 5000,
		position: "top-right",
	});
}

/**
 * Create a standardized error object
 */
export function createAppError(type: ErrorType, message: string, originalError?: Error, details?: string): AppError {
	return {
		type,
		message,
		originalError,
		details,
	};
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
	return classifyError(error) === ErrorType.NETWORK;
}

/**
 * Check if error is an API error
 */
export function isApiError(error: unknown): boolean {
	return classifyError(error) === ErrorType.API;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	initialDelay: number = 1000
): Promise<T> {
	let lastError: unknown;

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry validation errors
			if (classifyError(error) === ErrorType.VALIDATION) {
				throw error;
			}

			// Don't retry on last attempt
			if (i < maxRetries - 1) {
				const delay = initialDelay * Math.pow(2, i);
				console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError;
}
