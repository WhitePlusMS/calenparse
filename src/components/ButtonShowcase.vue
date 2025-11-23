<script setup lang="ts">
import { ref } from "vue";

/**
 * ButtonShowcase Component
 *
 * 展示按钮系统的各种样式和状态
 * 用于开发和测试按钮组件
 */

const isLoading = ref(false);

const handleClick = () => {
	console.log("Button clicked!");
};

const handleLoadingClick = () => {
	isLoading.value = true;
	setTimeout(() => {
		isLoading.value = false;
	}, 2000);
};
</script>

<template>
	<div class="button-showcase">
		<div class="showcase-container">
			<h1>按钮系统展示</h1>
			<p class="text-secondary">CalenParse 统一按钮样式系统</p>

			<!-- 主要按钮 -->
			<section class="showcase-section">
				<h2>主要按钮 (Primary)</h2>
				<p class="text-secondary">填充样式，主色调，用于主要操作</p>
				<div class="button-group">
					<button class="btn btn-primary btn-small" @click="handleClick">小按钮</button>
					<button class="btn btn-primary" @click="handleClick">默认按钮</button>
					<button class="btn btn-primary btn-large" @click="handleClick">大按钮</button>
					<button class="btn btn-primary" disabled>禁用状态</button>
					<button
						class="btn btn-primary"
						:class="{ 'btn-loading': isLoading }"
						@click="handleLoadingClick">
						{{ isLoading ? "加载中..." : "加载按钮" }}
					</button>
				</div>
			</section>

			<!-- 次要按钮 -->
			<section class="showcase-section">
				<h2>次要按钮 (Secondary)</h2>
				<p class="text-secondary">轮廓样式，中性色，用于次要操作</p>
				<div class="button-group">
					<button class="btn btn-secondary btn-small" @click="handleClick">小按钮</button>
					<button class="btn btn-secondary" @click="handleClick">默认按钮</button>
					<button class="btn btn-secondary btn-large" @click="handleClick">大按钮</button>
					<button class="btn btn-secondary" disabled>禁用状态</button>
				</div>
			</section>

			<!-- 危险按钮 -->
			<section class="showcase-section">
				<h2>危险按钮 (Danger)</h2>
				<p class="text-secondary">红色警告色，用于删除等危险操作</p>
				<div class="button-group">
					<button class="btn btn-danger btn-small" @click="handleClick">小按钮</button>
					<button class="btn btn-danger" @click="handleClick">默认按钮</button>
					<button class="btn btn-danger btn-large" @click="handleClick">大按钮</button>
					<button class="btn btn-danger" disabled>禁用状态</button>
				</div>
			</section>

			<!-- 图标按钮 -->
			<section class="showcase-section">
				<h2>图标按钮</h2>
				<p class="text-secondary">圆形图标按钮，用于工具栏和快捷操作</p>
				<div class="button-group">
					<button class="btn btn-primary btn-icon btn-small" @click="handleClick">
						<span>+</span>
					</button>
					<button class="btn btn-primary btn-icon" @click="handleClick">
						<span>✓</span>
					</button>
					<button class="btn btn-primary btn-icon btn-large" @click="handleClick">
						<span>×</span>
					</button>
					<button class="btn btn-secondary btn-icon" @click="handleClick">
						<span>⚙</span>
					</button>
					<button class="btn btn-danger btn-icon" @click="handleClick">
						<span>🗑</span>
					</button>
				</div>
			</section>

			<!-- 块级按钮 -->
			<section class="showcase-section">
				<h2>块级按钮</h2>
				<p class="text-secondary">占满容器宽度的按钮</p>
				<div class="button-stack">
					<button class="btn btn-primary btn-block" @click="handleClick">主要操作</button>
					<button class="btn btn-secondary btn-block" @click="handleClick">
						次要操作
					</button>
					<button class="btn btn-danger btn-block" @click="handleClick">危险操作</button>
				</div>
			</section>

			<!-- 按钮组合 -->
			<section class="showcase-section">
				<h2>按钮组合</h2>
				<p class="text-secondary">多个按钮的组合使用</p>
				<div class="button-group">
					<button class="btn btn-secondary" @click="handleClick">取消</button>
					<button class="btn btn-primary" @click="handleClick">确认</button>
				</div>
				<div class="button-group mt-md">
					<button class="btn btn-danger" @click="handleClick">删除</button>
					<button class="btn btn-secondary" @click="handleClick">编辑</button>
					<button class="btn btn-primary" @click="handleClick">保存</button>
				</div>
			</section>

			<!-- 带图标的按钮 -->
			<section class="showcase-section">
				<h2>带图标的按钮</h2>
				<p class="text-secondary">按钮文字配合图标</p>
				<div class="button-group">
					<button class="btn btn-primary" @click="handleClick">
						<span>➕</span>
						<span>添加事件</span>
					</button>
					<button class="btn btn-secondary" @click="handleClick">
						<span>📤</span>
						<span>分享</span>
					</button>
					<button class="btn btn-danger" @click="handleClick">
						<span>🗑️</span>
						<span>删除</span>
					</button>
				</div>
			</section>
		</div>
	</div>
</template>

<style scoped>
.button-showcase {
	min-height: 100vh;
	padding: var(--spacing-2xl);
	background: var(--bg-color);
}

.showcase-container {
	max-width: 1200px;
	margin: 0 auto;
}

.showcase-container > h1 {
	margin-bottom: var(--spacing-sm);
}

.showcase-container > p {
	margin-bottom: var(--spacing-2xl);
}

.showcase-section {
	margin-bottom: var(--spacing-2xl);
	padding: var(--spacing-xl);
	background: var(--bg-secondary);
	border-radius: var(--radius-xl);
	box-shadow: 0 2px 8px var(--shadow);
}

.showcase-section h2 {
	margin-bottom: var(--spacing-xs);
}

.showcase-section > p {
	margin-bottom: var(--spacing-lg);
}

.button-group {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-md);
	align-items: center;
}

.button-stack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
	max-width: 400px;
}

@media (max-width: 768px) {
	.button-showcase {
		padding: var(--spacing-lg);
	}

	.showcase-section {
		padding: var(--spacing-lg);
	}

	.button-group {
		gap: var(--spacing-sm);
	}
}
</style>
