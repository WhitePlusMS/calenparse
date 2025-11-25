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
	AUTH: "AUTH",
	QUOTA: "QUOTA",
	PERMISSION: "PERMISSION",
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

		// 认证错误（优先级最高）
		if (
			message.includes("会话已过期") ||
			message.includes("session expired") ||
			message.includes("邮箱或密码错误") ||
			message.includes("invalid login credentials") ||
			message.includes("邮箱未验证") ||
			message.includes("email not confirmed") ||
			message.includes("登录失败") ||
			message.includes("login failed") ||
			message.includes("登出失败") ||
			message.includes("logout failed") ||
			message.includes("未能创建会话") ||
			message.includes("failed to create session")
		) {
			return ErrorType.AUTH;
		}

		// 配额错误
		if (
			message.includes("试用次数已用完") ||
			message.includes("已达到试用上限") ||
			message.includes("配额不足") ||
			message.includes("quota exceeded") ||
			message.includes("剩余配额不足") ||
			message.includes("insufficient quota") ||
			message.includes("事件配额已满") ||
			message.includes("配额已满") ||
			message.includes("llm 配额已满") ||
			message.includes("llm配额已满")
		) {
			return ErrorType.QUOTA;
		}

		// 权限错误
		if (
			message.includes("权限不足") ||
			message.includes("permission denied") ||
			message.includes("unauthorized") ||
			message.includes("forbidden") ||
			message.includes("此页面仅限管理员访问") ||
			message.includes("admin only") ||
			message.includes("无法执行此操作") ||
			message.includes("cannot perform this action")
		) {
			return ErrorType.PERMISSION;
		}

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
			message.includes("503")
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
		case ErrorType.AUTH:
			// 认证错误：直接返回原始消息（已经是友好提示）
			return originalMessage;

		case ErrorType.QUOTA:
			// 配额错误：直接返回原始消息（已经是友好提示）
			return originalMessage;

		case ErrorType.PERMISSION:
			// 权限错误：直接返回原始消息（已经是友好提示）
			return originalMessage;

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
			if (originalMessage.includes("连接失败") || originalMessage.includes("connection failed")) {
				return "数据库连接失败，请稍后重试";
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

	// 根据错误类型选择合适的提示方式
	switch (errorType) {
		case ErrorType.AUTH:
			// 认证错误：使用警告通知
			ElNotification({
				title: "认证提示",
				message: message,
				type: "warning",
				duration: 5000,
				position: "top-right",
			});
			break;

		case ErrorType.QUOTA:
			// 配额错误：使用信息提示
			ElMessage({
				message: message,
				type: "info",
				duration: 5000,
				showClose: true,
			});
			break;

		case ErrorType.PERMISSION:
			// 权限错误：使用警告提示
			ElMessage({
				message: message,
				type: "warning",
				duration: 4000,
				showClose: true,
			});
			break;

		case ErrorType.DATABASE:
		case ErrorType.API:
			// 数据库和 API 错误：使用错误通知
			ElNotification({
				title: "错误",
				message: message,
				type: "error",
				duration: 5000,
				position: "top-right",
			});
			break;

		default:
			// 其他错误：使用错误消息
			ElMessage({
				message: message,
				type: "error",
				duration: 4000,
				showClose: true,
			});
			break;
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

/**
 * Handle authentication errors specifically
 *
 * Requirements:
 * - 2.3: 处理登录错误
 */
export function handleAuthError(error: unknown, context?: string): void {
	const message = getUserFriendlyMessage(error);

	console.error(`[AUTH ERROR] ${context || "Authentication"}:`, error);

	ElNotification({
		title: "认证错误",
		message: message,
		type: "warning",
		duration: 5000,
		position: "top-right",
	});
}

/**
 * Handle quota errors specifically
 *
 * Requirements:
 * - 3.3: 配额用尽提示
 * - 4.3: LLM 配额用尽提示
 * - 4.5: 批量创建超配额提示
 */
export function handleQuotaError(error: unknown, context?: string): void {
	const message = getUserFriendlyMessage(error);

	console.warn(`[QUOTA] ${context || "Quota"}:`, error);

	ElMessage({
		message: message,
		type: "info",
		duration: 5000,
		showClose: true,
	});
}

/**
 * Handle permission errors specifically
 *
 * Requirements:
 * - RLS 权限错误提示
 */
export function handlePermissionError(error: unknown, context?: string): void {
	const message = getUserFriendlyMessage(error);

	console.warn(`[PERMISSION] ${context || "Permission"}:`, error);

	ElMessage({
		message: message,
		type: "warning",
		duration: 4000,
		showClose: true,
	});
}

/**
 * Handle database errors specifically
 *
 * Requirements:
 * - 数据库连接失败提示
 */
export function handleDatabaseError(error: unknown, context?: string): void {
	const message = getUserFriendlyMessage(error);

	console.error(`[DATABASE ERROR] ${context || "Database"}:`, error);

	ElNotification({
		title: "数据库错误",
		message: message,
		type: "error",
		duration: 5000,
		position: "top-right",
	});
}
