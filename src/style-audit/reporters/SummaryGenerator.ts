/**
 * 报告摘要生成器 - 生成审查报告的统计摘要
 */

import type { Issue, ReportSummary } from "../types";

/**
 * 报告摘要生成器类
 */
export class SummaryGenerator {
	/**
	 * 生成报告摘要
	 */
	generateSummary(issues: Issue[], totalFiles: number): ReportSummary {
		const criticalIssues = issues.filter((issue) => issue.severity === "critical").length;
		const moderateIssues = issues.filter((issue) => issue.severity === "moderate").length;
		const minorIssues = issues.filter((issue) => issue.severity === "minor").length;

		const filesWithIssues = new Set(issues.map((issue) => issue.location.file)).size;

		return {
			totalFiles,
			totalIssues: issues.length,
			criticalIssues,
			moderateIssues,
			minorIssues,
			filesWithIssues,
		};
	}

	/**
	 * 生成执行摘要文本
	 */
	generateExecutiveSummary(summary: ReportSummary): string {
		const lines: string[] = [];

		lines.push("## 执行摘要\n");
		lines.push(`- 审查文件数: ${summary.totalFiles}`);
		lines.push(`- 发现问题总数: ${summary.totalIssues}`);
		lines.push(`  - 严重: ${summary.criticalIssues}`);
		lines.push(`  - 中等: ${summary.moderateIssues}`);
		lines.push(`  - 轻微: ${summary.minorIssues}`);
		lines.push(`- 有问题的文件数: ${summary.filesWithIssues}`);

		return lines.join("\n");
	}

	/**
	 * 生成问题概览
	 */
	generateOverview(issuesByCategory: Map<string, Issue[]>, issuesBySeverity: Map<string, Issue[]>): string {
		const lines: string[] = [];

		lines.push("\n## 问题概览\n");

		// 按类别统计
		lines.push("### 按类别分组\n");
		for (const [category, issues] of issuesByCategory) {
			const critical = issues.filter((i) => i.severity === "critical").length;
			const moderate = issues.filter((i) => i.severity === "moderate").length;
			const minor = issues.filter((i) => i.severity === "minor").length;

			lines.push(`#### ${this.getCategoryName(category)} (${issues.length} 个问题)`);
			lines.push(`- 严重: ${critical}`);
			lines.push(`- 中等: ${moderate}`);
			lines.push(`- 轻微: ${minor}\n`);
		}

		return lines.join("\n");
	}

	/**
	 * 获取类别的中文名称
	 */
	private getCategoryName(category: string): string {
		const names: Record<string, string> = {
			naming: "命名约定",
			organization: "组织结构",
			accessibility: "可访问性",
			performance: "性能",
			duplication: "重复代码",
			unused: "未使用代码",
			"best-practice": "最佳实践",
		};
		return names[category] || category;
	}
}

/**
 * 创建摘要生成器实例
 */
export function createSummaryGenerator(): SummaryGenerator {
	return new SummaryGenerator();
}
