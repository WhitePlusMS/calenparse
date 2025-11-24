/**
 * 注释和文档检查器
 * 验证样式文件的注释格式、文档完整性和一致性
 */

import type { Issue, Location, OrganizationStandards } from "../types";
import { defaultStyleStandards } from "../config";

/**
 * 注释检查器类
 */
export class CommentChecker {
	private standards: OrganizationStandards;

	constructor(standards?: OrganizationStandards) {
		this.standards = standards || defaultStyleStandards.organization;
	}

	/**
	 * 检查文件头部注释
	 * 需求 4.3: 文件开头应该包含文件用途的简要说明
	 */
	checkFileHeader(content: string, filePath: string): Issue[] {
		const issues: Issue[] = [];

		// 如果不要求文件头部,跳过检查
		if (!this.standards.requireFileHeader) {
			return issues;
		}

		// 检查文件开头是否有注释
		const lines = content.split("\n");
		const firstNonEmptyLine = lines.findIndex((line) => line.trim().length > 0);

		if (firstNonEmptyLine === -1) {
			// 空文件
			return issues;
		}

		const firstLine = lines[firstNonEmptyLine].trim();

		// 检查是否以注释开头
		const hasHeaderComment =
			firstLine.startsWith("/*") || firstLine.startsWith("//") || firstLine.startsWith("/**");

		if (!hasHeaderComment) {
			issues.push({
				severity: "minor",
				category: "organization",
				message: `文件缺少头部注释说明`,
				location: {
					file: filePath,
					line: firstNonEmptyLine + 1,
					column: 1,
				},
				suggestion: `在文件开头添加注释说明文件用途`,
				codeExample: `/**\n * 文件用途说明\n * 例如: 按钮组件的样式定义\n */\n\n${firstLine}`,
			});
		} else {
			// 检查注释是否足够详细(至少 10 个字符)
			// 只提取第一个注释块
			let commentEndLine = firstNonEmptyLine;
			if (firstLine.startsWith("/*")) {
				// 找到注释结束位置
				for (let i = firstNonEmptyLine; i < lines.length; i++) {
					if (lines[i].includes("*/")) {
						commentEndLine = i;
						break;
					}
				}
			} else if (firstLine.startsWith("//")) {
				// 行注释,只取第一行
				commentEndLine = firstNonEmptyLine;
			}
			const commentLines = lines.slice(firstNonEmptyLine, commentEndLine + 1).join("\n");
			const commentContent = this.extractCommentContent(commentLines);

			if (commentContent.length < 10) {
				issues.push({
					severity: "minor",
					category: "organization",
					message: `文件头部注释过于简短,应提供更详细的说明`,
					location: {
						file: filePath,
						line: firstNonEmptyLine + 1,
						column: 1,
					},
					suggestion: `提供更详细的文件用途说明,至少 10 个字符`,
				});
			}
		}

		return issues;
	}

	/**
	 * 检查分隔注释的一致性
	 * 需求 4.1: 样式文件包含多个部分时应该使用分隔注释标记主要部分
	 */
	checkSectionSeparators(content: string, filePath: string): Issue[] {
		const issues: Issue[] = [];

		// 检测文件是否包含多个逻辑部分
		const hasSections = this.detectMultipleSections(content);

		if (!hasSections) {
			// 文件较简单,不需要分隔注释
			return issues;
		}

		// 提取所有注释
		const comments = this.extractAllComments(content);

		// 检查是否有分隔注释
		const separatorComments = comments.filter((c) => this.isSeparatorComment(c.content));

		if (separatorComments.length === 0) {
			issues.push({
				severity: "minor",
				category: "organization",
				message: `文件包含多个部分但缺少分隔注释`,
				location: {
					file: filePath,
					line: 1,
					column: 1,
				},
				suggestion: `使用分隔注释标记主要部分,例如: ${this.standards.sectionSeparator}`,
				codeExample: `/* ========================================\n   变量定义\n   ======================================== */\n\n:root {\n  --color: #000;\n}\n\n/* ========================================\n   工具类\n   ======================================== */\n\n.utility { ... }`,
			});
		} else {
			// 检查分隔注释格式的一致性
			const inconsistentSeparators = this.findInconsistentSeparators(separatorComments);

			for (const separator of inconsistentSeparators) {
				issues.push({
					severity: "minor",
					category: "organization",
					message: `分隔注释格式不一致`,
					location: {
						file: filePath,
						line: separator.line,
						column: 1,
					},
					suggestion: `使用统一的分隔注释格式: ${this.standards.sectionSeparator}`,
					codeExample: `/* 当前 */\n${separator.content}\n\n/* 建议 */\n${this.standards.sectionSeparator}`,
				});
			}
		}

		return issues;
	}

	/**
	 * 检查需求引用注释的格式
	 * 需求 4.2: 样式规则实现特定需求时应该包含需求引用注释
	 */
	checkRequirementReferences(content: string, filePath: string): Issue[] {
		const issues: Issue[] = [];

		// 查找需求引用注释
		const requirementRefs = this.findRequirementReferences(content);

		// 检查需求引用格式
		for (const ref of requirementRefs) {
			// 标准格式: /* 需求: X.Y */ 或 // 需求: X.Y
			const validFormats = [
				/需求[：:]\s*\d+\.\d+/,
				/Requirement[：:]\s*\d+\.\d+/i,
				/Req[：:]\s*\d+\.\d+/i,
			];

			const isValidFormat = validFormats.some((pattern) => pattern.test(ref.content));

			if (!isValidFormat) {
				issues.push({
					severity: "minor",
					category: "organization",
					message: `需求引用注释格式不规范`,
					location: {
						file: filePath,
						line: ref.line,
						column: 1,
					},
					suggestion: `使用标准格式: /* 需求: X.Y */ 或 // 需求: X.Y`,
					codeExample: `/* 当前 */\n${ref.content}\n\n/* 建议 */\n/* 需求: 7.1 */`,
				});
			}
		}

		return issues;
	}

	/**
	 * 检查注释语言的一致性
	 * 需求 4.5: 所有注释应该使用一致的注释格式和语言(中文或英文)
	 */
	checkCommentLanguageConsistency(content: string, filePath: string): Issue[] {
		const issues: Issue[] = [];

		// 提取所有注释
		const comments = this.extractAllComments(content);

		if (comments.length < 2) {
			// 注释太少,无法判断一致性
			return issues;
		}

		// 检测每个注释的语言
		const commentLanguages = comments.map((c) => ({
			...c,
			language: this.detectLanguage(c.content),
		}));

		// 统计语言使用情况
		const languageCounts = new Map<string, number>();
		for (const comment of commentLanguages) {
			const count = languageCounts.get(comment.language) || 0;
			languageCounts.set(comment.language, count + 1);
		}

		// 找出主要语言
		let primaryLanguage = "unknown";
		let maxCount = 0;
		for (const [lang, count] of languageCounts.entries()) {
			if (count > maxCount) {
				primaryLanguage = lang;
				maxCount = count;
			}
		}

		// 检查不一致的注释
		for (const comment of commentLanguages) {
			if (comment.language !== primaryLanguage && comment.language !== "unknown") {
				issues.push({
					severity: "minor",
					category: "organization",
					message: `注释语言不一致,文件主要使用${this.getLanguageName(
						primaryLanguage
					)},但此处使用${this.getLanguageName(comment.language)}`,
					location: {
						file: filePath,
						line: comment.line,
						column: 1,
					},
					suggestion: `统一使用${this.getLanguageName(primaryLanguage)}编写注释`,
				});
			}
		}

		return issues;
	}

	/**
	 * 检查注释风格的一致性
	 * 需求 4.4: 复杂的样式规则应该包含解释其目的的内联注释
	 */
	checkCommentStyleConsistency(content: string, filePath: string): Issue[] {
		const issues: Issue[] = [];

		// 提取所有注释
		const comments = this.extractAllComments(content);

		if (comments.length < 2) {
			return issues;
		}

		// 统计注释风格
		const blockComments = comments.filter((c) => c.style === "block");
		const lineComments = comments.filter((c) => c.style === "line");

		// 如果两种风格都有,且数量相近,建议统一
		const totalComments = comments.length;
		const blockRatio = blockComments.length / totalComments;
		const lineRatio = lineComments.length / totalComments;

		// 如果两种风格都占 30% 以上,说明混用严重
		if (blockRatio > 0.3 && lineRatio > 0.3) {
			issues.push({
				severity: "minor",
				category: "organization",
				message: `文件中混用了块注释(/* */)和行注释(//),建议统一风格`,
				location: {
					file: filePath,
					line: 1,
					column: 1,
				},
				suggestion: `统一使用${
					this.standards.commentStyle === "block" ? "块注释(/* */)" : "行注释(//)"
				}`,
				codeExample: `/* 推荐: 统一使用块注释 */\n/* 变量定义 */\n:root { ... }\n\n/* 或统一使用行注释 */\n// 变量定义\n:root { ... }`,
			});
		}

		return issues;
	}

	/**
	 * 提取注释内容(去除注释符号)
	 */
	private extractCommentContent(text: string): string {
		// 移除块注释符号
		let content = text.replace(/^\/\*+\s*/, "").replace(/\s*\*+\/$/, "");
		// 移除行注释符号
		content = content.replace(/^\/\/\s*/, "");
		// 移除每行开头的 *
		content = content.replace(/^\s*\*\s*/gm, "");

		return content.trim();
	}

	/**
	 * 检测文件是否包含多个逻辑部分
	 */
	private detectMultipleSections(content: string): boolean {
		// 简单启发式:如果文件超过 100 行,或包含多个 :root, @media 等,认为有多个部分
		const lines = content.split("\n");

		if (lines.length > 100) {
			return true;
		}

		// 检查是否有多个主要结构
		const rootCount = (content.match(/:root\s*{/g) || []).length;
		const mediaCount = (content.match(/@media/g) || []).length;
		const keyframesCount = (content.match(/@keyframes/g) || []).length;

		return rootCount + mediaCount + keyframesCount > 2;
	}

	/**
	 * 提取所有注释
	 */
	private extractAllComments(content: string): Array<{ content: string; line: number; style: "block" | "line" }> {
		const comments: Array<{ content: string; line: number; style: "block" | "line" }> = [];
		const lines = content.split("\n");

		let inBlockComment = false;
		let blockCommentStart = 0;
		let blockCommentContent = "";

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// 检查块注释
			if (!inBlockComment && line.includes("/*")) {
				inBlockComment = true;
				blockCommentStart = i + 1;
				blockCommentContent = line.substring(line.indexOf("/*"));

				// 检查是否在同一行结束
				if (line.includes("*/")) {
					inBlockComment = false;
					comments.push({
						content: blockCommentContent,
						line: blockCommentStart,
						style: "block",
					});
					blockCommentContent = "";
				}
			} else if (inBlockComment) {
				blockCommentContent += "\n" + line;

				if (line.includes("*/")) {
					inBlockComment = false;
					comments.push({
						content: blockCommentContent,
						line: blockCommentStart,
						style: "block",
					});
					blockCommentContent = "";
				}
			}

			// 检查行注释
			if (line.includes("//")) {
				const commentStart = line.indexOf("//");
				comments.push({
					content: line.substring(commentStart),
					line: i + 1,
					style: "line",
				});
			}
		}

		return comments;
	}

	/**
	 * 判断是否为分隔注释
	 */
	private isSeparatorComment(content: string): boolean {
		// 分隔注释通常包含重复的字符(=, -, *)
		const separatorPatterns = [
			/={3,}/, // ===
			/-{3,}/, // ---
			/\*{3,}/, // ***
		];

		return separatorPatterns.some((pattern) => pattern.test(content));
	}

	/**
	 * 查找格式不一致的分隔注释
	 */
	private findInconsistentSeparators(
		separators: Array<{ content: string; line: number; style: "block" | "line" }>
	): Array<{ content: string; line: number }> {
		if (separators.length < 2) {
			return [];
		}

		// 提取第一个分隔符的模式
		const firstPattern = this.extractSeparatorPattern(separators[0].content);

		if (!firstPattern) {
			return [];
		}

		// 查找与第一个模式不同的分隔符
		const inconsistent: Array<{ content: string; line: number }> = [];

		for (let i = 1; i < separators.length; i++) {
			const pattern = this.extractSeparatorPattern(separators[i].content);
			if (pattern && pattern !== firstPattern) {
				inconsistent.push({
					content: separators[i].content,
					line: separators[i].line,
				});
			}
		}

		return inconsistent;
	}

	/**
	 * 提取分隔符模式
	 */
	private extractSeparatorPattern(content: string): string {
		// 提取重复字符 - 需要找到最长的重复序列
		const patterns = content.match(/([=\-*])\1{2,}/g);
		if (!patterns || patterns.length === 0) {
			return "";
		}
		// 返回第一个重复字符
		return patterns[0][0];
	}

	/**
	 * 查找需求引用注释
	 */
	private findRequirementReferences(content: string): Array<{ content: string; line: number }> {
		const refs: Array<{ content: string; line: number }> = [];
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// 查找包含"需求"或"requirement"的注释
			if (
				(line.includes("需求") || line.toLowerCase().includes("requirement")) &&
				(line.includes("//") || line.includes("/*"))
			) {
				refs.push({
					content: line.trim(),
					line: i + 1,
				});
			}
		}

		return refs;
	}

	/**
	 * 检测注释语言
	 */
	private detectLanguage(content: string): "chinese" | "english" | "unknown" {
		// 移除注释符号
		const text = this.extractCommentContent(content);

		// 检测中文字符
		const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
		const chineseCount = chineseChars ? chineseChars.length : 0;
		const hasSignificantChinese = chineseCount >= 2;

		// 检测英文单词(至少3个字母的单词)
		const englishWords = text.match(/[a-zA-Z]{3,}/g);
		const englishCount = englishWords ? englishWords.length : 0;
		const hasSignificantEnglish = englishCount >= 2;

		if (hasSignificantChinese && !hasSignificantEnglish) {
			return "chinese";
		} else if (hasSignificantEnglish && !hasSignificantChinese) {
			return "english";
		} else if (hasSignificantChinese && hasSignificantEnglish) {
			// 混合,以数量多的为准
			// 中文字符权重更高,因为一个中文字就是一个完整的字
			return chineseCount > englishCount * 0.5 ? "chinese" : "english";
		}

		return "unknown";
	}

	/**
	 * 获取语言名称
	 */
	private getLanguageName(language: string): string {
		const names: Record<string, string> = {
			chinese: "中文",
			english: "英文",
			unknown: "未知语言",
		};
		return names[language] || language;
	}
}

/**
 * 创建注释检查器实例
 */
export function createCommentChecker(standards?: OrganizationStandards): CommentChecker {
	return new CommentChecker(standards);
}
