import { createEvents, type EventAttributes } from "ics";
import type { CalendarEvent } from "@/types";
import dayjs from "dayjs";

/**
 * Import/Export utilities for calendar events
 * Implements requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

/**
 * Export events to iCalendar (.ics) format
 * Requirement 11.2: Generate iCalendar standard .ics file
 */
export function exportToICalendar(events: CalendarEvent[]): string {
	const icsEvents: EventAttributes[] = events.map((event) => {
		const start = dayjs(event.startTime);
		const end = dayjs(event.endTime);

		const icsEvent: EventAttributes = {
			start: [start.year(), start.month() + 1, start.date(), start.hour(), start.minute()],
			end: [end.year(), end.month() + 1, end.date(), end.hour(), end.minute()],
			title: event.title,
			description: event.description || "",
			location: event.location || "",
			status: "CONFIRMED",
			busyStatus: "BUSY",
			uid: event.id,
		};

		return icsEvent;
	});

	const { error, value } = createEvents(icsEvents);

	if (error) {
		throw new Error(`导出 iCal 格式失败: ${error.message}`);
	}

	return value || "";
}

/**
 * Export events to JSON format
 * Requirement 11.3: Generate JSON file with all event data
 */
export function exportToJSON(events: CalendarEvent[]): string {
	const exportData = {
		version: "1.0",
		exportDate: new Date().toISOString(),
		events: events.map((event) => ({
			id: event.id,
			title: event.title,
			startTime: event.startTime.toISOString(),
			endTime: event.endTime.toISOString(),
			isAllDay: event.isAllDay,
			location: event.location,
			description: event.description,
			originalText: event.originalText,
			tagIds: event.tagIds,
			createdAt: event.createdAt.toISOString(),
			updatedAt: event.updatedAt.toISOString(),
		})),
	};

	return JSON.stringify(exportData, null, 2);
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Parse iCalendar (.ics) content and extract events
 * Requirement 11.4: Parse iCal file and import events
 * Note: This is a simplified parser. For production, consider using a library like ical.js
 */
export function parseICalendar(icsContent: string): Partial<CalendarEvent>[] {
	const events: Partial<CalendarEvent>[] = [];
	const lines = icsContent.split(/\r?\n/);

	let currentEvent: Partial<CalendarEvent> | null = null;
	let inEvent = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim();
		if (!line) continue;

		if (line === "BEGIN:VEVENT") {
			inEvent = true;
			currentEvent = {};
			continue;
		}

		if (line === "END:VEVENT") {
			if (currentEvent && currentEvent.title && currentEvent.startTime) {
				events.push(currentEvent);
			}
			inEvent = false;
			currentEvent = null;
			continue;
		}

		if (!inEvent || !currentEvent) continue;

		// Parse event properties
		if (line.startsWith("SUMMARY:")) {
			currentEvent.title = line.substring(8);
		} else if (line.startsWith("DESCRIPTION:")) {
			currentEvent.description = line.substring(12);
		} else if (line.startsWith("LOCATION:")) {
			currentEvent.location = line.substring(9);
		} else if (line.startsWith("DTSTART")) {
			const dateStr = line.split(":")[1];
			if (dateStr) {
				currentEvent.startTime = parseICalDate(dateStr);
			}
		} else if (line.startsWith("DTEND")) {
			const dateStr = line.split(":")[1];
			if (dateStr) {
				currentEvent.endTime = parseICalDate(dateStr);
			}
		}
	}

	return events;
}

/**
 * Parse iCalendar date format
 */
function parseICalDate(dateStr: string): Date {
	// Format: 20240315T090000 or 20240315T090000Z
	const year = parseInt(dateStr.substring(0, 4));
	const month = parseInt(dateStr.substring(4, 6)) - 1;
	const day = parseInt(dateStr.substring(6, 8));
	const hour = parseInt(dateStr.substring(9, 11)) || 0;
	const minute = parseInt(dateStr.substring(11, 13)) || 0;
	const second = parseInt(dateStr.substring(13, 15)) || 0;

	return new Date(year, month, day, hour, minute, second);
}

/**
 * Parse and validate JSON import data
 * Requirement 11.5: Validate JSON data format and import valid events
 */
export function parseJSON(jsonContent: string): Partial<CalendarEvent>[] {
	try {
		const data = JSON.parse(jsonContent);

		// Validate structure
		if (!data.events || !Array.isArray(data.events)) {
			throw new Error("无效的 JSON 格式：缺少 events 数组");
		}

		// Parse and validate each event
		const events: Partial<CalendarEvent>[] = data.events
			.map((event: any) => {
				// Validate required fields
				if (!event.title || !event.startTime || !event.endTime) {
					return null;
				}

				return {
					title: event.title,
					startTime: new Date(event.startTime),
					endTime: new Date(event.endTime),
					isAllDay: event.isAllDay || false,
					location: event.location,
					description: event.description,
					originalText: event.originalText,
					tagIds: event.tagIds,
				};
			})
			.filter((event: any) => event !== null);

		return events;
	} catch (error) {
		throw new Error(`解析 JSON 失败: ${error instanceof Error ? error.message : "未知错误"}`);
	}
}

/**
 * Create a backup of all events
 * Requirement 11.8: Save all event data as backup file for download
 */
export function createBackup(events: CalendarEvent[]): Blob {
	const backupData = {
		version: "1.0",
		backupDate: new Date().toISOString(),
		eventCount: events.length,
		events: events.map((event) => ({
			id: event.id,
			title: event.title,
			startTime: event.startTime.toISOString(),
			endTime: event.endTime.toISOString(),
			isAllDay: event.isAllDay,
			location: event.location,
			description: event.description,
			originalText: event.originalText,
			tagIds: event.tagIds,
			createdAt: event.createdAt.toISOString(),
			updatedAt: event.updatedAt.toISOString(),
		})),
	};

	const content = JSON.stringify(backupData, null, 2);
	return new Blob([content], { type: "application/json" });
}

/**
 * Restore events from backup file
 * Requirement 11.9, 11.10: Upload and validate backup file, restore data
 */
export async function restoreBackup(file: File): Promise<Partial<CalendarEvent>[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const content = e.target?.result as string;
				const data = JSON.parse(content);

				// Validate backup structure
				if (!data.version || !data.events || !Array.isArray(data.events)) {
					throw new Error("无效的备份文件格式");
				}

				// Parse events
				const events: Partial<CalendarEvent>[] = data.events
					.map((event: any) => {
						if (!event.title || !event.startTime || !event.endTime) {
							return null;
						}

						return {
							title: event.title,
							startTime: new Date(event.startTime),
							endTime: new Date(event.endTime),
							isAllDay: event.isAllDay || false,
							location: event.location,
							description: event.description,
							originalText: event.originalText,
							tagIds: event.tagIds,
						};
					})
					.filter((event: any) => event !== null);

				resolve(events);
			} catch (error) {
				reject(
					new Error(
						`备份文件损坏或格式错误: ${
							error instanceof Error ? error.message : "未知错误"
						}`
					)
				);
			}
		};

		reader.onerror = () => {
			reject(new Error("读取备份文件失败"));
		};

		reader.readAsText(file);
	});
}
