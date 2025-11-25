import { ref } from "vue";
import type { Ref } from "vue";
import { useSupabase } from "@/composables/useSupabase";
import type { VisitorSessionWithCount, VisitorEvent, VisitorStatistics } from "@/types";
import { handleError, ErrorType, createAppError } from "@/utils/errorHandler";

/**
 * useMonitoring 返回接口
 */
export interface UseMonitoringReturn {
	// 状态
	sessions: Ref<VisitorSessionWithCount[]>;
	statistics: Ref<VisitorStatistics>;
	selectedSession: Ref<VisitorSessionWithCount | null>;
	sessionEvents: Ref<VisitorEvent[]>;
	loading: Ref<boolean>;

	// 方法
	loadSessions: () => Promise<void>;
	loadSessionEvents: (fingerprint: string) => Promise<void>;
	refreshData: () => Promise<void>;
}

/**
 * 访客监控 Composable（管理员专用）
 *
 * 实现需求:
 * - 7.3: 查询所有访客会话
 * - 7.4: 计算每个会话的事件数量
 * - 7.5: 查询特定访客的事件详情
 * - 7.6: 按创建时间排序
 * - 7.7: 计算统计数据
 * - 8.5: 显示最后清理时间
 */
export function useMonitoring(): UseMonitoringReturn {
	const { supabase } = useSupabase();

	// ============================================
	// 状态管理
	// ============================================

	/**
	 * 访客会话列表
	 */
	const sessions = ref<VisitorSessionWithCount[]>([]);

	/**
	 * 统计数据
	 */
	const statistics = ref<VisitorStatistics>({
		totalVisitors: 0,
		totalLLMCalls: 0,
		totalTokens: 0,
		totalEvents: 0,
		lastCleanupTime: null,
	});

	/**
	 * 当前选中的会话
	 */
	const selectedSession = ref<VisitorSessionWithCount | null>(null);

	/**
	 * 选中会话的事件列表
	 */
	const sessionEvents = ref<VisitorEvent[]>([]);

	/**
	 * 加载状态
	 */
	const loading = ref(false);

	// ============================================
	// 方法
	// ============================================

	/**
	 * 加载所有访客会话
	 *
	 * 实现需求:
	 * - 7.3: 查询所有访客会话
	 * - 7.4: 通过 JOIN 计算每个会话的事件数量
	 *
	 * @throws {Error} 查询失败
	 */
	const loadSessions = async (): Promise<void> => {
		try {
			loading.value = true;

			// 查询所有访客会话
			const { data: sessionsData, error: sessionsError } = await supabase
				.from("visitor_sessions")
				.select("*")
				.order("created_at", { ascending: false });

			if (sessionsError) {
				throw new Error(`查询访客会话失败: ${sessionsError.message}`);
			}

			// 为每个会话计算事件数量
			const sessionsWithCount: VisitorSessionWithCount[] = [];

			for (const session of sessionsData || []) {
				const { count, error: countError } = await supabase
					.from("visitor_events")
					.select("*", { count: "exact", head: true })
					.eq("fingerprint", session.fingerprint);

				if (countError) {
					console.warn(`查询指纹 ${session.fingerprint} 的事件数量失败:`, countError);
					sessionsWithCount.push({
						...session,
						event_count: 0,
					});
				} else {
					sessionsWithCount.push({
						...session,
						event_count: count || 0,
					});
				}
			}

			sessions.value = sessionsWithCount;
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				"加载访客会话失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "访客会话查询");
			throw new Error(error.message);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 加载特定访客的事件详情
	 *
	 * 实现需求:
	 * - 7.5: 查询该指纹的所有事件
	 * - 7.6: 按创建时间倒序排列
	 *
	 * @param {string} fingerprint - 访客指纹
	 * @throws {Error} 查询失败
	 */
	const loadSessionEvents = async (fingerprint: string): Promise<void> => {
		try {
			loading.value = true;

			// 查询该指纹的所有事件
			const { data, error } = await supabase
				.from("visitor_events")
				.select("*")
				.eq("fingerprint", fingerprint)
				.order("created_at", { ascending: false });

			if (error) {
				throw new Error(`查询访客事件失败: ${error.message}`);
			}

			sessionEvents.value = (data || []) as VisitorEvent[];

			// 更新选中的会话
			selectedSession.value = sessions.value.find((s) => s.fingerprint === fingerprint) || null;
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				"加载访客事件失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "访客事件查询");
			throw new Error(error.message);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 刷新所有数据（会话列表 + 统计数据）
	 *
	 * 实现需求:
	 * - 7.7: 计算统计数据
	 * - 8.5: 显示最后清理时间
	 *
	 * @throws {Error} 查询失败
	 */
	const refreshData = async (): Promise<void> => {
		try {
			loading.value = true;

			// 1. 加载会话列表
			await loadSessions();

			// 2. 计算统计数据

			// 总访客数（COUNT visitor_sessions）
			const { count: visitorCount, error: visitorError } = await supabase
				.from("visitor_sessions")
				.select("*", { count: "exact", head: true });

			if (visitorError) {
				throw new Error(`统计访客数失败: ${visitorError.message}`);
			}

			// 总 LLM 调用次数（SUM llm_used_count）
			const { data: llmData, error: llmError } = await supabase
				.from("visitor_sessions")
				.select("llm_used_count");

			if (llmError) {
				throw new Error(`统计 LLM 调用失败: ${llmError.message}`);
			}

			const totalLLMCalls = (llmData || []).reduce((sum, row) => sum + (row.llm_used_count || 0), 0);

			// 总 Token 消耗（SUM llm_token_used）
			const { data: tokenData, error: tokenError } = await supabase
				.from("visitor_sessions")
				.select("llm_token_used");

			if (tokenError) {
				throw new Error(`统计 Token 消耗失败: ${tokenError.message}`);
			}

			const totalTokens = (tokenData || []).reduce((sum, row) => sum + (row.llm_token_used || 0), 0);

			// 总事件数（COUNT visitor_events）
			const { count: eventCount, error: eventError } = await supabase
				.from("visitor_events")
				.select("*", { count: "exact", head: true });

			if (eventError) {
				throw new Error(`统计事件数失败: ${eventError.message}`);
			}

			// 最后清理时间（查询最旧的记录创建时间）
			// 注意：这是一个简化实现，实际应该从数据库日志或专门的清理记录表查询
			const { data: oldestSession, error: oldestError } = await supabase
				.from("visitor_sessions")
				.select("created_at")
				.order("created_at", { ascending: true })
				.limit(1)
				.single();

			let lastCleanupTime: string | null = null;
			if (!oldestError && oldestSession) {
				// 如果最旧的记录是今天创建的，说明昨天执行过清理
				const oldestDate = new Date(oldestSession.created_at);
				const now = new Date();
				const daysDiff = Math.floor(
					(now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)
				);

				if (daysDiff === 0) {
					// 最旧记录是今天的，说明昨天清理过
					const yesterday = new Date(now);
					yesterday.setDate(yesterday.getDate() - 1);
					yesterday.setHours(2, 0, 0, 0); // 假设清理时间是凌晨 2 点
					lastCleanupTime = yesterday.toISOString();
				}
			}

			// 更新统计数据
			statistics.value = {
				totalVisitors: visitorCount || 0,
				totalLLMCalls,
				totalTokens,
				totalEvents: eventCount || 0,
				lastCleanupTime,
			};
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				"刷新监控数据失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "监控数据刷新");
			throw new Error(error.message);
		} finally {
			loading.value = false;
		}
	};

	return {
		sessions,
		statistics,
		selectedSession,
		sessionEvents,
		loading,
		loadSessions,
		loadSessionEvents,
		refreshData,
	};
}
