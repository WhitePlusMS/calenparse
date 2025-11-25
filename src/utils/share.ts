import type { CalendarEvent, Tag } from "@/types";
import dayjs from "dayjs";
import html2canvas from "html2canvas";

/**
 * Share Utility Functions
 *
 * Provides functionality to share calendar events in text and image formats
 *
 * Requirements:
 * - 19.1: Generate text content with event details
 * - 19.2: Include title, time, location, and description
 * - 19.3: Copy content to clipboard
 * - 19.4: Support single and multiple events
 * - 19.5: Handle recurring events explanation
 * - 19.6: Generate visual image for sharing
 */

/**
 * 文本标签配置
 * 集中管理所有标签文本，便于统一修改格式
 */
const LABELS = {
	TITLE: "[日历]",
	TIME: "[时间]",
	LOCATION: "[地点]",
	TAG: "[标签]",
	DESCRIPTION: "[描述]",
	ORIGINAL: "[原文]",
	CREATED: "[创建]",
	UPDATED: "[更新]",
	LIST: "[列表]",
} as const;

/**
 * Helper: Format date and time consistently
 */
function formatDateTime(date: Date): string {
	return dayjs(date).format("YYYY年MM月DD日 HH:mm");
}

/**
 * Helper: Get tag names from tag IDs
 */
function getEventTagNames(tagIds: string[], tags: Tag[]): string[] {
	return tagIds
		.map((tagId) => tags.find((t) => t.id === tagId))
		.filter((tag): tag is Tag => tag !== undefined)
		.map((tag) => tag.name);
}

/**
 * Format a single event as text with all information
 */
export function formatEventAsText(event: CalendarEvent, tags: Tag[] = []): string {
	const lines: string[] = [];

	// Title (Requirement 19.2)
	lines.push(`${LABELS.TITLE} ${event.title}`);
	lines.push("");

	// Time (Requirement 19.2)
	if (event.isAllDay) {
		lines.push(`${LABELS.TIME} 时间：${dayjs(event.startTime).format("YYYY年MM月DD日")} (全天)`);
	} else {
		lines.push(`${LABELS.TIME} 开始：${formatDateTime(event.startTime)}`);
		lines.push(`${" ".repeat(LABELS.TIME.length)} 结束：${formatDateTime(event.endTime)}`);
	}

	// Location (Requirement 19.2)
	if (event.location) {
		lines.push(`${LABELS.LOCATION} 地点：${event.location}`);
	}

	// Tags
	if (event.tagIds?.length && tags.length) {
		const eventTags = getEventTagNames(event.tagIds, tags);
		if (eventTags.length) {
			lines.push(`${LABELS.TAG} 标签：${eventTags.join(", ")}`);
		}
	}

	// Description (Requirement 19.2)
	if (event.description) {
		lines.push("");
		lines.push(`${LABELS.DESCRIPTION} 描述：`);
		lines.push(event.description);
	}

	// Original Text
	if (event.originalText) {
		lines.push("");
		lines.push(`${LABELS.ORIGINAL} 原始通告：`);
		lines.push(event.originalText);
	}

	// Metadata
	lines.push("");
	lines.push(`${LABELS.CREATED} 创建时间：${formatDateTime(event.createdAt)}`);
	lines.push(`${LABELS.UPDATED} 更新时间：${formatDateTime(event.updatedAt)}`);

	return lines.join("\n");
}

/**
 * Generate share text for single or multiple events
 * Requirement 19.1, 19.4: Support single and multiple events
 */
export function generateShareText(events: CalendarEvent[], tags: Tag[] = []): string {
	if (events.length === 0) {
		return "暂无事件";
	}

	if (events.length === 1 && events[0]) {
		// Single event
		return formatEventAsText(events[0], tags);
	}

	// Multiple events (Requirement 19.4)
	const lines: string[] = [];
	lines.push(`${LABELS.LIST} 共 ${events.length} 个事件`);
	lines.push("");
	lines.push("─".repeat(40));
	lines.push("");

	events.forEach((event, index) => {
		lines.push(`【事件 ${index + 1}】`);
		lines.push(formatEventAsText(event, tags));

		if (index < events.length - 1) {
			lines.push("");
			lines.push("─".repeat(40));
			lines.push("");
		}
	});

	return lines.join("\n");
}

/**
 * Copy text to clipboard
 * Requirement 19.3: Copy content to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
	try {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			// Modern clipboard API
			await navigator.clipboard.writeText(text);
		} else {
			// Fallback for older browsers
			const textarea = document.createElement("textarea");
			textarea.value = text;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
		}
	} catch (error) {
		throw new Error("复制到剪贴板失败");
	}
}

/**
 * Generate image from HTML element
 * Requirement 19.6: Generate visual image for sharing
 */
export async function generateShareImage(element: HTMLElement): Promise<Blob> {
	try {
		const canvas = await html2canvas(element, {
			backgroundColor: "#ffffff",
			scale: 2, // Higher quality
			logging: false,
			useCORS: true,
		});

		return new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("生成图片失败"));
				}
			}, "image/png");
		});
	} catch (error) {
		throw new Error("生成图片失败");
	}
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
