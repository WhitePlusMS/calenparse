# 实现计划 - 访问控制（演示站点）

## 任务概述

本实现计划将双层权限架构（管理员 + 访客）分解为可执行的开发任务。每个任务都引用了对应的需求，并按照依赖关系组织。

**当前代码库状态**：
- ✅ 已有完整的事件管理系统（useEvents, useSupabase）
- ✅ 已有 UI 组件基础设施（Element Plus, Vue 3）
- ❌ 无访问控制相关实现（需从零开始）

---

## Phase 1: 数据库基础设施

- [x] 1. 数据库迁移和 RLS 策略配置





  - 在 Supabase Dashboard 执行完整的迁移脚本
  - 创建 `visitor_sessions` 表（指纹、LLM 配额、Token 追踪）
  - 创建 `visitor_events` 表（访客事件，简化字段）
  - 配置 RLS 策略（包含数据库层面配额检查）
  - 修复 `events` 表的 RLS 策略（仅 authenticated 用户）
  - 创建 `cleanup_visitor_data()` 清理函数
  - _需求: 1.3, 3.1, 3.6, 8.1, 8.2_

---

## Phase 2: 核心身份管理 (useAuth)





- [ ] 2. 实现 useAuth composable 基础结构

  - 创建 `src/composables/useAuth.ts`
  - 定义 `UseAuthReturn` 接口和 `VisitorQuota` 类型
  - 实现状态管理（mode, fingerprint, adminSession, isAuthChecking）


  - 添加类型定义到 `src/types/index.ts`
  - _需求: 1.1, 6.1_

- [ ] 2.1 实现浏览器指纹生成
  - 安装 `@fingerprintjs/fingerprintjs` 依赖
  - 实现 `initVisitorMode()` 方法

  - 使用 FingerprintJS 生成稳定指纹
  - 在 `visitor_sessions` 表查询或创建记录
  - 缓存指纹结果避免重复生成
  - _需求: 1.2, 1.3_

- [x] 2.2 实现管理员登录/登出

  - 实现 `login(email, password)` 方法
  - 调用 Supabase Auth 验证凭证
  - 处理登录错误（无效凭证、网络错误）
  - 实现 `logout()` 方法清除会话
  - _需求: 2.2, 2.3, 2.4, 2.7_

- [x] 2.3 实现应用启动时的身份检查

  - 实现 `isAuthChecking` 状态管理（初始为 true）
  - 在 composable 初始化时检查 Supabase Auth 会话
  - 有效会话 → 设置管理员模式
  - 无会话 → 初始化访客模式（生成指纹）
  - 身份确定后设置 `isAuthChecking = false`

  - _需求: 6.1, 6.2, 6.3_

- [ ] 2.4 实现权限切换逻辑
  - 实现 `switchMode(newMode)` 方法
  - 访客 → 管理员：清空访客数据，加载管理员数据
  - 管理员 → 访客：清空管理员数据，生成新指纹
  - _需求: 6.4, 6.5_

- [x] 2.5 实现访客配额查询



  - 实现 `getVisitorQuota()` 方法
  - 查询 `visitor_sessions` 表获取 LLM 配额
  - 通过 COUNT 查询 `visitor_events` 表计算事件配额
  - 返回 `VisitorQuota` 对象（llmRemaining, eventsUsed, eventsRemaining）
  - _需求: 1.5, 4.10_



---

## Phase 3: 访客事件管理 (useVisitorEvents)



- [ ] 3. 实现 useVisitorEvents composable 基础结构
  - 创建 `src/composables/useVisitorEvents.ts`
  - 定义 `UseVisitorEventsReturn` 接口和 `VisitorEvent` 类型
  - 实现状态管理（events, loading）
  - 添加类型定义到 `src/types/index.ts`
  - _需求: 3.1, 3.2, 3.4_

- [x] 3.1 实现访客事件加载


  - 实现 `loadEvents(fingerprint)` 方法
  - 从 `visitor_events` 表查询该指纹的事件
  - 前端通过 fingerprint 过滤
  - 处理加载错误
  - _需求: 1.4, 3.4_

- [ ] 3.2 实现访客事件创建（含配额检查）
  - 实现 `checkEventQuota(fingerprint)` 方法
  - 通过 COUNT 查询检查事件数量 < 3


  - 实现 `createEvent(event)` 方法
  - 配额内：保存到 `visitor_events` 表
  - 配额满：显示提示"已达到试用上限（3 条），请登录获取无限存储"
  - 确保 start_time 和 end_time 使用 ISO-8601 UTC 格式
  - _需求: 3.1, 3.2, 3.3_

- [x] 3.3 实现访客 LLM 调用（含配额检查）



  - 实现 `checkLLMQuota(fingerprint)` 方法
  - 检查 `visitor_sessions.llm_used_count` 是否为 0
  - 实现 `callLLM(input, fingerprint)` 方法
  - 配额内：调用真实 LLM API
  - 配额满：显示提示"试用次数已用完（1/1），请登录获取无限调用"
  - 实现 `recordLLMUsage(fingerprint, tokenUsed)` 方法
  - 成功后设置 `llm_used_count = 1`，记录 Token 消耗
  - 失败时不消耗配额
  - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_



- [ ] 3.4 实现批量事件创建（LLM 解析多个事件）
  - 在 `callLLM` 方法中处理多事件解析
  - 计算剩余配额：`remaining = 3 - eventsUsed`
  - 创建前 N 个事件：`N = min(解析数量, remaining)`
  - 超配额时显示提示："已创建 X/Y 个事件，剩余配额不足，请登录获取无限存储"
  - _需求: 4.8, 4.9_



---

## Phase 4: UI 组件 - 访客模式

- [x] 4. 实现 VisitorBanner 组件


  - 创建 `src/components/VisitorBanner.vue`
  - 接收 `quota: VisitorQuota` prop
  - 显示剩余 LLM 次数和事件配额
  - 提供管理员登录链接
  - 使用 Element Plus 的 Alert 组件
  - _需求: 1.5, 1.6, 4.10_




- [ ] 4.1 实现 AdminLoginDialog 组件
  - 创建 `src/components/AdminLoginDialog.vue`
  - 接收 `visible: boolean` prop
  - 实现邮箱密码输入表单（Element Plus Form）
  - 表单验证（邮箱格式、密码非空）
  - 调用 `useAuth().login()` 方法
  - 显示登录错误提示
  - 成功后触发 `success` 事件
  - _需求: 2.1, 2.2, 2.3_



- [ ] 4.2 在 App.vue 中集成身份检查和 Loading 状态
  - 导入 `useAuth` composable
  - 使用 `isAuthChecking` 状态
  - `isAuthChecking = true` 时显示全屏 Loading（Element Plus Loading）


  - 不渲染任何业务组件，避免闪烁
  - `isAuthChecking = false` 后根据 mode 渲染对应 UI
  - _需求: 6.1_

- [ ] 4.3 在 App.vue 中集成 VisitorBanner
  - 在 `mode === 'visitor'` 时显示 VisitorBanner
  - 在 `mode === 'admin'` 时隐藏 VisitorBanner
  - 传递 `quota` 数据（从 `useAuth().getVisitorQuota()` 获取）

  - 监听登录事件，显示 AdminLoginDialog
  - _需求: 1.5, 5.7_

---

## Phase 5: 修改现有组件 - 权限控制

- [ ] 5. 修改 useEvents composable 添加身份检查

  - 打开 `src/composables/useEvents.ts`
  - 导入 `useAuth` 和 `useVisitorEvents`
  - 在 `loadEvents` 方法中添加 mode 判断
  - `mode === 'admin'` → 从 `events` 表加载（现有逻辑）
  - `mode === 'visitor'` → 调用 `useVisitorEvents().loadEvents()`
  - 在 `createEvent` 方法中添加类似判断
  - _需求: 5.1, 5.2_

- [ ] 5.1 修改 UI 组件添加访客权限限制
  - 在 EventDialog 中隐藏编辑/删除按钮（`v-if="isAdmin"`）
  - 在 BatchOperationBar 中禁用访客模式
  - 在 ImportExport 中禁用访客模式
  - 在 TagManager 中禁用访客模式
  - _需求: 1.9, 3.5_

- [ ] 5.2 修改 useLLM composable 添加访客配额检查
  - 打开 `src/composables/useLLM.ts`
  - 导入 `useAuth` 和 `useVisitorEvents`
  - 在 LLM 调用前检查 mode
  - `mode === 'visitor'` → 调用 `useVisitorEvents().checkLLMQuota()`
  - 配额用尽时显示提示，阻止调用
  - _需求: 4.1, 4.2, 4.3_

---

## Phase 6: 管理员监控功能

- [x] 6. 实现 useMonitoring composable



  - 创建 `src/composables/useMonitoring.ts`
  - 定义 `UseMonitoringReturn` 接口
  - 定义 `VisitorSession` 和 `VisitorStatistics` 类型
  - 实现状态管理（sessions, statistics, selectedSession, sessionEvents, loading）
  - 添加类型定义到 `src/types/index.ts`
  - _需求: 7.3, 7.7_

- [x] 6.1 实现访客会话查询

  - 实现 `loadSessions()` 方法
  - 从 `visitor_sessions` 表查询所有会话
  - 通过 JOIN 计算每个会话的事件数量
  - 按创建时间倒序排列
  - _需求: 7.3, 7.4_

- [x] 6.2 实现访客事件详情查询

  - 实现 `loadSessionEvents(fingerprint)` 方法
  - 从 `visitor_events` 表查询该指纹的所有事件
  - 按创建时间倒序排列
  - _需求: 7.5, 7.6_

- [x] 6.3 实现统计数据计算

  - 实现 `refreshData()` 方法
  - 计算总访客数（COUNT visitor_sessions）
  - 计算总 LLM 调用次数（SUM llm_used_count）
  - 计算总 Token 消耗（SUM llm_token_used）
  - 计算总事件数（COUNT visitor_events）
  - _需求: 7.7, 8.5_

- [x] 6.4 实现 MonitoringPage 组件


  - 创建 `src/components/MonitoringPage.vue`
  - 使用 `useAuth` 检查管理员权限
  - 非管理员显示提示"此页面仅限管理员访问"
  - 使用 `useMonitoring` 加载数据
  - 显示统计数据卡片（Element Plus Card）
  - 显示访客会话列表（Element Plus Table）
  - 表格列：指纹（部分显示）、LLM 调用、Token 消耗、事件数、创建时间、最后活跃
  - 点击行展开显示该访客的事件详情
  - 提供刷新按钮
  - _需求: 7.1, 7.2, 7.3, 7.8_

- [x] 6.5 在 App.vue 中添加监控页面入口


  - 在侧边栏添加"监控"导航项（仅管理员可见）
  - 添加 `currentViewMode` 的 'monitoring' 选项
  - 在主内容区域渲染 MonitoringPage 组件
  - _需求: 7.1_

---

## Phase 7: 会话持久性和错误处理

- [x] 7. 实现会话持久性





  - 在 `useAuth` 中监听 Supabase Auth 状态变化
  - 使用 `supabase.auth.onAuthStateChange()` 监听会话变化
  - 会话过期时自动切换到访客模式
  - 显示提示"会话已过期，请重新登录"
  - _需求: 5.6, 6.6_

- [x] 7.1 实现统一错误处理

  - 在 `src/utils/errorHandler.ts` 中添加访问控制相关错误处理
  - 认证错误：显示友好提示
  - 配额错误：显示配额用尽提示
  - 数据库错误：显示连接失败提示
  - RLS 权限错误：显示权限不足提示
  - 使用 Element Plus Message 和 Notification 组件
  - _需求: 2.3, 3.3, 4.3, 4.5_

- [x] 7.2 Checkpoint - 确保所有功能正常工作

  - 测试访客模式：指纹生成、配额限制、数据隔离
  - 测试管理员模式：登录/登出、无限制使用、监控页面
  - 测试权限切换：数据清空和加载
  - 测试错误处理：所有错误场景显示友好提示
  - 确保所有功能正常，询问用户是否有问题

---

## 实现注意事项

### 时区处理规范
- **前端发送**：所有时间字段使用 `dayjs(date).utc().toISOString()`
- **数据库存储**：TIMESTAMPTZ 自动处理
- **前端显示**：使用 `dayjs(utcString).local().format()`

### 竞态条件处理
- `useAuth` 初始化时设置 `isAuthChecking = true`
- App.vue 检测到 `isAuthChecking = true` 时显示全屏 Loading
- 身份确定后设置 `isAuthChecking = false`

### RLS 安全策略
- `visitor_events` 插入策略包含数据库层面配额检查
- 前端仍需配额检查，提供更好的用户体验
- `events` 表仅允许 authenticated 用户访问

### 错误处理
- 使用 Element Plus Message 和 Notification 组件
- 开发环境显示详细错误，生产环境显示友好提示
- LLM 调用失败不消耗配额

### 性能考虑
- FingerprintJS 异步加载
- 指纹结果缓存
- 监控页面考虑分页（如果访客数量 > 100）
- COUNT 查询性能开销可忽略（每个访客最多 3 条事件）
