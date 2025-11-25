<script setup lang="ts">
import { useTheme } from "@/composables/useTheme";
import { useCountdownSettings } from "@/composables/useCountdownSettings";
import { ElMessage } from "element-plus";

/**
 * Theme Settings Component
 * Implements requirements 14.1-14.6
 * Task 27: Theme customization functionality
 * Task 6.1: Countdown settings (Requirements 6.1, 6.2, 6.3)
 */

const { theme, setMode, setPrimaryColor, resetTheme, toggleMode } = useTheme();
const { settings: countdownSettings, updateSettings: updateCountdownSettings } = useCountdownSettings();

// Predefined color options
const colorPresets = [
	{ name: "默认蓝", value: "#409eff" },
	{ name: "紫色", value: "#667eea" },
	{ name: "绿色", value: "#67c23a" },
	{ name: "橙色", value: "#e6a23c" },
	{ name: "红色", value: "#f56c6c" },
	{ name: "粉色", value: "#f472b6" },
	{ name: "青色", value: "#06b6d4" },
	{ name: "靛蓝", value: "#6366f1" },
];

const handleReset = () => {
	resetTheme();
	ElMessage.success("主题已重置为默认设置");
};
</script>

<template>
	<div class="theme-settings">
		<!-- Mode Selection -->
		<div class="setting-section">
			<h3 class="section-title">
				<el-icon><MoonNight /></el-icon> 主题模式
			</h3>
			<div class="mode-selector">
				<button
					:class="['mode-button', { active: theme.mode === 'light' }]"
					@click="setMode('light')">
					<el-icon class="mode-icon"><Sunny /></el-icon>
					<span class="mode-label">浅色模式</span>
				</button>
				<button
					:class="['mode-button', { active: theme.mode === 'dark' }]"
					@click="setMode('dark')">
					<el-icon class="mode-icon"><Moon /></el-icon>
					<span class="mode-label">深色模式</span>
				</button>
			</div>
			<p class="setting-hint">选择您喜欢的主题模式</p>
		</div>

		<!-- Primary Color -->
		<div class="setting-section">
			<h3 class="section-title">
				<el-icon><Brush /></el-icon> 主色调
			</h3>
			<div class="color-presets">
				<button
					v-for="preset in colorPresets"
					:key="preset.value"
					:class="['color-preset', { active: theme.primaryColor === preset.value }]"
					:style="{ backgroundColor: preset.value }"
					:title="preset.name"
					@click="setPrimaryColor(preset.value)">
					<span v-if="theme.primaryColor === preset.value" class="check-icon">✓</span>
				</button>
			</div>
			<div class="custom-color">
				<label class="color-label">自定义颜色：</label>
				<input
					type="color"
					:value="theme.primaryColor"
					class="color-picker"
					@input="(e) => setPrimaryColor((e.target as HTMLInputElement).value)" />
				<span class="color-value">{{ theme.primaryColor }}</span>
			</div>
			<p class="setting-hint">主色调用于标题栏和主要按钮</p>
		</div>

		<!-- Countdown Settings -->
		<div class="setting-section">
			<h3 class="section-title">
				<el-icon><Timer /></el-icon> 倒计时设置
			</h3>

			<!-- Enable/Disable Toggle -->
			<div class="countdown-toggle">
				<label class="toggle-label">
					<input
						type="checkbox"
						:checked="countdownSettings.enabled"
						class="toggle-checkbox"
						@change="(e) => updateCountdownSettings({ enabled: (e.target as HTMLInputElement).checked })" />
					<span class="toggle-switch"></span>
					<span class="toggle-text">显示倒计时</span>
				</label>
			</div>
			<p class="setting-hint">在列表视图中显示日程的倒计时信息</p>

			<!-- Unit Selector -->
			<div v-if="countdownSettings.enabled" class="unit-selector">
				<label class="unit-label">倒计时单位：</label>
				<div class="unit-options">
					<button
						:class="['unit-button', { active: countdownSettings.unit === 'day' }]"
						@click="updateCountdownSettings({ unit: 'day' })">
						<el-icon class="unit-icon"><Calendar /></el-icon>
						<span class="unit-name">天</span>
					</button>
					<button
						:class="['unit-button', { active: countdownSettings.unit === 'hour' }]"
						@click="updateCountdownSettings({ unit: 'hour' })">
						<el-icon class="unit-icon"><Timer /></el-icon>
						<span class="unit-name">小时</span>
					</button>
					<button
						:class="[
							'unit-button',
							{ active: countdownSettings.unit === 'minute' },
						]"
						@click="updateCountdownSettings({ unit: 'minute' })">
						<el-icon class="unit-icon"><Clock /></el-icon>
						<span class="unit-name">分钟</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Preview -->
		<div class="setting-section">
			<h3 class="section-title">
				<el-icon><View /></el-icon> 预览
			</h3>
			<div class="preview-box">
				<div class="preview-header" :style="{ backgroundColor: theme.primaryColor }">
					<h4>CalenParse</h4>
				</div>
				<div class="preview-content">
					<p>这是一段示例文本</p>
					<button class="preview-button" :style="{ backgroundColor: theme.primaryColor }">
						示例按钮
					</button>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="setting-actions">
			<button class="btn btn-secondary" @click="handleReset">重置为默认</button>
			<button class="btn btn-primary" @click="toggleMode">
				快速切换 {{ theme.mode === "light" ? "深色" : "浅色" }}模式
			</button>
		</div>
	</div>
</template>

<style scoped>
.theme-settings {
	padding: 24px;
	max-width: 600px;
	margin: 0 auto;
}

/* Section */
.setting-section {
	margin-bottom: 32px;
	padding-bottom: 24px;
	border-bottom: 1px solid var(--border-light);
}

.setting-section:last-of-type {
	border-bottom: none;
}

.section-title {
	margin: 0 0 16px 0;
	font-size: 18px;
	font-weight: 600;
	color: var(--text-primary);
}

.setting-hint {
	margin: 12px 0 0 0;
	font-size: 13px;
	color: var(--text-tertiary);
}

/* Mode Selector */
.mode-selector {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

.mode-button {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 20px;
	border: 2px solid var(--border-color);
	background: var(--bg-secondary);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.3s ease;
}

.mode-button:hover {
	border-color: var(--primary-color);
	background: var(--bg-hover);
	transform: translateY(-2px);
	box-shadow: 0 4px 12px var(--shadow);
}

.mode-button.active {
	border-color: var(--primary-color);
	background: var(--bg-hover);
	box-shadow: 0 0 0 3px var(--shadow);
}

.mode-icon {
	font-size: 32px;
}

.mode-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
}

.mode-button.active .mode-label {
	color: var(--primary-color);
}

/* Color Presets */
.color-presets {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
	gap: 12px;
	margin-bottom: 16px;
}

.color-preset {
	position: relative;
	width: 100%;
	aspect-ratio: 1;
	border: 3px solid transparent;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.3s ease;
	display: flex;
	align-items: center;
	justify-content: center;
}

.color-preset:hover {
	transform: scale(1.1);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.color-preset.active {
	border-color: var(--text-primary);
	box-shadow: 0 0 0 3px var(--shadow);
}

.check-icon {
	color: white;
	font-size: 20px;
	font-weight: bold;
	text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Custom Color */
.custom-color {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
	background: var(--bg-color);
	border-radius: 8px;
}

.color-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
}

.color-picker {
	width: 50px;
	height: 40px;
	border: 2px solid var(--border-color);
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.3s ease;
}

.color-picker:hover {
	border-color: var(--primary-color);
}

.color-value {
	font-size: 13px;
	font-family: monospace;
	color: var(--text-tertiary);
	text-transform: uppercase;
}

/* Preview */
.preview-box {
	border: 2px solid var(--border-color);
	border-radius: 8px;
	overflow: hidden;
	box-shadow: 0 2px 8px var(--shadow);
}

.preview-header {
	padding: 16px;
	color: white;
	text-align: center;
}

.preview-header h4 {
	margin: 0;
	font-size: 18px;
	font-weight: 600;
}

.preview-content {
	padding: 20px;
	background: var(--bg-secondary);
	text-align: center;
}

.preview-content p {
	margin: 0 0 16px 0;
	color: var(--text-secondary);
}

.preview-button {
	padding: 10px 24px;
	border: none;
	border-radius: 6px;
	color: white;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
}

.preview-button:hover {
	opacity: 0.9;
	transform: translateY(-1px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Countdown Settings */
.countdown-toggle {
	margin-bottom: 16px;
}

.toggle-label {
	display: flex;
	align-items: center;
	gap: 12px;
	cursor: pointer;
	user-select: none;
}

.toggle-checkbox {
	display: none;
}

.toggle-switch {
	position: relative;
	width: 50px;
	height: 28px;
	background: var(--border-color);
	border-radius: 14px;
	transition: all 0.3s ease;
	/* 增加可点击区域以满足触摸目标要求 */
	padding: 8px 0;
}

.toggle-switch::after {
	content: "";
	position: absolute;
	top: 3px;
	left: 3px;
	width: 22px;
	height: 22px;
	background: white;
	border-radius: 50%;
	transition: all 0.3s ease;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-checkbox:checked + .toggle-switch {
	background: var(--primary-color);
}

.toggle-checkbox:checked + .toggle-switch::after {
	left: 25px;
}

.toggle-text {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
}

.unit-selector {
	margin-top: 16px;
}

.unit-label {
	display: block;
	margin-bottom: 12px;
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
}

.unit-options {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12px;
}

.unit-button {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 16px 12px;
	border: 2px solid var(--border-color);
	background: var(--bg-secondary);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.3s ease;
}

.unit-button:hover {
	border-color: var(--primary-color);
	background: var(--bg-hover);
	transform: translateY(-2px);
	box-shadow: 0 4px 12px var(--shadow);
}

.unit-button.active {
	border-color: var(--primary-color);
	background: var(--bg-hover);
	box-shadow: 0 0 0 3px var(--shadow);
}

.unit-icon {
	font-size: 24px;
}

.unit-name {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-secondary);
}

.unit-button.active .unit-name {
	color: var(--primary-color);
}

/* Actions */
.setting-actions {
	display: flex;
	gap: 12px;
	justify-content: center;
	margin-top: 24px;
}

.btn {
	padding: 12px 24px;
	border: none;
	border-radius: 6px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
}

.btn-primary {
	background: var(--primary-color);
	color: white;
}

.btn-primary:hover {
	background: var(--primary-light);
	transform: translateY(-1px);
	box-shadow: 0 4px 8px var(--shadow);
}

.btn-secondary {
	background: var(--text-tertiary);
	color: white;
}

.btn-secondary:hover {
	background: var(--text-secondary);
	transform: translateY(-1px);
	box-shadow: 0 4px 8px var(--shadow);
}

/* Responsive */
@media (max-width: 768px) {
	.theme-settings {
		padding: 16px;
	}

	.color-presets {
		grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
		gap: 8px;
	}

	.unit-options {
		gap: 8px;
	}

	.unit-button {
		padding: 12px 8px;
	}

	.unit-icon {
		font-size: 20px;
	}

	.unit-name {
		font-size: 12px;
	}

	.setting-actions {
		flex-direction: column;
	}

	.btn {
		width: 100%;
	}
}
</style>
