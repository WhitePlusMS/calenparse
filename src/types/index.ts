export interface Tag {
	id: string;
	name: string;
	color: string;
	createdAt: Date;
}

export interface CalendarEvent {
	id: string;
	title: string;
	startTime: Date;
	endTime: Date;
	isAllDay: boolean;
	location?: string;
	description?: string;
	originalText?: string;
	tagIds?: string[];
	isCompleted?: boolean;
	// 模板字段
	isTemplate?: boolean;
	templateName?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ParsedEvent {
	title?: string;
	startTime?: Date;
	endTime?: Date;
	isAllDay?: boolean;
	location?: string;
	description?: string;
	tags?: string[];
}

export interface LLMRequest {
	text: string;
}

export interface LLMResponse {
	events: ParsedEvent[];
	error?: string;
}

export interface SelectionState {
	isSelectionMode: boolean;
	selectedIds: Set<string>;
}

/**
 * 时间单位
 */
export type TimeUnit = "day" | "hour" | "minute";

/**
 * 倒计时信息
 * 使用判别联合类型确保类型安全
 */
export type CountdownInfo =
	| { type: "none" }
	| {
			type: "start" | "end" | "overdue";
			value: number; // 倒计时数值（非负）
			unit: TimeUnit;
			text: string; // 格式化的倒计时文本（如 "还有 3 天开始" 或 "已过期 2 天"）
	  };

/**
 * 倒计时显示设置
 */
export interface CountdownSettings {
	enabled: boolean; // 是否显示倒计时
	unit: TimeUnit; // 默认显示单位
}

// 搜索过滤器
export interface SearchFilters {
	keyword?: string; // 关键词搜索
	dateRange?: [Date, Date]; // 日期范围
	locations?: string[]; // 地点筛选
	tagIds?: string[]; // 标签筛选
}

// ============================================
// 访问控制相关类型
// ============================================

/**
 * 用户模式
 */
export type UserMode = "visitor" | "admin";

/**
 * 访客配额信息
 */
export interface VisitorQuota {
	llmRemaining: number; // 剩余 LLM 调用次数（0 或 1）
	eventsUsed: number; // 已使用的事件配额（0-3）
	eventsRemaining: number; // 剩余事件配额（3 - eventsUsed）
}

/**
 * 访客会话信息
 */
export interface VisitorSession {
	fingerprint: string;
	llm_used_count: number;
	llm_token_used: number;
	created_at: string;
	last_active_at: string;
}

/**
 * 访客事件（简化版）
 */
export interface VisitorEvent {
	id: string;
	fingerprint: string;
	title: string;
	start_time: string; // ISO-8601 UTC 格式
	end_time: string; // ISO-8601 UTC 格式
	is_all_day: boolean;
	location?: string;
	description?: string;
	original_text?: string;
	created_at: string;
}

/**
 * LLM 调用结果（访客模式）
 */
export interface VisitorLLMResult {
	events: Array<{
		title: string;
		start_time: string;
		end_time: string;
		is_all_day: boolean;
		location?: string;
		description?: string;
	}>;
	tokensUsed?: number;
}

/**
 * 访客会话信息（含事件数量）
 * 用于监控页面显示
 */
export interface VisitorSessionWithCount extends VisitorSession {
	event_count: number; // 通过 JOIN 计算的事件数量
}

/**
 * 访客统计数据
 */
export interface VisitorStatistics {
	totalVisitors: number; // 总访客数
	totalLLMCalls: number; // 总 LLM 调用次数
	totalTokens: number; // 总 Token 消耗
	totalEvents: number; // 总事件数
	lastCleanupTime: string | null; // 最后清理时间
}
