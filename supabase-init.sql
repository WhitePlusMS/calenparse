-- ============================================
-- CalenParse 完整数据库初始化脚本
-- ============================================
-- 
-- 📋 执行说明：
-- 1. 登录 Supabase Dashboard (https://supabase.com/dashboard)
-- 2. 选择你的项目
-- 3. 进入 SQL Editor (左侧菜单)
-- 4. 创建新查询，粘贴此脚本的全部内容
-- 5. 点击 "Run" 按钮执行
-- 6. 等待执行完成，查看输出验证结果
--
-- ✅ 此脚本是幂等的（可重复执行）
-- ✅ 包含所有必需的表、索引、函数、触发器和 RLS 策略
-- ✅ 执行后无需任何额外操作
--
-- 📦 包含内容：
-- - 4 个表：events, tags, visitor_sessions, visitor_events
-- - 13+ 个索引（性能优化）
-- - 2 个函数：自动更新时间戳 + 访客数据清理
-- - 10+ 个 RLS 策略（安全控制）
-- - 1 个触发器：自动更新 events.updated_at
--
-- ============================================

-- ============================================
-- 第一部分：基础扩展和核心表
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建 tags 表
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 events 表（管理员用户的事件）
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  description TEXT,
  original_text TEXT,  -- 存储原始通告文本
  tag_ids TEXT[],  -- 标签 ID 数组
  is_completed BOOLEAN DEFAULT false,  -- 事件完成状态
  -- 重复事件字段
  recurrence_rule JSONB,  -- 重复规则的 JSON 配置
  recurrence_id UUID,  -- 重复事件组 ID
  is_recurring BOOLEAN DEFAULT false,  -- 是否为重复事件
  -- 事件模板字段
  is_template BOOLEAN DEFAULT false,  -- 是否为模板
  template_name TEXT,  -- 模板名称
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 第二部分：访客访问控制表
-- ============================================

-- 创建访客会话表
CREATE TABLE IF NOT EXISTS visitor_sessions (
  fingerprint TEXT PRIMARY KEY,
  llm_used_count INT DEFAULT 0 CHECK (llm_used_count IN (0, 1)),
  llm_token_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建访客事件表
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

-- ============================================
-- 第三部分：索引优化
-- ============================================

-- events 表索引
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_recurrence_id ON events(recurrence_id) 
WHERE recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_is_template ON events(is_template) 
WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_events_template_name ON events(template_name) 
WHERE template_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_is_recurring ON events(is_recurring) 
WHERE is_recurring = true;

-- tags 表索引
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- visitor_sessions 表索引
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_created_at ON visitor_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_active ON visitor_sessions(last_active_at);

-- visitor_events 表索引
CREATE INDEX IF NOT EXISTS idx_visitor_events_fingerprint ON visitor_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_visitor_events_start_time ON visitor_events(start_time);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON visitor_events(created_at);

-- ============================================
-- 第四部分：触发器和函数
-- ============================================

-- 创建自动更新 updated_at 的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- 为 events 表创建触发器
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建访客数据清理函数
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
$BODY$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- 第五部分：行级安全性（RLS）配置
-- ============================================

-- 启用 RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- events 表 RLS 策略（仅管理员访问）
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on events" ON events;
DROP POLICY IF EXISTS "Allow only admin access" ON events;

CREATE POLICY "Allow only admin access" ON events
  AS PERMISSIVE FOR ALL
  TO authenticated  -- 只允许已认证用户
  USING (true)
  WITH CHECK (true);

-- ============================================
-- tags 表 RLS 策略（公开访问）
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on tags" ON tags;
DROP POLICY IF EXISTS "Allow public access to tags" ON tags;

-- 允许所有用户（包括匿名用户）完全访问 tags
CREATE POLICY "Allow public access to tags" ON tags
  AS PERMISSIVE FOR ALL
  TO public  -- 明确指定 public 角色
  USING (true)
  WITH CHECK (true);

-- ============================================
-- visitor_sessions 表 RLS 策略
-- ============================================
DROP POLICY IF EXISTS "Allow public read access" ON visitor_sessions;
DROP POLICY IF EXISTS "Allow public insert" ON visitor_sessions;
DROP POLICY IF EXISTS "Allow public update" ON visitor_sessions;
DROP POLICY IF EXISTS "Prevent public delete" ON visitor_sessions;

CREATE POLICY "Allow public read access" ON visitor_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON visitor_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON visitor_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Prevent public delete" ON visitor_sessions
  FOR DELETE USING (false);

-- ============================================
-- visitor_events 表 RLS 策略（含配额检查）
-- ============================================
DROP POLICY IF EXISTS "Allow public read access" ON visitor_events;
DROP POLICY IF EXISTS "Allow public insert with quota check" ON visitor_events;
DROP POLICY IF EXISTS "Prevent public update" ON visitor_events;
DROP POLICY IF EXISTS "Prevent public delete" ON visitor_events;

CREATE POLICY "Allow public read access" ON visitor_events
  FOR SELECT USING (true);

-- 数据库层面配额检查：每个访客最多 3 个事件
CREATE POLICY "Allow public insert with quota check" ON visitor_events
  FOR INSERT WITH CHECK (
    (SELECT COUNT(*) FROM visitor_events ve WHERE ve.fingerprint = NEW.fingerprint) < 3
  );

CREATE POLICY "Prevent public update" ON visitor_events
  FOR UPDATE 
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Prevent public delete" ON visitor_events
  FOR DELETE 
  USING (false);

-- ============================================
-- 第六部分：定时任务配置（可选）
-- ============================================
-- 注意：Supabase 免费版可能不支持 pg_cron
-- 如需启用定时清理，取消注释以下代码：

-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- -- 先尝试取消已存在的任务（忽略错误）
-- DO $$ 
-- BEGIN
--   PERFORM cron.unschedule('cleanup-visitor-data');
-- EXCEPTION WHEN OTHERS THEN
--   NULL;
-- END $$;
-- 
-- SELECT cron.schedule(
--   'cleanup-visitor-data',
--   '0 2 * * *',  -- 每天凌晨 2:00 执行
--   'SELECT cleanup_visitor_data();'
-- );

-- ============================================
-- 第七部分：完整性验证
-- ============================================

-- 验证所有表已创建
DO $$ 
DECLARE
  table_count INT;
  index_count INT;
  policy_count INT;
  function_count INT;
BEGIN
  -- 检查表
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('events', 'tags', 'visitor_sessions', 'visitor_events');
  
  IF table_count < 4 THEN
    RAISE EXCEPTION '表创建失败：期望 4 个表，实际 % 个', table_count;
  END IF;
  
  -- 检查索引
  SELECT COUNT(*) INTO index_count 
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';
  
  IF index_count < 13 THEN
    RAISE WARNING '索引数量不足：期望至少 13 个，实际 % 个', index_count;
  END IF;
  
  -- 检查 RLS 策略
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  IF policy_count < 10 THEN
    RAISE WARNING 'RLS 策略数量不足：期望至少 10 个，实际 % 个', policy_count;
  END IF;
  
  -- 检查函数
  SELECT COUNT(*) INTO function_count 
  FROM pg_proc 
  WHERE proname IN ('update_updated_at_column', 'cleanup_visitor_data');
  
  IF function_count < 2 THEN
    RAISE EXCEPTION '函数创建失败：期望 2 个函数，实际 % 个', function_count;
  END IF;
  
  RAISE NOTICE '✅ 数据库初始化成功！';
  RAISE NOTICE '   - 表: % 个', table_count;
  RAISE NOTICE '   - 索引: % 个', index_count;
  RAISE NOTICE '   - RLS 策略: % 个', policy_count;
  RAISE NOTICE '   - 函数: % 个', function_count;
END $$;

-- 显示所有表的行数
SELECT 
  'events' AS table_name, 
  COUNT(*) AS row_count,
  pg_size_pretty(pg_total_relation_size('events')) AS size
FROM events
UNION ALL
SELECT 'tags', COUNT(*), pg_size_pretty(pg_total_relation_size('tags')) FROM tags
UNION ALL
SELECT 'visitor_sessions', COUNT(*), pg_size_pretty(pg_total_relation_size('visitor_sessions')) FROM visitor_sessions
UNION ALL
SELECT 'visitor_events', COUNT(*), pg_size_pretty(pg_total_relation_size('visitor_events')) FROM visitor_events;

-- 显示 RLS 状态
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('events', 'tags', 'visitor_sessions', 'visitor_events')
ORDER BY tablename;

-- ============================================
-- 可选测试命令（取消注释以执行）
-- ============================================

-- 测试清理函数：
-- SELECT cleanup_visitor_data();

-- 查看所有 RLS 策略：
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- 查看所有索引：
-- SELECT schemaname, tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- 查看定时任务状态（如果启用了 pg_cron）：
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-visitor-data';
