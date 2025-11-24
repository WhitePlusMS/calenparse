import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/types";
import type { Tag } from "@/types";
import { handleError, ErrorType, createAppError } from "@/utils/errorHandler";

// Supabase client instance
let supabaseClient: SupabaseClient | null = null;

// Database row type (snake_case as stored in Supabase)
interface EventRow {
	id: string;
	title: string;
	start_time: string;
	end_time: string;
	is_all_day: boolean;
	location: string | null;
	description: string | null;
	original_text: string | null;
	tag_ids: string[] | null;
	is_completed: boolean;
	is_template: boolean;
	template_name: string | null;
	created_at: string;
	updated_at: string;
}

interface TagRow {
	id: string;
	name: string;
	color: string;
	created_at: string;
}

/**
 * Convert database row (snake_case) to CalendarEvent (camelCase)
 */
function rowToEvent(row: EventRow): CalendarEvent {
	return {
		id: row.id,
		title: row.title,
		startTime: new Date(row.start_time),
		endTime: new Date(row.end_time),
		isAllDay: row.is_all_day,
		location: row.location || undefined,
		description: row.description || undefined,
		originalText: row.original_text || undefined,
		tagIds: row.tag_ids || undefined,
		isCompleted: row.is_completed || false,
		isTemplate: row.is_template || false,
		templateName: row.template_name || undefined,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}

/**
 * Convert database tag row to Tag object
 */
function rowToTag(row: TagRow): Tag {
	return {
		id: row.id,
		name: row.name,
		color: row.color,
		createdAt: new Date(row.created_at),
	};
}

/**
 * Convert CalendarEvent (camelCase) to database row format (snake_case)
 */
function eventToRow(event: Partial<CalendarEvent>): Partial<EventRow> {
	const row: Partial<EventRow> = {};

	if (event.title !== undefined) row.title = event.title;
	if (event.startTime !== undefined) row.start_time = event.startTime.toISOString();
	if (event.endTime !== undefined) row.end_time = event.endTime.toISOString();
	if (event.isAllDay !== undefined) row.is_all_day = event.isAllDay;
	if (event.location !== undefined) row.location = event.location || null;
	if (event.description !== undefined) row.description = event.description || null;
	if (event.originalText !== undefined) row.original_text = event.originalText || null;
	if (event.tagIds !== undefined) row.tag_ids = event.tagIds || null;
	if (event.isCompleted !== undefined) row.is_completed = event.isCompleted;
	if (event.isTemplate !== undefined) row.is_template = event.isTemplate;
	if (event.templateName !== undefined) row.template_name = event.templateName || null;

	return row;
}

/**
 * Initialize Supabase client
 */
function getClient(): SupabaseClient {
	if (!supabaseClient) {
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
		const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseAnonKey) {
			const error = createAppError(
				ErrorType.DATABASE,
				"Supabase 配置缺失，请检查环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY",
				new Error("Missing Supabase configuration")
			);
			handleError(error, "Supabase 初始化");
			throw new Error(error.message);
		}

		try {
			supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				"Supabase 客户端初始化失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "Supabase 初始化");
			throw new Error(error.message);
		}
	}

	return supabaseClient;
}

/**
 * Supabase composable with CRUD operations for calendar events
 * Implements requirements 6.1, 6.2, 6.3, 7.1, 7.2
 */
export function useSupabase() {
	const supabase = getClient();

	/**
	 * Fetch all events from the database
	 * Requirement 7.2: Load all saved events when user reopens the app
	 */
	const getAllEvents = async (): Promise<CalendarEvent[]> => {
		try {
			const { data, error } = await supabase
				.from("events")
				.select("*")
				.order("start_time", { ascending: true });

			if (error) {
				throw new Error(`获取事件列表失败: ${error.message}`);
			}

			return (data as EventRow[]).map(rowToEvent);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "获取事件列表失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Fetch only template events from the database
	 * Optimized query to avoid loading and filtering all events in memory
	 */
	const getAllTemplates = async (): Promise<CalendarEvent[]> => {
		try {
			const { data, error } = await supabase
				.from("events")
				.select("*")
				.eq("is_template", true)
				.order("template_name", { ascending: true });

			if (error) {
				throw new Error(`获取模板列表失败: ${error.message}`);
			}

			return (data as EventRow[]).map(rowToEvent);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "获取模板列表失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Fetch only regular (non-template) events from the database
	 * Optimized query for calendar views that don't need templates
	 */
	const getRegularEvents = async (): Promise<CalendarEvent[]> => {
		try {
			const { data, error } = await supabase
				.from("events")
				.select("*")
				.eq("is_template", false)
				.order("start_time", { ascending: true });

			if (error) {
				throw new Error(`获取事件列表失败: ${error.message}`);
			}

			return (data as EventRow[]).map(rowToEvent);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "获取事件列表失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Create a new event in the database
	 * Requirement 7.1: Persist event data immediately when created
	 */
	const createEvent = async (
		event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
	): Promise<CalendarEvent> => {
		try {
			const row = eventToRow(event);

			const { data, error } = await supabase.from("events").insert(row).select().single();

			if (error) {
				throw new Error(`创建事件失败: ${error.message}`);
			}

			return rowToEvent(data as EventRow);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "创建事件失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Update an existing event in the database
	 * Requirement 6.2: Update event information and reflect changes in calendar view
	 */
	const updateEvent = async (id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> => {
		try {
			const row = eventToRow(updates);

			const { data, error } = await supabase
				.from("events")
				.update(row)
				.eq("id", id)
				.select()
				.single();

			if (error) {
				throw new Error(`更新事件失败: ${error.message}`);
			}

			if (!data) {
				throw new Error("事件不存在或已被删除");
			}

			return rowToEvent(data as EventRow);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "更新事件失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Delete an event from the database
	 * Requirement 6.3: Remove event from calendar
	 */
	const deleteEvent = async (id: string): Promise<void> => {
		try {
			const { error } = await supabase.from("events").delete().eq("id", id);

			if (error) {
				throw new Error(`删除事件失败: ${error.message}`);
			}
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "删除事件失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Fetch all tags from the database
	 */
	const getAllTags = async () => {
		try {
			const { data, error } = await supabase
				.from("tags")
				.select("*")
				.order("name", { ascending: true });

			if (error) {
				throw new Error(`获取标签列表失败: ${error.message}`);
			}

			return (data as TagRow[]).map(rowToTag);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "获取标签列表失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Create a new tag in the database
	 */
	const createTag = async (name: string, color: string) => {
		try {
			const { data, error } = await supabase.from("tags").insert({ name, color }).select().single();

			if (error) {
				throw new Error(`创建标签失败: ${error.message}`);
			}

			return rowToTag(data as TagRow);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "创建标签失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Update an existing tag in the database
	 */
	const updateTag = async (id: string, name: string, color: string) => {
		try {
			const { data, error } = await supabase
				.from("tags")
				.update({ name, color })
				.eq("id", id)
				.select()
				.single();

			if (error) {
				throw new Error(`更新标签失败: ${error.message}`);
			}

			if (!data) {
				throw new Error("标签不存在或已被删除");
			}

			return rowToTag(data as TagRow);
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "更新标签失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	/**
	 * Delete a tag from the database and remove it from all events
	 */
	const deleteTag = async (id: string): Promise<void> => {
		try {
			// First, get all events that have this tag
			const { data: eventsWithTag, error: fetchError } = await supabase
				.from("events")
				.select("id, tag_ids")
				.contains("tag_ids", [id]);

			if (fetchError) {
				throw new Error(`查询关联事件失败: ${fetchError.message}`);
			}

			// Remove the tag from all events using batch update
			if (eventsWithTag && eventsWithTag.length > 0) {
				const updates = eventsWithTag.map((event) => ({
					id: event.id,
					tag_ids:
						((event.tag_ids as string[]) || []).filter(
							(tagId: string) => tagId !== id
						) || null,
				}));

				const { error: updateError } = await supabase.from("events").upsert(updates);

				if (updateError) {
					throw new Error(`更新关联事件失败: ${updateError.message}`);
				}
			}

			// Then delete the tag
			const { error } = await supabase.from("tags").delete().eq("id", id);

			if (error) {
				throw new Error(`删除标签失败: ${error.message}`);
			}
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "删除标签失败",
				err instanceof Error ? err : undefined
			);
			throw new Error(error.message);
		}
	};

	return {
		supabase,
		getAllEvents,
		getAllTemplates,
		getRegularEvents,
		createEvent,
		updateEvent,
		deleteEvent,
		getAllTags,
		createTag,
		updateTag,
		deleteTag,
	};
}
