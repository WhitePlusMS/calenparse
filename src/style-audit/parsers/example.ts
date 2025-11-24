/**
 * CSS 解析器使用示例
 */

import { createCSSParser } from "./CSSParser";

async function main() {
	const parser = createCSSParser();

	// 示例 CSS 内容
	const css = `
		:root {
			--primary-color: #667eea;
			--spacing-md: 16px;
			--font-size-base: 14px;
		}
		
		.btn-primary {
			background: var(--primary-color);
			padding: var(--spacing-md);
			font-size: var(--font-size-base);
			border-radius: 4px;
		}
		
		.m-md {
			margin: 16px;
		}
		
		@keyframes fadeIn {
			from { opacity: 0; }
			to { opacity: 1; }
		}
		
		@media (max-width: 768px) {
			.btn-primary {
				padding: 8px;
			}
		}
	`;

	try {
		// 解析 CSS
		const parsed = await parser.parse(css, "example.css");

		console.log("=== CSS 解析结果 ===\n");

		// 显示变量
		console.log(`发现 ${parsed.variables.length} 个 CSS 变量:`);
		parsed.variables.forEach((v) => {
			console.log(`  ${v.name}: ${v.value} (类别: ${v.category})`);
		});

		// 显示类名
		console.log(`\n发现 ${parsed.classes.length} 个 CSS 类:`);
		parsed.classes.forEach((c) => {
			console.log(`  .${c.name} (类型: ${c.type}, 属性数: ${c.properties.length})`);
		});

		// 显示选择器
		console.log(`\n发现 ${parsed.selectors.length} 个选择器:`);
		parsed.selectors.forEach((s) => {
			console.log(`  ${s.selector} (特异性: ${s.specificity})`);
		});

		// 显示动画
		console.log(`\n发现 ${parsed.animations.length} 个动画:`);
		parsed.animations.forEach((a) => {
			console.log(`  @keyframes ${a.name}`);
		});

		// 显示媒体查询
		console.log(`\n发现 ${parsed.mediaQueries.length} 个媒体查询:`);
		parsed.mediaQueries.forEach((mq) => {
			console.log(`  @media ${mq.query}`);
		});
	} catch (error) {
		console.error("解析错误:", error);
	}
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
