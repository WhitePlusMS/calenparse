/**
 * 详细问题报告生成器 - 生成包含位置、上下文和修复建议的详细报告
 */

import type { Issue, Severity } from "../types";

/**
 * 详细报告生成器类
 */
export class DetailedReportGenerator {
	/**
	 * 生成详细问题列表
	 */
	generateDetailedIssueList(issues: Issue[]): string {
		const lines: string[] = [];

		lines.push("\n## 详细问题列表\n");

		// 按严重性排序
		const sortedIssues = this.sortIssuesBySeverity(issues);

		sortedIssues.forEach((issue, index) => {
			lines.push(this.formatIssue(issue, index + 1));
		});

		return lines.join("\n");
	}

	/**
	 * 格式化单个问题
	 */
	private formatIssue(issue: Issue, index: number): string {
		const lines: string[] = [];

		// 标题
		const severityLabel = this.getSeverityLabel(issue.severity);
		lines.push(`### 问题 #${index}: [${severityLabel}] ${issue.message}\n`);

		// 位置信息
		lines.push(`**位置**: ${issue.location.file}:${issue.location.line}:${issue.location.column}\n`);

		// 类别
		lines.push(`**类别**: ${this.getCategoryName(issue.category)}\n`);

		// 修复建议
		if (issue.suggestion) {
			lines.push(`**修复建议**: ${issue.suggestion}\n`);
		}

		// 代码示例
		if (issue.codeExample) {
			lines.push("**建议代码**:");
			lines.push("```css");
			lines.push(issue.codeExample);
			lines.push("```\n");
		}

		return lines.join("\n");
	}

	/**
	 * 按严重性排序问题
	 */
	private sortIssuesBySeverity(issues: Issue[]): Issue[] {
		const severityOrder: Record<Severity, number> = {
			critical: 0,
			moderate: 1,
			minor: 2,
		};

		return [...issues].sort((a, b) => {
			const orderDiff = severityOrder[a.severity] - severityOrder[b.severity];
			if (orderDiff !== 0) return orderDiff;

			// 相同严重性按文件名排序
			return a.location.file.localeCompare(b.location.file);
		});
	}

	/**
	 * 获取严重性标签
	 */
	private getSeverityLabel(severity: Severity): string {
		const labels: Record<Severity, string> = {
			critical: "严重",
			moderate: "中等",
			minor: "轻微",
		};
		return labels[severity];
	}

	/**
	 * 获取类别名称
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

	/**
	 * 按文件生成问题列表
	 */
	generateIssuesByFile(issuesByFile: Map<string, Issue[]>): string {
		const lines: string[] = [];

		lines.push("\n### 按文件分组\n");

		// 按文件名排序
		const sortedFiles = Array.from(issuesByFile.keys()).sort();

		for (const file of sortedFiles) {
			const issues = issuesByFile.get(file) || [];
			lines.push(`#### ${file} (${issues.length} 个问题)\n`);

			issues.forEach((issue) => {
				const severityLabel = this.getSeverityLabel(issue.severity);
				lines.push(`- [${severityLabel}] 第 ${issue.location.line} 行: ${issue.message}`);
			});

			lines.push("");
		}

		return lines.join("\n");
	}
}

/**
 * 创建详细报告生成器实例
 */
export function createDetailedReportGenerator(): DetailedReportGenerator {
	return new DetailedReportGenerator();
}
