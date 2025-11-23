/**
 * Notification Utilities
 *
 * Provides consistent notification messages across the application
 * with better UX and accessibility
 */

import { ElMessage, ElNotification, ElMessageBox } from "element-plus";
import type { MessageHandler } from "element-plus";

// Configuration constants
const DEFAULT_DURATIONS = {
	success: 3000,
	error: 4000,
	warning: 3000,
	info: 3000,
	notification: 4500,
} as const;

const DEFAULT_TEXTS = {
	confirm: "确认",
	confirmButton: "确定",
	cancelButton: "取消",
	deleteTitle: "确认删除",
	deleteButton: "删除",
	loading: "加载中...",
} as const;

type MessageType = "success" | "error" | "warning" | "info";

/**
 * Internal helper to create messages with consistent configuration
 */
function createMessage(type: MessageType, message: string, duration: number): MessageHandler {
	return ElMessage({
		message,
		type,
		duration,
		showClose: true,
		grouping: true,
	});
}

/**
 * Show success message
 */
export function showSuccess(message: string, duration = DEFAULT_DURATIONS.success): MessageHandler {
	return createMessage("success", message, duration);
}

/**
 * Show error message
 */
export function showError(message: string, duration = DEFAULT_DURATIONS.error): MessageHandler {
	return createMessage("error", message, duration);
}

/**
 * Show warning message
 */
export function showWarning(message: string, duration = DEFAULT_DURATIONS.warning): MessageHandler {
	return createMessage("warning", message, duration);
}

/**
 * Show info message
 */
export function showInfo(message: string, duration = DEFAULT_DURATIONS.info): MessageHandler {
	return createMessage("info", message, duration);
}

/**
 * Show notification (for more detailed messages)
 */
export function showNotification(
	title: string,
	message: string,
	type: MessageType = "info",
	duration = DEFAULT_DURATIONS.notification
) {
	ElNotification({
		title,
		message,
		type,
		duration,
		position: "top-right",
	});
}

/**
 * Show confirmation dialog
 */
export async function showConfirm(
	message: string,
	title = DEFAULT_TEXTS.confirm,
	confirmButtonText = DEFAULT_TEXTS.confirmButton,
	cancelButtonText = DEFAULT_TEXTS.cancelButton
): Promise<boolean> {
	try {
		await ElMessageBox.confirm(message, title, {
			confirmButtonText,
			cancelButtonText,
			type: "warning",
			center: true,
		});
		return true;
	} catch (error) {
		// User clicked cancel or closed dialog
		if (error === "cancel" || error === "close") {
			return false;
		}
		// Unexpected error - log it
		console.error("Unexpected error in confirmation dialog:", error);
		return false;
	}
}

/**
 * Show delete confirmation dialog
 */
export async function showDeleteConfirm(itemName = "此项"): Promise<boolean> {
	try {
		await ElMessageBox.confirm(`确定要删除${itemName}吗？此操作无法撤销。`, DEFAULT_TEXTS.deleteTitle, {
			confirmButtonText: DEFAULT_TEXTS.deleteButton,
			cancelButtonText: DEFAULT_TEXTS.cancelButton,
			type: "warning",
			confirmButtonClass: "el-button--danger",
			center: true,
		});
		return true;
	} catch (error) {
		// User clicked cancel or closed dialog
		if (error === "cancel" || error === "close") {
			return false;
		}
		// Unexpected error - log it
		console.error("Unexpected error in delete confirmation dialog:", error);
		return false;
	}
}

/**
 * Show loading message
 * Returns an object with a close method to dismiss the loading message
 */
export function showLoading(message = DEFAULT_TEXTS.loading) {
	const instance = ElMessage({
		message,
		type: "info",
		duration: 0, // Don't auto close
		showClose: false,
		icon: "Loading",
	});

	return {
		close: () => instance.close(),
	};
}
