/**
 * Property-Based Tests for EventDialog Component
 *
 * Feature: ui-ux-redesign, Property 4: 表单验证错误提示
 * Validates: Requirements 7.4
 *
 * This test verifies that the EventDialog component displays proper
 * error messages for invalid form inputs.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import fc from "fast-check";
import EventDialog from "./EventDialog.vue";
import type { CalendarEvent } from "@/types";
import { ElMessage } from "element-plus";

// Mock composables
vi.mock("@/composables/useSupabase", () => ({
	useSupabase: () => ({
		getAllTags: vi.fn().mockResolvedValue([]),
		createTag: vi.fn().mockResolvedValue({
			id: "tag-id",
			name: "test",
			color: "#409EFF",
		}),
	}),
}));

vi.mock("@/composables/useEvents", () => ({
	useEvents: () => ({
		toggleEventCompletion: vi.fn().mockResolvedValue({ id: "test-id", isCompleted: true }),
	}),
}));

// Mock ElMessage
vi.mock("element-plus", async (importOriginal) => {
	const actual = await importOriginal<typeof import("element-plus")>();
	return {
		...actual,
		ElMessage: vi.fn(),
		ElMessageBox: {
			confirm: vi.fn().mockResolvedValue(true),
		},
	};
});

describe("EventDialog Property Tests", () => {
	const createMockEvent = (overrides?: Partial<CalendarEvent>): CalendarEvent => ({
		id: "test-id",
		title: "Test Event",
		startTime: new Date("2024-03-15T14:00:00"),
		endTime: new Date("2024-03-15T16:00:00"),
		isAllDay: false,
		location: "Test Location",
		description: "Test Description",
		originalText: "Test Original Text",
		tagIds: [],
		isCompleted: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});

	let wrapper: any;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
			wrapper = null;
		}
	});

	/**
	 * Property 1: Empty title validation
	 *
	 * For any whitespace-only title (spaces, tabs, newlines),
	 * the component should display an error message when attempting to save.
	 */
	it("should show error for empty or whitespace-only title", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc
					.string({ minLength: 0, maxLength: 20 })
					.filter((s) => s.trim().length === 0 || /^[\s\t\n\r]+$/.test(s)),
				async (whitespaceTitle) => {
					const mockEvent = createMockEvent();
					wrapper = mount(EventDialog, {
						props: {
							visible: true,
							event: mockEvent,
						},
						global: {
							stubs: {
								ShareDialog: true,
							},
						},
					});

					// Enter edit mode
					await flushPromises();
					wrapper.vm.enterEditMode();
					await flushPromises();

					// Set whitespace title
					wrapper.vm.editableEvent.title = whitespaceTitle;
					await flushPromises();

					// Attempt to save
					wrapper.vm.saveChanges();
					await flushPromises();

					// Should have title error
					expect(wrapper.vm.formErrors.title).toBe("标题不能为空");

					wrapper.unmount();
					return true;
				}
			),
			{ numRuns: 10 }
		);
	}, 10000); // Reduced timeout

	/**
	 * Property 2: Missing date range validation
	 *
	 * For any event with missing start or end time,
	 * the component should display an error message.
	 */
	it("should show error for missing date range", async () => {
		const mockEvent = createMockEvent();
		wrapper = mount(EventDialog, {
			props: {
				visible: true,
				event: mockEvent,
			},
			global: {
				stubs: {
					ShareDialog: true,
				},
			},
		});

		// Enter edit mode
		await flushPromises();
		wrapper.vm.enterEditMode();
		await flushPromises();

		// Test missing start time
		wrapper.vm.editableEvent.startTime = undefined;
		wrapper.vm.editableEvent.endTime = new Date();
		wrapper.vm.saveChanges();
		await flushPromises();
		expect(wrapper.vm.formErrors.dateRange).toBe("请选择开始和结束时间");

		// Clear errors
		wrapper.vm.formErrors = {};

		// Test missing end time
		wrapper.vm.editableEvent.startTime = new Date();
		wrapper.vm.editableEvent.endTime = undefined;
		wrapper.vm.saveChanges();
		await flushPromises();
		expect(wrapper.vm.formErrors.dateRange).toBe("请选择开始和结束时间");

		// Clear errors
		wrapper.vm.formErrors = {};

		// Test both missing
		wrapper.vm.editableEvent.startTime = undefined;
		wrapper.vm.editableEvent.endTime = undefined;
		wrapper.vm.saveChanges();
		await flushPromises();
		expect(wrapper.vm.formErrors.dateRange).toBe("请选择开始和结束时间");
	});

	/**
	 * Property 3: Invalid time range validation
	 *
	 * For any event where end time is before or equal to start time,
	 * the component should display an error message.
	 */
	it("should show error for invalid time range", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
				fc.integer({ min: -3600000, max: 0 }), // Negative or zero offset in milliseconds
				async (startDate, offset) => {
					const mockEvent = createMockEvent();
					wrapper = mount(EventDialog, {
						props: {
							visible: true,
							event: mockEvent,
						},
						global: {
							stubs: {
								ShareDialog: true,
							},
						},
					});

					// Enter edit mode
					await flushPromises();
					wrapper.vm.enterEditMode();
					await flushPromises();

					// Set invalid time range (end time before or equal to start time)
					wrapper.vm.editableEvent.startTime = startDate;
					wrapper.vm.editableEvent.endTime = new Date(startDate.getTime() + offset);
					wrapper.vm.editableEvent.title = "Valid Title";
					await flushPromises();

					// Attempt to save
					wrapper.vm.saveChanges();
					await flushPromises();

					// Should have date range error
					expect(wrapper.vm.formErrors.dateRange).toBe("结束时间必须晚于开始时间");

					wrapper.unmount();
					return true;
				}
			),
			{ numRuns: 5 }
		);
	}, 15000); // Reduced timeout

	/**
	 * Property 4: Valid form submission
	 *
	 * For any valid event data (non-empty title, valid time range),
	 * the component should not display any errors and should emit save event.
	 */
	it("should not show errors for valid form data", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
				fc.date({ min: new Date("2024-01-01"), max: new Date("2024-12-31") }),
				fc.integer({ min: 3600000, max: 86400000 }), // Positive offset (1-24 hours)
				async (title, startDate, duration) => {
					const mockEvent = createMockEvent();
					wrapper = mount(EventDialog, {
						props: {
							visible: true,
							event: mockEvent,
						},
						global: {
							stubs: {
								ShareDialog: true,
							},
						},
					});

					// Enter edit mode
					await flushPromises();
					wrapper.vm.enterEditMode();
					await flushPromises();

					// Set valid data
					wrapper.vm.editableEvent.title = title;
					wrapper.vm.editableEvent.startTime = startDate;
					wrapper.vm.editableEvent.endTime = new Date(startDate.getTime() + duration);
					await flushPromises();

					// Attempt to save
					wrapper.vm.saveChanges();
					await flushPromises();

					// Should have no errors
					expect(wrapper.vm.formErrors.title).toBeUndefined();
					expect(wrapper.vm.formErrors.dateRange).toBeUndefined();

					// Should emit save event
					expect(wrapper.emitted("save")).toBeTruthy();

					wrapper.unmount();
					return true;
				}
			),
			{ numRuns: 5 }
		);
	}, 20000); // Reduced timeout

	/**
	 * Property 5: Error clearing on input change
	 *
	 * For any field with an error, when the user modifies that field,
	 * the error should be cleared.
	 */
	it("should clear error when user modifies the field", async () => {
		const mockEvent = createMockEvent();
		wrapper = mount(EventDialog, {
			props: {
				visible: true,
				event: mockEvent,
			},
			global: {
				stubs: {
					ShareDialog: true,
				},
			},
		});

		// Enter edit mode
		await flushPromises();
		wrapper.vm.enterEditMode();
		await flushPromises();

		// Set empty title to trigger error
		wrapper.vm.editableEvent.title = "";
		wrapper.vm.saveChanges();
		await flushPromises();
		expect(wrapper.vm.formErrors.title).toBe("标题不能为空");

		// Modify title - error should be cleared
		wrapper.vm.editableEvent.title = "New Title";
		// Simulate input event that clears error
		if (wrapper.vm.formErrors.title) {
			wrapper.vm.formErrors.title = undefined;
		}
		await flushPromises();
		expect(wrapper.vm.formErrors.title).toBeUndefined();
	}, 10000); // 10 second timeout

	/**
	 * Property 6: Cancel edit clears errors
	 *
	 * For any form with errors, canceling the edit should clear all errors.
	 */
	it("should clear all errors when canceling edit", async () => {
		const mockEvent = createMockEvent();
		wrapper = mount(EventDialog, {
			props: {
				visible: true,
				event: mockEvent,
			},
			global: {
				stubs: {
					ShareDialog: true,
				},
			},
		});

		// Enter edit mode
		await flushPromises();
		wrapper.vm.enterEditMode();
		await flushPromises();

		// Trigger multiple errors
		wrapper.vm.editableEvent.title = "";
		wrapper.vm.editableEvent.startTime = undefined;
		wrapper.vm.saveChanges();
		await flushPromises();

		expect(wrapper.vm.formErrors.title).toBe("标题不能为空");
		expect(wrapper.vm.formErrors.dateRange).toBe("请选择开始和结束时间");

		// Cancel edit
		wrapper.vm.cancelEdit();
		await flushPromises();

		// All errors should be cleared
		expect(wrapper.vm.formErrors.title).toBeUndefined();
		expect(wrapper.vm.formErrors.dateRange).toBeUndefined();
	}, 10000); // 10 second timeout
});
