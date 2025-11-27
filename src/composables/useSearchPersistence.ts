import { ref, watch } from "vue";
import type { SearchFilters, CompletionStatus } from "@/types";
import dayjs from "dayjs";

/**
 * 搜索参数持久化 Composable
 * 将搜索和筛选参数保存到 localStorage，以便刷新页面时不丢失
 *
 * 设计原则：
 * - 与 useSearch 集成，使用统一的 SearchFilters 类型
 * - 使用 Day.js 处理日期（符合项目规范）
 * - 健壮的错误处理（支持隐私模式）
 */

/**
 * 持久化的搜索过滤器（序列化格式）
 * 与 SearchFilters 对应，但日期使用 ISO 字符串
 */
interface PersistedSearchFilters {
	keyword?: string;
	dateRange?: [string, string]; // ISO 字符串格式
	locations?: string[];
	tagIds?: string[];
	completionStatus?: CompletionStatus; // 完成状态筛选
}

const STORAGE_KEY_PREFIX = "calenparse-search-filters";

/**
 * 检测 localStorage 是否可用
 * 处理隐私模式或禁用存储的情况
 */
const isStorageAvailable = (): boolean => {
	try {
		const testKey = "__storage_test__";
		localStorage.setItem(testKey, "test");
		localStorage.removeItem(testKey);
		return true;
	} catch {
		return false;
	}
};

/**
 * 使用搜索参数持久化
 * @param viewType - 视图类型 ('calendar' 或 'list')
 */
export function useSearchPersistence(viewType: "calendar" | "list") {
	const storageKey = `${STORAGE_KEY_PREFIX}-${viewType}`;
	const storageAvailable = isStorageAvailable();

	// 响应式状态 - 与 SearchFilters 类型对齐
	const filters = ref<SearchFilters>({});
	// 完成状态筛选（独立管理，因为不属于 SearchFilters）
	const completionStatus = ref<CompletionStatus>("all");

	/**
	 * 从 localStorage 加载搜索参数
	 * 使用 Day.js 解析日期，确保时区正确处理
	 */
	const loadFilters = (): void => {
		if (!storageAvailable) {
			console.warn("localStorage 不可用，跳过加载搜索参数");
			return;
		}

		try {
			const stored = localStorage.getItem(storageKey);
			if (!stored) return;

			const persisted: PersistedSearchFilters = JSON.parse(stored);

			// 恢复搜索关键词
			if (persisted.keyword) {
				filters.value.keyword = persisted.keyword;
			}

			// 恢复日期范围（使用 Day.js 解析 ISO 字符串）
			if (persisted.dateRange && Array.isArray(persisted.dateRange)) {
				const [start, end] = persisted.dateRange;
				const startDate = dayjs(start);
				const endDate = dayjs(end);

				// 验证日期有效性
				if (startDate.isValid() && endDate.isValid()) {
					filters.value.dateRange = [startDate.toDate(), endDate.toDate()];
				}
			}

			// 恢复地点筛选
			if (Array.isArray(persisted.locations)) {
				filters.value.locations = persisted.locations;
			}

			// 恢复标签筛选
			if (Array.isArray(persisted.tagIds)) {
				filters.value.tagIds = persisted.tagIds;
			}

			// 恢复完成状态筛选（独立状态）
			if (persisted.completionStatus) {
				completionStatus.value = persisted.completionStatus;
			}
		} catch (error) {
			console.warn(`加载 ${viewType} 搜索参数失败:`, error);
			// 加载失败不影响应用运行，继续使用默认值
		}
	};

	/**
	 * 保存搜索参数到 localStorage
	 * 使用 Day.js 格式化日期为 ISO 字符串
	 */
	const saveFilters = (): void => {
		if (!storageAvailable) {
			return; // 静默失败，不影响功能
		}

		try {
			const persisted: PersistedSearchFilters = {
				keyword: filters.value.keyword,
				dateRange: filters.value.dateRange
					? [
							dayjs(filters.value.dateRange[0]).toISOString(),
							dayjs(filters.value.dateRange[1]).toISOString(),
					  ]
					: undefined,
				locations: filters.value.locations,
				tagIds: filters.value.tagIds,
				// 保存独立的 completionStatus（仅在非默认值时保存）
				completionStatus: completionStatus.value !== "all" ? completionStatus.value : undefined,
			};

			localStorage.setItem(storageKey, JSON.stringify(persisted));
		} catch (error) {
			console.warn(`保存 ${viewType} 搜索参数失败:`, error);
			// 保存失败不影响应用运行
		}
	};

	/**
	 * 清除所有筛选条件
	 */
	const clearAllFilters = (): void => {
		filters.value = {};
		completionStatus.value = "all";
		saveFilters();
	};

	/**
	 * 清除 localStorage 中的搜索参数
	 */
	const clearStorage = (): void => {
		if (!storageAvailable) return;

		try {
			localStorage.removeItem(storageKey);
		} catch (error) {
			console.warn(`清除 ${viewType} 搜索参数失败:`, error);
		}
	};

	// 监听 filters 和 completionStatus 的变化，自动保存到 localStorage
	watch([filters, completionStatus], saveFilters, { deep: true });

	// 初始化时加载持久化数据
	loadFilters();

	return {
		// 响应式状态
		filters,
		completionStatus,

		// 方法
		loadFilters,
		saveFilters,
		clearAllFilters,
		clearStorage,

		// 工具
		isStorageAvailable: storageAvailable,
	};
}
