# 样式一致性审查工具

这是一个用于审查项目样式文件一致性的工具，确保所有样式遵循统一的命名约定、组织结构和最佳实践。

## 目录结构

```
src/style-audit/
├── types.ts              # 核心类型定义
├── config.ts             # 配置文件
├── index.ts              # 入口文件
├── utils/                # 工具函数
│   ├── helpers.ts        # 辅助函数
│   └── helpers.test.ts   # 辅助函数测试
├── scanners/             # 文件扫描器（待实现）
├── parsers/              # CSS 解析器（待实现）
├── checkers/             # 一致性检查器（待实现）
└── reporters/            # 报告生成器（待实现）
```

## 核心接口

### StyleFileScanner
负责发现并分类所有样式文件。

### CSSParser
解析 CSS 内容，提取关键元素（变量、类名、选择器等）。

### ConsistencyChecker
评估样式元素与标准的一致性。

### ReportGenerator
生成审查报告和修复建议。

## 使用方法

```typescript
import { defaultStyleStandards } from '@/style-audit'

// 配置将在后续实现中使用
const standards = defaultStyleStandards
```

## 测试

运行测试：
```bash
npm run test -- src/style-audit
```

## 开发状态

- [x] 核心类型定义
- [x] 配置系统
- [x] 辅助函数
- [ ] 文件扫描器
- [ ] CSS 解析器
- [ ] 一致性检查器
- [ ] 报告生成器
