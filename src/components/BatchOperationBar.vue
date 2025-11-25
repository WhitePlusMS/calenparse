<script setup lang="ts">
/**
 * BatchOperationBar Component
 * Provides batch operation actions (delete, edit)
 * Implements requirements 12.3, 12.4, 12.5, 12.6, 12.7
 * Requirement 1.9: 访客模式禁用批量操作
 */

import { useAuth } from "@/composables/useAuth";
import { ElMessage } from "element-plus";

const { isAdmin } = useAuth();

// Props
interface Props {
	selectedCount: number;
}

defineProps<Props>();

// Emits
const emit = defineEmits<{
	delete: [];
	edit: [];
	cancel: [];
}>();

/**
 * Handle batch delete
 * Requirement 12.3: Implement batch delete with confirmation
 * Requirement 1.9: 访客模式禁用批量操作
 */
const handleDelete = () => {
	if (!isAdmin.value) {
		ElMessage.warning("访客模式不支持批量操作，请登录后使用完整功能");
		return;
	}
	emit("delete");
};

/**
 * Handle batch edit
 * Requirement 12.4: Implement batch edit
 * Requirement 1.9: 访客模式禁用批量操作
 */
const handleEdit = () => {
	if (!isAdmin.value) {
		ElMessage.warning("访客模式不支持批量操作，请登录后使用完整功能");
		return;
	}
	emit("edit");
};

/**
 * Handle cancel
 * Requirement 12.7: Cancel batch operation
 */
const handleCancel = () => {
	emit("cancel");
};
</script>

<template>
	<div class="batch-operation-bar">
		<div class="batch-operation-info">
			<span class="batch-operation-icon">✓</span>
			<span class="batch-operation-text"
				>已选择 <strong>{{ selectedCount }}</strong> 个事件</span
			>
		</div>

		<div class="batch-operation-actions">
			<!-- Batch Edit Button -->
			<!-- Requirement 12.4: Batch edit common fields -->
			<button class="batch-action-btn batch-action-btn--edit" @click="handleEdit">
				<span class="action-icon">✏️</span>
				<span class="action-text">批量编辑</span>
			</button>

			<!-- Batch Delete Button -->
			<!-- Requirement 12.3: Batch delete with confirmation -->
			<button class="batch-action-btn batch-action-btn--delete" @click="handleDelete">
				<span class="action-icon">🗑️</span>
				<span class="action-text">批量删除</span>
			</button>

			<!-- Cancel Button -->
			<button class="batch-action-btn batch-action-btn--cancel" @click="handleCancel">
				<span class="action-text">取消</span>
			</button>
		</div>
	</div>
</template>

<style scoped>
.batch-operation-bar {
	position: fixed;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24px;
	padding: 16px 24px;
	background: var(--bg-secondary);
	border: 2px solid var(--primary-color);
	border-radius: 12px;
	box-shadow: 0 8px 24px var(--shadow);
	z-index: 1000;
	min-width: 500px;
	animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
	from {
		opacity: 0;
		transform: translateX(-50%) translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
}

.batch-operation-info {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 15px;
	color: var(--text-secondary);
}

.batch-operation-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	background: var(--primary-color);
	color: white;
	border-radius: 50%;
	font-size: 14px;
	font-weight: bold;
}

.batch-operation-text {
	line-height: 1;
}

.batch-operation-text strong {
	color: var(--primary-color);
	font-weight: 600;
}

.batch-operation-actions {
	display: flex;
	align-items: center;
	gap: 12px;
}

.batch-action-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 10px 18px;
	border: 2px solid transparent;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
	white-space: nowrap;
}

.batch-action-btn:hover {
	transform: translateY(-2px);
}

.batch-action-btn--edit {
	background: var(--primary-color);
	color: white;
	border-color: var(--primary-color);
}

.batch-action-btn--edit:hover {
	background: var(--primary-light);
	border-color: var(--primary-light);
	box-shadow: 0 4px 12px var(--shadow);
}

.batch-action-btn--delete {
	background: var(--error-color);
	color: white;
	border-color: var(--error-color);
}

.batch-action-btn--delete:hover {
	background: #f78989;
	border-color: #f78989;
	box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}

.batch-action-btn--cancel {
	background: var(--bg-secondary);
	color: var(--text-secondary);
	border-color: var(--border-color);
}

.batch-action-btn--cancel:hover {
	background: var(--bg-hover);
	border-color: var(--border-light);
}

.action-icon {
	font-size: 16px;
	line-height: 1;
}

.action-text {
	line-height: 1;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
	.batch-operation-bar {
		min-width: auto;
		width: calc(100% - 40px);
		max-width: 600px;
		flex-direction: column;
		gap: 16px;
		padding: 14px 18px;
	}

	.batch-operation-info {
		width: 100%;
		justify-content: center;
	}

	.batch-operation-actions {
		width: 100%;
		justify-content: center;
		flex-wrap: wrap;
	}

	.batch-action-btn {
		flex: 1;
		min-width: 100px;
		justify-content: center;
	}
}

@media (max-width: 480px) {
	.batch-operation-bar {
		bottom: 10px;
		width: calc(100% - 20px);
		padding: 12px 14px;
		gap: 12px;
	}

	.batch-operation-info {
		font-size: 14px;
	}

	.batch-operation-icon {
		width: 24px;
		height: 24px;
		font-size: 12px;
	}

	.batch-operation-actions {
		gap: 8px;
	}

	.batch-action-btn {
		padding: 8px 14px;
		font-size: 13px;
		min-width: 80px;
	}

	.action-icon {
		font-size: 14px;
	}
}
</style>
