import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCountdown } from "./useCountdown";
import type { CalendarEvent } from "@/types";

describe("useCountdown", () => {
	let mockEvent: CalendarEvent;
	let now: Date;

	beforeEach(() => {
		now = new Date("2024-01-15T12:00:00Z");
		vi.setSystemTime(now);

		mockEvent = {
			id: "1",
			title: "Test Event",
			startTime: new Date("2024-01-18T12:00:00Z"), // 3 days from now
			endTime: new Date("2024-01-20T12:00:00Z"), // 5 days from now
			isAllDay: false,
			isCompleted: false,
			createdAt: now,
			updatedAt: now,
		};
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("getCountdown", () => {
		it("returns 'start' countdown for upcoming events", () => {
			const { getCountdown } = useCountdown();
			const result = getCountdown(mockEvent, "day");

			expect(result.type).toBe("start");
			if (result.type !== "none") {
				expect(result.value).toBe(3);
				expect(result.text).toContain("3");
				expect(result.text).toContain("开始");
			}
		});

		it("returns 'end' countdown for active events", () => {
			const activeEvent: CalendarEvent = {
				...mockEvent,
				startTime: new Date("2024-01-14T12:00:00Z"), // 1 day ago
				endTime: new Date("2024-01-17T12:00:00Z"), // 2 days from now
			};

			const { getCountdown } = useCountdown();
			const result = getCountdown(activeEvent, "day");

			expect(result.type).toBe("end");
			if (result.type !== "none") {
				expect(result.value).toBe(2);
				expect(result.text).toContain("2");
				expect(result.text).toContain("结束");
			}
		});

		it("returns 'overdue' countdown for past incomplete events", () => {
			const overdueEvent: CalendarEvent = {
				...mockEvent,
				startTime: new Date("2024-01-10T12:00:00Z"), // 5 days ago
				endTime: new Date("2024-01-12T12:00:00Z"), // 3 days ago
				isCompleted: false,
			};

			const { getCountdown } = useCountdown();
			const result = getCountdown(overdueEvent, "day");

			expect(result.type).toBe("overdue");
			if (result.type !== "none") {
				expect(result.value).toBe(3);
				expect(result.text).toContain("过期");
			}
		});

		it("returns 'none' for completed events", () => {
			const completedEvent: CalendarEvent = {
				...mockEvent,
				isCompleted: true,
			};

			const { getCountdown } = useCountdown();
			const result = getCountdown(completedEvent, "day");

			expect(result.type).toBe("none");
		});

		it("returns 'none' for past completed events", () => {
			const pastCompletedEvent: CalendarEvent = {
				...mockEvent,
				startTime: new Date("2024-01-10T12:00:00Z"),
				endTime: new Date("2024-01-12T12:00:00Z"),
				isCompleted: true,
			};

			const { getCountdown } = useCountdown();
			const result = getCountdown(pastCompletedEvent, "day");

			expect(result.type).toBe("none");
		});

		it("handles 'today starts' case", () => {
			const todayEvent: CalendarEvent = {
				...mockEvent,
				startTime: new Date("2024-01-15T18:00:00Z"), // later today
				endTime: new Date("2024-01-16T12:00:00Z"),
			};

			const { getCountdown } = useCountdown();
			const result = getCountdown(todayEvent, "day");

			expect(result.type).toBe("start");
			if (result.type !== "none") {
				expect(result.value).toBe(0);
				expect(result.text).toContain("今天开始");
			}
		});

		it("handles 'tomorrow starts' case", () => {
			const tomorrowEvent: CalendarEvent = {
				...mockEvent,
				startTime: new Date("2024-01-16T12:00:00Z"), // tomorrow
				endTime: new Date("2024-01-17T12:00:00Z"),
			};

			const { getCountdown } = useCountdown();
			const result = getCountdown(tomorrowEvent, "day");

			expect(result.type).toBe("start");
			if (result.type !== "none") {
				expect(result.value).toBe(1);
				expect(result.text).toContain("明天开始");
			}
		});

		it("supports hour unit", () => {
			const { getCountdown } = useCountdown();
			const result = getCountdown(mockEvent, "hour");

			expect(result.type).toBe("start");
			if (result.type !== "none") {
				expect(result.unit).toBe("hour");
				expect(result.value).toBe(72); // 3 days = 72 hours
			}
		});

		it("supports minute unit", () => {
			const { getCountdown } = useCountdown();
			const result = getCountdown(mockEvent, "minute");

			expect(result.type).toBe("start");
			if (result.type !== "none") {
				expect(result.unit).toBe("minute");
				expect(result.value).toBe(4320); // 3 days = 4320 minutes
			}
		});
	});
});
