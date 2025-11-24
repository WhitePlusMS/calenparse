# 设计文档 - 样式一致性审查

## 概述

本设计文档描述了对 CalenParse 项目进行全面样式一致性审查的系统方法。审查将采用自动化分析和手动检查相结合的方式,确保所有样式文件遵循统一的标准、命名约定和最佳实践。

审查的核心目标是:
1. 识别并记录当前样式系统的所有组成部分
2. 评估每个样式文件与既定标准的一致性
3. 生成详细的问题报告和优先级修复计划
4. 提供具体的修复建议和代码示例

## 架构

### 审查流程架构

审查过程分为四个主要阶段:

```
发现阶段 → 分析阶段 → 评估阶段 → 报告阶段
```

**发现阶段**: 扫描项目,识别所有样式文件和样式代码
**分析阶段**: 解析样式内容,提取关键信息(变量、类名、选择器等)
**评估阶段**: 对照标准检查每个样式元素的一致性
**报告阶段**: 生成问题报告和修复建议

### 样式文件分类

项目中的样式分为三个层次:

1. **全局层** (`src/style.css`)
   - 设计令牌(CSS 变量)
   - 重置和基础样式
   - 全局工具类

2. **工具层** (`src/utils/*.css`)
   - 专门的工具样式系统
   - 按钮系统 (`buttons.css`)
   - 动画系统 (`animations.css`)
   - 标签徽章系统 (`tags-badges.css`)

3. **组件层** (Vue 组件中的 `<style scoped>`)
   - 组件特定样式
   - 局部样式覆盖

## 组件和接口

### 1. 样式文件扫描器 (StyleFileScanner)

**职责**: 发现并分类所有样式文件

**接口**:
```typescript
interface StyleFileScanner {
  scanProject(): StyleFileInventory
  categorizeFile(path: string): FileCategory
}

interface StyleFileInventory {
  globalStyles: string[]      // 全局样式文件
  utilityStyles: string[]      // 工具样式文件
  componentStyles: string[]    // 包含样式的组件文件
}

type FileCategory = 'global' | 'utility' | 'component'
```

### 2. CSS 解析器 (CSSParser)

**职责**: 解析 CSS 内容,提取关键元素

**接口**:
```typescript
interface CSSParser {
  parse(content: string): ParsedCSS
  extractVariables(content: string): CSSVariable[]
  extractClasses(content: string): CSSClass[]
  extractSelectors(content: string): CSSSelector[]
}

interface ParsedCSS {
  variables: CSSVariable[]
  classes: CSSClass[]
  selectors: CSSSelector[]
  animations: CSSAnimation[]
  mediaQueries: MediaQuery[]
}

interface CSSVariable {
  name: string
  value: string
  location: Location
  category?: 'color' | 'spacing' | 'typography' | 'animation' | 'other'
}

interface CSSClass {
  name: string
  properties: CSSProperty[]
  location: Location
  type?: 'utility' | 'component' | 'modifier'
}

interface Location {
  file: string
  line: number
  column: number
}
```

### 3. 一致性检查器 (ConsistencyChecker)

**职责**: 评估样式元素与标准的一致性

**接口**:
```typescript
interface ConsistencyChecker {
  checkNamingConventions(elements: StyleElement[]): Issue[]
  checkVariableUsage(css: ParsedCSS): Issue[]
  checkColorContrast(colors: ColorUsage[]): Issue[]
  checkAccessibility(css: ParsedCSS): Issue[]
  checkOrganization(file: StyleFile): Issue[]
}

interface Issue {
  severity: 'critical' | 'moderate' | 'minor'
  category: IssueCategory
  message: string
  location: Location
  suggestion?: string
  codeExample?: string
}

type IssueCategory = 
  | 'naming'
  | 'organization'
  | 'accessibility'
  | 'performance'
  | 'duplication'
  | 'unused'
  | 'best-practice'
```

### 4. 报告生成器 (ReportGenerator)

**职责**: 生成审查报告和修复计划

**接口**:
```typescript
interface ReportGenerator {
  generateReport(issues: Issue[]): AuditReport
  generateFixPlan(issues: Issue[]): FixPlan
  exportReport(report: AuditReport, format: 'markdown' | 'html' | 'json'): string
}

interface AuditReport {
  summary: ReportSummary
  issuesByCategory: Map<IssueCategory, Issue[]>
  issuesBySeverity: Map<Severity, Issue[]>
  issuesByFile: Map<string, Issue[]>
  recommendations: Recommendation[]
}

interface ReportSummary {
  totalFiles: number
  totalIssues: number
  criticalIssues: number
  moderateIssues: number
  minorIssues: number
  filesWithIssues: number
}

interface FixPlan {
  tasks: FixTask[]
  estimatedEffort: string
  priorityOrder: string[]
}

interface FixTask {
  id: string
  title: string
  description: string
  priority: number
  relatedIssues: Issue[]
  estimatedTime: string
}
```

## 数据模型

### 样式标准定义

```typescript
interface StyleStandards {
  naming: NamingStandards
  organization: OrganizationStandards
  accessibility: AccessibilityStandards
  performance: PerformanceStandards
}

interface NamingStandards {
  variableFormat: 'kebab-case'
  classFormat: 'kebab-case' | 'BEM'
  animationFormat: 'kebab-case'
  
  variablePrefixes: {
    color: string[]      // ['--text-', '--bg-', '--border-']
    spacing: string[]    // ['--spacing-']
    typography: string[] // ['--font-', '--line-height-']
    animation: string[]  // ['--duration-', '--ease-']
  }
  
  classPrefixes: {
    utility: string[]    // ['m-', 'p-', 'text-', 'font-']
    button: string[]     // ['btn-']
    tag: string[]        // ['tag-', 'badge-']
  }
}

interface OrganizationStandards {
  sectionOrder: string[]  // ['variables', 'base', 'utilities', 'components', 'responsive']
  commentStyle: 'block' | 'line'
  sectionSeparator: string
  requireFileHeader: boolean
}

interface AccessibilityStandards {
  minContrastRatio: number  // 4.5 for WCAG AA
  requireFocusStyles: boolean
  requireReducedMotion: boolean
  minTouchTarget: number    // 44px
}
```

## 正确性属性

*属性是一个特征或行为,应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 命名约定一致性

*对于任何* CSS 变量,其名称应该使用 kebab-case 格式,并且如果是颜色变量应使用语义化名称(如 `--text-primary`)而非描述性名称(如 `--dark-gray`)

**验证**: 需求 2.1, 2.2

### 属性 2: 工具类前缀一致性

*对于任何* 工具类,其名称应该根据其功能使用适当的前缀(间距类使用 `m-`/`p-`,文本类使用 `text-`,按钮类使用 `btn-`)

**验证**: 需求 3.1, 3.2, 3.3, 3.4

### 属性 3: 颜色值变量化

*对于任何* 样式规则中使用的颜色值,应该通过 CSS 变量引用而非硬编码的十六进制或 RGB 值

**验证**: 需求 7.1

### 属性 4: 间距值标准化

*对于任何* 使用的间距值(margin, padding, gap),应该使用预定义的间距变量(`--spacing-*`)而非任意数值

**验证**: 需求 8.1

### 属性 5: 动画可访问性

*对于任何* 定义的动画或过渡效果,应该包含对应的 `prefers-reduced-motion` 媒体查询支持

**验证**: 需求 9.4, 11.3

### 属性 6: 焦点样式完整性

*对于任何* 交互式元素(button, input, a 等),应该定义清晰可见的焦点样式

**验证**: 需求 11.1

### 属性 7: 对比度合规性

*对于任何* 文本颜色和背景颜色的组合,其对比度应该满足 WCAG AA 标准(至少 4.5:1)

**验证**: 需求 7.5, 11.2

### 属性 8: 响应式断点一致性

*对于任何* 媒体查询,应该使用项目定义的标准断点值(768px, 480px)

**验证**: 需求 10.1

### 属性 9: 注释格式统一性

*对于任何* 包含多个部分的样式文件,应该使用一致的分隔注释格式标记主要部分

**验证**: 需求 4.1

### 属性 10: 选择器特异性合理性

*对于任何* 工具类选择器,应该使用单一类选择器,避免不必要的嵌套或组合增加特异性

**验证**: 需求 6.1

## 错误处理

### 文件访问错误

**场景**: 无法读取样式文件
**处理**: 
- 记录错误日志
- 在报告中标记该文件为"无法访问"
- 继续处理其他文件

### CSS 解析错误

**场景**: CSS 语法错误导致解析失败
**处理**:
- 记录为严重问题
- 尝试部分解析可用内容
- 在报告中详细说明错误位置

### 标准定义缺失

**场景**: 某些检查项缺少标准定义
**处理**:
- 使用默认的行业最佳实践
- 在报告中注明使用了默认标准
- 建议项目团队定义明确标准

## 测试策略

### 单元测试

测试各个组件的核心功能:

1. **StyleFileScanner 测试**
   - 测试能否正确识别所有 CSS 文件
   - 测试能否正确识别包含样式的 Vue 组件
   - 测试文件分类的准确性

2. **CSSParser 测试**
   - 测试变量提取的准确性
   - 测试类名提取的准确性
   - 测试选择器解析的正确性
   - 测试对无效 CSS 的处理

3. **ConsistencyChecker 测试**
   - 测试命名约定检查的准确性
   - 测试颜色对比度计算的正确性
   - 测试可访问性检查的完整性

4. **ReportGenerator 测试**
   - 测试报告生成的完整性
   - 测试问题分类的准确性
   - 测试不同格式导出的正确性

### 属性测试

使用 fast-check 库进行属性测试,验证系统的通用正确性属性。每个属性测试应运行至少 100 次迭代。

**属性测试库**: fast-check (JavaScript/TypeScript 的属性测试库)

**测试标注格式**: `// Feature: style-consistency-review, Property {number}: {property_text}`

1. **属性测试 1: 命名约定一致性**
   ```typescript
   // Feature: style-consistency-review, Property 1: 命名约定一致性
   test('所有 CSS 变量使用 kebab-case 且颜色变量使用语义化名称', () => {
     fc.assert(
       fc.property(
         fc.array(generateCSSVariable()),
         (variables) => {
           const issues = checker.checkNamingConventions(variables)
           const namingIssues = issues.filter(i => i.category === 'naming')
           
           // 所有变量应该是 kebab-case
           variables.forEach(v => {
             expect(v.name).toMatch(/^--[a-z][a-z0-9-]*$/)
           })
           
           // 颜色变量应该是语义化的
           const colorVars = variables.filter(v => v.category === 'color')
           colorVars.forEach(v => {
             expect(v.name).toMatch(/^--(text|bg|border|shadow)/)
           })
         }
       ),
       { numRuns: 100 }
     )
   })
   ```

2. **属性测试 2: 工具类前缀一致性**
   ```typescript
   // Feature: style-consistency-review, Property 2: 工具类前缀一致性
   test('所有工具类根据功能使用适当前缀', () => {
     fc.assert(
       fc.property(
         fc.array(generateUtilityClass()),
         (classes) => {
           classes.forEach(cls => {
             if (cls.type === 'spacing') {
               expect(cls.name).toMatch(/^(m|p|gap)-(xs|sm|md|lg|xl|2xl)/)
             } else if (cls.type === 'text') {
               expect(cls.name).toMatch(/^text-/)
             } else if (cls.type === 'button') {
               expect(cls.name).toMatch(/^btn-/)
             }
           })
         }
       ),
       { numRuns: 100 }
     )
   })
   ```

3. **属性测试 3: 颜色值变量化**
   ```typescript
   // Feature: style-consistency-review, Property 3: 颜色值变量化
   test('所有颜色值通过 CSS 变量引用', () => {
     fc.assert(
       fc.property(
         fc.array(generateCSSRule()),
         (rules) => {
           const colorProperties = ['color', 'background-color', 'border-color', 'fill', 'stroke']
           
           rules.forEach(rule => {
             rule.properties.forEach(prop => {
               if (colorProperties.includes(prop.name)) {
                 // 应该是 var() 或特殊值(transparent, inherit 等)
                 expect(prop.value).toMatch(/^(var\(|transparent|inherit|currentColor|initial|unset)/)
               }
             })
           })
         }
       ),
       { numRuns: 100 }
     )
   })
   ```

4. **属性测试 4: 间距值标准化**
   ```typescript
   // Feature: style-consistency-review, Property 4: 间距值标准化
   test('所有间距值使用预定义变量', () => {
     fc.assert(
       fc.property(
         fc.array(generateCSSRule()),
         (rules) => {
           const spacingProperties = ['margin', 'padding', 'gap', 'margin-top', 'margin-bottom', 
                                      'margin-left', 'margin-right', 'padding-top', 'padding-bottom',
                                      'padding-left', 'padding-right']
           
           rules.forEach(rule => {
             rule.properties.forEach(prop => {
               if (spacingProperties.includes(prop.name)) {
                 // 应该是 var(--spacing-*) 或 0 或特殊值
                 expect(prop.value).toMatch(/^(var\(--spacing-|0|auto|inherit|initial)/)
               }
             })
           })
         }
       ),
       { numRuns: 100 }
     )
   })
   ```

5. **属性测试 5: 动画可访问性**
   ```typescript
   // Feature: style-consistency-review, Property 5: 动画可访问性
   test('所有动画包含 prefers-reduced-motion 支持', () => {
     fc.assert(
       fc.property(
         fc.array(generateAnimationClass()),
         (animationClasses) => {
           const parsedCSS = parser.parse(generateCSSFromClasses(animationClasses))
           const hasReducedMotion = parsedCSS.mediaQueries.some(
             mq => mq.query.includes('prefers-reduced-motion')
           )
           
           if (animationClasses.length > 0) {
             expect(hasReducedMotion).toBe(true)
           }
         }
       ),
       { numRuns: 100 }
     )
   })
   ```

### 集成测试

测试完整的审查流程:

1. **完整审查流程测试**
   - 使用测试项目运行完整审查
   - 验证所有阶段正确执行
   - 验证生成的报告包含预期内容

2. **真实项目测试**
   - 在 CalenParse 项目上运行审查
   - 验证能够识别已知问题
   - 验证报告的准确性和有用性

### 测试数据生成器

为属性测试创建智能生成器:

```typescript
// 生成符合基本格式的 CSS 变量
function generateCSSVariable(): fc.Arbitrary<CSSVariable> {
  return fc.record({
    name: fc.oneof(
      fc.constantFrom('--text-primary', '--bg-color', '--spacing-md'),
      fc.string().map(s => `--${s.toLowerCase().replace(/[^a-z0-9]/g, '-')}`)
    ),
    value: fc.oneof(
      fc.constantFrom('#667eea', '16px', '1.5', '300ms'),
      fc.hexaString().map(h => `#${h.slice(0, 6)}`)
    ),
    location: generateLocation(),
    category: fc.constantFrom('color', 'spacing', 'typography', 'animation', 'other')
  })
}

// 生成工具类
function generateUtilityClass(): fc.Arbitrary<UtilityClass> {
  return fc.record({
    name: fc.oneof(
      fc.constantFrom('m-md', 'p-lg', 'text-primary', 'btn-primary'),
      fc.string().map(s => s.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    ),
    type: fc.constantFrom('spacing', 'text', 'button', 'other'),
    properties: fc.array(generateCSSProperty()),
    location: generateLocation()
  })
}
```

## 审查执行计划

### 阶段 1: 准备和配置

1. 定义项目特定的样式标准
2. 配置检查规则和严重性级别
3. 设置报告输出格式和位置

### 阶段 2: 发现和扫描

1. 扫描项目目录,识别所有样式文件
2. 分类文件(全局/工具/组件)
3. 生成文件清单

### 阶段 3: 解析和分析

1. 解析每个样式文件
2. 提取变量、类名、选择器等元素
3. 构建样式系统的完整图谱

### 阶段 4: 一致性检查

对每个检查类别运行检查:
1. 命名约定检查
2. 组织结构检查
3. 颜色和主题检查
4. 间距和尺寸检查
5. 动画和过渡检查
6. 响应式设计检查
7. 可访问性检查
8. 代码质量检查

### 阶段 5: 报告生成

1. 汇总所有发现的问题
2. 按类别、严重性、文件分组
3. 生成修复建议和代码示例
4. 创建优先级修复计划
5. 导出报告(Markdown/HTML/JSON)

### 阶段 6: 修复执行

1. 按优先级顺序处理问题
2. 对每个问题应用修复
3. 验证修复不引入新问题
4. 更新文档和标准

## 工具和技术

### CSS 解析

使用 PostCSS 或 CSS 解析库进行准确的 CSS 解析:
- **postcss**: 强大的 CSS 解析和转换工具
- **postcss-selector-parser**: 解析和操作 CSS 选择器
- **postcss-value-parser**: 解析 CSS 属性值

### 颜色对比度计算

使用 WCAG 对比度计算库:
- **color**: 颜色操作和转换
- **wcag-contrast**: WCAG 对比度计算

### 文件系统操作

- **glob**: 文件模式匹配
- **fs-extra**: 增强的文件系统操作

### 报告生成

- **markdown-it**: Markdown 生成
- **handlebars**: HTML 模板渲染

## 预期输出

### 审查报告结构

```markdown
# 样式一致性审查报告

## 执行摘要

- 审查日期: 2024-XX-XX
- 审查文件数: XX
- 发现问题总数: XX
  - 严重: XX
  - 中等: XX
  - 轻微: XX

## 问题概览

### 按类别分组

#### 命名约定 (XX 个问题)
- 严重: XX
- 中等: XX
- 轻微: XX

#### 可访问性 (XX 个问题)
...

### 按文件分组

#### src/style.css (XX 个问题)
...

## 详细问题列表

### 问题 #1: [严重] CSS 变量使用硬编码颜色值

**位置**: src/components/SomeComponent.vue:45:3

**描述**: 组件样式中直接使用了硬编码的颜色值 `#333333`,应该使用 CSS 变量 `var(--text-primary)`

**当前代码**:
\`\`\`css
.component {
  color: #333333;
}
\`\`\`

**建议修复**:
\`\`\`css
.component {
  color: var(--text-primary);
}
\`\`\`

## 修复计划

### 高优先级任务

1. **修复所有严重的可访问性问题** (估计: 2 小时)
   - 添加缺失的焦点样式
   - 修复对比度不足的颜色组合
   
2. **统一 CSS 变量命名** (估计: 3 小时)
   - 重命名不符合约定的变量
   - 更新所有引用

...

## 建议

1. 建立样式代码审查检查清单
2. 配置 Stylelint 自动检查
3. 定期运行样式审查(每月一次)
4. 更新样式指南文档
```

## 持续改进

### 自动化检查

建议集成以下工具到 CI/CD 流程:

1. **Stylelint**: CSS 代码检查
   - 配置规则匹配项目标准
   - 在提交前自动运行

2. **Prettier**: 代码格式化
   - 统一代码风格
   - 自动修复格式问题

3. **自定义审查脚本**: 
   - 定期运行完整审查
   - 生成趋势报告

### 文档维护

1. 维护样式指南文档
2. 记录设计决策和理由
3. 提供代码示例和模板
4. 定期更新最佳实践

### 团队培训

1. 分享审查发现和学习
2. 进行样式系统培训
3. 建立代码审查文化
4. 鼓励提出改进建议
