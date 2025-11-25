import { ElMessage, ElNotification } from "element-plus";

/**
 * Error Handler Utility (Refactored)
 *
 * 改进点：
 * 1. 配置驱动的错误匹配（易于扩展）
 * 2. 策略模式替代大量 if-else
 * 3. 性能优化（缓存 toLowerCase）
 * 4. 类型安全增强
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

// ============================================
// 配置：错误匹配模式
// ============================================
type ErrorPattern = string | RegExp;

const ERROR_PATTERNS: Record<ErrorType, readonly ErrorPattern[]> = {
	[ErrorType.AUTH]: [
		"会话已过期",
		"session expired",
		"邮箱或密码错误",
		"invalid login credentials",
		"邮箱未验证",
		"email not confirmed",
		"登录失败",
		"login failed",
		"登出失败",
		"logout failed",
		"未能创建会话",
		"failed to create session",
	],
	[ErrorType.QUOTA]: [
		"试用次数已用完",
		"已达到试用上限",
		/配额(不足|已满)/,
		/quota\s*exceeded/i,
		/剩余配额不足/,
		/insufficient\s*quota/i,
		/事件配额已满/,
		/llm\s*配额已满/, // 匹配有无空格的情况
	],
	[ErrorType.PERMISSION]: [
		"权限不足",
		"permission denied",
		"unauthorized",
		"forbidden",
		"此页面仅限管理员访问",
		"admin only",
		"无法执行此操作",
		"cannot perform this action",
	],
	[ErrorType.NETWORK]: ["network", "连接", "timeout", "超时"],
	[ErrorType.API]: ["api", /\b(401|403|429|50[0-3])\b/],
	[ErrorType.VALIDATION]: ["validation", "验证", "invalid", "无效", "不能为空", "必须"],
	[ErrorType.DATABASE]: [
		"database",
		"数据库",
		"supabase",
		/failed to (fetch|create|update|delete) event/,
		/(获取|创建|更新|删除)事件/,
	],
	[ErrorType.UNKNOWN]: [],
} as const;

// ============================================
// 辅助函数
// ============================================

/**
 * 检查消息是否匹配任意模式
 */
function matchesAnyPattern(message: string, patterns: readonly ErrorPattern[]): boolean {
	return patterns.some((pattern) => {
		if (typeof pattern === "string") {
			return message.includes(pattern.toLowerCase());
		}
		return pattern.test(message);
	});
}

/**
 * 错误分类器配置（按优先级排序）
 */
type ErrorMatcher = (message: string) => boolean;

const ERROR_CLASSIFIERS: Array<{ type: ErrorType; matcher: ErrorMatcher }> = [
	{
		type: ErrorType.AUTH,
		matcher: (msg) => matchesAnyPattern(msg, ERROR_PATTERNS.AUTH),
	},
	{
		type: ErrorType.QUOTA,
		matcher: (msg) => matchesAnyPattern(msg, ERROR_PATTERNS.QUOTA),
	},
	{
		type: ErrorType.PERMISSION,
		matcher: (msg) => matchesAnyPattern(msg, ERROR_PATTERNS.PERMISSION),
	},
	{
		type: ErrorType.NETWORK,
		matcher: (msg) => matchesAnyPattern(msg, ERROR_PATTERNS.NETWORK),
	},
	{
		type: ErrorType.API,
		matcher: (msg) => matchesAnyPattern(msg, ERROR_PATTERNS.API),
	},
	{
		type: ErrorType.VALIDATION,
		matcher: (msg) => matchesAnyPattern(msg, ERROR_PATTERNS.VALIDATION),
	},
	{
		type: ErrorType.DATABASE,
		matcher: (msg) => matchesAnyPattern(msg, ERROR_PATTERNS.DATABASE),
	},
];

// ============================================
// 核心函数
// ============================================

/**
 * 分类错误类型（重构版）
 */
export function classifyError(error: unknown): ErrorType {
	// 特殊情况：fetch TypeError
	if (error instanceof TypeError && error.message.includes("fetch")) {
		return ErrorType.NETWORK;
	}

	if (error instanceof Error) {
		const message = error.message.toLowerCase(); // 只调用一次

		// 使用策略模式匹配
		for (const { type, matcher } of ERROR_CLASSIFIERS) {
			if (matcher(message)) {
				return type;
			}
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
		case ErrorType.QUOTA:
		case ErrorType.PERMISSION:
		case ErrorType.VALIDATION:
			// 这些类型的错误消息已经是友好提示，直接返回
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
			if (originalMessage.includes("响应格式无效") || originalMessage.includes("无法解析")) {
				return originalMessage;
			}
			return `API 调用失败：${originalMessage}`;

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
			ElNotification({
				title: "认证提示",
				message: message,
				type: "warning",
				duration: 5000,
				position: "top-right",
			});
			break;

		case ErrorType.QUOTA:
			ElMessage({
				message: message,
				type: "info",
				duration: 5000,
				showClose: true,
			});
			break;

		case ErrorType.PERMISSION:
			ElMessage({
				message: message,
				type: "warning",
				duration: 4000,
				showClose: true,
			});
			break;

		case ErrorType.DATABASE:
		case ErrorType.API:
			ElNotification({
				title: "错误",
				message: message,
				type: "error",
				duration: 5000,
				position: "top-right",
			});
			break;

		default:
			ElMessage({
				message: message,
				type: "error",
				duration: 4000,
				showClose: true,
			});
			break;
	}
}

// ============================================
// 专用错误处理函数（保持向后兼容）
// ============================================

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

// ============================================
// 工具函数
// ============================================

export function createAppError(type: ErrorType, message: string, originalError?: Error, details?: string): AppError {
	return { type, message, originalError, details };
}

export function isNetworkError(error: unknown): boolean {
	return classifyError(error) === ErrorType.NETWORK;
}

export function isApiError(error: unknown): boolean {
	return classifyError(error) === ErrorType.API;
}

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
