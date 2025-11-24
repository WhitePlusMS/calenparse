/**
 * 问题收集器 - 汇总和分类所有检查器的问题
 */

import type { Issue, IssueCategory, Severity } from "../types";

/**
 * 问题收集器类
 */
export class IssueCollector {
	private issues: Issue[] = [];

	/**
	 * 添加单个问题
	 */
	addIssue(issue: Issue): void {
		this.issues.push(issue);
	}

	/**
	 * 批量添加问题
	 */
	addIssues(issues: Issue[]): void {
		this.issues.push(...issues);
	}

	/**
	 * 获取所有问题
	 */
	getAllIssues(): Issue[] {
		return [...this.issues];
	}

	/**
	 * 按类别分组问题
	 */
	groupByCategory(): Map<IssueCategory, Issue[]> {
		const grouped = new Map<IssueCategory, Issue[]>();

		for (const issue of this.issues) {
			const existing = grouped.get(issue.category) || [];
			existing.push(issue);
			grouped.set(issue.category, existing);
		}

		return grouped;
	}

	/**
	 * 按严重性分组问题
	 */
	groupBySeverity(): Map<Severity, Issue[]> {
		const grouped = new Map<Severity, Issue[]>();

		for (const issue of this.issues) {
			const existing = grouped.get(issue.severity) || [];
			existing.push(issue);
			grouped.set(issue.severity, existing);
		}

		return grouped;
	}

	/**
	 * 按文件分组问题
	 */
	groupByFile(): Map<string, Issue[]> {
		const grouped = new Map<string, Issue[]>();

		for (const issue of this.issues) {
			const file = issue.location.file;
			const existing = grouped.get(file) || [];
			existing.push(issue);
			grouped.set(file, existing);
		}

		return grouped;
	}

	/**
	 * 清空所有问题
	 */
	clear(): void {
		this.issues = [];
	}

	/**
	 * 获取问题总数
	 */
	getCount(): number {
		return this.issues.length;
	}

	/**
	 * 按严重性获取问题数量
	 */
	getCountBySeverity(severity: Severity): number {
		return this.issues.filter((issue) => issue.severity === severity).length;
	}

	/**
	 * 按类别获取问题数量
	 */
	getCountByCategory(category: IssueCategory): number {
		return this.issues.filter((issue) => issue.category === category).length;
	}

	/**
	 * 获取有问题的文件数量
	 */
	getFilesWithIssuesCount(): number {
		const files = new Set(this.issues.map((issue) => issue.location.file));
		return files.size;
	}
}

/**
 * 创建问题收集器实例
 */
export function createIssueCollector(): IssueCollector {
	return new IssueCollector();
}
