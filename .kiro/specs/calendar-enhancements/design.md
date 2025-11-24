# 设计文档

## 概述

本设计文档描述了 CalenParse 应用的一系列增强功能的技术实现方案。这些增强功能包括：

1. **重复事件支持** - 允许用户创建按规则重复的事件（每日、每周、每月、自定义）
2. **快速操作** - 通过双击日期/时间槽快速创建事件
3. **搜索和过滤** - 全文搜索、日期范围筛选、地点筛选、标签筛选
4. **智能 LLM 解析增强** - 自动识别重复模式
5. **事件模板** - 保存和重用常用事件配置

这些功能将显著提升用户体验，使日程管理更加高效和灵活。

## 架构

### 整体架构原则

CalenParse 采用纯前端架构，使用 Vue 3 Composition API + TypeScript + Supabase 后端。增强功能将遵循现有架构模式：

- **组件层** - Vue 单文件组件，负责 UI 展示和用户交互
- **组合式函数层** - 可复用的业务逻辑（useEvents, useLLM, useSupabase）
- **类型层** - TypeScript 类型定义，确保类型安全
- **工具层** - 纯函数工具，无副作用
- **数据层** - Supabase PostgreSQL 数据库

### 新增架构组件


为支持新功能，需要添加以下架构组件：

1. **useRecurrence** - 重复事件管理组合式函数
2. **useSearch** - 搜索和过滤组合式函数
3. **useTemplates** - 事件模板管理组合式函数
4. **RecurrenceEditor** - 重复规则编辑组件
5. **SearchBar** - 搜索和过滤组件
6. **TemplateManager** - 模板管理组件

### 数据流

```
用户操作 → Vue 组件 → 组合式函数 → Supabase API → PostgreSQL
                ↓
            本地状态更新
                ↓
            UI 自动响应
```

## 组件和接口

### 1. 重复事件系统

#### 1.1 数据模型扩展


扩展 `CalendarEvent` 类型以支持重复事件：

```typescript
// 重复频率
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

// 重复结束条件类型
export type RecurrenceEndType = 'never' | 'date' | 'count';

// 重复规则
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // 间隔（如每2天、每3周）
  daysOfWeek?: number[]; // 星期几（0=周日, 1=周一, ..., 6=周六）
  endType: RecurrenceEndType;
  endDate?: Date; // 结束日期（当 endType='date'）
  count?: number; // 重复次数（当 endType='count'）
}

// 扩展 CalendarEvent
export interface CalendarEvent {
  // ... 现有字段
  recurrenceRule?: RecurrenceRule; // 重复规则
  recurrenceId?: string; // 重复事件组 ID（同一组重复事件共享）
  isRecurring?: boolean; // 是否为重复事件
}
```

**设计决策**：
- 使用 `recurrenceId` 将同一组重复事件关联起来，便于批量操作
- `daysOfWeek` 使用数字数组，与 JavaScript Date.getDay() 保持一致
- 支持三种结束条件：永不结束、指定日期、指定次数

#### 1.2 数据库架构更新


更新 `events` 表以支持重复事件：

```sql
ALTER TABLE events 
ADD COLUMN recurrence_rule JSONB,
ADD COLUMN recurrence_id UUID,
ADD COLUMN is_recurring BOOLEAN DEFAULT false;

-- 为重复事件组创建索引
CREATE INDEX idx_events_recurrence_id ON events(recurrence_id) WHERE recurrence_id IS NOT NULL;
```

**设计决策**：
- 使用 JSONB 存储重复规则，提供灵活性和查询能力
- `recurrence_id` 用于关联同一组重复事件
- 添加索引优化重复事件查询性能

#### 1.3 useRecurrence 组合式函数

提供重复事件的核心逻辑：

```typescript
export function useRecurrence() {
  // 生成重复事件实例
  const generateRecurrenceInstances = (
    baseEvent: CalendarEvent,
    rule: RecurrenceRule,
    maxInstances: number = 100
  ): CalendarEvent[] => { ... }
  
  // 验证重复规则
  const validateRecurrenceRule = (rule: RecurrenceRule): boolean => { ... }
  
  // 格式化重复规则描述
  const formatRecurrenceDescription = (rule: RecurrenceRule): string => { ... }
  
  // 计算下一个重复日期
  const getNextRecurrenceDate = (
    startDate: Date,
    rule: RecurrenceRule
  ): Date | null => { ... }
  
  return {
    generateRecurrenceInstances,
    validateRecurrenceRule,
    formatRecurrenceDescription,
    getNextRecurrenceDate
  }
}
```


**设计决策**：
- `maxInstances` 限制生成的实例数量，防止无限循环
- 使用 Day.js 进行日期计算，保持与现有代码一致
- 重复规则描述支持中文，提升用户体验

#### 1.4 RecurrenceEditor 组件

UI 组件，用于编辑重复规则：

```vue
<script setup lang="ts">
interface Props {
  modelValue: RecurrenceRule | null;
}

const emit = defineEmits<{
  'update:modelValue': [value: RecurrenceRule | null];
}>();

// 频率选项
const frequencyOptions = [
  { label: '每日', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '自定义', value: 'custom' }
];

// 星期选项（用于自定义重复）
const weekdayOptions = [
  { label: '周日', value: 0 },
  { label: '周一', value: 1 },
  // ...
];
</script>
```

**设计决策**：
- 使用 v-model 双向绑定，符合 Vue 3 最佳实践
- 提供预设选项和自定义选项，平衡易用性和灵活性
- 实时显示重复规则描述，帮助用户理解配置

### 2. 快速操作系统


#### 2.1 CalendarView 组件增强

在现有 `CalendarView.vue` 组件中添加双击事件处理：

```typescript
// 处理日期单元格双击
const handleDateDblClick = (date: Date) => {
  // 打开事件创建对话框，预填充日期
  openEventDialog({
    startTime: date,
    endTime: new Date(date.getTime() + 60 * 60 * 1000), // 默认1小时
    isAllDay: true
  });
};

// 处理时间槽双击（日视图、周视图）
const handleTimeSlotDblClick = (dateTime: Date) => {
  // 打开事件创建对话框，预填充日期和时间
  openEventDialog({
    startTime: dateTime,
    endTime: new Date(dateTime.getTime() + 60 * 60 * 1000), // 默认1小时
    isAllDay: false
  });
};
```

**设计决策**：
- 使用双击而非单击，避免与现有选择事件功能冲突
- 默认事件时长为1小时，符合常见使用场景
- 月视图双击创建全天事件，日/周视图双击创建定时事件
- 自动聚焦标题输入框，提升输入效率

#### 2.2 EventDialog 组件增强

扩展 `EventDialog.vue` 支持快速创建模式：

```typescript
interface Props {
  visible: boolean;
  event: CalendarEvent | null;
  quickCreateData?: Partial<CalendarEvent>; // 快速创建预填充数据
}

// 快速创建模式：按 Enter 键保存
const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && isQuickCreateMode.value) {
    saveChanges();
  }
};
```


**设计决策**：
- 快速创建模式下，只要求填写标题，其他字段使用默认值
- 支持 Enter 键快速保存，提升效率
- 保持与现有编辑模式的一致性

### 3. 搜索和过滤系统

#### 3.1 useSearch 组合式函数

提供搜索和过滤的核心逻辑：

```typescript
export interface SearchFilters {
  keyword?: string; // 关键词搜索
  dateRange?: [Date, Date]; // 日期范围
  locations?: string[]; // 地点筛选
  tagIds?: string[]; // 标签筛选
}

export function useSearch() {
  const filters = ref<SearchFilters>({});
  
  // 应用搜索过滤
  const applyFilters = (
    events: CalendarEvent[],
    filters: SearchFilters
  ): CalendarEvent[] => {
    let filtered = [...events];
    
    // 关键词搜索
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(keyword) ||
        event.description?.toLowerCase().includes(keyword) ||
        event.location?.toLowerCase().includes(keyword)
      );
    }
    
    // 日期范围筛选
    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      filtered = filtered.filter(event =>
        event.startTime >= start && event.startTime <= end
      );
    }
    
    // 地点筛选
    if (filters.locations && filters.locations.length > 0) {
      filtered = filtered.filter(event =>
        event.location && filters.locations!.includes(event.location)
      );
    }
    
    // 标签筛选
    if (filters.tagIds && filters.tagIds.length > 0) {
      filtered = filtered.filter(event =>
        event.tagIds?.some(id => filters.tagIds!.includes(id))
      );
    }
    
    return filtered;
  };
  
  // 获取所有唯一地点
  const getUniqueLocations = (events: CalendarEvent[]): string[] => {
    const locations = events
      .map(e => e.location)
      .filter((loc): loc is string => !!loc);
    return [...new Set(locations)].sort();
  };
  
  return {
    filters,
    applyFilters,
    getUniqueLocations
  };
}
```


**设计决策**：
- 使用响应式 `filters` 对象，自动触发 UI 更新
- 关键词搜索不区分大小写，提升用户体验
- 支持多个筛选条件组合使用（AND 逻辑）
- 地点和标签支持多选（OR 逻辑）

#### 3.2 SearchBar 组件

UI 组件，提供搜索和过滤界面：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSearch } from '@/composables/useSearch';
import { useEvents } from '@/composables/useEvents';

const { filters, applyFilters, getUniqueLocations } = useSearch();
const { events } = useEvents();

// 计算过滤后的事件
const filteredEvents = computed(() => 
  applyFilters(events.value, filters.value)
);

// 预设日期范围
const dateRangePresets = [
  { label: '今天', value: 'today' },
  { label: '本周', value: 'thisWeek' },
  { label: '本月', value: 'thisMonth' }
];

// 应用预设日期范围
const applyDateRangePreset = (preset: string) => {
  const today = new Date();
  // ... 计算日期范围
  filters.value.dateRange = [start, end];
};
</script>
```

**设计决策**：
- 使用 Element Plus 组件库，保持 UI 一致性
- 提供预设日期范围，简化常见操作
- 实时显示筛选结果数量
- 支持清除单个或全部筛选条件

### 4. LLM 解析增强


#### 4.1 useLLM 增强

扩展现有 `useLLM.ts` 以支持重复模式识别：

```typescript
// 扩展 ParsedEvent 类型
export interface ParsedEvent {
  // ... 现有字段
  recurrencePattern?: string; // 重复模式描述（如"每周一"）
}

// 更新 prompt 以识别重复模式
const buildPrompt = (text: string, existingTags?: string[]): string => {
  return `请从以下通告文本中提取日程事件信息...

要求：
1. 提取以下字段（如果存在）：
   - title: 事件标题
   - startTime: 开始时间
   - endTime: 结束时间
   - isAllDay: 是否全天事件
   - location: 地点
   - description: 描述或备注
   - recurrencePattern: 重复模式（如"每周一"、"每天"、"每周二和周四"）
   - suggestedTags: 建议的标签数组

2. 重复模式识别：
   - 识别"每天"、"每周X"、"每月X日"等模式
   - 识别自定义模式如"每周二和周四"
   - 识别结束条件如"持续4周"、"到12月31日"

...`;
};
```


#### 4.2 重复模式解析器

创建工具函数将 LLM 识别的重复模式转换为 `RecurrenceRule`：

```typescript
// src/utils/recurrence-parser.ts
export function parseRecurrencePattern(
  pattern: string
): RecurrenceRule | null {
  const normalized = pattern.toLowerCase().trim();
  
  // 每日模式
  if (normalized.includes('每天') || normalized.includes('每日')) {
    return {
      frequency: 'daily',
      interval: 1,
      endType: 'never'
    };
  }
  
  // 每周模式
  const weeklyMatch = normalized.match(/每周([一二三四五六日天])/);
  if (weeklyMatch) {
    const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    return {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [dayMap[weeklyMatch[1]]],
      endType: 'never'
    };
  }
  
  // 自定义每周模式（如"每周二和周四"）
  const customWeeklyMatch = normalized.match(/每周.*?([一二三四五六日天].*?[一二三四五六日天])/);
  if (customWeeklyMatch) {
    // 提取所有星期几
    const days = extractWeekdays(customWeeklyMatch[1]);
    return {
      frequency: 'custom',
      interval: 1,
      daysOfWeek: days,
      endType: 'never'
    };
  }
  
  // 每月模式
  const monthlyMatch = normalized.match(/每月(\d+)日/);
  if (monthlyMatch) {
    return {
      frequency: 'monthly',
      interval: 1,
      endType: 'never'
    };
  }
  
  return null;
}
```

**设计决策**：
- 使用正则表达式识别常见中文重复模式
- 返回 null 表示无法识别，由用户手动配置
- 支持扩展以识别更多模式

### 5. 事件模板系统


#### 5.1 数据模型

模板使用扩展的 `CalendarEvent` 类型，通过标记字段区分：

```typescript
// CalendarEvent 已包含模板所需的所有字段
// 通过 isTemplate 和 templateName 字段标记模板
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date; // 模板：存储默认开始时间（用于计算持续时间）
  endTime: Date; // 模板：存储默认结束时间（用于计算持续时间）
  isAllDay: boolean;
  location?: string;
  description?: string;
  originalText?: string;
  tagIds?: string[];
  isCompleted?: boolean;
  recurrenceRule?: RecurrenceRule;
  recurrenceId?: string;
  isRecurring?: boolean;
  // 模板相关字段
  isTemplate?: boolean; // 标记是否为模板
  templateName?: string; // 模板名称
  createdAt: Date;
  updatedAt: Date;
}
```

**设计决策**：
- 模板和事件共享同一数据结构，提高代码复用和内聚性
- 使用 `isTemplate` 标记区分模板和普通事件
- 模板的 `startTime` 和 `endTime` 用于存储默认持续时间（如 1小时）
- 从模板创建事件时，只需复制记录并更新时间字段和标记
- 支持模板和事件之间的双向转换

#### 5.2 数据库架构

在现有 `events` 表中添加模板支持：

```sql
-- 添加模板相关字段
ALTER TABLE events 
ADD COLUMN is_template BOOLEAN DEFAULT false,
ADD COLUMN template_name TEXT;

-- 为模板查询创建部分索引（只索引模板记录）
CREATE INDEX idx_events_is_template ON events(is_template) 
WHERE is_template = true;

-- 为模板名称创建部分索引
CREATE INDEX idx_events_template_name ON events(template_name) 
WHERE template_name IS NOT NULL;
```

**设计决策**：
- 复用现有 `events` 表结构，减少维护成本
- 模板和事件共享相同的字段、约束和触发器
- 使用部分索引优化模板查询性能（模板数量通常很少）
- 简化数据迁移和备份流程


#### 5.3 useTemplates 组合式函数

提供模板管理的核心逻辑（复用 useEvents）：

```typescript
export function useTemplates() {
  const { events, createEvent, updateEvent, deleteEvent } = useEvents();
  
  // 计算属性：过滤出所有模板
  const templates = computed(() => 
    events.value.filter(e => e.isTemplate === true)
  );
  
  // 创建模板（从现有事件）
  const createTemplateFromEvent = async (
    event: CalendarEvent,
    templateName: string
  ): Promise<CalendarEvent> => {
    // 复制事件数据，标记为模板
    const template: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      ...event,
      isTemplate: true,
      templateName,
      isCompleted: false, // 模板不需要完成状态
      originalText: undefined // 模板不需要原始文本
    };
    return await createEvent(template);
  };
  
  // 从模板创建事件
  const createEventFromTemplate = async (
    template: CalendarEvent,
    startTime: Date
  ): Promise<CalendarEvent> => {
    // 计算持续时间
    const duration = template.endTime.getTime() - template.startTime.getTime();
    const endTime = new Date(startTime.getTime() + duration);
    
    // 复制模板数据，标记为普通事件
    const event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      ...template,
      startTime,
      endTime,
      isTemplate: false,
      templateName: undefined
    };
    return await createEvent(event);
  };
  
  // 更新模板
  const updateTemplate = async (
    id: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> => {
    return await updateEvent(id, { ...updates, isTemplate: true });
  };
  
  // 删除模板
  const deleteTemplate = async (id: string): Promise<void> => {
    return await deleteEvent(id);
  };
  
  // 将事件转换为模板
  const convertEventToTemplate = async (
    eventId: string,
    templateName: string
  ): Promise<CalendarEvent> => {
    return await updateEvent(eventId, {
      isTemplate: true,
      templateName
    });
  };
  
  // 将模板转换为事件
  const convertTemplateToEvent = async (
    templateId: string,
    startTime: Date
  ): Promise<CalendarEvent> => {
    const template = events.value.find(e => e.id === templateId);
    if (!template) throw new Error('模板不存在');
    
    const duration = template.endTime.getTime() - template.startTime.getTime();
    const endTime = new Date(startTime.getTime() + duration);
    
    return await updateEvent(templateId, {
      startTime,
      endTime,
      isTemplate: false,
      templateName: undefined
    });
  };
  
  return {
    templates,
    createTemplateFromEvent,
    createEventFromTemplate,
    updateTemplate,
    deleteTemplate,
    convertEventToTemplate,
    convertTemplateToEvent
  };
}
```


**设计决策**：
- 复用 `useEvents` 的所有功能，避免代码重复
- 使用计算属性过滤模板，自动响应数据变化
- 支持事件和模板之间的双向转换
- 从模板创建事件时，保留模板的持续时间

#### 5.4 TemplateManager 组件

UI 组件，用于管理模板：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTemplates } from '@/composables/useTemplates';
import { ElMessage, ElMessageBox } from 'element-plus';

const { templates, fetchTemplates, deleteTemplate } = useTemplates();

onMounted(() => {
  fetchTemplates();
});

// 删除模板（带确认）
const handleDelete = async (template: EventTemplate) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${template.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    );
    await deleteTemplate(template.id);
    ElMessage.success('模板已删除');
  } catch {
    // 用户取消
  }
};

// 使用模板创建事件
const handleUseTemplate = (template: EventTemplate) => {
  // 打开日期选择对话框
  // 然后调用 createEventFromTemplate
};
</script>
```

**设计决策**：
- 列表视图展示所有模板
- 支持预览模板详情
- 删除前需要确认
- 提供快速使用模板的入口

## 数据模型

### 完整类型定义


```typescript
// src/types/index.ts

// 重复频率
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

// 重复结束条件类型
export type RecurrenceEndType = 'never' | 'date' | 'count';

// 重复规则
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  endType: RecurrenceEndType;
  endDate?: Date;
  count?: number;
}

// 扩展的日历事件（包含模板支持）
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  description?: string;
  originalText?: string;
  tagIds?: string[];
  isCompleted?: boolean;
  recurrenceRule?: RecurrenceRule;
  recurrenceId?: string;
  isRecurring?: boolean;
  // 模板相关字段
  isTemplate?: boolean;
  templateName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 扩展的解析事件
export interface ParsedEvent {
  title?: string;
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
  location?: string;
  description?: string;
  tags?: string[];
  recurrencePattern?: string;
}
  updatedAt: Date;
}

// 搜索过滤器
export interface SearchFilters {
  keyword?: string;
  dateRange?: [Date, Date];
  locations?: string[];
  tagIds?: string[];
}
```

### 数据库架构总结


```sql
-- 更新 events 表
ALTER TABLE events 
ADD COLUMN recurrence_rule JSONB,
ADD COLUMN recurrence_id UUID,
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN is_template BOOLEAN DEFAULT false,
ADD COLUMN template_name TEXT;

-- 为重复事件创建索引
CREATE INDEX idx_events_recurrence_id ON events(recurrence_id) 
WHERE recurrence_id IS NOT NULL;

-- 为模板创建部分索引
CREATE INDEX idx_events_is_template ON events(is_template) 
WHERE is_template = true;

CREATE INDEX idx_events_template_name ON events(template_name) 
WHERE template_name IS NOT NULL;
```

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

在编写正确性属性之前，让我先分析每个验收标准的可测试性。


### 重复事件属性

**属性 1：每日重复间隔一致性**
*对于任何*每日重复规则（具有间隔 N 天），生成的所有连续事件实例之间应该正好相隔 N 天
**验证：需求 1.2**

**属性 2：每周重复星期几一致性**
*对于任何*每周重复规则（具有间隔 N 周和指定星期几），生成的所有事件实例应该在相同的星期几，并且相隔 N 周
**验证：需求 1.3**

**属性 3：每月重复日期一致性**
*对于任何*每月重复规则（具有间隔 N 月），生成的所有事件实例应该在相同的日期（月份中的天数），并且相隔 N 月
**验证：需求 1.4**

**属性 4：重复结束条件遵守**
*对于任何*具有结束条件的重复规则（按日期或次数），生成的事件实例数量和最后日期应该符合指定的结束条件
**验证：需求 1.5**

**属性 5：自定义每周重复星期几匹配**
*对于任何*自定义每周重复规则（指定多个星期几），生成的所有事件实例应该只出现在指定的星期几
**验证：需求 2.2**

**属性 6：重复规则持久化往返**
*对于任何*重复规则，保存到数据库然后读取应该产生等价的重复规则对象
**验证：需求 2.3**

**属性 7：重复规则描述完整性**
*对于任何*重复规则，生成的描述字符串应该包含频率、间隔和结束条件信息
**验证：需求 2.4**

### 搜索和过滤属性

**属性 8：关键词搜索匹配正确性**
*对于任何*事件集合和搜索关键词，搜索结果中的所有事件应该在标题、描述或地点字段中包含该关键词（不区分大小写）
**验证：需求 4.1**

**属性 9：日期范围筛选边界正确性**
*对于任何*事件集合和日期范围 [开始, 结束]，筛选结果中的所有事件的开始时间应该在该范围内（包含边界）
**验证：需求 5.1**

**属性 10：唯一地点列表完整性**
*对于任何*事件集合，提取的唯一地点列表应该包含所有非空地点，且没有重复
**验证：需求 6.1**

**属性 11：地点筛选匹配正确性**
*对于任何*事件集合和选定地点列表，筛选结果中的所有事件应该具有在选定地点列表中的地点
**验证：需求 6.2**

**属性 12：地点搜索筛选正确性**
*对于任何*地点列表和搜索词，筛选后的地点列表中的所有地点应该包含该搜索词（不区分大小写）
**验证：需求 6.3**

**属性 13：唯一标签列表完整性**
*对于任何*事件集合，提取的唯一标签列表应该包含所有事件中使用的所有标签，且没有重复
**验证：需求 7.1**

**属性 14：标签筛选匹配正确性**
*对于任何*事件集合和选定标签列表，筛选结果中的所有事件应该至少包含一个选定的标签
**验证：需求 7.2**

### LLM 解析属性

**属性 15：重复模式解析识别**
*对于任何*包含常见重复模式关键词（如"每天"、"每周一"）的文本，LLM 解析应该提取 recurrencePattern 字段
**验证：需求 8.1**

**属性 16：重复结束条件解析**
*对于任何*包含结束条件关键词（如"持续4周"、"到12月31日"）的文本，LLM 解析应该提取结束日期或次数信息
**验证：需求 8.3**

**属性 17：自定义重复模式解析**
*对于任何*包含自定义重复模式（如"每周二和周四"）的文本，LLM 解析应该提取多个星期几
**验证：需求 8.4**

### 事件模板属性

**属性 18：模板创建不包含日期时间**
*对于任何*事件，从该事件创建的模板应该不包含具体的开始时间和结束时间，只包含持续时间
**验证：需求 9.2**

**属性 19：模板持久化往返**
*对于任何*事件模板，保存到数据库然后读取应该产生等价的模板对象
**验证：需求 9.3**

**属性 20：从模板创建事件字段完整性**
*对于任何*模板和指定的开始时间，从模板创建的事件应该包含模板中的所有字段（标题、地点、描述、标签、重复规则）
**验证：需求 10.1**

**属性 21：从模板创建事件持久化往返**
*对于任何*从模板创建的事件，保存到数据库然后读取应该产生等价的事件对象
**验证：需求 10.3**

**属性 22：模板独立性（事件修改）**
*对于任何*模板和从该模板创建的事件，修改事件的任何字段不应该改变原始模板
**验证：需求 10.4**

**属性 23：模板更新持久化往返**
*对于任何*模板和更新操作，更新模板然后读取应该反映所有更改
**验证：需求 11.2**

**属性 24：模板删除完整性**
*对于任何*模板，删除后查询该模板应该返回不存在
**验证：需求 11.3**

**属性 25：模板独立性（模板删除）**
*对于任何*模板和从该模板创建的事件，删除模板不应该影响已创建的事件
**验证：需求 11.4**

## 错误处理


### 重复事件错误处理

1. **无效重复规则**
   - 验证间隔必须 > 0
   - 验证结束日期必须晚于开始日期
   - 验证结束次数必须 > 0
   - 显示友好错误消息，阻止保存

2. **重复实例生成失败**
   - 限制最大生成实例数（默认 100）
   - 超过限制时显示警告
   - 提供调整重复规则的建议

3. **重复事件数据库操作失败**
   - 使用事务确保原子性
   - 失败时回滚所有更改
   - 显示具体错误信息

### 搜索和过滤错误处理

1. **无效日期范围**
   - 验证开始日期 <= 结束日期
   - 显示友好错误消息
   - 自动修正或清除无效输入

2. **搜索性能问题**
   - 对大数据集使用防抖（debounce）
   - 显示加载状态
   - 考虑分页或虚拟滚动

3. **空搜索结果**
   - 显示友好的空状态提示
   - 提供清除筛选的快捷操作
   - 建议调整搜索条件

### LLM 解析错误处理

1. **重复模式解析失败**
   - 返回 null 表示无法识别
   - 允许用户手动配置
   - 记录日志用于改进解析器

2. **LLM API 错误**
   - 继承现有错误处理机制
   - 显示友好错误消息
   - 提供重试选项

### 模板错误处理

1. **模板名称冲突**
   - 检查名称唯一性
   - 提示用户选择不同名称
   - 或提供覆盖选项

2. **模板不存在**
   - 验证模板 ID 有效性
   - 显示友好错误消息
   - 刷新模板列表

3. **从模板创建事件失败**
   - 验证所有必需字段
   - 显示具体错误信息
   - 保留用户输入的数据

## 测试策略


### 测试方法

本项目将采用**双重测试方法**，结合单元测试和基于属性的测试（Property-Based Testing, PBT）：

- **单元测试**验证特定示例、边缘情况和错误条件
- **属性测试**验证应该在所有输入中保持的通用属性
- 两者互补：单元测试捕获具体错误，属性测试验证通用正确性

### 属性测试框架

使用 **fast-check** 作为 TypeScript 的属性测试库：

```bash
npm install --save-dev fast-check
```

**配置要求**：
- 每个属性测试至少运行 100 次迭代
- 使用随机种子确保可重现性
- 失败时显示反例

### 属性测试标注

每个属性测试必须使用注释明确引用设计文档中的正确性属性：

```typescript
// **Feature: calendar-enhancements, Property 1: 每日重复间隔一致性**
test('daily recurrence generates events with consistent intervals', () => {
  fc.assert(
    fc.property(
      fc.date(),
      fc.integer({ min: 1, max: 7 }),
      fc.integer({ min: 2, max: 10 }),
      (startDate, interval, count) => {
        // 测试逻辑
      }
    ),
    { numRuns: 100 }
  );
});
```

### 单元测试策略

单元测试将覆盖：

1. **特定示例**
   - 双击日期创建事件（需求 3.1, 3.2）
   - 预设日期范围筛选（需求 5.2）
   - 清除筛选恢复所有事件（需求 4.4, 5.4, 7.3）

2. **边缘情况**
   - 空搜索关键词
   - 无效日期范围
   - 模板名称冲突
   - 月末日期的每月重复

3. **错误条件**
   - 无效重复规则
   - 数据库操作失败
   - LLM 解析失败

4. **集成点**
   - 组件与组合式函数交互
   - Supabase 数据库操作
   - LLM API 调用

### 测试组织

```
src/
├── composables/
│   ├── useRecurrence.ts
│   ├── useRecurrence.test.ts       # 单元测试 + 属性测试
│   ├── useSearch.ts
│   ├── useSearch.test.ts           # 单元测试 + 属性测试
│   ├── useTemplates.ts
│   └── useTemplates.test.ts        # 单元测试 + 属性测试
├── utils/
│   ├── recurrence-parser.ts
│   └── recurrence-parser.test.ts   # 单元测试 + 属性测试
└── components/
    ├── RecurrenceEditor.vue
    ├── RecurrenceEditor.test.ts    # 单元测试
    ├── SearchBar.vue
    └── SearchBar.test.ts           # 单元测试
```

### 测试数据生成器

为属性测试创建自定义生成器：

```typescript
// src/test/generators.ts
import fc from 'fast-check';
import type { RecurrenceRule, CalendarEvent, EventTemplate } from '@/types';

// 生成有效的重复规则
export const arbRecurrenceRule = (): fc.Arbitrary<RecurrenceRule> => {
  return fc.record({
    frequency: fc.constantFrom('daily', 'weekly', 'monthly', 'custom'),
    interval: fc.integer({ min: 1, max: 10 }),
    daysOfWeek: fc.option(fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 })),
    endType: fc.constantFrom('never', 'date', 'count'),
    endDate: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
    count: fc.option(fc.integer({ min: 1, max: 100 }))
  });
};

// 生成有效的日历事件
export const arbCalendarEvent = (): fc.Arbitrary<Partial<CalendarEvent>> => {
  return fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }),
    startTime: fc.date(),
    endTime: fc.date(),
    isAllDay: fc.boolean(),
    location: fc.option(fc.string({ maxLength: 200 })),
    description: fc.option(fc.string({ maxLength: 1000 })),
    tagIds: fc.option(fc.array(fc.uuid()))
  });
};

// 生成有效的事件模板（使用 CalendarEvent 类型）
export const arbTemplate = (): fc.Arbitrary<Partial<CalendarEvent>> => {
  return fc.record({
    templateName: fc.string({ minLength: 1, maxLength: 100 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    startTime: fc.date(),
    endTime: fc.date(),
    isAllDay: fc.boolean(),
    location: fc.option(fc.string({ maxLength: 200 })),
    description: fc.option(fc.string({ maxLength: 1000 })),
    tagIds: fc.option(fc.array(fc.uuid())),
    recurrenceRule: fc.option(arbRecurrenceRule()),
    isTemplate: fc.constant(true)
  });
};
```

### 测试覆盖率目标

- **核心逻辑**（useRecurrence, useSearch, useTemplates）：90%+ 覆盖率
- **工具函数**（recurrence-parser）：95%+ 覆盖率
- **组件**：70%+ 覆盖率（重点测试业务逻辑）
- **整体项目**：80%+ 覆盖率

### 持续集成

- 所有测试必须在 CI 中通过
- 属性测试失败时保存反例
- 定期审查测试覆盖率报告

## 性能考虑

### 重复事件生成

- 限制单次生成的最大实例数（默认 100）
- 使用惰性生成策略，按需生成
- 缓存已生成的实例

### 搜索和过滤

- 使用防抖（debounce）减少搜索频率（300ms）
- 对大数据集考虑虚拟滚动
- 索引常用搜索字段

### 数据库查询

- 利用现有索引（start_time, end_time）
- 为 recurrence_id 添加索引
- 批量操作使用事务

### 前端渲染

- 使用 `shallowRef` 优化大数组
- 虚拟滚动长列表
- 懒加载模板列表

## 安全考虑

### 输入验证

- 验证所有用户输入
- 限制字符串长度
- 防止 SQL 注入（Supabase 自动处理）

### 数据完整性

- 使用事务确保原子性
- 验证外键引用
- 定期备份数据

### LLM 安全

- 限制输入文本长度
- 验证 LLM 返回的数据
- 不信任 LLM 输出，始终验证

## 可访问性

### 键盘导航

- 所有交互元素支持键盘操作
- 提供快捷键（如 Enter 保存）
- 合理的 Tab 顺序

### 屏幕阅读器

- 使用语义化 HTML
- 提供 ARIA 标签
- 描述性的错误消息

### 视觉设计

- 足够的颜色对比度
- 不仅依赖颜色传达信息
- 支持深色模式

## 国际化

### 日期格式

- 使用 Day.js 处理日期
- 支持本地化日期格式
- 考虑时区问题

### 文本翻译

- 所有 UI 文本使用中文
- 预留国际化扩展空间
- 日期和数字本地化

## 迁移策略

### 数据库迁移

1. 创建迁移脚本添加新字段
2. 为现有事件设置默认值
3. 创建新表（event_templates）
4. 添加索引
5. 测试迁移脚本

### 向后兼容

- 新字段使用可选类型
- 现有功能不受影响
- 渐进式增强

### 部署计划

1. 部署数据库迁移
2. 部署后端更新（Supabase 函数）
3. 部署前端更新
4. 监控错误和性能
5. 收集用户反馈

## 未来扩展

### 可能的增强

1. **智能建议**
   - 基于历史数据建议重复规则
   - 自动标签建议
   - 地点自动补全

2. **高级重复规则**
   - 每年重复
   - 工作日重复
   - 排除特定日期

3. **协作功能**
   - 共享事件
   - 多用户编辑
   - 权限管理

4. **导入导出**
   - iCalendar 格式支持
   - 批量导入
   - 与其他日历同步

5. **提醒和通知**
   - 事件提醒
   - 浏览器通知
   - 邮件提醒

### 技术债务

- 考虑使用状态管理库（Pinia）统一管理
- 优化大数据集性能
- 改进错误处理和日志记录
- 增加端到端测试

## 总结

本设计文档详细描述了 CalenParse 日历增强功能的技术实现方案，包括：

- **重复事件系统** - 支持每日、每周、每月和自定义重复规则
- **快速操作** - 双击快速创建事件
- **搜索和过滤** - 全文搜索、日期范围、地点和标签筛选
- **LLM 解析增强** - 自动识别重复模式
- **事件模板** - 保存和重用常用事件配置

设计遵循现有架构模式，使用 Vue 3 Composition API、TypeScript 和 Supabase，确保代码质量、可维护性和可扩展性。通过双重测试策略（单元测试 + 属性测试），我们将确保功能的正确性和可靠性。
