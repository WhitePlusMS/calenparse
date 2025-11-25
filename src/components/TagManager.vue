<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Plus } from "@element-plus/icons-vue";
import { useSupabase } from "@/composables/useSupabase";
import { useAuth } from "@/composables/useAuth";
import type { Tag } from "@/types";

const { getAllTags, createTag, updateTag, deleteTag } = useSupabase();
const { isAdmin } = useAuth();

// Emit events
const emit = defineEmits<{
	tagsChanged: [];
}>();

const tags = ref<Tag[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const editingTag = ref<Tag | null>(null);

// Batch selection
const selectedTags = ref<Tag[]>([]);

// Form data
const tagForm = ref({
	name: "",
	color: "#409EFF",
});

// Predefined color options
const colorOptions = [
	"#409EFF", // Primary blue
	"#67C23A", // Success green
	"#E6A23C", // Warning orange
	"#F56C6C", // Danger red
	"#909399", // Info gray
	"#B37FEB", // Purple
	"#FF85C0", // Pink
	"#13C2C2", // Cyan
	"#52C41A", // Lime
	"#FA8C16", // Orange
];

const dialogTitle = computed(() => (editingTag.value ? "编辑标签" : "创建标签"));

// Load all tags
const loadTags = async () => {
	loading.value = true;
	try {
		tags.value = await getAllTags();
	} catch (error) {
		ElMessage.error(error instanceof Error ? error.message : "加载标签失败");
	} finally {
		loading.value = false;
	}
};

// Open dialog for creating new tag
const openCreateDialog = () => {
	// 访客模式禁用标签管理 (需求 1.9)
	if (!isAdmin.value) {
		ElMessage.warning("访客模式不支持标签管理，请登录后使用");
		return;
	}
	editingTag.value = null;
	tagForm.value = {
		name: "",
		color: "#409EFF",
	};
	dialogVisible.value = true;
};

// Open dialog for editing tag
const openEditDialog = (tag: Tag) => {
	// 访客模式禁用标签管理 (需求 1.9)
	if (!isAdmin.value) {
		ElMessage.warning("访客模式不支持标签管理，请登录后使用");
		return;
	}
	editingTag.value = tag;
	tagForm.value = {
		name: tag.name,
		color: tag.color,
	};
	dialogVisible.value = true;
};

// Save tag (create or update)
const saveTag = async () => {
	if (!tagForm.value.name.trim()) {
		ElMessage.warning("请输入标签名称");
		return;
	}

	loading.value = true;
	try {
		if (editingTag.value) {
			// Update existing tag
			await updateTag(editingTag.value.id, tagForm.value.name.trim(), tagForm.value.color);
			ElMessage.success("标签更新成功");
		} else {
			// Create new tag
			await createTag(tagForm.value.name.trim(), tagForm.value.color);
			ElMessage.success("标签创建成功");
		}
		dialogVisible.value = false;
		await loadTags();
	} catch (error) {
		ElMessage.error(error instanceof Error ? error.message : "保存标签失败");
	} finally {
		loading.value = false;
	}
};

// Delete tag with confirmation
const handleDelete = async (tag: Tag) => {
	// 访客模式禁用标签管理 (需求 1.9)
	if (!isAdmin.value) {
		ElMessage.warning("访客模式不支持标签管理，请登录后使用");
		return;
	}

	try {
		await ElMessageBox.confirm(
			`确定要删除标签"${tag.name}"吗？删除后，所有事件中的该标签也会被移除。`,
			"确认删除",
			{
				confirmButtonText: "删除",
				cancelButtonText: "取消",
				type: "warning",
			}
		);

		loading.value = true;
		await deleteTag(tag.id);
		ElMessage.success("标签删除成功");
		await loadTags();
		emit("tagsChanged");
	} catch (error) {
		if (error !== "cancel") {
			ElMessage.error(error instanceof Error ? error.message : "删除标签失败");
		}
	} finally {
		loading.value = false;
	}
};

// Handle selection change
const handleSelectionChange = (selection: Tag[]) => {
	selectedTags.value = selection;
};

// Batch delete tags
const handleBatchDelete = async () => {
	// 访客模式禁用标签管理 (需求 1.9)
	if (!isAdmin.value) {
		ElMessage.warning("访客模式不支持标签管理，请登录后使用");
		return;
	}

	if (selectedTags.value.length === 0) {
		ElMessage.warning("请先选择要删除的标签");
		return;
	}

	try {
		await ElMessageBox.confirm(
			`确定要删除选中的 ${selectedTags.value.length} 个标签吗？删除后，所有事件中的这些标签也会被移除。`,
			"确认批量删除",
			{
				confirmButtonText: "删除",
				cancelButtonText: "取消",
				type: "warning",
			}
		);

		loading.value = true;
		let successCount = 0;
		let failCount = 0;

		for (const tag of selectedTags.value) {
			try {
				await deleteTag(tag.id);
				successCount++;
			} catch (error) {
				console.error(`Failed to delete tag ${tag.name}:`, error);
				failCount++;
			}
		}

		if (successCount > 0) {
			ElMessage.success(
				`成功删除 ${successCount} 个标签${failCount > 0 ? `，${failCount} 个失败` : ""}`
			);
			emit("tagsChanged");
		} else {
			ElMessage.error("批量删除失败");
		}

		selectedTags.value = [];
		await loadTags();
	} catch (error) {
		if (error !== "cancel") {
			ElMessage.error("批量删除失败");
		}
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	loadTags();
});
</script>

<template>
	<div class="tag-manager">
		<div class="header">
			<h3>标签管理</h3>
			<div class="header-actions">
				<el-button v-if="selectedTags.length > 0" type="danger" @click="handleBatchDelete">
					<el-icon><Delete /></el-icon> 批量删除 ({{ selectedTags.length }})
				</el-button>
				<el-button type="primary" @click="openCreateDialog">
					<el-icon><Plus /></el-icon> 创建标签
				</el-button>
			</div>
		</div>

		<el-table
			:data="tags"
			v-loading="loading"
			style="width: 100%"
			@selection-change="handleSelectionChange">
			<el-table-column type="selection" width="55" />
			<el-table-column label="标签名称" prop="name">
				<template #default="{ row }">
					<el-tag :color="row.color" style="color: white; border: none">
						{{ row.name }}
					</el-tag>
				</template>
			</el-table-column>
			<el-table-column label="颜色" prop="color" width="120">
				<template #default="{ row }">
					<div class="color-preview" :style="{ backgroundColor: row.color }"></div>
				</template>
			</el-table-column>
			<el-table-column label="创建时间" prop="createdAt" width="180">
				<template #default="{ row }">
					{{ new Date(row.createdAt).toLocaleString("zh-CN") }}
				</template>
			</el-table-column>
			<el-table-column label="操作" width="150">
				<template #default="{ row }">
					<el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
					<el-button link type="danger" @click="handleDelete(row)">删除</el-button>
				</template>
			</el-table-column>
		</el-table>

		<!-- Create/Edit Dialog -->
		<el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
			<el-form :model="tagForm" label-width="80px">
				<el-form-item label="标签名称" required>
					<el-input
						v-model="tagForm.name"
						placeholder="请输入标签名称"
						maxlength="20"
						show-word-limit />
				</el-form-item>
				<el-form-item label="标签颜色" required>
					<div class="color-picker-container">
						<el-color-picker v-model="tagForm.color" />
						<div class="color-options">
							<div
								v-for="color in colorOptions"
								:key="color"
								class="color-option"
								:class="{ active: tagForm.color === color }"
								:style="{ backgroundColor: color }"
								@click="tagForm.color = color"></div>
						</div>
					</div>
				</el-form-item>
				<el-form-item label="预览">
					<el-tag :color="tagForm.color" style="color: white; border: none">
						{{ tagForm.name || "标签预览" }}
					</el-tag>
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogVisible = false">取消</el-button>
				<el-button type="primary" @click="saveTag" :loading="loading">保存</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<style scoped>
.tag-manager {
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

.header-actions {
	display: flex;
	gap: var(--spacing-md);
	align-items: center;
}

.color-preview {
	width: 48px;
	height: 28px;
	border-radius: var(--radius-md);
	border: 2px solid var(--border-color);
	box-shadow: 0 2px 4px var(--shadow);
}

.color-picker-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);
}

.color-options {
	display: flex;
	gap: var(--spacing-md);
	flex-wrap: wrap;
}

.color-option {
	width: 40px;
	height: 40px;
	border-radius: var(--radius-lg);
	cursor: pointer;
	border: 3px solid transparent;
	transition: all 0.3s ease;
	box-shadow: 0 2px 6px var(--shadow);
}

.color-option:hover {
	transform: scale(1.15);
	box-shadow: 0 4px 12px var(--shadow-md);
}

.color-option.active {
	border-color: var(--primary-color);
	box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
	transform: scale(1.1);
}

/* Responsive Design */
@media (max-width: 768px) {
	.tag-manager {
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

	.header-actions {
		width: 100%;
		flex-direction: column;
	}

	.header-actions :deep(.el-button) {
		width: 100%;
	}
}
</style>
