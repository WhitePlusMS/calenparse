/**
 * 样式审查流程协调器
 * 负责协调所有审查阶段，处理数据传递和错误
 */

import type { StyleFileInventory, ParsedCSS, Issue, AuditReport, FixPlan, StyleStandards } from "../types";
import { StyleFileScannerImpl } from "../scanners/StyleFileScanner";
import { createCSSParser } from "../parsers/CSSParser";
import {
	createNamingChecker,
	createColorChecker,
	createSpacingChecker,
	createAnimationChecker,
	createResponsiveChecker,
	createQualityChecker,
	createCommentChecker,
} from "../checkers";
import { createReportGenerator } from "../reporters/ReportGenerator";
import { defaultStyleStandards, scanConfig } from "../config";
import { createConfigManager, type AuditConfig } from "../config/ConfigManager";
import * as fs from "fs";
import * as path from "path";

/**
 * 审查阶段
 */
export type AuditPhase = "discovery" | "parsing" | "checking" | "reporting" | "complete";

/**
 * 审查进度信息
 */
export interface AuditProgress {
	phase: AuditPhase;
	currentFile?: string;
	processedFiles: number;
	totalFiles: number;
	message: string;
}

/**
 * 审查选项
 */
export interface AuditOptions {
	projectRoot: string;
	standards?: Partial<StyleStandards>;
	onProgress?: (progress: AuditProgress) => void;
	outputDir?: string;
	reportFormat?: "markdown" | "html" | "json";
	loadConfig?: boolean; // 是否加载配置文件
}

/**
 * 审查结果
 */
export interface AuditResult {
	success: boolean;
	report?: AuditReport;
	fixPlan?: FixPlan;
	error?: Error;
}

/**
 * 样式审查流程协调器
 */
export class AuditOrchestrator {
	private projectRoot: string;
	private standards: StyleStandards;
	private onProgress?: (progress: AuditProgress) => void;
	private outputDir: string;
	private reportFormat: "markdown" | "html" | "json";
	private config?: AuditConfig;
	private loadConfig: boolean;

	constructor(options: AuditOptions) {
		this.projectRoot = options.projectRoot;
		this.standards = {
			...defaultStyleStandards,
			...options.standards,
		};
		this.onProgress = options.onProgress;
		this.outputDir = options.outputDir || "style-audit-reports";
		this.reportFormat = options.reportFormat || "markdown";
		this.loadConfig = options.loadConfig !== false; // 默认加载配置
	}

	/**
	 * 执行完整的审查流程
	 */
	async runAudit(): Promise<AuditResult> {
		try {
			// 加载配置（如果启用）
			if (this.loadConfig) {
				await this.loadProjectConfig();
			}

			// 阶段 1: 发现样式文件
			const inventory = await this.discoveryPhase();

			// 阶段 2: 解析样式内容
			const parsedFiles = await this.parsingPhase(inventory);

			// 阶段 3: 执行一致性检查
			const issues = await this.checkingPhase(parsedFiles);

			// 阶段 4: 生成报告
			const { report, fixPlan } = await this.reportingPhase(issues, parsedFiles.length);

			this.notifyProgress({
				phase: "complete",
				processedFiles: parsedFiles.length,
				totalFiles: parsedFiles.length,
				message: "审查完成",
			});

			return {
				success: true,
				report,
				fixPlan,
			};
		} catch (error) {
			return {
				success: false,
				error: error as Error,
			};
		}
	}

	/**
	 * 加载项目配置
	 */
	private async loadProjectConfig(): Promise<void> {
		const configManager = createConfigManager(this.projectRoot);
		this.config = await configManager.loadConfig();

		// 使用配置中的标准
		this.standards = this.config.standards;
		this.outputDir = this.config.report.outputDir;
		this.reportFormat = this.config.report.defaultFormat;
	}

	/**
	 * 阶段 1: 发现样式文件
	 */
	private async discoveryPhase(): Promise<StyleFileInventory> {
		this.notifyProgress({
			phase: "discovery",
			processedFiles: 0,
			totalFiles: 0,
			message: "正在扫描项目文件...",
		});

		const scanner = new StyleFileScannerImpl(this.projectRoot);
		const inventory = await scanner.scanProject();

		const totalFiles =
			inventory.globalStyles.length +
			inventory.utilityStyles.length +
			inventory.componentStyles.length;

		this.notifyProgress({
			phase: "discovery",
			processedFiles: totalFiles,
			totalFiles,
			message: `发现 ${totalFiles} 个样式文件`,
		});

		return inventory;
	}

	/**
	 * 阶段 2: 解析样式内容
	 */
	private async parsingPhase(
		inventory: StyleFileInventory
	): Promise<Array<{ file: string; parsed: ParsedCSS; content: string }>> {
		const allFiles = [...inventory.globalStyles, ...inventory.utilityStyles, ...inventory.componentStyles];

		this.notifyProgress({
			phase: "parsing",
			processedFiles: 0,
			totalFiles: allFiles.length,
			message: "正在解析样式文件...",
		});

		const parser = createCSSParser();
		const scanner = new StyleFileScannerImpl(this.projectRoot);
		const parsedFiles: Array<{
			file: string;
			parsed: ParsedCSS;
			content: string;
		}> = [];

		for (let i = 0; i < allFiles.length; i++) {
			const file = allFiles[i];
			try {
				const fullPath = path.join(this.projectRoot, file);
				// 使用 scanner.getStyleContent 来正确提取 Vue 文件中的样式内容
				const content = scanner.getStyleContent(fullPath);
				const parsed = await parser.parse(content, file);

				parsedFiles.push({ file, parsed, content });

				this.notifyProgress({
					phase: "parsing",
					currentFile: file,
					processedFiles: i + 1,
					totalFiles: allFiles.length,
					message: `正在解析: ${file}`,
				});
			} catch (error) {
				console.error(`解析文件失败: ${file}`, error);
				// 继续处理其他文件
			}
		}

		return parsedFiles;
	}

	/**
	 * 阶段 3: 执行一致性检查
	 */
	private async checkingPhase(
		parsedFiles: Array<{ file: string; parsed: ParsedCSS; content: string }>
	): Promise<Issue[]> {
		this.notifyProgress({
			phase: "checking",
			processedFiles: 0,
			totalFiles: parsedFiles.length,
			message: "正在执行一致性检查...",
		});

		const allIssues: Issue[] = [];

		// 创建所有检查器
		const namingChecker = createNamingChecker(this.standards.naming);
		const colorChecker = createColorChecker(this.standards.accessibility);
		const spacingChecker = createSpacingChecker(this.standards);
		const animationChecker = createAnimationChecker(this.standards);
		const responsiveChecker = createResponsiveChecker(this.standards);
		const qualityChecker = createQualityChecker(this.standards.performance);
		const commentChecker = createCommentChecker(this.standards.organization);

		for (let i = 0; i < parsedFiles.length; i++) {
			const { file, parsed, content } = parsedFiles[i];

			try {
				// 根据配置执行各项检查
				const rules = this.config?.rules || {
					naming: true,
					color: true,
					spacing: true,
					animation: true,
					responsive: true,
					quality: true,
					comment: true,
				};

				if (rules.naming) {
					const variableIssues = namingChecker.checkVariableNaming(parsed.variables);
					const classIssues = namingChecker.checkUtilityClassNaming(parsed.classes);
					allIssues.push(...variableIssues, ...classIssues);
				}

				if (rules.color) {
					const colorVarIssues = colorChecker.checkColorVariableUsage(parsed);
					const contrastIssues = colorChecker.checkColorContrast(parsed);
					const darkModeIssues = colorChecker.checkDarkModeConsistency(parsed);
					allIssues.push(...colorVarIssues, ...contrastIssues, ...darkModeIssues);
				}

				if (rules.spacing) {
					const spacingIssues = spacingChecker.checkSpacingStandardization(parsed);
					const fontBorderIssues = spacingChecker.checkFontAndBorderRadius(parsed);
					allIssues.push(...spacingIssues, ...fontBorderIssues);
				}

				if (rules.animation) {
					const animationVarIssues = animationChecker.checkAnimationVariables(parsed);
					const reducedMotionIssues = animationChecker.checkReducedMotionSupport(parsed);
					const focusIssues = animationChecker.checkFocusStyles(parsed);
					allIssues.push(...animationVarIssues, ...reducedMotionIssues, ...focusIssues);
				}

				if (rules.responsive) {
					const breakpointIssues = responsiveChecker.checkBreakpointConsistency(parsed);
					const touchTargetIssues = responsiveChecker.checkTouchTargetSize(parsed);
					const orgIssues = responsiveChecker.checkStyleOrganization(content, file);
					allIssues.push(...breakpointIssues, ...touchTargetIssues, ...orgIssues);
				}

				if (rules.quality) {
					const specificityIssues = qualityChecker.checkSelectorSpecificity(
						parsed.selectors,
						parsed.classes
					);
					const importantIssues = qualityChecker.checkImportantUsage(parsed);
					const prefixIssues = qualityChecker.checkVendorPrefixes(parsed);
					const duplicateIssues = qualityChecker.checkDuplicatePatterns(parsed);
					allIssues.push(
						...specificityIssues,
						...importantIssues,
						...prefixIssues,
						...duplicateIssues
					);
				}

				if (rules.comment) {
					const headerIssues = commentChecker.checkFileHeader(content, file);
					const separatorIssues = commentChecker.checkSectionSeparators(content, file);
					const refIssues = commentChecker.checkRequirementReferences(content, file);
					const langIssues = commentChecker.checkCommentLanguageConsistency(
						content,
						file
					);
					const styleIssues = commentChecker.checkCommentStyleConsistency(content, file);
					allIssues.push(
						...headerIssues,
						...separatorIssues,
						...refIssues,
						...langIssues,
						...styleIssues
					);
				}

				this.notifyProgress({
					phase: "checking",
					currentFile: file,
					processedFiles: i + 1,
					totalFiles: parsedFiles.length,
					message: `正在检查: ${file}`,
				});
			} catch (error) {
				console.error(`检查文件失败: ${file}`, error);
				// 继续处理其他文件
			}
		}

		return allIssues;
	}

	/**
	 * 阶段 4: 生成报告
	 */
	private async reportingPhase(
		issues: Issue[],
		totalFiles: number = 0
	): Promise<{ report: AuditReport; fixPlan: FixPlan }> {
		this.notifyProgress({
			phase: "reporting",
			processedFiles: 0,
			totalFiles: 1,
			message: "正在生成报告...",
		});

		const reportGenerator = createReportGenerator();
		const report = reportGenerator.generateReport(issues, totalFiles);
		const fixPlan = reportGenerator.generateFixPlan(issues);

		// 导出报告到文件
		await this.exportReportToFile(report, fixPlan);

		this.notifyProgress({
			phase: "reporting",
			processedFiles: 1,
			totalFiles: 1,
			message: "报告生成完成",
		});

		return { report, fixPlan };
	}

	/**
	 * 导出报告到文件
	 */
	private async exportReportToFile(report: AuditReport, fixPlan: FixPlan): Promise<void> {
		const outputPath = path.join(this.projectRoot, this.outputDir);

		// 确保输出目录存在
		if (!fs.existsSync(outputPath)) {
			fs.mkdirSync(outputPath, { recursive: true });
		}

		const reportGenerator = createReportGenerator();
		const fixPlanGenerator = new (await import("../reporters/FixPlanGenerator")).FixPlanGenerator();

		// 生成基础报告
		const reportContent = reportGenerator.exportReport(report, this.reportFormat);

		// 如果是 Markdown 格式,添加修复计划
		let fullContent = reportContent;
		if (this.reportFormat === "markdown") {
			const fixPlanText = fixPlanGenerator.generateFixPlanText(fixPlan);
			fullContent = reportContent + "\n" + fixPlanText;
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const fileName = `audit-report-${timestamp}.${this.reportFormat === "json" ? "json" : "md"}`;
		const filePath = path.join(outputPath, fileName);

		fs.writeFileSync(filePath, fullContent, "utf-8");
		console.log(`报告已保存到: ${filePath}`);
	}

	/**
	 * 读取文件内容
	 */
	private async readFile(filePath: string): Promise<string> {
		return fs.promises.readFile(filePath, "utf-8");
	}

	/**
	 * 通知进度更新
	 */
	private notifyProgress(progress: AuditProgress): void {
		if (this.onProgress) {
			this.onProgress(progress);
		}
	}
}

/**
 * 创建审查协调器
 */
export function createAuditOrchestrator(options: AuditOptions): AuditOrchestrator {
	return new AuditOrchestrator(options);
}
