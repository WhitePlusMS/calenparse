<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox, ElDialog, ElButton, ElTable, ElTableColumn, ElTag, ElEmpty } from "element-plus";
import { useTemplates } from "@/composables/useTemplates";
import { useSupabase } from "@/composables/useSupabase";
import type { CalendarEvent, Tag } from "@/types";
import dayjs from "dayjs";

/**
 * TemplateManager Component
 *
 * Manages event templates with list view, preview, edit, and delete functionality
 *
 * Requirements:
 * - 9.4: Display all saved templates with preview information
 * - 10.1: Provide quick entry to create events from templates
 * - 10.2: Require user to specify date and time when creating from template
 * - 11.1: Display template list view
 * - 11.2: Allow editing template fields
 * - 11.3: Delete template with confirmation
 */

// Emit events
const emit = defineEmits<{
	editTemplate: [template: CalendarEvent];
}>();

const { templates, deleteTemplate, loading } = useTemplates();
const { getAllTags } = useSupabase();

// Available tags for display
const availableTags = ref<Tag[]>([]);

// Preview dialog state
const previewDialogVisible = ref(false);
const previewTemplate = ref<CalendarEvent | null>(null);

// Load tags
const loadTags = async () => {
	try {
		availableTags.value = await getAllTags();
	} catch (error) {
		console.error("Failed to load tags:", error);
	}
};

// Get tag by ID
const getTagById = (id: string): Tag | undefined => {
	return availableTags.value.find((tag) => tag.id === id);
};

// Format date for display
const formatDate = (date: Date | undefined): string => {
	if (!date) return "";
	return dayjs(date).format("YYYY-MM-DD HH:mm");
};

// Calculate duration from template
const getTemplateDuration = (template: CalendarEvent): string => {
	const duration = template.endTime.getTime() - template.startTime.getTime();
	const hours = Math.floor(duration / (1000 * 60 * 60));
	const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 0 && minutes > 0) {
		return `${hours}小时${minutes}分钟`;
	} else if (hours > 0) {
		return `${hours}小时`;
	} else if (minutes > 0) {
		return `${minutes}分钟`;
	} else {
		return "即时";
	}
};

// Open preview dialog
// Requirement 9.4: Display template preview information
const handlePreview = (template: CalendarEvent) => {
	previewTemplate.value = template;
	previewDialogVisible.value = true;
};

// Open edit dialog
// Requirement 11.2: Allow editing template fields
const handleEdit = (template: CalendarEvent) => {
	emit("editTemplate", template);
};

// Delete template with confirmation
// Requirement 11.3: Delete template with confirmation
const handleDelete = async (template: CalendarEvent) => {
	try {
		await ElMessageBox.confirm(`确定要删除模板"${template.templateName}"吗？此操作无法撤销。`, "确认删除", {
			confirmButtonText: "删除",
			cancelButtonText: "取消",
			type: "warning",
			confirmButtonClass: "el-button--danger",
		});

		await deleteTemplate(template.id);
		ElMessage.success("模板已删除");
	} catch (error) {
		if (error !== "cancel") {
			ElMessage.error(error instanceof Error ? error.message : "删除模板失败");
		}
	}
};

// Computed: Check if there are any templates
const hasTemplates = computed(() => templates.value.length > 0);

onMounted(() => {
	loadTags();
});
</script>

<template>
	<div class="template-manager">
		<div class="header">
			<h3>📋 事件模板</h3>
			<div class="header-info">
				<span class="template-count">共 {{ templates.length }} 个模板</span>
			</div>
		</div>

		<!-- Empty state -->
		<el-empty v-if="!hasTemplates && !loading" description="暂无事件模板" :image-size="120">
			<template #description>
				<p style="color: var(--text-secondary); margin: 8px 0">
					暂无事件模板，可以从事件详情中保存常用事件作为模板
				</p>
			</template>
		</el-empty>

		<!-- Template list -->
		<el-table v-else :data="templates" v-loading="loading" style="width: 100%" class="template-table">
			<!-- Template name -->
			<el-table-column label="模板名称" prop="templateName" min-width="150">
				<template #default="{ row }">
					<div class="template-name">
						<span class="template-icon">📝</span>
						<span class="template-title">{{ row.templateName }}</span>
					</div>
				</template>
			</el-table-column>

			<!-- Event title -->
			<el-table-column label="事件标题" prop="title" min-width="150">
				<template #default="{ row }">
					<span class="event-title">{{ row.title }}</span>
				</template>
			</el-table-column>

			<!-- Duration -->
			<el-table-column label="持续时间" width="120">
				<template #default="{ row }">
					<span class="duration">{{ getTemplateDuration(row) }}</span>
				</template>
			</el-table-column>

			<!-- Location -->
			<el-table-column label="地点" prop="location" width="150">
				<template #default="{ row }">
					<span v-if="row.location" class="location"> 📍 {{ row.location }} </span>
					<span v-else class="no-data">-</span>
				</template>
			</el-table-column>

			<!-- Tags -->
			<el-table-column label="标签" width="180">
				<template #default="{ row }">
					<div v-if="row.tagIds && row.tagIds.length > 0" class="tags">
						<el-tag
							v-for="tagId in row.tagIds.slice(0, 2)"
							:key="tagId"
							v-show="getTagById(tagId)"
							:color="getTagById(tagId)?.color"
							size="small"
							style="color: white; border: none; margin-right: 4px">
							{{ getTagById(tagId)?.name }}
						</el-tag>
						<span v-if="row.tagIds.length > 2" class="more-tags">
							+{{ row.tagIds.length - 2 }}
						</span>
					</div>
					<span v-else class="no-data">-</span>
				</template>
			</el-table-column>

			<!-- Recurrence -->

			<!-- Created date -->
			<el-table-column label="创建时间" width="160">
				<template #default="{ row }">
					<span class="created-date">
						{{ formatDate(row.createdAt) }}
					</span>
				</template>
			</el-table-column>

			<!-- Actions -->
			<el-table-column label="操作" width="220" fixed="right">
				<template #default="{ row }">
					<div class="actions">
						<el-button link type="info" size="small" @click="handlePreview(row)">
							预览
						</el-button>
						<el-button link type="primary" size="small" @click="handleEdit(row)">
							编辑
						</el-button>
						<el-button link type="danger" size="small" @click="handleDelete(row)">
							删除
						</el-button>
					</div>
				</template>
			</el-table-column>
		</el-table>

		<!-- Preview Dialog -->
		<el-dialog v-model="previewDialogVisible" title="模板预览" width="600px" class="preview-dialog">
			<div v-if="previewTemplate" class="preview-content">
				<!-- Template name -->
				<div class="preview-section">
					<div class="preview-label">模板名称</div>
					<div class="preview-value preview-value--title">
						{{ previewTemplate.templateName }}
					</div>
				</div>

				<!-- Event title -->
				<div class="preview-section">
					<div class="preview-label">事件标题</div>
					<div class="preview-value">{{ previewTemplate.title }}</div>
				</div>

				<!-- Duration -->
				<div class="preview-section">
					<div class="preview-label">持续时间</div>
					<div class="preview-value">
						{{ getTemplateDuration(previewTemplate) }}
						<span v-if="previewTemplate.isAllDay" class="all-day-badge">
							(全天)
						</span>
					</div>
				</div>

				<!-- Location -->
				<div v-if="previewTemplate.location" class="preview-section">
					<div class="preview-label">地点</div>
					<div class="preview-value">{{ previewTemplate.location }}</div>
				</div>

				<!-- Tags -->
				<div
					v-if="previewTemplate.tagIds && previewTemplate.tagIds.length > 0"
					class="preview-section">
					<div class="preview-label">标签</div>
					<div class="preview-tags">
						<el-tag
							v-for="tagId in previewTemplate.tagIds"
							:key="tagId"
							v-show="getTagById(tagId)"
							:color="getTagById(tagId)?.color"
							style="color: white; border: none; margin-right: 8px">
							{{ getTagById(tagId)?.name }}
						</el-tag>
					</div>
				</div>

				<!-- Description -->
				<div v-if="previewTemplate.description" class="preview-section">
					<div class="preview-label">描述</div>
					<div class="preview-value preview-value--description">
						{{ previewTemplate.description }}
					</div>
				</div>

				<!-- Metadata -->
				<div class="preview-metadata">
					<div class="preview-metadata-item">
						创建时间：{{ formatDate(previewTemplate.createdAt) }}
					</div>
					<div class="preview-metadata-item">
						更新时间：{{ formatDate(previewTemplate.updatedAt) }}
					</div>
				</div>
			</div>

			<template #footer>
				<div class="preview-footer">
					<el-button @click="previewDialogVisible = false">关闭</el-button>
					<el-button
						type="primary"
						@click="
							() => {
								previewDialogVisible = false;
								if (previewTemplate) handleEdit(previewTemplate);
							}
						">
						编辑模板
					</el-button>
				</div>
			</template>
		</el-dialog>
	</div>
</template>

<style scoped>
.template-manager {
	padding: var(--spacing-xl);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing-xl);
	padding-bottom: var(--spacing-lg);
	border-bottom: 2px solid var(--border-light);
}

.header h3 {
	margin: 0;
	font-size: var(--font-size-3xl);
	font-weight: var(--font-weight-bold);
	color: var(--text-primary);
	letter-spacing: -0.5px;
}

.header-info {
	display: flex;
	align-items: center;
	gap: var(--spacing-md);
}

.template-count {
	font-size: var(--font-size-base);
	font-weight: var(--font-weight-semibold);
	color: var(--text-secondary);
	padding: var(--spacing-sm) var(--spacing-lg);
	background: linear-gradient(135deg, var(--bg-color) 0%, var(--bg-hover) 100%);
	border-radius: var(--radius-xl);
	border: 2px solid var(--border-light);
	box-shadow: 0 2px 4px var(--shadow);
}

/* Table styles */
.template-table {
	border-radius: var(--radius-xl);
	overflow: hidden;
	box-shadow: 0 2px 8px var(--shadow);
}

.template-name {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.template-icon {
	font-size: var(--font-size-lg);
}

.template-title {
	font-weight: var(--font-weight-semibold);
	font-size: var(--font-size-base);
	color: var(--text-primary);
}

.event-title {
	color: var(--text-primary);
	font-size: var(--font-size-base);
}

.duration {
	color: var(--text-secondary);
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
}

.location {
	color: var(--text-secondary);
	font-size: var(--font-size-sm);
}

.tags {
	display: flex;
	align-items: center;
	gap: 4px;
}

.more-tags {
	font-size: 12px;
	color: var(--text-tertiary);
}

.created-date {
	color: var(--text-secondary);
	font-size: var(--font-size-sm);
}

.no-data {
	color: var(--text-tertiary);
	font-size: var(--font-size-sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: 4px;
	flex-wrap: nowrap;
	white-space: nowrap;
}

.actions :deep(.el-button) {
	padding: 4px 8px;
	font-size: var(--font-size-sm);
	min-width: auto;
}

/* Preview Dialog */
.preview-dialog :deep(.el-dialog__body) {
	padding: 20px 24px;
}

.preview-content {
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.preview-section {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.preview-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-secondary);
}

.preview-value {
	font-size: 14px;
	color: var(--text-primary);
	line-height: 1.6;
}

.preview-value--title {
	font-size: 18px;
	font-weight: 600;
	color: var(--text-primary);
}

.preview-value--description {
	white-space: pre-wrap;
	word-break: break-word;
}

.preview-value--recurrence {
	padding: 8px 12px;
	background-color: var(--bg-color);
	border-radius: 4px;
	border: 1px solid var(--border-light);
	color: var(--text-primary);
	font-weight: 500;
}

.all-day-badge {
	color: var(--text-tertiary);
	font-size: 12px;
}

.preview-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.preview-metadata {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding-top: 12px;
	border-top: 1px solid var(--border-light);
}

.preview-metadata-item {
	font-size: 12px;
	color: var(--text-tertiary);
}

.preview-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}

/* Create Dialog */
.create-dialog :deep(.el-dialog__body) {
	padding: 20px 24px;
}

.create-content {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.create-info {
	padding: 16px;
	background-color: var(--bg-color);
	border-radius: 8px;
	border: 1px solid var(--border-light);
}

.create-info-text {
	margin: 0 0 8px 0;
	font-size: 14px;
	color: var(--text-primary);
}

.create-info-text strong {
	color: var(--el-color-primary);
	font-weight: 600;
}

.create-info-subtext {
	margin: 0;
	font-size: 13px;
	color: var(--text-secondary);
}

.create-form {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.form-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
}

.form-hint {
	font-size: 12px;
	color: var(--text-tertiary);
	margin-top: 4px;
}

.create-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
	.template-manager {
		padding: var(--spacing-md);
	}

	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing-md);
	}

	.header h3 {
		font-size: var(--font-size-2xl);
	}

	.template-count {
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-md);
	}

	:deep(.el-dialog) {
		width: 90% !important;
	}

	.actions {
		flex-direction: row;
		gap: var(--spacing-xs);
	}

	.actions :deep(.el-button) {
		font-size: var(--font-size-xs);
		padding: 4px 8px;
	}
}
</style>
