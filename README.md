# CalenParse - 智能日历解析器

[English](./README_EN.md) | 中文

---

## 📅 项目简介

CalenParse（智能日历解析器）是一个现代化的纯前端日历管理应用，通过 AI 大语言模型（LLM）自动解析文本中的日程信息，快速创建日历事件。告别手动输入，让 AI 帮你管理日程！

## 📸 应用截图

<div align="center">
  <img src="./assets/主界面.png" alt="主界面" width="800"/>
  <p><em>主界面 - 日历视图</em></p>
</div>

<div align="center">
  <img src="./assets/列表界面.png" alt="列表界面" width="800"/>
  <p><em>列表视图 - 批量管理事件</em></p>
</div>

<div align="center">
  <img src="./assets/事件详情.png" alt="事件详情" width="800"/>
  <p><em>事件详情 - 编辑和管理</em></p>
</div>

<div align="center">
  <img src="./assets/标签管理.png" alt="标签管理" width="800"/>
  <p><em>标签管理 - 分类组织</em></p>
</div>

<div align="center">
  <img src="./assets/主题设置.png" alt="主题设置" width="800"/>
  <p><em>主题设置 - 个性化定制</em></p>
</div>

<div align="center">
  <img src="./assets/分享为图片.png" alt="分享为图片" width="800"/>
  <p><em>分享功能 - 导出和分享</em></p>
</div>

### ✨ 核心特性

- 🤖 **AI 智能解析** - 输入任意文本，自动提取日程信息
- 📋 **多视图展示** - 日历视图、列表视图、统计分析三种模式
- 🏷️ **标签管理** - 为事件添加彩色标签，分类管理
- 📝 **模板功能** - 保存常用事件为模板，快速创建
- 🔍 **智能搜索** - 支持关键词、日期范围、地点、标签多维度筛选
- 📤 **导入导出** - 支持 JSON、iCal 格式的数据导入导出
- 🎨 **主题切换** - 浅色/深色模式，自定义主题颜色
- 📱 **响应式设计** - 完美适配桌面端、平板和移动设备
- ⏱️ **倒计时提醒** - 实时显示事件开始/结束倒计时
- 📊 **数据统计** - 可视化展示事件分布和趋势

## 🛠️ 技术栈

### 核心框架
- **Vue 3** - 渐进式 JavaScript 框架（Composition API）
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 下一代前端构建工具

### UI 与样式
- **Element Plus** - 企业级 Vue 3 组件库
- **FullCalendar** - 功能强大的日历组件
- **Chart.js** - 灵活的图表库

### 状态与数据
- **Pinia** - Vue 3 官方状态管理库
- **Supabase** - 开源 Firebase 替代方案（PostgreSQL）
- **Day.js** - 轻量级日期处理库

### 测试
- **Vitest** - 基于 Vite 的单元测试框架
- **fast-check** - 属性测试库

## 🚀 快速开始

### 前置要求

- Node.js >= 16.x
- npm >= 8.x
- Supabase 账号（免费）

### 1. 克隆项目

```bash
git clone <repository-url>
cd calenparse
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Supabase 数据库

#### 3.1 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并创建新项目
2. 在项目的 SQL Editor 中运行 `supabase-schema.sql` 文件中的 SQL 语句
3. 获取项目的 URL 和 anon key（在 Settings > API 中）

#### 3.2 配置环境变量

1. 复制环境变量模板：
```bash
copy .env.example .env
```

2. 编辑 `.env` 文件，填写以下配置：

```env
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# LLM API 配置（用于智能解析）
VITE_LLM_API_KEY=your_llm_api_key
VITE_LLM_API_ENDPOINT=your_llm_api_endpoint
```

### 4. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。启动后会自动测试 Supabase 连接。

### 5. 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 6. 预览生产构建

```bash
npm run preview
```

## 📁 项目结构

```
calenparse/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── CalendarView.vue      # 日历视图
│   │   ├── ListView.vue          # 列表视图
│   │   ├── StatisticsView.vue    # 统计视图
│   │   ├── EventDialog.vue       # 事件编辑对话框
│   │   ├── FloatingInput.vue     # 浮动输入框
│   │   ├── PreviewDialog.vue     # 预览对话框
│   │   ├── TagManager.vue        # 标签管理
│   │   ├── TemplateManager.vue   # 模板管理
│   │   └── ...                   # 其他组件
│   ├── composables/         # 组合式函数（业务逻辑）
│   │   ├── useEvents.ts          # 事件管理
│   │   ├── useSupabase.ts        # Supabase 集成
│   │   ├── useLLM.ts             # LLM API 集成
│   │   ├── useSearch.ts          # 搜索功能
│   │   ├── useTheme.ts           # 主题管理
│   │   └── ...                   # 其他逻辑
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts              # 核心类型
│   ├── utils/               # 工具函数
│   │   ├── date.ts               # 日期处理
│   │   ├── errorHandler.ts       # 错误处理
│   │   ├── import-export.ts      # 导入导出
│   │   └── ...                   # 其他工具
│   ├── test/                # 测试文件
│   ├── App.vue              # 根组件
│   ├── main.ts              # 应用入口
│   └── style.css            # 全局样式
├── .kiro/                   # Kiro AI 配置
│   ├── specs/                    # 功能规格文档
│   └── steering/                 # AI 指导规则
├── public/                  # 静态资源
├── dist/                    # 构建输出（自动生成）
├── supabase-schema.sql      # 数据库架构
├── package.json             # 项目配置
├── vite.config.ts           # Vite 配置
├── vitest.config.ts         # Vitest 配置
└── tsconfig.json            # TypeScript 配置
```

## 🎯 核心功能详解

### 1. AI 智能解析

在浮动输入框中输入任意包含日程信息的文本，例如：

```
明天下午3点到5点在会议室A开项目评审会
下周一全天团建活动
```

AI 会自动提取：
- 事件标题
- 开始/结束时间
- 地点
- 描述信息
- 相关标签

### 2. 多视图管理

- **日历视图** - 月视图、周视图、日视图，直观展示日程
- **列表视图** - 按时间顺序列出所有事件，支持批量操作
- **统计视图** - 图表展示事件分布、标签使用情况等

### 3. 标签系统

- 创建自定义标签，支持颜色选择
- 为事件添加多个标签
- 按标签筛选和统计事件

### 4. 模板功能

- 将常用事件保存为模板
- 快速从模板创建新事件
- 管理和编辑模板库

### 5. 搜索与筛选

- 关键词搜索（标题、描述、地点）
- 日期范围筛选
- 地点筛选
- 标签筛选
- 多条件组合筛选

### 6. 导入导出

- **导出格式**：JSON、iCal (.ics)
- **导入格式**：JSON、iCal (.ics)
- 支持批量导入导出

### 7. 分享功能

- 生成事件分享链接
- 导出为 iCal 文件分享
- 支持选择性分享多个事件

## 🧪 测试

### 运行测试

```bash
# 单次运行所有测试
npm run test

# 监听模式（开发时使用）
npm run test:watch

# 使用 UI 界面运行测试
npm run test:ui
```

### 测试覆盖

项目包含：
- 单元测试 - 测试独立函数和组件
- 属性测试 - 使用 fast-check 进行基于属性的测试
- 集成测试 - 测试组件间交互

## 🎨 主题定制

应用支持浅色/深色模式切换，并提供主题定制功能：

1. 点击侧边栏底部的主题切换按钮
2. 在设置中自定义主题颜色
3. 主题配置会自动保存到本地

## 📱 响应式设计

- **桌面端** (>768px) - 侧边栏导航，宽敞布局
- **平板** (768px-480px) - 底部导航栏，优化触控
- **移动端** (<480px) - 紧凑布局，手势友好

## 🔧 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 Vue 3 Composition API 最佳实践
- 组件使用 `<script setup>` 语法
- 使用 `@/` 路径别名导入模块

### 添加新功能

1. 在 `.kiro/specs/` 下创建功能规格文档
2. 在 `src/components/` 添加 Vue 组件
3. 在 `src/composables/` 添加业务逻辑
4. 在 `src/types/` 定义 TypeScript 类型
5. 编写单元测试和属性测试

### 常见问题

**Q: Supabase 连接失败？**
- 检查 `.env` 文件配置是否正确
- 确认 Supabase 项目已创建且数据库表已初始化
- 查看浏览器控制台的详细错误信息

**Q: LLM 解析不工作？**
- 确认 `VITE_LLM_API_KEY` 和 `VITE_LLM_API_ENDPOINT` 已配置
- 检查 API 密钥是否有效
- 查看网络请求是否成功

**Q: 如何自定义 LLM 提示词？**
- 编辑 `src/composables/useLLM.ts` 中的提示词模板

## 📄 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
