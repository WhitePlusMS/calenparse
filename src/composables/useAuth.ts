import { ref, computed, onMounted } from "vue";
import type { Ref, ComputedRef } from "vue";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import type { Session } from "@supabase/supabase-js";
import { useSupabase } from "@/composables/useSupabase";
import type { UserMode, VisitorQuota } from "@/types";
import { handleError, ErrorType, createAppError } from "@/utils/errorHandler";

/**
 * useAuth 返回接口
 */
export interface UseAuthReturn {
	// 状态
	mode: Ref<UserMode>;
	fingerprint: Ref<string | null>;
	adminSession: Ref<Session | null>;
	isAdmin: ComputedRef<boolean>;
	isAuthChecking: Ref<boolean>;

	// 访客相关
	initVisitorMode: () => Promise<void>;
	getVisitorQuota: () => Promise<VisitorQuota>;

	// 管理员相关
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;

	// 权限切换
	switchMode: (newMode: UserMode) => Promise<void>;
}

// 全局单例状态
let authInstance: UseAuthReturn | null = null;

/**
 * 访问控制 Composable
 *
 * 实现需求:
 * - 1.1: 访客模式自动初始化
 * - 1.2: 浏览器指纹生成
 * - 1.3: 访客会话管理
 * - 2.2: 管理员登录
 * - 2.7: 管理员登出
 * - 6.1: 应用启动时身份检查
 * - 6.2: 有效会话进入管理员模式
 * - 6.3: 无会话进入访客模式
 * - 6.4: 访客到管理员模式切换
 * - 6.5: 管理员到访客模式切换
 */
export function useAuth(): UseAuthReturn {
	// 返回已存在的实例（单例模式）
	if (authInstance) {
		return authInstance;
	}

	const { supabase } = useSupabase();

	// ============================================
	// 状态管理
	// ============================================

	/**
	 * 当前用户模式
	 */
	const mode = ref<UserMode>("visitor");

	/**
	 * 浏览器指纹（访客模式）
	 */
	const fingerprint = ref<string | null>(null);

	/**
	 * 管理员会话（管理员模式）
	 */
	const adminSession = ref<Session | null>(null);

	/**
	 * 身份检查状态（防止竞态条件）
	 * 初始为 true，身份确定后设为 false
	 */
	const isAuthChecking = ref(true);

	/**
	 * 是否为管理员
	 */
	const isAdmin = computed(() => mode.value === "admin");

	// 指纹缓存（避免重复生成）
	let fingerprintCache: string | null = null;

	// ============================================
	// 访客模式相关方法
	// ============================================

	/**
	 * 初始化访客模式
	 *
	 * 实现需求:
	 * - 1.2: 使用 FingerprintJS 生成稳定指纹
	 * - 1.3: 在 visitor_sessions 表查询或创建记录
	 *
	 * @throws {Error} 指纹生成失败或数据库操作失败
	 */
	const initVisitorMode = async (): Promise<void> => {
		try {
			// 如果已有缓存的指纹，直接使用
			if (fingerprintCache) {
				fingerprint.value = fingerprintCache;
				mode.value = "visitor";
				return;
			}

			// 生成浏览器指纹
			const fp = await FingerprintJS.load();
			const result = await fp.get();
			const visitorId = result.visitorId;

			// 缓存指纹
			fingerprintCache = visitorId;
			fingerprint.value = visitorId;

			// 查询或创建访客会话记录
			const { data: existingSession, error: queryError } = await supabase
				.from("visitor_sessions")
				.select("*")
				.eq("fingerprint", visitorId)
				.single();

			if (queryError && queryError.code !== "PGRST116") {
				// PGRST116 是 "not found" 错误，其他错误需要抛出
				throw new Error(`查询访客会话失败: ${queryError.message}`);
			}

			// 如果不存在，创建新记录
			if (!existingSession) {
				const { error: insertError } = await supabase.from("visitor_sessions").insert({
					fingerprint: visitorId,
					llm_used_count: 0,
					llm_token_used: 0,
				});

				if (insertError) {
					throw new Error(`创建访客会话失败: ${insertError.message}`);
				}
			} else {
				// 更新最后活跃时间
				const { error: updateError } = await supabase
					.from("visitor_sessions")
					.update({ last_active_at: new Date().toISOString() })
					.eq("fingerprint", visitorId);

				if (updateError) {
					console.warn("更新访客活跃时间失败:", updateError);
				}
			}

			mode.value = "visitor";
		} catch (err) {
			const error = createAppError(
				ErrorType.NETWORK,
				"初始化访客模式失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "访客模式初始化");
			throw new Error(error.message);
		}
	};

	/**
	 * 获取访客配额信息
	 *
	 * 实现需求:
	 * - 1.5: 查询访客配额
	 * - 4.10: 显示剩余配额
	 *
	 * @returns {Promise<VisitorQuota>} 访客配额信息
	 * @throws {Error} 查询失败
	 */
	const getVisitorQuota = async (): Promise<VisitorQuota> => {
		if (!fingerprint.value) {
			throw new Error("访客指纹未初始化");
		}

		try {
			// 查询 LLM 配额
			const { data: session, error: sessionError } = await supabase
				.from("visitor_sessions")
				.select("llm_used_count")
				.eq("fingerprint", fingerprint.value)
				.single();

			if (sessionError) {
				throw new Error(`查询 LLM 配额失败: ${sessionError.message}`);
			}

			// 查询事件配额（通过 COUNT 计算）
			const { count, error: countError } = await supabase
				.from("visitor_events")
				.select("*", { count: "exact", head: true })
				.eq("fingerprint", fingerprint.value);

			if (countError) {
				throw new Error(`查询事件配额失败: ${countError.message}`);
			}

			const eventsUsed = count || 0;
			const llmUsed = session?.llm_used_count || 0;

			return {
				llmRemaining: llmUsed === 0 ? 1 : 0,
				eventsUsed,
				eventsRemaining: Math.max(0, 3 - eventsUsed),
			};
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				"查询访客配额失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "配额查询");
			throw new Error(error.message);
		}
	};

	// ============================================
	// 管理员模式相关方法
	// ============================================

	/**
	 * 管理员登录
	 *
	 * 实现需求:
	 * - 2.2: 通过 Supabase Auth 验证凭证
	 * - 2.3: 处理登录错误
	 * - 2.4: 创建会话
	 *
	 * @param {string} email - 管理员邮箱
	 * @param {string} password - 管理员密码
	 * @throws {Error} 登录失败（无效凭证、网络错误等）
	 */
	const login = async (email: string, password: string): Promise<void> => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				// 根据错误类型提供友好提示
				if (error.message.includes("Invalid login credentials")) {
					throw new Error("邮箱或密码错误，请重试");
				} else if (error.message.includes("Email not confirmed")) {
					throw new Error("邮箱未验证，请检查邮箱");
				} else {
					throw new Error(`登录失败: ${error.message}`);
				}
			}

			if (!data.session) {
				throw new Error("登录失败：未能创建会话");
			}

			// 设置管理员会话
			adminSession.value = data.session;
			mode.value = "admin";

			// 清空访客数据
			fingerprint.value = null;
			fingerprintCache = null;
		} catch (err) {
			const error = createAppError(
				ErrorType.NETWORK,
				err instanceof Error ? err.message : "登录失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "管理员登录");
			throw new Error(error.message);
		}
	};

	/**
	 * 管理员登出
	 *
	 * 实现需求:
	 * - 2.7: 清除会话并返回访客模式
	 *
	 * @throws {Error} 登出失败
	 */
	const logout = async (): Promise<void> => {
		try {
			const { error } = await supabase.auth.signOut();

			if (error) {
				throw new Error(`登出失败: ${error.message}`);
			}

			// 清空管理员会话
			adminSession.value = null;

			// 切换到访客模式
			await initVisitorMode();
		} catch (err) {
			const error = createAppError(
				ErrorType.NETWORK,
				err instanceof Error ? err.message : "登出失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "管理员登出");
			throw new Error(error.message);
		}
	};

	// ============================================
	// 权限切换
	// ============================================

	/**
	 * 切换用户模式
	 *
	 * 实现需求:
	 * - 6.4: 访客 → 管理员：清空访客数据，加载管理员数据
	 * - 6.5: 管理员 → 访客：清空管理员数据，生成新指纹
	 *
	 * @param {UserMode} newMode - 目标模式
	 */
	const switchMode = async (newMode: UserMode): Promise<void> => {
		if (mode.value === newMode) {
			return; // 已经是目标模式，无需切换
		}

		try {
			if (newMode === "admin") {
				// 访客 → 管理员
				// 注意：实际登录由 login() 方法处理
				// 这里只是清空访客数据
				fingerprint.value = null;
				fingerprintCache = null;
				mode.value = "admin";
			} else {
				// 管理员 → 访客
				// 清空管理员数据
				adminSession.value = null;

				// 生成新指纹
				fingerprintCache = null;
				await initVisitorMode();
			}
		} catch (err) {
			const error = createAppError(
				ErrorType.UNKNOWN,
				"切换模式失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "模式切换");
			throw new Error(error.message);
		}
	};

	// ============================================
	// 应用启动时的身份检查
	// ============================================

	/**
	 * 应用启动时检查身份
	 *
	 * 实现需求:
	 * - 6.1: 检查 Supabase Auth 会话状态
	 * - 6.2: 有效会话 → 管理员模式
	 * - 6.3: 无会话 → 访客模式
	 *
	 * 防止竞态条件：
	 * - 初始 isAuthChecking = true
	 * - 身份确定后设为 false
	 * - App.vue 根据此状态显示 Loading
	 */
	onMounted(async () => {
		try {
			isAuthChecking.value = true;

			// 检查 Supabase Auth 会话
			const {
				data: { session },
				error,
			} = await supabase.auth.getSession();

			if (error) {
				console.warn("检查会话失败:", error);
				// 出错时默认进入访客模式
				await initVisitorMode();
			} else if (session) {
				// 有效会话 → 管理员模式
				adminSession.value = session;
				mode.value = "admin";
			} else {
				// 无会话 → 访客模式
				await initVisitorMode();
			}
		} catch (err) {
			console.error("身份检查失败:", err);
			// 出错时默认进入访客模式
			try {
				await initVisitorMode();
			} catch (initErr) {
				console.error("初始化访客模式失败:", initErr);
			}
		} finally {
			// 身份确定后设为 false
			isAuthChecking.value = false;
		}
	});

	// 监听会话变化（会话过期时自动切换到访客模式）
	supabase.auth.onAuthStateChange((event, session) => {
		if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
			// 会话过期或登出
			const wasAdmin = mode.value === "admin";
			adminSession.value = null;

			if (wasAdmin) {
				// 显示会话过期提示
				const error = createAppError(ErrorType.AUTH, "会话已过期，请重新登录");
				handleError(error, "会话管理");

				// 自动切换到访客模式
				initVisitorMode().catch((err) => {
					console.error("自动切换到访客模式失败:", err);
				});
			}
		} else if (event === "SIGNED_IN" && session) {
			// 登录成功
			adminSession.value = session;
			mode.value = "admin";
		}
	});

	// 创建实例
	authInstance = {
		mode,
		fingerprint,
		adminSession,
		isAdmin,
		isAuthChecking,
		initVisitorMode,
		getVisitorQuota,
		login,
		logout,
		switchMode,
	};

	return authInstance;
}
