import { ref } from "vue";
import type { ParsedEvent } from "@/types";
import { handleApiError, isNetworkError, retryWithBackoff } from "@/utils/errorHandler";
import { useAuth } from "@/composables/useAuth";
import { useVisitorEvents } from "@/composables/useVisitorEvents";

// Constants
const MAX_TEXT_LENGTH = 10000;
const API_RETRY_COUNT = 2;
const API_RETRY_DELAY_MS = 1000;
const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const END_OF_DAY_HOURS = 23;
const END_OF_DAY_MINUTES = 59;
const END_OF_DAY_SECONDS = 59;
const END_OF_DAY_MS = 999;
const LLM_TEMPERATURE = 0.3;
const DEFAULT_MODEL = "gpt-3.5-turbo";

// Error messages
const ERROR_MESSAGES = {
	EMPTY_INPUT: "输入文本不能为空",
	MISSING_CONFIG: "LLM API 配置缺失，请检查环境变量 VITE_LLM_API_KEY 和 VITE_LLM_API_ENDPOINT",
	AUTH_FAILED: "API 认证失败，请检查 API 密钥是否正确",
	RATE_LIMIT: "API 调用次数超限，请稍后再试",
	SERVICE_UNAVAILABLE: "LLM 服务暂时不可用，请稍后再试",
	NETWORK_ERROR: "网络连接失败，请检查网络后重试",
	NO_EVENTS_FOUND: "无法从文本中识别任何有效的日程信息，请检查输入或手动创建",
	INVALID_RESPONSE: "LLM 返回的响应格式无效",
	PARSE_ERROR: "无法解析 LLM 返回的 JSON 格式",
} as const;

export function useLLM() {
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	// 访问控制：获取用户身份和访客事件管理
	const { mode, fingerprint } = useAuth();
	const visitorEvents = useVisitorEvents();

	/**
	 * Parse announcement text using LLM API
	 * Extracts calendar event information from text
	 *
	 * Requirements: 1.2, 2.1-2.12
	 * - Extracts date/time, title, location, event type, participants, contact info, notes
	 * - Handles multiple events in one text
	 * - Handles missing fields gracefully (leaves them undefined)
	 * - Handles repeat patterns if present
	 *
	 * Requirements: 4.1, 4.2, 4.3 - 访客模式配额检查
	 *
	 * @param text - The announcement text to parse
	 * @param existingTags - Optional array of existing tag names to suggest from
	 */
	const parseText = async (text: string, existingTags?: string[]): Promise<ParsedEvent[]> => {
		validateInput(text);

		isLoading.value = true;
		error.value = null;

		try {
			// 访客模式：使用 useVisitorEvents 的 callLLM 方法（含配额检查）
			if (mode.value === "visitor") {
				if (!fingerprint.value) {
					throw new Error("访客指纹未初始化");
				}

				// 调用访客 LLM（含配额检查）
				const llmResult = await visitorEvents.callLLM(text, fingerprint.value);

				// 将访客事件格式转换为 ParsedEvent 格式
				const events: ParsedEvent[] = llmResult.events.map((ve) => ({
					title: ve.title,
					startTime: new Date(ve.start_time),
					endTime: new Date(ve.end_time),
					isAllDay: ve.is_all_day,
					location: ve.location,
					description: ve.description,
				}));

				if (events.length === 0) {
					throw new Error(ERROR_MESSAGES.NO_EVENTS_FOUND);
				}

				return events;
			}

			// 管理员模式：使用原有逻辑（无配额限制）
			const config = getApiConfig();
			const prompt = buildPrompt(text, existingTags);
			const response = await callLLMApi(config, prompt);
			const parsedResponse = parseResponse(response);
			const events = processEvents(parsedResponse);

			if (events.length === 0) {
				throw new Error(ERROR_MESSAGES.NO_EVENTS_FOUND);
			}

			return events;
		} catch (err) {
			handleParseError(err);
			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Validate input text
	 * Requirement 1.3, 1.4
	 */
	const validateInput = (text: string): void => {
		if (!text || text.trim().length === 0) {
			throw new Error(ERROR_MESSAGES.EMPTY_INPUT);
		}

		if (text.length > MAX_TEXT_LENGTH) {
			console.warn(`输入文本超过${MAX_TEXT_LENGTH}字符，可能影响解析性能`);
		}
	};

	/**
	 * Get and validate API configuration
	 * Requirement 10.3
	 */
	const getApiConfig = () => {
		const apiKey = import.meta.env.VITE_LLM_API_KEY;
		const apiEndpoint = import.meta.env.VITE_LLM_API_ENDPOINT;
		const model = import.meta.env.VITE_LLM_MODEL || DEFAULT_MODEL;

		if (!apiKey || !apiEndpoint) {
			const configError = new Error(ERROR_MESSAGES.MISSING_CONFIG);
			handleApiError(configError, "LLM API 配置");
			throw configError;
		}

		if (import.meta.env.DEV) {
			console.log("LLM Config:", { model, apiEndpoint });
		}

		return { apiKey, apiEndpoint, model };
	};

	/**
	 * Call LLM API with retry logic
	 */
	const callLLMApi = async (
		config: { apiKey: string; apiEndpoint: string; model: string },
		prompt: string
	): Promise<string> => {
		const { apiKey, apiEndpoint, model } = config;

		const callApi = async () => {
			const requestBody = {
				model,
				messages: [
					{
						role: "system",
						content: "You are a helpful assistant that extracts calendar event information from announcement text. Always respond with valid JSON.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: LLM_TEMPERATURE,
			};

			if (import.meta.env.DEV) {
				console.log("LLM Request:", JSON.stringify(requestBody, null, 2));
			}

			const response = await fetch(apiEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw await createHttpError(response);
			}

			return response;
		};

		const response = await retryWithBackoff(callApi, API_RETRY_COUNT, API_RETRY_DELAY_MS);
		const data = await response.json();

		if (import.meta.env.DEV) {
			console.log("LLM Response:", data);
		}

		const content = data.choices?.[0]?.message?.content;
		if (!content) {
			console.error("Invalid LLM response structure:", JSON.stringify(data, null, 2));
			throw new Error(
				`${
					ERROR_MESSAGES.INVALID_RESPONSE
				}。请检查 API 端点是否正确。收到的响应: ${JSON.stringify(data).substring(0, 200)}`
			);
		}

		return content;
	};

	/**
	 * Create appropriate error from HTTP response
	 */
	const createHttpError = async (response: Response): Promise<Error> => {
		let errorMessage = `LLM API 调用失败 (${response.status})`;

		try {
			const errorData = await response.json();
			console.error("LLM API Error Response:", errorData);
			errorMessage = errorData.error?.message || errorData.message || errorMessage;
		} catch {
			errorMessage = `${errorMessage}: ${response.statusText}`;
		}

		// Map status codes to user-friendly messages
		if (response.status === 401 || response.status === 403) {
			return new Error(ERROR_MESSAGES.AUTH_FAILED);
		} else if (response.status === 429) {
			return new Error(ERROR_MESSAGES.RATE_LIMIT);
		} else if (response.status >= 500) {
			return new Error(ERROR_MESSAGES.SERVICE_UNAVAILABLE);
		}

		return new Error(errorMessage);
	};

	/**
	 * Handle parsing errors consistently
	 */
	const handleParseError = (err: unknown): void => {
		const errorMessage = err instanceof Error ? err.message : "未知错误";
		error.value = errorMessage;

		if (isNetworkError(err)) {
			handleApiError(new Error(ERROR_MESSAGES.NETWORK_ERROR), "LLM API");
		} else if (err instanceof Error && !err.message.includes(ERROR_MESSAGES.NO_EVENTS_FOUND)) {
			// Don't show notification for "no events found" error (already shown in UI)
			handleApiError(err, "LLM API");
		}
	};

	/**
	 * Build the prompt for LLM to extract event information
	 * Requirement 18.7: LLM should identify and suggest tags
	 */
	const buildPrompt = (text: string, existingTags?: string[]): string => {
		const today = new Date();
		const currentDate = today.toISOString().split("T")[0]; // YYYY-MM-DD format

		// Build existing tags section
		const existingTagsSection =
			existingTags && existingTags.length > 0
				? `\n\n现有标签列表：${existingTags.join(
						", "
				  )}\n请优先从现有标签中选择合适的标签。如果现有标签都不合适，可以建议新标签，但请尽量精简。`
				: "";

		return `请从以下通告文本中提取日程事件信息。

重要：今天的日期是 ${currentDate}，请根据这个日期来推断事件的年份。

核心原则：
- 优先识别为单个事件，除非文本中有明确的多个独立事件
- 同一活动的不同阶段（如报名、提交、答辩）应合并为一个事件，其他阶段信息放在描述中
- 提取用户最关心的核心事件（通常是最重要的截止日期或主要活动时间）

要求：
1. 提取以下字段（如果存在）：
   - title: 事件标题（提取主要活动名称）
   - startTime: 开始时间（ISO 8601格式，例如：2024-11-22T13:00:00）
   - endTime: 结束时间（ISO 8601格式）
   - isAllDay: 是否全天事件（布尔值）
   - location: 地点
   - description: 描述或备注（包含其他相关时间节点和详细信息）
   - eventType: 事件类型（如：会议、考试、活动、截止日期等）
   - participants: 参与人员
   - contact: 联系方式
   - suggestedTags: 建议的标签数组（字符串数组，如：["会议", "重要", "学术"]）${existingTagsSection}

2. 时间识别规则：
   - 对于"今日起至X日期"这样的表述，startTime 应该是今天 ${currentDate}，endTime 是 X 日期
   - 对于"X日期至Y日期"，startTime 是 X 日期，endTime 是 Y 日期
   - 对于相对日期（如"明天"、"下周三"），请基于今天的日期 ${currentDate} 转换为绝对日期
   - 如果只有日期没有具体时间，设置 isAllDay 为 true
   - 年份推断：如果文本中没有明确年份，使用今天的年份 ${today.getFullYear()}

3. 如果某个字段无法识别或不存在，请不要包含该字段（不要生成虚假信息）
4. 标签建议：根据事件类型、主题、重要性等因素，建议1-3个合适的标签

请以 JSON 数组格式返回，通常应该只返回一个事件对象。

通告文本：
${text}

请只返回 JSON 数组，不要包含其他说明文字。`;
	};

	/**
	 * Parse the LLM response content
	 * Extracts JSON from markdown code blocks if present
	 */
	const parseResponse = (content: string): any[] => {
		try {
			// Try to extract JSON from the response
			// Sometimes LLM might wrap JSON in markdown code blocks
			const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
			const jsonString = jsonMatch ? jsonMatch[1] : content;

			// Clean up the string
			const cleanedString = (jsonString || content).trim();

			// Try to parse
			const parsed = JSON.parse(cleanedString);

			// Ensure it's an array
			return Array.isArray(parsed) ? parsed : [parsed];
		} catch (err) {
			console.error("Failed to parse LLM response:", content);
			console.error("Parse error:", err);
			throw new Error(`${ERROR_MESSAGES.PARSE_ERROR}。响应内容: ${content.substring(0, 200)}...`);
		}
	};

	/**
	 * Process and validate parsed events
	 * Requirements: 2.10, 2.11 - Handle missing fields gracefully
	 */
	const processEvents = (rawEvents: any[]): ParsedEvent[] => {
		const events: ParsedEvent[] = [];

		for (const rawEvent of rawEvents) {
			try {
				const event: ParsedEvent = {};

				// Extract and validate fields
				if (rawEvent.title && typeof rawEvent.title === "string") {
					event.title = rawEvent.title.trim();
				}

				// Parse dates
				if (rawEvent.startTime) {
					const startDate = new Date(rawEvent.startTime);
					if (import.meta.env.DEV) {
						console.log("Parsing startTime:", rawEvent.startTime, "->", startDate);
					}
					if (!isNaN(startDate.getTime())) {
						event.startTime = startDate;
					}
				}

				if (rawEvent.endTime) {
					const endDate = new Date(rawEvent.endTime);
					if (import.meta.env.DEV) {
						console.log("Parsing endTime:", rawEvent.endTime, "->", endDate);
					}
					if (!isNaN(endDate.getTime())) {
						event.endTime = endDate;
					}
				}

				// All-day event flag
				if (typeof rawEvent.isAllDay === "boolean") {
					event.isAllDay = rawEvent.isAllDay;
				} else {
					event.isAllDay = false;
				}

				// Handle end time
				if (event.startTime && !event.endTime) {
					// If no end time, set end time to start time + 1 hour
					event.endTime = new Date(event.startTime.getTime() + DEFAULT_EVENT_DURATION_MS);
				} else if (event.startTime && event.endTime) {
					// If end time equals start time (common for all-day events)
					if (event.endTime.getTime() === event.startTime.getTime()) {
						if (event.isAllDay) {
							// For all-day events, set end time to end of day
							const endOfDay = new Date(event.startTime);
							endOfDay.setHours(
								END_OF_DAY_HOURS,
								END_OF_DAY_MINUTES,
								END_OF_DAY_SECONDS,
								END_OF_DAY_MS
							);
							event.endTime = endOfDay;
						} else {
							// For regular events, add 1 hour
							event.endTime = new Date(
								event.startTime.getTime() + DEFAULT_EVENT_DURATION_MS
							);
						}
					}
				}

				// Optional fields
				if (rawEvent.location && typeof rawEvent.location === "string") {
					event.location = rawEvent.location.trim();
				}

				// Build description from various fields
				const descriptionParts: string[] = [];

				if (rawEvent.description) {
					descriptionParts.push(rawEvent.description);
				}

				if (rawEvent.eventType) {
					descriptionParts.push(`类型: ${rawEvent.eventType}`);
				}

				if (rawEvent.participants) {
					descriptionParts.push(`参与人员: ${rawEvent.participants}`);
				}

				if (rawEvent.contact) {
					descriptionParts.push(`联系方式: ${rawEvent.contact}`);
				}

				if (descriptionParts.length > 0) {
					event.description = descriptionParts.join("\n");
				}

				// Extract suggested tags (Requirement 18.7)
				if (rawEvent.suggestedTags && Array.isArray(rawEvent.suggestedTags)) {
					// Store suggested tag names in the tags field
					// These will be matched or created when the event is saved
					event.tags = rawEvent.suggestedTags
						.filter((tag: any) => typeof tag === "string" && tag.trim().length > 0)
						.map((tag: string) => tag.trim());
				}

				// Only add event if it has at least a title or start time
				if (event.title || event.startTime) {
					if (import.meta.env.DEV) {
						console.log("Processed event:", event);
						console.log(
							"startTime type:",
							typeof event.startTime,
							event.startTime instanceof Date
						);
					}
					events.push(event);
				}
			} catch (err) {
				if (import.meta.env.DEV) {
					console.warn("跳过无效事件:", rawEvent, err);
				}
				// Continue processing other events
			}
		}

		return events;
	};

	return {
		parseText,
		isLoading,
		error,
	};
}
