import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CountdownIndicator from "./CountdownIndicator.vue";
import type { CalendarEvent } from "@/types";

// Mock useCountdown composable
vi.mock("@/composables/useCountdown", () => ({
	useCountdown: () => ({
		getCountdown: vi.fn((event, unit) => {
			const now = new Date();

			// If event is completed, return none
			if (event.isCompleted) {
				return { type: "none" };
			}

			// If event is past but not completed, return overdue
			if (event.endTime < now) {
				return {
					type: "overdue",
					value: 3,
					unit: unit,
					text: "已过期 3 天",
				};
			}

			// If event hasn't started, return start countdown
			if (event.startTime > now) {
				return {
					type: "start",
					value: 3,
					unit: unit,
					text: "还有 3 天开始",
				};
			}

			// If event is active, return end countdown
			return {
				type: "end",
				value: 2,
				unit: unit,
				text: "还有 2 天结束",
			};
		}),
	}),
}));

describe("CountdownIndicator", () => {
	let mockEvent: CalendarEvent;

	beforeEach(() => {
		const now = new Date();
		mockEvent = {
			id: "1",
			title: "Test Event",
			startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
			endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
			isAllDay: false,
			isCompleted: false,
			createdAt: now,
			updatedAt: now,
		};
	});

	it("renders start countdown for upcoming events", () => {
		const wrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-indicator").exists()).toBe(true);
		expect(wrapper.find(".countdown-indicator--start").exists()).toBe(true);
		expect(wrapper.text()).toContain("还有 3 天开始");
	});

	it("renders end countdown for active events", () => {
		const now = new Date();
		const activeEvent: CalendarEvent = {
			...mockEvent,
			startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
			endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
		};

		const wrapper = mount(CountdownIndicator, {
			props: {
				event: activeEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-indicator").exists()).toBe(true);
		expect(wrapper.find(".countdown-indicator--end").exists()).toBe(true);
		expect(wrapper.text()).toContain("还有 2 天结束");
	});

	it("does not render for completed events", () => {
		const completedEvent: CalendarEvent = {
			...mockEvent,
			isCompleted: true,
		};

		const wrapper = mount(CountdownIndicator, {
			props: {
				event: completedEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-indicator").exists()).toBe(false);
	});

	it("renders overdue countdown for past incomplete events", () => {
		const now = new Date();
		const pastEvent: CalendarEvent = {
			...mockEvent,
			startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
			endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
			isCompleted: false,
		};

		const wrapper = mount(CountdownIndicator, {
			props: {
				event: pastEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-indicator").exists()).toBe(true);
		expect(wrapper.find(".countdown-indicator--overdue").exists()).toBe(true);
	});

	it("does not render for past completed events", () => {
		const now = new Date();
		const pastCompletedEvent: CalendarEvent = {
			...mockEvent,
			startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
			endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
			isCompleted: true,
		};

		const wrapper = mount(CountdownIndicator, {
			props: {
				event: pastCompletedEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-indicator").exists()).toBe(false);
	});

	it('uses default unit of "day" when not specified', () => {
		const wrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
			},
		});

		expect(wrapper.find(".countdown-indicator").exists()).toBe(true);
	});

	it("displays correct icon for start countdown", () => {
		const wrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-icon").text()).toBe("🚀");
	});

	it("displays correct icon for end countdown", () => {
		const now = new Date();
		const activeEvent: CalendarEvent = {
			...mockEvent,
			startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
			endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
		};

		const wrapper = mount(CountdownIndicator, {
			props: {
				event: activeEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-icon").text()).toBe("⏰");
	});

	it("displays correct icon for overdue countdown", () => {
		const now = new Date();
		const overdueEvent: CalendarEvent = {
			...mockEvent,
			startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
			endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
			isCompleted: false,
		};

		const wrapper = mount(CountdownIndicator, {
			props: {
				event: overdueEvent,
				unit: "day",
			},
		});

		expect(wrapper.find(".countdown-icon").text()).toBe("⚠️");
	});

	it("has proper ARIA label for accessibility", () => {
		const wrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
				unit: "day",
			},
		});

		const indicator = wrapper.find(".countdown-indicator");
		expect(indicator.attributes("aria-label")).toContain("距离日程开始");
		expect(indicator.attributes("aria-label")).toContain("还有 3 天开始");
	});

	it("has proper ARIA attributes for screen readers", () => {
		const wrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
				unit: "day",
			},
		});

		const indicator = wrapper.find(".countdown-indicator");
		expect(indicator.attributes("role")).toBe("status");
		expect(indicator.attributes("aria-live")).toBe("polite");
	});

	it("supports keyboard navigation with tabindex", () => {
		const wrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
				unit: "day",
			},
		});

		const indicator = wrapper.find(".countdown-indicator");
		expect(indicator.attributes("tabindex")).toBe("0");
	});

	it("hides decorative icon from screen readers", () => {
		const wrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
				unit: "day",
			},
		});

		const icon = wrapper.find(".countdown-icon");
		expect(icon.attributes("aria-hidden")).toBe("true");
	});

	it("has different ARIA labels for start and end countdowns", () => {
		// Test start countdown
		const startWrapper = mount(CountdownIndicator, {
			props: {
				event: mockEvent,
				unit: "day",
			},
		});
		expect(startWrapper.find(".countdown-indicator").attributes("aria-label")).toContain("距离日程开始");

		// Test end countdown
		const now = new Date();
		const activeEvent: CalendarEvent = {
			...mockEvent,
			startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
			endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
		};
		const endWrapper = mount(CountdownIndicator, {
			props: {
				event: activeEvent,
				unit: "day",
			},
		});
		expect(endWrapper.find(".countdown-indicator").attributes("aria-label")).toContain("距离日程结束");

		// Test overdue countdown
		const overdueEvent: CalendarEvent = {
			...mockEvent,
			startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
			endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
			isCompleted: false,
		};
		const overdueWrapper = mount(CountdownIndicator, {
			props: {
				event: overdueEvent,
				unit: "day",
			},
		});
		expect(overdueWrapper.find(".countdown-indicator").attributes("aria-label")).toContain("日程已过期");
	});
});
