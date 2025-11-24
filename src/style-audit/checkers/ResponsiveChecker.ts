/**
 * 响应式和组织结构检查器
 * 验证响应式断点、触摸目标尺寸和样式组织结构
 */

import type { ParsedCSS, Issue, MediaQuery, CSSClass } from "../types";

/**
 * 响应式检查器类
 */
export class ResponsiveChecker {
	// 标准断点值(需求 10.1)
	private readonly standardBreakpoints = [768, 480];

	/**
	 * 检查响应式断点一致性
	 * 需求 10.1, 10.2: 媒体查询应使用一致的断点值
	 */
	checkBreakpointConsistency(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 提取所有媒体查询中的断点值
		const breakpoints = this.extractBreakpoints(css.mediaQueries);

		// 检查每个断点是否符合标准
		for (const bp of breakpoints) {
			const isStandard = this.isStandardBreakpoint(bp.value);

			if (!isStandard) {
				issues.push({
					severity: "moderate",
					category: "best-practice",
					message: `媒体查询使用了非标准断点值 ${
						bp.value
					}px,应使用标准断点 ${this.standardBreakpoints.join("px, ")}px`,
					location: bp.location,
					suggestion: `使用项目定义的标准断点值以保持一致性`,
					codeExample: `/* 当前 */\n@media (max-width: ${
						bp.value
					}px) {\n  /* ... */\n}\n\n/* 建议 */\n@media (max-width: ${this.findClosestStandardBreakpoint(
						bp.value
					)}px) {\n  /* ... */\n}`,
				});
			}
		}

		// 检查断点值的一致性(是否有重复但略有不同的值)
		this.checkBreakpointDuplication(breakpoints, issues);

		return issues;
	}

	/**
	 * 从媒体查询中提取断点值
	 */
	private extractBreakpoints(mediaQueries: MediaQuery[]): Array<{ value: number; location: any; query: string }> {
		const breakpoints: Array<{ value: number; location: any; query: string }> = [];

		for (const mq of mediaQueries) {
			// 匹配 max-width 和 min-width 的像素值
			const widthPattern = /(max-width|min-width):\s*(\d+)px/g;
			let match;

			while ((match = widthPattern.exec(mq.query)) !== null) {
				const value = parseInt(match[2], 10);
				breakpoints.push({
					value,
					location: mq.location,
					query: mq.query,
				});
			}
		}

		return breakpoints;
	}

	/**
	 * 检查是否为标准断点
	 */
	private isStandardBreakpoint(value: number): boolean {
		// 允许一些容差(±5px)
		const tolerance = 5;

		return this.standardBreakpoints.some((standard) => Math.abs(value - standard) <= tolerance);
	}

	/**
	 * 查找最接近的标准断点
	 */
	private findClosestStandardBreakpoint(value: number): number {
		let closest = this.standardBreakpoints[0];
		let minDiff = Math.abs(value - closest);

		for (const standard of this.standardBreakpoints) {
			const diff = Math.abs(value - standard);
			if (diff < minDiff) {
				minDiff = diff;
				closest = standard;
			}
		}

		return closest;
	}

	/**
	 * 检查断点值的重复和不一致
	 */
	private checkBreakpointDuplication(
		breakpoints: Array<{ value: number; location: any; query: string }>,
		issues: Issue[]
	): void {
		// 按值分组
		const grouped = new Map<number, Array<{ location: any; query: string }>>();

		for (const bp of breakpoints) {
			if (!grouped.has(bp.value)) {
				grouped.set(bp.value, []);
			}
			grouped.get(bp.value)!.push({ location: bp.location, query: bp.query });
		}

		// 查找相似但不完全相同的断点值
		const values = Array.from(grouped.keys()).sort((a, b) => a - b);

		for (let i = 0; i < values.length - 1; i++) {
			const current = values[i];
			const next = values[i + 1];

			// 如果两个值非常接近(差距小于 20px),可能是不一致
			if (next - current < 20 && next - current > 0) {
				const currentLocations = grouped.get(current)!;
				const nextLocations = grouped.get(next)!;

				issues.push({
					severity: "minor",
					category: "best-practice",
					message: `发现相似的断点值 ${current}px 和 ${next}px,可能导致不一致`,
					location: currentLocations[0].location,
					suggestion: `统一使用相同的断点值以保持一致性`,
					codeExample: `/* 统一为 */\n@media (max-width: ${current}px) {\n  /* ... */\n}`,
				});
			}
		}
	}

	/**
	 * 检查触摸目标尺寸
	 * 需求 10.3, 11.4: 移动端交互元素应确保最小 44px 的可点击区域
	 */
	checkTouchTargetSize(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 最小触摸目标尺寸(WCAG 标准)
		const minTouchTarget = 44;

		// 定义交互式元素
		const interactiveElements = ["button", "a", "input", "select", "textarea", "[role='button']"];

		// 查找所有交互式元素的类
		const interactiveClasses = css.classes.filter((cssClass) =>
			interactiveElements.some(
				(elem) => cssClass.name.includes(elem) || cssClass.name.includes("btn")
			)
		);

		// 检查每个交互式类的尺寸
		for (const cssClass of interactiveClasses) {
			const sizeIssue = this.checkClassTouchTargetSize(cssClass, minTouchTarget);

			if (sizeIssue) {
				issues.push(sizeIssue);
			}
		}

		// 检查媒体查询中的移动端样式
		this.checkMobileTouchTargets(css, minTouchTarget, issues);

		return issues;
	}

	/**
	 * 检查单个类的触摸目标尺寸
	 */
	private checkClassTouchTargetSize(cssClass: CSSClass, minSize: number): Issue | null {
		// 查找宽度和高度属性
		const widthProp = cssClass.properties.find((p) => p.name === "width" || p.name === "min-width");
		const heightProp = cssClass.properties.find((p) => p.name === "height" || p.name === "min-height");

		// 如果没有定义尺寸,跳过
		if (!widthProp && !heightProp) {
			return null;
		}

		// 解析尺寸值
		const width = widthProp ? this.parseSizeValue(widthProp.value) : null;
		const height = heightProp ? this.parseSizeValue(heightProp.value) : null;

		// 检查是否小于最小触摸目标
		const isTooSmall = (width !== null && width < minSize) || (height !== null && height < minSize);

		if (isTooSmall) {
			return {
				severity: "moderate",
				category: "accessibility",
				message: `交互式元素 "${cssClass.name}" 的尺寸可能小于最小触摸目标 ${minSize}px`,
				location: cssClass.location,
				suggestion: `确保移动端交互元素的宽度和高度至少为 ${minSize}px`,
				codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${
					widthProp ? `${widthProp.name}: ${widthProp.value};` : ""
				}\n  ${
					heightProp ? `${heightProp.name}: ${heightProp.value};` : ""
				}\n}\n\n/* 建议 */\n.${
					cssClass.name
				} {\n  min-width: ${minSize}px;\n  min-height: ${minSize}px;\n}`,
			};
		}

		return null;
	}

	/**
	 * 解析尺寸值(仅处理 px 单位)
	 */
	private parseSizeValue(value: string): number | null {
		const pxMatch = value.match(/(\d+)px/);
		if (pxMatch) {
			return parseInt(pxMatch[1], 10);
		}
		return null;
	}

	/**
	 * 检查移动端媒体查询中的触摸目标
	 */
	private checkMobileTouchTargets(css: ParsedCSS, minSize: number, issues: Issue[]): void {
		// 查找移动端媒体查询
		const mobileQueries = css.mediaQueries.filter(
			(mq) => mq.query.includes("max-width") && this.isMobileBreakpoint(mq.query)
		);

		if (mobileQueries.length === 0) {
			// 如果没有移动端媒体查询,提示可能需要添加
			if (css.classes.some((c) => c.name.includes("btn") || c.name.includes("button"))) {
				issues.push({
					severity: "minor",
					category: "accessibility",
					message: `项目包含交互式元素但缺少移动端媒体查询,可能需要确保触摸目标尺寸`,
					location: { file: "", line: 0, column: 0 },
					suggestion: `添加移动端媒体查询,确保交互元素在小屏幕上有足够的触摸目标尺寸`,
					codeExample: `@media (max-width: 768px) {\n  button,\n  .btn {\n    min-width: ${minSize}px;\n    min-height: ${minSize}px;\n  }\n}`,
				});
			}
		}
	}

	/**
	 * 判断是否为移动端断点
	 */
	private isMobileBreakpoint(query: string): boolean {
		const widthMatch = query.match(/max-width:\s*(\d+)px/);
		if (widthMatch) {
			const width = parseInt(widthMatch[1], 10);
			return width <= 768;
		}
		return false;
	}

	/**
	 * 检查样式组织结构
	 * 需求 5.1, 5.2, 5.3, 5.4, 5.5: 验证文件包含适当的分隔注释和规则分组
	 */
	checkStyleOrganization(content: string, filePath: string): Issue[] {
		const issues: Issue[] = [];

		// 检查文件头部注释
		this.checkFileHeader(content, filePath, issues);

		// 检查分隔注释
		this.checkSectionSeparators(content, filePath, issues);

		// 检查规则分组的逻辑性
		this.checkRuleGrouping(content, filePath, issues);

		// 检查媒体查询位置
		this.checkMediaQueryPlacement(content, filePath, issues);

		// 检查深色模式样式位置
		this.checkDarkModeOrganization(content, filePath, issues);

		return issues;
	}

	/**
	 * 检查文件头部注释
	 * 需求 4.3: 文件开头应包含文件用途的简要说明
	 */
	private checkFileHeader(content: string, filePath: string, issues: Issue[]): void {
		const lines = content.split("\n");

		// 检查前 5 行是否有注释
		const hasHeaderComment = lines.slice(0, 5).some((line) => {
			const trimmed = line.trim();
			return trimmed.startsWith("/*") || trimmed.startsWith("//") || trimmed.startsWith("*");
		});

		if (!hasHeaderComment) {
			issues.push({
				severity: "minor",
				category: "organization",
				message: `文件 "${filePath}" 缺少头部注释说明文件用途`,
				location: { file: filePath, line: 1, column: 1 },
				suggestion: `在文件开头添加注释说明文件的用途和职责`,
				codeExample: `/**\n * 文件用途说明\n * 描述这个样式文件的主要功能和使用场景\n */\n\n/* 现有代码 */`,
			});
		}
	}

	/**
	 * 检查分隔注释
	 * 需求 4.1, 5.1: 样式文件应使用分隔注释标记主要部分
	 */
	private checkSectionSeparators(content: string, filePath: string, issues: Issue[]): void {
		const lines = content.split("\n");

		// 常见的分隔注释模式
		const separatorPatterns = [
			/^\/\*\s*={3,}\s*\*\//, // /* === */
			/^\/\*\s*-{3,}\s*\*\//, // /* --- */
			/^\/\*\s*[A-Z\u4e00-\u9fa5].*\s*\*\//, // /* 标题 */
		];

		// 统计分隔注释的数量
		let separatorCount = 0;
		const separatorStyles = new Set<string>();

		for (const line of lines) {
			const trimmed = line.trim();

			for (const pattern of separatorPatterns) {
				if (pattern.test(trimmed)) {
					separatorCount++;
					separatorStyles.add(trimmed);
					break;
				}
			}
		}

		// 如果文件较长(超过 100 行)但没有分隔注释,提示添加
		if (lines.length > 100 && separatorCount === 0) {
			issues.push({
				severity: "minor",
				category: "organization",
				message: `文件 "${filePath}" 较长但缺少分隔注释,建议添加部分标记`,
				location: { file: filePath, line: 1, column: 1 },
				suggestion: `使用分隔注释将文件分为逻辑部分,如变量、基础样式、工具类、组件等`,
				codeExample: `/* ============================================================================\n   变量定义\n   ============================================================================ */\n\n/* 变量代码 */\n\n/* ============================================================================\n   工具类\n   ============================================================================ */\n\n/* 工具类代码 */`,
			});
		}

		// 如果使用了多种不同的分隔注释样式,提示统一
		if (separatorStyles.size > 2) {
			issues.push({
				severity: "minor",
				category: "organization",
				message: `文件 "${filePath}" 使用了多种不同的分隔注释样式,建议统一格式`,
				location: { file: filePath, line: 1, column: 1 },
				suggestion: `选择一种分隔注释格式并在整个文件中保持一致`,
				codeExample: `/* 推荐使用统一的格式 */\n/* ============================================================================\n   部分标题\n   ============================================================================ */`,
			});
		}
	}

	/**
	 * 检查规则分组的逻辑性
	 * 需求 5.1, 5.2: 样式规则应按逻辑分组
	 */
	private checkRuleGrouping(content: string, filePath: string, issues: Issue[]): void {
		// 检查是否有明显的无序规则
		// 例如:变量定义散落在文件各处,而不是集中在顶部

		const lines = content.split("\n");
		const variableLines: number[] = [];
		const ruleLines: number[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// 检测 CSS 变量定义
			if (line.includes("--") && line.includes(":") && !line.startsWith("//")) {
				variableLines.push(i + 1);
			}

			// 检测普通规则(简化检测)
			if (line.match(/^[.#a-z]/i) && line.includes("{")) {
				ruleLines.push(i + 1);
			}
		}

		// 如果变量定义散落在规则之间,提示重新组织
		if (variableLines.length > 0 && ruleLines.length > 0) {
			const firstRule = Math.min(...ruleLines);
			const lastVariable = Math.max(...variableLines);

			if (lastVariable > firstRule) {
				issues.push({
					severity: "minor",
					category: "organization",
					message: `文件 "${filePath}" 中的 CSS 变量定义散落在规则之间,建议集中在文件顶部`,
					location: { file: filePath, line: lastVariable, column: 1 },
					suggestion: `将所有 CSS 变量定义移到文件顶部,在其他规则之前`,
					codeExample: `/* 推荐的组织结构 */\n:root {\n  /* 所有变量定义 */\n  --color-primary: #667eea;\n  --spacing-md: 16px;\n}\n\n/* 然后是其他规则 */\n.class {\n  /* ... */\n}`,
				});
			}
		}
	}

	/**
	 * 检查媒体查询位置
	 * 需求 5.3: 媒体查询应放置在相关规则附近或文件末尾
	 */
	private checkMediaQueryPlacement(content: string, filePath: string, issues: Issue[]): void {
		const lines = content.split("\n");
		const mediaQueryLines: number[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (line.startsWith("@media")) {
				mediaQueryLines.push(i + 1);
			}
		}

		// 如果有多个媒体查询,检查它们是否分散
		if (mediaQueryLines.length > 1) {
			// 计算媒体查询之间的平均距离
			let totalDistance = 0;
			for (let i = 1; i < mediaQueryLines.length; i++) {
				totalDistance += mediaQueryLines[i] - mediaQueryLines[i - 1];
			}
			const avgDistance = totalDistance / (mediaQueryLines.length - 1);

			// 如果平均距离很大(超过 50 行),可能分散得太开
			if (avgDistance > 50) {
				issues.push({
					severity: "minor",
					category: "organization",
					message: `文件 "${filePath}" 中的媒体查询分散在文件各处,建议集中管理`,
					location: { file: filePath, line: mediaQueryLines[0], column: 1 },
					suggestion: `考虑将媒体查询集中在文件末尾,或紧跟在相关规则之后`,
					codeExample: `/* 选项 1: 集中在文件末尾 */\n/* 所有常规规则 */\n\n/* ============================================================================\n   响应式样式\n   ============================================================================ */\n@media (max-width: 768px) {\n  /* ... */\n}\n\n/* 选项 2: 紧跟相关规则 */\n.component {\n  /* ... */\n}\n\n@media (max-width: 768px) {\n  .component {\n    /* ... */\n  }\n}`,
				});
			}
		}
	}

	/**
	 * 检查深色模式样式组织
	 * 需求 5.5, 7.2: 深色模式样式应使用一致的位置
	 */
	private checkDarkModeOrganization(content: string, filePath: string, issues: Issue[]): void {
		const lines = content.split("\n");
		const darkModeLines: number[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// 检测深色模式选择器
			if (
				line.includes(".dark-mode") ||
				line.includes("[data-theme='dark']") ||
				line.includes("@media (prefers-color-scheme: dark)")
			) {
				darkModeLines.push(i + 1);
			}
		}

		// 如果有多个深色模式定义,检查组织方式
		if (darkModeLines.length > 1) {
			// 检查是否集中在一起
			const isGrouped = darkModeLines.every((line, i) => {
				if (i === 0) return true;
				return line - darkModeLines[i - 1] < 20; // 相邻定义不超过 20 行
			});

			if (!isGrouped) {
				issues.push({
					severity: "minor",
					category: "organization",
					message: `文件 "${filePath}" 中的深色模式样式分散在多处,建议统一组织`,
					location: { file: filePath, line: darkModeLines[0], column: 1 },
					suggestion: `选择一种深色模式组织方式并保持一致:集中覆盖变量或内联在相关规则旁`,
					codeExample: `/* 选项 1: 集中覆盖变量 */\n:root.dark-mode {\n  --color-bg: #1a1a1a;\n  --color-text: #ffffff;\n  /* 所有深色模式变量 */\n}\n\n/* 选项 2: 内联在相关规则旁 */\n.component {\n  background: var(--color-bg);\n}\n\n.dark-mode .component {\n  /* 深色模式特定样式 */\n}`,
				});
			}
		}
	}
}

/**
 * 创建响应式检查器实例
 */
export function createResponsiveChecker(): ResponsiveChecker {
	return new ResponsiveChecker();
}
