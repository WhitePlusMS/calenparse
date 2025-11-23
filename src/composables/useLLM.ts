import { ref } from "vue";
import type { ParsedEvent } from "@/types";
import { handleApiError, isNetworkError, retryWithBackoff } from "@/utils/errorHandler";

// Cache for parsed results to avoid redundant API calls (currently unused, reserved for future optimization)
// const parseCache = new Map<string, { result: ParsedEvent[]; timestamp: number }>();
// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useLLM() {
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	/**
	 * Parse announcement text using LLM API
	 * Extracts calendar event information from text
	 *
	 * Requirements: 1.2, 2.1-2.12
	 * - Extracts date/time, title, location, event type, participants, contact info, notes
	 * - Handles multiple events in one text
	 * - Handles missing fields gracefully (leaves them undefined)
	 * - Handles repeat patterns if present
	 */
	const parseText = async (text: string): Promise<ParsedEvent[]> => {
		// Validate input (Requirement 1.3)
		if (!text || text.trim().length === 0) {
			throw new Error("输入文本不能为空");
		}

		// Warn for very long text (Requirement 1.4)
		if (text.length > 10000) {
			console.warn("输入文本超过10000字符，可能影响解析性能");
		}

		isLoading.value = true;
		error.value = null;

		try {
			const apiKey = import.meta.env.VITE_LLM_API_KEY;
			const apiEndpoint = import.meta.env.VITE_LLM_API_ENDPOINT;
			const model = import.meta.env.VITE_LLM_MODEL || "gpt-3.5-turbo";

			// Requirement 10.3: Validate API configuration
			if (!apiKey || !apiEndpoint) {
				const configError = new Error(
					"LLM API 配置缺失，请检查环境变量 VITE_LLM_API_KEY 和 VITE_LLM_API_ENDPOINT"
				);
				handleApiError(configError, "LLM API 配置");
				throw configError;
			}

			// Construct the prompt for LLM
			const prompt = buildPrompt(text);

			if (import.meta.env.DEV) {
				console.log("Using LLM model:", model);
				console.log("API Endpoint:", apiEndpoint);
			}

			// Call LLM API with retry logic for network errors
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
					temperature: 0.3,
				};

				if (import.meta.env.DEV) {
					console.log("Request body:", JSON.stringify(requestBody, null, 2));
				}

				const response = await fetch(apiEndpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${apiKey}`,
					},
					body: JSON.stringify(requestBody),
				});

				// Handle HTTP errors
				if (!response.ok) {
					let errorMessage = `LLM API 调用失败 (${response.status})`;
					let errorData: any = null;

					try {
						errorData = await response.json();
						console.error("LLM API Error Response:", errorData);
						errorMessage =
							errorData.error?.message || errorData.message || errorMessage;
					} catch {
						// If can't parse error response, use status text
						errorMessage = `${errorMessage}: ${response.statusText}`;
					}

					// Create specific error based on status code
					if (response.status === 401 || response.status === 403) {
						throw new Error("API 认证失败，请检查 API 密钥是否正确");
					} else if (response.status === 429) {
						throw new Error("API 调用次数超限，请稍后再试");
					} else if (response.status >= 500) {
						throw new Error("LLM 服务暂时不可用，请稍后再试");
					} else {
						throw new Error(errorMessage);
					}
				}

				return response;
			};

			// Retry API call for network errors
			const response = await retryWithBackoff(callApi, 2, 1000);
			const data = await response.json();

			// Log the response for debugging
			if (import.meta.env.DEV) {
				console.log("LLM API Response:", data);
			}

			// Extract the response content
			const content = data.choices?.[0]?.message?.content;
			if (!content) {
				console.error("Invalid LLM response structure:", JSON.stringify(data, null, 2));
				throw new Error(
					`LLM 返回的响应格式无效。请检查 API 端点是否正确。收到的响应: ${JSON.stringify(
						data
					).substring(0, 200)}`
				);
			}

			if (import.meta.env.DEV) {
				console.log("LLM Response Content:", content);
			}

			// Parse the JSON response
			const parsedResponse = parseResponse(content);

			// Validate and process the parsed events
			const events = processEvents(parsedResponse);

			// Requirement 2.13: If no valid events found, throw error
			if (events.length === 0) {
				throw new Error("无法从文本中识别任何有效的日程信息，请检查输入或手动创建");
			}

			return events;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "未知错误";
			error.value = errorMessage;

			// Handle network errors specifically
			if (isNetworkError(err)) {
				handleApiError(new Error("网络连接失败，请检查网络后重试"), "LLM API");
			} else if (err instanceof Error && !err.message.includes("无法从文本中识别")) {
				// Don't show notification for "no events found" error (already shown in UI)
				handleApiError(err, "LLM API");
			}

			throw err;
		} finally {
			isLoading.value = false;
		}
	};

	/**
	 * Build the prompt for LLM to extract event information
	 * Requirement 18.7: LLM should identify and suggest tags
	 */
	const buildPrompt = (text: string): string => {
		const today = new Date();
		const currentDate = today.toISOString().split("T")[0]; // YYYY-MM-DD format

		return `请从以下通告文本中提取日程事件信息。如果文本中包含多个事件，请全部提取。

重要：今天的日期是 ${currentDate}，请根据这个日期来推断事件的年份。

要求：
1. 提取以下字段（如果存在）：
   - title: 事件标题
   - startTime: 开始时间（ISO 8601格式，例如：2024-11-22T13:00:00）
   - endTime: 结束时间（ISO 8601格式）
   - isAllDay: 是否全天事件（布尔值）
   - location: 地点
   - description: 描述或备注
   - eventType: 事件类型（如：会议、考试、活动、截止日期等）
   - participants: 参与人员
   - contact: 联系方式
   - suggestedTags: 建议的标签数组（字符串数组，如：["会议", "重要", "学术"]）

2. 如果某个字段无法识别或不存在，请不要包含该字段（不要生成虚假信息）
3. 对于相对日期（如"明天"、"下周三"），请基于今天的日期 ${currentDate} 转换为绝对日期
4. 如果只有日期没有具体时间，设置 isAllDay 为 true
5. 如果文本包含重复规则（如"每周二"），请在 description 中说明
6. 年份推断规则：如果文本中没有明确年份，使用今天的年份 ${today.getFullYear()}
7. 标签建议：根据事件类型、主题、重要性等因素，建议2-4个合适的标签

请以 JSON 数组格式返回，每个事件是一个对象。

通告文本：
${text}

请只返回 JSON 数组，不要包含其他说明文字。`;
	};

	/**
	 * Parse the LLM response content
	 */
	const parseResponse = (content: string): any => {
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
			throw new Error(`无法解析 LLM 返回的 JSON 格式。响应内容: ${content.substring(0, 200)}...`);
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
					console.log("Parsing startTime:", rawEvent.startTime, "->", startDate);
					if (!isNaN(startDate.getTime())) {
						event.startTime = startDate;
					}
				}

				if (rawEvent.endTime) {
					const endDate = new Date(rawEvent.endTime);
					console.log("Parsing endTime:", rawEvent.endTime, "->", endDate);
					if (!isNaN(endDate.getTime())) {
						event.endTime = endDate;
					}
				}

				// If no end time but has start time, set end time to start time + 1 hour
				if (event.startTime && !event.endTime) {
					event.endTime = new Date(event.startTime.getTime() + 60 * 60 * 1000);
				}

				// All-day event flag
				if (typeof rawEvent.isAllDay === "boolean") {
					event.isAllDay = rawEvent.isAllDay;
				} else {
					event.isAllDay = false;
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
					console.log("Processed event:", event);
					console.log(
						"startTime type:",
						typeof event.startTime,
						event.startTime instanceof Date
					);
					events.push(event);
				}
			} catch (err) {
				console.warn("跳过无效事件:", err);
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
