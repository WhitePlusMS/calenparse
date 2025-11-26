# 移动端样式优化设计文档

## 1. 设计原则

### 1.1 核心原则
1. **桌面优先，移动增强**: 不修改桌面端样式，仅通过媒体查询添加移动端优化
2. **渐进增强**: 从大屏到小屏逐步优化，确保各尺寸设备都有良好体验
3. **触摸优先**: 所有交互元素都考虑触摸操作的特点
4. **内容优先**: 在小屏幕上优先展示核心内容，隐藏或折叠次要信息

### 1.2 设计约束
- 必须使用 CSS 媒体查询实现
- 不能修改 HTML 结构
- 不能添加新的 JavaScript 逻辑
- 保持与现有设计系统的一致性

## 2. 响应式断点策略

### 2.1 断点定义
```css
/* 桌面端（默认）: > 768px */
/* 无需媒体查询，使用现有样式 */

/* 平板端: ≤ 768px */
@media (max-width: 768px) {
  /* 平板优化样式 */
}

/* 手机端: ≤ 480px */
@media (max-width: 480px) {
  /* 手机优化样式 */
}

/* 小屏手机: ≤ 375px */
@media (max-width: 375px) {
  /* 小屏手机特殊优化 */
}
```

### 2.2 断点选择理由
- **768px**: iPad 竖屏宽度，是平板和桌面的分界点
- **480px**: 大部分手机横屏宽度，是平板和手机的分界点
- **375px**: iPhone SE 等小屏手机宽度，需要特殊优化

## 3. 组件级设计方案

### 3.1 App.vue - 主布局

#### 3.1.1 侧边栏（Sidebar）移动端适配

**桌面端（保持不变）**:
- 固定在左侧，宽度 80px
- 垂直布局，图标 + 文字

**平板端（≤768px）**:
```css
.sidebar {
  width: 100%;
  height: 56px;
  bottom: 0;
  top: auto;
  flex-direction: row;
  border-right: none;
  border-top: 1px solid var(--border-light);
}

.sidebar-nav {
  flex-direction: row;
  justify-content: space-around;
  overflow-x: auto;
}

.sidebar-item {
  width: 64px;
  min-height: 56px;
}
```

**手机端（≤480px）**:
```css
.sidebar {
  height: 60px;
}

.sidebar-item {
  width: 56px;
  min-height: 60px;
  padding: 8px 4px;
}

.sidebar-item-icon {
  font-size: 24px;
}

.sidebar-item-label {
  font-size: 10px;
}
```

#### 3.1.2 主内容区域

**平板端**:
```css
.main-content {
  margin-left: 0;
  margin-bottom: 56px;
}

.content-container {
  padding: 16px;
}

.view-wrapper {
  padding: 20px;
}
```

**手机端**:
```css
.content-container {
  padding: 12px;
}

.view-wrapper {
  padding: 16px;
  border-radius: 12px;
}
```

#### 3.1.3 全局错误横幅

**平板端**:
```css
.global-error-banner {
  left: 0;
  bottom: 56px;
  top: auto;
  font-size: 13px;
  padding: 12px 16px;
}
```

### 3.2 CalendarView.vue - 日历视图

#### 3.2.1 视图切换按钮

**平板端**:
```css
.view-switcher {
  gap: 8px;
  flex-wrap: wrap;
}

.view-button {
  min-width: 64px;
  min-height: 48px;
  padding: 10px 16px;
}
```

**手机端**:
```css
.view-switcher {
  gap: 6px;
}

.view-button {
  min-width: 56px;
  min-height: 48px;
  padding: 8px 12px;
  font-size: 13px;
}

.view-icon {
  font-size: 20px;
}

.view-label {
  font-size: 11px;
}
```

#### 3.2.2 FullCalendar 样式优化

**平板端**:
```css
/* 日期单元格 */
:deep(.fc-daygrid-day) {
  min-height: 56px;
}

/* 事件卡片 */
:deep(.fc-event) {
  font-size: 13px;
  padding: 4px 6px;
}

/* 月份切换按钮 */
:deep(.fc-button) {
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
}
```

**手机端**:
```css
/* 日期单元格 */
:deep(.fc-daygrid-day) {
  min-height: 48px;
}

/* 事件卡片 - 简化显示 */
:deep(.fc-event-title) {
  font-size: 12px;
}

:deep(.fc-event-location) {
  display: none; /* 隐藏地点 */
}

/* 标签最多显示 2 个 */
:deep(.fc-event-tags) {
  max-width: 100px;
  overflow: hidden;
}

:deep(.fc-event-tag:nth-child(n+3)) {
  display: none;
}
```

#### 3.2.3 搜索筛选面板

**平板端**:
```css
.filter-toggle-btn {
  min-height: 48px;
  padding: 12px 20px;
  font-size: 15px;
}

.filter-section {
  padding: 16px;
}

.tag-filter-item {
  min-height: 44px;
  padding: 10px 16px;
  font-size: 14px;
}
```

**手机端**:
```css
.filter-toggle-btn {
  min-height: 48px;
  padding: 12px 16px;
  font-size: 14px;
}

.filter-section {
  padding: 12px;
}

.section-title {
  font-size: 14px;
}

.tag-filter-item {
  min-height: 48px;
  padding: 12px 16px;
  font-size: 13px;
  margin: 4px;
}

/* 日期选择器全屏 */
:deep(.el-date-picker) {
  width: 100% !important;
}
```

### 3.3 ListView.vue - 列表视图

#### 3.3.1 顶部工具栏

**平板端**:
```css
.top-toolbar {
  gap: 12px;
  flex-wrap: wrap;
}

.filter-toggle-btn,
.batch-toggle-btn {
  min-height: 48px;
  padding: 12px 20px;
}
```

**手机端**:
```css
.top-toolbar {
  gap: 8px;
}

.filter-toggle-btn,
.batch-toggle-btn {
  flex: 1;
  min-width: 0;
  font-size: 14px;
}
```

#### 3.3.2 列表项

**平板端**:
```css
.event-item {
  padding: 20px;
  gap: 16px;
}

.event-date-badge {
  width: 64px;
  height: 64px;
}

.event-title {
  font-size: 17px;
}

.event-meta-item {
  font-size: 14px;
}
```

**手机端**:
```css
.event-item {
  padding: 16px 12px;
  gap: 12px;
}

.event-date-badge {
  width: 48px;
  height: 48px;
}

.event-date-badge__day {
  font-size: 18px;
}

.event-date-badge__month {
  font-size: 10px;
}

.event-title {
  font-size: 16px;
  line-height: 1.4;
}

.event-meta-item {
  font-size: 13px;
}

.event-description {
  font-size: 13px;
  line-height: 1.5;
}

/* 隐藏箭头图标 */
.event-arrow {
  display: none;
}
```

#### 3.3.3 批量操作

**平板端**:
```css
.event-checkbox {
  width: 24px;
  height: 24px;
}

.batch-operation-bar {
  height: 64px;
  padding: 12px 20px;
}
```

**手机端**:
```css
.event-checkbox {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}

.batch-operation-bar {
  height: 72px;
  padding: 12px 16px;
  gap: 12px;
}

.batch-operation-bar button {
  min-height: 48px;
  padding: 12px 16px;
  font-size: 14px;
}
```

### 3.4 FloatingInput.vue - 浮动输入框

#### 3.4.1 容器定位

**平板端**:
```css
.floating-input-container {
  bottom: 72px; /* 避开底部导航 */
  margin-left: 0;
  width: calc(100% - 32px);
  max-width: none;
}
```

**手机端**:
```css
.floating-input-container {
  bottom: 76px;
  width: calc(100% - 24px);
}
```

#### 3.4.2 输入框样式

**平板端**:
```css
.input-box {
  padding: 12px 16px;
}

.input-field {
  font-size: 16px; /* 防止 iOS 自动缩放 */
}

.send-button {
  width: 48px;
  height: 48px;
}
```

**手机端**:
```css
.input-box {
  padding: 10px 14px;
}

.input-box.expanded {
  padding: 16px;
}

.input-field--expanded {
  min-height: 100px;
  max-height: 180px;
}

.send-button {
  width: 48px;
  height: 48px;
}

.send-button--collapsed {
  width: 44px;
  height: 44px;
}
```

#### 3.4.3 虚拟键盘适配

**设计决策**: 虚拟键盘弹出时的处理

移动端浏览器在虚拟键盘弹出时会自动调整视口高度，浏览器会尝试将获得焦点的输入框滚动到可见区域。由于浮动输入框使用固定定位（`position: fixed`），浏览器的默认行为已经能够满足需求 11.3。

**实现方式**:
- 依赖浏览器原生行为处理键盘弹出
- 输入框字体大小设置为 16px 防止 iOS 自动缩放
- 使用 `bottom` 定位确保输入框始终在视口底部
- 展开时自动聚焦（通过 Vue 的 `@focus` 事件处理）

**注意事项**:
- iOS Safari 和 Android Chrome 对虚拟键盘的处理略有不同
- iOS 会调整 `window.innerHeight`，Android 可能不会
- 固定定位元素会随视口调整自动重新定位
- 无需额外的 JavaScript 逻辑或 CSS 处理

### 3.5 EventDialog.vue - 事件对话框

#### 3.5.1 对话框尺寸

**平板端**:
```css
:deep(.el-dialog) {
  width: 90% !important;
  max-width: 600px;
}
```

**手机端**:
```css
:deep(.el-dialog) {
  width: 95% !important;
  max-width: calc(100% - 24px);
  max-height: 90vh;
  margin: 5vh auto;
  border-radius: 12px !important;
}

:deep(.el-dialog__body) {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}
```

#### 3.5.2 表单元素

**平板端**:
```css
:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__inner) {
  font-size: 15px;
  height: 44px;
}

:deep(.el-button) {
  min-height: 44px;
  padding: 10px 20px;
}
```

**手机端**:
```css
:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-input__inner) {
  font-size: 16px; /* 防止 iOS 缩放 */
  height: 48px;
}

:deep(.el-textarea__inner) {
  font-size: 16px;
}

:deep(.el-button) {
  min-height: 48px;
  padding: 12px 20px;
  font-size: 15px;
}
```

### 3.6 VisitorBanner.vue - 访客横幅

#### 3.6.1 布局优化

**平板端**:
```css
.visitor-banner {
  padding: 16px 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.quota-item {
  font-size: 14px;
}
```

**手机端**:
```css
.visitor-banner {
  flex-direction: column;
  align-items: stretch;
  padding: 12px 16px;
  gap: 10px;
}

.quota-item {
  font-size: 13px;
  justify-content: space-between;
}

.quota-icon {
  font-size: 18px;
}
```

## 4. 通用移动端优化

### 4.1 字体系统

**平板端**:
```css
:root {
  --font-size-base: 15px;
  --font-size-sm: 13px;
  --font-size-lg: 17px;
  --font-size-xl: 19px;
}
```

**手机端**:
```css
:root {
  --font-size-base: 15px;
  --font-size-sm: 13px;
  --font-size-xs: 12px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
}
```

### 4.2 间距系统

**平板端**:
```css
:root {
  --spacing-sm: 10px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

**手机端**:
```css
:root {
  --spacing-xs: 6px;
  --spacing-sm: 10px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 28px;
}
```

### 4.3 触摸目标

**所有移动端**:
```css
@media (max-width: 768px) {
  /* 最小触摸目标 */
  button,
  a,
  input[type="checkbox"],
  input[type="radio"],
  .clickable {
    min-width: 44px;
    min-height: 44px;
  }
  
  /* 增加可点击区域 */
  button,
  a {
    padding: 12px 16px;
  }
}

@media (max-width: 480px) {
  button,
  a {
    min-height: 48px;
  }
}
```

### 4.4 Element Plus 组件优化

**平板端**:
```css
@media (max-width: 768px) {
  /* 按钮 */
  :deep(.el-button) {
    min-height: 44px;
    padding: 10px 16px;
    font-size: 14px;
  }
  
  /* 输入框 */
  :deep(.el-input__inner) {
    height: 44px;
    font-size: 15px;
  }
  
  /* 选择器 */
  :deep(.el-select-dropdown__item) {
    min-height: 44px;
    padding: 10px 16px;
  }
  
  /* 日期选择器 */
  :deep(.el-date-picker) {
    font-size: 14px;
  }
}
```

**手机端**:
```css
@media (max-width: 480px) {
  /* 按钮 */
  :deep(.el-button) {
    min-height: 48px;
    padding: 12px 16px;
    font-size: 15px;
  }
  
  /* 输入框 - 防止 iOS 缩放 */
  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    font-size: 16px !important;
  }
  
  /* 对话框 */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto;
  }
  
  /* 消息提示 */
  :deep(.el-message) {
    min-width: 300px;
    max-width: calc(100% - 32px);
  }
}
```

## 5. 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 移动端触摸目标最小尺寸

*对于任何*在移动端设备上渲染的可交互元素（按钮、链接、复选框），该元素的最小触摸目标尺寸应符合平台标准（手机设备 48px，平板设备 44px）

**验证**: 需求 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7

### 属性 2: 移动端字体和间距规范

*对于任何*在移动端设备上渲染的文本和布局元素，字体大小、行高和间距应符合移动端可读性标准（基础字体 15px，最小字体 12px，输入框字体 16px，行高 1.7）

**验证**: 需求 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

### 属性 3: 侧边栏移动端布局转换

*对于任何*移动端设备，侧边栏应从垂直左侧布局转换为水平底部布局，高度为平板 56px 或手机 60px，并为主内容区域预留相应空间

**验证**: 需求 3.1, 3.2, 3.3, 3.4, 3.5

### 属性 4: 内容区域响应式边距

*对于任何*在移动端设备上显示的内容区域和卡片，边距和内边距应根据设备类型调整（平板 16-20px，手机 12-16px）

**验证**: 需求 4.1, 4.2, 4.3, 4.4

### 属性 5: 对话框移动端空间利用

*对于任何*在移动端设备上打开的对话框，宽度应占视口的 90-95%，最大高度为 90vh，并支持内容滚动

**验证**: 需求 5.1, 5.2, 5.3

### 属性 6: 日历控件移动端尺寸

*对于任何*在移动端设备上显示的日历控件元素（日期单元格、切换按钮、事件卡片），尺寸应符合触摸友好标准（最小 44-48px）

**验证**: 需求 6.1, 6.2, 6.3, 6.4

### 属性 7: 日历事件信息简化显示

*对于任何*在手机设备上显示的日历事件，应仅显示标题和时间，隐藏地点信息，并限制标签显示数量为最多 2 个

**验证**: 需求 7.1, 7.2, 7.3

### 属性 8: 列表项移动端紧凑布局

*对于任何*在移动端设备上显示的列表项，应采用紧凑布局（手机设备日期徽章 48x48px，隐藏箭头图标）

**验证**: 需求 8.1, 8.2, 8.3

### 属性 9: 批量操作移动端可用性

*对于任何*在移动端设备上使用的批量操作功能，复选框应至少 24x24px，操作栏应固定在底部且高度至少 56px

**验证**: 需求 9.1, 9.2, 9.3

### 属性 10: 浮动输入框移动端定位和交互

*对于任何*在移动端设备上显示的浮动输入框，应定位在距底部 72-76px 的位置，展开时最小高度 100px，字体大小 16px，并在展开时自动获得焦点

**验证**: 需求 10.1, 10.2, 10.3, 10.4, 11.1, 11.2

### 属性 11: 筛选面板移动端操作友好性

*对于任何*在移动端设备上显示的筛选面板控件，按钮高度应至少 48px，标签按钮间距 8px，日期选择器在手机上全屏显示

**验证**: 需求 12.1, 12.2, 12.3, 12.4

### 属性 12: 访客横幅移动端紧凑布局

*对于任何*在手机设备上显示的访客横幅，应采用垂直堆叠布局，字体和图标大小适当缩小

**验证**: 需求 13.1, 13.2, 13.3

### 属性 13: 桌面端样式隔离

*对于任何*屏幕宽度大于 768px 的设备，所有样式应保持桌面端原有状态，不受移动端优化影响

**验证**: 需求 14.4

### 属性 14: 浏览器兼容性保证

*对于任何*在 iOS Safari 14+、Android Chrome 90+ 或主流平板浏览器上运行的应用，所有移动端样式和交互功能应正常工作

**验证**: 需求 15.1, 15.2, 15.3

### 属性 15: 性能约束

*对于任何*移动端样式优化实现，CSS 体积增加应不超过 20KB，不引入额外 JavaScript 逻辑，且保持现有动画性能

**验证**: 需求 16.1, 16.2, 16.3

## 6. 性能优化

### 6.1 CSS 优化策略
- 使用 CSS 变量减少重复代码
- 合并相似的媒体查询
- 避免过度嵌套选择器
- 使用 `will-change` 优化动画性能

### 6.2 渲染优化
```css
/* 优化滚动性能 */
@media (max-width: 768px) {
  .event-list,
  .calendar-view {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
}

/* 优化动画性能 */
@media (max-width: 768px) {
  .sidebar,
  .floating-input-container,
  .batch-operation-bar {
    will-change: transform;
  }
}
```

## 7. 浏览器兼容性

### 7.1 目标浏览器

**iOS 平台**:
- Safari 14+ （iOS 14+）
- 支持 CSS Grid、Flexbox、CSS 变量
- 支持触摸事件和手势

**Android 平台**:
- Chrome 90+
- 支持现代 CSS 特性
- 支持触摸事件

**平板浏览器**:
- iPad Safari
- Android Chrome/Firefox
- 主流平板浏览器

### 7.2 兼容性策略

**CSS 特性使用**:
```css
/* 使用标准 CSS 特性，避免实验性特性 */
@media (max-width: 768px) {
  /* Flexbox - 广泛支持 */
  .container {
    display: flex;
  }
  
  /* CSS 变量 - iOS 9.3+, Android Chrome 49+ */
  .element {
    color: var(--primary-color);
  }
  
  /* CSS Grid - iOS 10.3+, Android Chrome 57+ */
  .grid {
    display: grid;
  }
}
```

**浏览器前缀处理**:
- Vite 自动通过 PostCSS 添加必要的浏览器前缀
- 针对 iOS Safari 的特殊处理：
  - `-webkit-overflow-scrolling: touch` 用于流畅滚动
  - `-webkit-tap-highlight-color` 控制点击高亮

**iOS Safari 特殊优化**:
```css
/* 防止 iOS 自动缩放 */
@media (max-width: 480px) {
  input, textarea, select {
    font-size: 16px !important; /* 最小 16px 防止缩放 */
  }
}

/* iOS 滚动优化 */
.scrollable {
  -webkit-overflow-scrolling: touch;
}

/* 移除 iOS 点击高亮 */
button, a {
  -webkit-tap-highlight-color: transparent;
}
```

**Android Chrome 特殊优化**:
```css
/* 优化触摸延迟 */
button, a {
  touch-action: manipulation;
}
```

### 7.3 降级策略

对于不支持的浏览器特性，采用渐进增强：
- 核心功能使用广泛支持的 CSS 特性
- 高级特性（如 CSS Grid）提供 Flexbox 降级
- 动画效果在低性能设备上可能被简化

## 8. 可访问性考虑

### 8.1 触摸目标
- 所有可交互元素至少 44x44px（iOS）或 48x48px（Android）
- 相邻触摸目标之间至少 8px 间距

### 8.2 文字可读性
- 最小字体 12px
- 正文字体至少 15px
- 行高至少 1.5

### 8.3 对比度
- 保持现有的 WCAG AA 标准
- 移动端不降低对比度

## 9. 测试策略

### 9.1 单元测试方法

移动端样式优化主要通过 CSS 实现，测试重点在于验证样式规则的正确应用：

- **视口模拟测试**: 使用 Vitest 和 jsdom 模拟不同视口尺寸
- **CSS 计算样式验证**: 测试元素的计算样式是否符合预期
- **媒体查询测试**: 验证不同断点下样式的正确应用
- **组件渲染测试**: 确保组件在移动端正确渲染

### 9.2 属性测试方法

由于移动端优化是纯 CSS 实现，属性测试将专注于：

- **样式一致性**: 验证所有同类元素都应用了正确的移动端样式
- **断点隔离**: 确保桌面端样式不受移动端媒体查询影响
- **尺寸约束**: 验证触摸目标、字体、间距等符合最小值要求

**注意**: 由于这是样式优化项目，大部分验证将通过手动测试和视觉回归测试完成。自动化测试主要用于验证 CSS 规则的存在和基本正确性。

### 9.3 设备测试矩阵
| 设备类型 | 屏幕尺寸 | 测试重点 |
|---------|---------|---------|
| iPhone SE | 375x667 | 小屏手机适配 |
| iPhone 14 Pro | 393x852 | 中屏手机适配 |
| iPhone 14 Pro Max | 430x932 | 大屏手机适配 |
| iPad | 768x1024 | 平板适配 |
| Android 手机 | 各种尺寸 | 兼容性测试 |

### 9.4 测试场景
1. 侧边栏导航切换
2. 日历视图操作（切换视图、选择日期）
3. 列表视图滚动和点击
4. 浮动输入框输入和发送
5. 搜索筛选面板展开和操作
6. 批量操作选择和执行
7. 对话框打开和表单填写
8. 横屏和竖屏切换

### 9.5 性能测试
- 页面加载时间 < 3s
- 滚动帧率 > 50fps
- 动画流畅无卡顿
- 内存占用合理

## 10. 实施计划

### 10.1 实施顺序
1. **Phase 1**: 核心布局优化（侧边栏、主内容区域）
2. **Phase 2**: 日历视图优化
3. **Phase 3**: 列表视图优化
4. **Phase 4**: 浮动输入框和对话框优化
5. **Phase 5**: 细节优化和测试

### 10.2 文件修改清单
- `src/App.vue` - 主布局移动端样式
- `src/components/CalendarView.vue` - 日历视图移动端样式
- `src/components/ListView.vue` - 列表视图移动端样式
- `src/components/FloatingInput.vue` - 浮动输入框移动端样式
- `src/components/EventDialog.vue` - 对话框移动端样式
- `src/components/VisitorBanner.vue` - 访客横幅移动端样式
- `src/components/BatchOperationBar.vue` - 批量操作栏移动端样式
- `src/style.css` - 全局移动端样式变量

## 11. 验收标准

### 11.1 功能验收
- [ ] 所有页面在移动端正常显示
- [ ] 所有交互功能在移动端正常工作
- [ ] 桌面端样式完全不受影响

### 11.2 体验验收
- [ ] 触摸目标足够大，易于点击
- [ ] 文字清晰可读，无需缩放
- [ ] 布局合理，无横向滚动
- [ ] 操作流畅，无明显卡顿

### 11.3 兼容性验收
- [ ] iPhone SE 测试通过
- [ ] iPhone 14 Pro 测试通过
- [ ] iPad 测试通过
- [ ] Android 手机测试通过
- [ ] 横屏和竖屏都正常
