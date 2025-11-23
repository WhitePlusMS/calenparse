import { ref, type Ref } from "vue";
import type { CountdownSettings } from "@/types";

const STORAGE_KEY = "countdown-settings";

/**
 * 默认倒计时设置
 */
const DEFAULT_SETTINGS: CountdownSettings = {
	enabled: true,
	unit: "day",
};

/**
 * 从本地存储加载倒计时设置
 * @returns 加载的设置或默认设置
 */
function loadSettings(): CountdownSettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// 验证加载的数据结构
			if (
				typeof parsed === "object" &&
				typeof parsed.enabled === "boolean" &&
				(parsed.unit === "day" || parsed.unit === "hour" || parsed.unit === "minute")
			) {
				return parsed as CountdownSettings;
			}
		}
	} catch (error) {
		console.error("Failed to load countdown settings:", error);
	}

	// 返回默认设置
	return { ...DEFAULT_SETTINGS };
}

/**
 * 保存倒计时设置到本地存储
 * @param settings 要保存的设置
 */
function saveSettings(settings: CountdownSettings): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (error) {
		console.error("Failed to save countdown settings:", error);
	}
}

/**
 * 倒计时设置管理 composable
 * 提供响应式的设置状态和更新方法
 */
export function useCountdownSettings() {
	// 响应式的设置状态
	const settings: Ref<CountdownSettings> = ref(loadSettings());

	/**
	 * 更新设置并持久化到本地存储
	 * @param updates 要更新的设置（部分更新）
	 */
	function updateSettings(updates: Partial<CountdownSettings>): void {
		// 合并更新
		settings.value = {
			...settings.value,
			...updates,
		};

		// 持久化到本地存储
		saveSettings(settings.value);
	}

	return {
		settings,
		updateSettings,
		loadSettings: () => {
			settings.value = loadSettings();
		},
	};
}
