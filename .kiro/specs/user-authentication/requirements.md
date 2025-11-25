# 需求文档 - 访问控制（演示站点）

## 简介

CalenParse 是部署在 Vercel 的日历管理应用，同时作为管理员的生产环境和开源项目的演示站点。

**主要目的**：管理员（你自己）能够正常使用完整功能，数据保存到云端  
**次要目的**：访客（GitHub 来的用户）能够快速试用 LLM 创建日程功能

本需求采用**双层权限架构**：管理员（无限权限）+ 访客（极简试用），两者数据完全隔离。

## 访问控制架构

系统采用两层权限：

**访客层（默认）**
- 访客打开应用，自动生成浏览器指纹
- 数据保存到独立的访客表（与管理员完全隔离）
- 极简配额限制：
  * LLM 调用：每指纹 1 次
  * 事件创建：每指纹最多 3 条
- 只能创建事件，不能编辑或删除
- 数据 1 天后自动清除（定时任务）

**管理员层**
- 邮箱密码登录（Supabase Auth）
- 数据保存到现有 events 表
- 无限制使用所有功能
- 无限 LLM 调用 + 无限事件存储
- 这是你的生产环境

## 设计原则

- **管理员优先**：确保管理员体验不受影响
- **极简试用**：访客只能体验 LLM 创建日程的核心功能
- **成本可控**：1 次 LLM + 3 条事件 + 1 天清除
- **实现简单**：前端配额检查 + 后端定时清理
- **快速上线**：3 天内完成开发和部署

## 术语表

- **CalenParse**: 日历管理应用程序，本需求文档中的系统名称
- **管理员 (Admin)**: 通过 Supabase Auth 邮箱密码登录的单一用户（项目所有者），拥有完全访问权限
- **管理员账户 (Admin Account)**: 在 Supabase Auth 中预先创建的单个管理员账户，邮箱和密码在部署时配置
- **访客 (Visitor)**: 未登录的用户，使用试用模式体验 LLM 创建日程功能
- **访客模式 (Visitor Mode)**: 访客的默认模式，基于浏览器指纹识别，数据保存到独立的访客表
- **浏览器指纹 (Browser Fingerprint)**: 基于浏览器特征生成的唯一标识符，用于识别访客并追踪配额
- **FingerprintJS**: 用于生成浏览器指纹的第三方 JavaScript 库
- **LLM 试用配额 (LLM Trial Quota)**: 每个浏览器指纹可以免费调用 LLM 的次数，固定为 1 次
- **事件存储配额 (Event Storage Quota)**: 每个浏览器指纹可以创建的最大事件数量，固定为 3 条
- **管理员模式 (Admin Mode)**: 管理员登录后的模式，数据保存到现有 events 表
- **访客会话表 (visitor_sessions)**: 存储访客指纹和配额信息的数据库表
- **访客事件表 (visitor_events)**: 存储访客创建的事件的数据库表，与管理员 events 表完全隔离
- **Supabase Auth**: Supabase 提供的身份验证服务，用于管理员登录
- **LLM API**: 大语言模型 API 调用接口
- **会话 (Session)**: 管理员登录后 Supabase Auth 维护的认证状态
- **定时清理 (Scheduled Cleanup)**: 数据库定时任务（pg_cron），每天自动删除超过 1 天的访客数据
- **访客监控页面 (Visitor Monitoring Page)**: 管理员专用页面，用于查看访客使用情况和统计数据
- **Token 消耗 (Token Usage)**: LLM API 调用消耗的 Token 数量，用于成本监控（如果 API 不返回则记录为 0）
- **RLS 策略 (Row Level Security Policy)**: Supabase 数据库行级安全策略，用于数据访问控制

## 需求

### 需求 1：访客模式和指纹识别

**用户故事**：作为访客，我希望能够立即体验 LLM 创建日程功能，无需注册或登录。

#### 验收标准

1. WHEN 访客打开应用且未登录 THEN THE CalenParse SHALL 自动进入访客模式
2. WHEN THE CalenParse 进入访客模式 THEN THE CalenParse SHALL 使用 FingerprintJS 生成稳定的浏览器指纹
3. WHEN THE CalenParse 生成浏览器指纹 THEN THE CalenParse SHALL 在 visitor_sessions 表查询或创建该指纹的记录
4. WHEN 访客模式初始化完成 THEN THE CalenParse SHALL 从 visitor_events 表加载该指纹关联的事件数据
5. WHEN 访客查看界面 THEN THE CalenParse SHALL 在页面顶部显示横幅提示"试用模式 - 剩余 X 次 LLM，Y/3 条事件"
6. WHEN 访客点击横幅中的管理员登录链接 THEN THE CalenParse SHALL 显示登录对话框
7. WHEN 访客刷新页面 THEN THE CalenParse SHALL 使用相同的浏览器指纹加载该指纹的事件数据和配额信息
8. WHEN 访客清除浏览器数据或使用隐私模式 THEN THE CalenParse SHALL 生成新指纹并重置配额
9. WHILE 访客处于访客模式 THEN THE CalenParse SHALL 隐藏或禁用编辑、删除、批量操作、导入导出、标签管理功能

### 需求 2：管理员登录

**用户故事**：作为管理员，我希望能够使用邮箱密码登录系统，以便使用完整功能并将数据保存到云端。

#### 验收标准

1. WHEN 访客点击试用横幅中的管理员登录链接 THEN THE CalenParse SHALL 显示登录对话框
2. WHEN 管理员在登录对话框输入邮箱和密码 THEN THE CalenParse SHALL 通过 Supabase Auth 验证凭证
3. IF 管理员输入错误的凭证 THEN THE CalenParse SHALL 显示错误提示信息
4. WHEN 管理员成功登录 THEN THE CalenParse SHALL 通过 Supabase Auth 创建会话
5. WHEN 管理员成功登录 THEN THE CalenParse SHALL 切换到管理员模式
6. WHILE 管理员已登录 THEN THE CalenParse SHALL 在界面显示登出按钮
7. WHEN 管理员点击登出按钮 THEN THE CalenParse SHALL 通过 Supabase Auth 清除会话并返回访客模式

### 需求 3：访客事件创建（仅创建）

**用户故事**：作为访客，我希望能够通过 LLM 创建事件，在配额范围内体验核心功能。

#### 验收标准

1. WHEN 访客创建事件 THEN THE CalenParse SHALL 通过查询 visitor_events 表计算该指纹的事件数量
2. IF 访客的事件数量小于 3 条 THEN THE CalenParse SHALL 保存事件到 visitor_events 表
3. IF 访客的事件数量达到 3 条 THEN THE CalenParse SHALL 阻止创建并显示提示"已达到试用上限（3 条），请登录获取无限存储"
4. WHEN 访客查询事件 THEN THE CalenParse SHALL 在前端通过 fingerprint 过滤只返回该指纹关联的 visitor_events
5. WHEN 访客尝试编辑或删除事件 THEN THE CalenParse SHALL 在前端隐藏编辑和删除按钮
6. WHEN 访客尝试通过 API 直接编辑或删除事件 THEN THE CalenParse SHALL 通过 RLS 策略阻止操作并返回权限错误

### 需求 4：访客 LLM 试用

**用户故事**：作为访客，我希望能够试用 LLM 功能，以便体验应用的核心亮点。

#### 验收标准

1. WHEN 访客调用 LLM THEN THE CalenParse SHALL 检查该指纹在 visitor_sessions 表的 llm_used_count
2. IF 访客的 llm_used_count 等于 0 THEN THE CalenParse SHALL 调用真实的 LLM API
3. IF 访客的 llm_used_count 等于 1 THEN THE CalenParse SHALL 阻止调用并显示提示"试用次数已用完（1/1），请登录获取无限调用"
4. WHEN LLM API 成功返回结果 THEN THE CalenParse SHALL 将 llm_used_count 设置为 1
5. IF LLM API 调用失败 THEN THE CalenParse SHALL 保持 llm_used_count 不变并显示错误提示
6. WHEN LLM API 返回 Token 消耗数据 THEN THE CalenParse SHALL 将其记录到 llm_token_used 字段
7. IF LLM API 不返回 Token 消耗数据 THEN THE CalenParse SHALL 使用估算值记录到 llm_token_used 字段
8. WHEN 访客成功调用 LLM 并解析出多个事件 THEN THE CalenParse SHALL 创建前 N 个事件（N 为解析数量和剩余配额的最小值）
9. IF 解析的事件数量超过剩余配额 THEN THE CalenParse SHALL 显示提示"已创建 X/Y 个事件，剩余配额不足，请登录获取无限存储"
10. WHEN 访客查看界面 THEN THE CalenParse SHALL 显示剩余的 LLM 试用次数和事件存储配额

### 需求 5：管理员模式

**用户故事**：作为管理员，我希望登录后能够正常使用所有功能，数据保存到云端。

#### 验收标准

1. WHEN 管理员成功登录 THEN THE CalenParse SHALL 从现有 events 表加载所有事件数据
2. WHEN 管理员在管理员模式创建事件 THEN THE CalenParse SHALL 保存事件到 events 表
3. WHEN 管理员在管理员模式编辑事件 THEN THE CalenParse SHALL 更新 events 表中的事件
4. WHEN 管理员在管理员模式删除事件 THEN THE CalenParse SHALL 从 events 表删除事件
5. WHEN 管理员在管理员模式调用 LLM THEN THE CalenParse SHALL 使用真实的 LLM API 进行解析且无次数限制
6. WHEN 管理员刷新页面 THEN THE CalenParse SHALL 通过 Supabase Auth 恢复会话并保持管理员模式
7. WHILE THE CalenParse 处于管理员模式 THEN THE CalenParse SHALL 隐藏试用模式横幅
8. WHILE 管理员在管理员模式 THEN THE CalenParse SHALL 显示所有功能（编辑、删除、批量操作、导入导出、监控页面）

### 需求 6：权限切换和会话管理

**用户故事**：作为系统，我需要根据登录状态自动切换权限层级，确保数据正确隔离。

#### 验收标准

1. WHEN 应用启动 THEN THE CalenParse SHALL 检查 Supabase Auth 会话状态
2. IF 存在有效的管理员会话 THEN THE CalenParse SHALL 进入管理员模式并从 events 表加载数据
3. IF 不存在有效会话 THEN THE CalenParse SHALL 进入访客模式并生成稳定的浏览器指纹
4. WHEN THE CalenParse 从访客模式切换到管理员模式 THEN THE CalenParse SHALL 清空访客数据并从 events 表加载管理员数据
5. WHEN THE CalenParse 从管理员模式切换到访客模式 THEN THE CalenParse SHALL 清空管理员数据并从 visitor_events 表加载访客数据
6. WHEN 管理员刷新页面 THEN THE CalenParse SHALL 通过 Supabase Auth 恢复会话并保持管理员模式
7. WHEN 访客刷新页面 THEN THE CalenParse SHALL 使用相同的浏览器指纹从 visitor_events 表加载该指纹的数据

### 需求 7：管理员监控访客使用情况

**用户故事**：作为管理员，我需要查看访客的 LLM 使用情况和创建的内容，以便监控成本和使用模式。

#### 验收标准

1. WHEN 用户访问监控页面 THEN THE CalenParse SHALL 检查 Supabase Auth 会话状态
2. IF 用户未登录或非管理员 THEN THE CalenParse SHALL 阻止访问并显示提示"此页面仅限管理员访问"
3. WHEN 管理员登录后访问监控页面 THEN THE CalenParse SHALL 显示所有访客会话列表
4. WHEN THE CalenParse 显示访客会话列表 THEN THE CalenParse SHALL 包含指纹（部分显示）、LLM 调用次数、Token 消耗、事件数量、创建时间、最后活跃时间
5. WHEN 管理员点击某个访客会话 THEN THE CalenParse SHALL 显示该访客创建的所有事件详情
6. WHEN 管理员查看访客事件详情 THEN THE CalenParse SHALL 显示事件标题、开始时间、结束时间、创建时间
7. WHEN 管理员查看监控页面 THEN THE CalenParse SHALL 显示统计数据（总访客数、总 LLM 调用次数、总 Token 消耗、总事件数）
8. WHILE 管理员在监控页面 THEN THE CalenParse SHALL 提供刷新按钮以实时更新数据

### 需求 8：访客数据自动清理

**用户故事**：作为系统管理员，我需要自动清理过期的访客数据，以控制数据库存储成本。

#### 验收标准

1. WHEN 数据库定时任务每天执行 THEN THE CalenParse SHALL 删除 visitor_sessions 表中 created_at 超过 1 天的记录
2. WHEN THE CalenParse 删除 visitor_sessions 记录 THEN THE CalenParse SHALL 通过外键级联删除关联的 visitor_events 记录
3. WHEN 定时清理完成 THEN THE CalenParse SHALL 在数据库日志中记录清理信息
4. IF 定时清理失败 THEN THE CalenParse SHALL 在数据库日志中记录错误但继续应用运行
5. WHEN 管理员查看监控页面 THEN THE CalenParse SHALL 显示最后清理时间

## 技术依赖

### 新增依赖

- **@fingerprintjs/fingerprintjs**: 用于生成浏览器指纹，追踪访客 LLM 试用配额

### 现有依赖（复用）

- **@supabase/supabase-js**: 用于管理员认证、数据库操作和访客配额管理
- **element-plus**: 用于 UI 组件（登录对话框、提示横幅）
- **vue**: 前端框架
- **vitest**: 测试框架

## 数据库设计

### 新增表结构

**visitor_sessions 表**（访客会话表）
```sql
CREATE TABLE visitor_sessions (
  fingerprint TEXT PRIMARY KEY,
  llm_used_count INT DEFAULT 0 CHECK (llm_used_count IN (0, 1)),
  llm_token_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询
CREATE INDEX idx_visitor_sessions_created_at ON visitor_sessions(created_at);
CREATE INDEX idx_visitor_sessions_last_active ON visitor_sessions(last_active_at);
```

**说明**：
- 移除了 `event_count` 字段,避免数据不一致风险
- 事件配额通过直接查询 `visitor_events` 表计算: `SELECT COUNT(*) FROM visitor_events WHERE fingerprint = 'xxx'`
- 由于每个访客最多 3 条事件,查询性能开销可忽略不计

**visitor_events 表**（访客事件表）
```sql
CREATE TABLE visitor_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fingerprint TEXT NOT NULL REFERENCES visitor_sessions(fingerprint) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  description TEXT,
  original_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以优化查询
CREATE INDEX idx_visitor_events_fingerprint ON visitor_events(fingerprint);
CREATE INDEX idx_visitor_events_start_time ON visitor_events(start_time);
CREATE INDEX idx_visitor_events_created_at ON visitor_events(created_at);
```

**说明**：
- `visitor_events` 表结构简化版，仅包含核心字段
- 相比管理员 `events` 表，访客事件不支持以下功能：
  * `tag_ids` 字段（标签功能，访客模式下禁用）
  * `color` 字段（事件颜色）
  * `notes` 字段（额外备注）
  * `updated_at` 字段（更新时间，因为访客不能编辑）
- 使用 `TIMESTAMPTZ` 而非 `TIMESTAMP` 以支持时区
- 外键 `ON DELETE CASCADE` 确保删除会话时自动删除关联事件
- 事件配额通过 `COUNT(*)` 查询计算，避免维护冗余的 `event_count` 字段

### 现有表修改

**events 表**（管理员事件表）
- **无需修改**，保持现有结构
- 不添加 `user_id` 字段（因为只有单一管理员）
- 不添加 `visitor_fingerprint` 字段（完全隔离）

### RLS 策略

**visitor_sessions 表 RLS**：
```sql
-- 允许所有人查询和插入（用于指纹初始化）
CREATE POLICY "Allow public read access" ON visitor_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON visitor_sessions
  FOR INSERT WITH CHECK (true);

-- 允许更新（用于配额递增）
CREATE POLICY "Allow public update" ON visitor_sessions
  FOR UPDATE USING (true);

-- 禁止删除（仅定时任务删除）
CREATE POLICY "Prevent public delete" ON visitor_sessions
  FOR DELETE USING (false);
```

**visitor_events 表 RLS**：
```sql
-- 允许所有人查询（前端通过 fingerprint 过滤）
CREATE POLICY "Allow public read access" ON visitor_events
  FOR SELECT USING (true);

-- 🔥 允许插入（数据库层面配额检查，防止恶意绕过前端）
CREATE POLICY "Allow public insert with quota check" ON visitor_events
  FOR INSERT WITH CHECK (
    (SELECT COUNT(*) FROM visitor_events WHERE fingerprint = visitor_events.fingerprint) < 3
  );

-- 禁止更新和删除
CREATE POLICY "Prevent public update" ON visitor_events
  FOR UPDATE USING (false);

CREATE POLICY "Prevent public delete" ON visitor_events
  FOR DELETE USING (false);
```

**events 表 RLS**：
```sql
-- 🔒 安全策略：仅允许已认证的管理员访问（修复安全隐患）
CREATE POLICY "Allow only admin access" ON events
  AS PERMISSIVE FOR ALL
  TO authenticated  -- 关键：只允许已认证用户
  USING (true)
  WITH CHECK (true);
```

**说明**：
- 访客表使用宽松的 RLS 策略（允许读写），依赖前端 fingerprint 过滤和配额检查
- **安全性说明**：访客理论上可以通过修改前端代码查看其他访客的数据，但由于：
  1. 访客数据 1 天后自动删除，无长期价值
  2. 访客事件不包含敏感信息（仅标题、时间等）
  3. 实现更严格的 RLS 策略需要复杂的 session 变量管理
  4. 成本和风险都极低，因此采用简化方案
- 禁止访客删除和更新操作，防止恶意篡改
- **管理员表使用严格的 RLS 策略**：仅允许已认证用户（authenticated）访问，防止未登录用户或拿到 Anon Key 的攻击者访问管理员数据

### 定时清理配置

**使用 pg_cron 定时删除过期数据**（在 Supabase Dashboard 的 SQL Editor 中执行）：

```sql
-- 启用 pg_cron 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 创建清理函数
CREATE OR REPLACE FUNCTION cleanup_visitor_data()
RETURNS void AS $BODY$
DECLARE
  deleted_sessions INT;
BEGIN
  -- 删除超过 1 天的访客会话（级联删除关联事件）
  WITH deleted AS (
    DELETE FROM visitor_sessions
    WHERE created_at < NOW() - INTERVAL '1 day'
    RETURNING fingerprint
  )
  SELECT COUNT(*) INTO deleted_sessions FROM deleted;
  
  -- 记录清理日志
  RAISE NOTICE 'Cleaned up % visitor sessions', deleted_sessions;
END;
$BODY$ LANGUAGE plpgsql;

-- 配置定时任务：每天凌晨 2 点执行
SELECT cron.schedule(
  'cleanup-visitor-data',
  '0 2 * * *',  -- 每天 2:00 AM
  'SELECT cleanup_visitor_data();'
);

-- 查看定时任务状态
SELECT * FROM cron.job;

-- 手动测试清理函数
SELECT cleanup_visitor_data();
```

**备用方案**（如果 pg_cron 不可用）：
- 使用 Supabase Edge Functions + Vercel Cron Jobs
- 或在应用启动时检查并清理过期数据

## 数据库迁移脚本

**完整的迁移脚本**（在 Supabase SQL Editor 中按顺序执行）：

```sql
-- ============================================
-- 访客访问控制 - 数据库迁移脚本
-- ============================================

-- 1. 创建访客会话表
CREATE TABLE IF NOT EXISTS visitor_sessions (
  fingerprint TEXT PRIMARY KEY,
  llm_used_count INT DEFAULT 0 CHECK (llm_used_count IN (0, 1)),
  llm_token_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_active ON visitor_sessions(last_active_at);

-- 说明：移除了 event_count 字段，通过直接查询 visitor_events 表计算配额
-- SELECT COUNT(*) FROM visitor_events WHERE fingerprint = 'xxx'

-- 2. 创建访客事件表
CREATE TABLE IF NOT EXISTS visitor_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fingerprint TEXT NOT NULL REFERENCES visitor_sessions(fingerprint) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  description TEXT,
  original_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_events_fingerprint ON visitor_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_visitor_events_start_time ON visitor_events(start_time);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON visitor_events(created_at);

-- 3. 启用 RLS
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;

-- 4. 配置 RLS 策略
-- visitor_sessions 策略
CREATE POLICY "Allow public read access" ON visitor_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON visitor_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON visitor_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Prevent public delete" ON visitor_sessions
  FOR DELETE USING (false);

-- visitor_events 策略
CREATE POLICY "Allow public read access" ON visitor_events
  FOR SELECT USING (true);

-- 🔥 数据库层面配额检查，防止恶意绕过前端
CREATE POLICY "Allow public insert with quota check" ON visitor_events
  FOR INSERT WITH CHECK (
    (SELECT COUNT(*) FROM visitor_events WHERE fingerprint = visitor_events.fingerprint) < 3
  );

CREATE POLICY "Prevent public update" ON visitor_events
  FOR UPDATE USING (false);

CREATE POLICY "Prevent public delete" ON visitor_events
  FOR DELETE USING (false);

-- 5. 创建清理函数
CREATE OR REPLACE FUNCTION cleanup_visitor_data()
RETURNS void AS $BODY$
DECLARE
  deleted_sessions INT;
BEGIN
  WITH deleted AS (
    DELETE FROM visitor_sessions
    WHERE created_at < NOW() - INTERVAL '1 day'
    RETURNING fingerprint
  )
  SELECT COUNT(*) INTO deleted_sessions FROM deleted;
  
  RAISE NOTICE 'Cleaned up % visitor sessions', deleted_sessions;
END;
$BODY$ LANGUAGE plpgsql;

-- 6. 🔒 修复 events 表的安全隐患
-- 删除旧的不安全策略（如果存在）
DROP POLICY IF EXISTS "Allow all operations on events" ON events;

-- 创建新的安全策略：仅允许已认证用户访问
CREATE POLICY "Allow only admin access" ON events
  AS PERMISSIVE FOR ALL
  TO authenticated  -- 关键：只允许已认证用户
  USING (true)
  WITH CHECK (true);

-- 7. 配置定时任务（需要 pg_cron 扩展）
-- 注意：在 Supabase 免费版可能不支持，需要升级或使用备用方案
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'cleanup-visitor-data',
--   '0 2 * * *',
--   'SELECT cleanup_visitor_data();'
-- );

-- 8. 验证迁移
SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) AS visitor_sessions_count FROM visitor_sessions;
SELECT COUNT(*) AS visitor_events_count FROM visitor_events;
```

## MVP 实现说明

### 架构优势

**完全隔离的双表设计**：
- 管理员：使用现有 `events` 表（无需 user_id）
- 访客：使用新的 `visitor_events` 表 + `fingerprint`
- 无需修改现有代码，只需添加访客逻辑

**实现方式**：
1. **新增 useAuth composable**：
   - 管理当前用户身份（visitor/admin）
   - 提供浏览器指纹生成和访客会话管理
   - 提供管理员登录/登出功能

2. **新增 useVisitorEvents composable**：
   - 专门处理访客事件的 CRUD（仅 Create + Read）
   - 配额检查逻辑：通过 `COUNT(*)` 查询 visitor_events 表
   - 与现有 useEvents 完全独立

3. **修改现有 useEvents composable**：
   - 添加身份检查，根据 admin/visitor 调用不同的数据源
   - 管理员：调用 useSupabase（events 表）
   - 访客：调用 useVisitorEvents（visitor_events 表）

4. **新增访客监控页面组件**：
   - 管理员专用，显示访客使用情况
   - 访客会话列表 + 详情查看
   - 统计数据展示（总访客数、LLM 调用、Token 消耗）

5. **配额检查层**：
   - 在 `createEvent` 前通过 `COUNT(*)` 查询检查事件配额（< 3）
   - 在 `callLLM` 前检查 LLM 配额（llm_used_count == 0）
   - LLM 调用成功后记录 Token 消耗到 llm_token_used
   - 管理员跳过所有检查

6. **定时清理**：
   - 优先使用 pg_cron（如果 Supabase 支持）
   - 备用方案：应用启动时检查并清理过期数据
   - 每天执行一次
   - 删除超过 1 天的 visitor_sessions（级联删除 visitor_events）

### 实现细节

1. **指纹识别**：使用 FingerprintJS 生成稳定的浏览器指纹（同一浏览器环境下保持不变）
2. **访客配额**：LLM 1 次 + 事件 3 条（硬编码，不可配置）
3. **LLM 配额消耗**：仅在 LLM API 成功返回结果后才递增 llm_used_count，失败不消耗配额
4. **多事件创建**：LLM 解析出多个事件时，创建前 N 个（N = min(解析数量, 剩余配额)），并提示用户
5. **Token 追踪**：LLM 调用成功后记录 Token 消耗
   - 优先使用 API 响应中的 `usage` 字段
   - 如果 API 不返回，使用估算值：`(Prompt 字符数 + Completion 字符数) / 4`
   - 这样监控面板能更真实地反映成本，而不是一堆 0
6. **数据清理**：1 天后自动删除（数据库 pg_cron 定时任务，在 Supabase Dashboard 配置）
7. **配额追踪**：visitor_sessions 表记录指纹、LLM 使用次数、Token 消耗；事件数量通过查询 visitor_events 表计算
8. **数据隔离**：访客和管理员使用不同的表，完全隔离
9. **数据查询**：前端通过 fingerprint 过滤访客事件，RLS 策略宽松（允许读写但禁止更新删除）
10. **管理员监控**：专用页面查看访客使用情况和统计数据（MVP 必须功能），通过 Supabase Auth 验证管理员身份
11. **管理员认证**：单一管理员账户，在 Supabase Auth 中预先创建，无需 user_id 字段
12. **权限控制**：前端 UI 控制（隐藏按钮）+ 后端 RLS 策略（禁止操作）双重保护

## MVP 实现范围

### Phase 1：核心功能（必须实现）

1. ✅ **访客模式基础**
   - 浏览器指纹生成（FingerprintJS）
   - visitor_sessions 和 visitor_events 表创建
   - 访客数据加载和显示

2. ✅ **访客配额限制**
   - LLM 调用配额（1 次，存储在 visitor_sessions.llm_used_count）
   - 事件创建配额（3 条，通过 COUNT 查询 visitor_events 表计算）
   - 试用横幅提示

3. ✅ **管理员认证**
   - Supabase Auth 登录/登出
   - 会话管理和自动恢复
   - 权限切换（访客 ↔ 管理员）

4. ✅ **数据隔离**
   - 双表设计（visitor_events vs events）
   - RLS 策略配置
   - 前端 UI 权限控制

5. ✅ **访客监控页面**
   - 访客会话列表
   - 访客事件详情
   - 统计数据展示
   - 管理员权限保护

### Phase 2：部署配置（部署时完成）

1. ⚙️ **数据库定时清理**
   - 在 Supabase Dashboard 配置 pg_cron
   - 每天删除超过 1 天的访客数据
   - 测试级联删除

2. ⚙️ **管理员账户创建**
   - 在 Supabase Auth 创建管理员账户
   - 配置环境变量（如需要）

### Phase 3：优化功能（可选，后续迭代）

1. 🔄 **Token 追踪优化**
   - 支持多种 LLM API 的 token 返回格式
   - Token 消耗估算（如果 API 不返回）

2. 🔄 **监控增强**
   - 访客地理位置统计
   - LLM 调用成功率
   - 事件创建趋势图

3. 🔄 **安全增强**
   - 访客 IP 限流
   - 恶意指纹检测
   - 管理员 2FA

## 成本估算

假设每月 100 个独立访客：
- 20% 的访客试用 LLM = 20 人 × 1 次 = 20 次 LLM 调用/月
- 50% 的访客创建事件 = 50 人 × 平均 2 条 = 100 条事件/月
- Supabase 存储：100 条 visitor_sessions 记录 + 100 条 visitor_events 记录
- 1 天后自动清理，数据库中最多保留 1-2 天的数据
- **总成本极低且可预测**（约 20 次 LLM + 200 条临时数据库记录）

## 技术风险和缓解措施

### 风险 1：指纹不稳定
- **风险**：用户清除浏览器数据或使用隐私模式导致指纹变化
- **缓解**：这是预期行为，在文档中明确说明，用户可以重新获得 1 次试用机会

### 风险 2：恶意用户绕过配额
- **风险**：用户通过清除浏览器数据或切换浏览器绕过配额限制
- **缓解**：
  - 成本已经很低（1 次 LLM + 3 条事件）
  - 1 天自动清理，限制数据积累
  - Phase 3 可以添加 IP 限流

### 风险 3：RLS 策略配置错误
- **风险**：RLS 策略配置不当导致数据泄露或访问失败
- **缓解**：
  - 在测试环境充分测试 RLS 策略
  - 使用 Supabase Dashboard 验证策略
  - 前端 + 后端双重保护

### 风险 4：定时清理失败
- **风险**：pg_cron 配置错误或执行失败导致数据积累
- **缓解**：
  - 在监控页面显示最旧记录时间
  - 手动清理备用方案
  - 数据库存储成本低，短期积累影响小
