/**
 * 命名约定检查器
 * 验证 CSS 变量和类名是否符合命名标准
 */

import type { CSSVariable, CSSClass, Issue, Location, NamingStandards } from "../types";
import { defaultStyleStandards } from "../config";

/**
 * 命名检查器类
 */
export class NamingChecker {
	private standards: NamingStandards;

	constructor(standards?: NamingStandards) {
		this.standards = standards || defaultStyleStandards.naming;
	}

	/**
	 * 检查 CSS 变量命名
	 */
	checkVariableNaming(variables: CSSVariable[]): Issue[] {
		const issues: Issue[] = [];

		// 用于检测重复变量名
		const variableNames = new Map<string, Location[]>();

		for (const variable of variables) {
			// 检查 kebab-case 格式
			if (!this.isKebabCase(variable.name)) {
				issues.push({
					severity: "moderate",
					category: "naming",
					message: `CSS 变量 "${variable.name}" 未使用 kebab-case 格式`,
					location: variable.location,
					suggestion: `使用 kebab-case 格式,例如: ${this.toKebabCase(variable.name)}`,
					codeExample: `/* 当前 */\n${variable.name}: ${
						variable.value
					};\n\n/* 建议 */\n${this.toKebabCase(variable.name)}: ${variable.value};`,
				});
			}

			// 检查颜色变量的语义化命名
			if (variable.category === "color") {
				if (!this.hasSemanticColorName(variable.name)) {
					issues.push({
						severity: "moderate",
						category: "naming",
						message: `颜色变量 "${variable.name}" 应使用语义化名称而非描述性名称`,
						location: variable.location,
						suggestion: `使用语义化名称,如 --text-primary, --bg-surface, --border-accent 等`,
						codeExample: `/* 避免描述性名称 */\n--dark-gray: ${variable.value};\n--light-blue: ${variable.value};\n\n/* 使用语义化名称 */\n--text-primary: ${variable.value};\n--bg-surface: ${variable.value};`,
					});
				}
			}

			// 检查变量前缀是否符合标准
			const prefixIssue = this.checkVariablePrefix(variable);
			if (prefixIssue) {
				issues.push(prefixIssue);
			}

			// 记录变量名用于重复检测
			if (!variableNames.has(variable.name)) {
				variableNames.set(variable.name, []);
			}
			variableNames.get(variable.name)!.push(variable.location);
		}

		// 检查重复或冲突的变量名
		for (const [name, locations] of variableNames.entries()) {
			if (locations.length > 1) {
				for (const location of locations) {
					issues.push({
						severity: "critical",
						category: "naming",
						message: `CSS 变量 "${name}" 存在重复定义`,
						location,
						suggestion: `确保每个变量只定义一次,或在不同作用域中使用不同名称`,
						codeExample: `/* 重复定义会导致后者覆盖前者 */\n${name}: value1;\n${name}: value2; /* 这个会生效 */`,
					});
				}
			}
		}

		return issues;
	}

	/**
	 * 检查工具类命名
	 */
	checkUtilityClassNaming(classes: CSSClass[]): Issue[] {
		const issues: Issue[] = [];

		for (const cssClass of classes) {
			// 只检查工具类
			if (cssClass.type !== "utility") {
				continue;
			}

			// 检查 kebab-case 格式
			if (!this.isKebabCase(cssClass.name)) {
				issues.push({
					severity: "moderate",
					category: "naming",
					message: `工具类 "${cssClass.name}" 未使用 kebab-case 格式`,
					location: cssClass.location,
					suggestion: `使用 kebab-case 格式,例如: ${this.toKebabCase(cssClass.name)}`,
				});
			}

			// 检查工具类前缀
			const prefixIssue = this.checkUtilityClassPrefix(cssClass);
			if (prefixIssue) {
				issues.push(prefixIssue);
			}
		}

		return issues;
	}

	/**
	 * 检查变量前缀是否符合标准
	 */
	private checkVariablePrefix(variable: CSSVariable): Issue | null {
		if (!variable.category || variable.category === "other") {
			return null;
		}

		// 主题色变量例外:这些变量通常用作全局主题色,不需要特定前缀
		const themeColorVariables = [
			"--primary-color",
			"--secondary-color",
			"--success-color",
			"--warning-color",
			"--error-color",
			"--info-color",
			"--danger-color",
		];

		if (variable.category === "color" && themeColorVariables.includes(variable.name)) {
			return null;
		}

		const expectedPrefixes = this.standards.variablePrefixes[variable.category];
		if (!expectedPrefixes || expectedPrefixes.length === 0) {
			return null;
		}

		const hasCorrectPrefix = expectedPrefixes.some((prefix) => variable.name.startsWith(prefix));

		if (!hasCorrectPrefix) {
			return {
				severity: "minor",
				category: "naming",
				message: `${variable.category} 变量 "${variable.name}" 未使用标准前缀`,
				location: variable.location,
				suggestion: `使用以下前缀之一: ${expectedPrefixes.join(", ")}`,
				codeExample: `/* 当前 */\n${variable.name}: ${variable.value};\n\n/* 建议 */\n${
					expectedPrefixes[0]
				}${variable.name.replace(/^--/, "")}: ${variable.value};`,
			};
		}

		return null;
	}

	/**
	 * 检查工具类前缀是否符合标准
	 */
	private checkUtilityClassPrefix(cssClass: CSSClass): Issue | null {
		const className = cssClass.name;

		// 检查间距类
		if (this.isSpacingClass(cssClass)) {
			const spacingPattern = /^(m|p|gap)-(xs|sm|md|lg|xl|2xl|auto|0)$/;
			if (!spacingPattern.test(className)) {
				return {
					severity: "moderate",
					category: "naming",
					message: `间距工具类 "${className}" 未使用标准格式 {property}-{size}`,
					location: cssClass.location,
					suggestion: `使用格式: m-{size}, p-{size}, gap-{size},其中 size 为 xs, sm, md, lg, xl, 2xl, auto, 0`,
					codeExample: `/* 标准格式 */\n.m-md { margin: var(--spacing-md); }\n.p-lg { padding: var(--spacing-lg); }`,
				};
			}
		}

		// 检查文本类
		if (className.startsWith("text-")) {
			// 文本类应该使用 text- 前缀
			return null; // 已经符合标准
		}

		// 检查字体类
		if (className.startsWith("font-")) {
			// 字体类应该使用 font- 前缀
			return null; // 已经符合标准
		}

		// 检查按钮类
		if (this.isButtonClass(cssClass)) {
			if (!className.startsWith("btn-")) {
				return {
					severity: "moderate",
					category: "naming",
					message: `按钮类 "${className}" 应使用 btn- 前缀`,
					location: cssClass.location,
					suggestion: `使用 btn- 前缀,例如: btn-primary, btn-large`,
					codeExample: `/* 当前 */\n.${className} { ... }\n\n/* 建议 */\n.btn-${className} { ... }`,
				};
			}
		}

		// 检查标签/徽章类
		if (this.isTagOrBadgeClass(cssClass)) {
			if (!className.startsWith("tag-") && !className.startsWith("badge-")) {
				return {
					severity: "moderate",
					category: "naming",
					message: `标签/徽章类 "${className}" 应使用 tag- 或 badge- 前缀`,
					location: cssClass.location,
					suggestion: `使用 tag- 或 badge- 前缀`,
					codeExample: `/* 当前 */\n.${className} { ... }\n\n/* 建议 */\n.tag-${className} { ... }`,
				};
			}
		}

		return null;
	}

	/**
	 * 判断是否为 kebab-case 格式
	 */
	private isKebabCase(name: string): boolean {
		// CSS 变量以 -- 开头
		if (name.startsWith("--")) {
			return /^--[a-z][a-z0-9-]*$/.test(name);
		}
		// 类名
		return /^[a-z][a-z0-9-]*$/.test(name);
	}

	/**
	 * 转换为 kebab-case 格式
	 */
	private toKebabCase(name: string): string {
		const prefix = name.startsWith("--") ? "--" : "";
		const withoutPrefix = name.replace(/^--/, "");

		return (
			prefix +
			withoutPrefix
				.replace(/([A-Z])/g, "-$1")
				.replace(/[_\s]+/g, "-")
				.toLowerCase()
				.replace(/^-/, "")
		);
	}

	/**
	 * 检查颜色变量是否使用语义化名称
	 */
	private hasSemanticColorName(name: string): boolean {
		// 语义化前缀
		const semanticPrefixes = [
			"--text-",
			"--bg-",
			"--border-",
			"--shadow-",
			"--accent-",
			"--primary-",
			"--secondary-",
			"--success-",
			"--warning-",
			"--error-",
			"--info-",
		];

		// 描述性颜色名称(应避免)
		const descriptiveColors = [
			"red",
			"blue",
			"green",
			"yellow",
			"purple",
			"orange",
			"pink",
			"gray",
			"grey",
			"black",
			"white",
			"dark",
			"light",
		];

		// 检查是否使用语义化前缀
		const hasSemanticPrefix = semanticPrefixes.some((prefix) => name.startsWith(prefix));

		// 检查是否包含描述性颜色名称
		const hasDescriptiveColor = descriptiveColors.some((color) => name.includes(color));

		// 语义化命名应该有语义化前缀,且不应该包含描述性颜色名称
		return hasSemanticPrefix && !hasDescriptiveColor;
	}

	/**
	 * 判断是否为间距类
	 */
	private isSpacingClass(cssClass: CSSClass): boolean {
		const spacingProps = ["margin", "padding", "gap"];
		return cssClass.properties.some((prop) => spacingProps.some((sp) => prop.name.includes(sp)));
	}

	/**
	 * 判断是否为按钮类
	 */
	private isButtonClass(cssClass: CSSClass): boolean {
		// 简单判断:包含按钮相关属性
		const buttonProps = ["cursor", "border", "background"];
		const hasButtonProps = cssClass.properties.some((prop) =>
			buttonProps.some((bp) => prop.name.includes(bp))
		);

		// 或者类名包含 button, btn 等关键词
		const hasButtonKeyword = /button|btn/i.test(cssClass.name);

		return hasButtonProps || hasButtonKeyword;
	}

	/**
	 * 判断是否为标签/徽章类
	 */
	private isTagOrBadgeClass(cssClass: CSSClass): boolean {
		// 类名包含 tag, badge, label 等关键词
		return /tag|badge|label/i.test(cssClass.name);
	}
}

/**
 * 创建命名检查器实例
 */
export function createNamingChecker(standards?: NamingStandards): NamingChecker {
	return new NamingChecker(standards);
}
