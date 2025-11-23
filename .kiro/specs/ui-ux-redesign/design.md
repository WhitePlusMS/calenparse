# 设计文档 - UI/UX 重新设计

## 概述

CalenParse 智能日历解析器已经具备完整的功能，但用户界面需要全面优化以提升用户体验。本设计文档详细说明了如何重新设计应用的视觉层次、布局系统、交互反馈和响应式设计，使应用更加现代化、专业化和易用。

### 设计目标

1. **清晰的视觉层次** - 通过字体大小、颜色对比和留白引导用户注意力
2. **现代化的视觉风格** - 使用柔和阴影、圆角和卡片式设计
3. **流畅的交互体验** - 添加动画效果和微交互反馈
4. **响应式布局** - 适配桌面、平板和移动设备
5. **一致的设计系统** - 统一的间距、颜色和组件样式

### 技术栈

- **前端框架**: Vue 3 + Composition API
- **UI 库**: Element Plus
- **样式方案**: CSS Variables + Scoped CSS
- **动画**: CSS Transitions + Keyframe Animations
- **响应式**: CSS Media Queries

## 架构

### 设计系统架构

设计系统采用分层架构：

1. **基础层 (Foundation Layer)**
   - CSS Variables 定义颜色、间距、字体
   - 全局样式和重置样式
   - 主题切换机制

2. **组件层 (Component Layer)**
   - 可复用的 UI 组件
   - 统一的视觉风格和交互模式
   - 组件级别的样式封装

3. **布局层 (Layout Layer)**
   - 页面级别的布局结构
   - 响应式网格系统
   - 视图切换和导航


## 组件和接口

### 1. 布局系统

#### 1.1 主布局结构

参考 ChatGPT、Claude、Gemini 的极简设计理念，采用**窄侧边栏 + 中心对齐内容**的布局：

```
┌─┬────────────────────────────────────────┐
│ │                                        │
│ │         日历/列表/统计视图              │
│侧│         (中心对齐，最大宽度限制)        │
│边│                                        │
│栏│                                        │
│ │                                        │
│图│                                        │
│标│                                        │
│按│                                        │
│钮│                                        │
│ │                                        │
│ │                                        │
│ │      [➕ 添加日程] ← 悬浮按钮          │
│ │                                        │
└─┴────────────────────────────────────────┘
```

**设计特点**：

**极简侧边栏** (宽度: 64px):
```
┌────┐
│ 📅 │  ← Logo/Home
├────┤
│ 📅 │  ← 日历视图
│ 📋 │  ← 列表视图
│ 📊 │  ← 统计视图
├────┤
│ 🏷️ │  ← 标签
│ � │  ← 分享
│ 📦 │  ← 导入导出
├────┤
│    │
│    │  (空白)
│    │
├────┤
│ 🎨 │  ← 主题
│ ⚙️ │  ← 设置
└────┘
```

**主内容区** (flex: 1):
- 内容居中，最大宽度 1200px
- 左右留白，提供呼吸感
- 顶部可选的面包屑导航
- 底部悬浮输入按钮（居中）

**设计决策**: 
- **极简侧边栏**: 只显示图标，悬停时显示文字提示，节省空间
- **中心对齐**: 内容居中显示，类似ChatGPT的对话界面，视觉焦点集中
- **最大宽度限制**: 防止内容在超宽屏幕上过度拉伸，保持最佳阅读体验
- **图标导航**: 清晰直观，减少视觉噪音
- **悬浮输入**: 类似ChatGPT的输入框，固定在底部中央

#### 1.2 极简侧边栏设计

**侧边栏样式**:
```css
.sidebar {
  width: 64px;
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  transition: all 0.3s ease;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 12px;
  position: relative;
}

.sidebar-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--primary-color);
  color: white;
}

.sidebar-item-icon {
  font-size: 24px;
  line-height: 1;
}

/* 悬停提示 */
.sidebar-item-tooltip {
  position: absolute;
  left: 72px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  white-space: nowrap;
  box-shadow: 0 2px 8px var(--shadow);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 100;
}

.sidebar-item:hover .sidebar-item-tooltip {
  opacity: 1;
}

/* 分隔线 */
.sidebar-divider {
  width: 32px;
  height: 1px;
  background: var(--border-light);
  margin: 8px auto;
}

.sidebar-footer {
  padding: 12px 0;
  border-top: 1px solid var(--border-light);
}
```

**移动端适配**:
```css
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: 56px;
    bottom: 0;
    top: auto;
    border-right: none;
    border-top: 1px solid var(--border-light);
  }
  
  .sidebar-nav {
    flex-direction: row;
    justify-content: space-around;
    padding: 0;
  }
  
  .sidebar-item {
    width: 56px;
    height: 56px;
  }
  
  .sidebar-item-tooltip {
    display: none; /* 移动端不显示提示 */
  }
  
  .sidebar-divider {
    display: none;
  }
  
  .sidebar-footer {
    display: none;
  }
}
```

#### 1.3 悬浮输入框设计（类似ChatGPT）

**收起状态**:
```
┌──────────────────────────────────────────┐
│  [粘贴或输入官方通告文本...]  [🚀]     │
└──────────────────────────────────────────┘
```
- 固定在页面底部中央
- 类似ChatGPT的输入框样式
- 宽度: 90% (最大700px)
- 高度: 56px
- 圆角边框，白色背景，阴影效果
- 右侧有发送按钮（火箭图标）

**展开状态（点击输入框）**:
```
┌─────────────────────────────────────────┐
│                                         │
│  粘贴或输入官方通告文本...               │
│                                         │
│  例如：                                  │
│  关于举办学术讲座的通知                   │
│  时间：2024年3月15日 下午2:00-4:00      │
│  地点：图书馆报告厅                       │
│                                         │
├─────────────────────────────────────────┤
│ 123 字符 | Ctrl+Enter 快速解析    [🚀] │
└─────────────────────────────────────────┘
```
- 输入框高度自动扩展（最多8行）
- 底部显示字符计数和快捷键提示
- 右下角保持发送按钮
- 无需遮罩，直接在原位置扩展

**交互流程**:
1. 用户点击输入框
2. 输入框平滑扩展到多行高度
3. 输入框自动获得焦点
4. 用户输入文本
5. 点击发送按钮或按Ctrl+Enter解析
6. 解析完成后，输入框自动清空并收起
7. 点击输入框外部区域也可以收起

**设计优势**:
- 类似ChatGPT的交互模式，用户熟悉
- 无需弹窗，减少视觉干扰
- 输入框始终可见，降低操作门槛
- 自动扩展，适应不同长度的输入

#### 1.4 主内容区布局

```css
.main-content {
  margin-left: 64px; /* 侧边栏宽度 */
  min-height: 100vh;
  background: var(--bg-color);
  display: flex;
  justify-content: center;
  transition: margin-left 0.3s ease;
}

.content-container {
  width: 100%;
  max-width: 1200px; /* 最大宽度限制 */
  padding: 24px;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    margin-bottom: 56px; /* 底部导航栏高度 */
  }
  
  .content-container {
    padding: 16px;
  }
}

/* 内容区域呼吸感 */
@media (min-width: 1400px) {
  .content-container {
    padding: 40px 80px;
  }
}
```

#### 1.5 响应式断点

```css
/* 桌面 */
@media (min-width: 1200px) { }

/* 平板 */
@media (max-width: 1200px) { }
@media (max-width: 768px) { }

/* 移动 */
@media (max-width: 480px) { }
```

### 2. 颜色系统

#### 2.1 CSS Variables 结构

```css
:root {
  /* 主色调 */
  --primary-color: #667eea;
  --primary-light: #8b9ef5;
  --primary-dark: #4c5ed4;
  
  /* 浅色模式 */
  --bg-color: #f5f7fa;
  --bg-secondary: #ffffff;
  --bg-hover: #f0f2f5;
  --text-primary: #303133;
  --text-secondary: #606266;
  --text-tertiary: #909399;
  --border-color: #dcdfe6;
  --border-light: #e4e7ed;
  --shadow: rgba(0, 0, 0, 0.1);
}

:root.dark-mode {
  /* 深色模式 */
  --bg-color: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-hover: #3a3a3a;
  --text-primary: #e4e7ed;
  --text-secondary: #c0c4cc;
  --text-tertiary: #909399;
  --border-color: #4c4d4f;
  --border-light: #3a3a3c;
  --shadow: rgba(0, 0, 0, 0.3);
}
```

**设计决策**: 使用 CSS Variables 实现主题切换，确保所有组件自动响应主题变化。颜色对比度符合 WCAG AA 标准。


### 3. 间距系统

采用 8px 基准的间距系统：

```css
--spacing-xs: 4px;   /* 0.5x */
--spacing-sm: 8px;   /* 1x */
--spacing-md: 16px;  /* 2x */
--spacing-lg: 24px;  /* 3x */
--spacing-xl: 32px;  /* 4x */
--spacing-2xl: 48px; /* 6x */
```

### 4. 字体层次

```css
/* 标题 */
h1 { font-size: 2.5em; font-weight: 700; }
h2 { font-size: 1.5em; font-weight: 600; }
h3 { font-size: 1.2em; font-weight: 600; }

/* 正文 */
body { font-size: 14px; line-height: 1.6; }

/* 辅助文字 */
.text-secondary { font-size: 13px; color: var(--text-secondary); }
.text-tertiary { font-size: 12px; color: var(--text-tertiary); }
```

### 5. 卡片和阴影

```css
/* 卡片基础样式 */
.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 12px var(--shadow);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 16px var(--shadow);
  transform: translateY(-2px);
}
```

### 6. 按钮系统

#### 6.1 按钮类型

- **主要按钮**: 填充样式，主色调，用于主要操作
- **次要按钮**: 轮廓样式，中性色，用于次要操作
- **危险按钮**: 红色，用于删除等危险操作

#### 6.2 按钮状态

```css
/* 正常状态 */
.button-primary {
  background: var(--primary-color);
  color: white;
  border: 2px solid var(--primary-color);
}

/* 悬停状态 */
.button-primary:hover {
  background: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px var(--shadow);
}

/* 按下状态 */
.button-primary:active {
  transform: translateY(0);
}

/* 禁用状态 */
.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```


### 7. ChatGPT风格输入框详细设计

#### 7.1 输入框容器样式

```css
.floating-input-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  
  width: 90%;
  max-width: 700px;
  
  /* 考虑侧边栏偏移 */
  margin-left: 32px; /* 侧边栏宽度的一半 */
}

@media (max-width: 768px) {
  .floating-input-container {
    bottom: 72px; /* 避开底部导航栏 */
    margin-left: 0;
  }
}
```

#### 7.2 输入框样式（收起状态）

```css
.input-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  box-shadow: 0 2px 12px var(--shadow);
  
  transition: all 0.3s ease;
}

.input-box:hover {
  box-shadow: 0 4px 16px var(--shadow);
  border-color: var(--primary-color);
}

.input-box.focused {
  border-color: var(--primary-color);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-primary);
  resize: none;
  max-height: 200px; /* 最多8行 */
  overflow-y: auto;
  line-height: 1.5;
}

.input-field::placeholder {
  color: var(--text-tertiary);
}

.send-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-button:hover {
  background: var(--primary-light);
  transform: scale(1.05);
}

.send-button:disabled {
  background: var(--border-color);
  cursor: not-allowed;
  opacity: 0.5;
}

.send-button-icon {
  font-size: 18px;
  line-height: 1;
}
```

#### 7.3 展开状态（多行输入）

```css
.input-box.expanded {
  flex-direction: column;
  align-items: stretch;
  padding: 16px;
  border-radius: 16px;
}

.input-box.expanded .input-field {
  min-height: 120px;
  margin-bottom: 12px;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.input-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.char-count {
  color: var(--text-secondary);
}

.char-count.warning {
  color: #e6a23c;
  font-weight: 500;
}

.shortcut-hint {
  color: var(--text-tertiary);
}

.input-box.expanded .send-button {
  width: 40px;
  height: 40px;
}
```

#### 7.4 交互特性

**自动扩展逻辑**:
```typescript
const handleFocus = () => {
  isExpanded.value = true;
  // 平滑扩展动画
};

const handleBlur = (e: FocusEvent) => {
  // 如果点击的是发送按钮，不收起
  if (e.relatedTarget?.classList.contains('send-button')) {
    return;
  }
  // 如果输入框为空，收起
  if (!inputText.value.trim()) {
    isExpanded.value = false;
  }
};

const handleInput = () => {
  // 自动调整高度
  const textarea = inputRef.value;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
};
```

**快捷键支持**:
```typescript
const handleKeydown = (e: KeyboardEvent) => {
  // Ctrl+Enter 或 Cmd+Enter 发送
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSend();
  }
  
  // Esc 收起（如果输入为空）
  if (e.key === 'Escape' && !inputText.value.trim()) {
    isExpanded.value = false;
    inputRef.value?.blur();
  }
};
```

#### 7.5 加载状态

```css
.input-box.loading {
  pointer-events: none;
  opacity: 0.7;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color);
  animation: loadingDot 1.4s infinite;
}

.loading-dot:nth-child(1) { animation-delay: 0s; }
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes loadingDot {
  0%, 20%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}
```

#### 7.6 移动端优化

```css
@media (max-width: 768px) {
  .floating-input-container {
    width: calc(100% - 32px);
    max-width: none;
  }
  
  .input-box {
    padding: 10px 14px;
  }
  
  .input-field {
    font-size: 16px; /* 防止iOS自动缩放 */
  }
  
  .send-button {
    width: 40px;
    height: 40px; /* 更大的触摸目标 */
  }
  
  .input-box.expanded .input-field {
    min-height: 100px;
  }
}
```

### 8. 日历视图设计

#### 8.1 视图类型

1. **日视图** - 显示单日详细时间表，1小时时间槽
2. **周视图** - 显示7天概览，时间网格布局
3. **月视图** - 显示整月日程分布
4. **年视图** - 显示全年日程密度

#### 8.2 事件卡片设计

```
┌─────────────────────────────┐
│ 09:00                       │
│ 学术讲座                     │
│ 📍 图书馆报告厅              │
│ 🏷️ [学术] [讲座]            │
└─────────────────────────────┘
```

**设计元素**:
- 时间标签（蓝色，粗体）
- 事件标题（黑色，中等字重）
- 地点图标 + 地点文字
- 标签（彩色背景，圆角）

#### 8.3 今日标识

```css
.fc-day-today {
  background-color: #f0f9ff !important;
  border: 2px solid var(--primary-light);
}
```

#### 8.4 悬浮提示

鼠标悬停在事件上时，显示完整信息：
- 完整标题
- 开始和结束时间
- 地点
- 描述
- 标签


### 9. 列表视图设计

#### 9.1 卡片式布局

```
┌──────┬────────────────────────────────┬──┐
│  15  │ 学术讲座                        │ › │
│ MAR  │ 🕐 14:00 - 16:00               │  │
│ 周五  │ 📍 图书馆报告厅                 │  │
│      │ 🏷️ [学术] [讲座]               │  │
└──────┴────────────────────────────────┴──┘
```

**设计元素**:
- **左侧日期徽章**: 渐变背景，白色文字，显示日期、月份、星期
- **中间事件详情**: 标题、时间、地点、标签
- **右侧箭头**: 指示可点击

#### 9.2 视觉状态

- **今天的事件**: 浅蓝色边框
- **过去的事件**: 降低不透明度 (0.7)
- **即将到来的事件**: 深蓝色边框
- **已完成的事件**: 灰色，删除线

#### 9.3 空状态设计

```
     📋
  暂无日程事件
使用上方输入框解析通告文本来创建日程
```

### 10. 统计视图设计

#### 10.1 统计卡片网格

```
┌─────────────┬─────────────┬─────────────┐
│   总事件数   │   本周事件   │   本月事件   │
│     42      │     12      │     28      │
│   📊 +5%    │   📈 +3     │   📉 -2     │
└─────────────┴─────────────┴─────────────┘
```

#### 10.2 图表设计

- **配色方案**: 使用主题颜色
- **动画效果**: 数据加载时的平滑动画
- **交互提示**: 悬停显示详细数据

### 11. 对话框设计

#### 11.1 事件编辑对话框

**布局结构**:
```
┌─────────────────────────────────────┐
│ 编辑事件                      [×]   │
├─────────────────────────────────────┤
│ 基本信息                            │
│ ├─ 📝 标题: [输入框]                │
│ ├─ 📅 开始时间: [日期选择器]        │
│ ├─ 🕐 结束时间: [时间选择器]        │
│ └─ ☑️ 全天事件                      │
├─────────────────────────────────────┤
│ 详细信息                            │
│ ├─ 📍 地点: [输入框]                │
│ ├─ 📄 描述: [文本域]                │
│ └─ 🏷️ 标签: [标签选择器]           │
├─────────────────────────────────────┤
│              [取消] [保存]          │
└─────────────────────────────────────┘
```

#### 11.2 表单验证

- **必填字段**: 标题、开始时间
- **实时验证**: 输入时验证
- **错误提示**: 字段下方显示红色错误信息

#### 11.3 动画效果

```css
/* 对话框打开动画 */
@keyframes dialogFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```


### 12. 导航系统

#### 12.1 极简侧边栏导航结构

**图标导航** (从上到下):
```
📅  ← Logo/Home
---
📅  ← 日历视图
📋  ← 列表视图
📊  ← 统计分析
---
🏷️  ← 标签管理
📤  ← 分享
📦  ← 导入/导出
---
(空白区域)
---
🎨  ← 主题设置
⚙️  ← 设置
```

**设计特性**:
- 纯图标导航，极简风格
- 悬停时显示文字提示（Tooltip）
- 当前选中项有背景色高亮（主色调）
- 分隔线区分不同功能组
- 平滑过渡动画

**移动端导航**:
- 侧边栏移到底部，变成底部导航栏
- 只显示核心功能：日历、列表、统计、设置
- 横向排列，图标 + 文字

#### 12.2 日历视图内的视图切换器

在日历视图内部，保留日/周/月/年的快速切换：

```
┌────────────────────────────────────┐
│ [📅 日] [📆 周] [🗓️ 月] [📊 年] │
└────────────────────────────────────┘
```

这个切换器位于日历视图的顶部，用于快速切换日历的显示粒度。

### 13. 标签和徽章

#### 13.1 标签设计

```css
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background-color: var(--tag-color);
  color: white;
}
```

#### 13.2 徽章设计

```css
.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-light);
}

.badge--today {
  background: var(--bg-hover);
  color: var(--primary-light);
}

.badge--upcoming {
  background: var(--bg-hover);
  color: var(--primary-dark);
}
```

## 数据模型

### 主题配置

```typescript
interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  customColors?: {
    [key: string]: string;
  };
}
```

### 视图状态

```typescript
interface ViewState {
  currentView: 'calendar' | 'list' | 'statistics';
  calendarView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'multiMonthYear';
  selectedDate: Date;
}
```


## 正确性属性

*属性是指在系统所有有效执行中都应该成立的特征或行为——本质上是关于系统应该做什么的正式陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。*

基于需求分析，大多数UI/UX需求是关于视觉设计和用户体验的，不适合自动化测试。但是，我们可以为一些功能性和可访问性需求定义正确性属性：

### 属性 1: 主题切换时CSS变量更新

*对于任何*主题模式（浅色或深色），当主题切换时，所有相关的CSS变量应该更新为对应主题的值

**验证需求: 2.6**

**测试策略**: 
- 切换到深色模式，验证 `--bg-color`、`--text-primary` 等变量是否更新
- 切换回浅色模式，验证变量是否恢复

### 属性 2: 输入验证反馈

*对于任何*用户输入，当输入内容发生变化时，系统应该提供相应的验证反馈（空输入警告、超长文本警告等）

**验证需求: 3.4**

**测试策略**:
- 输入空文本，验证是否显示警告
- 输入超过10000字符，验证是否显示警告
- 输入正常文本，验证是否无警告

### 属性 3: 事件卡片包含关键信息

*对于任何*事件，当事件卡片渲染时，应该包含时间、标题和地点（如果有）信息

**验证需求: 4.4**

**测试策略**:
- 生成随机事件，渲染卡片
- 验证卡片HTML包含标题文本
- 验证卡片HTML包含时间信息
- 如果事件有地点，验证卡片HTML包含地点信息

### 属性 4: 表单验证错误提示

*对于任何*无效的表单输入，当用户提交时，系统应该在对应字段下方显示错误提示

**验证需求: 7.4**

**测试策略**:
- 提交空标题，验证是否显示错误提示
- 提交无效日期，验证是否显示错误提示
- 提交有效数据，验证是否无错误提示

### 属性 5: 颜色对比度符合WCAG AA标准

*对于任何*文本和背景颜色组合，颜色对比度应该至少达到WCAG AA级别（正常文本4.5:1，大文本3:1）

**验证需求: 15.4, 15.5**

**测试策略**:
- 测试浅色模式下的文本颜色对比度
- 测试深色模式下的文本颜色对比度
- 测试主色调在不同背景下的对比度


## 错误处理

### 1. 主题加载失败

**场景**: localStorage 不可用或主题配置损坏

**处理策略**:
- 回退到默认浅色主题
- 在控制台记录警告
- 不影响应用正常使用

```typescript
try {
  const savedTheme = localStorage.getItem('theme-mode');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-mode');
  }
} catch (error) {
  console.warn('Failed to load theme preference:', error);
  // Use default light theme
}
```

### 2. 动画性能问题

**场景**: 用户设备性能较低或用户偏好减少动画

**处理策略**:
- 检测 `prefers-reduced-motion` 媒体查询
- 禁用或简化动画效果
- 保持功能完整性

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 3. 响应式布局断点

**场景**: 特殊屏幕尺寸或缩放级别

**处理策略**:
- 使用流式布局而非固定尺寸
- 提供多个断点覆盖常见设备
- 测试极端尺寸（320px 和 2560px）

### 4. 颜色对比度不足

**场景**: 用户自定义主题颜色导致对比度不足

**处理策略**:
- 在主题设置中提供对比度检查
- 警告用户对比度不足的颜色组合
- 提供推荐的颜色方案

## 测试策略

### 1. 视觉回归测试

**工具**: Percy, Chromatic, 或 BackstopJS

**测试内容**:
- 各个组件在不同状态下的视觉快照
- 浅色和深色主题的对比
- 不同屏幕尺寸的布局

**测试频率**: 每次UI相关的PR

### 2. 可访问性测试

**工具**: axe-core, Lighthouse, WAVE

**测试内容**:
- 颜色对比度
- 键盘导航
- 屏幕阅读器兼容性
- ARIA标签

**测试频率**: 每次发布前

### 3. 响应式测试

**工具**: BrowserStack, Chrome DevTools

**测试设备**:
- 桌面: 1920x1080, 1366x768
- 平板: iPad (768x1024), iPad Pro (1024x1366)
- 移动: iPhone SE (375x667), iPhone 12 (390x844), Android (360x640)

**测试频率**: 每次布局相关的PR


### 4. 性能测试

**工具**: Lighthouse, WebPageTest

**测试指标**:
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Time to Interactive (TTI) < 3.8s

**优化策略**:
- 使用 CSS `will-change` 优化动画性能
- 避免强制同步布局
- 使用 `transform` 和 `opacity` 进行动画
- 延迟加载非关键CSS

### 5. 单元测试

**框架**: Vitest + Vue Test Utils

**测试内容**:
- 主题切换逻辑
- 响应式状态管理
- 组件渲染逻辑
- 用户交互处理

**示例测试**:

```typescript
describe('Theme System', () => {
  it('should toggle between light and dark mode', () => {
    const { toggleTheme, currentTheme } = useTheme();
    
    expect(currentTheme.value).toBe('light');
    toggleTheme();
    expect(currentTheme.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
  });
  
  it('should persist theme preference', () => {
    const { setTheme } = useTheme();
    
    setTheme('dark');
    expect(localStorage.getItem('theme-mode')).toBe('dark');
  });
});
```

### 6. 属性基于测试

**框架**: fast-check (JavaScript property-based testing library)

**测试内容**:
- 颜色对比度计算
- 输入验证逻辑
- 主题变量更新

**示例测试**:

```typescript
import fc from 'fast-check';

describe('Color Contrast Property Tests', () => {
  it('should maintain WCAG AA contrast ratio for all text colors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (theme) => {
          const textColor = getTextColor(theme);
          const bgColor = getBackgroundColor(theme);
          const contrast = calculateContrast(textColor, bgColor);
          
          return contrast >= 4.5; // WCAG AA for normal text
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## 实现注意事项

### 1. CSS变量命名约定

- 使用语义化命名: `--text-primary` 而非 `--color-1`
- 使用一致的前缀: `--spacing-`, `--color-`, `--shadow-`
- 避免过度嵌套: 最多2层 (`--button-primary-hover`)

### 2. 动画性能优化

- 优先使用 `transform` 和 `opacity`
- 避免动画 `width`, `height`, `top`, `left`
- 使用 `will-change` 提示浏览器优化
- 动画时长保持在 200-400ms

```css
/* 好的做法 */
.card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
}

/* 避免的做法 */
.card {
  transition: height 0.3s ease; /* 触发重排 */
}
```

### 3. 响应式设计原则

- 移动优先: 从小屏幕开始设计
- 流式布局: 使用百分比和 `fr` 单位
- 弹性图片: `max-width: 100%`
- 触摸友好: 最小点击区域 44x44px

### 4. 可访问性最佳实践

- 使用语义化HTML标签
- 提供 ARIA 标签和角色
- 确保键盘可访问
- 提供焦点指示器
- 支持屏幕阅读器

```html
<!-- 好的做法 -->
<button 
  aria-label="删除事件"
  aria-describedby="delete-hint"
  @click="handleDelete">
  <span aria-hidden="true">🗑️</span>
</button>
<span id="delete-hint" class="sr-only">
  此操作不可撤销
</span>

<!-- 避免的做法 -->
<div @click="handleDelete">🗑️</div>
```

### 5. 主题切换实现

```typescript
// composables/useTheme.ts
export function useTheme() {
  const currentTheme = ref<'light' | 'dark'>('light');
  
  const setTheme = (theme: 'light' | 'dark') => {
    currentTheme.value = theme;
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    try {
      localStorage.setItem('theme-mode', theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };
  
  const toggleTheme = () => {
    setTheme(currentTheme.value === 'light' ? 'dark' : 'light');
  };
  
  // 初始化主题
  onMounted(() => {
    try {
      const saved = localStorage.getItem('theme-mode');
      if (saved === 'dark') {
        setTheme('dark');
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  });
  
  return {
    currentTheme: readonly(currentTheme),
    setTheme,
    toggleTheme,
  };
}
```

## 设计决策理由

### 1. 为什么选择极简侧边栏 + ChatGPT风格输入框？

**理由**:
- **极简侧边栏**: 参考ChatGPT、Claude、Gemini的设计，只显示图标，节省空间，减少视觉噪音
- **中心对齐内容**: 内容居中显示，最大宽度限制，提供最佳阅读体验，避免超宽屏幕上的内容拉伸
- **ChatGPT风格输入**: 用户熟悉的交互模式，输入框始终可见，降低操作门槛，自动扩展适应不同长度
- **现代化设计**: 符合当前主流AI应用的设计趋势，用户学习成本低
- **移动端友好**: 侧边栏变成底部导航，输入框保持在底部，符合移动端操作习惯
- **功能分离**: 导航、查看、输入三个功能区域清晰分离，但视觉上更加简洁统一

### 2. 为什么使用CSS Variables而非CSS-in-JS？

**理由**:
- 更好的性能，无需JavaScript运行时
- 原生支持主题切换
- 更容易调试和维护
- 与Vue的scoped CSS完美配合

### 3. 为什么选择8px间距系统？

**理由**:
- 8是2的幂，易于计算和缩放
- 与大多数设计系统（Material Design, Bootstrap）一致
- 提供足够的灵活性（4px, 8px, 16px, 24px, 32px）
- 在不同屏幕密度下表现良好

### 4. 为什么使用Element Plus而非自定义组件？

**理由**:
- 成熟的组件库，减少开发时间
- 内置可访问性支持
- 完善的文档和社区支持
- 可定制的主题系统
- 与Vue 3完美集成

### 5. 为什么优先考虑动画性能？

**理由**:
- 流畅的动画提升用户体验
- 避免卡顿影响应用感知性能
- 支持低端设备和移动设备
- 尊重用户的减少动画偏好

## 总结

本设计文档详细说明了CalenParse应用的UI/UX重新设计方案。设计遵循现代化、简洁、易用的原则，通过统一的设计系统、响应式布局和流畅的动画效果，提升用户体验。

**核心设计原则**:
1. 一致性 - 统一的颜色、间距、字体系统
2. 可访问性 - 符合WCAG标准，支持键盘和屏幕阅读器
3. 响应式 - 适配各种设备和屏幕尺寸
4. 性能 - 优化动画和渲染性能
5. 可维护性 - 清晰的代码结构和文档

**实现优先级**:
1. 高优先级: 颜色系统、间距系统、按钮样式、响应式布局
2. 中优先级: 动画效果、卡片设计、表单样式
3. 低优先级: 高级动画、微交互、视觉装饰

通过这个设计方案，CalenParse将成为一个现代化、专业化、易用的日历解析应用。
