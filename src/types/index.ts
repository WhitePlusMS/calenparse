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
