# 设计文档

## 概述

本设计文档描述了列表视图时间增强功能的技术实现方案。该功能将为列表视图添加智能排序和倒计时显示功能，帮助用户更好地管理和跟踪日程。

核心功能包括：
1. 基于完成状态和时间的智能排序
2. 未开始日程的倒计时显示
3. 进行中日程的倒计时显示
4. 实时更新机制
5. 用户自定义设置

## 架构

### 组件层次结构

```
ListView.vue (现有组件)
├── 使用 useCountdown (新建 composable)
├── 使用 useCountdownSettings (新建 composable)
└── CountdownIndicator.vue (新建组件)
```

### 数据流

```
用户交互 → ListView → useCountdown → 计算倒计时 → 更新显示
                    ↓
                useCountdownSettings → 本地存储
```

## 组件和接口

### 1. CountdownIndicator 组件

新建的倒计时指示器组件，负责显示倒计时信息。

**Props:**
```typescript
interface CountdownIndicatorProps {
  event: CalendarEvent;
  unit?: 'day' | 'hour' | 'minute'; // 倒计时单位
}
```

**功能:**
- 根据日程状态显示不同的倒计时文本
- 使用不同的视觉样式区分开始倒计时和结束倒计时
- 支持自定义倒计时单位

### 2. useCountdown Composable

新建的倒计时逻辑 composable，提供倒计时计算和更新功能。

**接口:**
```typescript
interface CountdownInfo {
  type: 'start' | 'end' | 'none';
  value: number; // 倒计时数值
  unit: 'day' | 'hour' | 'minute';
  text: string; // 格式化的倒计时文本
}

interface UseCountdownReturn {
  getCountdown: (event: CalendarEvent, unit: 'day' | 'hour' | 'minute') => CountdownInfo;
  startAutoUpdate: () => void;
  stopAutoUpdate: () => void;
  forceUpdate: () => void;
}
```

**功能:**
- 计算日程的倒计时信息
- 管理自动更新定时器
- 处理页面可见性变化
- 处理午夜时刻的强制刷新

### 3. useCountdownSettings Composable

新建的倒计时设置 composable，管理用户的倒计时偏好设置。

**接口:**
```typescript
interface CountdownSettings {
  enabled: boolean;
  unit: 'day' | 'hour' | 'minute';
}

interface UseCountdownSettingsReturn {
  settings: Ref<CountdownSettings>;
  updateSettings: (updates: Partial<CountdownSettings>) => void;
  loadSettings: () => void;
}
```

**功能:**
- 从本地存储加载设置
- 保存设置到本地存储
- 提供响应式的设置状态

## 数据模型

### CountdownInfo

```typescript
interface CountdownInfo {
  type: 'start' | 'end' | 'none';
  value: number;
  unit: 'day' | 'hour' | 'minute';
  text: string;
}
```

- `type`: 倒计时类型（开始/结束/无）
- `value`: 倒计时数值
- `unit`: 倒计时单位
- `text`: 格式化的显示文本

### CountdownSettings

```typescript
interface CountdownSettings {
  enabled: boolean;
  unit: 'day' | 'hour' | 'minute';
}
```

- `enabled`: 是否启用倒计时显示
- `unit`: 倒计时单位偏好

## 正确性属性分析

在编写正确性属性之前，我需要分析每个验收标准的可测试性。

## 正确性属性

*属性是应该在系统所有有效执行中保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 完成状态排序优先级
*对于任意*日程列表，排序后的列表中所有未完成日程应该出现在所有已完成日程之前
**验证需求: 1.1**

### 属性 2: 同状态日程时间排序
*对于任意*具有相同完成状态的日程列表，这些日程应该按开始时间升序排序
**验证需求: 1.2, 1.3**

### 属性 3: 状态变化触发重排序
*对于任意*日程，当其完成状态改变时，列表应该立即重新排序以反映新的状态
**验证需求: 1.4**

### 属性 4: 未开始日程显示开始倒计时
*对于任意*未开始的日程（开始时间在未来且未完成），应该显示距离开始时间的倒计时
**验证需求: 2.1**

### 属性 5: 多天后开始的倒计时格式
*对于任意*在2天或更多天后开始的日程，倒计时文本应该包含"还有 X 天开始"格式，其中X是正确的天数
**验证需求: 2.4**

### 属性 6: 进行中日程显示结束倒计时
*对于任意*正在进行中的日程（当前时间在开始和结束时间之间且未完成），应该显示距离结束时间的倒计时
**验证需求: 3.1**

### 属性 7: 多天后结束的倒计时格式
*对于任意*在2天或更多天后结束的进行中日程，倒计时文本应该包含"还有 X 天结束"格式，其中X是正确的天数
**验证需求: 3.4**

### 属性 8: 开始和结束倒计时视觉区分
*对于任意*显示倒计时的日程，开始倒计时和结束倒计时应该使用不同的视觉样式（如不同的CSS类或颜色）
**验证需求: 3.5**

### 属性 9: 已过期日程不显示倒计时
*对于任意*结束时间已过的日程，不应该显示任何倒计时指示器
**验证需求: 4.1**

### 属性 10: 已完成日程不显示倒计时
*对于任意*被标记为已完成的日程，不应该显示任何倒计时指示器
**验证需求: 4.2**

### 属性 11: 午夜时刻触发倒计时重算
*对于任意*日程列表，当日历日期跨过午夜时，所有倒计时值应该被重新计算
**验证需求: 5.1**

### 属性 12: 状态转换更新倒计时类型
*对于任意*日程，当时间推进导致其从"未开始"变为"进行中"时，倒计时应该从显示开始时间变为显示结束时间
**验证需求: 5.2**

### 属性 13: 过期时移除倒计时
*对于任意*日程，当时间推进导致其从"进行中"变为"已过期"时，倒计时显示应该被移除
**验证需求: 5.3**

### 属性 14: 可见时定期更新倒计时
*对于任意*可见的列表视图，应该每1分钟检查并更新倒计时显示
**验证需求: 5.4**

### 属性 15: 午夜强制刷新
*对于任意*可见的列表视图，当到达午夜时刻时，应该强制刷新所有倒计时
**验证需求: 5.5**

### 属性 16: 页面焦点触发重算
*对于任意*日程列表，当页面获得焦点时，所有倒计时值应该被重新计算
**验证需求: 5.6**

### 属性 17: 不可见时暂停更新
*对于任意*不可见的列表视图，倒计时更新定时器应该被暂停（清除）
**验证需求: 5.7**

### 属性 18: 关闭开关隐藏所有倒计时
*对于任意*日程列表，当倒计时显示开关被关闭时，所有倒计时指示器应该被隐藏
**验证需求: 6.2**

### 属性 19: 设置持久化往返
*对于任意*倒计时设置，保存到本地存储后重新加载，应该得到相同的设置值
**验证需求: 6.4, 6.5**

## 错误处理

### 1. 时间计算错误
- 如果倒计时计算出现异常（如无效日期），应该捕获错误并不显示倒计时
- 记录错误到控制台以便调试

### 2. 本地存储错误
- 如果本地存储不可用或读写失败，使用默认设置
- 不应该阻止应用正常运行

### 3. 定时器错误
- 如果定时器设置失败，应该优雅降级，不影响其他功能
- 在组件卸载时确保清理所有定时器

## 测试策略

### 单元测试

使用 Vitest 进行单元测试，覆盖以下方面：

1. **倒计时计算逻辑**
   - 测试不同日程状态的倒计时计算
   - 测试边界情况（今天、明天）
   - 测试不同单位的转换

2. **排序逻辑**
   - 测试完成状态排序
   - 测试时间排序
   - 测试混合排序

3. **设置管理**
   - 测试设置的保存和加载
   - 测试默认设置

### 属性测试

使用 fast-check 进行属性测试，验证正确性属性：

1. **配置**
   - 每个属性测试运行至少 100 次迭代
   - 使用随机生成的日程数据

2. **测试标注**
   - 每个属性测试必须使用注释标注对应的设计文档属性
   - 格式：`**Feature: list-view-time-enhancements, Property {number}: {property_text}**`

3. **生成器策略**
   - 创建智能的日程生成器，覆盖各种状态（未开始、进行中、已过期、已完成）
   - 创建时间生成器，覆盖边界情况（今天、明天、多天后）
   - 创建设置生成器，覆盖所有配置组合

4. **属性测试覆盖**
   - 属性 1-3: 排序相关属性
   - 属性 4-10: 倒计时显示相关属性
   - 属性 11-17: 实时更新相关属性
   - 属性 18-19: 设置相关属性

### 集成测试

1. **组件集成**
   - 测试 ListView 与 CountdownIndicator 的集成
   - 测试 composables 之间的交互

2. **用户交互**
   - 测试设置变更后的UI更新
   - 测试完成状态切换后的重排序

## 实现细节

### 1. 排序实现

在 ListView.vue 中修改 `sortedEvents` computed 属性：

```typescript
const sortedEvents = computed(() => {
  return [...events.value].sort((a, b) => {
    // 首先按完成状态排序：未完成在前
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    // 然后按开始时间排序：早的在前
    return a.startTime.getTime() - b.startTime.getTime();
  });
});
```

### 2. 倒计时计算

在 useCountdown composable 中实现核心计算逻辑：

```typescript
function getCountdown(event: CalendarEvent, unit: 'day' | 'hour' | 'minute'): CountdownInfo {
  const now = new Date();
  
  // 已完成或已过期不显示倒计时
  if (event.isCompleted || event.endTime < now) {
    return { type: 'none', value: 0, unit, text: '' };
  }
  
  // 未开始：显示开始倒计时
  if (event.startTime > now) {
    const diff = calculateDiff(now, event.startTime, unit);
    const text = formatStartCountdown(diff, unit);
    return { type: 'start', value: diff, unit, text };
  }
  
  // 进行中：显示结束倒计时
  if (event.startTime <= now && event.endTime > now) {
    const diff = calculateDiff(now, event.endTime, unit);
    const text = formatEndCountdown(diff, unit);
    return { type: 'end', value: diff, unit, text };
  }
  
  return { type: 'none', value: 0, unit, text: '' };
}
```

### 3. 自动更新机制

```typescript
function startAutoUpdate() {
  // 每分钟更新一次
  updateInterval = setInterval(() => {
    forceUpdate();
  }, 60000);
  
  // 监听页面可见性
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 监听页面焦点
  window.addEventListener('focus', handleFocus);
  
  // 设置午夜刷新
  scheduleMidnightRefresh();
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopAutoUpdate();
  } else {
    forceUpdate();
    startAutoUpdate();
  }
}

function scheduleMidnightRefresh() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  midnightTimeout = setTimeout(() => {
    forceUpdate();
    scheduleMidnightRefresh(); // 递归设置下一个午夜
  }, msUntilMidnight);
}
```

### 4. 设置持久化

```typescript
const STORAGE_KEY = 'countdown-settings';

function loadSettings(): CountdownSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load countdown settings:', error);
  }
  
  // 默认设置
  return {
    enabled: true,
    unit: 'day'
  };
}

function saveSettings(settings: CountdownSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save countdown settings:', error);
  }
}
```

## 性能考虑

### 1. 计算优化
- 倒计时计算使用缓存，避免重复计算
- 使用 computed 属性自动管理依赖

### 2. 更新频率
- 默认每分钟更新一次，平衡实时性和性能
- 页面不可见时暂停更新，节省资源

### 3. 内存管理
- 组件卸载时清理所有定时器
- 使用 WeakMap 存储临时数据，允许垃圾回收

## 可访问性

### 1. 语义化HTML
- 使用适当的 ARIA 标签标注倒计时信息
- 确保屏幕阅读器能正确读取倒计时

### 2. 视觉对比
- 确保倒计时文本与背景有足够的对比度
- 支持暗色模式

### 3. 键盘导航
- 设置界面的所有控件支持键盘操作
- 提供清晰的焦点指示

## 兼容性

### 浏览器支持
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 依赖项
- Day.js: 已在项目中使用，用于日期计算
- Vue 3: Composition API
- TypeScript: 类型安全

## 未来扩展

### 可能的增强功能
1. 支持更多倒计时单位（周、月）
2. 自定义倒计时文本格式
3. 倒计时提醒通知
4. 倒计时进度条可视化
5. 支持多语言倒计时文本
