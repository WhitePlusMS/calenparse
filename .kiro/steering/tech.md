---
inclusion: always
---

# 技术栈规范

## 核心技术栈

- **Vue 3** (Composition API) - 强制使用 `<script setup lang="ts">` 语法
- **TypeScript** (strict mode) - 所有代码必须有完整类型定义，避免 `any`
- **Vite** - 开发服务器和构建工具
- **Element Plus** - UI 组件库，优先使用现有组件而非自定义
- **Pinia** - 全局状态管理（仅用于跨组件共享状态）
- **Supabase** - PostgreSQL 云数据库（必需，是唯一的数据源）
- **Day.js** - 日期处理（禁止使用原生 Date API）
- **FullCalendar** - 日历视图
- **Chart.js + vue-chartjs** - 数据可视化

## 关键约定

### 导入路径
- 强制使用 `@/` 别名（映射到 `src/`）
- 禁止相对路径（`../../`）

```typescript
// ✅ 正确
import type { CountdownEvent } from '@/types'
import { useEvents } from '@/composables/useEvents'

// ❌ 错误
import type { CountdownEvent } from '../../types'
```

### 环境变量
- 定义在 `.env` 文件（参考 `.env.example`）
- 前缀必须是 `VITE_`
- **关键规则**：永远不要覆盖用户的 `.env` 文件，除非明确确认

```
VITE_SUPABASE_URL=...          # 必需
VITE_SUPABASE_ANON_KEY=...     # 必需
VITE_LLM_API_KEY=...           # 可选
VITE_LLM_API_ENDPOINT=...      # 可选
```

## TypeScript 规范

- Strict mode 已启用，所有代码必须通过类型检查
- `interface` 用于对象类型，`type` 用于联合类型
- Props 和 Emits 必须有完整类型定义
- 避免 `any`，必要时使用 `unknown`
- **所有共享类型必须定义在 `src/types/index.ts`**，不要在组件中定义可复用类型

## Vue 3 编码模式

### 组件结构（强制模板）
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { CountdownEvent } from '@/types'

// 1. Props 定义
interface Props {
  event: CountdownEvent
  visible?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  visible: false
})

// 2. Emits 定义
const emit = defineEmits<{
  close: []
  save: [event: CountdownEvent]
}>()

// 3. 响应式状态
const loading = ref(false)

// 4. 计算属性
const isValid = computed(() => props.event.title.length > 0)

// 5. 方法
const handleSave = () => {
  emit('save', props.event)
}

// 6. 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<template>
  <!-- 模板内容 -->
</template>

<style scoped>
/* 组件样式 */
</style>
```

### 响应式规则
- `ref()` - 基本类型和对象（推荐）
- `computed()` - 派生状态（必须用于模板中的复杂表达式）
- `reactive()` - 仅在需要解构时使用
- 避免在模板中直接调用方法，使用 computed 代替

### 生命周期
- 使用 `onMounted`, `onUnmounted` 等组合式 API
- 副作用必须在生命周期钩子中执行，不要在 setup 顶层

## 样式规范

- 组件样式：`<style scoped>` 避免全局污染
- 全局样式：`src/style.css`
- 工具样式：`src/utils/*.css` (animations, buttons, tags-badges)
- 使用 Element Plus 主题变量，禁止硬编码颜色
- 响应式设计使用媒体查询

## 状态管理策略

按优先级选择：

1. **组件内部状态** → `ref/reactive`
2. **跨组件共享逻辑** → composables (`src/composables/`)
3. **全局状态** → Pinia store (`src/stores/`)

## 数据持久化架构

**关键原则**：Supabase PostgreSQL 是唯一的数据源（single source of truth）

- 所有 CRUD 操作直接与 Supabase 交互
- 无本地缓存或离线支持
- 应用需要网络连接和有效的 Supabase 凭证
- 数据流：Client ↔ Supabase（实时同步）

## 错误处理

- 统一使用 `src/utils/errorHandler.ts`
- 用户可见错误：`ElMessage` 或 `ElNotification`
- 开发环境：详细错误日志；生产环境：友好提示
- 网络请求必须有错误处理和超时处理

## 性能优化原则

- 大列表（>100 项）：虚拟滚动或分页
- 使用 `computed` 缓存计算结果
- 模板中禁止方法调用，改用 computed
- 图片懒加载
- 频繁切换的元素用 `v-show`，条件渲染用 `v-if`

## 测试策略

- 框架：Vitest
- 测试位置：`src/test/` 或与源文件同目录
- 测试重点：composables 核心逻辑、工具函数边界情况
- 不测试：简单 UI 组件

## 开发命令

```bash
npm run dev        # 开发服务器 (localhost:5173)
npm run build      # 生产构建 + 类型检查
npm run preview    # 预览生产构建
npm run test       # 运行测试（单次）
npm run test:watch # 测试监听模式
npm run test:ui    # 测试 UI 界面
```

## 部署

- 平台：Vercel
- 配置：`vercel.json`
- 环境变量在 Vercel 项目设置中配置
- 生产构建自动进行类型检查和优化
