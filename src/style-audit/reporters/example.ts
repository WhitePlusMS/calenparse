/**
 * 报告生成器使用示例
 */

import { createReportGenerator } from "./ReportGenerator";
import type { Issue } from "../types";

/**
 * 示例：生成样式审查报告
 */
export function exampleGenerateReport() {
	// 创建报告生成器
	const generator = createReportGenerator();

	// 模拟一些问题
	const issues: Issue[] = [
		{
			severity: "critical",
			category: "accessibility",
			message: "文本颜色对比度不足",
			location: {
				file: "src/style.css",
				line: 45,
				column: 3,
			},
			suggestion: "使用更深的文本颜色以满足 WCAG AA 标准",
			codeExample: "color: var(--text-primary); /* 对比度 4.5:1 */",
		},
		{
			severity: "moderate",
			category: "naming",
			message: "CSS 变量使用了描述性名称而非语义化名称",
			location: {
				file: "src/style.css",
				line: 12,
				column: 1,
			},
			suggestion: "将 --dark-gray 重命名为 --text-secondary",
			codeExample: "--text-secondary: #666;",
		},
		{
			severity: "minor",
			category: "organization",
			message: "缺少文件头部注释",
			location: {
				file: "src/components/Button.vue",
				line: 1,
				column: 1,
			},
			suggestion: "添加文件用途说明注释",
			codeExample: "/* 按钮组件样式 - 实现各种按钮变体 */",
		},
	];

	// 生成完整报告
	const report = generator.generateReport(issues, 25);

	console.log("=== 报告摘要 ===");
	console.log(`总文件数: ${report.summary.totalFiles}`);
	console.log(`总问题数: ${report.summary.totalIssues}`);
	console.log(`严重问题: ${report.summary.criticalIssues}`);
	console.log(`中等问题: ${report.summary.moderateIssues}`);
	console.log(`轻微问题: ${report.summary.minorIssues}`);
	console.log(`有问题的文件数: ${report.summary.filesWithIssues}`);

	// 生成修复计划
	const fixPlan = generator.generateFixPlan(issues);

	console.log("\n=== 修复计划 ===");
	console.log(`总工作量: ${fixPlan.estimatedEffort}`);
	console.log(`任务数量: ${fixPlan.tasks.length}`);

	fixPlan.tasks.forEach((task, index) => {
		console.log(`\n任务 ${index + 1}: ${task.title}`);
		console.log(`  优先级: ${task.priority}`);
		console.log(`  预计时间: ${task.estimatedTime}`);
		console.log(`  相关问题: ${task.relatedIssues.length} 个`);
	});

	// 导出为 Markdown
	const markdown = generator.exportReport(report, "markdown");
	console.log("\n=== Markdown 报告 (前 500 字符) ===");
	console.log(markdown.substring(0, 500) + "...");

	// 导出为 JSON
	const json = generator.exportReport(report, "json");
	console.log("\n=== JSON 报告 (已解析) ===");
	const parsed = JSON.parse(json);
	console.log(`包含 ${Object.keys(parsed).length} 个顶级字段`);

	// 生成完整报告（包含修复计划）
	const fullReport = generator.generateFullReport(issues, 25);
	console.log("\n=== 完整报告长度 ===");
	console.log(`${fullReport.length} 字符`);

	return {
		report,
		fixPlan,
		markdown,
		json,
		fullReport,
	};
}

// 如果直接运行此文件，执行示例
if (import.meta.url === `file://${process.argv[1]}`) {
	exampleGenerateReport();
}
