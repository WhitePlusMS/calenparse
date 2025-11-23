# CalenParse - 智能日历解析器

智能日历解析器是一个纯前端应用，能够接收官方通告文本，通过 LLM 自动解析其中的日程信息，并在日历中自动创建相应的日程事件。

## 技术栈

- **前端框架**: Vue 3 + TypeScript + Vite
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **数据库**: Supabase (PostgreSQL)
- **日期处理**: Day.js
- **日历组件**: FullCalendar

## 环境配置

### 1. Supabase 数据库设置

在开始之前，你需要设置 Supabase 数据库。详细步骤请参考 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)。

快速步骤：
1. 在 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL Editor 中运行 `supabase-schema.sql` 文件中的 SQL
3. 获取项目的 URL 和 anon key

### 2. 环境变量配置

1. 复制 `.env.example` 文件为 `.env`
2. 填写必要的环境变量：
   - `VITE_SUPABASE_URL`: Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase 匿名密钥
   - `VITE_LLM_API_KEY`: LLM API 密钥
   - `VITE_LLM_API_ENDPOINT`: LLM API 端点

## 安装依赖

```bash
npm install
```

## 开发

```bash
npm run dev
```

启动后，应用会自动测试 Supabase 连接。如果连接失败，请检查：
- `.env` 文件是否存在且配置正确
- Supabase 项目是否已创建
- `events` 表是否已创建

## 构建

```bash
npm run build
```

## 预览

```bash
npm run preview
```

## 项目结构

```
src/
├── components/       # Vue 组件
├── composables/      # 组合式函数
├── stores/          # Pinia 状态管理
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
├── App.vue          # 根组件
└── main.ts          # 入口文件
```

## 核心功能

- 输入通告文本并通过 LLM 自动解析
- 预览和编辑解析结果
- 在日历中显示日程事件
- 管理日程（查看、编辑、删除）
- 数据持久化到 Supabase
