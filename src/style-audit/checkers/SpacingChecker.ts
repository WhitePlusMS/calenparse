/**
 * 间距和尺寸检查器
 * 验证间距值、字体大小和圆角是否使用预定义变量
 */

import type { ParsedCSS, Issue, CSSProperty, CSSClass } from "../types";

/**
 * 间距检查器类
 */
export class SpacingChecker {
	/**
	 * 检查间距值标准化
	 * 需求 8.1: 间距值应该使用预定义的间距变量(--spacing-*)
	 */
	checkSpacingStandardization(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 间距相关的 CSS 属性
		const spacingProperties = [
			"margin",
			"margin-top",
			"margin-right",
			"margin-bottom",
			"margin-left",
			"padding",
			"padding-top",
			"padding-right",
			"padding-bottom",
			"padding-left",
			"gap",
			"row-gap",
			"column-gap",
		];

		// 检查所有类中的属性
		for (const cssClass of css.classes) {
			for (const prop of cssClass.properties) {
				// 只检查间距相关属性
				if (!spacingProperties.includes(prop.name)) {
					continue;
				}

				// 检查属性值是否包含硬编码间距
				const hardcodedSpacing = this.findHardcodedSpacing(prop.value);

				if (hardcodedSpacing.length > 0) {
					issues.push({
						severity: "moderate",
						category: "best-practice",
						message: `属性 "${prop.name}" 使用了硬编码的间距值,应使用预定义的间距变量`,
						location: cssClass.location,
						suggestion: `使用间距变量,例如: var(--spacing-xs), var(--spacing-md), var(--spacing-lg)`,
						codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${prop.name}: ${prop.value};\n}\n\n/* 建议 */\n.${cssClass.name} {\n  ${prop.name}: var(--spacing-md);\n}`,
					});
				}
			}
		}

		return issues;
	}

	/**
	 * 检查字体和圆角
	 * 需求 8.2, 8.3, 8.4, 8.5: 字体大小和边框圆角应使用预定义变量
	 */
	checkFontAndBorderRadius(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 字体相关属性
		const fontProperties = ["font-size", "line-height"];

		// 圆角相关属性
		const borderRadiusProperties = [
			"border-radius",
			"border-top-left-radius",
			"border-top-right-radius",
			"border-bottom-left-radius",
			"border-bottom-right-radius",
		];

		// 检查所有类中的属性
		for (const cssClass of css.classes) {
			for (const prop of cssClass.properties) {
				// 检查字体属性
				if (fontProperties.includes(prop.name)) {
					const hardcodedFont = this.findHardcodedFont(prop.value);
					if (hardcodedFont.length > 0) {
						issues.push({
							severity: "moderate",
							category: "best-practice",
							message: `属性 "${prop.name}" 使用了硬编码的值,应使用预定义的字体变量`,
							location: cssClass.location,
							suggestion: `使用字体变量,例如: var(--font-size-sm), var(--line-height-normal)`,
							codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${prop.name}: ${prop.value};\n}\n\n/* 建议 */\n.${cssClass.name} {\n  ${prop.name}: var(--font-size-md);\n}`,
						});
					}
				}

				// 检查圆角属性
				if (borderRadiusProperties.includes(prop.name)) {
					const hardcodedRadius = this.findHardcodedRadius(prop.value);
					if (hardcodedRadius.length > 0) {
						issues.push({
							severity: "minor",
							category: "best-practice",
							message: `属性 "${prop.name}" 使用了硬编码的值,应使用预定义的圆角变量`,
							location: cssClass.location,
							suggestion: `使用圆角变量,例如: var(--radius-sm), var(--radius-md), var(--radius-lg)`,
							codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${prop.name}: ${prop.value};\n}\n\n/* 建议 */\n.${cssClass.name} {\n  ${prop.name}: var(--radius-md);\n}`,
						});
					}
				}
			}
		}

		return issues;
	}

	/**
	 * 查找属性值中的硬编码间距
	 */
	private findHardcodedSpacing(value: string): string[] {
		const hardcodedValues: string[] = [];

		// 允许的特殊值(不算硬编码)
		const allowedValues = ["0", "auto", "inherit", "initial", "unset", "none"];

		// 如果值是 var() 引用,则不算硬编码
		if (value.includes("var(--spacing-")) {
			return hardcodedValues;
		}

		// 如果是允许的特殊值,则不算硬编码
		if (allowedValues.includes(value.trim())) {
			return hardcodedValues;
		}

		// 检查是否包含数值单位(px, rem, em, %)
		const numericPattern = /\d+(\.\d+)?(px|rem|em|%|vh|vw)/g;
		const numericMatches = value.match(numericPattern);

		if (numericMatches) {
			// 过滤掉真正的 0 值(0px, 0rem 等)
			const nonZeroMatches = numericMatches.filter((match) => {
				const numValue = parseFloat(match);
				return numValue !== 0;
			});
			if (nonZeroMatches.length > 0) {
				hardcodedValues.push(...nonZeroMatches);
			}
		}

		return hardcodedValues;
	}

	/**
	 * 查找属性值中的硬编码字体值
	 */
	private findHardcodedFont(value: string): string[] {
		const hardcodedValues: string[] = [];

		// 允许的特殊值
		const allowedValues = ["inherit", "initial", "unset", "normal", "bold", "lighter", "bolder"];

		// 如果值是 var() 引用,则不算硬编码
		if (value.includes("var(--font-") || value.includes("var(--line-height-")) {
			return hardcodedValues;
		}

		// 如果是允许的特殊值,则不算硬编码
		if (allowedValues.includes(value.trim())) {
			return hardcodedValues;
		}

		// 检查是否包含数值单位
		const numericPattern = /\d+(\.\d+)?(px|rem|em|%)?/g;
		const numericMatches = value.match(numericPattern);

		if (numericMatches) {
			// 过滤掉纯数字(可能是 line-height 的无单位值)
			const withUnits = numericMatches.filter((match) => /px|rem|em|%/.test(match));
			if (withUnits.length > 0) {
				hardcodedValues.push(...withUnits);
			}
		}

		return hardcodedValues;
	}

	/**
	 * 查找属性值中的硬编码圆角值
	 */
	private findHardcodedRadius(value: string): string[] {
		const hardcodedValues: string[] = [];

		// 允许的特殊值
		const allowedValues = ["0", "inherit", "initial", "unset", "none"];

		// 如果值是 var() 引用,则不算硬编码
		if (value.includes("var(--radius-")) {
			return hardcodedValues;
		}

		// 如果是允许的特殊值,则不算硬编码
		if (allowedValues.includes(value.trim())) {
			return hardcodedValues;
		}

		// 检查是否包含数值单位
		const numericPattern = /\d+(\.\d+)?(px|rem|em|%)/g;
		const numericMatches = value.match(numericPattern);

		if (numericMatches) {
			// 过滤掉真正的 0 值
			const nonZeroMatches = numericMatches.filter((match) => {
				const numValue = parseFloat(match);
				return numValue !== 0;
			});
			if (nonZeroMatches.length > 0) {
				hardcodedValues.push(...nonZeroMatches);
			}
		}

		return hardcodedValues;
	}
}

/**
 * 创建间距检查器实例
 */
export function createSpacingChecker(): SpacingChecker {
	return new SpacingChecker();
}
