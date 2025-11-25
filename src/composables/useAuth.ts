import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import type { Session } from "@supabase/supabase-js";
import { useSupabase } from "@/composables/useSupabase";
import type { UserMode, VisitorQuota } from "@/types";

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

// 全局初始化标记（确保只初始化一次）
let isInitialized = false;

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

	/**
	 * 登出操作标记（避免 onAuthStateChange 重复处理）
	 */
	const isLoggingOut = ref(false);

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
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			// 根据错误类型提供友好提示
			const errorMsg = error.message.toLowerCase();
			if (
				errorMsg.includes("invalid login credentials") ||
				errorMsg.includes("invalid email or password")
			) {
				throw new Error("邮箱或密码错误，请重试");
			} else if (errorMsg.includes("email not confirmed")) {
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
		// 防止重复登出
		if (isLoggingOut.value) {
			return;
		}

		isLoggingOut.value = true;

		try {
			const { error } = await supabase.auth.signOut();

			if (error) {
				throw new Error(`登出失败: ${error.message}`);
			}
		} finally {
			// 无论登出成功或失败，都清理本地状态并切换到访客模式
			adminSession.value = null;
			mode.value = "visitor";
			isLoggingOut.value = false;

			// 尝试初始化访客模式（不阻塞，失败也不影响登出）
			try {
				await initVisitorMode();
			} catch (initErr) {
				console.error("初始化访客模式失败:", initErr);
			}
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
	const initializeAuth = async (): Promise<void> => {
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
				await safelyFallbackToVisitor();
			} else if (session) {
				// 有效会话 → 管理员模式
				adminSession.value = session;
				mode.value = "admin";
			} else {
				// 无会话 → 访客模式
				await safelyFallbackToVisitor();
			}
		} catch (err) {
			console.error("身份检查失败:", err);
			// 出错时默认进入访客模式
			await safelyFallbackToVisitor();
		} finally {
			// 身份确定后设为 false
			isAuthChecking.value = false;
		}
	};

	// ============================================
	// 内部辅助方法
	// ============================================

	/**
	 * 安全地切换到访客模式（内部使用）
	 * 统一处理错误，避免代码重复
	 */
	const safelyFallbackToVisitor = async (): Promise<void> => {
		adminSession.value = null;
		mode.value = "visitor";
		try {
			await initVisitorMode();
		} catch (err) {
			console.error("切换到访客模式失败:", err);
		}
	};

	/**
	 * 设置会话状态监听器
	 * 监听会话变化（会话过期时自动切换到访客模式）
	 * 注意：不要在这里显示错误提示，因为 SIGNED_OUT 事件在主动登出时也会触发
	 */
	const setupAuthListener = (): void => {
		supabase.auth.onAuthStateChange(async (event, session) => {
			// 如果正在主动登出，忽略所有事件（由 logout() 方法处理）
			if (isLoggingOut.value) {
				return;
			}

			if (event === "SIGNED_OUT") {
				// 被动登出（如其他设备登出、会话过期等）
				// 不显示错误提示，静默切换到访客模式
				await safelyFallbackToVisitor();
			} else if (event === "SIGNED_IN" && session) {
				// 登录成功
				adminSession.value = session;
				mode.value = "admin";
			}
			// 移除 TOKEN_REFRESHED 处理，因为它会在登出时也会触发
		});
		// 注意：单例模式下监听器会持续存在，无需清理
	};

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

	// 只在第一次创建实例时初始化
	if (!isInitialized) {
		isInitialized = true;

		// 设置会话监听器
		setupAuthListener();

		// 执行初始化（异步，不阻塞返回）
		initializeAuth().catch((err) => {
			console.error("认证初始化失败:", err);
		});
	}

	return authInstance;
}
