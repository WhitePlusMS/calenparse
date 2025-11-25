<script setup lang="ts">
import { ref, computed } from "vue";
import type { CalendarEvent } from "@/types";

/**
 * BatchEditDialog Component
 * Allows batch editing of common fields
 * Implements requirements 12.4, 12.5
 */

// Props
interface Props {
	visible: boolean;
	events: CalendarEvent[];
}

defineProps<Props>();

// Emits
const emit = defineEmits<{
	"update:visible": [value: boolean];
	save: [updates: Partial<CalendarEvent>];
}>();

// Form data
const formData = ref({
	location: "",
	description: "",
});

// Track which fields to update
const fieldsToUpdate = ref({
	location: false,
	description: false,
});

/**
 * Check if any field is selected for update
 */
const hasFieldsToUpdate = computed(() => {
	return Object.values(fieldsToUpdate.value).some((v) => v);
});

/**
 * Handle save
 * Requirement 12.5: Batch modify common fields
 */
const handleSave = () => {
	const updates: Partial<CalendarEvent> = {};

	if (fieldsToUpdate.value.location) {
		updates.location = formData.value.location;
	}

	if (fieldsToUpdate.value.description) {
		updates.description = formData.value.description;
	}

	emit("save", updates);
	handleClose();
};

/**
 * Handle close
 */
const handleClose = () => {
	emit("update:visible", false);
	// Reset form
	formData.value = {
		location: "",
		description: "",
	};
	fieldsToUpdate.value = {
		location: false,
		description: false,
	};
};

/**
 * Handle cancel
 */
const handleCancel = () => {
	handleClose();
};
</script>

<template>
	<div v-if="visible" class="batch-edit-dialog-overlay" @click.self="handleClose">
		<div class="batch-edit-dialog">
			<!-- Header -->
			<div class="dialog-header">
				<h3 class="dialog-title">批量编辑事件</h3>
				<button class="dialog-close-btn" @click="handleClose">✕</button>
			</div>

			<!-- Content -->
			<div class="dialog-content">
				<div class="dialog-info">
					<el-icon class="info-icon"><InfoFilled /></el-icon>
					<span class="info-text"
						>将对 <strong>{{ events.length }}</strong> 个事件进行批量修改</span
					>
				</div>

				<!-- Form Fields -->
				<div class="form-section">
					<!-- Location Field -->
					<div class="form-field">
						<div class="field-header">
							<label class="field-checkbox-label">
								<input
									type="checkbox"
									v-model="fieldsToUpdate.location"
									class="field-checkbox" />
								<span class="field-label">地点</span>
							</label>
						</div>
						<input
							type="text"
							v-model="formData.location"
							:disabled="!fieldsToUpdate.location"
							class="field-input"
							placeholder="输入新的地点"
							maxlength="200" />
					</div>

					<!-- Description Field -->
					<div class="form-field">
						<div class="field-header">
							<label class="field-checkbox-label">
								<input
									type="checkbox"
									v-model="fieldsToUpdate.description"
									class="field-checkbox" />
								<span class="field-label">描述</span>
							</label>
						</div>
						<textarea
							v-model="formData.description"
							:disabled="!fieldsToUpdate.description"
							class="field-textarea"
							placeholder="输入新的描述"
							rows="4"
							maxlength="1000"></textarea>
					</div>
				</div>

				<div class="dialog-hint">
					<span class="hint-icon">💡</span>
					<span class="hint-text">只有勾选的字段会被更新</span>
				</div>
			</div>

			<!-- Footer -->
			<div class="dialog-footer">
				<button class="dialog-btn dialog-btn--cancel" @click="handleCancel">取消</button>
				<button
					class="dialog-btn dialog-btn--save"
					:disabled="!hasFieldsToUpdate"
					@click="handleSave">
					保存修改
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.batch-edit-dialog-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
	padding: 20px;
	animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.batch-edit-dialog {
	background: var(--bg-secondary);
	border-radius: 12px;
	width: 100%;
	max-width: 600px;
	max-height: 90vh;
	display: flex;
	flex-direction: column;
	box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
	animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Header */
.dialog-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 24px;
	border-bottom: 2px solid var(--border-light);
}

.dialog-title {
	margin: 0;
	font-size: 20px;
	font-weight: 600;
	color: var(--text-primary);
}

.dialog-close-btn {
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	border-radius: 6px;
	font-size: 20px;
	color: var(--text-tertiary);
	cursor: pointer;
	transition: all 0.3s ease;
}

.dialog-close-btn:hover {
	background: var(--bg-hover);
	color: var(--text-secondary);
}

/* Content */
.dialog-content {
	flex: 1;
	overflow-y: auto;
	padding: 24px;
}

.dialog-info {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 12px 16px;
	background: rgba(64, 158, 255, 0.1);
	border: 1px solid rgba(64, 158, 255, 0.3);
	border-radius: 8px;
	margin-bottom: 24px;
	font-size: 14px;
	color: var(--text-secondary);
}

.info-icon {
	font-size: 18px;
	line-height: 1;
}

.info-text {
	line-height: 1.5;
}

.info-text strong {
	color: var(--primary-color);
	font-weight: 600;
}

/* Form Section */
.form-section {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.form-field {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.field-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.field-checkbox-label {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	user-select: none;
}

.field-checkbox {
	width: 18px;
	height: 18px;
	cursor: pointer;
	accent-color: var(--primary-color);
}

.field-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
}

.field-input,
.field-textarea {
	width: 100%;
	padding: 10px 14px;
	border: 2px solid var(--border-light);
	border-radius: 6px;
	font-size: 14px;
	color: var(--text-primary);
	background: var(--bg-secondary);
	transition: all 0.3s ease;
	font-family: inherit;
}

.field-input:focus,
.field-textarea:focus {
	outline: none;
	border-color: var(--primary-color);
	background: var(--bg-color);
}

.field-input:disabled,
.field-textarea:disabled {
	background: var(--bg-hover);
	color: var(--text-disabled);
	cursor: not-allowed;
}

.field-textarea {
	resize: vertical;
	min-height: 80px;
}

.dialog-hint {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 20px;
	padding: 10px 14px;
	background: rgba(230, 162, 60, 0.1);
	border: 1px solid rgba(230, 162, 60, 0.3);
	border-radius: 6px;
	font-size: 13px;
	color: var(--warning-color);
}

.hint-icon {
	font-size: 16px;
	line-height: 1;
}

.hint-text {
	line-height: 1.5;
}

/* Footer */
.dialog-footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 12px;
	padding: 16px 24px;
	border-top: 2px solid var(--border-light);
}

.dialog-btn {
	padding: 10px 24px;
	border: 2px solid transparent;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.3s ease;
}

.dialog-btn:hover {
	transform: translateY(-1px);
}

.dialog-btn--cancel {
	background: var(--bg-secondary);
	color: var(--text-secondary);
	border-color: var(--border-color);
}

.dialog-btn--cancel:hover {
	background: var(--bg-hover);
	border-color: var(--text-disabled);
}

.dialog-btn--save {
	background: var(--primary-color);
	color: white;
	border-color: var(--primary-color);
}

.dialog-btn--save:hover:not(:disabled) {
	background: var(--primary-light);
	border-color: var(--primary-light);
	box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.dialog-btn--save:disabled {
	background: #c0c4cc;
	border-color: #c0c4cc;
	cursor: not-allowed;
	opacity: 0.6;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
	.batch-edit-dialog {
		max-width: 100%;
		max-height: 95vh;
	}

	.dialog-header {
		padding: 16px 18px;
	}

	.dialog-title {
		font-size: 18px;
	}

	.dialog-content {
		padding: 18px;
	}

	.dialog-footer {
		padding: 14px 18px;
	}
}

@media (max-width: 480px) {
	.batch-edit-dialog-overlay {
		padding: 10px;
	}

	.dialog-header {
		padding: 14px 16px;
	}

	.dialog-title {
		font-size: 17px;
	}

	.dialog-close-btn {
		width: 28px;
		height: 28px;
		font-size: 18px;
	}

	.dialog-content {
		padding: 16px;
	}

	.dialog-info {
		padding: 10px 12px;
		font-size: 13px;
	}

	.form-section {
		gap: 16px;
	}

	.field-label {
		font-size: 13px;
	}

	.field-input,
	.field-textarea {
		padding: 8px 12px;
		font-size: 13px;
	}

	.dialog-hint {
		padding: 8px 12px;
		font-size: 12px;
	}

	.dialog-footer {
		padding: 12px 16px;
		gap: 10px;
	}

	.dialog-btn {
		padding: 8px 18px;
		font-size: 13px;
	}
}
</style>
