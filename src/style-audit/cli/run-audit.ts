/**
 * 运行样式审查的简单脚本
 * 可以直接通过 ts-node 或编译后运行
 */

import { createAuditOrchestrator, type AuditProgress } from "../orchestrator/AuditOrchestrator";
import * as path from "path";

/**
 * 运行审查
 */
async function runAudit(projectRoot: string = process.cwd()): Promise<void> {
	console.log(`\n开始审查项目: ${projectRoot}\n`);

	// 创建审查协调器
	const orchestrator = createAuditOrchestrator({
		projectRoot,
		loadConfig: true,
		onProgress: (progress: AuditProgress) => {
			const percentage =
				progress.totalFiles > 0
					? Math.round((progress.processedFiles / progress.totalFiles) * 100)
					: 0;

			console.log(`[${progress.phase}] ${percentage}% - ${progress.message}`);
		},
	});

	// 执行审查
	const result = await orchestrator.runAudit();

	// 显示结果
	if (result.success && result.report) {
		const summary = result.report.summary;

		console.log("\n审查完成！\n");
		console.log("=".repeat(50));
		console.log("审查摘要");
		console.log("=".repeat(50));
		console.log(`总文件数: ${summary.totalFiles}`);
		console.log(`发现问题: ${summary.totalIssues}`);
		console.log(`  - 严重: ${summary.criticalIssues}`);
		console.log(`  - 中等: ${summary.moderateIssues}`);
		console.log(`  - 轻微: ${summary.minorIssues}`);
		console.log(`有问题的文件: ${summary.filesWithIssues}`);
		console.log("=".repeat(50));

		if (result.fixPlan) {
			console.log(`\n修复计划已生成，包含 ${result.fixPlan.tasks.length} 个任务`);
			console.log(`预计工作量: ${result.fixPlan.estimatedEffort}`);
		}

		console.log("\n详细报告已保存到输出目录");
	} else {
		console.error("审查失败:", result.error?.message);
		process.exit(1);
	}
}

export { runAudit };

// 如果直接运行此文件 (ES模块方式)
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
if (isMainModule) {
	const projectRoot = process.argv[2] || process.cwd();
	runAudit(projectRoot).catch((error) => {
		console.error("发生错误:", error);
		process.exit(1);
	});
}
