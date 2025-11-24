/**
 * 样式审查工具的默认配置
 */

import type { StyleStandards } from "./types";

/**
 * 默认样式标准配置
 */
export const defaultStyleStandards: StyleStandards = {
	naming: {
		variableFormat: "kebab-case",
		classFormat: "kebab-case",
		animationFormat: "kebab-case",

		variablePrefixes: {
			color: ["--text-", "--bg-", "--border-", "--shadow-"],
			spacing: ["--spacing-"],
			typography: ["--font-", "--line-height-"],
			animation: ["--duration-", "--ease-"],
		},

		classPrefixes: {
			utility: ["m-", "p-", "text-", "font-", "gap-"],
			button: ["btn-"],
			tag: ["tag-", "badge-"],
		},
	},

	organization: {
		sectionOrder: ["variables", "base", "utilities", "components", "responsive"],
		commentStyle: "block",
		sectionSeparator: "/* ========================================== */",
		requireFileHeader: true,
	},

	accessibility: {
		minContrastRatio: 4.5, // WCAG AA 标准
		requireFocusStyles: true,
		requireReducedMotion: true,
		minTouchTarget: 44, // 44px 最小触摸目标
	},

	performance: {
		maxSelectorDepth: 3,
		avoidImportant: true,
		preferTransform: true,
	},
};

/**
 * 项目扫描配置
 */
export const scanConfig = {
	// 要扫描的目录
	includeDirs: ["src"],

	// 要排除的目录
	excludeDirs: ["node_modules", "dist", ".git", ".kiro"],

	// CSS 文件模式
	cssFilePattern: /\.css$/,

	// Vue 组件文件模式
	vueFilePattern: /\.vue$/,

	// 全局样式文件路径
	globalStylePaths: ["src/style.css"],

	// 工具样式文件路径模式
	utilityStylePattern: /src\/utils\/.*\.css$/,
};

/**
 * 报告配置
 */
export const reportConfig = {
	// 报告输出目录
	outputDir: "style-audit-reports",

	// 默认报告格式
	defaultFormat: "markdown" as const,

	// 是否包含代码示例
	includeCodeExamples: true,

	// 是否生成修复计划
	generateFixPlan: true,
};
