<script setup lang="ts">
import { ref } from "vue";

/**
 * AnimationShowcase Component
 *
 * 展示动画系统的各种效果
 * 用于开发和测试动画组件
 */

const showSuccess = ref(false);
const showError = ref(false);
const showList = ref(false);

const triggerSuccess = () => {
	showSuccess.value = true;
	setTimeout(() => {
		showSuccess.value = false;
	}, 1000);
};

const triggerError = () => {
	showError.value = true;
	setTimeout(() => {
		showError.value = false;
	}, 1000);
};

const toggleList = () => {
	showList.value = !showList.value;
};

const listItems = ["项目 1", "项目 2", "项目 3", "项目 4", "项目 5"];
</script>

<template>
	<div class="animation-showcase">
		<div class="showcase-container">
			<h1 class="fade-in">动画系统展示</h1>
			<p class="text-secondary slide-up delay-100">CalenParse 统一动画系统</p>

			<!-- 淡入动画 -->
			<section class="showcase-section fade-in delay-200">
				<h2>淡入动画 (Fade In)</h2>
				<p class="text-secondary">页面元素首次加载使用淡入动画</p>
				<div class="demo-grid">
					<div class="demo-box fade-in">淡入</div>
					<div class="demo-box fade-in-fast">快速淡入</div>
					<div class="demo-box fade-in-slow">慢速淡入</div>
				</div>
			</section>

			<!-- 滑动动画 -->
			<section class="showcase-section slide-up delay-300">
				<h2>滑动动画 (Slide)</h2>
				<p class="text-secondary">页面元素从不同方向滑入</p>
				<div class="demo-grid">
					<div class="demo-box slide-up">上滑</div>
					<div class="demo-box slide-down">下滑</div>
					<div class="demo-box slide-left">左滑</div>
					<div class="demo-box slide-right">右滑</div>
				</div>
			</section>

			<!-- 缩放动画 -->
			<section class="showcase-section slide-up delay-400">
				<h2>缩放动画 (Scale)</h2>
				<p class="text-secondary">元素缩放进入和退出</p>
				<div class="demo-grid">
					<div class="demo-box scale-in">缩放进入</div>
					<div class="demo-box scale-in delay-100">延迟缩放</div>
				</div>
			</section>

			<!-- 列表展开/收缩 -->
			<section class="showcase-section slide-up delay-500">
				<h2>展开/收缩动画 (Expand/Collapse)</h2>
				<p class="text-secondary">列表项添加或删除使用展开或收缩动画</p>
				<button class="btn btn-primary" @click="toggleList">
					{{ showList ? "收缩列表" : "展开列表" }}
				</button>
				<div v-if="showList" class="demo-list expand">
					<div
						v-for="(item, index) in listItems"
						:key="index"
						class="demo-list-item stagger-item">
						{{ item }}
					</div>
				</div>
			</section>

			<!-- 旋转动画 -->
			<section class="showcase-section slide-up">
				<h2>旋转动画 (Spin)</h2>
				<p class="text-secondary">加载指示器和图标旋转</p>
				<div class="demo-grid">
					<div class="demo-box">
						<span class="spin">⚙️</span>
						<span>旋转</span>
					</div>
					<div class="demo-box">
						<span class="spin-slow">🔄</span>
						<span>慢速旋转</span>
					</div>
					<div class="demo-box">
						<span class="spin-fast">⏳</span>
						<span>快速旋转</span>
					</div>
				</div>
			</section>

			<!-- 脉冲和弹跳 -->
			<section class="showcase-section slide-up">
				<h2>脉冲和弹跳 (Pulse & Bounce)</h2>
				<p class="text-secondary">吸引注意力的动画效果</p>
				<div class="demo-grid">
					<div class="demo-box pulse">脉冲</div>
					<div class="demo-box bounce">弹跳</div>
				</div>
			</section>

			<!-- 成功/失败微动画 -->
			<section class="showcase-section slide-up">
				<h2>成功/失败微动画</h2>
				<p class="text-secondary">操作结果的视觉反馈</p>
				<div class="demo-grid">
					<button class="btn btn-primary" @click="triggerSuccess">触发成功动画</button>
					<button class="btn btn-danger" @click="triggerError">触发失败动画</button>
				</div>
				<div class="demo-grid mt-md">
					<div class="demo-box" :class="{ 'success-pulse': showSuccess }">✓ 成功提示</div>
					<div class="demo-box" :class="{ 'error-shake': showError }">× 错误提示</div>
				</div>
			</section>

			<!-- 悬停效果 -->
			<section class="showcase-section slide-up">
				<h2>悬停效果 (Hover Effects)</h2>
				<p class="text-secondary">鼠标悬停时的交互反馈</p>
				<div class="demo-grid">
					<div class="demo-box hover-lift">悬停提升</div>
					<div class="demo-box hover-scale">悬停缩放</div>
					<div class="demo-box hover-glow">悬停发光</div>
				</div>
			</section>

			<!-- 骨架屏 -->
			<section class="showcase-section slide-up">
				<h2>骨架屏动画 (Skeleton)</h2>
				<p class="text-secondary">内容加载时的占位动画</p>
				<div class="skeleton-demo">
					<div
						class="skeleton"
						style="height: 20px; width: 60%; margin-bottom: 12px"></div>
					<div
						class="skeleton"
						style="height: 16px; width: 80%; margin-bottom: 8px"></div>
					<div class="skeleton" style="height: 16px; width: 70%"></div>
				</div>
			</section>

			<!-- 交错动画 -->
			<section class="showcase-section slide-up">
				<h2>交错动画 (Stagger)</h2>
				<p class="text-secondary">列表项依次出现的效果</p>
				<div class="demo-list">
					<div class="demo-list-item stagger-item">交错项目 1</div>
					<div class="demo-list-item stagger-item">交错项目 2</div>
					<div class="demo-list-item stagger-item">交错项目 3</div>
					<div class="demo-list-item stagger-item">交错项目 4</div>
					<div class="demo-list-item stagger-item">交错项目 5</div>
				</div>
			</section>

			<!-- 缓动函数说明 -->
			<section class="showcase-section slide-up">
				<h2>缓动函数 (Easing Functions)</h2>
				<p class="text-secondary">使用自然的缓动函数创建流畅的运动效果</p>
				<div class="easing-info">
					<div class="easing-item"><strong>ease-in:</strong> 慢速开始，快速结束</div>
					<div class="easing-item">
						<strong>ease-out:</strong> 快速开始，慢速结束（推荐）
					</div>
					<div class="easing-item"><strong>ease-in-out:</strong> 慢速开始和结束</div>
					<div class="easing-item"><strong>ease-natural:</strong> 自然流畅的运动</div>
					<div class="easing-item"><strong>ease-bounce:</strong> 弹性效果</div>
				</div>
			</section>

			<!-- 可访问性说明 -->
			<section class="showcase-section slide-up">
				<h2>可访问性支持</h2>
				<p class="text-secondary">
					系统自动支持 <code>prefers-reduced-motion</code>
					媒体查询，为偏好减少动画的用户禁用或简化动画效果。
				</p>
			</section>
		</div>
	</div>
</template>

<style scoped>
.animation-showcase {
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

.demo-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: var(--spacing-md);
}

.demo-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-xl);
	background: var(--bg-hover);
	border: 2px solid var(--border-light);
	border-radius: var(--radius-lg);
	font-weight: var(--font-weight-medium);
	min-height: 120px;
	cursor: pointer;
	user-select: none;
}

.demo-list {
	margin-top: var(--spacing-md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
}

.demo-list-item {
	padding: var(--spacing-md);
	background: var(--bg-hover);
	border-radius: var(--radius-md);
	border-left: 4px solid var(--primary-color);
}

.skeleton-demo {
	padding: var(--spacing-lg);
	background: var(--bg-hover);
	border-radius: var(--radius-lg);
}

.easing-info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
}

.easing-item {
	padding: var(--spacing-md);
	background: var(--bg-hover);
	border-radius: var(--radius-md);
	font-size: var(--font-size-sm);
}

.easing-item strong {
	color: var(--primary-color);
	font-family: monospace;
}

code {
	padding: 2px 6px;
	background: var(--bg-hover);
	border-radius: var(--radius-sm);
	font-family: monospace;
	font-size: var(--font-size-sm);
	color: var(--primary-color);
}

@media (max-width: 768px) {
	.animation-showcase {
		padding: var(--spacing-lg);
	}

	.showcase-section {
		padding: var(--spacing-lg);
	}

	.demo-grid {
		grid-template-columns: 1fr;
	}
}
</style>
