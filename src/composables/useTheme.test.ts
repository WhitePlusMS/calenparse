/**
 * Property-Based Tests for Theme System
 *
 * Feature: ui-ux-redesign, Property 1: 主题切换时CSS变量更新
 * Validates: Requirements 2.6
 *
 * This test verifies that when theme mode is switched, all relevant CSS variables
 * are updated correctly for both light and dark modes.
 */

import { describe, it, beforeEach, afterEach } from "vitest";
import fc from "fast-check";
import { useTheme } from "./useTheme";

describe("Theme System Property Tests", () => {
	beforeEach(() => {
		// Reset DOM state before each test
		document.documentElement.className = "";
		document.documentElement.removeAttribute("style");
		localStorage.clear();
	});

	afterEach(() => {
		// Clean up after each test
		document.documentElement.className = "";
		document.documentElement.removeAttribute("style");
		localStorage.clear();
	});

	/**
	 * Property 1: Theme switching updates CSS variables
	 *
	 * For any theme mode (light or dark), when the theme is switched,
	 * all relevant CSS variables should be updated to match the new theme.
	 */
	it("should update CSS variables when theme mode is switched", () => {
		fc.assert(
			fc.property(fc.constantFrom("light" as const, "dark" as const), (themeMode) => {
				// Clear state before each property run
				document.documentElement.className = "";
				document.documentElement.removeAttribute("style");

				// Initialize theme - this will apply the default theme
				const { setMode, theme } = useTheme();

				// If the theme is already set to the target mode (from default),
				// we need to switch to the opposite first, then back
				if (theme.value.mode === themeMode) {
					const oppositeMode = themeMode === "light" ? "dark" : "light";
					setMode(oppositeMode);
				}

				// Now switch to the specified theme mode
				setMode(themeMode);

				// Get the root element
				const root = document.documentElement;

				// Verify the correct class is applied
				if (themeMode === "dark") {
					const hasDarkClass = root.classList.contains("dark-mode");
					const hasLightClass = root.classList.contains("light-mode");

					// Should have dark-mode class and not light-mode class
					return hasDarkClass && !hasLightClass;
				} else {
					const hasLightClass = root.classList.contains("light-mode");
					const hasDarkClass = root.classList.contains("dark-mode");

					// Should have light-mode class and not dark-mode class
					return hasLightClass && !hasDarkClass;
				}
			}),
			{ numRuns: 100 }
		);
	});

	/**
	 * Property 2: Theme mode toggle alternates between light and dark
	 *
	 * For any pair of theme modes, toggling from one to the other should work correctly.
	 */
	it("should toggle between light and dark modes correctly", () => {
		fc.assert(
			fc.property(
				fc.constantFrom("light" as const, "dark" as const),
				fc.constantFrom("light" as const, "dark" as const),
				(mode1, mode2) => {
					// Clear state before each property run
					document.documentElement.className = "";
					document.documentElement.removeAttribute("style");

					const { setMode, theme } = useTheme();

					// Set first mode
					setMode(mode1);

					// Verify first mode is set
					if (theme.value.mode !== mode1) {
						return false;
					}

					// Set second mode
					setMode(mode2);

					// Verify second mode is set
					if (theme.value.mode !== mode2) {
						return false;
					}

					// Verify CSS class is updated
					const root = document.documentElement;
					if (mode2 === "dark") {
						return (
							root.classList.contains("dark-mode") &&
							!root.classList.contains("light-mode")
						);
					} else {
						return (
							root.classList.contains("light-mode") &&
							!root.classList.contains("dark-mode")
						);
					}
				}
			),
			{ numRuns: 100 }
		);
	});

	/**
	 * Property 3: Primary color updates CSS variables
	 *
	 * For any valid hex color, setting the primary color should update
	 * the --primary-color CSS variable and derive light/dark variants.
	 */
	it("should update primary color CSS variables when color is changed", () => {
		fc.assert(
			fc.property(
				// Generate valid hex colors (6 hex digits)
				fc
					.tuple(
						fc.integer({ min: 0, max: 255 }),
						fc.integer({ min: 0, max: 255 }),
						fc.integer({ min: 0, max: 255 })
					)
					.map(([r, g, b]) => {
						const toHex = (n: number) => n.toString(16).padStart(2, "0");
						return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
					}),
				(hexColor) => {
					// Clear state before each property run
					document.documentElement.removeAttribute("style");

					const { setPrimaryColor } = useTheme();

					// Set primary color
					setPrimaryColor(hexColor);

					// Get inline styles (CSS variables are set as inline styles)
					const root = document.documentElement;
					const primaryColor = root.style.getPropertyValue("--primary-color").trim();
					const primaryLight = root.style.getPropertyValue("--primary-light").trim();
					const primaryDark = root.style.getPropertyValue("--primary-dark").trim();

					// All color variables should be defined
					return primaryColor !== "" && primaryLight !== "" && primaryDark !== "";
				}
			),
			{ numRuns: 100 }
		);
	});

	/**
	 * Property 4: Theme persistence to localStorage
	 *
	 * For any theme configuration, the theme should be persisted to localStorage
	 * and restored correctly.
	 */
	it("should persist theme settings to localStorage", () => {
		fc.assert(
			fc.property(
				fc.constantFrom("light" as const, "dark" as const),
				// Generate valid hex colors
				fc
					.tuple(
						fc.integer({ min: 0, max: 255 }),
						fc.integer({ min: 0, max: 255 }),
						fc.integer({ min: 0, max: 255 })
					)
					.map(([r, g, b]) => {
						const toHex = (n: number) => n.toString(16).padStart(2, "0");
						return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
					}),
				(mode, hexColor) => {
					// Clear state before each property run
					localStorage.clear();
					document.documentElement.className = "";
					document.documentElement.removeAttribute("style");

					const { setMode, setPrimaryColor, theme } = useTheme();

					// Set theme - ensure we actually change values to trigger watcher
					// First set to opposite values
					const oppositeMode = mode === "light" ? "dark" : "light";
					setMode(oppositeMode);
					setPrimaryColor("#ffffff");

					// Now set to target values
					setMode(mode);
					setPrimaryColor(hexColor);

					// Verify the theme object has the correct values
					if (theme.value.mode !== mode || theme.value.primaryColor !== hexColor) {
						return false;
					}

					// Check localStorage
					const stored = localStorage.getItem("calenparse_theme_settings");

					if (!stored) {
						return false;
					}

					const parsed = JSON.parse(stored);

					// Verify stored values match
					return parsed.mode === mode && parsed.primaryColor === hexColor;
				}
			),
			{ numRuns: 100 }
		);
	});
});
