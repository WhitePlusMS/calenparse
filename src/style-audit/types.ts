/**
 * 样式审查工具的核心类型定义
 */

// ============================================================================
// 文件和位置相关类型
// ============================================================================

/**
 * 文件类别
 */
export type FileCategory = "global" | "utility" | "component";

/**
 * 代码位置信息
 */
export interface Location {
	file: string;
	line: number;
	column: number;
}

/**
 * 样式文件清单
 */
export interface StyleFileInventory {
	globalStyles: string[]; // 全局样式文件
	utilityStyles: string[]; // 工具样式文件
	componentStyles: string[]; // 包含样式的组件文件
}

// ============================================================================
// CSS 解析相关类型
// ============================================================================

/**
 * CSS 变量
 */
export interface CSSVariable {
	name: string;
	value: string;
	location: Location;
	category?: "color" | "spacing" | "typography" | "animation" | "other";
}

/**
 * CSS 属性
 */
export interface CSSProperty {
	name: string;
	value: string;
}

/**
 * CSS 类
 */
export interface CSSClass {
	name: string;
	properties: CSSProperty[];
	location: Location;
	type?: "utility" | "component" | "modifier";
}

/**
 * CSS 选择器
 */
export interface CSSSelector {
	selector: string;
	specificity: number;
	location: Location;
}

/**
 * CSS 动画
 */
export interface CSSAnimation {
	name: string;
	keyframes: string;
	location: Location;
}

/**
 * 媒体查询
 */
export interface MediaQuery {
	query: string;
	content: string;
	location: Location;
}

/**
 * 解析后的 CSS
 */
export interface ParsedCSS {
	variables: CSSVariable[];
	classes: CSSClass[];
	selectors: CSSSelector[];
	animations: CSSAnimation[];
	mediaQueries: MediaQuery[];
}

// ============================================================================
// 问题和报告相关类型
// ============================================================================

/**
 * 问题严重性
 */
export type Severity = "critical" | "moderate" | "minor";

/**
 * 问题类别
 */
export type IssueCategory =
	| "naming"
	| "organization"
	| "accessibility"
	| "performance"
	| "duplication"
	| "unused"
	| "best-practice";

/**
 * 审查问题
 */
export interface Issue {
	severity: Severity;
	category: IssueCategory;
	message: string;
	location: Location;
	suggestion?: string;
	codeExample?: string;
}

/**
 * 报告摘要
 */
export interface ReportSummary {
	totalFiles: number;
	totalIssues: number;
	criticalIssues: number;
	moderateIssues: number;
	minorIssues: number;
	filesWithIssues: number;
}

/**
 * 审查报告
 */
export interface AuditReport {
	summary: ReportSummary;
	issuesByCategory: Map<IssueCategory, Issue[]>;
	issuesBySeverity: Map<Severity, Issue[]>;
	issuesByFile: Map<string, Issue[]>;
	recommendations: Recommendation[];
}

/**
 * 建议
 */
export interface Recommendation {
	title: string;
	description: string;
	priority: number;
}

/**
 * 修复任务
 */
export interface FixTask {
	id: string;
	title: string;
	description: string;
	priority: number;
	relatedIssues: Issue[];
	estimatedTime: string;
}

/**
 * 修复计划
 */
export interface FixPlan {
	tasks: FixTask[];
	estimatedEffort: string;
	priorityOrder: string[];
}

// ============================================================================
// 样式标准定义
// ============================================================================

/**
 * 命名标准
 */
export interface NamingStandards {
	variableFormat: "kebab-case";
	classFormat: "kebab-case" | "BEM";
	animationFormat: "kebab-case";

	variablePrefixes: {
		color: string[]; // ['--text-', '--bg-', '--border-']
		spacing: string[]; // ['--spacing-']
		typography: string[]; // ['--font-', '--line-height-']
		animation: string[]; // ['--duration-', '--ease-']
	};

	classPrefixes: {
		utility: string[]; // ['m-', 'p-', 'text-', 'font-']
		button: string[]; // ['btn-']
		tag: string[]; // ['tag-', 'badge-']
	};
}

/**
 * 组织标准
 */
export interface OrganizationStandards {
	sectionOrder: string[]; // ['variables', 'base', 'utilities', 'components', 'responsive']
	commentStyle: "block" | "line";
	sectionSeparator: string;
	requireFileHeader: boolean;
}

/**
 * 可访问性标准
 */
export interface AccessibilityStandards {
	minContrastRatio: number; // 4.5 for WCAG AA
	requireFocusStyles: boolean;
	requireReducedMotion: boolean;
	minTouchTarget: number; // 44px
}

/**
 * 性能标准
 */
export interface PerformanceStandards {
	maxSelectorDepth: number;
	avoidImportant: boolean;
	preferTransform: boolean;
}

/**
 * 样式标准
 */
export interface StyleStandards {
	naming: NamingStandards;
	organization: OrganizationStandards;
	accessibility: AccessibilityStandards;
	performance: PerformanceStandards;
}

// ============================================================================
// 组件接口
// ============================================================================

/**
 * 样式文件扫描器接口
 */
export interface StyleFileScanner {
	scanProject(): Promise<StyleFileInventory>;
	categorizeFile(path: string): FileCategory;
}

/**
 * CSS 解析器接口
 */
export interface CSSParser {
	parse(content: string): Promise<ParsedCSS>;
	extractVariables(content: string): CSSVariable[];
	extractClasses(content: string): CSSClass[];
	extractSelectors(content: string): CSSSelector[];
}

/**
 * 一致性检查器接口
 */
export interface ConsistencyChecker {
	checkNamingConventions(elements: (CSSVariable | CSSClass)[]): Issue[];
	checkVariableUsage(css: ParsedCSS): Issue[];
	checkColorContrast(css: ParsedCSS): Issue[];
	checkAccessibility(css: ParsedCSS): Issue[];
	checkOrganization(content: string, filePath: string): Issue[];
}

/**
 * 报告生成器接口
 */
export interface ReportGenerator {
	generateReport(issues: Issue[]): AuditReport;
	generateFixPlan(issues: Issue[]): FixPlan;
	exportReport(report: AuditReport, format: "markdown" | "html" | "json"): string;
}

/**
 * 颜色使用信息
 */
export interface ColorUsage {
	color: string;
	backgroundColor: string;
	location: Location;
}

/**
 * 样式文件信息
 */
export interface StyleFile {
	path: string;
	content: string;
	category: FileCategory;
}
