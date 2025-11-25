---
inclusion: always
---

# 项目结构与代码组织规范

## 目录结构

```
src/
├── components/      # Vue 组件 (.vue) - PascalCase 命名
├── composables/     # 可复用逻辑 (useXxx.ts) - 有副作用的逻辑
├── utils/          # 纯函数工具 (xxx.ts) + 工具样式 (xxx.css)
├── types/          # 类型定义 - 仅 index.ts，所有共享类型集中定义
├── assets/         # 静态资源
├── test/           # 测试配置
├── App.vue         # 根组件
├── main.ts         # 入口
└── style.css       # 全局样式
```

## 关键架构决策

### 导入路径：强制使用 `@/` 别名
```typescript
// ✅ 正确
import type { CountdownEvent } from '@/types'
import { useEvents } from '@/composables/useEvents'

// ❌ 禁止相对路径
import type { CountdownEvent } from '../../types'
```

### 类型定义：集中在 `src/types/index.ts`
- 所有可能被多处使用的类型必须定义在此
- 组件内部的 Props/Emits 接口可以局部定义
- 避免创建分散的类型文件

### 逻辑分层：utils vs composables
- **utils**: 纯函数，无副作用，无 Vue 依赖（如日期格式化、数据转换）
- **composables**: 有副作用，使用 Vue API（如状态管理、API 调用、DOM 操作）
- 命名：composables 必须以 `use` 开头

### 样式组织
- 全局样式 → `src/style.css`
- 工具样式 → `src/utils/*.css`（animations, buttons, tags-badges）
- 组件样式 → `<style scoped>` 在组件内

## Vue 组件标准模板

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CountdownEvent } from '@/types'

// 1. Props（可选默认值）
interface Props {
  event: CountdownEvent
  visible?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  visible: false
})

// 2. Emits（类型化事件）
const emit = defineEmits<{
  close: []
  save: [event: CountdownEvent]
}>()

// 3. 响应式状态
const loading = ref(false)

// 4. 计算属性
const isValid = computed(() => props.event.title.length > 0)

// 5. 方法
const handleSave = () => emit('save', props.event)

// 6. 生命周期
onMounted(() => {
  // 初始化
})
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped>
/* 组件样式 */
</style>
```

## Composable 标准模板

```typescript
// src/composables/useExample.ts
import { ref, computed } from 'vue'
import type { SomeType } from '@/types'

export function useExample() {
  const state = ref<SomeType[]>([])
  const count = computed(() => state.value.length)
  
  const addItem = (item: SomeType) => {
    state.value.push(item)
  }
  
  return { state, count, addItem }
}
```

## 文件放置决策树

添加新功能时：
1. **UI 组件** → `src/components/FeatureName.vue`（PascalCase）
2. **可复用逻辑**（有状态/副作用）→ `src/composables/useFeature.ts`
3. **纯函数工具** → `src/utils/feature.ts`（camelCase）
4. **共享类型** → 添加到 `src/types/index.ts`
5. **工具样式** → `src/utils/feature.css`

## 代码质量规则

- 组件不超过 300 行，超过则拆分
- Composables 单一职责，避免过度耦合
- 优先复用现有代码，检查是否已有类似实现
- 避免循环依赖
- 导入顺序：Vue API → 第三方库 → 类型 → 本地模块

## 命名约定

- 组件文件：`EventDialog.vue`（PascalCase）
- Composables：`useEvents.ts`（camelCase + use 前缀）
- 工具函数：`date.ts`（camelCase）
- 类型：`CountdownEvent`（PascalCase）
