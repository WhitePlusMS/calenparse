import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCountdownSettings } from "./useCountdownSettings";

describe("useCountdownSettings", () => {
	beforeEach(() => {
		// Clear localStorage before each test
		localStorage.clear();
	});

	afterEach(() => {
		// Clean up after each test
		localStorage.clear();
	});

	it("should initialize with default settings when localStorage is empty", () => {
		const { settings } = useCountdownSettings();

		expect(settings.value).toEqual({
			enabled: true,
			unit: "day",
		});
	});

	it("should load settings from localStorage if available", () => {
		// Pre-populate localStorage
		const savedSettings = {
			enabled: false,
			unit: "hour" as const,
		};
		localStorage.setItem("countdown-settings", JSON.stringify(savedSettings));

		const { settings } = useCountdownSettings();

		expect(settings.value).toEqual(savedSettings);
	});

	it("should update settings and persist to localStorage", () => {
		const { settings, updateSettings } = useCountdownSettings();

		// Update settings
		updateSettings({ enabled: false });

		// Verify settings are updated
		expect(settings.value.enabled).toBe(false);
		expect(settings.value.unit).toBe("day"); // Should keep existing unit

		// Verify persistence
		const stored = localStorage.getItem("countdown-settings");
		expect(stored).toBeTruthy();
		const parsed = JSON.parse(stored!);
		expect(parsed.enabled).toBe(false);
		expect(parsed.unit).toBe("day");
	});

	it("should handle partial updates correctly", () => {
		const { settings, updateSettings } = useCountdownSettings();

		// Update only unit
		updateSettings({ unit: "minute" });

		expect(settings.value).toEqual({
			enabled: true,
			unit: "minute",
		});

		// Update only enabled
		updateSettings({ enabled: false });

		expect(settings.value).toEqual({
			enabled: false,
			unit: "minute",
		});
	});

	it("should reload settings from localStorage", () => {
		const { settings, loadSettings, updateSettings } = useCountdownSettings();

		// Initial state
		expect(settings.value.enabled).toBe(true);

		// Update settings
		updateSettings({ enabled: false, unit: "hour" });
		expect(settings.value.enabled).toBe(false);
		expect(settings.value.unit).toBe("hour");

		// Manually change localStorage
		localStorage.setItem(
			"countdown-settings",
			JSON.stringify({
				enabled: true,
				unit: "minute",
			})
		);

		// Reload settings
		loadSettings();

		expect(settings.value).toEqual({
			enabled: true,
			unit: "minute",
		});
	});

	it("should handle corrupted localStorage data gracefully", () => {
		// Set invalid JSON
		localStorage.setItem("countdown-settings", "invalid json");

		const { settings } = useCountdownSettings();

		// Should fall back to default settings
		expect(settings.value).toEqual({
			enabled: true,
			unit: "day",
		});
	});

	it("should handle invalid data structure in localStorage", () => {
		// Set valid JSON but invalid structure
		localStorage.setItem(
			"countdown-settings",
			JSON.stringify({
				enabled: "not a boolean",
				unit: "invalid-unit",
			})
		);

		const { settings } = useCountdownSettings();

		// Should fall back to default settings
		expect(settings.value).toEqual({
			enabled: true,
			unit: "day",
		});
	});
});
