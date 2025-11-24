/**
 * CSS 解析器实现
 * 使用 PostCSS 解析 CSS 内容并提取关键信息
 */

import postcss, { Root, Rule, Declaration, AtRule, Comment } from "postcss";
import selectorParser from "postcss-selector-parser";
import type {
	CSSParser as ICSSParser,
	ParsedCSS,
	CSSVariable,
	CSSClass,
	CSSSelector,
	CSSAnimation,
	MediaQuery,
	CSSProperty,
	Location,
} from "../types";

// 常量定义
const UTILITY_PREFIXES = ["m-", "p-", "text-", "font-", "flex-", "grid-", "w-", "h-"] as const;
const COLOR_KEYWORDS = ["color", "bg", "border", "text", "shadow"] as const;
const SPACING_KEYWORDS = ["spacing", "margin", "padding", "gap"] as const;
const TYPOGRAPHY_KEYWORDS = ["font", "text", "line-height", "letter-spacing"] as const;
const ANIMATION_KEYWORDS = ["duration", "ease", "transition", "animation"] as const;

/**
 * CSS 解析器实现类
 */
export class CSSParser implements ICSSParser {
	private filePath: string = "unknown";

	/**
	 * 解析 CSS 内容
	 * @param content CSS 内容字符串
	 * @param filePath 文件路径（可选，用于错误报告）
	 */
	async parse(content: string, filePath: string = "unknown"): Promise<ParsedCSS> {
		this.filePath = filePath;

		try {
			const root = postcss.parse(content);

			return {
				variables: this.extractVariablesFromRoot(root),
				classes: this.extractClassesFromRoot(root),
				selectors: this.extractSelectorsFromRoot(root),
				animations: this.extractAnimationsFromRoot(root),
				mediaQueries: this.extractMediaQueriesFromRoot(root),
			};
		} catch (error) {
			console.error(`CSS 解析错误 (${filePath}):`, error);
			throw new Error(
				`无法解析 CSS 文件 ${filePath}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}

	/**
	 * 提取 CSS 变量（接口方法）
	 */
	extractVariables(content: string, filePath: string = "unknown"): CSSVariable[] {
		this.filePath = filePath;
		try {
			const root = postcss.parse(content);
			return this.extractVariablesFromRoot(root);
		} catch (error) {
			console.error("CSS 变量提取错误:", error);
			return [];
		}
	}

	/**
	 * 提取 CSS 类名（接口方法）
	 */
	extractClasses(content: string, filePath: string = "unknown"): CSSClass[] {
		this.filePath = filePath;
		try {
			const root = postcss.parse(content);
			return this.extractClassesFromRoot(root);
		} catch (error) {
			console.error("CSS 类名提取错误:", error);
			return [];
		}
	}

	/**
	 * 提取 CSS 选择器（接口方法）
	 */
	extractSelectors(content: string, filePath: string = "unknown"): CSSSelector[] {
		this.filePath = filePath;
		try {
			const root = postcss.parse(content);
			return this.extractSelectorsFromRoot(root);
		} catch (error) {
			console.error("CSS 选择器提取错误:", error);
			return [];
		}
	}

	/**
	 * 从 PostCSS Root 提取 CSS 变量
	 */
	private extractVariablesFromRoot(root: Root): CSSVariable[] {
		const variables: CSSVariable[] = [];

		root.walkDecls((decl) => {
			if (decl.prop.startsWith("--")) {
				variables.push({
					name: decl.prop,
					value: decl.value,
					location: this.createLocation(
						decl.source?.start?.line,
						decl.source?.start?.column
					),
					category: this.categorizeVariable(decl.prop, decl.value),
				});
			}
		});

		return variables;
	}

	/**
	 * 从 PostCSS Root 提取 CSS 类名
	 */
	private extractClassesFromRoot(root: Root): CSSClass[] {
		const classes: CSSClass[] = [];

		root.walkRules((rule) => {
			try {
				selectorParser((selectors) => {
					selectors.walkClasses((classNode) => {
						const properties: CSSProperty[] = [];

						rule.walkDecls((decl) => {
							properties.push({
								name: decl.prop,
								value: decl.value,
							});
						});

						classes.push({
							name: classNode.value,
							properties,
							location: this.createLocation(
								rule.source?.start?.line,
								rule.source?.start?.column
							),
							type: this.classifyClassType(classNode.value),
						});
					});
				}).processSync(rule.selector);
			} catch (error) {
				console.warn(`选择器解析警告 (${this.filePath}:${rule.source?.start?.line}):`, error);
			}
		});

		return classes;
	}

	/**
	 * 从 PostCSS Root 提取 CSS 选择器
	 */
	private extractSelectorsFromRoot(root: Root): CSSSelector[] {
		const selectors: CSSSelector[] = [];

		root.walkRules((rule) => {
			selectors.push({
				selector: rule.selector,
				specificity: this.calculateSpecificity(rule.selector),
				location: this.createLocation(rule.source?.start?.line, rule.source?.start?.column),
			});
		});

		return selectors;
	}

	/**
	 * 从 PostCSS Root 提取动画定义
	 */
	private extractAnimationsFromRoot(root: Root): CSSAnimation[] {
		const animations: CSSAnimation[] = [];

		root.walkAtRules("keyframes", (atRule) => {
			animations.push({
				name: atRule.params,
				keyframes: atRule.toString(),
				location: this.createLocation(atRule.source?.start?.line, atRule.source?.start?.column),
			});
		});

		return animations;
	}

	/**
	 * 从 PostCSS Root 提取媒体查询
	 */
	private extractMediaQueriesFromRoot(root: Root): MediaQuery[] {
		const mediaQueries: MediaQuery[] = [];

		root.walkAtRules("media", (atRule) => {
			mediaQueries.push({
				query: atRule.params,
				content: atRule.toString(),
				location: this.createLocation(atRule.source?.start?.line, atRule.source?.start?.column),
			});
		});

		return mediaQueries;
	}

	/**
	 * 创建位置信息的辅助方法
	 */
	private createLocation(line?: number, column?: number): Location {
		return {
			file: this.filePath,
			line: line || 0,
			column: column || 0,
		};
	}

	/**
	 * 分类 CSS 变量
	 */
	private categorizeVariable(
		name: string,
		value: string
	): "color" | "spacing" | "typography" | "animation" | "other" {
		const lowerName = name.toLowerCase();

		// 颜色相关
		if (COLOR_KEYWORDS.some((keyword) => lowerName.includes(keyword)) || this.isColorValue(value)) {
			return "color";
		}

		// 间距相关
		if (SPACING_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
			return "spacing";
		}

		// 排版相关
		if (TYPOGRAPHY_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
			return "typography";
		}

		// 动画相关
		if (ANIMATION_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
			return "animation";
		}

		return "other";
	}

	/**
	 * 判断值是否为颜色
	 */
	private isColorValue(value: string): boolean {
		return (
			value.startsWith("#") ||
			value.startsWith("rgb") ||
			value.startsWith("hsl") ||
			value === "transparent" ||
			value === "currentColor"
		);
	}

	/**
	 * 分类类名类型
	 */
	private classifyClassType(className: string): "utility" | "component" | "modifier" | undefined {
		// 工具类模式
		if (UTILITY_PREFIXES.some((prefix) => className.startsWith(prefix))) {
			return "utility";
		}

		// 修饰符模式 (BEM 或状态类)
		if (className.includes("--") || className.includes("__") || className.startsWith("is-")) {
			return "modifier";
		}

		// 组件类
		if (className.includes("-") && !UTILITY_PREFIXES.some((prefix) => className.startsWith(prefix))) {
			return "component";
		}

		return undefined;
	}

	/**
	 * 计算选择器特异性
	 * 返回简化的特异性分数 (ID * 100 + Class * 10 + Element)
	 */
	private calculateSpecificity(selector: string): number {
		let specificity = 0;

		try {
			selectorParser((selectors) => {
				selectors.walk((node) => {
					if (node.type === "id") {
						specificity += 100;
					} else if (
						node.type === "class" ||
						node.type === "attribute" ||
						node.type === "pseudo"
					) {
						specificity += 10;
					} else if (node.type === "tag") {
						specificity += 1;
					}
				});
			}).processSync(selector);
		} catch (error) {
			console.warn(`特异性计算警告 (${selector}):`, error);
		}

		return specificity;
	}
}

/**
 * 创建 CSS 解析器实例
 */
export function createCSSParser(): ICSSParser {
	return new CSSParser();
}
