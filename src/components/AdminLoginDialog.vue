<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useAuth } from "@/composables/useAuth";

/**
 * 管理员登录对话框组件
 *
 * 实现需求:
 * - 2.1: 显示登录对话框
 * - 2.2: 邮箱密码输入表单
 * - 2.3: 表单验证和错误提示
 */

// Props
interface Props {
	visible: boolean;
}
const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
	"update:visible": [value: boolean];
	success: [];
}>();

// Composables
const { login } = useAuth();

// 表单数据
const formData = ref({
	email: "",
	password: "",
});

// 表单引用
const formRef = ref();

// 加载状态
const loading = ref(false);

// 错误信息
const errorMessage = ref("");

// 表单验证规则
const rules = {
	email: [
		{ required: true, message: "请输入邮箱", trigger: "blur" },
		{ type: "email", message: "请输入有效的邮箱地址", trigger: "blur" },
	],
	password: [
		{ required: true, message: "请输入密码", trigger: "blur" },
		{ min: 6, message: "密码至少 6 个字符", trigger: "blur" },
	],
};

// 处理登录
const handleLogin = async () => {
	if (!formRef.value) return;

	try {
		// 清空之前的错误信息
		errorMessage.value = "";

		// 验证表单
		await formRef.value.validate();

		loading.value = true;

		// 调用登录方法
		await login(formData.value.email, formData.value.password);

		// 登录成功
		ElMessage.success("登录成功");
		emit("success");
		handleClose();
	} catch (error) {
		// 显示错误信息
		if (error instanceof Error) {
			errorMessage.value = error.message;
		} else {
			errorMessage.value = "登录失败，请重试";
		}
	} finally {
		loading.value = false;
	}
};

// 关闭对话框
const handleClose = () => {
	emit("update:visible", false);
	// 重置表单
	formRef.value?.resetFields();
	formData.value = {
		email: "",
		password: "",
	};
	// 清空错误信息
	errorMessage.value = "";
};

// 监听对话框关闭
watch(
	() => props.visible,
	(newVal) => {
		if (!newVal) {
			// 对话框关闭时重置表单
			formRef.value?.resetFields();
		}
	}
);
</script>

<template>
	<el-dialog
		:model-value="visible"
		title="管理员登录"
		width="480px"
		@close="handleClose"
		class="admin-login-dialog">
		<div class="login-content">
			<el-form
				ref="formRef"
				:model="formData"
				:rules="rules"
				label-width="80px"
				@submit.prevent="handleLogin"
				class="login-form">
				<el-form-item label="邮箱" prop="email">
					<el-input
						v-model="formData.email"
						type="email"
						placeholder="请输入管理员邮箱"
						:disabled="loading"
						autocomplete="email"
						clearable />
				</el-form-item>

				<el-form-item label="密码" prop="password" class="password-item">
					<el-input
						v-model="formData.password"
						type="password"
						placeholder="请输入密码"
						:disabled="loading"
						autocomplete="current-password"
						show-password
						@keyup.enter="handleLogin" />
				</el-form-item>

				<!-- 错误提示 -->
				<div v-if="errorMessage" class="error-message">
					<el-icon class="error-icon"><Warning /></el-icon>
					<span class="error-text">{{ errorMessage }}</span>
				</div>
			</el-form>
		</div>

		<template #footer>
			<div class="dialog-footer">
				<el-button @click="handleClose" :disabled="loading" size="large"> 取消 </el-button>
				<el-button type="primary" :loading="loading" @click="handleLogin" size="large">
					登录
				</el-button>
			</div>
		</template>
	</el-dialog>
</template>

<style scoped>
/* Dialog Animation */
:deep(.el-dialog) {
	animation: dialogFadeIn 0.3s ease;
	border-radius: var(--radius-xl);
}

@keyframes dialogFadeIn {
	from {
		opacity: 0;
		transform: scale(0.95);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

:deep(.el-overlay) {
	animation: overlayFadeIn 0.3s ease;
}

@keyframes overlayFadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

/* Login Content */
.login-content {
	padding: var(--spacing-md) 0;
}

/* Form Styles */
.login-form {
	margin-top: 0;
}

:deep(.el-form-item) {
	margin-bottom: var(--spacing-lg);
}

:deep(.el-form-item__label) {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
}

/* 密码输入框段前间距 */
.password-item {
	margin-top: var(--spacing-xl);
}

/* 错误提示 */
.error-message {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-md);
	background: rgba(245, 108, 108, 0.1);
	border: 1px solid var(--danger-color);
	border-radius: var(--radius-md);
	margin-top: var(--spacing-lg);
	animation: errorSlideIn 0.3s ease;
}

@keyframes errorSlideIn {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.error-icon {
	font-size: 18px;
	line-height: 1;
}

.error-text {
	flex: 1;
	font-size: 14px;
	color: var(--danger-color);
	font-weight: 500;
	line-height: 1.5;
}

/* Footer - 移除顶部分隔线 */
.dialog-footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-md);
}

:deep(.el-dialog__footer) {
	border-top: none;
	padding-top: var(--spacing-lg);
}

:deep(.dialog-footer .el-button) {
	min-width: 100px;
	border-radius: var(--radius-lg);
	font-weight: 600;
	transition: all 0.3s ease;
}

:deep(.dialog-footer .el-button:hover) {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px var(--shadow-md);
}

:deep(.dialog-footer .el-button:active) {
	transform: translateY(0);
}

/* Responsive Design */
@media (max-width: 768px) {
	:deep(.el-dialog) {
		width: 90% !important;
		margin: var(--spacing-lg);
	}

	.login-icon {
		font-size: 40px;
	}

	.dialog-footer {
		flex-direction: column-reverse;
	}

	:deep(.dialog-footer .el-button) {
		width: 100%;
	}
}
</style>
