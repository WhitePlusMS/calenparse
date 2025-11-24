/**
 * 代码质量检查器
 * 检查选择器特异性、!important 使用、浏览器前缀等代码质量问题
 */

import type { CSSSelector, CSSClass, ParsedCSS, Issue, CSSProperty } from "../types";

/**
 * 质量检查配置常量
 */
const QUALITY_THRESHOLDS = {
	MAX_UTILITY_SPECIFICITY: 10, // 工具类最大特异性
	MAX_SELECTOR_DEPTH: 3, // 选择器最大嵌套深度
	SPECIFICITY_WEIGHTS: {
		ID: 100,
		CLASS: 10,
		ELEMENT: 1,
	},
} as const;

/**
 * 不必要的浏览器前缀列表
 */
const UNNECESSARY_VENDOR_PREFIXES = [
	"-webkit-border-radius",
	"-moz-border-radius",
	"-webkit-box-shadow",
	"-moz-box-shadow",
	"-webkit-transition",
	"-moz-transition",
	"-o-transition",
	"-webkit-transform",
	"-moz-transform",
	"-o-transform",
	"-ms-transform",
] as const;

/**
 * 代码质量检查器类
 */
export class QualityChecker {
	/**
	 * 检查选择器特异性
	 * 需求: 6.1, 6.2, 6.3, 6.4, 6.5
	 */
	checkSelectorSpecificity(selectors: CSSSelector[], classes: CSSClass[]): Issue[] {
		const issues: Issue[] = [];

		for (const selector of selectors) {
			// 计算特异性分数
			const specificity = this.calculateSpecificity(selector.selector);

			// 检查工具类是否使用单一类选择器
			const isUtilityClass = classes.some(
				(cls) => cls.type === "utility" && selector.selector.includes(`.${cls.name}`)
			);

			if (isUtilityClass && specificity.total > QUALITY_THRESHOLDS.MAX_UTILITY_SPECIFICITY) {
				issues.push({
					severity: "moderate",
					category: "best-practice",
					message: `工具类选择器 "${selector.selector}" 特异性过高 (${specificity.total}),应使用单一类选择器`,
					location: selector.location,
					suggestion: "工具类应该使用单一类选择器,避免不必要的嵌套或组合",
					codeExample: `/* 避免 */\ndiv.container .m-md { ... }\n\n/* 推荐 */\n.m-md { ... }`,
				});
			}

			// 检测过度嵌套的选择器
			const depth = this.calculateSelectorDepth(selector.selector);
			if (depth > QUALITY_THRESHOLDS.MAX_SELECTOR_DEPTH) {
				issues.push({
					severity: "moderate",
					category: "best-practice",
					message: `选择器 "${selector.selector}" 嵌套深度过深 (${depth} 层),建议不超过 ${QUALITY_THRESHOLDS.MAX_SELECTOR_DEPTH} 层`,
					location: selector.location,
					suggestion: "减少选择器嵌套深度,使用更扁平的结构或 BEM 命名",
					codeExample: `/* 避免 */\n.nav .menu .item .link .icon { ... }\n\n/* 推荐 */\n.nav__link-icon { ... }`,
				});
			}

			// 识别不必要的 ID 选择器
			if (this.hasIDSelector(selector.selector)) {
				issues.push({
					severity: "minor",
					category: "best-practice",
					message: `选择器 "${selector.selector}" 使用了 ID 选择器,应仅用于唯一元素且有充分理由`,
					location: selector.location,
					suggestion: "优先使用类选择器,ID 选择器会增加特异性并降低可重用性",
					codeExample: `/* 避免 */\n#header .nav { ... }\n\n/* 推荐 */\n.header .nav { ... }`,
				});
			}
		}

		return issues;
	}

	/**
	 * 检测 !important 的使用
	 * 需求: 12.1
	 */
	checkImportantUsage(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		for (const cssClass of css.classes) {
			for (const prop of cssClass.properties) {
				if (prop.value.includes("!important")) {
					issues.push({
						severity: "moderate",
						category: "best-practice",
						message: `属性 "${prop.name}" 使用了 !important,应避免使用除非绝对必要`,
						location: cssClass.location,
						suggestion: "通过提高选择器特异性或重新组织样式来避免使用 !important",
						codeExample: `/* 避免 */\n.btn { color: red !important; }\n\n/* 推荐 */\n.btn-primary { color: red; }`,
					});
				}
			}
		}

		return issues;
	}

	/**
	 * 识别不必要的浏览器前缀
	 * 需求: 12.2
	 */
	checkVendorPrefixes(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		for (const cssClass of css.classes) {
			for (const prop of cssClass.properties) {
				if (UNNECESSARY_VENDOR_PREFIXES.includes(prop.name as any)) {
					issues.push({
						severity: "minor",
						category: "best-practice",
						message: `属性 "${prop.name}" 使用了不必要的浏览器前缀`,
						location: cssClass.location,
						suggestion: "现代浏览器已支持标准属性,可以移除前缀版本",
						codeExample: `/* 不必要 */\n${prop.name}: ${
							prop.value
						};\n\n/* 使用标准属性 */\n${prop.name.replace(/^-\w+-/, "")}: ${
							prop.value
						};`,
					});
				}
			}
		}

		return issues;
	}

	/**
	 * 检测重复的样式模式
	 * 需求: 12.3
	 */
	checkDuplicatePatterns(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 按属性组合分组类
		const patternMap = new Map<string, CSSClass[]>();

		for (const cssClass of css.classes) {
			// 创建属性签名 (排序后的属性名:值对)
			const signature = this.createPropertySignature(cssClass.properties);

			if (!patternMap.has(signature)) {
				patternMap.set(signature, []);
			}
			patternMap.get(signature)!.push(cssClass);
		}

		// 找出重复的模式
		for (const [, classes] of patternMap.entries()) {
			// 报告所有重复的模式(至少2个类有相同的属性)
			const firstClass = classes[0];
			if (classes.length > 1 && firstClass && firstClass.properties.length > 0) {
				this.reportDuplicatePattern(classes, issues);
			}
		}

		return issues;
	}

	/**
	 * 创建属性签名用于重复检测
	 */
	private createPropertySignature(properties: CSSProperty[]): string {
		return properties
			.map((p) => `${p.name}:${p.value}`)
			.sort()
			.join(";");
	}

	/**
	 * 报告重复的样式模式
	 */
	private reportDuplicatePattern(classes: CSSClass[], issues: Issue[]): void {
		const firstClass = classes[0];
		if (!firstClass) return;

		const classNames = classes.map((c) => `.${c.name}`).join(", ");
		const propertiesStr = firstClass.properties.map((p) => `${p.name}: ${p.value}`).join("; ");

		issues.push({
			severity: "minor",
			category: "duplication",
			message: `发现重复的样式模式: ${classNames}`,
			location: firstClass.location,
			suggestion: "考虑提取为可重用的类或使用 CSS 变量",
			codeExample: `/* 重复模式 */\n${classes
				.map((c) => `.${c.name} { ${propertiesStr} }`)
				.join("\n")}\n\n/* 提取为共享类 */\n.shared-style { ${propertiesStr} }`,
		});
	}

	/**
	 * 计算选择器特异性
	 * 返回 { ids, classes, elements, total }
	 */
	private calculateSpecificity(selector: string): {
		ids: number;
		classes: number;
		elements: number;
		total: number;
	} {
		// 移除伪元素和伪类中的内容,避免误判
		const cleanSelector = this.cleanSelectorForSpecificity(selector);

		// 计算 ID 选择器数量
		const ids = (cleanSelector.match(/#[\w-]+/g) || []).length;

		// 计算类选择器、属性选择器、伪类数量
		const classes =
			(cleanSelector.match(/\.[\w-]+/g) || []).length + // 类选择器
			(cleanSelector.match(/\[[\w-]+/g) || []).length + // 属性选择器
			(cleanSelector.match(/:[\w-]+/g) || []).length; // 伪类

		// 计算元素选择器数量
		const elements = (cleanSelector.match(/\b[a-z][\w-]*/gi) || []).filter(
			(match) => match !== "ATTR_PLACEHOLDER" // 排除我们的占位符
		).length;

		// 总特异性 (CSS 规范: a,b,c)
		const total =
			ids * QUALITY_THRESHOLDS.SPECIFICITY_WEIGHTS.ID +
			classes * QUALITY_THRESHOLDS.SPECIFICITY_WEIGHTS.CLASS +
			elements * QUALITY_THRESHOLDS.SPECIFICITY_WEIGHTS.ELEMENT;

		return { ids, classes, elements, total };
	}

	/**
	 * 清理选择器以便计算特异性
	 */
	private cleanSelectorForSpecificity(selector: string): string {
		return selector
			.replace(/:not\([^)]+\)/g, "") // 移除 :not()
			.replace(/::[\w-]+/g, "") // 移除伪元素
			.replace(/\[[\w-]+[~|^$*]?=?[^\]]*\]/g, "ATTR_PLACEHOLDER"); // 属性选择器计为类
	}

	/**
	 * 计算选择器嵌套深度
	 */
	private calculateSelectorDepth(selector: string): number {
		// 移除伪类和伪元素
		const cleanSelector = selector.replace(/::?[\w-]+(\([^)]*\))?/g, "");

		// 按组合符分割 (空格、>、+、~)
		const parts = cleanSelector.split(/[\s>+~]+/).filter((part) => part.trim().length > 0);

		return parts.length;
	}

	/**
	 * 检查选择器是否包含 ID 选择器
	 */
	private hasIDSelector(selector: string): boolean {
		return /#[\w-]+/.test(selector);
	}
}

/**
 * 创建代码质量检查器实例
 */
export function createQualityChecker(): QualityChecker {
	return new QualityChecker();
}
