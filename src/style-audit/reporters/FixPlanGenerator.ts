/**
 * 修复计划生成器 - 创建优先级排序的修复任务
 */

import type { Issue, FixPlan, FixTask, Severity, IssueCategory } from "../types";

/**
 * 修复计划生成器类
 */
export class FixPlanGenerator {
	/**
	 * 生成修复计划
	 */
	generateFixPlan(issues: Issue[]): FixPlan {
		// 按类别和严重性分组问题
		const groupedIssues = this.groupIssuesForTasks(issues);

		// 创建修复任务
		const tasks = this.createFixTasks(groupedIssues);

		// 按优先级排序
		const sortedTasks = this.sortTasksByPriority(tasks);

		// 计算总工作量
		const estimatedEffort = this.calculateTotalEffort(sortedTasks);

		// 生成优先级顺序
		const priorityOrder = sortedTasks.map((task) => task.id);

		return {
			tasks: sortedTasks,
			estimatedEffort,
			priorityOrder,
		};
	}

	/**
	 * 按类别和严重性分组问题
	 */
	private groupIssuesForTasks(issues: Issue[]): Map<string, { severity: Severity; issues: Issue[] }> {
		const grouped = new Map<string, { severity: Severity; issues: Issue[] }>();

		for (const issue of issues) {
			const key = `${issue.severity}-${issue.category}`;

			if (!grouped.has(key)) {
				grouped.set(key, {
					severity: issue.severity,
					issues: [],
				});
			}

			grouped.get(key)!.issues.push(issue);
		}

		return grouped;
	}

	/**
	 * 创建修复任务
	 */
	private createFixTasks(groupedIssues: Map<string, { severity: Severity; issues: Issue[] }>): FixTask[] {
		const tasks: FixTask[] = [];
		let taskId = 1;

		for (const [key, { severity, issues }] of groupedIssues) {
			const category = issues[0].category;
			const priority = this.calculatePriority(severity, issues.length);
			const estimatedTime = this.estimateTime(issues.length, severity);

			const task: FixTask = {
				id: `task-${taskId}`,
				title: this.generateTaskTitle(category, severity, issues.length),
				description: this.generateTaskDescription(category, issues),
				priority,
				relatedIssues: issues,
				estimatedTime,
			};

			tasks.push(task);
			taskId++;
		}

		return tasks;
	}

	/**
	 * 计算任务优先级
	 */
	private calculatePriority(severity: Severity, issueCount: number): number {
		const severityWeight: Record<Severity, number> = {
			critical: 100,
			moderate: 50,
			minor: 10,
		};

		// 优先级 = 严重性权重 + 问题数量
		return severityWeight[severity] + issueCount;
	}

	/**
	 * 估算修复时间
	 */
	private estimateTime(issueCount: number, severity: Severity): string {
		const baseTime: Record<Severity, number> = {
			critical: 30, // 分钟
			moderate: 15,
			minor: 5,
		};

		const totalMinutes = baseTime[severity] * issueCount;

		if (totalMinutes < 60) {
			return `${totalMinutes} 分钟`;
		}

		const hours = Math.ceil(totalMinutes / 60);
		return `${hours} 小时`;
	}

	/**
	 * 生成任务标题
	 */
	private generateTaskTitle(category: IssueCategory, severity: Severity, count: number): string {
		const categoryName = this.getCategoryName(category);
		const severityLabel = this.getSeverityLabel(severity);

		return `修复${severityLabel}的${categoryName}问题 (${count} 个)`;
	}

	/**
	 * 生成任务描述
	 */
	private generateTaskDescription(category: IssueCategory, issues: Issue[]): string {
		const lines: string[] = [];

		lines.push(`需要修复 ${issues.length} 个${this.getCategoryName(category)}问题:`);

		// 列出涉及的文件
		const files = new Set(issues.map((i) => i.location.file));
		lines.push(`\n涉及文件: ${Array.from(files).join(", ")}`);

		// 列出主要问题类型
		const messageTypes = new Map<string, number>();
		for (const issue of issues) {
			const count = messageTypes.get(issue.message) || 0;
			messageTypes.set(issue.message, count + 1);
		}

		lines.push("\n主要问题:");
		for (const [message, count] of messageTypes) {
			lines.push(`- ${message} (${count} 处)`);
		}

		return lines.join("\n");
	}

	/**
	 * 按优先级排序任务
	 */
	private sortTasksByPriority(tasks: FixTask[]): FixTask[] {
		return [...tasks].sort((a, b) => b.priority - a.priority);
	}

	/**
	 * 计算总工作量
	 */
	private calculateTotalEffort(tasks: FixTask[]): string {
		let totalMinutes = 0;

		for (const task of tasks) {
			const timeStr = task.estimatedTime;
			const match = timeStr.match(/(\d+)\s*(分钟|小时)/);

			if (match) {
				const value = parseInt(match[1]);
				const unit = match[2];

				if (unit === "小时") {
					totalMinutes += value * 60;
				} else {
					totalMinutes += value;
				}
			}
		}

		if (totalMinutes < 60) {
			return `${totalMinutes} 分钟`;
		}

		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;

		if (minutes === 0) {
			return `${hours} 小时`;
		}

		return `${hours} 小时 ${minutes} 分钟`;
	}

	/**
	 * 生成修复计划文本
	 */
	generateFixPlanText(plan: FixPlan): string {
		const lines: string[] = [];

		lines.push("\n## 修复计划\n");
		lines.push(`**预计总工作量**: ${plan.estimatedEffort}\n`);
		lines.push("### 优先级任务列表\n");

		plan.tasks.forEach((task, index) => {
			lines.push(`#### ${index + 1}. ${task.title}\n`);
			lines.push(`**预计时间**: ${task.estimatedTime}`);
			lines.push(`**优先级**: ${task.priority}\n`);
			lines.push(task.description);
			lines.push("\n---\n");
		});

		return lines.join("\n");
	}

	/**
	 * 获取类别名称
	 */
	private getCategoryName(category: IssueCategory): string {
		const names: Record<IssueCategory, string> = {
			naming: "命名约定",
			organization: "组织结构",
			accessibility: "可访问性",
			performance: "性能",
			duplication: "重复代码",
			unused: "未使用代码",
			"best-practice": "最佳实践",
		};
		return names[category];
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
}

/**
 * 创建修复计划生成器实例
 */
export function createFixPlanGenerator(): FixPlanGenerator {
	return new FixPlanGenerator();
}
