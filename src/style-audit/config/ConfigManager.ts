/**
 * 配置管理器
 * 负责加载和管理项目特定的样式标准配置
 */

import type { StyleStandards } from "../types";
import { defaultStyleStandards, scanConfig, reportConfig } from "../config";
import * as fs from "fs";
import * as path from "path";

/**
 * 审查配置
 */
export interface AuditConfig {
	// 样式标准
	standards: StyleStandards;

	// 扫描配置
	scan: {
		includeDirs: string[];
		excludeDirs: string[];
		cssFilePattern: RegExp;
		vueFilePattern: RegExp;
		globalStylePaths: string[];
		utilityStylePattern: RegExp;
	};

	// 报告配置
	report: {
		outputDir: string;
		defaultFormat: "markdown" | "html" | "json";
		includeCodeExamples: boolean;
		generateFixPlan: boolean;
	};

	// 检查规则配置
	rules: {
		// 启用/禁用特定检查
		naming: boolean;
		color: boolean;
		spacing: boolean;
		animation: boolean;
		responsive: boolean;
		quality: boolean;
		comment: boolean;

		// 严重性级别覆盖
		severityOverrides?: {
			[key: string]: "critical" | "moderate" | "minor";
		};
	};
}

/**
 * 配置文件格式
 */
interface ConfigFile {
	standards?: Partial<StyleStandards>;
	scan?: Partial<AuditConfig["scan"]>;
	report?: Partial<AuditConfig["report"]>;
	rules?: Partial<AuditConfig["rules"]>;
}

/**
 * 配置管理器
 */
export class ConfigManager {
	private config: AuditConfig;
	private projectRoot: string;

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
		this.config = this.getDefaultConfig();
	}

	/**
	 * 获取默认配置
	 */
	private getDefaultConfig(): AuditConfig {
		return {
			standards: defaultStyleStandards,
			scan: scanConfig,
			report: reportConfig,
			rules: {
				naming: true,
				color: true,
				spacing: true,
				animation: true,
				responsive: true,
				quality: true,
				comment: true,
			},
		};
	}

	/**
	 * 加载配置文件
	 * 支持多种配置文件格式: .styleauditrc.json, .styleauditrc.js, style-audit.config.js
	 */
	async loadConfig(): Promise<AuditConfig> {
		const configFiles = [".styleauditrc.json", ".styleauditrc.js", "style-audit.config.js"];

		for (const configFile of configFiles) {
			const configPath = path.join(this.projectRoot, configFile);

			if (fs.existsSync(configPath)) {
				try {
					const userConfig = await this.loadConfigFile(configPath);
					this.mergeConfig(userConfig);
					console.log(`已加载配置文件: ${configFile}`);
					break;
				} catch (error) {
					console.error(`加载配置文件失败: ${configFile}`, error);
				}
			}
		}

		return this.config;
	}

	/**
	 * 加载配置文件
	 */
	private async loadConfigFile(configPath: string): Promise<ConfigFile> {
		const ext = path.extname(configPath);

		if (ext === ".json") {
			const content = await fs.promises.readFile(configPath, "utf-8");
			return JSON.parse(content);
		} else if (ext === ".js") {
			// 动态导入 JS 配置文件
			const module = await import(configPath);
			return module.default || module;
		}

		throw new Error(`不支持的配置文件格式: ${ext}`);
	}

	/**
	 * 合并用户配置到默认配置
	 */
	private mergeConfig(userConfig: ConfigFile): void {
		// 合并样式标准
		if (userConfig.standards) {
			this.config.standards = this.deepMerge(this.config.standards, userConfig.standards);
		}

		// 合并扫描配置
		if (userConfig.scan) {
			this.config.scan = {
				...this.config.scan,
				...userConfig.scan,
			};
		}

		// 合并报告配置
		if (userConfig.report) {
			this.config.report = {
				...this.config.report,
				...userConfig.report,
			};
		}

		// 合并规则配置
		if (userConfig.rules) {
			this.config.rules = {
				...this.config.rules,
				...userConfig.rules,
			};
		}
	}

	/**
	 * 深度合并对象
	 */
	private deepMerge<T>(target: T, source: Partial<T>): T {
		const result = { ...target };

		for (const key in source) {
			const sourceValue = source[key];
			const targetValue = result[key];

			if (
				sourceValue &&
				typeof sourceValue === "object" &&
				!Array.isArray(sourceValue) &&
				targetValue &&
				typeof targetValue === "object" &&
				!Array.isArray(targetValue)
			) {
				result[key] = this.deepMerge(targetValue, sourceValue as any);
			} else if (sourceValue !== undefined) {
				result[key] = sourceValue as any;
			}
		}

		return result;
	}

	/**
	 * 获取当前配置
	 */
	getConfig(): AuditConfig {
		return this.config;
	}

	/**
	 * 更新配置
	 */
	updateConfig(updates: Partial<ConfigFile>): void {
		this.mergeConfig(updates);
	}

	/**
	 * 保存配置到文件
	 */
	async saveConfig(format: "json" | "js" = "json"): Promise<void> {
		const fileName = format === "json" ? ".styleauditrc.json" : "style-audit.config.js";
		const configPath = path.join(this.projectRoot, fileName);

		const configToSave: ConfigFile = {
			standards: this.config.standards,
			scan: this.config.scan,
			report: this.config.report,
			rules: this.config.rules,
		};

		if (format === "json") {
			const content = JSON.stringify(configToSave, null, 2);
			await fs.promises.writeFile(configPath, content, "utf-8");
		} else {
			const content = `module.exports = ${JSON.stringify(configToSave, null, 2)};`;
			await fs.promises.writeFile(configPath, content, "utf-8");
		}

		console.log(`配置已保存到: ${configPath}`);
	}

	/**
	 * 检查规则是否启用
	 */
	isRuleEnabled(ruleName: keyof AuditConfig["rules"]): boolean {
		return this.config.rules[ruleName] === true;
	}

	/**
	 * 获取严重性级别覆盖
	 */
	getSeverityOverride(issueKey: string): "critical" | "moderate" | "minor" | undefined {
		return this.config.rules.severityOverrides?.[issueKey];
	}
}

/**
 * 创建配置管理器
 */
export function createConfigManager(projectRoot: string): ConfigManager {
	return new ConfigManager(projectRoot);
}
