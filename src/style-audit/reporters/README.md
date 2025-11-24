# 报告生成器模块

本模块负责汇总样式审查问题并生成详细的审查报告。

## 功能概述

- **问题收集和分类**: 按类别、严重性、文件分组问题
- **报告摘要生成**: 生成统计数据和执行摘要
- **详细问题报告**: 包含位置、建议和代码示例
- **修复计划生成**: 创建优先级排序的修复任务
- **多格式导出**: 支持 Markdown、HTML、JSON 格式

## 核心组件

### IssueCollector (问题收集器)

负责收集和分类所有检查器发现的问题。

```typescript
import { createIssueCollector } from './reporters';

const collector = createIssueCollector();

// 添加问题
collector.addIssue(issue);
collector.addIssues([issue1, issue2]);

// 分组问题
const byCategory = collector.groupByCategory();
const bySeverity = collector.groupBySeverity();
const byFile = collector.groupByFile();

// 统计
const total = collector.getCount();
const critical = collector.getCountBySeverity('critical');
```

### SummaryGenerator (摘要生成器)

生成报告的统计摘要。

```typescript
import { createSummaryGenerator } from './reporters';

const generator = createSummaryGenerator();

// 生成摘要
const summary = generator.generateSummary(issues, totalFiles);

// 生成文本
const executiveSummary = generator.generateExecutiveSummary(summary);
const overview = generator.generateOverview(issuesByCategory, issuesBySeverity);
```

### DetailedReportGenerator (详细报告生成器)

生成包含详细信息的问题报告。

```typescript
import { createDetailedReportGenerator } from './reporters';

const generator = createDetailedReportGenerator();

// 生成详细问题列表
const detailedList = generator.generateDetailedIssueList(issues);

// 按文件生成问题列表
const byFile = generator.generateIssuesByFile(issuesByFile);
```

### FixPlanGenerator (修复计划生成器)

创建优先级排序的修复任务。

```typescript
import { createFixPlanGenerator } from './reporters';

const generator = createFixPlanGenerator();

// 生成修复计划
const fixPlan = generator.generateFixPlan(issues);

// 生成修复计划文本
const planText = generator.generateFixPlanText(fixPlan);
```

### ReportExporter (报告导出器)

支持多种格式导出报告。

```typescript
import { createReportExporter } from './reporters';

const exporter = createReportExporter();

// 导出为不同格式
const markdown = exporter.exportMarkdown(report);
const html = exporter.exportHTML(report);
const json = exporter.exportJSON(report);
```

### ReportGenerator (主报告生成器)

整合所有功能的主入口。

```typescript
import { createReportGenerator } from './reporters';

const generator = createReportGenerator();

// 生成完整报告
const report = generator.generateReport(issues, totalFiles);

// 生成修复计划
const fixPlan = generator.generateFixPlan(issues);

// 导出报告
const markdown = generator.exportReport(report, 'markdown');
const html = generator.exportReport(report, 'html');
const json = generator.exportReport(report, 'json');

// 生成包含修复计划的完整报告
const fullReport = generator.generateFullReport(issues, totalFiles);
```

## 使用示例

### 基本使用

```typescript
import { createReportGenerator } from './reporters';
import type { Issue } from '../types';

// 创建报告生成器
const generator = createReportGenerator();

// 准备问题列表
const issues: Issue[] = [
  {
    severity: 'critical',
    category: 'accessibility',
    message: '文本颜色对比度不足',
    location: { file: 'src/style.css', line: 45, column: 3 },
    suggestion: '使用更深的文本颜色',
    codeExample: 'color: var(--text-primary);'
  }
];

// 生成报告
const report = generator.generateReport(issues, 25);

// 导出为 Markdown
const markdown = generator.exportReport(report, 'markdown');
console.log(markdown);
```

### 生成修复计划

```typescript
// 生成修复计划
const fixPlan = generator.generateFixPlan(issues);

console.log(`总工作量: ${fixPlan.estimatedEffort}`);
console.log(`任务数量: ${fixPlan.tasks.length}`);

// 遍历任务
fixPlan.tasks.forEach(task => {
  console.log(`${task.title} - ${task.estimatedTime}`);
  console.log(`优先级: ${task.priority}`);
  console.log(`相关问题: ${task.relatedIssues.length} 个`);
});
```

### 完整工作流

```typescript
import { createReportGenerator } from './reporters';

async function runAudit() {
  const generator = createReportGenerator();
  
  // 1. 收集所有检查器的问题
  const issues = await collectAllIssues();
  
  // 2. 生成报告
  const report = generator.generateReport(issues, totalFiles);
  
  // 3. 生成修复计划
  const fixPlan = generator.generateFixPlan(issues);
  
  // 4. 导出报告
  const markdown = generator.exportReport(report, 'markdown');
  const html = generator.exportReport(report, 'html');
  const json = generator.exportReport(report, 'json');
  
  // 5. 保存报告
  await saveReport('audit-report.md', markdown);
  await saveReport('audit-report.html', html);
  await saveReport('audit-report.json', json);
  
  return { report, fixPlan };
}
```

## 报告格式

### Markdown 格式

生成的 Markdown 报告包含：
- 执行摘要（统计数据）
- 问题概览（按类别和严重性）
- 按文件分组的问题列表
- 详细问题列表（包含位置、建议、代码示例）
- 建议列表

### HTML 格式

生成的 HTML 报告包含：
- 响应式布局
- 颜色编码的严重性标签
- 代码高亮
- 可打印样式

### JSON 格式

生成的 JSON 报告包含：
- 结构化的问题数据
- 完整的统计信息
- 易于程序化处理

## 测试

运行测试：

```bash
npm run test -- src/style-audit/reporters
```

所有组件都有完整的单元测试覆盖。

## 相关需求

- 需求 13.1: 生成详细报告
- 需求 13.2: 按严重性分类
- 需求 13.3: 包含位置信息
- 需求 13.4: 提供修复建议
- 需求 13.5: 生成修复计划
