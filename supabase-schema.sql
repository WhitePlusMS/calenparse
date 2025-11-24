-- CalenParse 事件表架构
-- 此文件包含 Supabase 数据库的 SQL 架构

-- 启用 UUID 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建 tags 表
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 events 表
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

-- 在 start_time 上创建索引以实现高效的基于日期的查询
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);

-- 在 end_time 上创建索引以实现范围查询
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);

-- 为重复事件组创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_events_recurrence_id ON events(recurrence_id) 
WHERE recurrence_id IS NOT NULL;

-- 为模板查询创建部分索引（只索引模板记录）
CREATE INDEX IF NOT EXISTS idx_events_is_template ON events(is_template) 
WHERE is_template = true;

-- 为模板名称创建部分索引
CREATE INDEX IF NOT EXISTS idx_events_template_name ON events(template_name) 
WHERE template_name IS NOT NULL;

-- 为重复事件标记创建索引
CREATE INDEX IF NOT EXISTS idx_events_is_recurring ON events(is_recurring) 
WHERE is_recurring = true;

-- 创建函数以自动更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器以在行更新时自动更新 updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 在 tags 表的 name 上创建索引以实现高效查询
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 启用行级安全性（RLS）
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 创建策略以暂时允许所有操作（根据身份验证需求调整）
-- 对于无身份验证的 MVP，允许所有操作
CREATE POLICY "Allow all operations on events" ON events
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on tags" ON tags
  FOR ALL
  USING (true)
  WITH CHECK (true);
