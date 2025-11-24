/**
 * 主报告生成器 - 整合所有报告生成功能
 */

import type { Issue, AuditReport, FixPlan, Recommendation } from "../types";
import { IssueCollector } from "./IssueCollector";
import { SummaryGenerator } from "./SummaryGenerator";
import { DetailedReportGenerator } from "./DetailedReportGenerator";
import { FixPlanGenerator } from "./FixPlanGenerator";
import { ReportExporter } from "./ReportExporter";

/**
 * 主报告生成器类
 */
export class ReportGenerator {
	private issueCollector: IssueCollector;
	private summaryGenerator: SummaryGenerator;
	private detailedGenerator: DetailedReportGenerator;
	private fixPlanGenerator: FixPlanGenerator;
	private exporter: ReportExporter;

	constructor() {
		this.issueCollector = new IssueCollector();
		this.summaryGenerator = new SummaryGenerator();
		this.detailedGenerator = new DetailedReportGenerator();
		this.fixPlanGenerator = new FixPlanGenerator();
		this.exporter = new ReportExporter();
	}

	/**
	 * 生成完整的审查报告
	 */
	generateReport(issues: Issue[], totalFiles: number = 0): AuditReport {
		// 收集问题
		this.issueCollector.clear();
		this.issueCollector.addIssues(issues);

		// 生成摘要
		const summary = this.summaryGenerator.generateSummary(issues, totalFiles);

		// 按类别、严重性、文件分组
		const issuesByCategory = this.issueCollector.groupByCategory();
		const issuesBySeverity = this.issueCollector.groupBySeverity();
		const issuesByFile = this.issueCollector.groupByFile();

		// 生成建议
		const recommendations = this.generateRecommendations(issuesByCategory, issuesBySeverity);

		return {
			summary,
			issuesByCategory,
			issuesBySeverity,
			issuesByFile,
			recommendations,
		};
	}

	/**
	 * 生成修复计划
	 */
	generateFixPlan(issues: Issue[]): FixPlan {
		return this.fixPlanGenerator.generateFixPlan(issues);
	}

	/**
	 * 导出报告
	 */
	exportReport(report: AuditReport, format: "markdown" | "html" | "json"): string {
		switch (format) {
			case "markdown":
				return this.exporter.exportMarkdown(report);
			case "html":
				return this.exporter.exportHTML(report);
			case "json":
				return this.exporter.exportJSON(report);
			default:
				throw new Error(`不支持的格式: ${format}`);
		}
	}

	/**
	 * 生成完整报告文本（Markdown 格式，包含修复计划）
	 */
	generateFullReport(issues: Issue[], totalFiles: number = 0): string {
		const report = this.generateReport(issues, totalFiles);
		const fixPlan = this.generateFixPlan(issues);

		const lines: string[] = [];

		// 基础报告
		lines.push(this.exporter.exportMarkdown(report));

		// 修复计划
		lines.push(this.fixPlanGenerator.generateFixPlanText(fixPlan));

		return lines.join("\n");
	}

	/**
	 * 生成建议
	 */
	private generateRecommendations(
		issuesByCategory: Map<string, Issue[]>,
		issuesBySeverity: Map<string, Issue[]>
	): Recommendation[] {
		const recommendations: Recommendation[] = [];

		// 如果有严重的可访问性问题
		const accessibilityIssues = issuesByCategory.get("accessibility") || [];
		const criticalAccessibility = accessibilityIssues.filter((i) => i.severity === "critical");
		if (criticalAccessibility.length > 0) {
			recommendations.push({
				title: "立即修复可访问性问题",
				description: "发现严重的可访问性问题，这些问题可能影响用户体验，建议优先修复。",
				priority: 100,
			});
		}

		// 如果有大量命名问题
		const namingIssues = issuesByCategory.get("naming") || [];
		if (namingIssues.length > 10) {
			recommendations.push({
				title: "统一命名约定",
				description: "发现大量命名不一致的问题，建议制定并执行统一的命名规范。",
				priority: 80,
			});
		}

		// 如果有性能问题
		const performanceIssues = issuesByCategory.get("performance") || [];
		if (performanceIssues.length > 0) {
			recommendations.push({
				title: "优化样式性能",
				description: "发现性能相关问题，建议优化选择器和动画实现。",
				priority: 70,
			});
		}

		// 通用建议
		recommendations.push({
			title: "配置自动化检查工具",
			description: "建议配置 Stylelint 和 Prettier 等工具，在开发过程中自动检查样式问题。",
			priority: 60,
		});

		recommendations.push({
			title: "建立代码审查流程",
			description: "建议在代码审查中加入样式一致性检查，确保新代码符合规范。",
			priority: 50,
		});

		recommendations.push({
			title: "定期运行样式审查",
			description: "建议每月运行一次完整的样式审查，及时发现和修复问题。",
			priority: 40,
		});

		return recommendations;
	}
}

/**
 * 创建报告生成器实例
 */
export function createReportGenerator(): ReportGenerator {
	return new ReportGenerator();
}
