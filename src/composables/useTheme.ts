import { ref, watch } from "vue";

/**
 * Theme settings interface
 * Requirement 14.1-14.6: Theme customization
 */
export interface ThemeSettings {
	mode: "light" | "dark";
	primaryColor: string;
}

const THEME_STORAGE_KEY = "calenparse_theme_settings";

// Default theme settings
const defaultTheme: ThemeSettings = {
	mode: "light",
	primaryColor: "#667eea",
};

// Shared state (singleton pattern)
const currentTheme = ref<ThemeSettings>(loadTheme());

/**
 * Load theme settings from localStorage
 * Requirement 14.6: Load theme settings on app startup
 */
function loadTheme(): ThemeSettings {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...defaultTheme, ...parsed };
		}
	} catch (error) {
		console.error("Failed to load theme settings:", error);
	}
	return { ...defaultTheme };
}

/**
 * Save theme settings to localStorage
 * Requirement 14.5: Persist theme settings to localStorage
 */
function saveTheme(theme: ThemeSettings): void {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
	} catch (error) {
		console.error("Failed to save theme settings:", error);
	}
}

/**
 * Apply theme to document
 * Requirement 14.2, 14.3: Apply dark/light mode and custom colors
 */
function applyTheme(theme: ThemeSettings): void {
	const root = document.documentElement;

	// Apply mode
	if (theme.mode === "dark") {
		root.classList.add("dark-mode");
		root.classList.remove("light-mode");
	} else {
		root.classList.remove("dark-mode");
		root.classList.add("light-mode");
	}

	// Apply custom colors using CSS variables
	root.style.setProperty("--primary-color", theme.primaryColor);

	// Derive other colors from primary
	root.style.setProperty("--primary-light", lightenColor(theme.primaryColor, 20));
	root.style.setProperty("--primary-dark", darkenColor(theme.primaryColor, 20));

	// Apply Element Plus theme variables for dark mode
	if (theme.mode === "dark") {
		root.style.setProperty("--el-bg-color", "#2d2d2d");
		root.style.setProperty("--el-bg-color-overlay", "#2d2d2d");
		root.style.setProperty("--el-text-color-primary", "#e4e7ed");
		root.style.setProperty("--el-text-color-regular", "#c0c4cc");
		root.style.setProperty("--el-border-color", "#4c4d4f");
		root.style.setProperty("--el-fill-color-blank", "#2d2d2d");
		root.style.setProperty("--el-color-primary", theme.primaryColor);
	} else {
		root.style.setProperty("--el-bg-color", "#ffffff");
		root.style.setProperty("--el-bg-color-overlay", "#ffffff");
		root.style.setProperty("--el-text-color-primary", "#303133");
		root.style.setProperty("--el-text-color-regular", "#606266");
		root.style.setProperty("--el-border-color", "#dcdfe6");
		root.style.setProperty("--el-fill-color-blank", "#ffffff");
		root.style.setProperty("--el-color-primary", theme.primaryColor);
	}
}

/**
 * Lighten a hex color
 */
function lightenColor(hex: string, percent: number): string {
	const num = parseInt(hex.replace("#", ""), 16);
	const amt = Math.round(2.55 * percent);
	const R = (num >> 16) + amt;
	const G = ((num >> 8) & 0x00ff) + amt;
	const B = (num & 0x0000ff) + amt;
	return (
		"#" +
		(
			0x1000000 +
			(R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
			(G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
			(B < 255 ? (B < 1 ? 0 : B) : 255)
		)
			.toString(16)
			.slice(1)
	);
}

/**
 * Darken a hex color
 */
function darkenColor(hex: string, percent: number): string {
	const num = parseInt(hex.replace("#", ""), 16);
	const amt = Math.round(2.55 * percent);
	const R = (num >> 16) - amt;
	const G = ((num >> 8) & 0x00ff) - amt;
	const B = (num & 0x0000ff) - amt;
	return (
		"#" +
		(0x1000000 + (R > 0 ? R : 0) * 0x10000 + (G > 0 ? G : 0) * 0x100 + (B > 0 ? B : 0))
			.toString(16)
			.slice(1)
	);
}

/**
 * Theme management composable
 * Implements requirements 14.1-14.6
 */
export function useTheme() {
	// Watch for theme changes and apply them
	watch(
		currentTheme,
		(newTheme) => {
			applyTheme(newTheme);
			saveTheme(newTheme);
		},
		{ deep: true, immediate: true }
	);

	/**
	 * Set theme mode
	 * Requirement 14.1, 14.2: Switch between dark and light mode
	 */
	const setMode = (mode: "light" | "dark") => {
		currentTheme.value.mode = mode;
		// Force apply and save theme even if mode hasn't changed
		// This ensures theme is applied correctly in all scenarios
		applyTheme(currentTheme.value);
		saveTheme(currentTheme.value);
	};

	/**
	 * Set primary color
	 * Requirement 14.4: Custom color selection
	 */
	const setPrimaryColor = (color: string) => {
		currentTheme.value.primaryColor = color;
		// Force apply and save theme to ensure color changes are reflected
		applyTheme(currentTheme.value);
		saveTheme(currentTheme.value);
	};

	/**
	 * Reset to default theme
	 */
	const resetTheme = () => {
		currentTheme.value = { ...defaultTheme };
	};

	/**
	 * Toggle between light and dark mode
	 */
	const toggleMode = () => {
		currentTheme.value.mode = currentTheme.value.mode === "light" ? "dark" : "light";
	};

	return {
		theme: currentTheme,
		setMode,
		setPrimaryColor,
		resetTheme,
		toggleMode,
	};
}
