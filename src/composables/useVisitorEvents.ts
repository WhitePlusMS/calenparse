import { ref } from "vue";
import type { Ref } from "vue";
import { useSupabase } from "@/composables/useSupabase";
import type { VisitorEvent, VisitorLLMResult } from "@/types";
import { handleError, ErrorType, createAppError } from "@/utils/errorHandler";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// 启用 UTC 插件
dayjs.extend(utc);

/**
 * useVisitorEvents 返回接口
 */
export interface UseVisitorEventsReturn {
	// 状态
	events: Ref<VisitorEvent[]>;
	loading: Ref<boolean>;

	// 方法
	loadEvents: (fingerprint: string) => Promise<void>;
	createEvent: (event: Omit<VisitorEvent, "id" | "created_at">) => Promise<void>;
	checkEventQuota: (fingerprint: string) => Promise<boolean>;
	createEventsFromLLM: (
		llmEvents: VisitorLLMResult["events"],
		fingerprint: string,
		originalText?: string
	) => Promise<{ created: number; total: number }>;

	// LLM 相关
	callLLM: (input: string, fingerprint: string, existingTags?: string[]) => Promise<VisitorLLMResult>;
	checkLLMQuota: (fingerprint: string) => Promise<boolean>;
	recordLLMUsage: (fingerprint: string, tokenUsed: number) => Promise<void>;
}

/**
 * 访客事件管理 Composable
 *
 * 实现需求:
 * - 1.4: 从 visitor_events 表加载该指纹关联的事件
 * - 3.1: 通过 COUNT 查询检查事件配额
 * - 3.2: 配额内保存到 visitor_events 表
 * - 3.3: 配额满显示提示
 * - 3.4: 前端通过 fingerprint 过滤
 * - 3.5: 禁止编辑和删除
 * - 4.1-4.9: LLM 调用和配额管理
 */
export function useVisitorEvents(): UseVisitorEventsReturn {
	const { supabase } = useSupabase();

	// ============================================
	// 状态管理
	// ============================================

	/**
	 * 访客事件列表
	 */
	const events = ref<VisitorEvent[]>([]);

	/**
	 * 加载状态
	 */
	const loading = ref(false);

	// ============================================
	// 事件管理方法
	// ============================================

	/**
	 * 加载访客事件
	 *
	 * 实现需求:
	 * - 1.4: 从 visitor_events 表加载该指纹关联的事件
	 * - 3.4: 前端通过 fingerprint 过滤
	 *
	 * @param {string} fingerprint - 浏览器指纹
	 * @throws {Error} 加载失败
	 */
	const loadEvents = async (fingerprint: string): Promise<void> => {
		if (!fingerprint) {
			throw new Error("指纹参数不能为空");
		}

		try {
			loading.value = true;

			const { data, error } = await supabase
				.from("visitor_events")
				.select("*")
				.eq("fingerprint", fingerprint)
				.order("start_time", { ascending: true });

			if (error) {
				throw new Error(`加载访客事件失败: ${error.message}`);
			}

			events.value = (data || []) as VisitorEvent[];
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "加载访客事件失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "访客事件加载");
			throw new Error(error.message);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 检查事件配额
	 *
	 * 实现需求:
	 * - 3.1: 通过 COUNT 查询检查事件数量 < 3
	 *
	 * @param {string} fingerprint - 浏览器指纹
	 * @returns {Promise<boolean>} 是否有剩余配额
	 * @throws {Error} 查询失败
	 */
	const checkEventQuota = async (fingerprint: string): Promise<boolean> => {
		if (!fingerprint) {
			throw new Error("指纹参数不能为空");
		}

		try {
			const { count, error } = await supabase
				.from("visitor_events")
				.select("*", { count: "exact", head: true })
				.eq("fingerprint", fingerprint);

			if (error) {
				throw new Error(`查询事件配额失败: ${error.message}`);
			}

			const eventsUsed = count || 0;
			return eventsUsed < 3;
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "查询事件配额失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "配额查询");
			throw new Error(error.message);
		}
	};

	/**
	 * 创建访客事件（含配额检查）
	 *
	 * 实现需求:
	 * - 3.2: 配额内保存到 visitor_events 表
	 * - 3.3: 配额满显示提示
	 * - 时区处理：确保 start_time 和 end_time 使用 ISO-8601 UTC 格式
	 *
	 * @param {Omit<VisitorEvent, "id" | "created_at">} event - 事件数据
	 * @throws {Error} 创建失败或配额已满
	 */
	const createEvent = async (event: Omit<VisitorEvent, "id" | "created_at">): Promise<void> => {
		if (!event.fingerprint) {
			throw new Error("指纹参数不能为空");
		}

		try {
			loading.value = true;

			// 检查配额
			const hasQuota = await checkEventQuota(event.fingerprint);

			if (!hasQuota) {
				ElMessage.warning("已达到试用上限（3 条），请登录获取无限存储");
				throw new Error("事件配额已满");
			}

			// 确保时间格式为 ISO-8601 UTC
			const eventData = {
				...event,
				start_time: dayjs(event.start_time).utc().toISOString(),
				end_time: dayjs(event.end_time).utc().toISOString(),
			};

			const { data, error } = await supabase
				.from("visitor_events")
				.insert(eventData)
				.select()
				.single();

			if (error) {
				// 检查是否是 RLS 策略阻止（配额检查）
				if (error.message.includes("violates row-level security policy")) {
					ElMessage.warning("已达到试用上限（3 条），请登录获取无限存储");
					throw new Error("事件配额已满");
				}
				throw new Error(`创建访客事件失败: ${error.message}`);
			}

			// 添加到本地列表
			events.value.push(data as VisitorEvent);

			ElMessage.success("事件创建成功");
		} catch (err) {
			if (err instanceof Error && err.message === "事件配额已满") {
				throw err; // 配额错误已经显示提示，直接抛出
			}

			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "创建访客事件失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "访客事件创建");
			throw new Error(error.message);
		} finally {
			loading.value = false;
		}
	};

	// ============================================
	// LLM 相关方法
	// ============================================

	/**
	 * 检查 LLM 配额
	 *
	 * 实现需求:
	 * - 4.1: 检查 visitor_sessions.llm_used_count 是否为 0
	 *
	 * @param {string} fingerprint - 浏览器指纹
	 * @returns {Promise<boolean>} 是否有剩余配额
	 * @throws {Error} 查询失败
	 */
	const checkLLMQuota = async (fingerprint: string): Promise<boolean> => {
		if (!fingerprint) {
			throw new Error("指纹参数不能为空");
		}

		try {
			const { data, error } = await supabase
				.from("visitor_sessions")
				.select("llm_used_count")
				.eq("fingerprint", fingerprint)
				.single();

			if (error) {
				throw new Error(`查询 LLM 配额失败: ${error.message}`);
			}

			const llmUsedCount = data?.llm_used_count || 0;
			return llmUsedCount === 0;
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "查询 LLM 配额失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "LLM 配额查询");
			throw new Error(error.message);
		}
	};

	/**
	 * 记录 LLM 使用情况
	 *
	 * 实现需求:
	 * - 4.4: 成功后设置 llm_used_count = 1
	 * - 4.6: 记录 Token 消耗
	 * - 4.7: 失败时不消耗配额
	 *
	 * @param {string} fingerprint - 浏览器指纹
	 * @param {number} tokenUsed - Token 消耗数量
	 * @throws {Error} 更新失败
	 */
	const recordLLMUsage = async (fingerprint: string, tokenUsed: number): Promise<void> => {
		if (!fingerprint) {
			throw new Error("指纹参数不能为空");
		}

		try {
			const { error } = await supabase
				.from("visitor_sessions")
				.update({
					llm_used_count: 1,
					llm_token_used: tokenUsed,
					last_active_at: new Date().toISOString(),
				})
				.eq("fingerprint", fingerprint);

			if (error) {
				throw new Error(`记录 LLM 使用失败: ${error.message}`);
			}
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "记录 LLM 使用失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "LLM 使用记录");
			throw new Error(error.message);
		}
	};

	/**
	 * 调用 LLM API（含配额检查和批量事件创建）
	 *
	 * 实现需求:
	 * - 4.2: 配额内调用真实 LLM API
	 * - 4.3: 配额满显示提示
	 * - 4.5: 失败时不消耗配额
	 * - 4.8: 处理多事件解析
	 * - 4.9: 超配额时显示提示
	 *
	 * @param {string} input - 用户输入文本
	 * @param {string} fingerprint - 浏览器指纹
	 * @returns {Promise<VisitorLLMResult>} LLM 解析结果
	 * @throws {Error} LLM 调用失败或配额已满
	 */
	const callLLM = async (input: string, fingerprint: string, existingTags?: string[]): Promise<VisitorLLMResult> => {
		if (!input || !input.trim()) {
			throw new Error("输入文本不能为空");
		}

		if (!fingerprint) {
			throw new Error("指纹参数不能为空");
		}

		try {
			loading.value = true;

			// 检查 LLM 配额
			const hasLLMQuota = await checkLLMQuota(fingerprint);

			if (!hasLLMQuota) {
				ElMessage.warning("试用次数已用完（1/1），请登录获取无限调用");
				throw new Error("LLM 配额已满");
			}

			// 获取 API 配置
			const apiKey = import.meta.env.VITE_LLM_API_KEY;
			const apiEndpoint = import.meta.env.VITE_LLM_API_ENDPOINT;
			const model = import.meta.env.VITE_LLM_MODEL || "gpt-3.5-turbo";

			if (!apiKey || !apiEndpoint) {
				throw new Error("LLM API 配置缺失，请检查环境变量");
			}

			// 构建 prompt
			const today = new Date();
			const currentDate = today.toISOString().split("T")[0];

			// 构建标签选择规则部分
			const existingTagsSection =
				existingTags && existingTags.length > 0
					? `\n\n重要：标签选择规则
现有标签列表：${existingTags.join(", ")}
- suggestedTags 字段必须且只能从上述现有标签列表中选择
- 严禁生成任何不在现有标签列表中的新标签
- 如果现有标签中没有合适的标签，则 suggestedTags 字段应该为空数组 [] 或不包含该字段
- 请根据事件内容，从现有标签中选择最相关的1-3个标签`
					: `\n\n注意：当前没有可用的标签，suggestedTags 字段应该为空数组 [] 或不包含该字段`;

			const prompt = `请从以下文本中提取日程事件信息。

重要：今天的日期是 ${currentDate}，请根据这个日期来推断事件的年份。

要求：
1. 提取以下字段（如果存在）：
   - title: 事件标题
   - startTime: 开始时间（ISO 8601格式，例如：2024-11-22T13:00:00）
   - endTime: 结束时间（ISO 8601格式）
   - isAllDay: 是否全天事件（布尔值）
   - location: 地点
   - description: 描述或备注
   - suggestedTags: 建议的标签数组（字符串数组）${existingTagsSection}

2. 时间识别规则：
   - 对于相对日期（如"明天"、"下周三"），请基于今天的日期 ${currentDate} 转换为绝对日期
   - 如果只有日期没有具体时间，设置 isAllDay 为 true
   - 年份推断：如果文本中没有明确年份，使用今天的年份 ${today.getFullYear()}

3. 如果某个字段无法识别或不存在，请不要包含该字段

请以 JSON 数组格式返回，只返回 JSON，不要包含其他说明文字。

文本：
${input}`;

			// 调用 LLM API
			const response = await fetch(apiEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					messages: [
						{
							role: "system",
							content: "You are a helpful assistant that extracts calendar event information from text. Always respond with valid JSON.",
						},
						{
							role: "user",
							content: prompt,
						},
					],
					temperature: 0.3,
				}),
			});

			if (!response.ok) {
				// 根据状态码提供友好提示
				if (response.status === 401 || response.status === 403) {
					throw new Error("API 认证失败，请检查 API 密钥");
				} else if (response.status === 429) {
					throw new Error("API 调用次数超限，请稍后再试");
				} else if (response.status >= 500) {
					throw new Error("LLM 服务暂时不可用，请稍后再试");
				}
				throw new Error(`LLM API 调用失败 (${response.status})`);
			}

			const data = await response.json();

			// 提取 Token 使用信息
			const tokensUsed = data.usage?.total_tokens || 0;

			// 解析响应内容
			const content = data.choices?.[0]?.message?.content;
			if (!content) {
				throw new Error("LLM 返回的响应格式无效");
			}

			// 提取 JSON（可能包含在 markdown 代码块中）
			const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
			const jsonString = jsonMatch ? jsonMatch[1] : content;

			let parsedEvents: any[];
			try {
				const parsed = JSON.parse(jsonString.trim());
				parsedEvents = Array.isArray(parsed) ? parsed : [parsed];
			} catch {
				throw new Error("无法解析 LLM 返回的 JSON 格式");
			}

			// 处理解析的事件，包括标签过滤
			const processedEvents: VisitorLLMResult["events"] = [];

			// Normalize existing tags for case-insensitive matching
			const normalizedExistingTags = existingTags
				? new Set(existingTags.map((tag) => tag.toLowerCase().trim()))
				: null;

			for (const rawEvent of parsedEvents) {
				try {
					// 验证必需字段
					if (!rawEvent.title || !rawEvent.startTime) {
						continue; // 跳过无效事件
					}

					// 解析时间
					const startTime = new Date(rawEvent.startTime);
					let endTime = rawEvent.endTime ? new Date(rawEvent.endTime) : null;

					if (isNaN(startTime.getTime())) {
						continue; // 跳过无效时间
					}

					// 如果没有结束时间，默认为开始时间 + 1 小时
					if (!endTime || isNaN(endTime.getTime())) {
						endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
					}

					// Extract and filter suggested tags
					// Only keep tags that exist in the existing tags list
					let filteredTags: string[] | undefined = undefined;
					if (rawEvent.suggestedTags && Array.isArray(rawEvent.suggestedTags)) {
						const validTags: string[] = [];

						for (const tag of rawEvent.suggestedTags) {
							if (typeof tag === "string" && tag.trim().length > 0) {
								const trimmedTag = tag.trim();

								// If existingTags is provided, only keep tags that exist in the list
								if (normalizedExistingTags) {
									// Case-insensitive matching
									if (normalizedExistingTags.has(trimmedTag.toLowerCase())) {
										// Find the original tag name (preserve case)
										const originalTag = existingTags!.find(
											(t) => t.toLowerCase() === trimmedTag.toLowerCase()
										);
										if (originalTag) {
											validTags.push(originalTag);
										}
									} else if (import.meta.env.DEV) {
										console.warn(
											`访客模式：标签 "${trimmedTag}" 不在现有标签列表中，已过滤`
										);
									}
								} else {
									// If no existingTags provided, keep all tags (backward compatibility)
									validTags.push(trimmedTag);
								}
							}
						}

						if (validTags.length > 0) {
							filteredTags = validTags;
						}
					}

					// 转换为 UTC ISO-8601 格式
					const event = {
						title: rawEvent.title.trim(),
						start_time: dayjs(startTime).utc().toISOString(),
						end_time: dayjs(endTime).utc().toISOString(),
						is_all_day: rawEvent.isAllDay || false,
						location: rawEvent.location?.trim(),
						description: rawEvent.description?.trim(),
						tags: filteredTags, // 包含已过滤的标签
					};

					processedEvents.push(event);
				} catch (err) {
					console.warn("跳过无效事件:", rawEvent, err);
				}
			}

			if (processedEvents.length === 0) {
				throw new Error("无法从文本中识别任何有效的日程信息");
			}

			// 记录 LLM 使用（仅在成功时）
			await recordLLMUsage(fingerprint, tokensUsed);

			return {
				events: processedEvents,
				tokensUsed,
			};
		} catch (err) {
			if (err instanceof Error && err.message === "LLM 配额已满") {
				throw err; // 配额错误已经显示提示，直接抛出
			}

			const error = createAppError(
				ErrorType.NETWORK,
				err instanceof Error ? err.message : "LLM 调用失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "LLM 调用");
			throw new Error(error.message);
		} finally {
			loading.value = false;
		}
	};

	/**
	 * 从 LLM 解析结果批量创建事件（含配额限制）
	 *
	 * 实现需求:
	 * - 4.8: 创建前 N 个事件（N = min(解析数量, 剩余配额)）
	 * - 4.9: 超配额时显示提示
	 *
	 * @param {VisitorLLMResult["events"]} llmEvents - LLM 解析的事件列表
	 * @param {string} fingerprint - 浏览器指纹
	 * @param {string} originalText - 原始输入文本（可选）
	 * @returns {Promise<{created: number, total: number}>} 创建结果统计
	 */
	const createEventsFromLLM = async (
		llmEvents: VisitorLLMResult["events"],
		fingerprint: string,
		originalText?: string
	): Promise<{ created: number; total: number }> => {
		if (!fingerprint) {
			throw new Error("指纹参数不能为空");
		}

		if (!llmEvents || llmEvents.length === 0) {
			throw new Error("没有可创建的事件");
		}

		try {
			loading.value = true;

			// 查询当前事件配额
			const { count, error: countError } = await supabase
				.from("visitor_events")
				.select("*", { count: "exact", head: true })
				.eq("fingerprint", fingerprint);

			if (countError) {
				throw new Error(`查询事件配额失败: ${countError.message}`);
			}

			const eventsUsed = count || 0;
			const remaining = Math.max(0, 3 - eventsUsed);

			// 计算可创建的事件数量
			const eventsToCreate = Math.min(llmEvents.length, remaining);

			if (eventsToCreate === 0) {
				ElMessage.warning("已达到试用上限（3 条），请登录获取无限存储");
				return { created: 0, total: llmEvents.length };
			}

			// 批量创建事件
			let createdCount = 0;

			for (let i = 0; i < eventsToCreate; i++) {
				const llmEvent = llmEvents[i];

				// TypeScript 类型守卫
				if (!llmEvent) {
					continue;
				}

				try {
					const eventData = {
						fingerprint,
						title: llmEvent.title,
						start_time: llmEvent.start_time,
						end_time: llmEvent.end_time,
						is_all_day: llmEvent.is_all_day,
						location: llmEvent.location,
						description: llmEvent.description,
						original_text: originalText,
					};

					const { data, error } = await supabase
						.from("visitor_events")
						.insert(eventData)
						.select()
						.single();

					if (error) {
						// 如果是 RLS 策略阻止（配额检查），停止创建
						if (error.message.includes("violates row-level security policy")) {
							break;
						}
						console.warn(`创建事件失败: ${error.message}`, llmEvent);
						continue;
					}

					// 添加到本地列表
					events.value.push(data as VisitorEvent);
					createdCount++;
				} catch (err) {
					console.warn("创建事件时出错:", err, llmEvent);
				}
			}

			// 显示结果提示
			if (createdCount === llmEvents.length) {
				ElMessage.success(`成功创建 ${createdCount} 个事件`);
			} else if (createdCount > 0) {
				ElMessage.warning(
					`已创建 ${createdCount}/${llmEvents.length} 个事件，剩余配额不足，请登录获取无限存储`
				);
			} else {
				ElMessage.warning("已达到试用上限（3 条），请登录获取无限存储");
			}

			return { created: createdCount, total: llmEvents.length };
		} catch (err) {
			const error = createAppError(
				ErrorType.DATABASE,
				err instanceof Error ? err.message : "批量创建事件失败",
				err instanceof Error ? err : new Error(String(err))
			);
			handleError(error, "批量事件创建");
			throw new Error(error.message);
		} finally {
			loading.value = false;
		}
	};

	return {
		events,
		loading,
		loadEvents,
		createEvent,
		checkEventQuota,
		createEventsFromLLM,
		callLLM,
		checkLLMQuota,
		recordLLMUsage,
	};
}
