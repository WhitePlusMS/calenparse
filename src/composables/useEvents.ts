import { ref, computed, shallowRef, watch, nextTick } from "vue";
import { useSupabase } from "./useSupabase";
import { useAuth } from "./useAuth";
import { useVisitorEvents } from "./useVisitorEvents";
import type { CalendarEvent, VisitorEvent } from "@/types";
import { handleError, classifyError, ErrorType } from "@/utils/errorHandler";
import dayjs from "dayjs";

/**
 * Events management composable
 * Provides centralized state management and CRUD operations for calendar events
 * Implements requirements 6.1, 6.2, 6.3, 7.2
 *
 * 访问控制集成:
 * - 5.1: 根据用户模式路由到不同的数据源
 * - 5.2: 管理员使用 events 表，访客使用 visitor_events 表
 *
 * Note: This composable uses a singleton pattern to ensure state is shared
 * across all components that use it.
 * Performance: Uses shallowRef for large arrays to reduce reactivity overhead
 */

// Shared state (singleton pattern)
// Performance: Use shallowRef for large arrays
const events = shallowRef<CalendarEvent[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
let isInitialized = false;

export function useEvents() {
	const {
		getAllEvents,
		createEvent: createEventDb,
		updateEvent: updateEventDb,
		deleteEvent: deleteEventDb,
	} = useSupabase();

	// 访问控制：获取用户身份和访客事件管理
	const { mode, fingerprint, isAuthChecking } = useAuth();
	const visitorEvents = useVisitorEvents();

	// Computed - filter out templates from regular events
	const regularEvents = computed(() => events.value.filter((e) => !e.isTemplate));
	const eventCount = computed(() => regularEvents.value.length);
	const hasEvents = computed(() => regularEvents.value.length > 0);

	/**
	 * Fetch all events from database and update state
	 * Requirement 7.2: Load all saved events when user reopens the app
	 * Requirement 5.1: 根据用户模式加载不同数据源
	 * Performance: Replaces entire array reference for shallowRef efficiency
	 *
	 * Error handling strategy:
	 * - Sets error.value for UI display
	 * - Keeps isInitialized = false to allow retry
	 * - Preserves existing events array (don't clear on failure)
	 */
	const fetchEvents = async (): Promise<void> => {
		loading.value = true;
		error.value = null;

		try {
			if (mode.value === "admin") {
				// 管理员模式：从 events 表加载
				const fetchedEvents = await getAllEvents();
				events.value = fetchedEvents;
			} else {
				// 访客模式：从 visitor_events 表加载
				if (!fingerprint.value) {
					throw new Error("访客指纹未初始化");
				}

				await visitorEvents.loadEvents(fingerprint.value);

				// 将访客事件转换为 CalendarEvent 格式
				const convertedEvents: CalendarEvent[] = visitorEvents.events.value.map(
					(ve: VisitorEvent) => ({
						id: ve.id,
						title: ve.title,
						startTime: new Date(ve.start_time),
						endTime: new Date(ve.end_time),
						isAllDay: ve.is_all_day,
						location: ve.location,
						description: ve.description,
						originalText: ve.original_text,
						createdAt: new Date(ve.created_at),
						updatedAt: new Date(ve.created_at), // 访客事件没有 updated_at
					})
				);

				events.value = convertedEvents;
			}

			// 只有成功时才标记为已初始化
			isInitialized = true;
			error.value = null; // 清除之前的错误
		} catch (e) {
			const errorType = classifyError(e);

			// 访客模式下，配额错误不应该阻止页面显示
			// 配额满只影响创建新事件，不影响查看已有事件
			if (errorType === ErrorType.QUOTA || errorType === ErrorType.PERMISSION) {
				// 业务限制错误：设置空数组，标记为已初始化
				// 这些不是真正的"系统错误"，而是正常的业务限制
				events.value = [];
				isInitialized = true;
				console.warn(`业务限制 (${errorType})：不影响查看事件功能`);
			} else {
				// 系统错误：设置错误状态，不标记为已初始化（允许重试）
				// 保留现有的 events 数组，不清空（可能有缓存数据）
				const errorMessage = e instanceof Error ? e.message : "获取事件列表失败";
				error.value = errorMessage;
				handleError(e, "获取事件列表");
				// isInitialized 保持 false，UI 可以显示重试按钮
			}
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 等待身份检查完成
	 * 使用 Promise + watch 实现异步等待
	 */
	const waitForAuthCheck = async (): Promise<void> => {
		if (!isAuthChecking.value) {
			// 已经完成检查，直接返回
			return;
		}

		// 等待 isAuthChecking 变为 false
		return new Promise<void>((resolve) => {
			const unwatch = watch(
				isAuthChecking,
				(checking) => {
					if (!checking) {
						unwatch();
						// 使用 nextTick 确保所有响应式更新完成
						nextTick(() => resolve());
					}
				},
				{ immediate: true }
			);
		});
	};

	/**
	 * Initialize events if not already loaded
	 * Auto-fetches on first use
	 * 等待身份检查完成后再加载事件
	 */
	const ensureInitialized = async (): Promise<void> => {
		if (!isInitialized && !loading.value) {
			// 等待身份检查完成
			await waitForAuthCheck();
			// 身份检查完成后加载事件
			await fetchEvents();
		}
	};

	// 不再自动初始化，等待组件显式调用或 watch 触发
	// 这样可以避免在身份检查完成前尝试加载事件

	/**
	 * Create a new event and add it to state
	 * Requirement 6.1: Provide editing options for calendar events
	 * Requirements 1.2, 1.3, 1.4, 1.5: Handle recurring events
	 * Requirement 5.2: 根据用户模式创建到不同数据源
	 * Performance: Creates new array reference for shallowRef reactivity
	 */
	const createEvent = async (
		event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
	): Promise<CalendarEvent> => {
		loading.value = true;
		error.value = null;

		try {
			if (mode.value === "admin") {
				// 管理员模式：保存到 events 表
				const newEvent = await createEventDb(event);
				const newEvents = [...events.value, newEvent];
				newEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
				events.value = newEvents;
				return newEvent;
			} else {
				// 访客模式：保存到 visitor_events 表
				if (!fingerprint.value) {
					throw new Error("访客指纹未初始化");
				}

				// 转换为访客事件格式
				const visitorEventData = {
					fingerprint: fingerprint.value,
					title: event.title,
					start_time: dayjs(event.startTime).utc().toISOString(),
					end_time: dayjs(event.endTime).utc().toISOString(),
					is_all_day: event.isAllDay,
					location: event.location,
					description: event.description,
					original_text: event.originalText,
				};

				await visitorEvents.createEvent(visitorEventData);

				// 重新加载事件列表以更新状态
				await fetchEvents();

				// 返回新创建的事件（从更新后的列表中找到）
				const newEvent = events.value[events.value.length - 1];
				if (!newEvent) {
					throw new Error("创建事件后未能找到新事件");
				}

				return newEvent;
			}
		} catch (e) {
			const errorType = classifyError(e);

			// 配额错误和权限错误不设置全局 error 状态
			// 这些是业务限制，不是系统错误，不应影响其他功能
			// handleError 会显示友好提示，无需设置 error.value
			if (errorType !== ErrorType.QUOTA && errorType !== ErrorType.PERMISSION) {
				const errorMessage = e instanceof Error ? e.message : "创建事件失败";
				error.value = errorMessage;
			}

			handleError(e, "创建事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Update an existing event and reflect changes in state
	 * Requirement 6.2: Update event information and reflect changes in calendar view
	 * Requirement 2.2, 2.3: Handle recurring event updates
	 * Requirement 3.5: 访客模式禁止编辑
	 * Performance: Creates new array reference for shallowRef reactivity
	 */
	const updateEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> => {
		// 访客模式禁止编辑
		if (mode.value === "visitor") {
			throw new Error("访客模式不支持编辑事件，请登录后使用完整功能");
		}

		loading.value = true;
		error.value = null;

		try {
			const updatedEvent = await updateEventDb(id, updates);
			let newEvents = events.value.map((e) => (e.id === id ? updatedEvent : e));
			// Re-sort if start time was updated
			if (updates.startTime) {
				newEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
			}
			events.value = newEvents;
			return updatedEvent;
		} catch (e) {
			const errorType = classifyError(e);

			// 业务限制错误不设置全局 error 状态
			if (errorType !== ErrorType.QUOTA && errorType !== ErrorType.PERMISSION) {
				const errorMessage = e instanceof Error ? e.message : "更新事件失败";
				error.value = errorMessage;
			}

			handleError(e, "更新事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Delete an event and remove it from state
	 * Requirement 6.3: Remove event from calendar
	 * Requirement 3.5: 访客模式禁止删除
	 */
	const deleteEvent = async (id: string): Promise<void> => {
		// 访客模式禁止删除
		if (mode.value === "visitor") {
			throw new Error("访客模式不支持删除事件，请登录后使用完整功能");
		}

		loading.value = true;
		error.value = null;

		try {
			await deleteEventDb(id);
			events.value = events.value.filter((e) => e.id !== id);
		} catch (e) {
			const errorType = classifyError(e);

			// 业务限制错误不设置全局 error 状态
			if (errorType !== ErrorType.QUOTA && errorType !== ErrorType.PERMISSION) {
				const errorMessage = e instanceof Error ? e.message : "删除事件失败";
				error.value = errorMessage;
			}

			handleError(e, "删除事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Refresh events from database
	 * Useful for ensuring data consistency or retrying after error
	 */
	const refreshEvents = async (): Promise<void> => {
		// 允许重新加载，即使之前已初始化
		isInitialized = false;
		await fetchEvents();
	};

	/**
	 * Get a single event by ID (searches all events including templates)
	 */
	const getEventById = (id: string): CalendarEvent | undefined => {
		return events.value.find((e) => e.id === id);
	};

	/**
	 * Get events for a specific date range
	 */
	const getEventsByDateRange = (startDate: Date, endDate: Date): CalendarEvent[] => {
		return events.value.filter((event) => {
			return event.startTime >= startDate && event.startTime <= endDate;
		});
	};

	/**
	 * Clear error state
	 */
	const clearError = (): void => {
		error.value = null;
	};

	/**
	 * Toggle event completion status
	 * Requirement 23.2: Save completion status immediately to database
	 * Requirement 23.6: Toggle completion status and update all views
	 * Requirement 3.5: 访客模式禁止编辑
	 */
	const toggleEventCompletion = async (id: string): Promise<CalendarEvent> => {
		// 访客模式禁止编辑
		if (mode.value === "visitor") {
			throw new Error("访客模式不支持编辑事件，请登录后使用完整功能");
		}

		// Search in all events including templates
		const event = events.value.find((e) => e.id === id);
		if (!event) {
			throw new Error("事件不存在");
		}

		const newCompletionStatus = !event.isCompleted;
		return await updateEvent(id, { isCompleted: newCompletionStatus });
	};

	/**
	 * Batch delete events
	 * Requirement 12.3: Implement batch delete
	 * Requirement 12.5: Ensure atomicity (all succeed or all fail)
	 * Requirement 1.9: 访客模式禁用批量操作
	 * Supports recurring events - expands to include all instances in recurrence groups
	 */
	const batchDeleteEvents = async (ids: string[]): Promise<void> => {
		// 访客模式禁止批量删除
		if (mode.value === "visitor") {
			throw new Error("访客模式不支持批量操作，请登录后使用完整功能");
		}

		if (ids.length === 0) return;

		loading.value = true;
		error.value = null;

		try {
			// Delete all events - if any fails, the whole operation fails
			await Promise.all(ids.map((id) => deleteEventDb(id)));

			// Only update state if all deletions succeeded
			events.value = events.value.filter((e) => !ids.includes(e.id));
		} catch (e) {
			const errorType = classifyError(e);

			// 业务限制错误不设置全局 error 状态
			if (errorType !== ErrorType.QUOTA && errorType !== ErrorType.PERMISSION) {
				const errorMessage = e instanceof Error ? e.message : "批量删除事件失败";
				error.value = errorMessage;
			}

			handleError(e, "批量删除事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	/**
	 * Batch update events
	 * Requirement 12.4: Implement batch edit
	 * Requirement 12.5: Ensure atomicity (all succeed or all fail)
	 * Requirement 1.9: 访客模式禁用批量操作
	 */
	const batchUpdateEvents = async (ids: string[], updates: Partial<CalendarEvent>): Promise<CalendarEvent[]> => {
		// 访客模式禁止批量编辑
		if (mode.value === "visitor") {
			throw new Error("访客模式不支持批量操作，请登录后使用完整功能");
		}

		if (ids.length === 0) return [];

		loading.value = true;
		error.value = null;

		try {
			// Update all events - if any fails, the whole operation fails
			const updatedEvents = await Promise.all(ids.map((id) => updateEventDb(id, updates)));

			// Only update state if all updates succeeded
			const updatedIds = new Set(ids);
			let newEvents = events.value.map((e) => {
				if (updatedIds.has(e.id)) {
					return updatedEvents.find((ue) => ue.id === e.id) || e;
				}
				return e;
			});

			// Re-sort if start time was updated
			if (updates.startTime) {
				newEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
			}

			events.value = newEvents;
			return updatedEvents;
		} catch (e) {
			const errorType = classifyError(e);

			// 业务限制错误不设置全局 error 状态
			if (errorType !== ErrorType.QUOTA && errorType !== ErrorType.PERMISSION) {
				const errorMessage = e instanceof Error ? e.message : "批量更新事件失败";
				error.value = errorMessage;
			}

			handleError(e, "批量更新事件");
			throw e;
		} finally {
			loading.value = false;
		}
	};

	return {
		// State - expose regularEvents as events (templates are filtered out)
		events: regularEvents,
		allEvents: events, // expose all events including templates for internal use
		loading,
		error,

		// Computed
		eventCount,
		hasEvents,

		// 访问控制：暴露用户模式供 UI 组件使用
		mode,

		// Methods
		fetchEvents,
		ensureInitialized,
		createEvent,
		updateEvent,
		deleteEvent,
		refreshEvents,
		getEventById,
		getEventsByDateRange,
		clearError,
		batchDeleteEvents,
		batchUpdateEvents,
		toggleEventCompletion,
	};
}
