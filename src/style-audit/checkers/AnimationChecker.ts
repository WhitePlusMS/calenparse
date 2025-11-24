/**
 * 动画和可访问性检查器
 * 验证动画时长、缓动函数、prefers-reduced-motion 支持和焦点样式
 */

import type { ParsedCSS, Issue, CSSProperty, CSSClass, CSSAnimation } from "../types";

/**
 * 动画检查器类
 */
export class AnimationChecker {
	/**
	 * 检查动画时长和缓动函数
	 * 需求 9.1, 9.2, 9.3: 过渡效果和缓动函数应使用预定义变量,关键帧动画应使用 kebab-case 命名
	 */
	checkAnimationVariables(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 检查所有类中的动画相关属性
		for (const cssClass of css.classes) {
			// 检查 transition 和 transition-duration
			this.checkTransitionDuration(cssClass, issues);

			// 检查 transition-timing-function 和 animation-timing-function
			this.checkTimingFunction(cssClass, issues);

			// 检查 animation-duration
			this.checkAnimationDuration(cssClass, issues);
		}

		// 检查关键帧动画命名
		this.checkKeyframeNaming(css.animations, issues);

		return issues;
	}

	/**
	 * 检查过渡时长是否使用变量
	 */
	private checkTransitionDuration(cssClass: CSSClass, issues: Issue[]): void {
		const transitionProps = cssClass.properties.filter(
			(p) => p.name === "transition" || p.name === "transition-duration"
		);

		for (const prop of transitionProps) {
			// 检查是否使用了硬编码的时长值
			const hasHardcodedDuration = this.hasHardcodedDuration(prop.value);

			if (hasHardcodedDuration) {
				issues.push({
					severity: "moderate",
					category: "best-practice",
					message: `类 "${cssClass.name}" 的 "${prop.name}" 使用了硬编码的时长值,应使用预定义的时长变量`,
					location: cssClass.location,
					suggestion: `使用 CSS 变量引用时长,例如: var(--duration-fast), var(--duration-normal)`,
					codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${prop.name}: ${prop.value};\n}\n\n/* 建议 */\n.${cssClass.name} {\n  ${prop.name}: var(--duration-normal);\n}`,
				});
			}
		}
	}

	/**
	 * 检查缓动函数是否使用变量
	 */
	private checkTimingFunction(cssClass: CSSClass, issues: Issue[]): void {
		const timingProps = cssClass.properties.filter(
			(p) =>
				p.name === "transition-timing-function" ||
				p.name === "animation-timing-function" ||
				p.name === "transition"
		);

		for (const prop of timingProps) {
			// 检查是否使用了硬编码的缓动函数
			const hasHardcodedEasing = this.hasHardcodedEasing(prop.value);

			if (hasHardcodedEasing) {
				issues.push({
					severity: "minor",
					category: "best-practice",
					message: `类 "${cssClass.name}" 的 "${prop.name}" 使用了硬编码的缓动函数,应使用预定义的缓动变量`,
					location: cssClass.location,
					suggestion: `使用 CSS 变量引用缓动函数,例如: var(--ease-in-out), var(--ease-smooth)`,
					codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${prop.name}: ${prop.value};\n}\n\n/* 建议 */\n.${cssClass.name} {\n  ${prop.name}: var(--ease-in-out);\n}`,
				});
			}
		}
	}

	/**
	 * 检查动画时长是否使用变量
	 */
	private checkAnimationDuration(cssClass: CSSClass, issues: Issue[]): void {
		const animationProps = cssClass.properties.filter(
			(p) => p.name === "animation" || p.name === "animation-duration"
		);

		for (const prop of animationProps) {
			const hasHardcodedDuration = this.hasHardcodedDuration(prop.value);

			if (hasHardcodedDuration) {
				issues.push({
					severity: "moderate",
					category: "best-practice",
					message: `类 "${cssClass.name}" 的 "${prop.name}" 使用了硬编码的时长值,应使用预定义的时长变量`,
					location: cssClass.location,
					suggestion: `使用 CSS 变量引用时长,例如: var(--duration-slow), var(--duration-normal)`,
					codeExample: `/* 当前 */\n.${cssClass.name} {\n  ${prop.name}: ${prop.value};\n}\n\n/* 建议 */\n.${cssClass.name} {\n  ${prop.name}: var(--duration-normal);\n}`,
				});
			}
		}
	}

	/**
	 * 检查关键帧动画命名约定
	 */
	private checkKeyframeNaming(animations: CSSAnimation[], issues: Issue[]): void {
		const kebabCasePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

		for (const animation of animations) {
			if (!kebabCasePattern.test(animation.name)) {
				issues.push({
					severity: "minor",
					category: "naming",
					message: `关键帧动画 "${animation.name}" 未使用 kebab-case 命名格式`,
					location: animation.location,
					suggestion: `使用 kebab-case 格式命名动画,例如: fade-in, slide-up, bounce-effect`,
					codeExample: `/* 当前 */\n@keyframes ${
						animation.name
					} {\n  /* ... */\n}\n\n/* 建议 */\n@keyframes ${this.toKebabCase(
						animation.name
					)} {\n  /* ... */\n}`,
				});
			}
		}
	}

	/**
	 * 检查值中是否包含硬编码的时长
	 */
	private hasHardcodedDuration(value: string): boolean {
		// 如果已经使用了 var(),则不算硬编码
		if (value.includes("var(--duration-") || value.includes("var(--time-")) {
			return false;
		}

		// 检查是否包含时长单位(ms 或 s)
		const durationPattern = /\d+\.?\d*(ms|s)(?!\w)/;
		return durationPattern.test(value);
	}

	/**
	 * 检查值中是否包含硬编码的缓动函数
	 */
	private hasHardcodedEasing(value: string): boolean {
		// 如果已经使用了 var(),则不算硬编码
		if (value.includes("var(--ease-")) {
			return false;
		}

		// 常见的缓动函数关键字
		const easingKeywords = [
			"ease",
			"ease-in",
			"ease-out",
			"ease-in-out",
			"linear",
			"step-start",
			"step-end",
		];

		// 检查是否包含缓动关键字或 cubic-bezier
		const hasEasingKeyword = easingKeywords.some((keyword) => value.includes(keyword));
		const hasCubicBezier = value.includes("cubic-bezier");

		return hasEasingKeyword || hasCubicBezier;
	}

	/**
	 * 检查 prefers-reduced-motion 支持
	 * 需求 9.4, 11.3: 包含动画的样式应该有对应的 reduced-motion 媒体查询
	 */
	checkReducedMotionSupport(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 查找所有包含动画的类
		const animatedClasses = this.findAnimatedClasses(css.classes);

		if (animatedClasses.length === 0) {
			// 没有动画,不需要检查
			return issues;
		}

		// 检查是否存在 prefers-reduced-motion 媒体查询
		const hasReducedMotion = css.mediaQueries.some((mq) => mq.query.includes("prefers-reduced-motion"));

		if (!hasReducedMotion) {
			// 如果有动画但没有 reduced-motion 支持,报告问题
			issues.push({
				severity: "critical",
				category: "accessibility",
				message: `项目包含动画效果但缺少 prefers-reduced-motion 媒体查询支持`,
				location: animatedClasses[0].location,
				suggestion: `添加 @media (prefers-reduced-motion: reduce) 媒体查询,为用户提供减少动画的选项`,
				codeExample: `/* 添加在文件末尾或动画类附近 */\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n  }\n}`,
			});
		} else {
			// 有 reduced-motion 支持,检查覆盖是否完整
			const reducedMotionClasses = this.extractReducedMotionClasses(css.mediaQueries);

			// 检查每个动画类是否在 reduced-motion 中有对应处理
			for (const animatedClass of animatedClasses) {
				const isHandled = this.isClassHandledInReducedMotion(
					animatedClass.name,
					reducedMotionClasses
				);

				if (!isHandled) {
					issues.push({
						severity: "moderate",
						category: "accessibility",
						message: `动画类 "${animatedClass.name}" 在 prefers-reduced-motion 媒体查询中缺少对应处理`,
						location: animatedClass.location,
						suggestion: `在 @media (prefers-reduced-motion: reduce) 中添加该类的处理,禁用或减少动画效果`,
						codeExample: `@media (prefers-reduced-motion: reduce) {\n  .${animatedClass.name} {\n    animation: none;\n    transition: none;\n  }\n}`,
					});
				}
			}
		}

		return issues;
	}

	/**
	 * 查找所有包含动画的类
	 */
	private findAnimatedClasses(classes: CSSClass[]): CSSClass[] {
		const animationProperties = [
			"animation",
			"animation-name",
			"animation-duration",
			"transition",
			"transition-property",
			"transition-duration",
			"transform",
		];

		return classes.filter((cssClass) =>
			cssClass.properties.some((prop) => animationProperties.includes(prop.name))
		);
	}

	/**
	 * 从媒体查询中提取 reduced-motion 处理的类名
	 */
	private extractReducedMotionClasses(mediaQueries: any[]): Set<string> {
		const classes = new Set<string>();

		for (const mq of mediaQueries) {
			if (mq.query.includes("prefers-reduced-motion")) {
				// 提取类名(简化版,匹配 .classname 模式)
				const classMatches = mq.content.matchAll(/\.([a-z0-9_-]+)/gi);
				for (const match of classMatches) {
					classes.add(match[1]);
				}

				// 如果使用了通配符 *,则认为所有类都被处理了
				if (mq.content.includes("*")) {
					return new Set(["*"]);
				}
			}
		}

		return classes;
	}

	/**
	 * 检查类是否在 reduced-motion 中被处理
	 */
	private isClassHandledInReducedMotion(className: string, reducedMotionClasses: Set<string>): boolean {
		// 如果使用了通配符,则所有类都被处理
		if (reducedMotionClasses.has("*")) {
			return true;
		}

		// 检查类名是否在集合中
		return reducedMotionClasses.has(className);
	}

	/**
	 * 检查焦点样式
	 * 需求 11.1: 所有交互式元素应该定义清晰可见的焦点样式
	 */
	checkFocusStyles(css: ParsedCSS): Issue[] {
		const issues: Issue[] = [];

		// 定义交互式元素选择器
		const interactiveElements = [
			"button",
			"a",
			"input",
			"textarea",
			"select",
			'[role="button"]',
			"[tabindex]",
		];

		// 查找所有交互式元素的选择器
		const interactiveSelectors = css.selectors.filter((sel) =>
			interactiveElements.some((elem) => sel.selector.includes(elem))
		);

		// 查找所有焦点样式选择器
		const focusSelectors = css.selectors.filter(
			(sel) => sel.selector.includes(":focus") || sel.selector.includes(":focus-visible")
		);

		// 如果有交互式元素但没有焦点样式,报告问题
		if (interactiveSelectors.length > 0 && focusSelectors.length === 0) {
			issues.push({
				severity: "critical",
				category: "accessibility",
				message: `项目包含交互式元素但缺少焦点样式定义`,
				location: interactiveSelectors[0].location,
				suggestion: `为所有交互式元素添加清晰可见的焦点样式,使用 :focus 或 :focus-visible 伪类`,
				codeExample: `/* 添加全局焦点样式 */\nbutton:focus,\na:focus,\ninput:focus,\ntextarea:focus,\nselect:focus {\n  outline: 2px solid var(--color-primary);\n  outline-offset: 2px;\n}\n\n/* 或使用 :focus-visible 仅在键盘导航时显示 */\nbutton:focus-visible {\n  outline: 2px solid var(--color-primary);\n  outline-offset: 2px;\n}`,
			});
		}

		// 检查焦点样式的可见性
		for (const focusSelector of focusSelectors) {
			// 查找对应的类定义
			const focusClass = css.classes.find((c) => focusSelector.selector.includes(`.${c.name}`));

			if (focusClass) {
				const hasVisibleFocus = this.hasVisibleFocusStyle(focusClass.properties);

				if (!hasVisibleFocus) {
					issues.push({
						severity: "moderate",
						category: "accessibility",
						message: `焦点样式 "${focusSelector.selector}" 可能不够明显或被禁用`,
						location: focusSelector.location,
						suggestion: `确保焦点样式清晰可见,避免使用 outline: none 而不提供替代样式`,
						codeExample: `/* 不推荐 */\n${focusSelector.selector} {\n  outline: none;\n}\n\n/* 推荐 */\n${focusSelector.selector} {\n  outline: 2px solid var(--color-primary);\n  outline-offset: 2px;\n}`,
					});
				}
			}
		}

		// 检查是否有禁用焦点样式的情况
		this.checkDisabledFocusStyles(css.classes, issues);

		return issues;
	}

	/**
	 * 检查属性中是否有可见的焦点样式
	 */
	private hasVisibleFocusStyle(properties: CSSProperty[]): boolean {
		// 检查是否有 outline 或 box-shadow 等可见样式
		const focusStyleProps = ["outline", "box-shadow", "border", "background", "background-color"];

		for (const prop of properties) {
			if (focusStyleProps.includes(prop.name)) {
				// 如果是 outline: none 或 outline: 0,则不算可见
				if (prop.name === "outline" && (prop.value === "none" || prop.value === "0")) {
					return false;
				}

				// 其他情况认为有可见样式
				return true;
			}
		}

		return false;
	}

	/**
	 * 检查是否有禁用焦点样式的情况
	 */
	private checkDisabledFocusStyles(classes: CSSClass[], issues: Issue[]): void {
		for (const cssClass of classes) {
			const outlineProp = cssClass.properties.find((p) => p.name === "outline");

			if (outlineProp && (outlineProp.value === "none" || outlineProp.value === "0")) {
				// 检查类名是否暗示这是焦点样式
				const isFocusRelated =
					cssClass.name.includes("focus") ||
					cssClass.name.includes("active") ||
					cssClass.name.includes("hover");

				if (isFocusRelated) {
					issues.push({
						severity: "moderate",
						category: "accessibility",
						message: `类 "${cssClass.name}" 禁用了 outline,可能影响键盘导航的可访问性`,
						location: cssClass.location,
						suggestion: `如果禁用 outline,请提供替代的焦点指示器(如 box-shadow 或 border)`,
						codeExample: `/* 当前 */\n.${cssClass.name} {\n  outline: none;\n}\n\n/* 建议 */\n.${cssClass.name} {\n  outline: none;\n  box-shadow: 0 0 0 2px var(--color-primary);\n}`,
					});
				}
			}
		}
	}

	/**
	 * 将字符串转换为 kebab-case
	 */
	private toKebabCase(str: string): string {
		return str
			.replace(/([a-z])([A-Z])/g, "$1-$2")
			.replace(/[\s_]+/g, "-")
			.toLowerCase();
	}
}

/**
 * 创建动画检查器实例
 */
export function createAnimationChecker(): AnimationChecker {
	return new AnimationChecker();
}
