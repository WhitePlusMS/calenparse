/**
 * 颜色和主题检查器
 * 验证颜色值的变量化、对比度和深色模式一致性
 */

import type { ParsedCSS, Issue, CSSProperty, AccessibilityStandards, CSSVariable } from "../types";
import { defaultStyleStandards } from "../config";
import ColorContrastChecker from "color-contrast-checker";

/**
 * 颜色检查器类
 */
export class ColorChecker {
	private standards: AccessibilityStandards;
	private contrastChecker: ColorContrastChecker;

	constructor(standards?: AccessibilityStandards) {
		this.standards = standards || defaultStyleStandards.accessibility;
		this.contrastChecker = new ColorContrastChecker();
	}

	/**
	 * 检查颜色值是否使用变量
	 * 需求 7.1: 颜色值应该使用 CSS 变量而非硬编码
	 */
	checkColorVariableUsage(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 颜色相关的 CSS 属性
		const colorProperties = [
			"color",
			"background-color",
			"background",
			"border-color",
			"border",
			"border-top-color",
			"border-right-color",
			"border-bottom-color",
			"border-left-color",
			"outline-color",
			"text-decoration-color",
			"fill",
			"stroke",
			"box-shadow",
			"text-shadow",
		];

		// 检查所有类中的属性
		for (const cssClass of css.classes) {
			for (const prop of cssClass.properties) {
				// 只检查颜色相关属性
				if (!colorProperties.includes(prop.name)) {
					continue;
				}

				// 检查属性值是否包含硬编码颜色
				const hardcodedColors = this.findHardcodedColors(prop.value);

				if (hardcodedColors.length > 0) {
					issues.push({
						severity: "moderate",
						category: "best-practice",
						message: `属性 "${prop.name}" 使用了硬编码的颜色值,应使用 CSS 变量`,
						location: cssClass.location,
						suggestion: `使用 CSS 变量引用颜色,例如: var(--text-primary), var(--bg-surface)`,
						codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${prop.name}: ${prop.value};\n}\n\n/* 建议 */\n.${cssClass.name} {\n  ${prop.name}: var(--text-primary);\n}`,
					});
				}
			}
		}

		return issues;
	}

	/**
	 * 检查颜色对比度
	 * 需求 7.5, 11.2: 文本颜色和背景颜色的对比度应该满足 WCAG AA 标准(至少 4.5:1)
	 */
	checkColorContrast(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 首先解析所有 CSS 变量的颜色值
		const colorVariables = this.parseColorVariables(css.variables);

		// 检查每个类的颜色对比度
		for (const cssClass of css.classes) {
			// 提取文本颜色和背景颜色
			const textColor = this.extractColor(cssClass.properties, "color", colorVariables);
			const bgColor = this.extractColor(cssClass.properties, "background-color", colorVariables);

			// 如果同时有文本颜色和背景颜色,检查对比度
			if (textColor && bgColor) {
				try {
					const contrast = this.contrastChecker.getContrastRatio(textColor, bgColor);
					const meetsAA = this.contrastChecker.isLevelAA(textColor, bgColor, 14); // 14px 字体

					if (!meetsAA) {
						issues.push({
							severity: "critical",
							category: "accessibility",
							message: `类 "${
								cssClass.name
							}" 的颜色对比度不足 (${contrast.toFixed(
								2
							)}:1),未达到 WCAG AA 标准 (需要 4.5:1)`,
							location: cssClass.location,
							suggestion: `调整文本颜色或背景颜色以提高对比度至少达到 4.5:1`,
							codeExample: `/* 当前对比度: ${contrast.toFixed(2)}:1 */\n.${
								cssClass.name
							} {\n  color: ${textColor};\n  background-color: ${bgColor};\n}\n\n/* 建议使用更高对比度的颜色组合 */`,
						});
					}
				} catch (error) {
					// 如果颜色格式无法解析,跳过
					// 这可能是因为使用了 CSS 变量或其他复杂值
				}
			}
		}

		return issues;
	}

	/**
	 * 检查深色模式一致性
	 * 需求 7.2, 7.3: 深色模式应该使用正确的选择器并覆盖所有必要的变量
	 */
	checkDarkModeConsistency(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 检查是否定义了深色模式
		// 检查媒体查询或类选择器中是否有深色模式
		const hasDarkModeMediaQuery = css.mediaQueries.some((mq) =>
			mq.query.includes("prefers-color-scheme: dark")
		);

		// 检查是否有 .dark-mode 或 :root.dark-mode 选择器
		const hasDarkModeClass = css.classes.some(
			(c) => c.name === "dark-mode" || c.name.includes("dark-mode")
		);

		const hasDarkMode = hasDarkModeMediaQuery || hasDarkModeClass;

		// 如果没有深色模式,但有颜色变量,建议添加
		const colorVariables = css.variables.filter((v) => v.category === "color");
		if (!hasDarkMode && colorVariables.length > 0) {
			issues.push({
				severity: "moderate",
				category: "best-practice",
				message: `项目定义了${colorVariables.length}个颜色变量但缺少深色模式支持`,
				location: css.variables[0].location,
				suggestion: `添加深色模式样式,使用 :root.dark-mode 选择器或 @media (prefers-color-scheme: dark)`,
				codeExample: `/* 添加深色模式支持 */\n:root.dark-mode {\n  --text-primary: #ffffff;\n  --bg-surface: #1a1a1a;\n}\n\n/* 或使用媒体查询 */\n@media (prefers-color-scheme: dark) {\n  :root {\n    --text-primary: #ffffff;\n    --bg-surface: #1a1a1a;\n  }\n}`,
			});
		}

		// 检查深色模式变量覆盖的完整性
		if (hasDarkMode) {
			const lightModeColorVars = css.variables.filter((v) => v.category === "color");
			const darkModeVars = this.extractDarkModeVariables(css);

			// 检查是否所有颜色变量都有深色模式覆盖
			for (const lightVar of lightModeColorVars) {
				if (!darkModeVars.has(lightVar.name)) {
					issues.push({
						severity: "minor",
						category: "best-practice",
						message: `颜色变量 "${lightVar.name}" 在深色模式中缺少覆盖`,
						location: lightVar.location,
						suggestion: `在深色模式选择器中添加该变量的覆盖值`,
						codeExample: `:root.dark-mode {\n  ${lightVar.name}: /* 深色模式值 */;\n}`,
					});
				}
			}
		}

		return issues;
	}

	/**
	 * 查找属性值中的硬编码颜色
	 */
	private findHardcodedColors(value: string): string[] {
		const hardcodedColors: string[] = [];

		// 允许的特殊值(不算硬编码)
		const allowedValues = [
			"transparent",
			"inherit",
			"initial",
			"unset",
			"currentColor",
			"currentcolor",
			"none",
		];

		// 如果值是 var() 引用,则不算硬编码
		if (value.includes("var(")) {
			return hardcodedColors;
		}

		// 如果是允许的特殊值,则不算硬编码
		if (allowedValues.includes(value.trim())) {
			return hardcodedColors;
		}

		// 检查十六进制颜色 (#RGB, #RRGGBB, #RRGGBBAA)
		const hexPattern = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
		const hexMatches = value.match(hexPattern);
		if (hexMatches) {
			hardcodedColors.push(...hexMatches);
		}

		// 检查 rgb/rgba 函数
		const rgbPattern = /rgba?\([^)]+\)/g;
		const rgbMatches = value.match(rgbPattern);
		if (rgbMatches) {
			hardcodedColors.push(...rgbMatches);
		}

		// 检查 hsl/hsla 函数
		const hslPattern = /hsla?\([^)]+\)/g;
		const hslMatches = value.match(hslPattern);
		if (hslMatches) {
			hardcodedColors.push(...hslMatches);
		}

		// 检查命名颜色(常见的)
		const namedColors = [
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
			"brown",
			"cyan",
			"magenta",
		];

		// 使用单词边界匹配,避免误匹配(如 "background" 中的 "ground")
		for (const color of namedColors) {
			const colorPattern = new RegExp(`\\b${color}\\b`, "i");
			if (colorPattern.test(value)) {
				hardcodedColors.push(color);
			}
		}

		return hardcodedColors;
	}

	/**
	 * 解析 CSS 变量中的颜色值
	 */
	private parseColorVariables(variables: CSSVariable[]): Map<string, string> {
		const colorMap = new Map<string, string>();

		for (const variable of variables) {
			if (variable.category === "color") {
				// 只保存实际的颜色值(不是 var() 引用)
				if (!variable.value.includes("var(")) {
					colorMap.set(variable.name, variable.value);
				}
			}
		}

		return colorMap;
	}

	/**
	 * 从属性列表中提取颜色值
	 */
	private extractColor(
		properties: CSSProperty[],
		propertyName: string,
		colorVariables: Map<string, string>
	): string | null {
		const prop = properties.find((p) => p.name === propertyName);
		if (!prop) {
			return null;
		}

		// 如果是 var() 引用,尝试解析
		const varMatch = prop.value.match(/var\((--[a-z0-9-]+)\)/);
		if (varMatch) {
			const varName = varMatch[1];
			return colorVariables.get(varName) || null;
		}

		// 直接返回颜色值
		return prop.value;
	}

	/**
	 * 提取深色模式中定义的变量
	 */
	private extractDarkModeVariables(css: ParsedCSS): Set<string> {
		const darkModeVars = new Set<string>();

		// 这是一个简化实现
		// 实际应该解析媒体查询和选择器内容
		for (const mq of css.mediaQueries) {
			if (mq.query.includes("prefers-color-scheme: dark") || mq.content.includes(".dark-mode")) {
				// 提取变量名(简化版)
				const varMatches = mq.content.matchAll(/(--[a-z0-9-]+):/g);
				for (const match of varMatches) {
					darkModeVars.add(match[1]);
				}
			}
		}

		return darkModeVars;
	}
}

/**
 * 创建颜色检查器实例
 */
export function createColorChecker(standards?: AccessibilityStandards): ColorChecker {
	return new ColorChecker(standards);
}
