/**
 * 样式文件扫描器使用示例
 *
 * 此文件展示如何使用 StyleFileScanner 扫描项目中的样式文件
 */

import { StyleFileScannerImpl } from "./StyleFileScanner";

async function main() {
	// 创建扫描器实例
	const scanner = new StyleFileScannerImpl();

	console.log("开始扫描项目样式文件...\n");

	// 扫描项目
	const inventory = await scanner.scanProject();

	// 输出结果
	console.log("=== 扫描结果 ===\n");

	console.log(`全局样式文件 (${inventory.globalStyles.length} 个):`);
	inventory.globalStyles.forEach((file) => console.log(`  - ${file}`));
	console.log();

	console.log(`工具样式文件 (${inventory.utilityStyles.length} 个):`);
	inventory.utilityStyles.forEach((file) => console.log(`  - ${file}`));
	console.log();

	console.log(`组件样式文件 (${inventory.componentStyles.length} 个):`);
	inventory.componentStyles.forEach((file) => console.log(`  - ${file}`));
	console.log();

	// 统计信息
	const totalFiles =
		inventory.globalStyles.length + inventory.utilityStyles.length + inventory.componentStyles.length;

	console.log(`总计: ${totalFiles} 个样式文件`);
}

// 如果直接运行此文件,执行 main 函数
if (require.main === module) {
	main().catch(console.error);
}
