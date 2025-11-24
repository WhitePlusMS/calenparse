/**
 * 样式审查工具的辅助函数
 */

import type { Location, Severity, IssueCategory } from "../types";

/**
 * 创建位置信息
 */
export function createLocation(file: string, line: number, column: number = 0): Location {
	return { file, line, column };
}

/**
 * 检查字符串是否为 kebab-case 格式
 */
export function isKebabCase(str: string): boolean {
	return /^[a-z][a-z0-9-]*$/.test(str);
}

/**
 * 检查字符串是否为 BEM 格式
 */
export function isBEM(str: string): boolean {
	// BEM 格式: block__element--modifier
	return /^[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$/.test(str);
}

/**
 * 检查 CSS 变量名是否符合命名规范
 */
export function isValidCSSVariableName(name: string): boolean {
	return name.startsWith("--") && isKebabCase(name.slice(2));
}

/**
 * 检查类名是否符合命名规范
 */
export function isValidClassName(name: string, format: "kebab-case" | "BEM"): boolean {
	if (format === "kebab-case") {
		return isKebabCase(name);
	}
	return isBEM(name);
}

/**
 * 从 CSS 变量名推断类别
 */
export function inferVariableCategory(name: string): "color" | "spacing" | "typography" | "animation" | "other" {
	const lowerName = name.toLowerCase();

	if (
		lowerName.includes("color") ||
		lowerName.includes("text-") ||
		lowerName.includes("bg-") ||
		lowerName.includes("border-") ||
		lowerName.includes("shadow-")
	) {
		return "color";
	}

	if (
		lowerName.includes("spacing") ||
		lowerName.includes("margin") ||
		lowerName.includes("padding") ||
		lowerName.includes("gap")
	) {
		return "spacing";
	}

	if (lowerName.includes("font") || lowerName.includes("line-height") || lowerName.includes("letter-spacing")) {
		return "typography";
	}

	if (
		lowerName.includes("duration") ||
		lowerName.includes("ease") ||
		lowerName.includes("transition") ||
		lowerName.includes("animation")
	) {
		return "animation";
	}

	return "other";
}

/**
 * 检查颜色值是否为硬编码
 */
export function isHardcodedColor(value: string): boolean {
	// 检查是否为十六进制颜色
	if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
		return true;
	}

	// 检查是否为 rgb/rgba
	if (/^rgba?\(/.test(value)) {
		return true;
	}

	// 检查是否为 hsl/hsla
	if (/^hsla?\(/.test(value)) {
		return true;
	}

	// 检查是否为命名颜色（排除特殊值）
	const specialValues = ["transparent", "inherit", "currentColor", "initial", "unset"];
	if (specialValues.includes(value)) {
		return false;
	}

	// 简单的命名颜色检查（可以扩展）
	const namedColors = ["red", "blue", "green", "yellow", "black", "white", "gray", "grey"];
	return namedColors.includes(value.toLowerCase());
}

/**
 * 检查值是否使用 CSS 变量
 */
export function usesCSSVariable(value: string): boolean {
	return value.includes("var(--");
}

/**
 * 计算选择器特异性
 * 返回格式: [inline, id, class, element]
 */
export function calculateSpecificity(selector: string): number {
	// 简化的特异性计算
	// 实际实现应该更复杂，这里提供基础版本

	let idCount = (selector.match(/#[a-zA-Z]/g) || []).length;
	let classCount = (selector.match(/\.[a-zA-Z]/g) || []).length;
	let attrCount = (selector.match(/\[[^\]]+\]/g) || []).length;
	let pseudoClassCount = (selector.match(/:[a-zA-Z]/g) || []).length;
	let elementCount = (selector.match(/^[a-zA-Z]|[\s>+~][a-zA-Z]/g) || []).length;

	// 返回特异性分数 (简化版本)
	return idCount * 100 + (classCount + attrCount + pseudoClassCount) * 10 + elementCount;
}

/**
 * 格式化问题消息
 */
export function formatIssueMessage(category: IssueCategory, severity: Severity, message: string): string {
	const severityLabel = {
		critical: "严重",
		moderate: "中等",
		minor: "轻微",
	}[severity];

	const categoryLabel = {
		naming: "命名",
		organization: "组织",
		accessibility: "可访问性",
		performance: "性能",
		duplication: "重复",
		unused: "未使用",
		"best-practice": "最佳实践",
	}[category];

	return `[${severityLabel}] [${categoryLabel}] ${message}`;
}

/**
 * 提取文件扩展名
 */
export function getFileExtension(filePath: string): string {
	const match = filePath.match(/\.([^.]+)$/);
	return match?.[1] ?? "";
}

/**
 * 检查是否为 Vue 组件文件
 */
export function isVueFile(filePath: string): boolean {
	return getFileExtension(filePath) === "vue";
}

/**
 * 检查是否为 CSS 文件
 */
export function isCSSFile(filePath: string): boolean {
	return getFileExtension(filePath) === "css";
}
