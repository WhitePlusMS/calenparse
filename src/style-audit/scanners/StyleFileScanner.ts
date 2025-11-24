/**
 * 样式文件扫描器实现
 * 负责扫描项目目录,识别所有样式文件
 */

import * as fs from "fs";
import * as path from "path";
import type { StyleFileScanner, StyleFileInventory, FileCategory } from "../types";
import { scanConfig } from "../config";

export class StyleFileScannerImpl implements StyleFileScanner {
	private projectRoot: string;
	private scanErrors: Array<{ path: string; error: unknown }> = [];

	constructor(projectRoot: string = process.cwd()) {
		this.projectRoot = projectRoot;
	}

	/**
	 * 获取扫描过程中的错误
	 */
	getScanErrors(): Array<{ path: string; error: unknown }> {
		return this.scanErrors;
	}

	/**
	 * 标准化路径分隔符为正斜杠
	 */
	private normalizePath(filePath: string): string {
		return filePath.replace(/\\/g, "/");
	}

	/**
	 * 扫描项目,识别所有样式文件
	 */
	async scanProject(): Promise<StyleFileInventory> {
		// 重置错误记录
		this.scanErrors = [];

		const allFiles: string[] = [];

		// 扫描所有包含的目录
		for (const dir of scanConfig.includeDirs) {
			const fullPath = path.join(this.projectRoot, dir);
			if (fs.existsSync(fullPath)) {
				this.scanDirectory(fullPath, allFiles);
			}
		}

		// 分类文件
		const inventory: StyleFileInventory = {
			globalStyles: [],
			utilityStyles: [],
			componentStyles: [],
		};

		for (const file of allFiles) {
			const relativePath = this.normalizePath(path.relative(this.projectRoot, file));
			const category = this.categorizeFile(relativePath);

			switch (category) {
				case "global":
					inventory.globalStyles.push(relativePath);
					break;
				case "utility":
					inventory.utilityStyles.push(relativePath);
					break;
				case "component":
					inventory.componentStyles.push(relativePath);
					break;
			}
		}

		return inventory;
	}

	/**
	 * 递归扫描目录
	 */
	private scanDirectory(dir: string, results: string[]): void {
		// 检查是否应该排除此目录
		const dirName = path.basename(dir);
		if (scanConfig.excludeDirs.includes(dirName)) {
			return;
		}

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					// 递归扫描子目录
					this.scanDirectory(fullPath, results);
				} else if (entry.isFile()) {
					// 检查是否是样式文件
					if (this.isStyleFile(fullPath, entry.name)) {
						results.push(fullPath);
					}
				}
			}
		} catch (error) {
			this.scanErrors.push({ path: dir, error });
			console.warn(`无法读取目录 ${dir}:`, error);
		}
	}

	/**
	 * 检查文件是否是样式文件
	 * 对于 Vue 文件，会检查是否包含 <style> 标签
	 */
	private isStyleFile(fullPath: string, filename: string): boolean {
		// CSS 文件直接返回 true
		if (scanConfig.cssFilePattern.test(filename)) {
			return true;
		}

		// Vue 组件文件需要检查是否包含 <style> 标签
		if (scanConfig.vueFilePattern.test(filename)) {
			return this.hasStyleTag(fullPath);
		}

		return false;
	}

	/**
	 * 根据文件路径分类文件
	 */
	categorizeFile(relativePath: string): FileCategory {
		const normalizedPath = this.normalizePath(relativePath);

		// 检查是否是全局样式文件
		const normalizedGlobalPaths = scanConfig.globalStylePaths.map((p) => this.normalizePath(p));
		if (normalizedGlobalPaths.includes(normalizedPath)) {
			return "global";
		}

		// 检查是否是工具样式文件
		if (scanConfig.utilityStylePattern.test(normalizedPath)) {
			return "utility";
		}

		// 其他都归类为组件样式
		return "component";
	}

	/**
	 * 检查 Vue 文件是否包含 <style> 标签
	 */
	hasStyleTag(filePath: string): boolean {
		try {
			const content = fs.readFileSync(filePath, "utf-8");
			return /<style[^>]*>/.test(content);
		} catch (error) {
			this.scanErrors.push({ path: filePath, error });
			console.warn(`无法读取文件 ${filePath}:`, error);
			return false;
		}
	}

	/**
	 * 获取文件的样式内容
	 * 对于 CSS 文件,返回完整内容
	 * 对于 Vue 文件,提取 <style> 标签内容
	 */
	getStyleContent(filePath: string): string {
		try {
			const content = fs.readFileSync(filePath, "utf-8");

			// 如果是 Vue 文件,提取 <style> 标签内容
			if (scanConfig.vueFilePattern.test(filePath)) {
				const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
				return styleMatch ? styleMatch[1] : "";
			}

			// CSS 文件直接返回内容
			return content;
		} catch (error) {
			this.scanErrors.push({ path: filePath, error });
			console.warn(`无法读取文件 ${filePath}:`, error);
			return "";
		}
	}
}
