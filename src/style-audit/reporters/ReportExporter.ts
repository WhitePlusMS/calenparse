/**
 * 报告导出器 - 支持多种格式导出审查报告
 */

import type { AuditReport, Issue, Recommendation } from "../types";

/**
 * 报告导出器类
 */
export class ReportExporter {
	/**
	 * 导出为 Markdown 格式
	 */
	exportMarkdown(report: AuditReport): string {
		const lines: string[] = [];

		// 标题
		lines.push("# 样式一致性审查报告\n");

		// 执行摘要
		lines.push(this.generateMarkdownSummary(report));

		// 问题概览
		lines.push(this.generateMarkdownOverview(report));

		// 按文件分组
		lines.push(this.generateMarkdownByFile(report));

		// 详细问题列表
		lines.push(this.generateMarkdownDetailedIssues(report));

		// 建议
		if (report.recommendations.length > 0) {
			lines.push(this.generateMarkdownRecommendations(report.recommendations));
		}

		return lines.join("\n");
	}

	/**
	 * 导出为 JSON 格式
	 */
	exportJSON(report: AuditReport): string {
		// 将 Map 转换为普通对象
		const jsonReport = {
			summary: report.summary,
			issuesByCategory: Object.fromEntries(report.issuesByCategory),
			issuesBySeverity: Object.fromEntries(report.issuesBySeverity),
			issuesByFile: Object.fromEntries(report.issuesByFile),
			recommendations: report.recommendations,
		};

		return JSON.stringify(jsonReport, null, 2);
	}

	/**
	 * 导出为 HTML 格式
	 */
	exportHTML(report: AuditReport): string {
		const lines: string[] = [];

		lines.push("<!DOCTYPE html>");
		lines.push('<html lang="zh-CN">');
		lines.push("<head>");
		lines.push('  <meta charset="UTF-8">');
		lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
		lines.push("  <title>样式一致性审查报告</title>");
		lines.push(this.getHTMLStyles());
		lines.push("</head>");
		lines.push("<body>");
		lines.push('  <div class="container">');

		// 标题
		lines.push("    <h1>样式一致性审查报告</h1>");

		// 执行摘要
		lines.push(this.generateHTMLSummary(report));

		// 问题概览
		lines.push(this.generateHTMLOverview(report));

		// 详细问题
		lines.push(this.generateHTMLDetailedIssues(report));

		// 建议
		if (report.recommendations.length > 0) {
			lines.push(this.generateHTMLRecommendations(report.recommendations));
		}

		lines.push("  </div>");
		lines.push("</body>");
		lines.push("</html>");

		return lines.join("\n");
	}

	/**
	 * 生成 Markdown 摘要
	 */
	private generateMarkdownSummary(report: AuditReport): string {
		const { summary } = report;
		const lines: string[] = [];

		lines.push("## 执行摘要\n");
		lines.push(`- 审查文件数: ${summary.totalFiles}`);
		lines.push(`- 发现问题总数: ${summary.totalIssues}`);
		lines.push(`  - 严重: ${summary.criticalIssues}`);
		lines.push(`  - 中等: ${summary.moderateIssues}`);
		lines.push(`  - 轻微: ${summary.minorIssues}`);
		lines.push(`- 有问题的文件数: ${summary.filesWithIssues}\n`);

		return lines.join("\n");
	}

	/**
	 * 生成 Markdown 概览
	 */
	private generateMarkdownOverview(report: AuditReport): string {
		const lines: string[] = [];

		lines.push("## 问题概览\n");
		lines.push("### 按类别分组\n");

		for (const [category, issues] of report.issuesByCategory) {
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
	 * 生成 Markdown 按文件分组
	 */
	private generateMarkdownByFile(report: AuditReport): string {
		const lines: string[] = [];

		lines.push("### 按文件分组\n");

		const sortedFiles = Array.from(report.issuesByFile.keys()).sort();

		for (const file of sortedFiles) {
			const issues = report.issuesByFile.get(file) || [];
			lines.push(`#### ${file} (${issues.length} 个问题)\n`);

			issues.forEach((issue) => {
				const severityLabel = this.getSeverityLabel(issue.severity);
				lines.push(`- [${severityLabel}] 第 ${issue.location.line} 行: ${issue.message}`);
			});

			lines.push("");
		}

		return lines.join("\n");
	}

	/**
	 * 生成 Markdown 详细问题
	 */
	private generateMarkdownDetailedIssues(report: AuditReport): string {
		const lines: string[] = [];

		lines.push("## 详细问题列表\n");

		const allIssues = Array.from(report.issuesBySeverity.values()).flat();
		const sortedIssues = this.sortIssuesBySeverity(allIssues);

		sortedIssues.forEach((issue, index) => {
			const severityLabel = this.getSeverityLabel(issue.severity);
			lines.push(`### 问题 #${index + 1}: [${severityLabel}] ${issue.message}\n`);
			lines.push(
				`**位置**: ${issue.location.file}:${issue.location.line}:${issue.location.column}\n`
			);
			lines.push(`**类别**: ${this.getCategoryName(issue.category)}\n`);

			if (issue.suggestion) {
				lines.push(`**修复建议**: ${issue.suggestion}\n`);
			}

			if (issue.codeExample) {
				lines.push("**建议代码**:");
				lines.push("```css");
				lines.push(issue.codeExample);
				lines.push("```\n");
			}
		});

		return lines.join("\n");
	}

	/**
	 * 生成 Markdown 建议
	 */
	private generateMarkdownRecommendations(recommendations: Recommendation[]): string {
		const lines: string[] = [];

		lines.push("## 建议\n");

		const sorted = [...recommendations].sort((a, b) => b.priority - a.priority);

		sorted.forEach((rec, index) => {
			lines.push(`${index + 1}. **${rec.title}**`);
			lines.push(`   ${rec.description}\n`);
		});

		return lines.join("\n");
	}

	/**
	 * 生成 HTML 样式
	 */
	private getHTMLStyles(): string {
		return `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #2c3e50; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
    h3 { color: #555; }
    .summary { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .summary ul { list-style: none; padding: 0; }
    .summary li { padding: 5px 0; }
    .issue { border-left: 4px solid #ddd; padding: 15px; margin: 15px 0; background: #fafafa; }
    .issue.critical { border-left-color: #e74c3c; }
    .issue.moderate { border-left-color: #f39c12; }
    .issue.minor { border-left-color: #3498db; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
    .badge.critical { background: #e74c3c; color: white; }
    .badge.moderate { background: #f39c12; color: white; }
    .badge.minor { background: #3498db; color: white; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 6px; overflow-x: auto; }
  </style>`;
	}

	/**
	 * 生成 HTML 摘要
	 */
	private generateHTMLSummary(report: AuditReport): string {
		const { summary } = report;
		return `
    <div class="summary">
      <h2>执行摘要</h2>
      <ul>
        <li>审查文件数: <strong>${summary.totalFiles}</strong></li>
        <li>发现问题总数: <strong>${summary.totalIssues}</strong></li>
        <li style="margin-left: 20px;">严重: <strong>${summary.criticalIssues}</strong></li>
        <li style="margin-left: 20px;">中等: <strong>${summary.moderateIssues}</strong></li>
        <li style="margin-left: 20px;">轻微: <strong>${summary.minorIssues}</strong></li>
        <li>有问题的文件数: <strong>${summary.filesWithIssues}</strong></li>
      </ul>
    </div>`;
	}

	/**
	 * 生成 HTML 概览
	 */
	private generateHTMLOverview(report: AuditReport): string {
		const lines: string[] = [];

		lines.push('    <div class="overview">');
		lines.push("      <h2>问题概览</h2>");

		for (const [category, issues] of report.issuesByCategory) {
			const critical = issues.filter((i) => i.severity === "critical").length;
			const moderate = issues.filter((i) => i.severity === "moderate").length;
			const minor = issues.filter((i) => i.severity === "minor").length;

			lines.push(`      <h3>${this.getCategoryName(category)} (${issues.length} 个问题)</h3>`);
			lines.push("      <ul>");
			lines.push(`        <li>严重: ${critical}</li>`);
			lines.push(`        <li>中等: ${moderate}</li>`);
			lines.push(`        <li>轻微: ${minor}</li>`);
			lines.push("      </ul>");
		}

		lines.push("    </div>");

		return lines.join("\n");
	}

	/**
	 * 生成 HTML 详细问题
	 */
	private generateHTMLDetailedIssues(report: AuditReport): string {
		const lines: string[] = [];

		lines.push('    <div class="issues">');
		lines.push("      <h2>详细问题列表</h2>");

		const allIssues = Array.from(report.issuesBySeverity.values()).flat();
		const sortedIssues = this.sortIssuesBySeverity(allIssues);

		sortedIssues.forEach((issue, index) => {
			const severityLabel = this.getSeverityLabel(issue.severity);
			lines.push(`      <div class="issue ${issue.severity}">`);
			lines.push(
				`        <h3>问题 #${index + 1}: <span class="badge ${
					issue.severity
				}">${severityLabel}</span> ${issue.message}</h3>`
			);
			lines.push(
				`        <p><strong>位置:</strong> <code>${issue.location.file}:${issue.location.line}:${issue.location.column}</code></p>`
			);
			lines.push(`        <p><strong>类别:</strong> ${this.getCategoryName(issue.category)}</p>`);

			if (issue.suggestion) {
				lines.push(`        <p><strong>修复建议:</strong> ${issue.suggestion}</p>`);
			}

			if (issue.codeExample) {
				lines.push("        <p><strong>建议代码:</strong></p>");
				lines.push(`        <pre><code>${this.escapeHtml(issue.codeExample)}</code></pre>`);
			}

			lines.push("      </div>");
		});

		lines.push("    </div>");

		return lines.join("\n");
	}

	/**
	 * 生成 HTML 建议
	 */
	private generateHTMLRecommendations(recommendations: Recommendation[]): string {
		const lines: string[] = [];

		lines.push('    <div class="recommendations">');
		lines.push("      <h2>建议</h2>");
		lines.push("      <ol>");

		const sorted = [...recommendations].sort((a, b) => b.priority - a.priority);

		sorted.forEach((rec) => {
			lines.push(`        <li><strong>${rec.title}</strong>: ${rec.description}</li>`);
		});

		lines.push("      </ol>");
		lines.push("    </div>");

		return lines.join("\n");
	}

	/**
	 * 按严重性排序问题
	 */
	private sortIssuesBySeverity(issues: Issue[]): Issue[] {
		const severityOrder = { critical: 0, moderate: 1, minor: 2 };
		return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
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
	 * 获取严重性标签
	 */
	private getSeverityLabel(severity: string): string {
		const labels: Record<string, string> = {
			critical: "严重",
			moderate: "中等",
			minor: "轻微",
		};
		return labels[severity] || severity;
	}

	/**
	 * HTML 转义
	 */
	private escapeHtml(text: string): string {
		const map: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#039;",
		};
		return text.replace(/[&<>"']/g, (m) => map[m]);
	}
}

/**
 * 创建报告导出器实例
 */
export function createReportExporter(): ReportExporter {
	return new ReportExporter();
}
