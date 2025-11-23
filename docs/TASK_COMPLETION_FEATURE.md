# 任务完成状态功能设计

## 功能概述

为日程事件添加"已完成/未完成"状态标记功能，帮助用户跟踪任务的完成情况。

## 需求（需求 23）

### 用户故事
作为用户，我想要标记日程事件为已完成或未完成，以便跟踪任务的完成状态。

### 验收标准

1. ✅ 用户可以在创建或编辑事件时设置完成状态
2. ✅ 完成状态立即保存到数据库
3. ✅ 日历视图中已完成事件有不同的视觉样式
4. ✅ 列表视图中显示完成状态标识（复选框）
5. ✅ 事件详情对话框显示当前完成状态
6. ✅ 可以快速切换完成状态
7. ✅ 已完成事件使用视觉提示（删除线、半透明）
8. ✅ 可以按完成状态筛选事件

## 技术实现

### 1. 数据模型更新

#### Supabase Schema
```sql
-- 添加完成状态字段
ALTER TABLE events ADD COLUMN is_completed BOOLEAN DEFAULT false;

-- 添加索引以提高查询性能
CREATE INDEX idx_events_is_completed ON events(is_completed);
```

#### TypeScript 类型
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  description?: string;
  originalText?: string;
  isCompleted?: boolean;  // 新增：完成状态
  tagIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 视觉样式设计

#### 已完成事件样式
```css
/* 日历视图中的已完成事件 */
.fc-event.event--completed {
  opacity: 0.6;
  text-decoration: line-through;
  background: var(--completed-bg) !important;
  border-left: 4px solid var(--success-color) !important;
}

/* 列表视图中的已完成事件 */
.event-item--completed {
  opacity: 0.7;
}

.event-item--completed .event-title {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

/* 完成状态复选框 */
.event-checkbox {
  cursor: pointer;
  font-size: 20px;
  transition: all 0.3s ease;
  user-select: none;
}

.event-checkbox:hover {
  transform: scale(1.2);
}

.event-checkbox--completed {
  color: var(--success-color);
}
```

### 3. 组件更新

#### EventDialog.vue
- 添加完成状态复选框
- 保存时包含 isCompleted 字段

```vue
<el-form-item label="完成状态">
  <el-checkbox v-model="formData.isCompleted">
    标记为已完成
  </el-checkbox>
</el-form-item>
```

#### CalendarView.vue
- 为已完成事件添加 CSS 类
- 在事件渲染时应用样式

```typescript
eventClassNames: (arg) => {
  const event = arg.event.extendedProps as CalendarEvent;
  return event.isCompleted ? ['event--completed'] : [];
}
```

#### ListView.vue
- 添加可点击的复选框
- 点击复选框快速切换完成状态

```vue
<div class="event-checkbox" @click.stop="toggleCompletion(event)">
  {{ event.isCompleted ? '✅' : '⬜' }}
</div>
```

### 4. Composable 更新

#### useEvents.ts
```typescript
export function useEvents() {
  // ... existing code

  /**
   * Toggle event completion status
   */
  const toggleEventCompletion = async (id: string) => {
    const event = events.value.find(e => e.id === id);
    if (!event) return;

    const newStatus = !event.isCompleted;
    await updateEvent(id, { isCompleted: newStatus });
    
    ElMessage.success(
      newStatus ? '已标记为完成' : '已标记为未完成'
    );
  };

  return {
    // ... existing returns
    toggleEventCompletion,
  };
}
```

## 用户交互流程

### 场景 1：创建事件时设置完成状态
1. 用户在预览对话框或事件编辑对话框中
2. 勾选"标记为已完成"复选框
3. 保存事件
4. 事件在所有视图中显示为已完成状态

### 场景 2：在列表视图中快速切换
1. 用户在列表视图中看到事件
2. 点击事件前的复选框图标
3. 完成状态立即切换
4. 视觉样式立即更新
5. 显示成功提示消息

### 场景 3：在事件详情中修改
1. 用户点击事件查看详情
2. 在详情对话框中切换完成状态
3. 保存修改
4. 所有视图同步更新

### 场景 4：筛选已完成/未完成事件（可选）
1. 用户在筛选栏选择完成状态
2. 只显示符合条件的事件
3. 可以清除筛选查看所有事件

## 视觉效果示例

### 日历视图
```
┌─────────────────────────────────┐
│  2024年1月                       │
├─────────────────────────────────┤
│ 周一  周二  周三  周四  周五     │
│                                  │
│  1    2     3     4     5       │
│      [会议]                      │  ← 正常事件
│                                  │
│  8    9    10    11    12       │
│      [报告]                      │  ← 已完成（半透明+删除线）
│                                  │
└─────────────────────────────────┘
```

### 列表视图
```
┌─────────────────────────────────────────┐
│ ⬜ 团队会议                              │  ← 未完成
│    2024-01-02 14:00 | 会议室A          │
├─────────────────────────────────────────┤
│ ✅ 提交报告                              │  ← 已完成
│    2024-01-03 17:00 | 办公室           │
│    (半透明 + 删除线)                     │
└─────────────────────────────────────────┘
```

## 正确性属性

### 属性 39：完成状态切换
*对于任何*事件，切换完成状态后，该状态应该立即在所有视图中反映

### 属性 40：完成状态视觉区分
*对于任何*已完成的事件，在所有视图中应该有明显的视觉区分

## 实现优先级

**优先级：高**

这是一个核心的任务管理功能，能够显著提升用户体验，帮助用户更好地跟踪和管理日程任务。

## 相关任务

- Task 30: 实现任务完成状态功能
- 需求 23: 任务完成状态需求
- 设计属性 39, 40: 完成状态相关属性

## 注意事项

1. **性能考虑**：添加数据库索引以优化按完成状态筛选的查询
2. **用户体验**：切换状态应该有即时反馈，不需要刷新页面
3. **视觉一致性**：在所有视图中保持一致的已完成事件样式
4. **可访问性**：确保复选框有足够的点击区域，支持键盘操作
5. **数据迁移**：现有事件默认为未完成状态（is_completed = false）
